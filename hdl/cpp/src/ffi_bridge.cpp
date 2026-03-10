#include "geologist-backend/src/bridge.rs.h"
#include "river_drc.h"
#include "river_hdl.h"
#include "types.h"

#include <unordered_map>

namespace {

std::unordered_map<uint32_t, river::Point2D> coords_by_hash(rust::Slice<const CoordEntry> coords) {
    std::unordered_map<uint32_t, river::Point2D> map;
    map.reserve(coords.size());
    for (const auto& entry : coords) {
        map.emplace(entry.hash, river::Point2D{entry.x, entry.y});
    }
    return map;
}

std::unordered_map<uint16_t, river::Point2D> coords_by_node(
    const std::vector<MapNodeEntry>& nodes,
    const std::unordered_map<uint32_t, river::Point2D>& by_hash
) {
    std::unordered_map<uint16_t, river::Point2D> map;
    map.reserve(nodes.size());
    for (const auto& node : nodes) {
        auto it = by_hash.find(node.salted_hash);
        if (it != by_hash.end()) {
            map.emplace(node.node_id, it->second);
        }
    }
    return map;
}

river::MapNodeEntry to_node(const MapNodeEntry& entry) {
    return river::MapNodeEntry{entry.node_id, entry.address, entry.salted_hash};
}

river::SetConstraintEntry to_constraint(const SetConstraintEntry& entry) {
    return river::SetConstraintEntry{entry.node_a, entry.node_b, entry.max_dist_um};
}

river::LinkFlowEntry to_link(const LinkFlowEntry& entry) {
    return river::LinkFlowEntry{entry.is_upstream, entry._pad, entry.src_node, entry.dest_node};
}

} // namespace

rust::Vec<DrcViolation> run_structural_drc(const RvrManifest& manifest) {
    auto nodes_rv = manifest.get_map_nodes();
    auto constraints_rv = manifest.get_constraints();
    std::vector<MapNodeEntry> nodes(nodes_rv.begin(), nodes_rv.end());
    std::vector<SetConstraintEntry> constraints(constraints_rv.begin(), constraints_rv.end());

    std::vector<river::MapNodeEntry> native_nodes;
    native_nodes.reserve(nodes.size());
    for (const auto& node : nodes) {
        native_nodes.push_back(to_node(node));
    }

    std::vector<river::SetConstraintEntry> native_constraints;
    native_constraints.reserve(constraints.size());
    for (const auto& constraint : constraints) {
        native_constraints.push_back(to_constraint(constraint));
    }

    const auto violations = river::run_structural_drc(native_constraints, native_nodes);
    rust::Vec<DrcViolation> out;
    out.reserve(violations.size());
    for (const auto& violation : violations) {
        out.push_back(DrcViolation{
            violation.node_a,
            violation.node_b,
            violation.max_dist_um,
            violation.actual_dist_um,
        });
    }
    return out;
}

rust::Vec<DrcViolation> run_physical_drc(
    const RvrManifest& manifest,
    rust::Slice<const CoordEntry> coords
) {
    auto nodes_rv = manifest.get_map_nodes();
    auto constraints_rv = manifest.get_constraints();
    std::vector<MapNodeEntry> nodes(nodes_rv.begin(), nodes_rv.end());
    std::vector<SetConstraintEntry> constraints(constraints_rv.begin(), constraints_rv.end());

    auto by_hash = coords_by_hash(coords);
    auto by_node = coords_by_node(nodes, by_hash);

    std::vector<river::SetConstraintEntry> native_constraints;
    native_constraints.reserve(constraints.size());
    for (const auto& constraint : constraints) {
        native_constraints.push_back(to_constraint(constraint));
    }

    const auto violations = river::run_physical_drc(native_constraints, by_node);
    rust::Vec<DrcViolation> out;
    out.reserve(violations.size());
    for (const auto& violation : violations) {
        out.push_back(DrcViolation{
            violation.node_a,
            violation.node_b,
            violation.max_dist_um,
            violation.actual_dist_um,
        });
    }
    return out;
}

bool emit_verilog(const RvrManifest& manifest, const rust::Str out_path) {
    auto nodes_rv = manifest.get_map_nodes();
    auto links_rv = manifest.get_links();
    std::vector<MapNodeEntry> nodes(nodes_rv.begin(), nodes_rv.end());
    std::vector<LinkFlowEntry> links(links_rv.begin(), links_rv.end());
    const uint32_t epoch = manifest.get_epoch();

    std::vector<river::MapNodeEntry> native_nodes;
    native_nodes.reserve(nodes.size());
    for (const auto& node : nodes) {
        native_nodes.push_back(to_node(node));
    }

    std::vector<river::LinkFlowEntry> native_links;
    native_links.reserve(links.size());
    for (const auto& link : links) {
        native_links.push_back(to_link(link));
    }

    std::string out_string(out_path.data(), out_path.size());
    return river::emit_verilog(native_nodes, native_links, epoch, out_string);
}
