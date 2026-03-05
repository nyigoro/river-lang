use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Opcode {
    SetEpoch,
    MapNode,
    LinkFlow,
    CfgPpm,
    InitRes,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Instruction {
    pub opcode: Opcode,
    pub args: Vec<String>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct RvrManifest {
    pub instructions: Vec<Instruction>,
    pub notes: Vec<String>,
}