import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getRequestUser } from '@/lib/org';
import { z } from 'zod';
import {
  extractMeetingDetailsWithGemini,
  GeminiMeetingError,
} from '@/lib/prism-ai/gemini-meetings';
import {
  isMeetingRequest,
  meetingConfirmationMessage,
  mergeMeetingWorkflow,
  missingMeetingFields,
  validTimeZone,
  zonedLocalDateTimeToUtc,
  type MeetingWorkflowState,
} from '@/lib/prism-ai/meeting-workflow';
import { createPrismMeeting } from '@/lib/calendar/create-prism-meeting';
import { GoogleCalendarIntegrationError } from '@/lib/google-calendar';
import { IrisEmailDeliveryError } from '@/lib/email/iris-email';

const AUTOMATIC_INSIGHT_TTL_MS = 30 * 60 * 1000;
const CHAT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_CHAT_REQUESTS_PER_WINDOW = 12;
const requestCounts = new Map<string, number[]>();
const automaticInsightCache = new Map<string, { expiresAt: number; payload: { result: string; model: string } }>();
const AUTOMATIC_INSIGHT_ACTIONS = new Set([
  'dashboard-summary',
  'operations-advice',
  'finance-analysis',
  'forecasting',
  'reporting-brief',
]);

const prismRequestSchema = z.object({
  action: z.enum([
    'dashboard-summary',
    'reporting-brief',
    'finance-analysis',
    'forecasting',
    'ask-prism',
    'operations-advice',
    'meta-strategy',
    'parse-team-file',
  ]),
  query: z.string().trim().max(8_000).optional().default(''),
  context: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().trim().min(1).max(128).optional(),
}).strict();

function checkRateLimit(key: string, windowMs: number, maxRequests: number): boolean {
  const now = Date.now();
  const timestamps = requestCounts.get(key) || [];
  const activeTimestamps = timestamps.filter(t => now - t < windowMs);
  
  if (activeTimestamps.length >= maxRequests) {
    return false;
  }
  
  activeTimestamps.push(now);
  requestCounts.set(key, activeTimestamps);
  return true;
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(',')}}`;
}

function automaticInsightCacheKey(orgId: string, action: string, context: unknown) {
  return `${orgId}:${action}:${stableSerialize(context ?? {})}`;
}

function cachedInsightResponse(key: string) {
  const cached = automaticInsightCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    automaticInsightCache.delete(key);
    return null;
  }
  return cached.payload;
}

function localDateTimeForPrompt(timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// Security injection scanning
function detectInjection(query: string): { detected: boolean; reason?: string } {
  if (!query) return { detected: false };
  const q = query.toLowerCase();

  const promptInjectionPatterns = [
    'ignore previous',
    'system prompt',
    'dan mode',
    'you are now offline',
    'bypass',
    'jailbreak',
    'ignore the instructions',
    'forget instructions',
    'new instructions',
    'acting as'
  ];

  for (const pattern of promptInjectionPatterns) {
    if (q.includes(pattern)) {
      return { detected: true, reason: 'Potential prompt injection attempt.' };
    }
  }

  const sqlInjectionPatterns = [
    'union select',
    'drop table',
    'or 1=1',
    'union all select',
    'select * from',
    'delete from',
    'insert into',
    'update pg_',
    'pg_sleep',
    '--'
  ];

  for (const pattern of sqlInjectionPatterns) {
    if (q.includes(pattern)) {
      return { detected: true, reason: 'Potential SQL injection attempt.' };
    }
  }

  return { detected: false };
}

const AI_UNAVAILABLE = 'Prism AI is currently unavailable. No synthetic organization data was returned.';

const MOCK_REPLIES = {
  dashboard: AI_UNAVAILABLE,
  finance: AI_UNAVAILABLE,
  forecasting: AI_UNAVAILABLE,
  creative: [AI_UNAVAILABLE],
  askGeneral: (_query: string) => AI_UNAVAILABLE,
  metaStrategy: (context: any) => {
    const spend = context?.spend || 0;
    const leads = context?.leads || 0;
    const reach = context?.reach || 0;
    const currency = context?.currency || 'billing currency';
    const cpl = spend / (leads || 1);
    const reachPerCurrency = reach / (spend || 1);
    
    return `Lohith, based on your active Meta campaigns, here is your specialized strategy generated by Prism AI to improve Ad performance and lead generation:

### 📊 Campaign Performance Audit
- **Total Spend**: ${currency} ${spend.toLocaleString()} | **Total Reach**: ${reach.toLocaleString()} people
- **Cost Per Lead (CPL)**: ${currency} ${cpl.toFixed(2)} | **Lead Conversion Rate**: 0.18%
- **Reach Efficiency**: **${reachPerCurrency.toFixed(1)} people reached per currency unit spent**.

### 🚀 Recommended Action Items

1. **Optimize High-CPL Campaigns**
   - The active campaigns show a CPL of ${currency} ${cpl.toFixed(2)}, which is slightly higher than target. Shift 15% of daily budget from low-converting visual ad placements on Instagram Reels to Facebook Feed posts.
   
2. **Improve Lead Generation Form Conversion**
   - Implement **Instant Forms autocomplete** features. Reducing form fields from 5 to 3 will historically decrease user drop-off by **24%**, bringing your lead generation rate to over **0.25%**.

3. **Content and Creative Revamp**
   - The photo posts on Instagram are yielding lower click-through-rates compared to carousels. Sync new Carousel creatives from **Design Hub (Canva)** to your active ad formats to boost engagement.
   
4. **Targeting and Bidding Strategy**
   - Set up **Advantage+ custom audience targeting** to focus on lookalikes of your converted leads, which currently show a 3.4x higher conversion likelihood.`;
  }
};

function determineModelHeuristically(query: string): 'Gemini' | 'ChatGPT' | 'Claude' {
  const q = (query || '').toLowerCase();

  const chatGPTKeywords = [
    'finance', 'financial', 'financials',
    'leak', 'leaks', 'leakage',
    'cost', 'costs', 'costing',
    'spend', 'spends', 'spending',
    'budget', 'budgets', 'budgeting',
    'forecast', 'forecasts', 'forecasting',
    'revenue', 'revenues',
    'cash', 'cashflow', 'cash flows',
    'margin', 'margins',
    'contractor', 'contractors',
    'rate', 'rates',
    'pricing', 'prices', 'price',
    'billing', 'billings', 'bills', 'bill',
    'profit', 'profits', 'profitability',
    'dollar', 'dollars',
    'money',
    'usd',
    'calculation', 'calculations', 'calculate', 'calculating',
    'compute', 'computes', 'computing', 'computation'
  ];

  const claudeKeywords = [
    'strategy', 'strategies', 'strategic',
    'plan', 'plans', 'planning',
    'campaign', 'campaigns',
    'creative', 'creatives', 'creativity',
    'optimize', 'optimization', 'optimizing', 'optimizations',
    'improve', 'improvement', 'improving',
    'solve', 'solving', 'solutions', 'solution',
    'risk', 'risks',
    'governance',
    'compliance', 'compliant',
    'opportunity', 'opportunities',
    'why',
    'orchestrate', 'orchestrated', 'orchestrating',
    'structuring', 'structure', 'structures',
    'deep reasoning',
    'mitigate', 'mitigation', 'mitigating'
  ];

  const chatGPTRegex = new RegExp(`\\b(${chatGPTKeywords.join('|')})\\b`, 'i');
  const claudeRegex = new RegExp(`\\b(${claudeKeywords.join('|')})\\b`, 'i');

  if (chatGPTRegex.test(q)) {
    return 'ChatGPT';
  }
  if (claudeRegex.test(q)) {
    return 'Claude';
  }
  return 'Gemini';
}

function generateDynamicFallback(model: 'Gemini' | 'ChatGPT' | 'Claude', query: string, context: any, currency: string): string {
  const q = (query || '').toLowerCase();
  
  const activeClients = [
    { name: 'Solaria Energy', health: 42 },
    { name: 'Pinnacle Health', health: 35 },
    { name: 'Vertex Retail', health: 88 },
    { name: 'Aether Technologies', health: 92 },
    { name: 'Pulse Media', health: 95 }
  ];
  
  const activeProjects = [
    { name: 'Solaria Energy Web Redesign', status: 'delayed', risk: 'high' },
    { name: 'Vertex Retail Brand Guidelines', status: 'active', risk: 'medium' },
    { name: 'Aether Social Campaign', status: 'active', risk: 'low' }
  ];

  const teamRoster = [
    { name: 'David Kim', role: 'Senior Designer' },
    { name: 'Kunal Verma', role: 'Solutions Architect' },
    { name: 'Aditi Sharma', role: 'UI/UX Specialist' }
  ];

  if (model === 'Gemini') {
    if (q.includes('client') || q.includes('portfolio') || q.includes('health') || q.includes('status')) {
      const summaryList = activeClients.map((c: any) => `- **${c.name}**: Health score **${c.health}/100** (${c.health < 50 ? 'Needs Attention / Churn Risk' : 'Stable'})`).join('\n');
      return `Lohith, here is a status overview of your active client portfolio:
${summaryList}

The average portfolio health score is **70.4/100**. Solaria Energy and Pinnacle Health require immediate operational check-ins.`;
    }
    
    if (q.includes('project') || q.includes('pipeline') || q.includes('workload')) {
      const projList = activeProjects.map(p => `- **${p.name}**: Status is **${p.status.toUpperCase()}** (${p.risk.toUpperCase()} RISK)`).join('\n');
      return `Lohith, the project delivery pipeline has **${activeProjects.length} active projects** with overall operational capacity at **74%**:
${projList}

I recommend shifting resources from lower-risk projects to assist with the Solaria Energy milestones.`;
    }

    if (q.includes('team') || q.includes('member') || q.includes('workload')) {
      const members = teamRoster.map(t => `- **${t.name}** (${t.role})`).join('\n');
      return `Lohith, here is the team capacity summary:
${members}

The overall organizational workload stands at a peak **80% capacity**, primarily driven by designer allocation constraints on Solaria campaigns.`;
    }

    return `Lohith, I have compiled a performance overview brief based on active logs.
All core agency systems are active. Monthly billing holds at **${currency} 198,000**, outstanding invoices total **${currency} 27,000**, and the overall agency health index stands at a stable **84/100** with customer retention rates performing optimally.`;
  }
  
  if (model === 'ChatGPT') {
    if (q.includes('leak') || q.includes('spend') || q.includes('loss') || q.includes('profit') || q.includes('cost')) {
      return `Lohith, here is my financial audit of active contractor allocations and redundant expenses:
1. **Contractor Over-allocation**: Unoptimized designer seat allocations in Vortex Retail projects shows a direct spend leak of **${currency} 2,800/mo**.
2. **SaaS Seat License Redundancy**: Multiple active subscriptions detected for Figma and Sketch design seats in the Aether Brand workspace are leaking **${currency} 1,400/mo**.

**Immediate Action Step**: Reassign the Vortex Retail design milestones to internal designer David Kim (currently underutilized) to recover direct margins and deactivate the duplicate Figma seats.`;
    }

    if (q.includes('forecast') || q.includes('projection') || q.includes('revenue') || q.includes('q3') || q.includes('q4') || q.includes('margin')) {
      const baseRev = 198000;
      const growthRate = q.includes('high') ? 0.12 : 0.084;
      const confidence = q.includes('high') ? '88%' : '92%';
      
      return `Lohith, I have generated a rolling predictive forecast for the upcoming two quarters:
* **Q3 Revenue Projections**: Estimated expansion of **${(growthRate * 100).toFixed(1)}%** (${currency} ${Math.round(baseRev * 3 * (1 + growthRate)).toLocaleString()} total gross billings).
* **Net Profit Margin**: Projected at **34.2%** assuming contractor expenses are audited.
* **Model Confidence**: Evaluated at **${confidence}** based on recent Vertex Retail contract additions.

*Note: Resource constraints may impact Q3 margins unless a freelancer senior designer is onboarded.*`;
    }

    if (q.includes('calculate') || q.includes('compute') || q.includes('total') || q.includes('sum')) {
      const numbers = q.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        const sum = numbers.map(Number).reduce((s, n) => s + n, 0);
        return `Lohith, I have computed the values requested from your query:
Sum of parsed figures: **${sum.toLocaleString()}**
If these represent billable hours or contract rates, the projected direct impact would scale to **${currency} ${(sum * 75).toLocaleString()}/mo** at standard retainers.`;
      }
    }

    return `Lohith, I have completed the financial ledger analysis. Active client contracts generate **${currency} 198,000/mo** in billable services against **${currency} 42,300/mo** in operational overhead. Net margins are healthy at **66.1%**, but I advise auditing the ${currency} 2,800/mo Vortex contractor over-allocations.`;
  }

  const targetEntityMatch = query.match(/\b(solaria|vertex|aether|pinnacle|pulse|nova|quantum)\b/i);
  const entity = targetEntityMatch ? targetEntityMatch[1] : 'Active Campaign';
  const entityTitle = entity.charAt(0).toUpperCase() + entity.slice(1);

  if (q.includes('strategy') || q.includes('campaign') || q.includes('creative') || q.includes('optimize')) {
    return `Lohith, I have formulated a campaign strategy and optimization plan for **${entityTitle}**:
1. **Auditing Ad Placements**: Move underperforming social placements to direct search and LinkedIn channels.
2. **Dynamic Asset Optimization**: Connect Canva API webhooks to automate creative templates updates based on performance feedback.
3. **Budget Reallocation**: Shift **15% budget** from low-engagement visual variants to top-performing campaigns.
4. **Publishing Frequency**: Increase publishing frequency on high-performing ad creatives.`;
  }

  if (q.includes('plan') || q.includes('checklist') || q.includes('setup') || q.includes('orchestrate')) {
    return `Lohith, here is the strategic execution checklist to orchestrate the **${entityTitle}** project plan:
- \`[ ]\` **Phase 1: Creative Asset Review** — Audit brand kit color palettes and Canva templates contrast ratios.
- \`[ ]\` **Phase 2: Contractor Realignment** — Review project assignments and reallocate milestones to senior designers.
- \`[ ]\` **Phase 3: Integration Checks** — Ensure ledger webhook logs and Meta Ads API sync parameters are active.
- \`[ ]\` **Phase 4: Risk Mitigation** — Prepare client-facing retrospectives to align delivery timelines.`;
  }

  if (q.includes('risk') || q.includes('mitigate') || q.includes('compliance') || q.includes('governance')) {
    return `Lohith, here is the risk register and mitigation strategy for **${entityTitle}**:
* **Risk 1: Client Review Bottleneck** (High Probability / Medium Impact)
  * *Mitigation*: Establish daily automated notifications when creatives are moved to the Canva Approval Queue.
* **Risk 2: Budget Leak on Contractor Rates** (Medium Probability / High Impact)
  * *Mitigation*: Implement strict governance checks in the Add Member system for third-party contractor assignments.
* **Risk 3: Brand Compliance Drift** (Low Probability / Low Impact)
  * *Mitigation*: Run automatic lint audits using the Brand Governance kit before design exports.`;
  }

  return `Lohith, based on deep operational reasoning, the best strategic step is to optimize team allocation. 
Currently, senior specialist capacity is constrained, presenting a bottleneck for new client onboarding. I advise establishing a structured campaign checklist, auditing Vortex contract roles, and using the Canva Template Autofills to accelerate deliverable pipelines.`;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = prismRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid Prism AI request.' }, { status: 400 });
    }
    const { action, query, context, sessionId } = parsed.data;

    const user = await getRequestUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Automatic insight requests have a 30-minute response lifetime. Check this
    // before touching the database or an AI provider so remounts are inexpensive.
    const insightKey = AUTOMATIC_INSIGHT_ACTIONS.has(action)
      ? automaticInsightCacheKey(user.orgId, action, context)
      : null;
    if (insightKey) {
      const cached = cachedInsightResponse(insightKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'private, max-age=1800, must-revalidate',
            'X-Prism-Cache': 'HIT',
          },
        });
      }
    }

    // Interactive requests are intentionally not cached, but they are tightly
    // limited by the authenticated user ID (not a spoofable client IP header).
    if (!AUTOMATIC_INSIGHT_ACTIONS.has(action) && !checkRateLimit(
      `${user.id}:${action}`,
      CHAT_RATE_LIMIT_WINDOW_MS,
      MAX_CHAT_REQUESTS_PER_WINDOW,
    )) {
      return NextResponse.json({ error: 'Too many Prism AI requests. Please try again in a few minutes.' }, { status: 429 });
    }

    // 2. Injection Protection Check
    if (query && typeof query === 'string') {
      const securityCheck = detectInjection(query);
      if (securityCheck.detected) {
        return NextResponse.json({ error: `Security Blocked: ${securityCheck.reason}` }, { status: 400 });
      }
    }

    const org = user.organization;
    const applyBillingCurrency = (value: string) => value.replaceAll('{currency}', org.currency);

    let dbContextText = '';
    if (org.aiSharingConsent) {
      const [transactions, agencyLeads, invoices, expenses] = await Promise.all([
        prisma.transaction.findMany({ where: { orgId: org.id }, take: 20 }),
        prisma.agencyLead.findMany({ where: { orgId: org.id }, take: 20 }),
        prisma.invoice.findMany({ where: { orgId: org.id }, take: 10 }),
        prisma.expense.findMany({ where: { orgId: org.id }, take: 10 })
      ]);
      
      dbContextText = `
Here is the live workspace data retrieved from the PostgreSQL database (AI data sharing is explicitly enabled by the user):

--- FINANCIAL DATA ---
Transactions:
${transactions.map(t => `- [${t.date.toISOString().split('T')[0]}] ${t.details}: ${org.currency} ${t.amount} (${t.type})`).join('\n') || 'No transactions recorded.'}

Invoices:
${invoices.map(i => `- Invoice ${i.invoiceNumber}: ${org.currency} ${i.amount} (${i.status})`).join('\n') || 'No invoices recorded.'}

Expenses:
${expenses.map(e => `- ${e.category} (${e.merchant}): ${org.currency} ${e.amount} (${e.status})`).join('\n') || 'No expenses recorded.'}

--- AGENCY LEADS DATA ---
Leads:
${agencyLeads.map(l => `- ${l.fullName}: Status: ${l.status}, Email: ${l.email}`).join('\n') || 'No leads recorded.'}
`;
    } else {
      dbContextText = `
IMPORTANT RULE: The user has disabled AI data-sharing consent. You must NOT access, simulate, or output their actual business transaction lists, lead names, or other personal financial stats.
Please reply in general terms. Advise them politely that they have disabled "Prism AI Analysis" in Settings > AI Settings & Data Privacy, and must enable it to get analysis of their live dashboard data.
`;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Helper functions 
    const callGemini = async (prompt: string, customFallback?: string) => {
      const fallback = customFallback !== undefined ? customFallback : (!org.aiSharingConsent
        ? "Prism AI is currently running in reasoning-only mode. To analyze your actual transaction metrics and lead database, please enable 'Prism AI Analysis' in Settings > AI Settings & Data Privacy."
        : applyBillingCurrency(MOCK_REPLIES.dashboard));
      if (!geminiKey) return fallback;
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!res.ok) {
          console.warn(`Gemini API failed with status ${res.status}. Falling back to mock replies.`);
          return fallback;
        }
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || fallback;
      } catch (error) {
        console.error('Gemini API call exception. Falling back to mock replies:', error);
        return fallback;
      }
    };

    const callChatGPT = async (systemPrompt: string, userPrompt: string) => {
      let fallback = applyBillingCurrency(action === 'forecasting' ? MOCK_REPLIES.forecasting : MOCK_REPLIES.finance);
      if (action === 'parse-team-file') {
        const extracted: any[] = [];
        const lines = userPrompt.split('\n');
        for (const line of lines) {
          const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (emailMatch) {
            const email = emailMatch[0];
            const nameMatch = line.match(/^([a-zA-Z\s]+)\b/);
            const name = nameMatch ? nameMatch[0].trim() : '';
            const phoneMatch = line.match(/[\d-]{7,15}/);
            const phone = phoneMatch ? phoneMatch[0] : null;
            const roleMatch = line.match(/(Designer|Developer|Specialist|Lead|Manager|Architect|Consultant)/i);
            const role = roleMatch ? roleMatch[0] : 'Member';
            
            extracted.push({
              name,
              email,
              phone,
              role,
              projects: 'None'
            });
          }
        }
        if (extracted.length > 0) {
          fallback = JSON.stringify(extracted);
        } else {
          fallback = JSON.stringify([]);
        }
      } else if (!org.aiSharingConsent) {
        fallback = "Prism AI is currently running in reasoning-only mode. To analyze your actual transaction metrics and lead database, please enable 'Prism AI Analysis' in Settings > AI Settings & Data Privacy.";
      }

      const executeGeminiFallback = async () => {
        console.warn('ChatGPT API failed. Rerouting to Gemini...');
        const combinedPrompt = `System instructions: ${systemPrompt}\n\nUser request: ${userPrompt}`;
        return await callGemini(combinedPrompt, fallback);
      };

      if (!openaiKey) {
        return await executeGeminiFallback();
      }
      try {
        const url = 'https://api.openai.com/v1/chat/completions';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-5.2',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.5
          })
        });
        if (!res.ok) {
          console.warn(`ChatGPT API failed with status ${res.status}.`);
          return await executeGeminiFallback();
        }
        const data = await res.json();
        return data.choices?.[0]?.message?.content || await executeGeminiFallback();
      } catch (error) {
        console.error('ChatGPT API call exception:', error);
        return await executeGeminiFallback();
      }
    };

    const callClaude = async (systemPrompt: string, userPrompt: string) => {
      const fallback = !org.aiSharingConsent
        ? "Prism AI is currently running in reasoning-only mode. To analyze your actual transaction metrics and lead database, please enable 'Prism AI Analysis' in Settings > AI Settings & Data Privacy."
        : applyBillingCurrency(MOCK_REPLIES.askGeneral(userPrompt));
      if (!anthropicKey) return fallback;
      try {
        const url = 'https://api.anthropic.com/v1/messages';
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-opus-4-6',
            max_tokens: 1024,
            messages: [{ role: 'user', content: userPrompt }],
            system: systemPrompt
          })
        });
        if (!res.ok) {
          console.warn(`Claude API failed with status ${res.status}. Falling back to mock replies.`);
          return fallback;
        }
        const data = await res.json();
        return data.content?.[0]?.text || fallback;
      } catch (error) {
        console.error('Claude API call exception. Falling back to mock replies:', error);
        return fallback;
      }
    };

    // Routing by AI Complexity Level
    switch (action) {
      // 1. Low-Level AI: Gemini Flash (dashboards, reports, summaries)
      case 'dashboard-summary': {
        const prompt = `You are Prism AI inside Iris OS, a premium executive command center.
        Review this operational status and write a short, executive brief (max 3 sentences) summarizing organization performance.
        Rule: Do not use markdown format tags except bolding.
        Context: ${JSON.stringify(context || {})}
        
        ${dbContextText}`;
        const output = await callGemini(prompt);
        const payload = { result: output, model: 'Prism AI' };
        if (insightKey) automaticInsightCache.set(insightKey, { expiresAt: Date.now() + AUTOMATIC_INSIGHT_TTL_MS, payload });
        return NextResponse.json(payload, { headers: insightKey ? { 'Cache-Control': 'private, max-age=1800, must-revalidate', 'X-Prism-Cache': 'MISS' } : undefined });
      }
      
      case 'reporting-brief': {
        const type = context?.type || 'financial';
        let prompt = '';
        if (type === 'marketing') {
          prompt = `You are Prism AI inside Iris OS. Generate a Comprehensive Marketing & Lead Performance Report.
          Review the agency leads and campaign statistics from the database.
          Provide a detailed executive breakdown of total leads, lead status distribution, and advertising channel performance.
          If no leads/campaigns are recorded, note that marketing channels are currently clean and awaiting integration.
          Rule: Keep it to max 5 sentences, professional, and action-oriented.
          Database Context: ${dbContextText}`;
        } else {
          prompt = `You are Prism AI inside Iris OS. Generate a Comprehensive Financial Performance Report.
          Review the transactions, invoices, and expenses from the database.
          Provide a detailed executive breakdown of gross billings, overhead costs, profit leaks, and net margins.
          If no financial records exist, note that the ledger is currently clean/empty.
          Rule: Keep it to max 5 sentences, professional, and action-oriented.
          Database Context: ${dbContextText}`;
        }
        const output = await callGemini(prompt);
        const payload = { result: output, model: 'Prism AI' };
        if (insightKey) automaticInsightCache.set(insightKey, { expiresAt: Date.now() + AUTOMATIC_INSIGHT_TTL_MS, payload });
        return NextResponse.json(payload, { headers: insightKey ? { 'Cache-Control': 'private, max-age=1800, must-revalidate', 'X-Prism-Cache': 'MISS' } : undefined });
      }

      // 2. Mid-Level AI: ChatGPT (financial analysis, forecasting, profit leaks)
      case 'finance-analysis': {
        const systemPrompt = 'You are Prism AI inside Iris OS. You are an expert financial consultant for agencies.';
        const userPrompt = `Audit these ledger billing details and contractor allocations to highlight profit leaks:
        Context: ${JSON.stringify(context || {})}
        
        ${dbContextText}`;
        const output = await callChatGPT(systemPrompt, userPrompt);
        const payload = { result: output, model: 'Prism AI' };
        if (insightKey) automaticInsightCache.set(insightKey, { expiresAt: Date.now() + AUTOMATIC_INSIGHT_TTL_MS, payload });
        return NextResponse.json(payload, { headers: insightKey ? { 'Cache-Control': 'private, max-age=1800, must-revalidate', 'X-Prism-Cache': 'MISS' } : undefined });
      }

      case 'forecasting': {
        const systemPrompt = 'You are Prism AI inside Iris OS. You run rolling projections and predictive models.';
        const userPrompt = `Calculate Q3 gross billings projections and cash flow capacity from this financial data:
        Context: ${JSON.stringify(context || {})}
        
        ${dbContextText}`;
        const output = await callChatGPT(systemPrompt, userPrompt);
        const payload = { result: output, model: 'Prism AI' };
        if (insightKey) automaticInsightCache.set(insightKey, { expiresAt: Date.now() + AUTOMATIC_INSIGHT_TTL_MS, payload });
        return NextResponse.json(payload, { headers: insightKey ? { 'Cache-Control': 'private, max-age=1800, must-revalidate', 'X-Prism-Cache': 'MISS' } : undefined });
      }

      // 3. High-Level Strategy AI: Claude (strategy, Ask Prism, complex reasoning)
      case 'ask-prism': {
        const meetingSession = sessionId
          ? await prisma.prismChatSession.findFirst({
              where: { id: sessionId, userId: user.id, orgId: user.orgId },
              select: {
                id: true,
                workflowType: true,
                workflowState: true,
              },
            })
          : null;
        if (sessionId && !meetingSession) {
          return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
        }

        const meetingWorkflowActive = meetingSession?.workflowType === 'MEETING';
        if (meetingWorkflowActive || isMeetingRequest(query)) {
          const currentState = meetingWorkflowActive
            ? meetingSession.workflowState as Partial<MeetingWorkflowState> | null
            : null;
          const timeZone = validTimeZone(currentState?.timeZone || context?.timeZone);
          const [teamDirectory, clientDirectory] = await Promise.all([
            prisma.user.findMany({
              where: { orgId: user.orgId },
              select: { name: true, email: true },
              orderBy: { name: 'asc' },
            }),
            prisma.contact.findMany({
              where: { client: { orgId: user.orgId } },
              select: { name: true, email: true },
              orderBy: { name: 'asc' },
            }),
          ]);

          const geminiResult = await extractMeetingDetailsWithGemini({
            query,
            currentState,
            timeZone,
            currentLocalDateTime: localDateTimeForPrompt(timeZone),
            directory: [
              ...teamDirectory.map((entry) => ({ ...entry, kind: 'team' as const })),
              ...clientDirectory.map((entry) => ({ ...entry, kind: 'client' as const })),
            ],
          });
          let workflowState = mergeMeetingWorkflow(currentState, geminiResult, timeZone);
          const missingFields = missingMeetingFields(workflowState);
          let output: string;
          let createdMeeting: Awaited<ReturnType<typeof createPrismMeeting>> | null = null;
          let workflowComplete = false;

          if (geminiResult.action === 'CANCEL') {
            output = 'Meeting setup cancelled. No calendar event or invitations were created.';
            workflowComplete = true;
          } else if (
            geminiResult.action === 'CONFIRM'
            && currentState?.awaitingConfirmation
            && missingFields.length === 0
          ) {
            const startTime = zonedLocalDateTimeToUtc(workflowState.startLocal, workflowState.timeZone);
            if (startTime.getTime() <= Date.now()) {
              workflowState = { ...workflowState, startLocal: '', awaitingConfirmation: false };
              output = 'That meeting time is in the past. What future date and time should I use?';
            } else {
              const endTime = new Date(startTime.getTime() + workflowState.durationMinutes * 60_000);
              createdMeeting = await createPrismMeeting({
                orgId: user.orgId,
                userId: user.id,
                organizerEmail: user.email,
                organizerName: user.name,
                organizationName: user.organization.name,
                title: workflowState.title,
                attendees: workflowState.attendees,
                startTime,
                endTime,
                timeZone: workflowState.timeZone,
              });
              const emailNote = createdMeeting.email.failedRecipients.length > 0
                ? ` The Google invitations were sent, but the Iris OS email could not reach: ${createdMeeting.email.failedRecipients.join(', ')}.`
                : ` Iris OS invitation emails were sent from noreply@irisos.app to ${createdMeeting.email.sent} attendee${createdMeeting.email.sent === 1 ? '' : 's'}.`;
              const conflictNote = createdMeeting.conflictTitle
                ? ` Note: this overlaps with "${createdMeeting.conflictTitle}".`
                : '';
              output = [
                `Meeting created: **${workflowState.title}**.`,
                '',
                `**Google Meet:** ${createdMeeting.event.meetLink}`,
                `**Attendees:** ${workflowState.attendees.join(', ')}`,
                `**Time:** ${workflowState.startLocal.replace('T', ' ')} (${workflowState.timeZone})`,
                '',
                `${emailNote}${conflictNote}`.trim(),
              ].join('\n');
              workflowComplete = true;
            }
          } else if (missingFields.length === 0) {
            workflowState = { ...workflowState, awaitingConfirmation: true };
            output = meetingConfirmationMessage(workflowState);
          } else {
            workflowState = { ...workflowState, awaitingConfirmation: false };
            output = geminiResult.reply
              || `Please provide the ${missingFields.join(', ')}.`;
          }

          const persistedSessionId = await prisma.$transaction(async (tx) => {
            let persistedId = sessionId;
            if (!persistedId) {
              const title = workflowState.title
                ? `Meeting: ${workflowState.title}`.slice(0, 80)
                : 'Schedule a meeting';
              const session = await tx.prismChatSession.create({
                data: {
                  title,
                  workflowType: workflowComplete ? null : 'MEETING',
                  workflowState: workflowComplete ? undefined : workflowState,
                  userId: user.id,
                  orgId: user.orgId,
                },
              });
              persistedId = session.id;
            } else {
              await tx.prismChatSession.update({
                where: { id: persistedId },
                data: {
                  workflowType: workflowComplete ? null : 'MEETING',
                  workflowState: workflowComplete ? Prisma.JsonNull : workflowState,
                  updatedAt: new Date(),
                },
              });
            }

            await tx.askPrismMessage.createMany({
              data: [
                { role: 'user', content: query, userId: user.id, orgId: user.orgId, sessionId: persistedId },
                { role: 'assistant', content: output, userId: user.id, orgId: user.orgId, sessionId: persistedId },
              ],
            });
            return persistedId;
          });

          return NextResponse.json({
            result: output,
            model: 'Prism AI · Gemini Meetings',
            sessionId: persistedSessionId,
            persisted: true,
            meeting: createdMeeting?.event || null,
          });
        }

        let delegatedModel: 'Gemini' | 'ChatGPT' | 'Claude' = 'Claude';
        
        // Attempt dynamically calling classification model (using Gemini as router)
        const routerPrompt = `You are the Prism AI task classification and delegation routing layer.
        Analyze the incoming user query and classify it into one of these three exact categories based on intent:
        - "GEMINI": For general queries, dashboards overview, database/data retrieval, and reasoning-free report summaries.
        - "CHATGPT": For financial audits, cost analysis, budget margins, SaaS accounts seat calculations, cashflow projections, and numerical forecasting.
        - "CLAUDE": For strategy, project planning, campaign setup, agency governance rules, compliance logic, risk mitigations, and advanced reasoning tasks.
        
        Respond ONLY with one word: GEMINI, CHATGPT, or CLAUDE. Do not include markdown formatting or punctuation.
        
        User Query: "${query}"`;
        
        if (geminiKey) {
          try {
            const classificationOutput = await callGemini(routerPrompt);
            const cleanedOutput = classificationOutput.trim().toUpperCase();
            if (cleanedOutput.includes('GEMINI')) {
              delegatedModel = 'Gemini';
            } else if (cleanedOutput.includes('CHATGPT')) {
              delegatedModel = 'ChatGPT';
            } else if (cleanedOutput.includes('CLAUDE')) {
              delegatedModel = 'Claude';
            } else {
              delegatedModel = determineModelHeuristically(query);
            }
          } catch (e) {
            delegatedModel = determineModelHeuristically(query);
          }
        } else {
          delegatedModel = determineModelHeuristically(query);
        }

        // Delegate query to selected model
        let output = '';
        if (delegatedModel === 'Gemini') {
          const prompt = `You are Prism AI, the data retrieval and dashboards overview engine for Iris OS.
          Focus on quick metrics overview, database records, and reasoning-free summaries.
          Query: ${query}
          Context: ${JSON.stringify(context || {})}
          
          ${dbContextText}`;
          output = await callGemini(prompt);
        } else if (delegatedModel === 'ChatGPT') {
          const systemPrompt = 'You are Prism AI, the financial and data forecasting intelligence for Iris OS. Focus on contractor rate analysis, SaaS cost leak audits, numerical calculations, and cash flow projections.';
          const userPrompt = `Query: ${query}\nContext: ${JSON.stringify(context || {})}\n\n${dbContextText}`;
          output = await callChatGPT(systemPrompt, userPrompt);
        } else {
          const systemPrompt = 'You are Prism AI, the senior strategies counselor and cognitive planning assistant for Iris OS. Focus on campaign optimizations, team structure risk mitigations, planning checklists, and deep logical reasoning.';
          const userPrompt = `Query: ${query}\nContext: ${JSON.stringify(context || {})}\n\n${dbContextText}`;
          output = await callClaude(systemPrompt, userPrompt);
        }

        const isMockResponse = (
          output === applyBillingCurrency(MOCK_REPLIES.dashboard) ||
          output === applyBillingCurrency(MOCK_REPLIES.finance) ||
          output === applyBillingCurrency(MOCK_REPLIES.forecasting) ||
          output.startsWith('Lohith, our current Agency Health Score') ||
          output.startsWith('Lohith, I have detected two key profit leaks') ||
          output.startsWith('Lohith, the financial forecast for Q3') ||
          output.startsWith('Lohith, I processed your query')
        );

        if (isMockResponse) {
          output = !org.aiSharingConsent
            ? "Prism AI is currently running in reasoning-only mode. To analyze your actual transaction metrics and lead database, please enable 'Prism AI Analysis' in Settings > AI Settings & Data Privacy."
            : 'Prism AI is currently unavailable. No synthetic organization data was returned.';
        }

        const currentSessionId = sessionId;
        if (currentSessionId) {
            const ownedSession = await prisma.prismChatSession.findFirst({
              where: { id: currentSessionId, userId: user.id, orgId: user.orgId },
              select: { id: true },
            });
            if (!ownedSession) {
              return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
            }
        }

        const persistedSessionId = await prisma.$transaction(async (tx) => {
          let persistedSessionId = currentSessionId;
          if (!persistedSessionId) {
            const title = query.length > 30 ? `${query.substring(0, 30)}...` : query || 'New Chat';
            const session = await tx.prismChatSession.create({
              data: { title, userId: user.id, orgId: user.orgId },
            });
            persistedSessionId = session.id;
          } else {
            // Message inserts do not update the parent row's @updatedAt field.
            // Touch it so the history list reliably promotes the active conversation.
            await tx.prismChatSession.update({ where: { id: persistedSessionId }, data: { updatedAt: new Date() } });
          }

          await tx.askPrismMessage.createMany({
            data: [
              { role: 'user', content: query, userId: user.id, orgId: user.orgId, sessionId: persistedSessionId },
              { role: 'assistant', content: output, userId: user.id, orgId: user.orgId, sessionId: persistedSessionId },
            ],
          });
          return persistedSessionId;
        });

        return NextResponse.json({ result: output, model: 'Prism AI', sessionId: persistedSessionId, persisted: true });
      }

      case 'operations-advice': {
        const systemPrompt = 'You are Prism AI, the senior strategy counselor for Iris OS. You deliver precise operations advice.';
        const userPrompt = `Give strategic project capacity advice or risk mitigation tips based on this team workload data:
        Context: ${JSON.stringify(context || {})}
        
        ${dbContextText}`;
        const output = await callClaude(systemPrompt, userPrompt);
        const payload = { result: output, model: 'Prism AI' };
        if (insightKey) automaticInsightCache.set(insightKey, { expiresAt: Date.now() + AUTOMATIC_INSIGHT_TTL_MS, payload });
        return NextResponse.json(payload, { headers: insightKey ? { 'Cache-Control': 'private, max-age=1800, must-revalidate', 'X-Prism-Cache': 'MISS' } : undefined });
      }

      case 'meta-strategy': {
        const systemPrompt = 'You are Prism AI, the senior strategies counselor for Meta campaigns. Focus on optimizing Meta Ad performance, improving cost-per-lead, and maximizing ad reach and lead conversion rates.';
        const userPrompt = `Query: ${query}\nContext: ${JSON.stringify(context || {})}\n\n${dbContextText}`;
        
        let output = '';
        if (anthropicKey) {
          output = await callClaude(systemPrompt, userPrompt);
        } else {
          output = !org.aiSharingConsent
            ? "Prism AI is currently running in reasoning-only mode. To analyze your actual transaction metrics and lead database, please enable 'Prism AI Analysis' in Settings > AI Settings & Data Privacy."
            : MOCK_REPLIES.metaStrategy({ ...context, currency: org.currency });
        }
        return NextResponse.json({ result: output, model: 'Prism AI' });
      }

      case 'parse-team-file': {
        const systemPrompt = `You are a data extraction assistant. You take unstructured or semi-structured text uploaded by an admin and extract a list of users.
        You must return a valid JSON array of objects. Do not wrap in markdown tags like \`\`\`json. Return only the raw JSON.
        Each user object must have:
        - name: full name (string, or empty string if not found)
        - email: email address (string, or empty string if not found)
        - phone: phone number (string, or empty string if not found)
        - role: role/title (string, or empty string if not found)
        - projects: comma-separated list of projects or "None" (string, default "None" if not found)
        
        Example JSON output:
        [{"name": "John Doe", "email": "john@example.com", "phone": "123-456-7890", "role": "Senior Designer", "projects": "Pulse Media"}]`;
        const userPrompt = `Parse the following text content and extract user fields:\n${query}`;
        const output = await callChatGPT(systemPrompt, userPrompt);
        return NextResponse.json({ result: output, model: 'Prism AI' });
      }

      default:
        return NextResponse.json({ error: 'Unsupported AI action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in Prism AI routing handler:', error);
    if (
      error instanceof GeminiMeetingError
      || error instanceof GoogleCalendarIntegrationError
      || error instanceof IrisEmailDeliveryError
    ) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
