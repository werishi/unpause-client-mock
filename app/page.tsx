"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";

export default function RootRedirect() {
  const router = useRouter();
  const { hydrated, startedAt, welcomeBackDue } = useUserData();

  useEffect(() => {
    if (!hydrated) return;
    if (startedAt === null) {
      router.replace("/welcome");
    } else if (welcomeBackDue) {
      router.replace("/welcome-back");
    } else {
      router.replace("/today");
    }
  }, [hydrated, startedAt, welcomeBackDue, router]);

  // Return an empty div, not null: returning null produces a body-less prerender
  // that some browsers flash before hydration replaces it.
  return <div />;
}
