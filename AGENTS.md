# AGENTS.md

## Cursor Cloud specific instructions

Finatura is a multi-tenant financial-ops platform (Turkish SMBs). It is a monorepo with **no root `package.json`/workspace tool** — each `services/*`, `packages/*`, and `apps/*` has its own `package.json` + lockfile and is installed/run independently. Standard run/build commands live in each `README.md` and `package.json`; the notes below only cover non-obvious setup/run caveats.

The startup update script already runs `npm install` in every package and builds the three `file:` library packages. The items below are NOT handled automatically and must be done by hand when you need to run services.

### Databases (required for tenant-router / billing / finteo flows)
- Docker is installed but **`dockerd` is not auto-started**. Start it once per session (it needs the docker-in-docker workarounds already configured in `/etc/docker/daemon.json` + iptables-legacy): run `sudo dockerd` in a background tmux session.
- Then start the two Postgres 16 containers with `sudo docker compose up -d` (central `:5432`, tenant `:5433`). Compose auto-applies `database/central/*.sql` and `database/tenant_template/*.sql` on first boot. Credentials are in `docker-compose.yml` / root `README.md`.

### Service `.env` files (gitignored — recreate per service)
- Each `services/*` has `.env.example`; copy to `.env` (`cp .env.example .env`).
- **Gotcha:** `services/tenant-router/.env.example` sets `CENTRAL_DATABASE_URL` password to `finatura:finatura`, but `docker-compose.yml` uses password `finatura_dev`. Fix it to `postgresql://finatura:finatura_dev@localhost:5432/finatura_central` or tenant-router can't reach the central DB.
- `api-gateway` runs with `AUTH_PROVIDER=stub` by default (no DB). `AUTH_PROVIDER=central` is **not fully supported** — `public.users` is not in the central schema yet; keep `stub`.

### Port collisions when running services together
- `tenant-router` and `document-agent` both default to `3100`; `einvoice-integrator` and `billing-agent` both default to `3200`. Override `PORT` in each `.env` before running them concurrently. The core API flow only needs `api-gateway` (3000) + `tenant-router` (3100).

### Seeding a demo tenant (needed for `/v1/tenant/ping` end-to-end)
The central DB seeds sectors/plans but **no tenant**. To exercise the gateway → tenant-router → isolated tenant DB path, insert a tenant + routing row matching the stub JWT's tenant id (`00000000-0000-4000-8000-0000000000aa`). `password_ciphertext` uses the stub decryptor format `plain:<pw>` with `encryption_key_id=dev-plain`, and `ssl_mode=disable` for local Postgres:
```sql
INSERT INTO tenants (id, slug, display_name, sector_id, status, provisioned_at)
SELECT '00000000-0000-4000-8000-0000000000aa','ornek-galeri','Örnek Galeri', s.id,'active',now()
FROM sectors s WHERE s.code='oto_galeri' ON CONFLICT (id) DO UPDATE SET status='active';
INSERT INTO tenant_databases (tenant_id, db_host, db_port, db_name, db_user, password_ciphertext, encryption_key_id, ssl_mode, is_primary)
VALUES ('00000000-0000-4000-8000-0000000000aa','localhost',5433,'tenant_ornek','finatura_tenant','plain:finatura_tenant_dev','dev-plain','disable',true)
ON CONFLICT (tenant_id) WHERE is_primary=true AND deleted_at IS NULL DO UPDATE SET db_host=EXCLUDED.db_host, db_port=EXCLUDED.db_port;
```
Demo stub login: `demo@finatura.app` / `demo1234`.

### Lint / test / build
- There is **no ESLint**; "lint" == `npm run typecheck` (`tsc --noEmit`) per package (accountant-portal names it `lint`).
- Tests: `packages/invoice-transformers` & `services/einvoice-integrator` use `node --test`; `services/document-agent` & `services/matching-agent` use `vitest`. `einvoice-integrator`'s `*.live.test.ts` use mocked HTTP (no real credentials needed).
- `packages/shared-types`, `packages/invoice-transformers`, and `services/matching-agent` are `file:` deps; they must be **built** before consumers (e.g. `finteo-agent`) typecheck cleanly (the update script handles this).

### Frontends
- `apps/web` (Vite, `:5173`) is the marketing + login/register site; `apps/accountant-portal` (React+Vite) is a UI mock. Neither needs env for local dev. `apps/mobile` is Flutter (SDK not installed here).
