# Network summary

- Final public cold loads transfer 292–483 KB over 15–31 requests.
- No request failures or console errors occurred in the final public Playwright pass.
- The duplicate `static.figma.com` font requests were removed; final traces contain zero such requests.
- Render-blocking global CSS is about 29 KB compressed; Lighthouse estimates roughly 410 ms potential saving on Landing.
- The 45 KB displayed logo and 46 KB metadata icon recur across routes.
- Background Next.js route prefetch contributes to strict settle time after visual content is ready.

Authenticated API waterfalls require a confirmed test session. Static source tracing shows the app layout can warm up to 18 API URLs and many feature pages then request 2–13 route-specific endpoints.
