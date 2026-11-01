import React, { useState, useEffect } from 'react';
import { UserProfile, UserMemoryItem } from '../../types';
import { api } from '../../services/api';
import {
  X,
  User,
  Volume2,
  Languages,
  Bookmark,
  Trash2,
  Plus,
  Hand,
  Check,
  Shield,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'voice' | 'memory' | 'gestures'>('profile');
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [memories, setMemories] = useState<UserMemoryItem[]>([]);
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemVal, setNewMemVal] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setFormData(profile);
    if (isOpen) {
      loadMemories();
    }
  }, [profile, isOpen]);

  const loadMemories = async () => {
    try {
      const data = await api.getMemory();
      setMemories(data);
    } catch (e) {
      console.error('Failed to load memories:', e);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile(formData);
      onUpdateProfile(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemKey.trim() || !newMemVal.trim()) return;

    try {
      const item = await api.addMemory(newMemKey.trim(), newMemVal.trim());
      setMemories((prev) => [...prev, item]);
      setNewMemKey('');
      setNewMemVal('');
    } catch (e) {
      console.error('Failed to add memory:', e);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error('Failed to delete memory:', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Settings & Personalization</h2>
              <p className="text-[11px] text-slate-400">Configure assistant behavior, voice, and memory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-800/80 px-6 gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            General & Style
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'voice'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Voice & Speech
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'memory'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Personalized Memory ({memories.length})
          </button>
          <button
            onClick={() => setActiveTab('gestures')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'gestures'
                ? 'border-cyan-400 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Gesture Controls
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Your Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Preferred Language</label>
                <select
                  value={formData.preferredLanguage}
                  onChange={(e) => setFormData({ ...formData, preferredLanguage: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="English">English</option>
                  <option value="Hindi">हिंदी (Hindi)</option>
                  <option value="Hinglish">Hinglish (Hindi + English)</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  SAHAYA automatically speaks and writes in your preferred language.
                </p>
              </div>

              <div>
                <label className="text-slate-400 font-medium block mb-1">Response Style</label>
                <select
                  value={formData.responseStyle}
                  onChange={(e) => setFormData({ ...formData, responseStyle: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="balanced">Balanced (Friendly, structured & accurate)</option>
                  <option value="concise">Concise (Direct answers with minimal fluff)</option>
                  <option value="detailed">Detailed (Comprehensive explanations & code breakdowns)</option>
                  <option value="creative">Creative (Imaginative analogies & brainstorming)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow"
                >
                  {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
                  <span>{savedSuccess ? 'Saved!' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'voice' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-slate-400 font-medium block mb-1">Voice Speed ({formData.voiceSpeed}x)</label>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.05"
                  value={formData.voiceSpeed}
                  onChange={(e) => setFormData({ ...formData, voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-medium block">Voice Interruption</span>
                  <span className="text-[11px] text-slate-500">
                    Tap anywhere or speak to instantly stop SAHAYA while she is talking.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableVoiceInterruption}
                  onChange={(e) => setFormData({ ...formData, enableVoiceInterruption: e.target.checked })}
                  className="w-4 h-4 accent-cyan-500 rounded"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs shadow"
                >
                  {savedSuccess ? 'Saved!' : 'Save Voice Settings'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              <div>
                <p className="text-slate-300 font-medium mb-1">What SAHAYA Remembers About You</p>
                <p className="text-[11px] text-slate-500">
                  Explicit memory items are saved and injected into SAHAYA's context to provide personalized assistance. You can review, add, or delete memories at any time.
                </p>
              </div>

              {/* Add memory form */}
              <form onSubmit={handleAddMemory} className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Topic / Key (e.g. Current Project, Coding Style)"
                    value={newMemKey}
                    onChange={(e) => setNewMemKey(e.target.value)}
                    required
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    placeholder="Memory detail (e.g. Building with React & TypeScript)"
                    value={newMemVal}
                    onChange={(e) => setNewMemVal(e.target.value)}
                    required
                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium rounded-lg text-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Memory</span>
                  </button>
                </div>
              </form>

              {/* Memory List */}
              <div className="space-y-2">
                {memories.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-semibold text-slate-200 block">{m.key}</span>
                      <span className="text-slate-400 text-[11px] mt-0.5 block">{m.value}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(m.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                      title="Forget this memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'gestures' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-slate-200 font-medium block">Gesture-Based Actions</span>
                  <span className="text-[11px] text-slate-500">
                    Control voice playback and confirmations using camera gestures.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enableGestureShortcuts}
                  onChange={(e) => {
                    const updated = { ...formData, enableGestureShortcuts: e.target.checked };
                    setFormData(updated);
                    api.updateProfile(updated);
                    onUpdateProfile(updated);
                  }}
                  className="w-4 h-4 accent-cyan-500 rounded"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-300">Supported Gesture Shortcuts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="font-semibold text-emerald-400 block">🖐️ Open Palm</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Pause speech playback</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="font-semibold text-cyan-400 block">👍 Thumbs Up</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Confirm selection / task</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="font-semibold text-rose-400 block">✊ Closed Fist</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Stop active camera action</span>
                  </div>
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <span className="font-semibold text-violet-400 block">✌️ Victory / Peace</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Trigger finger count HUD</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
