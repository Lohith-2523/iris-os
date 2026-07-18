import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server';
import { prisma } from '@/lib/db';
import { obfuscateEmail } from '@/lib/utils';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect url
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      const email = data.user.email;
      
      if (email) {
        // Ensure user exists in database
        let dbUser = await prisma.user.findUnique({
          where: { email }
        });

        if (!dbUser) {
          const org = await prisma.organization.findFirst({
            orderBy: { createdAt: 'asc' }
          });
          if (org) {
            dbUser = await prisma.user.create({
              data: {
                email,
                name: data.user.user_metadata?.full_name || email.split('@')[0],
                role: 'ADMIN', // Default role
                orgId: org.id,
                avatarUrl: data.user.user_metadata?.avatar_url || null,
              }
            });
          }
        }

        const role = dbUser?.role?.toLowerCase() || 'admin';
        const redirectUrl = role === 'client' ? '/client-dashboard' : role === 'member' ? '/teams-dashboard' : next;
        
        const response = NextResponse.redirect(`${origin}${redirectUrl}`);
        
        // Also set cookies on the server response to ensure middleware/layout receives them immediately
        response.cookies.set('currentUserEmail', obfuscateEmail(email), { path: '/', maxAge: 2592000 });
        response.cookies.set('currentUserRole', role, { path: '/', maxAge: 2592000 });
        
        return response;
      }
    }
  }

  // If OAuth failed or no code, redirect to login page
  return NextResponse.redirect(`${origin}/login`);
}
