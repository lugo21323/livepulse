'use client';

import type { Message } from '@/lib/types';

interface FullscreenPanelProps {
  title: string;
  sessionTitle?: string;
  speakerName?: string;
  messages: Message[];
  onClose: () => void;
  children: React.ReactNode;
}

export default function FullscreenPanel({ title, sessionTitle, speakerName, messages, onClose, children }: FullscreenPanelProps) {
  const repliedToNames = new Set<string>();
  messages.forEach((m) => {
    if (m.content.startsWith('@')) {
      const nameMatch = m.content.match(/^@([^:]+):/);
      if (nameMatch) repliedToNames.add(nameMatch[1]);
    }
  });

  const featured = messages.filter(
    (m) => repliedToNames.has(m.author_name) && !m.content.startsWith('@')
  ).slice(-20);

  return (
    <div className="fixed inset-0 z-40 bg-lp-bg/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-lp-border">
        <div className="flex items-center gap-4">
          {(sessionTitle || speakerName) && (
            <div className="flex items-center gap-2 pr-4 border-r border-lp-border">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-sm">⚡</div>
              <div>
                {sessionTitle && <p className="text-sm font-bold text-lp-text">{sessionTitle}</p>}
                {speakerName && <p className="text-xs text-lp-muted">{speakerName}</p>}
              </div>
            </div>
          )}
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm text-lp-muted hover:text-lp-text bg-lp-surface rounded-lg border border-lp-border transition-colors"
        >
          ✕ Close <span className="text-xs text-lp-muted ml-1">(Esc)</span>
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Scrolling chat/content */}
        <div className="flex-1 border-r border-lp-border overflow-hidden">
          <div className="px-4 py-2 border-b border-lp-border">
            <h3 className="text-sm font-medium text-lp-muted">All Messages</h3>
          </div>
          <div className="h-full overflow-hidden">
            {children}
          </div>
        </div>

        {/* Right: Featured comments */}
        <div className="w-[400px] overflow-hidden flex flex-col shrink-0">
          <div className="px-4 py-2 border-b border-lp-border">
            <h3 className="text-sm font-medium text-lp-muted flex items-center gap-2">
              <span>⭐</span> Featured Comments
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {featured.length === 0 ? (
              <p className="text-center text-lp-muted text-sm py-8">
                Comments that get the most engagement will appear here
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
      </div>
    </div>
  );
}
