'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase';
import type { Session, Message, Reaction, Poll, PollOption } from '@/lib/types';

interface ReportData {
  session: Session & { headshot_url?: string };
  chatMessages: Message[];
  qaMessages: Message[];
  reactions: Reaction[];
  polls: { poll: Poll; options: PollOption[] }[];
  ratings: { rating: number }[];
  emailCount: number;
  upvoteCounts: Record<string, number>;
}

export default function SessionReportPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowser()).current;
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/presenter'); return; }

      const { data: session } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_code', code)
        .eq('presenter_id', user.id)
        .single();

      if (!session) { router.replace('/presenter'); return; }

      // Load all data in parallel
      const [messagesRes, reactionsRes, pollsRes, ratingsRes, emailsRes] = await Promise.all([
        supabase.from('messages').select('*').eq('session_id', session.id).order('created_at', { ascending: true }),
        supabase.from('reactions').select('*').eq('session_id', session.id),
        supabase.from('polls').select('*').eq('session_id', session.id).order('created_at', { ascending: true }),
        supabase.from('ratings').select('rating').eq('session_id', session.id),
        supabase.from('email_captures').select('id').eq('session_id', session.id),
      ]);

      const allMessages = messagesRes.data || [];
      const chatMessages = allMessages.filter((m) => !m.is_question);
      const qaMessages = allMessages.filter((m) => m.is_question);

      // Load poll options for each poll
      const allPolls = (pollsRes.data || []).filter((p: any) => !p.question?.startsWith('PULSE:'));
      const pollsWithOptions: { poll: Poll; options: PollOption[] }[] = [];
      for (const p of allPolls) {
        const { data: opts } = await supabase
          .from('poll_options')
          .select('*')
          .eq('poll_id', p.id)
          .order('display_order');
        pollsWithOptions.push({ poll: p as Poll, options: (opts || []) as PollOption[] });
      }

      // Load Q&A upvote counts
      const upvoteCounts: Record<string, number> = {};
      if (qaMessages.length > 0) {
        const { data: upvotes } = await supabase
          .from('question_upvotes')
          .select('message_id')
          .in('message_id', qaMessages.map((m) => m.id));
        if (upvotes) {
          for (const u of upvotes) {
            upvoteCounts[u.message_id] = (upvoteCounts[u.message_id] || 0) + 1;
          }
        }
      }

      setData({
        session: session as Session & { headshot_url?: string },
        chatMessages,
        qaMessages,
        reactions: (reactionsRes.data || []) as Reaction[],
        polls: pollsWithOptions,
        ratings: (ratingsRes.data || []) as { rating: number }[],
        emailCount: (emailsRes.data || []).length,
        upvoteCounts,
      });
      setLoading(false);
    }
    load();
  }, [code, supabase, router]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lp-bg">
        <p className="text-lp-muted text-lg">Loading report...</p>
      </div>
    );
  }

  const { session, chatMessages, qaMessages, reactions, polls, ratings, emailCount, upvoteCounts } = data;

  // Calculations
  const startDate = new Date(session.created_at);
  const endDate = session.ended_at ? new Date(session.ended_at) : new Date();
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMins = Math.round(durationMs / 60000);
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);
  const totalPollVotes = polls.reduce((sum, p) => p.options.reduce((s, o) => s + o.vote_count, 0) + sum, 0);
  const totalMessages = chatMessages.length + qaMessages.length;
  const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length) : 0;
  const ratingDist = [1, 2, 3, 4, 5].map((n) => ratings.filter((r) => r.rating === n).length);

  // Sort Q&A by upvotes
  const sortedQA = [...qaMessages].sort((a, b) => (upvoteCounts[b.id] || 0) - (upvoteCounts[a.id] || 0));

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-lp-bg">
      {/* Screen-only header bar */}
      <div className="print-hide flex items-center justify-between px-6 py-3 border-b border-lp-border bg-lp-surface sticky top-0 z-10">
        <button onClick={() => router.push('/presenter')} className="text-sm text-lp-muted hover:text-lp-text transition-colors">
          ← Back to Dashboard
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-2 bg-lp-accent rounded-lg text-sm font-bold text-white hover:bg-lp-accent/80 transition-colors"
        >
          Download PDF
        </button>
      </div>

      {/* Report content */}
      <div className="max-w-3xl mx-auto px-6 py-10 report-content">
        {/* Header */}
        <div className="text-center mb-10 pb-8 border-b border-lp-border print-border">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center mx-auto mb-4 text-2xl print-logo">
            ⚡
          </div>
          <h1 className="text-3xl font-extrabold text-lp-text print-title">{session.title}</h1>
          <p className="text-lg text-lp-muted mt-1">{session.speaker_name}</p>
          <p className="text-sm text-lp-muted mt-2">
            {formatDate(session.created_at)} &middot; {durationMins} minutes
          </p>
        </div>

        {/* Engagement Summary */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-lp-text mb-4 print-heading">Engagement Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Messages" value={totalMessages} emoji="💬" />
            <StatCard label="Reactions" value={totalReactions} emoji="🔥" />
            <StatCard label="Poll Votes" value={totalPollVotes} emoji="📊" />
            <StatCard label="Avg Rating" value={avgRating > 0 ? avgRating.toFixed(1) : '—'} emoji="⭐" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <StatCard label="Chat Messages" value={chatMessages.length} emoji="💭" />
            <StatCard label="Questions" value={qaMessages.length} emoji="❓" />
            <StatCard label="Emails Captured" value={emailCount} emoji="📧" />
            <StatCard label="Ratings" value={ratings.length} emoji="🗳️" />
          </div>
        </section>

        {/* Audience Reactions */}
        {reactions.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-lp-text mb-4 print-heading">Audience Reactions</h2>
            <div className="flex flex-wrap gap-3">
              {reactions.filter((r) => r.count > 0).sort((a, b) => b.count - a.count).map((r) => (
                <div key={r.id} className="flex items-center gap-2 bg-lp-surface rounded-xl px-4 py-3 border border-lp-border print-card">
                  <span className="text-2xl">{r.emoji}</span>
                  <span className="text-lg font-bold text-lp-text">{r.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Poll Results */}
        {polls.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-lp-text mb-4 print-heading">Poll Results</h2>
            <div className="space-y-6">
              {polls.map(({ poll, options }) => {
                const totalVotes = options.reduce((s, o) => s + o.vote_count, 0);
                return (
                  <div key={poll.id} className="bg-lp-surface rounded-xl p-5 border border-lp-border print-card">
                    <h3 className="font-semibold text-lp-text mb-3">{poll.question}</h3>
                    <div className="space-y-2">
                      {options.map((opt) => {
                        const pct = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
                        return (
                          <div key={opt.id}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-lp-text">{opt.option_text}</span>
                              <span className="text-lp-muted font-medium">{opt.vote_count} votes ({pct}%)</span>
                            </div>
                            <div className="h-3 bg-lp-bg rounded-full overflow-hidden print-bar-bg">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${pct}%`, backgroundColor: opt.color || '#6c5ce7' }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-lp-muted mt-3">{totalVotes} total votes</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Ratings Distribution */}
        {ratings.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-lp-text mb-4 print-heading">Ratings</h2>
            <div className="bg-lp-surface rounded-xl p-5 border border-lp-border print-card">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl font-extrabold text-lp-text">{avgRating.toFixed(1)}</span>
                <div>
                  <div className="text-lg">{'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}</div>
                  <p className="text-xs text-lp-muted">{ratings.length} rating{ratings.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = ratingDist[n - 1];
                  const pct = ratings.length > 0 ? Math.round((count / ratings.length) * 100) : 0;
                  return (
                    <div key={n} className="flex items-center gap-2 text-sm">
                      <span className="w-8 text-right text-lp-muted">{n} ★</span>
                      <div className="flex-1 h-2.5 bg-lp-bg rounded-full overflow-hidden print-bar-bg">
                        <div className="h-full bg-lp-yellow rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-lp-muted text-xs">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Q&A Log */}
        {sortedQA.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-lp-text mb-4 print-heading">Questions & Answers ({sortedQA.length})</h2>
            <div className="space-y-2">
              {sortedQA.map((msg) => (
                <div key={msg.id} className="bg-lp-surface rounded-lg px-4 py-3 border border-lp-border print-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-lp-text">{msg.content}</p>
                      <p className="text-xs text-lp-muted mt-1">{msg.author_name} &middot; {formatTime(msg.created_at)}</p>
                    </div>
                    {(upvoteCounts[msg.id] || 0) > 0 && (
                      <span className="shrink-0 text-xs font-bold text-lp-accent bg-lp-accent/10 rounded-full px-2 py-0.5">
                        ▲ {upvoteCounts[msg.id]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Chat Log */}
        {chatMessages.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-lp-text mb-4 print-heading">Chat Log ({chatMessages.length})</h2>
            <div className="space-y-1">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="px-3 py-2 rounded-lg hover:bg-lp-surface/50 print-chat-row">
                  <span className="text-xs text-lp-muted mr-2">{formatTime(msg.created_at)}</span>
                  <span className="text-xs font-semibold text-lp-accent mr-1.5">{msg.author_name}</span>
                  <span className="text-sm text-lp-text">{msg.content}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div className="text-center pt-8 border-t border-lp-border print-border">
          <p className="text-xs text-lp-muted">Generated by LivePulse &middot; {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: string | number; emoji: string }) {
  return (
    <div className="bg-lp-surface rounded-xl p-4 border border-lp-border text-center print-card">
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-2xl font-extrabold text-lp-text">{value}</p>
      <p className="text-xs text-lp-muted font-medium mt-0.5">{label}</p>
    </div>
  );
}
