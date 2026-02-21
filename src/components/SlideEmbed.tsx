'use client';

import { useMemo, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
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
  const [focused, setFocused] = useState(false);

  // Expose refocus method to parent
  useImperativeHandle(ref, () => ({
    refocus: () => {
      focusIframe();
    },
  }));

  const focusIframe = useCallback(() => {
    if (iframeRef.current) {
      // First click on iframe to ensure it gets focus
      iframeRef.current.focus();
      setFocused(true);
      // Clear the focused indicator after a few seconds
      setTimeout(() => setFocused(false), 2000);
    }
  }, []);

  // Auto-focus the iframe when loaded
  const handleLoad = useCallback(() => {
    // Small delay to let iframe content initialize
    setTimeout(() => focusIframe(), 300);
  }, [focusIframe]);

  // Re-focus iframe when user clicks anywhere on the slide area
  const handleContainerClick = useCallback(() => {
    focusIframe();
  }, [focusIframe]);

  // Also focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      focusIframe();
    }, 800);
    return () => clearTimeout(timer);
  }, [embedUrl, focusIframe]);

  if (!embedUrl) {
    return (
      <div className={`flex items-center justify-center bg-lp-surface ${className}`}>
        <div className="text-center p-8">
          <p className="text-lp-muted text-lg font-semibold">Could not embed this slide URL</p>
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

      {/* Focus indicator flash */}
      {focused && (
        <div className="absolute inset-0 pointer-events-none border-2 border-lp-accent/60 rounded-sm z-10 animate-focus-flash" />
      )}
    </div>
  );
});

SlideEmbed.displayName = 'SlideEmbed';
export default SlideEmbed;
