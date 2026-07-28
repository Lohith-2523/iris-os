import 'dotenv/config';
import { PrismaClient, type Client } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Clearing database tables...');
  
  // Delete in reverse order of foreign keys
  await prisma.clientInvite.deleteMany({});
  await prisma.memberInvite.deleteMany({});
  await prisma.scheduledPost.deleteMany({});
  await prisma.askPrismMessage.deleteMany({});
  await prisma.prismChatSession.deleteMany({});
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
  await prisma.projectStage.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.contact.deleteMany({});
  await prisma.taskComment.deleteMany({});
  await prisma.taskUpdate.deleteMany({});
  await prisma.clientTask.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organizationOnboardingState.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.metaLead.deleteMany({});
  await prisma.metaAd.deleteMany({});
  await prisma.metaCampaign.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.organization.deleteMany({});

  console.log('Seeding database...');

  // 1. Organization
  const org = await prisma.organization.create({
    data: {
      name: 'Apex Creative Group',
      plan: 'PRO',
      hasAddon: false,
      agencyTypes: ['Digital Marketing Agency', 'SEO Agency'],
      billingEmail: 'billing@apex.co',
      legalEntityName: 'Apex Creative Group Private Limited',
      billingAddressLine1: '100 Residency Road',
      billingCity: 'Bengaluru',
      billingState: 'Karnataka',
      billingPostalCode: '560025',
      billingCountry: 'India',
      gstNumber: '29ABCDE1234F1Z5',
      preferences: { dateFormat: 'MMM d, yyyy', timezone: 'Asia/Calcutta' },
      onboardingState: { create: { needsOnboarding: false, completedAt: new Date() } },
    },
  });

  const shardsOrg = await prisma.organization.create({
    data: {
      name: 'Shards Media',
      plan: 'PRO',
      hasAddon: false,
      agencyTypes: ['Digital Marketing Agency'],
      billingEmail: 'shardsmedia.ai@gmail.com',
      onboardingState: { create: { needsOnboarding: false, completedAt: new Date() } },
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
      name: 'Lohith Sundar',
      username: 'lohith_apex',
      role: 'admin', // Executive CEO
      avatarUrl: '/avatars/lohith.png',
      orgId: org.id,
    },
  });

  const shardsUser = await prisma.user.create({
    data: {
      email: 'shardsmedia.ai@gmail.com',
      name: 'Tarun Dayanand',
      role: 'admin',
      orgId: shardsOrg.id,
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'sarah.chen@apex.co',
      name: 'Sarah Chen',
      role: 'admin', // Operations Lead
      avatarUrl: '/avatars/sarah.png',
      orgId: org.id,
    },
  });

  const user3 = await prisma.user.create({
    data: {
      email: 'marcus.a@apex.co',
      name: 'Marcus Aurelius',
      role: 'admin', // Creative Director
      avatarUrl: '/avatars/marcus.png',
      orgId: org.id,
    },
  });

  const user4 = await prisma.user.create({
    data: {
      email: 'elena.r@apex.co',
      name: 'Elena Rostova',
      role: 'admin', // Financial Director
      avatarUrl: '/avatars/elena.png',
      orgId: org.id,
    },
  });

  const user5 = await prisma.user.create({
    data: {
      email: 'david.k@apex.co',
      name: 'David Kim',
      role: 'member', // Lead Designer / Member
      avatarUrl: '/avatars/david.png',
      orgId: org.id,
    },
  });

  const testMember = await prisma.user.create({
    data: {
      email: 'member@apex.co',
      name: 'Test Member',
      role: 'member',
      phone: '+91 99999 88888',
      agencyTypes: ['Digital Marketing Agency', 'SEO Agency'],
      orgId: org.id,
    },
  });

  const user6 = await prisma.user.create({
    data: {
      email: 'sophie.d@client.co',
      name: 'Sophie Dubois',
      role: 'client',
      avatarUrl: '/avatars/sophie.png',
      orgId: org.id,
    },
  });

  const userClientNew = await prisma.user.create({
    data: {
      email: 'client_new@client.co',
      name: 'New Client',
      role: 'client',
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

  const clients: Client[] = [];
  for (const c of clientNames) {
    const clientIndex: number = clients.length;
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
        legalEntityName: c.name,
        billingAddressLine1: `${100 + clientIndex} Market Street`,
        billingCity: 'Bengaluru',
        billingState: 'Karnataka',
        billingPostalCode: `5600${String(10 + clientIndex).padStart(2, '0')}`,
        billingCountry: 'India',
        orgId: org.id,
        adAccountId: c.name === 'Aether Technologies' ? 'act_109283741' : null,
        metadata: {
          assignedTeamMemberId: 
            c.name === 'Aether Technologies' ? user3.id : 
            (c.name === 'Vertex Retail' || c.name === 'Solaria Energy') ? user2.id : 
            (c.name === 'Pulse Media' || c.name === 'Onyx Logistics' || c.name === 'Nebula Creative Studio') ? user5.id : 
            user1.id
        }
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

  // 4b. Associate user6 and client_new to Aether Technologies and seed ScheduledPosts
  const aetherClient = clients.find(c => c.name === 'Aether Technologies');
  if (aetherClient) {
    await prisma.user.update({
      where: { email: 'sophie.d@client.co' },
      data: { clientId: aetherClient.id }
    });

    await prisma.user.update({
      where: { email: 'client_new@client.co' },
      data: { clientId: aetherClient.id }
    });

    console.log('Seeding scheduled posts...');
    await prisma.scheduledPost.create({
      data: {
        platform: ['instagram', 'facebook'],
        postType: 'carousel',
        caption: '🚀 Elevate your marketing funnel with Iris OS integrations! Synced design pipelines from Canva straight to Meta campaign layouts. Learn how David Kim optimizes creative performance in seconds. #Agencies #CreativeOperations',
        mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60',
        status: 'PUBLISHED',
        scheduledAt: new Date('2026-06-25T14:30:00Z'),
        clientId: aetherClient.id,
      }
    });

    await prisma.scheduledPost.create({
      data: {
        platform: ['instagram'],
        postType: 'reel',
        caption: 'Watch Sarah execute high-fidelity profit leak audits using Prism AI! 📊💸 Recover up to $2,800/mo in contractor allocations in just three clicks. Full tutorial in bio!',
        mediaUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=500&auto=format&fit=crop&q=60',
        status: 'PUBLISHED',
        scheduledAt: new Date('2026-06-24T18:00:00Z'),
        clientId: aetherClient.id,
      }
    });

    await prisma.scheduledPost.create({
      data: {
        platform: ['facebook'],
        postType: 'story',
        caption: 'We are hiring a Senior UI Designer to join our Apex Creative team! Send applications over or tag a friend. Apply by July 15.',
        mediaUrl: 'https://images.unsplash.com/photo-1542744094-3a31f103e35f?w=500&auto=format&fit=crop&q=60',
        status: 'SCHEDULED',
        scheduledAt: new Date('2026-06-28T09:00:00Z'),
        clientId: aetherClient.id,
      }
    });

    await prisma.scheduledPost.create({
      data: {
        platform: ['instagram', 'facebook'],
        postType: 'photo',
        caption: 'Quick insight audit of our recent Aether Campaign: 4.8x ROI driven by custom target lookalikes! Optimization in progress.',
        mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60',
        status: 'SCHEDULED',
        scheduledAt: new Date('2026-06-26T15:00:00Z'),
        clientId: aetherClient.id,
      }
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
    const isOneTimePayment = i % 4 === 0;

    const project = await prisma.project.create({
      data: {
        name: `${client.name} - ${template.name}`,
        status: template.status,
        startDate: startDate,
        endDate: endDate,
        progress: template.progress,
        riskLevel: template.riskLevel,
        riskDescription: template.riskDescription || null,
        budget: 4000 + (i * 250),
        paymentType: isOneTimePayment ? 'ONE_TIME' : 'RETAINER',
        paymentAmount: isOneTimePayment ? 12000 + (i * 500) : 3500 + (i * 175),
        paymentFrequency: isOneTimePayment ? null : 'monthly',
        paymentStartDate: startDate,
        paymentTerms: isOneTimePayment ? 'DUE_ON_RECEIPT' : 'NET_30',
        orgId: org.id,
        clientId: client.id,
      },
    });
    projects.push(project);

    // Create Project Members
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
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
      const project = projects.find((candidate) => candidate.clientId === client.id)!;
      const amount = monthlyRevenues[m] / 3;
      const paidAmount = m === 0 ? 0 : amount;
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-2026-${m}-${j}`,
          description: project.name,
          subtotal: amount,
          amount,
          paidAmount,
          dueDate: date,
          status: m === 0 ? 'UNPAID' : 'FULLY_PAID',
          deliveryStatus: 'SENT',
          sentAt: date,
          pdfGeneratedAt: date,
          emailRecipient: `contact@${client.domain || 'example.com'}`,
          sellerSnapshot: {
            name: org.name,
            legalEntityName: org.legalEntityName,
            email: org.billingEmail,
            addressLine1: org.billingAddressLine1,
            addressLine2: '',
            city: org.billingCity,
            state: org.billingState,
            postalCode: org.billingPostalCode,
            country: org.billingCountry,
            gstNumber: org.gstNumber,
          },
          buyerSnapshot: {
            name: client.name,
            legalEntityName: client.legalEntityName,
            email: `contact@${client.domain || 'example.com'}`,
            addressLine1: client.billingAddressLine1,
            addressLine2: '',
            city: client.billingCity,
            state: client.billingState,
            postalCode: client.billingPostalCode,
            country: client.billingCountry,
            gstNumber: '',
          },
          lineItems: [{ description: project.name, quantity: 1, unitPrice: amount, amount }],
          orgId: org.id,
          clientId: client.id,
          projectId: project.id,
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
        orgId: org.id,
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
    { provider: 'STRIPE', status: 'CONNECTED', syncLogs: 'Synced subscription events, active webhooks verified' },
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
      name: 'Invoice Alert Email Sync',
      description: 'Send email alert when a new invoice is issued.',
      trigger: 'Invoice Created',
      action: 'Email Notification Dispatch',
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
      logs: 'Email dispatch payload sent successfully. Code 200 OK.',
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
      orgId: org.id,
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
      orgId: org.id,
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
      orgId: org.id,
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
      orgId: org.id,
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
      orgId: org.id,
    },
  });

  // 13. Ask Prism Messages
  await prisma.askPrismMessage.create({
    data: {
      role: 'USER',
      content: 'Summarize the agency health and highlight profit leaks.',
      userId: user1.id,
      orgId: org.id,
    },
  });

  await prisma.askPrismMessage.create({
    data: {
      role: 'ASSISTANT',
      content: 'Lohith, the Agency Health Score stands at a strong **84/100**. Our primary profit leak is in contractor over-allocations on Vortex Retail projects ($2,800/mo) and unoptimized SaaS subscription redundancies ($1,400/mo). I recommend reassigning internal designers and auditing tool licenses.',
      userId: user1.id,
      orgId: org.id,
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
      status: 'procured',
      createdTime: new Date('2026-06-18T10:30:00Z'),
      collectionMethod: 'Facebook Lead Form',
      approachMethod: 'Cold Email',
      funnelName: 'Aether Enterprise Funnel',
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
      status: 'warm',
      createdTime: new Date('2026-06-18T14:45:00Z'),
      collectionMethod: 'LinkedIn InMail',
      approachMethod: 'LinkedIn message',
      funnelName: 'Vertex Direct Outbound',
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
      status: 'cold',
      createdTime: new Date('2026-06-19T09:15:00Z'),
      collectionMethod: 'Website Chatbot',
      approachMethod: 'Cold Call',
      funnelName: 'AI Assistant Conversational Funnel',
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
      collectionMethod: 'Direct Outreach',
      approachMethod: 'Cold Call',
      funnelName: 'Outbound Lead List',
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
      status: 'procured',
      createdTime: new Date('2026-06-20T08:05:00Z'),
      collectionMethod: 'Facebook Lead Form',
      approachMethod: 'Cold Email',
      funnelName: 'Aether Enterprise Funnel',
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
      status: 'lost',
      createdTime: new Date('2026-06-20T11:50:00Z'),
      collectionMethod: 'Website Chatbot',
      approachMethod: 'Cold Email',
      funnelName: 'AI Assistant Conversational Funnel',
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
      status: 'warm',
      createdTime: new Date('2026-06-20T14:10:00Z'),
      collectionMethod: 'Website Chatbot',
      approachMethod: 'Cold Call',
      funnelName: 'AI Assistant Conversational Funnel',
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
      collectionMethod: 'LinkedIn InMail',
      approachMethod: 'Cold Call',
      funnelName: 'Vertex Direct Outbound',
      orgId: org.id,
    }
  });

  console.log('Seeding Projects and Project Members...');
  // Find clients
  const aether = clients.find(c => c.name === 'Aether Technologies');
  const vertex = clients.find(c => c.name === 'Vertex Retail');
  const solaria = clients.find(c => c.name === 'Solaria Energy');
  const pulse = clients.find(c => c.name === 'Pulse Media');

  // Create Projects
  let projAether: any, projVertex: any, projSolaria: any, projPulse: any;
  let stageAether1: any, stageAether2: any, stageAether3: any;
  let stageVertex1: any, stageVertex2: any, stageVertex3: any;
  let stageSolaria1: any, stageSolaria2: any;
  let stagePulse1: any, stagePulse2: any;

  if (aether) {
    projAether = await prisma.project.create({
      data: {
        name: 'Aether Summer Growth Campaign',
        status: 'IN_PROGRESS',
        startDate: new Date('2026-07-01T00:00:00Z'),
        endDate: new Date('2026-09-30T23:59:59Z'),
        progress: 50,
        riskLevel: 'LOW',
        timeline: 'Jul 1 - Sep 30, 2026',
        serviceLine: 'Paid Ads & CRO',
        budget: 15000,
        orgId: org.id,
        clientId: aether.id,
      }
    });

    // Project Members
    await prisma.projectMember.create({ data: { projectId: projAether.id, userId: user3.id } }); // Marcus
    await prisma.projectMember.create({ data: { projectId: projAether.id, userId: user2.id } }); // Sarah
    await prisma.projectMember.create({ data: { projectId: projAether.id, userId: user1.id } }); // Lohith

    // Stages
    stageAether1 = await prisma.projectStage.create({
      data: {
        name: 'Strategy & Creative Brief',
        position: 0,
        startDate: new Date('2026-07-01T00:00:00Z'),
        endDate: new Date('2026-07-31T23:59:59Z'),
        projectId: projAether.id
      }
    });
    stageAether2 = await prisma.projectStage.create({
      data: {
        name: 'Asset Design & Development',
        position: 1,
        startDate: new Date('2026-08-01T00:00:00Z'),
        endDate: new Date('2026-08-31T23:59:59Z'),
        projectId: projAether.id
      }
    });
    stageAether3 = await prisma.projectStage.create({
      data: {
        name: 'Ad Launch & Optimization',
        position: 2,
        startDate: new Date('2026-09-01T00:00:00Z'),
        endDate: new Date('2026-09-30T23:59:59Z'),
        projectId: projAether.id
      }
    });
  }

  if (vertex) {
    projVertex = await prisma.project.create({
      data: {
        name: 'Vertex E-commerce Launch',
        status: 'IN_PROGRESS',
        startDate: new Date('2026-06-01T00:00:00Z'),
        endDate: new Date('2026-08-31T23:59:59Z'),
        progress: 60,
        riskLevel: 'MEDIUM',
        timeline: 'Jun 1 - Aug 31, 2026',
        serviceLine: 'Web Dev & Shopify',
        budget: 25000,
        orgId: org.id,
        clientId: vertex.id,
      }
    });

    await prisma.projectMember.create({ data: { projectId: projVertex.id, userId: user2.id } }); // Sarah
    await prisma.projectMember.create({ data: { projectId: projVertex.id, userId: user5.id } }); // David

    // Stages
    stageVertex1 = await prisma.projectStage.create({
      data: {
        name: 'Store Audit & Planning',
        position: 0,
        startDate: new Date('2026-06-01T00:00:00Z'),
        endDate: new Date('2026-06-30T23:59:59Z'),
        projectId: projVertex.id
      }
    });
    stageVertex2 = await prisma.projectStage.create({
      data: {
        name: 'Theme Setup & Development',
        position: 1,
        startDate: new Date('2026-07-01T00:00:00Z'),
        endDate: new Date('2026-07-31T23:59:59Z'),
        projectId: projVertex.id
      }
    });
    stageVertex3 = await prisma.projectStage.create({
      data: {
        name: 'UAT & Launch',
        position: 2,
        startDate: new Date('2026-08-01T00:00:00Z'),
        endDate: new Date('2026-08-31T23:59:59Z'),
        projectId: projVertex.id
      }
    });
  }

  if (solaria) {
    projSolaria = await prisma.project.create({
      data: {
        name: 'Solaria Keyword Expansion & SEO',
        status: 'IN_PROGRESS',
        startDate: new Date('2026-06-15T00:00:00Z'),
        endDate: new Date('2026-12-15T23:59:59Z'),
        progress: 20,
        riskLevel: 'HIGH',
        timeline: 'Jun 15 - Dec 15, 2026',
        serviceLine: 'SEO Audits & Optimization',
        budget: 12000,
        orgId: org.id,
        clientId: solaria.id,
      }
    });

    await prisma.projectMember.create({ data: { projectId: projSolaria.id, userId: user2.id } }); // Sarah

    // Stages
    stageSolaria1 = await prisma.projectStage.create({
      data: {
        name: 'Keyword Audit',
        position: 0,
        startDate: new Date('2026-06-15T00:00:00Z'),
        endDate: new Date('2026-09-15T23:59:59Z'),
        projectId: projSolaria.id
      }
    });
    stageSolaria2 = await prisma.projectStage.create({
      data: {
        name: 'SEO Implementation',
        position: 1,
        startDate: new Date('2026-09-16T00:00:00Z'),
        endDate: new Date('2026-12-15T23:59:59Z'),
        projectId: projSolaria.id
      }
    });
  }

  if (pulse) {
    projPulse = await prisma.project.create({
      data: {
        name: 'Pulse Rebranding Playbook',
        status: 'IN_PROGRESS',
        startDate: new Date('2026-05-01T00:00:00Z'),
        endDate: new Date('2026-07-15T23:59:59Z'),
        progress: 80,
        riskLevel: 'LOW',
        timeline: 'May 1 - Jul 15, 2026',
        serviceLine: 'Brand Guidelines & Video',
        budget: 9500,
        orgId: org.id,
        clientId: pulse.id,
      }
    });

    await prisma.projectMember.create({ data: { projectId: projPulse.id, userId: user5.id } }); // David

    // Stages
    stagePulse1 = await prisma.projectStage.create({
      data: {
        name: 'Brand Discovery & Guidelines',
        position: 0,
        startDate: new Date('2026-05-01T00:00:00Z'),
        endDate: new Date('2026-06-07T23:59:59Z'),
        projectId: projPulse.id
      }
    });
    stagePulse2 = await prisma.projectStage.create({
      data: {
        name: 'Social Media Concept Storyboards',
        position: 1,
        startDate: new Date('2026-06-08T00:00:00Z'),
        endDate: new Date('2026-07-15T23:59:59Z'),
        projectId: projPulse.id
      }
    });
  }

  console.log('Seeding Client Tasks, Updates, and Comments...');

  if (aether && projAether) {
    const task1 = await prisma.clientTask.create({
      data: {
        title: 'Design Summer Banner Ads',
        description: 'Create social square and landscape banners for Summer relaunch.',
        status: 'COMPLETED',
        progress: 100,
        timeline: 'Jul 1 - Jul 10',
        deadline: new Date('2026-07-10T17:00:00Z'),
        update: 'Assets approved by client and uploaded to Canva Hub.',
        clientId: aether.id,
        projectId: projAether.id,
        stageId: stageAether1.id,
        assignedToId: user3.id, // Marcus
      }
    });

    // Task Updates
    await prisma.taskUpdate.create({ data: { content: 'Initial moodboards created and reviewed.', taskId: task1.id, createdAt: new Date('2026-06-28T10:00:00Z') } });
    await prisma.taskUpdate.create({ data: { content: 'Version 1 creatives uploaded to Figma.', taskId: task1.id, createdAt: new Date('2026-06-29T14:30:00Z') } });

    // Task Comments
    await prisma.taskComment.create({ data: { content: 'Can we try a warmer color palette for the main CTA?', taskId: task1.id, userId: user6.id, createdAt: new Date('2026-06-29T16:00:00Z') } }); // Sophie (client)
    await prisma.taskComment.create({ data: { content: 'Updated the CTA buttons to amber. Looks great.', taskId: task1.id, userId: user3.id, createdAt: new Date('2026-06-29T18:00:00Z') } }); // Marcus

    const task2 = await prisma.clientTask.create({
      data: {
        title: 'Optimize landing page conversion funnel',
        description: 'Analyze user drop-offs and test CTA copy variations.',
        status: 'IN_PROGRESS',
        progress: 65,
        timeline: 'Jul 10 - Jul 25',
        deadline: new Date('2026-07-25T17:00:00Z'),
        update: 'Currently testing 3 different button styles. Bounce rate decreased by 4%.',
        clientId: aether.id,
        projectId: projAether.id,
        stageId: stageAether2.id,
        assignedToId: user3.id, // Marcus
      }
    });

    await prisma.taskUpdate.create({ data: { content: 'A/B testing tools configured on Webflow.', taskId: task2.id, createdAt: new Date('2026-06-27T09:00:00Z') } });
    await prisma.taskUpdate.create({ data: { content: 'Gathering clickmap data on the primary hero section.', taskId: task2.id, createdAt: new Date('2026-06-29T11:00:00Z') } });
    await prisma.taskComment.create({ data: { content: 'Bounce rate dropped by 4.2% since yesterday.', taskId: task2.id, userId: user3.id, createdAt: new Date('2026-06-30T10:00:00Z') } });

    const task3 = await prisma.clientTask.create({
      data: {
        title: 'Set up Facebook Lead Ads campaign',
        description: 'Draft ad sets targeting tech founders and set daily budgets.',
        status: 'BLOCKED',
        progress: 40,
        timeline: 'Jul 15 - Jul 30',
        deadline: new Date('2026-07-30T17:00:00Z'),
        blocker: 'Waiting for client to authorize ad account budgets.',
        update: 'Ad copies drafted and sandbox tested. Ready to publish.',
        clientId: aether.id,
        projectId: projAether.id,
        stageId: stageAether3.id,
        assignedToId: user1.id, // Lohith
      }
    });

    // Seeding Carry-over Handover Task Chain
    const parentTask = await prisma.clientTask.create({
      data: {
        title: 'Shoot Aether Promo Video',
        description: 'Raw video footage shoot for promotional summer marketing.',
        status: 'COMPLETED',
        progress: 100,
        timeline: 'Jun 20 - Jun 25',
        deadline: new Date('2026-06-25T17:00:00Z'),
        outputUrl: 'https://drive.google.com/drive/folders/aether-promo-raw-assets',
        carryOverComment: 'Raw footage shot in 4K 60fps. Ready for editing. Handing over to Marcus for editing and branding overlays.',
        clientId: aether.id,
        projectId: projAether.id,
        stageId: stageAether1.id,
        assignedToId: user5.id, // David Kim (Videographer)
      }
    });

    const childTask = await prisma.clientTask.create({
      data: {
        title: 'Edit Aether Promo Video - Handover',
        description: 'Edit raw footage, apply color grading and summer branding overlays.',
        status: 'IN_PROGRESS',
        progress: 40,
        timeline: 'Jun 26 - Jul 05',
        deadline: new Date('2026-07-05T17:00:00Z'),
        parentTaskId: parentTask.id,
        clientId: aether.id,
        projectId: projAether.id,
        stageId: stageAether2.id,
        assignedToId: user3.id, // Marcus (Editor)
      }
    });

    await prisma.taskUpdate.create({ data: { content: 'Imported Davids raw footage. Basic cut assembly completed.', taskId: childTask.id, createdAt: new Date('2026-06-27T16:00:00Z') } });
    await prisma.taskComment.create({ data: { content: 'David, the lighting on scene 3 is beautiful. Great job!', taskId: childTask.id, userId: user3.id, createdAt: new Date('2026-06-28T09:00:00Z') } });
  }

  if (vertex && projVertex) {
    await prisma.clientTask.create({
      data: {
        title: 'Configure Shopify integration sync',
        description: 'Verify API keys and map Shopify inventory to database.',
        status: 'COMPLETED',
        progress: 100,
        timeline: 'Jun 1 - Jun 10',
        deadline: new Date('2026-06-10T17:00:00Z'),
        update: 'Product sync pipeline connected. Logs look clean.',
        clientId: vertex.id,
        projectId: projVertex.id,
        stageId: stageVertex1.id,
        assignedToId: user2.id, // Sarah
      }
    });

    await prisma.clientTask.create({
      data: {
        title: 'Draft Q3 email newsletter campaigns',
        description: 'Draft promotional content and subject lines for Vertex Q3 collections.',
        status: 'IN_PROGRESS',
        progress: 75,
        timeline: 'Jun 20 - Jul 05',
        deadline: new Date('2026-07-05T17:00:00Z'),
        update: 'Layout design is ready. Awaiting Sarah Chen check-off.',
        clientId: vertex.id,
        projectId: projVertex.id,
        stageId: stageVertex2.id,
        assignedToId: user2.id, // Sarah
      }
    });
  }

  if (solaria && projSolaria) {
    await prisma.clientTask.create({
      data: {
        title: 'Audit Google Search Console keywords',
        description: 'Identify ranking keywords and high-priority optimization gaps.',
        status: 'IN_PROGRESS',
        progress: 20,
        timeline: 'Jun 20 - Jul 20',
        deadline: new Date('2026-07-20T17:00:00Z'),
        update: 'Extracted raw keyword data. Mapping CTR drops.',
        clientId: solaria.id,
        projectId: projSolaria.id,
        stageId: stageSolaria1.id,
        assignedToId: user2.id, // Sarah
      }
    });
  }

  if (pulse && projPulse) {
    await prisma.clientTask.create({
      data: {
        title: 'Create brand guidelines playbook',
        description: 'Establish typography and color guidelines for Pulse Media rebranding.',
        status: 'COMPLETED',
        progress: 100,
        timeline: 'May 1 - May 20',
        deadline: new Date('2026-05-20T17:00:00Z'),
        update: 'Final PDF guidelines delivered to client.',
        clientId: pulse.id,
        projectId: projPulse.id,
        stageId: stagePulse1.id,
        assignedToId: user5.id, // David
      }
    });

    await prisma.clientTask.create({
      data: {
        title: 'Develop social media video concepts',
        description: 'Storyboard 3 video reels showcasing creative staff.',
        status: 'IN_PROGRESS',
        progress: 50,
        timeline: 'Jun 10 - Jul 08',
        deadline: new Date('2026-07-08T17:00:00Z'),
        update: 'Concept 1 and 2 storyboards finished. Concept 3 outline in progress.',
        clientId: pulse.id,
        projectId: projPulse.id,
        stageId: stagePulse2.id,
        assignedToId: user5.id, // David
      }
    });
  }

  if (org) {
    console.log('Seeding Transactions...');
    await prisma.transaction.createMany({
      data: [
        {
          date: new Date('2026-06-15'),
          details: 'Retainer Payment - Aether Technologies',
          category: 'Revenue',
          type: 'NEFT',
          transactorAccount: 'aether@upi',
          yourAccount: 'ICICI Bank',
          amount: 25000,
          referenceNumber: 'TXN100001',
          comments: 'Monthly marketing retainer payment',
          orgId: org.id
        },
        {
          date: new Date('2026-06-12'),
          details: 'Retainer Payment - Vertex Retail',
          category: 'Revenue',
          type: 'NEFT',
          transactorAccount: 'vertex@upi',
          yourAccount: 'ICICI Bank',
          amount: 18500,
          referenceNumber: 'TXN100002',
          comments: 'Monthly marketing retainer payment',
          orgId: org.id
        },
        {
          date: new Date('2026-06-10'),
          details: 'SEO Retainer - Pulse Media',
          category: 'Revenue',
          type: 'IMPS',
          transactorAccount: 'pulse@upi',
          yourAccount: 'HDFC Bank',
          amount: 32000,
          referenceNumber: 'TXN100003',
          comments: 'SEO & Content marketing monthly retainer',
          orgId: org.id
        },
        {
          date: new Date('2026-05-28'),
          details: 'Social Media Setup - Solaria Energy',
          category: 'Revenue',
          type: 'NEFT',
          transactorAccount: 'solaria@upi',
          yourAccount: 'HDFC Bank',
          amount: 12000,
          referenceNumber: 'TXN100004',
          orgId: org.id
        },
        {
          date: new Date('2026-06-01'),
          details: 'Website Design - Nova BioLabs',
          category: 'Revenue',
          type: 'NEFT',
          transactorAccount: 'nova@upi',
          yourAccount: 'ICICI Bank',
          amount: 15000,
          referenceNumber: 'TXN100005',
          orgId: org.id
        },
        {
          date: new Date('2026-06-04'),
          details: 'Brand Strategy - Quantum Capital',
          category: 'Revenue',
          type: 'NEFT',
          transactorAccount: 'quantum@upi',
          yourAccount: 'ICICI Bank',
          amount: 22000,
          referenceNumber: 'TXN100006',
          orgId: org.id
        },
        {
          date: new Date('2026-06-01'),
          details: 'Office Rent',
          category: 'Expense',
          type: 'NEFT',
          transactorAccount: 'realty@upi',
          yourAccount: 'HDFC Bank',
          amount: -15000,
          referenceNumber: 'TXN900001',
          orgId: org.id
        },
        {
          date: new Date('2026-06-05'),
          details: 'AWS Cloud Hosting',
          category: 'Expense',
          type: 'Others',
          transactorAccount: 'aws-billing@amazon.com',
          yourAccount: 'HDFC Bank',
          amount: -10000,
          referenceNumber: 'TXN900002',
          comments: 'Production server infrastructure hosting charges',
          orgId: org.id
        },
        {
          date: new Date('2026-06-15'),
          details: 'Contractor Retainer (David Kim)',
          category: 'Expense',
          type: 'IMPS',
          transactorAccount: 'davidk@upi',
          yourAccount: 'ICICI Bank',
          amount: -7000,
          referenceNumber: 'TXN900003',
          comments: 'Senior design deliverables retainer',
          orgId: org.id
        },
        {
          date: new Date('2026-06-20'),
          details: 'Travel & Meals',
          category: 'Expense',
          type: 'Cash',
          transactorAccount: 'N/A',
          yourAccount: 'Cash Ledger',
          amount: -2300,
          referenceNumber: 'TXN900004',
          comments: 'Client meetings travel expenses',
          orgId: org.id
        },
        {
          date: new Date('2026-06-15'),
          details: 'Midjourney API License',
          category: 'AI Subscription',
          type: 'Others',
          transactorAccount: 'midjourney-billing@discord',
          yourAccount: 'ICICI Bank',
          amount: -360,
          referenceNumber: 'TXN950001',
          orgId: org.id
        },
        {
          date: new Date('2026-06-18'),
          details: 'Anthropic Claude Team Seat',
          category: 'AI Subscription',
          type: 'Others',
          transactorAccount: 'anthropic-billing@anthropic.com',
          yourAccount: 'ICICI Bank',
          amount: -120,
          referenceNumber: 'TXN950002',
          orgId: org.id
        },
        {
          date: new Date('2026-06-22'),
          details: 'OpenAI API Platform',
          category: 'AI Subscription',
          type: 'Others',
          transactorAccount: 'openai-billing@openai.com',
          yourAccount: 'ICICI Bank',
          amount: -15,
          referenceNumber: 'TXN950003',
          orgId: org.id
        }
      ]
    });
  }

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
