import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrganization, getRequestUser, isOrganizationAdmin } from '@/lib/org';
import { invoicePaymentStatus } from '@/lib/invoices/billing-profile';
import { cursorHeaders, descendingCursorWhere, finishCursorPage, readCursorPage } from '@/lib/cursor-pagination';
import { randomUUID } from 'node:crypto';
import { canManageWorkspacePage } from '@/lib/workspace-page-permissions';

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
    if (!user || !canManageWorkspacePage(user, 'finance')) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

    const pageRequest = readCursorPage(request);
    const transactions = await prisma.transaction.findMany({
      where: { orgId: org.id, ...descendingCursorWhere(pageRequest.cursor, 'date') },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      take: pageRequest.take,
      include: {
        client: { select: { id: true, name: true } },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            paidAmount: true,
            status: true,
          },
        },
      },
    });

    const page = finishCursorPage(transactions, pageRequest.limit, (transaction) => transaction.date);
    return NextResponse.json(page.items, { headers: cursorHeaders(page, pageRequest.limit) });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }
    const user = await getRequestUser(request);
    if (!user || !canManageWorkspacePage(user, 'finance')) return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });

    const body = await request.json();
    const clients = await prisma.client.findMany({
      where: { orgId: org.id },
      select: {
        id: true,
        name: true,
        legalEntityName: true,
        billingAddressLine1: true,
        billingAddressLine2: true,
        billingCity: true,
        billingState: true,
        billingPostalCode: true,
        billingCountry: true,
        gstNumber: true,
      },
    });
    const clientsById = new Map(clients.map((client) => [client.id, client]));
    const clientsByImportReference = new Map(clients.flatMap((client) => [
      [client.id.toLocaleLowerCase(), client] as const,
      [`${client.name} [${client.id}]`.toLocaleLowerCase(), client] as const,
    ]));
    const allowedCategories = new Set(['Revenue', 'Expense']);
    const allowedTypes = new Set(['UPI', 'IMPS', 'NEFT', 'Cash', 'Others']);
    if (body.bulk && Array.isArray(body.transactions)) {
      const categoryByLabel = new Map([
        ['revenue', 'Revenue'],
        ['expense', 'Expense'],
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
      const outstandingInvoices = await prisma.invoice.findMany({
        where: {
          orgId: org.id,
          documentType: 'INVOICE',
          status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
        },
        select: {
          id: true,
          invoiceNumber: true,
          description: true,
          clientId: true,
        },
      });
      const invoicesByNumber = new Map(
        outstandingInvoices.map((invoice) => [invoice.invoiceNumber.trim().toLocaleLowerCase(), invoice]),
      );
      const transactionData: Array<{
        date: Date;
        details: string;
        category: string;
        type: string;
        transactorAccount: string;
        yourAccount: string;
        amount: number;
        referenceNumber: string | null;
        comments: string | null;
        clientId: string | null;
        invoiceId: string | null;
        orgId: string;
        historicalRevenue: boolean;
      }> = [];
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
          rejectedRows.push({ row, reason: 'Category must be Revenue or Expense.' });
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
        if (category === 'Expense') {
          finalAmount = -Math.abs(amount);
        } else if (category === 'Revenue') {
          finalAmount = Math.abs(amount);
        }

        if (!t.date) {
          rejectedRows.push({ row, reason: 'Date is required.' });
          continue;
        }
        const date = parseImportedDate(t.date);
        if (Number.isNaN(date.getTime())) {
          rejectedRows.push({ row, reason: 'Date is invalid.' });
          continue;
        }
        const invoiceNumber = String(t.invoiceNumber || '').trim();
        const isHistoricalRevenue = body.historicalRevenue === true && t.historicalRevenue === true;
        if (isHistoricalRevenue && finalAmount <= 0) {
          rejectedRows.push({ row, reason: 'Historical revenue amount must be greater than zero.' });
          continue;
        }
        const selectedInvoice = category === 'Revenue' && !isHistoricalRevenue
          ? invoicesByNumber.get(invoiceNumber.toLocaleLowerCase()) || null
          : null;
        if (category === 'Revenue' && !isHistoricalRevenue && !selectedInvoice) {
          rejectedRows.push({ row, reason: 'Select a current unpaid or partially paid invoice number.' });
          continue;
        }
        if (category === 'Revenue' && !yourAccount) {
          rejectedRows.push({ row, reason: 'Bank account is required for revenue.' });
          continue;
        }
        const historicalClient = isHistoricalRevenue
          ? clientsByImportReference.get(String(t.clientReference || '').trim().toLocaleLowerCase()) || null
          : null;
        if (isHistoricalRevenue && !historicalClient) {
          rejectedRows.push({ row, reason: 'Select a valid client from the Historical Revenue template.' });
          continue;
        }
        if (isHistoricalRevenue && !String(t.details || '').trim()) {
          rejectedRows.push({ row, reason: 'Description is required for historical revenue.' });
          continue;
        }
        transactionData.push({
          date,
          details: isHistoricalRevenue
            ? String(t.details).trim()
            : category === 'Revenue'
            ? selectedInvoice?.description?.trim() || `Invoice ${selectedInvoice?.invoiceNumber || ''}`.trim()
            : t.details || 'Imported Transaction',
          category,
          type: transactionType,
          transactorAccount: '',
          yourAccount,
          amount: finalAmount,
          referenceNumber: null,
          comments: category === 'Revenue' ? null : t.comments || null,
          clientId: isHistoricalRevenue ? historicalClient?.id || null : category === 'Revenue' ? selectedInvoice?.clientId || null : null,
          invoiceId: selectedInvoice?.id || null,
          orgId: org.id,
          historicalRevenue: isHistoricalRevenue,
        });
      }
      if (transactionData.length === 0) {
        return NextResponse.json({
          error: 'No valid transaction rows were found in the uploaded workbook.',
          rejected: rejectedRows.slice(0, 20),
        }, { status: 400 });
      }
      const createdTransactions = await prisma.$transaction(async (tx) => {
        const historicalInvoices = [];
        const transactionRecords = [];
        for (const transaction of transactionData) {
          let invoiceId = transaction.invoiceId;
          if (transaction.historicalRevenue && transaction.clientId) {
            const client = clientsById.get(transaction.clientId)!;
            invoiceId = randomUUID();
            const invoiceNumber = `HIST-${transaction.date.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`;
            historicalInvoices.push({
              id: invoiceId,
              invoiceNumber,
              documentType: 'INVOICE',
              invoiceType: 'TAX',
              description: transaction.details,
              subtotal: transaction.amount,
              taxRate: 0,
              taxAmount: 0,
              amount: transaction.amount,
              paidAmount: transaction.amount,
              dueDate: transaction.date,
              issuedDate: transaction.date,
              status: 'FULLY_PAID',
              source: 'HISTORICAL_IMPORT',
              deliveryStatus: 'SENT',
              sentAt: transaction.date,
              sellerSnapshot: {
                name: org.name,
                legalEntityName: org.legalEntityName || org.name,
                email: org.billingEmail || '',
                addressLine1: org.billingAddressLine1 || '',
                addressLine2: org.billingAddressLine2 || '',
                city: org.billingCity || '',
                state: org.billingState || '',
                postalCode: org.billingPostalCode || '',
                country: org.billingCountry || '',
                gstNumber: org.gstNumber || '',
              },
              buyerSnapshot: {
                name: client.name,
                legalEntityName: client.legalEntityName || client.name,
                email: '',
                addressLine1: client.billingAddressLine1 || '',
                addressLine2: client.billingAddressLine2 || '',
                city: client.billingCity || '',
                state: client.billingState || '',
                postalCode: client.billingPostalCode || '',
                country: client.billingCountry || '',
                gstNumber: client.gstNumber || '',
              },
              lineItems: [{ description: transaction.details, quantity: 1, unitPrice: transaction.amount, amount: transaction.amount }],
              orgId: org.id,
              clientId: client.id,
            });
          } else if (transaction.invoiceId) {
            const invoice = await tx.invoice.update({
              where: { id: transaction.invoiceId },
              data: { paidAmount: { increment: transaction.amount } },
              select: { id: true, amount: true, paidAmount: true },
            });
            await tx.invoice.update({
              where: { id: invoice.id },
              data: { status: invoicePaymentStatus(invoice.amount, invoice.paidAmount) },
            });
          }
          const { historicalRevenue: _historicalRevenue, ...transactionRecord } = transaction;
          transactionRecords.push({ ...transactionRecord, invoiceId });
        }
        if (historicalInvoices.length > 0) {
          await tx.invoice.createMany({ data: historicalInvoices });
        }
        return tx.transaction.createManyAndReturn({ data: transactionRecords });
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
      const {
        date,
        details,
        category,
        type,
        yourAccount,
        amount,
        comments,
        invoiceId,
        clientId,
      } = body;

      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount)) {
        return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
      }

      const targetCategory = category || (parsedAmount >= 0 ? 'Revenue' : 'Expense');
      if (!allowedCategories.has(targetCategory)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
      }
      if (!date) {
        return NextResponse.json({ error: 'Transaction date is required' }, { status: 400 });
      }
      const transactionDate = new Date(date);
      if (Number.isNaN(transactionDate.getTime())) {
        return NextResponse.json({ error: 'Invalid transaction date' }, { status: 400 });
      }
      const targetType = String(type || 'Others');
      if (!allowedTypes.has(targetType)) {
        return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
      }
      const targetAccount = String(yourAccount || '');
      if (targetAccount.trim() && org.bankNames.length > 0 && !org.bankNames.includes(targetAccount)) {
        return NextResponse.json({ error: 'Select a configured bank account' }, { status: 400 });
      }
      const selectedExpenseClient = targetCategory === 'Expense' && typeof clientId === 'string' && clientId
        ? clientsById.get(clientId) || null
        : null;
      if (targetCategory === 'Expense' && clientId && !selectedExpenseClient) {
        return NextResponse.json({ error: 'Select a valid client for this expense.' }, { status: 400 });
      }
      let finalAmount = parsedAmount;
      if (targetCategory === 'Expense') {
        finalAmount = -Math.abs(parsedAmount);
      } else if (targetCategory === 'Revenue') {
        finalAmount = Math.abs(parsedAmount);
      }

      if (targetCategory === 'Revenue' && (!invoiceId || typeof invoiceId !== 'string')) {
        return NextResponse.json({ error: 'Select an unpaid or partially paid invoice for revenue.' }, { status: 400 });
      }
      const selectedInvoice = targetCategory === 'Revenue' && typeof invoiceId === 'string' && invoiceId
        ? await prisma.invoice.findFirst({
            where: {
              id: invoiceId,
              orgId: org.id,
              documentType: 'INVOICE',
              status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
            },
            select: { id: true, clientId: true, invoiceNumber: true, description: true },
          })
        : null;
      if (invoiceId && targetCategory === 'Revenue' && !selectedInvoice) {
        return NextResponse.json({ error: 'Select a valid unpaid or partially paid invoice.' }, { status: 400 });
      }

      const newTx = await prisma.$transaction(async (tx) => {
        let updatedInvoice: {
          id: string;
          invoiceNumber: string;
          amount: number;
          paidAmount: number;
          status: string;
        } | null = null;
        if (selectedInvoice) {
          const updated = await tx.invoice.updateManyAndReturn({
            where: {
              id: selectedInvoice.id,
              orgId: org.id,
              status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
            },
            data: { paidAmount: { increment: finalAmount } },
          });
          const invoice = updated[0];
          if (!invoice) throw new Error('Invoice payment state changed. Refresh and try again.');
          const status = invoicePaymentStatus(invoice.amount, invoice.paidAmount);
          updatedInvoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: { status },
            select: {
              id: true,
              invoiceNumber: true,
              amount: true,
              paidAmount: true,
              status: true,
            },
          });
        }

        return tx.transaction.create({
          data: {
            date: transactionDate,
            details: targetCategory === 'Revenue'
              ? selectedInvoice?.description?.trim() || `Invoice ${selectedInvoice?.invoiceNumber || ''}`.trim()
              : details || 'Manual Entry',
            category: targetCategory,
            type: targetType,
            transactorAccount: '',
            yourAccount: targetAccount,
            amount: finalAmount,
            referenceNumber: null,
            comments: targetCategory === 'Revenue' ? null : comments || null,
            clientId: targetCategory === 'Revenue'
              ? selectedInvoice?.clientId || null
              : selectedExpenseClient?.id || null,
            invoiceId: selectedInvoice?.id || null,
            orgId: org.id,
          },
          include: { client: { select: { id: true, name: true } } },
        }).then((transaction) => ({ ...transaction, invoice: updatedInvoice }));
      });

      return NextResponse.json(newTx);
    }
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Oops! Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const org = await getOrganization(request);
    const user = await getRequestUser(request);
    if (!org || !user || !isOrganizationAdmin(user)) {
      return NextResponse.json({ error: 'Oops! You do not have enough permissions.' }, { status: 403 });
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Transaction id is required' }, { status: 400 });

    const target = await prisma.transaction.findFirst({
      where: { id, orgId: org.id },
      select: { id: true, invoiceId: true, amount: true },
    });
    if (!target) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    await prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id: target.id } });
      if (target.invoiceId) {
        const invoice = await tx.invoice.update({
          where: { id: target.invoiceId },
          data: { paidAmount: { decrement: Math.max(0, target.amount) } },
          select: { id: true, amount: true, paidAmount: true },
        });
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: Math.max(0, invoice.paidAmount),
            status: invoicePaymentStatus(invoice.amount, invoice.paidAmount),
          },
        });
      }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: 'Unable to delete transaction' }, { status: 500 });
  }
}
