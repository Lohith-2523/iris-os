import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database tables...');
  
  // Delete in reverse order of foreign keys
  await prisma.askPrismMessage.deleteMany({});
  await prisma.prismInsight.deleteMany({});
  await prisma.integrationConnection.deleteMany({});
  await prisma.automationRun.deleteMany({});
  await prisma.automation.deleteMany({});
  await prisma.designAsset.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.financialForecast.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.resourceAllocation.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.metaLead.deleteMany({});
  await prisma.metaAd.deleteMany({});
  await prisma.metaCampaign.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log('Seeding database...');

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Apex Creative Group',
      plan: 'PRO',
      hasAddon: false,
      agencyTypes: ['Digital Marketing Agency', 'SEO Agency'],
    },
  });

  // 2. Brands
  const brand1 = await prisma.brand.create({
    data: {
      name: 'Aether Digital',
      logoUrl: '/brands/aether.png',
      primaryColor: '#18181b',
      secondaryColor: '#a1a1aa',
      orgId: org.id,
    },
  });

  const brand2 = await prisma.brand.create({
    data: {
      name: 'Vortex Studio',
      logoUrl: '/brands/vortex.png',
      primaryColor: '#27272a',
      secondaryColor: '#e4e4e7',
      orgId: org.id,
    },
  });

  const brand3 = await prisma.brand.create({
    data: {
      name: 'Helios Media',
      logoUrl: '/brands/helios.png',
      primaryColor: '#09090b',
      secondaryColor: '#fafafa',
      orgId: org.id,
    },
  });

  // 3. Users
  const user1 = await prisma.user.create({
    data: {
      email: 'lohith@apex.co',
      name: 'Lohith Kumar',
      role: 'ADMIN', // Executive CEO
      avatarUrl: '/avatars/lohith.png',
      orgId: org.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'sarah.chen@apex.co',
      name: 'Sarah Chen',
      role: 'ADMIN', // Operations Lead
      avatarUrl: '/avatars/sarah.png',
      orgId: org.id,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'marcus.a@apex.co',
      name: 'Marcus Aurelius',
      role: 'MEMBER', // Creative Director
      avatarUrl: '/avatars/marcus.png',
      orgId: org.id,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      email: 'elena.r@apex.co',
      name: 'Elena Rostova',
      role: 'MEMBER', // Financial Director
      avatarUrl: '/avatars/elena.png',
      orgId: org.id,
    },
  });

  const user5 = await prisma.user.create({
    data: {
      email: 'david.k@apex.co',
      name: 'David Kim',
      role: 'MEMBER', // Lead Designer
      avatarUrl: '/avatars/david.png',
      orgId: org.id,
    },
  });

  const user6 = await prisma.user.create({
    data: {
      email: 'sophie.d@client.co',
      name: 'Sophie Dubois',
      role: 'CLIENT_VIEWER',
      avatarUrl: '/avatars/sophie.png',
      orgId: org.id,
    },
  });

  // 4. Clients
  const clientNames = [
    { name: 'Aether Technologies', domain: 'aethertech.com', status: 'ACTIVE', healthScore: 92, healthStatus: 'EXCELLENT', churnRiskScore: 5, roiMetric: 4.8 },
    { name: 'Vertex Retail', domain: 'vertexretail.com', status: 'ACTIVE', healthScore: 88, healthStatus: 'EXCELLENT', churnRiskScore: 12, roiMetric: 3.5 },
    { name: 'Nova BioLabs', domain: 'novabiolabs.org', status: 'ACTIVE', healthScore: 74, healthStatus: 'GOOD', churnRiskScore: 24, roiMetric: 2.1 },
    { name: 'Quantum Capital', domain: 'quantumcap.io', status: 'ACTIVE', healthScore: 61, healthStatus: 'FAIR', churnRiskScore: 35, roiMetric: 1.8 },
    { name: 'Solaria Energy', domain: 'solaria.energy', status: 'ACTIVE', healthScore: 42, healthStatus: 'RISK', churnRiskScore: 68, roiMetric: 1.2 },
    { name: 'Pulse Media', domain: 'pulsemedia.agency', status: 'ACTIVE', healthScore: 95, healthStatus: 'EXCELLENT', churnRiskScore: 3, roiMetric: 5.2 },
    { name: 'Apex Retail Group', domain: 'apexretail.com', status: 'ACTIVE', healthScore: 79, healthStatus: 'GOOD', churnRiskScore: 18, roiMetric: 2.9 },
    { name: 'Onyx Logistics', domain: 'onyxlogistics.com', status: 'ACTIVE', healthScore: 55, healthStatus: 'FAIR', churnRiskScore: 48, roiMetric: 1.5 },
    { name: 'Nebula Creative Studio', domain: 'nebulastudio.net', status: 'ACTIVE', healthScore: 83, healthStatus: 'GOOD', churnRiskScore: 15, roiMetric: 3.1 },
    { name: 'Pinnacle Health', domain: 'pinnaclehealth.co', status: 'ACTIVE', healthScore: 35, healthStatus: 'RISK', churnRiskScore: 78, roiMetric: 0.9 },
    { name: 'Zephyr Logistics', domain: 'zephyrlogistics.com', status: 'CHURNED', healthScore: 10, healthStatus: 'RISK', churnRiskScore: 99, roiMetric: 0.0 },
    { name: 'Horizon Automotive', domain: 'horizonauto.com', status: 'LEAD', healthScore: 0, healthStatus: 'FAIR', churnRiskScore: 0, roiMetric: 0.0 },
  ];

  const clients = [];
  for (const c of clientNames) {
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + Math.floor(Math.random() * 8) + 1);
    
    const client = await prisma.client.create({
      data: {
        name: c.name,
        domain: c.domain,
        status: c.status,
        healthScore: c.healthScore,
        healthStatus: c.healthStatus,
        churnRiskScore: c.churnRiskScore,
        roiMetric: c.roiMetric,
        renewalDate: c.status === 'ACTIVE' ? renewalDate : null,
        upsellOpportunityValue: c.status === 'ACTIVE' ? Math.floor(Math.random() * 50000) : 0,
        orgId: org.id,
      },
    });
    clients.push(client);

    // Create a contact
    await prisma.contact.create({
      data: {
        name: `Primary Contact at ${c.name}`,
        email: `contact@${c.domain || 'example.com'}`,
        phone: '+1 (555) 019-9234',
        role: 'Marketing Lead',
        clientId: client.id,
      },
    });
  }

  // 5. Projects & Resource Allocations (20 projects)
  const projectTemplates = [
    { name: 'Web Portal Redesign', status: 'IN_PROGRESS', progress: 45, riskLevel: 'LOW' },
    { name: 'Brand Identity Suite', status: 'IN_PROGRESS', progress: 80, riskLevel: 'LOW' },
    { name: 'Q3 Asset Content Library', status: 'NOT_STARTED', progress: 0, riskLevel: 'LOW' },
    { name: 'Operational Audit & Analytics', status: 'COMPLETED', progress: 100, riskLevel: 'LOW' },
    { name: 'E-Commerce Integrations', status: 'IN_PROGRESS', progress: 20, riskLevel: 'HIGH', riskDescription: 'Client delayed asset delivery' },
    { name: 'Global Marketing Campaign', status: 'IN_PROGRESS', progress: 60, riskLevel: 'MEDIUM', riskDescription: 'Tight budget margins' },
    { name: 'Mobile App Wireframes', status: 'COMPLETED', progress: 100, riskLevel: 'LOW' },
    { name: 'Annual Creative Plan', status: 'ON_HOLD', progress: 15, riskLevel: 'HIGH', riskDescription: 'Client restructuring budget' },
    { name: 'Automation Pipeline Setup', status: 'IN_PROGRESS', progress: 90, riskLevel: 'LOW' },
    { name: 'Video Advertisement Production', status: 'IN_PROGRESS', progress: 35, riskLevel: 'LOW' },
    { name: 'Customer Journey Map', status: 'COMPLETED', progress: 100, riskLevel: 'LOW' },
    { name: 'Social Media Blast Asset Prep', status: 'IN_PROGRESS', progress: 50, riskLevel: 'LOW' },
    { name: 'Technical Docs Publishing', status: 'IN_PROGRESS', progress: 70, riskLevel: 'LOW' },
    { name: 'Enterprise Strategy Consulting', status: 'IN_PROGRESS', progress: 10, riskLevel: 'LOW' },
    { name: 'Email Lead Capture Setup', status: 'COMPLETED', progress: 100, riskLevel: 'LOW' },
    { name: 'Brand Guidelines Playbook', status: 'COMPLETED', progress: 100, riskLevel: 'LOW' },
    { name: 'Interactive UI Prototypes', status: 'IN_PROGRESS', progress: 30, riskLevel: 'MEDIUM' },
    { name: 'SEO Campaign Assets', status: 'IN_PROGRESS', progress: 75, riskLevel: 'LOW' },
    { name: 'Creative Strategy Audit', status: 'COMPLETED', progress: 100, riskLevel: 'LOW' },
    { name: 'B2B Brand Kit Evolution', status: 'OVERDUE', progress: 85, riskLevel: 'HIGH', riskDescription: 'Overdue milestone by 12 days' },
  ];

  const projects = [];
  for (let i = 0; i < projectTemplates.length; i++) {
    const template = projectTemplates[i];
    const client = clients[i % clients.length];
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 2);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);

    const project = await prisma.project.create({
      data: {
        name: `${client.name} - ${template.name}`,
        status: template.status,
        startDate: startDate,
        endDate: endDate,
        progress: template.progress,
        riskLevel: template.riskLevel,
        riskDescription: template.riskDescription || null,
        orgId: org.id,
        clientId: client.id,
      },
    });
    projects.push(project);

    // Create Project Members
    await prisma.projectMember.create({
      data: {
        userId: user3.id,
      },
    });

    // Create Milestone
    await prisma.milestone.create({
      data: {
        name: 'Design Sign-off',
        dueDate: endDate,
        status: template.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING',
        projectId: project.id,
      },
    });

    // Create Resource Allocation
    await prisma.resourceAllocation.create({
      data: {
        role: 'Senior Designer',
        hoursAlloc: 40.0,
        utilization: 80.0,
        projectId: project.id,
      },
    });
  }

  // 6. Finance Ledger: Invoices (Last 6 Months)
  console.log('Seeding invoices and expenses...');
  const monthlyRevenues = [150000, 162000, 175000, 168000, 185000, 198000]; // Last 6 months
  const monthlyExpenses = [110000, 115000, 120000, 118000, 122000, 125000];

  for (let m = 0; m < 6; m++) {
    const date = new Date();
    date.setMonth(date.getMonth() - m);

    // Seed 3 invoices per month
    for (let j = 0; j < 3; j++) {
      const client = clients[j % clients.length];
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-2026-${m}-${j}`,
          amount: monthlyRevenues[m] / 3,
          dueDate: date,
          status: m === 0 ? 'UNPAID' : 'PAID',
          orgId: org.id,
          clientId: client.id,
          issuedDate: date,
        },
      });
    }

    // Seed 3 expenses per month
    const categories = ['Infrastructure', 'SaaS Tools', 'Contractors', 'Office Rent', 'Travel'];
    for (let j = 0; j < 3; j++) {
      await prisma.expense.create({
        data: {
          category: categories[(m + j) % categories.length],
          amount: monthlyExpenses[m] / 3,
          date: date,
          merchant: 'Vendor Corp',
          status: 'APPROVED',
          orgId: org.id,
        },
      });
    }
  }

  // 7. Forecasts
  for (let m = 1; m <= 6; m++) {
    const date = new Date();
    date.setMonth(date.getMonth() + m);
    
    await prisma.financialForecast.create({
      data: {
        month: date,
        projectedRev: 200000 + m * 5000,
        projectedExp: 130000 + m * 2000,
        confidence: 90 - m * 5,
        narrative: `Prism AI projects steady growth of ${2.5 + m * 0.2}% in pipeline value, driven by Aether and Vertex account expansions.`,
      },
    });
  }

  // 8. Design Hub Assets & Campaigns
  const campaign1 = await prisma.campaign.create({
    data: {
      name: 'Summer Launch 2026',
      description: 'Main social and ad assets for Summer relaunch.',
      status: 'ACTIVE',
      brandId: brand1.id,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      name: 'Corporate Redesign 2026',
      description: 'Redesign of digital brand presence assets.',
      status: 'SCHEDULED',
      brandId: brand2.id,
    },
  });

  await prisma.designAsset.create({
    data: {
      name: 'Summer Banner Ads',
      imageUrl: '/designs/summer_banner.png',
      status: 'APPROVED',
      canvaProjectId: 'canva-proj-91024',
      brandId: brand1.id,
      campaignId: campaign1.id,
    },
  });

  await prisma.designAsset.create({
    data: {
      name: 'Aether Social Square Ads',
      imageUrl: '/designs/social_square.png',
      status: 'IN_REVIEW',
      canvaProjectId: 'canva-proj-55123',
      brandId: brand1.id,
      campaignId: campaign1.id,
    },
  });

  await prisma.designAsset.create({
    data: {
      name: 'Vortex Logo Concepts',
      imageUrl: '/designs/logo_concepts.png',
      status: 'DRAFT',
      canvaProjectId: 'canva-proj-10492',
      brandId: brand2.id,
      campaignId: campaign2.id,
    },
  });

  // 9. Integration Connections
  const integrations = [
    { provider: 'CANVA', status: 'CONNECTED', syncLogs: 'Synced 12 assets from Canva workspace root' },
    { provider: 'QUICKBOOKS', status: 'CONNECTED', syncLogs: 'Synced 18 invoices and 24 ledger items' },
    { provider: 'STRIPE', status: 'CONNECTED', syncLogs: 'Synced subscription events, active webhooks verified' },
    { provider: 'HUBSPOT', status: 'DISCONNECTED', syncLogs: 'Token expired. Re-authentication required.' },
    { provider: 'SLACK', status: 'SYNCING', syncLogs: 'Listening for notification dispatch events...' },
  ];

  for (const intg of integrations) {
    await prisma.integrationConnection.create({
      data: {
        provider: intg.provider,
        status: intg.status,
        lastSync: new Date(),
        syncLogs: intg.syncLogs,
        orgId: org.id,
      },
    });
  }

  // 10. Automations & Runs
  const auto1 = await prisma.automation.create({
    data: {
      name: 'Invoice Alert Slack Sync',
      description: 'Post to #finance-alerts when a new invoice is issued.',
      trigger: 'Invoice Created',
      action: 'Slack Notification Dispatch',
      status: 'ACTIVE',
      createdById: user1.id,
      orgId: org.id,
    },
  });

  const auto2 = await prisma.automation.create({
    data: {
      name: 'Design Approval Sync',
      description: 'Notify Lead Designer when client approves asset in Design Hub.',
      trigger: 'Design Approved',
      action: 'Email Dispatch',
      status: 'ACTIVE',
      createdById: user2.id,
      orgId: org.id,
    },
  });

  await prisma.automationRun.create({
    data: {
      status: 'SUCCESS',
      triggeredBy: 'Invoice Creator Service',
      finishedAt: new Date(),
      logs: 'Slack API payload dispatched successfully to #finance-alerts. Code 200 OK.',
      automationId: auto1.id,
    },
  });

  // 11. Reports
  await prisma.report.create({
    data: {
      title: 'Q2 Agency Performance Brief',
      type: 'FINANCE',
      status: 'READY',
      filePath: '/reports/q2_finance.pdf',
      summary: 'Prism Executive Summary: Q2 Revenue surged by 12.8% to $528K. Churn rate drops to historic low 2.4%. Profit leaks detected in Contractor Utilizations ($14,500 leakage).',
      createdById: user1.id,
    },
  });

  await prisma.report.create({
    data: {
      title: 'Solaria Energy Account Health Assessment',
      type: 'CLIENT',
      status: 'READY',
      filePath: '/reports/solaria_health.pdf',
      summary: 'Prism AI client churn warning report: Solaria Energy Health drops to 42. Churn Risk Score reaches 68%. Actions: Immediate renewal touchpoint advised.',
      createdById: user2.id,
    },
  });

  // 12. Prism Insights
  await prisma.prismInsight.create({
    data: {
      type: 'HEALTH_SCORE',
      title: 'Agency Executive Health Score: 84/100',
      description: 'Agency commands a strong financial and portfolio footprint. Revenue growth and client sentiment are strong, though team capacity is approaching constraints.',
      score: 84,
      metric: 'EXCELLENT',
      riskLevel: 'LOW',
      actionableStep: 'Optimize project delivery allocation to prevent designer burn-out.',
    },
  });

  await prisma.prismInsight.create({
    data: {
      type: 'PROFIT_LEAK',
      title: 'Contractor Resource Leak Detected',
      description: 'Vortex Retail project has 14 hours of contractor over-allocation. The hourly overage is leaking approximately $2,800/month.',
      score: 2800,
      metric: 'LEAK_VALUE',
      riskLevel: 'MEDIUM',
      actionableStep: 'Reassign unallocated internal team designers to cover remaining tasks.',
    },
  });

  await prisma.prismInsight.create({
    data: {
      type: 'CHURN_PREDICTION',
      title: 'High Churn Alert: Solaria Energy',
      description: 'Solaria Energy shows decreased project engagement, delayed approvals, and an outstanding invoice overdue by 18 days. Churn risk forecast stands at 68%.',
      score: 68,
      metric: 'CHURN_RISK',
      riskLevel: 'HIGH',
      actionableStep: 'Schedule client success alignment meeting and offer retainer adjustments.',
    },
  });

  // 13. Ask Prism Messages
  await prisma.askPrismMessage.create({
    data: {
      role: 'USER',
      content: 'Summarize the agency health and highlight profit leaks.',
      userId: user1.id,
    },
  });

  await prisma.askPrismMessage.create({
    data: {
      role: 'ASSISTANT',
      content: 'Lohith, the Agency Health Score stands at a strong **84/100**. Our primary profit leak is in contractor over-allocations on Vortex Retail projects ($2,800/mo) and unoptimized SaaS subscription redundancies ($1,400/mo). I recommend reassigning internal designers and auditing tool licenses.',
      userId: user1.id,
    },
  });

  // 14. Meta Campaigns & Ads Seeding
  console.log('Seeding Meta Campaigns...');
  const camp1 = await prisma.metaCampaign.create({
    data: {
      campaignId: 'act_109283741_camp_99801',
      name: 'Conversion Campaign - Q2 Lead Gen',
      status: 'ACTIVE',
      objective: 'OUTCOME_LEADS',
      dailyBudget: 150.00,
      orgId: org.id
    }
  });

  const camp2 = await prisma.metaCampaign.create({
    data: {
      campaignId: 'act_109283741_camp_99802',
      name: 'Brand Awareness - Reels Campaign',
      status: 'ACTIVE',
      objective: 'OUTCOME_AWARENESS',
      dailyBudget: 100.00,
      orgId: org.id
    }
  });

  const camp3 = await prisma.metaCampaign.create({
    data: {
      campaignId: 'act_109283741_camp_99803',
      name: 'Direct Engagement - Chat Pipeline',
      status: 'PAUSED',
      objective: 'OUTCOME_ENGAGEMENT',
      dailyBudget: 50.00,
      orgId: org.id
    }
  });

  console.log('Seeding Meta Ads...');
  const ad1 = await prisma.metaAd.create({
    data: {
      adId: 'act_109283741_ad_9981273',
      name: 'Meta Conversion Campaign - Summer Promo',
      status: 'ACTIVE',
      spend: 1250.00,
      leadsCount: 45,
      reach: 25000,
      impressions: 38000,
      clicks: 1200,
      platform: 'FACEBOOK',
      campaignId: camp1.id,
      orgId: org.id,
    }
  });

  const ad2 = await prisma.metaAd.create({
    data: {
      adId: 'act_109283741_ad_9981274',
      name: 'Instagram Reels Ad - Brand Launch',
      status: 'ACTIVE',
      spend: 850.00,
      leadsCount: 28,
      reach: 18500,
      impressions: 22000,
      clicks: 950,
      platform: 'INSTAGRAM',
      campaignId: camp2.id,
      orgId: org.id,
    }
  });

  const ad3 = await prisma.metaAd.create({
    data: {
      adId: 'act_109283741_ad_9981275',
      name: 'Messenger Direct - Chat Leadgen',
      status: 'PAUSED',
      spend: 450.00,
      leadsCount: 12,
      reach: 6200,
      impressions: 8500,
      clicks: 350,
      platform: 'MESSENGER',
      campaignId: camp3.id,
      orgId: org.id,
    }
  });

  const ad4 = await prisma.metaAd.create({
    data: {
      adId: 'act_109283741_ad_9981276',
      name: 'Facebook Feed - Enterprise Suite Video',
      status: 'ACTIVE',
      spend: 2400.00,
      leadsCount: 89,
      reach: 45000,
      impressions: 62000,
      clicks: 2800,
      platform: 'FACEBOOK',
      campaignId: camp1.id,
      orgId: org.id,
    }
  });

  // 15. Meta Leads Seeding
  await prisma.metaLead.create({
    data: {
      leadId: 'ld_9812301928301',
      adId: ad1.adId,
      adName: ad1.name,
      fullName: 'Sarah Jenkins',
      email: 'sarah@aethertech.com',
      phone: '+1-555-0199',
      status: 'new',
      createdTime: new Date('2026-06-18T10:30:00Z'),
      orgId: org.id,
    }
  });

  await prisma.metaLead.create({
    data: {
      leadId: 'ld_9812301928302',
      adId: ad1.adId,
      adName: ad1.name,
      fullName: 'Marcus Thorne',
      email: 'marcus.t@vertex.retail',
      phone: '+1-555-0182',
      status: 'cold-call in progress',
      createdTime: new Date('2026-06-18T14:45:00Z'),
      orgId: org.id,
    }
  });

  await prisma.metaLead.create({
    data: {
      leadId: 'ld_9812301928303',
      adId: ad2.adId,
      adName: ad2.name,
      fullName: 'Elena Rostova',
      email: 'elena@pulsemedia.io',
      phone: '+1-555-0174',
      status: 'call back required',
      createdTime: new Date('2026-06-19T09:15:00Z'),
      orgId: org.id,
    }
  });

  await prisma.metaLead.create({
    data: {
      leadId: 'ld_9812301928304',
      adId: ad4.adId,
      adName: ad4.name,
      fullName: 'David Vance',
      email: 'vance@quantum.cap',
      phone: '+1-555-0165',
      status: 'closed',
      createdTime: new Date('2026-06-19T16:20:00Z'),
      orgId: org.id,
    }
  });

  await prisma.metaLead.create({
    data: {
      leadId: 'ld_9812301928305',
      adId: ad1.adId,
      adName: ad1.name,
      fullName: 'Aria Montgomery',
      email: 'aria@aethertech.com',
      phone: '+1-555-0155',
      status: 'new',
      createdTime: new Date('2026-06-20T08:05:00Z'),
      orgId: org.id,
    }
  });

  await prisma.metaLead.create({
    data: {
      leadId: 'ld_9812301928306',
      adId: ad3.adId,
      adName: ad3.name,
      fullName: 'John Doe',
      email: 'john.doe@unknown.com',
      phone: '+1-555-0144',
      status: 'unqualified',
      createdTime: new Date('2026-06-20T11:50:00Z'),
      orgId: org.id,
    }
  });

  await prisma.metaLead.create({
    data: {
      leadId: 'ld_9812301928307',
      adId: ad2.adId,
      adName: ad2.name,
      fullName: 'Chloe Frazer',
      email: 'chloe@pulsemedia.io',
      phone: '+1-555-0133',
      status: 'cold-call in progress',
      createdTime: new Date('2026-06-20T14:10:00Z'),
      orgId: org.id,
    }
  });

  await prisma.metaLead.create({
    data: {
      leadId: 'ld_9812301928308',
      adId: ad4.adId,
      adName: ad4.name,
      fullName: 'Nathan Drake',
      email: 'nate@vertex.retail',
      phone: '+1-555-0122',
      status: 'closed',
      createdTime: new Date('2026-06-20T15:30:00Z'),
      orgId: org.id,
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
