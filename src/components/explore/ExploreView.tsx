import React from 'react';
import { Mode } from '../../types';
import {
  MessageSquare,
  Mic,
  Eye,
  Hand,
  CheckCircle,
  FileSearch,
  FileText,
  Code2,
  GraduationCap,
  PenTool,
  Search,
  CheckSquare,
  ArrowRight,
} from 'lucide-react';

interface ExploreViewProps {
  onSelectFeature: (mode: Mode, prefillPrompt?: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectFeature }) => {
  const assistants = [
    {
      id: 'chat',
      title: 'Conversational Chat Assistant',
      description: 'Engage in thoughtful, natural discussions. Solves everyday questions, clarifies difficult ideas, and structures knowledge.',
      icon: MessageSquare,
      color: 'from-violet-600 to-indigo-600',
      action: () => onSelectFeature('chat', 'Hi SAHAYA, can you introduce yourself and help me plan my day?'),
      tag: 'General Intelligence',
    },
    {
      id: 'voice',
      title: 'Real-Time Voice Assistant',
      description: 'Hands-free spoken conversations in English, Hindi, and Hinglish with natural voice responses and interruptibility.',
      icon: Mic,
      color: 'from-cyan-600 to-blue-600',
      action: () => onSelectFeature('voice'),
      tag: 'Voice AI',
    },
    {
      id: 'vision',
      title: 'Live Vision Assistant',
      description: 'Show objects, books, handwritten notes, whiteboards, or screens through your camera for instant visual explanations.',
      icon: Eye,
      color: 'from-emerald-600 to-teal-600',
      action: () => onSelectFeature('vision'),
      tag: 'Computer Vision',
    },
    {
      id: 'finger-counter',
      title: 'Hand Landmark & Finger Counter',
      description: 'Powered by MediaPipe 21-point tracking. Count raised fingers from 0 to 5 on one hand or 0 to 10 on both hands in real time.',
      icon: Hand,
      color: 'from-teal-600 to-cyan-600',
      action: () => onSelectFeature('vision'),
      tag: 'MediaPipe Vision',
    },
    {
      id: 'gesture-recognition',
      title: 'Gesture Recognition & Shortcuts',
      description: 'Recognizes Thumbs Up, Thumbs Down, Open Palm, Closed Fist, Victory/Peace, and Pointing gestures to trigger actions.',
      icon: CheckCircle,
      color: 'from-amber-600 to-orange-600',
      action: () => onSelectFeature('vision'),
      tag: 'Gestures',
    },
    {
      id: 'image-analyzer',
      title: 'Multimodal Image Analyzer',
      description: 'Upload photographs, diagrams, or charts for detailed scene decomposition, object counts, and educational explanations.',
      icon: FileSearch,
      color: 'from-purple-600 to-pink-600',
      action: () => onSelectFeature('chat', 'Please analyze this attached image and explain every key element in detail.'),
      tag: 'Multimodal',
    },
    {
      id: 'pdf-assistant',
      title: 'Document & PDF Assistant',
      description: 'Upload PDF manuals, research papers, or study notes. Extract key takeaways, generate MCQ quizzes, and query citations.',
      icon: FileText,
      color: 'from-rose-600 to-red-600',
      action: () => onSelectFeature('chat', 'Summarize this document with 5 executive bullet points, main thesis, and 3 discussion questions.'),
      tag: 'Document RAG',
    },
    {
      id: 'coding-assistant',
      title: 'Coding & Architecture Assistant',
      description: 'Write, debug, and optimize Python, JavaScript, TypeScript, React, Java, C++, and SQL with line-by-line explanations.',
      icon: Code2,
      color: 'from-sky-600 to-indigo-600',
      action: () => onSelectFeature('chat', 'Help me write and debug a clean, production-ready algorithm with time/space complexity analysis: '),
      tag: 'Engineering',
    },
    {
      id: 'study-assistant',
      title: 'Education & Study Companion',
      description: 'Step-by-step math solver, physics breakdown, concept revision flashcards, and exam preparation with customizable difficulty.',
      icon: GraduationCap,
      color: 'from-yellow-600 to-amber-600',
      action: () => onSelectFeature('chat', 'Create a structured 15-minute study guide and quiz for: '),
      tag: 'Education',
    },
    {
      id: 'writing-assistant',
      title: 'Professional Writing Assistant',
      description: 'Draft executive emails, project proposals, persuasive letters, blog articles, and polish grammar and tone effortlessly.',
      icon: PenTool,
      color: 'from-indigo-600 to-violet-600',
      action: () => onSelectFeature('chat', 'Draft a polished, professional email with a diplomatic and clear tone about: '),
      tag: 'Writing',
    },
    {
      id: 'research-assistant',
      title: 'Deep Research & Synthesis',
      description: 'Synthesize complex domains, compare alternative methodologies, organize research notes, and cross-reference perspectives.',
      icon: Search,
      color: 'from-blue-600 to-cyan-600',
      action: () => onSelectFeature('chat', 'Provide a comprehensive research synthesis comparing the top 3 approaches to: '),
      tag: 'Research',
    },
    {
      id: 'productivity-assistant',
      title: 'Productivity & Task Organizer',
      description: 'Manage daily priorities, organize action checklists, set reminders, and maintain personal productivity routines.',
      icon: CheckSquare,
      color: 'from-emerald-600 to-green-600',
      action: () => onSelectFeature('productivity'),
      tag: 'Productivity',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">SAHAYA AI</span> Capabilities
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Choose any specialized assistant below. Every module is fully integrated into the unified SAHAYA companion intelligence.
          </p>
        </div>

        {/* 12 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assistants.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={item.action}
                className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group cursor-pointer shadow-lg hover:shadow-cyan-950/20"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.color} p-[1px] shadow-md flex items-center justify-center`}>
                      <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-slate-100 group-hover:scale-110 transition-transform" />
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">{item.tag}</span>
                  </div>

                  <h2 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {item.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-cyan-400 group-hover:text-cyan-300 font-medium">
                  <span>Open Assistant</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
