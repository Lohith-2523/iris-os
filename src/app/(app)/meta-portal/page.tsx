'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { 
  Megaphone, 
  Download, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  Activity, 
  ChevronDown, 
  ChevronRight, 
  ImageIcon, 
  Calendar as CalendarIcon, 
  Clock, 
  BarChart3, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Layout, 
  Layers, 
  Play, 
  Video, 
  Compass,
  FileText,
  Plus,
  Trash2,
  Paperclip,
  Check,
  User
} from 'lucide-react';
import { PrismIcon } from '@/components/ui/prism-icon';
import { formatCurrency, formatPercent, formatUserMessage } from '@/lib/utils';
import { FormattedMarkdown } from '@/components/ui/formatted-markdown';

// Inline SVGs for Facebook & Instagram to avoid compilation issues
const Facebook = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface MetaAd {
  id: string;
  adId: string;
  name: string;
  status: string;
  spend: number;
  leadsCount: number;
  reach: number;
  impressions: number;
  clicks: number;
  platform: string;
  imageUrl?: string | null;
  campaignId?: string | null;
  createdAt: string;
}

interface MetaCampaign {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  objective: string | null;
  dailyBudget: number | null;
  createdAt: string;
  ads: MetaAd[];
}

interface MetaLead {
  id: string;
  leadId: string;
  adId: string | null;
  adName: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  createdTime: string;
}

interface ScheduledPost {
  id: string;
  platform: string[]; // ['facebook', 'instagram']
  postType: 'photo' | 'carousel' | 'reel' | 'story';
  caption: string;
  mediaUrl: string;
  status: 'SCHEDULED' | 'PUBLISHED' | 'APPROVED' | 'CHANGES_PROPOSED';
  scheduledAt: string; // ISO date or "Immediate"
  clientFeedback?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
}

export default function MetaPortalPage() {
  const [campaigns, setCampaigns] = React.useState<MetaCampaign[]>([]);
  const [leads, setLeads] = React.useState<MetaLead[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [syncing, setSyncing] = React.useState<boolean>(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [sdkStatus, setSdkStatus] = React.useState<'loading' | 'initialized' | 'sandbox'>('loading');
  const [updatingLeadId, setUpdatingLeadId] = React.useState<string | null>(null);
  
  // Tabs State (overview, ads, engagement, content, strategy)
  const [activeTab, setActiveTab] = React.useState<'overview' | 'ads' | 'engagement' | 'content' | 'strategy'>('overview');

  // Currency Re-rendering State
  const [currencyState, setCurrencyState] = React.useState('USD');
  const [currencyRate, setCurrencyRate] = React.useState(1.0);

  // Role & Context States
  const [userRole, setUserRole] = React.useState<'admin' | 'client'>('admin');
  const [clientName, setClientName] = React.useState<string | null>(null);
  const [adminNotifications, setAdminNotifications] = React.useState<any[]>([]);
  const [feedbackText, setFeedbackText] = React.useState('');
  const [showFeedbackInput, setShowFeedbackInput] = React.useState(false);

  // Accordion toggle states for campaign rows
  const [expandedCampaigns, setExpandedCampaigns] = React.useState<Record<string, boolean>>({});

  // Prism AI Claude Strategy State
  const [generatingStrategy, setGeneratingStrategy] = React.useState(false);
  const [strategyText, setStrategyText] = React.useState<string>('');

  // Publishing form State
  const [destinations, setDestinations] = React.useState({ facebook: true, instagram: true });
  const [postType, setPostType] = React.useState<'photo' | 'carousel' | 'reel' | 'story'>('photo');
  const [caption, setCaption] = React.useState('');
  
  // Canva vs Device selector state
  const [mediaSource, setMediaSource] = React.useState<'canva' | 'device'>('canva');
  const [selectedCanvaDesign, setSelectedCanvaDesign] = React.useState('');
  const [isExportingCanva, setIsExportingCanva] = React.useState(false);
  
  const [uploadedFileName, setUploadedFileName] = React.useState('');
  const [isUploadingDevice, setIsUploadingDevice] = React.useState(false);

  const [mediaUrl, setMediaUrl] = React.useState('');
  const [isMediaReady, setIsMediaReady] = React.useState(false);

  const [isScheduled, setIsScheduled] = React.useState(false);
  const [scheduleDate, setScheduleDate] = React.useState('');
  const [scheduleTime, setScheduleTime] = React.useState('');

  // Calendar View States
  const [selectedDayPost, setSelectedDayPost] = React.useState<ScheduledPost | null>(null);

  // Scheduled posts State (seeded for June 2026)
  const [scheduledPosts, setScheduledPosts] = React.useState<ScheduledPost[]>([
    {
      id: 'post-1',
      platform: ['instagram', 'facebook'],
      postType: 'carousel',
      caption: '🚀 Elevate your marketing funnel with Iris OS integrations! Synced design pipelines from Canva straight to Meta campaign layouts. Learn how David Kim optimizes creative performance in seconds. #Agencies #CreativeOperations',
      mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60',
      status: 'PUBLISHED',
      scheduledAt: '2026-06-25T14:30:00Z',
      likes: 124,
      comments: 18,
      shares: 9
    },
    {
      id: 'post-2',
      platform: ['instagram'],
      postType: 'reel',
      caption: 'Watch Sarah execute high-fidelity profit leak audits using Prism AI! 📊💸 Recover up to $2,800/mo in contractor allocations in just three clicks. Full tutorial in bio!',
      mediaUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=500&auto=format&fit=crop&q=60',
      status: 'PUBLISHED',
      scheduledAt: '2026-06-24T18:00:00Z',
      likes: 310,
      comments: 42,
      shares: 67
    },
    {
      id: 'post-3',
      platform: ['facebook'],
      postType: 'story',
      caption: 'We are hiring a Senior UI Designer to join our Apex Creative team! Send applications over or tag a friend. Apply by July 15.',
      mediaUrl: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=500&auto=format&fit=crop&q=60',
      status: 'SCHEDULED',
      scheduledAt: '2026-06-28T09:00:00Z',
      likes: 0,
      comments: 0,
      shares: 0
    },
    {
      id: 'post-4',
      platform: ['instagram', 'facebook'],
      postType: 'photo',
      caption: 'Quick insight audit of our recent Aether Campaign: 4.8x ROI driven by custom target lookalikes! Optimization in progress.',
      mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60',
      status: 'SCHEDULED',
      scheduledAt: '2026-06-26T15:00:00Z',
      likes: 0,
      comments: 0,
      shares: 0
    }
  ]);

  // Load Currency preferences and setup listener
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboardCurrency') || 'USD';
      setCurrencyState(stored);
      
      const updateRates = (curr: string) => {
        if (curr === 'EUR') setCurrencyRate(0.92);
        else if (curr === 'GBP') setCurrencyRate(0.78);
        else if (curr === 'INR') setCurrencyRate(83.5);
        else if (curr === 'CAD') setCurrencyRate(1.37);
        else setCurrencyRate(1.0);
      };
      updateRates(stored);

      const handleCurrencyChange = () => {
        const newCurr = localStorage.getItem('dashboardCurrency') || 'USD';
        setCurrencyState(newCurr);
        updateRates(newCurr);
      };
      
      window.addEventListener('currency-updated', handleCurrencyChange);
      return () => {
        window.removeEventListener('currency-updated', handleCurrencyChange);
      };
    }
  }, []);

  // Fetch campaigns and leads
  const loadData = async () => {
    try {
      setLoading(true);
      const email = localStorage.getItem('currentUserEmail') || 'lohith@apex.co';
      const res = await fetch(`/api/meta-portal?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        const loadedCamps = data.campaigns || [];
        setCampaigns(loadedCamps);
        setLeads(data.leads || []);
        setScheduledPosts(data.scheduledPosts || []);
        setAdminNotifications(data.notifications || []);
        setUserRole(data.role || 'admin');
        setClientName(data.clientName || null);
        
        // Auto-expand campaigns
        const expansions: Record<string, boolean> = {};
        loadedCamps.forEach((c: MetaCampaign) => {
          expansions[c.id] = true;
        });
        setExpandedCampaigns(expansions);
      }
    } catch (error) {
      console.error('Failed to load Meta Portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
    setSdkStatus('initialized');
  }, []);

  const handleClientFeedback = async (postId: string, status: 'APPROVED' | 'CHANGES_PROPOSED', feedback?: string) => {
    try {
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'client_feedback',
          postId,
          status,
          feedback,
        })
      });
      if (res.ok) {
        await loadData();
        setSelectedDayPost(null);
        setFeedbackText('');
        setShowFeedbackInput(false);
        alert(status === 'APPROVED' ? 'Post approved successfully!' : 'Changes proposed successfully.');
      } else {
        alert('Failed to save client feedback.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Derived state of ads
  const ads = React.useMemo(() => {
    const list: MetaAd[] = [];
    campaigns.forEach(c => {
      if (c.ads) list.push(...c.ads);
    });
    return list;
  }, [campaigns]);

  // Simulated sync
  const handleSyncData = async () => {
    setSyncing(true);
    setTimeout(async () => {
      await loadData();
      setSyncing(false);
      alert(formatUserMessage('Lohith, Facebook Ads Manager API fetch completed! Metrics updated successfully.'));
    }, 1500);
  };

  // Update lead status
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      setUpdatingLeadId(leadId);
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, status: newStatus }),
      });

      if (res.ok) {
        setLeads((prev) =>
          prev.map((lead) => (lead.leadId === leadId ? { ...lead, status: newStatus } : lead))
        );
      } else {
        alert(formatUserMessage('Lohith, failed to update lead status.'));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  // Generate Strategy
  const handleGenerateStrategy = async () => {
    setGeneratingStrategy(true);
    try {
      const res = await fetch('/api/prism-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'meta-strategy',
          context: {
            spend: totalSpend,
            leads: totalLeads,
            reach: totalReach,
            cpl: costPerLead
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        setStrategyText(data.result);
      } else {
        alert(formatUserMessage('Lohith, failed to generate strategy.'));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingStrategy(false);
    }
  };

  // Export from Canva simulation
  const handleExportCanva = () => {
    if (!selectedCanvaDesign) {
      alert(formatUserMessage('Lohith, please select a Canva design first.'));
      return;
    }
    setIsExportingCanva(true);
    setIsMediaReady(false);
    
    setTimeout(() => {
      setIsExportingCanva(false);
      setIsMediaReady(true);
      setMediaUrl('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60');
      alert(formatUserMessage('Lohith, Canva asset exported successfully and is ready to post!'));
    }, 1500);
  };

  // Upload from device simulation
  const handleUploadDevice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsUploadingDevice(true);
    setIsMediaReady(false);

    setTimeout(() => {
      setIsUploadingDevice(false);
      setIsMediaReady(true);
      setMediaUrl('https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60');
      alert(formatUserMessage(`Lohith, ${file.name} uploaded successfully and is ready to post!`));
    }, 1200);
  };

  // Add post to scheduled list
  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      alert(formatUserMessage('Lohith, please fill out the caption text.'));
      return;
    }

    if (!isMediaReady) {
      alert(formatUserMessage('Lohith, please upload media or select & export from Canva first.'));
      return;
    }

    const platformList: string[] = [];
    if (destinations.facebook) platformList.push('facebook');
    if (destinations.instagram) platformList.push('instagram');

    if (platformList.length === 0) {
      alert(formatUserMessage('Lohith, please select at least one platform.'));
      return;
    }

    const postDate = isScheduled ? scheduleDate : new Date().toISOString().split('T')[0];
    const postTime = isScheduled ? scheduleTime : new Date().toTimeString().split(' ')[0].slice(0, 5);

    try {
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule_post',
          platform: platformList,
          postType,
          caption,
          mediaUrl: mediaUrl || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500&auto=format&fit=crop&q=60',
          scheduledAt: `${postDate}T${postTime}:00Z`,
        })
      });
      
      if (res.ok) {
        await loadData();
        // reset form
        setCaption('');
        setMediaUrl('');
        setIsMediaReady(false);
        setSelectedCanvaDesign('');
        setUploadedFileName('');
        setIsScheduled(false);
        setScheduleDate('');
        setScheduleTime('');

        alert(formatUserMessage(isScheduled 
          ? 'Lohith, post scheduled successfully!' 
          : 'Lohith, post published successfully!'
        ));
      } else {
        alert('Failed to save scheduled post.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error saving scheduled post.');
    }
  };

  const handleCancelSchedule = async (postId: string) => {
    try {
      const res = await fetch('/api/meta-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_post',
          id: postId,
        })
      });
      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to delete scheduled post.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCampaignExpansion = (id: string) => {
    setExpandedCampaigns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Computations
  const totalSpend = ads.reduce((sum, ad) => sum + ad.spend, 0) || 4950.00;
  const totalLeads = leads.length || 174;
  const costPerLead = totalSpend / (totalLeads || 1);
  const totalReach = ads.reduce((sum, ad) => sum + ad.reach, 0) || 94700;
  const totalClicks = ads.reduce((sum, ad) => sum + ad.clicks, 0) || 1200;
  const reachPerCurrency = totalReach / ((totalSpend * currencyRate) || 1);
  const leadsPercentage = (totalLeads / (totalClicks || 1)) * 100;

  const leadStatuses = ['all', 'new', 'cold-call in progress', 'call back required', 'closed', 'unqualified'];

  const getStatusSelectClass = (status: string) => {
    const base = "text-[10px] border px-2.5 py-0.5 outline-none cursor-pointer capitalize font-semibold transition-colors rounded-none focus:ring-0 ";
    switch (status) {
      case 'new':
        return base + "status-new border-zinc-700 text-zinc-300 bg-transparent";
      case 'cold-call in progress':
        return base + "status-cold-call border-amber-900/40 bg-amber-950/20 text-amber-200";
      case 'call back required':
        return base + "status-callback border-zinc-700 bg-zinc-800 text-zinc-100";
      case 'closed':
        return base + "status-closed border-zinc-800 bg-zinc-900/60 text-zinc-400";
      case 'unqualified':
        return base + "status-unqualified border-rose-900/40 bg-rose-950/20 text-rose-200";
      default:
        return base + "status-new border-zinc-700 text-zinc-300 bg-transparent";
    }
  };

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
    const matchesSearch =
      lead.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.phone && lead.phone.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  // Calendar Day Click Handler: Autofills Date picker
  const handleCalendarDayClick = (dateStr: string) => {
    setActiveTab('content');
    setIsScheduled(true);
    setScheduleDate(dateStr);
    setScheduleTime('12:00');
  };

  // Pre-seed calendar array for June 2026 (Starts Monday, June 1st)
  // Grid size: 35 cells (June 1st to July 5th)
  const calendarDays = React.useMemo(() => {
    const days = [];
    // 30 days of June
    for (let d = 1; d <= 30; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      days.push({
        dayNum: d,
        dateStr: `2026-06-${dayStr}`,
        isCurrentMonth: true
      });
    }
    // 5 days of July padding
    for (let d = 1; d <= 5; d++) {
      days.push({
        dayNum: d,
        dateStr: `2026-07-0${d}`,
        isCurrentMonth: false
      });
    }
    return days;
  }, []);

  if (userRole === 'client') {
    return (
      <div className="space-y-6 font-sans text-xs">
        {/* Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5 no-print">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Client Meta Portal</h1>
            <p className="text-xs text-zinc-500">Live ad performance statistics and broadcast approval center for {clientName || 'your business'}.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="risk-low" className="h-8 border-emerald-900/40 bg-emerald-950/20 text-emerald-400 gap-1.5 px-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Client Session Active</span>
            </Badge>
          </div>
        </div>

        {/* SECTION A: ADS INSIGHTS & DATA REPORT */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-white" />
              <span>Ad Accounts Insights</span>
            </h2>
            <Badge variant="outline" className="border-zinc-800 text-[10px]">Authorised Views Only</Badge>
          </div>
          
          {/* Metric Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Amount Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-white font-mono">
                  {formatCurrency(ads.reduce((acc, curr) => acc + curr.spend, 0))}
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-white font-mono">
                  {ads.reduce((acc, curr) => acc + curr.reach, 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-555">Cost per 1k Reach</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-white font-mono">
                  {formatCurrency(
                    ads.reduce((acc, curr) => acc + curr.reach, 0) > 0
                      ? (ads.reduce((acc, curr) => acc + curr.spend, 0) / ads.reduce((acc, curr) => acc + curr.reach, 0)) * 1000
                      : 0,
                    2
                  )}
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Leads Generated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-white font-mono">
                  {ads.reduce((acc, curr) => acc + curr.leadsCount, 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Leads Conversion %</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-white font-mono">
                  {formatPercent(
                    ads.reduce((acc, curr) => acc + curr.clicks, 0) > 0
                      ? ads.reduce((acc, curr) => acc + curr.leadsCount, 0) / ads.reduce((acc, curr) => acc + curr.clicks, 0)
                      : 0
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* LEADS LIST (So clients can track it from their end) */}
        <div className="space-y-4 pt-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <User className="h-4 w-4 text-white" />
            <span>Leads Tracking Directory</span>
          </h2>
          <Card className="border-zinc-850">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Source Ad</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Created Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-zinc-500 py-6">
                        No leads recorded for this ad account.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-semibold text-white">{lead.fullName}</TableCell>
                        <TableCell className="font-mono text-zinc-400">{lead.email}</TableCell>
                        <TableCell className="text-zinc-400">{lead.phone || 'N/A'}</TableCell>
                        <TableCell className="text-zinc-400">{lead.adName || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-zinc-800 text-[10px] uppercase font-bold text-zinc-400">
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-zinc-500 font-mono">
                          {new Date(lead.createdTime).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* BROADCAST CALENDAR GRID */}
        <div className="space-y-4 pt-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-white" />
            <span>Scheduled Post Approvals & Broadcast Calendar</span>
          </h2>
          <Card className="border-zinc-850 p-6">
            <div className="grid grid-cols-7 gap-1 bg-zinc-950 p-1 border border-zinc-900 font-bold text-center text-zinc-500 py-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-[10px] uppercase tracking-wider">{day}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1 mt-1">
              {calendarDays.map((day, idx) => {
                const dayPosts = scheduledPosts.filter(p => {
                  const pDate = new Date(p.scheduledAt).toISOString().split('T')[0];
                  return pDate === day.dateStr;
                });

                return (
                  <div
                    key={idx}
                    className={`min-h-[90px] border border-zinc-900 bg-zinc-950/20 p-2 flex flex-col justify-between ${
                      day.isCurrentMonth ? '' : 'opacity-25 pointer-events-none'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`font-mono text-xs ${day.isCurrentMonth ? 'text-zinc-400' : 'text-zinc-700'}`}>
                        {day.dayNum}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col justify-end space-y-1 mt-1">
                      {dayPosts.map((post) => (
                        <div
                          key={post.id}
                          onClick={() => {
                            setSelectedDayPost(post);
                            setFeedbackText(post.clientFeedback || '');
                            setShowFeedbackInput(false);
                          }}
                          className={`group text-[9px] font-medium p-1 rounded border cursor-pointer transition-all duration-150 flex items-center justify-between ${
                            post.status === 'PUBLISHED'
                              ? 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                              : post.status === 'APPROVED'
                              ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-400 hover:bg-emerald-950/50'
                              : post.status === 'CHANGES_PROPOSED'
                              ? 'bg-amber-950/30 border-amber-900/50 text-amber-400 hover:bg-amber-950/50'
                              : 'bg-zinc-850/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <span className="truncate max-w-[40px]">{post.caption}</span>
                          <span className="font-mono text-[8px] opacity-75 shrink-0 ml-1">
                            {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* POST DETAILS POPUP DIALOG */}
        {selectedDayPost && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-950 border border-zinc-800 max-w-md w-full p-6 space-y-5 rounded-none shadow-2xl relative animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center gap-2">
                  {selectedDayPost.platform.includes('facebook') && <Facebook className="h-4 w-4 text-blue-500" />}
                  {selectedDayPost.platform.includes('instagram') && <Instagram className="h-4 w-4 text-pink-500" />}
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{selectedDayPost.postType} Broadcast</span>
                </div>
                <Badge variant={selectedDayPost.status === 'PUBLISHED' ? 'risk-low' : 'outline'}>
                  {selectedDayPost.status}
                </Badge>
              </div>

              {/* Media thumbnail */}
              <div className="h-48 w-full border border-zinc-800 bg-zinc-950 overflow-hidden relative">
                <img src={selectedDayPost.mediaUrl} alt="Post content" className="h-full w-full object-cover" />
              </div>

              {/* Details */}
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-zinc-500 block uppercase tracking-wider text-[9px]">Caption</span>
                  <p className="text-zinc-300 font-sans leading-relaxed">{selectedDayPost.caption}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900 text-zinc-400">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-550 block">Broadcast Date</span>
                    <span className="font-mono text-zinc-300">{new Date(selectedDayPost.scheduledAt).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-zinc-550 block">Broadcast Time</span>
                    <span className="font-mono text-zinc-300">{new Date(selectedDayPost.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              {/* Client Approval Actions */}
              {selectedDayPost.status !== 'PUBLISHED' && (
                <div className="space-y-3 pt-3 border-t border-zinc-900 text-xs">
                  <span className="font-bold text-zinc-550 block uppercase tracking-wider text-[9px]">Client Approval & Feedback</span>
                  {selectedDayPost.status === 'APPROVED' && (
                    <div className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5 bg-emerald-950/15 border border-emerald-900/30 p-2 rounded">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approved for Broadcast</span>
                    </div>
                  )}
                  {selectedDayPost.status === 'CHANGES_PROPOSED' && (
                    <div className="space-y-2">
                      <div className="text-amber-400 font-semibold text-xs flex items-center gap-1.5 bg-amber-950/15 border border-amber-900/30 p-2 rounded">
                        <span>Changes Proposed</span>
                      </div>
                      {selectedDayPost.clientFeedback && (
                        <div className="bg-zinc-900/40 border border-zinc-800 p-2.5 rounded text-zinc-400 leading-normal italic font-sans text-[11px]">
                          "{selectedDayPost.clientFeedback}"
                        </div>
                      )}
                    </div>
                  )}

                  {selectedDayPost.status !== 'APPROVED' && selectedDayPost.status !== 'CHANGES_PROPOSED' && (
                    <div className="space-y-3 pt-2">
                      {showFeedbackInput ? (
                        <div className="space-y-2 animate-fadeIn">
                          <span className="text-[9px] uppercase font-bold text-zinc-550 block">Feedback / Proposed Changes</span>
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Enter requested changes or comments..."
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none text-[11px]"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              onClick={() => setShowFeedbackInput(false)}
                              variant="outline"
                              size="sm"
                              className="h-8 text-[10px]"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleClientFeedback(selectedDayPost.id, 'CHANGES_PROPOSED', feedbackText)}
                              size="sm"
                              disabled={!feedbackText.trim()}
                              className="h-8 bg-amber-600 text-white hover:bg-amber-500 text-[10px] font-semibold"
                            >
                              Submit Feedback
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => handleClientFeedback(selectedDayPost.id, 'APPROVED')}
                            className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px]"
                          >
                            Approve Post
                          </Button>
                          <Button
                            onClick={() => setShowFeedbackInput(true)}
                            variant="outline"
                            className="h-9 border-zinc-800 text-zinc-300 hover:bg-zinc-900 font-semibold text-[10px]"
                          >
                            Propose Changes
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <Button 
                  onClick={() => setSelectedDayPost(null)}
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs font-semibold border-zinc-800 text-zinc-300"
                >
                  Close View
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5 no-print">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient font-sans">Meta Portal</h1>
          <p className="text-xs text-zinc-500">Consolidated analytics command, detailed insights monitors, and media scheduler.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncData}
            disabled={syncing}
            className="h-8 border-zinc-800 text-zinc-300 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync APIs</span>
          </Button>
          <Badge variant="risk-low" className="h-8 border-emerald-900/40 bg-emerald-950/20 text-emerald-400 gap-1.5 px-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>APIs Active</span>
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-850 no-print gap-1.5 scrollbar-none overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'border-white text-white font-bold' 
              : 'border-transparent text-zinc-405 hover:text-white'
          }`}
        >
          Overview Dashboard
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ads' 
              ? 'border-white text-white font-bold' 
              : 'border-transparent text-zinc-405 hover:text-white'
          }`}
        >
          Detailed Ad Insights
        </button>
        <button
          onClick={() => setActiveTab('engagement')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'engagement' 
              ? 'border-white text-white font-bold' 
              : 'border-transparent text-zinc-405 hover:text-white'
          }`}
        >
          Detailed Content Engagement
        </button>
        <button
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'content' 
              ? 'border-white text-white font-bold' 
              : 'border-transparent text-zinc-405 hover:text-white'
          }`}
        >
          <CalendarIcon className="h-3.5 w-3.5" />
          <span>Content Management & Calendar</span>
        </button>
        <button
          onClick={() => setActiveTab('strategy')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'strategy' 
              ? 'border-violet-500 text-violet-400 font-bold' 
              : 'border-transparent text-zinc-405 hover:text-white'
          }`}
        >
          <PrismIcon className="h-3.5 w-3.5" />
          <span>Prism AI Strategy</span>
        </button>
      </div>

      {/* RENDER TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Admin Notifications Banner */}
          {adminNotifications.length > 0 && (
            <div className="rounded border border-amber-900/30 bg-amber-950/15 p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="h-4.5 w-4.5 animate-pulse" />
                <span className="font-bold text-xs uppercase tracking-wider">Client Action Review Required ({adminNotifications.length})</span>
              </div>
              <div className="space-y-2">
                {adminNotifications.map((notif: any) => (
                  <div key={notif.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-900 pb-2 text-xs">
                    <div>
                      <span className="font-semibold text-zinc-300">Client {notif.client?.name} proposed changes:</span>
                      <p className="text-zinc-400 mt-1 italic font-sans">"{notif.clientFeedback}"</p>
                      <span className="block text-[10px] text-zinc-500 mt-0.5">Post Type: {notif.postType} | Date: {new Date(notif.scheduledAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedDayPost(notif);
                          setFeedbackText(notif.clientFeedback || '');
                          setShowFeedbackInput(false);
                        }}
                        className="h-7 bg-zinc-100 text-zinc-950 hover:bg-white text-[10px]"
                      >
                        Inspect Post
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* SECTION A: ADS INSIGHTS & DATA REPORT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-405 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-white" />
                <span>Ads Insights & Data Report</span>
              </h2>
              <Badge variant="outline" className="border-zinc-800 text-[10px]">Live API Feed</Badge>
            </div>
            
            {/* Metric Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Amount Spent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{formatCurrency(totalSpend)}</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Business Ad Manager</span>
                </CardContent>
              </Card>

              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Reach</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{totalReach.toLocaleString()}</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Unique accounts reached</span>
                </CardContent>
              </Card>

              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Reach / {currencyState}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{reachPerCurrency.toFixed(1)}</div>
                  <span className="text-[9px] text-emerald-400 font-semibold">Spend efficiency ratio</span>
                </CardContent>
              </Card>

              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Leads Generated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{totalLeads}</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Instant forms count</span>
                </CardContent>
              </Card>

              <Card hoverEffect>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-550">Leads Conversion %</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold font-mono tracking-tight text-white">{leadsPercentage.toFixed(2)}%</div>
                  <span className="text-[9px] text-zinc-500 font-medium">Clicks to Form Conversion</span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SECTION B: CONTENT ENGAGEMENT INSIGHTS & DATA REPORT */}
          <div className="space-y-4 pt-4 border-t border-zinc-900">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-405 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-white" />
                <span>Content Engagement Insights & Data Report</span>
              </h2>
              <Badge variant="outline" className="border-zinc-800 text-[10px]">Organic Insights</Badge>
            </div>

            {/* Engagement metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Average Engagement Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono tracking-tight text-white">4.8%</div>
                  <span className="text-[9px] text-emerald-400 font-semibold block mt-1">+0.6% vs target benchmark</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Top Performing Format</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold tracking-tight text-white">Carousel Posts</div>
                  <span className="text-[9px] text-zinc-500 block mt-1">Drives 12% more comments</span>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1.5">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Organic Reach</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono tracking-tight text-white">12,480 people</div>
                  <span className="text-[9px] text-emerald-400 font-semibold block mt-1">Expanding 5.4% week-on-week</span>
                </CardContent>
              </Card>
            </div>

            {/* Combined heatmaps block */}
            <div className="grid gap-6 md:grid-cols-2 mt-4">
              <div className="p-4 border border-zinc-850 bg-zinc-900/10 space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Instagram className="h-3.5 w-3.5 text-pink-500" />
                  <span>Instagram Optimal Posting Slots</span>
                </span>
                <div className="space-y-1 text-xs font-sans text-zinc-400">
                  <div className="flex justify-between py-1 border-b border-zinc-950">
                    <span>Tuesdays</span> <span className="font-mono font-bold text-zinc-350">2:00 PM – 4:00 PM</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-950">
                    <span>Fridays</span> <span className="font-mono font-bold text-zinc-350">6:00 PM – 8:00 PM</span>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-zinc-850 bg-zinc-900/10 space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                  <Facebook className="h-3.5 w-3.5 text-blue-500" />
                  <span>Facebook Optimal Posting Slots</span>
                </span>
                <div className="space-y-1 text-xs font-sans text-zinc-400">
                  <div className="flex justify-between py-1 border-b border-zinc-950">
                    <span>Mondays</span> <span className="font-mono font-bold text-zinc-350">9:00 AM – 11:00 AM</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-950">
                    <span>Wednesdays</span> <span className="font-mono font-bold text-zinc-350">1:00 PM – 3:00 PM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB 2: DETAILED AD INSIGHTS */}
      {activeTab === 'ads' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Executive metrics reminder */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[{ title: 'Spend', value: formatCurrency(totalSpend) },
              { title: 'Reach', value: totalReach.toLocaleString() },
              { title: 'Clicks', value: totalClicks.toLocaleString() },
              { title: 'Leads', value: totalLeads },
              { title: 'CPL', value: formatCurrency(costPerLead, 2) }].map((m, idx) => (
              <Card key={idx}>
                <CardHeader className="pb-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">{m.title}</span>
                </CardHeader>
                <CardContent>
                  <span className="text-lg font-bold font-mono text-white">{m.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Performance Center */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Campaign & Creative Performance Center</CardTitle>
              <CardDescription>Live campaign breakdown with nested creative logs synced from Ads Manager.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Campaign / Ad Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">CPL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-zinc-500">
                        Loading Campaigns...
                      </TableCell>
                    </TableRow>
                  ) : campaigns.map((camp) => {
                    const campSpend = camp.ads?.reduce((sum, ad) => sum + ad.spend, 0) || 0;
                    const campLeads = camp.ads?.reduce((sum, ad) => sum + ad.leadsCount, 0) || 0;
                    const campReach = camp.ads?.reduce((sum, ad) => sum + ad.reach, 0) || 0;
                    const campClicks = camp.ads?.reduce((sum, ad) => sum + ad.clicks, 0) || 0;
                    const campCpl = campSpend / (campLeads || 1);
                    const isExpanded = !!expandedCampaigns[camp.id];

                    return (
                      <React.Fragment key={camp.id}>
                        <TableRow className="bg-zinc-950/50 hover:bg-zinc-900 border-b border-zinc-900">
                          <TableCell className="text-center">
                            <button onClick={() => toggleCampaignExpansion(camp.id)} className="text-zinc-500">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </TableCell>
                          <TableCell className="font-bold text-white tracking-wider flex items-center gap-2">
                            <Megaphone className="h-3.5 w-3.5 text-zinc-400" />
                            <span>{camp.name}</span>
                            <Badge variant="outline" className="text-[8px] tracking-wider uppercase">{camp.objective?.replace('OUTCOME_', '')}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={camp.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="uppercase text-[9px]">{camp.status}</Badge>
                          </TableCell>
                          <TableCell className="text-zinc-500 text-xs">—</TableCell>
                          <TableCell className="text-right font-mono text-white">{formatCurrency(campSpend)}</TableCell>
                          <TableCell className="text-right font-mono text-zinc-400">{campReach.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-zinc-400">{campClicks.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono text-white">{campLeads}</TableCell>
                          <TableCell className="text-right font-mono text-white">{formatCurrency(campCpl, 2)}</TableCell>
                        </TableRow>

                        {isExpanded && (camp.ads || []).map((ad) => {
                          const adCpl = ad.spend / (ad.leadsCount || 1);
                          return (
                            <TableRow key={ad.id} className="bg-zinc-900/10 hover:bg-zinc-900/30 border-b border-zinc-900/60">
                              <TableCell></TableCell>
                              <TableCell className="pl-8 font-semibold text-zinc-200">
                                <div className="flex items-center gap-3">
                                  {ad.imageUrl ? (
                                    <div className="h-8 w-12 border border-zinc-800 bg-zinc-950 overflow-hidden shrink-0">
                                      <img src={ad.imageUrl} alt={ad.name} className="h-full w-full object-cover" />
                                    </div>
                                  ) : (
                                    <div className="h-8 w-12 border border-dashed border-zinc-800 bg-zinc-950/20 flex items-center justify-center shrink-0">
                                      <ImageIcon className="h-4 w-4 text-zinc-650" />
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold text-white">{ad.name}</span>
                                    <span className="text-[9px] font-mono text-zinc-500">ID: {ad.adId}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={ad.status === 'ACTIVE' ? 'risk-low' : 'outline'} className="text-[9px] uppercase">{ad.status}</Badge>
                              </TableCell>
                              <TableCell className="text-[10px] text-zinc-400 capitalize">{ad.platform.toLowerCase()}</TableCell>
                              <TableCell className="text-right font-mono text-white">{formatCurrency(ad.spend)}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{ad.reach.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-zinc-400">{ad.clicks.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-white">{ad.leadsCount}</TableCell>
                              <TableCell className="text-right font-mono text-white">{formatCurrency(adCpl, 2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Lead Directory */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-white">Lead Operations Directory</CardTitle>
              <CardDescription>Qualify contact records assigned from Instant Forms.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between pb-4 border-b border-zinc-900/60 no-print filter-section">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900/40 py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-zinc-750 focus:bg-zinc-900/85 focus:outline-none transition-all font-sans"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {leadStatuses.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedStatus(s)}
                      className={`px-2 py-0.5 rounded text-[9px] font-semibold border cursor-pointer capitalize transition-all ${
                        selectedStatus === s ? 'bg-white text-zinc-950 border-white' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="pt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact Name</TableHead>
                      <TableHead>Email Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Source Creative</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-semibold text-white">{lead.fullName}</TableCell>
                        <TableCell className="font-mono text-xs">{lead.email}</TableCell>
                        <TableCell className="text-xs font-mono">{lead.phone || 'N/A'}</TableCell>
                        <TableCell className="text-xs text-zinc-400">{lead.adName || 'Instant Form'}</TableCell>
                        <TableCell>
                          <select
                            disabled={updatingLeadId === lead.leadId}
                            value={lead.status}
                            onChange={(e) => handleUpdateStatus(lead.leadId, e.target.value)}
                            className={getStatusSelectClass(lead.status)}
                          >
                            <option value="new">New</option>
                            <option value="cold-call in progress">Cold-Call in Progress</option>
                            <option value="call back required">Call Back Required</option>
                            <option value="closed">Closed</option>
                            <option value="unqualified">Unqualified</option>
                          </select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* RENDER TAB 3: DETAILED CONTENT ENGAGEMENT */}
      {activeTab === 'engagement' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Detailed statistics metrics */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-4 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Average CTR</span>
                <span className="text-2xl font-bold font-mono text-white">3.4%</span>
                <span className="text-[9px] text-emerald-400 block font-semibold">+0.2% above organic baseline</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Comments Ratio</span>
                <span className="text-2xl font-bold font-mono text-white">18.4%</span>
                <span className="text-[9px] text-zinc-500 block">Of overall interactions</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Shares Count</span>
                <span className="text-2xl font-bold font-mono text-white">1,480 shares</span>
                <span className="text-[9px] text-emerald-400 block font-semibold">+12% viral reach surge</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block tracking-wider">Instagram vs FB Reach</span>
                <span className="text-2xl font-bold font-mono text-white">72% / 28%</span>
                <span className="text-[9px] text-zinc-500 block">Instagram dominates reach index</span>
              </CardContent>
            </Card>
          </div>

          {/* Platform Performance and Planner Slots */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Engagement Ratio Trends (Past 30 Days)</CardTitle>
                </CardHeader>
                <CardContent className="h-[200px] flex items-end justify-between gap-4 pt-6">
                  {/* Simulated vertical chart bars */}
                  {[
                    { label: 'Week 1', fb: 20, ig: 50 },
                    { label: 'Week 2', fb: 25, ig: 55 },
                    { label: 'Week 3', fb: 18, ig: 68 },
                    { label: 'Week 4', fb: 30, ig: 78 }
                  ].map((w, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex items-end justify-center gap-1.5 h-[150px]">
                        {/* FB Bar */}
                        <div style={{ height: `${w.fb * 1.5}%` }} className="w-4 bg-blue-500 border border-blue-600" title={`Facebook: ${w.fb}%`} />
                        {/* IG Bar */}
                        <div style={{ height: `${w.ig * 1.5}%` }} className="w-4 bg-pink-500 border border-pink-600" title={`Instagram: ${w.ig}%`} />
                      </div>
                      <span className="text-[9px] font-semibold text-zinc-500">{w.label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Posting slots summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Publishing Planner Rules</CardTitle>
                <CardDescription>Rules derived from organic performance metrics.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed text-zinc-400">
                <div className="p-2 border border-zinc-900 bg-zinc-950/20">
                  <span className="font-bold text-white block">Rule 1: Video Content Priority</span>
                  <span>Deploy Reels between 5:00 PM and 7:00 PM. Engagement increases by 34% in this window.</span>
                </div>
                <div className="p-2 border border-zinc-900 bg-zinc-950/20">
                  <span className="font-bold text-white block">Rule 2: Carousel Structure</span>
                  <span>Use 4 to 6 slides in carousels. Users swipe through slides, boosting feed algorithms.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER TAB 4: CONTENT MANAGEMENT & CALENDAR */}
      {activeTab === 'content' && (
        <div className="grid gap-6 md:grid-cols-3 animate-fadeIn">
          {/* Post composer panel */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Social Media Post Composer</CardTitle>
                <CardDescription>Design, import designs from Canva, or upload from your device to plan calendar feeds.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePostSubmit} className="space-y-4 text-xs">
                  {/* Platforms */}
                  <div className="space-y-2">
                    <label className="font-semibold text-zinc-400 block">Select Destinations</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={destinations.facebook}
                          onChange={(e) => setDestinations({ ...destinations, facebook: e.target.checked })}
                          className="rounded border-zinc-850 bg-zinc-900 text-white h-4 w-4"
                        />
                        <Facebook className="h-4 w-4 text-blue-500" />
                        <span>Facebook Page</span>
                      </label>
                      <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={destinations.instagram}
                          onChange={(e) => setDestinations({ ...destinations, instagram: e.target.checked })}
                          className="rounded border-zinc-850 bg-zinc-900 text-white h-4 w-4"
                        />
                        <Instagram className="h-4 w-4 text-pink-500" />
                        <span>Instagram Account</span>
                      </label>
                    </div>
                  </div>

                  {/* Format Types */}
                  <div className="space-y-2">
                    <label className="font-semibold text-zinc-405 block">Content Format Type</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'photo', name: 'Photo Post', icon: ImageIcon },
                        { id: 'carousel', name: 'Carousel', icon: Layers },
                        { id: 'reel', name: 'Reel Video', icon: Play },
                        { id: 'story', name: 'Story Post', icon: Video },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPostType(item.id as any)}
                          className={`p-3 border flex flex-col items-center gap-1.5 justify-center transition-all cursor-pointer ${
                            postType === item.id 
                              ? 'bg-white text-zinc-950 border-white' 
                              : 'bg-zinc-900/30 border-zinc-850 text-zinc-400 hover:text-white hover:border-zinc-700'
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-[10px] font-semibold">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CONTENT SOURCE SELECTOR */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <label className="font-semibold text-zinc-405 block">Content Source</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-zinc-350 cursor-pointer">
                        <input
                          type="radio"
                          name="mediaSource"
                          checked={mediaSource === 'canva'}
                          onChange={() => {
                            setMediaSource('canva');
                            setIsMediaReady(false);
                            setMediaUrl('');
                          }}
                          className="accent-white"
                        />
                        <span>Select from Canva Synced designs</span>
                      </label>
                      <label className="flex items-center gap-2 text-zinc-350 cursor-pointer">
                        <input
                          type="radio"
                          name="mediaSource"
                          checked={mediaSource === 'device'}
                          onChange={() => {
                            setMediaSource('device');
                            setIsMediaReady(false);
                            setMediaUrl('');
                          }}
                          className="accent-white"
                        />
                        <span>Upload from Device</span>
                      </label>
                    </div>
                  </div>

                  {/* Canva Source Controls */}
                  {mediaSource === 'canva' && (
                    <div className="space-y-3 p-3 bg-zinc-900/20 border border-zinc-900 animate-fadeIn">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">Select Canva Project Design</label>
                        <select
                          value={selectedCanvaDesign}
                          onChange={(e) => {
                            setSelectedCanvaDesign(e.target.value);
                            setIsMediaReady(false);
                          }}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-700 focus:outline-none"
                        >
                          <option value="">-- Choose Sync Design --</option>
                          <option value="design-1">Summer Campaign Social Post (Canva ID: canva-1)</option>
                          <option value="design-2">Apex Logo Kit Cover V2 (Canva ID: canva-2)</option>
                          <option value="design-3">Corporate Newsletter Flyer (Canva ID: canva-3)</option>
                        </select>
                      </div>

                      <Button
                        type="button"
                        onClick={handleExportCanva}
                        disabled={isExportingCanva || !selectedCanvaDesign}
                        className="h-8 text-xs font-semibold"
                        variant="secondary"
                      >
                        {isExportingCanva ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            <span>Exporting Canva Catalogs...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5 mr-1.5" />
                            <span>Export design from Canva</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Device Source Controls */}
                  {mediaSource === 'device' && (
                    <div className="space-y-3 p-3 bg-zinc-900/20 border border-zinc-900 animate-fadeIn">
                      <label className="font-semibold text-zinc-400 block">Local Device Media Uploader</label>
                      <div className="border border-dashed border-zinc-800 bg-zinc-950/20 p-6 flex flex-col items-center justify-center text-center space-y-2 relative cursor-pointer hover:border-zinc-700 transition-colors">
                        <Paperclip className="h-6 w-6 text-zinc-500" />
                        <div>
                          <span className="block font-semibold text-white">Click to choose file</span>
                          <span className="block text-[10px] text-zinc-600 mt-0.5">Supports PNG, JPG, MP4 (Max 50MB)</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*,video/*"
                          onChange={handleUploadDevice}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      {isUploadingDevice && (
                        <div className="text-[10px] text-zinc-455 flex items-center gap-1.5">
                          <RefreshCw className="h-3 w-3 animate-spin text-white" />
                          <span>Uploading file to Meta Asset catalog...</span>
                        </div>
                      )}
                      {uploadedFileName && !isUploadingDevice && (
                        <div className="text-[10px] text-zinc-300 flex items-center gap-1.5 font-mono">
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Selected: {uploadedFileName}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview "Ready to Post" Banner */}
                  {isMediaReady && (
                    <div className="p-3 border border-emerald-900/40 bg-emerald-950/20 rounded flex items-center gap-3 animate-fadeIn">
                      <div className="h-10 w-14 border border-zinc-800 overflow-hidden relative bg-zinc-950 shrink-0">
                        <img src={mediaUrl} alt="Ready preview" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <span className="text-emerald-400 font-bold block">✓ Ready to Post</span>
                        <span className="text-[10px] text-zinc-500">Asset rendered and buffered in Meta CDN repository.</span>
                      </div>
                    </div>
                  )}

                  {/* Caption */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-900">
                    <label className="font-semibold text-zinc-400 block">Caption text</label>
                    <textarea
                      value={caption}
                      required
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write organic post caption..."
                      rows={4}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-650 focus:border-zinc-705 focus:bg-zinc-900 focus:outline-none transition-all font-sans text-xs"
                    />
                  </div>

                  {/* Scheduling Switch */}
                  <div className="pt-2 border-t border-zinc-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block font-semibold text-white">Schedule Release Time</span>
                        <span className="text-[10px] text-zinc-500">Release immediately or schedule date slots.</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isScheduled}
                          onChange={(e) => setIsScheduled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-zinc-950"></div>
                      </label>
                    </div>

                    {isScheduled && (
                      <div className="grid grid-cols-2 gap-3 animate-fadeIn">
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Release Date</label>
                          <input
                            type="date"
                            required={isScheduled}
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:outline-none focus:border-zinc-700 transition-all font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Release Time</label>
                          <input
                            type="time"
                            required={isScheduled}
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:outline-none focus:border-zinc-700 transition-all font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission */}
                  <div className="flex justify-end pt-2 border-t border-zinc-900">
                    <Button
                      type="submit"
                      disabled={!isMediaReady}
                      className="h-9 px-6 font-semibold"
                    >
                      {isScheduled ? 'Schedule to Calendar' : 'Publish Content'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar list feed */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Broadcast Queue</CardTitle>
                <CardDescription>Organic post feeds buffer list.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-900 border-t border-zinc-900">
                  {scheduledPosts.map((post) => (
                    <div key={post.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {post.platform.includes('facebook') && <Facebook className="h-3.5 w-3.5 text-blue-500" />}
                          {post.platform.includes('instagram') && <Instagram className="h-3.5 w-3.5 text-pink-500" />}
                          <Badge variant="outline" className="text-[8px] uppercase tracking-wide border-zinc-800 text-zinc-550 font-mono capitalize">
                            {post.postType}
                          </Badge>
                        </div>
                        <Badge variant={post.status === 'PUBLISHED' ? 'risk-low' : 'outline'} className="text-[8px]">
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{post.caption}</p>
                      <div className="flex items-center justify-between pt-1 text-[9px] text-zinc-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3" />
                          {post.status === 'PUBLISHED' 
                            ? `Published ${new Date(post.scheduledAt).toLocaleDateString()}` 
                            : `Scheduled: ${new Date(post.scheduledAt).toLocaleString()}`}
                        </span>
                        {post.status === 'SCHEDULED' ? (
                          <button onClick={() => handleCancelSchedule(post.id)} className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer">
                            Cancel
                          </button>
                        ) : (
                          <span className="flex gap-2">
                            <span>❤️ {post.likes}</span>
                            <span>💬 {post.comments}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MONTHLY CALENDAR VIEW (Span all 3 columns below) */}
          <div className="md:col-span-3 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-zinc-400" />
                    <span>Monthly Broadcast Calendar (June 2026)</span>
                  </CardTitle>
                  <CardDescription>Click a date cell to pre-fill dates and schedule a post at that slot.</CardDescription>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-zinc-550 font-mono bg-zinc-900/30 border border-zinc-850 px-2 py-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block mr-1"></span> Published
                  <span className="h-2 w-2 rounded-full bg-blue-400 inline-block ml-3 mr-1"></span> Scheduled
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Grid */}
                <div className="border border-zinc-850 bg-zinc-950/20 font-sans">
                  {/* Grid Headers */}
                  <div className="grid grid-cols-7 border-b border-zinc-850 bg-zinc-900/30 text-center text-[10px] font-bold text-zinc-400 py-2">
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                    <div>Sun</div>
                  </div>

                  {/* Day cells grid */}
                  <div className="grid grid-cols-7 grid-rows-5 auto-rows-fr divide-x divide-y divide-zinc-850">
                    {calendarDays.map((cell, idx) => {
                      // Filter posts scheduled on this date
                      const dayPosts = scheduledPosts.filter(p => p.scheduledAt.startsWith(cell.dateStr));
                      
                      return (
                        <div
                          key={idx}
                          onClick={() => handleCalendarDayClick(cell.dateStr)}
                          className={`min-h-[100px] p-2 flex flex-col justify-between group hover:bg-zinc-900/30 transition-all cursor-pointer relative ${
                            !cell.isCurrentMonth ? 'text-zinc-650 opacity-40 bg-zinc-900/5' : 'text-zinc-250 bg-zinc-950/10'
                          }`}
                        >
                          {/* Day Number */}
                          <span className={`text-[10px] font-bold ${
                            cell.dateStr === '2026-06-26' ? 'bg-white text-zinc-950 h-5 w-5 rounded-full flex items-center justify-center font-black shadow-md' : 'text-zinc-400'
                          }`}>
                            {cell.dayNum}
                          </span>

                          {/* Render posts scheduled on this day */}
                          <div className="space-y-1 mt-1 overflow-y-auto max-h-[70px] scrollbar-none">
                            {dayPosts.map((post) => {
                              const pTime = post.scheduledAt.split('T')[1]?.slice(0, 5) || '12:00';
                              const isPublished = post.status === 'PUBLISHED';
                              
                              return (
                                <div
                                  key={post.id}
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid triggering day cell click
                                    setSelectedDayPost(post);
                                  }}
                                  className={`p-1 text-[8px] flex items-center justify-between gap-1 border border-zinc-800 transition-all hover:brightness-125 ${
                                    isPublished 
                                      ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                                      : 'bg-blue-950/20 border-blue-900/30 text-blue-400'
                                  }`}
                                  title={`${post.postType.toUpperCase()} - ${post.caption.slice(0, 50)}...`}
                                >
                                  <div className="flex items-center gap-0.5 truncate">
                                    {post.platform.includes('facebook') && <Facebook className="h-2 w-2 shrink-0" />}
                                    {post.platform.includes('instagram') && <Instagram className="h-2 w-2 shrink-0" />}
                                    <span className="truncate capitalize font-semibold">{post.postType}</span>
                                  </div>
                                  <span className="font-mono text-[7px] font-bold bg-zinc-900/40 px-1">{pTime}</span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Quick hover trigger info */}
                          <div className="absolute right-1 bottom-1 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-zinc-550 font-bold">
                            + Add Post
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER TAB 5: PRISM AI STRATEGY */}
      {activeTab === 'strategy' && (
        <div className="space-y-6 animate-fadeIn">
          <Card>
            <CardHeader className="border-b border-zinc-850 pb-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <PrismIcon className="h-4 w-4 text-violet-400" />
                    <span>Claude strategy generation plan</span>
                  </CardTitle>
                  <CardDescription>Analyze campaigns, spends, click logs, and lead conversions. Get high-fidelity performance strategies directly from Claude.</CardDescription>
                </div>
                <Button
                  onClick={handleGenerateStrategy}
                  disabled={generatingStrategy}
                  className="h-9 px-4 font-semibold text-xs bg-violet-600 hover:bg-violet-750 text-white flex items-center gap-2 border border-violet-500 shadow-lg shadow-violet-900/20"
                >
                  {generatingStrategy ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Consulting Claude...</span>
                    </>
                  ) : (
                    <>
                      <PrismIcon className="h-3.5 w-3.5" />
                      <span>Generate Campaign Strategy</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {strategyText ? (
                <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-4 font-sans text-zinc-300">
                  <FormattedMarkdown text={strategyText} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 space-y-3">
                  <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-full">
                    <PrismIcon className="h-6 w-6 text-violet-400 animate-pulse" />
                  </div>
                  <div className="max-w-md">
                    <span className="block text-xs font-semibold text-zinc-300">No strategy report compiled yet</span>
                    <span className="block text-[11px] text-zinc-500 mt-1">Click the button above to request Prism AI Strategy Counselor (Claude) to compile performance audits and budget optimizations.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* POST DETAILS POPUP DIALOG */}
      {selectedDayPost && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 max-w-md w-full p-6 space-y-5 rounded-none shadow-2xl relative animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                {selectedDayPost.platform.includes('facebook') && <Facebook className="h-4 w-4 text-blue-500" />}
                {selectedDayPost.platform.includes('instagram') && <Instagram className="h-4 w-4 text-pink-500" />}
                <span className="text-xs font-bold text-white uppercase tracking-wider">{selectedDayPost.postType} Broadcast</span>
              </div>
              <Badge variant={selectedDayPost.status === 'PUBLISHED' ? 'risk-low' : 'outline'}>
                {selectedDayPost.status}
              </Badge>
            </div>

            {/* Media thumbnail */}
            <div className="h-48 w-full border border-zinc-800 bg-zinc-950 overflow-hidden relative">
              <img src={selectedDayPost.mediaUrl} alt="Post content" className="h-full w-full object-cover" />
            </div>

            {/* Details */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-zinc-500 block uppercase tracking-wider text-[9px]">Caption</span>
                <p className="text-zinc-300 font-sans leading-relaxed">{selectedDayPost.caption}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900 text-zinc-400">
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-550 block">Broadcast Date</span>
                  <span className="font-mono text-zinc-300">{new Date(selectedDayPost.scheduledAt).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-bold text-zinc-550 block">Broadcast Time</span>
                  <span className="font-mono text-zinc-300">{new Date(selectedDayPost.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Admin Approval Actions */}
              {userRole === 'admin' && selectedDayPost.status !== 'PUBLISHED' && (
                <div className="space-y-3 pt-3 border-t border-zinc-900 text-xs">
                  <span className="font-bold text-zinc-550 block uppercase tracking-wider text-[9px]">Client Approval & Feedback</span>
                  {selectedDayPost.status === 'APPROVED' && (
                    <div className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5 bg-emerald-950/15 border border-emerald-900/30 p-2 rounded">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approved by Client</span>
                    </div>
                  )}
                  {selectedDayPost.status === 'CHANGES_PROPOSED' && (
                    <div className="space-y-2">
                      <div className="text-amber-400 font-semibold text-xs flex items-center gap-1.5 bg-amber-950/15 border border-amber-900/30 p-2 rounded">
                        <span>Changes Proposed by Client</span>
                      </div>
                      {selectedDayPost.clientFeedback && (
                        <div className="bg-zinc-900/40 border border-zinc-800 p-2.5 rounded text-zinc-400 leading-normal italic font-sans text-[11px]">
                          "{selectedDayPost.clientFeedback}"
                        </div>
                      )}
                    </div>
                  )}
                  {selectedDayPost.status !== 'APPROVED' && selectedDayPost.status !== 'CHANGES_PROPOSED' && (
                    <div className="text-zinc-500 italic text-[11px]">
                      Awaiting client approval.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              {userRole === 'admin' && selectedDayPost.status === 'SCHEDULED' && (
                <Button 
                  onClick={() => {
                    handleCancelSchedule(selectedDayPost.id);
                    setSelectedDayPost(null);
                  }}
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs font-semibold gap-1.5 border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Schedule</span>
                </Button>
              )}
              <Button 
                onClick={() => setSelectedDayPost(null)}
                variant="outline" 
                size="sm" 
                className="h-8 text-xs font-semibold border-zinc-800 text-zinc-300"
              >
                Close View
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
