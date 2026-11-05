import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Profile = {
  public_id: number; display_name: string; avatar_url: string | null;
  charisma_points?: number; wealth_points?: number;
  /** Admin-assigned special ID, shown instead of public_id when set. */
  special_id?: string | null; vip_level?: number;
};

/** Current session plus the signed-in user's public profile row (if the schema exists). */
export function useAccount() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    let active = true;
    (async () => {
      // Older databases may miss the special-ID or level columns: fall back step by step.
      const selects = [
        'public_id, display_name, avatar_url, charisma_points, wealth_points, special_id, vip_level',
        'public_id, display_name, avatar_url, charisma_points, wealth_points',
        'public_id, display_name, avatar_url',
      ];
      let res = await supabase.from('profiles').select(selects[0]!).eq('auth_id', userId).maybeSingle();
      for (const cols of selects.slice(1)) {
        if (!res.error) break;
        res = await supabase.from('profiles').select(cols).eq('auth_id', userId).maybeSingle();
      }
      if (active) setProfile((res.data as Profile | null) ?? null);
    })();
    return () => { active = false; };
  }, [userId]);

  return { session, profile, ready };
}
