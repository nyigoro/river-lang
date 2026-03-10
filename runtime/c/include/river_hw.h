/**
 * RIVER-LANG — runtime/c/include/river_hw.h
 *
 * Public C-Bridge interface. This is the ONLY header the orchestrator includes.
 * No internal types. No implementation details. No silicon specifics.
 *
 * License: Apache 2.0
 */

#ifndef RIVER_HW_H
#define RIVER_HW_H

#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ── Opaque handle ─────────────────────────────────────────────────────────── */

/** Opaque river handle. Allocate with river_load(). Free with river_enclave_wipe(). */
typedef struct river_state_s *river_t;

/* ── Token ─────────────────────────────────────────────────────────────────── */

typedef struct {
    uint64_t value;
    uint8_t  type;   /* 0 = integer, 1 = float (IEEE 754 bit-cast) */
} token_t;

static inline token_t token_int(uint64_t v) {
    token_t t; t.value = v; t.type = 0; return t;
}

static inline uint64_t token_to_u64(token_t t) { return t.value; }

/* ── Status codes ──────────────────────────────────────────────────────────── */

#define RIVER_OK                 0x00
#define RIVER_ERR_THIRST         0x01  /* upstream Cry received — river starved     */
#define RIVER_ERR_CHRONIC        0x02  /* chronically infected cluster detected     */
#define RIVER_ERR_STALE_MANIFEST 0x03  /* .rvr epoch does not match hardware        */
#define RIVER_ERR_PURGE          0x04  /* Flash Flood Purge completed, no result    */
#define RIVER_ERR_FATAL          0x05  /* all reroute attempts exhausted            */
#define RIVER_ERR_NULL_HANDLE    0x06  /* NULL river_t passed                       */
#define RIVER_ERR_BAD_MANIFEST   0x07  /* malformed or corrupt .rvr file            */
#define RIVER_ERR_TIMEOUT        0x08  /* await timeout exceeded                    */

typedef uint8_t river_status_t;

/* ── Wipe status ───────────────────────────────────────────────────────────── */

typedef enum {
    WIPE_CONFIRMED = 0,  /* 8ns stagger complete, Vdd rail stabilised */
    WIPE_PARTIAL   = 1   /* salt zeroed (security achieved), stagger still running */
} wipe_status_t;

/* ── Result ────────────────────────────────────────────────────────────────── */

typedef struct {
    token_t        value;      /* decoded Reservoir payload (valid when RIVER_OK) */
    river_status_t status;     /* RIVER_OK or RIVER_ERR_* */
    uint8_t        cry_code;   /* ThirstCode if status != RIVER_OK, else 0 */
    uint32_t       epoch;      /* hardware epoch at completion */
    uint32_t       pain_hash;  /* H(Node_ID ⊕ Salt) if CHRONIC, else 0 */
} river_result_t;

/* ── Lifecycle ─────────────────────────────────────────────────────────────── */

/**
 * Load a .rvr manifest from disk.
 * Validates magic bytes, manifest_length, structural integrity, and epoch.
 * Returns an allocated river_t, or NULL on failure or stale epoch.
 */
river_t river_load(const char *rvr_path);

/**
 * Query the chip's hardware epoch counter.
 * Compare against the epoch embedded in the .rvr manifest to detect staleness.
 */
uint32_t river_get_epoch(void);

/**
 * Spawn a river.
 *
 * Sequence:
 *   1. Prime Session_Salt register
 *   2. 8-cycle Aura Warm-up (DLL phase-lock)
 *   3. Scout Pulse dispatch (64ns Sector-Map Frame)
 *   4. Initial token injection at TOKEN_GEN node
 *
 * The token is CONSUMED on call.
 */
river_status_t river_spawn(river_t r, token_t input);

/**
 * Block until the Reservoir fires the Three-Way Handshake.
 *
 * @param r           River handle.
 * @param timeout_ns  Nanoseconds before RIVER_ERR_TIMEOUT. 0 = wait forever.
 */
river_result_t river_await(river_t r, uint64_t timeout_ns);

/**
 * Respawn on a new physical path after a Cry or Chronic error.
 * Internally calls river_purge() before re-salting.
 *
 * @param attempts  Max reroute attempts. Recommended: 3.
 */
river_status_t river_respawn(river_t r, token_t input, int attempts);

/**
 * Issue a Flash Flood Purge (TAG_GEN = 0xFFFF).
 * Blocks until PURGE_COMPLETED. Recycles TAG_GEN colour.
 */
void river_purge(river_t r);

/* ── Security ──────────────────────────────────────────────────────────────── */

/**
 * Resolve pain_hash to a node index via Enclave blind lookup.
 * Returns node index [0, node_count), or -1 if not found.
 * The orchestrator never sees raw physical addresses.
 */
int river_identify_node(river_t r, uint32_t pain_hash);

/**
 * Mark the cluster containing node_idx as Chronically Infected.
 * Excluded from Scout routing for 1 second.
 */
void river_quarantine_cluster(river_t r, int node_idx);

/**
 * Staggered Annihilation of the Session_Salt.
 *
 * Cycle 0:     32-bit Session_Salt grounded (security achieved immediately)
 * Cycles 1–32: 999 BLAKE3-Lite cores shut down via 16-stage delay tree
 * Total:       ~8ns
 *
 * BLOCKING — returns after Vdd rail is within 1% of 0.8V nominal.
 * UNCONDITIONAL — call regardless of river outcome.
 * Do NOT call exit() before this returns.
 *
 * Frees the river_t. Do not use r after this call.
 */
wipe_status_t river_enclave_wipe(river_t r);

/* ── Diagnostics ───────────────────────────────────────────────────────────── */

/** Human-readable description of the last error on this handle. */
const char *river_last_error(river_t r);

/** Runtime version string. */
const char *river_runtime_version(void);

#ifdef __cplusplus
}
#endif

#endif /* RIVER_HW_H */
