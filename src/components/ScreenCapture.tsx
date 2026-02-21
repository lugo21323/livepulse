'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ScreenCaptureProps {
  className?: string;
  onStop?: () => void;
  autoStart?: boolean;
}

export default function ScreenCapture({ className = '', onStop, autoStart = false }: ScreenCaptureProps) {
  const [capturing, setCapturing] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const didAutoStart = useRef(false);

  // Wire stream to video element after it mounts
  useEffect(() => {
    if (capturing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [capturing]);

  const startCapture = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;

      // Handle user clicking "Stop sharing" in the browser bar
      stream.getVideoTracks()[0].onended = () => {
        doStop();
      };

      setCapturing(true);
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled the picker — notify parent so toggle resets
        onStop?.();
        return;
      }
      setError('Screen sharing failed. Make sure you\'re using a supported browser.');
    }
  }, [onStop]);

  const doStop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturing(false);
    setShowStopConfirm(false);
    onStop?.();
  }, [onStop]);

  // Auto-start capture when autoStart prop is true (e.g. sidebar toggle)
  useEffect(() => {
    if (autoStart && !didAutoStart.current && !capturing) {
      didAutoStart.current = true;
      startCapture();
    }
  }, [autoStart, capturing, startCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  if (!capturing) {
    return (
      <div className={`flex flex-col items-center justify-center bg-lp-surface gap-4 ${className}`}>
        <div className="text-center">
          <p className="text-5xl mb-4">🖥️</p>
          <p className="text-lp-text text-lg font-semibold mb-1">Share Your Screen</p>
          <p className="text-lp-muted text-sm max-w-sm">
            Share your PowerPoint, Keynote, browser, or any application running on your desktop
          </p>
        </div>
        <button
          onClick={startCapture}
          className="px-6 py-3 bg-lp-accent rounded-xl text-sm font-bold text-white hover:bg-lp-accent/80 transition-colors"
        >
          Start Screen Share
        </button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`relative bg-black overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
      />
      <button
        onClick={() => setShowStopConfirm(true)}
        className="absolute top-3 right-3 z-20 px-3 py-1.5 bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold rounded-lg backdrop-blur-sm transition-colors"
      >
        Stop Sharing
      </button>

      {/* Confirmation dialog */}
      {showStopConfirm && (
        <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowStopConfirm(false)}>
          <div className="bg-lp-surface border border-lp-border rounded-2xl p-6 max-w-sm w-full mx-4 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-3xl mb-3">🖥️</p>
            <h3 className="text-lg font-bold mb-2">Stop Screen Share?</h3>
            <p className="text-sm text-lp-muted mb-6">This will end your current screen share. You can start a new one anytime.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowStopConfirm(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-lp-border text-lp-muted hover:text-lp-text transition-colors">
                Keep Sharing
              </button>
              <button onClick={doStop} className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                Stop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
