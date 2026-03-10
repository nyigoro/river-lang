#ifndef RIVER_HDL_H
#define RIVER_HDL_H

#include <string>
#include <vector>

#include "types.h"

namespace river {

bool emit_verilog(
    const std::vector<MapNodeEntry>& nodes,
    const std::vector<LinkFlowEntry>& links,
    uint32_t epoch,
    const std::string& out_path
);

} // namespace river

#endif // RIVER_HDL_H
