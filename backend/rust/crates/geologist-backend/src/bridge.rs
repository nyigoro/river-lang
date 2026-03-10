use crate::manifest::RvrManifest;

#[cxx::bridge]
pub mod ffi {
    struct MapNodeEntry {
        node_id: u16,
        address: u32,
        salted_hash: u32,
    }

    struct LinkFlowEntry {
        is_upstream: bool,
        _pad: u8,
        src_node: u16,
        dest_node: u16,
    }

    struct SetConstraintEntry {
        node_a: u16,
        node_b: u16,
        max_dist_um: u16,
    }

    struct CoordEntry {
        hash: u32,
        x: f32,
        y: f32,
    }

    struct DrcViolation {
        node_a: u16,
        node_b: u16,
        max_dist_um: u16,
        actual_dist_um: f64,
    }

    extern "Rust" {
        type RvrManifest;
        fn get_map_nodes(&self) -> Vec<MapNodeEntry>;
        fn get_constraints(&self) -> Vec<SetConstraintEntry>;
        fn get_epoch(&self) -> u32;
        fn get_links(&self) -> Vec<LinkFlowEntry>;
    }

    unsafe extern "C++" {
        include!("river_drc_bridge.h");
        include!("river_hdl_bridge.h");
        fn run_structural_drc(manifest: &RvrManifest) -> Vec<DrcViolation>;
        fn run_physical_drc(manifest: &RvrManifest, coords: &[CoordEntry]) -> Vec<DrcViolation>;
        fn emit_verilog(manifest: &RvrManifest, out_path: &str) -> bool;
    }
}
