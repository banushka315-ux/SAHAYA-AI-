import fs from 'fs';
import path from 'path';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: {
    name: string;
    type: string;
    url?: string;
    data?: string;
  }[];
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  mode?: 'chat' | 'voice' | 'vision';
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  category: 'work' | 'study' | 'personal' | 'coding' | 'other';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  dueDate?: string;
  createdAt: number;
}

export interface UserMemoryItem {
  id: string;
  key: string;
  value: string;
  createdAt: number;
}

export interface UserProfile {
  name: string;
  email: string;
  preferredLanguage: 'English' | 'Hindi' | 'Hinglish' | 'Spanish' | 'French';
  voiceName: string;
  voiceSpeed: number;
  responseStyle: 'balanced' | 'concise' | 'detailed' | 'creative';
  theme: 'dark' | 'light' | 'system';
  enableVoiceInterruption: boolean;
  enableGestureShortcuts: boolean;
}

interface DatabaseSchema {
  conversations: Conversation[];
  tasks: TaskItem[];
  memory: UserMemoryItem[];
  profile: UserProfile;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'sahaya_data.json');

const defaultProfile: UserProfile = {
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

const initialConversations: Conversation[] = [
  {
    id: 'welcome-conv',
    title: 'Welcome to SAHAYA AI',
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000,
    mode: 'chat',
    messages: [
      {
        id: 'msg-1',
        role: 'assistant',
        content: `**Namaste! I'm SAHAYA AI** — your intelligent companion, helper and guide.

Here are a few ways we can work together:
* **Chat Mode:** Ask me anything — from complex programming and academic science to creative writing and everyday life planning.
* **Voice Mode:** Speak naturally with me in English, Hindi, or Hinglish with low latency and real-time audio.
* **Vision Mode:** Turn on your camera for live **Hand Landmark tracking**, real-time **finger counting**, **gesture recognition**, and visual document/object analysis.
* **Productivity & Memory:** Manage to-do tasks and let me remember your personal preferences.

What would you like to explore today?`,
        timestamp: Date.now() - 3600000,
      },
    ],
  },
];

const initialTasks: TaskItem[] = [
  {
    id: 't-1',
    title: 'Explore Vision Mode with Hand Gestures & Finger Counting',
    description: 'Switch to Vision Mode, show 3 fingers, and test real-time gesture recognition',
    category: 'study',
    priority: 'high',
    completed: false,
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    createdAt: Date.now() - 7200000,
  },
  {
    id: 't-2',
    title: 'Try real-time Voice conversation in English or Hindi',
    description: 'Click Voice Mode and ask questions like "Explain quantum computing in simple words"',
    category: 'personal',
    priority: 'medium',
    completed: false,
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    createdAt: Date.now() - 3600000,
  },
];

const initialMemory: UserMemoryItem[] = [
  {
    id: 'mem-1',
    key: 'Assistant Persona',
    value: 'Helpful, warm, empathetic, concise when speaking, comprehensive in technical code answers.',
    createdAt: Date.now(),
  },
  {
    id: 'mem-2',
    key: 'Preferred Language',
    value: 'Fluent in English with seamless Hindi/Hinglish understanding.',
    createdAt: Date.now(),
  },
];

class Store {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Could not read store file, using in-memory state:', err);
    }

    return {
      conversations: initialConversations,
      tasks: initialTasks,
      memory: initialMemory,
      profile: defaultProfile,
    };
  }

  private save(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist store:', err);
    }
  }

  // Conversations
  getConversations(): Conversation[] {
    return [...this.data.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getConversation(id: string): Conversation | undefined {
    return this.data.conversations.find((c) => c.id === id);
  }

  saveConversation(conv: Conversation): Conversation {
    const idx = this.data.conversations.findIndex((c) => c.id === conv.id);
    conv.updatedAt = Date.now();
    if (idx >= 0) {
      this.data.conversations[idx] = conv;
    } else {
      this.data.conversations.unshift(conv);
    }
    this.save();
    return conv;
  }

  deleteConversation(id: string): boolean {
    const beforeLen = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    this.save();
    return this.data.conversations.length < beforeLen;
  }

  // Tasks
  getTasks(): TaskItem[] {
    return [...this.data.tasks].sort((a, b) => b.createdAt - a.createdAt);
  }

  saveTask(task: TaskItem): TaskItem {
    const idx = this.data.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      this.data.tasks[idx] = task;
    } else {
      this.data.tasks.unshift(task);
    }
    this.save();
    return task;
  }

  deleteTask(id: string): boolean {
    const beforeLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter((t) => t.id !== id);
    this.save();
    return this.data.tasks.length < beforeLen;
  }

  // Memory
  getMemory(): UserMemoryItem[] {
    return this.data.memory;
  }

  addMemory(key: string, value: string): UserMemoryItem {
    const item: UserMemoryItem = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      key,
      value,
      createdAt: Date.now(),
    };
    this.data.memory.push(item);
    this.save();
    return item;
  }

  deleteMemory(id: string): boolean {
    const before = this.data.memory.length;
    this.data.memory = this.data.memory.filter((m) => m.id !== id);
    this.save();
    return this.data.memory.length < before;
  }

  // Profile
  getProfile(): UserProfile {
    return this.data.profile;
  }

  updateProfile(profile: Partial<UserProfile>): UserProfile {
    this.data.profile = { ...this.data.profile, ...profile };
    this.save();
    return this.data.profile;
  }
}

export const store = new Store();
