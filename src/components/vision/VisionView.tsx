import React, { useState, useRef, useEffect, useCallback } from 'react';
import { visionDetector } from '../../services/vision-detector';
import { speechService } from '../../services/speech';
import { api } from '../../services/api';
import { HandDetectionResult, UserProfile } from '../../types';
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  Hand,
  Sparkles,
  HelpCircle,
  Volume2,
  Mic,
  MicOff,
  RotateCcw,
  Check,
  Eye,
  FileQuestion,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface VisionViewProps {
  profile: UserProfile;
  onSaveToConversation: (prompt: string, analysis: string, imageBase64?: string) => void;
}

export const VisionView: React.FC<VisionViewProps> = ({
  profile,
  onSaveToConversation,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [detectionResult, setDetectionResult] = useState<HandDetectionResult | null>(null);
  const [isMediaPipeReady, setIsMediaPipeReady] = useState<boolean>(false);

  // Vision Query State
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);

  // Voice + Vision State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceSpokenQuery, setVoiceSpokenQuery] = useState('');

  // Gesture Action Trigger state
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const lastGestureRef = useRef<string>('');

  const animFrameIdRef = useRef<number | null>(null);

  // Initialize MediaPipe once mounted
  useEffect(() => {
    let mounted = true;
    visionDetector.initialize().then((ready) => {
      if (mounted) {
        setIsMediaPipeReady(ready);
      }
    });

    return () => {
      mounted = false;
      stopCamera();
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, []);

  // Continuous Detection Loop
  const runDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= 2) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      const result = visionDetector.detect(video, performance.now());
      if (result) {
        setDetectionResult(result);
        visionDetector.draw(canvas, result);

        // Check configurable gesture action
        if (profile.enableGestureShortcuts && result.gesture !== lastGestureRef.current) {
          lastGestureRef.current = result.gesture;
          handleGestureAction(result.gesture);
        }
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animFrameIdRef.current = requestAnimationFrame(runDetection);
  }, [profile.enableGestureShortcuts]);

  const handleGestureAction = (gesture: string) => {
    if (gesture === 'Open Palm') {
      if (speechService.isSpeakingNow()) {
        speechService.stopSpeaking();
        triggerActionNotification('🖐️ Open Palm: Paused voice response');
      }
    } else if (gesture === 'Thumbs Up') {
      triggerActionNotification('👍 Thumbs Up detected: Confirmed');
    } else if (gesture === 'Closed Fist') {
      triggerActionNotification('✊ Closed Fist: Stopped active action');
    }
  };

  const triggerActionNotification = (text: string) => {
    setActionFeedback(text);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          animFrameIdRef.current = requestAnimationFrame(runDetection);
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Unable to access camera. Please allow camera permissions in your browser bar.'
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setDetectionResult(null);
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
    }
  };

  const toggleCameraFacing = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  useEffect(() => {
    if (isCameraActive) {
      startCamera();
    }
  }, [facingMode]);

  // Capture frame as base64 JPEG
  const captureFrame = (): string | null => {
    if (!videoRef.current || !isCameraActive) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Multimodal Vision Query (Gemini Vision)
  const askSahayaVision = async (queryText?: string) => {
    const frame = captureFrame();
    if (!frame) {
      setCameraError('Please activate the camera first to capture visual context.');
      return;
    }

    const promptToSend =
      queryText ||
      customPrompt.trim() ||
      'Describe what you see in front of the camera, including any hand gestures, finger count, objects, and text.';

    setIsAnalyzing(true);
    setAiAnalysisResult(null);

    try {
      const res = await api.analyzeVision(frame, promptToSend, {
        fingerCount: detectionResult?.fingerCount,
        gesture: detectionResult?.gesture,
      });

      setAiAnalysisResult(res.analysis);
      onSaveToConversation(promptToSend, res.analysis, frame);

      // Speak result aloud if user asked via voice
      if (isVoiceActive || queryText) {
        speechService.speak(res.analysis, profile.voiceName, profile.voiceSpeed);
      }
    } catch (err: any) {
      console.error('Vision analysis error:', err);
      setAiAnalysisResult('Failed to analyze frame: ' + (err.message || 'Network error'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Voice + Vision integration
  const toggleVoiceInVision = () => {
    if (isVoiceActive) {
      speechService.stopListening();
      setIsVoiceActive(false);
    } else {
      setIsVoiceActive(true);
      speechService.startListening(
        (transcript, isFinal) => {
          setVoiceSpokenQuery(transcript);
          if (isFinal) {
            askSahayaVision(transcript);
            setIsVoiceActive(false);
            speechService.stopListening();
          }
        },
        (err) => {
          console.warn('Voice vision error:', err);
          setIsVoiceActive(false);
        }
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto">
      {/* Top Banner / Controls */}
      <div className="p-4 md:px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              <span>Vision & Gesture Studio</span>
            </h1>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-medium">
              Live MediaPipe
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time hand landmarks, finger counting (0-10), gestures, and multimodal AI scene comprehension.
          </p>
        </div>

        {/* Camera action buttons */}
        <div className="flex items-center gap-2">
          {isCameraActive ? (
            <>
              <button
                onClick={toggleCameraFacing}
                className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                title="Flip Camera"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <button
                onClick={stopCamera}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition-all"
              >
                <CameraOff className="w-4 h-4" />
                <span>Stop Camera</span>
              </button>
            </>
          ) : (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-950/40 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Vision Workspace */}
      <div className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
        {/* Left Column: Camera Preview with HUD Overlay */}
        <div className="lg:col-span-7 flex flex-col space-y-3">
          <div className="relative aspect-video w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${
                isCameraActive ? 'block' : 'hidden'
              }`}
            />

            {/* Canvas Overlay for 21 Skeleton Landmarks & Gestures */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              } ${isCameraActive ? 'block' : 'hidden'}`}
            />

            {/* Camera Inactive Empty State */}
            {!isCameraActive && (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-slate-400 mb-4">
                  <Camera className="w-8 h-8" />
                </div>
                <h2 className="text-base font-semibold text-white">Camera is currently paused</h2>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Activate your webcam to count fingers in real time, track 21 hand joints, test gesture commands, or ask SAHAYA to inspect objects and documents.
                </p>
                <button
                  onClick={startCamera}
                  className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-teal-950/40 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Enable Live Camera</span>
                </button>
              </div>
            )}

            {/* Live HUD Floating Badges when camera is active */}
            {isCameraActive && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                {/* Finger Count & Gesture Pill */}
                <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-bold text-cyan-300">
                    {detectionResult ? `${detectionResult.fingerCount} Raised Fingers` : 'Detecting hands...'}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-300 font-medium">
                    {detectionResult?.gesture || 'No gesture'}
                  </span>
                </div>

                {/* Hand tracker confidence */}
                <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded-lg text-[11px] text-slate-400 font-mono">
                  {detectionResult?.landmarks.length
                    ? `${detectionResult.landmarks.length} Hand(s)`
                    : 'Show hand'}
                </div>
              </div>
            )}

            {/* Gesture Action Toast Notification */}
            {actionFeedback && (
              <div className="absolute bottom-4 inset-x-4 mx-auto w-fit bg-emerald-950/90 border border-emerald-500 text-emerald-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
                {actionFeedback}
              </div>
            )}

            {/* Camera error message */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
                <p className="text-xs text-rose-400 max-w-sm mb-4 leading-relaxed">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Real-time Telemetry & Supported Gestures Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Raised Fingers</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">
                {detectionResult ? detectionResult.fingerCount : 0}
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Active Gesture</span>
              <span className="text-xs font-semibold text-slate-200 truncate block mt-1">
                {detectionResult?.gesture || 'None'}
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Hands Visible</span>
              <span className="text-lg font-bold text-violet-400 font-mono">
                {detectionResult?.landmarks.length || 0}
              </span>
            </div>

            <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase block font-medium">Detection Engine</span>
              <span className="text-xs font-medium text-emerald-400 block mt-1">MediaPipe 21-pt</span>
            </div>
          </div>
        </div>

        {/* Right Column: Multimodal Vision Questions & Voice Interaction */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Ask SAHAYA Visual Assistant Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Ask SAHAYA About What She Sees</h2>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Gemini Vision</span>
            </div>

            {/* Quick pre-made visual questions */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 font-medium block">Quick Actions</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => askSahayaVision('How many fingers am I showing? Count and verify them.')}
                  disabled={!isCameraActive || isAnalyzing}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 disabled:opacity-50 transition-colors"
                >
                  "How many fingers am I showing?"
                </button>
                <button
                  onClick={() => askSahayaVision('What object am I holding in my hand? Explain what it is used for.')}
                  disabled={!isCameraActive || isAnalyzing}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 disabled:opacity-50 transition-colors"
                >
                  "What am I holding?"
                </button>
                <button
                  onClick={() => askSahayaVision('Read and summarize the text or document visible in the camera.')}
                  disabled={!isCameraActive || isAnalyzing}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 disabled:opacity-50 transition-colors"
                >
                  "Read this text / document"
                </button>
                <button
                  onClick={() => askSahayaVision('Explain this diagram or formula shown on screen/paper.')}
                  disabled={!isCameraActive || isAnalyzing}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 disabled:opacity-50 transition-colors"
                >
                  "Explain this diagram"
                </button>
              </div>
            </div>

            {/* Custom Query Input */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-[11px] text-slate-400 font-medium block">Custom Question</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. What color is my shirt? What is this book about?"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') askSahayaVision();
                  }}
                  disabled={isAnalyzing}
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => askSahayaVision()}
                  disabled={!isCameraActive || isAnalyzing}
                  className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all flex items-center gap-1 shadow-md shadow-cyan-900/20"
                >
                  {isAnalyzing ? (
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span>Ask</span>
                </button>
              </div>
            </div>

            {/* Voice + Vision Combined Trigger */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleVoiceInVision}
                  disabled={!isCameraActive}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isVoiceActive
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
                  }`}
                >
                  {isVoiceActive ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{isVoiceActive ? 'Listening...' : 'Voice + Vision Query'}</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-500">Speak while showing camera</span>
            </div>

            {voiceSpokenQuery && (
              <p className="text-xs text-slate-300 italic bg-slate-950 p-2 rounded-lg border border-slate-800">
                "{voiceSpokenQuery}"
              </p>
            )}
          </div>

          {/* AI Analysis Result Card */}
          <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                SAHAYA Vision Insights
              </span>
              {aiAnalysisResult && (
                <button
                  onClick={() => speechService.speak(aiAnalysisResult, profile.voiceName, profile.voiceSpeed)}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 rounded hover:bg-slate-800 transition-colors"
                  title="Read aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex-1 bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 overflow-y-auto text-xs text-slate-200 leading-relaxed max-h-[300px]">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-400 space-y-2">
                  <Sparkles className="w-6 h-6 text-cyan-400 animate-spin" />
                  <p>SAHAYA is inspecting the camera frame...</p>
                </div>
              ) : aiAnalysisResult ? (
                <div className="whitespace-pre-wrap">{aiAnalysisResult}</div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-8 text-center text-slate-500 space-y-1">
                  <Eye className="w-6 h-6 opacity-40 mb-1" />
                  <p className="text-xs text-slate-400 font-medium">No visual query run yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Click "How many fingers am I showing?" or ask a question to see SAHAYA's explanation here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
