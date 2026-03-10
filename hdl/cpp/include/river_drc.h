#ifndef RIVER_DRC_H
#define RIVER_DRC_H

#include <unordered_map>
#include <vector>

#include "types.h"

namespace river {

std::vector<DrcViolation> run_structural_drc(
    const std::vector<SetConstraintEntry>& constraints,
    const std::vector<MapNodeEntry>& nodes
);

std::vector<DrcViolation> run_physical_drc(
    const std::vector<SetConstraintEntry>& constraints,
    const std::unordered_map<uint16_t, Point2D>& coords_by_node
);

} // namespace river

#endif // RIVER_DRC_H
