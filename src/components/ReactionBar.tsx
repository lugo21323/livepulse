'use client';

import { useState, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import type { Reaction } from '@/lib/types';

const EMOJIS = ['🔥', '👏', '❤️', '😂', '🎉', '💡', '👍', '🤯'];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  drift: number;
}

interface ReactionBarProps {
  sessionId: string;
  reactions: Reaction[];
}

export default function ReactionBar({ sessionId, reactions }: ReactionBarProps) {
  const [floats, setFloats] = useState<FloatingEmoji[]>([]);
  const [nextId, setNextId] = useState(0);

  const sendReaction = useCallback(
    async (emoji: string) => {
      // Show floating animation
      const id = nextId;
      setNextId((n) => n + 1);
      const float: FloatingEmoji = {
        id,
        emoji,
        x: Math.random() * 80 + 10,
        drift: (Math.random() - 0.5) * 60,
      };
      setFloats((prev) => [...prev, float]);
      setTimeout(() => {
        setFloats((prev) => prev.filter((f) => f.id !== id));
      }, 1800);

      // Send to database
      const supabase = createSupabaseBrowser();
      await supabase.rpc('increment_reaction', {
        p_session_id: sessionId,
        p_emoji: emoji,
      });
    },
    [sessionId, nextId]
  );

  function getCount(emoji: string): number {
    return reactions.find((r) => r.emoji === emoji)?.count ?? 0;
  }

  return (
    <>
      {/* Floating emojis overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floats.map((f) => (
          <span
            key={f.id}
            className="absolute text-3xl animate-float-up"
            style={{
              left: `${f.x}%`,
              bottom: '80px',
              '--drift': `${f.drift}px`,
            } as React.CSSProperties}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Emoji button strip */}
      <div className="flex items-center gap-1 flex-wrap">
        {EMOJIS.map((emoji) => {
          const count = getCount(emoji);
          return (
            <button
              key={emoji}
              onClick={() => sendReaction(emoji)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-lp-surface-light border border-lp-border hover:border-lp-accent/50 hover:bg-lp-surface active:scale-95 transition-all"
            >
              <span className="text-lg">{emoji}</span>
              {count > 0 && (
                <span className="text-xs text-lp-muted font-medium">{count}</span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
