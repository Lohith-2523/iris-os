export interface IntegrationState {
  provider: 'CANVA' | 'QUICKBOOKS' | 'STRIPE' | 'HUBSPOT' | 'SLACK';
  status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING' | 'ERROR';
  lastSync: Date | null;
  logs: string;
}

export interface CanvaDesign {
  id: string;
  name: string;
  thumbnailUrl: string;
  canvaEditUrl: string;
  updatedAt: string;
}

export const IntegrationAdapters = {
  /**
   * Fetches the connection status of all integration providers.
   */
  async getStates(): Promise<IntegrationState[]> {
    // Return mock connections safely for client bundling
    return [
      { provider: 'CANVA', status: 'CONNECTED', lastSync: new Date(), logs: 'Synced 12 assets from Canva workspace root.' },
      { provider: 'QUICKBOOKS', status: 'CONNECTED', lastSync: new Date(), logs: 'Synced 18 invoices and 24 ledger items.' },
      { provider: 'STRIPE', status: 'CONNECTED', lastSync: new Date(), logs: 'Synced subscription events, active webhooks verified.' },
      { provider: 'HUBSPOT', status: 'DISCONNECTED', lastSync: null, logs: 'Token expired. Re-authentication required.' },
      { provider: 'SLACK', status: 'SYNCING', lastSync: new Date(), logs: 'Listening for notification dispatch events...' },
    ];
  },

  /**
   * Triggers a mock sync for a specific provider.
   */
  async syncProvider(provider: string): Promise<IntegrationState> {
    const status = provider === 'HUBSPOT' ? 'CONNECTED' : 'SYNCING';
    const logs = `Manual sync triggered. Synced successfully at ${new Date().toLocaleTimeString()}.`;
    
    return {
      provider: provider as any,
      status: status as any,
      lastSync: new Date(),
      logs,
    };
  },

  /**
   * Canva specific mocked API endpoints.
   */
  canva: {
    async getRecentDesigns(): Promise<CanvaDesign[]> {
      return [
        {
          id: 'canva-1',
          name: 'Summer Campaign Social Post',
          thumbnailUrl: '/designs/social_square.png',
          canvaEditUrl: 'https://canva.com/design/DAF12345/edit',
          updatedAt: '2 hours ago',
        },
        {
          id: 'canva-2',
          name: 'Apex Logo Kit V2',
          thumbnailUrl: '/designs/logo_concepts.png',
          canvaEditUrl: 'https://canva.com/design/DAF67890/edit',
          updatedAt: '1 day ago',
        },
        {
          id: 'canva-3',
          name: 'Corporate Newsletter Layout',
          thumbnailUrl: '/designs/summer_banner.png',
          canvaEditUrl: 'https://canva.com/design/DAF54321/edit',
          updatedAt: '3 days ago',
        },
      ];
    },

    async importProject(projectId: string): Promise<boolean> {
      console.log(`Mock importing Canva project: ${projectId}`);
      return true;
    },

    async exportAsset(designId: string, format: 'PNG' | 'JPG' | 'PDF'): Promise<string> {
      console.log(`Mock exporting Canva design ${designId} as ${format}`);
      return `/exports/${designId}_export.${format.toLowerCase()}`;
    },
  },
};
export default IntegrationAdapters;
