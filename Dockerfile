# Stage 1: install dependencies
# Copying only the manifest files first lets Docker reuse this layer when only
# source changes. .npmrc must be copied because it carries engine-strict=true;
# npm ci without it would silently tolerate an engine mismatch that local dev rejects.
#
# Node 24 matches the developer machine (see .npmrc and package.json engines).
# The lockfile was produced there and engine-strict=true enforces the version at
# install time.
#
# Alpine (musl) is safe as long as the lockfile contains linux-x64-musl variants of
# @next/swc, lightningcss, @tailwindcss/oxide and @rollup/rollup. After first
# npm install, grep the lockfile for those four strings to verify they are present.
# If a future lockfile regeneration drops them, npm ci fails with a missing native
# module — fix by regenerating the lockfile on Node 24, not by switching to a Debian
# base. See: targets/unpause-client-mock/concepts/PROJECT_SCAFFOLD_AND_CI_CONCEPT.md
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

# Stage 2: build the static export
# Lint and tests are intentionally omitted: the CI verify job gates on them already,
# and repeating them here would make a local docker build fail on lint debt unrelated
# to the image.
FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: serve the static export with nginx
# next start refuses to run with output: "export" — Node in the runtime image would
# be ~150 MB of dead weight and attack surface for no benefit.
FROM nginx:alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/out /usr/share/nginx/html
EXPOSE 80
