import {
  Home,
  Disc3,
  Video,
  Sparkles,
  Download,
  Info,
  Mail,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import type { NavSection, SiteSettings } from '../types';
import { MediaImage } from './MediaImage';

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  settings: SiteSettings;
}

const NAV_ITEMS: Array<{ id: NavSection; label: string; icon: typeof Home }> = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'songs', label: 'All Songs', icon: Disc3 },
  { id: 'videos', label: 'Music Videos', icon: Video },
  { id: 'latest', label: 'Latest Releases', icon: Sparkles },
  { id: 'downloads', label: 'Downloads', icon: Download },
  { id: 'about', label: 'About PULSE BEAT', icon: Info },
  { id: 'contact', label: 'Contact', icon: Mail },
];

export function Sidebar({
  activeSection,
  onNavigate,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  settings,
}: SidebarProps) {
  const handleSelect = (section: NavSection) => {
    onNavigate(section);
    onCloseMobile();
  };

  const renderNavList = (isCollapsed: boolean) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          activeSection === item.id ||
          (activeSection === 'song-detail' && item.id === 'songs');

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            title={isCollapsed ? item.label : undefined}
            className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
              isActive
                ? 'bg-red-600/15 text-white border border-red-600/35'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/90 border border-transparent'
            } ${isCollapsed ? 'justify-center px-2' : ''}`}
          >
            <Icon
              className={`w-5 h-5 shrink-0 transition-colors duration-150 ${
                isActive ? 'text-white' : 'text-white/85 group-hover:text-white'
              }`}
            />
            {!isCollapsed && (
              <span className="truncate whitespace-nowrap">
                {item.label}
              </span>
            )}
            {!isCollapsed && isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[#0A0A0D] border-r border-zinc-800/80 transition-[width] duration-200 ease-out sticky top-0 h-screen ${
          collapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className={`flex items-center border-b border-zinc-800/80 h-16 px-4 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <button
              type="button"
              onClick={() => handleSelect('home')}
              className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-md"
            >
              <MediaImage
                src={settings.avatarUrl}
                alt={settings.channelName}
                className="w-8 h-8 rounded-full object-cover border border-red-600/50 shrink-0"
              />
              <span className="font-display font-bold tracking-tight text-lg text-white whitespace-nowrap">
                {settings.channelName}
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {renderNavList(collapsed)}

        {/* Admin Studio Footer Action */}
        <div className="p-3 border-t border-zinc-800/80">
          <button
            type="button"
            onClick={() => handleSelect('admin')}
            title={collapsed ? 'Admin Dashboard' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
              activeSection === 'admin'
                ? 'bg-red-600 text-white'
                : 'bg-zinc-900/90 text-zinc-200 hover:bg-red-600/20 hover:text-white border border-zinc-800'
            } ${collapsed ? 'justify-center px-2' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0 text-white" />
            {!collapsed && <span className="whitespace-nowrap">Admin Studio</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Slide-Out Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#0A0A0D] border-r border-zinc-800 flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-zinc-800">
              <button
                type="button"
                onClick={() => handleSelect('home')}
                className="flex items-center gap-3"
              >
                <MediaImage
                  src={settings.avatarUrl}
                  alt={settings.channelName}
                  className="w-8 h-8 rounded-full object-cover border border-red-600/50"
                />
                <span className="font-display font-bold text-lg text-white whitespace-nowrap">
                  {settings.channelName}
                </span>
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Close menu"
                className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavList(false)}

            <div className="p-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => handleSelect('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === 'admin'
                    ? 'bg-red-600 text-white'
                    : 'bg-zinc-900 text-zinc-200 hover:bg-red-600/20 border border-zinc-800'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0 text-white" />
                <span>Admin Studio</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
