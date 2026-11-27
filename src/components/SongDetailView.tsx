import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Music2,
} from 'lucide-react';
import type { Song } from '../types';
import {
  buildSongCopyText,
  formatReleaseDate,
  getDownloadStatusLabel,
  getYouTubeEmbedUrl,
  isSafeUrl,
} from '../utils/media';
import { MediaImage } from './MediaImage';

interface SongDetailViewProps {
  song: Song;
  onBack: () => void;
}

export function SongDetailView({ song, onBack }: SongDetailViewProps) {
  const [copiedKey, setCopiedKey] = useState<'all' | 'yt' | null>(null);

  const youtubeEmbed = getYouTubeEmbedUrl(song.youtubeUrl);
  const hasUploadedVideo = isSafeUrl(song.videoUrl) && Boolean(song.videoUrl);
  const hasAudio = isSafeUrl(song.audioUrl) && Boolean(song.audioUrl);
  const canDownload = song.downloadStatus === 'authorized' && hasAudio;

  const handleCopy = async (kind: 'all' | 'yt') => {
    const content =
      kind === 'yt'
        ? [song.youtubeTitle, '', song.youtubeDescription].filter(Boolean).join('\n')
        : buildSongCopyText(song);
    if (!content.trim()) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(kind);
      setTimeout(() => setCopiedKey(null), 2200);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-md px-1 py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Catalog</span>
      </button>

      {/* Primary Widescreen Media + Metadata Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Media Viewport (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800 bg-black">
            {youtubeEmbed ? (
              <iframe
                src={youtubeEmbed}
                title={song.youtubeTitle || song.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : hasUploadedVideo ? (
              <video
                src={song.videoUrl}
                controls
                poster={isSafeUrl(song.thumbnailUrl) ? song.thumbnailUrl : undefined}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <MediaImage
                src={song.thumbnailUrl}
                alt={`${song.title} cover artwork`}
                fallbackLabel={song.title}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Built-in Audio Player when audio file exists */}
          {hasAudio && (
            <div className="rounded-xl border border-zinc-800 bg-[#0E0E13] p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-red-600/15 border border-red-600/30 flex items-center justify-center shrink-0">
                  <Music2 className="w-5 h-5 text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">Audio Stream Preview</p>
                  <p className="text-sm font-medium text-white truncate">{song.title}</p>
                </div>
              </div>
              <audio controls src={song.audioUrl} className="w-full sm:flex-1 h-10" preload="metadata" />
            </div>
          )}
        </div>

        {/* Metadata & Actions Column (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-[#0D0D12] p-6 sm:p-7 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="text-red-400 font-semibold">{song.artist}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">Released {formatReleaseDate(song.releaseDate)}</span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              {song.title}
            </h1>

            {song.youtubeTitle && (
              <div className="pt-2 border-t border-zinc-800/70">
                <p className="text-xs text-zinc-400 mb-1">YouTube Video Title</p>
                <p className="text-sm font-medium text-zinc-200 leading-snug">
                  {song.youtubeTitle}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800/70 flex items-start gap-2.5">
              {canDownload ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs text-zinc-400">Download Permission Status</p>
                <p className={`text-sm font-medium ${canDownload ? 'text-emerald-400' : 'text-zinc-200'}`}>
                  {getDownloadStatusLabel(song.downloadStatus)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800/80">
            {canDownload ? (
              <a
                href={`/api/songs/${encodeURIComponent(song.id)}/download`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Authorized Audio</span>
              </a>
            ) : (
              <div className="w-full px-4 py-3 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-400 text-center">
                {song.downloadStatus === 'authorized'
                  ? 'Authorized for download — MP3 file will be available once uploaded in Admin Studio.'
                  : 'Direct file download is disabled for this track to respect artist copyright.'}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleCopy('all')}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {copiedKey === 'all' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied Info</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-red-400" />
                    <span>Copy Description</span>
                  </>
                )}
              </button>

              {isSafeUrl(song.youtubeUrl) && song.youtubeUrl ? (
                <a
                  href={song.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <div className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-zinc-500 text-xs whitespace-nowrap">
                  No External Video Link
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Song Description & Full YouTube Video Description */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-[#0D0D12] p-6 space-y-3">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 pb-3">
            <h2 className="font-display text-lg font-bold text-white">Song Description</h2>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
            {song.description || 'No song description has been added yet.'}
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#0D0D12] p-6 space-y-3">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800/70 pb-3">
            <h2 className="font-display text-lg font-bold text-white">Full YouTube Video Description</h2>
            {song.youtubeDescription && (
              <button
                type="button"
                onClick={() => handleCopy('yt')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 whitespace-nowrap"
              >
                {copiedKey === 'yt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'yt' ? 'Copied' : 'Copy YouTube Notes'}</span>
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
            {song.youtubeDescription || 'No YouTube video description has been added yet.'}
          </p>
        </section>
      </div>

      {/* Attribution Notice */}
      <div className="rounded-xl border border-zinc-800/80 bg-[#0A0A0D] px-5 py-4 text-xs text-zinc-400 leading-relaxed">
        Artist attribution: <span className="text-zinc-200 font-medium">{song.artist}</span>. PULSE BEAT presents curated audio and visual information without claiming ownership of third-party copyrighted compositions or recordings.
      </div>
    </div>
  );
}
