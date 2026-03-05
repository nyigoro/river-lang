// RIVER-LANG ? river-sim/src/spatial_mapper_sim.rs
//
// Simulation helper that mirrors backend spatial hashing.

use std::collections::HashMap;

pub fn compute_hash(epoch: u32, address: u32, hop: u16) -> u32 {
    geologist_backend::spatial_mapper::compute_salted_hash(epoch, address, hop)
}

#[derive(Debug, Clone)]
pub struct SimSpatialMap {
    by_name: HashMap<String, (u16, u32, u32)>, // name -> (id, address, hash)
}

impl SimSpatialMap {
    pub fn build(nodes: &[(String, u32)], epoch: u32) -> Self {
        let mut by_name = HashMap::with_capacity(nodes.len());

        for (index, (name, address)) in nodes.iter().enumerate() {
            let node_id = u16::try_from(index).expect("too many simulation nodes");
            let hash = compute_hash(epoch, *address, node_id);
            by_name.insert(name.clone(), (node_id, *address, hash));
        }

        Self { by_name }
    }

    pub fn id_of(&self, name: &str) -> Option<u16> {
        self.by_name.get(name).map(|(id, _, _)| *id)
    }

    pub fn address_of(&self, name: &str) -> Option<u32> {
        self.by_name.get(name).map(|(_, address, _)| *address)
    }

    pub fn hash_of(&self, name: &str) -> Option<u32> {
        self.by_name.get(name).map(|(_, _, hash)| *hash)
    }
}