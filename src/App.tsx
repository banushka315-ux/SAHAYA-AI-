import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, Mode, UserProfile, Attachment } from './types';
import { api } from './services/api';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ChatView } from './components/chat/ChatView';
import { VoiceView } from './components/voice/VoiceView';
import { VisionView } from './components/vision/VisionView';
import { ExploreView } from './components/explore/ExploreView';
import { ProductivityView } from './components/productivity/ProductivityView';
import { SettingsModal } from './components/settings/SettingsModal';

const defaultFallbackProfile: UserProfile = {
  name: 'Alex',
  email: 'alex@sahaya.ai',
  preferredLanguage: 'English',
  voiceName: 'Kavya (Warm)',
  voiceSpeed: 1.0,
  responseStyle: 'balanced',
  theme: 'dark',
  enableVoiceInterruption: true,
  enableGestureShortcuts: true,
};

export default function App() {
  const [currentMode, setCurrentMode] = useState<Mode>('chat');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile>(defaultFallbackProfile);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [convs, prof] = await Promise.all([
        api.getConversations().catch(() => []),
        api.getProfile().catch(() => defaultFallbackProfile),
      ]);

      setConversations(convs);
      setProfile(prof);

      if (convs.length > 0) {
        setActiveConvId(convs[0].id);
      }
    } catch (e) {
      console.error('Initialization error:', e);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  const handleSelectMode = (mode: Mode) => {
    setCurrentMode(mode);
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: 'conv-' + Math.random().toString(36).substring(2, 9),
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      mode: 'chat',
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newConv.id);
    setCurrentMode('chat');
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveConvId(remaining.length > 0 ? remaining[0].id : undefined);
      }
    } catch (e) {
      console.error('Delete conv error:', e);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await api.updateConversation(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch (e) {
      console.error('Rename conv error:', e);
    }
  };

  // Chat message sending with Streaming SSE
  const handleSendMessage = async (content: string, attachments?: Attachment[]) => {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    let conv = activeConversation;
    if (!conv) {
      conv = {
        id: 'conv-' + Math.random().toString(36).substring(2, 9),
        title: content.slice(0, 36) + (content.length > 36 ? '...' : ''),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        mode: 'chat',
      };
      setConversations((prev) => [conv!, ...prev]);
      setActiveConvId(conv.id);
    }

    const userMsg: Message = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      role: 'user',
      content,
      timestamp: Date.now(),
      attachments,
    };

    const updatedMessages = [...conv.messages, userMsg];

    // Optimistically update conversation
    const updatedConv = {
      ...conv,
      messages: updatedMessages,
      title:
        conv.title === 'New Conversation'
          ? content.slice(0, 36) + (content.length > 36 ? '...' : '')
          : conv.title,
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );

    // Stream response
    setIsStreaming(true);
    setStreamingText('');

    try {
      let accumulated = '';
      accumulated = await api.streamChatMessage(updatedMessages, 'chat', (chunk) => {
        setStreamingText((prev) => prev + chunk);
      });

      const assistantMsg: Message = {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: accumulated || streamingText,
        timestamp: Date.now(),
        model: 'gemini-3.8-flash',
      };

      const finalizedConv = {
        ...updatedConv,
        messages: [...updatedMessages, assistantMsg],
      };

      // Persist in backend
      await api.updateConversation(finalizedConv.id, finalizedConv);

      setConversations((prev) =>
        prev.map((c) => (c.id === finalizedConv.id ? finalizedConv : c))
      );
    } catch (err: any) {
      console.error('Streaming response failed:', err);
      // Fallback to standard chat endpoint if streaming fails
      try {
        const res = await api.sendChatMessage(
          conv.id,
          updatedMessages,
          'chat',
          updatedConv.title
        );
        setConversations((prev) =>
          prev.map((c) => (c.id === res.conversation.id ? res.conversation : c))
        );
      } catch (fallbackErr: any) {
        const errorMsg: Message = {
          id: 'msg-err-' + Date.now(),
          role: 'assistant',
          content: 'Sorry, I encountered an issue processing your request: ' + (fallbackErr.message || 'Network error'),
          timestamp: Date.now(),
          error: true,
        };
        const errConv = {
          ...updatedConv,
          messages: [...updatedMessages, errorMsg],
        };
        setConversations((prev) =>
          prev.map((c) => (c.id === errConv.id ? errConv : c))
        );
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleStopStreaming = () => {
    setIsStreaming(false);
    if (streamingText && activeConversation) {
      const assistantMsg: Message = {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: streamingText,
        timestamp: Date.now(),
      };
      const updated = {
        ...activeConversation,
        messages: [...activeConversation.messages, assistantMsg],
      };
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
      api.updateConversation(updated.id, updated);
      setStreamingText('');
    }
  };

  const handleRegenerate = async () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    const msgs = activeConversation.messages;
    const lastUserIndex = msgs.map((m) => m.role).lastIndexOf('user');
    if (lastUserIndex === -1) return;

    // Prune up to last user message
    const trimmed = msgs.slice(0, lastUserIndex + 1);
    const lastUserMsg = msgs[lastUserIndex];

    const updatedConv = { ...activeConversation, messages: trimmed };
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );

    setIsStreaming(true);
    setStreamingText('');

    try {
      const accumulated = await api.streamChatMessage(trimmed, 'chat', (chunk) => {
        setStreamingText((prev) => prev + chunk);
      });

      const assistantMsg: Message = {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: accumulated,
        timestamp: Date.now(),
        model: 'gemini-3.8-flash',
      };

      const finalConv = {
        ...updatedConv,
        messages: [...trimmed, assistantMsg],
      };

      await api.updateConversation(finalConv.id, finalConv);
      setConversations((prev) =>
        prev.map((c) => (c.id === finalConv.id ? finalConv : c))
      );
    } catch (e) {
      console.error('Regenerate error:', e);
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!activeConversation) return;
    const idx = activeConversation.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const trimmed = activeConversation.messages.slice(0, idx);
    const updatedUserMsg: Message = {
      ...activeConversation.messages[idx],
      content: newContent,
    };
    trimmed.push(updatedUserMsg);

    const updatedConv = { ...activeConversation, messages: trimmed };
    setConversations((prev) =>
      prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
    );

    // Generate new assistant response
    setIsStreaming(true);
    setStreamingText('');

    api.streamChatMessage(trimmed, 'chat', (chunk) => {
      setStreamingText((prev) => prev + chunk);
    })
      .then(async (accumulated) => {
        const assistantMsg: Message = {
          id: 'msg-' + Math.random().toString(36).substring(2, 9),
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
          model: 'gemini-3.8-flash',
        };
        const finalConv = {
          ...updatedConv,
          messages: [...trimmed, assistantMsg],
        };
        await api.updateConversation(finalConv.id, finalConv);
        setConversations((prev) =>
          prev.map((c) => (c.id === finalConv.id ? finalConv : c))
        );
      })
      .finally(() => {
        setIsStreaming(false);
        setStreamingText('');
      });
  };

  // Save Voice conversation turn into active chat history
  const handleSaveVoiceTurn = (userText: string, assistantText: string) => {
    let conv = activeConversation;
    if (!conv) {
      conv = {
        id: 'conv-' + Math.random().toString(36).substring(2, 9),
        title: 'Voice: ' + userText.slice(0, 24) + '...',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        mode: 'voice',
      };
      setConversations((prev) => [conv!, ...prev]);
      setActiveConvId(conv.id);
    }

    const uMsg: Message = {
      id: 'msg-u-' + Date.now(),
      role: 'user',
      content: `🎙️ ${userText}`,
      timestamp: Date.now(),
    };

    const aMsg: Message = {
      id: 'msg-a-' + Date.now(),
      role: 'assistant',
      content: assistantText,
      timestamp: Date.now(),
      model: 'gemini-3.8-flash (Voice)',
    };

    const updated = {
      ...conv,
      messages: [...conv.messages, uMsg, aMsg],
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    api.updateConversation(updated.id, updated);
  };

  // Save Vision query into active chat history
  const handleSaveVisionTurn = (prompt: string, analysis: string, imageBase64?: string) => {
    let conv = activeConversation;
    if (!conv) {
      conv = {
        id: 'conv-' + Math.random().toString(36).substring(2, 9),
        title: 'Vision: ' + prompt.slice(0, 24) + '...',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        mode: 'vision',
      };
      setConversations((prev) => [conv!, ...prev]);
      setActiveConvId(conv.id);
    }

    const uMsg: Message = {
      id: 'msg-u-' + Date.now(),
      role: 'user',
      content: `📷 ${prompt}`,
      timestamp: Date.now(),
      attachments: imageBase64
        ? [
            {
              name: 'camera_capture.jpg',
              type: 'image/jpeg',
              data: imageBase64,
            },
          ]
        : undefined,
    };

    const aMsg: Message = {
      id: 'msg-a-' + Date.now(),
      role: 'assistant',
      content: analysis,
      timestamp: Date.now(),
      model: 'gemini-3.8-flash (Vision)',
    };

    const updated = {
      ...conv,
      messages: [...conv.messages, uMsg, aMsg],
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    api.updateConversation(updated.id, updated);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Universal Header with 3 Modes */}
      <Header
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        profile={profile}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar */}
        <Sidebar
          conversations={conversations}
          activeId={activeConvId}
          onSelectConversation={(id) => setActiveConvId(id)}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentMode={currentMode}
          onSelectMode={handleSelectMode}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Dynamic Center Workspaces */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {currentMode === 'chat' && (
            <ChatView
              conversation={activeConversation}
              isStreaming={isStreaming}
              streamingMessage={streamingText}
              onSendMessage={handleSendMessage}
              onStopStreaming={handleStopStreaming}
              onRegenerate={handleRegenerate}
              onEditMessage={handleEditMessage}
              onSwitchToVoice={() => setCurrentMode('voice')}
              onSwitchToVision={() => setCurrentMode('vision')}
            />
          )}

          {currentMode === 'voice' && (
            <VoiceView
              onBackToChat={() => setCurrentMode('chat')}
              onSaveToConversation={handleSaveVoiceTurn}
              profile={profile}
            />
          )}

          {currentMode === 'vision' && (
            <VisionView
              profile={profile}
              onSaveToConversation={handleSaveVisionTurn}
            />
          )}

          {currentMode === 'explore' && (
            <ExploreView
              onSelectFeature={(mode, prompt) => {
                setCurrentMode(mode);
                if (prompt && mode === 'chat') {
                  handleSendMessage(prompt);
                }
              }}
            />
          )}

          {currentMode === 'productivity' && <ProductivityView />}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        profile={profile}
        onUpdateProfile={(updated) => setProfile(updated)}
      />
    </div>
  );
}
