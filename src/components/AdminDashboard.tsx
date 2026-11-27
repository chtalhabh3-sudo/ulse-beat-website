import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Edit3,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Mail,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { AdminStatus, ContactMessage, DownloadStatus, SiteSettings, Song } from '../types';
import { formatReleaseDate, getDownloadStatusLabel } from '../utils/media';
import { MediaImage } from './MediaImage';

interface AdminDashboardProps {
  adminToken: string | null;
  onSetAdminToken: (token: string | null) => void;
  settings: SiteSettings;
  onDataChanged: () => Promise<void>;
  onSelectSong: (song: Song) => void;
}

interface SongFormState {
  id?: string;
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
}

const emptySongForm = (): SongFormState => ({
  title: '',
  artist: '',
  youtubeTitle: '',
  youtubeDescription: '',
  description: '',
  thumbnailUrl: '',
  youtubeUrl: '',
  videoUrl: '',
  audioUrl: '',
  releaseDate: new Date().toISOString().slice(0, 10),
  downloadStatus: 'watch_only',
  isPublished: true,
});

export function AdminDashboard({
  adminToken,
  onSetAdminToken,
  settings,
  onDataChanged,
  onSelectSong,
}: AdminDashboardProps) {
  const [status, setStatus] = useState<AdminStatus | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tab, setTab] = useState<'songs' | 'branding' | 'inbox'>('songs');
  const [adminSongs, setAdminSongs] = useState<Song[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [editingForm, setEditingForm] = useState<SongFormState | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [branding, setBranding] = useState<SiteSettings>(settings);

  useEffect(() => {
    setBranding(settings);
  }, [settings]);

  const [backendUnavailable, setBackendUnavailable] = useState(false);

  const fetchAdminStatus = async () => {
    try {
      const res = await fetch('/api/admin/status', {
        headers: {
          Accept: 'application/json',
          ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
        },
      });
      if (!res.headers.get('content-type')?.includes('application/json')) {
        setBackendUnavailable(true);
        return;
      }
      if (res.ok) {
        setBackendUnavailable(false);
        const data = (await res.json()) as AdminStatus;
        setStatus(data);
        if (adminToken && !data.authenticated) {
          onSetAdminToken(null);
        }
      }
    } catch {
      setBackendUnavailable(true);
    }
  };

  const fetchAdminData = async (token: string) => {
    const [songsRes, msgsRes] = await Promise.all([
      fetch('/api/admin/songs', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/admin/messages', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (songsRes.ok && songsRes.headers.get('content-type')?.includes('application/json')) {
      const d = await songsRes.json();
      setAdminSongs(d.songs || []);
    }
    if (msgsRes.ok && msgsRes.headers.get('content-type')?.includes('application/json')) {
      const d = await msgsRes.json();
      setMessages(d.messages || []);
    }
  };

  useEffect(() => {
    fetchAdminStatus();
    if (adminToken) {
      fetchAdminData(adminToken);
    }
  }, [adminToken]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = status?.configured ? '/api/admin/login' : '/api/admin/bootstrap';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const raw = await res.text();
      let data: { token?: string; error?: string } | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
      if (!data) {
        throw new Error('Admin backend API is not active on this static deployment.');
      }
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      setPasswordInput('');
      onSetAdminToken(data.token ?? null);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const uploadFile = async (file: File, kind: 'image' | 'audio' | 'video'): Promise<string | null> => {
    if (!adminToken) return null;
    setUploadingField(kind);
    setFeedback(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/admin/upload?kind=${kind}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed.');
      }
      return data.url as string;
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Upload failed.',
      });
      return null;
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveSong = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminToken || !editingForm) return;
    setSaving(true);
    setFeedback(null);

    try {
      const isEdit = Boolean(editingForm.id);
      const url = isEdit ? `/api/admin/songs/${encodeURIComponent(editingForm.id!)}` : '/api/admin/songs';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(editingForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not save song.');
      }

      setEditingForm(null);
      setFeedback({
        type: 'success',
        text: isEdit ? 'Song metadata and files updated.' : 'New song saved to catalog.',
      });
      await fetchAdminData(adminToken);
      await onDataChanged();
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save song.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (song: Song) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/songs/${encodeURIComponent(song.id)}/publish`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isPublished: !song.isPublished }),
    });
    if (res.ok) {
      await fetchAdminData(adminToken);
      await onDataChanged();
      setFeedback({
        type: 'success',
        text: !song.isPublished ? `"${song.title}" is now published.` : `"${song.title}" moved to unpublished drafts.`,
      });
    }
  };

  const handleDeleteSong = async (song: Song) => {
    if (!adminToken) return;
    const res = await fetch(`/api/admin/songs/${encodeURIComponent(song.id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.ok) {
      await fetchAdminData(adminToken);
      await onDataChanged();
      setFeedback({ type: 'success', text: `Deleted "${song.title}".` });
    }
  };

  const handleSaveBranding = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(branding),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save branding.');
      await onDataChanged();
      setFeedback({ type: 'success', text: 'Channel branding, personal picture, and banner updated.' });
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save branding.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!adminToken) {
    const isSetup = status && !status.configured;
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="rounded-2xl border border-zinc-800 bg-[#0D0D12] p-7 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-600/15 border border-red-600/35 flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-white">
                {isSetup ? 'Claim Admin Studio' : 'Admin Studio Sign In'}
              </h1>
              <p className="text-xs text-zinc-400">
                {isSetup
                  ? 'First-run setup: set your Admin Studio password.'
                  : 'Sign in to upload songs, thumbnails, videos, and channel branding.'}
              </p>
            </div>
          </div>

          {backendUnavailable && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200 leading-relaxed">
              This deployment is currently serving static files only (such as Cloudflare Pages without a connected backend). Admin uploads, SQLite persistence, and catalog editing require running the Node.js Express server or connecting Cloudflare Pages Functions with D1 and R2 storage.
            </div>
          )}

          {authError && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300" htmlFor="admin-password">
                {isSetup ? 'Create Admin Password (min. 6 characters)' : 'Admin Password / Passcode'}
              </label>
              <input
                id="admin-password"
                type="password"
                required
                minLength={isSetup ? 6 : 1}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full h-10 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {authLoading ? 'Verifying...' : isSetup ? 'Claim & Enter Admin Studio' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">
            Admin Studio
          </h1>
          <p className="text-sm text-zinc-400">
            Upload songs, thumbnails, videos, and MP3s anytime. Manage publish states and channel branding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              type="button"
              onClick={() => setTab('songs')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tab === 'songs' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Songs & Uploads
            </button>
            <button
              type="button"
              onClick={() => setTab('branding')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tab === 'branding' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Channel Branding
            </button>
            <button
              type="button"
              onClick={() => setTab('inbox')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                tab === 'inbox' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Inbox ({messages.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSetAdminToken(null)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
              : 'border-red-500/40 bg-red-950/40 text-red-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Songs & Uploads Tab */}
      {tab === 'songs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400 tabular-nums">
              {adminSongs.length} total track{adminSongs.length === 1 ? '' : 's'} in database
            </p>
            <button
              type="button"
              onClick={() => setEditingForm(emptySongForm())}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Song</span>
            </button>
          </div>

          {editingForm && (
            <form
              onSubmit={handleSaveSong}
              className="rounded-2xl border border-red-600/40 bg-[#0D0D12] p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h2 className="font-display text-lg font-bold text-white">
                  {editingForm.id ? `Edit Song: ${editingForm.title}` : 'Upload / Add New Song'}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditingForm(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Song Title *</label>
                  <input
                    required
                    value={editingForm.title}
                    onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })}
                    placeholder="Enter song title"
                    className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Artist Name *</label>
                  <input
                    required
                    value={editingForm.artist}
                    onChange={(e) => setEditingForm({ ...editingForm, artist: e.target.value })}
                    placeholder="Enter artist name"
                    className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Release Date</label>
                  <input
                    type="date"
                    value={editingForm.releaseDate}
                    onChange={(e) => setEditingForm({ ...editingForm, releaseDate: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Download Permission Status</label>
                  <select
                    value={editingForm.downloadStatus}
                    onChange={(e) =>
                      setEditingForm({
                        ...editingForm,
                        downloadStatus: e.target.value as DownloadStatus,
                      })
                    }
                    className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="watch_only">Watch / Stream Only (Copyright Protected)</option>
                    <option value="authorized">Authorized Download (Redistribution Cleared)</option>
                    <option value="pending">Authorization Pending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">YouTube Video Title</label>
                  <input
                    value={editingForm.youtubeTitle}
                    onChange={(e) => setEditingForm({ ...editingForm, youtubeTitle: e.target.value })}
                    placeholder="Official YouTube video title"
                    className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">YouTube Video URL</label>
                  <input
                    value={editingForm.youtubeUrl}
                    onChange={(e) => setEditingForm({ ...editingForm, youtubeUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Song Description</label>
                  <textarea
                    rows={4}
                    value={editingForm.description}
                    onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                    placeholder="Write song notes, mood, and production details..."
                    className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Full YouTube Video Description</label>
                  <textarea
                    rows={4}
                    value={editingForm.youtubeDescription}
                    onChange={(e) =>
                      setEditingForm({ ...editingForm, youtubeDescription: e.target.value })
                    }
                    placeholder="Paste full YouTube video description, timestamps, and credits..."
                    className="w-full p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              {/* Media Uploaders (Thumbnail, MP3 Audio, Video) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/80">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Thumbnail Image (Upload or URL)
                  </label>
                  <input
                    value={editingForm.thumbnailUrl}
                    onChange={(e) => setEditingForm({ ...editingForm, thumbnailUrl: e.target.value })}
                    placeholder="/uploads/... or https://..."
                    className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white"
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-red-400" />
                    <span>{uploadingField === 'image' ? 'Uploading...' : 'Upload Thumbnail'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadFile(file, 'image');
                        if (url) setEditingForm((f) => (f ? { ...f, thumbnailUrl: url } : f));
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300 block">
                    MP3 / Audio File (if authorized)
                  </label>
                  <input
                    value={editingForm.audioUrl}
                    onChange={(e) => setEditingForm({ ...editingForm, audioUrl: e.target.value })}
                    placeholder="/uploads/... (optional)"
                    className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white"
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-red-400" />
                    <span>{uploadingField === 'audio' ? 'Uploading...' : 'Upload MP3 / Audio'}</span>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadFile(file, 'audio');
                        if (url) setEditingForm((f) => (f ? { ...f, audioUrl: url } : f));
                      }}
                    />
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Direct Video File (Optional MP4/WebM)
                  </label>
                  <input
                    value={editingForm.videoUrl}
                    onChange={(e) => setEditingForm({ ...editingForm, videoUrl: e.target.value })}
                    placeholder="/uploads/... (optional)"
                    className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white"
                  />
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-red-400" />
                    <span>{uploadingField === 'video' ? 'Uploading...' : 'Upload Video File'}</span>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadFile(file, 'video');
                        if (url) setEditingForm((f) => (f ? { ...f, videoUrl: url } : f));
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-800">
                <label className="inline-flex items-center gap-2.5 text-sm text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingForm.isPublished}
                    onChange={(e) => setEditingForm({ ...editingForm, isPublished: e.target.checked })}
                    className="w-4 h-4 accent-red-600"
                  />
                  <span>Publish immediately in public gallery & search</span>
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingForm(null)}
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-sm text-zinc-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Song'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Song Inventory Table */}
          <div className="rounded-2xl border border-zinc-800 bg-[#0D0D12] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400 bg-zinc-950/60">
                    <th className="py-3.5 px-4 font-medium">Track</th>
                    <th className="py-3.5 px-4 font-medium">Release Date</th>
                    <th className="py-3.5 px-4 font-medium">Permission</th>
                    <th className="py-3.5 px-4 font-medium">Visibility</th>
                    <th className="py-3.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/70 text-sm">
                  {adminSongs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-zinc-400">
                        No songs in database yet. Click "Add New Song" to upload your first release.
                      </td>
                    </tr>
                  ) : (
                    adminSongs.map((song) => (
                      <tr key={song.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <MediaImage
                              src={song.thumbnailUrl}
                              alt={song.title}
                              className="w-12 h-9 rounded-md object-cover shrink-0 bg-zinc-900"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-white truncate max-w-[240px]">
                                {song.title}
                              </p>
                              <p className="text-xs text-zinc-400 truncate max-w-[240px]">
                                {song.artist}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-300 font-mono tabular-nums whitespace-nowrap">
                          {formatReleaseDate(song.releaseDate)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-300 whitespace-nowrap">
                          {getDownloadStatusLabel(song.downloadStatus)}
                        </td>
                        <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                          <span className={song.isPublished ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                            {song.isPublished ? 'Published' : 'Unpublished'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onSelectSong(song)}
                              title="View Song Page"
                              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
                            >
                              <Check className="w-4 h-4 hidden" />
                              <span className="text-xs px-1">View</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(song)}
                              title={song.isPublished ? 'Unpublish' : 'Publish'}
                              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
                            >
                              {song.isPublished ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4 text-emerald-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingForm({
                                  id: song.id,
                                  title: song.title,
                                  artist: song.artist,
                                  youtubeTitle: song.youtubeTitle,
                                  youtubeDescription: song.youtubeDescription,
                                  description: song.description,
                                  thumbnailUrl: song.thumbnailUrl,
                                  youtubeUrl: song.youtubeUrl,
                                  videoUrl: song.videoUrl,
                                  audioUrl: song.audioUrl,
                                  releaseDate: song.releaseDate,
                                  downloadStatus: song.downloadStatus,
                                  isPublished: song.isPublished,
                                })
                              }
                              title="Edit Song"
                              className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSong(song)}
                              title="Delete Song"
                              className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Channel Branding & Personal Picture/Banner Tab */}
      {tab === 'branding' && (
        <form
          onSubmit={handleSaveBranding}
          className="rounded-2xl border border-zinc-800 bg-[#0D0D12] p-6 space-y-6 max-w-4xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-300 block">
                Personal Picture / Creator Avatar
              </label>
              <div className="flex items-center gap-4">
                <MediaImage
                  src={branding.avatarUrl}
                  alt="Personal Picture"
                  className="w-20 h-20 rounded-full object-cover border border-red-600/60 shrink-0"
                />
                <div className="space-y-2 flex-1 min-w-0">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-100 cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-red-400" />
                    <span>{uploadingField === 'avatar' ? 'Uploading...' : 'Upload Personal Picture'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingField('avatar');
                        const url = await uploadFile(file, 'image');
                        if (url) setBranding((b) => ({ ...b, avatarUrl: url }));
                      }}
                    />
                  </label>
                  <input
                    value={branding.avatarUrl}
                    onChange={(e) => setBranding({ ...branding, avatarUrl: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-300 block">
                Hero Channel Banner
              </label>
              <div className="space-y-2">
                <MediaImage
                  src={branding.bannerUrl}
                  alt="Channel Banner"
                  className="w-full h-24 rounded-xl object-cover border border-zinc-800"
                />
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-100 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5 text-red-400" />
                    <span>{uploadingField === 'banner' ? 'Uploading...' : 'Upload Banner'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingField('banner');
                        const url = await uploadFile(file, 'image');
                        if (url) setBranding((b) => ({ ...b, bannerUrl: url }));
                      }}
                    />
                  </label>
                  <input
                    value={branding.bannerUrl}
                    onChange={(e) => setBranding({ ...branding, bannerUrl: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Channel Name</label>
              <input
                value={branding.channelName}
                onChange={(e) => setBranding({ ...branding, channelName: e.target.value })}
                className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Creator Name</label>
              <input
                value={branding.creatorName}
                onChange={(e) => setBranding({ ...branding, creatorName: e.target.value })}
                className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">YouTube Channel URL</label>
              <input
                value={branding.youtubeChannelUrl}
                onChange={(e) => setBranding({ ...branding, youtubeChannelUrl: e.target.value })}
                className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Contact Email</label>
              <input
                value={branding.contactEmail}
                onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
                className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Hero Tagline</label>
            <input
              value={branding.tagline}
              onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
              className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">About PULSE BEAT Description</label>
            <textarea
              rows={4}
              value={branding.aboutText}
              onChange={(e) => setBranding({ ...branding, aboutText: e.target.value })}
              className="w-full p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Branding & Settings'}</span>
          </button>
        </form>
      )}

      {/* Inbox Tab */}
      {tab === 'inbox' && (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-[#0D0D12] p-10 text-center text-sm text-zinc-400">
              No contact inquiries yet. Messages sent via the Contact page appear here.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="rounded-xl border border-zinc-800 bg-[#0D0D12] p-5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Mail className="w-4 h-4 text-red-400" />
                    <span>{msg.subject}</span>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono tabular-nums">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  From: <span className="text-zinc-200">{msg.name}</span> ({msg.email})
                </p>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line pt-1">
                  {msg.message}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
