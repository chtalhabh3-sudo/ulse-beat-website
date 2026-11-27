import { ArrowRight, Play, Download, Video, Disc3 } from 'lucide-react';
import type { NavSection, SiteSettings, SiteStats, Song } from '../types';
import { formatReleaseDate, getDownloadStatusLabel, extractYouTubeId } from '../utils/media';
import { MediaImage } from './MediaImage';

interface HomeViewProps {
  settings: SiteSettings;
  stats: SiteStats;
  songs: Song[];
  onNavigate: (section: NavSection) => void;
  onSelectSong: (song: Song) => void;
}

export function HomeView({
  settings,
  stats,
  songs,
  onNavigate,
  onSelectSong,
}: HomeViewProps) {
  const latestSongs = songs.slice(0, 6);
  const videoSongs = songs.filter((s) => Boolean(s.youtubeUrl || s.videoUrl)).slice(0, 3);

  return (
    <div className="space-y-12 pb-16">
      {/* Widescreen Hero Banner featuring uploaded Channel Banner & Personal Picture */}
      <section className="relative rounded-2xl overflow-hidden border border-zinc-800/80 bg-[#0B0B0F]">
        <div className="relative h-72 sm:h-88 lg:h-[420px] w-full">
          <MediaImage
            src={settings.bannerUrl}
            alt={`${settings.channelName} Channel Banner`}
            className="w-full h-full object-cover"
            fallbackLabel={settings.channelName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070709] via-[#070709]/65 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070709]/95 via-[#070709]/60 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6 max-w-4xl">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-red-600/80 shadow-xl shrink-0 bg-zinc-900">
                <MediaImage
                  src={settings.avatarUrl}
                  alt={settings.creatorName}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-3 min-w-0">
                <p className="text-xs font-medium tracking-wider uppercase text-red-400">
                  {settings.creatorName}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white text-balance">
                  {settings.channelName}
                </h1>
                <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
                  {settings.tagline}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('songs')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Explore All Songs</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('downloads')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-4 h-4 text-red-400" />
                    <span>Authorized Downloads</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Metrics Strip Below Hero Split */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/80 border-t border-zinc-800/80 bg-[#0D0D12]">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Published Catalog</p>
              <p className="text-2xl font-display font-bold text-white tabular-nums mt-0.5">
                {stats.publishedSongs}
              </p>
            </div>
            <Disc3 className="w-5 h-5 text-red-500" />
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Music Videos</p>
              <p className="text-2xl font-display font-bold text-white tabular-nums mt-0.5">
                {stats.musicVideos}
              </p>
            </div>
            <Video className="w-5 h-5 text-red-500" />
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Authorized MP3s</p>
              <p className="text-2xl font-display font-bold text-white tabular-nums mt-0.5">
                {stats.authorizedDownloads}
              </p>
            </div>
            <Download className="w-5 h-5 text-red-500" />
          </div>
        </div>
      </section>

      {/* Latest Releases Section */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4 border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Latest Releases
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Recently published tracks, studio sessions, and full song notes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('latest')}
            className="text-sm font-medium text-red-400 hover:text-red-300 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>View all</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {latestSongs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0D0D12] p-10 text-center space-y-3">
            <p className="text-zinc-300 font-medium">No published songs yet.</p>
            <p className="text-sm text-zinc-500">
              Open Admin Studio in the sidebar to upload your first track, thumbnail, or YouTube video.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {latestSongs.map((song) => {
              const hasVideo = Boolean(extractYouTubeId(song.youtubeUrl) || song.videoUrl);
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
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950">
                    <MediaImage
                      src={song.thumbnailUrl}
                      alt={`${song.title} artwork`}
                      fallbackLabel={song.title}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <div className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-lg">
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
                          <span className="text-red-400">Video</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                      {song.title}
                    </h3>

                    <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed flex-1">
                      {song.description || song.youtubeDescription || 'Open song page to view full release metadata and media.'}
                    </p>

                    <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between text-xs">
                      <span className={song.downloadStatus === 'authorized' ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                        {getDownloadStatusLabel(song.downloadStatus)}
                      </span>
                      <span className="text-zinc-300 group-hover:text-white inline-flex items-center gap-1">
                        Open Page <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Music Videos Spotlight */}
      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4 border-b border-zinc-800/80 pb-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-white tracking-tight">
              Music Videos
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Official YouTube embeds and uploaded visual performances.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('videos')}
            className="text-sm font-medium text-red-400 hover:text-red-300 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <span>All videos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {videoSongs.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-[#0D0D12] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-200">
                Ready for your YouTube & studio music videos
              </p>
              <p className="text-sm text-zinc-400">
                Add a YouTube link or upload a video file to any song in the Admin Studio to feature it here automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white whitespace-nowrap shrink-0"
            >
              Manage Videos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {videoSongs.map((song) => (
              <article
                key={song.id}
                onClick={() => onSelectSong(song)}
                className="group cursor-pointer rounded-xl border border-zinc-800/90 bg-[#0E0E13] hover:border-red-600/60 transition-colors overflow-hidden"
              >
                <div className="relative aspect-video bg-black overflow-hidden">
                  <MediaImage
                    src={song.thumbnailUrl}
                    alt={song.youtubeTitle || song.title}
                    fallbackLabel={song.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-red-600/95 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-1">
                  <p className="text-xs text-zinc-400">
                    {song.artist} · {formatReleaseDate(song.releaseDate)}
                  </p>
                  <h3 className="font-display font-semibold text-white group-hover:text-red-400 transition-colors line-clamp-1">
                    {song.youtubeTitle || song.title}
                  </h3>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
