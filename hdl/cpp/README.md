# HDL Backend (C++)

Phase 1 + Phase 2 DRC and structural Verilog emitter used by the geologist
backend via the cxx bridge.

Notes:
- DRC Phase 2 `actual_dist_um` is `f64` (C++ double). This is for `/fp:fast`
  rounding stability on MSVC, not sub-nanometre precision. Input coordinates
  in `CoordEntry` are `f32`; do not change to `f64` without updating the bridge.
- `pdk_map.h` contains the abstract cell/port macros. Replace values with the
  partner PDK names before tape-out. Do not change macro keys.

Build and test (WSL/Linux):

```
cmake -B build -DCMAKE_BUILD_TYPE=Debug
cmake --build build
ctest --test-dir build --output-on-failure
```

Rust integration uses `build.rs` in `geologist-backend` and does not require
`RIVER_WITH_CXXBRIDGE` when building the standalone C++ tests.
