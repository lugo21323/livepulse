'use client';

import { useState, useRef, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import type { Message } from '@/lib/types';

const CHAT_REACTIONS = ['👍', '❤️', '😂', '🔥', '💯'];

interface ChatPanelProps {
  messages: Message[];
  sessionId: string;
  authorName: string;
  compact?: boolean;
}

// Local reaction state (per-message, stored in memory for simplicity)
interface MessageReactions {
  [emoji: string]: number;
}

export default function ChatPanel({ messages, sessionId, authorName, compact = false }: ChatPanelProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [localReactions, setLocalReactions] = useState<Record<string, MessageReactions>>({});
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createSupabaseBrowser()).current;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    const fullContent = replyTo
      ? `@${replyTo.author_name}: ${content}`
      : content;

    setSending(true);
    setText('');
    setReplyTo(null);
    await supabase.from('messages').insert({
      session_id: sessionId,
      author_name: authorName,
      content: fullContent,
      is_question: false,
    });
    setSending(false);
  }

  function reactToMessage(messageId: string, emoji: string) {
    setLocalReactions((prev) => {
      const msgReactions = { ...(prev[messageId] || {}) };
      msgReactions[emoji] = (msgReactions[emoji] || 0) + 1;
      return { ...prev, [messageId]: msgReactions };
    });
    setShowReactionsFor(null);
  }

  function getReactionCount(messageId: string): MessageReactions {
    return localReactions[messageId] || {};
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-lp-muted text-sm py-8">No messages yet. Say hi!</p>
        )}
        {messages.map((msg) => {
          const reactions = getReactionCount(msg.id);
          const hasReactions = Object.keys(reactions).length > 0;
          const isReply = msg.content.startsWith('@');

          return (
            <div key={msg.id} className="animate-slide-in group">
              <div className={`rounded-lg px-3 py-2 relative ${compact ? 'bg-lp-bg' : 'bg-lp-surface-light'}`}>
                {/* Reply indicator */}
                {isReply && (
                  <div className="text-[10px] text-lp-muted mb-0.5 flex items-center gap-1">
                    <span>↩</span> replying
                  </div>
                )}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-lp-accent">{msg.author_name}</span>
                    <p className="text-sm text-lp-text mt-0.5">{msg.content}</p>
                  </div>
                  {/* Hover actions */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                    <button
                      onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                      className="text-xs text-lp-muted hover:text-lp-text p-1 rounded"
                      title="React"
                    >
                      😊
                    </button>
                    <button
                      onClick={() => setReplyTo(msg)}
                      className="text-xs text-lp-muted hover:text-lp-text p-1 rounded"
                      title="Reply"
                    >
                      ↩
                    </button>
                  </div>
                </div>

                {/* Reaction picker */}
                {showReactionsFor === msg.id && (
                  <div className="flex gap-1 mt-1.5 p-1 bg-lp-surface rounded-lg border border-lp-border w-fit">
                    {CHAT_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => reactToMessage(msg.id, emoji)}
                        className="text-sm hover:scale-125 transition-transform p-0.5"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Displayed reactions */}
                {hasReactions && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {Object.entries(reactions).map(([emoji, count]) => (
                      <span
                        key={emoji}
                        className="inline-flex items-center gap-0.5 text-xs bg-lp-surface-light rounded-full px-1.5 py-0.5 border border-lp-border"
                      >
                        {emoji} <span className="text-lp-muted">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply indicator */}
      {replyTo && (
        <div className="px-3 pt-2 flex items-center gap-2 text-xs text-lp-muted">
          <span>↩ Replying to <span className="text-lp-accent">{replyTo.author_name}</span></span>
          <button onClick={() => setReplyTo(null)} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      <form onSubmit={sendMessage} className="p-3 border-t border-lp-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={replyTo ? `Reply to ${replyTo.author_name}...` : 'Type a message...'}
            maxLength={500}
            className="flex-1 bg-lp-bg border border-lp-border rounded-lg px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-4 py-2 bg-lp-accent rounded-lg text-sm font-medium text-white disabled:opacity-40 hover:bg-lp-accent/80 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
