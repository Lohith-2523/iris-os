import 'server-only';

import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { sendIrisEmail } from '@/lib/email/iris-email';
import { waitlistDailyReportEmail } from '@/lib/email/iris-templates';

const WAITLIST_REPORT_RECIPIENT = 'cto.admin@irisos.app';
const STALE_LOCK_MS = 15 * 60 * 1000;

function utcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function waitlistWorkbook(entries: Array<{ name: string | null; email: string; specialization: string | null; createdAt: Date }>, reportDate: Date) {
  const workbook = XLSX.utils.book_new();
  const generatedAt = new Date();
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['IrisOS waitlist report'],
    ['Report date (UTC)', isoDate(reportDate)],
    ['Generated at (UTC)', generatedAt.toISOString()],
    ['Total registrations', entries.length],
  ]);
  summarySheet['!cols'] = [{ wch: 24 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  const entriesSheet = XLSX.utils.json_to_sheet(entries.map((entry) => ({
    'Full name': entry.name || '',
    'Email': entry.email,
    'Agency specialization': entry.specialization || '',
    'Joined at (UTC)': entry.createdAt.toISOString(),
  })));
  entriesSheet['!cols'] = [{ wch: 28 }, { wch: 36 }, { wch: 34 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, entriesSheet, 'Waitlist');

  return Buffer.from(XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }));
}

export async function sendDailyWaitlistReport(now = new Date()) {
  const reportDate = utcDay(now);
  const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
  const report = await prisma.waitlistDailyReport.upsert({
    where: { reportDate },
    create: { reportDate, recipient: WAITLIST_REPORT_RECIPIENT },
    update: {},
  });

  const claimed = await prisma.waitlistDailyReport.updateMany({
    where: {
      id: report.id,
      OR: [
        { status: { in: ['PENDING', 'FAILED'] } },
        { status: 'SENDING', lockedAt: { lt: staleBefore } },
      ],
    },
    data: {
      status: 'SENDING',
      lockedAt: now,
      lastError: null,
      attemptCount: { increment: 1 },
    },
  });
  if (claimed.count === 0) {
    return { sent: false, status: report.status, entryCount: report.entryCount ?? 0 };
  }

  try {
    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { createdAt: 'asc' },
      select: { name: true, email: true, specialization: true, createdAt: true },
    });
    const attachment = waitlistWorkbook(entries, reportDate);
    const date = isoDate(reportDate);
    const email = waitlistDailyReportEmail({ reportDate: date, entryCount: entries.length });
    const delivery = await sendIrisEmail({
      to: [WAITLIST_REPORT_RECIPIENT],
      subject: email.subject,
      text: email.text,
      html: email.html,
      idempotencyKey: `waitlist-report:${date}`,
      tags: [{ name: 'category', value: 'waitlist-daily-report' }],
      attachments: [{
        filename: `iris-os-waitlist-${date}.xlsx`,
        content: attachment,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }],
    });
    await prisma.waitlistDailyReport.update({
      where: { id: report.id },
      data: { status: 'SENT', entryCount: entries.length, messageId: delivery.id, sentAt: new Date(), lockedAt: null },
    });
    return { sent: true, status: 'SENT', entryCount: entries.length };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : 'Unknown delivery error';
    await prisma.waitlistDailyReport.update({
      where: { id: report.id },
      data: { status: 'FAILED', lastError: message, lockedAt: null },
    });
    throw error;
  }
}
