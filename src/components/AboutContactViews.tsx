import { useState, type FormEvent } from 'react';
import { CheckCircle2, ExternalLink, Mail, Send, ShieldCheck, Video } from 'lucide-react';
import type { SiteSettings, SiteStats } from '../types';
import { isSafeUrl } from '../utils/media';
import { MediaImage } from './MediaImage';

interface AboutViewProps {
  settings: SiteSettings;
  stats: SiteStats;
}

export function AboutView({ settings, stats }: AboutViewProps) {
  const youtubeHref = isSafeUrl(settings.youtubeChannelUrl)
    ? settings.youtubeChannelUrl
    : 'https://www.youtube.com';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-[#0D0D12]">
        <div className="relative h-56 sm:h-72">
          <MediaImage
            src={settings.bannerUrl}
            alt={`${settings.channelName} banner`}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D12] via-[#0D0D12]/50 to-transparent" />
        </div>

        <div className="px-6 sm:px-10 pb-8 -mt-12 relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-red-600 bg-zinc-900 shrink-0 shadow-xl">
              <MediaImage
                src={settings.avatarUrl}
                alt={settings.creatorName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-red-400">
                {settings.creatorName}
              </p>
              <h1 className="font-display text-3xl font-bold text-white tracking-tight">
                About {settings.channelName}
              </h1>
            </div>
          </div>

          <p className="text-base text-zinc-300 leading-relaxed whitespace-pre-line max-w-3xl">
            {settings.aboutText}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800/80">
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <p className="text-xs text-zinc-400">Published Tracks</p>
              <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
                {stats.publishedSongs}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <p className="text-xs text-zinc-400">Music Videos</p>
              <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
                {stats.musicVideos}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <p className="text-xs text-zinc-400">Authorized Downloads</p>
              <p className="font-display text-2xl font-bold text-white tabular-nums mt-1">
                {stats.authorizedDownloads}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href={youtubeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
            >
              <Video className="w-4 h-4" />
              <span>Visit YouTube Channel</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className="inline-flex items-center gap-2 text-xs text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Transparent rights & artist credit on every track</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ContactViewProps {
  settings: SiteSettings;
}

export function ContactView({ settings }: ContactViewProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const raw = await res.text();
      let data: { success?: boolean; error?: string } | null = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }
      if (!data) {
        throw new Error(
          `Message submission requires the backend API server. You can reach us directly at ${settings.contactEmail}.`
        );
      }
      if (!res.ok) {
        throw new Error(data.error || 'Could not send message.');
      }
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      <div className="border-b border-zinc-800/80 pb-5 space-y-1">
        <h1 className="font-display text-3xl font-bold text-white tracking-tight">
          Contact {settings.channelName}
        </h1>
        <p className="text-sm text-zinc-400">
          Reach out for track inquiries, licensing questions, collaborations, or music submissions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-[#0D0D12] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <MediaImage
                src={settings.avatarUrl}
                alt={settings.creatorName}
                className="w-12 h-12 rounded-full object-cover border border-red-600/60"
              />
              <div>
                <p className="font-display font-semibold text-white">{settings.creatorName}</p>
                <p className="text-xs text-zinc-400">{settings.channelName}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 space-y-3 text-sm">
              <div className="flex items-center gap-2.5 text-zinc-300">
                <Mail className="w-4 h-4 text-red-400 shrink-0" />
                <span className="truncate">{settings.contactEmail}</span>
              </div>
              {isSafeUrl(settings.youtubeChannelUrl) && (
                <a
                  href={settings.youtubeChannelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium"
                >
                  <span>Official YouTube Channel</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-800 bg-[#0D0D12] p-6 space-y-4"
          >
            {submitted && (
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/30 p-3.5 flex items-center gap-2.5 text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Your message was sent and saved to the PULSE BEAT studio inbox.</span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3.5 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300" htmlFor="contact-name">
                  Your Name
                </label>
                <input
                  id="contact-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300" htmlFor="contact-email">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@example.com"
                  className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300" htmlFor="contact-subject">
                Subject
              </label>
              <input
                id="contact-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Track inquiry or licensing request"
                className="w-full h-10 px-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300" htmlFor="contact-message">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your message..."
                className="w-full p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-600 resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Sending...' : 'Send Message'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
