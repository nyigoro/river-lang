// RIVER-LANG ? geologist-backend/src/emitter.rs
//
// Little-endian .rvr binary emitter.

use crate::manifest::{Instruction, RvrHeader, RvrManifest};

struct Writer {
    bytes: Vec<u8>,
}

impl Writer {
    fn new() -> Self {
        Self { bytes: Vec::new() }
    }

    fn push_u8(&mut self, value: u8) {
        self.bytes.push(value);
    }

    fn push_u16(&mut self, value: u16) {
        self.bytes.extend_from_slice(&value.to_le_bytes());
    }

    fn push_u32(&mut self, value: u32) {
        self.bytes.extend_from_slice(&value.to_le_bytes());
    }

    fn push_u64(&mut self, value: u64) {
        self.bytes.extend_from_slice(&value.to_le_bytes());
    }
}

fn write_header(writer: &mut Writer, header: &RvrHeader) {
    writer.push_u32(header.magic);
    writer.push_u32(header.epoch_id);
    writer.push_u32(header.node_count);
    writer.push_u64(header.sector_map);
    writer.push_u32(header.manifest_length);
}

fn write_instruction(writer: &mut Writer, instruction: &Instruction) {
    writer.push_u8(instruction.opcode());

    match instruction {
        Instruction::SetEpoch { epoch } => {
            writer.push_u32(*epoch);
        }
        Instruction::MapNode {
            node_id,
            address,
            salted_hash,
        } => {
            writer.push_u16(*node_id);
            writer.push_u32(*address);
            writer.push_u32(*salted_hash);
        }
        Instruction::LinkFlow { src, dest } => {
            writer.push_u16(*src);
            writer.push_u16(*dest);
        }
        Instruction::CfgPpm {
            sector_id,
            cluster_mask,
        } => {
            writer.push_u8(*sector_id);
            writer.push_u64(*cluster_mask);
        }
        Instruction::InitRes { arity, flags } => {
            writer.push_u16(*arity);
            writer.push_u8(*flags);
        }
        Instruction::SetConstraint {
            node_a,
            node_b,
            max_dist_um,
        } => {
            writer.push_u16(*node_a);
            writer.push_u16(*node_b);
            writer.push_u16(*max_dist_um);
        }
    }
}

pub fn emit_bytes(manifest: &RvrManifest) -> Vec<u8> {
    let header = manifest
        .header
        .as_ref()
        .expect("RvrManifest header missing; call emit_with_sector_map first");

    let mut writer = Writer::new();
    write_header(&mut writer, header);

    for instruction in &manifest.instructions {
        write_instruction(&mut writer, instruction);
    }

    writer.bytes
}

pub fn emit_with_sector_map(manifest: &mut RvrManifest, sector_map: u64) -> Vec<u8> {
    manifest.finalize_header(sector_map);
    emit_bytes(manifest)
}

pub fn parse_header(bytes: &[u8]) -> Option<(u32, u32, u32, u64, u32)> {
    if bytes.len() < RvrHeader::BYTE_SIZE {
        return None;
    }

    let magic = u32::from_le_bytes(bytes[0..4].try_into().ok()?);
    let epoch = u32::from_le_bytes(bytes[4..8].try_into().ok()?);
    let node_count = u32::from_le_bytes(bytes[8..12].try_into().ok()?);
    let sector_map = u64::from_le_bytes(bytes[12..20].try_into().ok()?);
    let manifest_len = u32::from_le_bytes(bytes[20..24].try_into().ok()?);

    Some((magic, epoch, node_count, sector_map, manifest_len))
}

pub fn seed_manifest() -> RvrManifest {
    let mut manifest = RvrManifest::new();
    manifest
        .instructions
        .push(Instruction::SetEpoch { epoch: 0x5249_5645 });
    manifest.notes.push("seed manifest".to_string());
    manifest
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::manifest::{Instruction, MAGIC};

    #[test]
    fn emits_valid_magic_and_lengths() {
        let mut manifest = RvrManifest::new();
        manifest
            .instructions
            .push(Instruction::SetEpoch { epoch: 0x5249_5645 });

        let bytes = emit_with_sector_map(&mut manifest, 0x1);
        let (magic, epoch, node_count, sector_map, manifest_length) = parse_header(&bytes).unwrap();

        assert_eq!(magic, MAGIC);
        assert_eq!(epoch, 0x5249_5645);
        assert_eq!(node_count, 0);
        assert_eq!(sector_map, 0x1);
        assert_eq!(manifest_length as usize, manifest.instruction_bytes());
        assert_eq!(bytes.len(), RvrHeader::BYTE_SIZE + manifest_length as usize);
    }

    #[test]
    fn uses_little_endian() {
        let mut manifest = RvrManifest::new();
        manifest
            .instructions
            .push(Instruction::SetEpoch { epoch: 0x0102_0304 });

        let bytes = emit_with_sector_map(&mut manifest, 0);
        assert_eq!(&bytes[4..8], &[0x04, 0x03, 0x02, 0x01]);
    }
}
