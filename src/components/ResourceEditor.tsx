'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';

interface Resource {
  id: string;
  name: string;
  url: string;
  display_order: number;
}

interface ResourceEditorProps {
  sessionId: string;
  compact?: boolean;
}

export default function ResourceEditor({ sessionId, compact = false }: ResourceEditorProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const supabase = useRef(createSupabaseBrowser()).current;

  // Load existing resources
  useEffect(() => {
    supabase
      .from('resources')
      .select('*')
      .eq('session_id', sessionId)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setResources(data as Resource[]);
      });
  }, [sessionId, supabase]);

  async function addResource() {
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name || !url || adding) return;

    setAdding(true);
    const { data } = await supabase
      .from('resources')
      .insert({
        session_id: sessionId,
        name,
        url,
        display_order: resources.length,
      })
      .select()
      .single();

    if (data) {
      setResources((prev) => [...prev, data as Resource]);
      setNewName('');
      setNewUrl('');
      setShowForm(false);
    }
    setAdding(false);
  }

  async function removeResource(id: string) {
    await supabase.from('resources').delete().eq('id', id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  async function updateResource(id: string, field: 'name' | 'url', value: string) {
    setResources((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    await supabase.from('resources').update({ [field]: value }).eq('id', id);
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-lp-muted uppercase tracking-wider">Resources ({resources.length})</h4>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-semibold text-lp-accent hover:text-lp-accent/80"
          >
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {showForm && (
          <div className="space-y-2 bg-lp-bg rounded-lg p-3 border border-lp-border">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Resource name (e.g. Free Guide)"
              maxLength={100}
              className="w-full bg-lp-surface border border-lp-border rounded-lg px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
            />
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-lp-surface border border-lp-border rounded-lg px-3 py-2 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
              onKeyDown={(e) => e.key === 'Enter' && addResource()}
            />
            <button
              onClick={addResource}
              disabled={!newName.trim() || !newUrl.trim() || adding}
              className="w-full py-2 bg-lp-accent rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:bg-lp-accent/80 transition-colors"
            >
              {adding ? 'Adding...' : 'Add Resource'}
            </button>
          </div>
        )}

        {resources.map((r) => (
          <div key={r.id} className="flex items-center gap-2 bg-lp-bg rounded-lg px-3 py-2 border border-lp-border">
            <span className="text-sm">🎁</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-lp-text truncate">{r.name}</p>
              <p className="text-xs text-lp-muted truncate">{r.url}</p>
            </div>
            <button
              onClick={() => removeResource(r.id)}
              className="text-xs text-red-400/60 hover:text-red-400 shrink-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Full-size version (for create page / settings modal)
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-lp-text">
          Resources <span className="text-lp-muted font-normal">(shared with audience)</span>
        </label>
      </div>

      {resources.map((r) => (
        <div key={r.id} className="flex gap-2 items-start bg-lp-bg/50 rounded-xl p-3 border border-lp-border">
          <div className="flex-1 space-y-2">
            <input
              type="text"
              value={r.name}
              onChange={(e) => updateResource(r.id, 'name', e.target.value)}
              className="w-full bg-lp-surface border border-lp-border rounded-lg px-3 py-2 text-sm font-semibold text-lp-text focus:outline-none focus:border-lp-accent"
            />
            <input
              type="url"
              value={r.url}
              onChange={(e) => updateResource(r.id, 'url', e.target.value)}
              className="w-full bg-lp-surface border border-lp-border rounded-lg px-3 py-2 text-sm text-lp-text focus:outline-none focus:border-lp-accent"
            />
          </div>
          <button
            onClick={() => removeResource(r.id)}
            className="mt-2 text-sm text-red-400/60 hover:text-red-400"
          >
            ✕
          </button>
        </div>
      ))}

      {showForm ? (
        <div className="space-y-2 bg-lp-bg/50 rounded-xl p-3 border border-dashed border-lp-accent/50">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Resource name (e.g. Free PDF Guide, Slides Deck, Worksheet)"
            maxLength={100}
            className="w-full bg-lp-surface border border-lp-border rounded-lg px-3 py-2.5 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
          />
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://link-to-resource.com"
            className="w-full bg-lp-surface border border-lp-border rounded-lg px-3 py-2.5 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
            onKeyDown={(e) => e.key === 'Enter' && addResource()}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setNewName(''); setNewUrl(''); }} className="px-3 py-1.5 text-sm text-lp-muted hover:text-lp-text">
              Cancel
            </button>
            <button
              onClick={addResource}
              disabled={!newName.trim() || !newUrl.trim() || adding}
              className="px-4 py-1.5 bg-lp-accent rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:bg-lp-accent/80 transition-colors"
            >
              {adding ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-lp-border rounded-xl text-sm font-semibold text-lp-muted hover:border-lp-accent hover:text-lp-accent transition-colors"
        >
          + Add Resource
        </button>
      )}
    </div>
  );
}
