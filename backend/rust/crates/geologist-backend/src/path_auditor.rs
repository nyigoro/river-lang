// RIVER-LANG ? geologist-backend/src/path_auditor.rs
//
// Instruction-level safety validation before binary emission.
//
// A1: DIR_BIT segregation
//     Upstream links cannot also carry branch selectors.
// A2: Constraint limit
//     max_dist_um must be <= 2000 (2.0mm).
// A3: MAP_NODE hash
//     salted_hash must be non-zero.
// A4: Reservoir init
//     INIT_RES must exist.
// A5: Sector coverage
//     mapped node addresses must fall within declared sector ranges.

use crate::manifest::{
    Instruction, LINK_FLAG_FALSE_BRANCH, LINK_FLAG_TRUE_BRANCH, LINK_FLAG_UPSTREAM, LINK_NODE_MASK,
};

#[derive(Debug, Clone)]
pub struct SectorRange {
    pub name: String,
    pub start: u32,
    pub end: u32,
}

#[derive(Debug, Clone)]
pub struct AuditViolation {
    pub rule: &'static str,
    pub message: String,
}

#[derive(Debug, Clone)]
pub struct AuditResult {
    pub ok: bool,
    pub violations: Vec<AuditViolation>,
    pub details: Vec<String>,
}

impl AuditResult {
    fn from_violations(violations: Vec<AuditViolation>) -> Self {
        let details = violations
            .iter()
            .map(|violation| format!("[{}] {}", violation.rule, violation.message))
            .collect();

        Self {
            ok: violations.is_empty(),
            violations,
            details,
        }
    }
}

fn check_dir_bit_segregation(instructions: &[Instruction]) -> Vec<AuditViolation> {
    let mut violations = Vec::new();

    for instruction in instructions {
        if let Instruction::LinkFlow { src, dest } = instruction {
            let src_flags = *src & !LINK_NODE_MASK;
            let branch_mask = LINK_FLAG_TRUE_BRANCH | LINK_FLAG_FALSE_BRANCH;
            let is_upstream = (src_flags & LINK_FLAG_UPSTREAM) != 0;
            let has_branch = (src_flags & branch_mask) != 0;
            let has_both_branches = (src_flags & branch_mask) == branch_mask;
            let dest_has_flags = (*dest & !LINK_NODE_MASK) != 0;

            if is_upstream && has_branch {
                violations.push(AuditViolation {
                    rule: "A1",
                    message: format!(
                        "Upstream LINK_FLOW src={:#06x} carries branch selector bits; DIR_BIT=1 links must be unbranched.",
                        src
                    ),
                });
            }

            if has_both_branches {
                violations.push(AuditViolation {
                    rule: "A1",
                    message: format!(
                        "LINK_FLOW src={:#06x} sets both TRUE and FALSE branch bits.",
                        src
                    ),
                });
            }

            if dest_has_flags {
                violations.push(AuditViolation {
                    rule: "A1",
                    message: format!(
                        "LINK_FLOW dest={:#06x} contains flag bits outside LINK_NODE_MASK.",
                        dest
                    ),
                });
            }
        }
    }

    violations
}

fn check_constraint_limit(instructions: &[Instruction]) -> Vec<AuditViolation> {
    let mut violations = Vec::new();

    for instruction in instructions {
        if let Instruction::SetConstraint {
            node_a,
            node_b,
            max_dist_um,
        } = instruction
        {
            if *max_dist_um > 2_000 {
                violations.push(AuditViolation {
                    rule: "A2",
                    message: format!(
                        "Constraint between node {} and node {} is {}um (> 2000um hard limit).",
                        node_a, node_b, max_dist_um
                    ),
                });
            }
        }
    }

    violations
}

fn check_non_zero_hashes(instructions: &[Instruction]) -> Vec<AuditViolation> {
    let mut violations = Vec::new();

    for instruction in instructions {
        if let Instruction::MapNode {
            node_id,
            salted_hash,
            ..
        } = instruction
        {
            if *salted_hash == 0 {
                violations.push(AuditViolation {
                    rule: "A3",
                    message: format!("MAP_NODE {} has zero salted_hash.", node_id),
                });
            }
        }
    }

    violations
}

fn check_reservoir_present(instructions: &[Instruction]) -> Vec<AuditViolation> {
    if instructions
        .iter()
        .any(|instruction| matches!(instruction, Instruction::InitRes { .. }))
    {
        Vec::new()
    } else {
        vec![AuditViolation {
            rule: "A4",
            message: "Manifest is missing INIT_RES instruction.".to_string(),
        }]
    }
}

fn check_sector_coverage(instructions: &[Instruction], sectors: &[SectorRange]) -> Vec<AuditViolation> {
    if sectors.is_empty() {
        return Vec::new();
    }

    let mut violations = Vec::new();

    for instruction in instructions {
        if let Instruction::MapNode {
            node_id,
            address,
            ..
        } = instruction
        {
            let covered = sectors
                .iter()
                .any(|sector| *address >= sector.start && *address <= sector.end);

            if !covered {
                let sector_desc = sectors
                    .iter()
                    .map(|sector| format!("{}[{:#X}-{:#X}]", sector.name, sector.start, sector.end))
                    .collect::<Vec<_>>()
                    .join(", ");

                violations.push(AuditViolation {
                    rule: "A5",
                    message: format!(
                        "MAP_NODE {} at {:#06X} is outside all sectors: {}.",
                        node_id, address, sector_desc
                    ),
                });
            }
        }
    }

    violations
}

pub fn audit(instructions: &[Instruction], sectors: &[SectorRange]) -> AuditResult {
    let mut violations = Vec::new();
    violations.extend(check_dir_bit_segregation(instructions));
    violations.extend(check_constraint_limit(instructions));
    violations.extend(check_non_zero_hashes(instructions));
    violations.extend(check_reservoir_present(instructions));
    violations.extend(check_sector_coverage(instructions, sectors));
    AuditResult::from_violations(violations)
}


#[cfg(test)]
mod tests {
    use super::*;
    use crate::manifest::{Instruction, RES_FLAG_HASH_CHECK, LINK_FLAG_TRUE_BRANCH, LINK_FLAG_FALSE_BRANCH};

    fn valid() -> Vec<Instruction> {
        vec![
            Instruction::SetEpoch { epoch: 0x5249_5645 },
            Instruction::MapNode {
                node_id: 0,
                address: 0x00A0,
                salted_hash: 0xDEAD_BEEF,
            },
            Instruction::MapNode {
                node_id: 1,
                address: 0x00B4,
                salted_hash: 0xABCD_1234,
            },
            Instruction::LinkFlow { src: 0, dest: 1 },
            Instruction::SetConstraint {
                node_a: 0,
                node_b: 1,
                max_dist_um: 1500,
            },
            Instruction::InitRes {
                arity: 1,
                flags: RES_FLAG_HASH_CHECK,
            },
        ]
    }

    #[test]
    fn valid_manifest_passes() {
        let sectors = vec![SectorRange {
            name: "Alpha".to_string(),
            start: 0x0000,
            end: 0x01FF,
        }];

        let result = audit(&valid(), &sectors);
        assert!(result.ok);
    }

    #[test]
    fn upstream_with_branch_flag_fails() {
        let mut instructions = valid();
        instructions.push(Instruction::LinkFlow {
            src: LINK_FLAG_UPSTREAM | LINK_FLAG_TRUE_BRANCH | 0x0001,
            dest: 0x0000,
        });

        let result = audit(&instructions, &[]);
        assert!(!result.ok);
        assert!(result.violations.iter().any(|v| v.rule == "A1"));
    }

    #[test]
    fn constraint_over_limit_fails() {
        let mut instructions = valid();
        instructions.push(Instruction::SetConstraint {
            node_a: 0,
            node_b: 1,
            max_dist_um: 2001,
        });

        let result = audit(&instructions, &[]);
        assert!(!result.ok);
        assert!(result.violations.iter().any(|v| v.rule == "A2"));
    }

    #[test]
    fn a3_zero_salted_hash_fails() {
        let mut instructions = valid();
        instructions.push(Instruction::MapNode {
            node_id: 2,
            address: 0x00C8,
            salted_hash: 0,
        });
        let result = audit(&instructions, &[]);
        assert!(!result.ok);
        assert!(result.violations.iter().any(|v| v.rule == "A3"));
    }

    #[test]
    fn a4_missing_init_res_fails() {
        let mut instructions = valid();
        instructions.retain(|instr| !matches!(instr, Instruction::InitRes { .. }));
        let result = audit(&instructions, &[]);
        assert!(!result.ok);
        assert!(result.violations.iter().any(|v| v.rule == "A4"));
    }

    #[test]
    fn a5_address_outside_sector_fails() {
        let mut instructions = valid();
        instructions.push(Instruction::MapNode {
            node_id: 2,
            address: 0x0500,
            salted_hash: 0x1234_5678,
        });
        let sectors = vec![SectorRange {
            name: "Alpha".to_string(),
            start: 0x0000,
            end: 0x03FF,
        }];
        let result = audit(&instructions, &sectors);
        assert!(!result.ok);
        assert!(result.violations.iter().any(|v| v.rule == "A5"));
    }

    #[test]
    fn a5_address_on_boundary_passes() {
        let mut instructions = valid();
        instructions.push(Instruction::MapNode {
            node_id: 2,
            address: 0x03FF,
            salted_hash: 0x1234_5678,
        });
        let sectors = vec![SectorRange {
            name: "Alpha".to_string(),
            start: 0x0000,
            end: 0x03FF,
        }];
        let result = audit(&instructions, &sectors);
        assert!(result.ok);
    }

    #[test]
    fn duplicate_branch_flags_on_dest_fails() {
        let mut instructions = valid();
        instructions.push(Instruction::LinkFlow {
            src: 0x0000,
            dest: LINK_FLAG_TRUE_BRANCH | LINK_FLAG_FALSE_BRANCH | 0x0001,
        });
        let result = audit(&instructions, &[]);
        assert!(!result.ok);
        assert!(result.violations.iter().any(|v| v.rule == "A1"));
    }
}
