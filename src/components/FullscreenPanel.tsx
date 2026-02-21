'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Message } from '@/lib/types';

type FullscreenTab = 'chat' | 'qa' | 'polls';

interface FullscreenPanelProps {
  activeTab: FullscreenTab;
  onTabChange: (tab: FullscreenTab) => void;
  sessionTitle?: string;
  speakerName?: string;
  sessionCode: string;
  messages: Message[];
  onClose: () => void;
  chatContent: React.ReactNode;
  qaContent: React.ReactNode;
  pollContent: React.ReactNode;
  archivedCount?: number;
  showArchived?: boolean;
  onToggleArchived?: () => void;
  onRestoreAll?: () => void;
}

export default function FullscreenPanel({
  activeTab, onTabChange, sessionTitle, speakerName, sessionCode, messages, onClose,
  chatContent, qaContent, pollContent,
  archivedCount = 0, showArchived = false, onToggleArchived, onRestoreAll,
}: FullscreenPanelProps) {
  const [qrFullscreen, setQrFullscreen] = useState(false);

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/session/${sessionCode}` : '';

  const chatMessages = messages.filter((m) => !m.is_question);
  const repliedToNames = new Set<string>();
  chatMessages.forEach((m) => {
    if (m.content.startsWith('@')) {
      const nameMatch = m.content.match(/^@([^:]+):/);
      if (nameMatch) repliedToNames.add(nameMatch[1]);
    }
  });
  const featured = chatMessages.filter(
    (m) => repliedToNames.has(m.author_name) && !m.content.startsWith('@')
  ).slice(-20);

  // Fullscreen QR overlay
  if (qrFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-lp-bg flex flex-col items-center justify-center">
        {/* Close button - same style as expand view */}
        <button
          onClick={() => setQrFullscreen(false)}
          className="absolute top-4 right-4 px-4 py-2 text-sm text-lp-muted hover:text-lp-text bg-lp-surface rounded-lg border border-lp-border transition-colors"
        >
          ✕ Close <span className="text-xs text-lp-muted ml-1">(Esc)</span>
        </button>

        <div className="text-center mb-8">
          {sessionTitle && <h1 className="text-4xl font-extrabold text-lp-text mb-2">{sessionTitle}</h1>}
          {speakerName && <p className="text-xl text-lp-muted font-medium">{speakerName}</p>}
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-2xl">
          <QRCodeSVG value={joinUrl} size={360} level="M" bgColor="#ffffff" fgColor="#0a0a0f" />
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="text-lg text-lp-muted font-medium">Join code:</span>
          <span className="text-4xl font-extrabold tracking-[0.25em] text-lp-accent">{sessionCode}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-lp-bg/95 backdrop-blur-sm flex flex-col presenter-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-lp-border shrink-0">
        <div className="flex items-center gap-4">
          {(sessionTitle || speakerName) && (
            <div className="flex items-center gap-3 pr-5 border-r border-lp-border">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-lg">⚡</div>
              <div>
                {sessionTitle && <p className="text-2xl font-extrabold text-lp-text leading-tight">{sessionTitle}</p>}
                {speakerName && <p className="text-sm text-lp-muted font-medium">{speakerName}</p>}
              </div>
            </div>
          )}
          {/* Tab switcher */}
          <div className="flex gap-1">
            {(['chat', 'qa', 'polls'] as FullscreenTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-lp-accent text-white'
                    : 'text-lp-muted hover:text-lp-text hover:bg-lp-surface'
                }`}
              >
                {tab === 'chat' ? 'Chat' : tab === 'qa' ? 'Q&A' : 'Polls'}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-lp-muted hover:text-lp-text bg-lp-surface rounded-lg border border-lp-border transition-colors"
        >
          ✕ Close <span className="text-xs text-lp-muted ml-1">(Esc)</span>
        </button>
      </div>

      {/* Archive bar (consistent with sidebar) */}
      {activeTab === 'chat' && archivedCount > 0 && onToggleArchived && onRestoreAll && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-lp-bg/60 border-b border-lp-border text-xs shrink-0">
          <span className="text-lp-muted">
            {archivedCount} archived
            {showArchived && <span className="text-lp-accent ml-1">(showing)</span>}
          </span>
          <div className="flex gap-3">
            <button onClick={onToggleArchived} className="text-lp-accent hover:text-lp-accent/80 font-medium transition-colors">
              {showArchived ? 'Hide' : 'Show'}
            </button>
            <button onClick={onRestoreAll} className="text-lp-muted hover:text-lp-text font-medium transition-colors">
              Restore all
            </button>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Left: Tab content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-4 py-2 border-b border-lp-border shrink-0">
            <h3 className="text-sm font-medium text-lp-muted">
              {activeTab === 'chat' ? 'All Messages' : activeTab === 'qa' ? 'Questions & Answers' : 'Polls'}
            </h3>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'chat' && chatContent}
            {activeTab === 'qa' && qaContent}
            {activeTab === 'polls' && (
              <div className="h-full overflow-y-auto flex justify-center p-6">
                <div className="w-full max-w-2xl">
                  {pollContent}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar: Featured comments */}
        {activeTab !== 'polls' && (
          <div className="w-[380px] border-l border-lp-border flex flex-col shrink-0 overflow-hidden">
            <div className="px-4 py-2 border-b border-lp-border shrink-0">
              <h3 className="text-sm font-medium text-lp-muted flex items-center gap-2">
                <span>⭐</span> Featured Comments
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
              {featured.length === 0 ? (
                <p className="text-center text-lp-muted text-sm py-8">
                  Comments with replies will appear here
                </p>
              ) : (
                featured.map((msg) => (
                  <div key={msg.id} className="bg-lp-surface rounded-xl p-4 border border-lp-border">
                    <span className="text-xs font-medium text-lp-accent">{msg.author_name}</span>
                    <p className="text-base text-lp-text mt-1">{msg.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* QR code - bottom right corner (consistent with sidebar) */}
        <div
          className="absolute bottom-3 right-3 cursor-pointer hover:scale-105 transition-transform z-10"
          onDoubleClick={() => setQrFullscreen(true)}
          title="Double-click for fullscreen QR"
        >
          <div className="bg-lp-surface/90 backdrop-blur-sm border border-lp-border rounded-xl p-2.5 flex items-center gap-2.5 shadow-lg">
            <div className="bg-white p-1.5 rounded-lg shrink-0">
              <QRCodeSVG value={joinUrl} size={52} level="M" bgColor="#ffffff" fgColor="#0a0a0f" />
            </div>
            <div>
              <span className="text-[10px] text-lp-muted font-medium block">JOIN</span>
              <span className="text-xs font-extrabold tracking-wider text-lp-accent">{sessionCode}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
