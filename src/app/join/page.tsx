'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase';
import { generateAnonName } from '@/lib/supabase';

export default function JoinPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const router = useRouter();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const sessionCode = code.trim().toUpperCase();
    if (!sessionCode) return;

    setJoining(true);
    setError('');

    const supabase = createSupabaseBrowser();
    const { data } = await supabase
      .from('sessions')
      .select('id, session_code')
      .eq('session_code', sessionCode)
      .eq('is_active', true)
      .single();

    if (!data) {
      setError('Session not found. Check the code and try again.');
      setJoining(false);
      return;
    }

    // Store the anonymous name for this session
    const name = generateAnonName();
    sessionStorage.setItem(`lp_name_${sessionCode}`, name);

    router.push(`/session/${sessionCode}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-lp-bg p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-[72px] h-[72px] rounded-[18px] bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center mx-auto mb-5 text-3xl shadow-[0_8px_32px_rgba(108,92,231,0.3)]">
            ⚡
          </div>
          <h1 className="text-3xl font-bold tracking-tight">LivePulse</h1>
          <p className="text-lp-muted mt-2">Join a live session</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Enter session code"
              maxLength={10}
              autoFocus
              className="w-full bg-lp-surface border border-lp-border rounded-xl px-4 py-3.5 text-center text-2xl font-bold tracking-[0.3em] text-lp-text placeholder:text-lp-muted placeholder:text-base placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-lp-accent transition-colors"
            />
            {error && (
              <p className="text-red-400 text-sm text-center mt-2">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!code.trim() || joining}
            className="w-full py-3.5 bg-gradient-to-r from-lp-accent to-lp-pink rounded-xl text-base font-semibold text-white disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(108,92,231,0.3)]"
          >
            {joining ? 'Joining...' : 'Join Session'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <a
            href="/presenter"
            className="text-sm text-lp-muted hover:text-lp-accent transition-colors"
          >
            I&apos;m a presenter →
          </a>
        </div>
      </div>
    </div>
  );
}
