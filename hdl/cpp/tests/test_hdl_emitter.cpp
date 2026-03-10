#include "river_hdl.h"

#include <cassert>
#include <fstream>

int main() {
    std::vector<river::MapNodeEntry> nodes = {
        {1, 0x1000, 111},
        {2, 0x1004, 222},
    };

    std::vector<river::LinkFlowEntry> links = {
        {false, 0, 1, 2},
    };

    const std::string path = "hdl_emitter_test.v";
    const bool ok = river::emit_verilog(nodes, links, 0x1234, path);
    assert(ok);

    std::ifstream in(path);
    assert(in.good());
    return 0;
}
