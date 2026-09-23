'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Download,
  Plus,
  Filter,
  Wallet,
  TrendingUp,
  Activity,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  CreditCard,
  Blocks,
  Key,
  Upload,
  Sparkles,
  Trash2,
  Loader2
} from 'lucide-react';
import { AtlasAIService } from '@/lib/atlas-ai/service';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { formatCurrency, formatUserMessage, getCurrencySymbol } from '@/lib/utils';
import { readWorkspaceUiPreference, type WorkspaceUiScope, writeWorkspaceUiPreference } from '@/lib/workspace-ui-storage';
import { RevenueLineChart } from '@/components/ui/revenue-line-chart';
import { DateInput } from '@/components/ui/date-input';
import { ExpandableCard } from '@/components/ui/expandable-card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { generateRecurringOccurrences, recurringOccurrenceId } from '@/lib/finance/recurrence';
import { validateBrowserFile } from '@/lib/file-security';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FinanceReadModel } from '@/server/read-models/workspace-pages';
import { financialValueClass } from '@/lib/financial-value';

export default function FinancePage({ initialData }: { initialData: FinanceReadModel }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialChecklist = (initialData.workspace.onboarding.checklist && typeof initialData.workspace.onboarding.checklist === 'object'
    ? initialData.workspace.onboarding.checklist
    : {}) as Record<string, unknown>;
  const [isSkippedAll] = React.useState(Boolean(initialChecklist.skippedAll));
  const [activeTab, setActiveTab] = React.useState<'overview' | 'manual' | 'stripe' | 'paypal' | 'razorpay'>('overview');
  const [integrations, setIntegrations] = React.useState<any[]>(initialData.workspace.integrations);
  const [loadingIntegrations, setLoadingIntegrations] = React.useState(false);

  const [dbData, setDbData] = React.useState<any>(initialData.finance);
  const [loadingFinanceTimeframe, setLoadingFinanceTimeframe] = React.useState(false);
  const [leakData, setLeakData] = React.useState<any>(null);
  const [currencyState] = React.useState(initialData.workspace.organization.currency || 'USD');
  const [uiScope] = React.useState<WorkspaceUiScope | null>({ userId: initialData.workspace.user.id, orgId: initialData.workspace.organization.id });

  // Manual Entry States
  const [manualTransactions, setManualTransactions] = React.useState<any[]>([]);
  const [loadingManual, setLoadingManual] = React.useState(false);
  const [isSavingTransaction, setIsSavingTransaction] = React.useState(false);
  const [isImportingTransactions, setIsImportingTransactions] = React.useState(false);
  const [bankNames] = React.useState<string[]>(initialData.workspace.organization.bankNames);
  const [outstandingInvoices, setOutstandingInvoices] = React.useState<any[]>([]);
  const [ledgerClients] = React.useState<any[]>(initialData.clients);
  const [isFinancialReportOpen, setIsFinancialReportOpen] = React.useState(false);

  // Form states
  const [formDate, setFormDate] = React.useState('');
  const [formDetails, setFormDetails] = React.useState('');
  const [formType, setFormType] = React.useState('UPI');
  const [formYourAccount, setFormYourAccount] = React.useState('');
  const [formAmount, setFormAmount] = React.useState('');
  const [formComments, setFormComments] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('Revenue');
  const [formInvoiceId, setFormInvoiceId] = React.useState('');
  const [formClientId, setFormClientId] = React.useState('');
  const [timeFrame, setTimeFrame] = React.useState('All Time');

  const formatLedgerDate = (value: unknown) => {
    if (!value) return '—';
    const raw = value instanceof Date ? value.toISOString() : String(value);
    const isoDate = raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
    if (isoDate) return isoDate;

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime())
      ? raw.replace(/T.*$/, '')
      : parsed.toLocaleDateString('en-CA', { timeZone: 'UTC' });
  };

  // Recurring Subscription States
  const [subscriptions, setSubscriptions] = React.useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = React.useState(false);
  const [subName, setSubName] = React.useState('');
  const [subAmount, setSubAmount] = React.useState('');
  const [subCategory, setSubCategory] = React.useState('AI subscriptions');
  const [subFrequency, setSubFrequency] = React.useState('monthly');
  const [subStartDate, setSubStartDate] = React.useState('');
  const [editingSub, setEditingSub] = React.useState<any | null>(null);
  const [editAmount, setEditAmount] = React.useState('');
  const [editFrequency, setEditFrequency] = React.useState('monthly');

  const fetchSubscriptions = React.useCallback(async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch('/api/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (e) {
      console.error('Error loading subscriptions:', e);
    } finally {
      setLoadingSubs(false);
    }
  }, []);

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName || !subAmount || !subCategory || !subFrequency || !subStartDate) {
      alert('Please fill out all subscription fields.');
      return;
    }
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subName,
          amount: parseFloat(subAmount),
          category: subCategory,
          frequency: subFrequency,
          startDate: subStartDate,
        }),
      });
      if (res.ok) {
        setSubName('');
        setSubAmount('');
        setSubCategory('AI subscriptions');
        setSubFrequency('monthly');
        setSubStartDate('');
        fetchSubscriptions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save subscription.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving subscription.');
    }
  };

  const handleSubEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSub || !editAmount || !editFrequency) return;
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSub.id,
          amount: parseFloat(editAmount),
          frequency: editFrequency,
        }),
      });
      if (res.ok) {
        setEditingSub(null);
        setEditAmount('');
        setEditFrequency('monthly');
        fetchSubscriptions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update subscription.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating subscription.');
    }
  };

  const handleSubDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this recurring subscription?')) return;
    try {
      const res = await fetch(`/api/subscriptions?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSubscriptions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete subscription.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting subscription.');
    }
  };

  const generateOccurrences = React.useCallback((sub: any) => {
    return generateRecurringOccurrences(sub.startDate, Number(sub.amount), sub.frequency).map(({ date: occDate }) => {
      return {
        id: recurringOccurrenceId(sub.id, occDate),
        transactionId: null,
        source: 'Recurring Ledger',
        customer: `${sub.name} (${sub.category})`,
        date: occDate.toISOString(),
        amountUSD: -sub.amount,
        status: 'failed',
        rawStatus: 'Expense',
        details: `${sub.name} (${sub.category})`,
      };
    });
  }, []);

  const subscriptionTransactions = React.useMemo(() => {
    const list: any[] = [];
    subscriptions.forEach((sub) => {
      list.push(...generateOccurrences(sub));
    });
    return list;
  }, [subscriptions, generateOccurrences]);

  // Custom report states
  const [reportXAxis, setReportXAxis] = React.useState('Client');
  const [reportYAxis, setReportYAxis] = React.useState('Revenue');
  const [reportTimeframe, setReportTimeframe] = React.useState('All Time');
  const reportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const saved = readWorkspaceUiPreference(
      uiScope,
      'finance',
      { activeTab: 'overview' as const, timeFrame: 'All Time', reportXAxis: 'Client', reportYAxis: 'Revenue', reportTimeframe: 'All Time' },
      (value): value is { activeTab: 'overview' | 'manual' | 'stripe' | 'paypal' | 'razorpay'; timeFrame: string; reportXAxis: string; reportYAxis: string; reportTimeframe: string } => {
        if (!value || typeof value !== 'object') return false;
        const stored = value as Record<string, unknown>;
        return ['overview', 'manual', 'stripe', 'paypal', 'razorpay'].includes(String(stored.activeTab)) &&
          typeof stored.timeFrame === 'string' && typeof stored.reportXAxis === 'string' &&
          typeof stored.reportYAxis === 'string' && typeof stored.reportTimeframe === 'string';
      },
    );
    setActiveTab(searchParams.get('tab') === 'manual' ? 'manual' : saved.activeTab);
    setTimeFrame(saved.timeFrame);
    setReportXAxis(saved.reportXAxis === 'Channel Source' ? 'Ledger Type' : saved.reportXAxis);
    setReportYAxis(saved.reportYAxis);
    setReportTimeframe(saved.reportTimeframe);
  }, [searchParams, uiScope]);

  React.useEffect(() => {
    writeWorkspaceUiPreference(uiScope, 'finance', { activeTab, timeFrame, reportXAxis, reportYAxis, reportTimeframe });
  }, [uiScope, activeTab, timeFrame, reportXAxis, reportYAxis, reportTimeframe]);

  const isInTimeFrame = React.useCallback((dateString: string) => {
    if (timeFrame === 'All Time' || !dateString) return true;
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return true;
    const diffDays = (new Date().getTime() - d.getTime()) / (1000 * 3600 * 24);
    if (timeFrame === 'Monthly') return diffDays <= 30;
    if (timeFrame === 'Quarterly') return diffDays <= 90;
    if (timeFrame === 'Yearly') return diffDays <= 365;
    return true;
  }, [timeFrame]);

  const refreshFinanceOverview = React.useCallback(async () => {
    const response = await fetch(`/api/data?domain=finance&timeframe=${encodeURIComponent(timeFrame)}`, {
      cache: 'no-store',
      headers: { 'X-Workspace-Cache-Background': '1' },
    });
    if (response.ok) setDbData(await response.json());
  }, [timeFrame]);


  const fetchManualTransactions = React.useCallback(async () => {
    setLoadingManual(true);
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        setManualTransactions(data);
      }
    } catch (e) {
      console.error('Error loading manual transactions:', e);
    } finally {
      setLoadingManual(false);
    }
  }, []);

  const fetchOutstandingInvoices = React.useCallback(async () => {
    try {
      const response = await fetch('/api/invoices?outstanding=true');
      if (response.ok) setOutstandingInvoices(await response.json());
    } catch (error) {
      console.error('Error loading outstanding invoices:', error);
    }
  }, []);

  const addReceivableAsRevenue = (invoice: any) => {
    setActiveTab('manual');
    setFormCategory('Revenue');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormInvoiceId(invoice.id);
    setFormYourAccount('');
    const amount = Number(invoice.balanceDue ?? invoice.pendingAmount ?? 0);
    setFormAmount(amount > 0 ? String(amount) : '');
    router.replace(`/finance?tab=manual&invoiceId=${encodeURIComponent(invoice.id)}&amount=${encodeURIComponent(String(amount))}`, { scroll: false });
  };

  React.useEffect(() => {
    const invoiceId = searchParams.get('invoiceId');
    const amount = searchParams.get('amount');
    const transactionType = searchParams.get('transactionType');
    if (searchParams.get('tab') !== 'manual') return;
    setActiveTab('manual');
    setFormDate(new Date().toISOString().slice(0, 10));
    if (invoiceId) {
      setFormCategory('Revenue');
      setFormInvoiceId(invoiceId);
      setFormYourAccount('');
      setFormAmount(amount && Number(amount) > 0 ? amount : '');
      return;
    }
    if (transactionType === 'Expense') {
      setFormCategory('Expense');
      setFormInvoiceId('');
      setFormDetails('');
      setFormAmount('');
      setFormComments('');
      setFormClientId('');
    }
  }, [searchParams]);

  React.useEffect(() => {
    if (bankNames.length > 0 && !formYourAccount && !searchParams.get('invoiceId')) {
      setFormYourAccount(bankNames[0]);
    }
  }, [bankNames, formYourAccount, searchParams]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingTransaction) return;
    const isRevenue = formCategory === 'Revenue';
    const missingRevenueFields = isRevenue && (!formDate || !formInvoiceId || !formAmount);
    const missingOtherFields = !isRevenue && (
      !formDate || !formDetails || !formType || !formAmount
    );
    if (missingRevenueFields || missingOtherFields) {
      alert('Please fill out all required fields.');
      return;
    }

    if (!isRevenue && formType === 'Others' && !formComments.trim()) {
      alert('Please add the transaction type in the comments.');
      return;
    }

    if (!window.confirm('Are you sure you want to add this transaction to the ledger?')) return;

    setIsSavingTransaction(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formCategory,
          yourAccount: formYourAccount,
          amount: parseFloat(formAmount),
          ...(isRevenue ? {
            date: formDate,
            invoiceId: formInvoiceId,
          } : {
            date: formDate,
            details: formDetails,
            type: formType,
            comments: formComments || null,
            clientId: formClientId || null,
          }),
        }),
      });

      if (res.ok) {
        const transaction = await res.json();
        setManualTransactions((current) =>
          [transaction, ...current.filter((item) => item.id !== transaction.id)]
            .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
        );
        // Reset form
        setFormDetails('');
        setFormCategory('Revenue');
        setFormInvoiceId('');
        setFormAmount('');
        setFormComments('');
        setFormClientId('');
        void Promise.all([fetchOutstandingInvoices(), refreshFinanceOverview()]);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save transaction.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setIsSavingTransaction(false);
    }
  };

  const handleTransactionDelete = async (transactionId: string) => {
    if (!window.confirm('Are you sure you want to permanently remove this transaction? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/transactions?id=${encodeURIComponent(transactionId)}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to remove transaction.');
      }
      setManualTransactions((current) => current.filter((transaction) => transaction.id !== transactionId));
      void Promise.all([fetchOutstandingInvoices(), refreshFinanceOverview()]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove transaction.');
    }
  };

  const saveWorkbook = React.useCallback(async (workbook: any, filename: string) => {
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, []);

  const downloadTemplate = async () => {
    const ExcelJS = await import('exceljs');
    const [invoiceResponse, organizationResponse] = await Promise.all([
      fetch('/api/invoices?outstanding=true'),
      fetch('/api/organization'),
    ]);
    const liveInvoices = invoiceResponse.ok ? await invoiceResponse.json() : outstandingInvoices;
    const liveBankNames = organizationResponse.ok
      ? ((await organizationResponse.json()).bankNames || [])
      : bankNames;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IrisOS';
    workbook.created = new Date();
    workbook.modified = new Date();
    const instructions = workbook.addWorksheet('Instructions');
    const revenue = workbook.addWorksheet('Revenue', { views: [{ state: 'frozen', ySplit: 1 }] });
    const expenses = workbook.addWorksheet('Expenses', { views: [{ state: 'frozen', ySplit: 1 }] });
    const lists = workbook.addWorksheet('Validation Lists');
    lists.state = 'veryHidden';

    const styleHeader = (sheet: any, range: string) => {
      sheet.getRow(1).height = 26;
      sheet.getRow(1).eachCell((cell: any) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18181B' } };
        cell.alignment = { vertical: 'middle' };
      });
      sheet.autoFilter = { from: range.split(':')[0], to: range.split(':')[1] };
    };

    instructions.columns = [{ width: 24 }, { width: 100 }];
    instructions.mergeCells('A1:B1');
    instructions.getCell('A1').value = 'IrisOS · FINANCIAL LEDGER IMPORT';
    instructions.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    instructions.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18181B' } };
    instructions.getCell('A1').alignment = { vertical: 'middle' };
    instructions.getRow(1).height = 30;
    instructions.addRows([
      ['How to use this workbook', 'Use the Revenue and Expenses sheets only. Keep the header row unchanged and enter one transaction per row. Upload this same XLSX file back to IrisOS when ready.'],
      ['Revenue sheet', 'Required columns: Date, Invoice Number, Bank Account, Amount. Choose the invoice number and bank account from their dropdowns. The invoice description and client are applied automatically; the received amount is entered manually and may be a partial payment.'],
      ['Expenses sheet', 'Required columns: Date, Transaction Details, Payment Method, Bank Account, Amount. Comments are optional.'],
      ['Invoice Number dropdown', 'Shows every currently unpaid or partially paid invoice when this workbook is downloaded. Download a fresh template after creating an invoice so its number is included.'],
      ['Bank Account dropdown', 'Shows bank accounts configured in IrisOS Settings at the time this workbook is downloaded. Add bank accounts in Settings, then download a fresh workbook if the list changes.'],
      ['Payment Method dropdown', 'UPI, IMPS, NEFT, Cash, or Others. If you select Others, use Comments to clarify the method.'],
      ['Amounts', 'Enter positive amounts. IrisOS records Revenue as income and Expenses as an expense automatically. Do not change sheet names or column headings.'],
    ]);
    for (let row = 2; row <= 8; row += 1) {
      const labelCell = instructions.getCell(`A${row}`);
      labelCell.font = { bold: true, color: { argb: 'FF27272A' } };
      for (const column of ['A', 'B']) {
        const cell = instructions.getCell(`${column}${row}`);
        cell.alignment = { vertical: 'top', wrapText: true };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE4E4E7' } } };
      }
      instructions.getRow(row).height = 42;
    }

    const revenueHeaders = ['Date', 'Invoice Number', 'Bank Account', 'Amount'];
    revenue.addRow(revenueHeaders);
    revenue.columns = [{ width: 15 }, { width: 26 }, { width: 28 }, { width: 18 }];
    styleHeader(revenue, 'A1:D1');

    const expenseHeaders = ['Date', 'Transaction Details', 'Payment Method', 'Bank Account', 'Amount', 'Comments'];
    expenses.addRow(expenseHeaders);
    expenses.columns = [{ width: 15 }, { width: 32 }, { width: 20 }, { width: 25 }, { width: 16 }, { width: 36 }];
    styleHeader(expenses, 'A1:F1');

    const transactionTypes = ['UPI', 'IMPS', 'NEFT', 'Cash', 'Others'];
    const invoiceNumbers = liveInvoices.map((invoice: any) => invoice.invoiceNumber).filter(Boolean);
    lists.getColumn(1).values = ['Invoice Numbers', ...invoiceNumbers];
    lists.getColumn(2).values = ['Bank Accounts', ...liveBankNames];
    lists.getColumn(3).values = ['Payment Methods', ...transactionTypes];

    for (let row = 2; row <= 501; row += 1) {
      if (invoiceNumbers.length > 0) {
        revenue.getCell(`B${row}`).dataValidation = {
          type: 'list', allowBlank: false, formulae: [`'Validation Lists'!$A$2:$A$${invoiceNumbers.length + 1}`],
        };
      }
      if (liveBankNames.length > 0) {
        revenue.getCell(`C${row}`).dataValidation = {
          type: 'list', allowBlank: false, formulae: [`'Validation Lists'!$B$2:$B$${liveBankNames.length + 1}`],
        };
        expenses.getCell(`D${row}`).dataValidation = {
          type: 'list', allowBlank: false, formulae: [`'Validation Lists'!$B$2:$B$${liveBankNames.length + 1}`],
        };
      }
      revenue.getCell(`A${row}`).numFmt = 'yyyy-mm-dd';
      revenue.getCell(`D${row}`).numFmt = '#,##0.00';
      expenses.getCell(`A${row}`).numFmt = 'yyyy-mm-dd';
      expenses.getCell(`C${row}`).dataValidation = {
        type: 'list', allowBlank: false, formulae: [`'Validation Lists'!$C$2:$C$${transactionTypes.length + 1}`],
      };
      expenses.getCell(`E${row}`).numFmt = '#,##0.00';
    }

    for (const sheet of [revenue, expenses]) {
      sheet.getRow(2).eachCell((cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F4F5' } };
      });
    }

    await saveWorkbook(workbook, 'iris_os_financial_ledger_template.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isImportingTransactions) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const validation = await validateBrowserFile(file, 'spreadsheet-import', { maxBytes: 10 * 1024 * 1024 });
    if (!validation.ok || !file.name.toLowerCase().endsWith('.xlsx')) return alert(validation.ok ? 'Please upload the IrisOS Excel template (.xlsx).' : validation.error);
    setIsImportingTransactions(true);
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const revenueSheet = workbook.getWorksheet('Revenue');
      const expensesSheet = workbook.getWorksheet('Expenses');
      if (!revenueSheet || !expensesSheet) {
        throw new Error('Revenue and Expenses sheets are required. Please use the latest IrisOS ledger template.');
      }
      const getCellValue = (cell: any): unknown => {
        const value = cell.value;
        if (value === null || value === undefined) return '';
        if (value instanceof Date) return value;
        if (typeof value !== 'object') return value;
        if (Array.isArray(value.richText)) return value.richText.map((part: { text?: string }) => part.text || '').join('');
        if ('result' in value) return value.result ?? '';
        if ('text' in value) return value.text ?? '';
        return String(value);
      };
      const normalizeText = (value: unknown) => String(value ?? '')
        .replace(/^\uFEFF/, '')
        .replace(/\s+/g, ' ')
        .trim();
      const validateHeaders = (sheet: any, expectedHeaders: string[]) => {
        const headers = expectedHeaders.map((_, index) => normalizeText(getCellValue(sheet.getRow(1).getCell(index + 1))));
        if (!expectedHeaders.every((header, index) => header.toLowerCase() === headers[index]?.toLowerCase())) {
          throw new Error(`The ${sheet.name} sheet columns do not match the IrisOS ledger template.`);
        }
      };
      const revenueHeaders = ['Date', 'Invoice Number', 'Bank Account', 'Amount'];
      const expenseHeaders = ['Date', 'Transaction Details', 'Payment Method', 'Bank Account', 'Amount', 'Comments'];
      validateHeaders(revenueSheet, revenueHeaders);
      validateHeaders(expensesSheet, expenseHeaders);

      const txs: any[] = [];
      const invalidRows: string[] = [];
      const toImportDate = (value: unknown) => {
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'number') return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString();
        const text = normalizeText(value);
        const dayFirstMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dayFirstMatch) {
          const [, day, month, year] = dayFirstMatch;
          const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
          if (
            parsed.getUTCFullYear() === Number(year) &&
            parsed.getUTCMonth() === Number(month) - 1 &&
            parsed.getUTCDate() === Number(day)
          ) {
            return parsed.toISOString();
          }
        }
        return text;
      };
      revenueSheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) return;
        const values = revenueHeaders.map((_, index) => getCellValue(row.getCell(index + 1)));
        if (!values.some((value) => normalizeText(value) !== '')) return;

        const rawAmount = normalizeText(values[3]);
        const amount = Number(rawAmount.replace(/[,\s₹$€£]/g, '').replace(/^\((.*)\)$/, '-$1'));
        if (!Number.isFinite(amount)) {
          invalidRows.push(`Revenue row ${rowNumber}: Amount must be a number.`);
          return;
        }
        txs.push({
          category: 'Revenue',
          date: toImportDate(values[0]),
          invoiceNumber: normalizeText(values[1]),
          yourAccount: normalizeText(values[2]),
          amount,
          sourceRow: rowNumber,
          sourceSheet: 'Revenue',
        });
      });
      expensesSheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) return;
        const values = expenseHeaders.map((_, index) => getCellValue(row.getCell(index + 1)));
        if (!values.some((value) => normalizeText(value) !== '')) return;

        const rawAmount = normalizeText(values[4]);
        const amount = Number(rawAmount.replace(/[,\sâ‚¹$â‚¬Â£]/g, '').replace(/^\((.*)\)$/, '-$1'));
        if (!Number.isFinite(amount)) {
          invalidRows.push(`Expenses row ${rowNumber}: Amount must be a number.`);
          return;
        }
        txs.push({
          date: toImportDate(values[0]),
          details: normalizeText(values[1]),
          category: 'Expense',
          type: normalizeText(values[2]),
          yourAccount: normalizeText(values[3]),
          amount,
          comments: normalizeText(values[5]) || null,
          sourceRow: rowNumber,
          sourceSheet: 'Expenses',
        });
      });
      if (txs.length === 0) {
        throw new Error(invalidRows[0] || 'No populated transaction rows were found.');
      }

        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk: true, transactions: txs })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (Array.isArray(result.transactions)) {
            setManualTransactions((current) => {
              const importedIds = new Set(result.transactions.map((transaction: any) => transaction.id));
              return [...result.transactions, ...current.filter((transaction) => !importedIds.has(transaction.id))]
                .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
            });
          }
          void refreshFinanceOverview();
          const skippedMessage = result.rejectedCount
            ? ` ${result.rejectedCount} row${result.rejectedCount === 1 ? '' : 's'} skipped: ${result.rejected?.map((item: { row: number | null; reason: string }) => `Row ${item.row ?? 'unknown'}: ${item.reason}`).join(' ')}`
            : '';
          alert(`Successfully imported ${result.count} transaction${result.count === 1 ? '' : 's'}.${skippedMessage}`);
        } else {
          const error = await response.json().catch(() => ({}));
          const firstRejected = Array.isArray(error.rejected) ? error.rejected[0] : null;
          const rejectionDetail = firstRejected
            ? ` Row ${firstRejected.row ?? 'unknown'}: ${firstRejected.reason}`
            : '';
          throw new Error(`${error.error || 'Failed to import transactions.'}${rejectionDetail}`);
        }
    } catch (error) {
      console.error('Error importing bulk data:', error);
      alert(error instanceof Error ? error.message : 'An error occurred during import.');
    } finally {
      setIsImportingTransactions(false);
      e.target.value = '';
    }
  };

  const fetchIntegrations = React.useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch (e) {
      console.error('Error fetching integrations:', e);
    } finally {
      setLoadingIntegrations(false);
    }
  }, []);

  React.useEffect(() => {
    async function loadBase() {
      try {
        const leaks = await AtlasAIService.getProfitLeaks();
        if (leaks.length > 0) {
          setLeakData(leaks[0]);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadBase();
    fetchIntegrations();
    fetchManualTransactions();
    fetchOutstandingInvoices();
    fetchSubscriptions();
  }, [fetchIntegrations, fetchManualTransactions, fetchOutstandingInvoices, fetchSubscriptions]);

  const hasMountedFinanceTimeframe = React.useRef(false);
  React.useEffect(() => {
    if (!hasMountedFinanceTimeframe.current) {
      hasMountedFinanceTimeframe.current = true;
      return;
    }
    let isCurrent = true;
    setLoadingFinanceTimeframe(true);
    void fetch(`/api/data?domain=finance&timeframe=${encodeURIComponent(timeFrame)}`, {
      cache: 'no-store',
      headers: { 'X-Workspace-Cache-Background': '1' },
    })
      .then(async (response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load finance timeframe.')))
      .then((data) => {
        if (isCurrent) setDbData(data);
      })
      .catch((error) => {
        if (isCurrent) console.error(error);
      })
      .finally(() => {
        if (isCurrent) setLoadingFinanceTimeframe(false);
      });
    return () => { isCurrent = false; };
  }, [timeFrame]);

  const aiLeakText = React.useMemo(() => {
    if (!leakData) return formatUserMessage('Lohith, running profit leak audit calculations via Miles AI...');
    return formatUserMessage(`Lohith, Miles AI has detected a budget overage: ${leakData.description} Reassigning tasks to David Kim would recover ${formatCurrency(leakData.impactValue)}/mo in direct margins.`);
  }, [leakData, currencyState]);

  const combinedMetrics = React.useMemo(() => {
    const baseOutstanding = dbData?.outstandingAmount ?? 0;
    const baseExpenses = dbData?.totalExpenses ?? 0;
    const aiSubscriptionCosts = (dbData?.expenses ?? [])
      .filter((expense: any) => expense.category === 'AI Subscription')
      .reduce((sum: number, expense: any) => sum + Math.abs(Number(expense.amount) || 0), 0);
    // Revenue and expenses are recognized exclusively from persisted ledger transactions.
    const totalGross = dbData?.grossBillings ?? 0;
    const totalExpenses = baseExpenses;
    const liveOutstanding = outstandingInvoices.reduce(
      (sum, invoice) => sum + Math.max(0, Number(invoice.amount || 0) - Number(invoice.paidAmount || 0)),
      0,
    );
    const totalOutstanding = outstandingInvoices.length > 0 ? liveOutstanding : baseOutstanding;
    const profitMargin = totalGross > 0 ? ((totalGross - totalExpenses) / totalGross) * 100 : 0;

    return {
      grossBillings: totalGross,
      outstandingAmount: totalOutstanding,
      totalExpenses: totalExpenses,
      netProfitMargin: profitMargin,
      aiSubscriptionCosts
    };
  }, [dbData, outstandingInvoices]);

  const expenseBreakdownData = React.useMemo(() => {
    const aiCosts = combinedMetrics.aiSubscriptionCosts;
    let baseOps = combinedMetrics.totalExpenses - aiCosts;
    if (baseOps < 0) baseOps = 0;
    return [
      { name: 'AI Subscriptions', value: aiCosts, color: '#6366f1' },
      { name: 'Operational & Gateway', value: baseOps, color: '#f43f5e' }
    ].filter(d => d.value > 0);
  }, [combinedMetrics]);

  const aiSpendSplitData = React.useMemo(() => {
    const map = new Map<string, number>();
    (dbData?.expenses ?? []).filter((expense: any) => expense.category === 'AI Subscription').forEach((expense: any) => {
      const name = expense.merchant || 'Unknown AI Tool';
      map.set(name, (map.get(name) || 0) + Math.abs(Number(expense.amount) || 0));
    });
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
    return Array.from(map.entries()).map(([name, value], i) => ({
      name, value, color: colors[i % colors.length]
    }));
  }, [dbData?.expenses]);


  const combinedTransactions = React.useMemo(() => {
    const list: any[] = [];

    // Add manual transactions
    manualTransactions.forEach(tx => {
      list.push({
        id: tx.id.slice(0, 8),
        transactionId: tx.id,
        source: 'Manual Ledger',
        customer: tx.category === 'Expense'
          ? [tx.details, tx.client?.name ? `(${tx.client.name})` : ''].filter(Boolean).join(' ')
          : tx.client?.name || tx.details || 'Manual transaction',
        clientId: tx.clientId || null,
        date: tx.date,
        amountUSD: tx.amount,
        status: tx.amount >= 0 ? 'succeeded' : 'failed',
        rawStatus: tx.category || (tx.amount >= 0 ? 'Revenue' : 'Expense'),
        details: tx.details,
        category: tx.category,
        type: tx.type,
        yourAccount: tx.yourAccount,
        comments: tx.comments,
      });
    });

    list.push(...subscriptionTransactions);

    // Sort newest first
    return list.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [manualTransactions, subscriptionTransactions]);

  const revenueLineData = React.useMemo(() => (
    (dbData?.revenueHistory ?? []).filter((point: { date?: string }) =>
      !point.date || isInTimeFrame(point.date),
    )
  ), [dbData?.revenueHistory, isInTimeFrame]);

  const expensesByCategory = React.useMemo(() => {
    const map = new Map<string, number>();

    // Expense charts use the same persisted ledger transactions as the summary cards.
    if (dbData?.expenses) {
      dbData.expenses.forEach((exp: any) => {
        if (isInTimeFrame(exp.date)) {
          const category = exp.category === 'AI Subscription'
            ? 'AI Subscriptions'
            : exp.merchant || 'Other Overhead';
          map.set(category, (map.get(category) || 0) + Math.abs(Number(exp.amount) || 0));
        }
      });
    }

    const totalExp = Array.from(map.values()).reduce((sum, val) => sum + val, 0) || 1;
    const list = Array.from(map.entries()).map(([name, value]) => ({
      name,
      amount: value,
      percentage: Math.round((value / totalExp) * 100)
    }));

    return list.sort((a, b) => b.amount - a.amount);
  }, [dbData, isInTimeFrame]);

  const clientProfitability = React.useMemo(() => {
    const revenueMap = new Map<string, number>();
    combinedTransactions.forEach((tx: any) => {
      if (tx.amountUSD > 0 && (tx.status === 'succeeded' || tx.status === 'captured')) {
        const clientName = tx.customer || 'Other Clients';
        revenueMap.set(clientName, (revenueMap.get(clientName) || 0) + tx.amountUSD);
      }
    });

    if (revenueMap.size === 0) {
    }

    const list = Array.from(revenueMap.entries()).map(([name, revenue]) => {
      const expense = 0;
      const profit = revenue - expense;
      const margin = (profit / revenue) * 100;
      return {
        name,
        revenue,
        expense,
        profit,
        margin
      };
    });

    return list;
  }, [combinedTransactions, isSkippedAll]);

  const topClientsByProfit = React.useMemo(() => {
    return [...clientProfitability].sort((a, b) => b.profit - a.profit);
  }, [clientProfitability]);

  const topClientsByMargin = React.useMemo(() => {
    return [...clientProfitability].sort((a, b) => b.margin - a.margin);
  }, [clientProfitability]);

  const [customReport, setCustomReport] = React.useState<{
    xAxis: string;
    yAxis: string;
    timeframe: string;
    data: any[];
  } | null>(null);

  const generateCustomReport = (xAxis: string, yAxis: string, timeframe: string) => {
    const filteredTxs = combinedTransactions.filter((tx) => {
      if (timeframe === 'All Time' || !tx.date) return true;
      const d = new Date(tx.date);
      if (isNaN(d.getTime())) return true;
      const diffDays = (new Date().getTime() - d.getTime()) / (1000 * 3600 * 24);
      if (timeframe === 'Monthly') return diffDays <= 30;
      if (timeframe === 'Quarterly') return diffDays <= 90;
      if (timeframe === 'Yearly') return diffDays <= 365;
      return true;
    });

    const groups = new Map<string, { revenue: number; expenses: number }>();
    
    filteredTxs.forEach((tx) => {
      let key = 'Other';
      if (xAxis === 'Client') {
        key = tx.customer || 'General Overhead';
      } else if (xAxis === 'Category') {
        key = tx.rawStatus === 'EXPENSE' || tx.amountUSD < 0 ? (tx.details || 'General Expense') : 'Revenue';
      } else if (xAxis === 'Ledger Type') {
        key = tx.source || 'Manual Ledger';
      } else if (xAxis === 'Time (Monthly)') {
        const d = new Date(tx.date);
        if (!isNaN(d.getTime())) {
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        }
      }

      if (!groups.has(key)) {
        groups.set(key, { revenue: 0, expenses: 0 });
      }

      const current = groups.get(key)!;
      if (tx.amountUSD > 0 && tx.status !== 'failed') {
        current.revenue += tx.amountUSD;
      } else if (tx.amountUSD < 0) {
        current.expenses += Math.abs(tx.amountUSD);
      }
    });

    const reportData = Array.from(groups.entries()).map(([label, val]) => {
      let value = 0;
      if (yAxis === 'Revenue') {
        value = val.revenue;
      } else if (yAxis === 'Expenses') {
        value = val.expenses;
      } else if (yAxis === 'Net Profit') {
        value = val.revenue - val.expenses;
      } else if (yAxis === 'Profit Margin') {
        value = val.revenue > 0 ? ((val.revenue - val.expenses) / val.revenue) * 100 : 0;
      }

      return {
        label,
        value,
        revenue: val.revenue,
        expenses: val.expenses,
        profit: val.revenue - val.expenses,
        margin: val.revenue > 0 ? ((val.revenue - val.expenses) / val.revenue) * 100 : 0
      };
    });

    reportData.sort((a, b) => b.value - a.value);

    setCustomReport({
      xAxis,
      yAxis,
      timeframe,
      data: reportData
    });

    // Close the card automatically by simulating keydown Escape
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // Scroll down to the report container smoothly after modal collapses
    setTimeout(() => {
      reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 450);
  };

  const handleExportExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IrisOS';
    workbook.created = new Date();
    workbook.modified = new Date();

    const summary = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 3 }] });
    const ledger = workbook.addWorksheet('Ledger', { views: [{ state: 'frozen', ySplit: 1 }] });
    const recurring = workbook.addWorksheet('Recurring Subscriptions', { views: [{ state: 'frozen', ySplit: 1 }] });

    const styleHeader = (row: any) => {
      row.height = 24;
      row.eachCell((cell: any) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18181B' } };
        cell.alignment = { vertical: 'middle' };
      });
    };

    ledger.columns = [
      { header: 'Transaction ID', key: 'id', width: 18 },
      { header: 'Source / Ledger', key: 'source', width: 22 },
      { header: 'Client', key: 'client', width: 28 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Transaction Type', key: 'type', width: 20 },
      { header: 'Bank Account', key: 'bank', width: 24 },
      { header: `Amount (${currencyState})`, key: 'amount', width: 18 },
      { header: 'Details', key: 'details', width: 36 },
      { header: 'Comments', key: 'comments', width: 40 },
    ];
    styleHeader(ledger.getRow(1));
    combinedTransactions.forEach((transaction: any) => {
      ledger.addRow({
        id: transaction.transactionId || transaction.id,
        source: transaction.source,
        client: transaction.customer || '',
        date: new Date(transaction.date),
        category: transaction.category || (transaction.amountUSD >= 0 ? 'Revenue' : 'Expense'),
        type: transaction.type || (
          transaction.source === 'Retainer Ledger'
            ? 'Recurring Retainer'
            : transaction.source === 'Project Payment Ledger'
              ? 'One-time Project Payment'
              : 'Recurring'
        ),
        bank: transaction.yourAccount || '',
        amount: transaction.amountUSD,
        details: transaction.details || '',
        comments: transaction.comments || '',
      });
    });
    ledger.getColumn('date').numFmt = 'yyyy-mm-dd';
    ledger.getColumn('amount').numFmt = '#,##0.00;[Red](#,##0.00);-';
    ledger.autoFilter = { from: 'A1', to: 'J1' };

    recurring.columns = [
      { header: 'Name', key: 'name', width: 32 },
      { header: 'Category', key: 'category', width: 24 },
      { header: 'Frequency', key: 'frequency', width: 16 },
      { header: 'Start Date', key: 'startDate', width: 16 },
      { header: `Amount (${currencyState})`, key: 'amount', width: 18 },
    ];
    styleHeader(recurring.getRow(1));
    subscriptions.forEach((subscription) => recurring.addRow({
      ...subscription,
      startDate: new Date(subscription.startDate),
    }));
    recurring.getColumn('startDate').numFmt = 'yyyy-mm-dd';
    recurring.getColumn('amount').numFmt = '#,##0.00';
    recurring.autoFilter = { from: 'A1', to: 'E1' };

    const ledgerLastRow = Math.max(2, ledger.rowCount);
    summary.mergeCells('A1:H1');
    summary.getCell('A1').value = 'IrisOS Financial Summary';
    summary.getCell('A1').font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
    summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF09090B' } };
    summary.getCell('A2').value = 'Exported';
    summary.getCell('B2').value = new Date();
    summary.getCell('B2').numFmt = 'yyyy-mm-dd hh:mm';
    summary.getCell('D2').value = 'Currency';
    summary.getCell('E2').value = currencyState;
    summary.getCell('A4').value = 'Metric';
    summary.getCell('B4').value = `Amount (${currencyState})`;
    styleHeader(summary.getRow(4));
    ['Revenue', 'Expenses', 'AI Subscriptions', 'Net Cash Flow'].forEach((label, index) => {
      summary.getCell(`A${5 + index}`).value = label;
    });
    summary.getCell('B5').value = { formula: `SUMIF('Ledger'!$E$2:$E$${ledgerLastRow},"Revenue",'Ledger'!$H$2:$H$${ledgerLastRow})`, date1904: false };
    summary.getCell('B6').value = { formula: `-SUMIF('Ledger'!$E$2:$E$${ledgerLastRow},"Expense",'Ledger'!$H$2:$H$${ledgerLastRow})`, date1904: false };
    summary.getCell('B7').value = { formula: `-SUMIF('Ledger'!$E$2:$E$${ledgerLastRow},"AI Subscription",'Ledger'!$H$2:$H$${ledgerLastRow})`, date1904: false };
    summary.getCell('B8').value = { formula: 'B5-B6-B7', date1904: false };
    for (let row = 5; row <= 8; row += 1) summary.getCell(`B${row}`).numFmt = '#,##0.00;[Red](#,##0.00);-';

    const monthly = new Map<string, { revenue: number; expenses: number; ai: number }>();
    combinedTransactions.forEach((transaction: any) => {
      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = monthly.get(key) || { revenue: 0, expenses: 0, ai: 0 };
      const category = transaction.category || (transaction.amountUSD >= 0 ? 'Revenue' : 'Expense');
      if (category === 'Revenue') current.revenue += transaction.amountUSD;
      else if (category === 'AI Subscription') current.ai += Math.abs(transaction.amountUSD);
      else current.expenses += Math.abs(transaction.amountUSD);
      monthly.set(key, current);
    });
    const monthlyRows = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b));
    summary.getRow(11).values = ['Month', 'Revenue', 'Expenses', 'AI Subscriptions'];
    styleHeader(summary.getRow(11));
    monthlyRows.forEach(([month, values], index) => {
      summary.getRow(12 + index).values = [month, values.revenue, values.expenses, values.ai];
    });
    if (monthlyRows.length > 0) {
      for (let row = 12; row <= 11 + monthlyRows.length; row += 1) {
        for (let column = 2; column <= 4; column += 1) summary.getRow(row).getCell(column).numFmt = '#,##0.00';
      }
    }

    const clientRevenue = new Map<string, number>();
    combinedTransactions
      .filter((transaction: any) => transaction.amountUSD > 0)
      .forEach((transaction: any) => {
        const client = transaction.customer || 'Unassigned Revenue';
        clientRevenue.set(client, (clientRevenue.get(client) || 0) + transaction.amountUSD);
      });
    summary.getCell('F4').value = 'Client Revenue';
    summary.getCell('G4').value = `Amount (${currencyState})`;
    styleHeader(summary.getRow(4));
    [...clientRevenue.entries()].sort((a, b) => b[1] - a[1]).forEach(([client, amount], index) => {
      summary.getRow(5 + index).getCell(6).value = client;
      summary.getRow(5 + index).getCell(7).value = amount;
      summary.getRow(5 + index).getCell(7).numFmt = '#,##0.00';
    });

    if (monthlyRows.length > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 420;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#09090b';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.font = 'bold 28px Arial';
        context.fillText(`Revenue, Expenses & AI Subscriptions (${currencyState})`, 36, 48);
        const maxValue = Math.max(1, ...monthlyRows.flatMap(([, values]) => [values.revenue, values.expenses, values.ai]));
        const groupWidth = 1080 / monthlyRows.length;
        monthlyRows.forEach(([month, values], index) => {
          const x = 48 + index * groupWidth;
          [
            { value: values.revenue, color: '#d4d4d8' },
            { value: values.expenses, color: '#71717a' },
            { value: values.ai, color: '#3f3f46' },
          ].forEach((series, seriesIndex) => {
            const height = (series.value / maxValue) * 270;
            context.fillStyle = series.color;
            context.fillRect(x + seriesIndex * 22, 340 - height, 16, height);
          });
          context.fillStyle = '#a1a1aa';
          context.font = '14px Arial';
          context.fillText(month, x, 372);
        });
        const imageId = workbook.addImage({ base64: canvas.toDataURL('image/png'), extension: 'png' });
        summary.addImage(imageId, { tl: { col: 5, row: 10 }, ext: { width: 720, height: 252 } });
      }
    }

    summary.columns = [
      { width: 24 }, { width: 18 }, { width: 18 }, { width: 20 },
      { width: 4 }, { width: 30 }, { width: 18 }, { width: 18 },
    ];
    summary.eachRow((row: any) => {
      row.alignment = { vertical: 'middle' };
    });
    await saveWorkbook(workbook, `iris_os_financial_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Financial Ledger</h1>
          <p className="text-xs text-zinc-500">Track ledger-recognized revenue, invoice statuses, and gateway connection activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeFrame}
            onChange={(e) => setTimeFrame(e.target.value)}
            className="h-8 rounded border border-zinc-800 bg-zinc-900/40 px-2 text-xs text-zinc-300 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all cursor-pointer"
          >
            <option value="All Time">All Time</option>
            <option value="Yearly">Yearly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Monthly">Monthly</option>
          </select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportExcel}
            className="h-8 border-zinc-800 text-zinc-300 gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-6 border-b border-zinc-850">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-550 hover:text-zinc-350'
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'manual'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-550 hover:text-zinc-350'
          }`}
        >
          Ledger
        </button>
        <Button type="button" variant="outline" size="sm" className="mb-2 ml-auto gap-2" onClick={() => setIsFinancialReportOpen(true)}>
          <Sparkles className="h-4 w-4" /> Financial reports
        </Button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Metric Cards Grid */}
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="min-h-[164px] flex flex-col justify-between bg-zinc-900/90 border border-zinc-800/80 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Revenue</CardTitle>
                <span className="font-bold text-zinc-505 w-4 text-center text-sm select-none">{getCurrencySymbol(currencyState)}</span>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono tracking-tight ${financialValueClass(combinedMetrics.grossBillings)}`}>
                  {formatCurrency(combinedMetrics.grossBillings)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Filtered by selected timeframe</span>
                </div>
              </CardContent>
            </Card>

            <ExpandableCard 
              className="min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex h-full min-h-0 flex-col gap-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Operating Expenses</h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expensesByCategory.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                          dataKey="name" 
                          type="category" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#a1a1aa', fontSize: 10 }} 
                        />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#0d0e12] border border-zinc-800 rounded-md p-2 shadow-xl">
                                  <p className="text-xs font-semibold text-white">{payload[0].payload.name}</p>
                                  <p className="text-sm font-mono font-bold text-rose-455 mt-1">
                                    {formatCurrency(payload[0].value as number)}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                          {expensesByCategory.slice(0, 6).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f87171' : '#dc2626'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-850">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-zinc-500">Expense Category</TableHead>
                          <TableHead className="text-right text-zinc-500">Amount</TableHead>
                          <TableHead className="text-right text-zinc-500">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expensesByCategory.map((exp, idx) => (
                          <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-900/30">
                            <TableCell className="font-semibold text-zinc-300">{exp.name}</TableCell>
                            <TableCell className={`text-right font-mono ${financialValueClass(exp.amount)}`}>{formatCurrency(exp.amount)}</TableCell>
                            <TableCell className="text-right font-mono text-zinc-400">{exp.percentage}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Expenses</CardTitle>
                <span className="font-bold text-zinc-550 w-4 text-center text-sm select-none">{getCurrencySymbol(currencyState)}</span>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono tracking-tight ${financialValueClass(combinedMetrics.totalExpenses)}`}>
                  {formatCurrency(combinedMetrics.totalExpenses)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-rose-400 font-semibold">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  <span>Filtered by selected timeframe</span>
                </div>
              </CardContent>
            </ExpandableCard>

            <ExpandableCard 
              className="min-h-[164px] flex flex-col justify-between"
              expandedContent={
                <div className="flex flex-col h-full space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider text-center">AI Subscriptions Breakdown</h3>
                  {aiSpendSplitData.length > 0 ? (
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={aiSpendSplitData}
                            cx="50%"
                            cy="50%"
                            innerRadius={75}
                            outerRadius={110}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {aiSpendSplitData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value as number)} />
                          <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-[10px] text-zinc-400 font-sans">{value}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[320px] text-zinc-500 text-xs font-medium">
                      No AI Subscription expenses found in selected timeframe.
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-500 text-center max-w-sm mx-auto leading-relaxed">
                    Calculated dynamically based on active API keys, seat counts, and monthly consumption across OpenAI, Anthropic, and Midjourney.
                  </p>
                </div>
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">AI Subscriptions</CardTitle>
                <span className="font-bold text-zinc-550 w-4 text-center text-sm select-none">{getCurrencySymbol(currencyState)}</span>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono tracking-tight ${financialValueClass(combinedMetrics.aiSubscriptionCosts)}`}>
                  {formatCurrency(combinedMetrics.aiSubscriptionCosts)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-500 font-medium">
                  <span>Part of total expenses</span>
                </div>
              </CardContent>
            </ExpandableCard>

            <Card className="min-h-[164px] flex flex-col justify-between bg-zinc-900/90 border border-zinc-800/80 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cash Available</CardTitle>
                <Wallet className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold font-mono tracking-tight ${financialValueClass(combinedMetrics.grossBillings - combinedMetrics.totalExpenses)}`}>
                  {formatCurrency(combinedMetrics.grossBillings - combinedMetrics.totalExpenses)}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-semibold">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span>Available liquidity</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Row */}
          <div className="grid gap-6 xl:grid-cols-[minmax(220px,1fr)_minmax(0,4.2fr)] xl:items-stretch">
            {/* Left Column: Profitability Metrics */}
            <div className="flex min-h-[560px] flex-col gap-6">
              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex h-full min-h-0 flex-col gap-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Client Profit Breakdown</h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topClientsByProfit.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#a1a1aa', fontSize: 10 }} 
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#0d0e12] border border-zinc-800 rounded-md p-2 shadow-xl">
                                    <p className="text-xs font-semibold text-white">{payload[0].payload.name}</p>
                                    <p className={`text-sm font-mono font-bold mt-1 ${financialValueClass(payload[0].value as number, 'text-emerald-400')}`}>
                                      {formatCurrency(payload[0].value as number)}
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="profit" radius={[0, 4, 4, 0]}>
                            {topClientsByProfit.slice(0, 5).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#34d399' : '#059669'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-850">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="text-zinc-500">Client</TableHead>
                            <TableHead className="text-right text-zinc-500">Profit</TableHead>
                            <TableHead className="text-right text-zinc-500">Revenue</TableHead>
                            <TableHead className="text-right text-zinc-500">Expenses</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topClientsByProfit.map((c, idx) => (
                            <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-900/30">
                              <TableCell className="font-semibold text-zinc-300">{c.name}</TableCell>
                              <TableCell className={`text-right font-mono font-bold ${financialValueClass(c.profit, 'text-emerald-400')}`}>{formatCurrency(c.profit)}</TableCell>
                              <TableCell className={`text-right font-mono ${financialValueClass(c.revenue)}`}>{formatCurrency(c.revenue)}</TableCell>
                              <TableCell className={`text-right font-mono ${financialValueClass(c.expense, 'text-zinc-400')}`}>{formatCurrency(c.expense)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Net Profit (Amount)</CardTitle>
                  <span className="font-bold text-zinc-500 w-4 text-center text-sm select-none">{getCurrencySymbol(currencyState)}</span>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold font-mono tracking-tight ${financialValueClass(combinedMetrics.grossBillings - combinedMetrics.totalExpenses, 'text-emerald-400')}`}>
                    {formatCurrency(combinedMetrics.grossBillings - combinedMetrics.totalExpenses)}
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex h-full min-h-0 flex-col gap-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Client Profit Margin (%)</h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topClientsByMargin.slice(0, 5)} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                          <XAxis type="number" hide />
                          <YAxis 
                            dataKey="name" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#a1a1aa', fontSize: 10 }} 
                          />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-[#0d0e12] border border-zinc-800 rounded-md p-2 shadow-xl">
                                    <p className="text-xs font-semibold text-white">{payload[0].payload.name}</p>
                                    <p className={`text-sm font-mono font-bold mt-1 ${financialValueClass(payload[0].value as number, 'text-emerald-450')}`}>
                                      {(payload[0].value as number).toFixed(1)}%
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="margin" radius={[0, 4, 4, 0]}>
                            {topClientsByMargin.slice(0, 5).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#34d399' : '#059669'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-zinc-850">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-zinc-800 hover:bg-transparent">
                            <TableHead className="text-zinc-500">Client</TableHead>
                            <TableHead className="text-right text-zinc-500">Margin</TableHead>
                            <TableHead className="text-right text-zinc-500">Profit</TableHead>
                            <TableHead className="text-right text-zinc-500">Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {topClientsByMargin.map((c, idx) => (
                            <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-900/30">
                              <TableCell className="font-semibold text-zinc-300">{c.name}</TableCell>
                              <TableCell className={`text-right font-mono font-bold ${financialValueClass(c.margin, 'text-emerald-400')}`}>{c.margin.toFixed(1)}%</TableCell>
                              <TableCell className={`text-right font-mono ${financialValueClass(c.profit)}`}>{formatCurrency(c.profit)}</TableCell>
                              <TableCell className={`text-right font-mono ${financialValueClass(c.revenue, 'text-zinc-400')}`}>{formatCurrency(c.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Net Profit Margin</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold font-mono tracking-tight ${financialValueClass(combinedMetrics.netProfitMargin, 'text-emerald-400')}`}>
                    {combinedMetrics.netProfitMargin.toFixed(1)}%
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex h-full min-h-0 flex-col space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Receivables Queue</h3>
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                      {(dbData?.outstandingInvoices || []).length ? dbData.outstandingInvoices.map((invoice: any, index: number) => (
                        <div key={invoice.id} className="flex items-center justify-between gap-3 border-b border-zinc-800/70 pb-2 text-xs">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-zinc-200">{index + 1}. {invoice.invoiceNumber}</p>
                            <p className="truncate text-[10px] text-zinc-500">{invoice.clientName}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`font-mono font-bold ${financialValueClass(Number(invoice.pendingAmount), 'text-amber-400')}`}>{formatCurrency(invoice.pendingAmount)}</span>
                            <Button size="sm" className="h-7 px-2 text-[10px]" onClick={(event) => { event.stopPropagation(); addReceivableAsRevenue(invoice); }}>
                              Add revenue
                            </Button>
                          </div>
                        </div>
                      )) : <p className="text-xs text-zinc-500">No invoices have an outstanding balance.</p>}
                    </div>
                  </div>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Outstanding</CardTitle>
                  <Wallet className="h-4 w-4 text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold font-mono tracking-tight ${financialValueClass(combinedMetrics.outstandingAmount, 'text-amber-400')}`}>
                    {formatCurrency(combinedMetrics.outstandingAmount)}
                  </div>
                </CardContent>
              </ExpandableCard>
            </div>
            
            {/* Center Column: Overall finance over time */}
            <div className="min-h-[560px] flex flex-col">
              <div className="flex-1">
                <RevenueLineChart
                  data={loadingFinanceTimeframe ? [] : revenueLineData}
                  title="Overall Revenue, Expenses & Receivables"
                  description={loadingFinanceTimeframe
                    ? `Loading ${timeFrame.toLowerCase()} data…`
                    : `${timeFrame} view · recognized revenue, recorded expenses, and running invoice balances.`}
                  currencyRate={1}
                  className="h-full min-h-[560px] w-full"
                  contentClassName="h-[430px] md:h-[452px]"
                />
              </div>
            </div>

            {/* Right Column: Customize Report Engine Card */}
            <div className="hidden">
              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full space-y-4 font-sans text-xs">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Customize Financial Report</h3>
                      <p className="text-[10px] text-zinc-500 mt-1">Configure dimensions to slice financial ledger data.</p>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">X-Axis Grouping</label>
                        <select
                          value={reportXAxis}
                          onChange={(e) => setReportXAxis(e.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:outline-none cursor-pointer"
                        >
                          <option value="Client">Client</option>
                          <option value="Category">Category (Expenses)</option>
                          <option value="Ledger Type">Ledger Type</option>
                          <option value="Time (Monthly)">Time (Monthly)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">Y-Axis Metric</label>
                        <select
                          value={reportYAxis}
                          onChange={(e) => setReportYAxis(e.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:outline-none cursor-pointer"
                        >
                          <option value="Revenue">Revenue</option>
                          <option value="Expenses">Expenses</option>
                          <option value="Net Profit">Net Profit</option>
                          <option value="Profit Margin">Profit Margin (%)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">Timeframe</label>
                        <select
                          value={reportTimeframe}
                          onChange={(e) => setReportTimeframe(e.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:outline-none cursor-pointer"
                        >
                          <option value="All Time">All Time</option>
                          <option value="Yearly">Yearly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Monthly">Monthly</option>
                        </select>
                      </div>
                    </div>
                  </div>
                }
                expandedFooter={
                  <Button
                    onClick={() => generateCustomReport(reportXAxis, reportYAxis, reportTimeframe)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Generate Report</span>
                  </Button>
                }
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Financial Reports</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col justify-between h-full py-2">
                  <p className="text-xs text-zinc-400 leading-normal mb-4">
                    Build custom financial reports by selecting grouping parameters, target metrics, and custom timeframes dynamically.
                  </p>
                  <Button className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-xs mt-auto cursor-pointer">
                    Customize reports
                  </Button>
                </CardContent>
              </ExpandableCard>
            </div>
          </div>

          {isFinancialReportOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="financial-report-title">
              <button type="button" className="absolute inset-0 bg-black/80 backdrop-blur-sm" aria-label="Close financial report builder" onClick={() => setIsFinancialReportOpen(false)} />
              <Card className="relative z-10 w-full max-w-xl border-zinc-700 shadow-2xl">
                <CardHeader>
                  <CardTitle id="financial-report-title" className="text-base text-white">Customize Financial Report</CardTitle>
                  <CardDescription>Choose how to group and measure your financial ledger.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <label className="block space-y-1.5"><span className="font-semibold text-zinc-400">X-Axis Grouping</span><select value={reportXAxis} onChange={(event) => setReportXAxis(event.target.value)} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white"><option value="Client">Client</option><option value="Category">Category (Expenses)</option><option value="Ledger Type">Ledger Type</option><option value="Time (Monthly)">Time (Monthly)</option></select></label>
                  <label className="block space-y-1.5"><span className="font-semibold text-zinc-400">Y-Axis Metric</span><select value={reportYAxis} onChange={(event) => setReportYAxis(event.target.value)} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white"><option value="Revenue">Revenue</option><option value="Expenses">Expenses</option><option value="Net Profit">Net Profit</option><option value="Profit Margin">Profit Margin (%)</option></select></label>
                  <label className="block space-y-1.5"><span className="font-semibold text-zinc-400">Timeframe</span><select value={reportTimeframe} onChange={(event) => setReportTimeframe(event.target.value)} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white"><option value="All Time">All Time</option><option value="Yearly">Yearly</option><option value="Quarterly">Quarterly</option><option value="Monthly">Monthly</option></select></label>
                  <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={() => setIsFinancialReportOpen(false)}>Cancel</Button><Button onClick={() => { generateCustomReport(reportXAxis, reportYAxis, reportTimeframe); setIsFinancialReportOpen(false); }}>Generate report</Button></div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Dynamic Customized Report Output (Below the main section grid) */}
          {customReport && (
            <div ref={reportRef} className="animate-fadeIn pt-4 scroll-mt-6">
              <Card className="border-zinc-800 bg-zinc-950/40 w-full">
                <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-850 pb-3">
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">
                      Generated Financial Report: {customReport.yAxis} by {customReport.xAxis}
                    </CardTitle>
                    <CardDescription className="text-[10px]">
                      Filtered by timeframe: {customReport.timeframe}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCustomReport(null)}
                    className="h-7 text-zinc-500 hover:text-white text-[10px] hover:bg-zinc-800"
                  >
                    Clear Report
                  </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {customReport.data.length > 0 ? (
                    <>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={customReport.data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <XAxis 
                              dataKey="label" 
                              tick={{ fill: '#a1a1aa', fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis 
                              tick={{ fill: '#a1a1aa', fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                              tickFormatter={(val) => customReport.yAxis.includes('Margin') ? `${val.toFixed(0)}%` : formatCurrency(val)}
                            />
                            <Tooltip 
                              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-[#0d0e12] border border-zinc-800 rounded-md p-2 shadow-xl">
                                      <p className="text-xs font-semibold text-white">{payload[0].payload.label}</p>
                                      <p className={`text-sm font-mono font-bold mt-1 ${financialValueClass(payload[0].value as number)}`}>
                                        {customReport.yAxis.includes('Margin') ? `${(payload[0].value as number).toFixed(1)}%` : formatCurrency(payload[0].value as number)}
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="border border-zinc-850 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-zinc-800 hover:bg-transparent">
                              <TableHead className="text-zinc-500">{customReport.xAxis}</TableHead>
                              <TableHead className="text-right text-zinc-500">{customReport.yAxis}</TableHead>
                              {customReport.yAxis !== 'Revenue' && <TableHead className="text-right text-zinc-500">Revenue</TableHead>}
                              {customReport.yAxis !== 'Expenses' && <TableHead className="text-right text-zinc-500">Expenses</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {customReport.data.map((row, idx) => (
                              <TableRow key={idx} className="border-zinc-800 hover:bg-zinc-900/30">
                                <TableCell className="font-semibold text-zinc-300">{row.label}</TableCell>
                                <TableCell className={`text-right font-mono font-bold ${financialValueClass(row.value)}`}>
                                  {customReport.yAxis.includes('Margin') ? `${row.value.toFixed(1)}%` : formatCurrency(row.value)}
                                </TableCell>
                                {customReport.yAxis !== 'Revenue' && <TableCell className={`text-right font-mono ${financialValueClass(row.revenue, 'text-zinc-400')}`}>{formatCurrency(row.revenue)}</TableCell>}
                                {customReport.yAxis !== 'Expenses' && <TableCell className={`text-right font-mono ${financialValueClass(row.expenses, 'text-zinc-400')}`}>{formatCurrency(row.expenses)}</TableCell>}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-zinc-500 text-xs font-semibold">
                      No transaction data matched the report filter.
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}
        </div>
      )}
      {/* LEDGER TAB */}
      {activeTab === 'manual' && (
        <div className="space-y-6 animate-fadeIn font-sans text-xs">
          <div className="grid gap-6 md:grid-cols-3">
            {/* Transactions List */}
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">Combined Financial Ledger</CardTitle>
                    <CardDescription>Consolidated real-time transaction event logs across all channels.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 border-zinc-800 text-zinc-400 gap-1">
                    <Filter className="h-3 w-3" />
                    <span>Filters</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ledger Type</TableHead>
                        <TableHead>Transaction details</TableHead>
                        <TableHead>Date Logged</TableHead>
                        <TableHead className="text-right">Amount ({currencyState})</TableHead>
                        <TableHead className="text-right">Transaction Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combinedTransactions.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] bg-zinc-950 font-bold tracking-wide text-zinc-300">
                              {txn.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-zinc-300">{txn.customer || txn.details}</TableCell>
                          <TableCell className="font-mono text-zinc-400">{formatLedgerDate(txn.date)}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-white">
                            {formatCurrency(txn.amountUSD)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={String(txn.rawStatus).toLowerCase() === 'revenue' ? 'risk-low' : 'outline'}
                            >
                              {String(txn.rawStatus || '').replaceAll('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {txn.source === 'Manual Ledger' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTransactionDelete(txn.transactionId)}
                                className="h-7 px-2 text-rose-400 hover:bg-rose-950/30 hover:text-rose-300"
                                aria-label={`Remove transaction ${txn.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="ml-1">Remove</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recurring Subscriptions Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Recurring Subscriptions & Expenses</CardTitle>
                  <CardDescription>Configure recurring SaaS and operations commitments to dynamically generate transaction occurrences.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                      {loadingSubs ? (
                        <div className="text-center py-6 text-zinc-500 font-mono">Loading active subscriptions...</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Frequency</TableHead>
                              <TableHead>Start Date</TableHead>
                              <TableHead className="text-right">Amount</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {subscriptions.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-zinc-500">
                                  No active recurring subscriptions or expenses configured.
                                </TableCell>
                              </TableRow>
                            ) : (
                              subscriptions.map((sub: any) => (
                                <TableRow key={sub.id}>
                                  <TableCell className="font-semibold text-white">{sub.name}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-[9px] bg-zinc-950 font-bold text-zinc-400">
                                      {sub.category}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="capitalize text-zinc-455">{sub.frequency}</TableCell>
                                  <TableCell className="text-zinc-400">
                                    {new Date(sub.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </TableCell>
                                  <TableCell className={`text-right font-mono font-semibold ${financialValueClass(Number(sub.amount))}`}>
                                    {formatCurrency(sub.amount)}
                                  </TableCell>
                                  <TableCell className="text-right space-x-2 text-[10px]">
                                    <button
                                      onClick={() => {
                                        setEditingSub(sub);
                                        setEditAmount(sub.amount.toString());
                                        setEditFrequency(sub.frequency);
                                      }}
                                      className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleSubDelete(sub.id)}
                                      className="text-red-400 hover:text-red-300 font-semibold hover:underline"
                                    >
                                      Remove
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    <div className="space-y-4 bg-zinc-900/10 p-4 border border-zinc-900 rounded">
                      <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Add Committed Expense</h4>
                      <form onSubmit={handleSubSubmit} className="space-y-3 font-sans text-xs">
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block text-[9px] uppercase tracking-wider">Name / Details</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. ChatGPT Plus"
                            value={subName}
                            onChange={(e) => setSubName(e.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block text-[9px] uppercase tracking-wider">Amount ({currencyState})</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={subAmount}
                            onChange={(e) => setSubAmount(e.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block text-[9px] uppercase tracking-wider">Category</label>
                          <select
                            value={subCategory}
                            onChange={(e) => setSubCategory(e.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none transition-all"
                          >
                            <option value="AI subscriptions">AI subscriptions</option>
                            <option value="Software subscriptions">Software subscriptions</option>
                            <option value="Other subscriptions">Other subscriptions</option>
                            <option value="Expense">Expense</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block text-[9px] uppercase tracking-wider">Frequency</label>
                          <select
                            value={subFrequency}
                            onChange={(e) => setSubFrequency(e.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none transition-all"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="font-semibold text-zinc-400 block text-[9px] uppercase tracking-wider">Start Date</label>
                          <DateInput
                            required
                            value={subStartDate}
                            onChange={(value) => setSubStartDate(value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                          />
                        </div>
                        <Button type="submit" className="w-full text-xs h-9 bg-white text-zinc-950 hover:bg-zinc-200 mt-2">
                          Add Subscription
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
            </div>

            {/* Forms Panel */}
            <div className="space-y-6">
              {/* Single Manual Entry Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Manual Ledger Entry</CardTitle>
                  <CardDescription>Manually record a single transaction event in the ledger.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualSubmit} className="space-y-4 font-sans text-xs">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Date</label>
                      <DateInput
                        required
                        value={formDate}
                        onChange={(value) => setFormDate(value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                    </div>

                    {formCategory !== 'Revenue' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Transaction Details</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Retainer Payment"
                            value={formDetails}
                            onChange={(e) => setFormDetails(e.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                          />
                        </div>
                      </>
                    )}

                                        <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Transaction Type</label>
                      <select
                        value={formCategory}
                        onChange={(e) => {
                          setFormCategory(e.target.value);
                          if (e.target.value !== 'Revenue') {
                            setFormInvoiceId('');
                          }
                        }}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      >
                        <option value="Revenue">Revenue</option>
                        <option value="Expense">Expense</option>
                      </select>
                    </div>

                    {formCategory === 'Revenue' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Invoice Number</label>
                          <select
                            required
                            value={formInvoiceId}
                            onChange={(event) => setFormInvoiceId(event.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                          >
                            <option value="">Select invoice number...</option>
                            {outstandingInvoices.map((invoice) => (
                              <option key={invoice.id} value={invoice.id}>
                                {invoice.invoiceNumber} - {invoice.client?.name} - {invoice.project?.name} ({formatCurrency(invoice.balanceDue)})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {formCategory !== 'Revenue' && (
                      <>
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Payment Method</label>
                          <select
                            value={formType}
                            onChange={(e) => setFormType(e.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                          >
                            <option value="UPI">UPI</option>
                            <option value="IMPS">IMPS</option>
                            <option value="NEFT">NEFT</option>
                            <option value="Cash">Cash</option>
                            <option value="Others">Others</option>
                          </select>
                          {formType === 'Others' && (
                            <div className="p-2 bg-amber-950/15 border border-amber-900/30 text-amber-400 rounded text-[10px] leading-relaxed">
                              Note: Please specify the transaction type details in the comments field.
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Client <span className="font-normal text-zinc-600">(optional)</span></label>
                          <select
                            value={formClientId}
                            onChange={(event) => setFormClientId(event.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                          >
                            <option value="">No associated client</option>
                            {ledgerClients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                          </select>
                        </div>

                      </>
                    )}

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Bank <span className="font-normal text-zinc-600">(optional)</span></label>
                      {bankNames.length > 0 ? (
                        <select
                          value={formYourAccount}
                          onChange={(e) => setFormYourAccount(e.target.value)}
                          className="w-full rounded border border-zinc-800 bg-zinc-900/40 p-2 text-white focus:border-zinc-700 focus:bg-zinc-900 focus:outline-none transition-all cursor-pointer"
                        >
                          <option value="">Select bank account...</option>
                          {bankNames.map((bank, index) => (
                            <option key={index} value={bank}>{bank}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="e.g. HDFC Bank, SBI..."
                            value={formYourAccount}
                            onChange={(e) => setFormYourAccount(e.target.value)}
                            className="w-full rounded border border-zinc-800 bg-zinc-900/40 p-2 text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900 focus:outline-none transition-all"
                          />
                          <div className="rounded border border-zinc-800 bg-zinc-900/45 p-2 text-[10px] text-zinc-400 leading-relaxed font-sans">
                            <span className="font-semibold text-white block mb-0.5">Info: Bank accounts config</span>
                            You can configure up to 5 default bank accounts in your settings profile to select them as a dropdown here.
                            <button
                              type="button"
                              onClick={() => {
                                window.location.href = '/settings?tab=profile';
                              }}
                              className="text-white hover:underline block mt-1 font-semibold cursor-pointer text-left text-[10px]"
                            >
                              Go to Settings Profile &rarr;
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Amount ({currencyState})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                    </div>

                    {formCategory !== 'Revenue' && <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Comments</label>
                      <textarea
                        placeholder="Transaction notes..."
                        value={formComments}
                        onChange={(e) => setFormComments(e.target.value)}
                        className="w-full h-16 rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all font-sans text-xs resize-none"
                      />
                    </div>}

                    <Button
                      type="submit"
                      disabled={isSavingTransaction}
                      className="w-full h-9 bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-250 cursor-pointer"
                    >
                      {isSavingTransaction ? 'Saving transaction…' : 'Save Transaction'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Bulk Imports Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Bulk Financial Import</CardTitle>
                  <CardDescription>Download templates and upload filled statements for bulk entry.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 font-sans text-xs">
                  {/* Download Template Buttons */}
                  <div>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="flex w-full items-center justify-center gap-1.5 py-2 px-3 border border-zinc-855 hover:border-zinc-750 rounded text-[10px] font-semibold text-zinc-300 bg-zinc-900/20 hover:bg-zinc-900 cursor-pointer transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      <span>Excel Template</span>
                    </button>
                  </div>

                  {/* Upload Dropzone */}
                  <div className={`relative border border-dashed rounded-lg p-5 transition-all text-center flex flex-col items-center justify-center ${
                    isImportingTransactions
                      ? 'border-zinc-700 bg-zinc-900/30 cursor-wait'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/10 hover:bg-zinc-900/20 cursor-pointer'
                  }`}>
                    <input
                      type="file"
                      accept=".xlsx"
                      onChange={handleFileUpload}
                      disabled={isImportingTransactions}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-wait"
                    />
                    {isImportingTransactions ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none text-zinc-300 mb-2" />
                        <span className="block font-semibold text-zinc-200">Processing workbook…</span>
                        <span className="block text-[9px] text-zinc-500 mt-1">Validating rows and adding transactions to the ledger.</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-zinc-450 mb-2" />
                        <span className="block font-semibold text-zinc-300">Upload Filled Template</span>
                        <span className="block text-[9px] text-zinc-550 mt-1">Accepts the IrisOS XLSX template only</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
      {editingSub && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fadeIn text-xs">
          <Card className="w-full max-w-sm border-zinc-800 bg-[#0d0e12] p-2 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase text-white">Edit Subscription</CardTitle>
              <CardDescription>Modify cost parameters or recurrence bounds for {editingSub.name}.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubEdit} className="space-y-4 font-sans">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Amount ({currencyState})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full rounded border border-zinc-855 bg-zinc-900/40 p-2 text-white focus:outline-none focus:border-zinc-750"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Frequency</label>
                  <select
                    value={editFrequency}
                    onChange={(e) => setEditFrequency(e.target.value)}
                    className="w-full rounded border border-zinc-855 bg-zinc-900/40 p-2 text-white focus:outline-none focus:border-zinc-750"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="ghost" onClick={() => setEditingSub(null)} className="text-xs h-9 text-zinc-400">
                    Cancel
                  </Button>
                  <Button type="submit" className="text-xs h-9 bg-white text-zinc-950 hover:bg-zinc-200">
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
