import { useCallback, useEffect, useState } from 'react';
import type { NavSection, SiteSettings, SiteStats, Song } from './types';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { HomeView } from './components/HomeView';
import { SongGalleryView } from './components/SongGalleryView';
import { SongDetailView } from './components/SongDetailView';
import { AboutView, ContactView } from './components/AboutContactViews';
import { AdminDashboard } from './components/AdminDashboard';
import { PulseAIChat } from './components/PulseAIChat';

const DEFAULT_SETTINGS: SiteSettings = {
  channelName: 'PULSE BEAT',
  creatorName: 'PULSE BEAT Studio',
  tagline: 'Official Music Showcase, Visual Releases & Authorized Audio',
  youtubeChannelUrl: 'https://www.youtube.com',
  aboutText:
    'PULSE BEAT is a dedicated music showcase and video channel curating dark electronic beats, studio sessions, and visual performances.',
  contactEmail: 'contact@pulsebeat.studio',
  bannerUrl: '/src/assets/images/pulse_hero_banner_1795760267847.jpg',
  avatarUrl: '/src/assets/images/pulse_creator_avatar_1795760268621.jpg',
};

const DEFAULT_STATS: SiteStats = {
  publishedSongs: 0,
  musicVideos: 0,
  authorizedDownloads: 0,
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<SiteStats>(DEFAULT_STATS);
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Admin token stored strictly in React memory (never localStorage/sessionStorage)
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const loadPublicData = useCallback(async () => {
    try {
      const [siteRes, songsRes] = await Promise.all([
        fetch('/api/site', { headers: { Accept: 'application/json' } }),
        fetch('/api/songs', { headers: { Accept: 'application/json' } }),
      ]);

      const siteIsJson =
        siteRes.ok && siteRes.headers.get('content-type')?.includes('application/json');
      const songsIsJson =
        songsRes.ok && songsRes.headers.get('content-type')?.includes('application/json');

      if (siteIsJson && songsIsJson) {
        const siteData = await siteRes.json();
        const songsData = await songsRes.json();
        if (siteData.settings) setSettings(siteData.settings);
        if (siteData.stats) setStats(siteData.stats);
        setSongs(songsData.songs || []);
        return;
      }

      // Static hosting fallback (e.g. Cloudflare Pages without a Node backend attached)
      const snapRes = await fetch('/catalog-snapshot.json', {
        headers: { Accept: 'application/json' },
      });
      if (snapRes.ok && snapRes.headers.get('content-type')?.includes('application/json')) {
        const snap = await snapRes.json();
        if (snap.settings) setSettings(snap.settings);
        if (snap.stats) setStats(snap.stats);
        if (Array.isArray(snap.songs)) setSongs(snap.songs);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPublicData();
  }, [loadPublicData]);

  // Sync deep-linked /songs/:id URL on initial load or popstate
  useEffect(() => {
    const syncFromPath = async () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/songs/')) {
        const songId = decodeURIComponent(pathname.slice('/songs/'.length));
        if (!songId) return;
        const found = songs.find((s) => s.id === songId);
        if (found) {
          setSelectedSong(found);
          setActiveSection('song-detail');
          return;
        }
        const res = await fetch(`/api/songs/${encodeURIComponent(songId)}`, {
          headers: {
            Accept: 'application/json',
            ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
          },
        });
        if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
          const data = await res.json();
          if (data.song) {
            setSelectedSong(data.song);
            setActiveSection('song-detail');
          }
        }
      }
    };

    syncFromPath();
    const onPopState = () => {
      if (!window.location.pathname.startsWith('/songs/')) {
        setSelectedSong(null);
        setActiveSection('home');
      } else {
        syncFromPath();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [songs, adminToken]);

  const handleNavigate = (section: NavSection) => {
    setActiveSection(section);
    if (section !== 'song-detail') {
      setSelectedSong(null);
      if (window.location.pathname !== '/') {
        window.history.pushState({}, '', '/');
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setActiveSection('song-detail');
    window.history.pushState({}, '', `/songs/${encodeURIComponent(song.id)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim() && activeSection === 'home') {
      setActiveSection('songs');
    }
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setActiveSection('songs');
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-zinc-100 flex">
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        settings={settings}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onSearchSubmit={handleSearchSubmit}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          settings={settings}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-10 pt-8 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-72 rounded-2xl bg-zinc-900/70 border border-zinc-800" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="h-64 rounded-xl bg-zinc-900/70 border border-zinc-800" />
                <div className="h-64 rounded-xl bg-zinc-900/70 border border-zinc-800" />
                <div className="h-64 rounded-xl bg-zinc-900/70 border border-zinc-800" />
              </div>
            </div>
          ) : activeSection === 'song-detail' && selectedSong ? (
            <SongDetailView
              song={selectedSong}
              onBack={() => handleNavigate('songs')}
            />
          ) : activeSection === 'about' ? (
            <AboutView settings={settings} stats={stats} />
          ) : activeSection === 'contact' ? (
            <ContactView settings={settings} />
          ) : activeSection === 'admin' ? (
            <AdminDashboard
              adminToken={adminToken}
              onSetAdminToken={setAdminToken}
              settings={settings}
              onDataChanged={loadPublicData}
              onSelectSong={handleSelectSong}
            />
          ) : searchQuery.trim() ||
            activeSection === 'songs' ||
            activeSection === 'videos' ||
            activeSection === 'latest' ||
            activeSection === 'downloads' ? (
            <SongGalleryView
              section={
                activeSection === 'videos' ||
                activeSection === 'latest' ||
                activeSection === 'downloads'
                  ? activeSection
                  : 'songs'
              }
              songs={songs}
              searchQuery={searchQuery}
              onSelectSong={handleSelectSong}
              onClearSearch={() => setSearchQuery('')}
            />
          ) : (
            <HomeView
              settings={settings}
              stats={stats}
              songs={songs}
              onNavigate={handleNavigate}
              onSelectSong={handleSelectSong}
            />
          )}
        </main>

        <footer className="border-t border-zinc-800/80 px-4 sm:px-6 lg:px-10 py-6 text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-[1440px] w-full mx-auto">
          <p>
            © {new Date().getFullYear()} {settings.channelName}. Artist copyrights remain with their respective owners.
          </p>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => handleNavigate('about')} className="hover:text-zinc-300">
              About
            </button>
            <button type="button" onClick={() => handleNavigate('downloads')} className="hover:text-zinc-300">
              Download Policy
            </button>
            <button type="button" onClick={() => handleNavigate('contact')} className="hover:text-zinc-300">
              Contact
            </button>
          </div>
        </footer>
      </div>

      <PulseAIChat onSelectSong={handleSelectSong} />
    </div>
  );
}
