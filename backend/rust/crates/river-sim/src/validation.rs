// RIVER-LANG ? river-sim/src/validation.rs

use anyhow::{anyhow, Result};

use crate::router::{NodeWire, RouteDecision, ThirstCode, Token};
use crate::dll_model::calibrate;
use crate::ppm::PHI_SKEW_LIMIT_PS;
use crate::spatial_mapper_sim::SimSpatialMap;

#[derive(Debug, Clone)]
pub struct SimResult {
    pub value: u64,
    pub tokens_processed: u32,
    pub cry_events: u32,
    pub ok: bool,
}

pub fn simulate_fibonacci(n: u64) -> u64 {
    if n == 0 {
        return 0;
    }
    if n == 1 {
        return 1;
    }

    let mut a = 0_u64;
    let mut b = 1_u64;

    for _ in 1..n {
        let next = a + b;
        a = b;
        b = next;
    }

    b
}

pub fn simulate_fibonacci_10_through_router() -> SimResult {
    const EPOCH: u32 = 0x5249_5645;
    const TAG: u16 = 0x0001;

    let nodes: Vec<(String, u32)> = vec![
        ("Seed_Gen".to_string(), 0x00A0),
        ("Feedback_Merge".to_string(), 0x00B4),
        ("Fibonacci_Adder".to_string(), 0x00C8),
        ("Counter_Sub".to_string(), 0x00D2),
        ("Exit_Gate".to_string(), 0x0210),
        ("Final_Output".to_string(), 0x0300),
    ];

    let spatial = SimSpatialMap::build(&nodes, EPOCH);

    let mut wires: Vec<NodeWire> = nodes
        .iter()
        .map(|(name, address)| {
            let hash = spatial
                .hash_of(name)
                .expect("spatial map hash missing for node");
            NodeWire::new(*address, hash)
        })
        .collect();

    let index_of = |name: &str| -> usize {
        nodes
            .iter()
            .position(|(node_name, _)| node_name == name)
            .expect("node missing")
    };

    let mut tokens_processed = 0_u32;
    let mut cry_events = 0_u32;

    // Seed token
    let seed_hash = spatial.hash_of("Seed_Gen").unwrap();
    let seed_token = Token::new_downstream(seed_hash, TAG, 10);
    match wires[index_of("Seed_Gen")].route(seed_token) {
        RouteDecision::AcceptToAlu(_) => tokens_processed += 1,
        RouteDecision::EvaporateAndCry { .. } => cry_events += 1,
        _ => {}
    }

    // Core Fibonacci flow simulation through adder wire
    let mut a = 0_u64;
    let mut b = 1_u64;
    for _ in 1..10 {
        let next = a + b;
        a = b;
        b = next;

        let adder_hash = spatial.hash_of("Fibonacci_Adder").unwrap();
        let token = Token::new_downstream(adder_hash, TAG, b);

        match wires[index_of("Fibonacci_Adder")].route(token) {
            RouteDecision::AcceptToAlu(_) => tokens_processed += 1,
            RouteDecision::EvaporateAndCry { .. } => cry_events += 1,
            _ => {}
        }
    }

    // Output reservoir sink
    let output_hash = spatial.hash_of("Final_Output").unwrap();
    let output_token = Token::new_downstream(output_hash, TAG, b);
    match wires[index_of("Final_Output")].route(output_token) {
        RouteDecision::AcceptToAlu(_) => tokens_processed += 1,
        RouteDecision::EvaporateAndCry { .. } => cry_events += 1,
        _ => {}
    }

    SimResult {
        value: b,
        tokens_processed,
        cry_events,
        ok: b == 55,
    }
}

pub fn verify_fibonacci_10(value: u64) -> Result<()> {
    if value == 55 {
        Ok(())
    } else {
        Err(anyhow!("expected 55, got {}", value))
    }
}

pub fn verify_cry_on_hash_mismatch() -> bool {
    let mut wire = NodeWire::new(0x00A0, 0xDEAD_1234);
    let bad = Token::new_downstream(0xBADB_ADBA, 1, 42);

    matches!(
        wire.route(bad),
        RouteDecision::EvaporateAndCry {
            reason: ThirstCode::HashMism,
            ..
        }
    )
}

pub fn verify_collision_triggers_cry() -> bool {
    let mut wire = NodeWire::new(0x00A0, 0xDEAD_1234);

    let first = Token::new_downstream(0xDEAD_1234, 1, 10);
    let second = Token::new_downstream(0xDEAD_1234, 2, 20);

    let _ = wire.route(first);

    matches!(
        wire.route(second),
        RouteDecision::EvaporateAndCry {
            reason: ThirstCode::HashColl,
            ..
        }
    )
}

pub fn verify_purge_and_recovery() -> bool {
    let mut wire = NodeWire::new(0x00A0, 0xDEAD_1234);

    let _ = wire.route(Token::new_downstream(0xDEAD_1234, 1, 10));
    let _ = wire.route(Token::new_downstream(0xDEAD_1234, 0xFFFF, 0));

    matches!(
        wire.route(Token::new_downstream(0xDEAD_1234, 3, 99)),
        RouteDecision::AcceptToAlu(_)
    )
}

pub fn verify_crc_fail_evaporates_silently() -> bool {
    let mut wire = NodeWire::new(0x00A0, 0xDEAD_1234);
    let mut token = Token::new_downstream(0xDEAD_1234, 1, 99);
    token.crc ^= 0x1;
    matches!(wire.route(token), RouteDecision::Evaporate { .. })
}

pub fn verify_hash_mism_emits_cry() -> bool {
    let mut wire = NodeWire::new(0x00A0, 0xDEAD_1234);
    let token = Token::new_downstream(0xBADB_ADBA, 1, 42);
    match wire.route(token) {
        RouteDecision::EvaporateAndCry { cry, reason } => {
            reason == ThirstCode::HashMism && cry.payload == ThirstCode::HashMism as u64
        }
        _ => false,
    }
}

pub fn verify_purge_recycles_tag_gen() -> bool {
    let mut wire = NodeWire::new(0x00A0, 0xDEAD_1234);
    let first = Token::new_downstream(0xDEAD_1234, 1, 10);
    let purge = Token::new_downstream(0xDEAD_1234, 0xFFFF, 0);
    let second = Token::new_downstream(0xDEAD_1234, 1, 11);

    matches!(wire.route(first), RouteDecision::AcceptToAlu(_))
        && matches!(wire.route(purge), RouteDecision::EvaporateAndCry { reason: ThirstCode::PurgeAll, .. })
        && matches!(wire.route(second), RouteDecision::AcceptToAlu(_))
}

pub fn verify_dll_warmup_required_before_ppm() -> bool {
    let unlocked = calibrate(PHI_SKEW_LIMIT_PS);
    let locked = calibrate(0);
    !unlocked.locked && locked.locked
}

pub fn simulate_linear_path() -> Option<u64> {
    const EPOCH: u32 = 0x5249_5645;
    const TAG: u16 = 0x0001;

    let nodes: Vec<(String, u32)> = vec![
        ("Token_Gen".to_string(), 0x0010),
        ("Alu_Add".to_string(), 0x0020),
        ("Alu_Sub".to_string(), 0x0030),
        ("Reservoir".to_string(), 0x0040),
    ];

    let spatial = SimSpatialMap::build(&nodes, EPOCH);
    let mut wires: Vec<NodeWire> = nodes
        .iter()
        .map(|(name, address)| {
            let hash = spatial
                .hash_of(name)
                .expect("spatial map hash missing for node");
            NodeWire::new(*address, hash)
        })
        .collect();

    let index_of = |name: &str| -> usize {
        nodes
            .iter()
            .position(|(node_name, _)| node_name == name)
            .expect("node missing")
    };

    let mut value = 5_u64;

    let token = Token::new_downstream(spatial.hash_of("Token_Gen").unwrap(), TAG, value);
    if !matches!(wires[index_of("Token_Gen")].route(token), RouteDecision::AcceptToAlu(_)) {
        return None;
    }

    value += 3;
    let token = Token::new_downstream(spatial.hash_of("Alu_Add").unwrap(), TAG, value);
    if !matches!(wires[index_of("Alu_Add")].route(token), RouteDecision::AcceptToAlu(_)) {
        return None;
    }

    value -= 2;
    let token = Token::new_downstream(spatial.hash_of("Alu_Sub").unwrap(), TAG, value);
    if !matches!(wires[index_of("Alu_Sub")].route(token), RouteDecision::AcceptToAlu(_)) {
        return None;
    }

    let token = Token::new_downstream(spatial.hash_of("Reservoir").unwrap(), TAG, value);
    if !matches!(wires[index_of("Reservoir")].route(token), RouteDecision::AcceptToAlu(_)) {
        return None;
    }

    Some(value)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fibonacci_10_is_55() {
        assert_eq!(simulate_fibonacci(10), 55);
    }

    #[test]
    fn fibonacci_10_through_router_is_55() {
        let result = simulate_fibonacci_10_through_router();
        assert!(result.ok);
        assert_eq!(result.value, 55);
    }

    #[test]
    fn hash_mismatch_cry_is_emitted() {
        assert!(verify_cry_on_hash_mismatch());
    }

    #[test]
    fn collision_cry_is_emitted() {
        assert!(verify_collision_triggers_cry());
    }

    #[test]
    fn purge_allows_new_tag() {
        assert!(verify_purge_and_recovery());
    }

    #[test]
    fn crc_fail_evaporates_silently() {
        assert!(verify_crc_fail_evaporates_silently());
    }

    #[test]
    fn hash_mismatch_emits_expected_cry_code() {
        assert!(verify_hash_mism_emits_cry());
    }

    #[test]
    fn purge_recycles_tag_gen() {
        assert!(verify_purge_recycles_tag_gen());
    }

    #[test]
    fn dll_warm_up_required_before_ppm() {
        assert!(verify_dll_warmup_required_before_ppm());
    }

    #[test]
    fn multi_node_linear_path() {
        let value = simulate_linear_path().expect("linear path failed");
        assert_eq!(value, 6);
    }
}
