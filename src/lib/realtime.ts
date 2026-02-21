'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createSupabaseBrowser } from './supabase';
import type { Message, PollOption, Reaction, Session } from './types';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Hook: Subscribe to new chat messages for a session
export function useRealtimeMessages(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = useRef(createSupabaseBrowser()).current;

  useEffect(() => {
    // Fetch existing messages
    supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const updated = [...prev, payload.new as Message];
            // Keep only the last 50 messages
            return updated.slice(-50);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  return messages;
}

// Hook: Subscribe to reaction count changes
export function useRealtimeReactions(sessionId: string) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const supabase = useRef(createSupabaseBrowser()).current;

  useEffect(() => {
    // Fetch current reaction counts
    supabase
      .from('reactions')
      .select('*')
      .eq('session_id', sessionId)
      .then(({ data }) => {
        if (data) setReactions(data);
      });

    // Subscribe to reaction changes
    const channel = supabase
      .channel(`reactions:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setReactions((prev) =>
              prev.map((r) =>
                r.id === (payload.new as Reaction).id
                  ? (payload.new as Reaction)
                  : r
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setReactions((prev) => [...prev, payload.new as Reaction]);
          } else if (payload.eventType === 'DELETE') {
            setReactions((prev) =>
              prev.filter((r) => r.id !== (payload.old as Reaction).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  return reactions;
}

// Hook: Subscribe to poll option vote count changes
export function useRealtimePollOptions(pollId: string | null) {
  const [options, setOptions] = useState<PollOption[]>([]);
  const supabase = useRef(createSupabaseBrowser()).current;

  useEffect(() => {
    if (!pollId) {
      setOptions([]);
      return;
    }

    // Fetch current options
    supabase
      .from('poll_options')
      .select('*')
      .eq('poll_id', pollId)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setOptions(data);
      });

    // Subscribe to vote count changes
    const channel = supabase
      .channel(`poll_options:${pollId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'poll_options',
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          setOptions((prev) =>
            prev.map((o) =>
              o.id === (payload.new as PollOption).id
                ? (payload.new as PollOption)
                : o
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, supabase]);

  return options;
}

// Hook: Subscribe to session changes (active poll, session status)
export function useRealtimeSession(sessionCode: string) {
  const [session, setSession] = useState<Session | null>(null);
  const [activePoll, setActivePoll] = useState<string | null>(null);
  const supabase = useRef(createSupabaseBrowser()).current;

  useEffect(() => {
    // Fetch the session
    supabase
      .from('sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .eq('is_active', true)
      .single()
      .then(({ data }) => {
        if (data) {
          setSession(data);
          // Fetch active poll for this session
          supabase
            .from('polls')
            .select('*')
            .eq('session_id', data.id)
            .eq('is_active', true)
            .single()
            .then(({ data: pollData }) => {
              if (pollData) setActivePoll(pollData.id);
            });
        }
      });

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel(`session:${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `session_code=eq.${sessionCode}`,
        },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .subscribe();

    // Subscribe to poll activation changes
    let pollChannel: RealtimeChannel | null = null;
    if (session?.id) {
      pollChannel = supabase
        .channel(`polls:${session.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'polls',
            filter: `session_id=eq.${session.id}`,
          },
          (payload) => {
            const poll = payload.new as { id: string; is_active: boolean };
            if (poll.is_active) {
              setActivePoll(poll.id);
            } else if (payload.eventType === 'UPDATE' && !poll.is_active) {
              setActivePoll((prev) => (prev === poll.id ? null : prev));
            }
          }
        )
        .subscribe();
    }

    return () => {
      supabase.removeChannel(sessionChannel);
      if (pollChannel) supabase.removeChannel(pollChannel);
    };
  }, [sessionCode, session?.id, supabase]);

  return { session, activePoll };
}

// Hook: Track online presence count using Supabase Presence
export function usePresenceCount(sessionCode: string, displayName: string) {
  const [count, setCount] = useState(0);
  const supabase = useRef(createSupabaseBrowser()).current;

  useEffect(() => {
    const channel = supabase.channel(`presence:${sessionCode}`, {
      config: { presence: { key: displayName } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ display_name: displayName, joined_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionCode, displayName, supabase]);

  return count;
}
