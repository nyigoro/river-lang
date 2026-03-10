#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AST_JSON="/tmp/river_fibonacci.ast.json"
RVR_OUT="/tmp/river_fibonacci.rvr"
AST_JSON_COLLISION="/tmp/river_collision.ast.json"
RVR_OUT_COLLISION="/tmp/river_collision.rvr"

printf "[e2e] compiling .rasm -> AST JSON\n"
cd "$ROOT_DIR/compiler/ts-frontend"
npm ci --silent
npx tsx src/cli.ts "$ROOT_DIR/examples/fibonacci.rasm" > "$AST_JSON"

if [ ! -s "$AST_JSON" ]; then
  printf "[e2e] ERROR: AST JSON is empty\n"
  exit 1
fi
printf "[e2e] AST JSON: $(wc -c < "$AST_JSON") bytes\n"

printf "[e2e] emitting .rvr binary\n"
cd "$ROOT_DIR"
cargo run -p geologist-backend --bin rvr-emit --manifest-path "$ROOT_DIR/backend/rust/Cargo.toml" -- "$AST_JSON" --out "$RVR_OUT"

printf "[e2e] building runtime/c\n"
cd "$ROOT_DIR/runtime/c"
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build

printf "[e2e] running fibonacci example\n"
./build/fibonacci_example "$RVR_OUT"

printf "[e2e] compiling collision_cry.rasm -> AST JSON\n"
cd "$ROOT_DIR/compiler/ts-frontend"
npx tsx src/cli.ts "$ROOT_DIR/examples/collision_cry.rasm" > "$AST_JSON_COLLISION"

if [ ! -s "$AST_JSON_COLLISION" ]; then
  printf "[e2e] ERROR: collision AST JSON is empty\n"
  exit 1
fi

printf "[e2e] emitting collision .rvr binary\n"
cd "$ROOT_DIR"
cargo run -p geologist-backend --bin rvr-emit --manifest-path "$ROOT_DIR/backend/rust/Cargo.toml" -- "$AST_JSON_COLLISION" --out "$RVR_OUT_COLLISION"

printf "[e2e] running collision example (expect cry)\n"
cd "$ROOT_DIR/runtime/c"
if ./build/fibonacci_example "$RVR_OUT_COLLISION"; then
  printf "[e2e] collision_cry: FAIL ✗\n"
  exit 1
else
  printf "[e2e] collision_cry: PASS ✓\n"
fi