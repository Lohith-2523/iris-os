# Iris OS Integrations Endpoints Directory

This document contains a compiled list of all authorization redirects, API callbacks, and webhook URLs configured for active and simulated integration modules across Iris OS, supporting both `localhost` and `127.0.0.1` local network mappings.

---

## 1. Google OAuth & Calendar Sync
Used for single sign-on (SSO) login, new organization signup, and Google Calendar event synchronization.

*   **OAuth Callback / Redirect URI**: 
    *   `https://aifapsvsjfixwoplshuj.supabase.co/auth/v1/callback`
*   **Scopes Required**:
    *   Login / Signup: `openid`, `email`, `profile`
    *   Calendar Integration: `https://www.googleapis.com/auth/calendar.readonly`, `https://www.googleapis.com/auth/calendar.events.readonly`

---

## 2. Canva Dashboard Banner

Used to create a 2912 x 360 banner in Canva and export the completed design directly into the Iris OS dashboard.

*   **OAuth Callback / Redirect URI**:
    *   `http://127.0.0.1:3000/api/canva/callback`
    *   `https://irisos.app/api/canva/callback`
*   **Return Navigation URL** (configure this in the Canva Developer Portal):
    *   `http://127.0.0.1:3000/api/canva/return`
    *   `https://irisos.app/api/canva/return`
*   **Scopes Required**: `design:content:read`, `design:content:write`

---

## 3. Meta Ads & Leads Manager
Used to sync campaigns, track ad performance metrics, automate lead capture workflows, and support Canva asset synchronization.

*   **OAuth Callback / Redirect URI**: 
    *   `http://localhost:3000/api/meta-ads/callback`
    *   `http://127.0.0.1:3000/api/meta-ads/callback`
    *   `https://irisos.app/api/meta-ads/callback`
*   **Webhook Listener URL (Realtime Leads)**: 
    *   `http://localhost:3000/api/webhooks/meta`
    *   `http://127.0.0.1:3000/api/webhooks/meta`
    *   `https://irisos.app/api/webhooks/meta`
*   **User Deauthorization Callback / Redirect URI**:
    *   `http://localhost:3000/api/meta-ads/deauthorize`
    *   `http://127.0.0.1:3000/api/meta-ads/deauthorize`
    *   `https://irisos.app/api/meta-ads/deauthorize`
*   **User Data Deletion Callback / Redirect URI**:
    *   `http://localhost:3000/api/meta-ads/delete-data`
    *   `http://127.0.0.1:3000/api/meta-ads/delete-data`
    *   `https://irisos.app/api/meta-ads/delete-data`
*   **Webhook Verify Token**: Configured via environment variable `META_VERIFY_TOKEN` (defaults to `irisos_meta_verify_token`)
*   **Graph API Permissions Used**:
    `public_profile`, `email`, `ads_read`, `business_management`, `leads_retrieval`, `pages_show_list`, `pages_manage_metadata`
*   **Lead retrieval flow**: Discover manageable Facebook Pages, subscribe them to the `leadgen` webhook field, retrieve each lead by `leadgen_id`, resolve the source ad's exact ad account, and persist it only when that account is assigned to a client.
*   **Not currently requested**: `ads_management`. Add it only when Iris OS performs provider-side campaign, ad, creative, status, or budget mutations.

---

## 4. Financial & ERP Integrations (Sandbox & Live Templates)

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

## 5. Payment Gateways (Live API Verification & Webhooks)

### Razorpay
*   **Razorpay Webhook Listener URL**: 
    *   `http://localhost:3000/api/razorpay/webhook`
    *   `http://127.0.0.1:3000/api/razorpay/webhook`
    *   `https://irisos.app/api/razorpay/webhook`
