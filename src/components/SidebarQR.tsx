'use client';

import { QRCodeSVG } from 'qrcode.react';

interface SidebarQRProps {
  sessionCode: string;
  onlineCount: number;
}

export default function SidebarQR({ sessionCode, onlineCount }: SidebarQRProps) {
  const joinUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/session/${sessionCode}`
      : '';

  return (
    <div className="p-4 border-t border-lp-border bg-lp-surface">
      {/* Prominent online count */}
      <div className="flex items-center justify-center gap-2 mb-3 py-2 bg-lp-bg rounded-lg">
        <span className="w-3 h-3 rounded-full bg-lp-green animate-pulse-dot" />
        <span className="text-lg font-bold text-lp-text">{onlineCount}</span>
        <span className="text-sm text-lp-muted">online</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="bg-white p-3 rounded-xl shrink-0">
          <QRCodeSVG
            value={joinUrl}
            size={160}
            level="M"
            bgColor="#ffffff"
            fgColor="#0a0a0f"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-lp-text mb-1">Scan to join</p>
          <p className="text-xs text-lp-muted truncate mb-3">
            {typeof window !== 'undefined' ? `${window.location.host}/join` : ''}
          </p>
          <div className="inline-flex items-center gap-2 bg-lp-bg rounded-lg px-3 py-2">
            <span className="text-xs text-lp-muted">CODE</span>
            <span className="text-lg font-extrabold tracking-[0.2em] text-lp-accent">{sessionCode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
