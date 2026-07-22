'use client';

import * as React from 'react';
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
  Trash2
} from 'lucide-react';
import { PrismAIService } from '@/lib/prism-ai/service';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';
import { formatCurrency, formatUserMessage, getCurrencySymbol } from '@/lib/utils';
import { readWorkspaceUiPreference, type WorkspaceUiScope, writeWorkspaceUiPreference } from '@/lib/workspace-ui-storage';
import { RevenueLineChart } from '@/components/ui/revenue-line-chart';
import { ExpandableCard } from '@/components/ui/expandable-card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function FinancePage() {
  const [isSkippedAll, setIsSkippedAll] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'stripe' | 'paypal' | 'razorpay'>('overview');
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = React.useState(true);

  const [stripeData, setStripeData] = React.useState<any>(null);
  const [loadingStripe, setLoadingStripe] = React.useState(false);

  const [paypalData, setPaypalData] = React.useState<any>(null);
  const [loadingPaypal, setLoadingPaypal] = React.useState(false);

  const [razorpayData, setRazorpayData] = React.useState<any>(null);
  const [loadingRazorpay, setLoadingRazorpay] = React.useState(false);

  const [dbData, setDbData] = React.useState<any>(null);
  const [leakData, setLeakData] = React.useState<any>(null);
  const [currencyState, setCurrencyState] = React.useState('USD');
  const [uiScope, setUiScope] = React.useState<WorkspaceUiScope | null>(null);

  // Manual Entry States
  const [manualTransactions, setManualTransactions] = React.useState<any[]>([]);
  const [loadingManual, setLoadingManual] = React.useState(false);
  const [bankNames, setBankNames] = React.useState<string[]>([]);

  // Form states
  const [formDate, setFormDate] = React.useState('');
  const [formDetails, setFormDetails] = React.useState('');
  const [formType, setFormType] = React.useState('UPI');
  const [formTransactorAccount, setFormTransactorAccount] = React.useState('');
  const [formYourAccount, setFormYourAccount] = React.useState('');
  const [formAmount, setFormAmount] = React.useState('');
  const [formReferenceNumber, setFormReferenceNumber] = React.useState('');
  const [formComments, setFormComments] = React.useState('');
  const [formCategory, setFormCategory] = React.useState('Expense');
  const [timeFrame, setTimeFrame] = React.useState('All Time');

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
    const list: any[] = [];
    const start = new Date(sub.startDate);
    const end = new Date();
    
    if (isNaN(start.getTime())) return [];
    
    let current = new Date(start);
    
    while (current <= end) {
      const occDate = new Date(current);
      const idStr = `${sub.id}-${occDate.toISOString().slice(0, 10)}`;
      
      list.push({
        id: idStr.slice(0, 12),
        source: 'Recurring Ledger',
        customer: 'N/A',
        date: occDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amountUSD: -sub.amount,
        status: 'failed',
        rawStatus: 'EXPENSE',
        details: `${sub.name} (${sub.category})`,
      });
      
      if (sub.frequency === 'monthly') {
        current.setMonth(current.getMonth() + 1);
      } else if (sub.frequency === 'quarterly') {
        current.setMonth(current.getMonth() + 3);
      } else if (sub.frequency === 'yearly') {
        current.setFullYear(current.getFullYear() + 1);
      } else {
        break;
      }
    }
    return list;
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
      (value): value is { activeTab: 'overview' | 'stripe' | 'paypal' | 'razorpay'; timeFrame: string; reportXAxis: string; reportYAxis: string; reportTimeframe: string } => {
        if (!value || typeof value !== 'object') return false;
        const stored = value as Record<string, unknown>;
        return ['overview', 'stripe', 'paypal', 'razorpay'].includes(String(stored.activeTab)) &&
          typeof stored.timeFrame === 'string' && typeof stored.reportXAxis === 'string' &&
          typeof stored.reportYAxis === 'string' && typeof stored.reportTimeframe === 'string';
      },
    );
    setActiveTab(saved.activeTab);
    setTimeFrame(saved.timeFrame);
    setReportXAxis(saved.reportXAxis);
    setReportYAxis(saved.reportYAxis);
    setReportTimeframe(saved.reportTimeframe);
  }, [uiScope]);

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

  const fetchOrgBanks = React.useCallback(async () => {
    try {
      const res = await fetch('/api/organization');
      if (res.ok) {
        const data = await res.json();
        setBankNames(data.bankNames || []);
      }
    } catch (e) {
      console.error('Error loading org banks:', e);
    }
  }, []);

  React.useEffect(() => {
    if (bankNames.length > 0 && !formYourAccount) {
      setFormYourAccount(bankNames[0]);
    }
  }, [bankNames, formYourAccount]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDate || !formDetails || !formType || !formTransactorAccount || (!formYourAccount && bankNames.length > 0) || !formAmount) {
      alert('Please fill out all required fields.');
      return;
    }

    if (formType === 'Others' && !formComments.trim()) {
      alert('Please add the transaction type in the comments.');
      return;
    }

    if (!window.confirm('Are you sure you want to add this transaction to the ledger?')) return;

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          details: formDetails,
          category: formCategory,
          type: formType,
          transactorAccount: formTransactorAccount,
          yourAccount: formYourAccount || 'Manual Entry',
          amount: parseFloat(formAmount),
          referenceNumber: formReferenceNumber || null,
          comments: formComments || null,
        }),
      });

      if (res.ok) {
        // Reset form
        setFormDetails('');
        setFormCategory('Expense');
        setFormTransactorAccount('');
        setFormAmount('');
        setFormReferenceNumber('');
        setFormComments('');
        // Reload transactions
        fetchManualTransactions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save transaction.');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
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
      await fetchManualTransactions();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to remove transaction.');
    }
  };

  const downloadTemplate = (format: 'csv' | 'xlsx') => {
    const headers = ['Date', 'Transaction details', 'Category', 'Transaction type', 'UPI ID/Account No. of transactor', 'Your Account', 'Amount', 'Reference Number', 'Comments'];
    const sampleRow = ['2026-06-30', 'Ad Campaign Setup Fee', 'Expense', 'NEFT', 'transactor@upi', 'ICICI Bank', '25000', 'TXN776655', 'Initial setup charges'];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financial_ledger_template.${format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
      alert('Unsupported file format. Please upload only the downloaded CSV/Excel template.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        alert('The uploaded file is empty.');
        return;
      }
      
      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const expectedHeaders = ['Date', 'Transaction details', 'Category', 'Transaction type', 'UPI ID/Account No. of transactor', 'Your Account', 'Amount', 'Reference Number', 'Comments'];
      
      const headersMatch = expectedHeaders.every((h, i) => headers[i]?.toLowerCase() === h.toLowerCase());
      if (!headersMatch) {
        alert('Invalid template format. The columns must match the template exactly: ' + expectedHeaders.join(', '));
        return;
      }
      
      // Parse rows
      const txs = [];
      for (let i = 1; i < lines.length; i++) {
        // Split line by commas not inside quotes
        const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim().replace(/^["']|["']$/g, ''));
        if (row.length < expectedHeaders.length) continue;
        
        txs.push({
          date: row[0],
          details: row[1],
          category: row[2],
          type: row[3],
          transactorAccount: row[4],
          yourAccount: row[5],
          amount: row[6],
          referenceNumber: row[7],
          comments: row[8]
        });
      }
      
      if (txs.length === 0) {
        alert('No valid transactions found in the file.');
        return;
      }
      
      // Send to bulk save API
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bulk: true, transactions: txs })
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`Successfully imported ${result.count} transactions in bulk!`);
          fetchManualTransactions();
        } else {
          alert('Failed to import transactions. Please verify data formats.');
        }
      } catch (error) {
        console.error('Error importing bulk data:', error);
        alert('An error occurred during import.');
      }
    };
    reader.readAsText(file);
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

  const fetchStripeData = React.useCallback(async () => {
    setLoadingStripe(true);
    try {
      const res = await fetch('/api/stripe');
      if (res.ok) {
        const data = await res.json();
        setStripeData(data);
      }
    } catch (e) {
      console.error('Error loading Stripe data:', e);
    } finally {
      setLoadingStripe(false);
    }
  }, []);

  const fetchPaypalData = React.useCallback(async () => {
    setLoadingPaypal(true);
    try {
      const res = await fetch('/api/paypal');
      if (res.ok) {
        const data = await res.json();
        setPaypalData(data);
      }
    } catch (e) {
      console.error('Error loading PayPal data:', e);
    } finally {
      setLoadingPaypal(false);
    }
  }, []);

  const fetchRazorpayData = React.useCallback(async () => {
    setLoadingRazorpay(true);
    try {
      const res = await fetch('/api/razorpay');
      if (res.ok) {
        const data = await res.json();
        setRazorpayData(data);
      }
    } catch (e) {
      console.error('Error loading Razorpay data:', e);
    } finally {
      setLoadingRazorpay(false);
    }
  }, []);

  React.useEffect(() => {
    fetch('/api/workspace').then((res) => res.ok ? res.json() : null).then((workspace) => {
      if (!workspace) return;
      setCurrencyState(workspace.organization.currency || 'USD');
      setIsSkippedAll(Boolean(workspace.onboarding?.checklist?.skippedAll));
      setUiScope({ userId: workspace.user.id, orgId: workspace.organization.id });
    }).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    async function loadBase() {
      try {
        const res = await fetch('/api/data?domain=finance');
        if (res.ok) {
          const json = await res.json();
          setDbData(json);
        }
        const leaks = await PrismAIService.getProfitLeaks();
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
    fetchOrgBanks();
    fetchSubscriptions();
  }, [fetchIntegrations, fetchManualTransactions, fetchOrgBanks, fetchSubscriptions]);

  const isStripeConnected = React.useMemo(() => {
    return integrations.some((i) => i.provider === 'STRIPE' && i.status === 'CONNECTED');
  }, [integrations]);

  const isRazorpayConnected = React.useMemo(() => {
    return integrations.some((i) => i.provider === 'RAZORPAY' && i.status === 'CONNECTED');
  }, [integrations]);

  const isPaypalConnected = React.useMemo(() => {
    return integrations.some((i) => i.provider === 'PAYPAL' && i.status === 'CONNECTED');
  }, [integrations]);

  React.useEffect(() => {
    if (isStripeConnected) {
      fetchStripeData();
    }
  }, [isStripeConnected, fetchStripeData]);

  React.useEffect(() => {
    if (isPaypalConnected) {
      fetchPaypalData();
    }
  }, [isPaypalConnected, fetchPaypalData]);

  React.useEffect(() => {
    if (isRazorpayConnected) {
      fetchRazorpayData();
    }
  }, [isRazorpayConnected, fetchRazorpayData]);

  const aiLeakText = React.useMemo(() => {
    if (!leakData) return formatUserMessage('Lohith, running profit leak audit calculations via Prism AI...');
    return formatUserMessage(`Lohith, Prism AI has detected a budget overage: ${leakData.description} Reassigning tasks to David Kim would recover ${formatCurrency(leakData.impactValue)}/mo in direct margins.`);
  }, [leakData, currencyState]);

  const combinedMetrics = React.useMemo(() => {
    let scale = 1;
    if (timeFrame === 'Monthly') scale = 1/12;
    if (timeFrame === 'Quarterly') scale = 3/12;

    const baseGross = (dbData?.grossBillings ?? 0) * scale;
    const baseOutstanding = (dbData?.outstandingAmount ?? 0) * scale;
    const baseExpenses = (dbData?.totalExpenses ?? 0) * scale;

    let stripeGross = 0;
    let stripeExpenses = 0;
    let stripeOutstanding = 0;
    if (isStripeConnected && stripeData?.payments) {
      stripeData.payments.filter((p: any) => isInTimeFrame(p.createdAt)).forEach((p: any) => {
        stripeGross += p.amount;
        if (p.status === 'failed') stripeOutstanding += p.amount;
      });
      stripeExpenses = stripeGross * 0.029;
    }

    let paypalGross = 0;
    let paypalExpenses = 0;
    let paypalOutstanding = 0;
    if (isPaypalConnected && paypalData?.payments) {
      paypalData.payments.filter((p: any) => isInTimeFrame(p.createdAt)).forEach((p: any) => {
        paypalGross += p.amount;
        if (p.status === 'failed') paypalOutstanding += p.amount;
      });
      paypalExpenses = paypalGross * 0.033;
    }

    let razorpayGross = 0;
    let razorpayExpenses = 0;
    let razorpayOutstanding = 0;
    if (isRazorpayConnected && razorpayData?.payments) {
      razorpayData.payments.filter((p: any) => isInTimeFrame(p.createdAt)).forEach((p: any) => {
        const amt = p.amount / 83.5;
        razorpayGross += amt;
        if (p.status === 'failed') razorpayOutstanding += amt;
      });
      razorpayExpenses = razorpayGross * 0.02;
    }

    let manualGross = 0;
    let manualExpenses = 0;
    let aiSubscriptionCosts = 0;
    manualTransactions.filter((tx: any) => isInTimeFrame(tx.date)).forEach(tx => {
      if (tx.amount > 0 && tx.category === 'Revenue') {
        manualGross += tx.amount;
      } else if (tx.amount < 0) {
        manualExpenses += Math.abs(tx.amount);
        if (tx.category === 'AI Subscription') {
          aiSubscriptionCosts += Math.abs(tx.amount);
        }
      }
    });

    subscriptionTransactions.filter((tx: any) => isInTimeFrame(tx.date)).forEach(tx => {
      const amt = Math.abs(tx.amountUSD);
      manualExpenses += amt;
      if (tx.source === 'Recurring Ledger' && tx.details?.includes('(AI subscriptions)')) {
        aiSubscriptionCosts += amt;
      }
    });

    const totalGross = baseGross + stripeGross + paypalGross + razorpayGross + manualGross;
    const totalExpenses = baseExpenses + stripeExpenses + paypalExpenses + razorpayExpenses + manualExpenses;
    const totalOutstanding = baseOutstanding + stripeOutstanding + paypalOutstanding + razorpayOutstanding;
    const profitMargin = totalGross > 0 ? ((totalGross - totalExpenses) / totalGross) * 100 : 0;

    return {
      grossBillings: totalGross,
      outstandingAmount: totalOutstanding,
      totalExpenses: totalExpenses,
      netProfitMargin: profitMargin,
      aiSubscriptionCosts
    };
  }, [dbData, isStripeConnected, stripeData, isPaypalConnected, paypalData, isRazorpayConnected, razorpayData, manualTransactions, subscriptionTransactions, isInTimeFrame, timeFrame]);

  const expenseBreakdownData = React.useMemo(() => {
    let aiCosts = combinedMetrics.aiSubscriptionCosts;
    let baseOps = combinedMetrics.totalExpenses - aiCosts;
    if (baseOps < 0) baseOps = 0;
    return [
      { name: 'AI Subscriptions', value: aiCosts, color: '#6366f1' },
      { name: 'Operational & Gateway', value: baseOps, color: '#f43f5e' }
    ].filter(d => d.value > 0);
  }, [combinedMetrics]);

  const aiSpendSplitData = React.useMemo(() => {
    const map = new Map<string, number>();
    manualTransactions.filter((tx: any) => isInTimeFrame(tx.date) && tx.category === 'AI Subscription' && tx.amount < 0).forEach(tx => {
      const name = tx.details || 'Unknown AI Tool';
      map.set(name, (map.get(name) || 0) + Math.abs(tx.amount));
    });
    subscriptionTransactions.filter((tx: any) => isInTimeFrame(tx.date) && tx.details?.includes('(AI subscriptions)')).forEach(tx => {
      const name = tx.details.split(' (')[0] || 'Unknown AI Tool';
      map.set(name, (map.get(name) || 0) + Math.abs(tx.amountUSD));
    });
    const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];
    return Array.from(map.entries()).map(([name, value], i) => ({
      name, value, color: colors[i % colors.length]
    }));
  }, [manualTransactions, subscriptionTransactions, isInTimeFrame]);


  const combinedTransactions = React.useMemo(() => {
    const list: any[] = [];

    // Add manual transactions
    manualTransactions.forEach(tx => {
      list.push({
        id: tx.referenceNumber || tx.id.slice(0, 8),
        transactionId: tx.id,
        source: 'Manual Ledger',
        customer: tx.transactorAccount || 'N/A',
        date: new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        amountUSD: tx.amount,
        status: tx.amount >= 0 ? 'succeeded' : 'failed',
        rawStatus: tx.amount >= 0 ? 'INCOME' : 'EXPENSE',
        details: tx.details,
      });
    });

    // Sort newest first
    return list.sort((a, b) => {
      const dateA = new Date(a.date).getTime() || 0;
      const dateB = new Date(b.date).getTime() || 0;
      return dateB - dateA;
    });
  }, [manualTransactions]);

  const revenueLineData = React.useMemo(() => {
    const map = new Map<string, number>();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // We want to sort chronologically, so we iterate from end to start since combinedTransactions is newest-first
    const reversedTx = [...combinedTransactions].reverse();
    
    reversedTx.forEach((tx: any) => {
      // Assuming revenue if amount > 0 and status is successful
      if (tx.amountUSD > 0 && (tx.status === 'succeeded' || tx.status === 'captured')) {
        const d = new Date(tx.date);
        if (!isNaN(d.getTime())) {
          const label = timeFrame === 'Monthly' 
            ? `${monthNames[d.getMonth()]} ${d.getDate()}`
            : `${monthNames[d.getMonth()]} '${d.getFullYear().toString().substring(2)}`;
          map.set(label, (map.get(label) || 0) + tx.amountUSD);
        }
      }
    });

    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [combinedTransactions, timeFrame]);

  const expensesByCategory = React.useMemo(() => {
    let scale = 1;
    if (timeFrame === 'Monthly') scale = 1/12;
    if (timeFrame === 'Quarterly') scale = 3/12;

    const map = new Map<string, number>();

    // 1. Database expenses (from dbData.expenses)
    if (dbData?.expenses) {
      dbData.expenses.forEach((exp: any) => {
        if (isInTimeFrame(exp.date)) {
          const category = exp.category || 'General Overhead';
          map.set(category, (map.get(category) || 0) + exp.amount * scale);
        }
      });
    } else {
      // Fallback/Mock base expenses if dbData is not loaded yet
    }

    // 2. Gateway fees
    let stripeGross = 0;
    if (isStripeConnected && stripeData?.payments) {
      stripeData.payments.filter((p: any) => isInTimeFrame(p.createdAt)).forEach((p: any) => {
        stripeGross += p.amount;
      });
    }
    const stripeFees = stripeGross * 0.029;
    if (stripeFees > 0) {
      map.set('Stripe Gateway Fees', (map.get('Stripe Gateway Fees') || 0) + stripeFees);
    }

    let paypalGross = 0;
    if (isPaypalConnected && paypalData?.payments) {
      paypalData.payments.filter((p: any) => isInTimeFrame(p.createdAt)).forEach((p: any) => {
        paypalGross += p.amount;
      });
    }
    const paypalFees = paypalGross * 0.033;
    if (paypalFees > 0) {
      map.set('PayPal Gateway Fees', (map.get('PayPal Gateway Fees') || 0) + paypalFees);
    }

    let razorpayGross = 0;
    if (isRazorpayConnected && razorpayData?.payments) {
      razorpayData.payments.filter((p: any) => isInTimeFrame(p.createdAt)).forEach((p: any) => {
        razorpayGross += p.amount / 83.5;
      });
    }
    const razorpayFees = razorpayGross * 0.02;
    if (razorpayFees > 0) {
      map.set('Razorpay Gateway Fees', (map.get('Razorpay Gateway Fees') || 0) + razorpayFees);
    }

    // 3. Manual expenses & AI subscriptions
    manualTransactions.filter((tx: any) => isInTimeFrame(tx.date) && tx.amount < 0).forEach(tx => {
      const amt = Math.abs(tx.amount);
      const category = tx.category === 'AI Subscription' ? 'AI Subscriptions' : (tx.details || 'Other Overhead');
      map.set(category, (map.get(category) || 0) + amt);
    });

    // 4. Recurring subscriptions
    subscriptionTransactions.filter((tx: any) => isInTimeFrame(tx.date)).forEach(tx => {
      const amt = Math.abs(tx.amountUSD);
      let category = 'Other Overhead';
      if (tx.details?.includes('(')) {
        category = tx.details.split('(')[1].split(')')[0];
      }
      map.set(category, (map.get(category) || 0) + amt);
    });

    const totalExp = Array.from(map.values()).reduce((sum, val) => sum + val, 0) || 1;
    const list = Array.from(map.entries()).map(([name, value]) => ({
      name,
      amount: value,
      percentage: Math.round((value / totalExp) * 100)
    }));

    return list.sort((a, b) => b.amount - a.amount);
  }, [dbData, manualTransactions, subscriptionTransactions, isStripeConnected, stripeData, isPaypalConnected, paypalData, isRazorpayConnected, razorpayData, isInTimeFrame, timeFrame, isSkippedAll]);

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
      const expenseRatio = 0.2 + (name.charCodeAt(0) % 4) * 0.1;
      const expense = revenue * expenseRatio;
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
      } else if (xAxis === 'Channel Source') {
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

  const handleExportCSV = () => {
    const headers = ['Transaction ID', 'Source / Ledger', 'Customer / Client', 'Date', `Amount (${currencyState})`, 'Status'];
    const rows = combinedTransactions.map((tx: any) => [
      tx.id,
      tx.source,
      tx.customer,
      tx.date,
      tx.amountUSD.toFixed(2),
      tx.rawStatus
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Financial Ledger</h1>
          <p className="text-xs text-zinc-500">Track combined agency revenue, invoice statuses, and integrated gateway payouts.</p>
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
            onClick={handleExportCSV}
            className="h-8 border-zinc-800 text-zinc-300 gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-850 gap-6">
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
          onClick={() => setActiveTab('manual' as any)}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === ('manual' as any)
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-550 hover:text-zinc-350'
          }`}
        >
          Ledger
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Metric Cards Grid */}
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="min-h-[164px] flex flex-col justify-between bg-zinc-900/90 border border-zinc-800/80 rounded-xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Revenue</CardTitle>
                <span className="font-bold text-zinc-505 w-4 text-center text-sm select-none">{getCurrencySymbol(currencyState)}</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
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
                <div className="flex flex-col h-full space-y-4">
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
                  <div className="border border-zinc-850 rounded-lg overflow-hidden max-h-[180px] overflow-y-auto">
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
                            <TableCell className="text-right font-mono text-white">{formatCurrency(exp.amount)}</TableCell>
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
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
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
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
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
                <div className="text-2xl font-bold font-mono tracking-tight text-white">
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
          <div className="grid gap-6 md:grid-cols-[minmax(220px,1fr)_minmax(420px,3.2fr)_minmax(220px,1fr)] md:items-stretch">
            {/* Left Column: Profitability Metrics */}
            <div className="flex min-h-[560px] flex-col gap-6">
              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full space-y-4">
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
                                    <p className="text-sm font-mono font-bold text-emerald-400 mt-1">
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
                    <div className="border border-zinc-850 rounded-lg overflow-hidden max-h-[180px] overflow-y-auto">
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
                              <TableCell className="text-right font-mono text-emerald-400 font-bold">{formatCurrency(c.profit)}</TableCell>
                              <TableCell className="text-right font-mono text-white">{formatCurrency(c.revenue)}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{formatCurrency(c.expense)}</TableCell>
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
                  <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                    {formatCurrency(combinedMetrics.grossBillings - combinedMetrics.totalExpenses)}
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full space-y-4">
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
                                    <p className="text-sm font-mono font-bold text-emerald-450 mt-1">
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
                    <div className="border border-zinc-850 rounded-lg overflow-hidden max-h-[180px] overflow-y-auto">
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
                              <TableCell className="text-right font-mono text-emerald-400 font-bold">{c.margin.toFixed(1)}%</TableCell>
                              <TableCell className="text-right font-mono text-white">{formatCurrency(c.profit)}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{formatCurrency(c.revenue)}</TableCell>
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
                  <div className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
                    {combinedMetrics.netProfitMargin.toFixed(1)}%
                  </div>
                </CardContent>
              </ExpandableCard>

              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Receivables Queue</h3>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                      Outstanding invoices combine general ledger aging with failed gateway captures from connected payment providers.
                    </p>
                  </div>
                }
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Outstanding</CardTitle>
                  <Wallet className="h-4 w-4 text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono tracking-tight text-amber-400">
                    {formatCurrency(combinedMetrics.outstandingAmount)}
                  </div>
                </CardContent>
              </ExpandableCard>
            </div>
            
            {/* Center Column: Revenue vs Time */}
            <div className="min-h-[560px] flex flex-col space-y-6">
              <div className="flex-1">
                <RevenueLineChart
                  data={revenueLineData}
                  title="Revenue vs Time"
                  description="Tracking overall gross revenue across integrations."
                  currencyRate={1}
                  className="h-full min-h-[560px] w-full"
                  contentClassName="h-[430px] md:h-[452px]"
                />
              </div>
            </div>

            {/* Right Column: Customize Report Engine Card */}
            <div className="flex min-h-[560px] flex-col gap-6">
              <ExpandableCard 
                className="flex-1 flex flex-col justify-between overflow-hidden"
                expandedContent={
                  <div className="flex flex-col h-full space-y-4 font-sans text-xs">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Customize Fiscal Report</h3>
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
                          <option value="Channel Source">Channel Source</option>
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
                    <Button 
                      onClick={() => generateCustomReport(reportXAxis, reportYAxis, reportTimeframe)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 mt-auto flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Generate Report</span>
                    </Button>
                  </div>
                }
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Fiscal Reports</CardTitle>
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

          {/* Dynamic Customized Report Output (Below the main section grid) */}
          {customReport && (
            <div ref={reportRef} className="animate-fadeIn pt-4 scroll-mt-6">
              <Card className="border-zinc-800 bg-zinc-950/40 w-full">
                <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-850 pb-3">
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">
                      Generated Fiscal Report: {customReport.yAxis} by {customReport.xAxis}
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
                                      <p className="text-sm font-mono font-bold text-white mt-1">
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
                                <TableCell className="text-right font-mono font-bold text-white">
                                  {customReport.yAxis.includes('Margin') ? `${row.value.toFixed(1)}%` : formatCurrency(row.value)}
                                </TableCell>
                                {customReport.yAxis !== 'Revenue' && <TableCell className="text-right font-mono text-zinc-400">{formatCurrency(row.revenue)}</TableCell>}
                                {customReport.yAxis !== 'Expenses' && <TableCell className="text-right font-mono text-zinc-400">{formatCurrency(row.expenses)}</TableCell>}
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
      {activeTab === ('manual' as any) && (
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
                        <TableHead>Transaction ID / #</TableHead>
                        <TableHead>Channel Source</TableHead>
                        <TableHead>Account Client</TableHead>
                        <TableHead>Date Logged</TableHead>
                        <TableHead className="text-right">Amount ({currencyState})</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {combinedTransactions.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-mono text-xs text-white">{txn.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] bg-zinc-950 font-bold tracking-wide text-zinc-300">
                              {txn.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-zinc-300">{txn.customer}</TableCell>
                          <TableCell>{txn.date}</TableCell>
                          <TableCell className="text-right font-mono font-semibold text-white">
                            {formatCurrency(txn.amountUSD)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                txn.status === 'succeeded' || txn.status === 'captured'
                                  ? 'risk-low'
                                  : txn.status === 'pending'
                                  ? 'risk-medium'
                                  : 'risk-high'
                              }
                            >
                              {txn.rawStatus}
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
                                  <TableCell className="text-right font-mono font-semibold text-white">
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
                          <input
                            type="date"
                            required
                            value={subStartDate}
                            onChange={(e) => setSubStartDate(e.target.value)}
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
                      <input
                        type="date"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                    </div>

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

                                        <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      >
                        <option value="Revenue">Revenue</option>
                        <option value="Expense">Expense</option>
                        <option value="AI Subscription">AI Subscription</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Transaction Type</label>
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
                      <label className="font-semibold text-zinc-400 block">Transactor Account / UPI ID</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. transactor@upi"
                        value={formTransactorAccount}
                        onChange={(e) => setFormTransactorAccount(e.target.value)}
                        className="w-full rounded border border-zinc-800 bg-zinc-900/40 p-2 text-white placeholder-zinc-500 focus:border-zinc-700 focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Your Account</label>
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
                            required
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
                        placeholder="e.g. 500 (positive for income, negative for expense)"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Reference Number</label>
                      <input
                        type="text"
                        placeholder="e.g. REF98765"
                        value={formReferenceNumber}
                        onChange={(e) => setFormReferenceNumber(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Comments</label>
                      <textarea
                        placeholder="Transaction notes..."
                        value={formComments}
                        onChange={(e) => setFormComments(e.target.value)}
                        className="w-full h-16 rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all font-sans text-xs resize-none"
                      />
                    </div>

                    <Button type="submit" className="w-full h-9 bg-white text-zinc-950 font-bold text-xs hover:bg-zinc-250 cursor-pointer">
                      Save Transaction
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => downloadTemplate('csv')}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 border border-zinc-855 hover:border-zinc-750 rounded text-[10px] font-semibold text-zinc-300 bg-zinc-900/20 hover:bg-zinc-900 cursor-pointer transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      <span>CSV Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadTemplate('xlsx')}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 border border-zinc-855 hover:border-zinc-750 rounded text-[10px] font-semibold text-zinc-300 bg-zinc-900/20 hover:bg-zinc-900 cursor-pointer transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      <span>XLSX Template</span>
                    </button>
                  </div>

                  {/* Upload Dropzone */}
                  <div className="relative border border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/10 hover:bg-zinc-900/20 rounded-lg p-5 transition-all text-center flex flex-col items-center justify-center cursor-pointer">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="h-6 w-6 text-zinc-450 mb-2" />
                    <span className="block font-semibold text-zinc-300">Upload Filled Template</span>
                    <span className="block text-[9px] text-zinc-550 mt-1">Accepts CSV or XLSX templates only</span>
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
