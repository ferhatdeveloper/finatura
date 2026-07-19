# AGENTS.md

## Cursor Cloud specific instructions

Finatura is a multi-tenant financial-operations monorepo. There is **no root `package.json`
and no workspace manager** — every `apps/*`, `services/*`, and `packages/*` folder installs its
own deps independently (each has its own `package-lock.json`). The update script already runs
`npm install` in every package and `flutter pub get` in `apps/mobile`, so on a fresh session deps
are ready. Standard build/dev/test commands live in each package's `package.json` scripts and in
the root `README.md` / `apps/mobile/README.md` — refer to those rather than duplicating.

### Toolchain (already installed in the VM image)
- **Node 22**, npm 10. Services/packages need Node >=20; JS apps need >=18.
- **Docker + Compose v2** with `fuse-overlayfs` (kernel lacks overlay2). Docker 29 requires
  `"features": {"containerd-snapshotter": false}` in `/etc/docker/daemon.json` for fuse-overlayfs
  to work (already configured). The daemon may not be running at session start — if
  `docker ps` fails, start it with `sudo service docker start`. Docker needs `sudo` (the `ubuntu`
  user is not in the `docker` group).
- **Flutter 3.44.x (stable)** at `~/flutter`, added to PATH via `~/.bashrc`. Used by `apps/mobile`
  (Flutter web is the primary operational client).

### Local dependency build order (non-obvious)
Cross-package deps use `file:` links. Before their consumers type-check/build, build these libs
first (the update script does this): `packages/shared-types`, `packages/invoice-transformers`
(→ `services/einvoice-integrator`), `services/matching-agent` (→ `services/finteo-agent`),
`services/luca-agent` (→ `services/accountant-bridge`).

### Running the core stack (dev)
1. Postgres: `sudo docker compose up -d` — central DB on host `:5440`, sample tenant on `:5441`
   (NOT 5432/5433 despite what `.env.example` text says). Init SQL from `database/` is auto-applied
   on first volume creation; sectors are seeded but there are **no seed users**.
2. **Port conflict:** `tenant-router` and `document-agent` both default to `PORT=3100`. Run
   document-agent on 3100 and tenant-router on another port (e.g. `PORT=3101`), and point the
   gateway at it with `TENANT_ROUTER_URL=http://localhost:3101`.
3. `services/api-gateway` (`npm run dev`, `:3000`) has two auth modes via `AUTH_PROVIDER`:
   - `stub` (default, no DB): login `demo@finatura.app` / `demo1234`.
   - `central`: needs `CENTRAL_DATABASE_URL=postgresql://finatura:finatura_dev@localhost:5440/finatura_central`
     plus a seeded user. Central `password_hash` uses the dev format `dev:<plaintext>` (bcrypt is TODO).
     A working demo seed = tenant `ornek-galeri` (mali_musavir_kodu `DEMO-GALERI`) + user
     `demo@finatura.app` (`dev:demo1234`) + an `owner` membership.
4. **CORS:** the gateway only allows a fixed localhost origin list (5173/5174/8080/8081) unless you
   set `CORS_ORIGINS`. When serving the Flutter web client on another port, add it, e.g.
   `CORS_ORIGINS=http://localhost:8090,...`.

### Flutter web client
`cd apps/mobile && flutter run -d web-server --web-port 8090 --dart-define=API_BASE_URL=http://localhost:3000`.
No Chrome is needed with the `web-server` device (first compile ~45s). Login screen posts
`{email,password,firmaKodu}` to `{API_BASE_URL}/auth/login`; client-side mock auth is OFF by default.

### Tests / lint
Unit tests exist in `services/matching-agent`, `services/document-agent`, `services/accountant-bridge`
(vitest) and `packages/invoice-transformers`, `services/einvoice-integrator` (`node --test`; the
einvoice suite includes provider **live** tests that need credentials — run
`tests/stub.integration.test.ts` with `EINVOICE_STUB_MODE=true` for the offline path). Type-checking
is `npm run typecheck` (lint == `tsc --noEmit`) in each TS package; `apps/accountant-portal` exposes
it as `npm run lint`. `apps/dashboard` is **frozen/legacy** — reference only, not deployed.
