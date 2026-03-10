#include "river_drc.h"

#include <cassert>
#include <unordered_map>

int main() {
    using river::Point2D;
    using river::SetConstraintEntry;

    std::vector<SetConstraintEntry> constraints = {
        {1, 2, 100},
    };

    std::unordered_map<uint16_t, Point2D> coords;
    coords.emplace(1, Point2D{0.0f, 0.0f});
    coords.emplace(2, Point2D{50.0f, 0.0f});

    auto violations = river::run_physical_drc(constraints, coords);
    assert(violations.empty());

    coords[2] = Point2D{200.0f, 0.0f};
    violations = river::run_physical_drc(constraints, coords);
    assert(!violations.empty());
    return 0;
}
