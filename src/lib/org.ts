import { NextRequest } from 'next/server';
import { prisma } from './db';
import { deobfuscateEmail } from './utils';

export async function getRequestUser(request: NextRequest) {
  const cookieEmail = request.cookies.get('currentUserEmail')?.value;
  if (!cookieEmail) {
    return null;
  }

  const email = deobfuscateEmail(cookieEmail);
  return prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: 'insensitive',
      },
    },
    include: {
      organization: true,
      client: true,
    },
  });
}

export async function getOrganization(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (user?.organization) {
      return user.organization;
    }
  } catch (error) {
    console.error('Error getting organization from session:', error);
  }

  return null;
}
