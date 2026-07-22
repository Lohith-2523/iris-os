'use client';

import * as React from 'react';
import { createClient } from '@/lib/client';

export function AuthSync() {
  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    const bootstrap = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) await fetch('/api/auth/bootstrap', { method: 'POST' });
    };
    void bootstrap();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void fetch('/api/auth/bootstrap', { method: 'POST' });
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return null;
}
