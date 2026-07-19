# Finatura central `pg_dump`

Agent bu ortamda `database/central/*.sql` dosyalarını yerel PG’de uygular ve buraya dump üretir.

| Dosya | Kullanım |
|-------|----------|
| `finatura_central_full.sql` | `psql -f` / `vps-restore-central-dump.sh` |
| `finatura_central_full.dump` | `pg_restore` (custom format) |

**Hedef:** yalnızca `finatura_pg` → `finatura_central`  
**Yasak:** `saas_postgres`, `kargomkapinda_*`

Yeniden üret: `bash scripts/build-central-pg-dump.sh`  
Uzak restore: `sudo bash scripts/vps-restore-central-dump.sh`
