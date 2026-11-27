import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const UPLOADS_DIR = path.resolve(ROOT_DIR, 'uploads');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Generate a tiny pleasant ambient WAV preview file for the initial authorized sample track
function ensureSampleAudioFile(): string {
  const filename = 'crimson_horizon_preview.wav';
  const filepath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    const sampleRate = 22050;
    const durationSec = 4;
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // Warm A minor chord progression pulse
    const freqs = [220, 261.63, 329.63, 440];
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.min(1, t * 4) * Math.min(1, (durationSec - t) * 2);
      const pulse = 0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * t);
      let sample = 0;
      for (const f of freqs) {
        sample += Math.sin(2 * Math.PI * f * t);
      }
      const val = Math.max(-1, Math.min(1, (sample / freqs.length) * 0.35 * envelope * pulse));
      buffer.writeInt16LE(Math.floor(val * 32767), 44 + i * 2);
    }
    fs.writeFileSync(filepath, buffer);
  }
  return `/uploads/${filename}`;
}

const sampleAudioPath = ensureSampleAudioFile();

// Initialize SQLite database
const db = new Database(path.join(DATA_DIR, 'pulsebeat.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    youtubeTitle TEXT NOT NULL DEFAULT '',
    youtubeDescription TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    thumbnailUrl TEXT NOT NULL DEFAULT '',
    youtubeUrl TEXT NOT NULL DEFAULT '',
    videoUrl TEXT NOT NULL DEFAULT '',
    audioUrl TEXT NOT NULL DEFAULT '',
    releaseDate TEXT NOT NULL,
    downloadStatus TEXT NOT NULL DEFAULT 'watch_only',
    isPublished INTEGER NOT NULL DEFAULT 1,
    downloadCount INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
`);

const defaultSettings: Record<string, string> = {
  channelName: 'PULSE BEAT',
  creatorName: 'PULSE BEAT Studio',
  tagline: 'Official Music Showcase, Visual Releases & Authorized Audio',
  youtubeChannelUrl: 'https://www.youtube.com',
  aboutText:
    'PULSE BEAT is a dedicated music showcase and video channel curating dark electronic beats, studio sessions, and visual performances. Every release includes verified artist credits, full YouTube video notes, and transparent audio permissions—offering direct MP3 downloads only for tracks officially cleared for redistribution.',
  contactEmail: 'contact@pulsebeat.studio',
  bannerUrl: '/src/assets/images/pulse_hero_banner_1795760267847.jpg',
  avatarUrl: '/src/assets/images/pulse_creator_avatar_1795760268621.jpg',
};

const insertSettingStmt = db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSettingStmt.run(key, value);
}

// Seed initial sample catalog once so visitors can explore immediately and admin can edit/replace/delete
const hasSeeded = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('seeded_initial_catalog') as
  | { value: string }
  | undefined;
const songCountRow = db.prepare('SELECT COUNT(*) as count FROM songs').get() as { count: number };

if (!hasSeeded && songCountRow.count === 0) {
  const now = new Date().toISOString();
  const insertSong = db.prepare(`
    INSERT INTO songs (
      id, title, artist, youtubeTitle, youtubeDescription, description,
      thumbnailUrl, youtubeUrl, videoUrl, audioUrl, releaseDate,
      downloadStatus, isPublished, downloadCount, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertSong.run(
    'crimson-horizon',
    'Crimson Horizon',
    'PULSE BEAT Originals',
    'PULSE BEAT — Crimson Horizon (Official Audio & Studio Visual)',
    'Track: Crimson Horizon\nProducer: PULSE BEAT Originals\nLicense: Authorized for free personal listening and redistribution with credit.\n\nRecorded on analog hardware synthesizers with warm sub-bass layering and late-night studio percussion.',
    'A moody analog synthwave instrumental crafted in the PULSE BEAT studio. Cleared as an authorized download so listeners can stream or save the audio preview directly.',
    '/src/assets/images/track_cover_midnight_1795760268413.jpg',
    '',
    '',
    sampleAudioPath,
    '2026-11-20',
    'authorized',
    1,
    0,
    now,
    now
  );

  insertSong.run(
    'midnight-signal',
    'Midnight Signal',
    'PULSE BEAT Originals',
    'PULSE BEAT — Midnight Signal (Live Stage Session)',
    'Track: Midnight Signal\nArtist: PULSE BEAT Originals\nFormat: Live Stage Performance\n\nWatch the full stage lighting session on YouTube. Streaming and viewing only.',
    'Atmospheric live stage performance capturing driving percussion and deep crimson stage lighting. Available for streaming and video showcase.',
    '/src/assets/images/track_cover_redline_1795760269581.jpg',
    '',
    '',
    '',
    '2026-11-12',
    'watch_only',
    1,
    0,
    now,
    now
  );

  insertSong.run(
    'obsidian-echoes',
    'Obsidian Echoes',
    'PULSE BEAT Originals',
    'PULSE BEAT — Obsidian Echoes (Analog Tape Cut)',
    'Track: Obsidian Echoes\nArtist: PULSE BEAT Originals\nSession: Late Night Tape Mastering\n\nMixed through vintage VU metering for warm harmonic saturation.',
    'Minimalist dark ambient session built around tape loops and analog VU saturation. Add your YouTube link or MP3 upload anytime from the Admin Studio.',
    '/src/assets/images/track_cover_echoes_1795760269928.jpg',
    '',
    '',
    '',
    '2026-11-01',
    'pending',
    1,
    0,
    now,
    now
  );

  db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)').run('seeded_initial_catalog', '1');
}

// Security helpers
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function hashPassword(password: string, salt?: string): string {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return `${actualSalt}:${derived}`;
}

function verifyPasswordHash(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const storedBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(derived, storedBuf);
}

function verifyEnvPasscode(candidate: string, envPasscode: string): boolean {
  const a = Buffer.from(candidate, 'utf8');
  const b = Buffer.from(envPasscode, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function signAdminToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: string; exp?: number };
    return parsed.role === 'admin' && typeof parsed.exp === 'number' && parsed.exp > Date.now();
  } catch {
    return false;
  }
}

function getBearerToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return undefined;
  return auth.slice(7).trim();
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = getBearerToken(req);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Admin authentication required.' });
    return;
  }
  next();
}

function isValidMediaRef(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('/src/assets/')) return true;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function safeUnlinkUpload(urlPath: string): void {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return;
  const filename = urlPath.slice('/uploads/'.length);
  if (!filename || filename.includes('/') || filename.includes('\\') || filename === 'crimson_horizon_preview.wav') {
    return;
  }
  const resolved = path.resolve(UPLOADS_DIR, filename);
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) return;
  if (fs.existsSync(resolved)) {
    try {
      fs.unlinkSync(resolved);
    } catch {
      // ignore cleanup error
    }
  }
}

function mapSongRow(row: Record<string, unknown>) {
  return {
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
    isPublished: Boolean(row.isPublished),
    downloadCount: Number(row.downloadCount ?? 0),
    createdAt: String(row.createdAt ?? ''),
    updatedAt: String(row.updatedAt ?? ''),
  };
}

function getSiteSettingsObject() {
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as Array<{ key: string; value: string }>;
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return {
    channelName: map.channelName || defaultSettings.channelName,
    creatorName: map.creatorName || defaultSettings.creatorName,
    tagline: map.tagline || defaultSettings.tagline,
    youtubeChannelUrl: map.youtubeChannelUrl || defaultSettings.youtubeChannelUrl,
    aboutText: map.aboutText || defaultSettings.aboutText,
    contactEmail: map.contactEmail || defaultSettings.contactEmail,
    bannerUrl: map.bannerUrl || defaultSettings.bannerUrl,
    avatarUrl: map.avatarUrl || defaultSettings.avatarUrl,
  };
}

// Multer setup for safe media uploads (thumbnails, MP3/audio, videos, banner, avatar)
const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  image: ['.jpg', '.jpeg', '.png', '.webp'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a'],
  video: ['.mp4', '.webm', '.mov'],
};

const ALLOWED_MIMES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const uploadType = String(req.query.kind || 'image');
    const group =
      uploadType === 'audio' ? 'audio' : uploadType === 'video' ? 'video' : 'image';
    const ext = path.extname(file.originalname).toLowerCase();
    const okExt = ALLOWED_EXTENSIONS[group].includes(ext);
    const okMime = ALLOWED_MIMES[group].includes(file.mimetype);
    if (!okExt || !okMime) {
      cb(new Error(`Invalid ${group} file format. Allowed: ${ALLOWED_EXTENSIONS[group].join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

function getAiClient(): GoogleGenAI | null {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (!geminiKey) return null;
  return new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Serve uploaded media safely
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  // Public site settings & stats
  app.get('/api/site', (_req, res) => {
    const settings = getSiteSettingsObject();
    const publishedSongs = (
      db.prepare('SELECT COUNT(*) as count FROM songs WHERE isPublished = 1').get() as { count: number }
    ).count;
    const musicVideos = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM songs WHERE isPublished = 1 AND (TRIM(youtubeUrl) != '' OR TRIM(videoUrl) != '')"
        )
        .get() as { count: number }
    ).count;
    const authorizedDownloads = (
      db
        .prepare(
          "SELECT COUNT(*) as count FROM songs WHERE isPublished = 1 AND downloadStatus = 'authorized' AND TRIM(audioUrl) != ''"
        )
        .get() as { count: number }
    ).count;

    res.json({
      settings,
      stats: {
        publishedSongs,
        musicVideos,
        authorizedDownloads,
      },
    });
  });

  // Public songs catalog & search
  app.get('/api/songs', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const filter = typeof req.query.filter === 'string' ? req.query.filter.trim() : 'all';

    let sql = 'SELECT * FROM songs WHERE isPublished = 1';
    const params: string[] = [];

    if (filter === 'videos') {
      sql += " AND (TRIM(youtubeUrl) != '' OR TRIM(videoUrl) != '')";
    } else if (filter === 'downloads') {
      sql += " AND downloadStatus = 'authorized' AND TRIM(audioUrl) != ''";
    }

    if (q) {
      sql += ' AND (title LIKE ? OR artist LIKE ? OR youtubeTitle LIKE ? OR description LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY releaseDate DESC, createdAt DESC';
    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    res.json({ songs: rows.map(mapSongRow) });
  });

  // Single song detail
  app.get('/api/songs/:id', (req, res) => {
    const isAdmin = verifyAdminToken(getBearerToken(req));
    const row = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id) as
      | Record<string, unknown>
      | undefined;

    if (!row || (!row.isPublished && !isAdmin)) {
      res.status(404).json({ error: 'Song not found.' });
      return;
    }
    res.json({ song: mapSongRow(row) });
  });

  // Authorized audio download endpoint
  app.get('/api/songs/:id/download', (req, res) => {
    const row = db.prepare('SELECT * FROM songs WHERE id = ? AND isPublished = 1').get(req.params.id) as
      | Record<string, unknown>
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Song not found.' });
      return;
    }

    if (row.downloadStatus !== 'authorized') {
      res.status(403).json({ error: 'This track is marked Watch / Stream Only and is not authorized for download.' });
      return;
    }

    const audioUrl = String(row.audioUrl || '').trim();
    if (!audioUrl) {
      res.status(404).json({ error: 'No audio file has been uploaded for this song yet.' });
      return;
    }

    if (!audioUrl.startsWith('/uploads/')) {
      if (isValidMediaRef(audioUrl)) {
        res.redirect(audioUrl);
        return;
      }
      res.status(400).json({ error: 'Invalid audio reference.' });
      return;
    }

    const filename = audioUrl.slice('/uploads/'.length);
    const resolved = path.resolve(UPLOADS_DIR, filename);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).json({ error: 'Audio file not found on server.' });
      return;
    }

    db.prepare('UPDATE songs SET downloadCount = downloadCount + 1 WHERE id = ?').run(req.params.id);
    const ext = path.extname(resolved) || '.mp3';
    const safeTitle = String(row.title)
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    res.download(resolved, `${safeTitle || 'pulse_beat_track'}${ext}`);
  });

  // Contact form submission
  app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body ?? {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      res.status(400).json({ error: 'Please provide your name, a valid email, and a message.' });
      return;
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare(
      'INSERT INTO contact_messages (id, name, email, subject, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name.trim().slice(0, 120), email.trim().slice(0, 160), String(subject || 'General Inquiry').trim().slice(0, 160), message.trim().slice(0, 3000), createdAt);

    res.status(201).json({ success: true, id });
  });

  // PULSE AI Assistant endpoint grounded strictly in live SQLite website data
  app.post('/api/chat', async (req, res) => {
    const aiClient = getAiClient();
    if (!aiClient) {
      res.status(503).json({
        error: 'Gemini API key is not configured on the server. Set GEMINI_API_KEY in Secrets to enable PULSE AI Assistant.',
      });
      return;
    }

    const { message, history } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'Please enter a message for PULSE AI Assistant.' });
      return;
    }

    try {
      const settings = getSiteSettingsObject();
      const publishedRows = db
        .prepare('SELECT * FROM songs WHERE isPublished = 1 ORDER BY releaseDate DESC, createdAt DESC')
        .all() as Array<Record<string, unknown>>;
      const publishedSongs = publishedRows.map(mapSongRow);

      const catalogSnapshot = publishedSongs.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        youtubeTitle: s.youtubeTitle,
        description: s.description,
        youtubeDescription: s.youtubeDescription,
        youtubeUrl: s.youtubeUrl || 'Not added yet',
        hasDirectVideo: Boolean(s.videoUrl),
        hasAudioFile: Boolean(s.audioUrl),
        releaseDate: s.releaseDate,
        downloadStatus: s.downloadStatus,
        authorizedDownloadAvailable: s.downloadStatus === 'authorized' && Boolean(s.audioUrl),
        songPageRoute: `/songs/${s.id}`,
      }));

      const systemInstruction = `You are "PULSE AI Assistant", the friendly, knowledgeable AI assistant for the "${settings.channelName}" music showcase website.

STRICT GROUNDING RULES (MUST OBEY):
1. Use ONLY the live website catalog and channel settings provided below. NEVER invent songs, artists, release dates, YouTube links, or download links that are not explicitly listed in the catalog JSON below.
2. If a user searches for a song or artist not in the catalog, honestly say it is not currently published on PULSE BEAT and mention what tracks are available instead.
3. Explain authorized downloads clearly: PULSE BEAT only provides direct audio downloads when a track has downloadStatus = "authorized" AND has an uploaded audio file (authorizedDownloadAvailable = true). Tracks marked "watch_only" or "pending" are for streaming/viewing only to respect artist copyright. Never claim PULSE BEAT owns copyrighted songs.
4. Direct users to relevant song pages by returning their exact IDs in the "referencedSongIds" array, and mention YouTube video URLs only when actually present in the catalog.
5. Be warm, concise, helpful, and easy to read.

CHANNEL SETTINGS:
- Channel Name: ${settings.channelName}
- Creator: ${settings.creatorName}
- Tagline: ${settings.tagline}
- YouTube Channel URL: ${settings.youtubeChannelUrl}
- About: ${settings.aboutText}
- Contact Email: ${settings.contactEmail}

LIVE PUBLISHED SONG CATALOG (${catalogSnapshot.length} songs):
${JSON.stringify(catalogSnapshot)}`;

      const safeHistory = Array.isArray(history)
        ? history
            .slice(-8)
            .filter(
              (m): m is { role: 'user' | 'assistant'; text: string } =>
                m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string'
            )
            .map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.text.slice(0, 1500) }],
            }))
        : [];

      const contents = [
        ...safeHistory,
        {
          role: 'user',
          parts: [{ text: message.trim().slice(0, 1500) }],
        },
      ];

      const callGemini = async (modelName: string) =>
        aiClient.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: {
                  type: Type.STRING,
                  description: 'Friendly plain-text conversational response grounded strictly in the PULSE BEAT database.',
                },
                referencedSongIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Exact song IDs from the live catalog that are directly relevant to the user question.',
                },
              },
              required: ['reply', 'referencedSongIds'],
            },
          },
        });

      const isTransientError = (err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        const status = (err as { status?: number })?.status;
        return status === 503 || status === 500 || msg.includes('UNAVAILABLE') || msg.includes('"code":503');
      };

      let response;
      const attemptModels = ['gemini-4-hydrogen', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      let lastErr: unknown;
      for (let i = 0; i < attemptModels.length; i++) {
        try {
          response = await callGemini(attemptModels[i]);
          lastErr = undefined;
          break;
        } catch (err) {
          lastErr = err;
          if (!isTransientError(err) || i === attemptModels.length - 1) {
            throw err;
          }
          await new Promise((r) => setTimeout(r, 600 * (i + 1)));
        }
      }
      if (!response) {
        throw lastErr ?? new Error('No response from Gemini API.');
      }

      const rawText = (response.text ?? '{}').trim();
      let parsed: { reply?: string; referencedSongIds?: string[] } = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = { reply: rawText || 'I could not process that request right now.', referencedSongIds: [] };
      }

      const validSongMap = new Map(publishedSongs.map((s) => [s.id, s]));
      const suggestedSongs = Array.isArray(parsed.referencedSongIds)
        ? parsed.referencedSongIds
            .map((id) => validSongMap.get(String(id)))
            .filter((s): s is NonNullable<typeof s> => Boolean(s))
            .slice(0, 4)
        : [];

      res.json({
        reply: parsed.reply || 'Here is what I found in the PULSE BEAT catalog.',
        songs: suggestedSongs,
      });
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Failed to reach Gemini API.';
      let cleanMsg = rawMsg;
      try {
        const inner = JSON.parse(rawMsg) as { error?: { message?: string; code?: number } };
        if (inner?.error?.message) {
          cleanMsg = inner.error.message;
        }
      } catch {
        // Not a JSON-wrapped error string
      }

      const status =
        typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : 502;
      if (status === 400 || status === 403 || rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('PERMISSION_DENIED')) {
        res.status(status).json({
          error: 'PULSE AI Assistant could not authenticate with the Gemini API. Please verify GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }
      if (status === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'PULSE AI Assistant is temporarily busy due to rate limits. Please wait a moment and try again.',
        });
        return;
      }
      if (status === 503 || rawMsg.includes('UNAVAILABLE')) {
        res.status(503).json({
          error: 'PULSE AI Assistant is experiencing high demand right now. Please try your question again in a few seconds.',
        });
        return;
      }
      res.status(502).json({ error: `PULSE AI Assistant error: ${cleanMsg}` });
    }
  });

  // Admin auth routes
  app.get('/api/admin/status', (req, res) => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    const storedHash = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('admin_password_hash') as
      | { value: string }
      | undefined;

    res.json({
      configured: Boolean(envPasscode || storedHash?.value),
      envPasscodeActive: Boolean(envPasscode),
      authenticated: verifyAdminToken(getBearerToken(req)),
    });
  });

  app.post('/api/admin/bootstrap', (req, res) => {
    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      res.status(403).json({ error: 'Admin passcode is managed via environment configuration.' });
      return;
    }

    const existing = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('admin_password_hash') as
      | { value: string }
      | undefined;
    if (existing?.value) {
      res.status(409).json({ error: 'Admin password has already been claimed. Please sign in.' });
      return;
    }

    const { password } = req.body ?? {};
    if (typeof password !== 'string' || password.trim().length < 6) {
      res.status(400).json({ error: 'Please choose an admin password of at least 6 characters.' });
      return;
    }

    const hashed = hashPassword(password.trim());
    const insertResult = db
      .prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?, ?)')
      .run('admin_password_hash', hashed);

    if (insertResult.changes === 0) {
      res.status(409).json({ error: 'Admin password was already claimed.' });
      return;
    }

    res.status(201).json({ token: signAdminToken() });
  });

  app.post('/api/admin/login', (req, res) => {
    const { password } = req.body ?? {};
    if (typeof password !== 'string' || !password) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    const envPasscode = process.env.ADMIN_PASSCODE?.trim();
    if (envPasscode) {
      if (!verifyEnvPasscode(password, envPasscode)) {
        res.status(401).json({ error: 'Invalid admin passcode.' });
        return;
      }
      res.json({ token: signAdminToken() });
      return;
    }

    const stored = db.prepare('SELECT value FROM site_settings WHERE key = ?').get('admin_password_hash') as
      | { value: string }
      | undefined;
    if (!stored?.value) {
      res.status(400).json({ error: 'Admin password has not been set up yet.' });
      return;
    }

    if (!verifyPasswordHash(password, stored.value)) {
      res.status(401).json({ error: 'Incorrect admin password.' });
      return;
    }

    res.json({ token: signAdminToken() });
  });

  // Protected Admin routes
  app.get('/api/admin/songs', requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM songs ORDER BY releaseDate DESC, createdAt DESC').all() as Array<
      Record<string, unknown>
    >;
    res.json({ songs: rows.map(mapSongRow) });
  });

  app.post('/api/admin/songs', requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const artist = typeof body.artist === 'string' ? body.artist.trim() : '';
    if (!title || !artist) {
      res.status(400).json({ error: 'Song title and artist name are required.' });
      return;
    }

    const mediaFields = [body.thumbnailUrl, body.youtubeUrl, body.videoUrl, body.audioUrl];
    if (mediaFields.some((f) => f !== undefined && !isValidMediaRef(f))) {
      res.status(400).json({ error: 'One or more media URLs use an unsupported scheme.' });
      return;
    }

    const status = ['authorized', 'watch_only', 'pending'].includes(body.downloadStatus)
      ? body.downloadStatus
      : 'watch_only';
    const releaseDate =
      typeof body.releaseDate === 'string' && body.releaseDate.trim()
        ? body.releaseDate.trim()
        : new Date().toISOString().slice(0, 10);

    const slugBase = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    const id = `${slugBase || 'track'}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO songs (
        id, title, artist, youtubeTitle, youtubeDescription, description,
        thumbnailUrl, youtubeUrl, videoUrl, audioUrl, releaseDate,
        downloadStatus, isPublished, downloadCount, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      title,
      artist,
      String(body.youtubeTitle || '').trim(),
      String(body.youtubeDescription || '').trim(),
      String(body.description || '').trim(),
      String(body.thumbnailUrl || '').trim(),
      String(body.youtubeUrl || '').trim(),
      String(body.videoUrl || '').trim(),
      String(body.audioUrl || '').trim(),
      releaseDate,
      status,
      body.isPublished === false ? 0 : 1,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM songs WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json({ song: mapSongRow(created) });
  });

  app.put('/api/admin/songs/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Song not found.' });
      return;
    }

    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : String(existing.title);
    const artist = typeof body.artist === 'string' ? body.artist.trim() : String(existing.artist);
    if (!title || !artist) {
      res.status(400).json({ error: 'Song title and artist name cannot be empty.' });
      return;
    }

    const mediaFields = [body.thumbnailUrl, body.youtubeUrl, body.videoUrl, body.audioUrl];
    if (mediaFields.some((f) => f !== undefined && !isValidMediaRef(f))) {
      res.status(400).json({ error: 'One or more media URLs use an unsupported scheme.' });
      return;
    }

    const status = ['authorized', 'watch_only', 'pending'].includes(body.downloadStatus)
      ? body.downloadStatus
      : String(existing.downloadStatus);

    const nextThumb = body.thumbnailUrl !== undefined ? String(body.thumbnailUrl).trim() : String(existing.thumbnailUrl);
    const nextVideo = body.videoUrl !== undefined ? String(body.videoUrl).trim() : String(existing.videoUrl);
    const nextAudio = body.audioUrl !== undefined ? String(body.audioUrl).trim() : String(existing.audioUrl);

    if (nextThumb !== existing.thumbnailUrl) safeUnlinkUpload(String(existing.thumbnailUrl));
    if (nextVideo !== existing.videoUrl) safeUnlinkUpload(String(existing.videoUrl));
    if (nextAudio !== existing.audioUrl) safeUnlinkUpload(String(existing.audioUrl));

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE songs SET
        title = ?, artist = ?, youtubeTitle = ?, youtubeDescription = ?, description = ?,
        thumbnailUrl = ?, youtubeUrl = ?, videoUrl = ?, audioUrl = ?, releaseDate = ?,
        downloadStatus = ?, isPublished = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      title,
      artist,
      body.youtubeTitle !== undefined ? String(body.youtubeTitle).trim() : String(existing.youtubeTitle),
      body.youtubeDescription !== undefined
        ? String(body.youtubeDescription).trim()
        : String(existing.youtubeDescription),
      body.description !== undefined ? String(body.description).trim() : String(existing.description),
      nextThumb,
      body.youtubeUrl !== undefined ? String(body.youtubeUrl).trim() : String(existing.youtubeUrl),
      nextVideo,
      nextAudio,
      body.releaseDate !== undefined ? String(body.releaseDate).trim() : String(existing.releaseDate),
      status,
      body.isPublished !== undefined ? (body.isPublished ? 1 : 0) : Number(existing.isPublished),
      now,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json({ song: mapSongRow(updated) });
  });

  app.patch('/api/admin/songs/:id/publish', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Song not found.' });
      return;
    }

    const nextPublished = req.body?.isPublished !== undefined ? (req.body.isPublished ? 1 : 0) : existing.isPublished ? 0 : 1;
    db.prepare('UPDATE songs SET isPublished = ?, updatedAt = ? WHERE id = ?').run(
      nextPublished,
      new Date().toISOString(),
      req.params.id
    );
    const updated = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json({ song: mapSongRow(updated) });
  });

  app.delete('/api/admin/songs/:id', requireAdmin, (req, res) => {
    const existing = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Song not found.' });
      return;
    }

    safeUnlinkUpload(String(existing.thumbnailUrl));
    safeUnlinkUpload(String(existing.videoUrl));
    safeUnlinkUpload(String(existing.audioUrl));
    db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // File upload endpoint
  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'File upload failed.' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No file selected.' });
        return;
      }
      res.status(201).json({
        url: `/uploads/${req.file.filename}`,
        filename: req.file.originalname,
        size: req.file.size,
      });
    });
  });

  // Update channel branding & settings
  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const body = req.body ?? {};
    const allowedKeys = [
      'channelName',
      'creatorName',
      'tagline',
      'youtubeChannelUrl',
      'aboutText',
      'contactEmail',
      'bannerUrl',
      'avatarUrl',
    ];

    const current = getSiteSettingsObject();
    const upsert = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');

    for (const key of allowedKeys) {
      if (typeof body[key] === 'string') {
        const val = body[key].trim();
        if ((key === 'bannerUrl' || key === 'avatarUrl' || key === 'youtubeChannelUrl') && !isValidMediaRef(val)) {
          res.status(400).json({ error: `Invalid URL provided for ${key}.` });
          return;
        }
        if (key === 'bannerUrl' && val !== current.bannerUrl) {
          safeUnlinkUpload(current.bannerUrl);
        }
        if (key === 'avatarUrl' && val !== current.avatarUrl) {
          safeUnlinkUpload(current.avatarUrl);
        }
        upsert.run(key, val);
      }
    }

    res.json({ settings: getSiteSettingsObject() });
  });

  app.get('/api/admin/messages', requireAdmin, (_req, res) => {
    const rows = db.prepare('SELECT * FROM contact_messages ORDER BY createdAt DESC LIMIT 100').all();
    res.json({ messages: rows });
  });

  // Ensure unmatched /api/* routes always return JSON instead of falling through to SPA HTML
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Ensure Express errors on /api/* always return JSON instead of HTML error pages
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      const status =
        typeof (err as { status?: number })?.status === 'number'
          ? (err as { status: number }).status
          : 500;
      const msg = err instanceof Error ? err.message : 'Internal server error.';
      res.status(status).json({ error: msg });
      return;
    }
    next(err);
  });

  // Mount Vite middleware in development or serve built dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PULSE BEAT server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start PULSE BEAT server:', err);
  process.exit(1);
});
