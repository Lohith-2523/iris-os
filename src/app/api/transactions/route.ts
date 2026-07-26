import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';

function parseImportedDate(value: unknown) {
  if (value instanceof Date) return value;
  const raw = String(value ?? '').trim();
  const dayFirstMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirstMatch) {
    const [, day, month, year] = dayFirstMatch;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return parsed.getUTCFullYear() === Number(year) &&
      parsed.getUTCMonth() === Number(month) - 1 &&
      parsed.getUTCDate() === Number(day)
      ? parsed
      : new Date('invalid');
  }
  return new Date(raw);
}

export async function GET(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const user = await getRequestUser(request);
    if (!user || !isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const transactions = await prisma.transaction.findMany({
      where: { orgId: org.id },
      orderBy: { date: 'desc' },
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const user = await getRequestUser(request);
    if (!user || !isOrganizationAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const clients = await prisma.client.findMany({
      where: { orgId: org.id },
      select: { id: true, name: true },
    });
    const clientsById = new Map(clients.map((client) => [client.id, client]));
    const clientsByName = new Map(clients.map((client) => [client.name.trim().toLowerCase(), client]));
    const allowedCategories = new Set(['Revenue', 'Expense', 'AI Subscription']);
    const allowedTypes = new Set(['UPI', 'IMPS', 'NEFT', 'Cash', 'Others']);
    const resolveClientId = (value: unknown, nameValue: unknown) => {
      const id = typeof value === 'string' ? value : '';
      if (id && clientsById.has(id)) return id;
      const name = typeof nameValue === 'string' ? nameValue.trim().toLowerCase() : '';
      return name ? clientsByName.get(name)?.id ?? null : null;
    };

    if (body.bulk && Array.isArray(body.transactions)) {
      const categoryByLabel = new Map([
        ['revenue', 'Revenue'],
        ['expense', 'Expense'],
        ['ai subscription', 'AI Subscription'],
      ]);
      const typeByLabel = new Map([
        ['upi', 'UPI'],
        ['imps', 'IMPS'],
        ['neft', 'NEFT'],
        ['cash', 'Cash'],
        ['others', 'Others'],
      ]);
      const configuredBankAccounts = new Map(
        org.bankNames.map((account) => [account.trim().toLocaleLowerCase(), account]),
      );
      const transactionData = [];
      const rejectedRows: Array<{ row: number | null; reason: string }> = [];

      for (const t of body.transactions) {
        const row = Number.isInteger(t.sourceRow) ? t.sourceRow : null;
        const amount = typeof t.amount === 'number'
          ? t.amount
          : Number(String(t.amount ?? '').replace(/[,\s₹$€£]/g, '').replace(/^\((.*)\)$/, '-$1'));
        if (!Number.isFinite(amount)) {
          rejectedRows.push({ row, reason: 'Amount must be a number.' });
          continue;
        }

        const rawCategory = String(t.category || '').trim();
        const category = rawCategory
          ? categoryByLabel.get(rawCategory.toLocaleLowerCase())
          : (amount >= 0 ? 'Revenue' : 'Expense');
        if (!category || !allowedCategories.has(category)) {
          rejectedRows.push({ row, reason: 'Category must be Revenue, Expense, or AI Subscription.' });
          continue;
        }
        const rawType = String(t.type || '').trim();
        const transactionType = rawType ? typeByLabel.get(rawType.toLocaleLowerCase()) : 'Others';
        if (!transactionType || !allowedTypes.has(transactionType)) {
          rejectedRows.push({ row, reason: 'Transaction type must be UPI, IMPS, NEFT, Cash, or Others.' });
          continue;
        }
        const requestedAccount = String(t.yourAccount || '').trim();
        const yourAccount = configuredBankAccounts.get(requestedAccount.toLocaleLowerCase()) || requestedAccount;
        if (org.bankNames.length > 0 && !configuredBankAccounts.has(requestedAccount.toLocaleLowerCase())) {
          rejectedRows.push({ row, reason: 'Bank account is not configured for this organization.' });
          continue;
        }
        let finalAmount = amount;
        if (category === 'Expense' || category === 'AI Subscription') {
          finalAmount = -Math.abs(amount);
        } else if (category === 'Revenue') {
          finalAmount = Math.abs(amount);
        }

        const date = parseImportedDate(t.date || new Date());
        if (Number.isNaN(date.getTime())) {
          rejectedRows.push({ row, reason: 'Date is invalid.' });
          continue;
        }
        const clientId = category === 'Revenue' ? resolveClientId(t.clientId, t.client) : null;
        if (category === 'Revenue' && t.client && !clientId) {
          rejectedRows.push({ row, reason: 'Revenue client was not found in this organization.' });
          continue;
        }
        transactionData.push({
          date,
          details: t.details || 'Imported Transaction',
          category,
          type: transactionType,
          transactorAccount: t.transactorAccount || '',
          yourAccount,
          amount: finalAmount,
          referenceNumber: t.referenceNumber || null,
          comments: t.comments || null,
          clientId,
          orgId: org.id,
        });
      }
      if (transactionData.length === 0) {
        return NextResponse.json({
          error: 'No valid transaction rows were found in the uploaded workbook.',
          rejected: rejectedRows.slice(0, 20),
        }, { status: 400 });
      }
      const createdTransactions = await prisma.transaction.createManyAndReturn({
        data: transactionData,
      });
      return NextResponse.json({
        success: true,
        count: transactionData.length,
        transactions: createdTransactions.map((transaction) => ({
          ...transaction,
          client: transaction.clientId ? clientsById.get(transaction.clientId) ?? null : null,
        })),
        rejected: rejectedRows.slice(0, 20),
        rejectedCount: rejectedRows.length,
      });
    } else {
      // Single transaction
      const { date, details, category, type, transactorAccount, yourAccount, amount, referenceNumber, comments, clientId } = body;

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
      }

      const targetCategory = category || (parsedAmount >= 0 ? 'Revenue' : 'Expense');
      if (!allowedCategories.has(targetCategory)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      const targetType = String(type || 'Others');
      if (!allowedTypes.has(targetType)) {
        return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
      }
      const targetAccount = String(yourAccount || '');
      if (org.bankNames.length > 0 && !org.bankNames.includes(targetAccount)) {
        return NextResponse.json({ error: 'Select a configured bank account' }, { status: 400 });
      }
      let finalAmount = parsedAmount;
      if (targetCategory === 'Expense' || targetCategory === 'AI Subscription') {
        finalAmount = -Math.abs(parsedAmount);
      } else if (targetCategory === 'Revenue') {
        finalAmount = Math.abs(parsedAmount);
      }

      const newTx = await prisma.transaction.create({
        data: {
          date: new Date(date || new Date()),
          details: details || 'Manual Entry',
          category: targetCategory,
          type: targetType,
          transactorAccount: transactorAccount || '',
          yourAccount: targetAccount,
          amount: finalAmount,
          referenceNumber: referenceNumber || null,
          comments: comments || null,
          clientId: targetCategory === 'Revenue' ? resolveClientId(clientId, null) : null,
          orgId: org.id,
        },
        include: { client: { select: { id: true, name: true } } },
      });

      return NextResponse.json(newTx);
    }
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    const user = await getRequestUser(request);
    if (!org || !user || !isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });

    const result = await prisma.transaction.deleteMany({ where: { id, orgId: org.id } });
    if (result.count === 0) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Unable to delete transaction' }, { status: 500 });
  }
}
