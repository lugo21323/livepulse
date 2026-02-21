'use client';

import { useState, useRef, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import { getVoterId } from '@/lib/supabase';
import type { Message, QuestionWithVotes } from '@/lib/types';

interface QAPanelProps {
  sessionId: string;
  authorName: string;
  messages: Message[];
}

export default function QAPanel({ sessionId, authorName, messages }: QAPanelProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [upvotes, setUpvotes] = useState<Record<string, { count: number; voted: boolean }>>({});
  const supabase = useRef(createSupabaseBrowser()).current;

  // Only show questions
  const questions = messages.filter((m) => m.is_question);

  // Fetch upvote counts for questions
  useEffect(() => {
    if (questions.length === 0) return;
    const voterId = getVoterId();

    async function fetchUpvotes() {
      const ids = questions.map((q) => q.id);

      // Get upvote counts
      const { data: upvoteData } = await supabase
        .from('question_upvotes')
        .select('message_id')
        .in('message_id', ids);

      // Get user's own votes
      const { data: myVotes } = await supabase
        .from('question_upvotes')
        .select('message_id')
        .in('message_id', ids)
        .eq('voter_id', voterId);

      const counts: Record<string, number> = {};
      upvoteData?.forEach((row) => {
        counts[row.message_id] = (counts[row.message_id] || 0) + 1;
      });

      const myVoteSet = new Set(myVotes?.map((v) => v.message_id));

      const result: Record<string, { count: number; voted: boolean }> = {};
      ids.forEach((id) => {
        result[id] = { count: counts[id] || 0, voted: myVoteSet.has(id) };
      });
      setUpvotes(result);
    }

    fetchUpvotes();
  }, [questions.length, supabase]);

  // Sort by upvote count descending
  const sorted = [...questions].sort(
    (a, b) => (upvotes[b.id]?.count ?? 0) - (upvotes[a.id]?.count ?? 0)
  );

  async function submitQuestion(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setText('');
    await supabase.from('messages').insert({
      session_id: sessionId,
      author_name: authorName,
      content,
      is_question: true,
    });
    setSending(false);
  }

  async function toggleUpvote(messageId: string) {
    const voterId = getVoterId();
    const { data } = await supabase.rpc('toggle_question_upvote', {
      p_message_id: messageId,
      p_voter_id: voterId,
    });

    setUpvotes((prev) => {
      const current = prev[messageId] || { count: 0, voted: false };
      return {
        ...prev,
        [messageId]: {
          count: data ? current.count + 1 : current.count - 1,
          voted: !!data,
        },
      };
    });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 && (
          <p className="text-center text-lp-muted text-sm py-8">No questions yet. Ask one!</p>
        )}
        {sorted.map((q) => {
          const info = upvotes[q.id] || { count: 0, voted: false };
          return (
            <div key={q.id} className="flex gap-2 animate-slide-in">
              <button
                onClick={() => toggleUpvote(q.id)}
                className={`flex flex-col items-center justify-center px-2 py-1 rounded-lg border transition-all shrink-0 ${
                  info.voted
                    ? 'border-lp-accent bg-lp-accent/10 text-lp-accent'
                    : 'border-lp-border bg-lp-surface-light text-lp-muted hover:border-lp-accent/50'
                }`}
              >
                <span className="text-xs">▲</span>
                <span className="text-xs font-semibold">{info.count}</span>
              </button>
              <div className="flex-1 bg-lp-surface-light rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-lp-accent">{q.author_name}</span>
                <p className="text-sm text-lp-text mt-0.5">{q.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submitQuestion} className="p-3 border-t border-lp-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask a question..."
            maxLength={500}
            className="flex-1 bg-lp-bg border border-lp-border rounded-lg px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-4 py-2 bg-lp-accent rounded-lg text-sm font-medium text-white disabled:opacity-40 hover:bg-lp-accent/80 transition-colors"
          >
            Ask
          </button>
        </div>
      </form>
    </div>
  );
}
