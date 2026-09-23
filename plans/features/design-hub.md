# Feature Plan: Canva-Powered Design Hub

Centralized Creative Operations Platform for CrystalOS, integrating with Canva's Connect REST API and JavaScript SDK interfaces.

---

## 1. Canva API Integration Mapping

### A. Designs API (`/v1/designs`)
- **Usage**: Fetch, list, and search user designs. Used to power the **Design Library** and **Recent Designs** modules.
- **Payload Structure**:
  ```json
  {
    "id": "DAG123456",
    "name": "Summer Product Banner Square",
    "thumbnail": {
      "url": "https://export-download.canva.com/sample-thumb.png",
      "width": 800,
      "height": 800
    },
    "urls": {
      "edit_url": "https://www.canva.com/design/DAG123456/edit"
    },
    "created_at": 1718872000,
    "updated_at": 1718915200
  }
  ```

### B. Assets API (`/v1/assets`)
- **Usage**: Programmatically upload marketing assets, logos, and raw visual assets to Canva. Powers the **Enterprise Asset Manager**.
- **Endpoints**:
  - `POST /v1/asset-uploads`: Initiate asset uploads.
  - `GET /v1/assets/{id}`: Poll upload status and extract metadata.
- **Sync Logic**: Automatically push locally uploaded brand assets into Canva's folder structure.

### C. Autofill API (`/v1/autofill`)
- **Usage**: Inject external dynamic data (product pricing, CTA texts, localized copy) into pre-set Canva Brand Templates. Used in the **Template Center**.
- **Autofill Job Schema**:
  ```json
  {
    "brand_template_id": "TPL987654",
    "data": {
      "headline": { "type": "text", "text": "Summer Sale: 40% Off!" },
      "product_image": { "type": "image", "asset_id": "AST112233" },
      "primary_color": { "type": "color", "hex": "#f43f5e" }
    }
  }
  ```

### D. Exports API (`/v1/exports`)
- **Usage**: Generate high-fidelity output files (PNG, JPG, PDF) for publishing. Used in the **Publishing Center** and **Content Calendar**.
- **Endpoints**:
  - `POST /v1/exports`: Trigger a rendering job.
  - `GET /v1/exports/{export_id}`: Retrieve download URL.

### E. Webhooks & Events API
- **Usage**: Register webhooks to receive real-time notifications for creative lifecycles. Powers the **Design API Console**.
- **Subscribed Events**:
  - `design.published`: Fired when a design is exported.
  - `asset.uploaded`: Fired when an asset finishes processing.

---

## 2. Platform Modules & Screens

The Design Hub page will be organized into a Left-Sidebar sub-navigation console:

### Module I: Operations Dashboard
1. **Design Dashboard**: Key statistics (Total Designs, Sync Health, Active Campaigns, Compliance Rate), Canva authentication settings, and direct workspace indicators.
2. **Recent Designs**: Chronological log of edited creatives with editing hyperlinks and fast rendering previews.

### Module II: Creative Asset Management
3. **Design Library**: Folder structures ("Social", "Ad Creative", "E-Books") mirroring the Canva Folders API.
4. **Enterprise Asset Manager**: Bulk upload dashboard syncing visual files to Canva's team folders.
5. **Campaign Assets**: Assets grouped by marketing campaigns (e.g. Apex Launch, Summer Ads 2026).

### Module III: Brand & Compliance
6. **Brand Center**: Custom Canva Brand Kit configuration (logos, primary/secondary colors, corporate typography).
7. **Brand Governance Center**: AI compliance check. Configures rules (logo contrast, restricted color warnings) and runs automated lint checks on Canva layouts.

### Module IV: Creative Workflows
8. **Template Center**: Canva Brand Templates listings and the *Dynamic Creative Autofill Console* for programmatic batch banner generation.
9. **Approval Queue**: Structured pipeline for sign-offs. Supports review comments, visual inspection, and status approvals.

### Module V: Publishing & Distribution
10. **Publishing Center**: Multi-channel distribution (Facebook, LinkedIn, Instagram) using the Canva Exports API.
11. **Content Calendar**: Post-scheduler monthly view showing scheduled post visual previews and metadata.

### Module VI: Insights & Developers
12. **Creative Analytics**: Visual performance charts (impressions, clicks, conversions) showing exact content ROI.
13. **Creative Intelligence**: Miles AI suggestion engine providing font recommendations, layout performance grades, and ad spend ROI forecasts.
14. **Automation Builder**: Setup event-driven actions (e.g. "On design approved -> export as high-res PDF -> schedule on Calendar").
15. **Design API Console**: Connection management, Client IDs, webhook subscription setup, and a real-time HTTP request console feed.

---

## 3. Data Schema Definitions

- **Designs**: `id`, `name`, `thumbnailUrl`, `editUrl`, `campaignId`, `status` (DRAFT, IN_REVIEW, APPROVED), `brand`, `lastSynced`
- **Templates**: `id`, `name`, `thumbnailUrl`, `fillableFields` (array of objects containing name and type)
- **BrandKits**: `id`, `name`, `colors` (array of hex), `fonts` (heading, body), `logos` (urls)
- **ScheduledPosts**: `id`, `designId`, `channel` (INSTAGRAM, LINKEDIN, FACEBOOK), `scheduledAt`, `caption`, `published` (boolean)
- **ApprovalRequests**: `id`, `designId`, `submittedBy`, `submittedAt`, `brand`, `comments` (array of messages), `status` (PENDING, APPROVED, REJECTED)
- **ApiLogs**: `id`, `timestamp`, `method`, `endpoint`, `status` (HTTP code), `payload` (JSON string)

---

## 4. Acceptance Criteria & Validation

- All 15 screens are accessible from the Left-Sidebar console inside the Design Hub.
- The **Dynamic Creative Autofill Dialog** must let users select a template, type text variables, and simulate design creation.
- The **Publishing Center** must show animated rendering progress bars and sync success feedback.
- The **Approval Queue** must support status changes that update the library list.
- The **API Console** must render live API keys, subscription setups, and scrollable mock JSON request feeds.
- The design system matches the zero-border-radius flat aesthetic and font constraints perfectly.
