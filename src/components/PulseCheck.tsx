'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import { getVoterId } from '@/lib/supabase';

interface PulseCheckProps {
  sessionId: string;
  isPresenter?: boolean;
}

interface PulseResult {
  up: number;
  down: number;
}

export default function PulseCheck({ sessionId, isPresenter = false }: PulseCheckProps) {
  const [active, setActive] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [voted, setVoted] = useState(false);
  const [results, setResults] = useState<PulseResult>({ up: 0, down: 0 });
  const [pulseId, setPulseId] = useState<string | null>(null);
  const supabase = useRef(createSupabaseBrowser()).current;

  // Listen for pulse check polls (polls with question starting with "PULSE:")
  useEffect(() => {
    const channel = supabase
      .channel(`pulse:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: any) => {
          const poll = payload.new as any;
          if (poll && poll.question?.startsWith('PULSE:') && poll.is_active) {
            setPulseId(poll.id);
            setPrompt(poll.question.replace('PULSE:', '').trim());
            setActive(true);
            setVoted(false);
            setResults({ up: 0, down: 0 });
          } else if (payload.eventType === 'UPDATE' && !poll.is_active) {
            if (poll.id === pulseId) {
              // Keep showing results for 5 seconds then hide
              setTimeout(() => {
                setActive(false);
                setPulseId(null);
              }, 5000);
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase, pulseId]);

  // Poll for results if we have an active pulse
  useEffect(() => {
    if (!pulseId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('poll_options')
        .select('option_text, vote_count')
        .eq('poll_id', pulseId);
      if (data) {
        const up = data.find((o: any) => o.option_text === '👍')?.vote_count ?? 0;
        const down = data.find((o: any) => o.option_text === '👎')?.vote_count ?? 0;
        setResults({ up, down });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pulseId, supabase]);

  async function launchPulse() {
    const q = prompt.trim();
    if (!q) return;

    // Deactivate existing active polls
    await supabase
      .from('polls')
      .update({ is_active: false })
      .eq('session_id', sessionId)
      .eq('is_active', true);

    // Create pulse poll
    const { data: poll } = await supabase
      .from('polls')
      .insert({ session_id: sessionId, question: `PULSE:${q}`, is_active: true })
      .select()
      .single();

    if (poll) {
      await supabase.from('poll_options').insert([
        { poll_id: poll.id, option_text: '👍', display_order: 0, color: '#00d2a0' },
        { poll_id: poll.id, option_text: '👎', display_order: 1, color: '#ff6b9d' },
      ]);
      setPulseId(poll.id);
      setActive(true);
      setResults({ up: 0, down: 0 });
    }
    setPrompt('');
  }

  async function votePulse(option: 'up' | 'down') {
    if (voted || !pulseId) return;
    const voterId = getVoterId();
    const optionText = option === 'up' ? '👍' : '👎';

    const { data: opts } = await supabase
      .from('poll_options')
      .select('id, option_text')
      .eq('poll_id', pulseId);

    const opt = opts?.find((o: any) => o.option_text === optionText);
    if (opt) {
      await supabase.rpc('cast_poll_vote', {
        p_option_id: opt.id,
        p_voter_id: voterId,
      });
      setVoted(true);
    }
  }

  async function closePulse() {
    if (!pulseId) return;
    await supabase.from('polls').update({ is_active: false }).eq('id', pulseId);
  }

  // Presenter controls
  if (isPresenter) {
    const total = results.up + results.down;
    const upPct = total > 0 ? Math.round((results.up / total) * 100) : 0;

    return (
      <div className="space-y-3">
        {!active ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="How are we feeling about..."
              maxLength={150}
              className="flex-1 bg-lp-bg border border-lp-border rounded-lg px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
              onKeyDown={(e) => e.key === 'Enter' && launchPulse()}
            />
            <button
              onClick={launchPulse}
              disabled={!prompt.trim()}
              className="px-4 py-2 bg-lp-orange rounded-lg text-sm font-medium text-white disabled:opacity-40 hover:bg-lp-orange/80 transition-colors whitespace-nowrap"
            >
              🫀 Pulse Check
            </button>
          </div>
        ) : (
          <div className="bg-lp-bg rounded-xl p-4 border border-lp-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span>🫀</span> Pulse Check
              </h4>
              <button
                onClick={closePulse}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Close
              </button>
            </div>
            <p className="text-sm text-lp-muted mb-3">{prompt || 'Pulse Check'}</p>
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👍</span>
                <span className="text-lg font-bold text-lp-green">{results.up}</span>
              </div>
              <div className="flex-1 h-3 bg-lp-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-lp-green rounded-full transition-all duration-500"
                  style={{ width: `${upPct}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-lp-pink">{results.down}</span>
                <span className="text-2xl">👎</span>
              </div>
            </div>
            <p className="text-xs text-lp-muted text-center mt-2">{total} response{total !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    );
  }

  // Audience view - only show when active
  if (!active) return null;

  const total = results.up + results.down;

  return (
    <div className="bg-lp-surface rounded-xl p-4 border border-lp-border">
      <h4 className="text-sm font-semibold flex items-center gap-2 mb-2">
        <span>🫀</span> Pulse Check
      </h4>
      <p className="text-sm text-lp-text mb-4">{prompt || 'Quick check!'}</p>
      {!voted ? (
        <div className="flex gap-3">
          <button
            onClick={() => votePulse('up')}
            className="flex-1 py-4 text-4xl rounded-xl bg-lp-green/10 border-2 border-lp-green/30 hover:border-lp-green hover:bg-lp-green/20 active:scale-95 transition-all"
          >
            👍
          </button>
          <button
            onClick={() => votePulse('down')}
            className="flex-1 py-4 text-4xl rounded-xl bg-lp-pink/10 border-2 border-lp-pink/30 hover:border-lp-pink hover:bg-lp-pink/20 active:scale-95 transition-all"
          >
            👎
          </button>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-lp-green text-sm font-medium">Thanks! 🫀</p>
          <p className="text-xs text-lp-muted mt-1">{total} response{total !== 1 ? 's' : ''} so far</p>
        </div>
      )}
    </div>
  );
}
