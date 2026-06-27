'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUserMessage } from '@/lib/utils';
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
  AlertTriangle
} from 'lucide-react';

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<'profile' | 'billing'>('profile');
  const [orgName, setOrgName] = React.useState('Apex Creative Group');
  const [billingEmail, setBillingEmail] = React.useState('billing@apex.co');
  const [currency, setCurrency] = React.useState('USD');
  const [plan, setPlan] = React.useState<'BASIC' | 'PRO' | 'ADVANCED'>('PRO');
  const [hasAddon, setHasAddon] = React.useState(false);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    async function loadOrg() {
      try {
        const res = await fetch('/api/organization');
        if (res.ok) {
          const data = await res.json();
          setOrgName(data.name);
          setPlan(data.plan || 'BASIC');
          setHasAddon(data.hasAddon || false);
          setSelectedTypes(data.agencyTypes || []);
        }
      } catch (e) {
        console.error('Error loading organization:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadOrg();
    if (typeof window !== 'undefined') {
      setCurrency(localStorage.getItem('dashboardCurrency') || 'USD');
    }
  }, []);

  const maxAllowed = React.useMemo(() => {
    if (plan === 'BASIC') return hasAddon ? 2 : 1;
    if (plan === 'PRO') return 5;
    return 10; // ADVANCED allows all 10
  }, [plan, hasAddon]);

  const limitExceeded = React.useMemo(() => {
    return selectedTypes.length > maxAllowed;
  }, [selectedTypes, maxAllowed]);

  const handleToggleType = (typeName: string) => {
    if (selectedTypes.includes(typeName)) {
      setSelectedTypes(prev => prev.filter(t => t !== typeName));
      setErrorMessage('');
    } else {
      if (selectedTypes.length >= maxAllowed) {
        setErrorMessage(formatUserMessage(`Lohith, you have reached the maximum of ${maxAllowed} agency types for your current plan settings. Upgrade your plan or enable the add-on to choose more.`));
        return;
      }
      setSelectedTypes(prev => [...prev, typeName]);
      setErrorMessage('');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitExceeded) {
      setErrorMessage(formatUserMessage(`Lohith, please reduce your selected agency types to matches the limit of ${maxAllowed} before saving.`));
      return;
    }

    setSaveStatus('saving');
    setErrorMessage('');

    try {
      const res = await fetch('/api/organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          plan,
          hasAddon,
          agencyTypes: selectedTypes,
        }),
      });

      if (res.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
        // Save currency to localStorage and dispatch event
        localStorage.setItem('dashboardCurrency', currency);
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

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Loading organization settings...</span>
        </div>
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
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === 'profile' ? (
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
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none focus:ring-0 transition-all"
                      >
                        <option value="USD">USD ($) United States Dollar</option>
                        <option value="EUR">EUR (€) Euro</option>
                        <option value="GBP">GBP (£) British Pound</option>
                        <option value="INR">INR (₹) Indian Rupee</option>
                        <option value="CAD">CAD (CA$) Canadian Dollar</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agency Industry Selection */}
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-white">Agency Industry Specializations</CardTitle>
                    <CardDescription>Select the types of services your agency handles. Limits depend on your billing plan.</CardDescription>
                  </div>
                  <Badge variant={limitExceeded ? 'risk-high' : 'default'} className="bg-zinc-900 border-zinc-800 text-zinc-300">
                    Selected: {selectedTypes.length} / {maxAllowed}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {errorMessage && (
                    <div className="flex gap-2.5 rounded border border-rose-900/30 bg-rose-950/10 p-3.5 text-xs text-rose-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {limitExceeded && (
                    <div className="flex gap-2.5 rounded border border-amber-900/30 bg-amber-950/10 p-3.5 text-xs text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{formatUserMessage(`Lohith, your current selections (${selectedTypes.length}) exceed the limit for the selected plan (${maxAllowed}). Please deselect ${selectedTypes.length - maxAllowed} items before saving.`)}</span>
                    </div>
                  )}

                  {/* Grid of Interactive cards */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {AGENCY_INDUSTRIES.map((industry) => {
                      const isSelected = selectedTypes.includes(industry.name);
                      const Icon = industry.icon;
                      const isDisabled = !isSelected && selectedTypes.length >= maxAllowed && !limitExceeded;

                      return (
                        <div
                          key={industry.id}
                          onClick={() => !isDisabled && handleToggleType(industry.name)}
                          className={`group relative flex flex-col justify-between p-3.5 rounded border text-xs cursor-pointer select-none transition-all duration-200 ${
                            isSelected
                              ? 'border-white bg-zinc-900/40 text-white shadow-lg'
                              : isDisabled
                              ? 'border-zinc-900 bg-zinc-950/20 text-zinc-650 cursor-not-allowed'
                              : 'border-zinc-850 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`h-7 w-7 rounded flex items-center justify-center shrink-0 transition-colors ${
                                isSelected ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-zinc-400 group-hover:text-white'
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="font-semibold">{industry.name}</span>
                            </div>
                            {isSelected && (
                              <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center text-zinc-950 shrink-0">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <p className={`mt-2.5 text-[10px] leading-normal ${
                            isSelected ? 'text-zinc-300' : isDisabled ? 'text-zinc-700' : 'text-zinc-500'
                          }`}>
                            {industry.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white">Security & Roles</CardTitle>
                  <CardDescription>Configure user access credentials and workspace authorization levels.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 font-sans text-xs">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <div>
                      <span className="block font-semibold text-white">Administrator (ADMIN)</span>
                      <span className="text-[10px] text-zinc-500">Full operations and billing access.</span>
                    </div>
                    <Badge variant="risk-low">2 Users</Badge>
                  </div>
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <div>
                      <span className="block font-semibold text-white">Member (MEMBER)</span>
                      <span className="text-[10px] text-zinc-500">Access to project boards and creative assets.</span>
                    </div>
                    <Badge variant="risk-low">3 Users</Badge>
                  </div>
                  <div className="flex justify-between items-center pb-1">
                    <div>
                      <span className="block font-semibold text-white">Client Viewer (CLIENT_VIEWER)</span>
                      <span className="text-[10px] text-zinc-500">Read-only billing summaries and portal design.</span>
                    </div>
                    <Badge variant="risk-low">1 User</Badge>
                  </div>
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
                    <span className="text-center block text-[10px] font-semibold text-rose-400 mt-2">
                      Error: Update failed.
                    </span>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Plan Tier Selection */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <CreditCard className="h-4.5 w-4.5 text-zinc-400" />
                    <span>Choose Plan Tier</span>
                  </CardTitle>
                  <CardDescription>Select a workspace tier that fits your agency size and workload.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Grid of plans (3 column layout in billing tab!) */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div
                      onClick={() => {
                        setPlan('BASIC');
                        setErrorMessage('');
                      }}
                      className={`p-4 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                        plan === 'BASIC'
                          ? 'border-white bg-zinc-900/40 text-white shadow-lg'
                          : 'border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <span className="font-semibold block text-sm">Basic Plan</span>
                        <span className="block text-[10px] text-zinc-500 mt-1">1 Agency Type (Max 2 with Add-on)</span>
                      </div>
                      <span className="font-mono text-base font-bold text-white mt-4 block">$99/mo</span>
                    </div>

                    <div
                      onClick={() => {
                        setPlan('PRO');
                        setErrorMessage('');
                      }}
                      className={`p-4 rounded border cursor-pointer transition-all flex flex-col justify-between relative ${
                        plan === 'PRO'
                          ? 'border-white bg-zinc-900/40 text-white shadow-lg'
                          : 'border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="absolute -top-2 right-2 px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold uppercase tracking-wider">
                        Popular
                      </div>
                      <div>
                        <span className="font-semibold block text-sm">Pro Plan</span>
                        <span className="block text-[10px] text-zinc-500 mt-1">Up to 5 Agency Types</span>
                      </div>
                      <span className="font-mono text-base font-bold text-white mt-4 block">$299/mo</span>
                    </div>

                    <div
                      onClick={() => {
                        setPlan('ADVANCED');
                        setErrorMessage('');
                      }}
                      className={`p-4 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                        plan === 'ADVANCED'
                          ? 'border-white bg-zinc-900/40 text-white shadow-lg'
                          : 'border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <span className="font-semibold block text-sm">Advanced Plan</span>
                        <span className="block text-[10px] text-zinc-500 mt-1">All 10+ Agency Types</span>
                      </div>
                      <span className="font-mono text-base font-bold text-white mt-4 block">$599/mo</span>
                    </div>
                  </div>

                  {/* Add-on option for BASIC plan */}
                  {plan === 'BASIC' && (
                    <div className="p-4 rounded border border-zinc-850 bg-zinc-900/10 space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer text-zinc-350">
                        <input
                          type="checkbox"
                          checked={hasAddon}
                          onChange={(e) => {
                            setHasAddon(e.target.checked);
                            setErrorMessage('');
                          }}
                          className="mt-0.5 rounded border-zinc-800 bg-zinc-950 text-white focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <span className="block font-semibold">Enable 2 Agency Types Add-on</span>
                          <span className="block text-[10px] text-zinc-500 mt-0.5 leading-normal">
                            Get allowance for 1 additional industry specialization.
                          </span>
                          <span className="block text-[10px] font-mono text-zinc-400 mt-1">+$29/mo billing charge</span>
                        </div>
                      </label>
                    </div>
                  )}
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

                  <div className="pt-4 flex flex-col gap-2">
                    <Button
                      type="submit"
                      disabled={saveStatus === 'saving'}
                      className="w-full text-xs font-semibold h-9 flex items-center justify-center gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      <span>{saveStatus === 'saving' ? 'Saving Subscription...' : 'Save Subscription'}</span>
                    </Button>

                    {saveStatus === 'success' && (
                      <span className="text-center block text-[10px] font-semibold text-emerald-400 mt-1">
                        Subscription updated successfully.
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-center block text-[10px] font-semibold text-rose-400 mt-1">
                        Error: Update failed.
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
