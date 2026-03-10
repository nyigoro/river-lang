#ifndef RIVER_HDL_BRIDGE_H
#define RIVER_HDL_BRIDGE_H

#include "rust/cxx.h"

struct RvrManifest;

bool emit_verilog(const RvrManifest& manifest, rust::Str out_path);

#endif // RIVER_HDL_BRIDGE_H
