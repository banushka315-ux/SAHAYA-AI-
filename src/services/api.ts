import { Conversation, Message, TaskItem, UserMemoryItem, UserProfile } from '../types';

export const api = {
  // Chat
  async getConversations(): Promise<Conversation[]> {
    const res = await fetch('/api/chat/history');
    if (!res.ok) throw new Error('Failed to load conversations');
    return res.json();
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await fetch(`/api/chat/${id}`);
    if (!res.ok) throw new Error('Failed to load conversation');
    return res.json();
  },

  async deleteConversation(id: string): Promise<void> {
    const res = await fetch(`/api/chat/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const res = await fetch(`/api/chat/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update conversation');
    return res.json();
  },

  async sendChatMessage(
    conversationId: string | undefined,
    messages: Message[],
    mode: 'chat' | 'voice' | 'vision' = 'chat',
    title?: string
  ): Promise<{ conversation: Conversation; response: Message }> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, messages, mode, title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Chat request failed');
    }
    return res.json();
  },

  // Stream chat messages with callback for SSE tokens
  async streamChatMessage(
    messages: Message[],
    mode: 'chat' | 'voice' | 'vision' = 'chat',
    onChunk: (text: string) => void
  ): Promise<string> {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, mode }),
    });

    if (!response.ok) {
      throw new Error('Streaming connection failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No readable stream');

    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.slice(6);
          if (dataStr === '[DONE]') {
            return accumulatedText;
          }
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              accumulatedText += parsed.text;
              onChunk(parsed.text);
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            // ignore JSON parse error for partial lines
          }
        }
      }
    }

    return accumulatedText;
  },

  // Vision
  async analyzeVision(image: string, prompt?: string, handContext?: any): Promise<{ analysis: string }> {
    const res = await fetch('/api/vision/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, prompt, handContext }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Vision analysis failed');
    }
    return res.json();
  },

  // Documents
  async analyzeDocument(fileData: string, mimeType: string, query?: string): Promise<{ result: string }> {
    const res = await fetch('/api/documents/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileData, mimeType, query }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Document analysis failed');
    }
    return res.json();
  },

  // Voice
  async voiceRespond(transcript: string, history: Message[] = []): Promise<{ text: string }> {
    const res = await fetch('/api/voice/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, history }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Voice response failed');
    }
    return res.json();
  },

  // Tasks
  async getTasks(): Promise<TaskItem[]> {
    const res = await fetch('/api/tasks');
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async createTask(task: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
  },

  async updateTask(id: string, updates: Partial<TaskItem>): Promise<TaskItem> {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    return res.json();
  },

  async deleteTask(id: string): Promise<void> {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
  },

  // Memory
  async getMemory(): Promise<UserMemoryItem[]> {
    const res = await fetch('/api/memory');
    if (!res.ok) throw new Error('Failed to fetch memory');
    return res.json();
  },

  async addMemory(key: string, value: string): Promise<UserMemoryItem> {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error('Failed to add memory');
    return res.json();
  },

  async deleteMemory(id: string): Promise<void> {
    const res = await fetch(`/api/memory/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete memory');
  },

  // Settings & Profile
  async getProfile(): Promise<UserProfile> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) throw new Error('Failed to fetch profile');
    const data = await res.json();
    return data.user;
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    const data = await res.json();
    return data.user;
  },
};
