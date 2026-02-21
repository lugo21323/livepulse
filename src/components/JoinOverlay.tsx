'use client';

import { QRCodeSVG } from 'qrcode.react';

interface JoinOverlayProps {
  sessionCode: string;
  title: string;
  speakerName: string;
  onlineCount: number;
  onClose: () => void;
}

export default function JoinOverlay({
  sessionCode,
  title,
  speakerName,
  onlineCount,
  onClose,
}: JoinOverlayProps) {
  // Build the join URL — audience scans this and goes straight into the session
  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/session/${sessionCode}`
      : '';

  return (
    <div className="fixed inset-0 z-50 bg-lp-bg flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-lp-muted hover:text-lp-text text-sm transition-colors"
      >
        ✕ Close
      </button>

      <div className="text-center max-w-lg mx-auto px-8">
        {/* Logo */}
        <div className="w-[72px] h-[72px] rounded-[18px] bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center mx-auto mb-6 text-3xl shadow-[0_8px_32px_rgba(108,92,231,0.3)]">
          ⚡
        </div>

        {/* Session info */}
        <h1 className="text-4xl font-bold tracking-tight mb-1">{title}</h1>
        <p className="text-lp-muted text-lg mb-8">{speakerName}</p>

        {/* QR Code */}
        <div className="inline-block bg-white p-5 rounded-2xl shadow-[0_8px_40px_rgba(108,92,231,0.25)] mb-6">
          <QRCodeSVG
            value={joinUrl}
            size={220}
            level="M"
            bgColor="#ffffff"
            fgColor="#0a0a0f"
          />
        </div>

        {/* Instructions */}
        <p className="text-lp-muted text-base mb-3">Scan to join, or go to</p>
        <p className="text-lp-text text-lg font-medium mb-6">
          {typeof window !== 'undefined' ? window.location.origin : ''}/join
        </p>

        {/* Session code */}
        <div className="inline-flex items-center gap-3 bg-lp-surface border border-lp-border rounded-2xl px-8 py-4">
          <span className="text-lp-muted text-base">Session code:</span>
          <span className="text-4xl font-extrabold tracking-[0.25em] text-lp-accent">{sessionCode}</span>
        </div>

        {/* Online count */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-lp-green animate-pulse-dot" />
          <span className="text-lp-muted text-base">{onlineCount} joined</span>
        </div>
      </div>
    </div>
  );
}
