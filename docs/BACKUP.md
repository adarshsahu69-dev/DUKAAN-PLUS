# Backup & Recovery Strategy

## What to back up

1. **PostgreSQL database** — the source of truth on the server.
2. **Uploaded product images** (if stored on disk) — `server/uploads/` (not used by default; images are URLs).
3. **Environment config** — `.env` files (DATABASE_URL, JWT_SECRET, etc.).

## Automated PostgreSQL backups

Use a cron job (or a docker sidecar) running `pg_dump` daily, compressed and rotated.

```bash
# daily-backup.sh — run via cron at 02:00
#!/usr/bin/env bash
set -euo pipefail
DIR="/backups/pg"
mkdir -p "$DIR"
FILE="$DIR/kirana_$(date +%F_%H%M%S).sql.gz"
docker exec kirana_postgres pg_dump -U kirana kirana_inventory | gzip > "$FILE"
# keep last 30 days
find "$DIR" -type f -mtime +30 -delete
```

Schedule with cron:

```
0 2 * * * /opt/kirana/daily-backup.sh >> /var/log/kirana-backup.log 2>&1
```

## Client-side (PWA) backup

The app includes a **Settings → Download Backup** button that exports the entire
local IndexedDB database (products, categories, customers, sales, purchases, …)
as a single JSON file. Use this to:

- Migrate to a new device/browser.
- Keep an offline copy independent of the server.

Restore via **Settings → Restore from Backup**. This *replaces* the local database.

## Offsite / disaster recovery

- Copy the daily `pg_dump` files to offsite storage (S3, GCS, another server).
- Test a restore at least monthly: `gunzip < file.sql.gz | psql -U kirana kirana_inventory`.
- Keep the PWA JSON backups in cloud storage (Drive, etc.).

## Retention

| Backup type | Frequency | Retention |
|-------------|-----------|-----------|
| PostgreSQL dump | daily | 30 days local, 90 days offsite |
| PWA JSON export | on-demand (weekly recommended) | latest 5 versions |
