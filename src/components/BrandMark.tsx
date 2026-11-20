import { useState } from 'react';
import { Wind } from 'lucide-react';

export function AirwiseLogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="36" height="36" rx="9" fill="#11382B" />
      <path
        d="M9 14.5C12.5 14.5 14.2 11 18.2 11C21.5 11 23.6 12.9 27 12.9"
        stroke="#6EE7B7"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 19.5C13.5 19.5 16.5 16.5 21 16.5C23.8 16.5 25.5 17.6 27 18.4"
        stroke="#D1FAE5"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M11 24.5C15.5 24.5 19.8 22 25 22.8"
        stroke="#34D399"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export function ResilientImage({ src, alt, fallbackTitle, className = '' }: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#11382B] to-[#1F654D] text-[#E6F4EE] p-6 ${className}`}
      >
        <Wind className="h-8 w-8 mb-2 opacity-80" aria-hidden="true" />
        <span className="text-sm font-medium text-center">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
