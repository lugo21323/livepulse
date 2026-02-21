'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase';
import { useRealtimeMessages, useRealtimeReactions, useRealtimePollOptions, usePresenceCount } from '@/lib/realtime';
import type { Session, Poll } from '@/lib/types';
import SlideEmbed from '@/components/SlideEmbed';
import type { SlideEmbedHandle } from '@/components/SlideEmbed';
import ChatPanel from '@/components/ChatPanel';
import QAPanel from '@/components/QAPanel';
import PollCreator from '@/components/PollCreator';
import PollWidget from '@/components/PollWidget';
import PulseCheck from '@/components/PulseCheck';
import SidebarQR from '@/components/SidebarQR';
import FullscreenPanel from '@/components/FullscreenPanel';
import FloatingReactions from '@/components/FloatingReactions';

type SidebarTab = 'chat' | 'qa' | 'polls';

export default function PresenterLivePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const supabase = useRef(createSupabaseBrowser()).current;
  const slideRef = useRef<SlideEmbedHandle>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('chat');
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreenTab, setFullscreenTab] = useState<SidebarTab | null>(null);

  const messages = useRealtimeMessages(session?.id ?? '');
  const reactions = useRealtimeReactions(session?.id ?? '');
  const pollOptions = useRealtimePollOptions(activePoll?.id ?? null);
  const onlineCount = usePresenceCount(code, 'Presenter');

  // Keyboard shortcuts: 1=Chat, 2=Q&A, 3=Polls, F=Fullscreen, Esc=close, R=refocus slides
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === '1') setActiveTab('chat');
      if (e.key === '2') setActiveTab('qa');
      if (e.key === '3') setActiveTab('polls');
      if (e.key === 'f' || e.key === 'F') setFullscreenTab((prev) => prev ? null : activeTab);
      if (e.key === 'Escape') setFullscreenTab(null);
      if (e.key === 'r' || e.key === 'R') slideRef.current?.refocus();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTab]);

  // Load session
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/presenter'); return; }

      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_code', code)
        .eq('presenter_id', user.id)
        .single();

      if (!data) { router.replace('/presenter'); return; }
      setSession(data);

      const { data: poll } = await supabase
        .from('polls')
        .select('*')
        .eq('session_id', data.id)
        .eq('is_active', true)
        .single();
      if (poll) setActivePoll(poll);
      setLoading(false);
    }
    load();
  }, [code, supabase, router]);

  async function endSession() {
    if (!session) return;
    await supabase
      .from('sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', session.id);
    router.push('/presenter');
  }

  async function closePoll() {
    if (!activePoll) return;
    await supabase.from('polls').update({ is_active: false }).eq('id', activePoll.id);
    setActivePoll(null);
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lp-bg">
        <p className="text-lp-muted">Loading session...</p>
      </div>
    );
  }

  const chatMessages = messages.filter((m) => !m.is_question);
  const fullscreenLabel = fullscreenTab === 'chat' ? 'Chat' : fullscreenTab === 'qa' ? 'Q&A' : 'Polls';

  return (
    <div className="h-screen flex bg-lp-bg overflow-hidden">
      {/* Fullscreen panel overlay */}
      {fullscreenTab && (
        <FullscreenPanel
          title={fullscreenLabel}
          messages={fullscreenTab === 'chat' ? chatMessages : messages}
          onClose={() => setFullscreenTab(null)}
        >
          {fullscreenTab === 'chat' && (
            <ChatPanel messages={chatMessages} sessionId={session.id} authorName={`${session.speaker_name} (Host)`} compact />
          )}
          {fullscreenTab === 'qa' && (
            <QAPanel sessionId={session.id} authorName={`${session.speaker_name} (Host)`} messages={messages} />
          )}
          {fullscreenTab === 'polls' && activePoll && (
            <div className="p-6">
              <PollWidget pollId={activePoll.id} question={activePoll.question} options={pollOptions} showLiveResults />
            </div>
          )}
        </FullscreenPanel>
      )}

      {/* Main area - Slides with floating reactions */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {session.slide_url ? (
          <SlideEmbed ref={slideRef} url={session.slide_url} className="flex-1" />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-lp-surface">
            <div className="text-center">
              <p className="text-5xl mb-4">📽️</p>
              <p className="text-lp-muted text-lg">No slides attached</p>
              <p className="text-lp-muted text-sm mt-1">Add a slide URL when creating the session</p>
            </div>
          </div>
        )}

        {/* Floating emoji reactions over the slides */}
        <FloatingReactions reactions={reactions} />

        {/* Re-center / refocus button */}
        <button
          onClick={() => slideRef.current?.refocus()}
          className="absolute bottom-3 left-3 px-3 py-1.5 bg-lp-bg/80 backdrop-blur-sm border border-lp-border rounded-lg text-xs text-lp-muted hover:text-lp-accent hover:border-lp-accent/50 transition-colors z-20"
          title="Re-center slides (R)"
        >
          🎯 Re-center <span className="text-[10px] ml-1 opacity-60">R</span>
        </button>
      </div>

      {/* Sidebar */}
      <div className="w-[400px] border-l border-lp-border flex flex-col bg-lp-surface shrink-0">
        {/* Minimal top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-lp-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-sm">⚡</div>
            <span className="text-sm font-semibold truncate">{session.title}</span>
          </div>
          <button
            onClick={endSession}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            End
          </button>
        </div>

        {/* Tabs with fullscreen toggle */}
        <div className="flex border-b border-lp-border">
          {(['chat', 'qa', 'polls'] as SidebarTab[]).map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'text-lp-accent border-b-2 border-lp-accent'
                  : 'text-lp-muted hover:text-lp-text'
              }`}
            >
              {tab === 'chat' && `Chat (${chatMessages.length})`}
              {tab === 'qa' && `Q&A (${messages.filter((m) => m.is_question).length})`}
              {tab === 'polls' && 'Polls'}
              <span className="ml-1 text-[10px] text-lp-muted">{i + 1}</span>
            </button>
          ))}
          <button
            onClick={() => setFullscreenTab(activeTab)}
            className="px-3 text-lp-muted hover:text-lp-accent transition-colors border-l border-lp-border"
            title="Fullscreen (F)"
          >
            ⛶
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <ChatPanel messages={chatMessages} sessionId={session.id} authorName={`${session.speaker_name} (Host)`} compact />
          )}
          {activeTab === 'qa' && (
            <QAPanel sessionId={session.id} authorName={`${session.speaker_name} (Host)`} messages={messages} />
          )}
          {activeTab === 'polls' && (
            <div className="p-3 space-y-3 overflow-y-auto h-full">
              {/* Pulse Check */}
              <PulseCheck sessionId={session.id} isPresenter />

              <div className="border-t border-lp-border pt-3">
                {!showPollCreator && (
                  <button
                    onClick={() => setShowPollCreator(true)}
                    className="w-full py-3 border-2 border-dashed border-lp-border rounded-xl text-sm text-lp-muted hover:border-lp-accent hover:text-lp-accent transition-colors mb-3"
                  >
                    + Create Poll
                  </button>
                )}
                {showPollCreator && (
                  <PollCreator
                    sessionId={session.id}
                    onCreated={() => {
                      setShowPollCreator(false);
                      supabase.from('polls').select('*').eq('session_id', session.id).eq('is_active', true).single()
                        .then(({ data }) => { if (data) setActivePoll(data); });
                    }}
                    onCancel={() => setShowPollCreator(false)}
                  />
                )}
                {activePoll && (
                  <div className="space-y-2">
                    <PollWidget pollId={activePoll.id} question={activePoll.question} options={pollOptions} showLiveResults />
                    <button onClick={closePoll} className="w-full py-2 text-sm text-red-400 hover:text-red-300 transition-colors">Close Poll</button>
                  </div>
                )}
                {!showPollCreator && !activePoll && (
                  <p className="text-center text-lp-muted text-sm py-4">No active poll.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QR Code - always visible */}
        <SidebarQR sessionCode={session.session_code} onlineCount={onlineCount} />
      </div>
    </div>
  );
}
