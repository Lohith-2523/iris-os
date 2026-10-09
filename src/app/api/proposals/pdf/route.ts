import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/org';
import { proposalSchema } from '@/lib/proposals/types';
import { generateProposalPdf } from '@/lib/proposals/pdf';

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Oops! Please sign in to continue.' }, { status: 401 });
  if (user.role.toLowerCase() === 'client') return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

  const parsed = proposalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Complete every required proposal field.', issues: parsed.error.issues }, { status: 400 });
  }

  const proposal = {
    ...parsed.data,
    agencyName: parsed.data.agencyName || user.organization.name,
    agencyEmail: parsed.data.agencyEmail || user.organization.billingEmail || user.email,
    brandColor: parsed.data.brandColor || user.organization.invoiceBrandColor,
    logoDataUrl: parsed.data.logoDataUrl || user.organization.invoiceLogoDataUrl || '',
  };

  try {
    const pdf = await generateProposalPdf(proposal);
    const filename = `${proposal.proposalNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('Unable to generate proposal PDF:', error);
    return NextResponse.json({ error: 'Unable to generate proposal PDF.' }, { status: 500 });
  }
}
