import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { workspaceThemePaths } from "@/lib/theme-routes";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { HelpCenter } from "@/components/help/help-center";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { RouteThemeSync } from "@/components/app-shell/route-theme-sync";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const clashDisplay = localFont({
  src: [
    {
      path: "../../public/fonts/ClashDisplay-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashDisplay-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashDisplay-Semibold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashDisplay-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-clash-display",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', preload: false });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL((process.env.APP_URL || "https://irisos.app").trim().replace(/\/+$/, "")),
  applicationName: "IrisOS",
  title: {
    default: "IrisOS | Agency Management Software and AI Workspace",
    template: "%s | IrisOS",
  },
  description: "IrisOS is an agency management platform for clients, projects, tasks, teams, finances, invoices, reporting, creative operations, and Miles AI in one connected workspace.",
  alternates: {
    canonical: "/",
  },
  category: "business software",
  creator: "IrisOS",
  publisher: "IrisOS",
  referrer: "origin-when-cross-origin",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "IrisOS",
    url: "/",
    title: "IrisOS | Agency Management Software and AI Workspace",
    description: "Run clients, projects, delivery, finances, reporting, creative operations, and AI-assisted work from one agency operating system.",
    images: [{ url: "/meta_dark.png", alt: "IrisOS agency operating system" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IrisOS | Agency Management Software and AI Workspace",
    description: "One connected operating system for agency delivery, finance, clients, reporting, creative operations, and Miles AI.",
    images: ["/meta_dark.png"],
  },
  appleWebApp: {
    capable: true,
    title: "IrisOS",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/icons/iris-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico", sizes: "any", type: "image/x-icon" }],
    apple: [{ url: "/icons/iris-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const serializedWorkspaceThemePaths = JSON.stringify(workspaceThemePaths);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", "dark", spaceGrotesk.variable, clashDisplay.variable, geistSans.variable, geistMono.variable, "font-mono", jetbrainsMono.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {`(function(){var root=document.documentElement;root.classList.remove('light');root.classList.add('dark');var path=window.location.pathname;var workspacePaths=${serializedWorkspaceThemePaths};var isWorkspace=workspacePaths.some(function(workspacePath){return path===workspacePath||path.indexOf(workspacePath+'/')===0;});if(!isWorkspace)return;var theme=document.cookie.match(/(?:^|; )crystal_theme=(light|dark)(?:;|$)/);if(theme&&theme[1]==='light'){root.classList.add('light');root.classList.remove('dark')}})();`}
        </Script>
        <RouteThemeSync />
        {children}
        <HelpCenter />
        <SpeedInsights />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
