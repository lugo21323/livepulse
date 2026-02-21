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

export default function CreateSessionPage() {
  const [title, setTitle] = useState('');
  const [speakerName, setSpeakerName] = useState('');
  const [slideUrl, setSlideUrl] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || creating) return;
    setError('');
    setCreating(true);

    const sessionCode = generateSessionCode();

    const { error: dbError } = await supabase.from('sessions').insert({
      presenter_id: userId,
      title: title.trim(),
      speaker_name: speakerName.trim(),
      session_code: sessionCode,
      slide_url: slideUrl.trim() || null,
      is_active: false,
      contact_info: contactInfo.trim() || null,
      resource_url: resourceUrl.trim() || null,
    });

    if (dbError) {
      setError(dbError.message);
      setCreating(false);
      return;
    }

    router.push('/presenter');
  }

  return (
    <div className="min-h-screen bg-lp-bg">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-lp-border">
        <button
          onClick={() => router.push('/presenter')}
          className="text-lp-muted hover:text-lp-text transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-lg font-bold">Create Session</h1>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-lp-muted mb-1.5">Session Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Keynote: The Future of AI"
                required
                maxLength={100}
                className="w-full bg-lp-surface border border-lp-border rounded-xl px-4 py-3 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-lp-muted mb-1.5">Speaker Name</label>
              <input
                type="text"
                value={speakerName}
                onChange={(e) => setSpeakerName(e.target.value)}
                placeholder="e.g. Luke Puffingston"
                required
                maxLength={80}
                className="w-full bg-lp-surface border border-lp-border rounded-xl px-4 py-3 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-lp-muted mb-1.5">
              Slide Deck URL <span className="text-lp-muted font-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={slideUrl}
                onChange={(e) => { setSlideUrl(e.target.value); setShowPreview(false); }}
                placeholder="Paste Google Slides or OneDrive link"
                className="flex-1 bg-lp-surface border border-lp-border rounded-xl px-4 py-3 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
              />
              {canPreview && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-4 py-3 bg-lp-accent/10 text-lp-accent rounded-xl text-sm font-medium hover:bg-lp-accent/20 transition-colors shrink-0"
                >
                  {showPreview ? 'Hide Preview' : 'Preview'}
                </button>
              )}
            </div>
            {slideUrl && (
              <p className={`text-xs mt-1.5 ${slideProvider === 'unknown' ? 'text-red-400' : 'text-lp-green'}`}>
                {slideProvider === 'google' && '✓ Google Slides detected'}
                {slideProvider === 'onedrive' && '✓ OneDrive / PowerPoint detected'}
                {slideProvider === 'unknown' && '⚠ Unrecognized link — try a Google Slides or OneDrive share URL'}
              </p>
            )}
          </div>

          {/* Slide preview */}
          {showPreview && slideUrl && (
            <div className="rounded-xl overflow-hidden border border-lp-border" style={{ height: '340px' }}>
              <SlideEmbed url={slideUrl} className="w-full h-full" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-lp-muted mb-1.5">
                Contact Info <span className="text-lp-muted font-normal">(shown to audience)</span>
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g. luke@puffingston.com | @luke"
                maxLength={200}
                className="w-full bg-lp-surface border border-lp-border rounded-xl px-4 py-3 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-lp-muted mb-1.5">
                Free Resource URL <span className="text-lp-muted font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="e.g. https://yoursite.com/free-guide"
                maxLength={500}
                className="w-full bg-lp-surface border border-lp-border rounded-xl px-4 py-3 text-sm text-lp-text placeholder:text-lp-muted focus:outline-none focus:border-lp-accent transition-colors"
              />
            </div>
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
