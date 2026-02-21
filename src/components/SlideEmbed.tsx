'use client';

import { useMemo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { toEmbedUrl, detectProvider } from '@/lib/slides';

export interface SlideEmbedHandle {
  refocus: () => void;
}

interface SlideEmbedProps {
  url: string;
  className?: string;
}

const SlideEmbed = forwardRef<SlideEmbedHandle, SlideEmbedProps>(({ url, className = '' }, ref) => {
  const embedUrl = useMemo(() => toEmbedUrl(url), [url]);
  const provider = useMemo(() => detectProvider(url), [url]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Expose refocus method to parent
  useImperativeHandle(ref, () => ({
    refocus: () => {
      iframeRef.current?.focus();
    },
  }));

  // Auto-focus the iframe when loaded so arrow keys work immediately
  const handleLoad = useCallback(() => {
    iframeRef.current?.focus();
  }, []);

  // Re-focus iframe when user clicks anywhere on the slide area
  const handleContainerClick = useCallback(() => {
    iframeRef.current?.focus();
  }, []);

  // Also focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      iframeRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, [embedUrl]);

  if (!embedUrl) {
    return (
      <div className={`flex items-center justify-center bg-lp-surface rounded-xl ${className}`}>
        <div className="text-center p-8">
          <p className="text-lp-muted text-lg">Could not embed this slide URL</p>
          <p className="text-lp-muted text-sm mt-2">Supported: Google Slides, OneDrive/SharePoint links</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative bg-black overflow-hidden ${className}`}
      onClick={handleContainerClick}
    >
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full border-0"
        allowFullScreen
        tabIndex={0}
        sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms allow-top-navigation"
        title={`${provider === 'google' ? 'Google Slides' : 'PowerPoint'} Presentation`}
        onLoad={handleLoad}
      />
    </div>
  );
});

SlideEmbed.displayName = 'SlideEmbed';
export default SlideEmbed;
