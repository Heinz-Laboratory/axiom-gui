# Axiom GUI - Molecular Visualization Web Application

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-blue)](https://reactjs.org/)
[![WebGPU](https://img.shields.io/badge/WebGPU-Enabled-green)](https://www.w3.org/TR/webgpu/)

Axiom GUI is a high-performance molecular visualization web application built with React, TypeScript, and wgpu-WASM. It provides real-time 3D rendering of molecular structures using WebGPU for hardware-accelerated graphics.

🌐 **Repository**: [https://github.com/Heinz-Laboratory/axiom-gui](https://github.com/Heinz-Laboratory/axiom-gui)

---

## Table of Contents

- [Features](#features)
- [Browser Requirements](#browser-requirements)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
  - [Loading Structures](#loading-structures)
  - [Navigation Controls](#navigation-controls)
  - [Rendering Modes](#rendering-modes)
  - [Camera Controls](#camera-controls)
  - [Selection \& Measurement](#selection--measurement)
  - [Exporting Images](#exporting-images)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
- [File Format Support](#file-format-support)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Capabilities

- **🚀 Hardware-Accelerated Rendering**: Uses WebGPU via wgpu-WASM for high-performance 3D graphics
- **📁 CIF File Support**: Load and visualize crystallographic structures from CIF files
- **🎨 Multiple Rendering Modes**: Ball-and-stick, space-filling, wireframe, and stick representations
- **🎮 Interactive Camera**: Rotate, pan, zoom, and preset camera views (front, back, top, bottom, left, right)
- **🎯 Atom Selection**: Click to select atoms, view atomic information, and highlight selected atoms
- **📏 Measurement Tools**: Measure distances between atoms and angles
- **💾 Image Export**: Export high-quality PNG screenshots (1080p, 4K) and SVG vector graphics
- **⌨️ Keyboard Shortcuts**: Full keyboard navigation with customizable shortcuts
- **♿ Accessibility**: WCAG 2.1 AA compliant, keyboard navigable, screen reader friendly
- **📱 Responsive Design**: Works across desktop, tablet, and mobile viewports

### Advanced Features

- **Sample Structures**: Pre-loaded molecular structures (benzene, water, quartz, simple cubic)
- **Structure Information**: Display composition, unit cell parameters, and atomic details
- **Camera Animation**: Smooth transitions between camera presets
- **Error Handling**: Robust error boundaries and user-friendly error messages
- **Performance Optimized**: Bundle size <250 KB (gzipped), WASM <150 KB
- **Offline-Ready**: Progressive Web App capabilities (future enhancement)

---

## Browser Requirements

### Supported Browsers

Axiom GUI requires a modern browser with **WebGPU support**:

| Browser | Version | WebGPU Support | Status |
|---------|---------|----------------|--------|
| **Google Chrome** | 113+ | ✅ Stable | Recommended |
| **Microsoft Edge** | 113+ | ✅ Stable | Recommended |
| **Firefox** | 121+ | 🟡 Beta (flag required) | Experimental |
| **Safari** | 18+ (macOS Sonoma) | 🟡 Preview | Experimental |

### Enabling WebGPU

**Chrome/Edge (113+)**:
- WebGPU is enabled by default ✅

**Firefox (121+)**:
1. Navigate to `about:config`
2. Search for `dom.webgpu.enabled`
3. Set to `true`
4. Restart browser

**Safari (18+)**:
- WebGPU is available in Safari Technology Preview on macOS Sonoma+

### Feature Detection

If your browser doesn't support WebGPU, Axiom GUI will display a browser compatibility warning with instructions to upgrade or enable WebGPU.

### Minimum System Requirements

- **OS**: Windows 10+, macOS 11+, or modern Linux
- **RAM**: 4 GB minimum, 8 GB recommended
- **GPU**: Any GPU with Vulkan/Metal/DirectX 12 support
- **Display**: 1280×720 minimum resolution

---

## Getting Started

### Quick Start (Web Version)

1. **Clone and run locally** (see [DEVELOPMENT.md](DEVELOPMENT.md))
2. **Load a structure**:
   - Click "Load Sample" to try a pre-loaded structure (benzene, water, quartz)
   - Or upload your own CIF file using the file upload button
3. **Interact**: Use mouse to rotate (left-click drag), pan (middle-click drag), and zoom (scroll wheel)
4. **Explore**: Try different rendering modes, select atoms, and measure distances

### Local Development

See [DEVELOPMENT.md](DEVELOPMENT.md) for build instructions and development setup.

---

## Usage Guide

### Loading Structures

#### Load Sample Structures

1. Click the **"Load Sample"** dropdown in the toolbar
2. Select from pre-loaded structures:
   - **Benzene** (C₆H₆) - Simple organic molecule
   - **Water** (H₂O) - Minimal structure for testing
   - **Quartz** (SiO₂) - Crystal structure with periodic boundaries
   - **Simple Cubic** - Basic lattice structure

#### Upload CIF Files

1. Click the **"Upload CIF"** button or drag-and-drop a file
2. Supported format: Crystallographic Information File (.cif)
3. Maximum file size: 10 MB
4. The structure will load and render automatically

**Supported CIF Features**:
- Atomic positions (fractional coordinates)
- Unit cell parameters (a, b, c, α, β, γ)
- Space group information
- Chemical composition
- Bond connections (auto-detected)

---

### Navigation Controls

#### Mouse Controls

| Action | Control |
|--------|---------|
| **Rotate** | Left-click + drag |
| **Pan** | Middle-click + drag (or Shift + left-click) |
| **Zoom** | Scroll wheel |

#### Touch Controls (Mobile/Tablet)

| Action | Control |
|--------|---------|
| **Rotate** | One-finger drag |
| **Pan** | Two-finger drag |
| **Zoom** | Pinch gesture |

#### Keyboard Navigation

| Key | Action |
|-----|--------|
| **Arrow keys** | Rotate camera |
| **+/-** | Zoom in/out |
| **Space** | Reset camera to default view |
| **?** | Show keyboard shortcuts help |

---

### Rendering Modes

Axiom GUI supports multiple rendering styles for molecular structures:

#### 1. **Ball-and-Stick** (Default)
- Atoms: Spheres scaled by atomic radius
- Bonds: Cylinders connecting atoms
- Best for: General structure visualization
- Keyboard shortcut: `1`

#### 2. **Space-Filling** (Van der Waals)
- Atoms: Large spheres representing electron cloud
- Bonds: Hidden
- Best for: Visualizing molecular volume and packing
- Keyboard shortcut: `2`

#### 3. **Wireframe**
- Atoms: Small dots
- Bonds: Thin lines
- Best for: Visualizing complex structures without occlusion
- Keyboard shortcut: `3`

#### 4. **Stick**
- Atoms: Small spheres at bond junctions
- Bonds: Cylinders (thicker than wireframe)
- Best for: Emphasizing connectivity
- Keyboard shortcut: `4`

**To change rendering mode**:
1. Open the **Settings panel** (click gear icon or press `S`)
2. Select desired rendering mode from the dropdown
3. Or use keyboard shortcuts 1-4

---

### Camera Controls

#### Camera Presets

Access 6 pre-defined camera views for orthogonal viewing:

| Preset | View | Shortcut |
|--------|------|----------|
| **Front** | View along +Z axis | `F` |
| **Back** | View along -Z axis | `Shift+F` |
| **Top** | View along +Y axis | `T` |
| **Bottom** | View along -Y axis | `Shift+T` |
| **Left** | View along -X axis | `L` |
| **Right** | View along +X axis | `Shift+L` |

**To use camera presets**:
1. Open **Camera Controls panel** (press `C`)
2. Click a preset button (Front, Back, Top, Bottom, Left, Right)
3. Camera will smoothly animate to the selected view

#### Manual Camera Adjustment

**Rotation Sliders**:
- X-axis rotation: Tilt up/down
- Y-axis rotation: Rotate left/right
- Z-axis rotation: Roll clockwise/counterclockwise

**Zoom Slider**:
- Adjust field of view (FOV) from 30° to 90°

**Reset Camera**:
- Click "Reset" button or press `Space` to return to default view

---

### Selection & Measurement

#### Atom Selection

1. **Click on an atom** in the 3D view
2. Selected atom will be **highlighted** (yellow glow)
3. **Atomic information** displays in sidebar:
   - Element symbol and name
   - Atomic number
   - Position (fractional coordinates)
   - Position (Cartesian coordinates)

**Keyboard shortcuts**:
- `Escape`: Clear selection
- Click background: Deselect all

#### Distance Measurement

1. **Select first atom** (click)
2. **Click "Measure Distance"** button (or press `M`)
3. **Click second atom**
4. Distance will be displayed in Ångströms (Å)
5. Visual line drawn between atoms

#### Angle Measurement

1. **Select first atom** (vertex)
2. **Click "Measure Angle"** button (or press `A`)
3. **Click second atom** (first arm)
4. **Click third atom** (second arm)
5. Angle will be displayed in degrees (°)

**Clear measurements**: Click "Clear" button or press `Escape`

---

### Exporting Images

#### Export as PNG (Raster)

1. Open **Export panel** (press `E`)
2. Select **PNG** format
3. Choose resolution:
   - **1080p** (1920×1080) - Standard HD
   - **4K** (3840×2160) - Ultra HD
   - **Custom** - Specify width and height
4. Click **"Export"**
5. Image will download as `axiom-export-YYYYMMDD-HHMMSS.png`

**PNG Options**:
- Background: Transparent or solid color
- DPI: 72 (screen), 150 (print draft), 300 (print quality)
- Anti-aliasing: 4× MSAA

#### Export as SVG (Vector)

1. Open **Export panel** (press `E`)
2. Select **SVG** format
3. Click **"Export"**
4. Vector graphics file will download

**SVG Advantages**:
- Infinite scalability
- Smaller file size
- Editable in vector graphics software (Adobe Illustrator, Inkscape)

**SVG Limitations**:
- No lighting or shadows
- Simplified atom/bond representation

---

### Keyboard Shortcuts

Press `?` to view the full keyboard shortcuts help panel.

#### Global Shortcuts

| Key | Action |
|-----|--------|
| `?` | Show/hide keyboard shortcuts help |
| `Escape` | Close current panel or dialog |

#### View Controls

| Key | Action |
|-----|--------|
| `1` | Ball-and-stick rendering mode |
| `2` | Space-filling rendering mode |
| `3` | Wireframe rendering mode |
| `4` | Stick rendering mode |
| `F` | Front camera view |
| `T` | Top camera view |
| `L` | Left camera view |
| `Space` | Reset camera |
| `+` / `-` | Zoom in/out |
| `↑ ↓ ← →` | Rotate camera |

#### Panels

| Key | Action |
|-----|--------|
| `S` | Toggle Settings panel |
| `C` | Toggle Camera Controls panel |
| `E` | Toggle Export panel |
| `M` | Start distance measurement |
| `A` | Start angle measurement |

#### File Operations

| Key | Action |
|-----|--------|
| `Ctrl+O` | Open file upload dialog |
| `Ctrl+S` | Save current view as PNG |

---

## File Format Support

### Crystallographic Information File (CIF)

Axiom GUI supports the CIF 1.1 format, a standard for crystallographic data.

**Required CIF Fields**:
- `_atom_site_label` - Atom labels
- `_atom_site_type_symbol` - Element symbols
- `_atom_site_fract_x/y/z` - Fractional coordinates
- `_cell_length_a/b/c` - Unit cell dimensions
- `_cell_angle_alpha/beta/gamma` - Unit cell angles

**Optional CIF Fields**:
- `_chemical_formula_sum` - Chemical formula
- `_symmetry_space_group_name_H-M` - Space group
- `_atom_site_occupancy` - Occupancy values
- `_atom_site_U_iso_or_equiv` - Thermal parameters

**Example CIF File**:
```cif
data_benzene
_cell_length_a 7.44
_cell_length_b 9.55
_cell_length_c 6.92
_cell_angle_alpha 90.0
_cell_angle_beta 90.0
_cell_angle_gamma 90.0
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.000 0.000 0.000
C2 C 0.250 0.000 0.000
H1 H 0.125 0.100 0.000
# ... more atoms ...
```

---

## Troubleshooting

### WebGPU Not Supported

**Error Message**: "Your browser does not support WebGPU"

**Solutions**:
1. Update to latest browser version (Chrome 113+, Edge 113+)
2. Check GPU drivers are up to date
3. Ensure hardware acceleration is enabled:
   - Chrome: `chrome://settings` → Advanced → System → Use hardware acceleration
4. Try a different browser (Chrome/Edge recommended)

### Renderer Initialization Failed

**Error Message**: "Failed to initialize renderer"

**Causes**:
- WebGPU not available in headless mode
- GPU drivers outdated or incompatible
- Insufficient GPU memory

**Solutions**:
1. Update GPU drivers to latest version
2. Close other GPU-intensive applications
3. Restart browser
4. Try in a different browser window (not incognito/private mode)

### File Upload Errors

**Error Message**: "Failed to parse CIF file"

**Solutions**:
1. Verify file is valid CIF format (not corrupted)
2. Check file size is under 10 MB
3. Ensure all required CIF fields are present
4. Try opening file in a text editor to check format

**Error Message**: "File too large"

**Solutions**:
1. Compress CIF file by removing unnecessary data
2. Use a smaller structure subset
3. Contact developers for large file support

### Performance Issues

**Symptoms**: Slow rendering, lag when rotating

**Solutions**:
1. Switch to **Wireframe** or **Stick** rendering mode (faster)
2. Close other browser tabs to free memory
3. Reduce structure complexity (remove periodic images)
4. Lower screen resolution
5. Use a device with better GPU

### Blank Screen / White Screen

**Solutions**:
1. Check browser console for JavaScript errors (F12)
2. Clear browser cache and reload (Ctrl+Shift+R)
3. Disable browser extensions that might interfere
4. Try in incognito/private mode
5. Verify WebGPU is enabled in browser settings

---

## Development

For local development, build instructions, and testing:

See [DEVELOPMENT.md](DEVELOPMENT.md) for complete developer documentation.

**Quick Start**:
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Architecture

Axiom GUI is built with a modern web stack optimized for performance and maintainability:

### Technology Stack

- **Frontend**: React 19.0 + TypeScript 5.8
- **Rendering**: wgpu-WASM (Rust WebGPU implementation)
- **Build Tool**: Vite 6.0
- **Styling**: Tailwind CSS 3.4
- **Testing**: Vitest + Playwright + Visual Regression
- **CI/CD**: GitHub Actions
- **Hosting**: GitHub Pages (Heinz-Laboratory organization)

### Architecture Overview

```
┌─────────────────────────────────────────┐
│         React Frontend (TypeScript)      │
│  ┌────────────┐  ┌──────────────────┐   │
│  │ Components │  │ Context/State    │   │
│  │ - Viewer   │  │ - Selection      │   │
│  │ - Panels   │  │ - Settings       │   │
│  │ - Controls │  │ - Camera         │   │
│  └────────────┘  └──────────────────┘   │
└────────────┬────────────────────────────┘
             │ TypeScript API
┌────────────▼────────────────────────────┐
│       wgpu-WASM Backend (Rust)          │
│  ┌────────────┐  ┌──────────────────┐   │
│  │ WebGPU API │  │ Geometry Engine  │   │
│  │ - Shaders  │  │ - CIF Parser     │   │
│  │ - Buffers  │  │ - Bond Detection │   │
│  │ - Pipeline │  │ - Instancing     │   │
│  └────────────┘  └──────────────────┘   │
└────────────┬────────────────────────────┘
             │ WebGPU API
┌────────────▼────────────────────────────┐
│       Browser WebGPU Implementation     │
│      (Chrome/Edge/Firefox/Safari)       │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│            GPU Hardware                 │
│    (Vulkan / Metal / DirectX 12)        │
└─────────────────────────────────────────┘
```

For detailed architecture documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Contributing

Contributions are welcome! Please follow these guidelines:

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Provide detailed reproduction steps
3. Include browser version, OS, and GPU information
4. Attach screenshots or error messages

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes with clear commit messages
4. Add tests for new functionality
5. Ensure all tests pass: `npm test`
6. Submit a pull request with a clear description

### Code Standards

- **TypeScript**: Strict mode enabled, no `any` types
- **React**: Functional components with hooks
- **Formatting**: Prettier with 2-space indentation
- **Linting**: ESLint with recommended rules
- **Testing**: >80% code coverage for new features

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **wgpu**: Rust WebGPU implementation (https://wgpu.rs/)
- **React**: UI library (https://reactjs.org/)
- **Tailwind CSS**: Utility-first CSS framework (https://tailwindcss.com/)
- **Playwright**: E2E testing framework (https://playwright.dev/)
- **CIF Format**: International Union of Crystallography (IUCr)

---

## Project Status

**Current Version**: 1.0.0 (Production Ready)

**Project Completion**: 100%

**Quality Metrics**:
- ✅ 134 tests passing (44 unit, 71 E2E, 19 visual regression)
- ✅ Lighthouse Performance: 89/100
- ✅ Lighthouse Accessibility: 100/100
- ✅ Lighthouse Best Practices: 100/100
- ✅ Lighthouse SEO: 100/100
- ✅ Bundle size: 242.67 KB (gzipped)
- ✅ WASM size: 148 KB (gzipped)
- ✅ WCAG 2.1 AA compliant

---

## Contact

For questions, suggestions, or collaboration:

- **Repository**: https://github.com/Heinz-Laboratory/axiom-gui
- **Issues**: https://github.com/Heinz-Laboratory/axiom-gui/issues

---

**Built with ❤️ using React, TypeScript, and WebGPU**
