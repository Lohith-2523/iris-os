import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import Script from "next/script";
import { AuthSync } from "@/components/app-shell/auth-sync";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({subsets:['latin'],variable:'--font-mono'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", "dark", spaceGrotesk.variable, geistSans.variable, geistMono.variable, "font-mono", jetbrainsMono.variable)}
    >
      <body className="min-h-full flex flex-col">
        <AuthSync />
        {children}
        <Script id="facebook-jssdk" strategy="afterInteractive">
          {`
            window.fbAsyncInit = function() {
              FB.init({
                appId      : '${process.env.NEXT_PUBLIC_META_APP_ID || "1576428810499716"}',
                cookie     : true,
                xfbml      : true,
                version    : '${process.env.NEXT_PUBLIC_META_API_VERSION || "v20.0"}'
              });
              
              FB.AppEvents.logPageView();   
            };

            (function(d, s, id){
               var js, fjs = d.getElementsByTagName(s)[0];
               if (d.getElementById(id)) {return;}
               js = d.createElement(s); js.id = id;
               js.src = "https://connect.facebook.net/en_US/sdk.js";
               fjs.parentNode.insertBefore(js, fjs);
             }(document, 'script', 'facebook-jssdk'));
          `}
        </Script>
      </body>
    </html>
  );
}


