import { useMemo, useState } from 'react';
import { ArrowRight, Download, Play, ShieldCheck, Video } from 'lucide-react';
import type { NavSection, Song } from '../types';
import { extractYouTubeId, formatReleaseDate, getDownloadStatusLabel } from '../utils/media';
import { MediaImage } from './MediaImage';

interface SongGalleryViewProps {
  section: Extract<NavSection, 'songs' | 'videos' | 'latest' | 'downloads'>;
  songs: Song[];
  searchQuery: string;
  onSelectSong: (song: Song) => void;
  onClearSearch: () => void;
}

export function SongGalleryView({
  section,
  songs,
  searchQuery,
  onSelectSong,
  onClearSearch,
}: SongGalleryViewProps) {
  const [sortOrder, setSortOrder] = useState<'newest' | 'title'>('newest');

  const sectionHeader = useMemo(() => {
    if (searchQuery.trim()) {
      return {
        title: `Search Results for "${searchQuery.trim()}"`,
        subtitle: 'Matching published tracks across song titles, artists, and YouTube descriptions.',
      };
    }
    switch (section) {
      case 'videos':
        return {
          title: 'Music Videos',
          subtitle: 'Watch official YouTube video releases and uploaded visual performances.',
        };
      case 'latest':
        return {
          title: 'Latest Releases',
          subtitle: 'Chronological stream of the newest tracks published on PULSE BEAT.',
        };
      case 'downloads':
        return {
          title: 'Authorized Downloads',
          subtitle:
            'Direct audio downloads are available strictly for tracks cleared and authorized for redistribution.',
        };
      default:
        return {
          title: 'All Songs',
          subtitle: 'Complete public catalog with song notes, artist credits, video embeds, and audio permissions.',
        };
    }
  }, [section, searchQuery]);

  const filteredSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = songs.filter((song) => {
      if (section === 'videos' && !song.youtubeUrl && !song.videoUrl) {
        return false;
      }
      if (section === 'downloads' && (song.downloadStatus !== 'authorized' || !song.audioUrl)) {
        return false;
      }
      if (!q) return true;
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.youtubeTitle.toLowerCase().includes(q) ||
        song.description.toLowerCase().includes(q)
      );
    });

    if (sortOrder === 'title') {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return [...list].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  }, [songs, section, searchQuery, sortOrder]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">
            {sectionHeader.title}
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">{sectionHeader.subtitle}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {searchQuery.trim() && (
            <button
              type="button"
              onClick={onClearSearch}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 hover:text-white whitespace-nowrap"
            >
              Clear Search
            </button>
          )}
          <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              type="button"
              onClick={() => setSortOrder('newest')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                sortOrder === 'newest' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Newest First
            </button>
            <button
              type="button"
              onClick={() => setSortOrder('title')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                sortOrder === 'title' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              A–Z Title
            </button>
          </div>
        </div>
      </div>

      {section === 'downloads' && (
        <div className="rounded-xl border border-zinc-800 bg-[#0D0D12] p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-sm text-zinc-300 leading-relaxed">
            Copyright Respect Policy: PULSE BEAT only enables direct MP3/audio downloads for releases explicitly marked as Authorized for Redistribution. All other tracks remain watch-or-stream only via their official video links.
          </p>
        </div>
      )}

      {filteredSongs.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-[#0D0D12] p-12 text-center space-y-2">
          <p className="text-base font-medium text-zinc-200">
            No matching releases found
          </p>
          <p className="text-sm text-zinc-400">
            {searchQuery.trim()
              ? 'Try another title or artist keyword, or clear the search filter.'
              : 'New uploads published in the Admin Studio will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSongs.map((song) => {
            const hasVideo = Boolean(extractYouTubeId(song.youtubeUrl) || song.videoUrl);
            const hasAuthorizedDownload = song.downloadStatus === 'authorized' && Boolean(song.audioUrl);

            return (
              <article
                key={song.id}
                onClick={() => onSelectSong(song)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSong(song);
                  }
                }}
                className="group cursor-pointer rounded-xl border border-zinc-800/90 bg-[#0E0E13] hover:border-red-600/60 transition-colors overflow-hidden flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
                  <MediaImage
                    src={song.thumbnailUrl}
                    alt={`${song.title} thumbnail`}
                    fallbackLabel={song.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-4 h-4 ml-0.5 fill-current" />
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                    <span className="text-zinc-200 font-medium">{song.artist}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatReleaseDate(song.releaseDate)}</span>
                    {hasVideo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <Video className="w-3 h-3" /> Video
                        </span>
                      </>
                    )}
                  </div>

                  <h2 className="font-display text-lg font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                    {song.title}
                  </h2>

                  <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed flex-1">
                    {song.description || song.youtubeDescription || 'Click to open full song information, video player, and description.'}
                  </p>

                  <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between gap-3 text-xs">
                    <span className={hasAuthorizedDownload ? 'text-emerald-400 font-medium inline-flex items-center gap-1' : 'text-zinc-400'}>
                      {hasAuthorizedDownload && <Download className="w-3.5 h-3.5" />}
                      {getDownloadStatusLabel(song.downloadStatus)}
                    </span>
                    <span className="text-zinc-200 group-hover:text-white inline-flex items-center gap-1 whitespace-nowrap">
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
