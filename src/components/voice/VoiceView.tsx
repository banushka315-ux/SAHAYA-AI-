import React, { useState, useEffect, useRef } from 'react';
import { SpeechState, speechService } from '../../services/speech';
import { api } from '../../services/api';
import { Message, UserProfile } from '../../types';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Languages,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Square,
} from 'lucide-react';

interface VoiceViewProps {
  onBackToChat: () => void;
  onSaveToConversation: (userText: string, assistantText: string) => void;
  profile: UserProfile;
}

export const VoiceView: React.FC<VoiceViewProps> = ({
  onBackToChat,
  onSaveToConversation,
  profile,
}) => {
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [aiSpokenText, setAiSpokenText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi' | 'Hinglish'>(
    profile.preferredLanguage === 'Hindi' ? 'Hindi' : 'English'
  );
  const [voiceHistory, setVoiceHistory] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const silenceTimeoutRef = useRef<any>(null);

  // Set language in speech recognition
  useEffect(() => {
    speechService.setLanguage(selectedLanguage);
  }, [selectedLanguage]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      speechService.stopListening();
      speechService.stopSpeaking();
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
  }, []);

  const handleStartListening = () => {
    setErrorMsg(null);
    speechService.stopSpeaking();
    setLiveTranscript('');

    const started = speechService.startListening(
      (transcript, isFinal) => {
        setLiveTranscript(transcript);
        setSpeechState('listening');

        // Reset silence timer
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        // If user finished a phrase or pauses, send to SAHAYA
        if (isFinal) {
          sendVoiceQuery(transcript);
        } else {
          // If interim text received and user pauses for 1.8 seconds, treat as finished
          silenceTimeoutRef.current = setTimeout(() => {
            if (transcript.trim().length > 3) {
              sendVoiceQuery(transcript);
            }
          }, 1800);
        }
      },
      (err) => {
        console.warn('Voice recognition error:', err);
        setErrorMsg('Microphone permission required or no speech detected. Click the orb to retry.');
        setSpeechState('idle');
      }
    );

    if (started) {
      setSpeechState('listening');
    }
  };

  const handleStopListening = () => {
    speechService.stopListening();
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    setSpeechState('idle');
  };

  const sendVoiceQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    speechService.stopListening();
    setSpeechState('thinking');
    setLiveTranscript(queryText);

    try {
      const historyMessages: Message[] = voiceHistory.map((item, idx) => ({
        id: `vh-${idx}`,
        role: item.role,
        content: item.text,
        timestamp: Date.now(),
      }));

      const res = await api.voiceRespond(queryText, historyMessages);
      const answer = res.text;

      setAiSpokenText(answer);
      setVoiceHistory((prev) => [
        ...prev,
        { role: 'user', text: queryText },
        { role: 'assistant', text: answer },
      ]);

      onSaveToConversation(queryText, answer);

      // Now speak the answer aloud
      setSpeechState('speaking');
      await speechService.speak(
        answer,
        profile.voiceName,
        profile.voiceSpeed,
        () => setSpeechState('speaking'),
        () => {
          setSpeechState('idle');
          // Optionally auto-listen for conversational back-and-forth
        }
      );
    } catch (err: any) {
      console.error('Voice query error:', err);
      setErrorMsg(err.message || 'Failed to generate voice response');
      setSpeechState('error');
    }
  };

  const handleInterrupt = () => {
    speechService.stopSpeaking();
    speechService.stopListening();
    setSpeechState('idle');
  };

  const suggestedQuestions = [
    'Explain quantum computing in simple words',
    'Help me prepare for my Java exam',
    'Translate this sentence into Hindi',
    'How do I stay productive during deep work?',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 md:px-8 border-b border-slate-800/60 z-20">
        <button
          onClick={onBackToChat}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Chat</span>
        </button>

        {/* Language selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
          <Languages className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
          <button
            onClick={() => setSelectedLanguage('English')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              selectedLanguage === 'English' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setSelectedLanguage('Hindi')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              selectedLanguage === 'Hindi' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            हिंदी
          </button>
          <button
            onClick={() => setSelectedLanguage('Hinglish')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              selectedLanguage === 'Hinglish' ? 'bg-cyan-600 text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hinglish
          </button>
        </div>
      </div>

      {/* Center Interactive Companion Orb */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
        {/* Glow halo background */}
        <div
          className={`absolute w-72 h-72 md:w-96 md:h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            speechState === 'listening'
              ? 'bg-rose-500/20 scale-125'
              : speechState === 'thinking'
              ? 'bg-violet-500/25 scale-110 animate-pulse'
              : speechState === 'speaking'
              ? 'bg-cyan-500/30 scale-125'
              : 'bg-indigo-500/10 scale-100'
          }`}
        />

        {/* Central Clickable Orb */}
        <div
          onClick={
            speechState === 'listening'
              ? handleStopListening
              : speechState === 'speaking'
              ? handleInterrupt
              : handleStartListening
          }
          className={`relative w-44 h-44 md:w-56 md:h-56 rounded-full cursor-pointer flex items-center justify-center transition-transform duration-300 active:scale-95 group shadow-2xl ${
            speechState === 'listening'
              ? 'ring-4 ring-rose-500/60 shadow-rose-900/50'
              : speechState === 'thinking'
              ? 'ring-4 ring-violet-500/60 shadow-violet-900/50'
              : speechState === 'speaking'
              ? 'ring-4 ring-cyan-400/60 shadow-cyan-900/50'
              : 'ring-1 ring-slate-700/80 hover:ring-cyan-500/40 shadow-slate-950'
          }`}
        >
          {/* Inner Gradient Orb Sphere */}
          <div
            className={`w-full h-full rounded-full flex flex-col items-center justify-center p-6 text-center transition-all duration-500 ${
              speechState === 'listening'
                ? 'bg-gradient-to-tr from-rose-900 via-rose-600 to-amber-500 animate-pulse'
                : speechState === 'thinking'
                ? 'bg-gradient-to-tr from-violet-900 via-indigo-700 to-purple-500 animate-spin-slow'
                : speechState === 'speaking'
                ? 'bg-gradient-to-tr from-cyan-900 via-teal-600 to-indigo-500 animate-pulse-glow'
                : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 group-hover:from-slate-800 group-hover:to-cyan-950'
            }`}
          >
            {speechState === 'listening' ? (
              <>
                <Mic className="w-10 h-10 text-white animate-bounce" />
                <span className="text-xs font-semibold text-rose-100 mt-2">Listening...</span>
              </>
            ) : speechState === 'thinking' ? (
              <>
                <Sparkles className="w-10 h-10 text-violet-200 animate-spin" />
                <span className="text-xs font-semibold text-violet-100 mt-2">Thinking...</span>
              </>
            ) : speechState === 'speaking' ? (
              <>
                <Volume2 className="w-10 h-10 text-cyan-200 animate-pulse" />
                <span className="text-xs font-semibold text-cyan-100 mt-2">Speaking...</span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-slate-300 mt-2">Tap to Speak</span>
              </>
            )}
          </div>
        </div>

        {/* Audio Waveform visualization bars */}
        <div className="flex items-center gap-1.5 h-12 mt-6">
          {[40, 70, 30, 90, 60, 100, 50, 80, 45, 95, 35, 65].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                speechState === 'speaking'
                  ? 'bg-cyan-400'
                  : speechState === 'listening'
                  ? 'bg-rose-400'
                  : 'bg-slate-700'
              }`}
              style={{
                height:
                  speechState === 'speaking' || speechState === 'listening'
                    ? `${Math.max(8, (h * (Math.sin(Date.now() / 200 + i) + 1.2)) / 2)}px`
                    : '6px',
              }}
            />
          ))}
        </div>

        {/* Status & Live Transcription Box */}
        <div className="w-full max-w-xl mt-6 px-4 text-center min-h-[90px]">
          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl mb-3">
              {errorMsg}
            </p>
          )}

          {liveTranscript && (
            <div className="mb-2">
              <span className="text-[11px] text-slate-400 block mb-1 uppercase tracking-wider font-semibold">You</span>
              <p className="text-base font-medium text-slate-100 italic">
                "{liveTranscript}"
              </p>
            </div>
          )}

          {aiSpokenText && speechState !== 'listening' && (
            <div className="mt-3 p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl">
              <span className="text-[11px] text-cyan-400 block mb-1 uppercase tracking-wider font-semibold">SAHAYA</span>
              <p className="text-sm text-slate-200 leading-relaxed">
                {aiSpokenText}
              </p>
            </div>
          )}
        </div>

        {/* Suggested Voice Queries */}
        {speechState === 'idle' && !liveTranscript && (
          <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-lg">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendVoiceQuery(q)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                "{q}"
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="p-4 md:px-8 border-t border-slate-800/60 bg-slate-950/60 backdrop-blur-md flex items-center justify-between z-20">
        <div className="text-xs text-slate-500">
          State: <span className="text-slate-300 font-medium capitalize">{speechState}</span>
        </div>

        <div className="flex items-center gap-3">
          {speechState === 'speaking' && (
            <button
              onClick={handleInterrupt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium shadow-md transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Interrupt Voice</span>
            </button>
          )}

          {speechState === 'listening' ? (
            <button
              onClick={handleStopListening}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/40 transition-all"
            >
              <MicOff className="w-4 h-4" />
              <span>Stop Listening</span>
            </button>
          ) : (
            <button
              onClick={handleStartListening}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/40 transition-all"
            >
              <Mic className="w-4 h-4" />
              <span>Start Speaking</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
