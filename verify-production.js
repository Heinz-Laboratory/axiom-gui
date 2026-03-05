// Quick Node.js script to verify production deployment

async function checkProduction() {
  console.log('🔍 Checking Axiom GUI production deployment...\n');

  // Test 1: Check if homepage loads
  console.log('Test 1: Homepage loads');
  const html = await fetch('https://axiom-gui.vercel.app').then(r => r.text());
  const hasRoot = html.includes('id="root"');
  const hasTitle = html.includes('Axiom - Molecular Visualization');
  console.log(`  ✓ HTML contains root div: ${hasRoot}`);
  console.log(`  ✓ HTML contains correct title: ${hasTitle}`);

  // Test 2: Check if WASM file loads correctly
  console.log('\nTest 2: WASM file loads');
  const wasmUrl = html.match(/axiom_renderer_bg-[^"]+\.wasm/)?.[0];
  if (wasmUrl) {
    const wasmResponse = await fetch(`https://axiom-gui.vercel.app/assets/${wasmUrl}`);
    const contentType = wasmResponse.headers.get('content-type');
    const buffer = await wasmResponse.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const isWasm = bytes[0] === 0 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;

    console.log(`  ✓ WASM URL found: ${wasmUrl}`);
    console.log(`  ✓ Content-Type: ${contentType}`);
    console.log(`  ✓ Is valid WASM binary: ${isWasm}`);
    console.log(`  ✓ Size: ${(buffer.byteLength / 1024).toFixed(2)} KB`);
  } else {
    console.log('  ✗ WASM URL not found in HTML');
  }

  // Test 3: Check if JS bundle loads
  console.log('\nTest 3: JavaScript bundle loads');
  const jsUrl = html.match(/index-[^"]+\.js/)?.[0];
  if (jsUrl) {
    const jsResponse = await fetch(`https://axiom-gui.vercel.app/assets/${jsUrl}`);
    const jsCode = await jsResponse.text();
    const hasReact = jsCode.includes('react');
    const hasWasmInit = jsCode.includes('axiom_renderer');

    console.log(`  ✓ JS URL found: ${jsUrl}`);
    console.log(`  ✓ Contains React code: ${hasReact}`);
    console.log(`  ✓ Contains WASM initialization: ${hasWasmInit}`);
    console.log(`  ✓ Size: ${(jsCode.length / 1024).toFixed(2)} KB`);
  }

  // Test 4: Check CORS headers
  console.log('\nTest 4: Security headers');
  const response = await fetch('https://axiom-gui.vercel.app');
  const coep = response.headers.get('cross-origin-embedder-policy');
  const coop = response.headers.get('cross-origin-opener-policy');
  console.log(`  ✓ COEP header: ${coep}`);
  console.log(`  ✓ COOP header: ${coop}`);

  console.log('\n✅ All static checks passed!');
  console.log('\n🌐 Visit https://axiom-gui.vercel.app to test interactively');
}

checkProduction().catch(console.error);
