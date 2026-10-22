import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/web/theme-provider"
import { AuthGateProvider } from "@/components/web/AuthGateProvider"
import { MotionProvider } from "@/components/web/motion-provider"
const playfairDisplayHeading = Playfair_Display({subsets:['latin'],variable:'--font-heading'});
import { ImageKitProvider } from "@imagekit/next";

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'});
import { Alexandria } from "next/font/google";

const fontSans = Alexandria({
  subsets: ["latin"],
  variable: "--font-sans",
});
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.BETTER_AUTH_URL ?? "https://team-management-livid.vercel.app"
  ),
  title: {
    default: "Team Management",
    template: "%s · Team Management",
  },
  description:
    "Plan projects, map task dependencies, and keep your team in sync.",
  openGraph: {
    type: "website",
    siteName: "Team Management",
    title: "Team Management — every task knows what's blocking it",
    description:
      "Realtime workspaces where task dependencies are drawn as a graph. Plan the work, trace the blockers, and watch changes land live.",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Team Management — task dependency canvas with tasks connected by blocking relationships",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Team Management — every task knows what's blocking it",
    description:
      "Realtime workspaces where task dependencies are drawn as a graph. Plan the work, trace the blockers, and watch changes land live.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", notoSans.variable, playfairDisplayHeading.variable)}
    >
      <body className={cn(`min-h-full flex flex-col ${fontSans.variable} antialiased`)}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground"
        >
          Skip to content
        </a>
     <ImageKitProvider urlEndpoint={process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthGateProvider>
              <MotionProvider>{children}</MotionProvider>
            </AuthGateProvider>
          </TooltipProvider>
          <Toaster/>
        </ThemeProvider>
      </ImageKitProvider>
        </body>
    </html>
  );
}
