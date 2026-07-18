'use client';

import * as React from 'react';
import { createClient } from '@/lib/client';
import { obfuscateEmail } from '@/lib/utils';

export function AuthSync() {
  const supabase = createClient();

  React.useEffect(() => {
    const syncAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const email = session.user.email;
        const currentLocal = localStorage.getItem('currentUserEmail');
        if (currentLocal !== email) {
          localStorage.setItem('currentUserEmail', email);
          localStorage.setItem('remember_me', 'true');
          document.cookie = `currentUserEmail=${obfuscateEmail(email)}; path=/; max-age=2592000`;
          
          // Fetch role
          try {
            const res = await fetch(`/api/user?email=${encodeURIComponent(obfuscateEmail(email))}`);
            if (res.ok) {
              const userData = await res.json();
              const role = userData.role?.toLowerCase() || 'admin';
              document.cookie = `currentUserRole=${role}; path=/; max-age=2592000`;
            } else {
              document.cookie = 'currentUserRole=admin; path=/; max-age=2592000';
            }
          } catch (e) {
            document.cookie = 'currentUserRole=admin; path=/; max-age=2592000';
          }
          window.dispatchEvent(new Event('user-updated'));
        }
      }
    };

    syncAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        const email = session.user.email;
        const currentLocal = localStorage.getItem('currentUserEmail');
        if (currentLocal !== email) {
          localStorage.setItem('currentUserEmail', email);
          localStorage.setItem('remember_me', 'true');
          document.cookie = `currentUserEmail=${obfuscateEmail(email)}; path=/; max-age=2592000`;
          
          try {
            const res = await fetch(`/api/user?email=${encodeURIComponent(obfuscateEmail(email))}`);
            if (res.ok) {
              const userData = await res.json();
              const role = userData.role?.toLowerCase() || 'admin';
              document.cookie = `currentUserRole=${role}; path=/; max-age=2592000`;
            } else {
              document.cookie = 'currentUserRole=admin; path=/; max-age=2592000';
            }
          } catch (e) {
            document.cookie = 'currentUserRole=admin; path=/; max-age=2592000';
          }
          window.dispatchEvent(new Event('user-updated'));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return null;
}
