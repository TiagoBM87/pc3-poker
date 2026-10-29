import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { VoteValue } from '../types/poker';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function randomSuffix(length = 4): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

export function createRoomId(title: string): string {
  const base = slugify(title) || 'sala';
  return `${base}-${randomSuffix()}`;
}

/**
 * Accepts a raw room code, a hash URL (`#/room/abc`) or a full URL and
 * returns the room id, or null when nothing valid can be extracted.
 */
export function parseRoomId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const roomPathMatch = trimmed.match(/\/room\/([a-zA-Z0-9_-]+)/);
  const queryMatch = trimmed.match(/[?&]room=([a-zA-Z0-9_-]+)/);
  const candidate = roomPathMatch
    ? roomPathMatch[1]
    : queryMatch
      ? queryMatch[1]
      : trimmed.replace(/^#\/?/, '').replace(/^\/+|\/+$/g, '');

  if (!/^[a-zA-Z0-9_-]{3,64}$/.test(candidate)) return null;
  return candidate.toLowerCase();
}

export function buildRoomLink(roomId: string): string {
  return `${window.location.origin}${window.location.pathname}#/room/${roomId}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Deterministic gradient per participant name. */
export function avatarGradient(name: string): string {
  const palettes = [
    'from-indigo-500 to-violet-500',
    'from-sky-500 to-cyan-400',
    'from-emerald-500 to-teal-400',
    'from-amber-500 to-orange-400',
    'from-rose-500 to-pink-500',
    'from-fuchsia-500 to-purple-500',
    'from-lime-500 to-emerald-400'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
}

export function voteAccent(value: VoteValue): string {
  if (value === '?') return 'text-amber-300 border-amber-400/40 bg-amber-400/10';
  if (value === '☕') return 'text-rose-300 border-rose-400/40 bg-rose-400/10';
  return 'text-indigo-200 border-indigo-400/40 bg-indigo-400/10';
}

export function formatAverage(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
}

/** Turns technical backend errors into short, actionable messages. */
export function describeError(error: unknown): string {
  const code = (error as { code?: string } | null)?.code ?? '';

  if (code.includes('permission_denied') || code.includes('PERMISSION_DENIED')) {
    return 'Sem permissão para acessar esta sala. Confira as regras do Realtime Database.';
  }
  if (code.includes('unavailable') || code.includes('network')) {
    return 'Não foi possível conectar ao Firebase. Verifique sua rede/VPN e tente novamente.';
  }
  if (code.includes('invalid_database') || code.includes('invalid_argument')) {
    return 'Configuração do Firebase inválida. Confira VITE_FIREBASE_DATABASE_URL e as demais variáveis.';
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Erro inesperado. Tente novamente.';
}
