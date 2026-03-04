#!/bin/bash
# Build script for Axiom GUI WASM deployment
set -e

echo "==> Installing Rust toolchain..."
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

echo "==> Adding wasm32 target..."
rustup target add wasm32-unknown-unknown

echo "==> Installing wasm-pack..."
if ! command -v wasm-pack &> /dev/null; then
    cargo install wasm-pack
fi

echo "==> Building axiom-renderer WASM module..."
cd axiom-renderer
wasm-pack build --target web --release
cd ..

echo "==> Building axiom-web..."
cd axiom-web
npm install
npm run build
cd ..

echo "==> Build complete! Output in axiom-web/dist/"
