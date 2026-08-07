import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { legalDocumentSchema } from '@/lib/legal-documents/types';
import { generateLegalDocumentPdf } from '@/lib/legal-documents/pdf';

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role.toLowerCase() === 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const parsed = legalDocumentSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Complete every required document field.', issues: parsed.error.issues }, { status: 400 });
  try {
    const pdf = await generateLegalDocumentPdf(parsed.data);
    const filename = `${parsed.data.documentNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    return new NextResponse(new Uint8Array(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Unable to generate legal document PDF:', error);
    return NextResponse.json({ error: 'Unable to generate document PDF.' }, { status: 500 });
  }
}
