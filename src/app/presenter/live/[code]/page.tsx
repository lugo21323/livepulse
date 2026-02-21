'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase';
import { useRealtimeMessages, useRealtimeReactions, useRealtimePollOptions, usePresenceCount } from '@/lib/realtime';
import type { Session, Poll, PollOption as PollOptionType } from '@/lib/types';
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
import SessionSettingsModal from '@/components/SessionSettingsModal';

type SidebarTab = 'chat' | 'qa' | 'polls';
type SidebarWidth = '1/4' | '1/3' | '1/2';

const SIDEBAR_WIDTHS: Record<SidebarWidth, string> = {
  '1/4': 'w-[25vw] min-w-[320px]',
  '1/3': 'w-[33vw] min-w-[350px]',
  '1/2': 'w-[50vw]',
};

interface ClosedPoll {
  id: string;
  question: string;
  options: PollOptionType[];
}

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
  const [showSettings, setShowSettings] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<SidebarWidth>('1/3');
  const [closedPolls, setClosedPolls] = useState<ClosedPoll[]>([]);

  const [lastSeenChat, setLastSeenChat] = useState(0);
  const [lastSeenQA, setLastSeenQA] = useState(0);

  const messages = useRealtimeMessages(session?.id ?? '');
  const reactions = useRealtimeReactions(session?.id ?? '');
  const pollOptions = useRealtimePollOptions(activePoll?.id ?? null);
  const onlineCount = usePresenceCount(code, 'Presenter');

  const chatMessages = messages.filter((m) => !m.is_question);
  const qaMessages = messages.filter((m) => m.is_question);
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  useEffect(() => {
    if (activeTab === 'chat') setLastSeenChat(chatMessages.length);
    if (activeTab === 'qa') setLastSeenQA(qaMessages.length);
  }, [activeTab, chatMessages.length, qaMessages.length]);

  const newChatCount = activeTab !== 'chat' ? Math.max(0, chatMessages.length - lastSeenChat) : 0;
  const newQACount = activeTab !== 'qa' ? Math.max(0, qaMessages.length - lastSeenQA) : 0;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === '1') setActiveTab('chat');
      if (e.key === '2') setActiveTab('qa');
      if (e.key === '3') setActiveTab('polls');
      if (e.key === 'f' || e.key === 'F') setFullscreenTab((prev) => prev ? null : activeTab);
      if (e.key === 'Escape') { setFullscreenTab(null); setShowSettings(false); setShowEndConfirm(false); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeTab]);

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

      const { data: closed } = await supabase
        .from('polls')
        .select('*')
        .eq('session_id', data.id)
        .eq('is_active', false)
        .order('created_at', { ascending: false });

      if (closed && closed.length > 0) {
        const pollsWithOptions: ClosedPoll[] = [];
        for (const p of closed) {
          if ((p as any).question?.startsWith('PULSE:')) continue;
          const { data: opts } = await supabase
            .from('poll_options')
            .select('*')
            .eq('poll_id', p.id)
            .order('display_order');
          pollsWithOptions.push({
            id: p.id,
            question: (p as any).question,
            options: (opts as PollOptionType[]) || [],
          });
        }
        setClosedPolls(pollsWithOptions);
      }

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

  const closePoll = useCallback(async () => {
    if (!activePoll) return;
    await supabase.from('polls').update({ is_active: false }).eq('id', activePoll.id);

    if (!(activePoll as any).question?.startsWith('PULSE:')) {
      setClosedPolls((prev) => [{
        id: activePoll.id,
        question: (activePoll as any).question,
        options: pollOptions,
      }, ...prev]);
    }
    setActivePoll(null);
  }, [activePoll, supabase, pollOptions]);

  async function reopenPoll(pollId: string) {
    if (activePoll) await closePoll();
    await supabase.from('polls').update({ is_active: true }).eq('id', pollId);
    const { data: poll } = await supabase.from('polls').select('*').eq('id', pollId).single();
    if (poll) {
      setActivePoll(poll);
      setClosedPolls((prev) => prev.filter((cp) => cp.id !== pollId));
    }
  }

  function cycleSidebarWidth() {
    const sizes: SidebarWidth[] = ['1/4', '1/3', '1/2'];
    const idx = sizes.indexOf(sidebarWidth);
    setSidebarWidth(sizes[(idx + 1) % sizes.length]);
  }

  function getIframe(): HTMLIFrameElement | null {
    return document.querySelector('iframe[title*="Presentation"]');
  }

  function clickInIframe() {
    const iframe = getIframe();
    if (iframe) {
      iframe.focus();
    }
  }

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lp-bg">
        <p className="text-lp-muted text-lg font-medium">Loading session...</p>
      </div>
    );
  }

  const fullscreenLabel = fullscreenTab === 'chat' ? 'Chat' : fullscreenTab === 'qa' ? 'Q&A' : 'Polls';

  return (
    <div className="h-screen flex bg-lp-bg overflow-hidden">
      {/* Settings modal */}
      {showSettings && (
        <SessionSettingsModal
          sessionId={session.id}
          currentSlideUrl={session.slide_url || ''}
          currentTitle={session.title}
          currentHeadshotUrl={(session as any).headshot_url || ''}
          currentWebsite={(session as any).contact_website || ''}
          currentEmail={(session as any).contact_email || ''}
          currentPhone={(session as any).contact_phone || ''}
          currentLinkedin={(session as any).contact_linkedin || ''}
          currentTwitter={(session as any).contact_twitter || ''}
          currentInstagram={(session as any).contact_instagram || ''}
          onClose={() => setShowSettings(false)}
          onSaved={(updates) => {
            setSession((prev) => prev ? { ...prev, ...updates } as Session : prev);
          }}
        />
      )}

      {/* End session confirmation */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEndConfirm(false)}>
          <div className="bg-lp-surface border border-lp-border rounded-2xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-3xl mb-3">⚠️</p>
            <h3 className="text-lg font-bold mb-2">End Session?</h3>
            <p className="text-sm text-lp-muted mb-6">This will disconnect all audience members and close the session permanently.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-lg border border-lp-border text-lp-muted hover:text-lp-text transition-colors">
                Cancel
              </button>
              <button onClick={() => { setShowEndConfirm(false); endSession(); }} className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen panel */}
      {fullscreenTab && (
        <FullscreenPanel title={fullscreenLabel} messages={fullscreenTab === 'chat' ? chatMessages : messages} onClose={() => setFullscreenTab(null)}>
          {fullscreenTab === 'chat' && <ChatPanel messages={chatMessages} sessionId={session.id} authorName={`${session.speaker_name} (Host)`} compact />}
          {fullscreenTab === 'qa' && <QAPanel sessionId={session.id} authorName={`${session.speaker_name} (Host)`} messages={messages} />}
          {fullscreenTab === 'polls' && activePoll && (
            <div className="p-6"><PollWidget pollId={activePoll.id} question={(activePoll as any).question} options={pollOptions} showLiveResults /></div>
          )}
        </FullscreenPanel>
      )}

      {/* Main area - Slides */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {session.slide_url ? (
          <SlideEmbed ref={slideRef} url={session.slide_url} className="flex-1" />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-lp-surface">
            <div className="text-center">
              <p className="text-5xl mb-4">📽️</p>
              <p className="text-lp-muted text-lg font-semibold">No slides attached</p>
              <button onClick={() => setShowSettings(true)} className="mt-3 px-5 py-2 bg-lp-accent rounded-lg text-sm font-semibold text-white hover:bg-lp-accent/80 transition-colors">
                + Add Slide URL
              </button>
            </div>
          </div>
        )}

        <FloatingReactions reactions={reactions} />

        {/* Big slide nav buttons */}
        {session.slide_url && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <button
              onClick={() => { clickInIframe(); }}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-lp-bg/90 backdrop-blur-sm border border-lp-border text-2xl text-lp-muted hover:text-lp-accent hover:border-lp-accent/50 hover:bg-lp-bg transition-all active:scale-90 shadow-lg"
              title="Click, then use keyboard arrows. Previous slide."
            >
              ◀
            </button>
            <button
              onClick={() => slideRef.current?.refocus()}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-lp-accent/20 backdrop-blur-sm border border-lp-accent/40 text-sm text-lp-accent hover:bg-lp-accent/30 transition-all"
              title="Focus slides for keyboard/remote control"
            >
              🎯
            </button>
            <button
              onClick={() => { clickInIframe(); }}
              className="w-14 h-14 flex items-center justify-center rounded-full bg-lp-bg/90 backdrop-blur-sm border border-lp-border text-2xl text-lp-muted hover:text-lp-accent hover:border-lp-accent/50 hover:bg-lp-bg transition-all active:scale-90 shadow-lg"
              title="Click, then use keyboard arrows. Next slide."
            >
              ▶
            </button>
          </div>
        )}

        {/* Total reactions counter */}
        {totalReactions > 0 && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-2 bg-lp-bg/90 backdrop-blur-sm border border-lp-border rounded-lg">
            <span className="text-sm">🔥</span>
            <span className="text-lg font-extrabold text-lp-text">{totalReactions}</span>
            <span className="text-xs text-lp-muted font-medium">reactions</span>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className={`${SIDEBAR_WIDTHS[sidebarWidth]} border-l border-lp-border flex flex-col bg-lp-surface shrink-0 transition-all duration-300`}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-lp-border">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-sm">⚡</div>
            <span className="text-sm font-bold truncate">{session.title}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-lp-green animate-pulse-dot" />
              <span className="text-sm font-bold text-lp-text">{onlineCount}</span>
              <span className="text-xs text-lp-muted">online</span>
            </div>
            <button onClick={() => setShowSettings(true)} className="w-8 h-8 flex items-center justify-center rounded-lg text-base text-lp-muted hover:text-lp-accent hover:bg-lp-bg transition-colors" title="Session settings">
              ⚙️
            </button>
          </div>
        </div>

        {/* Toolbar: fullscreen, resize, end */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-lp-border bg-lp-bg/50">
          <div className="flex items-center gap-1">
            <button onClick={() => setFullscreenTab(activeTab)} className="px-3 py-1.5 text-sm font-semibold text-lp-muted hover:text-lp-accent hover:bg-lp-surface rounded-lg transition-all" title="Fullscreen (F)">
              ⛶ Expand
            </button>
            <button onClick={cycleSidebarWidth} className="px-3 py-1.5 text-sm font-semibold text-lp-muted hover:text-lp-accent hover:bg-lp-surface rounded-lg transition-all" title="Resize sidebar">
              👁️ {sidebarWidth}
            </button>
          </div>
          <button onClick={() => setShowEndConfirm(true)} className="px-2.5 py-1 text-xs font-medium rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            End
          </button>
        </div>

        {/* Tabs with badges */}
        <div className="flex border-b border-lp-border">
          {(['chat', 'qa', 'polls'] as SidebarTab[]).map((tab, i) => {
            const badge = tab === 'chat' ? newChatCount : tab === 'qa' ? newQACount : 0;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors relative ${
                  activeTab === tab ? 'text-lp-accent border-b-2 border-lp-accent' : 'text-lp-muted hover:text-lp-text'
                }`}
              >
                {tab === 'chat' && 'Chat'}
                {tab === 'qa' && 'Q&A'}
                {tab === 'polls' && 'Polls'}
                {badge > 0 && (
                  <span className="absolute -top-0.5 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-lp-pink text-white rounded-full animate-slide-in">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
                <span className="ml-1 text-[10px] text-lp-muted">{i + 1}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden presenter-panel">
          {activeTab === 'chat' && <ChatPanel messages={chatMessages} sessionId={session.id} authorName={`${session.speaker_name} (Host)`} compact />}
          {activeTab === 'qa' && <QAPanel sessionId={session.id} authorName={`${session.speaker_name} (Host)`} messages={messages} />}
          {activeTab === 'polls' && (
            <div className="p-3 space-y-3 overflow-y-auto h-full">
              <PulseCheck sessionId={session.id} isPresenter />
              <div className="border-t border-lp-border pt-3">
                {!showPollCreator && (
                  <button onClick={() => setShowPollCreator(true)} className="w-full py-3 border-2 border-dashed border-lp-border rounded-xl text-sm font-semibold text-lp-muted hover:border-lp-accent hover:text-lp-accent transition-colors mb-3">
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
                  <div className="space-y-2 mt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-lp-green animate-pulse-dot" />
                      <span className="text-xs font-bold text-lp-green uppercase tracking-wider">Live</span>
                    </div>
                    <PollWidget pollId={activePoll.id} question={(activePoll as any).question} options={pollOptions} showLiveResults />
                    <button onClick={closePoll} className="w-full py-2 text-sm font-semibold text-lp-orange hover:text-lp-orange/80 transition-colors">
                      Pause Poll
                    </button>
                  </div>
                )}

                {closedPolls.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-lp-border">
                    <h4 className="text-xs font-bold text-lp-muted uppercase tracking-wider mb-3">Past Polls ({closedPolls.length})</h4>
                    <div className="space-y-3">
                      {closedPolls.map((cp) => (
                        <div key={cp.id}>
                          <PollWidget pollId={cp.id} question={cp.question} options={cp.options} showLiveResults isClosed />
                          <button onClick={() => reopenPoll(cp.id)} className="w-full mt-1 py-1.5 text-xs font-semibold text-lp-accent hover:text-lp-accent/80 transition-colors">
                            🔄 Reopen Poll
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!showPollCreator && !activePoll && closedPolls.length === 0 && (
                  <p className="text-center text-lp-muted text-sm font-medium py-4">No polls yet. Create one above!</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QR Code */}
        <SidebarQR sessionCode={session.session_code} />
      </div>
    </div>
  );
}
