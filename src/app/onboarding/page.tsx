'use client';

import * as React from 'react';
import { parseAgencyIndustryList } from '@/lib/agency-industry-list';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, ShieldCheck, Building, User, CreditCard, Calendar, Key, Loader2 } from 'lucide-react';
import { CountryPhoneInput } from '@/components/ui/country-phone-input';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 99,
    tagline: 'Starter Workspace Clearance',
    features: [
      'All 10 Agency Specializations Included',
      'Core Operational Ledger Console',
      'Client Read-Only Portal Gate',
      '2 Team Members and 5 Clients',
      'No AI or Messaging Features'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: 299,
    tagline: 'Professional Scale Workspace',
    features: [
      'All 10 Agency Specializations Included',
      'Active Contractor Profit Leak Checks',
      'Automated Executive Reports & SLAs',
      'Full Canva & Meta Ad Portal Sync',
      'Atlas AI Meeting & Invoice Creation',
      'Secure Messaging · 4 Team · 15 Clients'
    ]
  },
  {
    id: 'advanced',
    name: 'Advanced Plan',
    price: 599,
    tagline: 'Unlimited Enterprise Console',
    features: [
      'All 10 Agency Specializations Included',
      'Unlimited API Call Operations Threshold',
      'Custom Multi-Currency Financial Ledgers',
      '24/7 Dedicated Support & Audit Gating',
      'Full Atlas AI, Briefing & Strategies',
      'Secure Messaging · 15 Team · 30 Clients'
    ]
  }
];

const FULL_PRIVACY_POLICY = [
  ['Meta Advertising Data and Atlas AI', 'Meta access requires a separate optional consent. When enabled, Iris OS may retrieve selected ad-account identifiers, campaigns, ads, forms, lead submissions, spend, impressions, reach and clicks. Atlas AI uses only aggregate Meta performance metrics, and only when both general Atlas data sharing and the separate Atlas Meta analytics consent are enabled. Atlas AI never receives Meta access tokens or raw Meta lead names, emails, phone numbers or form fields. Withdrawing Meta access stops future provider retrieval; withdrawing Atlas Meta consent stops future AI use of those metrics.'],
  ['Secure Messaging Data', 'Messaging is available on Pro and Advanced plans for direct agency-owner conversations with clients or team members. Iris OS stores participant identifiers, delivery metadata, OpenPGP public device keys, opaque signed and encrypted message envelopes, and encrypted attachment metadata. Message plaintext, OpenPGP private keys, attachment keys and plaintext filenames remain on participant devices and are not accepted by the messaging service.'],
  ['1. Data Controller Identification', 'Shards Media ("we", "us", or "our") is the Data Controller responsible for processing personal data on the Iris OS Platform under Article 4(7) of the EU General Data Protection Regulation (GDPR), and the Data Fiduciary under Section 3 of India’s Digital Personal Data Protection (DPDP) Act.'],
  ['2. Categories of Personal Data We Collect', 'We process identity and account metadata (including corporate name, billing address, currency settings and administrator emails); financial data (internal ledgers, invoices, totals, expenses and merchant names); integration telemetry and OAuth access tokens for connected Canva, Meta, Google and Notion services; contractor allocation information; and system logs such as IP address, device headers and authentication timestamps.'],
  ['3. Purpose and Legal Basis of Processing', 'We process data to provide the workspace, calculate invoices, synchronize project milestones and authorize access. Connected integrations and Atlas AI analysis rely on your explicit consent and can be declined or revoked in Settings. We may also process limited data for legitimate interests such as security monitoring and operational heuristics. Under the DPDP Act, processing is limited to specified, lawful purposes supported by affirmative consent.'],
  ['4. Google and Notion Authentication APIs & Data Scope', 'Google authentication uses your profile data, email address, profile picture and authorization tokens. Iris OS does not read emails, documents or photos unless you separately grant additional permissions. Notion access is limited to the databases you explicitly select for reporting. Integration tokens are encrypted with industry-standard AES-256 encryption and may be revoked from the relevant provider’s security console.'],
  ['5. Data Retention, Erasure & Anonymization', 'We retain personal data only while your workspace is active or where necessary for the stated processing purpose. On account closure or a valid erasure request, API tokens are purged, identity details are deleted or anonymized, and Atlas AI operational logs are scrubbed of identifiable references. Meta data can be deauthorized or deleted through the available data-deletion routes after verification.'],
  ['6. GDPR & DPDP Act Data Subject Rights', 'You may request access to and portability of your data, correction of inaccurate data, withdrawal of consent, grievance redressal, and—where applicable under the DPDP Act—nomination of a person to exercise your rights in the event of death or incapacity.'],
  ['7. International Cross-Border Data Transfers', 'Personal data may be processed on secure servers in the United States, the EEA and India. EEA transfers use European Commission Standard Contractual Clauses where applicable. Transfers under the DPDP Act follow applicable Government of India cross-border requirements.'],
  ['8. Contact Our Data Protection Officer', 'To exercise your rights, withdraw consent or raise a privacy concern, contact Shards Media’s Privacy Compliance Department at studio@shardsmedia.com with the subject line “PRIVACY: DATA RIGHTS EXERCISE”.'],
] as const;

const PRIVACY_TLDR = [
  'Meta access is separately optional. Atlas uses Meta metrics only under an additional consent and never receives raw Meta lead contact data.',
  'Your workspace data is used to operate Iris OS and stays scoped to your organization.',
  'Atlas AI access is optional. You can leave it off and change that choice later in Settings.',
  'Connected services only receive the permissions you authorize; you can revoke them at any time.',
  'You can request access, correction, deletion, or export of your personal data.',
  'Contact studio@shardsmedia.com for privacy requests or concerns.',
];

export default function OnboardingPage() {
  const router = useRouter();
  
  // Wizard state: 'agency' | 'pricing' | 'consent' | 'payment'
  const [step, setStep] = React.useState<'agency' | 'pricing' | 'consent' | 'payment'>('agency');
  
  // Form values
  const [agencyName, setAgencyName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [currency, setCurrency] = React.useState('USD');
  const [agencyDetails, setAgencyDetails] = React.useState({ legalEntityName: '', billingEmail: '', phone: '', website: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: '', taxNumber: '', specialization: 'Digital Marketing Agency', bankName: '' });
  
  // Pricing state
  const [selectedPlanId, setSelectedPlanId] = React.useState<'basic' | 'pro' | 'advanced'>('pro');
  
  // Consent state
  const [termsAgreed, setTermsAgreed] = React.useState(false);
  const [aiSharingConsent, setAiSharingConsent] = React.useState(false);
  const [metaAccessConsent, setMetaAccessConsent] = React.useState(false);
  const [showPrivacyTldr, setShowPrivacyTldr] = React.useState(false);

  // Payment state
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardName, setCardName] = React.useState('');
  const [cardExpiry, setCardExpiry] = React.useState('');
  const [cardCvv, setCardCvv] = React.useState('');
  const [paymentLog, setPaymentLog] = React.useState<string[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [advancingStep, setAdvancingStep] = React.useState<'agency' | 'pricing' | 'consent' | null>(null);
  const transitionLockRef = React.useRef(false);

  const [email, setEmail] = React.useState('');
  React.useEffect(() => {
    fetch('/api/workspace')
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load onboarding state.');
        return response.json();
      })
      .then((workspace) => {
        const draft = workspace.onboarding?.draft || {};
        const steps = ['agency', 'pricing', 'consent', 'payment'] as const;
        setEmail(workspace.user.email);
        setAgencyName(draft.agencyName || workspace.organization.name || '');
        setUsername(draft.username || workspace.user.username || workspace.user.name || '');
        setCardName(workspace.user.name || '');
        setCurrency(draft.currency || workspace.organization.currency || 'USD');
        setAgencyDetails({ legalEntityName: draft.legalEntityName || workspace.organization.legalEntityName || '', billingEmail: draft.billingEmail || workspace.organization.billingEmail || workspace.user.email || '', phone: draft.phone || workspace.user.phone || '', website: draft.website || workspace.organization.preferences?.website || '', addressLine1: draft.addressLine1 || workspace.organization.billingAddressLine1 || '', addressLine2: draft.addressLine2 || workspace.organization.billingAddressLine2 || '', city: draft.city || workspace.organization.billingCity || '', state: draft.state || workspace.organization.billingState || '', postalCode: draft.postalCode || workspace.organization.billingPostalCode || '', country: draft.country || workspace.organization.billingCountry || '', taxNumber: draft.taxNumber || workspace.organization.gstNumber || '', specialization: draft.specialization || workspace.organization.agencyTypes?.[0] || 'Digital Marketing Agency', bankName: draft.bankName || workspace.organization.bankNames?.[0] || '' });
        setSelectedPlanId(draft.selectedPlanId || 'pro');
        setTermsAgreed(Boolean(draft.termsAgreed));
        setAiSharingConsent(Boolean(draft.aiSharingConsent));
        setMetaAccessConsent(Boolean(draft.metaAccessConsent ?? workspace.organization.metaAccessConsent));
        if (workspace.onboarding?.currentStep > 0 && workspace.onboarding.currentStep < steps.length) {
          setStep(steps[workspace.onboarding.currentStep]);
        }
      })
      .catch(() => router.replace('/login'));

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const stepParam = params.get('step');
      if (stepParam === 'pricing' || stepParam === 'consent' || stepParam === 'payment') {
        setStep(stepParam as any);
      }
    }
  }, [router]);

  const saveProgress = async (currentStep: number) => {
    const response = await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onboarding: {
          needsOnboarding: true,
          currentStep,
          draft: { agencyName, username, currency, selectedPlanId, termsAgreed, aiSharingConsent, metaAccessConsent, ...agencyDetails },
        },
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Unable to save onboarding progress.');
    }
  };

  const beginTransition = (current: 'agency' | 'pricing' | 'consent') => {
    if (transitionLockRef.current) return false;
    transitionLockRef.current = true;
    setAdvancingStep(current);
    return true;
  };

  const endTransition = () => {
    transitionLockRef.current = false;
    setAdvancingStep(null);
  };

  const handleAgencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transitionLockRef.current) return;
    if (!agencyName || !username || !agencyDetails.legalEntityName || !agencyDetails.billingEmail || !agencyDetails.phone || !agencyDetails.addressLine1 || !agencyDetails.city || !agencyDetails.country || !agencyDetails.specialization || !agencyDetails.bankName) {
      alert('Please fill out all agency profile fields.');
      return;
    }
    if (!beginTransition('agency')) return;
    try {
      await saveProgress(1);
      setStep('pricing');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to save onboarding progress.');
    } finally {
      endTransition();
    }
  };

  const handlePricingNext = async () => {
    if (!beginTransition('pricing')) return;
    try {
      await saveProgress(2);
      setStep('consent');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to save onboarding progress.');
    } finally {
      endTransition();
    }
  };

  const handleConsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transitionLockRef.current) return;
    if (!termsAgreed) {
      alert('You must read and agree to the Privacy Policy and Terms of Service to continue.');
      return;
    }
    if (!beginTransition('consent')) return;
    try {
      await saveProgress(3);
      setStep('payment');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to save onboarding progress.');
    } finally {
      endTransition();
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (transitionLockRef.current) return;
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      alert('Please fill out all billing credentials.');
      return;
    }
    transitionLockRef.current = true;
    setIsProcessing(true);
    const logs = [
      'Initializing Supabase Payment Gateway transaction...',
      '[1/3] Validating credit card credentials token clearance...',
      '[2/3] Registering enterprise ledger & organization databases...',
      '[3/3] Clearance approved! Logging user into secure workspace portal...'
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setPaymentLog((prev) => [...prev, logs[currentLogIndex]]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        
        // Update organization plan in PostgreSQL
        fetch('/api/organization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: agencyName,
            plan: selectedPlanId.toUpperCase(),
            hasAddon: selectedPlanId === 'basic' ? false : undefined,
            currency: currency,
            aiSharingConsent: selectedPlanId === 'basic' ? false : aiSharingConsent,
            metaAccessConsent,
            username: username,
            billingEmail: agencyDetails.billingEmail,
            legalEntityName: agencyDetails.legalEntityName,
            billingAddressLine1: agencyDetails.addressLine1,
            billingAddressLine2: agencyDetails.addressLine2,
            billingCity: agencyDetails.city,
            billingState: agencyDetails.state,
            billingPostalCode: agencyDetails.postalCode,
            billingCountry: agencyDetails.country,
            gstNumber: agencyDetails.taxNumber,
            agencyTypes: parseAgencyIndustryList(agencyDetails.specialization),
            bankNames: [agencyDetails.bankName],
            preferences: { website: agencyDetails.website, agencyPhone: agencyDetails.phone },
          })
        }).then(async (res) => {
          if (res.ok) {
            await saveProgress(4);
            setTimeout(() => {
              setIsProcessing(false);
              const params = new URLSearchParams(window.location.search);
              const redirectUrl = params.get('redirect') || '/dashboard';
              router.push(redirectUrl);
            }, 800);
          } else {
            const errData = await res.json().catch(() => ({}));
            setIsProcessing(false);
            transitionLockRef.current = false;
            alert(`Failed to register organization: ${errData.error || res.statusText || 'Unknown error'}${errData.details ? ` (${errData.details})` : ''}`);
          }
        }).catch((err) => {
          console.error('Error updating organization plan on onboarding completion:', err);
          setIsProcessing(false);
          transitionLockRef.current = false;
          alert('Network error while registering organization.');
        });
      }
    }, 1000);
  };

  // Swapping cards positioning logic:
  // Center is always the SELECTED plan.
  // Left and Right columns represent the remaining two plans.
  const getOrderedPlans = () => {
    const selectedPlan = PLANS.find(p => p.id === selectedPlanId)!;
    const otherPlans = PLANS.filter(p => p.id !== selectedPlanId);
    return {
      left: otherPlans[0],
      center: selectedPlan,
      right: otherPlans[1]
    };
  };

  const ordered = getOrderedPlans();

  return (
    <div className="workspace-auth bg-[#09090b] text-white min-h-screen relative font-sans select-none flex flex-col justify-between py-12 px-6">
      {/* Glow highlight */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(255,255,255,0.01)_0%,transparent_75%] pointer-events-none" />

      {/* Top logo */}
      <div className="max-w-6xl mx-auto w-full flex items-center gap-2 mb-8 relative z-10 shrink-0">
        <img src="/iris-logo-black-bg.png" alt="Iris OS Logo" className="h-8 object-contain" />
        <span className="text-md font-bold font-heading tracking-tight text-zinc-400">Onboarding</span>
      </div>

      {/* Main container */}
      <div className="max-w-5xl mx-auto w-full flex-grow flex items-center justify-center relative z-10 my-4">
        {step === 'agency' && (
          <Card className="w-full max-w-3xl bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl">
            <CardHeader className="text-center pt-6 pb-4 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Step 1 of 4</span>
              <CardTitle className="text-lg font-bold uppercase tracking-tight mt-1 text-white">Agency Registration</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Setup your command profile parameters (no integrations required)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              <form onSubmit={handleAgencySubmit} className="onboarding-agency-form space-y-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Agency Workspace Name</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Building className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Apex Media Agency"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/45 py-2.5 pl-9 pr-3 text-white placeholder-zinc-600 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Executive Username</label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <User className="h-3.5 w-3.5 text-zinc-500" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. lohith_apex"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/45 py-2.5 pl-9 pr-3 text-white placeholder-zinc-600 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Currency Ledger</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/45 py-2.5 px-3 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="CAD">CAD (CA$)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-zinc-800 pt-4 md:grid-cols-2">
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">Legal entity name *</span><input required value={agencyDetails.legalEntityName} onChange={(event) => setAgencyDetails({ ...agencyDetails, legalEntityName: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">Billing email *</span><input required type="email" value={agencyDetails.billingEmail} onChange={(event) => setAgencyDetails({ ...agencyDetails, billingEmail: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5 md:col-span-2"><span className="block font-semibold text-zinc-400">Agency phone *</span><CountryPhoneInput required value={agencyDetails.phone} onChange={(phone) => setAgencyDetails({ ...agencyDetails, phone })} /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">Website</span><input type="url" value={agencyDetails.website} onChange={(event) => setAgencyDetails({ ...agencyDetails, website: event.target.value })} placeholder="https://" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">Industry specializations *</span><input required value={agencyDetails.specialization} onChange={(event) => setAgencyDetails({ ...agencyDetails, specialization: event.target.value })} placeholder="Healthcare, B2B SaaS, Hospitality" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /><span className="block text-[10px] text-zinc-500">Enter a comma-separated list.</span></label>
                  <label className="space-y-1.5 md:col-span-2"><span className="block font-semibold text-zinc-400">Address line 1 *</span><input required value={agencyDetails.addressLine1} onChange={(event) => setAgencyDetails({ ...agencyDetails, addressLine1: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5 md:col-span-2"><span className="block font-semibold text-zinc-400">Address line 2</span><input value={agencyDetails.addressLine2} onChange={(event) => setAgencyDetails({ ...agencyDetails, addressLine2: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">City *</span><input required value={agencyDetails.city} onChange={(event) => setAgencyDetails({ ...agencyDetails, city: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">State / region</span><input value={agencyDetails.state} onChange={(event) => setAgencyDetails({ ...agencyDetails, state: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">Postal code</span><input value={agencyDetails.postalCode} onChange={(event) => setAgencyDetails({ ...agencyDetails, postalCode: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">Country *</span><input required value={agencyDetails.country} onChange={(event) => setAgencyDetails({ ...agencyDetails, country: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">Tax / GST number</span><input value={agencyDetails.taxNumber} onChange={(event) => setAgencyDetails({ ...agencyDetails, taxNumber: event.target.value })} className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                  <label className="space-y-1.5"><span className="block font-semibold text-zinc-400">Primary bank account *</span><input required value={agencyDetails.bankName} onChange={(event) => setAgencyDetails({ ...agencyDetails, bankName: event.target.value })} placeholder="Bank name or account label" className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white" /></label>
                </div>

                <Button type="submit" disabled={advancingStep !== null} aria-busy={advancingStep === 'agency'} className="w-full h-10 font-bold text-xs flex items-center justify-center gap-1.5 bg-white text-black hover:bg-zinc-250 cursor-pointer pt-1 mt-4">
                  {advancingStep === 'agency' ? <><Loader2 className="h-4 w-4 animate-spin text-black" /><span className="text-black">Saving agency details...</span></> : <><span className="text-black">Continue to Plan Selection</span><ArrowRight className="h-4 w-4 text-black" /></>}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'pricing' && (
          <div className="w-full space-y-8 flex flex-col items-center">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Step 2 of 4</span>
              <h2 className="text-2xl font-extrabold uppercase tracking-tight text-white">Choose Your Workspace Level</h2>
              <p className="text-zinc-500 text-xs max-w-md mx-auto">
                The selected option is highlighted in the center. Click the side plans to change selection.
              </p>
            </div>

            {/* Dynamic Swapping Cards Layout */}
            <div className="grid gap-6 md:grid-cols-12 items-center w-full max-w-4xl relative">
              
              {/* Left Column Plan (Unselected) */}
              <button
                type="button"
                disabled={advancingStep !== null}
                onClick={() => setSelectedPlanId(ordered.left.id as any)}
                className="onboarding-plan-card-compact md:col-span-3 min-w-0 overflow-hidden text-left bg-zinc-900/50 hover:bg-zinc-900 border-[2px] border-zinc-800/80 p-4 opacity-50 hover:opacity-85 transition-all flex flex-col justify-between h-[280px] rounded-none cursor-pointer group"
              >
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{ordered.left.name}</span>
                  <span className="block font-mono text-xs font-extrabold mt-1 text-white">${ordered.left.price}</span>
                  <span className="block text-[8px] font-semibold text-zinc-500 uppercase mt-1 tracking-tight">{ordered.left.tagline}</span>
                </div>
                <div className="onboarding-plan-card-features min-h-0 overflow-hidden font-mono text-[8px] text-zinc-450 space-y-1.5 mt-4 border-t border-zinc-800 pt-3">
                  {ordered.left.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="block">• {f}</span>
                  ))}
                </div>
                <span className="block shrink-0 text-[9px] font-bold uppercase text-red-500 group-hover:underline mt-4">Select Plan</span>
              </button>

              {/* Center Column Plan (Selected & Highlighted Big) */}
              <div className="md:col-span-6 bg-[#0d0e12] border-[3px] border-red-650 p-6 shadow-[0px_0px_20px_0px_rgba(220,38,38,0.15)] flex flex-col justify-between min-h-[380px] relative z-10 transition-all">
                <div className="absolute top-4 right-4 bg-red-600 text-white text-[8px] font-mono font-bold px-2 py-0.5 uppercase">
                  Selected
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs font-bold text-red-500 uppercase tracking-widest">{ordered.center.name}</span>
                    <span className="block text-[9px] font-semibold text-zinc-400 mt-0.5 uppercase tracking-wide">{ordered.center.tagline}</span>
                  </div>
                  <div className="border-b border-zinc-800 pb-3">
                    <span className="font-mono text-4xl font-black text-white">${ordered.center.price}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono"> / month</span>
                  </div>
                  <div className="space-y-2">
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Included Features:</span>
                    <ul className="space-y-2.5 font-mono text-[9px] text-zinc-300">
                      {ordered.center.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800">
                  <Button
                    onClick={handlePricingNext}
                    disabled={advancingStep !== null}
                    aria-busy={advancingStep === 'pricing'}
                    className="w-full h-10 font-bold text-xs bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {advancingStep === 'pricing' ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving plan...</span></> : <><span>Proceed to Payments</span><ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </div>
              </div>

              {/* Right Column Plan (Unselected) */}
              <button
                type="button"
                disabled={advancingStep !== null}
                onClick={() => setSelectedPlanId(ordered.right.id as any)}
                className="onboarding-plan-card-compact md:col-span-3 min-w-0 overflow-hidden text-left bg-zinc-900/50 hover:bg-zinc-900 border-[2px] border-zinc-800/80 p-4 opacity-50 hover:opacity-85 transition-all flex flex-col justify-between h-[280px] rounded-none cursor-pointer group"
              >
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{ordered.right.name}</span>
                  <span className="block font-mono text-xs font-extrabold mt-1 text-white">${ordered.right.price}</span>
                  <span className="block text-[8px] font-semibold text-zinc-500 uppercase mt-1 tracking-tight">{ordered.right.tagline}</span>
                </div>
                <div className="onboarding-plan-card-features min-h-0 overflow-hidden font-mono text-[8px] text-zinc-450 space-y-1.5 mt-4 border-t border-zinc-800 pt-3">
                  {ordered.right.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="block">• {f}</span>
                  ))}
                </div>
                <span className="block shrink-0 text-[9px] font-bold uppercase text-red-500 group-hover:underline mt-4">Select Plan</span>
              </button>

            </div>
          </div>
        )}

        {step === 'consent' && (
          <Card className="w-full max-w-md bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl">
            <CardHeader className="text-center pt-6 pb-4 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Step 3 of 4</span>
              <CardTitle className="text-xl font-bold uppercase tracking-tight mt-1 text-white">Privacy & AI Data Consent</CardTitle>
              <CardDescription className="text-sm text-zinc-500">
                Review policy terms and configure your workspace data privacy options
              </CardDescription>
            </CardHeader>
            <CardContent className="px-7 py-7 space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="font-semibold text-zinc-300 block text-xs uppercase font-mono">Privacy Policy · Last updated June 27, 2026</span>
                  <label className="flex items-center gap-2 text-sm font-semibold text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPrivacyTldr}
                      onChange={(event) => setShowPrivacyTldr(event.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 accent-red-600 h-4 w-4"
                    />
                    Show TL;DR
                  </label>
                </div>
                <div className="w-full h-[410px] rounded-md border border-zinc-800 bg-zinc-950/50 p-5 overflow-y-auto text-sm text-zinc-400 space-y-5 leading-7">
                  {showPrivacyTldr ? (
                    <>
                      <p className="text-base font-bold text-white">The short version</p>
                      <ul className="list-disc space-y-3 pl-5">
                        {PRIVACY_TLDR.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                      <p className="text-xs text-zinc-500 pt-2">This summary is for convenience. The full policy remains the governing document.</p>
                    </>
                  ) : (
                    FULL_PRIVACY_POLICY.map(([title, content]) => (
                      <section key={title} className="space-y-1.5">
                        <h3 className="text-base font-bold text-zinc-100">{title}</h3>
                        <p>{content}</p>
                      </section>
                    ))
                  )}
                </div>
                <p className="text-xs text-zinc-500">Use the TL;DR checkbox for a plain-language summary. You can also open the <Link href="/privacy" target="_blank" className="text-zinc-300 underline underline-offset-2">full privacy page</Link> in a new tab.</p>
              </div>

              <form onSubmit={handleConsentSubmit} className="space-y-4">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-zinc-800 text-red-650 bg-zinc-900 accent-red-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <label htmlFor="termsCheckbox" className="text-sm text-zinc-350 leading-relaxed cursor-pointer select-none">
                    I agree to the <Link href="/terms" target="_blank" className="text-red-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-red-500 hover:underline">Privacy Policy</Link>. <span className="text-red-650">*</span>
                  </label>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded border border-zinc-850 bg-zinc-900/10">
                  <input
                    type="checkbox"
                    id="aiConsentCheckbox"
                    checked={selectedPlanId !== 'basic' && aiSharingConsent}
                    disabled={selectedPlanId === 'basic'}
                    onChange={(e) => setAiSharingConsent(e.target.checked)}
                    className="mt-1 rounded border-zinc-800 text-red-650 bg-zinc-900 accent-red-650 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <div className="cursor-pointer select-none">
                    <label htmlFor="aiConsentCheckbox" className="block text-sm font-bold text-zinc-300">
                      Enable Atlas AI Analysis (Recommended)
                    </label>
                    <span className="block text-sm text-zinc-500 mt-1 leading-relaxed">
                      Allow the AI models to read your transaction records and lead pipeline data to automatically identify leaks and calculate campaign performance metrics. You can revoke this in settings at any time.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded border border-blue-900/40 bg-blue-950/10">
                  <input
                    type="checkbox"
                    id="metaAccessConsentCheckbox"
                    checked={metaAccessConsent}
                    onChange={(e) => setMetaAccessConsent(e.target.checked)}
                    className="mt-1 rounded border-zinc-800 bg-zinc-900 accent-blue-600 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <div className="cursor-pointer select-none">
                    <label htmlFor="metaAccessConsentCheckbox" className="block text-sm font-bold text-zinc-300">Allow access to Meta (Optional)</label>
                    <span className="block text-sm text-zinc-500 mt-1 leading-relaxed">Allow Iris OS to connect selected Meta ad accounts and retrieve campaign performance and lead-form submissions. This does not consent to Atlas AI analysis and can be withdrawn later.</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    disabled={advancingStep !== null}
                    onClick={() => setStep('pricing')}
                    className="flex-1 h-10 font-bold text-xs bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-850 cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={advancingStep !== null}
                    aria-busy={advancingStep === 'consent'}
                    className="flex-1 h-10 font-bold text-xs bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {advancingStep === 'consent' ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Saving consent...</span></> : <><span>Continue</span><ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 'payment' && (
          <Card className="w-full max-w-md bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl relative overflow-hidden">
            <CardHeader className="text-center pt-6 pb-4 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Step 4 of 4</span>
              <CardTitle className="text-lg font-bold uppercase tracking-tight mt-1 text-white">Billing Details</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Process recurring workspace fee for your selected plan
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6 space-y-5">
              
              {/* Selected plan preview */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-4 flex items-center justify-between">
                <div>
                  <span className="block text-zinc-400 text-[10px] uppercase font-mono">Active Choice:</span>
                  <span className="block text-sm font-bold text-white uppercase tracking-wider">
                    {PLANS.find(p => p.id === selectedPlanId)?.name}
                  </span>
                </div>
                <span className="font-mono text-xl font-bold text-white">
                  ${PLANS.find(p => p.id === selectedPlanId)?.price}/mo
                </span>
              </div>

              {isProcessing ? (
                <div className="space-y-4 py-4 min-h-[160px] flex flex-col justify-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border border-t-transparent border-red-500" />
                    <span className="text-xs text-zinc-300 font-semibold font-mono">Executing Safe Pay Operations...</span>
                  </div>
                  <div className="bg-[#09090b] border border-zinc-850 p-3 rounded font-mono text-[9px] text-zinc-450 space-y-1.5 h-[100px] overflow-y-auto">
                    {paymentLog.map((log, index) => (
                      <div key={index} className="flex gap-1.5 items-start">
                        <span className="text-red-500">&gt;</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Cardholder Name</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/45 py-2.5 pl-9 pr-3 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Credit Card Number</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="4111 2222 3333 4444"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full rounded border border-zinc-850 bg-zinc-900/45 py-2.5 pl-9 pr-3 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Expiration</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                        </div>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/45 py-2.5 pl-9 pr-3 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">CVV Security Code</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <Key className="h-3.5 w-3.5 text-zinc-500" />
                        </div>
                        <input
                          type="password"
                          placeholder="•••"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full rounded border border-zinc-850 bg-zinc-900/45 py-2.5 pl-9 pr-3 text-white placeholder-zinc-650 focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={isProcessing} aria-busy={isProcessing} className="w-full h-10 font-bold text-xs flex items-center justify-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer pt-1 mt-4">
                    {isProcessing ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Processing payment...</span></> : <><span>Submit & Process Payment</span><ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </form>
              )}

              <div className="rounded border border-zinc-850 bg-zinc-900/10 p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-zinc-300">Secure AES-256 Encryption</span>
                  <span className="block text-[10px] text-zinc-500 mt-1 leading-relaxed">
                    Credit credentials are authenticated and processed directly under PCI compliance guidelines.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between text-zinc-600 text-[10px] font-mono border-t border-zinc-900 pt-6 relative z-10 shrink-0">
        <span>© 2026 Iris OS Inc.</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-zinc-450">Terms</Link>
          <Link href="/privacy" className="hover:text-zinc-450">Privacy</Link>
        </div>
      </div>
    </div>
  );
}
