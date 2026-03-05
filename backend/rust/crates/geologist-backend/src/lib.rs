// RIVER-LANG ? geologist-backend/src/lib.rs
//
// Backend pipeline:
//   AST JSON -> spatial map -> typed instructions -> path audit -> manifest header

pub mod emitter;
pub mod manifest;
pub mod path_auditor;
pub mod spatial_mapper;

use anyhow::{anyhow, bail, Context, Result};

use emitter::emit_with_sector_map;
use manifest::{
    Instruction, RvrManifest, LINK_FLAG_FALSE_BRANCH, LINK_FLAG_TRUE_BRANCH, LINK_FLAG_UPSTREAM,
    LINK_NODE_MASK, RES_FLAG_HASH_CHECK, RES_FLAG_PURGE_ON_DRY,
};
use path_auditor::{audit, SectorRange};
use spatial_mapper::{build_spatial_map, to_map_node_instructions, SpatialMap};

#[derive(Debug, serde::Deserialize)]
pub struct AstSector {
    pub name: String,
    pub start: u32,
    pub end: u32,
}

#[derive(Debug, serde::Deserialize)]
pub struct AstNode {
    pub name: String,
    pub address: u32,
}

#[derive(Debug, serde::Deserialize)]
pub struct AstReservoir {
    pub name: String,
    pub address: u32,
    pub arity: u16,
}

#[derive(Debug, serde::Deserialize)]
pub struct PortRef {
    pub node: String,
    pub accessor: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct AstFlow {
    pub direction: String,
    pub from: PortRef,
    pub to: PortRef,
}

#[derive(Debug, serde::Deserialize)]
pub struct AstConstraint {
    #[serde(rename = "fn")]
    pub function: String,
    #[serde(rename = "portA")]
    pub port_a: PortRef,
    #[serde(rename = "portB")]
    pub port_b: PortRef,
    pub value: f64,
    pub unit: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct ChannelGraph {
    #[serde(default)]
    pub epoch: u32,
    #[serde(default)]
    pub sectors: Vec<AstSector>,
    #[serde(default)]
    pub nodes: Vec<AstNode>,
    pub reservoir: Option<AstReservoir>,
    #[serde(default)]
    pub flows: Vec<AstFlow>,
    #[serde(default)]
    pub nerves: Vec<AstFlow>,
    #[serde(default)]
    pub constraints: Vec<AstConstraint>,
}

fn deserialize_graph(ast_json: &str) -> Result<ChannelGraph> {
    serde_json::from_str(ast_json).map_err(|err| {
        let trimmed = ast_json.trim_start();
        if !trimmed.starts_with('{') {
            anyhow!(
                "compile_manifest expects frontend AST JSON, got non-JSON input (first bytes: {:?})",
                trimmed.chars().take(16).collect::<String>()
            )
        } else {
            anyhow!("Failed to parse AST JSON: {err}")
        }
    })
}

fn node_id_of(spatial_map: &SpatialMap, name: &str) -> Result<u16> {
    let id = spatial_map
        .id_of(name)
        .with_context(|| format!("Undeclared node/reservoir referenced: '{name}'"))?;

    if id > LINK_NODE_MASK {
        bail!(
            "Node id {} for '{}' exceeds LINK_NODE_MASK={:#06x}",
            id,
            name,
            LINK_NODE_MASK
        );
    }

    Ok(id)
}

fn branch_flag(accessor: Option<&str>) -> Result<u16> {
    match accessor {
        None | Some("out") => Ok(0),
        Some("TRUE") => Ok(LINK_FLAG_TRUE_BRANCH),
        Some("FALSE") => Ok(LINK_FLAG_FALSE_BRANCH),
        Some("cry") => bail!("'.cry' accessor is invalid for downstream '<~' source"),
        Some(other) => bail!("Unsupported accessor on downstream source: '{other}'"),
    }
}

fn validate_nerve_ports(from: &PortRef, to: &PortRef) -> Result<()> {
    match from.accessor.as_deref() {
        Some("cry") => {}
        Some(other) => bail!("Upstream '~>' source accessor must be 'cry', got '{other}'"),
        None => bail!("Upstream '~>' source must include '.cry' accessor"),
    }

    if matches!(to.accessor.as_deref(), Some("cry")) {
        bail!("Upstream '~>' destination must not use '.cry' accessor");
    }

    Ok(())
}

fn constraint_um(value_mm: f64, unit: &str) -> Result<u16> {
    if unit != "mm" {
        bail!("Unsupported constraint unit '{unit}' (expected 'mm')");
    }
    if !value_mm.is_finite() || value_mm <= 0.0 {
        bail!("Constraint distance must be positive finite mm, got {value_mm}");
    }

    let um = (value_mm * 1000.0).round();
    if um > u16::MAX as f64 {
        bail!("Constraint distance {value_mm}mm exceeds u16 storage");
    }

    Ok(um as u16)
}

fn sector_map_mask(sector_count: usize) -> Result<u64> {
    if sector_count > 64 {
        bail!(".rvr header supports at most 64 sectors, got {sector_count}");
    }

    Ok(match sector_count {
        0 => 0,
        64 => u64::MAX,
        n => (1_u64 << n) - 1,
    })
}

pub fn compile_manifest(ast_json: &str) -> Result<RvrManifest> {
    let graph = deserialize_graph(ast_json)?;

    let mut manifest = RvrManifest::new();
    manifest
        .instructions
        .push(Instruction::SetEpoch { epoch: graph.epoch });

    let mut map_inputs: Vec<(String, u32)> = graph
        .nodes
        .iter()
        .map(|node| (node.name.clone(), node.address))
        .collect();

    if let Some(reservoir) = &graph.reservoir {
        map_inputs.push((reservoir.name.clone(), reservoir.address));
    }

    let spatial_map = build_spatial_map(&map_inputs, graph.epoch);
    manifest
        .instructions
        .extend(to_map_node_instructions(&spatial_map));

    for flow in &graph.flows {
        if flow.direction != "DOWN" {
            bail!("Flow record in 'flows' must have direction='DOWN'");
        }

        if flow.to.accessor.is_some() {
            bail!("Downstream destination accessor is unsupported: {:?}", flow.to.accessor);
        }

        let mut src = node_id_of(&spatial_map, &flow.from.node)?;
        let dest = node_id_of(&spatial_map, &flow.to.node)?;
        src |= branch_flag(flow.from.accessor.as_deref())?;

        manifest
            .instructions
            .push(Instruction::LinkFlow { src, dest });
    }

    for nerve in &graph.nerves {
        if nerve.direction != "UP" {
            bail!("Flow record in 'nerves' must have direction='UP'");
        }

        validate_nerve_ports(&nerve.from, &nerve.to)?;

        let mut src = node_id_of(&spatial_map, &nerve.from.node)?;
        let dest = node_id_of(&spatial_map, &nerve.to.node)?;
        src |= LINK_FLAG_UPSTREAM;

        manifest
            .instructions
            .push(Instruction::LinkFlow { src, dest });
    }

    if graph.sectors.len() > u8::MAX as usize {
        bail!("CFG_PPM sector_id is u8, got {} sectors", graph.sectors.len());
    }

    for (index, _) in graph.sectors.iter().enumerate() {
        manifest.instructions.push(Instruction::CfgPpm {
            sector_id: index as u8,
            cluster_mask: u64::MAX,
        });
    }

    for constraint in &graph.constraints {
        if constraint.function != "max_dist" {
            bail!("Unsupported constraint function '{}'; expected 'max_dist'", constraint.function);
        }

        let node_a = node_id_of(&spatial_map, &constraint.port_a.node)?;
        let node_b = node_id_of(&spatial_map, &constraint.port_b.node)?;
        let max_dist_um = constraint_um(constraint.value, &constraint.unit)?;

        manifest.instructions.push(Instruction::SetConstraint {
            node_a,
            node_b,
            max_dist_um,
        });
    }

    if let Some(reservoir) = &graph.reservoir {
        manifest.instructions.push(Instruction::InitRes {
            arity: reservoir.arity,
            flags: RES_FLAG_HASH_CHECK | RES_FLAG_PURGE_ON_DRY,
        });
    }

    let sectors: Vec<SectorRange> = graph
        .sectors
        .iter()
        .map(|sector| SectorRange {
            name: sector.name.clone(),
            start: sector.start,
            end: sector.end,
        })
        .collect();

    let audit = audit(&manifest.instructions, &sectors);
    if !audit.ok {
        bail!("Path audit failed:\n{}", audit.details.join("\n"));
    }

    let sector_mask = sector_map_mask(graph.sectors.len())?;
    let bytes = emit_with_sector_map(&mut manifest, sector_mask);

    manifest.notes.push(format!(
        "compiled nodes={} flows={} nerves={} constraints={} bytes={}",
        graph.nodes.len(),
        graph.flows.len(),
        graph.nerves.len(),
        graph.constraints.len(),
        bytes.len(),
    ));

    Ok(manifest)
}