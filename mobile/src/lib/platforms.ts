/**
 * Platform metadata for the Style tab + agent profile preview.
 * Mirrors `src/components/icons/PlatformLogos.tsx` from web — ids
 * match exactly so a platform written on iOS is recognized by the
 * web profile (and vice-versa).
 */
import {
  InstagramLogo,
  TiktokLogo,
  YoutubeLogo,
  FacebookLogo,
  LinkedinLogo,
  Globe,
} from 'phosphor-react-native'
import { COLORS } from './tokens'

export interface PlatformMeta {
  id: string
  name: string
  prefix: string
  placeholder: string
  Logo: React.ComponentType<{ size?: number; color?: string; weight?: 'fill' | 'regular' }>
  /** Brand background + ink for the icon chip. */
  bg: string
  ink: string
}

export const PLATFORM_LIST: PlatformMeta[] = [
  { id: 'instagram', name: 'Instagram',     prefix: 'https://instagram.com/',     placeholder: 'https://instagram.com/yourhandle',   Logo: InstagramLogo, bg: '#E1306C',       ink: '#FFFFFF' },
  { id: 'tiktok',    name: 'TikTok',        prefix: 'https://tiktok.com/@',       placeholder: 'https://tiktok.com/@yourhandle',     Logo: TiktokLogo,    bg: '#000000',       ink: '#FFFFFF' },
  { id: 'youtube',   name: 'YouTube',       prefix: 'https://youtube.com/@',      placeholder: 'https://youtube.com/@yourchannel',   Logo: YoutubeLogo,   bg: '#FF0000',       ink: '#FFFFFF' },
  { id: 'facebook',  name: 'Facebook',      prefix: 'https://facebook.com/',      placeholder: 'https://facebook.com/yourpage',      Logo: FacebookLogo,  bg: '#1877F2',       ink: '#FFFFFF' },
  { id: 'linkedin',  name: 'LinkedIn',      prefix: 'https://linkedin.com/in/',   placeholder: 'https://linkedin.com/in/yourprofile', Logo: LinkedinLogo, bg: '#0A66C2',       ink: '#FFFFFF' },
  { id: 'website',   name: 'Personal Site', prefix: 'https://',                   placeholder: 'https://yoursite.com',               Logo: Globe,         bg: COLORS.graphite, ink: '#FFFFFF' },
]

export function getPlatformMeta(id: string): PlatformMeta | null {
  return PLATFORM_LIST.find((p) => p.id === id) ?? null
}
