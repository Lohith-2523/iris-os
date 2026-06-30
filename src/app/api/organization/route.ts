import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    return NextResponse.json(org);
  } catch (error: any) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, plan, hasAddon, agencyTypes, bankNames } = body;

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Limit check
    let maxAllowed = 0;
    const planToCheck = plan !== undefined ? plan : org.plan;
    const hasAddonToCheck = hasAddon !== undefined ? hasAddon : org.hasAddon;
    if (planToCheck === 'BASIC') {
      maxAllowed = hasAddonToCheck ? 2 : 1;
    } else if (planToCheck === 'PRO') {
      maxAllowed = 5;
    } else if (planToCheck === 'ADVANCED') {
      maxAllowed = 1000; // unlimited
    } else {
      return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 });
    }

    if (agencyTypes && agencyTypes.length > maxAllowed) {
      return NextResponse.json({
        error: `Selected agency types exceed the limit for the ${planToCheck} plan${planToCheck === 'BASIC' && hasAddonToCheck ? ' with add-on' : ''}. Allowed max: ${maxAllowed}.`
      }, { status: 400 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: org.id },
      data: {
        name: name !== undefined ? name : org.name,
        plan: plan !== undefined ? plan : org.plan,
        hasAddon: hasAddon !== undefined ? hasAddon : org.hasAddon,
        agencyTypes: agencyTypes !== undefined ? agencyTypes : org.agencyTypes,
        bankNames: bankNames !== undefined ? bankNames : org.bankNames,
      },
    });

    return NextResponse.json(updatedOrg);
  } catch (error: any) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
