import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export function createAuthenticationUserDeleter() {
  const supabase = createSupabaseAdminClient();

  return async (authUserIds: string[]) => {
    for (const authUserId of [...new Set(authUserIds)]) {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { error } = await supabase.auth.admin.deleteUser(authUserId);
        if (!error) {
          lastError = null;
          break;
        }
        lastError = error;
      }
      if (lastError) throw lastError;
    }
  };
}
