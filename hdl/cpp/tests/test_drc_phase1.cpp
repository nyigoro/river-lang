#include "river_drc.h"

#include <cassert>
#include <unordered_map>

int main() {
    using river::DrcViolationKind;
    using river::MapNodeEntry;
    using river::SetConstraintEntry;

    std::vector<MapNodeEntry> nodes = {
        {1, 0x1000, 111},
        {2, 0x1004, 222},
    };

    std::vector<SetConstraintEntry> constraints = {
        {1, 2, 100},
        {1, 2, 100},
        {3, 3, 200},
    };

    auto violations = river::run_structural_drc(constraints, nodes);
    bool has_duplicate = false;
    bool has_self = false;
    bool has_orphan = false;

    for (const auto& v : violations) {
        if (v.kind == DrcViolationKind::DuplicateConstraint) {
            has_duplicate = true;
        }
        if (v.kind == DrcViolationKind::SelfConstraint) {
            has_self = true;
        }
        if (v.kind == DrcViolationKind::OrphanedNode) {
            has_orphan = true;
        }
    }

    assert(has_duplicate);
    assert(has_self);
    assert(has_orphan);
    return 0;
}
