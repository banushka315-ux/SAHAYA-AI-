import React from 'react';
import { Mode, UserProfile } from '../../types';
import { 
  MessageSquare, 
  Mic, 
  Eye, 
  Compass, 
  CheckSquare, 
  Settings, 
  Menu,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentMode: Mode;
  onSelectMode: (mode: Mode) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  profile: UserProfile;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  onToggleSidebar,
  onOpenSettings,
  profile,
}) => {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile hamburger & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div 
          onClick={() => onSelectMode('chat')} 
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[1px] flex items-center justify-center shadow-lg shadow-violet-900/20 group-hover:shadow-cyan-500/25 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[7px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-white text-base">SAHAYA</span>
              <span className="text-xs font-semibold text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-1.5 py-0.2 rounded">AI</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block -mt-0.5">Your world, made easier</p>
          </div>
        </div>
      </div>

      {/* Center: The Three Primary Interaction Modes */}
      <nav aria-label="Interaction modes" className="flex items-center p-1 bg-slate-900/90 border border-slate-800 rounded-xl shadow-inner">
        <button
          onClick={() => onSelectMode('chat')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
            currentMode === 'chat'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => onSelectMode('voice')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
            currentMode === 'voice'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voice</span>
        </button>

        <button
          onClick={() => onSelectMode('vision')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
            currentMode === 'vision'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-teal-900/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Vision</span>
        </button>
      </nav>

      {/* Right: Explore, Productivity, Settings */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onSelectMode('explore')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            currentMode === 'explore'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-800/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Explore Capabilities"
        >
          <Compass className="w-4 h-4" />
          <span className="hidden md:inline">Explore</span>
        </button>

        <button
          onClick={() => onSelectMode('productivity')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            currentMode === 'productivity'
              ? 'bg-slate-800 text-cyan-400 border border-cyan-800/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
          title="Tasks & Productivity"
        >
          <CheckSquare className="w-4 h-4" />
          <span className="hidden md:inline">Tasks</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors"
          title="Settings & Personalization"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-violet-600 text-[11px] font-bold text-white flex items-center justify-center ring-1 ring-white/20 select-none ml-1">
          {profile.name.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
};
