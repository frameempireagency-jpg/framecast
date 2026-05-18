# FrameCast

Internal screen recorder for Frame Empire. Record. Share. Move on.

This is a Frame Empire fork of an open-source screen recorder. Internal use only.

## Stack

- Next.js 14 (web app under `apps/web`)
- Tauri v2 desktop app (under `apps/desktop`) - upstream branding, not yet rebranded
- MySQL via Drizzle ORM
- S3-compatible object storage (Cloudflare R2 in production, MinIO for local dev)
- NextAuth magic-link email login
- Turborepo + pnpm workspaces

## Local development

Prerequisites:

- Docker Desktop (Windows 11 needs WSL 2 enabled first)
- Node 20, pnpm 10.5.2 (only if developing outside containers)

Boot the full stack with the bundled docker-compose:

```
docker compose up -d
```

That starts the web app on port 3000, MySQL, MinIO (S3 mock) on 9000, and the media server on 3456. First boot takes a couple of minutes while MySQL initializes and Next.js does its standalone start.

Once it is up, open http://localhost:3000 and request a magic-link login. With `RESEND_API_KEY` unset, the magic link will be logged to the web container stdout:

```
docker compose logs cap-web | findstr /i "magic"
```

## Deployment

See [DEPLOY.md](DEPLOY.md) for the Hetzner + Coolify + Cloudflare R2 recipe.

## Branding tokens

- Primary purple `#521F88`
- Dark background `#0C0A0C`
- Success green `#25D366`
- On-dark text `#EFE9F8`
- Tagline: Record. Share. Move on.

## License

AGPL-3.0 (upstream). Internal use within Frame Empire only; not redistributed.
