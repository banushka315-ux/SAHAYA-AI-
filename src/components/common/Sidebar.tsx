import React, { useState } from 'react';
import { Conversation, Mode } from '../../types';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Mic,
  Eye,
  CheckSquare,
  Compass,
  Sparkles,
  Bookmark,
  X,
  Edit2,
  Check,
} from 'lucide-react';

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  isOpen: boolean;
  onClose: () => void;
  currentMode: Mode;
  onSelectMode: (mode: Mode) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  onOpenSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const confirmRename = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 w-72 bg-slate-950 border-r border-slate-800/80 z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top actions: New Chat & Close (on mobile) */}
        <div className="p-3 border-b border-slate-800/60 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onNewConversation();
              onSelectMode('chat');
              if (window.innerWidth < 768) onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600/90 to-indigo-600/90 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-violet-950/40 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>

          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 md:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Mode Navigation Shortcuts */}
        <div className="px-3 py-2 border-b border-slate-800/60 space-y-0.5">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
            Interaction Modes
          </div>
          <button
            onClick={() => {
              onSelectMode('chat');
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentMode === 'chat'
                ? 'bg-violet-950/50 text-violet-300 border border-violet-800/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-violet-400" />
            <span>Chat Assistant</span>
          </button>

          <button
            onClick={() => {
              onSelectMode('voice');
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentMode === 'voice'
                ? 'bg-cyan-950/50 text-cyan-300 border border-cyan-800/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Voice Mode</span>
          </button>

          <button
            onClick={() => {
              onSelectMode('vision');
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              currentMode === 'vision'
                ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>Vision & Gestures</span>
          </button>
        </div>

        {/* Conversation History List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-1 flex items-center justify-between">
            <span>Recent Conversations</span>
            <span className="text-[10px] text-slate-500">{conversations.length}</span>
          </div>

          {filteredConversations.length === 0 ? (
            <div className="text-center py-6 px-3">
              <p className="text-xs text-slate-500">
                {searchQuery ? 'No matching chats found' : 'No conversations yet.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = activeId === c.id;
              const isEditing = editingId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectConversation(c.id);
                      onSelectMode('chat');
                      if (window.innerWidth < 768) onClose();
                    }
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-slate-800 text-white font-medium shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-violet-400' : 'text-slate-500'}`} />
                    {isEditing ? (
                      <div className="flex items-center gap-1 flex-1 pr-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename(c.id, e);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className="w-full bg-slate-950 border border-violet-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                        />
                        <button
                          onClick={(e) => confirmRename(c.id, e)}
                          className="p-1 text-emerald-400 hover:bg-slate-700 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="truncate">{c.title || 'Untitled Chat'}</span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={(e) => startRename(c, e)}
                        className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteConversation(c.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Utility Links */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <button
            onClick={() => {
              onSelectMode('productivity');
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentMode === 'productivity'
                ? 'bg-cyan-950/50 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>To-Do & Tasks</span>
          </button>

          <button
            onClick={() => {
              onSelectMode('explore');
              if (window.innerWidth < 768) onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentMode === 'explore'
                ? 'bg-violet-950/50 text-violet-300'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-violet-400" />
            <span>Explore 12 Assistants</span>
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
            <span>Personalized Memory</span>
          </button>
        </div>
      </aside>
    </>
  );
};
