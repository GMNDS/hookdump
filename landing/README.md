# Hookdump Landing Page

Static landing page for [hookdump.dev](https://hookdump.dev).

## Deploy

Deployment is automated via GitHub Actions (`.github/workflows/deploy-landing.yml`).

On push to `main`, the landing page is deployed to Cloudflare Pages.

### Manual Deploy (if needed)

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy landing --project-name=hookdump-landing
```

### Custom Domain

After first deploy:
1. Cloudflare Dashboard → Pages → hookdump-landing
2. Custom domains → Add `hookdump.dev`

## Waitlist

The waitlist form is hosted on [Tally](https://tally.so):
- Form URL: https://tally.so/r/81ZJXY
- Responses are collected in Tally dashboard
