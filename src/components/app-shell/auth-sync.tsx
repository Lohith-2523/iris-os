'use client';

import * as React from 'react';
import { createClient } from '@/lib/client';
import { obfuscateEmail, deobfuscateEmail } from '@/lib/utils';

export function AuthSync() {
  const supabase = createClient();

  React.useEffect(() => {
    // Sync cookie email to localStorage for custom OAuth flows
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      if (match) return match[2];
      return null;
    };

    const cookieEmailObfuscated = getCookie('currentUserEmail');
    if (cookieEmailObfuscated) {
      try {
        const email = deobfuscateEmail(cookieEmailObfuscated);
        if (email && localStorage.getItem('currentUserEmail') !== email) {
          localStorage.setItem('currentUserEmail', email);
          localStorage.setItem('remember_me', 'true');
          window.dispatchEvent(new Event('user-updated'));
        }
      } catch (e) {
        console.error('Error deobfuscating cookie email:', e);
      }
    }

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
