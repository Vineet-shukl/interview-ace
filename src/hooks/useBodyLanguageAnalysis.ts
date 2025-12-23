import { useCallback, useRef, useState, useEffect } from 'react';

export interface BodyLanguageMetrics {
  postureScore: number; // 0-100
  isSlouchingNow: boolean;
  handMovementLevel: 'calm' | 'moderate' | 'nervous';
  handMovementCount: number;
  eyeContactScore: number; // 0-100
  overallScore: number; // 0-100
  feedback: string[];
}

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface PoseResults {
  poseLandmarks?: LandmarkPoint[];
}

// Helper to safely get visibility with default
const getVisibility = (landmark: LandmarkPoint | undefined): number => {
  return landmark?.visibility ?? 0;
};

// MediaPipe Pose landmark indices
const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
};

export const useBodyLanguageAnalysis = (videoElement: HTMLVideoElement | null) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [metrics, setMetrics] = useState<BodyLanguageMetrics>({
    postureScore: 100,
    isSlouchingNow: false,
    handMovementLevel: 'calm',
    handMovementCount: 0,
    eyeContactScore: 100,
    overallScore: 100,
    feedback: [],
  });

  const poseRef = useRef<unknown>(null);
  const cameraRef = useRef<{ stop: () => void } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Tracking for movement detection
  const previousLandmarksRef = useRef<LandmarkPoint[] | null>(null);
  const handMovementHistoryRef = useRef<number[]>([]);
  const postureHistoryRef = useRef<number[]>([]);
  const slouchCountRef = useRef(0);
  const nervousMovementCountRef = useRef(0);

  const calculatePostureScore = useCallback((landmarks: LandmarkPoint[]): { score: number; isSlouching: boolean } => {
    const leftShoulder = landmarks[LANDMARKS.LEFT_SHOULDER];
    const rightShoulder = landmarks[LANDMARKS.RIGHT_SHOULDER];
    const leftHip = landmarks[LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[LANDMARKS.RIGHT_HIP];
    const nose = landmarks[LANDMARKS.NOSE];

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || !nose) {
      return { score: 100, isSlouching: false };
    }

    // Check visibility
    const minVisibility = 0.5;
    if (getVisibility(leftShoulder) < minVisibility || getVisibility(rightShoulder) < minVisibility) {
      return { score: 100, isSlouching: false };
    }

    // Calculate shoulder alignment (should be horizontal)
    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
    const shoulderTiltScore = Math.max(0, 100 - shoulderTilt * 500);

    // Calculate forward lean (z-depth difference between shoulders and hips)
    const shoulderCenterZ = (leftShoulder.z + rightShoulder.z) / 2;
    const hipCenterZ = (leftHip.z + rightHip.z) / 2;
    const forwardLean = shoulderCenterZ - hipCenterZ;
    const forwardLeanScore = forwardLean > 0.1 ? Math.max(0, 100 - forwardLean * 200) : 100;

    // Calculate head position relative to shoulders
    const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
    const headOffset = Math.abs(nose.x - shoulderCenterX);
    const headAlignmentScore = Math.max(0, 100 - headOffset * 300);

    // Check for slouching (shoulders rounded forward or dropped)
    const shoulderCenterY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipCenterY = (leftHip.y + rightHip.y) / 2;
    const torsoRatio = (shoulderCenterY - hipCenterY);
    const isSlouching = torsoRatio < 0.15 || forwardLean > 0.15;

    const overallScore = (shoulderTiltScore + forwardLeanScore + headAlignmentScore) / 3;

    return { 
      score: Math.round(overallScore), 
      isSlouching 
    };
  }, []);

  const calculateHandMovement = useCallback((
    currentLandmarks: LandmarkPoint[], 
    previousLandmarks: LandmarkPoint[] | null
  ): { level: 'calm' | 'moderate' | 'nervous'; movementMagnitude: number } => {
    if (!previousLandmarks) {
      return { level: 'calm', movementMagnitude: 0 };
    }

    const leftWrist = currentLandmarks[LANDMARKS.LEFT_WRIST];
    const rightWrist = currentLandmarks[LANDMARKS.RIGHT_WRIST];
    const prevLeftWrist = previousLandmarks[LANDMARKS.LEFT_WRIST];
    const prevRightWrist = previousLandmarks[LANDMARKS.RIGHT_WRIST];

    if (!leftWrist || !rightWrist || !prevLeftWrist || !prevRightWrist) {
      return { level: 'calm', movementMagnitude: 0 };
    }

    // Calculate movement distance for each hand
    const leftMovement = Math.sqrt(
      Math.pow(leftWrist.x - prevLeftWrist.x, 2) +
      Math.pow(leftWrist.y - prevLeftWrist.y, 2)
    );

    const rightMovement = Math.sqrt(
      Math.pow(rightWrist.x - prevRightWrist.x, 2) +
      Math.pow(rightWrist.y - prevRightWrist.y, 2)
    );

    const totalMovement = (leftMovement + rightMovement) * 100;

    // Categorize movement level
    let level: 'calm' | 'moderate' | 'nervous' = 'calm';
    if (totalMovement > 8) {
      level = 'nervous';
    } else if (totalMovement > 3) {
      level = 'moderate';
    }

    return { level, movementMagnitude: totalMovement };
  }, []);

  const calculateEyeContactScore = useCallback((landmarks: LandmarkPoint[]): number => {
    const nose = landmarks[LANDMARKS.NOSE];
    
    if (!nose || getVisibility(nose) < 0.7) {
      return 50; // Can't determine, assume neutral
    }

    // Check if face is centered (looking at camera)
    const centerX = 0.5;
    const centerY = 0.4; // Slightly above center is ideal for eye contact
    
    const xOffset = Math.abs(nose.x - centerX);
    const yOffset = Math.abs(nose.y - centerY);

    // Score based on how centered the face is
    const xScore = Math.max(0, 100 - xOffset * 200);
    const yScore = Math.max(0, 100 - yOffset * 150);

    return Math.round((xScore + yScore) / 2);
  }, []);

  const generateFeedback = useCallback((
    postureScore: number,
    isSlouching: boolean,
    handLevel: 'calm' | 'moderate' | 'nervous',
    eyeScore: number
  ): string[] => {
    const feedback: string[] = [];

    if (isSlouching) {
      feedback.push('Sit up straight - you appear to be slouching');
    } else if (postureScore < 70) {
      feedback.push('Adjust your posture - keep shoulders back');
    }

    if (handLevel === 'nervous') {
      feedback.push('Take a breath - reduce hand movements');
    } else if (handLevel === 'moderate') {
      feedback.push('Try to keep hands calm and steady');
    }

    if (eyeScore < 50) {
      feedback.push('Look at the camera to maintain eye contact');
    }

    if (feedback.length === 0) {
      feedback.push('Great body language! Keep it up');
    }

    return feedback;
  }, []);

  const processResults = useCallback((results: PoseResults) => {
    if (!results.poseLandmarks) return;

    const landmarks = results.poseLandmarks;
    const { score: postureScore, isSlouching } = calculatePostureScore(landmarks);
    const { level: handLevel, movementMagnitude } = calculateHandMovement(landmarks, previousLandmarksRef.current);
    const eyeScore = calculateEyeContactScore(landmarks);

    // Update tracking refs
    previousLandmarksRef.current = [...landmarks];
    
    // Track hand movement over time
    handMovementHistoryRef.current.push(movementMagnitude);
    if (handMovementHistoryRef.current.length > 30) {
      handMovementHistoryRef.current.shift();
    }

    // Track posture over time
    postureHistoryRef.current.push(postureScore);
    if (postureHistoryRef.current.length > 30) {
      postureHistoryRef.current.shift();
    }

    // Count nervous movements
    if (handLevel === 'nervous') {
      nervousMovementCountRef.current++;
    }

    // Count slouching instances
    if (isSlouching) {
      slouchCountRef.current++;
    }

    // Calculate averages
    const avgPosture = postureHistoryRef.current.reduce((a, b) => a + b, 0) / postureHistoryRef.current.length;
    const avgHandMovement = handMovementHistoryRef.current.reduce((a, b) => a + b, 0) / handMovementHistoryRef.current.length;

    // Calculate overall score
    const handScore = avgHandMovement < 3 ? 100 : avgHandMovement < 8 ? 70 : 40;
    const overallScore = Math.round((avgPosture * 0.4) + (handScore * 0.3) + (eyeScore * 0.3));

    // Generate feedback
    const feedback = generateFeedback(postureScore, isSlouching, handLevel, eyeScore);

    setMetrics({
      postureScore: Math.round(avgPosture),
      isSlouchingNow: isSlouching,
      handMovementLevel: handLevel,
      handMovementCount: nervousMovementCountRef.current,
      eyeContactScore: eyeScore,
      overallScore,
      feedback,
    });
  }, [calculatePostureScore, calculateHandMovement, calculateEyeContactScore, generateFeedback]);

  const startAnalysis = useCallback(async () => {
    if (!videoElement || isAnalyzing) return;

    try {
      // Dynamically import MediaPipe modules
      const { Pose } = await import('@mediapipe/pose');
      const { Camera } = await import('@mediapipe/camera_utils');

      const pose = new Pose({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
        }
      });

      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults(processResults);

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          await pose.send({ image: videoElement });
        },
        width: 640,
        height: 480
      });

      poseRef.current = pose;
      cameraRef.current = camera;

      await camera.start();
      setIsAnalyzing(true);

    } catch (error) {
      console.error('Failed to initialize body language analysis:', error);
    }
  }, [videoElement, isAnalyzing, processResults]);

  const stopAnalysis = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsAnalyzing(false);
  }, []);

  const resetMetrics = useCallback(() => {
    previousLandmarksRef.current = null;
    handMovementHistoryRef.current = [];
    postureHistoryRef.current = [];
    slouchCountRef.current = 0;
    nervousMovementCountRef.current = 0;
    setMetrics({
      postureScore: 100,
      isSlouchingNow: false,
      handMovementLevel: 'calm',
      handMovementCount: 0,
      eyeContactScore: 100,
      overallScore: 100,
      feedback: [],
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  return {
    isAnalyzing,
    metrics,
    startAnalysis,
    stopAnalysis,
    resetMetrics,
  };
};
