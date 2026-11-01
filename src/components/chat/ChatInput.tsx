import React, { useState, useRef, useEffect } from 'react';
import { Attachment } from '../../types';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Square,
  Image as ImageIcon,
  FileText,
  X,
  Camera,
} from 'lucide-react';
import { speechService } from '../../services/speech';

interface ChatInputProps {
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  onSwitchToVision: () => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  onSwitchToVision,
  placeholder = "Ask SAHAYA anything (coding, math, advice, write, research)...",
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (isStreaming) {
      onStopStreaming();
      return;
    }

    if (!content.trim() && attachments.length === 0) return;

    onSendMessage(content.trim(), attachments);
    setContent('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachments((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              data: reader.result as string,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleVoiceInput = () => {
    if (isRecording) {
      speechService.stopListening();
      setIsRecording(false);
    } else {
      const started = speechService.startListening(
        (transcript, isFinal) => {
          setContent((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${transcript}` : transcript;
          });
          if (isFinal) {
            setIsRecording(false);
            speechService.stopListening();
          }
        },
        (err) => {
          console.error('Speech input error:', err);
          setIsRecording(false);
        }
      );
      if (started) {
        setIsRecording(true);
      }
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-900/90 border border-slate-800 rounded-xl">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="relative group flex items-center gap-2 pr-6 pl-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
            >
              {att.type.startsWith('image/') ? (
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-violet-400" />
              )}
              <span className="truncate max-w-[140px] text-slate-300 font-medium">{att.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="absolute right-1 text-slate-500 hover:text-rose-400 p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input container */}
      <div className="relative flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl shadow-slate-950/50 focus-within:border-cyan-500/50 transition-all">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm p-3.5 pb-2 focus:outline-none resize-none max-h-[180px] leading-relaxed"
        />

        {/* Action toolbar */}
        <div className="flex items-center justify-between px-3 pb-2 pt-1">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.txt,.docx,.js,.ts,.py,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors"
              title="Attach image, PDF or document"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onSwitchToVision}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded-lg transition-colors flex items-center gap-1.5"
              title="Open Camera & Gestures"
            >
              <Camera className="w-4 h-4" />
              <span className="text-[11px] hidden sm:inline text-slate-400">Vision</span>
            </button>

            <button
              type="button"
              onClick={toggleVoiceInput}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? 'text-rose-400 bg-rose-950/60'
                  : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80'
              }`}
              title={isRecording ? 'Listening... click to stop' : 'Voice input'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStopStreaming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md transition-all"
                title="Stop generation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!content.trim() && attachments.length === 0}
                className={`p-2 rounded-xl transition-all ${
                  content.trim() || attachments.length > 0
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-900/20'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="text-center text-[11px] text-slate-500 mt-2">
        SAHAYA AI helps you think, write, code, and see. Confirm sensitive facts.
      </p>
    </div>
  );
};
