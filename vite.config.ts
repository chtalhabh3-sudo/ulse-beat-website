import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import {createRequire} from 'module';
import path from 'path';
import {fileURLToPath} from 'url';
import {defineConfig} from 'vite';

const require = createRequire(import.meta.url);
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));

function writeStaticCatalogSnapshot(distDir: string): void {
  const fallbackSnapshot = {
    settings: {
      channelName: 'PULSE BEAT',
      creatorName: 'PULSE BEAT Studio',
      tagline: 'Official Music Showcase, Visual Releases & Authorized Audio',
      youtubeChannelUrl: 'https://www.youtube.com',
      aboutText:
        'PULSE BEAT is a dedicated music showcase and video channel curating dark electronic beats, studio sessions, and visual performances.',
      contactEmail: 'contact@pulsebeat.studio',
      bannerUrl: '/src/assets/images/pulse_hero_banner_1795760267847.jpg',
      avatarUrl: '/src/assets/images/pulse_creator_avatar_1795760268621.jpg',
    },
    stats: {
      publishedSongs: 0,
      musicVideos: 0,
      authorizedDownloads: 0,
    },
    songs: [],
  };

  try {
    const dbPath = path.resolve(ROOT_DIR, 'data', 'pulsebeat.db');
    if (fs.existsSync(dbPath)) {
      const Database = require('better-sqlite3');
      const db = new Database(dbPath, {readonly: true});
      const settingRows = db
        .prepare('SELECT key, value FROM site_settings')
        .all() as Array<{key: string; value: string}>;
      const map: Record<string, string> = {};
      for (const r of settingRows) {
        if (r.key !== 'admin_password_hash' && r.key !== 'seeded_initial_catalog') {
          map[r.key] = r.value;
        }
      }
      const songRows = db
        .prepare(
          'SELECT * FROM songs WHERE isPublished = 1 ORDER BY releaseDate DESC, createdAt DESC'
        )
        .all() as Array<Record<string, unknown>>;
      const songs = songRows.map((row) => ({
        id: String(row.id),
        title: String(row.title),
        artist: String(row.artist),
        youtubeTitle: String(row.youtubeTitle ?? ''),
        youtubeDescription: String(row.youtubeDescription ?? ''),
        description: String(row.description ?? ''),
        thumbnailUrl: String(row.thumbnailUrl ?? ''),
        youtubeUrl: String(row.youtubeUrl ?? ''),
        videoUrl: String(row.videoUrl ?? ''),
        audioUrl: String(row.audioUrl ?? ''),
        releaseDate: String(row.releaseDate ?? ''),
        downloadStatus: String(row.downloadStatus ?? 'watch_only'),
        isPublished: true,
        downloadCount: Number(row.downloadCount ?? 0),
        createdAt: String(row.createdAt ?? ''),
        updatedAt: String(row.updatedAt ?? ''),
      }));
      db.close();

      const snapshot = {
        settings: {
          ...fallbackSnapshot.settings,
          ...map,
        },
        stats: {
          publishedSongs: songs.length,
          musicVideos: songs.filter((s) => Boolean(s.youtubeUrl || s.videoUrl)).length,
          authorizedDownloads: songs.filter(
            (s) => s.downloadStatus === 'authorized' && Boolean(s.audioUrl)
          ).length,
        },
        songs,
      };
      fs.writeFileSync(
        path.join(distDir, 'catalog-snapshot.json'),
        JSON.stringify(snapshot),
        'utf8'
      );
      return;
    }
  } catch {
    // Database not present or native module unavailable in static CI; write fallback snapshot
  }

  fs.writeFileSync(
    path.join(distDir, 'catalog-snapshot.json'),
    JSON.stringify(fallbackSnapshot),
    'utf8'
  );
}

export default defineConfig(() => {
  return {
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets, uploaded public media, and static catalog snapshot into dist/
      // so Cloudflare Pages and production static builds resolve all assets cleanly.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(ROOT_DIR, 'dist');
          const srcAssets = path.resolve(ROOT_DIR, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          const uploadsDir = path.resolve(ROOT_DIR, 'uploads');
          const distUploads = path.resolve(distDir, 'uploads');
          if (fs.existsSync(distDir) && fs.existsSync(uploadsDir)) {
            fs.cpSync(uploadsDir, distUploads, {recursive: true, force: true});
          }
          if (fs.existsSync(distDir)) {
            writeStaticCatalogSnapshot(distDir);
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(ROOT_DIR, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
