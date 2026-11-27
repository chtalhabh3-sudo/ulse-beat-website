import { Menu, Search, X, ExternalLink } from 'lucide-react';
import type { SiteSettings } from '../types';
import { isSafeUrl } from '../utils/media';

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onOpenMobileMenu: () => void;
  settings: SiteSettings;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onOpenMobileMenu,
  settings,
}: TopBarProps) {
  const youtubeHref = isSafeUrl(settings.youtubeChannelUrl)
    ? settings.youtubeChannelUrl
    : 'https://www.youtube.com';

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#070709]/92 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sm:gap-8">
      <div className="flex items-center gap-3 shrink-0 lg:hidden">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="p-2 -ml-1 rounded-lg text-zinc-200 hover:text-white hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-display font-bold text-base text-white whitespace-nowrap">
          {settings.channelName}
        </span>
      </div>

      {/* Live Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit();
        }}
        className="flex-1 max-w-xl relative"
      >
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search songs, artists, or video titles..."
          aria-label="Search songs by title or artist"
          className="w-full h-10 pl-10 pr-9 rounded-lg bg-zinc-900/90 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Single Primary Action */}
      <div className="shrink-0 hidden sm:flex items-center">
        <a
          href={youtubeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <span>YouTube Channel</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </header>
  );
}
