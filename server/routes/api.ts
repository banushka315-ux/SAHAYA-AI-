import { Router } from 'express';
import { store, Conversation, Message, TaskItem } from '../db/store.js';
import { generateChatStream, analyzeVisionFrame, analyzeDocument, MODEL_FLASH } from '../services/ai.service.js';

export const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'SAHAYA AI',
    model: MODEL_FLASH,
    time: new Date().toISOString(),
  });
});

// User Profile & Settings
apiRouter.get('/auth/me', (req, res) => {
  res.json({
    user: store.getProfile(),
  });
});

apiRouter.put('/auth/profile', (req, res) => {
  const updated = store.updateProfile(req.body);
  res.json({ user: updated });
});

apiRouter.get('/settings', (req, res) => {
  res.json(store.getProfile());
});

apiRouter.put('/settings', (req, res) => {
  const updated = store.updateProfile(req.body);
  res.json(updated);
});

// Chat Endpoints
apiRouter.get('/chat/history', (req, res) => {
  res.json(store.getConversations());
});

apiRouter.get('/chat/:id', (req, res) => {
  const conv = store.getConversation(req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  res.json(conv);
});

apiRouter.post('/chat', async (req, res) => {
  try {
    const { conversationId, messages, mode = 'chat', title } = req.body;
    let conv: Conversation;

    if (conversationId) {
      const existing = store.getConversation(conversationId);
      if (existing) {
        conv = existing;
      } else {
        conv = {
          id: conversationId,
          title: title || 'New Conversation',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          mode,
        };
      }
    } else {
      conv = {
        id: 'conv-' + Math.random().toString(36).substring(2, 9),
        title: title || 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        mode,
      };
    }

    // Set messages
    conv.messages = messages || [];

    let generatedText = '';
    await generateChatStream(conv.messages, mode, (chunk) => {
      generatedText += chunk;
    });

    const assistantMsg: Message = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      role: 'assistant',
      content: generatedText,
      timestamp: Date.now(),
      model: MODEL_FLASH,
    };

    conv.messages.push(assistantMsg);

    // Auto title if default
    if (conv.title === 'New Conversation' && conv.messages.length > 0) {
      const firstUserMsg = conv.messages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        conv.title = firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? '...' : '');
      }
    }

    store.saveConversation(conv);

    res.json({
      conversation: conv,
      response: assistantMsg,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message || 'Error generating AI response' });
  }
});

// SSE Streaming for Chat
apiRouter.post('/chat/stream', async (req, res) => {
  try {
    const { messages, mode = 'chat' } = req.body;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await generateChatStream(messages, mode, (chunk) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Streaming failed' })}\n\n`);
    res.end();
  }
});

apiRouter.patch('/chat/:id', (req, res) => {
  const conv = store.getConversation(req.params.id);
  if (!conv) {
    return res.status(404).json({ error: 'Conversation not found' });
  }
  if (req.body.title !== undefined) conv.title = req.body.title;
  if (req.body.messages !== undefined) conv.messages = req.body.messages;
  if (req.body.mode !== undefined) conv.mode = req.body.mode;
  store.saveConversation(conv);
  res.json(conv);
});

apiRouter.delete('/chat/:id', (req, res) => {
  const deleted = store.deleteConversation(req.params.id);
  res.json({ success: deleted });
});

// Voice Interaction
apiRouter.post('/voice/respond', async (req, res) => {
  try {
    const { transcript, history = [], language = 'English' } = req.body;

    const messages = [
      ...history,
      {
        role: 'user',
        content: transcript,
      },
    ];

    let spokenText = '';
    await generateChatStream(messages, 'voice', (chunk) => {
      spokenText += chunk;
    });

    res.json({
      text: spokenText,
      transcript,
      language,
    });
  } catch (error: any) {
    console.error('Voice respond error:', error);
    res.status(500).json({ error: error.message || 'Voice generation failed' });
  }
});

// Vision Analysis
apiRouter.get('/vision/status', (req, res) => {
  res.json({
    status: 'active',
    supportedGestures: [
      'Thumbs Up',
      'Thumbs Down',
      'Open Palm',
      'Closed Fist',
      'Victory / Peace',
      'Pointing Finger',
      'Finger Count (0 to 10)',
    ],
    capabilities: ['Hand Landmarking', 'Finger Counting', 'Object Identification', 'Document OCR', 'Scene Explanation'],
  });
});

apiRouter.post('/vision/analyze', async (req, res) => {
  try {
    const { image, prompt, handContext } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    const analysis = await analyzeVisionFrame(image, prompt, handContext);
    res.json({
      analysis,
      handContext,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Vision analysis error:', error);
    res.status(500).json({ error: error.message || 'Vision analysis failed' });
  }
});

// Document Analysis
apiRouter.post('/documents/analyze', async (req, res) => {
  try {
    const { fileData, mimeType, query } = req.body;
    if (!fileData || !mimeType) {
      return res.status(400).json({ error: 'File data and mimeType are required' });
    }

    const result = await analyzeDocument(fileData, mimeType, query);
    res.json({
      result,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('Document analysis error:', error);
    res.status(500).json({ error: error.message || 'Document analysis failed' });
  }
});

// Productivity Tasks CRUD
apiRouter.get('/tasks', (req, res) => {
  res.json(store.getTasks());
});

apiRouter.post('/tasks', (req, res) => {
  const { title, description, category = 'work', priority = 'medium', dueDate } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  const task: TaskItem = {
    id: 'task-' + Math.random().toString(36).substring(2, 9),
    title,
    description,
    category,
    priority,
    completed: false,
    dueDate,
    createdAt: Date.now(),
  };

  store.saveTask(task);
  res.status(201).json(task);
});

apiRouter.patch('/tasks/:id', (req, res) => {
  const tasks = store.getTasks();
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const updated: TaskItem = {
    ...task,
    ...req.body,
    id: task.id, // prevent ID overwrite
  };

  store.saveTask(updated);
  res.json(updated);
});

apiRouter.delete('/tasks/:id', (req, res) => {
  const success = store.deleteTask(req.params.id);
  res.json({ success });
});

// Memory CRUD
apiRouter.get('/memory', (req, res) => {
  res.json(store.getMemory());
});

apiRouter.post('/memory', (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) {
    return res.status(400).json({ error: 'Key and value are required' });
  }
  const item = store.addMemory(key, value);
  res.status(201).json(item);
});

apiRouter.delete('/memory/:id', (req, res) => {
  const success = store.deleteMemory(req.params.id);
  res.json({ success });
});
