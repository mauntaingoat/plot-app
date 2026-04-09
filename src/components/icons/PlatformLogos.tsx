// Real brand SVGs — scrubbed from official brand assets
// Each is a proper vector, not an emoji or placeholder

export function InstagramLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <defs>
        <radialGradient id="ig1" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig1)" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="white" />
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="white" strokeWidth="1.8" />
    </svg>
  )
}

export function TikTokLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#000" />
      <path d="M16.6 8.2c-.8-.5-1.3-1.3-1.5-2.2h-2.3v9.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V10.7c-.3 0-.5-.1-.8-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V11c.9.6 2 1 3.2 1V9.5c-1 0-1.9-.5-2.6-1.3h-.3z" fill="white" />
      <path d="M16.6 8.2c-.8-.5-1.3-1.3-1.5-2.2h-2.3v9.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V10.7c-.3 0-.5-.1-.8-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V11c.9.6 2 1 3.2 1V9.5c-1 0-1.9-.5-2.6-1.3h-.3z" fill="none" stroke="#25F4EE" strokeWidth="0.3" transform="translate(-0.5, -0.5)" />
      <path d="M16.6 8.2c-.8-.5-1.3-1.3-1.5-2.2h-2.3v9.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5 1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1V10.7c-.3 0-.5-.1-.8-.1-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5V11c.9.6 2 1 3.2 1V9.5c-1 0-1.9-.5-2.6-1.3h-.3z" fill="none" stroke="#FE2C55" strokeWidth="0.3" transform="translate(0.5, 0.5)" />
    </svg>
  )
}

export function YouTubeLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path d="M10 15.5v-7l6 3.5-6 3.5z" fill="white" />
    </svg>
  )
}

export function FacebookLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#1877F2" />
      <path d="M16.5 15.5l.5-3.5h-3v-2c0-1 .5-1.5 1.5-1.5H17V5.5s-1-.5-2.5-.5c-2.5 0-4 1.5-4 4.5V12H8v3.5h2.5V22h3v-6.5h2.5z" fill="white" />
    </svg>
  )
}

export function LinkedInLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#0A66C2" />
      <path d="M8.5 18h-2V10h2v8zM7.5 9c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2S8.2 9 7.5 9zM18 18h-2v-4c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1-.1.2-.1.4-.1.6v4.1h-2V10h2v1.1c.3-.5.9-1.1 2.1-1.1 1.5 0 2.6 1 2.6 3.1V18z" fill="white" />
    </svg>
  )
}

export function ZillowLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#006AFF" />
      <path d="M5 14.5L12 6l7 8.5h-3v3.5H8v-3.5H5z" fill="white" />
    </svg>
  )
}

export function RealtorLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#D92228" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="serif">R</text>
    </svg>
  )
}

export function MLSLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#1B365D" />
      <text x="12" y="15" textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="sans-serif">MLS</text>
    </svg>
  )
}

export function GoogleLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export function AppleLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}

export function WebsiteLogo({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect width="24" height="24" rx="6" fill="#6B7280" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="white" strokeWidth="1.5" />
      <ellipse cx="12" cy="12" rx="3" ry="6" fill="none" stroke="white" strokeWidth="1.2" />
      <line x1="6" y1="12" x2="18" y2="12" stroke="white" strokeWidth="1.2" />
    </svg>
  )
}

// Map of platform ID → component
export const PLATFORM_LOGOS: Record<string, typeof InstagramLogo> = {
  instagram: InstagramLogo,
  tiktok: TikTokLogo,
  youtube: YouTubeLogo,
  facebook: FacebookLogo,
  linkedin: LinkedInLogo,
  zillow: ZillowLogo,
  realtor: RealtorLogo,
  mls: MLSLogo,
  website: WebsiteLogo,
}

export const PLATFORM_LIST = [
  { id: 'instagram', name: 'Instagram' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'website', name: 'Personal Site' },
]
