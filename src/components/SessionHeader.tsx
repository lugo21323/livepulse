'use client';

interface SessionHeaderProps {
  title: string;
  speakerName: string;
  sessionCode: string;
  onlineCount: number;
  isPresenter?: boolean;
  onEndSession?: () => void;
  onShowQR?: () => void;
}

export default function SessionHeader({
  title,
  speakerName,
  sessionCode,
  onlineCount,
  isPresenter = false,
  onEndSession,
  onShowQR,
}: SessionHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-lp-surface border-b border-lp-border">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center text-lg shrink-0">
          ⚡
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-semibold truncate">{title}</h1>
          <p className="text-xs text-lp-muted truncate">{speakerName}</p>
        </div>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-lp-green animate-pulse-dot" />
          <span className="text-xs text-lp-muted">{onlineCount} online</span>
        </div>

        <div className="px-3 py-1.5 bg-lp-surface-light rounded-lg border border-lp-border">
          <span className="text-xs text-lp-muted">Code: </span>
          <span className="text-sm font-bold tracking-wider text-lp-accent">{sessionCode}</span>
        </div>

        {isPresenter && onShowQR && (
          <button
            onClick={onShowQR}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-lp-accent/10 text-lp-accent hover:bg-lp-accent/20 transition-colors"
          >
            Show QR
          </button>
        )}

        {isPresenter && onEndSession && (
          <button
            onClick={onEndSession}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            End Session
          </button>
        )}
      </div>
    </header>
  );
}
