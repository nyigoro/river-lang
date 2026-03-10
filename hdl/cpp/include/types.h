#ifndef RIVER_TYPES_H
#define RIVER_TYPES_H

#include <cstdint>
#include <string>

namespace river {

struct MapNodeEntry {
    uint16_t node_id;
    uint32_t address;
    uint32_t salted_hash;
};

struct LinkFlowEntry {
    bool is_upstream;
    uint8_t _pad;
    uint16_t src_node;
    uint16_t dest_node;
};

struct SetConstraintEntry {
    uint16_t node_a;
    uint16_t node_b;
    uint16_t max_dist_um;
};

struct CoordEntry {
    uint32_t hash;
    float x;
    float y;
};

struct Point2D {
    float x;
    float y;
};

enum class DrcViolationKind : uint8_t {
    DistanceExceeded = 0,
    MissingPlacement = 1,
    DuplicateConstraint = 2,
    SelfConstraint = 3,
    OrphanedNode = 4,
};

struct DrcViolation {
    uint16_t node_a;
    uint16_t node_b;
    uint16_t max_dist_um;
    double actual_dist_um;
    DrcViolationKind kind;
};

struct HdlEmitResult {
    bool success;
    std::string error_message;
};

} // namespace river

#endif // RIVER_TYPES_H
