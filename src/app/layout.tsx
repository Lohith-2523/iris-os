import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { workspaceThemePaths } from "@/lib/theme-routes";
import Script from "next/script";
import { HelpCenter } from "@/components/help/help-center";

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
  title: "Iris OS - Enterprise Agency Operating System",
  description: "The operating system used by modern agencies and creative enterprises to manage finance, operations, clients, projects, reporting, forecasting, intelligence, and content production from a single platform.",
  icons: {
    icon: [
      {
        url: "/iris-logo-black-transparent.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/iris-logo-white-transparent.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
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
        {children}
        <HelpCenter />
      </body>
    </html>
  );
}
