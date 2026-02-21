'use client';

import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';

const COLORS = ['#6c5ce7', '#00d2a0', '#ff6b9d', '#ffa348', '#ffd43b', '#a29bfe'];

interface PollCreatorProps {
  sessionId: string;
  onCreated: () => void;
  onCancel: () => void;
}

export default function PollCreator({ sessionId, onCreated, onCancel }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);

  function addOption() {
    if (options.length < 6) setOptions([...options, '']);
  }

  function updateOption(idx: number, value: string) {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2 || creating) return;

    setCreating(true);
    const supabase = createSupabaseBrowser();

    // Deactivate any existing active polls
    await supabase
      .from('polls')
      .update({ is_active: false })
      .eq('session_id', sessionId)
      .eq('is_active', true);

    // Create the poll
    const { data: poll } = await supabase
      .from('polls')
      .insert({ session_id: sessionId, question: q, is_active: true })
      .select()
      .single();

    if (poll) {
      // Create options
      const optionRows = opts.map((text, i) => ({
        poll_id: poll.id,
        option_text: text,
        display_order: i,
        color: COLORS[i % COLORS.length],
      }));
      await supabase.from('poll_options').insert(optionRows);
    }

    setCreating(false);
    onCreated();
  }

  return (
    <form onSubmit={create} className="bg-lp-surface rounded-xl p-4 border border-lp-border space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <span>📊</span> Create Poll
      </h3>

      <input
        type="text"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Your question..."
        maxLength={200}
        className="w-full bg-lp-bg border border-lp-border rounded-lg px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
      />

      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-2 items-center">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <input
              type="text"
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
              className="flex-1 bg-lp-bg border border-lp-border rounded-lg px-3 py-1.5 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => removeOption(i)}
                className="text-lp-muted hover:text-red-400 text-sm"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 6 && (
        <button
          type="button"
          onClick={addOption}
          className="text-xs text-lp-accent hover:text-lp-accent/80"
        >
          + Add option
        </button>
      )}

      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-lp-muted hover:text-lp-text transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!question.trim() || options.filter((o) => o.trim()).length < 2 || creating}
          className="px-4 py-1.5 bg-lp-accent rounded-lg text-sm font-medium text-white disabled:opacity-40 hover:bg-lp-accent/80 transition-colors"
        >
          {creating ? 'Creating...' : 'Launch Poll'}
        </button>
      </div>
    </form>
  );
}
