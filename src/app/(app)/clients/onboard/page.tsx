'use client';

import * as React from 'react';
import { workspaceFetch as fetch } from '@/lib/workspace-data-cache';
import { formatCurrency, formatUserMessage, getCurrencySymbol } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MetaAdAccountSelect } from '@/components/integrations/meta-ad-account-select';
import {
  ShieldAlert,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle,
  Building,
  User,
  Layers,
  Sparkles,
  Wallet,
  AlertTriangle,
  Info,
  Layers as LayersIcon,
  X,
  Loader2
} from 'lucide-react';

const AGENCY_TYPES = [
  'Digital Marketing Agency',
  'Social Media Management Agency',
  'SEO Agency',
  'Paid Advertising Agency (PPC)',
  'Brand Strategy & Positioning Agency',
  'Graphic Design Agency',
  'Brand Identity & Logo Design Agency',
  'Content Marketing Agency',
  'Video Production & Photography Agency',
  'Web Design & Development Agency',
];

interface ClosedLeadOption {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  convertedClient?: { id: string; name: string } | null;
}


export default function ClientOnboardPage() {
  const router = useRouter();
  const [currencyState, setCurrencyState] = React.useState('USD');

  // Onboarding Wizard Steps
  // 1: Company Profile, 2: Client Contact, 3: Client Connections,
  // 4: Initial Project, 5: Review
  const [step, setStep] = React.useState(1);

  // Authentication Mocking States
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  // Form State
  const [formData, setFormData] = React.useState({
    // Step 1: Universal details
    name: '',
    legalEntityName: '',
    billingAddressLine1: '',
    billingAddressLine2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    billingCountry: 'India',
    gstNumber: '',
    description: '',
    // Step 2: Client Contact
    clientName: '',
    clientDesignation: '',
    clientEmail: '',
    clientPhone: '',
    sourceLeadId: '',
    // Step 3: Agency Type dropdown
    agencyType: 'Digital Marketing Agency',
    // Step 4: Service metadata (will be custom inputs based on type)
    metaCurrentSpend: '',
    metaPerformanceHistory: '',
    metaCac: '',
    metaActivePlatforms: '',
    metaPostingFrequency: '',
    metaBrandVoice: '',
    metaOrganicTraffic: '',
    metaTargetKeywords: '',
    metaCmsPlatform: '',
    metaAdAccounts: '',
    metaTargetRoas: '',
    metaCurrentPositioning: '',
    metaLongTermVision: '',
    metaDimensionsFormats: '',
    metaVisualConstraints: '',
    metaTypographyColor: '',
    metaFounderStory: '',
    metaSmeAvailability: '',
    metaContentObjectives: '',
    metaShootLogistics: '',
    metaEditingMood: '',
    metaDevScope: '',
    metaTechStack: '',
    // Step 3: Client-level connections
    adAccountId: '',
    // Step 4: Initial Project Setup
    createProject: true,
    projectName: '',
    projectServiceLine: 'Paid Ads & CRO',
    projectBudget: '',
    projectPaymentType: 'RETAINER',
    projectPaymentAmount: '',
    projectPaymentFrequency: 'monthly',
    projectPaymentStartDate: new Date().toISOString().split('T')[0],
    projectPaymentTerms: 'NET_30',
    projectAutoGenerateInvoice: false,
    projectTimeline: '3 Months',
    projectStartDate: new Date().toISOString().split('T')[0],
    projectDeadline: new Date(new Date().getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    projectDeliverables: 'Design banner ads, Launch campaign, Optimize conversion metrics',
    projectMemberIds: [] as string[],
    projectStages: [
      { name: 'Discovery & Plan', startDate: '', endDate: '' },
      { name: 'Creative Design', startDate: '', endDate: '' },
      { name: 'Execution & Launch', startDate: '', endDate: '' },
      { name: 'Optimization', startDate: '', endDate: '' },
    ],
  });

  const [teamMembers, setTeamMembers] = React.useState<any[]>([]);
  const [closedLeadOptions, setClosedLeadOptions] = React.useState<ClosedLeadOption[]>([]);

  const [inviteUrl, setInviteUrl] = React.useState('');
  const [inviteEmailSent, setInviteEmailSent] = React.useState(false);

  const [formError, setFormError] = React.useState('');
  const [submitStatus, setSubmitStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  // Load and authenticate active user role
  const checkRole = async () => {
    setAuthLoading(true);
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const u = await res.json();
        setUserRole(u.role);
      } else {
        setUserRole(null);
      }
    } catch (e) {
      console.error(e);
      setUserRole(null);
    } finally {
      setAuthLoading(false);
    }
  };

  React.useEffect(() => {
    checkRole();
    fetch('/api/workspace').then((res) => res.ok ? res.json() : null).then((workspace) => {
      if (workspace?.organization?.currency) setCurrencyState(workspace.organization.currency);
    }).catch(() => undefined);

    async function fetchTeam() {
      try {
        const res = await fetch('/api/data?domain=team');
        if (res.ok) {
          const data = await res.json();
          setTeamMembers(data);
        }
      } catch (e) {
        console.error('Error fetching team:', e);
      }
    }
    fetchTeam();

    async function fetchClosedLeads() {
      try {
        const res = await fetch('/api/agency-leads');
        if (!res.ok) return;
        const data = await res.json();
        setClosedLeadOptions((data.leads || []).filter((lead: ClosedLeadOption) =>
          lead.status?.toLowerCase() === 'closed' && !lead.convertedClient
        ));
      } catch (e) {
        console.error('Error fetching closed leads:', e);
      }
    }
    fetchClosedLeads();
  }, []);

  const recalculateStages = (stagesList: any[], startDateStr: string, endDateStr: string) => {
    const start = startDateStr ? new Date(startDateStr) : new Date();
    const end = endDateStr ? new Date(endDateStr) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
    const totalMs = end.getTime() - start.getTime();
    const msPerStage = totalMs / Math.max(stagesList.length, 1);

    return stagesList.map((stage, i) => {
      const sStart = new Date(start.getTime() + i * msPerStage);
      const sEnd = new Date(start.getTime() + (i + 1) * msPerStage);
      return {
        ...stage,
        startDate: sStart.toISOString().split('T')[0],
        endDate: sEnd.toISOString().split('T')[0]
      };
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const nextData = { ...prev, [name]: value };
      if (name === 'projectStartDate' || name === 'projectDeadline') {
        const start = name === 'projectStartDate' ? value : prev.projectStartDate;
        const end = name === 'projectDeadline' ? value : prev.projectDeadline;
        nextData.projectStages = recalculateStages(prev.projectStages, start, end);
      }
      return nextData;
    });
    setFormError('');
  };

  const handleClosedLeadSelection = (leadId: string) => {
    const lead = closedLeadOptions.find((option) => option.id === leadId);
    setFormData((prev) => ({
      ...prev,
      sourceLeadId: leadId,
      clientName: lead?.fullName || '',
      clientEmail: lead?.email || '',
      clientPhone: lead?.phone || '',
    }));
    setFormError('');
  };

  const handleProjectStepDecision = (createProject: boolean) => {
    if (createProject && !formData.projectName.trim()) {
      setFormError(formatUserMessage('Project Name is required to create an initial project.'));
      return;
    }
    if (createProject && (!formData.projectPaymentAmount || Number(formData.projectPaymentAmount) <= 0)) {
      setFormError(formatUserMessage('Enter a positive payment amount for the initial project.'));
      return;
    }
    if (createProject && !formData.projectPaymentStartDate) {
      setFormError(formatUserMessage('Select the project payment start date.'));
      return;
    }

    setFormData((prev) => ({ ...prev, createProject }));
    setStep(5);
    setFormError('');
  };

  const handleNextStep = () => {
    if (step === 1 && !formData.name) {
      setFormError(formatUserMessage('Lohith, Client Company Name is required to proceed.'));
      return;
    }
    if (step === 2 && (!formData.clientName || !formData.clientEmail)) {
      setFormError(formatUserMessage('Client Name and Client Email are required.'));
      return;
    }
    if (step === 3) {
      const start = new Date();
      const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
      const defaultStartStr = start.toISOString().split('T')[0];
      const defaultEndStr = end.toISOString().split('T')[0];

      // Auto-initialize project defaults when proceeding to project setup step
      setFormData(prev => {
        const projStart = prev.projectStartDate || defaultStartStr;
        const projEnd = prev.projectDeadline || defaultEndStr;
        const baseStages = prev.projectStages.map(s => s.name);
        
        // Recalculate stage timelines
        const totalMs = new Date(projEnd).getTime() - new Date(projStart).getTime();
        const msPerStage = totalMs / Math.max(baseStages.length, 1);
        const updatedStages = baseStages.map((name, i) => {
          const sStart = new Date(new Date(projStart).getTime() + i * msPerStage);
          const sEnd = new Date(new Date(projStart).getTime() + (i + 1) * msPerStage);
          return {
            name,
            startDate: sStart.toISOString().split('T')[0],
            endDate: sEnd.toISOString().split('T')[0]
          };
        });

        return {
          ...prev,
          projectStartDate: projStart,
          projectDeadline: projEnd,
          projectName: prev.projectName || `${prev.name} Initial Campaign`,
          projectStages: updatedStages
        };
      });
    }
    if (step === 4) {
      handleProjectStepDecision(formData.createProject);
      return;
    }
    setStep((prev) => Math.min(prev + 1, 5));
    setFormError('');
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1));
    setFormError('');
  };

  const handleFormSubmit = async () => {
    setSubmitStatus('submitting');
    setFormError('');

    try {
      const payload = {
        name: formData.name,
        legalEntityName: formData.legalEntityName,
        billingAddressLine1: formData.billingAddressLine1,
        billingAddressLine2: formData.billingAddressLine2,
        billingCity: formData.billingCity,
        billingState: formData.billingState,
        billingPostalCode: formData.billingPostalCode,
        billingCountry: formData.billingCountry,
        gstNumber: formData.gstNumber,
        domain: null,
        status: 'ACTIVE',
        healthScore: 100,
        healthStatus: 'EXCELLENT',
        churnRiskScore: 0,
        roiMetric: 0.0,
        upsellOpportunityValue: 0.0,
        sourceLeadId: formData.sourceLeadId || null,
        adAccountId: formData.adAccountId || null,
        contact: {
          name: formData.clientName,
          email: formData.clientEmail,
          phone: formData.clientPhone,
          role: formData.clientDesignation || 'Primary Client Contact',
        },
        metadata: {
          legalEntityName: formData.legalEntityName,
          description: formData.description,
        },
        initialProject: formData.createProject ? {
          name: formData.projectName,
          serviceLine: formData.projectServiceLine,
          budget: formData.projectBudget,
          paymentType: formData.projectPaymentType,
          paymentAmount: formData.projectPaymentAmount,
          paymentFrequency: formData.projectPaymentType === 'RETAINER' ? formData.projectPaymentFrequency : null,
          paymentStartDate: formData.projectPaymentStartDate,
          paymentTerms: formData.projectPaymentTerms,
          autoGenerateInvoice: formData.projectAutoGenerateInvoice,
          timeline: formData.projectTimeline,
          startDate: formData.projectStartDate,
          endDate: formData.projectDeadline || null,
          memberIds: formData.projectMemberIds,
          deliverables: formData.projectDeliverables
            ? formData.projectDeliverables.split(',').map((deliverable: string) => deliverable.trim()).filter(Boolean)
            : [],
          stages: formData.projectStages,
        } : null,
      };

      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setInviteUrl(data.inviteUrl || '');
        setInviteEmailSent(Boolean(data.emailSent));
        setSubmitStatus('success');
      } else {
        const errData = await res.json();
        if (errData.clientCreated && errData.inviteUrl) {
          setInviteUrl(errData.inviteUrl);
          setInviteEmailSent(false);
          setFormError(formatUserMessage(`Client created, but the invitation email was not delivered: ${errData.error || 'Email provider error'}`));
          setSubmitStatus('success');
          return;
        }
        setFormError(formatUserMessage(`Lohith, client creation failed: ${errData.error || 'Server error'}`));
        setSubmitStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSubmitStatus('error');
      setFormError('Connection error mapping onboarding payload.');
    }
  };

  // Dynamic Service specific fields rendering
  const renderServiceSpecificFields = () => {
    switch (formData.agencyType) {
      case 'Digital Marketing Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Digital Marketing Performance Specs</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Current Monthly Marketing Budget ({getCurrencySymbol(currencyState)})</label>
                <input
                  type="text"
                  name="metaCurrentSpend"
                  placeholder="e.g. 5000"
                  value={formData.metaCurrentSpend}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Customer Acquisition Cost Target ({getCurrencySymbol(currencyState)})</label>
                <input
                  type="text"
                  name="metaCac"
                  placeholder="e.g. 45"
                  value={formData.metaCac}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-400 block">Historical Campaign Performance Notes</label>
              <textarea
                name="metaPerformanceHistory"
                rows={3}
                placeholder="Describe previous marketing activities and historical lead conversions..."
                value={formData.metaPerformanceHistory}
                onChange={handleInputChange}
                className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white text-xs focus:border-zinc-750 focus:outline-none"
              />
            </div>
          </div>
        );

      case 'Social Media Management Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Social Strategy Requirements</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Active Social Platforms</label>
                <input
                  type="text"
                  name="metaActivePlatforms"
                  placeholder="e.g. LinkedIn, Instagram, X"
                  value={formData.metaActivePlatforms}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Posting Frequency Preference</label>
                <input
                  type="text"
                  name="metaPostingFrequency"
                  placeholder="e.g. 3 times per week per platform"
                  value={formData.metaPostingFrequency}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-400 block">Brand Voice Guideline Notes</label>
              <textarea
                name="metaBrandVoice"
                rows={3}
                placeholder="e.g. Professional yet witty, avoid jargon, use active sentence structures..."
                value={formData.metaBrandVoice}
                onChange={handleInputChange}
                className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white text-xs focus:border-zinc-750 focus:outline-none"
              />
            </div>
          </div>
        );

      case 'SEO Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Technical SEO Baseline Parameters</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Current Organic Traffic (Monthly)</label>
                <input
                  type="text"
                  name="metaOrganicTraffic"
                  placeholder="e.g. 12,000 users/mo"
                  value={formData.metaOrganicTraffic}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">CMS Platform & hosting</label>
                <input
                  type="text"
                  name="metaCmsPlatform"
                  placeholder="e.g. WordPress on Kinsta, Webflow"
                  value={formData.metaCmsPlatform}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-400 block">Primary Target Keywords</label>
              <input
                type="text"
                name="metaTargetKeywords"
                placeholder="e.g. enterprise CRM integration, operational analytics SaaS"
                value={formData.metaTargetKeywords}
                onChange={handleInputChange}
                className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
              />
            </div>
          </div>
        );

      case 'Paid Advertising Agency (PPC)':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Paid Advertising (PPC) Campaign Specifications</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Target Ad Accounts for Sync</label>
                <input
                  type="text"
                  name="metaAdAccounts"
                  placeholder="e.g. Google Ads, Meta Business Manager"
                  value={formData.metaAdAccounts}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Target ROAS (Multiplier)</label>
                <input
                  type="text"
                  name="metaTargetRoas"
                  placeholder="e.g. 3.5x ROAS"
                  value={formData.metaTargetRoas}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      case 'Brand Strategy & Positioning Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Strategic Branding Foundations</h3>
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-400 block">Current Market Positioning Challenges</label>
              <textarea
                name="metaCurrentPositioning"
                rows={2}
                placeholder="Describe current brand positioning hurdles and competitor saturation..."
                value={formData.metaCurrentPositioning}
                onChange={handleInputChange}
                className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white text-xs focus:border-zinc-750 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-400 block">Long-Term Corporate Vision (3-5 Years)</label>
              <textarea
                name="metaLongTermVision"
                rows={2}
                placeholder="Detail expansion plans, product launch visions, and authority objectives..."
                value={formData.metaLongTermVision}
                onChange={handleInputChange}
                className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white text-xs focus:border-zinc-750 focus:outline-none"
              />
            </div>
          </div>
        );

      case 'Graphic Design Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Creative Design Guidelines</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Required Asset Dimensions & Formats</label>
                <input
                  type="text"
                  name="metaDimensionsFormats"
                  placeholder="e.g. 1200x630 PNG, SVG vector exports"
                  value={formData.metaDimensionsFormats}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Visual Assets Constraints</label>
                <input
                  type="text"
                  name="metaVisualConstraints"
                  placeholder="e.g. Must align to dark theme, strict typography guidelines"
                  value={formData.metaVisualConstraints}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      case 'Brand Identity & Logo Design Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Brand Identity Parameters</h3>
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-400 block">Typography & Color Palette Preferences</label>
              <input
                type="text"
                name="metaTypographyColor"
                placeholder="e.g. Minimalist sans-serif, monochrome primary with emerald highlights"
                value={formData.metaTypographyColor}
                onChange={handleInputChange}
                className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-zinc-400 block">Founder & Company Origin Story</label>
              <textarea
                name="metaFounderStory"
                rows={3}
                placeholder="Share the story, values, and core principles that shape the brand kit..."
                value={formData.metaFounderStory}
                onChange={handleInputChange}
                className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white text-xs focus:border-zinc-750 focus:outline-none"
              />
            </div>
          </div>
        );

      case 'Content Marketing Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Content Strategy Requirements</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Subject Matter Experts (SMEs) Available</label>
                <input
                  type="text"
                  name="metaSmeAvailability"
                  placeholder="e.g. Tech founder available for 1hr interviews weekly"
                  value={formData.metaSmeAvailability}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Primary Content Funnel Objectives</label>
                <input
                  type="text"
                  name="metaContentObjectives"
                  placeholder="e.g. Informative blog posts, downloadable whitepapers"
                  value={formData.metaContentObjectives}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      case 'Video Production & Photography Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Video Production Logistics</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Shoot Locations & Dates Availability</label>
                <input
                  type="text"
                  name="metaShootLogistics"
                  placeholder="e.g. Headquarters office in Austin, Mid-July 2026"
                  value={formData.metaShootLogistics}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Editing Style & Reference Videos</label>
                <input
                  type="text"
                  name="metaEditingMood"
                  placeholder="e.g. Modern dynamic transitions, cinematic tech look"
                  value={formData.metaEditingMood}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      case 'Web Design & Development Agency':
        return (
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider border-b border-zinc-900 pb-2">Website Architecture & Tech Spec</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Development Page Scope</label>
                <input
                  type="text"
                  name="metaDevScope"
                  placeholder="e.g. Homepage, features, pricing, contacts (4 total)"
                  value={formData.metaDevScope}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-zinc-400 block">Tech Stack / CMS Preference</label>
                <input
                  type="text"
                  name="metaTechStack"
                  placeholder="e.g. Next.js, Vercel, TailwindCSS, Prisma"
                  value={formData.metaTechStack}
                  onChange={handleInputChange}
                  className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white text-xs focus:border-zinc-750 focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-zinc-500 text-xs flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-zinc-400" />
          <span>Authenticating executive clearance level...</span>
        </div>
      </div>
    );
  }

  // Admin Verification Denied Screen
  if (false && userRole !== 'ADMIN') {
    return (
      <div className="flex h-[75vh] flex-col items-center justify-center font-sans text-xs">
        <Card className="w-full max-w-md bg-[#0d0e12] border-rose-950/20 p-2 shadow-2xl relative overflow-hidden">
          {/* Glowing Red border highlight */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-rose-700 to-rose-500" />

          <CardHeader className="text-center pt-8 pb-6 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded bg-rose-950/30 border border-rose-900/30 text-rose-400 shadow-lg animate-pulse">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white tracking-tight">Access Denied</CardTitle>
              <CardDescription className="text-[11px] text-zinc-500 mt-1">
                Administrative clearance required.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-8 space-y-6 text-center">
            <p className="text-zinc-400 leading-relaxed text-xs">
              Client onboarding and portfolio creations are restricted to workspace **Administrators** to enforce billing governance rules.
            </p>

            <div className="pt-4 flex justify-center">
              <Button
                variant="outline"
                className="h-9 border-zinc-800 text-zinc-300 font-semibold"
                onClick={() => router.push('/clients')}
              >
                Return to Portfolio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin Onboarding View
  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans text-xs">
      {/* Top Breadcrumb and Profile Role Switcher (Hidden in prod but useful in demo) */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/clients')}
            className="h-8 w-8 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white silver-text-gradient">Client Onboarding Portal</h1>
            <p className="text-[10px] text-zinc-500 mt-0.5">Administrator Terminal | Step {step} of 5</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Sidebar Steps tracker */}
        <div className="md:col-span-1 space-y-1.5">
          {[
            { s: 1, name: 'Company Profile', desc: 'Universal business details' },
            { s: 2, name: 'Client Contact', desc: 'Primary client details' },
            { s: 3, name: 'Client Connections', desc: 'Client-owned account access' },
            { s: 4, name: 'Project Setup', desc: 'Commercials, service, and delivery' },
            { s: 5, name: 'Review & Verify', desc: 'Complete onboarding' },
          ].map((item) => (
            <div
              key={item.s}
              className={`p-3 rounded border text-left transition-all ${
                step === item.s
                  ? 'border-white bg-zinc-900/40 text-white'
                  : step > item.s
                  ? 'border-zinc-850 bg-zinc-950/20 text-zinc-400'
                  : 'border-transparent text-zinc-600'
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[9px] border font-mono ${
                  step === item.s
                    ? 'bg-white text-zinc-950 border-white'
                    : step > item.s
                    ? 'bg-zinc-900 text-zinc-300 border-zinc-800'
                    : 'border-zinc-900 text-zinc-650'
                }`}>
                  {item.s}
                </span>
                <span>{item.name}</span>
              </div>
              <span className="block text-[9px] text-zinc-500 mt-1 leading-normal pl-6.5">{item.desc}</span>
            </div>
          ))}
        </div>

        {/* Wizard Panel Content */}
        <div className="md:col-span-3">
          <Card
            className="relative min-h-[400px] overflow-hidden border-zinc-850/80 flex flex-col justify-between"
            aria-busy={submitStatus === 'submitting'}
          >
            <CardContent className="p-6">
              {formError && (
                <div className="flex gap-2.5 rounded border border-rose-900/30 bg-rose-950/10 p-3.5 text-rose-400 mb-6 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Step 1: Universal details */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <Building className="h-4 w-4 text-zinc-400" />
                    <h2 className="text-sm font-semibold text-white">Universal Client Information - Company details</h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Company Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g. Aether Technologies"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Legal Entity Name</label>
                      <input
                        type="text"
                        name="legalEntityName"
                        placeholder="e.g. Aether Technologies, Inc."
                        value={formData.legalEntityName}
                        onChange={handleInputChange}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded border border-zinc-850 bg-zinc-950/30 p-4 space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-white">Client billing profile</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-zinc-500">
                        Optional during onboarding. Address fields are required before an invoice can be generated for this client; GSTIN remains optional.
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="font-semibold text-zinc-400 block">Address Line 1</label>
                        <input type="text" name="billingAddressLine1" value={formData.billingAddressLine1} onChange={handleInputChange} placeholder="Street address" className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="font-semibold text-zinc-400 block">Address Line 2</label>
                        <input type="text" name="billingAddressLine2" value={formData.billingAddressLine2} onChange={handleInputChange} placeholder="Suite, floor, locality (optional)" className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">City</label>
                        <input type="text" name="billingCity" value={formData.billingCity} onChange={handleInputChange} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">State / Region</label>
                        <input type="text" name="billingState" value={formData.billingState} onChange={handleInputChange} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">Postal Code</label>
                        <input type="text" name="billingPostalCode" value={formData.billingPostalCode} onChange={handleInputChange} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">Country</label>
                        <input type="text" name="billingCountry" value={formData.billingCountry} onChange={handleInputChange} className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="font-semibold text-zinc-400 block">GST Number <span className="font-normal text-zinc-600">(optional)</span></label>
                        <input type="text" name="gstNumber" value={formData.gstNumber} onChange={handleInputChange} placeholder="GSTIN" className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 font-mono uppercase text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">Business Description</label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Briefly describe what this business provides and how they generate revenue..."
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Primary contacts */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <User className="h-4 w-4 text-zinc-400" />
                    <h2 className="text-sm font-semibold text-white">Client Information</h2>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block">Import from Closed Lead</label>
                    <select
                      value={formData.sourceLeadId}
                      onChange={(event) => handleClosedLeadSelection(event.target.value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none"
                    >
                      <option value="">Enter contact details manually</option>
                      {closedLeadOptions.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.fullName} — {lead.email}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-zinc-600">
                      Selecting a closed lead imports its name, email, and phone and attributes the new client to that conversion.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Client Name *</label>
                      <input
                        type="text"
                        name="clientName"
                        placeholder="e.g. John Doe"
                        value={formData.clientName}
                        onChange={handleInputChange}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Client Role</label>
                      <input
                        type="text"
                        name="clientDesignation"
                        placeholder="e.g. Head of Marketing, VP Product"
                        value={formData.clientDesignation}
                        onChange={handleInputChange}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Client Email *</label>
                      <input
                        type="email"
                        name="clientEmail"
                        placeholder="e.g. contact@domain.com"
                        value={formData.clientEmail}
                        onChange={handleInputChange}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block">Client Phone</label>
                      <input
                        type="tel"
                        name="clientPhone"
                        placeholder="e.g. +1-555-019-9234"
                        value={formData.clientPhone}
                        onChange={handleInputChange}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Client-level connections */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <LayersIcon className="h-4 w-4 text-zinc-400" />
                    <h2 className="text-sm font-semibold text-white">Client Connections</h2>
                  </div>

                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    Commercial terms now belong to each project, so the same client can have different retainers or one-time engagements.
                  </p>

                  <div className="max-w-xl">
                    <div className="space-y-1.5">
                      <label htmlFor="onboarding-meta-ad-account" className="font-semibold text-zinc-400 block">
                        Associated Meta Ad Account
                      </label>
                      <MetaAdAccountSelect
                        id="onboarding-meta-ad-account"
                        value={formData.adAccountId}
                        onChange={(adAccountId) => {
                          setFormData((current) => ({ ...current, adAccountId }));
                          setFormError('');
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Initial Project Setup */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <Wallet className="h-4 w-4 text-zinc-400" />
                    <h2 className="text-sm font-semibold text-white">Create Initial Project & Commercials</h2>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-zinc-900/60 animate-fadeIn">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Project Name *</label>
                          <input
                            type="text"
                            name="projectName"
                            placeholder="e.g. Aether Summer Campaign"
                            value={formData.projectName}
                            onChange={handleInputChange}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Service Focus Line</label>
                          <select
                            name="projectServiceLine"
                            value={formData.projectServiceLine}
                            onChange={handleInputChange}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none"
                          >
                            <option value="Paid Ads & CRO">Paid Ads & CRO</option>
                            <option value="Search Engine Optimization">Search Engine Optimization</option>
                            <option value="Web Development & Shopify">Web Development & Shopify</option>
                            <option value="Social Media (SMM)">Social Media (SMM)</option>
                            <option value="Brand Rebuilding">Brand Rebuilding</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-3 border-y border-zinc-900/60 py-4">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Project Commercials</span>
                          <span className="text-[10px] text-zinc-600">These terms apply only to this project.</span>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                          <div className="space-y-1.5">
                            <label className="font-semibold text-zinc-400 block">Payment Type *</label>
                            <select
                              name="projectPaymentType"
                              value={formData.projectPaymentType}
                              onChange={handleInputChange}
                              className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none"
                            >
                              <option value="RETAINER">Retainer</option>
                              <option value="ONE_TIME">One-time payment</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-semibold text-zinc-400 block">Client Payment ({getCurrencySymbol(currencyState)}) *</label>
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              name="projectPaymentAmount"
                              placeholder="e.g. 5000"
                              value={formData.projectPaymentAmount}
                              onChange={handleInputChange}
                              className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-semibold text-zinc-400 block">Payment Frequency</label>
                            <select
                              name="projectPaymentFrequency"
                              value={formData.projectPaymentFrequency}
                              onChange={handleInputChange}
                              disabled={formData.projectPaymentType === 'ONE_TIME'}
                              className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                            >
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-semibold text-zinc-400 block">
                              {formData.projectPaymentType === 'ONE_TIME' ? 'Payment Date *' : 'Retainer Start Date *'}
                            </label>
                            <input
                              type="date"
                              name="projectPaymentStartDate"
                              value={formData.projectPaymentStartDate}
                              onChange={handleInputChange}
                              className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="font-semibold text-zinc-400 block">Payment Terms</label>
                            <select
                              name="projectPaymentTerms"
                              value={formData.projectPaymentTerms}
                              onChange={handleInputChange}
                              className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none"
                            >
                              <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                              <option value="NET_15">Net 15 Days</option>
                              <option value="NET_30">Net 30 Days</option>
                              <option value="NET_45">Net 45 Days</option>
                              <option value="NET_60">Net 60 Days</option>
                            </select>
                          </div>
                        </div>
                        <label className="flex cursor-pointer items-start gap-3 rounded border border-zinc-850 bg-zinc-950/45 p-3">
                          <input
                            type="checkbox"
                            checked={formData.projectAutoGenerateInvoice}
                            onChange={(event) => setFormData((current) => ({
                              ...current,
                              projectAutoGenerateInvoice: event.target.checked,
                            }))}
                            className="mt-0.5 h-3.5 w-3.5 accent-white"
                          />
                          <span>
                            <span className="block text-[11px] font-semibold text-white">Generate and email the first invoice when this project is initialized</span>
                            <span className="mt-1 block text-[10px] leading-relaxed text-zinc-500">
                              Requires completed agency and client billing addresses. The finalized PDF will be attached and linked in the client email.
                            </span>
                          </span>
                        </label>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-4">
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Internal Delivery Budget ({getCurrencySymbol(currencyState)})</label>
                          <input
                            type="number"
                            name="projectBudget"
                            placeholder="e.g. 15000"
                            value={formData.projectBudget}
                            onChange={handleInputChange}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Project Timeline Range</label>
                          <input
                            type="text"
                            name="projectTimeline"
                            placeholder="e.g. 3 Months, Jul - Sep"
                            value={formData.projectTimeline}
                            onChange={handleInputChange}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white placeholder-zinc-650 focus:border-zinc-750 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Start Date</label>
                          <input
                            type="date"
                            name="projectStartDate"
                            value={formData.projectStartDate}
                            onChange={handleInputChange}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="font-semibold text-zinc-400 block">Target Deadline Date</label>
                          <input
                            type="date"
                            name="projectDeadline"
                            value={formData.projectDeadline}
                            onChange={handleInputChange}
                            className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2 text-white focus:border-zinc-750 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Project Stages Section */}
                      <div className="space-y-3 pt-3 border-t border-zinc-900/60">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-zinc-350 text-xs">Project Development Stages (Max 8)</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => {
                                  if (prev.projectStages.length >= 8) return prev;
                                  const newStages = [...prev.projectStages, { name: `Phase ${prev.projectStages.length + 1}`, startDate: '', endDate: '' }];
                                  return {
                                    ...prev,
                                    projectStages: recalculateStages(newStages, prev.projectStartDate, prev.projectDeadline)
                                  };
                                });
                              }}
                              disabled={formData.projectStages.length >= 8}
                              className="h-6 px-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-[10px] font-semibold flex items-center gap-1"
                            >
                              <span>+ Add Stage</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  projectStages: recalculateStages(prev.projectStages, prev.projectStartDate, prev.projectDeadline)
                                }));
                              }}
                              className="h-6 px-2 border border-zinc-850 hover:bg-zinc-900 text-zinc-450 hover:text-white text-[10px] font-semibold"
                            >
                              Distribute Equally
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                          {formData.projectStages.map((stage, idx) => (
                            <div key={idx} className="flex gap-2 items-center bg-zinc-950/20 p-2 border border-zinc-900/50">
                              <span className="font-mono text-zinc-500 text-[10px] w-5 text-center">{idx + 1}</span>
                              <input
                                type="text"
                                placeholder="Stage Name"
                                value={stage.name}
                                onChange={(e) => {
                                  const nameVal = e.target.value;
                                  setFormData((prev) => {
                                    const nextStages = prev.projectStages.map((s, sIdx) => 
                                      sIdx === idx ? { ...s, name: nameVal } : s
                                    );
                                    return { ...prev, projectStages: nextStages };
                                  });
                                }}
                                className="flex-1 text-[11px] bg-zinc-900 border border-zinc-850 px-2 py-1 text-white outline-none focus:border-zinc-750"
                              />
                              <div className="flex items-center gap-1.5 text-[10px] text-zinc-550 shrink-0">
                                <input
                                  type="date"
                                  value={stage.startDate}
                                  onChange={(e) => {
                                    const dateVal = e.target.value;
                                    setFormData((prev) => {
                                      const nextStages = prev.projectStages.map((s, sIdx) => 
                                        sIdx === idx ? { ...s, startDate: dateVal } : s
                                      );
                                      return { ...prev, projectStages: nextStages };
                                    });
                                  }}
                                  className="w-26 text-[10px] bg-zinc-900 border border-zinc-850 px-1 py-0.5 text-zinc-300 font-mono outline-none"
                                />
                                <span>to</span>
                                <input
                                  type="date"
                                  value={stage.endDate}
                                  onChange={(e) => {
                                    const dateVal = e.target.value;
                                    setFormData((prev) => {
                                      const nextStages = prev.projectStages.map((s, sIdx) => 
                                        sIdx === idx ? { ...s, endDate: dateVal } : s
                                      );
                                      return { ...prev, projectStages: nextStages };
                                    });
                                  }}
                                  className="w-26 text-[10px] bg-zinc-900 border border-zinc-850 px-1 py-0.5 text-zinc-300 font-mono outline-none"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData((prev) => {
                                    if (prev.projectStages.length <= 1) return prev;
                                    const newStages = prev.projectStages.filter((_, sIdx) => sIdx !== idx);
                                    return {
                                      ...prev,
                                      projectStages: recalculateStages(newStages, prev.projectStartDate, prev.projectDeadline)
                                    };
                                  });
                                }}
                                disabled={formData.projectStages.length <= 1}
                                className="text-zinc-500 hover:text-rose-455 disabled:opacity-30 p-1"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-zinc-400 block">Initial Deliverables Checklist (Comma-separated)</label>
                        <textarea
                          name="projectDeliverables"
                          rows={2}
                          placeholder="e.g. Design creatives, Launch campaign, A/B testing"
                          value={formData.projectDeliverables}
                          onChange={handleInputChange}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/40 p-2.5 text-white placeholder-zinc-600 focus:border-zinc-750 focus:outline-none"
                        />
                      </div>

                      {/* Members Multi-select Grid */}
                      <div className="space-y-2 pt-2">
                        <span className="font-semibold text-zinc-400 block">Allocate Team Specialists to Project</span>
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          {teamMembers
                            .filter((t: any) => t.role?.toLowerCase() !== 'client')
                            .map((member: any) => {
                              const isAllocated = formData.projectMemberIds.includes(member.id);
                              return (
                                <button
                                  type="button"
                                  key={member.id}
                                  onClick={() => {
                                    setFormData(prev => {
                                      const ids = prev.projectMemberIds;
                                      const newIds = ids.includes(member.id) 
                                        ? ids.filter(id => id !== member.id) 
                                        : [...ids, member.id];
                                      return { ...prev, projectMemberIds: newIds };
                                    });
                                  }}
                                  className={`p-2.5 text-left border relative transition-all ${
                                    isAllocated
                                      ? 'border-white bg-zinc-900/40 text-white'
                                      : 'border-zinc-850 hover:border-zinc-750 bg-zinc-950/25 text-zinc-400'
                                  }`}
                                >
                                  {isAllocated && (
                                    <div className="absolute top-2 right-2 h-3.5 w-3.5 rounded-full bg-white flex items-center justify-center">
                                      <div className="h-2 w-2 rounded-full bg-zinc-950" />
                                    </div>
                                  )}
                                  <span className="block font-semibold text-xs text-white">{member.name}</span>
                                  <span className="block text-[9px] text-zinc-550 mt-0.5">{member.role}</span>
                                </button>
                              );
                            })}
                        </div>
                      </div>
                  </div>
                </div>
              )}

              {/* Step 5: Review & finalize */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                    <CheckCircle className="h-4 w-4 text-zinc-400" />
                    <h2 className="text-sm font-semibold text-white">Review Client Registration Details</h2>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 text-[11px] font-sans">
                    <div className="rounded border border-zinc-900 p-3 space-y-2 bg-zinc-950/20">
                      <span className="block font-bold text-zinc-500 uppercase tracking-wider text-[9px]">Universal Business Profile</span>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Client Name:</span>
                        <span className="font-semibold text-white">{formData.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Legal Entity:</span>
                        <span className="font-mono text-zinc-300">{formData.legalEntityName || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="rounded border border-zinc-900 p-3 space-y-2 bg-zinc-950/20">
                      <span className="block font-bold text-zinc-500 uppercase tracking-wider text-[9px]">Client Summary</span>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Client Name:</span>
                        <span className="font-semibold text-white">{formData.clientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Client Role:</span>
                        <span className="text-zinc-300">{formData.clientDesignation || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Client Email:</span>
                        <span className="text-zinc-300">{formData.clientEmail}</span>
                      </div>
                    </div>
                  </div>

                  {formData.createProject && (
                    <div className="rounded border border-zinc-900 p-3 space-y-2 bg-zinc-950/20 text-[11px]">
                      <span className="block font-bold text-zinc-500 uppercase tracking-wider text-[9px]">Initial Project, Commercials & Development Stages</span>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Project Name:</span>
                        <span className="font-semibold text-white">{formData.projectName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Service Focus:</span>
                        <span className="text-zinc-300">{formData.projectServiceLine}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Payment Type:</span>
                        <span className="font-semibold text-white">
                          {formData.projectPaymentType === 'ONE_TIME' ? 'One-time payment' : `Retainer · ${formData.projectPaymentFrequency}`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Client Payment:</span>
                        <span className="font-bold text-white font-mono">
                          {formatCurrency(Number(formData.projectPaymentAmount || 0), 2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Payment Starts:</span>
                        <span className="text-zinc-300 font-mono">{formData.projectPaymentStartDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Terms:</span>
                        <span className="text-zinc-300">{formData.projectPaymentTerms.replaceAll('_', ' ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Timeline / Internal Budget:</span>
                        <span className="text-zinc-300 font-mono">{formData.projectTimeline} ({formatCurrency(parseFloat(formData.projectBudget || '0'), 2)})</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-zinc-900/65 space-y-1">
                        <span className="block text-[8px] text-zinc-500 uppercase font-bold">Planned Development Stages:</span>
                        {formData.projectStages.map((stage, idx) => (
                          <div key={idx} className="flex justify-between text-[10px]">
                            <span className="text-zinc-300">{idx + 1}. {stage.name}</span>
                            <span className="text-zinc-500 font-mono">{stage.startDate} to {stage.endDate}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {submitStatus === 'success' && (
                    <div className="space-y-4 mt-6">
                      <div className="flex gap-2.5 rounded border border-emerald-900/30 bg-emerald-950/10 p-3.5 text-emerald-400 font-semibold items-center justify-center">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span>
                          {inviteEmailSent
                            ? 'Client onboarding complete. The invitation email was sent.'
                            : 'Client onboarding complete. The secure invite link is available below.'}
                        </span>
                      </div>
                      
                      {inviteUrl && (
                        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                          <span className="block font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Client Invite Link</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={inviteUrl.startsWith('http') ? inviteUrl : `${window.location.origin}${inviteUrl}`}
                              className="flex-1 rounded border border-zinc-800 bg-zinc-950 p-2 text-[10px] text-zinc-300 font-mono focus:outline-none"
                            />
                            <Button
                              onClick={() => {
                                navigator.clipboard.writeText(inviteUrl.startsWith('http') ? inviteUrl : `${window.location.origin}${inviteUrl}`);
                                alert('Invite link copied to clipboard!');
                              }}
                              className="h-8 bg-zinc-100 text-zinc-950 hover:bg-white text-[10px]"
                            >
                              Copy Link
                            </Button>
                          </div>
                          <span className="block text-[9px] text-zinc-500">
                            {inviteEmailSent
                              ? `An Iris OS invitation was sent from noreply@irisos.app to ${formData.clientEmail}.`
                              : 'Copy this link to deliver it manually after resolving the email provider issue.'}
                          </span>
                        </div>
                      )}

                      <div className="pt-2">
                        <Button
                          onClick={() => router.push('/clients')}
                          className="w-full h-9 bg-zinc-100 text-zinc-950 hover:bg-white font-semibold"
                        >
                          Return to Client Portfolio
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>

            {/* Wizard Controls Footer */}
            {submitStatus !== 'success' && (
              <div className="border-t border-zinc-900 p-4 bg-zinc-950/40 flex justify-between gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={step === 1 || submitStatus === 'submitting'}
                  onClick={handlePrevStep}
                  className="h-9 border-zinc-800 text-zinc-300 font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
 
                {step === 4 ? (
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleProjectStepDecision(false)}
                      className="h-9 px-3 text-xs font-semibold text-zinc-400 hover:text-white"
                    >
                      Skip project creation
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleProjectStepDecision(true)}
                      className="h-9 font-semibold text-xs bg-white text-zinc-950 hover:bg-zinc-200"
                    >
                      <span>Create project & continue</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : step < 5 ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="h-9 font-semibold text-xs flex items-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={submitStatus === 'submitting'}
                    onClick={handleFormSubmit}
                    className="h-9 font-semibold text-xs flex items-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-200"
                >
                    {submitStatus === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>{submitStatus === 'submitting' ? 'Onboarding Client...' : 'Onboard Client'}</span>
                  </Button>
                )}
              </div>
            )}

            {submitStatus === 'submitting' && (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 p-6 backdrop-blur-sm"
                role="status"
                aria-live="assertive"
              >
                <div className="w-full max-w-sm rounded-2xl border border-zinc-700/80 bg-zinc-900/90 p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 text-zinc-100 shadow-inner">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-white">Creating client workspace</h2>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">
                    Saving the company profile, client contact, and project-level commercial terms. This can take a moment.
                  </p>
                  <div className="mt-5 h-1 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-zinc-300" />
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
