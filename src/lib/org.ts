import { NextRequest } from 'next/server';
import { prisma } from './db';
import { deobfuscateEmail } from './utils';

export async function getOrganization(request: NextRequest) {
  try {
    const cookieEmail = request.cookies.get('currentUserEmail')?.value;
    if (cookieEmail) {
      const email = deobfuscateEmail(cookieEmail);
      const user = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });
      if (user?.organization) {
        return user.organization;
      }
    }
  } catch (error) {
    console.error('Error getting organization from session:', error);
  }
  
  // Fallback: Return the first organization ordered by creation time to ensure determinism
  return await prisma.organization.findFirst({
    orderBy: { createdAt: 'asc' },
  });
}
