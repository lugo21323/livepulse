'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Message } from '@/lib/types';

type FullscreenTab = 'chat' | 'qa' | 'polls';
type ChatSubView = 'all' | 'featured';

interface FullscreenPanelProps {
  activeTab: FullscreenTab;
  onTabChange: (tab: FullscreenTab) => void;
  sessionTitle?: string;
  speakerName?: string;
  sessionCode: string;
  messages: Message[];
  onClose: () => void;
  chatContent: React.ReactNode;
  featuredContent: React.ReactNode;
  qaContent: React.ReactNode;
  pollContent: React.ReactNode;
  archivedCount?: number;
  showArchived?: boolean;
  onToggleArchived?: () => void;
  onRestoreAll?: () => void;
}

export default function FullscreenPanel({
  activeTab, onTabChange, sessionTitle, speakerName, sessionCode, messages, onClose,
  chatContent, featuredContent, qaContent, pollContent,
  archivedCount = 0, showArchived = false, onToggleArchived, onRestoreAll,
}: FullscreenPanelProps) {
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const [chatSubView, setChatSubView] = useState<ChatSubView>('all');

  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/session/${sessionCode}` : '';

  // Fullscreen QR overlay
  if (qrFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-lp-bg flex flex-col items-center justify-center">
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

      {/* Archive bar */}
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
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Tab content */}
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Sub-header with view toggle for chat */}
          <div className="px-4 py-2 border-b border-lp-border shrink-0 flex items-center justify-between">
            {activeTab === 'chat' ? (
              <div className="flex gap-1">
                <button
                  onClick={() => setChatSubView('all')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    chatSubView === 'all' ? 'bg-lp-surface text-lp-text' : 'text-lp-muted hover:text-lp-text'
                  }`}
                >
                  All Messages
                </button>
                <button
                  onClick={() => setChatSubView('featured')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    chatSubView === 'featured' ? 'bg-lp-surface text-lp-text' : 'text-lp-muted hover:text-lp-text'
                  }`}
                >
                  ⭐ Featured
                </button>
              </div>
            ) : (
              <h3 className="text-sm font-medium text-lp-muted">
                {activeTab === 'qa' ? 'Questions & Answers' : 'Polls'}
              </h3>
            )}
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'chat' && chatSubView === 'all' && chatContent}
            {activeTab === 'chat' && chatSubView === 'featured' && featuredContent}
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

        {/* Right: QR code panel (full width of old featured column) */}
        <div className="w-[380px] border-l border-lp-border flex flex-col items-center justify-center shrink-0 bg-lp-surface/30">
          <div
            className="cursor-pointer hover:scale-[1.02] transition-transform text-center"
            onDoubleClick={() => setQrFullscreen(true)}
          >
            <p className="text-xs text-lp-muted font-medium mb-3 uppercase tracking-wider">Scan to Join</p>
            <div className="bg-white p-5 rounded-2xl shadow-lg mx-auto inline-block">
              <QRCodeSVG value={joinUrl} size={200} level="M" bgColor="#ffffff" fgColor="#0a0a0f" />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-lp-muted font-medium">CODE</span>
              <span className="text-2xl font-extrabold tracking-[0.2em] text-lp-accent">{sessionCode}</span>
            </div>
            <p className="text-[10px] text-lp-muted/50 mt-3">Double-click for fullscreen</p>
          </div>
        </div>
      </div>
    </div>
  );
}
