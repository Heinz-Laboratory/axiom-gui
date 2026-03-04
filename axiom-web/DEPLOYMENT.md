# Deployment Guide - Axiom GUI

Complete guide for deploying Axiom GUI to production using GitHub Pages with automated CI/CD.

---

## Table of Contents

- [Overview](#overview)
- [GitHub Pages Setup](#github-pages-setup)
- [CI/CD Pipeline](#cicd-pipeline)
- [Custom Domain Configuration](#custom-domain-configuration)
- [Deployment Process](#deployment-process)
- [Monitoring](#monitoring)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)
- [Alternative Deployment Options](#alternative-deployment-options)

---

## Overview

### Production Deployment

- **Repository**: https://github.com/Heinz-Laboratory/axiom-gui
- **Hosting**: GitHub Pages
- **CI/CD**: GitHub Actions (automated on push to `main`)
- **Build Time**: ~8 minutes
- **SSL**: Enabled (certificate auto-renewed by GitHub)
- **CDN**: GitHub's global CDN

### Deployment Architecture

```
Developer
  └─> git push origin main
       └─> GitHub Actions Workflow Triggers
            └─> Install Dependencies
                 └─> Build WASM Backend
                      └─> Build Frontend (Vite)
                           └─> Deploy to GitHub Pages
                                └─> Live at GitHub Pages
```

---

## GitHub Pages Setup

### Prerequisites

1. **GitHub Account** with repository access
2. **Repository Settings** - Admin or write access
3. **GitHub Actions** enabled (default for public repos)

### Step-by-Step Setup

#### 1. Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Under "Source", select **GitHub Actions**
3. Save configuration

**CLI Method** (using GitHub API):
```bash
# Enable Pages with GitHub CLI
gh api repos/OWNER/REPO/pages \
  -X POST \
  -f build_type=workflow
```

#### 2. Configure Build Settings

**File**: `.github/workflows/deploy-pages.yml`

This workflow file is already configured and committed to the repository. No manual changes needed.

#### 3. Set Base Path

**File**: `vite.config.ts`

```typescript
export default defineConfig({
  base: '/axiom-gui/',  // Repository name
  // ... other config
});
```

**Why**: GitHub Pages serves from `https://username.github.io/repo-name/`, so assets need this base path.

#### 4. Add SPA Routing Fallback

**File**: `public/404.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Axiom GUI</title>
  <script>
    // Redirect 404s to index.html for SPA routing
    window.location.href = '/axiom-gui/';
  </script>
</head>
<body></body>
</html>
```

**Why**: Single-page apps need to handle client-side routing.

---

## CI/CD Pipeline

### Workflow Overview

**File**: `.github/workflows/deploy-pages.yml`

**Trigger**: Push to `main` branch

**Steps**:
1. Checkout code
2. Setup Rust toolchain (for WASM build)
3. Setup Node.js 20
4. Install dependencies
5. Build WASM backend
6. Build frontend (Vite)
7. Upload artifacts to GitHub Pages
8. Deploy to production

### Workflow Configuration

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:  # Allow manual triggers

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
          override: true

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: axiom-web/package-lock.json

      - name: Install wasm-pack
        run: cargo install wasm-pack

      - name: Build WASM Backend
        run: |
          cd axiom-renderer
          wasm-pack build --target web --out-dir ../axiom-web/src/wasm

      - name: Install Frontend Dependencies
        run: |
          cd axiom-web
          npm ci

      - name: Build Frontend
        run: |
          cd axiom-web
          npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: axiom-web/dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Build Time Breakdown

| Step | Duration | Notes |
|------|----------|-------|
| Checkout | ~5s | Clone repository |
| Setup Rust | ~30s | Install toolchain |
| Setup Node.js | ~10s | Install Node.js 20 |
| Install wasm-pack | ~60s | Compile from source |
| Build WASM | ~90s | Rust compilation |
| Install npm deps | ~30s | With npm cache |
| Build frontend | ~45s | Vite build |
| Upload artifact | ~15s | Compress dist/ |
| Deploy | ~30s | Push to Pages |
| **Total** | **~8 min** | Typical runtime |

### Caching Strategy

**Node.js Cache**:
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Caches node_modules/
```

**Rust Cache** (optional, not currently enabled):
```yaml
- uses: Swatinem/rust-cache@v2  # Caches target/ directory
```

---

## Custom Domain Configuration (Optional)

### Setting Up Custom Domain

If you want to deploy to a custom domain instead of GitHub Pages default URL:

#### Option 1: Subdomain (e.g., axiom.yourdomain.com)

1. **DNS Configuration** (at domain registrar):
   ```
   Type: CNAME
   Name: axiom
   Value: heinz-laboratory.github.io
   ```

2. **GitHub Pages Settings**:
   - Go to **Settings** → **Pages**
   - Enter custom domain: `axiom.yourdomain.com`
   - Enable "Enforce HTTPS" (after DNS propagates)

3. **Update Vite Config**:
   ```typescript
   base: '/',  // Remove /axiom-gui/ path
   ```

4. **Push changes** to trigger rebuild

#### Option 2: Apex Domain (e.g., axiom-gui.com)

1. **DNS Configuration**:
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```

2. **GitHub Pages Settings**: Same as subdomain

3. **Update Vite Config**: Same as subdomain

### HTTPS/SSL Certificate

**Automatic**: GitHub Pages automatically provisions SSL certificates via Let's Encrypt.

**Certificate Details**:
- Issuer: GitHub Pages
- Validity: 90 days (auto-renews)
- Current expiration: 2026-04-16

**Forced HTTPS**:
- Always enabled for custom domains
- HTTP requests redirect to HTTPS

---

## Deployment Process

### Automated Deployment (Recommended)

**Trigger**: Push to `main` branch

```bash
# Make changes locally
git add .
git commit -m "feat: add new feature"

# Push to main
git push origin main

# GitHub Actions automatically deploys
```

**Monitoring Deployment**:
1. Go to **Actions** tab in GitHub
2. Click latest workflow run
3. Monitor build steps
4. Wait for "Deploy to GitHub Pages" to complete (~8 min)
5. Verify at production URL

### Manual Deployment

**Trigger Workflow Manually**:

1. Go to **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow** button

**CLI Method** (GitHub CLI):
```bash
gh workflow run deploy-pages.yml --ref main
```

### Local Build and Deploy

**Not recommended**, but possible for testing:

```bash
# Build locally
cd axiom-web
npm run build

# Verify dist/ output
ls -lh dist/

# Deploy manually (using gh-pages package)
npm install -g gh-pages
gh-pages -d dist
```

---

## Monitoring

### Deployment Status

**Check Workflow Status**:
```bash
gh run list --workflow=deploy-pages.yml
gh run view <RUN_ID> --log
```

**Web UI**:
- Repository → Actions → Latest run

### Production Health Checks

**Verify Site Accessibility**:
```bash
curl -I https://heinz-laboratory.github.io/axiom-gui/
# Should return: HTTP/2 200
```

**Check WASM Loading**:
```bash
curl -I https://heinz-laboratory.github.io/axiom-gui/assets/axiom-renderer.wasm
# Should return: HTTP/2 200
# Content-Type: application/wasm
```

**Lighthouse Audit**:
```bash
npm install -g @lhci/cli
lhci autorun --url=https://heinz-laboratory.github.io/axiom-gui/
```

**Expected Scores**:
- Performance: ≥85 (currently 89)
- Accessibility: ≥95 (currently 100)
- Best Practices: ≥95 (currently 100)
- SEO: ≥90 (currently 100)

### Error Tracking

**Browser Console Errors**:
1. Open DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed requests

**GitHub Actions Logs**:
```bash
gh run view <RUN_ID> --log-failed
```

---

## Rollback Procedures

### Option 1: Revert Git Commit

```bash
# Find commit hash to revert to
git log --oneline

# Revert to previous commit
git revert <COMMIT_HASH>

# Push (triggers automatic redeploy)
git push origin main
```

### Option 2: Redeploy Specific Commit

```bash
# Checkout previous commit
git checkout <COMMIT_HASH>

# Create temporary branch
git checkout -b rollback-temp

# Force push to main (USE WITH CAUTION)
git push origin rollback-temp:main --force
```

### Option 3: Manual Rollback via GitHub UI

1. Go to **Actions** tab
2. Find successful previous deployment
3. Click **Re-run jobs**
4. Wait for deployment to complete

### Rollback SLA

- **Detection Time**: <5 minutes (manual checks)
- **Rollback Time**: <10 minutes (automated revert + redeploy)
- **Total Recovery**: <15 minutes

---

## Troubleshooting

### Common Deployment Issues

#### 1. Workflow Fails at "Setup Pages" Step

**Error**: `Error: Resource not accessible by integration`

**Cause**: GitHub Pages not enabled in repository settings

**Solution**:
```bash
# Enable Pages via API
gh api repos/OWNER/REPO/pages \
  -X POST \
  -f build_type=workflow
```

#### 2. 404 Not Found on Production

**Cause**: Base path mismatch in Vite config

**Solution**:
```typescript
// vite.config.ts
export default defineConfig({
  base: '/axiom-gui/',  // Must match repository name
});
```

#### 3. WASM Module Not Loading

**Error**: `Failed to load WASM module`

**Cause**: Incorrect MIME type or path

**Solution**:
- Verify `public/404.html` redirects correctly
- Check Network tab for WASM file (should be `application/wasm`)
- Ensure WASM built with correct target:
  ```bash
  wasm-pack build --target web
  ```

#### 4. Assets 404 (CSS, JS Not Loading)

**Cause**: Base path not set in Vite config

**Solution**:
- Verify `base: '/axiom-gui/'` in `vite.config.ts`
- Rebuild with `npm run build`
- Check `dist/index.html` has correct asset paths

#### 5. Build Fails at WASM Step

**Error**: `wasm-pack: command not found`

**Cause**: wasm-pack not installed in workflow

**Solution**:
- Verify workflow has `cargo install wasm-pack` step
- Or use pre-installed action:
  ```yaml
  - uses: jetli/wasm-pack-action@v0.4.0
  ```

#### 6. Deployment Slow (>15 minutes)

**Cause**: No caching, large dependencies

**Solutions**:
- Enable Node.js cache: `cache: 'npm'`
- Enable Rust cache: `uses: Swatinem/rust-cache@v2`
- Use `npm ci` instead of `npm install` (faster)

---

## Alternative Deployment Options

### Vercel

**Advantages**:
- Faster builds (~3 min)
- Automatic preview deployments
- Built-in analytics

**Setup**:
```bash
npm install -g vercel
vercel login
vercel --prod
```

**Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

### Netlify

**Advantages**:
- Form handling
- Serverless functions
- A/B testing

**Setup**:
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy

### Cloudflare Pages

**Advantages**:
- Global CDN
- Fastest edge network
- Unlimited bandwidth

**Setup**:
1. Connect GitHub repository
2. Build command: `npm run build`
3. Build output: `dist`
4. Deploy

### AWS S3 + CloudFront

**Advantages**:
- Full control
- Custom caching rules
- Advanced security

**Setup** (complex, not detailed here):
1. Create S3 bucket
2. Upload `dist/` contents
3. Setup CloudFront distribution
4. Configure DNS

---

## Production Checklist

### Pre-Deployment

- [ ] All tests passing (`npm test && npm run test:e2e`)
- [ ] No TypeScript errors (`npm run build`)
- [ ] Linting clean (`npm run lint`)
- [ ] Bundle size within limits (<500 KB JS, <5.5 MB WASM)
- [ ] Lighthouse scores meet targets (Perf ≥85, A11y ≥95, BP ≥95, SEO ≥90)
- [ ] Manual testing on Chrome, Firefox, Safari
- [ ] Mobile responsive testing
- [ ] Accessibility testing (keyboard navigation)

### Post-Deployment

- [ ] Production URL accessible (HTTP 200)
- [ ] WASM module loads correctly
- [ ] WebGPU initializes (no renderer errors)
- [ ] Sample files load
- [ ] All features functional (rendering, export, camera)
- [ ] No console errors
- [ ] HTTPS enabled (padlock icon)
- [ ] Custom domain resolves (if applicable)
- [ ] Lighthouse audit passing

### Monitoring (Ongoing)

- [ ] Weekly Lighthouse audits
- [ ] Monthly dependency updates (`npm outdated`)
- [ ] SSL certificate auto-renewal check
- [ ] GitHub Actions workflow health
- [ ] User-reported issues tracking

---

## Deployment Commands Reference

### Local Testing

```bash
# Build production bundle
npm run build

# Preview production build
npm run preview

# Test production bundle locally
cd dist && python3 -m http.server 8080
```

### GitHub CLI Commands

```bash
# Trigger deployment manually
gh workflow run deploy-pages.yml

# Check workflow status
gh run list --workflow=deploy-pages.yml --limit 5

# View workflow logs
gh run view --log

# View specific job logs
gh run view <RUN_ID> --job <JOB_ID> --log
```

### Production Verification

```bash
# Check site status
curl -I https://heinz-laboratory.github.io/axiom-gui/

# Download and check WASM
curl -o test.wasm https://heinz-laboratory.github.io/axiom-gui/assets/axiom-renderer.wasm
file test.wasm  # Should say "WebAssembly (wasm) binary module"

# Run Lighthouse
CHROME_PATH=~/.cache/ms-playwright/chromium-1208/chrome-linux/chrome \
  npx lighthouse https://heinz-laboratory.github.io/axiom-gui/ \
  --output=html \
  --output-path=./lighthouse-report.html
```

---

## Support

### Deployment Issues

If you encounter deployment issues not covered in this guide:

1. **Check GitHub Actions logs** for detailed error messages
2. **Search existing issues**: https://github.com/fl-sean03/axiom-gui/issues
3. **Create new issue** with:
   - Workflow run URL
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior

### Contact

- **Repository**: https://github.com/fl-sean03/axiom-gui
- **Issues**: https://github.com/fl-sean03/axiom-gui/issues

---

## Changelog

### 2026-03-04 - Initial Production Deployment

- ✅ GitHub Pages enabled
- ✅ CI/CD pipeline configured
- ✅ Hosted on Heinz-Laboratory GitHub organization
- ✅ HTTPS enabled
- ✅ Automated deployments on push to main

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: 2026-03-04
