'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase';
import type { Session } from '@/lib/types';

export default function PresenterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  // Check existing auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser({ id: user.id, email: user.email ?? undefined });
        loadSessions(user.id);
      }
      setLoading(false);
    });
  }, []);

  async function loadSessions(userId: string) {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('presenter_id', userId)
      .order('created_at', { ascending: false });
    if (data) setSessions(data);
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });

    const { data, error: authError } = await fn;

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      setUser({ id: data.user.id, email: data.user.email ?? undefined });
      loadSessions(data.user.id);
    }

    if (isSignUp && !data.session) {
      setError('Check your email for a confirmation link.');
    }

    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSessions([]);
  }

  async function goLive(session: Session) {
    if (!session.is_active) {
      await supabase
        .from('sessions')
        .update({ is_active: true, ended_at: null })
        .eq('id', session.id);
    }
    router.push(`/presenter/live/${session.session_code}`);
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lp-bg">
        <p className="text-lp-muted">Loading...</p>
      </div>
    );
  }

  // Not logged in - show auth form
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lp-bg p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-[72px] h-[72px] rounded-[18px] bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center mx-auto mb-5 text-3xl shadow-[0_8px_32px_rgba(108,92,231,0.3)]">
              ⚡
            </div>
            <h1 className="text-3xl font-bold tracking-tight">LivePulse</h1>
            <p className="text-lp-muted mt-2">Presenter {isSignUp ? 'Sign Up' : 'Login'}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-lp-surface border border-lp-border rounded-xl px-4 py-3 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full bg-lp-surface border border-lp-border rounded-xl px-4 py-3 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-lp-accent to-lp-pink rounded-xl text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="w-full mt-4 text-sm text-lp-muted hover:text-lp-accent transition-colors text-center"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    );
  }

  // Logged in - show dashboard
  return (
    <div className="min-h-screen bg-lp-bg">
      <header className="flex items-center justify-between px-6 py-4 border-b border-lp-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-lg">
            ⚡
          </div>
          <h1 className="text-lg font-bold">LivePulse</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-lp-muted">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-lp-muted hover:text-lp-text transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Sessions</h2>
          <button
            onClick={() => router.push('/presenter/create')}
            className="px-4 py-2 bg-lp-accent rounded-lg text-sm font-medium text-white hover:bg-lp-accent/80 transition-colors"
          >
            + New Session
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-16 bg-lp-surface rounded-xl border border-lp-border">
            <p className="text-lp-muted text-lg mb-2">No sessions yet</p>
            <p className="text-lp-muted text-sm">Create your first session to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-lp-surface rounded-xl border border-lp-border"
              >
                <div>
                  <h3 className="font-semibold">{session.title}</h3>
                  <p className="text-sm text-lp-muted">
                    Code: <span className="font-bold text-lp-accent">{session.session_code}</span>
                    {session.is_active && (
                      <span className="ml-2 inline-flex items-center gap-1 text-lp-green">
                        <span className="w-1.5 h-1.5 rounded-full bg-lp-green animate-pulse-dot" />
                        Live
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => goLive(session)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    session.is_active
                      ? 'bg-lp-green/10 text-lp-green hover:bg-lp-green/20'
                      : 'bg-lp-accent/10 text-lp-accent hover:bg-lp-accent/20'
                  }`}
                >
                  {session.is_active ? 'Open Live View' : 'Go Live'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
