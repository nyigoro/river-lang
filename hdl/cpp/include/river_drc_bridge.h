#ifndef RIVER_DRC_BRIDGE_H
#define RIVER_DRC_BRIDGE_H

#include "rust/cxx.h"

struct RvrManifest;
struct CoordEntry;
struct DrcViolation;

rust::Vec<DrcViolation> run_structural_drc(const RvrManifest& manifest);

rust::Vec<DrcViolation> run_physical_drc(
    const RvrManifest& manifest,
    rust::Slice<const CoordEntry> coords
);

#endif // RIVER_DRC_BRIDGE_H
