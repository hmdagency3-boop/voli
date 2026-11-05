import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Profile = { public_id: number; display_name: string; avatar_url: string | null };

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
    supabase.from('profiles').select('public_id, display_name, avatar_url').eq('auth_id', userId).maybeSingle()
      .then(({ data }) => { if (active) setProfile((data as Profile | null) ?? null); });
    return () => { active = false; };
  }, [userId]);

  return { session, profile, ready };
}
