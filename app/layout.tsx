/**
 * Root layout — server component.
 *
 * Mounts FlowProvider once around the entire tree. FlowProvider is a client
 * component ("use client"); wrapping it from a server component is valid in
 * the App Router — the client boundary is transparent to the server wrapper.
 * This is the only place FlowProvider is mounted, so flow state survives all
 * client-side navigation between the six routes (the layout never unmounts).
 *
 * Structure: <html><body><FlowProvider><AppShell>{children}</AppShell></FlowProvider></body></html>
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { FlowProvider } from "@/lib/store/flow-store";
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
  themeColor: "#111827",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UserDataProvider>
          <FlowProvider>
            <AppShell>{children}</AppShell>
          </FlowProvider>
        </UserDataProvider>
      </body>
    </html>
  );
}
