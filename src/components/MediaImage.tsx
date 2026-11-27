import { useState } from 'react';
import { Music2 } from 'lucide-react';
import { isSafeUrl } from '../utils/media';

interface MediaImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function MediaImage({ src, alt, className = '', fallbackLabel }: MediaImageProps) {
  const [failed, setFailed] = useState(false);
  const valid = isSafeUrl(src) && !failed;

  if (!valid || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-[#140a0c] to-black text-zinc-400 select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <Music2 className="w-8 h-8 text-red-500/70 mb-2" />
        {fallbackLabel ? (
          <span className="text-xs font-medium text-zinc-400 px-3 text-center line-clamp-2">
            {fallbackLabel}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
