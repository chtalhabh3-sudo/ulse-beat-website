import type { DownloadStatus, Song } from '../types';

export function isSafeUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/src/assets/')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!isSafeUrl(trimmed)) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = parsed.pathname.slice(1).split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const v = parsed.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = parsed.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return /^[a-zA-Z0-9_-]{11}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function getYouTubeEmbedUrl(url: string | undefined | null): string | null {
  const id = extractYouTubeId(url);
  if (!id) return null;
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

export function formatReleaseDate(dateStr: string): string {
  if (!dateStr) return 'Unscheduled';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getDownloadStatusLabel(status: DownloadStatus): string {
  switch (status) {
    case 'authorized':
      return 'Authorized Download';
    case 'watch_only':
      return 'Watch / Stream Only';
    case 'pending':
      return 'Authorization Pending';
    default:
      return 'Stream Only';
  }
}

export function buildSongCopyText(song: Song): string {
  const lines = [
    `Title: ${song.title}`,
    `Artist: ${song.artist}`,
    `Release Date: ${formatReleaseDate(song.releaseDate)}`,
    `Permission: ${getDownloadStatusLabel(song.downloadStatus)}`,
  ];

  if (song.youtubeTitle) {
    lines.push(`YouTube Video Title: ${song.youtubeTitle}`);
  }
  if (song.youtubeUrl) {
    lines.push(`YouTube URL: ${song.youtubeUrl}`);
  }
  if (song.description) {
    lines.push('', 'Song Description:', song.description);
  }
  if (song.youtubeDescription) {
    lines.push('', 'Full YouTube Video Description:', song.youtubeDescription);
  }
  lines.push('', 'Shared via PULSE BEAT (Artist credit preserved; copyrighted works remain property of their respective owners.)');
  return lines.join('\n');
}
