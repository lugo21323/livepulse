'use client';

interface ContactCardProps {
  speakerName: string;
  headshotUrl?: string;
  website?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  contactInfo?: string; // legacy fallback
}

const SOCIAL_LINKS = [
  { key: 'website', icon: '🌐', label: 'Website', prefix: '' },
  { key: 'email', icon: '✉️', label: 'Email', prefix: 'mailto:' },
  { key: 'phone', icon: '📱', label: 'Phone', prefix: 'tel:' },
  { key: 'linkedin', icon: '💼', label: 'LinkedIn', prefix: '' },
  { key: 'twitter', icon: '𝕏', label: 'X / Twitter', prefix: '' },
  { key: 'instagram', icon: '📸', label: 'Instagram', prefix: '' },
] as const;

function ensureUrl(value: string, prefix: string): string {
  if (prefix) return `${prefix}${value}`;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
}

export default function ContactCard({
  speakerName,
  headshotUrl,
  website,
  email,
  phone,
  linkedin,
  twitter,
  instagram,
  contactInfo,
}: ContactCardProps) {
  const fields: Record<string, string | undefined> = { website, email, phone, linkedin, twitter, instagram };
  const hasAnyField = Object.values(fields).some(Boolean);

  if (!hasAnyField && !contactInfo) return null;

  return (
    <div className="bg-lp-surface rounded-xl p-5 border border-lp-border">
      {/* Header with optional headshot */}
      <div className="flex items-center gap-4 mb-4">
        {headshotUrl ? (
          <img
            src={headshotUrl}
            alt={speakerName}
            className="w-16 h-16 rounded-full object-cover border-2 border-lp-accent/30"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-2xl font-bold text-white shrink-0">
            {speakerName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-lp-text">{speakerName}</h3>
          <p className="text-xs text-lp-muted">Connect with me</p>
        </div>
      </div>

      {/* Social links */}
      {hasAnyField && (
        <div className="space-y-2">
          {SOCIAL_LINKS.map(({ key, icon, label, prefix }) => {
            const value = fields[key];
            if (!value) return null;
            const href = ensureUrl(value, prefix);
            const displayValue = value.replace(/^https?:\/\/(www\.)?/, '');

            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 bg-lp-bg rounded-lg border border-lp-border hover:border-lp-accent/50 hover:bg-lp-bg/80 transition-all group"
              >
                <span className="text-lg w-6 text-center">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-lp-muted">{label}</p>
                  <p className="text-sm font-medium text-lp-text truncate group-hover:text-lp-accent transition-colors">
                    {displayValue}
                  </p>
                </div>
                <span className="text-lp-muted text-xs group-hover:text-lp-accent">→</span>
              </a>
            );
          })}
        </div>
      )}

      {/* Legacy contact info fallback */}
      {!hasAnyField && contactInfo && (
        <p className="text-sm text-lp-text">{contactInfo}</p>
      )}
    </div>
  );
}
