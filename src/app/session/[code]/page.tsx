'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowser, generateAnonName, getVoterId } from '@/lib/supabase';
import {
  useRealtimeMessages,
  useRealtimeReactions,
  useRealtimePollOptions,
  useRealtimeSession,
  usePresenceCount,
} from '@/lib/realtime';
import ChatPanel from '@/components/ChatPanel';
import QAPanel from '@/components/QAPanel';
import ReactionBar from '@/components/ReactionBar';
import PollWidget from '@/components/PollWidget';
import PulseCheck from '@/components/PulseCheck';
import ContactCard from '@/components/ContactCard';

type ActiveView = 'chat' | 'qa' | 'poll' | 'resources' | 'rate';

interface Resource {
  id: string;
  name: string;
  url: string;
  display_order: number;
}

export default function AudienceSessionPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Resource[]>([]);

  useEffect(() => {
    let name = sessionStorage.getItem(`lp_name_${code}`);
    if (!name) {
      name = generateAnonName();
      sessionStorage.setItem(`lp_name_${code}`, name);
    }
    setDisplayName(name);
    setLoading(false);
  }, [code]);

  const { session, activePoll } = useRealtimeSession(code);
  const messages = useRealtimeMessages(session?.id ?? '');
  const reactions = useRealtimeReactions(session?.id ?? '');
  const pollOptions = useRealtimePollOptions(activePoll);
  const onlineCount = usePresenceCount(code, displayName);

  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [pollQuestion, setPollQuestion] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);

  const supabase = useRef(createSupabaseBrowser()).current;

  // Fetch poll question
  useEffect(() => {
    if (!activePoll) { setPollQuestion(''); return; }
    supabase.from('polls').select('question').eq('id', activePoll).single()
      .then(({ data }) => { if (data) setPollQuestion((data as any).question); });
  }, [activePoll, supabase]);

  // Fetch resources
  useEffect(() => {
    if (!session?.id) return;
    supabase
      .from('resources')
      .select('*')
      .eq('session_id', session.id)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setResources(data as Resource[]);
      });
  }, [session?.id, supabase]);

  async function submitRating(stars: number) {
    if (!session || submittingRating) return;
    setSubmittingRating(true);
    setRating(stars);
    const voterId = getVoterId();

    const { data: existing } = await supabase
      .from('ratings')
      .select('id')
      .eq('session_id', session.id)
      .eq('voter_id', voterId)
      .single();

    if (existing) {
      await supabase.from('ratings').update({ rating: stars }).eq('id', existing.id);
    } else {
      await supabase.from('ratings').insert({
        session_id: session.id,
        rating: stars,
        voter_id: voterId,
      });
    }
    setSubmittingRating(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lp-bg">
        <p className="text-lp-muted">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lp-bg p-4">
        <div className="text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="text-xl font-bold mb-2">Session Not Found</h2>
          <p className="text-lp-muted mb-6">This session may have ended or the code is incorrect.</p>
          <button onClick={() => router.push('/join')} className="px-6 py-2.5 bg-lp-accent rounded-xl text-sm font-medium text-white hover:bg-lp-accent/80 transition-colors">
            Back to Join
          </button>
        </div>
      </div>
    );
  }

  const chatMessages = messages.filter((m) => !m.is_question);
  const s = session as any;
  const hasResources = resources.length > 0;
  const hasContact = s.contact_website || s.contact_email || s.contact_phone || s.contact_linkedin || s.contact_twitter || s.contact_instagram || s.contact_info;
  const isPulse = pollQuestion.startsWith('PULSE:');

  return (
    <div className="h-screen flex flex-col bg-lp-bg overflow-hidden">
      {/* Presenter info bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-lp-surface border-b border-lp-border">
        <div className="flex items-center gap-2.5 min-w-0">
          {s.headshot_url ? (
            <img src={s.headshot_url} alt="" className="w-8 h-8 rounded-full object-cover border border-lp-accent/30 shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-sm shrink-0">⚡</div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{session.title}</h1>
            <p className="text-xs text-lp-muted truncate">{session.speaker_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-lp-green animate-pulse-dot" />
          <span className="text-sm font-bold text-lp-text">{onlineCount}</span>
          <span className="text-xs text-lp-muted">online</span>
        </div>
      </div>

      {/* Active poll / pulse check */}
      {activePoll && pollQuestion && (
        <div className="px-4 pt-3">
          {isPulse ? (
            <PulseCheck sessionId={session.id} />
          ) : (
            <PollWidget pollId={activePoll} question={pollQuestion} options={pollOptions} />
          )}
        </div>
      )}

      {/* Tab selector */}
      <div className="flex border-b border-lp-border mx-2 mt-1">
        {([
          { key: 'chat', label: 'Chat' },
          { key: 'qa', label: 'Q&A' },
          { key: 'poll', label: 'Poll' },
          ...(hasResources ? [{ key: 'resources', label: 'Resources' }] : []),
          { key: 'rate', label: 'Rate' },
        ] as { key: ActiveView; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeView === tab.key
                ? 'text-lp-accent border-b-2 border-lp-accent'
                : 'text-lp-muted hover:text-lp-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'chat' && (
          <ChatPanel messages={chatMessages} sessionId={session.id} authorName={displayName} />
        )}

        {activeView === 'qa' && (
          <QAPanel sessionId={session.id} authorName={displayName} messages={messages} />
        )}

        {activeView === 'poll' && (
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            {activePoll && pollQuestion && !isPulse ? (
              <PollWidget pollId={activePoll} question={pollQuestion} options={pollOptions} />
            ) : activePoll && isPulse ? (
              <PulseCheck sessionId={session.id} />
            ) : (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📊</p>
                <p className="text-lp-muted">No active poll right now</p>
                <p className="text-lp-muted text-sm mt-1">The presenter will launch polls during the session</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'resources' && (
          <div className="p-4 space-y-3 overflow-y-auto h-full">
            {resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-lp-surface rounded-xl p-4 border border-lp-border hover:border-lp-accent/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎁</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-lp-text group-hover:text-lp-accent transition-colors">{r.name}</p>
                    <p className="text-xs text-lp-muted truncate">{r.url}</p>
                  </div>
                  <span className="text-lp-accent text-lg">→</span>
                </div>
              </a>
            ))}
            {/* Contact card in resources tab too */}
            {hasContact && (
              <div className="mt-3">
                <ContactCard
                  speakerName={session.speaker_name}
                  headshotUrl={s.headshot_url}
                  website={s.contact_website}
                  email={s.contact_email}
                  phone={s.contact_phone}
                  linkedin={s.contact_linkedin}
                  twitter={s.contact_twitter}
                  instagram={s.contact_instagram}
                  contactInfo={s.contact_info}
                />
              </div>
            )}
          </div>
        )}

        {activeView === 'rate' && (
          <div className="p-4 overflow-y-auto h-full space-y-4">
            <div className="bg-lp-surface rounded-xl p-6 border border-lp-border text-center">
              <p className="text-4xl mb-3">⭐</p>
              <h3 className="text-lg font-semibold mb-2">Rate this session</h3>
              <p className="text-sm text-lp-muted mb-6">How was {session.speaker_name}&apos;s presentation?</p>
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => submitRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={submittingRating}
                    className={`text-4xl transition-all hover:scale-125 active:scale-95 ${
                      star <= (hoverRating || rating) ? 'scale-110' : 'opacity-30 hover:opacity-60'
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-lp-green text-sm font-medium">
                  {rating === 5 ? '🎉 Amazing!' : rating >= 4 ? '👍 Great!' : rating >= 3 ? 'Thanks!' : 'Thanks for your feedback!'}
                  <span className="text-lp-muted font-normal ml-2">Tap to change</span>
                </p>
              )}
            </div>

            {/* Contact card in rate tab */}
            {hasContact && (
              <ContactCard
                speakerName={session.speaker_name}
                headshotUrl={s.headshot_url}
                website={s.contact_website}
                email={s.contact_email}
                phone={s.contact_phone}
                linkedin={s.contact_linkedin}
                twitter={s.contact_twitter}
                instagram={s.contact_instagram}
                contactInfo={s.contact_info}
              />
            )}
          </div>
        )}
      </div>

      {/* Reaction bar */}
      <div className="px-3 py-2.5 border-t border-lp-border bg-lp-surface">
        <ReactionBar sessionId={session.id} reactions={reactions} />
      </div>
    </div>
  );
}
