import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deobfuscateEmail } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const cookieEmail = request.cookies.get('currentUserEmail')?.value;
    if (!cookieEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = deobfuscateEmail(cookieEmail);
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const sessions = await prisma.prismChatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
