'use client';

import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';
import ResourceEditor from './ResourceEditor';

interface SessionSettingsModalProps {
  sessionId: string;
  currentSlideUrl: string;
  currentTitle: string;
  currentHeadshotUrl: string;
  currentWebsite: string;
  currentEmail: string;
  currentPhone: string;
  currentLinkedin: string;
  currentTwitter: string;
  currentInstagram: string;
  onClose: () => void;
  onSaved: (updates: Record<string, string | null>) => void;
}

export default function SessionSettingsModal({
  sessionId,
  currentSlideUrl,
  currentTitle,
  currentHeadshotUrl,
  currentWebsite,
  currentEmail,
  currentPhone,
  currentLinkedin,
  currentTwitter,
  currentInstagram,
  onClose,
  onSaved,
}: SessionSettingsModalProps) {
  const [slideUrl, setSlideUrl] = useState(currentSlideUrl);
  const [title, setTitle] = useState(currentTitle);
  const [headshotUrl, setHeadshotUrl] = useState(currentHeadshotUrl);
  const [website, setWebsite] = useState(currentWebsite);
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(currentPhone);
  const [linkedin, setLinkedin] = useState(currentLinkedin);
  const [twitter, setTwitter] = useState(currentTwitter);
  const [instagram, setInstagram] = useState(currentInstagram);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'general' | 'contact' | 'resources'>('general');

  async function save() {
    setSaving(true);
    const supabase = createSupabaseBrowser();
    const updates: Record<string, string | null> = {};

    if (slideUrl !== currentSlideUrl) updates.slide_url = slideUrl || null;
    if (title !== currentTitle) updates.title = title || currentTitle;
    if (headshotUrl !== currentHeadshotUrl) updates.headshot_url = headshotUrl || null;
    if (website !== currentWebsite) updates.contact_website = website || null;
    if (email !== currentEmail) updates.contact_email = email || null;
    if (phone !== currentPhone) updates.contact_phone = phone || null;
    if (linkedin !== currentLinkedin) updates.contact_linkedin = linkedin || null;
    if (twitter !== currentTwitter) updates.contact_twitter = twitter || null;
    if (instagram !== currentInstagram) updates.contact_instagram = instagram || null;

    if (Object.keys(updates).length > 0) {
      await supabase.from('sessions').update(updates).eq('id', sessionId);
      onSaved(updates);
    }
    setSaving(false);
    onClose();
  }

  const inputClass = "w-full bg-lp-bg border border-lp-border rounded-lg px-4 py-2.5 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-lp-surface border border-lp-border rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-lp-border shrink-0">
          <h2 className="text-lg font-bold">⚙️ Session Settings</h2>
          <button onClick={onClose} className="text-lp-muted hover:text-lp-text text-lg">✕</button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-lp-border px-6 shrink-0">
          {(['general', 'contact', 'resources'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                activeSection === section
                  ? 'text-lp-accent border-b-2 border-lp-accent'
                  : 'text-lp-muted hover:text-lp-text'
              }`}
            >
              {section === 'general' && '📋 General'}
              {section === 'contact' && '👤 Contact'}
              {section === 'resources' && '🎁 Resources'}
            </button>
          ))}
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeSection === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-lp-text mb-1.5">Session Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-lp-text mb-1.5">Slide URL</label>
                <input type="url" value={slideUrl} onChange={(e) => setSlideUrl(e.target.value)} placeholder="Paste Google Slides or SharePoint link..." className={inputClass} />
                <p className="text-xs text-lp-muted mt-1">Supports Google Slides & SharePoint/OneDrive links</p>
              </div>
            </div>
          )}

          {activeSection === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-lp-text mb-1.5">Headshot URL</label>
                <input type="url" value={headshotUrl} onChange={(e) => setHeadshotUrl(e.target.value)} placeholder="https://your-photo.jpg" className={inputClass} />
                <p className="text-xs text-lp-muted mt-1">Link to your profile photo (use LinkedIn, website, or image host)</p>
                {headshotUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={headshotUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-lp-border" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    <span className="text-xs text-lp-green">Preview</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-lp-text mb-1.5">🌐 Website</label>
                  <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-lp-text mb-1.5">✉️ Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-lp-text mb-1.5">📱 Phone</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-lp-text mb-1.5">💼 LinkedIn</label>
                  <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/you" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-lp-text mb-1.5">𝕏 X / Twitter</label>
                  <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/you" className={inputClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-lp-text mb-1.5">📸 Instagram</label>
                  <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/you" className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'resources' && (
            <ResourceEditor sessionId={sessionId} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-lp-border shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-lp-muted hover:text-lp-text transition-colors">
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
