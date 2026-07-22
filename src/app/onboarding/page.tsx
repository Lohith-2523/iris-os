'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, ShieldCheck, Building, User, CreditCard, Calendar, Key } from 'lucide-react';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic Plan',
    price: 99,
    tagline: 'Starter Workspace Clearance',
    features: [
      '1 Agency Specialization Included',
      'Core Operational Ledger Console',
      'Client Read-Only Portal Gate',
      'Standard Webhook Integration Hook'
    ]
  },
  {
    id: 'pro',
    name: 'Pro Plan',
    price: 299,
    tagline: 'Professional Scale Workspace',
    features: [
      'Up to 5 Agency Specializations Included',
      'Active Contractor Profit Leak Checks',
      'Automated Executive Reports & SLAs',
      'Full Canva & Meta Ad Portal Sync',
      'Prism AI Client Query Clearance'
    ]
  },
  {
    id: 'advanced',
    name: 'Advanced Plan',
    price: 599,
    tagline: 'Unlimited Enterprise Console',
    features: [
      'All 10+ Agency Specializations Included',
      'Unlimited API Call Operations Threshold',
      'Custom Multi-Currency Financial Ledgers',
      '24/7 Dedicated Support & Audit Gating',
      'Automated Lead Generation Workflows'
    ]
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  
  // Wizard state: 'agency' | 'pricing' | 'consent' | 'payment'
  const [step, setStep] = React.useState<'agency' | 'pricing' | 'consent' | 'payment'>('agency');
  
  // Form values
  const [agencyName, setAgencyName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [specialization, setSpecialization] = React.useState('Marketing');
  const [currency, setCurrency] = React.useState('USD');
  
  // Pricing state
  const [selectedPlanId, setSelectedPlanId] = React.useState<'basic' | 'pro' | 'advanced'>('pro');
  
  // Consent state
  const [termsAgreed, setTermsAgreed] = React.useState(false);
  const [aiSharingConsent, setAiSharingConsent] = React.useState(false);

  // Payment state
  const [cardNumber, setCardNumber] = React.useState('');
  const [cardName, setCardName] = React.useState('');
  const [cardExpiry, setCardExpiry] = React.useState('');
  const [cardCvv, setCardCvv] = React.useState('');
  const [paymentLog, setPaymentLog] = React.useState<string[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);

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
        setSelectedPlanId(draft.selectedPlanId || 'pro');
        setSpecialization(draft.specialization || 'Marketing');
        setTermsAgreed(Boolean(draft.termsAgreed));
        setAiSharingConsent(Boolean(draft.aiSharingConsent));
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
    await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onboarding: {
          needsOnboarding: true,
          currentStep,
          draft: { agencyName, username, specialization, currency, selectedPlanId, termsAgreed, aiSharingConsent },
        },
      }),
    });
  };

  const handleAgencySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyName || !username) {
      alert('Please fill out all agency profile fields.');
      return;
    }
    await saveProgress(1);
    setStep('pricing');
  };

  const handlePricingNext = async () => {
    await saveProgress(2);
    setStep('consent');
  };

  const handleConsentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAgreed) {
      alert('You must read and agree to the Privacy Policy and Terms of Service to continue.');
      return;
    }
    await saveProgress(3);
    setStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      alert('Please fill out all billing credentials.');
      return;
    }
    
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
            aiSharingConsent: aiSharingConsent,
            username: username,
            billingEmail: email,
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
            alert(`Failed to register organization: ${errData.error || res.statusText || 'Unknown error'}${errData.details ? ` (${errData.details})` : ''}`);
          }
        }).catch((err) => {
          console.error('Error updating organization plan on onboarding completion:', err);
          setIsProcessing(false);
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
    <div className="bg-[#09090b] text-white min-h-screen relative font-sans select-none flex flex-col justify-between py-12 px-6">
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
          <Card className="w-full max-w-md bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl">
            <CardHeader className="text-center pt-6 pb-4 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Step 1 of 4</span>
              <CardTitle className="text-lg font-bold uppercase tracking-tight mt-1 text-white">Agency Registration</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Setup your command profile parameters (no integrations required)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6">
              <form onSubmit={handleAgencySubmit} className="space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Agency Focus</label>
                    <select
                      value={specialization}
                      onChange={(e) => setSpecialization(e.target.value)}
                      className="w-full rounded border border-zinc-850 bg-zinc-900/45 py-2.5 px-3 text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all"
                    >
                      <option value="Marketing">Marketing & Ads</option>
                      <option value="Design">Creative & Design</option>
                      <option value="Development">Web Development</option>
                      <option value="Consulting">Consulting Services</option>
                    </select>
                  </div>

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

                <Button type="submit" className="w-full h-10 font-bold text-xs flex items-center justify-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer pt-1 mt-4">
                  <span>Continue to Plan Selection</span>
                  <ArrowRight className="h-4 w-4" />
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
                onClick={() => setSelectedPlanId(ordered.left.id as any)}
                className="md:col-span-3 text-left bg-zinc-900/50 hover:bg-zinc-900 border-[2px] border-zinc-800/80 p-4 opacity-50 hover:opacity-85 transition-all flex flex-col justify-between h-[280px] rounded-none cursor-pointer group"
              >
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{ordered.left.name}</span>
                  <span className="block font-mono text-2xl font-extrabold mt-1 text-white">${ordered.left.price}</span>
                  <span className="block text-[8px] font-semibold text-zinc-500 uppercase mt-1 tracking-tight">{ordered.left.tagline}</span>
                </div>
                <div className="font-mono text-[8px] text-zinc-450 space-y-1.5 mt-4 border-t border-zinc-800 pt-3">
                  {ordered.left.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="block">• {f}</span>
                  ))}
                </div>
                <span className="block text-[9px] font-bold uppercase text-red-500 group-hover:underline mt-4">Select Plan</span>
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
                    className="w-full h-10 font-bold text-xs bg-white text-zinc-950 hover:bg-zinc-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Payments</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Right Column Plan (Unselected) */}
              <button
                type="button"
                onClick={() => setSelectedPlanId(ordered.right.id as any)}
                className="md:col-span-3 text-left bg-zinc-900/50 hover:bg-zinc-900 border-[2px] border-zinc-800/80 p-4 opacity-50 hover:opacity-85 transition-all flex flex-col justify-between h-[280px] rounded-none cursor-pointer group"
              >
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{ordered.right.name}</span>
                  <span className="block font-mono text-2xl font-extrabold mt-1 text-white">${ordered.right.price}</span>
                  <span className="block text-[8px] font-semibold text-zinc-500 uppercase mt-1 tracking-tight">{ordered.right.tagline}</span>
                </div>
                <div className="font-mono text-[8px] text-zinc-450 space-y-1.5 mt-4 border-t border-zinc-800 pt-3">
                  {ordered.right.features.slice(0, 3).map((f, i) => (
                    <span key={i} className="block">• {f}</span>
                  ))}
                </div>
                <span className="block text-[9px] font-bold uppercase text-red-500 group-hover:underline mt-4">Select Plan</span>
              </button>

            </div>
          </div>
        )}

        {step === 'consent' && (
          <Card className="w-full max-w-md bg-[#0d0e12] border-zinc-800 p-2 shadow-2xl">
            <CardHeader className="text-center pt-6 pb-4 border-b border-zinc-800">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest font-mono">Step 3 of 4</span>
              <CardTitle className="text-lg font-bold uppercase tracking-tight mt-1 text-white">Privacy & AI Data Consent</CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Review policy terms and configure your workspace data privacy options
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 py-6 space-y-4">
              <div className="space-y-1.5">
                <span className="font-semibold text-zinc-400 block text-[10px] uppercase font-mono">Legal Agreement Preview</span>
                <div className="w-full h-32 rounded border border-zinc-850 bg-zinc-900/40 p-3 overflow-y-auto text-[9px] text-zinc-500 space-y-2 leading-relaxed font-mono">
                  <p className="font-bold text-zinc-400">1. Data Storage and Control</p>
                  <p>All business profiles, financial ledgers, and leads uploaded manually to Iris OS are securely isolated within your PostgreSQL workspace. You retain complete ownership and deletion rights over your uploaded data.</p>
                  <p className="font-bold text-zinc-400">2. Prism AI Processing Consent</p>
                  <p>With your optional consent, Iris OS connects your local data to LLM models (Google Gemini, OpenAI ChatGPT, and Claude) to analyze cost margins, identify profit leaks, and generate strategy tips. You can decline or revoke this access at any time.</p>
                </div>
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
                  <label htmlFor="termsCheckbox" className="text-[10.5px] text-zinc-450 leading-relaxed cursor-pointer select-none">
                    I agree to the <Link href="/terms" target="_blank" className="text-red-500 hover:underline">Terms of Service</Link> and <Link href="/privacy" target="_blank" className="text-red-500 hover:underline">Privacy Policy</Link>. <span className="text-red-650">*</span>
                  </label>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded border border-zinc-850 bg-zinc-900/10">
                  <input
                    type="checkbox"
                    id="aiConsentCheckbox"
                    checked={aiSharingConsent}
                    onChange={(e) => setAiSharingConsent(e.target.checked)}
                    className="mt-1 rounded border-zinc-800 text-red-650 bg-zinc-900 accent-red-650 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <div className="cursor-pointer select-none">
                    <label htmlFor="aiConsentCheckbox" className="block text-[11px] font-bold text-zinc-300">
                      Enable Prism AI Analysis (Recommended)
                    </label>
                    <span className="block text-[9.5px] text-zinc-500 mt-1 leading-normal">
                      Allow the AI models to read your transaction records and lead pipeline data to automatically identify leaks and calculate campaign performance metrics. You can revoke this in settings at any time.
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setStep('pricing')}
                    className="flex-1 h-10 font-bold text-xs bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-850 cursor-pointer"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 h-10 font-bold text-xs bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="h-4 w-4" />
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

                  <Button type="submit" className="w-full h-10 font-bold text-xs flex items-center justify-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-250 cursor-pointer pt-1 mt-4">
                    <span>Submit & Process Payment</span>
                    <ArrowRight className="h-4 w-4" />
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
