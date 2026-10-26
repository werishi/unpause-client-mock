# Unpause — Client Mock

> *Your life, unpaused.*

This repository contains the **client mockup** for **Unpause**, an app that helps people
bring structure back into their days and build a healthier relationship with media.
It is especially aimed at people who struggle with depression and feel stuck on the couch.

⚠️ This is a **mock / prototype**. It uses placeholder data and is not connected to a real backend.

## The idea

Life sometimes feels like it's on pause. Hours go by watching, scrolling and waiting.
Unpause doesn't judge that. It helps people take small, realistic steps back into an
active life, at their own pace.

**Less watching. More living.**

### Foundation: behavioral activation

Unpause is built around **behavioral activation**, a well-studied therapy approach for
depression. Depression leads to withdrawal, and withdrawal makes depression worse.
Planning small activities that feel meaningful or enjoyable helps break that cycle.

Unpause asks for a quick mood rating before and after a task, so users can see for
themselves that doing things helps.

## Core ideas

### 1. Structure your day, week and month

Unpause helps you plan your days, weeks and months using **templates**, so you don't have
to start from a blank page. Pick a template that fits where you are right now and move up
when you're ready.

| Template        | Example tasks                                  |
| --------------- | ---------------------------------------------- |
| Basic Cleanup   | Make the bed, wash the dishes, take out trash  |
| Basic Sport     | 10-minute walk, light stretching               |
| More Sport      | 30-minute run, full workout                    |

- **Energy check-in:** each morning Unpause asks *"How much energy do you have today?"*
  (low / medium / high) and suggests a plan that fits. A low-energy day with one small
  task still counts as a success.
- **Two-minute version:** every task has a tiny fallback, like *"put on your shoes"*
  instead of *"go for a run"*. Starting is the hardest part.
- **Daily rhythm anchors:** a fixed wake-up time, some daylight or time outside in the
  morning, and a wind-down reminder in the evening. A regular sleep rhythm is closely
  tied to mood.
- **Values compass:** you pick what matters to you (friends, health, creativity,
  learning) and tasks are linked to those values, so progress means something.

### 2. Gentle gamification

Completing tasks earns **points**. A little gamification creates an incentive to keep going
and makes progress visible, without turning into pressure.

- **Comeback bonus instead of lost streaks:** coming back after a break earns points
  rather than costing them.
- **Real-world rewards:** you set your own rewards, for example
  *"at 100 points: cinema night with a friend"*.
- **"Look how far you've come":** weekly and monthly reviews show your progress, because
  depression tends to hide it.

### 3. Get what you care about without the endless scroll

You don't need to scroll through YouTube or news sites anymore. Tell Unpause what you're
interested in, in plain language, for example:

> *"News about financing of WoW Forever"*

Unpause searches for you and shows only what matches your interests. No infinite feed,
no autoplay, no rabbit holes. You stay informed while keeping consumption to a minimum.

- **Digest times:** results arrive once or twice a day at times you choose, with no push
  notifications in between.
- **Media budget:** you set a daily watch time. Completing tasks can earn extra
  guilt-free time (*"Earn your episode"*).
- **Swap suggestions:** when you feel the urge to scroll, Unpause offers a five-minute
  alternative, like a short walk, a stretch, or messaging a friend.

### 4. Stay connected

Depression often leads to isolation. Unpause gently encourages social contact.

- **Connection nudges:** small prompts like *"Message one person today"*.
- **Buddy:** an optional accountability partner, or someone to do tasks together with.

### 5. Therapist access

Unpause can be used together with a **therapist**. With your permission, your therapist
can follow your progress (completed routines, points, trends over time) and use it to
support your therapy sessions.

- **Regular check-ins:** a short validated questionnaire (e.g. PHQ-9) every two weeks,
  shown to the therapist as a trend over time.
- **Therapist homework:** therapists can add tasks directly into your plan.
- **Session summary:** an automatic *"since our last session"* overview for both sides.

You decide what is shared and with whom, and you can revoke access at any time.

### 6. Safety plan

A personal **crisis plan** is always one tap away: your warning signs, people you can
call, and local crisis lines. You set it up on a good day, ideally together with your
therapist, so it's ready when you need it.

## Design principles

- **Small steps:** every task should feel achievable, even on a bad day
- **Encouraging, never shaming:** missed days are not punished
- **Less screen time:** the app should help you put the phone down, not keep you on it
- **Privacy first:** your data belongs to you

## Documentation

The [documentation](documentation) folder collects the scientific evidence behind each idea:
studies, meta-analyses and clinical guidelines, what they mean for the design, and where the
evidence is still thin.

| Topic                                 | File                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------- |
| Foundation: behavioral activation     | [00-behavioral-activation.md](documentation/00-behavioral-activation.md)   |
| 1. Structure your day, week and month | [01-daily-structure.md](documentation/01-daily-structure.md)               |
| 2. Gentle gamification                | [02-gamification.md](documentation/02-gamification.md)                     |
| 3. Media consumption                  | [03-media-consumption.md](documentation/03-media-consumption.md)           |
| 4. Stay connected                     | [04-social-connection.md](documentation/04-social-connection.md)           |
| 5. Therapist access                   | [05-therapist-access.md](documentation/05-therapist-access.md)             |
| 6. Safety plan                        | [06-safety-plan.md](documentation/06-safety-plan.md)                       |

## Goal of this repo

- Visualize the main screens and user flows
- Test the look, feel and tone of the app
- Gather feedback before building the real client

## Note

Unpause is meant to support everyday life. It is not a substitute for professional help.
If you're struggling, please reach out to a doctor, therapist, or a local crisis line.

## License

Source-available, view only. Copyright (c) 2026 Nils Feldeisen, all rights reserved.
The code is public for transparency, not open source: see [LICENSE](LICENSE).

## Running the mockup

```sh
npm install
npm run dev
```

Open http://localhost:3000. The dev server hot-reloads on file changes. The mockup opens on a character picker at `/login`, where you tick the demo notice once per browser and then choose a character or start your own. The privacy notice and the imprint are at `/privacy` and `/imprint`.

```sh
npm run test   # Vitest domain tests — must pass green
npm run build  # Static export to out/ — must pass with zero TypeScript errors
```

## Docker

Build and run the production image locally:

```sh
docker build . -t unpause-client-mock
docker run -p 8080:80 unpause-client-mock
```

Open http://localhost:8080.

## Continuous integration

CI runs two jobs on every push to `main` or `master`, and on `workflow_dispatch`:

- **verify** — installs dependencies, runs ESLint, runs Vitest tests, and builds the static export. Uses a read-only `GITHUB_TOKEN`. Also runs on pull requests, so branch-protection rules on `main` can require it as a passing status check before merge.
- **publish** — builds the Docker image and pushes it to `ghcr.io/werishi/unpause-client-mock` with two tags: `latest` and the full commit SHA. Requires `packages: write`. Only runs on pushes to `main` or `master` — a pull request's ref never matches `refs/heads/main` or `refs/heads/master`, so opening a PR never pushes an image.

There is no deploy step in CI. The production server pulls the image independently; that side lives outside this repository.
