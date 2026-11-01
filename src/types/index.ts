export type Mode = 'chat' | 'voice' | 'vision' | 'explore' | 'productivity';

export interface Attachment {
  name: string;
  type: string;
  size?: number;
  data: string; // base64
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  model?: string;
  error?: boolean;
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

export interface HandDetectionResult {
  fingerCount: number;
  leftHandFingers?: number;
  rightHandFingers?: number;
  gesture: string;
  confidence: number;
  landmarks: { x: number; y: number; z: number }[][];
  handedness: string[];
}
