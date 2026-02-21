'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ScreenCaptureProps {
  className?: string;
  stream: MediaStream;
  onStop: () => void;
}

export default function ScreenCapture({ className = '', stream, onStop }: ScreenCaptureProps) {
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Wire the stream to the video element
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const doStop = useCallback(() => {
    stream.getTracks().forEach((t) => t.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowStopConfirm(false);
    onStop();
  }, [stream, onStop]);

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
