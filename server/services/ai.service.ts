import { GoogleGenAI } from '@google/genai';
import { store } from '../db/store.js';

const apiKey = process.env.GEMINI_API_KEY || '';

export const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export const MODEL_FLASH = 'gemini-3.8-flash';

function buildSystemInstruction(mode: 'chat' | 'voice' | 'vision' = 'chat'): string {
  const profile = store.getProfile();
  const memories = store.getMemory();

  let memoryContext = '';
  if (memories.length > 0) {
    memoryContext = `\nPersistent Personal Context:\n` + memories.map((m) => `- ${m.key}: ${m.value}`).join('\n');
  }

  const baseInstruction = `You are SAHAYA AI — a world-class intelligent personal assistant and digital companion.
Brand Tagline: "Your world, made easier."
Meaning: SAHAYA means helper, companion, and support.

Tone & Demeanor:
- Warm, articulate, perceptive, highly intelligent, and genuinely supportive.
- Communicate naturally, never sounding robotic or repetitive.
- You natively understand and communicate in English, Hindi, and Hinglish depending on how the user addresses you.
- User's Preferred Language: ${profile.preferredLanguage}.
- User's Preferred Response Style: ${profile.responseStyle}.
${memoryContext}

Core Capabilities:
1. Everyday Assistance: Pragmatic solutions, organization, daily life decisions, scheduling advice.
2. Education & Study: Academic subjects (math, physics, biology, history), step-by-step problem breakdowns, flashcards, concept explanations with analogies.
3. Coding & Engineering: Production-grade code across Python, TypeScript, JavaScript, React, Node.js, C++, Java, algorithms, debugging, security, and architecture.
4. Writing & Research: Professional emails, reports, synthesis, rewriting, grammar refinement, and structured summaries.
5. Multimodal Vision: Analyzing camera frames, recognizing hand gestures, counting fingers, reading documents/whiteboards/diagrams, and identifying physical objects.

Mode-specific guidance:
${
  mode === 'voice'
    ? '- Keep spoken voice responses concise, conversational, punchy and direct (usually 1 to 3 natural sentences) so they sound fluid when read aloud, unless explicitly asked for a detailed lesson.'
    : mode === 'vision'
    ? '- You are analyzing visual inputs from the user camera. If the user asks about hand gestures or fingers, refer directly to what is visible. If the user shows a document or screen, transcribe or explain the relevant content. If asked about an object, specify what it is, its purpose, and key details.'
    : '- Use elegant Markdown with clear headings, lists, code fences with language tags, and tables when presenting structured information.'
}
`;

  return baseInstruction;
}

export async function generateChatStream(
  messages: { role: string; content: string; attachments?: any[] }[],
  mode: 'chat' | 'voice' | 'vision' = 'chat',
  onChunk: (text: string) => void
): Promise<string> {
  const systemInstruction = buildSystemInstruction(mode);

  // Convert messages to Gemini format contents
  const contents = messages.map((m) => {
    const parts: any[] = [];

    // If attachments present (images or docs)
    if (m.attachments && m.attachments.length > 0) {
      for (const att of m.attachments) {
        if (att.data && att.type?.startsWith('image/')) {
          parts.push({
            inlineData: {
              mimeType: att.type,
              data: att.data.replace(/^data:image\/[a-zA-Z]+;base64,/, ''),
            },
          });
        } else if (att.data && att.type === 'application/pdf') {
          parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: att.data.replace(/^data:application\/pdf;base64,/, ''),
            },
          });
        }
      }
    }

    parts.push({ text: m.content });

    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });

  const responseStream = await ai.models.generateContentStream({
    model: MODEL_FLASH,
    contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: 'Hello SAHAYA!' }] }],
    config: {
      systemInstruction,
    },
  });

  let fullText = '';
  for await (const chunk of responseStream) {
    const chunkText = chunk.text || '';
    fullText += chunkText;
    onChunk(chunkText);
  }

  return fullText;
}

export async function analyzeVisionFrame(
  base64Image: string,
  prompt: string = 'Describe what you see and identify any objects, text, hands or gestures visible.',
  clientHandContext?: { fingerCount?: number; gesture?: string }
): Promise<string> {
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

  let enrichedPrompt = prompt;
  if (clientHandContext) {
    enrichedPrompt += `\n[Vision sensor hint: Client detected finger count: ${clientHandContext.fingerCount ?? 'unknown'}, detected gesture: ${clientHandContext.gesture ?? 'none'}]`;
  }

  const systemInstruction = buildSystemInstruction('vision');

  const response = await ai.models.generateContent({
    model: MODEL_FLASH,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: enrichedPrompt },
        ],
      },
    ],
    config: {
      systemInstruction,
    },
  });

  return response.text || 'I analyzed the frame but could not retrieve visual details.';
}

export async function analyzeDocument(
  fileContent: string,
  mimeType: string,
  query: string = 'Summarize this document and highlight 5 key takeaways.'
): Promise<string> {
  const cleanBase64 = fileContent.replace(/^data:[^;]+;base64,/, '');

  const response = await ai.models.generateContent({
    model: MODEL_FLASH,
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this document thoroughly and answer the user query: ${query}. Provide clear headings, bullet points, and key insights.`,
          },
        ],
      },
    ],
    config: {
      systemInstruction: buildSystemInstruction('chat'),
    },
  });

  return response.text || 'Unable to analyze the document content.';
}
