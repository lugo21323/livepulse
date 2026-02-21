'use client';

import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import { getVoterId } from '@/lib/supabase';
import type { PollOption } from '@/lib/types';

const BAR_COLORS = ['#6c5ce7', '#00d2a0', '#ff6b9d', '#ffa348', '#ffd43b', '#a29bfe'];

interface PollWidgetProps {
  pollId: string;
  question: string;
  options: PollOption[];
  showLiveResults?: boolean;
}

export default function PollWidget({ pollId, question, options, showLiveResults = false }: PollWidgetProps) {
  const [voted, setVoted] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const totalVotes = options.reduce((sum, o) => sum + o.vote_count, 0);
  // Show results if user voted OR if live results mode (presenter view)
  const showResults = !!voted || showLiveResults;

  async function vote(optionId: string) {
    if (voted || voting) return;
    setVoting(true);
    const supabase = createSupabaseBrowser();
    const voterId = getVoterId();
    const { data } = await supabase.rpc('cast_poll_vote', {
      p_option_id: optionId,
      p_voter_id: voterId,
    });
    if (data) {
      setVoted(optionId);
    }
    setVoting(false);
  }

  return (
    <div className="bg-lp-surface rounded-xl p-4 border border-lp-border">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h3 className="text-sm font-semibold">{question}</h3>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
          const color = opt.color || BAR_COLORS[i % BAR_COLORS.length];
          const isVoted = voted === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => vote(opt.id)}
              disabled={!!voted || voting || showLiveResults}
              className={`w-full text-left relative overflow-hidden rounded-lg p-3 transition-all ${
                voted || showLiveResults
                  ? 'cursor-default'
                  : 'hover:border-lp-accent/50 active:scale-[0.99]'
              } ${isVoted ? 'border-2' : 'border border-lp-border'}`}
              style={{
                borderColor: isVoted ? color : undefined,
                backgroundColor: 'rgba(30, 30, 46, 0.8)',
              }}
            >
              {/* Progress bar fill - always shown when results visible */}
              {showResults && (
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-700 ease-out rounded-lg"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: `${color}20`,
                  }}
                />
              )}

              <div className="relative flex justify-between items-center">
                <span className="text-sm">{opt.option_text}</span>
                {showResults && (
                  <span className="text-sm font-semibold flex items-center gap-2" style={{ color }}>
                    <span className="text-xs text-lp-muted">{opt.vote_count}</span>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {totalVotes > 0 && (
        <p className="text-xs text-lp-muted mt-3 text-center">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
