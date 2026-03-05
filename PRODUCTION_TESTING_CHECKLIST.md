# Axiom GUI - Production Testing Checklist

**Production URL**: https://axiom-gui.vercel.app
**Last Updated**: 2026-03-05
**Test Status**: 🟡 In Progress

This is a **living document** that will be continuously updated with new tests, validations, and gates as the application evolves.

---

## Testing Philosophy

> "Maximum effort always, don't care about timeline, just build the best application we can." — Sean F

**Critical Rule**: Never declare work "complete" without validating the output against production.

**Validation Loop**:
1. Generate output (run test, capture screenshot, verify feature)
2. **Immediately validate** - actually check the result
3. **Analyze what's right and wrong** - list specific issues
4. If issues found → debug → fix → regenerate → go to step 2
5. Only complete when ALL validation criteria pass

---

## Test Execution Status

### Legend
- ✅ PASS - Verified working in production
- ❌ FAIL - Not working, issue documented
- 🟡 PARTIAL - Works with caveats
- ⏸️ BLOCKED - Cannot test yet (dependency missing)
- ⏭️ SKIP - Not applicable in current context

---

## 1. CORE FUNCTIONALITY TESTS

### 1.1 Application Bootstrap
- [ ] **Page loads without errors** (no console errors, no 404s)
- [ ] **WebGPU support detection** (shows compatibility warning on unsupported browsers)
- [ ] **WASM module loads** (axiom_renderer_bg.wasm found and initialized)
- [ ] **Canvas renders** (WebGPU canvas element present and functional)
- [ ] **Initial empty state** ("No molecule loaded" message displayed)

**Passing Criteria**:
- Zero JavaScript errors in console
- WASM module loads within 3 seconds
- Canvas element has non-zero dimensions
- Page fully interactive within 5 seconds

---

### 1.2 File Loading

#### 1.2.1 Sample Structure Loading
- [ ] **Benzene sample loads** (12 atoms, C₆H₆ visible)
- [ ] **Water sample loads** (3 atoms, H-O-H bonds visible)
- [ ] **Quartz sample loads** (SiO₂ crystal structure visible)
- [ ] **Simple Cubic sample loads** (basic lattice structure visible)
- [ ] **Structure metadata displays** (atom count, element list, composition)

**Passing Criteria**:
- Sample dropdown/button accessible
- Each sample loads within 2 seconds
- Correct number of atoms rendered
- Chemical formula matches expected
- Bonds connect atom centers (no floating bonds)

#### 1.2.2 CIF File Upload
- [ ] **File picker button visible**
- [ ] **Drag-and-drop zone functional**
- [ ] **Valid CIF parses correctly** (fractional coords → Cartesian)
- [ ] **Invalid CIF shows error** (clear error message, no crash)
- [ ] **10 MB file size limit enforced** (error message for oversized files)
- [ ] **File upload clears previous structure**

**Passing Criteria**:
- Upload completes within 5 seconds for <1 MB files
- Parser validates required CIF fields
- Error messages are user-friendly
- No memory leaks on multiple uploads

---

## 2. VISUALIZATION TESTS

### 2.1 Rendering Modes

#### 2.1.1 Ball-and-Stick Mode (Default)
- [ ] **Atoms render as spheres** (scaled by atomic radius)
- [ ] **Bonds render as cylinders** (connecting atom centers)
- [ ] **Colors match element types** (C=gray, H=white, O=red, etc.)
- [ ] **Keyboard shortcut `1` works**

**Visual Validation**:
- [ ] **Spheres are smooth** (no visible polygons at default zoom)
- [ ] **Bonds connect properly** (no gaps, no overlaps)
- [ ] **Depth perception** (atoms further away appear smaller/dimmer)

#### 2.1.2 Space-Filling Mode
- [ ] **Atoms render as large spheres** (Van der Waals radii)
- [ ] **Bonds hidden**
- [ ] **Keyboard shortcut `2` works**

**Visual Validation**:
- [ ] **Spheres overlap naturally** (molecular packing visible)
- [ ] **No z-fighting** (no flickering overlaps)

#### 2.1.3 Wireframe Mode
- [ ] **Atoms render as small dots**
- [ ] **Bonds render as thin lines**
- [ ] **Keyboard shortcut `3` works**

**Visual Validation**:
- [ ] **Lines are crisp** (anti-aliased, no jagged edges)
- [ ] **No occlusion** (can see through structure)

#### 2.1.4 Stick Mode
- [ ] **Atoms render as small spheres** (junction points)
- [ ] **Bonds render as thick cylinders**
- [ ] **Keyboard shortcut `4` works**

**Visual Validation**:
- [ ] **Cylinders are smooth**
- [ ] **Junctions look clean** (no gaps between atom and bond)

---

### 2.2 Camera Controls

#### 2.2.1 Mouse/Touch Controls
- [ ] **Left-click drag rotates** (arcball rotation)
- [ ] **Middle-click drag pans** (translate view)
- [ ] **Scroll wheel zooms** (smooth zoom in/out)
- [ ] **Shift + left-click pans** (alternate pan gesture)
- [ ] **Touch gestures work** (one-finger rotate, two-finger pan, pinch zoom)

**Passing Criteria**:
- Rotation is smooth (60 FPS target)
- Zoom centers on mouse cursor position
- No camera jitter or snapping

#### 2.2.2 Camera Presets
- [ ] **Front view (F key)** (view along +Z axis)
- [ ] **Back view (Shift+F)** (view along -Z axis)
- [ ] **Top view (T key)** (view along +Y axis)
- [ ] **Bottom view (Shift+T)** (view along -Y axis)
- [ ] **Left view (L key)** (view along -X axis)
- [ ] **Right view (Shift+L)** (view along +X axis)
- [ ] **Reset camera (Space)** (return to default view)

**Visual Validation**:
- [ ] **Animation is smooth** (400ms transition)
- [ ] **Orthogonal views are precise** (exactly 90° rotations)

#### 2.2.3 Manual Camera Adjustment
- [ ] **Rotation sliders work** (X, Y, Z axis control)
- [ ] **Zoom slider works** (FOV 30°–90°)
- [ ] **Reset button works** (returns to default)

---

### 2.3 Selection & Measurement

#### 2.3.1 Atom Selection
- [ ] **Click on atom selects it** (highlight appears)
- [ ] **Selection info displays** (element, position, index)
- [ ] **Click background deselects** (highlight removed)
- [ ] **Escape key deselects** (keyboard shortcut)

**Visual Validation**:
- [ ] **Highlight is visible** (yellow glow or outline)
- [ ] **Fractional coordinates displayed** (0.0–1.0 range)
- [ ] **Cartesian coordinates displayed** (Angstroms)

#### 2.3.2 Distance Measurement
- [ ] **Measure Distance button works** (or M key)
- [ ] **Click two atoms measures distance** (line drawn, distance shown)
- [ ] **Distance in Angstroms** (Å symbol, 2 decimal places)
- [ ] **Line color distinct** (visible against background)
- [ ] **Clear button works** (removes measurement)

**Validation Criteria**:
- [ ] **Distance calculation accurate** (verify with known bond lengths)
  - H-O bond in water: ~0.96 Å
  - C-C bond in benzene: ~1.40 Å

#### 2.3.3 Angle Measurement
- [ ] **Measure Angle button works** (or A key)
- [ ] **Click three atoms measures angle** (vertex → arm1 → arm2)
- [ ] **Angle in degrees** (° symbol, 1 decimal place)
- [ ] **Visual indicator drawn** (arc or lines)
- [ ] **Clear button works**

**Validation Criteria**:
- [ ] **Angle calculation accurate** (verify with known angles)
  - H-O-H angle in water: ~104.5°

---

## 3. EXPORT FUNCTIONALITY

### 3.1 PNG Export
- [ ] **1080p export (1920×1080)** (file downloads)
- [ ] **4K export (3840×2160)** (file downloads, larger file size)
- [ ] **Custom resolution export** (user-specified dimensions)
- [ ] **Filename includes timestamp** (axiom-export-YYYYMMDD-HHMMSS.png)
- [ ] **Transparent background option** (alpha channel preserved)
- [ ] **Solid background option** (opaque fill)

**Visual Validation** (open exported PNG in external viewer):
- [ ] **Image matches canvas view** (same camera angle, rendering mode)
- [ ] **Resolution correct** (metadata shows 1920×1080 or 3840×2160)
- [ ] **No compression artifacts** (PNG lossless compression)
- [ ] **Colors accurate** (element colors match canvas)

### 3.2 SVG Export
- [ ] **SVG file downloads** (vector graphics format)
- [ ] **Filename includes timestamp**
- [ ] **Scalable** (zoom in external viewer, no pixelation)
- [ ] **Editable** (can open in Inkscape/Illustrator)

**Known Limitations**:
- No lighting/shadows (simplified representation)
- Basic atom/bond shapes only

---

## 4. KEYBOARD SHORTCUTS

### 4.1 Global Shortcuts
- [ ] **? key** - Show keyboard shortcuts help dialog
- [ ] **Escape key** - Close current panel or dialog

### 4.2 View Shortcuts
- [ ] **1 key** - Ball-and-stick mode
- [ ] **2 key** - Space-filling mode
- [ ] **3 key** - Wireframe mode
- [ ] **4 key** - Stick mode
- [ ] **F key** - Front camera view
- [ ] **T key** - Top camera view
- [ ] **L key** - Left camera view
- [ ] **Space key** - Reset camera
- [ ] **+/- keys** - Zoom in/out
- [ ] **Arrow keys** - Rotate camera

### 4.3 Panel Shortcuts
- [ ] **S key** - Toggle Settings panel
- [ ] **C key** - Toggle Camera Controls panel
- [ ] **E key** - Toggle Export panel
- [ ] **M key** - Start distance measurement
- [ ] **A key** - Start angle measurement

### 4.4 File Shortcuts
- [ ] **Ctrl+O** - Open file upload dialog
- [ ] **Ctrl+S** - Save current view as PNG

**Passing Criteria**:
- Shortcuts work when canvas has focus
- Shortcuts documented in help dialog
- No conflicts with browser shortcuts

---

## 5. UI/UX TESTS

### 5.1 Responsive Design
- [ ] **Desktop (1920×1080)** - Full layout, sidebars visible
- [ ] **Laptop (1366×768)** - Compact layout, scrollable panels
- [ ] **Tablet (768×1024)** - Stacked layout, collapsible panels
- [ ] **Mobile (375×667)** - Single column, touch-optimized controls

**Passing Criteria**:
- No horizontal scrolling required
- All controls accessible (no off-screen buttons)
- Touch targets ≥44×44 pixels on mobile

### 5.2 Accessibility (WCAG 2.1 AA)
- [ ] **Keyboard navigation** - Tab through all controls
- [ ] **Focus indicators** - Visible focus ring on all interactive elements
- [ ] **Screen reader support** - ARIA labels on canvas, buttons
- [ ] **Color contrast** - 4.5:1 for text, 3:1 for UI components
- [ ] **Alt text** - Images have descriptive alt attributes

**Automated Tests**:
- [ ] **Lighthouse Accessibility score ≥100**
- [ ] **axe DevTools**: 0 violations

### 5.3 Error Handling
- [ ] **WebGPU not supported** - Clear upgrade instructions
- [ ] **File upload error** - User-friendly message (no stack traces)
- [ ] **Parse error** - Specific CIF field missing indicated
- [ ] **Network error** - Offline detection, retry options
- [ ] **Memory exhausted** - Graceful degradation, reload prompt

**Passing Criteria**:
- Error messages actionable (tell user what to do)
- No white screen of death (error boundary catches crashes)

---

## 6. PERFORMANCE TESTS

### 6.1 Load Time
- [ ] **Initial page load <3 seconds** (Time to Interactive)
- [ ] **WASM module load <2 seconds** (first structure render ready)
- [ ] **Sample structure load <1 second** (benzene/water)

**Metrics** (Chrome DevTools):
- First Contentful Paint (FCP): <1.8s
- Largest Contentful Paint (LCP): <2.5s
- Time to Interactive (TTI): <3.0s

### 6.2 Runtime Performance
- [ ] **60 FPS rotation** (smooth arcball)
- [ ] **No memory leaks** (load 10 structures, memory stable)
- [ ] **Render <16ms** (per frame budget for 60 FPS)

**Stress Tests**:
- [ ] **Large structure (1000+ atoms)** - still renders at 30+ FPS
- [ ] **Rapid mode switching** - no visual glitches
- [ ] **100 camera preset clicks** - no performance degradation

### 6.3 Bundle Size
- [ ] **JavaScript bundle <300 KB gzipped**
- [ ] **WASM module <200 KB gzipped**
- [ ] **Total initial load <500 KB**

**Current Metrics** (from last build):
- JavaScript: 268.08 KB gzipped ✅
- WASM: 150 KB gzipped ✅
- CSS: 27.79 KB gzipped ✅

### 6.4 Lighthouse Scores
- [ ] **Performance: ≥85/100**
- [ ] **Accessibility: 100/100**
- [ ] **Best Practices: 100/100**
- [ ] **SEO: 100/100**

---

## 7. CROSS-BROWSER COMPATIBILITY

### 7.1 Chrome/Chromium (113+)
- [ ] **WebGPU enabled by default**
- [ ] **All features functional**
- [ ] **Visual regression tests pass**

### 7.2 Edge (113+)
- [ ] **WebGPU enabled by default**
- [ ] **All features functional**

### 7.3 Firefox (121+)
- [ ] **WebGPU flag instructions shown**
- [ ] **After enabling flag: all features functional**

### 7.4 Safari (18+)
- [ ] **WebGPU availability detected**
- [ ] **Fallback message if not supported**

---

## 8. VISUAL REGRESSION TESTS

### 8.1 Rendering Accuracy
- [ ] **Water molecule bonds** - 2 H-O bonds at 104.5° angle
- [ ] **Benzene ring** - 6 carbon atoms in hexagon, all bonds equal length
- [ ] **Quartz lattice** - Si-O tetrahedra visible, periodic structure

**Visual Validation** (compare screenshots to baseline):
- [ ] **No floating bonds** (bonds connect atom centers)
- [ ] **No missing atoms** (atom count matches CIF)
- [ ] **Correct colors** (element colors from standard CPK palette)
- [ ] **Proper depth** (occlusion correct, front atoms visible)

### 8.2 UI Consistency
- [ ] **Sidebar width consistent** (280px on desktop)
- [ ] **Button alignment** (no misaligned controls)
- [ ] **Font rendering** (crisp text, no blurry labels)
- [ ] **Icon clarity** (SVG icons sharp at all sizes)

---

## 9. EDGE CASES & STRESS TESTS

### 9.1 Unusual Structures
- [ ] **Single atom** (renders without crash)
- [ ] **No bonds** (atoms render, no bond errors)
- [ ] **Huge unit cell** (>100 Å, camera auto-adjusts)
- [ ] **Fractional occupancy** (partially occupied sites render)

### 9.2 User Behavior
- [ ] **Rapid clicking** (selection doesn't break)
- [ ] **Upload same file twice** (handles duplicate gracefully)
- [ ] **Cancel upload mid-parse** (no orphaned state)
- [ ] **Resize window during render** (canvas adapts)
- [ ] **Switch tabs during load** (resumes when tab active)

### 9.3 Network Conditions
- [ ] **Slow 3G** (app still loads, shows progress)
- [ ] **Offline** (service worker? or clear error message)
- [ ] **CDN failure** (fallback for external dependencies)

---

## 10. INTEGRATION TESTS

### 10.1 Full User Flows

#### Flow 1: New User First Visit
1. Open https://axiom-gui.vercel.app
2. See empty state message
3. Click "Load Sample" → Benzene
4. Structure renders in Ball-and-Stick mode
5. Click atom → selection info shows
6. Press `2` → switches to Space-Filling mode
7. Press `F` → camera rotates to Front view
8. Press `E` → Export panel opens
9. Click "Export PNG (1080p)" → file downloads
10. Open downloaded file → matches canvas view

**Expected Duration**: <2 minutes
**Passing Criteria**: All 10 steps complete without errors

#### Flow 2: Upload Custom CIF
1. Load production site
2. Drag valid CIF file to canvas
3. Structure parses and renders
4. Click two atoms → measure distance
5. Distance shows correct value (±0.1 Å)
6. Export as SVG
7. Open SVG in Inkscape → structure visible

**Expected Duration**: <3 minutes
**Passing Criteria**: SVG exports cleanly, distance accurate

#### Flow 3: Keyboard Power User
1. Load site
2. Press `Ctrl+O` → file dialog opens
3. Select benzene.cif
4. Press `3` → Wireframe mode
5. Press `T` → Top view
6. Press `M` → Measure mode
7. Click two atoms → distance shown
8. Press `Ctrl+S` → PNG downloads
9. Press `?` → Help dialog opens
10. Press `Escape` → Dialog closes

**Expected Duration**: <90 seconds
**Passing Criteria**: All shortcuts responsive

---

## 11. SECURITY & PRIVACY

### 11.1 Data Handling
- [ ] **No telemetry** (no user tracking without consent)
- [ ] **Local processing** (CIF parsing happens client-side)
- [ ] **No file upload to server** (files stay in browser memory)
- [ ] **Clear data on reload** (no LocalStorage of sensitive structures)

### 11.2 Content Security Policy
- [ ] **CSP headers present** (check Response headers)
- [ ] **No inline scripts** (all JS in external files)
- [ ] **No eval()** (CSP blocks eval, no errors)

---

## 12. DOCUMENTATION VALIDATION

### 12.1 README Accuracy
- [ ] **All features listed exist** (no phantom features)
- [ ] **Screenshots current** (match production site)
- [ ] **Browser requirements accurate** (WebGPU versions correct)
- [ ] **Installation steps work** (npm install, npm run dev succeeds)

### 12.2 Error Messages
- [ ] **Match documentation** (help text consistent with docs)
- [ ] **Links work** (no 404s in error messages)

---

## 13. REGRESSION TESTS

### 13.1 Previous Bugs Fixed
- [ ] **WASM module missing** (EXT-AXIOM-001) - Fixed 2026-03-04
  - Verify: axiom_renderer_bg.wasm loads at /assets/*.wasm
  - Test: Load any sample structure → renders without "Cannot read 'invoke'" error

- [ ] **Personal domain boundary** (EXT-AXIOM-002) - Fixed 2026-03-04
  - Verify: Production URL is https://axiom-gui.vercel.app (NOT seanflorez.com)
  - Test: Check deployment URLs in README, DEPLOYMENT.md

- [ ] **Floating bonds bug** (if existed in earlier versions)
  - Test: Load water sample → H-O bonds connect atom centers (no gaps)

---

## 14. PRODUCTION-SPECIFIC TESTS

### 14.1 Vercel Deployment
- [ ] **Production domain resolves** (https://axiom-gui.vercel.app)
- [ ] **HTTPS certificate valid** (no security warnings)
- [ ] **Environment: production** (check Vercel dashboard)
- [ ] **Build logs clean** (no errors in deployment log)
- [ ] **Source maps available** (for debugging production issues)

### 14.2 CDN & Caching
- [ ] **Static assets cached** (Cache-Control headers present)
- [ ] **WASM cached** (verify 304 Not Modified on reload)
- [ ] **Immutable assets** (JS/CSS have content hashes in filename)

---

## 15. CONTINUOUS TESTING

### 15.1 Automated CI/CD
- [ ] **E2E tests run on deploy** (Playwright tests in GitHub Actions)
- [ ] **Visual regression tests** (screenshot diffs checked)
- [ ] **Lighthouse CI** (performance budgets enforced)

### 15.2 Monitoring (Future)
- [ ] **Error tracking** (Sentry or similar)
- [ ] **Performance monitoring** (RUM metrics)
- [ ] **Usage analytics** (privacy-respecting)

---

## TEST EXECUTION LOG

### Session 1: 2026-03-05 Initial Production Validation
**Tester**: Lab Agent
**Environment**: Chrome 120, macOS, https://axiom-gui.vercel.app
**Status**: 🟡 In Progress

#### Tests Executed:
(To be filled as tests run)

#### Failures Found:
(To be documented with reproduction steps)

#### Fixes Applied:
(To be tracked with commit SHAs)

---

## NOTES FOR FUTURE TEST ADDITIONS

**When to add new tests**:
- New feature implemented → add full user flow test
- Bug reported → add regression test
- User feedback → add UX validation test
- Performance concern → add specific metric test

**Test naming convention**:
- Descriptive: "Water molecule H-O bond length validates to 0.96 Å"
- NOT: "Test 47"

**Validation criteria format**:
- Quantitative when possible: "Load time <3s", not "Load time is fast"
- Visual checks: "Bonds connect atom centers (no gaps)", not "Bonds look good"

---

## CHANGELOG

- **2026-03-05**: Initial comprehensive checklist created
  - Based on existing E2E tests (file-loading, rendering, visual-regression, etc.)
  - Added production-specific validation gates
  - Established visual validation loop requirement
