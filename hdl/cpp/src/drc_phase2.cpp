#include "river_drc.h"

#include <cmath>

namespace river {

std::vector<DrcViolation> run_physical_drc(
    const std::vector<SetConstraintEntry>& constraints,
    const std::unordered_map<uint16_t, Point2D>& coords_by_node
) {
    std::vector<DrcViolation> violations;

    for (const auto& constraint : constraints) {
        auto it_a = coords_by_node.find(constraint.node_a);
        auto it_b = coords_by_node.find(constraint.node_b);
        if (it_a == coords_by_node.end() || it_b == coords_by_node.end()) {
            violations.push_back({
                constraint.node_a,
                constraint.node_b,
                constraint.max_dist_um,
                -1.0,
                DrcViolationKind::MissingPlacement,
            });
            continue;
        }

        const auto& coord_a = it_a->second;
        const auto& coord_b = it_b->second;
        double dx = static_cast<double>(coord_a.x) - static_cast<double>(coord_b.x);
        double dy = static_cast<double>(coord_a.y) - static_cast<double>(coord_b.y);
        double actual_dist = std::sqrt(dx * dx + dy * dy);

        if (actual_dist > static_cast<double>(constraint.max_dist_um)) {
            violations.push_back({
                constraint.node_a,
                constraint.node_b,
                constraint.max_dist_um,
                actual_dist,
                DrcViolationKind::DistanceExceeded,
            });
        }
    }

    return violations;
}

} // namespace river
