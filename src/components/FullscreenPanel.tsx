'use client';

import type { Message } from '@/lib/types';

type FullscreenTab = 'chat' | 'qa' | 'polls';

interface FullscreenPanelProps {
  activeTab: FullscreenTab;
  onTabChange: (tab: FullscreenTab) => void;
  sessionTitle?: string;
  speakerName?: string;
  messages: Message[];
  onClose: () => void;
  chatContent: React.ReactNode;
  qaContent: React.ReactNode;
  pollContent: React.ReactNode;
}

export default function FullscreenPanel({ activeTab, onTabChange, sessionTitle, speakerName, messages, onClose, chatContent, qaContent, pollContent }: FullscreenPanelProps) {
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

  const tabLabel = activeTab === 'chat' ? 'Chat' : activeTab === 'qa' ? 'Q&A' : 'Polls';

  return (
    <div className="fixed inset-0 z-40 bg-lp-bg/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-lp-border">
        <div className="flex items-center gap-4">
          {(sessionTitle || speakerName) && (
            <div className="flex items-center gap-3 pr-5 border-r border-lp-border">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-lg">⚡</div>
              <div>
                {sessionTitle && <p className="text-xl font-extrabold text-lp-text leading-tight">{sessionTitle}</p>}
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

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tab content */}
        <div className="flex-1 border-r border-lp-border overflow-hidden">
          <div className="px-4 py-2 border-b border-lp-border">
            <h3 className="text-sm font-medium text-lp-muted">
              {activeTab === 'chat' ? 'All Messages' : activeTab === 'qa' ? 'Questions & Answers' : 'Polls'}
            </h3>
          </div>
          <div className="h-full overflow-hidden">
            {activeTab === 'chat' && chatContent}
            {activeTab === 'qa' && qaContent}
            {activeTab === 'polls' && pollContent}
          </div>
        </div>

        {/* Right: Featured comments (shown for chat/qa) */}
        {activeTab !== 'polls' && (
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
        )}
      </div>
    </div>
  );
}
