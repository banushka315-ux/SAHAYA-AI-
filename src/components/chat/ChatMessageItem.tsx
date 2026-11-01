import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../../types';
import {
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Edit3,
  FileText,
  Sparkles,
  User,
  CheckCheck,
} from 'lucide-react';
import { speechService } from '../../services/speech';

interface ChatMessageItemProps {
  message: Message;
  isLastAssistant?: boolean;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isLastAssistant,
  onRegenerate,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isAssistant = message.role === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      speechService.stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speechService.speak(
        message.content,
        undefined,
        1.0,
        () => setIsSpeaking(true),
        () => setIsSpeaking(false)
      );
    }
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() && editContent !== message.content) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`py-5 px-4 md:px-6 transition-colors ${
        isAssistant
          ? 'bg-slate-900/40 border-y border-slate-800/40'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-4">
        {/* Avatar */}
        <div className="shrink-0 pt-0.5">
          {isAssistant ? (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 p-[1px] shadow-md shadow-violet-900/30 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Content & Actions */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header info */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">
                {isAssistant ? 'SAHAYA AI' : 'You'}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {message.model && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {message.model}
                  </span>
                </>
              )}
            </div>

            {/* Top right quick actions */}
            <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
              {isAssistant && (
                <button
                  onClick={handleToggleSpeak}
                  className={`p-1.5 rounded-md hover:bg-slate-800 transition-colors ${
                    isSpeaking ? 'text-cyan-400 bg-cyan-950/60' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                >
                  {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                title="Copy message"
              >
                {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {!isAssistant && onEdit && (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                  title="Edit prompt"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              {message.attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs"
                >
                  {att.type.startsWith('image/') ? (
                    <img
                      src={att.data}
                      alt={att.name}
                      className="w-12 h-12 object-cover rounded border border-slate-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-cyan-400">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="max-w-[160px] truncate text-slate-300">
                    <p className="truncate font-medium">{att.name}</p>
                    <span className="text-[10px] text-slate-500 uppercase">{att.type.split('/')[1] || 'FILE'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Body Content */}
          {isEditing ? (
            <div className="space-y-2 mt-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 min-h-[90px]"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-md"
                >
                  Save & Resend
                </button>
              </div>
            </div>
          ) : (
            <div className="text-slate-200 text-sm leading-relaxed prose prose-invert max-w-none prose-p:my-2 prose-pre:my-3 prose-ul:my-2 prose-li:my-0.5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeText = String(children).replace(/\n$/, '');

                    if (!inline && match) {
                      return (
                        <div className="relative group my-3 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                          <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800/80 text-[11px] text-slate-400 font-mono">
                            <span>{match[1]}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(codeText);
                              }}
                              className="hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </button>
                          </div>
                          <pre className="p-3.5 overflow-x-auto text-xs text-slate-200 font-mono leading-normal">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }

                    return (
                      <code
                        className="bg-slate-800 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Assistant Action Bar (Regenerate) */}
          {isAssistant && isLastAssistant && onRegenerate && (
            <div className="pt-2 flex items-center gap-3 text-xs text-slate-500">
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors py-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Regenerate response</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
