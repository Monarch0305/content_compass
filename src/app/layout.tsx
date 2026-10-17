// The root layout wraps every page. It sets the page metadata, loads the
// global styles, and puts the whole app inside the StoreProvider so all
// screens share one list of saved items (see src/lib/store.tsx).

import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Content Compass",
  description: "Save later. Actually watch instead of forgetting.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Content Compass" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

// A phone-first app, so lock the width to the device and set the theme colour.
export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <ServiceWorkerRegister />
        <StoreProvider>
          {/* The app is designed for a phone, so we cap the content width and
              centre it on larger screens. */}
          <div className="mx-auto flex min-h-dvh max-w-md flex-col">
            <Header />
            <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}

// App name + tagline on every screen (project.md asks for this on the home
// screen; keeping it in the header means it is always one tap from anywhere).
function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
      <Link href="/" className="block">
        <h1 className="text-lg font-semibold tracking-tight">Content Compass</h1>
        <p className="text-xs text-muted">
          Save later. Actually watch instead of forgetting.
        </p>
      </Link>
    </header>
  );
}
