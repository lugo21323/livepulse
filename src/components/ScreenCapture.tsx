'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ScreenCaptureProps {
  className?: string;
  onStop?: () => void;
}

export default function ScreenCapture({ className = '', onStop }: ScreenCaptureProps) {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCapture = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCapturing(true);

      // Handle user clicking "Stop sharing" in the browser bar
      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        // User cancelled the picker — not an error
        return;
      }
      setError('Screen sharing failed. Make sure you\'re using a supported browser.');
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCapturing(false);
    onStop?.();
  }, [onStop]);

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
        onClick={stopCapture}
        className="absolute top-3 right-3 z-20 px-3 py-1.5 bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold rounded-lg backdrop-blur-sm transition-colors"
      >
        Stop Sharing
      </button>
    </div>
  );
}
