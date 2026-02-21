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
  twoColumn?: boolean;
  isPresenter?: boolean;
  archivedIds?: Set<string>;
  onArchive?: (id: string) => void;
}

interface MessageReactions {
  [emoji: string]: number;
}

export default function ChatPanel({ messages, sessionId, authorName, compact = false, twoColumn = false, isPresenter = false, archivedIds, onArchive }: ChatPanelProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [localReactions, setLocalReactions] = useState<Record<string, MessageReactions>>({});
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const supabase = useRef(createSupabaseBrowser()).current;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (replyToId && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyToId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText('');
    await supabase.from('messages').insert({
      session_id: sessionId,
      author_name: authorName,
      content,
      is_question: false,
    });
    setSending(false);
  }

  async function sendReply(msg: Message) {
    const content = replyText.trim();
    if (!content || sending) return;

    const fullContent = `@${msg.author_name}: ${content}`;
    setSending(true);
    setReplyText('');
    setReplyToId(null);
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

  // Filter out archived messages for display
  const visibleMessages = archivedIds ? messages.filter((m) => !archivedIds.has(m.id)) : messages;

  function renderMessage(msg: Message) {
    const reactions = getReactionCount(msg.id);
    const hasReactions = Object.keys(reactions).length > 0;
    const isReply = msg.content.startsWith('@');
    const isReplying = replyToId === msg.id;

    return (
      <div key={msg.id} className="animate-slide-in group">
        <div className={`rounded-lg px-3 py-2 relative ${compact ? 'bg-lp-bg' : 'bg-lp-surface-light'}`}>
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
            {/* Action buttons - always visible with subtle style */}
            <div className="flex gap-1 shrink-0 mt-0.5">
              <button
                onClick={() => setShowReactionsFor(showReactionsFor === msg.id ? null : msg.id)}
                className="text-sm text-lp-muted/50 hover:text-lp-text p-1 rounded hover:bg-lp-bg/50 transition-all"
                title="React"
              >
                😊
              </button>
              <button
                onClick={() => { setReplyToId(isReplying ? null : msg.id); setReplyText(''); }}
                className={`text-sm p-1 rounded hover:bg-lp-bg/50 transition-all ${isReplying ? 'text-lp-accent' : 'text-lp-muted/50 hover:text-lp-text'}`}
                title="Reply"
              >
                ↩
              </button>
              {isPresenter && onArchive && (
                <button
                  onClick={() => onArchive(msg.id)}
                  className="text-sm text-lp-muted/50 hover:text-red-400 p-1 rounded hover:bg-lp-bg/50 transition-all"
                  title="Archive message"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {showReactionsFor === msg.id && (
            <div className="flex gap-1 mt-1.5 p-1.5 bg-lp-surface rounded-lg border border-lp-border w-fit">
              {CHAT_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => reactToMessage(msg.id, emoji)}
                  className="text-base hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

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

        {/* Inline reply input - appears right below the message */}
        {isReplying && (
          <form
            onSubmit={(e) => { e.preventDefault(); sendReply(msg); }}
            className="mt-1 ml-3 flex gap-2 items-center animate-slide-in"
          >
            <span className="text-xs text-lp-muted shrink-0">↩</span>
            <input
              ref={replyInputRef}
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${msg.author_name}...`}
              maxLength={500}
              className="flex-1 bg-lp-bg border border-lp-accent/40 rounded-lg px-2.5 py-1.5 text-xs text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || sending}
              className="px-3 py-1.5 bg-lp-accent rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:bg-lp-accent/80 transition-colors shrink-0"
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => { setReplyToId(null); setReplyText(''); }}
              className="text-xs text-lp-muted hover:text-red-400 transition-colors shrink-0"
            >
              ✕
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className={`flex-1 overflow-y-auto p-3 ${twoColumn ? '' : 'space-y-2'}`}>
        {visibleMessages.length === 0 && (
          <p className="text-center text-lp-muted text-sm py-8">No messages yet. Say hi!</p>
        )}
        {twoColumn ? (
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              {visibleMessages.slice(0, Math.ceil(visibleMessages.length / 2)).map((msg) => renderMessage(msg))}
            </div>
            <div className="flex-1 space-y-2">
              {visibleMessages.slice(Math.ceil(visibleMessages.length / 2)).map((msg) => renderMessage(msg))}
            </div>
          </div>
        ) : (
          visibleMessages.map((msg) => renderMessage(msg))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-lp-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
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
