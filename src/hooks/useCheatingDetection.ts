import { useCallback, useEffect, useRef, useState } from 'react';

export interface CheatingEvent {
  id: string;
  type: 'tab_switch' | 'looking_away' | 'phone_detected' | 'person_missing';
  timestamp: Date;
  duration?: number;
  message: string;
}

export interface CheatingMetrics {
  tabSwitchCount: number;
  lookAwayCount: number;
  phoneDetectedCount: number;
  personMissingCount: number;
  totalViolations: number;
  isCurrentlyLookingAway: boolean;
  isTabVisible: boolean;
  isPhoneDetected: boolean;
  isPersonMissing: boolean;
  events: CheatingEvent[];
  suspicionLevel: 'low' | 'medium' | 'high';
}

interface UseCheatingDetectionOptions {
  eyeContactThreshold?: number; // Below this score = looking away
  lookAwayDurationMs?: number; // How long before counting as looking away
  onViolation?: (event: CheatingEvent) => void;
}

export const useCheatingDetection = (options: UseCheatingDetectionOptions = {}) => {
  const {
    eyeContactThreshold = 40,
    lookAwayDurationMs = 2000,
    onViolation,
  } = options;

  const [metrics, setMetrics] = useState<CheatingMetrics>({
    tabSwitchCount: 0,
    lookAwayCount: 0,
    phoneDetectedCount: 0,
    personMissingCount: 0,
    totalViolations: 0,
    isCurrentlyLookingAway: false,
    isTabVisible: true,
    isPhoneDetected: false,
    isPersonMissing: false,
    events: [],
    suspicionLevel: 'low',
  });

  const lookAwayStartRef = useRef<number | null>(null);
  const personMissingStartRef = useRef<number | null>(null);
  const lastEyeScoreRef = useRef<number>(100);

  // Generate unique ID for events
  const generateEventId = () => `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add violation event
  const addEvent = useCallback((type: CheatingEvent['type'], message: string, duration?: number) => {
    const event: CheatingEvent = {
      id: generateEventId(),
      type,
      timestamp: new Date(),
      duration,
      message,
    };

    setMetrics((prev) => {
      const newEvents = [event, ...prev.events].slice(0, 50); // Keep last 50 events
      const newMetrics = {
        ...prev,
        events: newEvents,
        totalViolations: prev.totalViolations + 1,
      };

      // Update specific counters
      switch (type) {
        case 'tab_switch':
          newMetrics.tabSwitchCount = prev.tabSwitchCount + 1;
          break;
        case 'looking_away':
          newMetrics.lookAwayCount = prev.lookAwayCount + 1;
          break;
        case 'phone_detected':
          newMetrics.phoneDetectedCount = prev.phoneDetectedCount + 1;
          break;
        case 'person_missing':
          newMetrics.personMissingCount = prev.personMissingCount + 1;
          break;
      }

      // Calculate suspicion level
      const total = newMetrics.totalViolations;
      if (total >= 10) {
        newMetrics.suspicionLevel = 'high';
      } else if (total >= 5) {
        newMetrics.suspicionLevel = 'medium';
      } else {
        newMetrics.suspicionLevel = 'low';
      }

      return newMetrics;
    });

    onViolation?.(event);
  }, [onViolation]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      
      setMetrics((prev) => ({ ...prev, isTabVisible: isVisible }));

      if (!isVisible) {
        addEvent('tab_switch', 'User switched away from interview tab');
      }
    };

    // Also detect window blur/focus for additional coverage
    const handleWindowBlur = () => {
      setMetrics((prev) => ({ ...prev, isTabVisible: false }));
      addEvent('tab_switch', 'Interview window lost focus');
    };

    const handleWindowFocus = () => {
      setMetrics((prev) => ({ ...prev, isTabVisible: true }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [addEvent]);

  // Update eye contact / looking away status
  const updateEyeContact = useCallback((eyeContactScore: number) => {
    lastEyeScoreRef.current = eyeContactScore;
    const isLookingAway = eyeContactScore < eyeContactThreshold;

    if (isLookingAway) {
      if (!lookAwayStartRef.current) {
        lookAwayStartRef.current = Date.now();
      } else {
        const duration = Date.now() - lookAwayStartRef.current;
        if (duration >= lookAwayDurationMs) {
          setMetrics((prev) => {
            if (!prev.isCurrentlyLookingAway) {
              addEvent('looking_away', `User looked away for ${Math.round(duration / 1000)}s`, duration);
              return { ...prev, isCurrentlyLookingAway: true };
            }
            return prev;
          });
        }
      }
    } else {
      if (lookAwayStartRef.current) {
        lookAwayStartRef.current = null;
        setMetrics((prev) => ({ ...prev, isCurrentlyLookingAway: false }));
      }
    }
  }, [eyeContactThreshold, lookAwayDurationMs, addEvent]);

  // Update person detection status (from body language analysis)
  const updatePersonDetection = useCallback((isPersonDetected: boolean) => {
    if (!isPersonDetected) {
      if (!personMissingStartRef.current) {
        personMissingStartRef.current = Date.now();
      } else {
        const duration = Date.now() - personMissingStartRef.current;
        if (duration >= 3000) { // 3 seconds missing
          setMetrics((prev) => {
            if (!prev.isPersonMissing) {
              addEvent('person_missing', 'No person detected in camera view', duration);
              return { ...prev, isPersonMissing: true };
            }
            return prev;
          });
        }
      }
    } else {
      if (personMissingStartRef.current) {
        personMissingStartRef.current = null;
        setMetrics((prev) => ({ ...prev, isPersonMissing: false }));
      }
    }
  }, [addEvent]);

  // Phone detection (based on hand position near face - simplified heuristic)
  const updatePhoneDetection = useCallback((
    handNearFace: boolean,
    handMovementLevel: 'calm' | 'moderate' | 'nervous'
  ) => {
    // Heuristic: if hand is near face and movements are calm, likely holding phone
    const likelyPhone = handNearFace && handMovementLevel === 'calm';
    
    setMetrics((prev) => {
      if (likelyPhone && !prev.isPhoneDetected) {
        addEvent('phone_detected', 'Possible phone detected near face');
        return { ...prev, isPhoneDetected: true };
      } else if (!likelyPhone && prev.isPhoneDetected) {
        return { ...prev, isPhoneDetected: false };
      }
      return prev;
    });
  }, [addEvent]);

  // Manual phone detection trigger (can be called from pose analysis)
  const reportPhoneDetected = useCallback(() => {
    setMetrics((prev) => {
      if (!prev.isPhoneDetected) {
        addEvent('phone_detected', 'Phone or device detected in camera view');
        return { ...prev, isPhoneDetected: true, phoneDetectedCount: prev.phoneDetectedCount + 1 };
      }
      return prev;
    });
  }, [addEvent]);

  // Reset metrics
  const resetMetrics = useCallback(() => {
    lookAwayStartRef.current = null;
    personMissingStartRef.current = null;
    setMetrics({
      tabSwitchCount: 0,
      lookAwayCount: 0,
      phoneDetectedCount: 0,
      personMissingCount: 0,
      totalViolations: 0,
      isCurrentlyLookingAway: false,
      isTabVisible: true,
      isPhoneDetected: false,
      isPersonMissing: false,
      events: [],
      suspicionLevel: 'low',
    });
  }, []);

  // Clear phone detection flag
  const clearPhoneDetection = useCallback(() => {
    setMetrics((prev) => ({ ...prev, isPhoneDetected: false }));
  }, []);

  return {
    metrics,
    updateEyeContact,
    updatePersonDetection,
    updatePhoneDetection,
    reportPhoneDetected,
    clearPhoneDetection,
    resetMetrics,
  };
};
