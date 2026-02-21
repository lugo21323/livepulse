'use client';

import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';

interface SessionSettingsModalProps {
  sessionId: string;
  currentSlideUrl: string;
  currentContactInfo: string;
  currentResourceUrl: string;
  currentTitle: string;
  onClose: () => void;
  onSaved: (updates: { slide_url?: string; contact_info?: string; resource_url?: string; title?: string }) => void;
}

export default function SessionSettingsModal({
  sessionId,
  currentSlideUrl,
  currentContactInfo,
  currentResourceUrl,
  currentTitle,
  onClose,
  onSaved,
}: SessionSettingsModalProps) {
  const [slideUrl, setSlideUrl] = useState(currentSlideUrl);
  const [contactInfo, setContactInfo] = useState(currentContactInfo);
  const [resourceUrl, setResourceUrl] = useState(currentResourceUrl);
  const [title, setTitle] = useState(currentTitle);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    const updates: Record<string, string | null> = {};

    if (slideUrl !== currentSlideUrl) updates.slide_url = slideUrl || null;
    if (contactInfo !== currentContactInfo) updates.contact_info = contactInfo || null;
    if (resourceUrl !== currentResourceUrl) updates.resource_url = resourceUrl || null;
    if (title !== currentTitle) updates.title = title || currentTitle;

    if (Object.keys(updates).length > 0) {
      await supabase.from('sessions').update(updates).eq('id', sessionId);
      onSaved(updates);
    }
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-lp-surface border border-lp-border rounded-2xl w-full max-w-lg p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">⚙️ Session Settings</h2>
          <button onClick={onClose} className="text-lp-muted hover:text-lp-text text-lg">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-lp-text mb-1.5">Session Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-lp-bg border border-lp-border rounded-lg px-4 py-2.5 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-lp-text mb-1.5">Slide URL</label>
            <input
              type="url"
              value={slideUrl}
              onChange={(e) => setSlideUrl(e.target.value)}
              placeholder="Paste Google Slides or SharePoint link..."
              className="w-full bg-lp-bg border border-lp-border rounded-lg px-4 py-2.5 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
            />
            <p className="text-xs text-lp-muted mt-1">Supports Google Slides & SharePoint/OneDrive links</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-lp-text mb-1.5">Contact Info</label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="e.g. @twitter, email, website..."
              className="w-full bg-lp-bg border border-lp-border rounded-lg px-4 py-2.5 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-lp-text mb-1.5">Resource URL</label>
            <input
              type="url"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="Link to free download, handout, etc..."
              className="w-full bg-lp-bg border border-lp-border rounded-lg px-4 py-2.5 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-lp-muted hover:text-lp-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 bg-lp-accent rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:bg-lp-accent/80 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
