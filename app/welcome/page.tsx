"use client";
import { useRouter } from "next/navigation";
import { useUserData } from "@/lib/store/user-store";
import { WELCOME, START_SCREEN } from "@/lib/copy";

/**
 * Welcome screen — the first thing a new user sees.
 *
 * Rendered when the root redirect sends users who have no `startedAt` value in
 * the store. Calling `markStarted()` sets `startedAt = today`, which makes the
 * root redirect send all future visits to `/today` instead.
 *
 * No `hydrated` guard is needed: no persisted state is read during render.
 * `markStarted` is only called on the button click, after the component has
 * mounted on the client.
 *
 * The `START_SCREEN.safetyNote` is included here so the non-medical-product
 * disclosure is present from the very first screen the user sees, satisfying
 * the profile's not-a-medical-product invariant (not just on the legacy start
 * screen).
 */
export default function WelcomePage() {
  const router = useRouter();
  const { markStarted } = useUserData();

  function handleStart() {
    markStarted(); // sets startedAt = today in the store
    router.push("/today"); // goes to Today where the first check-in and plan happen
  }

  return (
    <main>
      <h1>{WELCOME.headline}</h1>
      <p>{WELCOME.body}</p>
      <p>{START_SCREEN.safetyNote}</p>
      <p>{WELCOME.safetyPointer}</p>
      <button onClick={handleStart}>{WELCOME.ctaLabel}</button>
    </main>
  );
}
