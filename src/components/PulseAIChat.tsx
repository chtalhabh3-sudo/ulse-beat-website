import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ExternalLink, MessageSquare, Send, X } from 'lucide-react';
import type { ChatMessage, Song } from '../types';
import { isSafeUrl } from '../utils/media';

interface PulseAIChatProps {
  onSelectSong: (song: Song) => void;
}

const STARTER_PROMPTS = [
  'What does PULSE BEAT offer?',
  'Which songs are authorized for download?',
  'How do authorized downloads work?',
];

export function PulseAIChat({ onSelectSong }: PulseAIChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm PULSE AI Assistant. I can introduce you to PULSE BEAT, help you search for published songs by title or artist, share music video links, and explain how authorized audio downloads work.",
    },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory
            .filter((m) => !m.error && m.id !== 'welcome')
            .slice(0, -1)
            .map((m) => ({ role: m.role, text: m.text })),
        }),
      });

      const rawBody = await res.text();
      let data: { reply?: string; songs?: Song[]; error?: string } | null = null;
      if (rawBody) {
        try {
          data = JSON.parse(rawBody) as { reply?: string; songs?: Song[]; error?: string };
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            `PULSE AI Assistant returned an unexpected response (HTTP ${res.status}). Please try again.`
        );
      }

      if (!data || typeof data.reply !== 'string') {
        throw new Error('PULSE AI Assistant received an invalid response format from the server. Please try again.');
      }

      const replyText: string = data.reply;
      const suggestedSongs: Song[] = Array.isArray(data.songs) ? data.songs : [];

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          songs: suggestedSongs,
        },
      ]);
    } catch (err: unknown) {
      let friendlyError = 'Unable to reach PULSE AI Assistant right now. Please try again.';
      if (err instanceof DOMException && err.name === 'AbortError') {
        friendlyError = 'PULSE AI Assistant took too long to respond. Please try sending your message again.';
      } else if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
        friendlyError = 'Connection to PULSE AI Assistant was interrupted. Please check your connection and try again.';
      } else if (err instanceof Error && err.message) {
        friendlyError = err.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: friendlyError,
          error: true,
        },
      ]);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open ? (
        <div
          className="w-[calc(100vw-2.5rem)] sm:w-96 h-[520px] max-h-[80vh] rounded-2xl border border-red-600/45 bg-[#0A0A0D] shadow-2xl flex flex-col overflow-hidden"
          role="dialog"
          aria-label="PULSE AI Assistant"
        >
          {/* Chat Header */}
          <div className="h-14 px-4 bg-gradient-to-r from-[#16080a] via-[#11080a] to-[#0A0A0D] border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white font-display font-bold text-sm">
                PB
              </div>
              <div>
                <p className="font-display text-sm font-bold text-white leading-tight">
                  PULSE AI Assistant
                </p>
                <p className="text-[11px] text-red-400 leading-tight">
                  Live Catalog Guide
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close PULSE AI Assistant"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-red-600 text-white'
                      : msg.error
                      ? 'bg-red-950/60 border border-red-600/40 text-red-200'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-100'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Clickable Song Links Returned From Grounded Database */}
                {msg.songs && msg.songs.length > 0 && (
                  <div className="mt-2 w-[88%] space-y-1.5">
                    {msg.songs.map((song) => (
                      <div
                        key={song.id}
                        className="rounded-lg border border-zinc-800 bg-[#121218] p-2.5 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{song.title}</p>
                          <p className="text-[11px] text-zinc-400 truncate">{song.artist}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isSafeUrl(song.youtubeUrl) && song.youtubeUrl && (
                            <a
                              href={song.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Watch on YouTube"
                              className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectSong(song);
                              setOpen(false);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white text-[11px] font-semibold"
                          >
                            <span>Open</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-start">
                <div className="rounded-xl px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-400">
                  Searching PULSE BEAT catalog...
                </div>
              </div>
            )}

            {messages.length === 1 && !loading && (
              <div className="pt-2 space-y-1.5">
                <p className="text-[11px] text-zinc-500">Quick questions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTER_PROMPTS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-600/50 text-zinc-200 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 bg-[#070709] flex items-center gap-2 shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about songs, videos, downloads..."
              aria-label="Ask PULSE AI Assistant"
              className="flex-1 h-10 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-600"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open PULSE AI Assistant"
          className="inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl border border-red-400/30 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="font-display text-sm font-semibold whitespace-nowrap">
            PULSE AI Assistant
          </span>
        </button>
      )}
    </div>
  );
}
