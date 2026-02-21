import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client for use in Client Components
export function createSupabaseBrowser() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// Simple client for server-side usage (API routes, server components)
export function createSupabaseServer() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

// Generate or retrieve a persistent anonymous voter ID
export function getVoterId(): string {
  if (typeof window === 'undefined') return '';

  let voterId = localStorage.getItem('livepulse_voter_id');
  if (!voterId) {
    voterId = crypto.randomUUID();
    localStorage.setItem('livepulse_voter_id', voterId);
  }
  return voterId;
}

// Generate a random anonymous display name
const ANIMALS = [
  'Falcon', 'Panda', 'Otter', 'Fox', 'Wolf', 'Hawk', 'Lynx', 'Bear',
  'Raven', 'Elk', 'Heron', 'Cobra', 'Tiger', 'Owl', 'Dolphin', 'Eagle',
  'Phoenix', 'Jaguar', 'Crane', 'Viper',
];

export function generateAnonName(): string {
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `Anonymous ${animal}`;
}
