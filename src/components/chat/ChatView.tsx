import React, { useRef, useEffect } from 'react';
import { Conversation, Message, Attachment } from '../../types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import {
  Sparkles,
  HelpCircle,
  BookOpen,
  Code2,
  PenTool,
  Mic,
  Camera,
  ArrowRight,
} from 'lucide-react';

interface ChatViewProps {
  conversation?: Conversation;
  isStreaming: boolean;
  streamingMessage?: string;
  onSendMessage: (content: string, attachments?: Attachment[]) => void;
  onStopStreaming: () => void;
  onRegenerate: () => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onSwitchToVoice: () => void;
  onSwitchToVision: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  isStreaming,
  streamingMessage,
  onSendMessage,
  onStopStreaming,
  onRegenerate,
  onEditMessage,
  onSwitchToVoice,
  onSwitchToVision,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = conversation?.messages || [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  const starterSuggestions = [
    {
      title: 'Help me solve a problem',
      desc: 'Break down complex logic, decisions, or daily challenges',
      icon: HelpCircle,
      prompt: 'Help me break down and solve this challenge step by step: ',
    },
    {
      title: 'Explain something difficult',
      desc: 'Quantum computing, machine learning, or academic topics',
      icon: BookOpen,
      prompt: 'Explain how neural networks learn in simple terms with an everyday analogy.',
    },
    {
      title: 'Help me with my code',
      desc: 'Debug, optimize, or write React, Python, Java or TypeScript',
      icon: Code2,
      prompt: 'Review and optimize this code snippet for performance and clean architecture: ',
    },
    {
      title: 'Help me write something',
      desc: 'Draft executive emails, study notes, or compelling summaries',
      icon: PenTool,
      prompt: 'Draft a polite and clear email requesting an update on a high-priority project.',
    },
    {
      title: "Let's talk (Live Voice)",
      desc: 'Speak naturally in English, Hindi, or Hinglish',
      icon: Mic,
      action: onSwitchToVoice,
    },
    {
      title: 'Live Vision & Hand Gestures',
      desc: 'Show objects or count fingers via your webcam',
      icon: Camera,
      action: onSwitchToVision,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Scrollable messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center text-center">
            {/* Sentient Companion Glowing Orb */}
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[2px] shadow-2xl shadow-cyan-500/20 animate-orb-float">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <div className="absolute -inset-2 bg-cyan-500/10 blur-xl -z-10 rounded-full" />
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Hello! I'm <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">SAHAYA</span>.
            </h1>
            <p className="mt-2 text-slate-400 text-sm md:text-base max-w-lg">
              Your intelligent digital companion. How can I make your day easier?
            </p>

            {/* Starter Suggestion Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl mt-10 text-left">
              {starterSuggestions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (item.action) {
                        item.action();
                      } else if (item.prompt) {
                        onSendMessage(item.prompt);
                      }
                    }}
                    className="p-3.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl transition-all duration-200 group flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-400 mb-2.5 group-hover:bg-cyan-950 group-hover:text-cyan-300 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h2 className="text-xs font-semibold text-slate-200 group-hover:text-white">
                        {item.title}
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 group-hover:text-cyan-400 mt-3 pt-2 border-t border-slate-800/40">
                      <span>Launch</span>
                      <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-1">
            {messages.map((msg, index) => {
              const isLastAssistant =
                msg.role === 'assistant' &&
                index === messages.length - 1 &&
                !isStreaming;

              return (
                <ChatMessageItem
                  key={msg.id || index}
                  message={msg}
                  isLastAssistant={isLastAssistant}
                  onRegenerate={onRegenerate}
                  onEdit={(newContent) => onEditMessage(msg.id, newContent)}
                />
              );
            })}

            {/* Active Streaming Token Display */}
            {isStreaming && (
              <div className="py-5 px-4 md:px-6 bg-slate-900/40 border-y border-slate-800/40">
                <div className="max-w-3xl mx-auto flex gap-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 p-[1px] shadow-md shadow-violet-900/30 flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">SAHAYA AI</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-cyan-400 font-medium">Generating response...</span>
                    </div>
                    <div className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">
                      {streamingMessage || 'Thinking...'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom fixed chat input */}
      <ChatInput
        onSendMessage={onSendMessage}
        isStreaming={isStreaming}
        onStopStreaming={onStopStreaming}
        onSwitchToVision={onSwitchToVision}
      />
    </div>
  );
};
