export type DownloadStatus = 'authorized' | 'watch_only' | 'pending';

export interface Song {
  id: string;
  title: string;
  artist: string;
  youtubeTitle: string;
  youtubeDescription: string;
  description: string;
  thumbnailUrl: string;
  youtubeUrl: string;
  videoUrl: string;
  audioUrl: string;
  releaseDate: string;
  downloadStatus: DownloadStatus;
  isPublished: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteSettings {
  channelName: string;
  creatorName: string;
  tagline: string;
  youtubeChannelUrl: string;
  aboutText: string;
  contactEmail: string;
  bannerUrl: string;
  avatarUrl: string;
}

export interface SiteStats {
  publishedSongs: number;
  musicVideos: number;
  authorizedDownloads: number;
}

export interface AdminStatus {
  configured: boolean;
  envPasscodeActive: boolean;
  authenticated: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export type NavSection =
  | 'home'
  | 'songs'
  | 'videos'
  | 'latest'
  | 'downloads'
  | 'about'
  | 'contact'
  | 'admin'
  | 'song-detail';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  songs?: Song[];
  error?: boolean;
}
