# IrisOS Integrations Endpoints Directory

This document contains a compiled list of all authorization redirects, API callbacks, and webhook URLs configured for active and simulated integration modules across IrisOS, supporting both `localhost` and `127.0.0.1` local network mappings.

---

## 1. Canva Connect Integration
Used for syncing project design catalogs, template autofills, uploader, and publishing workflows.

*   **OAuth Authorization URL**: `https://www.canva.com/api/oauth/authorize`
*   **Redirect URI (Callback)**: 
    *   `http://localhost:3000/api/canva/callback`
    *   `http://127.0.0.1:3000/api/canva/callback`
    *   `https://irisos.app/api/canva/callback`
*   **Token Exchange Endpoint**: `https://api.canva.com/rest/v1/oauth/token`
*   **Webhook Listener URL (Realtime Sync)**: 
    *   `http://localhost:3000/api/canva/webhook`
    *   `http://127.0.0.1:3000/api/canva/webhook`
    *   `https://irisos.app/api/canva/webhook`
*   **Scopes Used**: 
    `design:read design:meta:read design:content:read design:content:write asset:read asset:write profile:read brand-kit:read brandtemplate:meta:read brandtemplate:content:read folder:read folder:write export:read export:write`

---

## 2. Meta Ads & Leads Manager
Used to sync campaigns, track ad performance metrics, automate lead capture workflows, and support Canva asset synchronization.

*   **OAuth Callback / Redirect URI**: 
    *   `http://localhost:3000/api/meta-ads/callback`
    *   `http://127.0.0.1:3000/api/meta-ads/callback`
    *   `https://irisos.app/api/meta-ads/callback`
*   **Webhook Listener URL (Realtime Leads)**: 
    *   `http://localhost:3000/api/webhooks/meta`
    *   `http://127.0.0.1:3000/api/webhooks/meta`
    *   `https://irisos.app/api/webhooks/meta`
*   **Webhook Verify Token**: Configured via environment variable `META_VERIFY_TOKEN` (defaults to `irisos_meta_verify_token`)
*   **Graph API Scopes**:
    `catalog_management`, `pages_show_list`, `ads_management`, `ads_read`, `business_management`, `leads_retrieval`, `pages_read_engagement`, `pages_manage_metadata`, `pages_manage_ads`

---

## 3. Financial & ERP Integrations (Sandbox & Live Templates)

### QuickBooks Online
Used for tracking agency invoices, ledger assets, and payment receipts.
*   **OAuth Authorization Redirect URI**: 
    *   `http://localhost:3000/api/quickbooks/callback`
    *   `http://127.0.0.1:3000/api/quickbooks/callback`
    *   `https://irisos.app/api/quickbooks/callback`
*   **Webhook Listener URL**: 
    *   `http://localhost:3000/api/quickbooks/webhook`
    *   `http://127.0.0.1:3000/api/quickbooks/webhook`
    *   `https://irisos.app/api/quickbooks/webhook`

### HubSpot CRM
Used for lead contacts synchronizations and client pipeline indexing.
*   **OAuth Authorization Redirect URI**: 
    *   `http://localhost:3000/api/hubspot/callback`
    *   `http://127.0.0.1:3000/api/hubspot/callback`
    *   `https://irisos.app/api/hubspot/callback`
*   **Webhook Listener URL**: 
    *   `http://localhost:3000/api/hubspot/webhook`
    *   `http://127.0.0.1:3000/api/hubspot/webhook`
    *   `https://irisos.app/api/hubspot/webhook`

---

## 4. Payment Gateways (Mock Webhooks & API Verification)

### Stripe
*   **Stripe Webhook Listener URL**: 
    *   `http://localhost:3000/api/stripe/webhook`
    *   `http://127.0.0.1:3000/api/stripe/webhook`
    *   `https://irisos.app/api/stripe/webhook`

### PayPal
*   **PayPal IPN / Webhook Listener URL**: 
    *   `http://localhost:3000/api/paypal/webhook`
    *   `http://127.0.0.1:3000/api/paypal/webhook`
    *   `https://irisos.app/api/paypal/webhook`

### Razorpay
*   **Razorpay Webhook Listener URL**: 
    *   `http://localhost:3000/api/razorpay/webhook`
    *   `http://127.0.0.1:3000/api/razorpay/webhook`
    *   `https://irisos.app/api/razorpay/webhook`
