pub mod emitter;
pub mod manifest;
pub mod path_auditor;
pub mod spatial_mapper;

use anyhow::Result;
use manifest::RvrManifest;

pub fn compile_manifest(ast_json: &str) -> Result<RvrManifest> {
    let mut manifest = RvrManifest::default();
    manifest.notes.push(format!("ast-bytes={}", ast_json.len()));
    Ok(manifest)
}