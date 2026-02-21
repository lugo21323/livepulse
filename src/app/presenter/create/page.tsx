'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase';
import { detectProvider, toEmbedUrl } from '@/lib/slides';
import SlideEmbed from '@/components/SlideEmbed';

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface PendingResource {
  name: string;
  url: string;
}

export default function CreateSessionPage() {
  const [title, setTitle] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [slideUrl, setSlideUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  // Contact fields
  const [headshotUrl, setHeadshotUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');

  // Resources
  const [resources, setResources] = useState<PendingResource[]>([]);
  const [newResName, setNewResName] = useState('');
  const [newResUrl, setNewResUrl] = useState('');
  const [showResourceForm, setShowResourceForm] = useState(false);

  const router = useRouter();
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/presenter');
        return;
      }
      setUserId(user.id);
    });
  }, []);

  const slideProvider = slideUrl ? detectProvider(slideUrl) : null;
  const canPreview = slideUrl && slideProvider !== 'unknown' && toEmbedUrl(slideUrl);

  function addResource() {
    const n = newResName.trim();
    const u = newResUrl.trim();
    if (!n || !u) return;
    setResources((prev) => [...prev, { name: n, url: u }]);
    setNewResName('');
    setNewResUrl('');
    setShowResourceForm(false);
  }

  function removeResource(idx: number) {
    setResources((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || creating) return;
    setError('');
    setCreating(true);

    const sessionCode = generateSessionCode();

    const { data: sessionData, error: dbError } = await supabase.from('sessions').insert({
      presenter_id: userId,
      title: title.trim(),
      speaker_name: speakerName.trim(),
      session_code: sessionCode,
      slide_url: slideUrl.trim() || null,
      is_active: false,
      headshot_url: headshotUrl.trim() || null,
      contact_website: website.trim() || null,
      contact_email: email.trim() || null,
      contact_phone: phone.trim() || null,
      contact_linkedin: linkedin.trim() || null,
      contact_twitter: twitter.trim() || null,
      contact_instagram: instagram.trim() || null,
    }).select().single();

    if (dbError) {
      setError(dbError.message);
      setCreating(false);
      return;
    }

    // Create resources if any
    if (sessionData && resources.length > 0) {
      const resourceRows = resources.map((r, i) => ({
        session_id: sessionData.id,
        name: r.name,
        url: r.url,
        display_order: i,
      }));
      await supabase.from('resources').insert(resourceRows);
    }

    router.push('/presenter');
  }

  const inputClass = "w-full bg-lp-surface border border-lp-border rounded-xl px-4 py-3 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors";

  return (
    <div className="min-h-screen bg-lp-bg">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-lp-border">
        <button onClick={() => router.push('/presenter')} className="text-lp-muted hover:text-lp-text transition-colors">
          ← Back
        </button>
        <h1 className="text-lg font-bold">Create Session</h1>
      </header>

      <main className="max-w-3xl mx-auto p-6">
        <form onSubmit={handleCreate} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-lp-surface rounded-2xl p-5 border border-lp-border space-y-4">
            <h2 className="text-sm font-bold text-lp-muted uppercase tracking-wider">📋 Basic Info</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-lp-muted mb-1.5">Session Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Keynote: The Future of AI" required maxLength={100} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-lp-muted mb-1.5">Speaker Name</label>
                <input type="text" value={speakerName} onChange={(e) => setSpeakerName(e.target.value)} placeholder="e.g. Luke Puffingston" required maxLength={80} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Slides */}
          <div className="bg-lp-surface rounded-2xl p-5 border border-lp-border space-y-4">
            <h2 className="text-sm font-bold text-lp-muted uppercase tracking-wider">📽️ Slides</h2>
            <div>
              <div className="flex gap-2">
                <input type="url" value={slideUrl} onChange={(e) => { setSlideUrl(e.target.value); setShowPreview(false); }} placeholder="Paste Google Slides or OneDrive link" className={`flex-1 ${inputClass}`} />
                {canPreview && (
                  <button type="button" onClick={() => setShowPreview(!showPreview)} className="px-4 py-3 bg-lp-accent/10 text-lp-accent rounded-xl text-sm font-medium hover:bg-lp-accent/20 transition-colors shrink-0">
                    {showPreview ? 'Hide' : 'Preview'}
                  </button>
                )}
              </div>
              {slideUrl && (
                <p className={`text-xs mt-1.5 ${slideProvider === 'unknown' ? 'text-red-400' : 'text-lp-green'}`}>
                  {slideProvider === 'google' && '✓ Google Slides detected'}
                  {slideProvider === 'onedrive' && '✓ OneDrive / PowerPoint detected'}
                  {slideProvider === 'unknown' && '⚠ Unrecognized link'}
                </p>
              )}
            </div>
            {showPreview && slideUrl && (
              <div className="rounded-xl overflow-hidden border border-lp-border" style={{ height: '340px' }}>
                <SlideEmbed url={slideUrl} className="w-full h-full" />
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-lp-surface rounded-2xl p-5 border border-lp-border space-y-4">
            <h2 className="text-sm font-bold text-lp-muted uppercase tracking-wider">👤 Contact Info <span className="font-normal normal-case">(visible to audience)</span></h2>

            <div>
              <label className="block text-sm font-medium text-lp-muted mb-1.5">Headshot URL</label>
              <input type="url" value={headshotUrl} onChange={(e) => setHeadshotUrl(e.target.value)} placeholder="https://your-photo.jpg (use LinkedIn, website, etc.)" className={inputClass} />
              {headshotUrl && (
                <div className="mt-3 flex items-center gap-3">
                  <img src={headshotUrl} alt="Headshot preview" className="w-16 h-16 rounded-full object-cover border-2 border-lp-accent/30" onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).alt = 'Failed to load'; }} />
                  <span className="text-xs text-lp-green font-medium">✓ Preview</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-lp-muted mb-1.5">🌐 Website</label>
                <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yoursite.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-lp-muted mb-1.5">✉️ Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-lp-muted mb-1.5">📱 Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 123-4567" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-lp-muted mb-1.5">💼 LinkedIn</label>
                <input type="url" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/you" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-lp-muted mb-1.5">𝕏 X / Twitter</label>
                <input type="url" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://x.com/you" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-lp-muted mb-1.5">📸 Instagram</label>
                <input type="url" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/you" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Resources */}
          <div className="bg-lp-surface rounded-2xl p-5 border border-lp-border space-y-4">
            <h2 className="text-sm font-bold text-lp-muted uppercase tracking-wider">🎁 Resources <span className="font-normal normal-case">(shared with audience)</span></h2>

            {resources.map((r, i) => (
              <div key={i} className="flex items-center gap-2 bg-lp-bg rounded-xl px-4 py-3 border border-lp-border">
                <span className="text-lg">🎁</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-lp-text truncate">{r.name}</p>
                  <p className="text-xs text-lp-muted truncate">{r.url}</p>
                </div>
                <button type="button" onClick={() => removeResource(i)} className="text-red-400/60 hover:text-red-400 text-sm">✕</button>
              </div>
            ))}

            {showResourceForm ? (
              <div className="space-y-2 bg-lp-bg/50 rounded-xl p-4 border border-dashed border-lp-accent/50">
                <input type="text" value={newResName} onChange={(e) => setNewResName(e.target.value)} placeholder="Resource name (e.g. Free PDF Guide, Slides)" maxLength={100} className={inputClass} />
                <input type="url" value={newResUrl} onChange={(e) => setNewResUrl(e.target.value)} placeholder="https://link-to-resource.com" className={inputClass} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addResource())} />
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowResourceForm(false); setNewResName(''); setNewResUrl(''); }} className="px-3 py-1.5 text-sm text-lp-muted hover:text-lp-text">Cancel</button>
                  <button type="button" onClick={addResource} disabled={!newResName.trim() || !newResUrl.trim()} className="px-4 py-1.5 bg-lp-accent rounded-lg text-sm font-semibold text-white disabled:opacity-40 hover:bg-lp-accent/80 transition-colors">
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowResourceForm(true)} className="w-full py-3 border-2 border-dashed border-lp-border rounded-xl text-sm font-semibold text-lp-muted hover:border-lp-accent hover:text-lp-accent transition-colors">
                + Add Resource
              </button>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={!title.trim() || !speakerName.trim() || creating}
            className="w-full py-3 bg-gradient-to-r from-lp-accent to-lp-pink rounded-xl text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(108,92,231,0.3)]"
          >
            {creating ? 'Creating...' : 'Create Session'}
          </button>
        </form>
      </main>
    </div>
  );
}
