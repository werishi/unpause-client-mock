/**
 * Root layout — server component.
 *
 * Mounts FlowProvider once around the entire tree. FlowProvider is a client
 * component ("use client"); wrapping it from a server component is valid in
 * the App Router — the client boundary is transparent to the server wrapper.
 * This is the only place FlowProvider is mounted, so flow state survives all
 * client-side navigation between the six routes (the layout never unmounts).
 * NotificationBannerProvider carries the transient You → Demo banner replay
 * request, so both the Demo page and the banner inside AppShell can reach it.
 *
 * Structure: <html><body><UserDataProvider><FlowProvider><NotificationBannerProvider><AppShell>{children}</AppShell></NotificationBannerProvider></FlowProvider></UserDataProvider></body></html>
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FlowProvider } from "@/lib/store/flow-store";
import { NotificationBannerProvider } from "@/lib/store/notification-banner-store";
import { UserDataProvider } from "@/lib/store/user-store";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Unpause",
  description:
    "A behavioral-activation mockup to help you take one small step when motivation is low.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "light dark",
  // #ffffff is the light header; #030712 is Tailwind gray-950, the dark canvas.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#030712" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <UserDataProvider>
          <FlowProvider>
            <NotificationBannerProvider>
              <AppShell>{children}</AppShell>
            </NotificationBannerProvider>
          </FlowProvider>
        </UserDataProvider>
      </body>
    </html>
  );
}
