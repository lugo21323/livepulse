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

type ActiveView = 'chat' | 'qa' | 'poll' | 'resources' | 'rate';

export default function AudienceSessionPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

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
  const [ratedAlready, setRatedAlready] = useState(false);

  const supabase = useRef(createSupabaseBrowser()).current;

  // Fetch poll question
  useEffect(() => {
    if (!activePoll) { setPollQuestion(''); return; }
    supabase.from('polls').select('question').eq('id', activePoll).single()
      .then(({ data }) => { if (data) setPollQuestion((data as any).question); });
  }, [activePoll, supabase]);

  async function submitRating(stars: number) {
    if (!session || ratedAlready) return;
    setRating(stars);
    const voterId = getVoterId();
    await supabase.from('ratings').insert({
      session_id: session.id,
      rating: stars,
      voter_id: voterId,
    });
    setRatedAlready(true);
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
  const contactInfo = (session as any).contact_info;
  const resourceUrl = (session as any).resource_url;
  const isPulse = pollQuestion.startsWith('PULSE:');

  return (
    <div className="h-screen flex flex-col bg-lp-bg overflow-hidden">
      {/* Presenter contact info bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-lp-surface border-b border-lp-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-sm shrink-0">⚡</div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{session.title}</h1>
            <p className="text-xs text-lp-muted truncate">{session.speaker_name}{contactInfo ? ` · ${contactInfo}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-lp-green animate-pulse-dot" />
          <span className="text-sm font-bold text-lp-text">{onlineCount}</span>
          <span className="text-xs text-lp-muted">online</span>
        </div>
      </div>

      {/* Active poll / pulse check - shown above tabs when active */}
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
          { key: 'chat', label: `Chat` },
          { key: 'qa', label: `Q&A` },
          { key: 'poll', label: `Poll` },
          ...(resourceUrl ? [{ key: 'resources', label: 'Resources' }] : []),
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
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            <div className="bg-lp-surface rounded-xl p-6 border border-lp-border text-center">
              <p className="text-4xl mb-3">🎁</p>
              <h3 className="text-lg font-semibold mb-2">Free Resource</h3>
              <p className="text-sm text-lp-muted mb-4">Shared by {session.speaker_name}</p>
              <a
                href={resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-gradient-to-r from-lp-accent to-lp-pink rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all shadow-[0_4px_20px_rgba(108,92,231,0.3)]"
              >
                Download / View Resource →
              </a>
            </div>
            {contactInfo && (
              <div className="bg-lp-surface rounded-xl p-4 border border-lp-border">
                <h4 className="text-sm font-medium text-lp-muted mb-1">Get in touch</h4>
                <p className="text-sm text-lp-text">{contactInfo}</p>
              </div>
            )}
          </div>
        )}

        {activeView === 'rate' && (
          <div className="p-4 overflow-y-auto h-full">
            <div className="bg-lp-surface rounded-xl p-6 border border-lp-border text-center">
              <p className="text-4xl mb-3">⭐</p>
              <h3 className="text-lg font-semibold mb-2">Rate this session</h3>
              <p className="text-sm text-lp-muted mb-6">How was {session.speaker_name}&apos;s presentation?</p>
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => submitRating(star)}
                    disabled={ratedAlready}
                    className={`text-4xl transition-all ${
                      star <= rating
                        ? 'scale-110'
                        : 'opacity-30 hover:opacity-60'
                    } ${ratedAlready ? 'cursor-default' : 'hover:scale-125 active:scale-95'}`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              {ratedAlready && (
                <p className="text-lp-green text-sm font-medium">Thanks for your rating!</p>
              )}
            </div>
            {contactInfo && (
              <div className="bg-lp-surface rounded-xl p-4 border border-lp-border mt-4">
                <h4 className="text-sm font-medium text-lp-muted mb-1">Connect with {session.speaker_name}</h4>
                <p className="text-sm text-lp-text">{contactInfo}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reaction bar at bottom */}
      <div className="px-3 py-2.5 border-t border-lp-border bg-lp-surface">
        <ReactionBar sessionId={session.id} reactions={reactions} />
      </div>
    </div>
  );
}
