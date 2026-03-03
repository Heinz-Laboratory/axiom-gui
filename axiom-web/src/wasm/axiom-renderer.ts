import init, { WasmRenderer } from '../../../axiom-renderer/pkg/axiom_renderer'

let wasmInitialized = false

export async function initWasm() {
  if (!wasmInitialized) {
    await init()
    wasmInitialized = true
  }
}

export { WasmRenderer }
