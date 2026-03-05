// RIVER-LANG ? geologist-backend/src/manifest.rs
//
// Strongly typed representation of a compiled .rvr manifest.
// Binary is emitted little-endian by emitter.rs.

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// File constants
// ---------------------------------------------------------------------------

pub const MAGIC: u32 = 0x5249_5645; // "RIVE"

// LINK_FLOW encoding (16-bit src + 16-bit dest)
// src bits:
//   bit15: DIR_BIT (1 = upstream / Nerve)
//   bit14: TRUE branch selector
//   bit13: FALSE branch selector
//   bits12..0: node id
pub const LINK_FLAG_UPSTREAM: u16 = 0x8000;
pub const LINK_FLAG_TRUE_BRANCH: u16 = 0x4000;
pub const LINK_FLAG_FALSE_BRANCH: u16 = 0x2000;
pub const LINK_NODE_MASK: u16 = 0x1FFF;

// INIT_RES flags
pub const RES_FLAG_HASH_CHECK: u8 = 0x01;
pub const RES_FLAG_PURGE_ON_DRY: u8 = 0x02;

// ---------------------------------------------------------------------------
// Instructions
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum Instruction {
    // 0x01
    SetEpoch { epoch: u32 },

    // 0x02
    MapNode {
        node_id: u16,
        address: u32,
        salted_hash: u32,
    },

    // 0x03
    LinkFlow {
        src: u16,
        dest: u16,
    },

    // 0x04
    CfgPpm {
        sector_id: u8,
        cluster_mask: u64,
    },

    // 0x05
    InitRes {
        arity: u16,
        flags: u8,
    },

    // 0x06
    SetConstraint {
        node_a: u16,
        node_b: u16,
        max_dist_um: u16,
    },
}

impl Instruction {
    pub fn opcode(&self) -> u8 {
        match self {
            Instruction::SetEpoch { .. } => 0x01,
            Instruction::MapNode { .. } => 0x02,
            Instruction::LinkFlow { .. } => 0x03,
            Instruction::CfgPpm { .. } => 0x04,
            Instruction::InitRes { .. } => 0x05,
            Instruction::SetConstraint { .. } => 0x06,
        }
    }

    pub fn byte_size(&self) -> usize {
        match self {
            Instruction::SetEpoch { .. } => 1 + 4,
            Instruction::MapNode { .. } => 1 + 2 + 4 + 4,
            Instruction::LinkFlow { .. } => 1 + 2 + 2,
            Instruction::CfgPpm { .. } => 1 + 1 + 8,
            Instruction::InitRes { .. } => 1 + 2 + 1,
            Instruction::SetConstraint { .. } => 1 + 2 + 2 + 2,
        }
    }
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RvrHeader {
    pub magic: u32,
    pub epoch_id: u32,
    pub node_count: u32,
    pub sector_map: u64,
    pub manifest_length: u32,
}

impl RvrHeader {
    pub const BYTE_SIZE: usize = 24;
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct RvrManifest {
    pub header: Option<RvrHeader>,
    pub instructions: Vec<Instruction>,
    pub notes: Vec<String>,
}

impl RvrManifest {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn node_count(&self) -> u32 {
        self.instructions
            .iter()
            .filter(|instr| matches!(instr, Instruction::MapNode { .. }))
            .count() as u32
    }

    pub fn instruction_bytes(&self) -> usize {
        self.instructions.iter().map(Instruction::byte_size).sum()
    }

    pub fn total_bytes(&self) -> usize {
        RvrHeader::BYTE_SIZE + self.instruction_bytes()
    }

    pub fn epoch(&self) -> u32 {
        self.instructions
            .iter()
            .find_map(|instr| match instr {
                Instruction::SetEpoch { epoch } => Some(*epoch),
                _ => None,
            })
            .unwrap_or(0)
    }

    pub fn finalize_header(&mut self, sector_map: u64) {
        self.header = Some(RvrHeader {
            magic: MAGIC,
            epoch_id: self.epoch(),
            node_count: self.node_count(),
            sector_map,
            manifest_length: self.instruction_bytes() as u32,
        });
    }
}