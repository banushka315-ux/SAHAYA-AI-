export type SpeechState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface SpeechVoiceOption {
  id: string;
  name: string;
  lang: string;
}

export class SpeechService {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isListening: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';
      }

      if ('speechSynthesis' in window) {
        this.synthesis = window.speechSynthesis;
        this.loadVoices();
        if (this.synthesis.onvoiceschanged !== undefined) {
          this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
      }
    }
  }

  private loadVoices(): void {
    if (this.synthesis) {
      this.voices = this.synthesis.getVoices();
    }
  }

  getAvailableVoices(): SpeechVoiceOption[] {
    this.loadVoices();
    return this.voices
      .filter((v) => v.lang.startsWith('en') || v.lang.startsWith('hi'))
      .map((v) => ({
        id: v.voiceURI,
        name: `${v.name} (${v.lang})`,
        lang: v.lang,
      }));
  }

  setLanguage(lang: 'English' | 'Hindi' | 'Hinglish'): void {
    if (this.recognition) {
      if (lang === 'Hindi') {
        this.recognition.lang = 'hi-IN';
      } else if (lang === 'Hinglish') {
        this.recognition.lang = 'en-IN';
      } else {
        this.recognition.lang = 'en-US';
      }
    }
  }

  startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (err: any) => void
  ): boolean {
    if (!this.recognition) {
      onError(new Error('Speech recognition is not supported in this browser. You can type your voice query!'));
      return false;
    }

    try {
      this.isListening = true;

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript.trim()) {
          onTranscript(finalTranscript.trim(), true);
        } else if (interimTranscript.trim()) {
          onTranscript(interimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error !== 'no-speech') {
          onError(event);
        }
      };

      this.recognition.onend = () => {
        // If still flagged as listening, restart (keeps continuous speech alive)
        if (this.isListening) {
          try {
            this.recognition.start();
          } catch (e) {
            // ignore re-start race conditions
          }
        }
      };

      this.recognition.start();
      return true;
    } catch (e: any) {
      onError(e);
      return false;
    }
  }

  stopListening(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  speak(
    text: string,
    voiceName?: string,
    speed: number = 1.0,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      this.stopSpeaking();

      // Clean markdown tags from speech string (remove asterisks, hashes, backticks, code blocks)
      const cleanText = text
        .replace(/```[\s\S]*?```/g, 'Code block omitted.')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_#~>]/g, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = Math.max(0.7, Math.min(1.5, speed));
      utterance.pitch = 1.0;

      // Select suitable voice
      this.loadVoices();
      let matchedVoice = this.voices.find(
        (v) => voiceName && (v.voiceURI.includes(voiceName) || v.name.includes(voiceName))
      );

      if (!matchedVoice) {
        // Find best natural or Indian/Google English voice
        matchedVoice =
          this.voices.find((v) => v.lang === 'en-IN') ||
          this.voices.find((v) => v.name.includes('Google') || v.name.includes('Natural')) ||
          this.voices.find((v) => v.lang.startsWith('en')) ||
          this.voices[0];
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        if (onStart) onStart();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
        resolve();
      };

      utterance.onerror = () => {
        this.currentUtterance = null;
        if (onEnd) onEnd();
        resolve();
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    });
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.currentUtterance = null;
  }

  isSpeakingNow(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }
}

export const speechService = new SpeechService();
