'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Popover } from 'radix-ui';
import { invalidateWorkspaceDataTags, workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/ui/page-skeletons';
import { formatUserMessage } from '@/lib/utils';
import { validateBrowserFile } from '@/lib/file-security';
import { MAX_SOURCE_IMAGE_BYTES, processBrowserImage } from '@/lib/browser-image-processing';
import { createClient } from '@/lib/client';
import { clearWorkspaceUiPreferences } from '@/lib/workspace-ui-storage';
import { parseAgencyIndustryList } from '@/lib/agency-industry-list';
import { mergeAgencySpecializations } from '@/lib/agency-specializations';
import { entitlementsFor, type PlanId } from '@/lib/plan-entitlements';
import {
  getMetaSdkStatus,
  META_SDK_ERROR_EVENT,
  META_SDK_READY_EVENT,
  type MetaSdkStatus,
} from '@/lib/meta-sdk-status';
import {
  Save,
  CreditCard,
  Laptop,
  Sparkles,
  Target,
  MessageSquare,
  Search,
  Megaphone,
  Compass,
  Palette,
  FileText,
  Video,
  Check,
  AlertTriangle,
  Blocks,
  ArrowLeft,
  RefreshCw,
  Wallet,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  HelpCircle,
  Trash2,
  Loader2,
  X,
  LogOut,
  Camera,
  Gauge,
  UsersRound,
  UserRoundCog,
  Bot,
} from 'lucide-react';

const SETTINGS_PLANS: Array<{ id: PlanId; name: string; price: string; description: string; features: string[] }> = [
  { id: 'BASIC', name: 'Basic', price: '$99', description: 'Core agency operations', features: ['5 clients', '2 team members', 'Core finance and delivery'] },
  { id: 'PRO', name: 'Pro', price: '$299', description: 'AI-enabled collaboration', features: ['15 clients', '4 team members', 'Atlas AI and secure messages'] },
  { id: 'ADVANCED', name: 'Advanced', price: '$599', description: 'Complete enterprise workspace', features: ['30 clients', '15 team members', 'Full Atlas, Strategy and Briefing'] },
];

type WorkspaceUsage = {
  clients: number;
  teamMembers: number;
  subAdmins: number;
  atlasTokensUsed: number;
  atlasTokenLimit: number | null;
};

function IntegrationLogo({ provider }: { provider: string }) {
  if (provider === 'META') return <span className="integration-meta-logo" aria-label="Meta"><Image src="/meta_light.png" alt="Meta" width={128} height={56} unoptimized className="integration-meta-logo-light h-14 w-auto object-contain" /><Image src="/meta_dark.png" alt="Meta" width={128} height={56} unoptimized className="integration-meta-logo-dark h-14 w-auto object-contain" /></span>;
  if (provider === 'GOOGLE') return <Image src="/google_logo.png" alt="Google" width={115} height={48} unoptimized className="h-12 w-auto object-contain" />;
  return <Blocks className="h-4 w-4" />;
}

type MetaAdAccount = {
  id: string;
  accountId: string;
  name: string;
  accountStatus: number | null;
  currency: string | null;
  timezoneName: string | null;
  businessId: string | null;
  businessName: string | null;
};

type MetaConnectionDetails = {
  facebookUserName: string;
  facebookUserEmail: string | null;
  tokenExpiresAt: string | null;
  adAccounts: MetaAdAccount[];
  selectedAdAccountIds: string[];
  pages: Array<{ id: string; name: string; tasks: string[] }>;
  leadSyncReady: boolean;
};

const INDIAN_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Canara Bank',
  'Union Bank of India',
  'Bank of Baroda',
  'IndusInd Bank',
  'Federal Bank',
  'Yes Bank',
  'IDBI Bank',
  'UCO Bank',
  'Indian Bank',
  'Central Bank of India'
];

const AGENCY_INDUSTRIES = [
  { id: 'marketing', name: 'Digital Marketing Agency', icon: Target, description: 'Core leadgen, campaign data, and analytics mapping.' },
  { id: 'social', name: 'Social Media Management Agency', icon: MessageSquare, description: 'Active platforms, content pillars, and community logs.' },
  { id: 'seo', name: 'SEO Agency', icon: Search, description: 'Keyword baselines, technical audits, and organic targets.' },
  { id: 'ppc', name: 'Paid Advertising Agency (PPC)', icon: Megaphone, description: 'Ad platform connections, ROAS metrics, and pixel logs.' },
  { id: 'brand_strategy', name: 'Brand Strategy & Positioning Agency', icon: Compass, description: 'Brand research, customer sentiment, and vision mapping.' },
  { id: 'design', name: 'Graphic Design Agency', icon: Palette, description: 'Design deliverables formats, visual assets, and constraints.' },
  { id: 'logo', name: 'Brand Identity & Logo Design Agency', icon: Sparkles, description: 'Brand stories, color palettes, and competitive context.' },
  { id: 'content', name: 'Content Marketing Agency', icon: FileText, description: 'Publishing channels, SME profiles, and operations sync.' },
  { id: 'video', name: 'Video Production & Photography Agency', icon: Video, description: 'Production logistics, shoot schedules, and editing mood boards.' },
  { id: 'web', name: 'Web Design & Development Agency', icon: Laptop, description: 'Tech stacks, hosting controls, page scopes, and CMS portals.' },
];

type ProfileIdentityUser = {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
};

function formatImageBytes(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}


function ProfileIdentity({
  user,
  canEditAvatar,
  avatarStatus,
  avatarFeedback,
  onAvatarFile,
  onRemoveAvatar,
}: {
  user: ProfileIdentityUser | null;
  canEditAvatar: boolean;
  avatarStatus: 'idle' | 'saving' | 'success' | 'error';
  avatarFeedback: string;
  onAvatarFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAvatar: () => void;
}) {
  const initials = (user?.name || 'User')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-w-0 items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 text-base font-bold text-white">
        {user?.avatarUrl ? <img src={user.avatarUrl} alt={`${user.name} profile`} className="h-full w-full object-contain" /> : initials}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{user?.name || 'Iris OS user'}</p>
        <p className="truncate text-sm text-zinc-500">{user?.email}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{user?.role?.replace('_', ' ')}</p>
        {canEditAvatar && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-zinc-750 bg-zinc-900 px-2.5 text-[10px] font-semibold text-zinc-300 transition-colors hover:text-white">
              {avatarStatus === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {user?.avatarUrl ? 'Replace photo' : 'Upload photo'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={avatarStatus === 'saving'}
                onChange={onAvatarFile}
              />
            </label>
            {user?.avatarUrl && (
              <Button type="button" variant="ghost" size="sm" disabled={avatarStatus === 'saving'} onClick={onRemoveAvatar} className="h-8 text-[10px] text-zinc-500 hover:text-white">
                Remove
              </Button>
            )}
          </div>
        )}
        {canEditAvatar && avatarFeedback && (
          <p className={`mt-1 text-[9px] ${avatarStatus === 'error' ? 'text-rose-400' : 'text-zinc-500'}`} role="status">
            {avatarFeedback}
          </p>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [activeTab, setActiveTab] = React.useState<'profile' | 'billing' | 'integrations'>('profile');
  const [currentUser, setCurrentUser] = React.useState<{ id: string; orgId: string; name: string; email: string; role: string; avatarUrl?: string | null; accessPermissions?: string[] | null } | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);
  const [avatarStatus, setAvatarStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [avatarFeedback, setAvatarFeedback] = React.useState('PNG, JPEG, or WebP · maximum 10 MB · optimized before upload');
  const [orgName, setOrgName] = React.useState('Apex Creative Group');
  const [legalEntityName, setLegalEntityName] = React.useState('');
  const [billingAddressLine1, setBillingAddressLine1] = React.useState('');
  const [billingAddressLine2, setBillingAddressLine2] = React.useState('');
  const [billingCity, setBillingCity] = React.useState('');
  const [billingState, setBillingState] = React.useState('');
  const [billingPostalCode, setBillingPostalCode] = React.useState('');
  const [billingCountry, setBillingCountry] = React.useState('India');
  const [gstNumber, setGstNumber] = React.useState('');
  const [invoiceLogoDataUrl, setInvoiceLogoDataUrl] = React.useState('');
  const [invoiceLogoStatus, setInvoiceLogoStatus] = React.useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [invoiceLogoFeedback, setInvoiceLogoFeedback] = React.useState('PNG or JPEG · maximum 10 MB · optimized before saving');
  const [invoiceBrandColor, setInvoiceBrandColor] = React.useState('#09090B');
  const [billingEmail, setBillingEmail] = React.useState('billing@apex.co');
  const [currency, setCurrency] = React.useState('USD');
  const [hasFinancialData, setHasFinancialData] = React.useState(false);
  const [plan, setPlan] = React.useState<'BASIC' | 'PRO' | 'ADVANCED'>('PRO');
  const [hasAddon, setHasAddon] = React.useState(false);
  const [workspaceUsage, setWorkspaceUsage] = React.useState<WorkspaceUsage>({ clients: 0, teamMembers: 0, subAdmins: 0, atlasTokensUsed: 0, atlasTokenLimit: null });
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [specializationInput, setSpecializationInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const [selectedBanks, setSelectedBanks] = React.useState<string[]>([]);
  const [searchBankInput, setSearchBankInput] = React.useState('');
  const [showBankDropdown, setShowBankDropdown] = React.useState(false);

  // Integrations States
  const [integrations, setIntegrations] = React.useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = React.useState(false);
  const [showMetaAccountPicker, setShowMetaAccountPicker] = React.useState(false);
  const [metaConnection, setMetaConnection] = React.useState<MetaConnectionDetails | null>(null);
  const [selectedMetaAccountIds, setSelectedMetaAccountIds] = React.useState<string[]>([]);
  const [metaConnectionStatus, setMetaConnectionStatus] = React.useState<'idle' | 'authorizing' | 'loading' | 'saving' | 'logging_out'>('idle');
  const [metaConnectionError, setMetaConnectionError] = React.useState('');
  const [metaSdkStatus, setMetaSdkStatus] = React.useState<MetaSdkStatus>('loading');

  // Wipe Data Modal States
  const [showWipeModal, setShowWipeModal] = React.useState(false);
  const [wipeStep, setWipeStep] = React.useState<1 | 2 | 3>(1);
  const [sliderValue, setSliderValue] = React.useState(100);
  const [puzzle, setPuzzle] = React.useState({ q: '', a: 0 });
  const [userAnswer, setUserAnswer] = React.useState('');
  const [wipeStatus, setWipeStatus] = React.useState<'idle' | 'wiping' | 'success' | 'error'>('idle');
  const [wipeError, setWipeError] = React.useState('');

  // AI Consent State
  const [aiSharingConsent, setAiSharingConsent] = React.useState(false);
  const [metaAccessConsent, setMetaAccessConsent] = React.useState(false);
  const [atlasMetaAnalyticsConsent, setAtlasMetaAnalyticsConsent] = React.useState(false);


  const fetchIntegrations = React.useCallback(async () => {
    setLoadingIntegrations(true);
    try {
      const res = await fetch('/api/integrations');
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
        const savedMetaConnection = Array.isArray(data)
          ? data.find((integration) => integration.provider === 'META')?.meta as MetaConnectionDetails | undefined
          : undefined;
        if (savedMetaConnection) {
          setMetaConnection(savedMetaConnection);
          setSelectedMetaAccountIds(savedMetaConnection.selectedAdAccountIds || []);
        }
      }
    } catch (e) {
      console.error('Error fetching integrations:', e);
    } finally {
      setLoadingIntegrations(false);
    }
  }, []);

  const openMetaAccountPicker = (meta: MetaConnectionDetails) => {
    setMetaConnection(meta);
    setSelectedMetaAccountIds(meta.selectedAdAccountIds || []);
    setMetaConnectionError('');
    setShowMetaAccountPicker(true);
  };

  const loadMetaAccounts = async () => {
    setMetaConnectionStatus('loading');
    setMetaConnectionError('');
    setMetaConnection(null);
    setShowMetaAccountPicker(true);
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'META', action: 'refresh_meta_accounts' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load Meta ad accounts.');
      openMetaAccountPicker(data.meta);
    } catch (error) {
      setMetaConnectionError(formatUserMessage(error instanceof Error ? error.message : 'Unable to load Meta ad accounts.'));
      setShowMetaAccountPicker(true);
    } finally {
      setMetaConnectionStatus('idle');
    }
  };

  const handleConnectMeta = () => {
    setMetaConnectionError('');

    if (!process.env.NEXT_PUBLIC_META_APP_ID) {
      setMetaConnectionError('Meta Login is not configured for this deployment.');
      return;
    }

    if (metaSdkStatus === 'error') {
      setMetaConnectionError(
        'Facebook Login could not load. Disable ad or tracking protection for this site, then refresh and try again.',
      );
      return;
    }

    if (typeof window === 'undefined' || !(window as any).FB || metaSdkStatus !== 'ready') {
      setMetaConnectionError('Facebook Login is still loading. Please try again in a moment.');
      return;
    }
    const loginConfigurationId = process.env.NEXT_PUBLIC_META_LOGIN_CONFIG_ID;
    if (!loginConfigurationId) {
      setMetaConnectionError('Meta Login for Business is not configured for this deployment.');
      return;
    }

    const completeMetaAuthorization = async (response: any) => {
      if (response.status !== 'connected' || !response.authResponse?.accessToken) {
        setMetaConnectionStatus('idle');
        setMetaConnectionError('Meta authorization was cancelled or did not complete.');
        return;
      }

      try {
        const integrationResponse = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'META',
            action: 'connect_sdk',
            authResponse: response.authResponse,
          }),
        });
        const data = await integrationResponse.json();
        if (!integrationResponse.ok) {
          throw new Error(data.error || 'Meta authorization could not be verified.');
        }
        openMetaAccountPicker(data.meta);
        await fetchIntegrations();
      } catch (error) {
        setMetaConnectionError(formatUserMessage(error instanceof Error ? error.message : 'Meta authorization could not be verified.'));
      } finally {
        setMetaConnectionStatus('idle');
      }
    };

    setMetaConnectionStatus('authorizing');
    // Meta's SDK validates the callback as a regular Function. Passing an
    // `async` function here is rejected by the SDK before the login flow starts.
    (window as any).FB.login((response: any) => {
      void completeMetaAuthorization(response);
    }, {
      config_id: loginConfigurationId,
      scope: 'public_profile,email,ads_read,business_management,leads_retrieval,pages_show_list,pages_manage_metadata',
      auth_type: 'rerequest',
      return_scopes: true,
    });
  };

  const saveMetaAccountSelection = async () => {
    if (selectedMetaAccountIds.length === 0) {
      setMetaConnectionError('Select at least one ad account.');
      return;
    }

    setMetaConnectionStatus('saving');
    setMetaConnectionError('');
    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'META',
          action: 'select_meta_accounts',
          accountIds: selectedMetaAccountIds,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save the selected Meta ad accounts.');
      setShowMetaAccountPicker(false);
      setMetaConnection(data.meta);
      await fetchIntegrations();
    } catch (error) {
      setMetaConnectionError(formatUserMessage(error instanceof Error ? error.message : 'Unable to save the selected Meta ad accounts.'));
    } finally {
      setMetaConnectionStatus('idle');
    }
  };

  const hasPendingMetaAccountChanges = Boolean(
    metaConnection &&
      (
        selectedMetaAccountIds.length !== metaConnection.selectedAdAccountIds.length ||
        selectedMetaAccountIds.some((accountId) => !metaConnection.selectedAdAccountIds.includes(accountId))
      ),
  );


  React.useEffect(() => {
    if (activeTab === 'integrations') {
      fetchIntegrations();
    }
  }, [activeTab, fetchIntegrations]);

  React.useEffect(() => {
    if (!process.env.NEXT_PUBLIC_META_APP_ID) {
      setMetaSdkStatus('error');
      return;
    }

    setMetaSdkStatus(getMetaSdkStatus());

    const handleReady = () => setMetaSdkStatus('ready');
    const handleError = () => setMetaSdkStatus('error');

    window.addEventListener(META_SDK_READY_EVENT, handleReady);
    window.addEventListener(META_SDK_ERROR_EVENT, handleError);

    return () => {
      window.removeEventListener(META_SDK_READY_EVENT, handleReady);
      window.removeEventListener(META_SDK_ERROR_EVENT, handleError);
    };
  }, []);

    React.useEffect(() => {
    async function loadOrg() {
      try {
        let organizationBillingEmail: string | null = null;
        const [res, userRes] = await Promise.all([
          fetch('/api/organization'),
          fetch('/api/user'),
        ]);
        if (res.ok) {
          const data = await res.json();
          setOrgName(data.name);
          setLegalEntityName(data.legalEntityName || '');
          setBillingAddressLine1(data.billingAddressLine1 || '');
          setBillingAddressLine2(data.billingAddressLine2 || '');
          setBillingCity(data.billingCity || '');
          setBillingState(data.billingState || '');
          setBillingPostalCode(data.billingPostalCode || '');
          setBillingCountry(data.billingCountry || 'India');
          setGstNumber(data.gstNumber || '');
          setInvoiceLogoDataUrl(data.invoiceLogoDataUrl || '');
          setInvoiceBrandColor(data.invoiceBrandColor || '#09090B');
          setPlan(data.plan || 'BASIC');
          setHasAddon(data.hasAddon || false);
          setSelectedTypes(data.agencyTypes || []);
          setSpecializationInput('');
          setSelectedBanks(data.bankNames || []);
          setCurrency(data.currency || 'USD');
          setHasFinancialData(!!data.hasFinancialData);
          setAiSharingConsent(data.aiSharingConsent || false);
          setMetaAccessConsent(data.metaAccessConsent || false);
          setAtlasMetaAnalyticsConsent(data.atlasMetaAnalyticsConsent || false);
          organizationBillingEmail = data.billingEmail || null;
        }

        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData);
          setBillingEmail(organizationBillingEmail || userData.email);
        }
        const [clientsRes, teamRes, atlasUsageRes] = await Promise.all([
          fetch('/api/data?domain=clients'),
          fetch('/api/data?domain=team'),
          fetch('/api/atlas-ai/usage'),
        ]);
        const [clients, team, atlasUsage] = await Promise.all([
          clientsRes.ok ? clientsRes.json() : [],
          teamRes.ok ? teamRes.json() : [],
          atlasUsageRes.ok ? atlasUsageRes.json() : null,
        ]);
        const activeTeam = Array.isArray(team) ? team : [];
        setWorkspaceUsage({
          clients: Array.isArray(clients) ? clients.length : 0,
          teamMembers: activeTeam.filter((member: { role?: string }) => member.role?.toLowerCase() === 'member').length,
          subAdmins: activeTeam.filter((member: { role?: string }) => member.role?.toLowerCase() === 'sub_admin').length,
          atlasTokensUsed: Number(atlasUsage?.usage?.total || 0),
          atlasTokenLimit: typeof atlasUsage?.limits?.total === 'number' ? atlasUsage.limits.total : null,
        });
      } catch (e) {
        console.error('Error loading organization:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrg();
  }, []);


  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    clearWorkspaceUiPreferences(currentUser ? { userId: currentUser.id, orgId: currentUser.orgId } : null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setErrorMessage(formatUserMessage(error.message || 'Unable to sign out.'));
      setSigningOut(false);
      return;
    }
    router.replace('/login');
    router.refresh();
  };

  const updateProfileAvatar = async (avatarDataUrl: string | null, successMessage?: string) => {
    setAvatarStatus('saving');
    setAvatarFeedback(avatarDataUrl ? 'Uploading profile picture…' : 'Removing profile picture…');
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarDataUrl }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update profile picture.');

      setCurrentUser((existing) => existing ? { ...existing, avatarUrl: data.avatarUrl } : existing);
      invalidateWorkspaceDataTags(['workspace']);
      window.dispatchEvent(new Event('user-updated'));
      setAvatarStatus('success');
      setAvatarFeedback(data.avatarUrl ? successMessage || 'Profile picture updated.' : 'Profile picture removed.');
    } catch (error) {
      setAvatarStatus('error');
      setAvatarFeedback(formatUserMessage(error instanceof Error ? error.message : 'Unable to update profile picture.'));
    }
  };

  const handleProfileAvatarFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validation = await validateBrowserFile(file, 'profile-avatar', { maxBytes: MAX_SOURCE_IMAGE_BYTES });
    if (!validation.ok) {
      setAvatarStatus('error');
      setAvatarFeedback(validation.error);
      return;
    }

    setAvatarStatus('saving');
    setAvatarFeedback('Optimizing profile picture…');
    const processed = await processBrowserImage(file, 'profile-avatar').catch((error) => {
      setAvatarStatus('error');
      setAvatarFeedback(formatUserMessage(error instanceof Error ? error.message : 'Unable to process the selected profile picture.'));
      return null;
    });

    if (processed) {
      await updateProfileAvatar(
        processed.dataUrl,
        `Profile picture updated.`,
      );
    }
  };

  const handleInvoiceLogoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validation = await validateBrowserFile(file, 'invoice-logo', { maxBytes: MAX_SOURCE_IMAGE_BYTES });
    if (!validation.ok) {
      setInvoiceLogoStatus('error');
      setInvoiceLogoFeedback(validation.error);
      setErrorMessage(validation.error);
      return;
    }

    setInvoiceLogoStatus('processing');
    setInvoiceLogoFeedback('Optimizing invoice logo…');
    try {
      const processed = await processBrowserImage(file, 'invoice-logo');
      setInvoiceLogoDataUrl(processed.dataUrl);
      setInvoiceLogoStatus('ready');
      setErrorMessage('');
    } catch (error) {
      const message = formatUserMessage(error instanceof Error ? error.message : 'Unable to process the selected invoice logo.');
      setInvoiceLogoStatus('error');
      setInvoiceLogoFeedback(message);
      setErrorMessage(message);
    }
  };

  const handleLogoutMeta = async () => {
    setMetaConnectionStatus('logging_out');
    setMetaConnectionError('');

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'META', action: 'disconnect' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to clear the Meta authorization.');

      if (
        typeof window !== 'undefined' &&
        window.FB &&
        metaSdkStatus === 'ready' &&
        window.FB.getAuthResponse()?.accessToken
      ) {
        await new Promise<void>((resolve) => {
          window.FB?.logout(() => resolve());
        });
      }

      setShowMetaAccountPicker(false);
      setMetaConnection(null);
      setSelectedMetaAccountIds([]);
      await fetchIntegrations();
    } catch (error) {
      setMetaConnectionError(formatUserMessage(error instanceof Error ? error.message : 'Unable to log out of Meta.'));
    } finally {
      setMetaConnectionStatus('idle');
    }
  };

  const addSpecializations = React.useCallback((value: string) => {
    const additions = parseAgencyIndustryList(value);
    if (!additions.length) return;
    setSelectedTypes((current) => {
      const known = new Set(current.map((item) => item.toLowerCase()));
      return [...current, ...additions.filter((item) => !known.has(item.toLowerCase()))];
    });
  }, []);

  const removeSpecialization = (specialization: string) => {
    setSelectedTypes((current) => current.filter((item) => item !== specialization));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const specializationsToSave = mergeAgencySpecializations(selectedTypes, specializationInput);
    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const res = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          legalEntityName,
          billingAddressLine1,
          billingAddressLine2,
          billingCity,
          billingState,
          billingPostalCode,
          billingCountry,
          gstNumber,
          invoiceLogoDataUrl: invoiceLogoDataUrl || null,
          invoiceBrandColor,
          plan,
          hasAddon,
          agencyTypes: specializationsToSave,
          bankNames: selectedBanks,
          currency,
          aiSharingConsent: aiSharingConsent,
          metaAccessConsent,
          atlasMetaAnalyticsConsent,
          billingEmail,
        }),
      });

      if (res.ok) {
        setSelectedTypes(specializationsToSave);
        setSpecializationInput('');
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
        window.dispatchEvent(new Event('currency-updated'));
        // Dispatch custom event to notify sidebar to update
        window.dispatchEvent(new Event('organization-updated'));
      } else {
        const errorData = await res.json();
        setSaveStatus('error');
        setErrorMessage(errorData.error || 'Failed to save changes.');
      }
    } catch (err: any) {
      console.error(err);
      setSaveStatus('error');
      setErrorMessage('An unexpected connection error occurred.');
    }
  };

  const activeEntitlements = entitlementsFor(plan);
  const usageRows = [
    { label: 'Clients onboarded', value: workspaceUsage.clients, limit: activeEntitlements.clientLimit, icon: UsersRound },
    { label: 'Team members', value: workspaceUsage.teamMembers, limit: activeEntitlements.teamMemberLimit, icon: UserRoundCog },
    { label: 'Specializations', value: selectedTypes.length, limit: activeEntitlements.specializationLimit, icon: Target },
  ];

  if (isLoading) {
    return <PageSkeleton variant="settings" />;
  }

  const canManageWorkspaceSettings = currentUser?.role?.toLowerCase() === 'admin'
    || (currentUser?.role?.toLowerCase() === 'sub_admin' && (currentUser.accessPermissions || []).includes('settings'));
  const canEditProfileAvatar = ['admin', 'sub_admin', 'member'].includes(currentUser?.role?.toLowerCase() || '');

  if (!canManageWorkspaceSettings) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="border-b border-zinc-800/60 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Profile Settings</h1>
          <p className="mt-1 text-xs text-zinc-500">Review your Iris OS account and manage your session.</p>
        </div>
        {errorMessage && <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-rose-300">{errorMessage}</div>}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold text-white">Account Profile</CardTitle><CardDescription>Your signed-in workspace identity.</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <ProfileIdentity user={currentUser} canEditAvatar={canEditProfileAvatar} avatarStatus={avatarStatus} avatarFeedback={avatarFeedback} onAvatarFile={handleProfileAvatarFile} onRemoveAvatar={() => void updateProfileAvatar(null)} />
            <Button type="button" variant="outline" disabled={signingOut} onClick={handleSignOut} className="gap-2 text-rose-400 hover:text-rose-300">{signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}{signingOut ? 'Signing out…' : 'Log out'}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Settings Console</h1>
          <p className="text-xs text-zinc-500">Configure global organization profiles, agency industries, and subscription plans.</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-850 gap-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('profile');
            setErrorMessage('');
          }}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-350'
          }`}
        >
          Profile & Services
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('billing');
            setErrorMessage('');
          }}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'billing'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-350'
          }`}
        >
          Billing & Subscription
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('integrations');
            setErrorMessage('');
          }}
          className={`pb-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
            activeTab === 'integrations'
              ? 'border-white text-white font-bold'
              : 'border-transparent text-zinc-500 hover:text-zinc-350'
          }`}
        >
          Integrations
        </button>
      </div>

      {activeTab === 'profile' && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold text-white">Account Profile</CardTitle><CardDescription>Your signed-in account and session controls.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <ProfileIdentity user={currentUser} canEditAvatar={canEditProfileAvatar} avatarStatus={avatarStatus} avatarFeedback={avatarFeedback} onAvatarFile={handleProfileAvatarFile} onRemoveAvatar={() => void updateProfileAvatar(null)} />
              <Button type="button" variant="outline" disabled={signingOut} onClick={handleSignOut} className="gap-2 text-rose-400 hover:text-rose-300">{signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}{signingOut ? 'Signing out…' : 'Log out'}</Button>
            </CardContent>
          </Card>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Form Settings */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white font-sans">Organization Profile</CardTitle>
                  <CardDescription>Global variables for invoices, client portals, and branding headers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 font-sans text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">Organization Name</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none focus:ring-0 transition-all"
                    />
                  </div>

                  <div id="agency-invoice-identity" className="rounded border border-zinc-850 bg-zinc-950/35 p-4 space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-white">Agency invoice identity</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-zinc-500">
                        Legal entity and address fields are required before Iris OS can create a project invoice. GSTIN is optional.
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Legal Entity Name</label>
                      <input
                        type="text"
                        value={legalEntityName}
                        onChange={(event) => setLegalEntityName(event.target.value)}
                        placeholder="e.g. Iris Operations Private Limited"
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-650 focus:border-zinc-750 focus:outline-none"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                      <div className="space-y-2">
                        <label className="font-semibold text-zinc-400 block">Invoice Logo <span className="font-normal text-zinc-600">(optional)</span></label>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="inline-flex h-9 cursor-pointer items-center rounded border border-zinc-750 bg-zinc-900 px-3 text-[10px] font-semibold text-zinc-300 hover:text-white">
                            {invoiceLogoStatus === 'processing' ? 'Optimizing logo…' : 'Upload PNG or JPEG'}
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              className="sr-only"
                              disabled={invoiceLogoStatus === 'processing'}
                              onChange={handleInvoiceLogoFile}
                            />
                          </label>
                          {invoiceLogoDataUrl && (
                            <Button type="button" variant="ghost" size="sm" disabled={invoiceLogoStatus === 'processing'} onClick={() => {
                              setInvoiceLogoDataUrl('');
                              setInvoiceLogoStatus('idle');
                              setInvoiceLogoFeedback('PNG or JPEG · maximum 10 MB · optimized before saving');
                            }}>
                              Remove
                            </Button>
                          )}
                        </div>
                        <p className={`text-[9px] leading-relaxed ${invoiceLogoStatus === 'error' ? 'text-rose-400' : 'text-zinc-600'}`} role="status">
                          {invoiceLogoFeedback} The optimized logo is embedded into newly generated invoice PDFs.
                        </p>
                      </div>
                      <div className="flex min-h-24 items-center justify-center rounded border border-zinc-800 bg-white p-3">
                        {invoiceLogoDataUrl
                          ? <img src={invoiceLogoDataUrl} alt="Invoice logo preview" className="max-h-16 max-w-full object-contain" />
                          : <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Logo preview</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="font-semibold text-zinc-400 block">Invoice Brand Colour</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={invoiceBrandColor}
                          onChange={(event) => setInvoiceBrandColor(event.target.value.toUpperCase())}
                          className="h-10 w-14 cursor-pointer rounded border border-zinc-750 bg-zinc-900 p-1"
                        />
                        <input
                          type="text"
                          value={invoiceBrandColor}
                          onChange={(event) => setInvoiceBrandColor(event.target.value.toUpperCase())}
                          pattern="^#[0-9A-Fa-f]{6}$"
                          maxLength={7}
                          className="w-32 rounded border border-zinc-850 bg-zinc-900/40 p-2.5 font-mono uppercase text-white focus:border-zinc-750 focus:outline-none"
                        />
                        <div className="h-9 flex-1 rounded border border-zinc-700" style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(invoiceBrandColor) ? invoiceBrandColor : '#09090B' }} />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="font-semibold text-zinc-400 block">Address Line 1</label>
                        <input
                          type="text"
                          value={billingAddressLine1}
                          onChange={(event) => setBillingAddressLine1(event.target.value)}
                          placeholder="Street address"
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-650 focus:border-zinc-750 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="font-semibold text-zinc-400 block">Address Line 2</label>
                        <input
                          type="text"
                          value={billingAddressLine2}
                          onChange={(event) => setBillingAddressLine2(event.target.value)}
                          placeholder="Suite, floor, locality (optional)"
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-650 focus:border-zinc-750 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">City</label>
                        <input
                          type="text"
                          value={billingCity}
                          onChange={(event) => setBillingCity(event.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white focus:border-zinc-750 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">State / Region</label>
                        <input
                          type="text"
                          value={billingState}
                          onChange={(event) => setBillingState(event.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white focus:border-zinc-750 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">Postal Code</label>
                        <input
                          type="text"
                          value={billingPostalCode}
                          onChange={(event) => setBillingPostalCode(event.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white focus:border-zinc-750 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">Country</label>
                        <input
                          type="text"
                          value={billingCountry}
                          onChange={(event) => setBillingCountry(event.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white focus:border-zinc-750 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="font-semibold text-zinc-400 block">GST Number <span className="font-normal text-zinc-600">(optional)</span></label>
                        <input
                          type="text"
                          value={gstNumber}
                          onChange={(event) => setGstNumber(event.target.value.toUpperCase())}
                          placeholder="GSTIN"
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 font-mono uppercase text-white placeholder-zinc-650 focus:border-zinc-750 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Billing Notifications Email</label>
                      <input
                        type="email"
                        value={billingEmail}
                        onChange={(e) => setBillingEmail(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none focus:ring-0 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Billing Currency</label>
                      <select
                        value={currency}
                        disabled={hasFinancialData}
                        onChange={(e) => setCurrency(e.target.value)}
                        className={`w-full rounded border border-zinc-855 bg-zinc-900/40 p-2.5 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none focus:ring-0 transition-all ${
                          hasFinancialData ? 'opacity-50 cursor-not-allowed border-zinc-900 text-zinc-500' : 'cursor-pointer'
                        }`}
                      >
                        <option value="USD">USD ($) United States Dollar</option>
                        <option value="EUR">EUR (€) Euro</option>
                        <option value="GBP">GBP (£) British Pound</option>
                        <option value="INR">INR (₹) Indian Rupee</option>
                        <option value="CAD">CAD (CA$) Canadian Dollar</option>
                      </select>
                      {hasFinancialData && (
                        <div className="text-[10px] text-amber-500/80 font-medium mt-1 leading-normal flex items-center gap-1">
                          <span>⚠️ Currency is locked because financial data has been recorded in the workspace.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
              {/* Agency Industry Selection */}
              <Card className="h-full">
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">Agency Industry Specializations</CardTitle>
                    <CardDescription>Enter your service or industry specializations as a comma-separated list.</CardDescription>
                  </div>
                  <Badge variant="default" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                    {selectedTypes.length} selected
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {errorMessage && (
                    <div className="flex gap-2.5 rounded border border-rose-900/30 bg-rose-950/10 p-3.5 text-xs text-rose-450">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-3">
                    <span className="text-xs font-semibold text-zinc-300">Specializations</span>
                    <div className="specialization-chip-input flex min-h-11 flex-wrap items-center gap-2 rounded border border-zinc-800 bg-zinc-900 p-2 focus-within:border-zinc-600">
                      {selectedTypes.map((specialization) => (
                        <span key={specialization} className="specialization-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold">
                          {specialization}
                          <button type="button" onClick={() => removeSpecialization(specialization)} className="rounded-full p-0.5 transition-colors hover:bg-white/20" aria-label={`Remove ${specialization}`}>
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                      <input
                        type="text"
                      value={specializationInput}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (value.includes(',')) {
                          addSpecializations(value);
                          setSpecializationInput('');
                        } else setSpecializationInput(value);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' || !specializationInput.trim()) return;
                        event.preventDefault();
                        addSpecializations(specializationInput);
                        setSpecializationInput('');
                      }}
                      onBlur={() => {
                        if (!specializationInput.trim()) return;
                        addSpecializations(specializationInput);
                        setSpecializationInput('');
                      }}
                      placeholder="e.g. Healthcare marketing, B2B SaaS, Hospitality, Real estate"
                      className="min-w-48 flex-1 bg-transparent px-1 py-1 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                    </div>
                    <span className="block text-[10px] leading-5 text-zinc-500">Separate each item with a comma. Duplicate entries are removed automatically when saved.</span>
                  </div>
                </CardContent>
              </Card>

              {/* Bank Accounts Card */}
              <Card className="hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-white font-sans">Bank Accounts Configuration</CardTitle>
                      <CardDescription>Add up to 5 Indian banks where you maintain accounts to enable them in ledger entries.</CardDescription>
                    </div>
                    <Badge variant={selectedBanks.length >= 5 ? "risk-high" : "risk-low"} className="font-mono">
                      {selectedBanks.length}/5 Banks
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 font-sans text-xs">
                  {/* Search / Add Input */}
                  {selectedBanks.length < 5 ? (
                    <div className="relative space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Select/Search Indian Banks</label>
                      <div className="flex gap-2">
                        <Popover.Root open={showBankDropdown} onOpenChange={setShowBankDropdown}>
                          <Popover.Anchor asChild>
                            <div className="flex-1">
                              <input
                                type="text"
                                placeholder="Type to search e.g. HDFC, SBI..."
                                value={searchBankInput}
                                onChange={(e) => {
                                  setSearchBankInput(e.target.value);
                                  setShowBankDropdown(true);
                                }}
                                onFocus={() => setShowBankDropdown(true)}
                                className="w-full rounded border border-zinc-855 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none focus:ring-0 transition-all"
                              />
                            </div>
                          </Popover.Anchor>
                          <Popover.Portal>
                            <Popover.Content
                              align="start"
                              sideOffset={6}
                              collisionPadding={16}
                              className="z-50 max-h-52 w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded border border-zinc-800 bg-zinc-950 shadow-xl scrollbar-thin"
                            >
                              {INDIAN_BANKS.filter(bank =>
                                bank.toLowerCase().includes(searchBankInput.toLowerCase()) &&
                                !selectedBanks.includes(bank)
                              ).map(bank => (
                                <button
                                  key={bank}
                                  type="button"
                                  onClick={() => {
                                    setSelectedBanks(prev => [...prev, bank]);
                                    setSearchBankInput('');
                                    setShowBankDropdown(false);
                                  }}
                                  className="w-full border-b border-zinc-900/50 px-3 py-2 text-left text-zinc-350 transition-all last:border-0 hover:bg-zinc-900 hover:text-white cursor-pointer"
                                >
                                  {bank}
                                </button>
                              ))}
                              {INDIAN_BANKS.filter(bank =>
                                bank.toLowerCase().includes(searchBankInput.toLowerCase()) &&
                                !selectedBanks.includes(bank)
                              ).length === 0 && (
                                <div className="p-3 text-[10px] text-zinc-650">No matching suggestions</div>
                              )}
                            </Popover.Content>
                          </Popover.Portal>
                        </Popover.Root>
                        {searchBankInput.trim() && !INDIAN_BANKS.includes(searchBankInput) && !selectedBanks.includes(searchBankInput) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBanks(prev => [...prev, searchBankInput.trim()]);
                              setSearchBankInput('');
                              setShowBankDropdown(false);
                            }}
                            className="bg-zinc-800 text-white hover:bg-zinc-700 px-4 h-[38px] font-semibold text-xs cursor-pointer border border-zinc-750 rounded"
                          >
                            Add Custom
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded text-zinc-550 font-medium">
                      Maximum of 5 bank accounts reached. Remove an existing bank to add a new one.
                    </div>
                  )}

                  {/* List of Added Banks */}
                  <div className="space-y-2 pt-1">
                    <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[9px]">Configured Accounts</span>
                    {selectedBanks.length === 0 ? (
                      <div className="text-zinc-650 text-xs italic py-1">No banks configured yet. Manual ledger entries will display Your Account as a text field.</div>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedBanks.map((bank, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-2.5 rounded border border-zinc-850 bg-zinc-950/40 text-white font-medium"
                          >
                            <span className="truncate pr-2">{bank}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedBanks(prev => prev.filter((_, i) => i !== index))}
                              className="text-zinc-550 hover:text-red-500 transition-colors p-1 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              </div>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">AI Settings & Data Privacy</CardTitle>
                  <CardDescription>Configure Atlas AI and Meta data-access permissions for your workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 font-sans text-xs">
                  <div className="flex items-start justify-between gap-3 p-3 rounded border border-zinc-850 bg-zinc-900/10">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="settingsAiConsentCheckbox"
                        checked={plan !== 'BASIC' && aiSharingConsent}
                        onChange={(e) => setAiSharingConsent(e.target.checked)}
                        disabled={plan === 'BASIC'}
                        className="mt-1 rounded border-zinc-800 text-red-650 bg-zinc-900 accent-red-600 focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 h-3.5 w-3.5"
                      />
                      <div className="cursor-pointer select-none">
                        <label htmlFor="settingsAiConsentCheckbox" className="block font-bold text-zinc-300">
                          Enable Atlas AI Analysis
                        </label>
                        <span className="block text-[10px] text-zinc-500 mt-1 leading-normal">
                          {plan === 'BASIC'
                            ? 'AI analysis is not included with the Basic plan. Upgrade to Pro or Advanced to enable it.'
                            : 'Allow Atlas AI models to analyze your financial transactions, invoices, expenses, and lead pipelines to deliver custom insights. If unchecked, AI data sharing will be immediately revoked.'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-3 rounded border border-zinc-850 bg-zinc-900/10">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="settingsMetaAccessConsentCheckbox"
                        checked={metaAccessConsent}
                        onChange={(event) => setMetaAccessConsent(event.target.checked)}
                        className="mt-1 rounded border-zinc-800 bg-zinc-900 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                      />
                      <div className="cursor-pointer select-none">
                        <label htmlFor="settingsMetaAccessConsentCheckbox" className="block font-bold text-zinc-300">
                          Allow Iris OS to Access Meta
                        </label>
                        <span className="block text-[10px] text-zinc-500 mt-1 leading-normal">
                          Allow Iris OS to retrieve selected ad-account performance and lead-form submissions from Meta. This access can be withdrawn at any time.
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-3 rounded border border-violet-900/50 bg-violet-950/10">
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="settingsAtlasMetaAnalyticsConsentCheckbox"
                        checked={atlasMetaAnalyticsConsent}
                        onChange={(event) => setAtlasMetaAnalyticsConsent(event.target.checked)}
                        className="mt-1 rounded border-zinc-800 bg-zinc-900 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                      />
                      <div className="cursor-pointer select-none">
                        <label htmlFor="settingsAtlasMetaAnalyticsConsentCheckbox" className="settings-atlas-meta-consent-title block font-bold text-violet-200">
                          Use Aggregate Meta Data with Atlas AI
                        </label>
                        <span className="block text-[10px] text-zinc-500 mt-1 leading-normal">
                          Allow Atlas AI to use Meta-derived spend, impressions, reach, clicks, and lead totals. Atlas never receives Meta tokens or raw lead contact and form data, and analysis runs only while general Atlas data sharing is enabled.
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white font-sans">Security & Roles</CardTitle>
                  <CardDescription>Configure user access credentials and workspace authorization levels.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 font-sans text-xs">
                  <p className="text-zinc-400">View all users and configure client, team member, sub-admin, and admin access. Sub-admin permissions are set per user.</p>
                  <Link href="/settings/security" prefetch={false} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 font-semibold text-white hover:border-zinc-600"><span>Open Security & Roles</span><span aria-hidden="true">→</span></Link>
                </CardContent>
              </Card>

              {/* Save changes card for Profile */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Save Changes</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 flex flex-col gap-2">
                  <Button
                    type="submit"
                    disabled={saveStatus === 'saving'}
                    className="w-full text-xs font-semibold h-9 flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saveStatus === 'saving' ? 'Saving Profile...' : 'Save Profile'}</span>
                  </Button>

                  {saveStatus === 'success' && (
                    <span className="text-center block text-[10px] font-semibold text-emerald-400 mt-2">
                      Profile updated successfully.
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-center block text-[10px] font-semibold text-rose-450 mt-2">
                      Error: Update failed.
                    </span>
                  )}
                </CardContent>
              </Card>

              {/* Bank Accounts Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm font-semibold text-white font-sans">Bank Accounts Configuration</CardTitle>
                      <CardDescription>Add up to 5 Indian banks for ledger entries.</CardDescription>
                    </div>
                    <Badge variant={selectedBanks.length >= 5 ? 'risk-high' : 'risk-low'} className="shrink-0 font-mono">{selectedBanks.length}/5 Banks</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 font-sans text-xs">
                  {selectedBanks.length < 5 ? (
                    <div className="space-y-1.5">
                      <label className="block font-semibold text-zinc-400">Select/Search Indian Banks</label>
                      <div className="flex gap-2">
                        <input
                          list="settings-indian-bank-options"
                          type="text"
                          placeholder="Search a bank"
                          value={searchBankInput}
                          onChange={(event) => setSearchBankInput(event.target.value)}
                          className="min-w-0 flex-1 rounded border border-zinc-855 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none"
                        />
                        <datalist id="settings-indian-bank-options">
                          {INDIAN_BANKS.filter((bank) => !selectedBanks.includes(bank)).map((bank) => <option key={bank} value={bank} />)}
                        </datalist>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!searchBankInput.trim() || selectedBanks.includes(searchBankInput.trim())}
                          onClick={() => {
                            setSelectedBanks((current) => [...current, searchBankInput.trim()]);
                            setSearchBankInput('');
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  ) : <div className="rounded border border-zinc-850 bg-zinc-900/30 p-3 font-medium text-zinc-550">Maximum of 5 bank accounts reached.</div>}

                  <div className="space-y-2 pt-1">
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-zinc-400">Configured Accounts</span>
                    {selectedBanks.length === 0 ? <div className="py-1 text-xs italic text-zinc-650">No banks configured yet.</div> : selectedBanks.map((bank, index) => (
                      <div key={bank} className="flex items-center justify-between rounded border border-zinc-850 bg-zinc-950/40 p-2.5 font-medium text-white">
                        <span className="truncate pr-2">{bank}</span>
                        <button type="button" onClick={() => setSelectedBanks((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="cursor-pointer p-1 text-zinc-550 transition-colors hover:text-red-500" aria-label={`Remove ${bank}`}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              <Card className="border-rose-950 bg-rose-950/5">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-rose-400">Danger Zone</CardTitle>
                  <CardDescription className="text-rose-550/80">Irreversible operations on workspace repository data.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowWipeModal(true);
                      setWipeStep(1);
                      setSliderValue(100);
                      setUserAnswer('');
                      setWipeStatus('idle');
                      setWipeError('');
                      // Generate random math puzzle
                      const num1 = Math.floor(Math.random() * 12) + 5;
                      const num2 = Math.floor(Math.random() * 15) + 5;
                      setPuzzle({ q: `What is ${num1} + ${num2}?`, a: num1 + num2 });
                    }}
                    className="w-full text-xs font-semibold h-9 flex items-center justify-center gap-1.5 border border-rose-900/40 text-rose-450 hover:bg-rose-950/20 hover:text-rose-350 cursor-pointer transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Wipe Agency Data</span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white"><Gauge className="h-4.5 w-4.5 text-zinc-400" /><span>Workspace usage limits</span></CardTitle>
              <CardDescription>Live consumption against the capacity included with the {plan.toLowerCase()} plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                {usageRows.map(({ label, value, limit, icon: Icon }) => {
                  const percent = Math.min(100, limit > 0 ? (value / limit) * 100 : 0);
                  return <div key={label} className="min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="flex min-w-0 items-center gap-2 font-semibold text-zinc-300"><Icon className="h-4 w-4 shrink-0 text-zinc-500" />{label}</span><span className="shrink-0 font-mono font-bold tabular-nums text-white">{value} / {limit}</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-850" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={value}><div className="h-full rounded-full bg-zinc-300" style={{ width: `${percent}%` }} /></div>
                  </div>;
                })}
                <div className="min-w-0">
                  <div className="mb-2 flex flex-col items-start gap-2 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="flex min-w-0 items-center gap-2 font-semibold text-zinc-300"><Bot className="h-4 w-4 shrink-0 text-zinc-500" />Atlas credits used</span><span className="font-mono font-bold tabular-nums text-white">{workspaceUsage.atlasTokensUsed.toLocaleString()} / {workspaceUsage.atlasTokenLimit?.toLocaleString() || 'Not included'}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-zinc-850" role="progressbar" aria-label="Atlas credits used" aria-valuemin={0} aria-valuemax={workspaceUsage.atlasTokenLimit || 1} aria-valuenow={workspaceUsage.atlasTokensUsed}><div className="h-full rounded-full bg-zinc-300" style={{ width: `${workspaceUsage.atlasTokenLimit ? Math.min(100, (workspaceUsage.atlasTokensUsed / workspaceUsage.atlasTokenLimit) * 100) : 0}%` }} /></div>
                </div>
                <div className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-zinc-850 pt-4 text-xs md:col-span-2"><span className="flex items-center gap-2 font-semibold text-zinc-300"><UserRoundCog className="h-4 w-4 text-zinc-500" />Sub-admins</span><span className="font-mono font-bold tabular-nums text-white">{workspaceUsage.subAdmins} active <span className="font-sans font-normal text-zinc-500">· managed separately</span></span></div>
              </div>
            </CardContent>
          </Card>

          <section aria-labelledby="settings-plan-options" className="space-y-4">
            <div><h2 id="settings-plan-options" className="text-base font-bold text-white">Plan options</h2><p className="mt-1 text-xs text-zinc-500">The same three workspace tiers available during agency onboarding.</p></div>
            <div className="grid gap-4 lg:grid-cols-3">
              {SETTINGS_PLANS.map((tier) => {
                const isCurrent = tier.id === plan;
                return <Card key={tier.id} className={`flex min-h-[290px] flex-col ${isCurrent ? 'border-zinc-500 bg-zinc-900/45' : 'border-zinc-850'}`}>
                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base font-bold text-white">{tier.name}</CardTitle><CardDescription className="mt-1">{tier.description}</CardDescription></div>{isCurrent && <Badge variant="outline" className="whitespace-nowrap border-zinc-600 text-[9px] uppercase text-zinc-300">Current plan</Badge>}</div>
                    <div className="mt-5"><span className="font-mono text-3xl font-black tabular-nums text-white">{tier.price}</span><span className="ml-1 text-xs text-zinc-500">/ month</span></div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 border-t border-zinc-850 pt-4 text-xs text-zinc-300">{tier.features.map((feature) => <li key={feature} className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-500" />{feature}</li>)}</ul>
                    <Button type="button" variant={isCurrent ? 'outline' : 'default'} disabled={isCurrent} onClick={() => { window.location.href = '/onboarding?step=pricing&redirect=/settings'; }} className="mt-5 h-10 w-full whitespace-nowrap text-xs font-bold">{isCurrent ? 'Current plan' : `View ${tier.name}`}</Button>
                  </CardContent>
                </Card>;
              })}
            </div>
          </section>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Plan Tier Display */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <CreditCard className="h-4.5 w-4.5 text-zinc-400" />
                    <span>Active Subscription Plan</span>
                  </CardTitle>
                  <CardDescription>Your current workspace tier and billing cycle details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 font-sans text-xs">
                  {/* Locked Plan Display */}
                  <div className="p-5 rounded border border-zinc-800 bg-zinc-900/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">Current Plan</span>
                      <h3 className="text-base font-bold text-white uppercase">{plan} Plan</h3>
                      <p className="text-zinc-500 text-[11px]">
                        All 10 agency specializations
                      </p>
                    </div>
                    <div className="sm:text-right">
                      <span className="font-mono text-2xl font-black text-white">
                        {plan === 'BASIC' ? '$99' : plan === 'PRO' ? '$299' : '$599'}
                      </span>
                      <span className="text-zinc-500 font-semibold block text-[10px] uppercase font-mono mt-0.5">per month</span>
                    </div>
                  </div>

                  {/* Billing Details */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 rounded border border-zinc-850 bg-zinc-950/20 space-y-1">
                      <span className="text-zinc-500 block font-semibold text-[10px] uppercase tracking-wider">Billing Cycle</span>
                      <span className="text-white font-medium block">Monthly recurring</span>
                      <span className="text-zinc-500 text-[10px] block mt-1">Next invoice date: July 30, 2026</span>
                    </div>

                    <div className="p-4 rounded border border-zinc-850 bg-zinc-950/20 space-y-1">
                      <span className="text-zinc-500 block font-semibold text-[10px] uppercase tracking-wider">Default Payment Method</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="h-5 w-8 bg-zinc-850 rounded border border-zinc-800 flex items-center justify-center font-bold text-[8px] tracking-wide text-zinc-300">
                          VISA
                        </div>
                        <span className="text-white font-mono font-medium">•••• 4444</span>
                      </div>
                      <span className="text-zinc-500 text-[10px] block mt-1">Expiry date: 12/28</span>
                    </div>
                  </div>

                  {/* Upgrade/Change Button */}
                  <div className="pt-2 flex justify-start">
                    <Button
                      type="button"
                      onClick={() => {
                        window.location.href = '/onboarding?step=pricing&redirect=/settings';
                      }}
                      className="text-xs font-bold h-10 px-6 flex items-center justify-center gap-2 bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer animate-fade-in"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Change / Upgrade Billing Plan</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Summary Sidebar for Billing */}
            <div className="space-y-6">
              <Card className="border-zinc-800/80">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Subscription Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 font-sans text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1 text-[11px] border-b border-zinc-900">
                      <span className="text-zinc-500">Selected Tier:</span>
                      <span className="font-bold text-white uppercase">{plan}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 text-[11px] border-b border-zinc-900">
                      <span className="text-zinc-500">Base Price:</span>
                      <span className="font-mono text-zinc-300">
                        {plan === 'BASIC' ? '$99' : plan === 'PRO' ? '$299' : '$599'}/mo
                      </span>
                    </div>
                    {plan === 'BASIC' && hasAddon && (
                      <div className="flex justify-between items-center py-1 text-[11px] border-b border-zinc-900">
                        <span className="text-zinc-500">Add-on:</span>
                        <span className="font-mono text-zinc-300">+$29/mo</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 text-[11px] font-bold">
                      <span className="text-zinc-400">Total Recurring Cost:</span>
                      <span className="font-mono text-white text-sm">
                        {plan === 'BASIC'
                          ? `$${99 + (hasAddon ? 29 : 0)}/mo`
                          : plan === 'PRO'
                          ? '$299/mo'
                          : '$599/mo'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          {/* Header metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Connected Services</CardTitle>
                <Blocks className="h-4 w-4 text-zinc-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono tracking-tight text-white">
                  {integrations.filter((i) => i.status === 'CONNECTED').length} Active
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-550">Issues Flagged</CardTitle>
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono tracking-tight text-rose-400">
                  {integrations.filter((i) => i.status === 'DISCONNECTED' || i.status === 'ERROR').length} Flagged
                </div>
              </CardContent>
            </Card>

            <Card hoverEffect>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">API Sync Health</CardTitle>
                <Activity className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold font-mono tracking-tight text-emerald-400">
                  98.4% Stable
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-white">Workspace Integrations Directory</CardTitle>
                <CardDescription>Verify link statuses and sync connection logs across workspace integrations.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-sans text-left">
                    <thead>
                      <tr className="border-b border-zinc-850 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider bg-zinc-950/20">
                        <th className="p-4">Integration Provider</th>
                        <th className="p-4">Link Status</th>
                        <th className="p-4">Connection Audit Logs</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 text-zinc-400">
                      {loadingIntegrations ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-zinc-650">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
                              <span>Loading integration list...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        integrations.map((item) => (
                          <tr key={item.provider} className="hover:bg-zinc-900/10">
                            <td className="p-4 font-bold text-white tracking-wider flex items-center gap-2">
                              <div className={`${item.provider === 'META' || item.provider === 'GOOGLE' ? 'h-[72px] w-32' : 'h-9 w-10 rounded bg-white text-zinc-700'} flex items-center justify-center`}>
                                <IntegrationLogo provider={item.provider} />
                              </div>
                              {item.provider !== 'META' && item.provider !== 'GOOGLE' && item.provider}
                            </td>
                            <td className="p-4">
                              <Badge
                                variant={
                                  item.status === 'CONNECTED'
                                    ? 'risk-low'
                                    : item.status === 'SYNCING'
                                    ? 'outline'
                                    : 'risk-high'
                                }
                              >
                                {item.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-[11px] leading-relaxed max-w-sm truncate">{item.logs}</td>
                            <td className="p-4 text-right">
                              {item.provider === 'META' || item.provider === 'GOOGLE' ? (
                                item.status === 'CONNECTED' ? (
                                  <div className="flex gap-2 justify-end">
                                    {item.provider === 'META' && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={loadMetaAccounts}
                                        disabled={metaConnectionStatus !== 'idle'}
                                        className="h-8 bg-zinc-800 text-white hover:bg-zinc-700 text-xs font-semibold"
                                      >
                                        {metaConnectionStatus === 'loading' ? (
                                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                        ) : null}
                                        Manage accounts
                                      </Button>
                                    )}
                                    {item.provider === 'GOOGLE' && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={async () => {
                                          try {
                                            setLoadingIntegrations(true);
                                            const res = await fetch('/api/calendar', {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ action: 'sync' }),
                                            });
                                            if (res.ok) {
                                              alert('Google Calendar synced successfully.');
                                            } else {
                                              const data = await res.json();
                                              alert('Sync failed: ' + (data.message || 'Unknown error'));
                                            }
                                            await fetchIntegrations();
                                          } catch (e) {
                                            console.error(e);
                                          } finally {
                                            setLoadingIntegrations(false);
                                          }
                                        }}
                                        className="h-8 bg-zinc-800 text-white hover:bg-zinc-700 text-xs font-semibold"
                                      >
                                        Sync Now
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={async () => {
                                        try {
                                          await fetch('/api/integrations', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ provider: item.provider, action: 'disconnect' }),
                                          });
                                          await fetchIntegrations();
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                      className="h-8 text-rose-450 hover:text-rose-350 hover:bg-rose-950/10 text-xs font-semibold"
                                    >
                                      Disconnect
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={
                                        item.provider === 'META' &&
                                        (
                                          metaConnectionStatus !== 'idle' ||
                                          (item.status !== 'SYNCING' && metaSdkStatus === 'loading')
                                        )
                                      }
                                      onClick={() => {
                                        if (item.provider === 'META') {
                                          if (item.status === 'SYNCING' && item.hasConfig) {
                                            loadMetaAccounts();
                                          } else {
                                            handleConnectMeta();
                                          }
                                        } else if (item.provider === 'GOOGLE') {
                                          window.location.assign('/api/integrations/google/start?returnTo=/calendar');
                                        }
                                      }}
                                      className="h-8 bg-white text-zinc-950 font-bold hover:bg-zinc-200 text-xs"
                                    >
                                      {item.provider === 'META' &&
                                      (metaConnectionStatus !== 'idle' || metaSdkStatus === 'loading') ? (
                                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                      ) : null}
                                      {item.provider === 'META' && item.status !== 'SYNCING' && metaSdkStatus === 'loading'
                                        ? 'Loading Facebook'
                                        : item.provider === 'META' && item.status === 'SYNCING'
                                          ? 'Complete setup'
                                          : 'Connect Account'}
                                    </Button>
                                    {item.provider === 'META' && item.status === 'SYNCING' && item.hasConfig ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleLogoutMeta}
                                        disabled={metaConnectionStatus !== 'idle'}
                                        className="h-8 text-rose-450 hover:bg-rose-950/10 hover:text-rose-350 text-xs font-semibold"
                                      >
                                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                                        Log out of Meta
                                      </Button>
                                    ) : null}
                                  </div>
                                )
                              ) : null}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
          </Card>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
            <p className="text-xs text-zinc-500">
              {hasPendingMetaAccountChanges
                ? 'Meta account selection has unsaved changes.'
                : 'Integration changes are saved from this tab.'}
            </p>
            <Button
              type="button"
              onClick={saveMetaAccountSelection}
              disabled={
                !hasPendingMetaAccountChanges ||
                metaConnectionStatus === 'saving' ||
                !metaConnection
              }
              className="bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40"
            >
              {metaConnectionStatus === 'saving' ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Save integration changes
            </Button>
          </div>
          {metaConnectionError && !showMetaAccountPicker ? (
            <div className="flex items-start gap-2 rounded-lg border border-rose-900/60 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{metaConnectionError}</span>
            </div>
          ) : null}
        </div>
      )}

      {showMetaAccountPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="meta-account-picker-title"
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-800 bg-[#0d0e12] shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-zinc-800 px-6 py-5">
              <div>
                <h2 id="meta-account-picker-title" className="text-base font-semibold text-white">
                  Select Meta ad accounts
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {metaConnection
                    ? `Authorized as ${metaConnection.facebookUserName}. Only ad accounts Meta has granted this user access to are shown.`
                    : 'Loading the ad accounts available to this Meta user.'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close account selection"
                onClick={() => setShowMetaAccountPicker(false)}
                className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-6">
              {metaConnection && (
                <div className={`mb-4 rounded-lg border px-4 py-3 text-xs ${
                  metaConnection.pages.length > 0
                    ? 'border-zinc-800 bg-zinc-950/60 text-zinc-300'
                    : 'border-amber-900/50 bg-amber-950/20 text-amber-200'
                }`}>
                  {metaConnection.pages.length > 0
                    ? `${metaConnection.pages.length} manageable Facebook Page${metaConnection.pages.length === 1 ? '' : 's'} will be subscribed to Instant Form lead notifications.`
                    : 'No manageable Facebook Pages were found. Ad accounts can be selected, but Instant Form lead retrieval will remain unavailable.'}
                </div>
              )}
              {metaConnectionStatus === 'loading' && !metaConnection ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading administrator ad accounts...
                </div>
              ) : metaConnection?.adAccounts.length ? (
                <div className="space-y-2">
                  {metaConnection.adAccounts.map((account) => {
                    const isSelected = selectedMetaAccountIds.includes(account.id);
                    return (
                      <label
                        key={account.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                          isSelected
                            ? 'border-blue-500/70 bg-blue-500/10'
                            : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedMetaAccountIds((current) =>
                              current.includes(account.id)
                                ? current.filter((id) => id !== account.id)
                                : [...current, account.id],
                            );
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-blue-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{account.name}</span>
                          <span className="mt-1 block text-[11px] text-zinc-500">
                            {account.businessName || 'No Business Portfolio name'} · {account.accountId}
                            {account.currency ? ` · ${account.currency}` : ''}
                          </span>
                        </span>
                        <Badge variant={account.accountStatus === 1 ? 'risk-low' : 'outline'}>
                          {account.accountStatus === 1 ? 'ACTIVE' : `STATUS ${account.accountStatus ?? 'UNKNOWN'}`}
                        </Badge>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-5 text-sm text-amber-200">
                  No accessible ad accounts were found. Confirm that the Facebook user has Analyze, Advertise, or
                  Manage access to an ad account and that the app has the required Marketing API permissions.
                </div>
              )}

              {metaConnectionError ? (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-900/60 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{metaConnectionError}</span>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-zinc-800 bg-zinc-950/40 px-6 py-4">
              <span className="text-xs text-zinc-500">
                {selectedMetaAccountIds.length} account{selectedMetaAccountIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleLogoutMeta}
                  disabled={metaConnectionStatus !== 'idle'}
                  className="text-rose-450 hover:bg-rose-950/10 hover:text-rose-350"
                >
                  {metaConnectionStatus === 'logging_out' ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-1.5 h-4 w-4" />
                  )}
                  Log out of Meta
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowMetaAccountPicker(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={saveMetaAccountSelection}
                  disabled={
                    selectedMetaAccountIds.length === 0 ||
                    metaConnectionStatus === 'saving' ||
                    !metaConnection
                  }
                  className="bg-white text-zinc-950 hover:bg-zinc-200"
                >
                  {metaConnectionStatus === 'saving' ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-4 w-4" />
                  )}
                  Save accounts
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3-Step Wipe Data Confirmation Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-[#0d0e12] p-6 shadow-2xl font-sans text-xs text-zinc-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500 animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Wipe Agency Database</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                className="text-zinc-500 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-between items-center mb-6 px-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-1.5">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      wipeStep === step
                        ? 'bg-rose-500 text-white shadow-lg'
                        : wipeStep > step
                        ? 'bg-zinc-800 text-zinc-450'
                        : 'bg-zinc-900 text-zinc-650'
                    }`}
                  >
                    {step}
                  </div>
                  <span
                    className={`text-[9px] font-mono tracking-wider uppercase ${
                      wipeStep === step ? 'text-white font-bold' : 'text-zinc-550'
                    }`}
                  >
                    {step === 1 ? 'Verify Intent' : step === 2 ? 'Drag Decelerator' : 'Logic Puzzle'}
                  </span>
                  {step < 3 && <div className="h-[1px] w-4 bg-zinc-850" />}
                </div>
              ))}
            </div>

            {/* Step 1: Yes/No Question */}
            {wipeStep === 1 && (
              <div className="space-y-5">
                <p className="leading-relaxed text-zinc-450">
                  Are you absolutely certain you want to initiate a full database purge? 
                  This will <span className="text-white font-semibold">permanently wipe</span> all campaign logs, invoices, metrics, reports, pipelines, and transactions associated with <span className="text-rose-450 font-bold uppercase">{orgName}</span>.
                </p>
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowWipeModal(false)}
                    className="text-xs h-9 text-zinc-405 hover:text-white"
                  >
                    No, Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setWipeStep(2)}
                    className="text-xs h-9 bg-rose-600 text-white font-bold hover:bg-rose-700"
                  >
                    Yes, I am sure
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Drag slider from right to left */}
            {wipeStep === 2 && (
              <div className="space-y-5">
                <p className="leading-relaxed text-zinc-450">
                  To prevent automated purges, please drag the authorization decelerator slider <span className="text-white font-bold">from the RIGHT (100) all the way to the LEFT (0)</span>.
                </p>
                
                <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded space-y-3">
                  <div className="flex justify-between font-mono text-[9px] text-zinc-550">
                    <span>LEFT (0)</span>
                    <span className="text-white font-bold">{sliderValue}%</span>
                    <span>RIGHT (100)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={(e) => setSliderValue(Number(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  {sliderValue > 0 ? (
                    <span className="block text-center text-[10px] text-zinc-500 font-mono italic">
                      Drag left to unlock next step...
                    </span>
                  ) : (
                    <span className="block text-center text-[10px] text-emerald-450 font-mono font-bold animate-pulse">
                      Decelerator deactivated! Next step unlocked.
                    </span>
                  )}
                </div>

                <div className="flex gap-3 justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setWipeStep(1)}
                    className="text-xs h-9 text-zinc-500 hover:text-zinc-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={sliderValue !== 0}
                    onClick={() => setWipeStep(3)}
                    className="text-xs h-9 bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-30"
                  >
                    Proceed to Step 3
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Puzzle verification */}
            {wipeStep === 3 && (
              <div className="space-y-5">
                <p className="leading-relaxed text-zinc-455">
                  Solve the final security arithmetic puzzle to authorize the deletion sequence.
                </p>

                <div className="bg-zinc-950/40 border border-zinc-850 p-4 rounded space-y-3">
                  <span className="block text-center text-sm font-mono font-bold text-white tracking-wider">
                    {puzzle.q}
                  </span>
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    placeholder="Enter answer..."
                    className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-center text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all font-mono"
                  />
                </div>

                {wipeStatus === 'error' && (
                  <div className="rounded border border-rose-900/30 bg-rose-950/10 p-3 text-rose-450 font-semibold text-[10px]">
                    Error Purging Database: {wipeError}
                  </div>
                )}

                <div className="flex gap-3 justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={wipeStatus === 'wiping'}
                    onClick={() => setWipeStep(2)}
                    className="text-xs h-9 text-zinc-500 hover:text-zinc-300"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    disabled={parseInt(userAnswer.trim()) !== puzzle.a || wipeStatus === 'wiping'}
                    onClick={async () => {
                      setWipeStatus('wiping');
                      setWipeError('');
                      try {
                        const res = await fetch('/api/organization', {
                          method: 'DELETE',
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setWipeStatus('success');
                          setTimeout(() => {
                            setShowWipeModal(false);
                            window.location.reload();
                          }, 2000);
                        } else {
                          setWipeStatus('error');
                          setWipeError(data.error || 'Failed to wipe data.');
                        }
                      } catch (err) {
                        setWipeStatus('error');
                        setWipeError('Network connection error.');
                      }
                    }}
                    className="text-xs h-9 bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-30"
                  >
                    {wipeStatus === 'wiping' ? 'Purging Database...' : wipeStatus === 'success' ? 'Database Purged!' : 'Permanently Wipe All Data'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
