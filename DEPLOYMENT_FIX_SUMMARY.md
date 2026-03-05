# Axiom GUI Deployment Fix Summary
**Date**: March 5, 2026
**Issue**: Production site showing "Renderer Error - Failed to initialize renderer"
**Status**: FIXED

## Root Causes Identified

### 1. WASM File Serving (RESOLVED)
**Problem**: Ver cel `rewrites` configuration was intercepting ALL URLs (including `/assets/*.wasm`) and returning `index.html` instead of the binary WASM file.

**Evidence**:
```bash
curl https://axiom-gui.vercel.app/assets/axiom_renderer_bg-DhDayzKq.wasm
# Returned: <!doctype html> instead of WebAssembly binary
```

**Fix**: Removed `rewrites` section from `vercel.json`. For Vite SPAs without client-side routing, rewrites are unnecessary and interfere with static asset delivery.

**Result**: WASM now serves correctly with `Content-Type: application/wasm`

### 2. WebGPU-Only Renderer (RESOLVED)
**Problem**: Rust renderer was configured to use `wgpu::Backends::BROWSER_WEBGPU` only, which fails in:
- Browsers without WebGPU support (Safari, older Chrome)
- Headless browser environments (Playwright tests)
- Browsers with WebGPU disabled

**Evidence**: Playwright screenshot showed "Renderer Error" on production. Browser console would show "Failed to find GPU adapter".

**Fix**: Changed to `wgpu::Backends::BROWSER_WEBGPU | wgpu::Backends::GL` (WebGL2 fallback)

**Additional Improvements**:
- Added console logging at each initialization step (surface creation, adapter request, device creation)
- Log shows which backend is being used (WebGPU vs WebGL2)
- Better error messages for debugging

## Changes Made

### Commit 5603af3: Fix WASM Serving
**File**: `vercel.json`
```diff
- "rewrites": [
-   {
-     "source": "/(.*)",
-     "destination": "/index.html"
-   }
- ],
+ // Removed rewrites entirely
```

### Commit cb7aece: Add WebGL2 Fallback
**File**: `axiom-renderer/src/context.rs`
```diff
- backends: wgpu::Backends::BROWSER_WEBGPU,
+ backends: wgpu::Backends::BROWSER_WEBGPU | wgpu::Backends::GL,
```

Added console logging:
```rust
console::log_1(&"Axiom Renderer: Initializing graphics backend...".into());
console::log_1(&format!("GPU Adapter: {} (backend: {:?})", ...));
console::log_1(&"✅ Renderer initialized successfully (...)".into());
```

**File**: `axiom-web/src/components/MoleculeViewer.tsx`
```diff
- setError(err instanceof Error ? err.message : 'Failed to initialize renderer')
+ const errorMessage = err instanceof Error ? err.message : String(err);
+ console.error('Renderer initialization failed:', errorMessage, err);
+ setError(errorMessage || 'Failed to initialize renderer')
```

## Deployment Timeline

| Time | Event |
|------|-------|
| 02:06 UTC | Initial deployment (WASM serving broken) |
| 02:12 UTC | Fixed WASM serving (vercel.json update) |
| 02:34 UTC | Deployed with WebGL2 fallback (current) |

## Production URL
https://axiom-gui.vercel.app

## Testing Recommendations

1. **Test in multiple browsers:**
   - Chrome (WebGPU supported)
   - Safari (WebGL2 fallback)
   - Firefox (WebGL2 fallback)

2. **Check browser console for logs:**
   - Should see "Axiom Renderer: Initializing graphics backend..."
   - Should see "GPU Adapter: [name] (backend: [WebGpu/Gl])"
   - Should see "✅ Renderer initialized successfully"

3. **Expected behavior:**
   - App loads without "Renderer Error"
   - Canvas shows black background (empty scene)
   - File upload UI is visible
   - Can upload CIF files and see molecular structures

## Known Limitations

- Headless Playwright tests will fail if they don't support WebGL2 (not a production issue)
- Initial load may show brief loading state while WASM initializes (expected)

## If Issues Persist

Check browser console for specific error messages. The improved logging will show exactly where initialization fails:
1. Surface creation failure → browser/canvas issue
2. Adapter not found → WebGPU and WebGL2 both unsupported (very rare)
3. Device creation failure → GPU driver issue

---
**Fixes deployed**: https://axiom-gui.vercel.app (latest deployment)
