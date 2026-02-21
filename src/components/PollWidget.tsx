'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import { getVoterId } from '@/lib/supabase';
import type { PollOption } from '@/lib/types';

const BAR_COLORS = ['#6c5ce7', '#00d2a0', '#ff6b9d', '#ffa348', '#ffd43b', '#a29bfe'];

interface PollWidgetProps {
  pollId: string;
  question: string;
  options: PollOption[];
  showLiveResults?: boolean;
  isClosed?: boolean;
}

export default function PollWidget({ pollId, question, options, showLiveResults = false, isClosed = false }: PollWidgetProps) {
  const [voted, setVoted] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  // Restore voted state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`lp_voted_${pollId}`);
    if (stored) setVoted(stored);
  }, [pollId]);

  const totalVotes = options.reduce((sum, o) => sum + o.vote_count, 0);
  const showResults = !!voted || showLiveResults || isClosed;
  const maxVotes = Math.max(...options.map((o) => o.vote_count), 1);

  async function vote(optionId: string) {
    if (voting || isClosed) return;
    setVoting(true);

    // OPTIMISTIC: Show result immediately
    setVoted(optionId);
    localStorage.setItem(`lp_voted_${pollId}`, optionId);

    try {
      const supabase = createSupabaseBrowser();
      const voterId = getVoterId();
      await supabase.rpc('cast_poll_vote', {
        p_option_id: optionId,
        p_voter_id: voterId,
      });
    } catch {
      // Vote is already shown optimistically
    }
    setVoting(false);
  }

  function changeVote() {
    setVoted(null);
    localStorage.removeItem(`lp_voted_${pollId}`);
  }

  return (
    <div className={`rounded-xl p-4 border ${isClosed ? 'bg-lp-bg/50 border-lp-border/50 opacity-80' : 'bg-lp-surface border-lp-border'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">📊</span>
        <h3 className="text-base font-bold">{question}</h3>
      </div>
      {isClosed && (
        <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-lp-muted bg-lp-border/50 px-2 py-0.5 rounded mb-2">
          Closed
        </span>
      )}

      <div className="space-y-2.5 mt-2">
        {options.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
          const color = opt.color || BAR_COLORS[i % BAR_COLORS.length];
          const isVoted = voted === opt.id;
          const isWinning = opt.vote_count === maxVotes && totalVotes > 0;

          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={!!voted || voting || showLiveResults || isClosed}
              className={`w-full text-left relative overflow-hidden rounded-xl p-3.5 transition-all ${
                voted || showLiveResults || isClosed
                  ? 'cursor-default'
                  : 'hover:border-lp-accent/50 active:scale-[0.99] hover:shadow-[0_0_20px_rgba(108,92,231,0.15)]'
              } ${isVoted ? 'border-2' : 'border border-lp-border'}`}
              style={{
                borderColor: isVoted ? color : undefined,
                backgroundColor: isVoted ? `${color}12` : 'rgba(30, 30, 46, 0.8)',
              }}
            >
              {/* Animated gradient progress bar */}
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out rounded-xl"
                  style={{
                    width: `${pct}%`,
                    background: isVoted
                      ? `linear-gradient(90deg, ${color}45, ${color}25)`
                      : `linear-gradient(90deg, ${color}30, ${color}15)`,
                    borderRight: pct > 0 ? `2px solid ${color}60` : 'none',
                  }}
                />
              )}

              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  {isVoted ? (
                    <div
                      className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: color }}
                    >
                      ✓
                    </div>
                  ) : (
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: isWinning && showResults ? `0 0 8px ${color}` : 'none',
                      }}
                    />
                  )}
                  <span className={`text-sm font-semibold ${isVoted ? 'text-white' : isWinning && showResults ? 'text-lp-text' : ''}`}>
                    {opt.option_text}
                    {isVoted && <span className="ml-2 text-xs font-bold opacity-80">Your vote</span>}
                  </span>
                </div>
                {showResults && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-lp-muted font-medium">{opt.vote_count}</span>
                    <span className={`text-base font-extrabold min-w-[3ch] text-right ${isVoted ? 'text-white' : ''}`} style={{ color: isVoted ? undefined : color }}>
                      {pct}%
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Vote confirmation + change vote */}
      {voted && !showLiveResults && !isClosed && (
        <div className="mt-3 flex items-center justify-between py-2 px-3 rounded-lg bg-lp-green/10 border border-lp-green/30">
          <span className="text-sm font-semibold text-lp-green">✓ Vote submitted!</span>
          <button
            onClick={changeVote}
            className="text-xs font-medium text-lp-muted hover:text-lp-accent transition-colors"
          >
            Change vote
          </button>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-lp-border/50">
        <span className="text-xs text-lp-muted">👥</span>
        <span className="text-sm font-bold text-lp-text">{totalVotes}</span>
        <span className="text-xs text-lp-muted">vote{totalVotes !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
