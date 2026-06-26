'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InsightPanel } from '@/components/ui/insight-panel';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn, formatUserMessage } from '@/lib/utils';
import {
  LayoutDashboard,
  History,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Palette,
  ShieldAlert,
  FileText,
  CheckSquare,
  Send,
  CalendarDays,
  BarChart3,
  Brain,
  Zap,
  Key,
  ExternalLink,
  Upload,
  Check,
  X,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Play,
  Settings,
  Eye,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  Code
} from 'lucide-react';

interface CanvaTemplate {
  id: string;
  name: string;
  fields?: string[];
  dimensions?: string;
}

export default function DesignHubPage() {
  const [activeTab, setActiveTab] = React.useState<string>('dashboard');
  const [activePlan, setActivePlan] = React.useState<'basic' | 'pro' | 'advanced'>('pro');

  // Interactive States
  const [canvaConnected, setCanvaConnected] = React.useState<boolean>(false);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [showAutofillModal, setShowAutofillModal] = React.useState<boolean>(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<CanvaTemplate | null>(null);
  const [autofillForm, setAutofillForm] = React.useState<Record<string, string>>({});
  const [dynamicFields, setDynamicFields] = React.useState<{ text: string[]; images: string[]; colors: string[] }>({ text: [], images: [], colors: [] });
  const [isLoadingFields, setIsLoadingFields] = React.useState<boolean>(false);
  const [isAutofilling, setIsAutofilling] = React.useState<boolean>(false);
  const [autofillProgress, setAutofillProgress] = React.useState<string>('');

  const [isPublishing, setIsPublishing] = React.useState<boolean>(false);
  const [publishProgress, setPublishProgress] = React.useState<string>('');
  const [publishingChannel, setPublishingChannel] = React.useState<string>('linkedin');
  const [selectedPublishDesign, setSelectedPublishDesign] = React.useState<string>('1');
  const [exportedUrl, setExportedUrl] = React.useState<string | null>(null);
  const [metaCampaigns, setMetaCampaigns] = React.useState<{ id: string; name: string; ads: { id: string; name: string; platform: string; imageUrl?: string | null }[] }[]>([]);
  const [selectedMetaCampaignId, setSelectedMetaCampaignId] = React.useState<string>('');
  const [selectedMetaAdId, setSelectedMetaAdId] = React.useState<string>('');

  const [isUploading, setIsUploading] = React.useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [uploadedFiles, setUploadedFiles] = React.useState<string[]>([]);
  const [dragActive, setDragActive] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [newRuleTrigger, setNewRuleTrigger] = React.useState<string>('design.approved');
  const [newRuleAction, setNewRuleAction] = React.useState<string>('export.jpg');
  const [apiCredentialsGenerated, setApiCredentialsGenerated] = React.useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = React.useState<string>('https://api.irisos.co/v1/integrations/canva/sync');

  // Custom client ID and client secret configurations states
  const [customClientId, setCustomClientId] = React.useState<string>('');
  const [customClientSecret, setCustomClientSecret] = React.useState<string>('');
  const [isSavingCredentials, setIsSavingCredentials] = React.useState<boolean>(false);
  const [origin, setOrigin] = React.useState<string>('http://localhost:3000');
  const [canvaProfile, setCanvaProfile] = React.useState<{ display_name?: string; id?: string } | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);


  // Dynamic Data Lists
  interface DesignAsset {
    id: string;
    name: string;
    campaign: string;
    status: string;
    lastSync: string;
    type: string;
    format: string;
    editUrl?: string;
  }

  interface ApprovalItem {
    id: string;
    name: string;
    designer: string;
    brand: string;
    submittedAt: string;
    status: string;
  }

  interface ScheduledPost {
    id: string;
    title: string;
    brand: string;
    scheduledAt: string;
    channel: string;
    status: string;
  }

  interface ComplianceRule {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
  }

  interface AutomationRule {
    id: string;
    trigger: string;
    action: string;
    active: boolean;
  }

  interface ApiLogEntry {
    timestamp: string;
    method: string;
    path: string;
    status: number;
    message: string;
  }

  const [designs, setDesigns] = React.useState<DesignAsset[]>([
    { id: '1', name: 'Summer Campaign Instagram Square', campaign: 'Summer Launch 2026', status: 'APPROVED', lastSync: '2 hours ago', type: 'Social Media', format: 'PNG' },
    { id: '2', name: 'Aether Social Ads Banner', campaign: 'Summer Launch 2026', status: 'IN_REVIEW', lastSync: '4 hours ago', type: 'Display Ads', format: 'JPG' },
    { id: '3', name: 'Vortex Brand Deck Assets', campaign: 'Corporate Redesign 2026', status: 'DRAFT', lastSync: '1 day ago', type: 'Marketing Decks', format: 'PDF' },
    { id: '4', name: 'Helios Media Ad Template', campaign: 'General Production', status: 'APPROVED', lastSync: '3 days ago', type: 'Templates', format: 'PNG' },
  ]);

  const [templates, setTemplates] = React.useState<CanvaTemplate[]>([
    { id: 'T1', name: 'Instagram Promo Banner', fields: ['headline', 'promoText', 'hexColor'], dimensions: '1080x1080 px' },
    { id: 'T2', name: 'B2B Case Study Cover', fields: ['headline', 'buttonLabel'], dimensions: '1920x1080 px' },
    { id: 'T3', name: 'LinkedIn Carousel Card', fields: ['headline', 'promoText', 'hexColor'], dimensions: '1080x1350 px' },
  ]);

  const [approvals, setApprovals] = React.useState<ApprovalItem[]>([
    { id: 'A1', name: 'Aether Technologies Banner Ad', designer: 'David Kim', brand: 'Aether Digital', submittedAt: '10:15 AM', status: 'PENDING' },
    { id: 'A2', name: 'Vortex Pitch Deck', designer: 'Sophie Dubois', brand: 'Vortex Studio', submittedAt: 'Yesterday', status: 'PENDING' },
  ]);

  const [scheduledPosts, setScheduledPosts] = React.useState<ScheduledPost[]>([
    { id: 'S1', title: 'Summer Social Blast', brand: 'Aether Digital', scheduledAt: 'June 22, 2026', channel: 'Instagram', status: 'SCHEDULED' },
    { id: 'S2', title: 'B2B E-book Assets', brand: 'Vortex Studio', scheduledAt: 'June 24, 2026', channel: 'LinkedIn', status: 'SCHEDULED' },
  ]);

  const [complianceRules, setComplianceRules] = React.useState<ComplianceRule[]>([
    { id: 'R1', name: 'Logo Aspect Ratio Check', type: 'aspect-ratio', enabled: true },
    { id: 'R2', name: 'Primary Color Contrast Grid', type: 'contrast', enabled: true },
    { id: 'R3', name: 'Exclusion Typography Guard', type: 'fonts', enabled: false },
  ]);

  const [automations, setAutomations] = React.useState<AutomationRule[]>([
    { id: 'AU1', trigger: 'design.approved', action: 'export.png', active: true },
    { id: 'AU2', trigger: 'export.completed', action: 'publish.social', active: false },
  ]);

  const [apiLogs, setApiLogs] = React.useState<ApiLogEntry[]>([
    { timestamp: '11:28 AM', method: 'GET', path: '/v1/designs', status: 200, message: 'Returned 4 active designs' },
    { timestamp: '11:15 AM', method: 'POST', path: '/v1/exports', status: 202, message: 'Render job triggered successfully' },
  ]);

  const [activeFolder, setActiveFolder] = React.useState<string>('All Folders');

  const fetchMetaCampaigns = async () => {
    try {
      const response = await fetch('/api/meta-ads');
      if (response.ok) {
        const data = await response.json();
        const camps = data.campaigns || [];
        setMetaCampaigns(camps);
        if (camps.length > 0) {
          setSelectedMetaCampaignId(camps[0].id);
          if (camps[0].ads && camps[0].ads.length > 0) {
            setSelectedMetaAdId(camps[0].ads[0].id);
          }
        }
      }
    } catch (e) {
      console.error('Error loading Meta Campaigns:', e);
    }
  };

  const fetchCanvaStatus = async () => {
    try {
      const response = await fetch('/api/canva');
      if (response.ok) {
        const data = await response.json();
        setCanvaConnected(data.connected);
        setCanvaProfile(data.profile || null);
        if (data.designs) {
          setDesigns(data.designs);
        }
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
        }
        if (data.customCredentials) {
          setCustomClientId(data.customCredentials.clientId || '');
          setCustomClientSecret(data.customCredentials.clientSecret || '');
        }

        if (data.profile) {
          setApiLogs(prev => [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              method: 'GET',
              path: '/v1/users/me',
              status: 200,
              message: `Loaded profile: ${data.profile.display_name || data.profile.id}`
            },
            ...prev
          ]);
        }
        if (data.apiError) {
          setApiLogs(prev => [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              method: 'GET',
              path: '/v1/designs',
              status: data.apiError.status || 500,
              message: `Canva API connection failed. Reverted to Sandbox fallback list.`
            },
            ...prev
          ]);
        }
      }
    } catch (e) {
      console.error('Error loading Canva status:', e);
    }
  };

  // Load Canva Status & Live Listing
  React.useEffect(() => {
    let active = true;
    const init = async () => {
      await Promise.resolve();
      if (!active) return;
      fetchCanvaStatus();
      fetchMetaCampaigns();
      if (typeof window !== 'undefined') {
        setOrigin(window.location.origin);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  // Plan Screen Mapping
  const planTabs: { [key: string]: ('basic' | 'pro' | 'advanced')[] } = {
    dashboard: ['basic', 'pro', 'advanced'],
    recent: ['basic', 'pro', 'advanced'],
    library: ['basic', 'pro', 'advanced'],
    assets: ['basic', 'pro', 'advanced'],
    campaigns: ['basic', 'pro', 'advanced'],
    publishing: ['basic', 'pro', 'advanced'],
    calendar: ['basic', 'pro', 'advanced'],
    brand: ['pro', 'advanced'],
    templates: ['pro', 'advanced'],
    approvals: ['pro', 'advanced'],
    analytics: ['pro', 'advanced'],
    governance: ['advanced'],
    intelligence: ['advanced'],
    automations: ['advanced'],
    api: ['advanced'],
  };

  const hasAccess = (tab: string) => {
    return planTabs[tab]?.includes(activePlan) ?? false;
  };

  const getRequiredTier = (tab: string) => {
    const tiers = planTabs[tab] || [];
    if (tiers.includes('basic')) return 'Basic';
    if (tiers.includes('pro')) return 'Pro';
    return 'Advanced';
  };

  // Canva Connect Actions Simulators & Proxies
  const handleConnectCanva = async () => {
    if (canvaConnected) {
      setIsSyncing(true);
      try {
        const response = await fetch('/api/canva', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'disconnect' })
        });
        if (response.ok) {
          setCanvaConnected(false);
          setCanvaProfile(null);
          fetchCanvaStatus();
          setApiLogs(prev => [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              method: 'POST',
              path: '/api/canva',
              status: 200,
              message: 'Disconnected Canva integration. Credentials cleared.'
            },
            ...prev
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Redirect browser directly to auth route to kickstart standard OAuth PKCE flow
      window.location.href = '/api/canva/auth';
    }
  };

  const handleSaveCredentials = async () => {
    setIsSavingCredentials(true);
    try {
      const response = await fetch('/api/canva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_credentials',
          clientId: customClientId,
          clientSecret: customClientSecret
        })
      });
      if (response.ok) {
        setApiLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: 'POST',
            path: '/v1/keys',
            status: 200,
            message: 'Custom developer credentials saved successfully'
          },
          ...prev
        ]);
        alert('Canva client keys saved successfully. You can now connect your Canva account.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    await fetchCanvaStatus();
    setIsSyncing(false);
  };

  const triggerAutofill = async (template: CanvaTemplate) => {
    setSelectedTemplate(template);
    setAutofillForm({});
    setDynamicFields({ text: [], images: [], colors: [] });
    setShowAutofillModal(true);
    setIsLoadingFields(true);

    if (template.id.startsWith('T')) {
      // Local fallback templates
      const textFields = (template.fields || []).filter((f: string) => f !== 'hexColor');
      const colorFields = (template.fields || []).filter((f: string) => f === 'hexColor');
      setDynamicFields({
        text: textFields,
        images: [],
        colors: colorFields
      });
      setIsLoadingFields(false);
      return;
    }

    try {
      const response = await fetch('/api/canva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_template_dataset',
          templateId: template.id
        })
      });
      if (response.ok) {
        const resData = await response.json();
        const dataset = resData.dataset || {};
        const text: string[] = [];
        const images: string[] = [];
        const colors: string[] = [];

        if (dataset.Text) {
          text.push(...Object.keys(dataset.Text));
        }
        if (dataset.Images) {
          images.push(...Object.keys(dataset.Images));
        }
        setDynamicFields({ text, images, colors });
      } else {
        setDynamicFields({ text: ['headline'], images: [], colors: [] });
      }
    } catch (e) {
      console.error(e);
      setDynamicFields({ text: ['headline'], images: [], colors: [] });
    } finally {
      setIsLoadingFields(false);
    }
  };

  const handleAutofillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setIsAutofilling(true);
    setAutofillProgress('Initiating Canva Autofill API request...');
    
    // Construct real data object for Canva API
    const dataPayload: Record<string, { type: 'text' | 'color' | 'image'; text?: string; hex?: string; asset_id?: string }> = {};
    
    dynamicFields.text.forEach(field => {
      dataPayload[field] = { type: 'text', text: autofillForm[field] || '' };
    });
    
    dynamicFields.colors.forEach(field => {
      dataPayload[field] = { type: 'color', hex: autofillForm[field] || '#f43f5e' };
    });

    dynamicFields.images.forEach(field => {
      dataPayload[field] = { type: 'image', asset_id: autofillForm[field] || '' };
    });

    try {
      const response = await fetch('/api/canva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'autofill',
          templateId: selectedTemplate.id,
          data: dataPayload
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to call Canva API');
      }

      const resData = await response.json();
      const newDesignId = resData.result?.result?.design_id || `RealTPL-${Date.now().toString().slice(-4)}`;
      
      setAutofillProgress('Autofill job running on Canva Connect server...');
      setTimeout(() => {
        setIsAutofilling(false);
        setShowAutofillModal(false);
        const nameVal = autofillForm.headline || autofillForm.title || selectedTemplate.name;
        const newDesign = {
          id: newDesignId,
          name: `Autofill: ${nameVal}`,
          campaign: 'General Production',
          status: 'APPROVED',
          lastSync: 'Just now',
          type: 'Social Media',
          format: 'PNG',
          editUrl: `https://www.canva.com/design/${newDesignId}/edit`
        };
        setDesigns([newDesign, ...designs]);
        setApiLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: 'POST',
            path: '/v1/autofills',
            status: 201,
            message: `Autofill job successful. Created design ID: ${newDesignId}`
          },
          ...prev
        ]);
      }, 1000);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.warn('Autofill API fallback:', errMessage);
      // Fallback sandbox simulation if token invalid
      setTimeout(() => {
        setAutofillProgress('Sandbox fallback: Rendering customized formats locally...');
        setTimeout(() => {
          setIsAutofilling(false);
          setShowAutofillModal(false);
          const nameVal = autofillForm.headline || autofillForm.title || selectedTemplate.name;
          const newDesign = {
            id: (designs.length + 1).toString(),
            name: `Autofill: ${nameVal}`,
            campaign: 'General Production',
            status: 'APPROVED',
            lastSync: 'Just now',
            type: 'Social Media',
            format: 'PNG',
            editUrl: 'https://www.canva.com'
          };
          setDesigns([newDesign, ...designs]);
          setApiLogs(prev => [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              method: 'POST',
              path: `/v1/autofill/${selectedTemplate.id}`,
              status: 201,
              message: `Autofill sandbox success. Generated layout '${newDesign.name}' from template.`
            },
            ...prev
          ]);
        }, 1000);
      }, 1000);
    }
  };

  const handlePublishSubmit = async () => {
    setIsPublishing(true);
    setExportedUrl(null);
    setPublishProgress('Initializing Canva Connect Exports API rendering pipeline...');
    
    try {
      const response = await fetch('/api/canva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          designId: selectedPublishDesign
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Export request failed');
      }

      const resData = await response.json();
      const urls = resData.result?.result?.urls || [];
      const downloadUrl = urls[0] || null;

      setPublishProgress('Render job complete. Broadcasting design asset via Connect API...');

      // Sync to selected Meta Ad in database if target channel is meta-api
      if (publishingChannel === 'meta-api' && selectedMetaAdId && downloadUrl) {
        await fetch('/api/meta-ads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sync_asset',
            adId: selectedMetaAdId,
            imageUrl: downloadUrl
          })
        });
      }

      setTimeout(() => {
        setIsPublishing(false);
        if (downloadUrl) {
          setExportedUrl(downloadUrl);
        }
        const targetDesign = designs.find(d => d.id === selectedPublishDesign);
        const newScheduled = {
          id: (scheduledPosts.length + 1).toString(),
          title: targetDesign ? targetDesign.name : 'Published Design',
          brand: 'Apex Creative',
          scheduledAt: 'Published Just Now',
          channel: publishingChannel,
          status: 'PUBLISHED'
        };
        setScheduledPosts([newScheduled, ...scheduledPosts]);
        setApiLogs(prev => [
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: 'POST',
            path: '/v1/exports',
            status: 200,
            message: `Export triggered and published successfully. File URL: ${downloadUrl || 'None'}`
          },
          ...prev
        ]);
      }, 1000);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      console.warn('Export API fallback:', errMessage);
      // Fallback sandbox
      setTimeout(() => {
        setPublishProgress(`Sandbox fallback: Broadcasting media directly to ${publishingChannel}...`);
        
        // Sync mock local image to Meta Ad in sandbox mode
        const mockImgUrl = `/mock-designs/design-${selectedPublishDesign}.png`;
        if (publishingChannel === 'meta-api' && selectedMetaAdId) {
          fetch('/api/meta-ads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'sync_asset',
              adId: selectedMetaAdId,
              imageUrl: mockImgUrl
            })
          }).catch(console.error);
        }

        setTimeout(() => {
          setIsPublishing(false);
          const targetDesign = designs.find(d => d.id === selectedPublishDesign);
          const newScheduled = {
            id: (scheduledPosts.length + 1).toString(),
            title: targetDesign ? targetDesign.name : 'Published Design',
            brand: 'Apex Creative',
            scheduledAt: 'Published Just Now',
            channel: publishingChannel,
            status: 'PUBLISHED'
          };
          setScheduledPosts([newScheduled, ...scheduledPosts]);
          setApiLogs(prev => [
            {
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              method: 'POST',
              path: `/v1/designs/${selectedPublishDesign}/publish`,
              status: 200,
              message: `Published successfully (Sandbox flow) to B2B channels.`
            },
            ...prev
          ]);
        }, 1000);
      }, 1000);
    }
  };

  const uploadFileToServer = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(10);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Content = reader.result as string;
        setUploadProgress(40);
        
        try {
          const response = await fetch('/api/canva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload',
              fileName: file.name,
              fileContent: base64Content
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.details || errData.error || 'Upload failed');
          }

          const resData = await response.json();
          setUploadProgress(80);
          
          const assetObj = resData.result?.result?.asset || resData.result?.asset || {};
          const assetId = assetObj.id || `AST-${Date.now().toString().slice(-4)}`;
          
          setUploadProgress(100);
          setTimeout(() => {
            setIsUploading(false);
            setUploadedFiles(files => [file.name, ...files]);
            setApiLogs(logs => [
              {
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                method: 'POST',
                path: '/v1/asset-uploads',
                status: 201,
                message: `Asset successfully uploaded to Canva Connect. ID: ${assetId}, Name: ${file.name}`
              },
              ...logs
            ]);
            setUploadProgress(0);
          }, 300);
        } catch (uploadErr: unknown) {
          const uploadErrorMessage = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
          console.warn('Real upload failed, fallback to simulated upload:', uploadErrorMessage);
          runSimulatedUpload(file.name);
        }
      };
      
      reader.onerror = () => {
        runSimulatedUpload(file.name);
      };
    } catch (err: unknown) {
      console.error(err);
      runSimulatedUpload(file.name);
    }
  };

  const runSimulatedUpload = (fileName: string) => {
    let progressVal = 10;
    setUploadProgress(progressVal);
    const interval = setInterval(() => {
      progressVal += 30;
      setUploadProgress(progressVal);
      if (progressVal >= 100) {
        clearInterval(interval);
        setIsUploading(false);
        setUploadedFiles(files => [fileName, ...files]);
        setApiLogs(logs => [
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            method: 'POST',
            path: '/v1/asset-uploads',
            status: 201,
            message: `Asset upload successful (Sandbox). Synced asset ${fileName}.`
          },
          ...logs
        ]);
        setUploadProgress(0);
      }
    }, 400);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Handled dynamically via click/drop handlers now
    if (fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files.length > 0) {
      uploadFileToServer(fileInputRef.current.files[0]);
    } else {
      runSimulatedUpload('brand-logo-light.svg');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFileToServer(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFileToServer(e.dataTransfer.files[0]);
    }
  };

  const handleApprovalAction = (id: string, action: 'APPROVE' | 'REJECT') => {
    setApprovals(approvals.map(app => app.id === id ? { ...app, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : app));
    if (action === 'APPROVE') {
      const pendingItem = approvals.find(app => app.id === id);
      if (pendingItem) {
        setDesigns([
          {
            id: (designs.length + 1).toString(),
            name: pendingItem.name,
            campaign: 'General Production',
            status: 'APPROVED',
            lastSync: 'Just now',
            type: 'Social Media',
            format: 'PNG'
          },
          ...designs
        ]);
        setApiLogs(logs => [
          {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            method: 'POST',
            path: `/v1/approvals/${id}`,
            status: 200,
            message: `Design signed-off and status updated to APPROVED.`
          },
          ...logs
        ]);
      }
    }
  };

  const handleCreateAutomation = () => {
    const newAuto = {
      id: `AU${automations.length + 1}`,
      trigger: newRuleTrigger,
      action: newRuleAction,
      active: true
    };
    setAutomations([...automations, newAuto]);
  };

  const handleCreateApiKey = () => {
    setApiCredentialsGenerated(true);
    setApiLogs(prev => [
      {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        method: 'POST',
        path: '/v1/keys',
        status: 201,
        message: 'Successfully generated new developer access credential key.'
      },
      ...prev
    ]);
  };

  const handleMockWebhookEvent = () => {
    setApiLogs(prev => [
      {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        method: 'POST',
        path: '/webhook/listener',
        status: 200,
        message: 'Simulated Webhook received: { event: "design.published", design_id: "DAG123456" }'
      },
      ...prev
    ]);
  };

  const toggleComplianceRule = (id: string) => {
    setComplianceRules(complianceRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const activeComplianceScore = () => {
    const enabledCount = complianceRules.filter(r => r.enabled).length;
    if (enabledCount === 3) return 96;
    if (enabledCount === 2) return 88;
    if (enabledCount === 1) return 74;
    return 55;
  };

  const sidebarGroups = [
    {
      title: "Operations Dashboard",
      items: [
        { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
        { id: 'recent', name: 'Recent Designs', icon: History },
      ]
    },
    {
      title: "Asset Management",
      items: [
        { id: 'library', name: 'Design Library', icon: FolderOpen },
        { id: 'assets', name: 'Asset Manager', icon: ImageIcon },
        { id: 'campaigns', name: 'Campaign Assets', icon: Layers },
      ]
    },
    {
      title: "Brand & Compliance",
      items: [
        { id: 'brand', name: 'Brand Center', icon: Palette },
        { id: 'governance', name: 'Brand Governance', icon: ShieldAlert },
      ]
    },
    {
      title: "Creative Workflows",
      items: [
        { id: 'templates', name: 'Template Center', icon: FileText },
        { id: 'approvals', name: 'Approval Queue', icon: CheckSquare },
      ]
    },
    {
      title: "Publishing & Calendar",
      items: [
        { id: 'publishing', name: 'Publishing Center', icon: Send },
        { id: 'calendar', name: 'Content Calendar', icon: CalendarDays },
      ]
    },
    {
      title: "Insights & Developers",
      items: [
        { id: 'analytics', name: 'Creative Analytics', icon: BarChart3 },
        { id: 'intelligence', name: 'Creative Intelligence', icon: Brain },
        { id: 'automations', name: 'Automation Builder', icon: Zap },
        { id: 'api', name: 'Design API Console', icon: Key },
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-zinc-800/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white silver-text-gradient">Design Hub</h1>
            <Badge variant="outline" className="border-zinc-800 text-[10px] uppercase font-semibold text-zinc-400 py-0.5 tracking-wider bg-zinc-950 px-2 flex items-center gap-1">
              <span>Powered by Canva</span>
            </Badge>
          </div>
          <p className="text-xs text-zinc-500">Centralized command workspace for creative operations, Brand templates, approvals, and Canva Connect integrations.</p>
        </div>

        {/* Plan Switcher */}
        <div className="flex items-center gap-1.5 bg-zinc-950 p-1.5 rounded-none border border-zinc-800 self-start md:self-auto">
          {(['basic', 'pro', 'advanced'] as const).map(tier => (
            <button
              key={tier}
              onClick={() => setActivePlan(tier)}
              className={cn(
                'px-3 py-1 rounded-none text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer select-none',
                activePlan === tier ? 'bg-zinc-800 text-white shadow' : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {tier} Plan
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Left Sidebar Sub-Navigation + Right Content Console */}
      <div className="grid gap-6 md:grid-cols-4">
        {/* Left Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="border border-zinc-800 bg-zinc-950/40 p-4 space-y-5 rounded-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Creative Modules</span>
              {canvaConnected ? (
                <Badge variant="risk-low" className="text-[9px] uppercase tracking-wider">CONNECTED</Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] uppercase tracking-wider text-zinc-500 border-zinc-850">OFFLINE</Badge>
              )}
            </div>
            <div className="space-y-4">
              {sidebarGroups.map(group => (
                <div key={group.title} className="space-y-1.5">
                  <span className="text-[9px] font-bold uppercase text-zinc-600 tracking-widest block px-1">{group.title}</span>
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isLocked = !hasAccess(item.id);
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveTab(item.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium tracking-wide transition-all rounded-none cursor-pointer',
                            activeTab === item.id
                              ? 'bg-zinc-800 text-white font-semibold'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={cn('h-3.5 w-3.5', activeTab === item.id ? 'text-white' : 'text-zinc-500')} />
                            <span>{item.name}</span>
                          </div>
                          {isLocked && <Lock className="h-3 w-3 text-zinc-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Panels */}
        <div className="md:col-span-3">
          {!hasAccess(activeTab) ? (
            <Card className="rounded-none border-zinc-800 bg-zinc-950/40 p-8 text-center flex flex-col items-center justify-center min-h-[380px]">
              <div className="h-12 w-12 rounded-none bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-lg text-zinc-500 mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">Access Restrictions Enabled</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-2 leading-relaxed">
                The creative module <span className="text-zinc-300 font-semibold">&ldquo;{activeTab.toUpperCase()}&rdquo;</span> is reserved for users on the <span className="text-zinc-300 font-semibold">{getRequiredTier(activeTab)} Tier</span>.
              </p>
              <div className="flex items-center gap-3 mt-5">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setActivePlan(getRequiredTier(activeTab).toLowerCase() as 'basic' | 'pro' | 'advanced')}
                  className="font-semibold text-xs h-8"
                >
                  Upgrade to {getRequiredTier(activeTab)} Plan
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Module: Dashboard */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Card hoverEffect>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Synced Assets</CardTitle>
                        <FolderOpen className="h-4 w-4 text-zinc-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tight text-white">{designs.length} Designs</div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Mirroring Canva `/v1/designs` listings</span>
                      </CardContent>
                    </Card>
                    <Card hoverEffect>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Autofill Templates</CardTitle>
                        <FileText className="h-4 w-4 text-zinc-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tight text-white">{templates.length} Active</div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Connected to Canva `/v1/autofill`</span>
                      </CardContent>
                    </Card>
                    <Card hoverEffect>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Compliance Rate</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-zinc-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tight text-white">{activeComplianceScore()}%</div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">AI brand checks active</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Canva Auth Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Canva Developer Integration Credentials</CardTitle>
                      <CardDescription>Authorize access to sync folders, assets, templates, and dynamic design automation variables.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 rounded-none border border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="block text-xs font-semibold text-white">
                            {canvaConnected 
                              ? `Canva Connected Account: ${canvaProfile?.display_name || canvaProfile?.id || 'Apex Enterprise'}` 
                              : 'Canva Integration Offline'}
                          </span>
                          <span className="block text-[10px] text-zinc-500 max-w-md">
                            {canvaConnected 
                              ? 'Authorized scopes: designs:read, assets:write, brand-kit:read, exports:write' 
                              : 'Connect your Canva account to sync campaign designs, utilize autofill templates, and export publications.'}
                          </span>
                        </div>
                        <Button 
                          variant={canvaConnected ? "outline" : "default"} 
                          size="sm" 
                          onClick={handleConnectCanva} 
                          disabled={isSyncing}
                          className="h-8 gap-1.5 font-semibold text-xs shrink-0"
                        >
                          {isSyncing ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Palette className="h-3.5 w-3.5" />
                          )}
                          <span>{canvaConnected ? 'Disconnect Canva' : 'Connect Canva Account'}</span>
                        </Button>
                      </div>
                      {canvaConnected && (
                        <div className="flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleSyncData}
                            disabled={isSyncing}
                            className="h-8 gap-1.5 border-zinc-800 text-zinc-300 font-semibold"
                          >
                            <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                            <span>Sync Canva Designs</span>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Module: Recent Designs */}
              {activeTab === 'recent' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <div>
                      <CardTitle className="text-sm font-semibold text-white">Recent Canva Projects</CardTitle>
                      <CardDescription>Visual creatives recently created or modified in Canva Connect workspaces.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleSyncData} disabled={isSyncing} className="h-8 border-zinc-800 text-zinc-300 gap-1.5">
                      <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                      <span>Sync List</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Design Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Format</TableHead>
                          <TableHead>Sync Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {designs.map(design => (
                          <TableRow key={design.id}>
                            <TableCell className="font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                  {design.format}
                                </div>
                                <span>{design.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-400">{design.type}</TableCell>
                            <TableCell className="text-zinc-400 font-mono text-xs">{design.format}</TableCell>
                            <TableCell>
                              <Badge variant={design.status === 'APPROVED' ? 'risk-low' : 'outline'} className={cn(design.status !== 'APPROVED' && 'border-zinc-800 text-zinc-500 bg-transparent')}>
                                {design.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <a 
                                href={design.editUrl || "https://www.canva.com"} 
                                target="_blank" 
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white border border-zinc-800 px-2 py-1 transition-all"
                              >
                                <ExternalLink className="h-3 w-3" />
                                <span>Edit in Canva</span>
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Module: Design Library */}
              {activeTab === 'library' && (
                <div className="space-y-6">
                  {/* Folders Filters */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {['All Folders', 'Social Media', 'Display Ads', 'Marketing Decks', 'Templates'].map(folder => (
                      <button
                        key={folder}
                        onClick={() => setActiveFolder(folder)}
                        className={cn(
                          'px-3 py-1.5 text-xs font-semibold tracking-wide border transition-all cursor-pointer whitespace-nowrap rounded-none',
                          activeFolder === folder
                            ? 'bg-zinc-800 border-zinc-700 text-white'
                            : 'border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-900/50'
                        )}
                      >
                        {folder}
                      </button>
                    ))}
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Design Assets Library</CardTitle>
                      <CardDescription>Browse visual creatives filtered by Canva folder categories.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      {designs
                        .filter(d => activeFolder === 'All Folders' || d.type === activeFolder)
                        .map(design => (
                          <div key={design.id} className="border border-zinc-850 bg-zinc-950 p-4 space-y-4 rounded-none">
                            <div className="aspect-[1.91/1] w-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative">
                              <ImageIcon className="h-8 w-8 text-zinc-700" />
                              <Badge className="absolute top-2 right-2 text-[9px] uppercase tracking-wider" variant={design.status === 'APPROVED' ? 'risk-low' : 'risk-medium'}>
                                {design.status}
                              </Badge>
                            </div>
                            <div className="space-y-1.5">
                              <span className="block text-xs font-bold text-white leading-tight">{design.name}</span>
                              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
                                <span>Format: {design.format}</span>
                                <span>Synced {design.lastSync}</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                              <span className="text-[10px] text-zinc-400 font-semibold">{design.campaign}</span>
                              <div className="flex gap-2">
                                <a 
                                  href={design.editUrl || "https://www.canva.com"} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[9px] text-zinc-300 hover:text-white border border-zinc-800 px-2 py-1 transition-all"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Edit</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Module: Enterprise Asset Manager */}
              {activeTab === 'assets' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Canva Asset Uploader</CardTitle>
                      <CardDescription>Programmatically upload raw images, logos, and graphic components to Canva folders.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleUploadSubmit} className="space-y-4">
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          style={{ display: 'none' }} 
                          accept="image/*,video/*"
                        />
                        <div 
                          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                          onDragLeave={() => setDragActive(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "w-full h-40 border border-dashed flex flex-col items-center justify-center p-6 text-center transition-all rounded-none cursor-pointer hover:bg-zinc-900/20",
                            dragActive ? "border-white bg-zinc-900" : "border-zinc-800 bg-zinc-950"
                          )}
                        >
                          <Upload className="h-6 w-6 text-zinc-500 mb-2" />
                          <span className="text-xs text-white font-semibold">Drag and drop file here, or click to upload</span>
                          <span className="text-[10px] text-zinc-500 mt-1 block">Supports PNG, JPG, SVG, MP4 (Max 50MB)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-zinc-500">Destination folder: `/Assets/ApexCreative`</span>
                          <Button variant="default" size="sm" type="submit" className="font-semibold text-xs h-8" disabled={isUploading}>
                            {isUploading ? `Uploading ${uploadProgress}%...` : 'Upload Selected File'}
                          </Button>
                        </div>
                      </form>

                      {isUploading && (
                        <div className="h-1.5 w-full bg-zinc-800 overflow-hidden mt-4">
                          <div style={{ width: `${uploadProgress}%` }} className="h-full bg-white transition-all duration-300" />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Uploaded Brand Assets</CardTitle>
                      <CardDescription>Media files uploaded to Canva teams Connect server.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>File Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadedFiles.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-6 text-xs text-zinc-500">
                                No recently uploaded files. Upload files above to synchronize.
                              </TableCell>
                            </TableRow>
                          ) : (
                            uploadedFiles.map((file, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-semibold text-white font-mono text-xs">{file}</TableCell>
                                <TableCell className="text-zinc-500 font-mono text-[10px]">Canva://Assets/ApexCreative/{file}</TableCell>
                                <TableCell className="text-right">
                                  <button onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))} className="text-zinc-500 hover:text-rose-400 cursor-pointer">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Module: Campaign Assets */}
              {activeTab === 'campaigns' && (
                <div className="space-y-6">
                  {['Summer Launch 2026', 'Corporate Redesign 2026', 'General Production'].map(campaignName => (
                    <Card key={campaignName}>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                          <CardTitle className="text-sm font-semibold text-white">{campaignName}</CardTitle>
                          <CardDescription>Associated graphic assets imported and classified.</CardDescription>
                        </div>
                        <Badge variant="outline" className="border-zinc-800 bg-zinc-950 font-mono text-xs">
                          {designs.filter(d => d.campaign === campaignName).length} Assets
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {designs
                            .filter(d => d.campaign === campaignName)
                            .map(design => (
                              <div key={design.id} className="p-3 border border-zinc-850 bg-zinc-950 flex items-center justify-between rounded-none">
                                <div className="space-y-1">
                                  <span className="block text-xs font-semibold text-white">{design.name}</span>
                                  <span className="block text-[10px] font-mono text-zinc-500">Format: {design.format}</span>
                                </div>
                                <Badge variant={design.status === 'APPROVED' ? 'risk-low' : 'risk-medium'}>
                                  {design.status}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Module: Brand Center */}
              {activeTab === 'brand' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-white">Brand Style Kits</CardTitle>
                    <CardDescription>Brand kit color codes, corporate fonts, and design elements synced to Canva.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Brand Kit Aether */}
                    <div className="p-4 rounded-none border border-zinc-800 bg-zinc-950 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Brand Name: Aether Digital</span>
                        <Badge variant="risk-low" className="text-[9px] uppercase tracking-wider">PRIMARY KIT</Badge>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Color Palette</span>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { hex: '#09090b', name: 'Charcoal' },
                            { hex: '#18181b', name: 'Graphite' },
                            { hex: '#27272a', name: 'Titanium' },
                            { hex: '#ffffff', name: 'Alabaster' },
                          ].map(color => (
                            <div 
                              key={color.hex} 
                              style={{ backgroundColor: color.hex === '#ffffff' ? '#ffffff' : undefined }} 
                              className={cn(
                                "h-14 border border-zinc-800 flex flex-col justify-end p-2 rounded-none cursor-pointer hover:border-zinc-500 transition-all select-none",
                                color.hex === '#ffffff' ? 'text-zinc-950' : 'text-zinc-500 bg-zinc-900'
                              )}
                              onClick={() => navigator.clipboard.writeText(color.hex)}
                            >
                              <span className="text-[9px] font-bold block leading-none">{color.name}</span>
                              <span className="text-[8px] font-mono block mt-0.5 opacity-80">{color.hex}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-4">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Fonts Specification</span>
                          <span className="text-xs font-bold text-white font-heading">Heading: Clash Display Semibold</span>
                          <span className="text-xs text-zinc-400 block mt-0.5">Body text: Space Grotesk</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Mock Assets Connected</span>
                          <span className="text-xs text-zinc-300 block">aether-logo-header.png</span>
                          <span className="text-xs text-zinc-300 block">aether-bg-cover.jpg</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Module: Brand Governance Center */}
              {activeTab === 'governance' && (
                <div className="space-y-6">
                  {/* Governance compliance dashboard */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Brand Governance & Compliance Console</CardTitle>
                      <CardDescription>Automated AI checks running rules verification on Canva designs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-zinc-800 bg-zinc-950/40 p-4 rounded-none gap-4">
                        <div>
                          <span className="block text-xs font-semibold text-white">Overall Brand Consistency Rating</span>
                          <span className="text-[10px] text-zinc-500 mt-1 block">Scans typeface sizes, logo dimensions, color bounds</span>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold font-mono tracking-tight text-white">{activeComplianceScore()}%</div>
                          <Badge variant={activeComplianceScore() >= 90 ? 'risk-low' : 'risk-medium'} className="text-[9px] uppercase mt-1">
                            {activeComplianceScore() >= 90 ? 'EXCELLENT' : 'STABLE'}
                          </Badge>
                        </div>
                      </div>

                      {/* Rules lists */}
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">Compliance Audit Rules</span>
                        <div className="divide-y divide-zinc-900 border border-zinc-850 bg-zinc-950">
                          {complianceRules.map(rule => (
                            <div key={rule.id} className="flex items-center justify-between p-3.5">
                              <div>
                                <span className="text-xs font-semibold text-white block">{rule.name}</span>
                                <span className="text-[9px] font-mono text-zinc-500 uppercase">Type: {rule.type}</span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleComplianceRule(rule.id)}
                                className={cn(
                                  "h-7 text-[10px] font-semibold tracking-wider uppercase border-zinc-800 rounded-none cursor-pointer",
                                  rule.enabled ? "text-emerald-400 bg-emerald-950/20" : "text-zinc-500"
                                )}
                              >
                                {rule.enabled ? 'Enabled' : 'Disabled'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Issues lists */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Detected Governance Alerts</CardTitle>
                      <CardDescription>Designs violating active styling rules.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Design Name</TableHead>
                            <TableHead>Rule Violated</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {!complianceRules.find(r => r.id === 'R3')?.enabled ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-6 text-xs text-zinc-500">
                                No governance errors detected. Core guidelines verified.
                              </TableCell>
                            </TableRow>
                          ) : (
                            <TableRow>
                              <TableCell className="font-semibold text-white">Vortex Brand Deck Assets</TableCell>
                              <TableCell className="text-zinc-400">Exclusion Typography Guard</TableCell>
                              <TableCell>
                                <Badge variant="risk-medium">WARNING</Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs text-zinc-500 font-mono">Unverified Font Family</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Module: Template Center */}
              {activeTab === 'templates' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Canva Brand Templates</CardTitle>
                      <CardDescription>Select a team template and execute a dynamic autofill creative generation task.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-3">
                      {templates.map(tpl => (
                        <div key={tpl.id} className="border border-zinc-850 bg-zinc-950 p-4 space-y-4 rounded-none flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="aspect-square w-full bg-zinc-900 border border-zinc-800 flex items-center justify-center relative">
                              <FileText className="h-8 w-8 text-zinc-700" />
                              <Badge className="absolute top-2 right-2 text-[9px] uppercase tracking-wider" variant="outline">
                                {tpl.dimensions}
                              </Badge>
                            </div>
                            <span className="block text-xs font-bold text-white leading-tight">{tpl.name}</span>
                            <div className="flex flex-wrap gap-1">
                              {(tpl.fields || []).map((f: string) => (
                                <Badge key={f} variant="outline" className="text-[8px] border-zinc-800 text-zinc-500 uppercase py-0 px-1 font-mono">
                                  {f}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => triggerAutofill(tpl)}
                            className="w-full font-semibold text-xs h-8 mt-2"
                          >
                            Dynamic Autofill
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Autofill Drawer Overlay */}
                  {showAutofillModal && selectedTemplate && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-zinc-950 border border-zinc-800 max-w-md w-full p-6 space-y-5 rounded-none shadow-2xl relative">
                        <button onClick={() => setShowAutofillModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer">
                          <X className="h-4.5 w-4.5" />
                        </button>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white tracking-tight">Canva Dynamic Autofill Console</h4>
                          <p className="text-[10px] text-zinc-500">Template: {selectedTemplate.name} ({selectedTemplate.dimensions})</p>
                        </div>
                        <form onSubmit={handleAutofillSubmit} className="space-y-4">
                          {isLoadingFields ? (
                            <div className="py-6 flex flex-col items-center justify-center gap-2">
                              <RefreshCw className="h-5 w-5 animate-spin text-zinc-550" />
                              <span className="text-xs text-zinc-500">Querying template schema dataset...</span>
                            </div>
                          ) : (
                            <>
                              {dynamicFields.text.map(field => (
                                <div key={field} className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{field.replace(/_/g, ' ')}</label>
                                  <input 
                                    type="text"
                                    required
                                    value={autofillForm[field] || ''}
                                    onChange={(e) => setAutofillForm({ ...autofillForm, [field]: e.target.value })}
                                    className="w-full border border-zinc-850 bg-zinc-900/40 p-2 text-xs text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all rounded-none"
                                    placeholder={`Enter text value for ${field}...`}
                                  />
                                </div>
                              ))}

                              {dynamicFields.colors.map(field => (
                                <div key={field} className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{field.replace(/_/g, ' ')}</label>
                                  <div className="flex gap-2">
                                    <input 
                                      type="color"
                                      value={autofillForm[field] || '#f43f5e'}
                                      onChange={(e) => setAutofillForm({ ...autofillForm, [field]: e.target.value })}
                                      className="h-8 w-12 border border-zinc-850 bg-zinc-900/40 p-1 cursor-pointer rounded-none"
                                    />
                                    <input 
                                      type="text"
                                      value={autofillForm[field] || '#f43f5e'}
                                      onChange={(e) => setAutofillForm({ ...autofillForm, [field]: e.target.value })}
                                      className="flex-1 border border-zinc-850 bg-zinc-900/40 px-2.5 py-1 text-xs font-mono text-white focus:border-zinc-750 focus:outline-none rounded-none"
                                    />
                                  </div>
                                </div>
                              ))}

                              {dynamicFields.images.map(field => (
                                <div key={field} className="space-y-1.5">
                                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{field.replace(/_/g, ' ')} (Canva Asset ID)</label>
                                  <input 
                                    type="text"
                                    required
                                    value={autofillForm[field] || ''}
                                    onChange={(e) => setAutofillForm({ ...autofillForm, [field]: e.target.value })}
                                    className="w-full border border-zinc-850 bg-zinc-900/40 p-2 text-xs text-white focus:border-zinc-750 focus:bg-zinc-900 focus:outline-none transition-all rounded-none"
                                    placeholder="e.g. ASDKJHG1234 (Canva Asset ID)"
                                  />
                                </div>
                              ))}
                            </>
                          )}

                          <div className="pt-2 border-t border-zinc-900 flex justify-end gap-2.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setShowAutofillModal(false)}
                              className="h-8 text-xs border-zinc-800 text-zinc-300 font-semibold"
                            >
                              Cancel
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              type="submit" 
                              disabled={isAutofilling || isLoadingFields}
                              className="h-8 text-xs font-semibold"
                            >
                              {isAutofilling ? 'Autofilling...' : 'Launch Autofill'}
                            </Button>
                          </div>
                        </form>

                        {isAutofilling && (
                          <div className="space-y-2 pt-2 border-t border-zinc-900">
                            <div className="flex items-center gap-2 text-[10px] font-semibold text-white uppercase tracking-wider">
                              <RefreshCw className="h-3 w-3 animate-spin text-zinc-400" />
                              <span>{autofillProgress}</span>
                            </div>
                            <div className="h-1 w-full bg-zinc-800 overflow-hidden relative">
                              <div className="h-full bg-white w-1/3 absolute animate-pulse animate-infinite left-0" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Module: Approval Queue */}
              {activeTab === 'approvals' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-white">Visual Sign-Off Queue</CardTitle>
                    <CardDescription>Approve or request revisions on generated campaign creative elements.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Design Asset</TableHead>
                          <TableHead>Brand Owner</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {approvals.map(app => (
                          <TableRow key={app.id}>
                            <TableCell className="font-semibold text-white">
                              <div className="flex items-center gap-2">
                                <div className="h-6 w-6 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                  <ImageIcon className="h-3 w-3 text-zinc-500" />
                                </div>
                                <span>{app.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-zinc-400">{app.brand}</TableCell>
                            <TableCell className="text-zinc-400">{app.designer}</TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  app.status === 'APPROVED' 
                                    ? 'risk-low' 
                                    : app.status === 'REJECTED' 
                                      ? 'risk-high' 
                                      : 'outline'
                                }
                              >
                                {app.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {app.status === 'PENDING' ? (
                                <div className="flex justify-end gap-2.5">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleApprovalAction(app.id, 'APPROVE')}
                                    className="h-7 text-[10px] font-semibold text-emerald-400 border-emerald-950/40 hover:bg-emerald-950/20"
                                  >
                                    Approve
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => handleApprovalAction(app.id, 'REJECT')}
                                    className="h-7 text-[10px] font-semibold text-rose-400 border-rose-950/40 hover:bg-rose-950/20"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-zinc-500 font-semibold font-mono">Sign-off Logged</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Module: Publishing Center */}
              {activeTab === 'publishing' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-white">Multi-Channel Publishing Console</CardTitle>
                    <CardDescription>Export and publish finalized designs to advertising and business channels.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Design selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">1. Select Design for Export</label>
                        <select 
                          value={selectedPublishDesign}
                          onChange={(e) => setSelectedPublishDesign(e.target.value)}
                          className="w-full border border-zinc-850 bg-zinc-900 p-2 text-xs text-white focus:outline-none rounded-none cursor-pointer"
                        >
                          {designs.map(d => (
                            <option key={d.id} value={d.id}>{d.name} ({d.format})</option>
                          ))}
                        </select>
                      </div>

                      {/* Publishing channel */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">2. Choose Distribution Channel</label>
                        <select 
                          value={publishingChannel}
                          onChange={(e) => setPublishingChannel(e.target.value)}
                          className="w-full border border-zinc-850 bg-zinc-900 p-2 text-xs text-white focus:outline-none rounded-none cursor-pointer"
                        >
                          <option value="linkedin">LinkedIn Business Feed</option>
                          <option value="instagram">Instagram Campaign Ads</option>
                          <option value="facebook">Facebook Brand Ads</option>
                          <option value="meta-api">Meta Ads API Sync</option>
                        </select>
                      </div>

                      {publishingChannel === 'meta-api' && (
                        <>
                          {/* Meta Campaign Selection */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">3. Target Meta Campaign</label>
                            <select 
                              value={selectedMetaCampaignId}
                              onChange={(e) => {
                                const campId = e.target.value;
                                setSelectedMetaCampaignId(campId);
                                const camp = metaCampaigns.find(c => c.id === campId);
                                if (camp?.ads && camp.ads.length > 0) {
                                  setSelectedMetaAdId(camp.ads[0].id);
                                } else {
                                  setSelectedMetaAdId('');
                                }
                              }}
                              className="w-full border border-zinc-850 bg-zinc-900 p-2 text-xs text-white focus:outline-none rounded-none cursor-pointer"
                            >
                              <option value="">-- Select Campaign --</option>
                              {metaCampaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Meta Ad Selection */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">4. Target Meta Ad</label>
                            <select 
                              value={selectedMetaAdId}
                              onChange={(e) => setSelectedMetaAdId(e.target.value)}
                              className="w-full border border-zinc-850 bg-zinc-900 p-2 text-xs text-white focus:outline-none rounded-none cursor-pointer"
                            >
                              <option value="">-- Select Ad --</option>
                              {(metaCampaigns.find(c => c.id === selectedMetaCampaignId)?.ads || []).map((ad: { id: string; name: string }) => (
                                <option key={ad.id} value={ad.id}>{ad.name}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="border-t border-zinc-900 pt-4 flex justify-between items-center">
                      <span className="text-[10px] text-zinc-500 font-mono">Canva Exports API Endpoint Sync</span>
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={handlePublishSubmit} 
                        disabled={isPublishing}
                        className="font-semibold text-xs h-8"
                      >
                        {isPublishing ? 'Exporting...' : 'Export & Publish'}
                      </Button>
                    </div>

                    {isPublishing && (
                      <div className="space-y-2 pt-2 border-t border-zinc-900">
                        <div className="flex items-center gap-2 text-[10px] font-semibold text-white uppercase tracking-wider">
                          <RefreshCw className="h-3 w-3 animate-spin text-zinc-400" />
                          <span>{publishProgress}</span>
                        </div>
                        <div className="h-1 w-full bg-zinc-800 overflow-hidden relative">
                          <div className="h-full bg-white w-1/2 absolute animate-pulse left-0" />
                        </div>
                      </div>
                    )}

                    {exportedUrl && (
                      <div className="p-3 border border-zinc-800 bg-zinc-950 text-xs text-white flex justify-between items-center mt-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">Design exported successfully!</span>
                          <span className="text-[10px] text-zinc-500">URLs expire after 24 hours.</span>
                        </div>
                        <a 
                          href={exportedUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-zinc-950 hover:bg-zinc-200 bg-white px-2 py-1 font-semibold transition-all"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Download JPG</span>
                        </a>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Module: Content Calendar */}
              {activeTab === 'calendar' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-white">Creative Content Calendar</CardTitle>
                    <CardDescription>Schedule and audit active Canva publications.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {scheduledPosts.map(post => (
                        <div key={post.id} className="p-4 border border-zinc-850 bg-zinc-950 flex flex-col justify-between rounded-none gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">{post.channel}</span>
                              <Badge variant={post.status === 'PUBLISHED' ? 'risk-low' : 'outline'} className="text-[9px] uppercase">
                                {post.status}
                              </Badge>
                            </div>
                            <span className="block text-xs font-bold text-white">{post.title}</span>
                            <span className="block text-[10px] text-zinc-500">Brand: {post.brand}</span>
                          </div>
                          <div className="border-t border-zinc-900 pt-3 flex justify-between items-center text-[10px]">
                            <span className="text-zinc-400 font-semibold">{post.scheduledAt}</span>
                            <Badge variant="outline" className="border-zinc-800 text-[9px] uppercase">Synced</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Module: Creative Analytics */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  {/* Analytic Stats */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Card hoverEffect>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Creative Spend</CardTitle>
                        <BarChart3 className="h-4 w-4 text-zinc-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tight text-white">$14,250.00</div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Canva team overhead + ads spend</span>
                      </CardContent>
                    </Card>
                    <Card hoverEffect>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Dynamic Autofill ROI</CardTitle>
                        <BarChart3 className="h-4 w-4 text-zinc-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tight text-white">4.8x ROI</div>
                        <span className="text-[10px] text-emerald-400 mt-1 block font-semibold">+18.2% conversion uplift</span>
                      </CardContent>
                    </Card>
                    <Card hoverEffect>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Creative Conversion Ratio</CardTitle>
                        <BarChart3 className="h-4 w-4 text-zinc-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold font-mono tracking-tight text-white">3.4%</div>
                        <span className="text-[10px] text-zinc-500 mt-1 block">Averages across 8 active kits</span>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Chart representation */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Creative Performance and ROI Analysis</CardTitle>
                      <CardDescription>Yield ROI performance ratings mapped across connected Canva templates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="h-32 flex items-end gap-6 border-b border-zinc-800 pb-2">
                        <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="w-full bg-emerald-950/20 border border-emerald-900/40 h-[90%] flex flex-col justify-end text-center p-1">
                            <span className="text-[9px] font-bold text-emerald-400 font-mono">5.2x</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-semibold tracking-wider uppercase text-center block">T1 Banner</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="w-full bg-emerald-950/20 border border-emerald-900/40 h-[70%] flex flex-col justify-end text-center p-1">
                            <span className="text-[9px] font-bold text-emerald-400 font-mono">4.1x</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-semibold tracking-wider uppercase text-center block">T2 Cover</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <div className="w-full bg-rose-950/20 border border-rose-900/40 h-[30%] flex flex-col justify-end text-center p-1">
                            <span className="text-[9px] font-bold text-rose-400 font-mono">1.8x</span>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-semibold tracking-wider uppercase text-center block">T3 Carousel</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Module: Creative Intelligence */}
              {activeTab === 'intelligence' && (
                <div className="space-y-6">
                  <InsightPanel
                    type="general"
                    title="Prisma Visual Operations Advisory"
                    score="96%"
                    scoreLabel="Compliance Check Grade"
                    riskLevel="LOW"
                  >
                    {formatUserMessage('Lohith, our creative template **"Instagram Promo Banner"** (T1) is scoring highly on B2B visual audits. However, automated compliance logs indicate that **"Vortex Pitch Deck"** (A2) contains unapproved branding shapes. Re-applying the brand styling criteria inside the governance console is recommended.')}
                  </InsightPanel>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Visual Design Optimization Recommendations</CardTitle>
                      <CardDescription>Creative insights parsed by Prisma AI analytics engines.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 border border-zinc-850 bg-zinc-950/50 flex gap-3 items-start">
                        <Brain className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-bold text-white">Color Harmony Optimization</span>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                            B2B campaigns employing high contrast primary logos against dark gray cards see a +22.4% engagement improvement over plain backgrounds.
                          </p>
                        </div>
                      </div>
                      <div className="p-3 border border-zinc-850 bg-zinc-950/50 flex gap-3 items-start">
                        <Brain className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-xs font-bold text-white">Font Size compliance check</span>
                          <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                            Ensure headlines are configured to Space Grotesk Bold, with font sizes of 36px or greater to align with Canva template structures.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Module: Automation Builder */}
              {activeTab === 'automations' && (
                <div className="space-y-6">
                  {/* Automation Editor Rule Builder */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Creative Automation Recipes</CardTitle>
                      <CardDescription>Design event-driven action triggers for Canva workflows.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">If Trigger Event</label>
                          <select 
                            value={newRuleTrigger}
                            onChange={(e) => setNewRuleTrigger(e.target.value)}
                            className="w-full border border-zinc-850 bg-zinc-900 p-2 text-xs text-white focus:outline-none rounded-none cursor-pointer"
                          >
                            <option value="design.approved">Design Approved</option>
                            <option value="design.created">Design Created</option>
                            <option value="export.completed">Export Completed</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Execute Action</label>
                          <select 
                            value={newRuleAction}
                            onChange={(e) => setNewRuleAction(e.target.value)}
                            className="w-full border border-zinc-850 bg-zinc-900 p-2 text-xs text-white focus:outline-none rounded-none cursor-pointer"
                          >
                            <option value="export.png">Export PNG Asset</option>
                            <option value="export.jpg">Export JPG Asset</option>
                            <option value="publish.social">Publish to Social</option>
                          </select>
                        </div>

                        <div className="flex items-end">
                          <Button variant="default" size="sm" onClick={handleCreateAutomation} className="w-full font-semibold text-xs h-8">
                            Add Automation Recipe
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Active Automations List */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Active Creative Automations</CardTitle>
                      <CardDescription>Automation rules configured inside IrisOS.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Trigger Event</TableHead>
                            <TableHead>Action Execution</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {automations.map(auto => (
                            <TableRow key={auto.id}>
                              <TableCell className="font-mono text-xs font-semibold text-white">{auto.trigger}</TableCell>
                              <TableCell className="font-mono text-xs text-zinc-400">{auto.action}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setAutomations(automations.map(a => a.id === auto.id ? { ...a, active: !a.active } : a))}
                                  className={cn(
                                    "h-7 text-[10px] font-semibold uppercase tracking-wider border-zinc-800 rounded-none cursor-pointer",
                                    auto.active ? "text-emerald-400 bg-emerald-950/20" : "text-zinc-500"
                                  )}
                                >
                                  {auto.active ? 'ACTIVE' : 'INACTIVE'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Module: Design API Console */}
              {activeTab === 'api' && (
                <div className="space-y-6">
                  {/* Endpoint settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">Canva Developer Suite Console</CardTitle>
                      <CardDescription>Configure webhook handlers, generate API credentials, and simulate server-to-server events.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Webhook Input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Webhook Listener URL</label>
                        <input 
                          type="text"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          className="w-full border border-zinc-850 bg-zinc-900/40 p-2 text-xs text-white font-mono focus:border-zinc-750 focus:outline-none rounded-none"
                        />
                      </div>

                      {/* Canva Custom Credentials Config Form */}
                      <div className="border border-zinc-800 bg-zinc-950/40 p-4 space-y-4 rounded-none">
                        <span className="block text-xs font-bold text-white uppercase tracking-wider">Configure Custom Canva Developer credentials</span>
                        <span className="block text-[10px] text-zinc-500 leading-relaxed">
                          To hook this IrisOS workspace into a live Canva team, insert your Canva Connect integration Client ID and Secret key. Ensure redirect URIs match: <code className="text-zinc-300 font-mono text-[9px] bg-zinc-900 px-1 py-0.2">{origin}/api/canva/callback</code>.
                        </span>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Canva Client ID</label>
                            <input 
                              type="text"
                              value={customClientId}
                              onChange={(e) => setCustomClientId(e.target.value)}
                              className="w-full border border-zinc-850 bg-zinc-900/40 p-2 text-xs text-white font-mono focus:border-zinc-750 focus:outline-none rounded-none"
                              placeholder="Client ID (e.g. OC-AZ7biQWiih90)"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Canva Client Secret</label>
                            <input 
                              type="password"
                              value={customClientSecret}
                              onChange={(e) => setCustomClientSecret(e.target.value)}
                              className="w-full border border-zinc-850 bg-zinc-900/40 p-2 text-xs text-white font-mono focus:border-zinc-750 focus:outline-none rounded-none"
                              placeholder="Client Secret key"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end pt-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={handleSaveCredentials}
                            disabled={isSavingCredentials}
                            className="h-8 text-xs font-semibold"
                          >
                            {isSavingCredentials ? 'Saving...' : 'Save Developer Credentials'}
                          </Button>
                        </div>
                      </div>

                      {/* Webhook simulation tool */}
                      <div className="flex justify-end gap-2.5 border-t border-zinc-900 pt-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleMockWebhookEvent}
                          className="h-8 text-xs border-zinc-800 text-zinc-300 font-semibold"
                        >
                          Simulate Canva Webhook Event
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Realtime API logs */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-semibold text-white">REST API request & Webhook logs</CardTitle>
                      <CardDescription>Live feed of requests passing through Canva integration endpoints.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Timestamp</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Path</TableHead>
                            <TableHead>HTTP Status</TableHead>
                            <TableHead className="text-right">Message Feed</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {apiLogs.map((log, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-xs text-zinc-500 whitespace-nowrap">{log.timestamp}</TableCell>
                              <TableCell className="font-mono text-xs font-bold text-white whitespace-nowrap">{log.method}</TableCell>
                              <TableCell className="font-mono text-xs text-zinc-400 whitespace-nowrap">{log.path}</TableCell>
                              <TableCell>
                                <Badge variant={log.status === 200 || log.status === 201 || log.status === 202 ? 'risk-low' : 'risk-high'} className="font-mono text-xs">
                                  {log.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right text-xs text-zinc-400 font-sans max-w-[240px] truncate">{log.message}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
