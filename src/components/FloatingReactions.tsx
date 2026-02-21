'use client';

import { useState, useEffect, useRef } from 'react';
import type { Reaction } from '@/lib/types';

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
  drift: number;
}

interface FloatingReactionsProps {
  reactions: Reaction[];
}

export default function FloatingReactions({ reactions }: FloatingReactionsProps) {
  const [floats, setFloats] = useState<FloatingEmoji[]>([]);
  const prevTotals = useRef<Record<string, number>>({});
  const nextId = useRef(0);

  // Watch reaction counts — when they increase, spawn floating emojis
  useEffect(() => {
    reactions.forEach((r) => {
      const prev = prevTotals.current[r.emoji] ?? 0;
      const diff = r.count - prev;
      if (diff > 0) {
        // Spawn up to 3 emojis per update to avoid flooding
        const spawns = Math.min(diff, 3);
        const newFloats: FloatingEmoji[] = [];
        for (let i = 0; i < spawns; i++) {
          newFloats.push({
            id: nextId.current++,
            emoji: r.emoji,
            x: 10 + Math.random() * 80,
            drift: (Math.random() - 0.5) * 80,
          });
        }
        setFloats((prev) => [...prev, ...newFloats]);

        // Clean up after animation completes
        setTimeout(() => {
          setFloats((prev) =>
            prev.filter((f) => !newFloats.some((nf) => nf.id === f.id))
          );
        }, 2000);
      }
      prevTotals.current[r.emoji] = r.count;
    });
  }, [reactions]);

  if (floats.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {floats.map((f) => (
        <span
          key={f.id}
          className="absolute text-4xl animate-float-up"
          style={{
            left: `${f.x}%`,
            bottom: '10%',
            '--drift': `${f.drift}px`,
          } as React.CSSProperties}
        >
          {f.emoji}
        </span>
      ))}
    </div>
  );
}
