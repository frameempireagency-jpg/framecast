# FrameCast deploy recipe

End-to-end deploy of FrameCast to Hetzner + Coolify + Cloudflare R2. Target domain: `framecast.frameempire.co.uk`. Plan is for 6 internal Frame Empire users only.

## 1. Provision Hetzner

1. Hetzner Cloud console > New project "FrameCast" > Add Server.
2. Location: Falkenstein or Helsinki (EU). Image: Ubuntu 24.04. Type: CX22 (2 vCPU, 4 GB RAM, 40 GB SSD; plenty for 6 users).
3. SSH key: add yours. No cloud-init needed. Create.
4. Note the public IPv4. Open the firewall (Hetzner UI > Firewalls): allow 22, 80, 443 inbound. SSH in once to confirm access.

## 2. Install Coolify

SSH to the box, run the one-liner from the Coolify docs:

```
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

After it finishes, open `http://YOUR_IP:8000`, create the admin account, and set up a Cloudflare-issued SSL cert later (step 6). Coolify auto-renews via Let's Encrypt.

## 3. Cloudflare R2 setup

1. Cloudflare dashboard > R2 > Create bucket: `framecast-videos` (or whatever name; just be consistent).
2. R2 > Manage R2 API Tokens > Create API token: scope "Object Read & Write" on that bucket. Copy the **Access Key ID** and **Secret Access Key**, plus the **S3 API endpoint** (looks like `https://<accountid>.r2.cloudflarestorage.com`).
3. Bucket > Settings > CORS Policy. Add:
   ```
   [
     {
       "AllowedOrigins": ["https://framecast.frameempire.co.uk"],
       "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. Bucket > Settings > Public access: connect a custom domain like `r2.framecast.frameempire.co.uk` (Cloudflare creates the DNS automatically). That URL becomes `S3_PUBLIC_URL`.

## 4. DNS

In Cloudflare, on the `frameempire.co.uk` zone:

- `framecast` A record > Hetzner IP, proxied off (orange cloud OFF) so Coolify's Let's Encrypt challenge can hit the box directly.
- `r2.framecast` already created by step 3.4 above.
- For Resend (transactional email), add the SPF + DKIM TXT records that Resend generates when you verify the sending domain in step 5.

## 5. Resend (magic-link email)

1. Sign up at resend.com. Verify the sending domain `frameempire.co.uk` (it prompts you with TXT records).
2. API Keys > Create > full access. Copy the key.
3. From-address will be `auth@frameempire.co.uk` (assembled from `RESEND_FROM_DOMAIN`).

## 6. Coolify: import the stack

1. Coolify > New Resource > Docker Compose > paste this repo's `docker-compose.yml`. Coolify parses the services.
2. Set the domain on the `cap-web` service to `framecast.frameempire.co.uk`. Coolify provisions Let's Encrypt automatically; first cert issuance can take ~60s.
3. Environment variables (Coolify project env, not per-service):

```
# Public URL
CAP_URL=https://framecast.frameempire.co.uk
S3_PUBLIC_URL=https://r2.framecast.frameempire.co.uk

# Database (Coolify will generate strong passwords if you leave defaults)
MYSQL_PASSWORD=<random 24+ chars>
MYSQL_ROOT_PASSWORD=<random 24+ chars>
DATABASE_ENCRYPTION_KEY=<openssl rand -hex 32>
NEXTAUTH_SECRET=<openssl rand -hex 32>
MEDIA_SERVER_WEBHOOK_SECRET=<openssl rand -hex 32>

# Cloudflare R2 (replace the MinIO defaults)
MINIO_ROOT_USER=<R2 access key ID from step 3.2>
MINIO_ROOT_PASSWORD=<R2 secret access key from step 3.2>
CAP_AWS_BUCKET=framecast-videos
CAP_AWS_REGION=auto
S3_PUBLIC_ENDPOINT=https://r2.framecast.frameempire.co.uk
S3_INTERNAL_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_PATH_STYLE=false

# Magic-link email
RESEND_API_KEY=<from step 5.2>
RESEND_FROM_DOMAIN=frameempire.co.uk

# Sign-in allowlist (only @frameempire.co.uk can sign in)
EMAIL_ALLOWLIST_DOMAIN=frameempire.co.uk

# FrameCast feature gates (defaults are off, listed here for clarity)
NEXT_PUBLIC_IS_CAP=false
NEXT_PUBLIC_FEATURES_AI=false
NEXT_PUBLIC_FEATURES_MARKETING=false
```

Important: because we're using R2, you can remove the `minio` and `minio-setup` services from the compose before importing, or just ignore them (they run but nothing reads from them). The `cap-web` service uses `MINIO_ROOT_USER/PASSWORD` env names only because that's how the upstream compose wires them; the values are the R2 credentials.

4. Deploy. Watch the logs in Coolify. Healthy state: `cap-mysql` healthy, `cap-web` reports a successful Next.js boot on port 3000.

## 7. First-time login

1. Visit `https://framecast.frameempire.co.uk/login`.
2. Enter your `@frameempire.co.uk` email. You'll get a 6-digit verification code at that address.
3. Enter the code. NextAuth will create your account on first sign-in.
4. You'll be taken through Cap's onboarding flow. When asked for an organization name, enter `Frame Empire`. That single org becomes the shared workspace for the team.
5. Settings > Members > invite the other 5 employees by `@frameempire.co.uk` email. They follow the same login flow.

## 8. Verifying the allowlist works

```
# In the Coolify shell for cap-web:
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://framecast.frameempire.co.uk/api/auth/signin/email \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=test@gmail.com&csrfToken=..."
```

Expected: NextAuth redirects to `/api/auth/error?error=AccessDenied`. The container logs show `Sign-in blocked, email domain not on allowlist: test@gmail.com`. Repeating with an `@frameempire.co.uk` email returns a redirect to `/verify-otp` instead.

## Notes and gotchas

- If a recording upload fails with a CORS error, check step 3.3: the bucket's CORS allowed origin must exactly match the framecast subdomain (no trailing slash).
- The cap-mysql volume lives on the Hetzner box. Set up a nightly backup via Coolify's built-in backup feature or `rclone sync` to a second R2 bucket.
- If you ever toggle `NEXT_PUBLIC_FEATURES_AI=true` later, also set `GROQ_API_KEY` (or `OPENAI_API_KEY`) and `DEEPGRAM_API_KEY`. Without those keys the toggle just shows the tabs without populating them.
- Desktop app (Tauri) is still upstream Cap branded; employees install it from cap.so. Rebranding the desktop app is a separate project (Tauri icons, code signing certificate, app bundle metadata).
