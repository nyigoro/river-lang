use std::path::PathBuf;

fn main() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let root = manifest_dir.join("../../../../");
    let hdl_dir = root.join("hdl/cpp");
    let include_dir = hdl_dir.join("include");
    let src_dir = hdl_dir.join("src");

    let mut build = cxx_build::bridge("src/bridge.rs");
    build
        .file(src_dir.join("ffi_bridge.cpp"))
        .file(src_dir.join("drc_phase1.cpp"))
        .file(src_dir.join("drc_phase2.cpp"))
        .file(src_dir.join("hdl_emitter.cpp"))
        .include(&include_dir)
        .std("c++17")
        .compile("river_hdl");

    println!("cargo:rerun-if-changed=src/bridge.rs");
    println!("cargo:rerun-if-changed={}", src_dir.join("ffi_bridge.cpp").display());
    println!("cargo:rerun-if-changed={}", src_dir.join("drc_phase1.cpp").display());
    println!("cargo:rerun-if-changed={}", src_dir.join("drc_phase2.cpp").display());
    println!("cargo:rerun-if-changed={}", src_dir.join("hdl_emitter.cpp").display());
    println!("cargo:rerun-if-changed={}", include_dir.join("river_drc.h").display());
    println!("cargo:rerun-if-changed={}", include_dir.join("river_hdl.h").display());
    println!(
        "cargo:rerun-if-changed={}",
        include_dir.join("river_drc_bridge.h").display()
    );
    println!(
        "cargo:rerun-if-changed={}",
        include_dir.join("river_hdl_bridge.h").display()
    );
    println!("cargo:rerun-if-changed={}", include_dir.join("types.h").display());
    println!("cargo:rerun-if-changed={}", include_dir.join("pdk_map.h").display());
}
