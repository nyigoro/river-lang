#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AST_JSON="/tmp/river_fibonacci.ast.json"
RVR_OUT="/tmp/river_fibonacci.rvr"

printf "[e2e] compiling .rasm -> AST JSON\n"
cd "$ROOT_DIR/compiler/ts-frontend"
npm ci
npm run dev -- ../../examples/fibonacci.rasm > "$AST_JSON"

printf "[e2e] emitting .rvr binary\n"
cd "$ROOT_DIR"
cargo run -p geologist-backend --bin rvr-emit --manifest-path "$ROOT_DIR/backend/rust/Cargo.toml" -- "$AST_JSON" --out "$RVR_OUT"

printf "[e2e] building runtime/c\n"
cd "$ROOT_DIR/runtime/c"
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build

printf "[e2e] running fibonacci example\n"
./build/fibonacci_example "$RVR_OUT"