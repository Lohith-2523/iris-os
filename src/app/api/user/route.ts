import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deobfuscateEmail } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');

    if (!emailParam) {
      return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
    }

    const email = deobfuscateEmail(emailParam).toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
