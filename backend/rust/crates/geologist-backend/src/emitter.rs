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

    #[test]
    fn encodes_map_node_correctly() {
        let mut manifest = RvrManifest::new();
        manifest.instructions.push(Instruction::SetEpoch { epoch: 0x5249_5645 });
        manifest.instructions.push(Instruction::MapNode {
            node_id: 0x00AA,
            address: 0x00B4_CAFE,
            salted_hash: 0xDEAD_BEEF,
        });

        let bytes = emit_with_sector_map(&mut manifest, 0);
        let offset = RvrHeader::BYTE_SIZE + 1 + 4; // opcode + epoch payload
        assert_eq!(bytes[offset], 0x02);
        assert_eq!(&bytes[offset + 1..offset + 3], &0x00AAu16.to_le_bytes());
        assert_eq!(&bytes[offset + 3..offset + 7], &0x00B4_CAFEu32.to_le_bytes());
        assert_eq!(&bytes[offset + 7..offset + 11], &0xDEAD_BEEFu32.to_le_bytes());
    }

    #[test]
    fn encodes_link_flow_downstream() {
        let mut manifest = RvrManifest::new();
        manifest.instructions.push(Instruction::SetEpoch { epoch: 0x5249_5645 });
        manifest.instructions.push(Instruction::LinkFlow { src: 0x00B4, dest: 0x00A0 });
        let bytes = emit_with_sector_map(&mut manifest, 0);
        let offset = RvrHeader::BYTE_SIZE + 1 + 4;
        assert_eq!(bytes[offset], 0x03);
        let src = u16::from_le_bytes(bytes[offset + 1..offset + 3].try_into().unwrap());
        assert_eq!(src & 0x8000, 0);
    }

    #[test]
    fn encodes_link_flow_upstream() {
        let mut manifest = RvrManifest::new();
        manifest.instructions.push(Instruction::SetEpoch { epoch: 0x5249_5645 });
        manifest.instructions.push(Instruction::LinkFlow { src: 0x80C8, dest: 0x00B4 });
        let bytes = emit_with_sector_map(&mut manifest, 0);
        let offset = RvrHeader::BYTE_SIZE + 1 + 4;
        assert_eq!(bytes[offset], 0x03);
        let src = u16::from_le_bytes(bytes[offset + 1..offset + 3].try_into().unwrap());
        assert_ne!(src & 0x8000, 0);
    }

    #[test]
    fn encodes_cfg_ppm() {
        let mut manifest = RvrManifest::new();
        manifest.instructions.push(Instruction::SetEpoch { epoch: 0x5249_5645 });
        manifest.instructions.push(Instruction::CfgPpm {
            sector_id: 0,
            cluster_mask: 0xFFFF_FFFF_FFFF_FFFF,
        });
        let bytes = emit_with_sector_map(&mut manifest, 0);
        let offset = RvrHeader::BYTE_SIZE + 1 + 4;
        assert_eq!(bytes[offset], 0x04);
        assert_eq!(bytes[offset + 1], 0);
        assert_eq!(
            &bytes[offset + 2..offset + 10],
            &0xFFFF_FFFF_FFFF_FFFFu64.to_le_bytes()
        );
    }

    #[test]
    fn encodes_init_res() {
        let mut manifest = RvrManifest::new();
        manifest.instructions.push(Instruction::SetEpoch { epoch: 0x5249_5645 });
        manifest.instructions.push(Instruction::InitRes { arity: 1, flags: 0x01 });
        let bytes = emit_with_sector_map(&mut manifest, 0);
        let offset = RvrHeader::BYTE_SIZE + 1 + 4;
        assert_eq!(bytes[offset], 0x05);
        assert_eq!(&bytes[offset + 1..offset + 3], &1u16.to_le_bytes());
        assert_eq!(bytes[offset + 3], 0x01);
    }

    #[test]
    fn encodes_set_constraint() {
        let mut manifest = RvrManifest::new();
        manifest.instructions.push(Instruction::SetEpoch { epoch: 0x5249_5645 });
        manifest.instructions.push(Instruction::SetConstraint {
            node_a: 0x0002,
            node_b: 0x0001,
            max_dist_um: 1500,
        });
        let bytes = emit_with_sector_map(&mut manifest, 0);
        let offset = RvrHeader::BYTE_SIZE + 1 + 4;
        assert_eq!(bytes[offset], 0x06);
        assert_eq!(&bytes[offset + 1..offset + 3], &0x0002u16.to_le_bytes());
        assert_eq!(&bytes[offset + 3..offset + 5], &0x0001u16.to_le_bytes());
        assert_eq!(&bytes[offset + 5..offset + 7], &1500u16.to_le_bytes());
    }

    #[test]
    fn empty_instructions_produces_header_only() {
        let mut manifest = RvrManifest::new();
        let bytes = emit_with_sector_map(&mut manifest, 0);
        assert_eq!(bytes.len(), RvrHeader::BYTE_SIZE);
    }

    #[test]
    fn round_trip_fibonacci_manifest() {
        let mut manifest = RvrManifest::new();
        manifest.instructions.push(Instruction::SetEpoch { epoch: 0x5249_5645 });
        for (node_id, address, salted_hash) in [
            (0u16, 0x00A0u32, 0x1111_1111u32),
            (1u16, 0x00B4u32, 0x2222_2222u32),
            (2u16, 0x00C8u32, 0x3333_3333u32),
            (3u16, 0x00D2u32, 0x4444_4444u32),
            (4u16, 0x0210u32, 0x5555_5555u32),
            (5u16, 0x0300u32, 0x6666_6666u32),
        ] {
            manifest.instructions.push(Instruction::MapNode {
                node_id,
                address,
                salted_hash,
            });
        }
        manifest.instructions.extend([
            Instruction::LinkFlow { src: 0x0000, dest: 0x0001 },
            Instruction::LinkFlow { src: 0x0001, dest: 0x0002 },
            Instruction::LinkFlow { src: 0x0000, dest: 0x0003 },
            Instruction::LinkFlow { src: 0x0002, dest: 0x0004 },
            Instruction::LinkFlow { src: 0x0003, dest: 0x0004 },
            Instruction::LinkFlow { src: 0x4004, dest: 0x0001 },
            Instruction::LinkFlow { src: 0x2004, dest: 0x0005 },
            Instruction::LinkFlow { src: 0x8002, dest: 0x0001 },
            Instruction::LinkFlow { src: 0x8001, dest: 0x0000 },
        ]);
        manifest.instructions.extend([
            Instruction::CfgPpm { sector_id: 0, cluster_mask: u64::MAX },
            Instruction::CfgPpm { sector_id: 1, cluster_mask: u64::MAX },
        ]);
        manifest.instructions.extend([
            Instruction::SetConstraint { node_a: 2, node_b: 1, max_dist_um: 1500 },
            Instruction::SetConstraint { node_a: 1, node_b: 0, max_dist_um: 1500 },
        ]);
        manifest.instructions.push(Instruction::InitRes { arity: 1, flags: 0x03 });

        let bytes = emit_with_sector_map(&mut manifest, 0x3);
        let (_, _, node_count, _, manifest_len) = parse_header(&bytes).unwrap();
        assert_eq!(node_count, 6);
        assert_eq!(manifest_len as usize, manifest.instruction_bytes());
    }
}
