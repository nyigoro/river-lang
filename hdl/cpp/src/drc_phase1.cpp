#include "river_drc.h"

#include <algorithm>
#include <unordered_set>

namespace river {

namespace {

struct PairKey {
    uint16_t a;
    uint16_t b;

    bool operator==(const PairKey& other) const {
        return a == other.a && b == other.b;
    }
};

struct PairKeyHash {
    std::size_t operator()(const PairKey& key) const {
        return (static_cast<std::size_t>(key.a) << 16) ^ key.b;
    }
};

} // namespace

std::vector<DrcViolation> run_structural_drc(
    const std::vector<SetConstraintEntry>& constraints,
    const std::vector<MapNodeEntry>& nodes
) {
    std::vector<DrcViolation> violations;
    std::unordered_set<uint16_t> known_nodes;
    known_nodes.reserve(nodes.size());
    for (const auto& node : nodes) {
        known_nodes.insert(node.node_id);
    }

    std::unordered_set<PairKey, PairKeyHash> seen_pairs;
    seen_pairs.reserve(constraints.size());

    for (const auto& constraint : constraints) {
        if (constraint.node_a == constraint.node_b) {
            violations.push_back({
                constraint.node_a,
                constraint.node_b,
                constraint.max_dist_um,
                -1.0,
                DrcViolationKind::SelfConstraint,
            });
        }

        PairKey key{constraint.node_a, constraint.node_b};
        if (seen_pairs.find(key) != seen_pairs.end()) {
            violations.push_back({
                constraint.node_a,
                constraint.node_b,
                constraint.max_dist_um,
                -1.0,
                DrcViolationKind::DuplicateConstraint,
            });
        } else {
            seen_pairs.insert(key);
        }

        if (known_nodes.find(constraint.node_a) == known_nodes.end() ||
            known_nodes.find(constraint.node_b) == known_nodes.end()) {
            violations.push_back({
                constraint.node_a,
                constraint.node_b,
                constraint.max_dist_um,
                -1.0,
                DrcViolationKind::OrphanedNode,
            });
        }
    }

    return violations;
}

} // namespace river
