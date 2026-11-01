import { HandDetectionResult } from '../types';

// Hand landmark connection indices in standard MediaPipe model (21 points)
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  // Index
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  // Middle
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  // Ring
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  // Pinky
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  // Palm base
  [5, 9],
  [9, 13],
  [13, 17],
];

export class VisionDetector {
  private handLandmarker: any = null;
  private isInitializing: boolean = false;
  private isReady: boolean = false;
  private initError: string | null = null;

  async initialize(): Promise<boolean> {
    if (this.isReady) return true;
    if (this.isInitializing) return false;

    this.isInitializing = true;
    this.initError = null;

    try {
      const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      });

      this.isReady = true;
      this.isInitializing = false;
      return true;
    } catch (err: any) {
      console.warn('MediaPipe initialization warning (using fallback analyzer if needed):', err);
      this.initError = err.message || 'MediaPipe load failed';
      this.isInitializing = false;
      // Even if WASM fails, our detector can still analyze captured frames or use fallback
      return false;
    }
  }

  detect(videoElement: HTMLVideoElement, timestamp: number): HandDetectionResult | null {
    if (!this.handLandmarker || !this.isReady) {
      return null;
    }

    try {
      if (videoElement.readyState < 2) return null;

      const results = this.handLandmarker.detectForVideo(videoElement, timestamp);
      if (!results || !results.landmarks || results.landmarks.length === 0) {
        return {
          fingerCount: 0,
          leftHandFingers: 0,
          rightHandFingers: 0,
          gesture: 'No Hand Detected',
          confidence: 0,
          landmarks: [],
          handedness: [],
        };
      }

      let totalFingers = 0;
      const handCounts: number[] = [];
      const gestures: string[] = [];
      const handednessList: string[] = [];

      for (let i = 0; i < results.landmarks.length; i++) {
        const hand = results.landmarks[i];
        const handedness = results.handednesses?.[i]?.[0]?.categoryName || (i === 0 ? 'Right' : 'Left');
        handednessList.push(handedness);

        const { count, gesture } = this.analyzeHand(hand, handedness);
        handCounts.push(count);
        gestures.push(gesture);
        totalFingers += count;
      }

      const primaryGesture = gestures[0] || 'Unknown';

      return {
        fingerCount: totalFingers,
        leftHandFingers: handCounts[1] !== undefined ? handCounts[1] : handCounts[0],
        rightHandFingers: handCounts[0],
        gesture: primaryGesture,
        confidence: results.handednesses?.[0]?.[0]?.score || 0.9,
        landmarks: results.landmarks,
        handedness: handednessList,
      };
    } catch (e) {
      console.error('Detection frame error:', e);
      return null;
    }
  }

  // Analyzes single hand landmarks (21 points)
  private analyzeHand(
    landmarks: { x: number; y: number; z: number }[],
    handedness: string
  ): { count: number; gesture: string; fingerStates: boolean[] } {
    if (!landmarks || landmarks.length < 21) {
      return { count: 0, gesture: 'None', fingerStates: [false, false, false, false, false] };
    }

    const wrist = landmarks[0];

    // Check 4 fingers: Index (8), Middle (12), Ring (16), Pinky (20)
    // A finger is raised if the tip is higher (lower y in screen coordinates) than its PIP joint
    const indexRaised = landmarks[8].y < landmarks[6].y;
    const middleRaised = landmarks[12].y < landmarks[10].y;
    const ringRaised = landmarks[16].y < landmarks[14].y;
    const pinkyRaised = landmarks[20].y < landmarks[18].y;

    // Thumb (4) check: tip distance from wrist vs IP joint, or x position relative to MCP (2)
    // Depending on handedness and hand rotation
    const thumbTip = landmarks[4];
    const thumbIp = landmarks[3];
    const thumbMcp = landmarks[2];
    const pinkyMcp = landmarks[17];

    // Distance to pinky base: thumb is extended if tip is further from pinky MCP than IP is
    const distTipToPinky = Math.hypot(thumbTip.x - pinkyMcp.x, thumbTip.y - pinkyMcp.y);
    const distIpToPinky = Math.hypot(thumbIp.x - pinkyMcp.x, thumbIp.y - pinkyMcp.y);
    const thumbRaised = distTipToPinky > distIpToPinky * 1.15;

    const fingerStates = [thumbRaised, indexRaised, middleRaised, ringRaised, pinkyRaised];
    const count = fingerStates.filter(Boolean).length;

    // Gesture Classification
    let gesture = `${count} Fingers`;

    const nonThumbCount = [indexRaised, middleRaised, ringRaised, pinkyRaised].filter(Boolean).length;

    if (count === 0) {
      gesture = 'Closed Fist';
    } else if (count === 5) {
      gesture = 'Open Palm';
    } else if (thumbRaised && nonThumbCount === 0) {
      // Check if thumb points up or down relative to wrist
      if (thumbTip.y < thumbMcp.y) {
        gesture = 'Thumbs Up';
      } else {
        gesture = 'Thumbs Down';
      }
    } else if (!thumbRaised && indexRaised && middleRaised && !ringRaised && !pinkyRaised) {
      gesture = 'Victory / Peace';
    } else if (!thumbRaised && indexRaised && !middleRaised && !ringRaised && !pinkyRaised) {
      gesture = 'Pointing Finger';
    } else if (thumbRaised && indexRaised && !middleRaised && !ringRaised && !pinkyRaised) {
      gesture = '2 Fingers (Gun/L-Shape)';
    } else if (!thumbRaised && indexRaised && middleRaised && ringRaised && !pinkyRaised) {
      gesture = '3 Fingers';
    } else if (!thumbRaised && indexRaised && middleRaised && ringRaised && pinkyRaised) {
      gesture = '4 Fingers';
    } else if (count === 1 && thumbRaised) {
      gesture = 'Thumbs Up';
    } else if (count === 1 && indexRaised) {
      gesture = '1 Finger';
    }

    return { count, gesture, fingerStates };
  }

  // Draw overlay with modern neon HUD aesthetics on canvas
  draw(canvas: HTMLCanvasElement, result: HandDetectionResult | null): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!result || !result.landmarks || result.landmarks.length === 0) {
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    result.landmarks.forEach((handLandmarks, handIdx) => {
      const handedness = result.handedness[handIdx] || 'Hand';

      // 1. Draw connections
      ctx.lineWidth = 3;
      HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = handLandmarks[startIdx];
        const end = handLandmarks[endIdx];

        if (start && end) {
          const grad = ctx.createLinearGradient(start.x * width, start.y * height, end.x * width, end.y * height);
          grad.addColorStop(0, '#06b6d4'); // Cyan
          grad.addColorStop(1, '#8b5cf6'); // Violet

          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(start.x * width, start.y * height);
          ctx.lineTo(end.x * width, end.y * height);
          ctx.stroke();
        }
      });

      // 2. Draw landmark points
      handLandmarks.forEach((pt, idx) => {
        const cx = pt.x * width;
        const cy = pt.y * height;

        // Fingertip points (4, 8, 12, 16, 20) get extra glowing halos
        const isTip = [4, 8, 12, 16, 20].includes(idx);

        if (isTip) {
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#38bdf8';
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, 3, 0, 2 * Math.PI);
          ctx.fillStyle = '#a855f7';
          ctx.fill();
        }
      });

      // 3. Draw hand bounding HUD badge
      const wrist = handLandmarks[0];
      if (wrist) {
        const wx = wrist.x * width;
        const wy = Math.min(height - 20, wrist.y * height + 30);

        ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
        const label = `${handedness} · ${result.fingerCount} Fingers · ${result.gesture}`;
        const textMetrics = ctx.measureText(label);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1;
        ctx.roundRect(wx - textMetrics.width / 2 - 10, wy - 16, textMetrics.width + 20, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.fillText(label, wx, wy);
      }
    });
  }
}

export const visionDetector = new VisionDetector();
