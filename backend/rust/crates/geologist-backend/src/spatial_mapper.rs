// RIVER-LANG ? geologist-backend/src/spatial_mapper.rs
//
// Spatial mapping assigns deterministic node IDs and salted per-node PATH_HASH values.
//
// Hash formula:
//   PATH_HASH = BLAKE3(epoch || physical_addr || hop_index)

use std::collections::HashMap;

use crate::manifest::{Instruction, LINK_NODE_MASK};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MappedNode {
    pub name: String,
    pub node_id: u16,
    pub address: u32,
    pub salted_hash: u32,
}

#[derive(Debug, Clone, Default)]
pub struct SpatialMap {
    pub entries: Vec<MappedNode>,
    name_to_id: HashMap<String, u16>,
}

impl SpatialMap {
    pub fn id_of(&self, name: &str) -> Option<u16> {
        self.name_to_id.get(name).copied()
    }

    pub fn hash_of(&self, name: &str) -> Option<u32> {
        self.entries
            .iter()
            .find(|entry| entry.name == name)
            .map(|entry| entry.salted_hash)
    }
}

pub fn compute_salted_hash(epoch: u32, address: u32, hop: u16) -> u32 {
    let mut bytes = [0_u8; 10];
    bytes[0..4].copy_from_slice(&epoch.to_le_bytes());
    bytes[4..8].copy_from_slice(&address.to_le_bytes());
    bytes[8..10].copy_from_slice(&hop.to_le_bytes());

    let digest = blake3::hash(&bytes);
    let hash = u32::from_le_bytes([
        digest.as_bytes()[0],
        digest.as_bytes()[1],
        digest.as_bytes()[2],
        digest.as_bytes()[3],
    ]);
    finalize_hash(hash)
}

fn finalize_hash(hash: u32) -> u32 {
    if hash == 0 { 1 } else { hash }
}

pub fn build_spatial_map(nodes: &[(String, u32)], epoch: u32) -> SpatialMap {
    assert!(
        nodes.len() <= (LINK_NODE_MASK as usize) + 1,
        "Too many nodes for LINK_NODE_MASK={} (got {})",
        LINK_NODE_MASK,
        nodes.len()
    );

    let mut entries = Vec::with_capacity(nodes.len());
    let mut name_to_id = HashMap::with_capacity(nodes.len());

    for (hop, (name, address)) in nodes.iter().enumerate() {
        let node_id = u16::try_from(hop).expect("node index overflow");
        let salted_hash = compute_salted_hash(epoch, *address, node_id);

        entries.push(MappedNode {
            name: name.clone(),
            node_id,
            address: *address,
            salted_hash,
        });
        name_to_id.insert(name.clone(), node_id);
    }

    SpatialMap { entries, name_to_id }
}

pub fn to_map_node_instructions(map: &SpatialMap) -> Vec<Instruction> {
    map.entries
        .iter()
        .map(|entry| Instruction::MapNode {
            node_id: entry.node_id,
            address: entry.address,
            salted_hash: entry.salted_hash,
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn hash_is_deterministic() {
        let h1 = compute_salted_hash(0x5249_5645, 0x00A0, 3);
        let h2 = compute_salted_hash(0x5249_5645, 0x00A0, 3);
        assert_eq!(h1, h2);
    }

    #[test]
    fn hash_changes_with_inputs() {
        let a = compute_salted_hash(1, 0x100, 0);
        let b = compute_salted_hash(1, 0x101, 0);
        let c = compute_salted_hash(2, 0x100, 0);
        let d = compute_salted_hash(1, 0x100, 1);
        assert_ne!(a, b);
        assert_ne!(a, c);
        assert_ne!(a, d);
    }

    #[test]
    fn build_spatial_map_assigns_sequential_ids() {
        let nodes = vec![
            ("A".to_string(), 0x10),
            ("B".to_string(), 0x11),
            ("C".to_string(), 0x12),
        ];

        let map = build_spatial_map(&nodes, 0x5249_5645);
        assert_eq!(map.entries[0].node_id, 0);
        assert_eq!(map.entries[1].node_id, 1);
        assert_eq!(map.entries[2].node_id, 2);
        assert_eq!(map.id_of("B"), Some(1));
        assert!(map.hash_of("A").is_some());
    }

    #[test]
    fn zero_hash_guard() {
        assert_eq!(finalize_hash(0), 1);
    }

    #[test]
    fn node_hashes_are_unique_for_999_nodes() {
        let mut set = HashSet::with_capacity(999);
        for i in 0..999u32 {
            let hash = compute_salted_hash(0x5249_5645, 0x1000 + i, i as u16);
            set.insert(hash);
        }
        assert_eq!(set.len(), 999);
    }

    #[test]
    fn different_epochs_produce_different_hashes() {
        let a = compute_salted_hash(0x5249_5645, 0x00A0, 0);
        let b = compute_salted_hash(0x5249_5646, 0x00A0, 0);
        assert_ne!(a, b);
    }
}
