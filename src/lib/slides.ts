export type SlideProvider = 'google' | 'onedrive' | 'unknown';

export function detectProvider(url: string): SlideProvider {
  if (/docs\.google\.com\/presentation/i.test(url)) return 'google';
  if (/onedrive\.live\.com|1drv\.ms|sharepoint\.com|office\.com/i.test(url)) return 'onedrive';
  return 'unknown';
}

export function toEmbedUrl(url: string): string | null {
  const provider = detectProvider(url);

  if (provider === 'google') {
    // Extract presentation ID from any Google Slides URL variant
    const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const id = match[1];
    return `https://docs.google.com/presentation/d/${id}/embed?start=false&loop=false&delayms=60000`;
  }

  if (provider === 'onedrive') {
    // If it's already an embed link, use as-is
    if (url.includes('action=embedview')) return url;

    // SharePoint / OneDrive for Business links (e.g. tenant-my.sharepoint.com)
    if (/sharepoint\.com/i.test(url)) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}action=embedview`;
    }

    // Personal OneDrive links (onedrive.live.com, 1drv.ms)
    if (url.includes('/embed')) return url;
    const encoded = encodeURIComponent(url);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encoded}`;
  }

  return null;
}
