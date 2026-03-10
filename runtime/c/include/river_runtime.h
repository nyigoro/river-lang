/**
 * RIVER-LANG — runtime/c/include/river_runtime.h
 *
 * Internal types shared across runtime source files.
 * NOT part of the public API. Orchestrators include river_hw.h only.
 */

#ifndef RIVER_RUNTIME_H
#define RIVER_RUNTIME_H

#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif
#include <stddef.h>
#include <stdint.h>
#include <stdarg.h>
#include "river_hw.h"

#ifdef __cplusplus
extern "C" {
#endif

/* ── .rvr binary constants ─────────────────────────────────────────────────── */

#define RVR_MAGIC            0x52495645u   /* "RIVE" little-endian */
#define RVR_HEADER_SIZE      24u           /* bytes */
#define RIVER_EPOCH_BASE     0x52495645u   /* default simulation epoch */
#define RIVER_SALT_SEED      0xC0FFEE01u   /* simulation seed for Session_Salt */

/* ── Opcodes ───────────────────────────────────────────────────────────────── */

#define OP_SET_EPOCH         0x01
#define OP_MAP_NODE          0x02
#define OP_LINK_FLOW         0x03
#define OP_CFG_PPM           0x04
#define OP_INIT_RES          0x05
#define OP_SET_CONSTRAINT    0x06

/* ── LINK_FLOW flags ───────────────────────────────────────────────────────── */

#define LINK_FLAG_UPSTREAM      0x8000u
#define LINK_FLAG_TRUE_BRANCH   0x4000u
#define LINK_FLAG_FALSE_BRANCH  0x2000u
#define LINK_NODE_MASK          0x1FFFu

/* ── INIT_RES flags ────────────────────────────────────────────────────────── */

#define RES_FLAG_HASH_CHECK     0x01
#define RES_FLAG_PURGE_ON_DRY   0x02

/* ── ThirstCodes ───────────────────────────────────────────────────────────── */

#define THIRST_DRY_INPUT    0x01
#define THIRST_HASH_MISM    0x02
#define THIRST_HASH_COLL    0x03
#define THIRST_PURGE_REQ    0x04
#define THIRST_CRC_FAIL     0x05
#define THIRST_PURGE_ALL    0xFF

/* ── Limits ────────────────────────────────────────────────────────────────── */

#define RIVER_MAX_NODES      1024u
#define RIVER_MAX_SECTORS    64u
#define RIVER_MAX_QUARANTINE 64u
#define RIVER_TAG_PURGE      0xFFFFu   /* sentinel TAG_GEN = Flash Flood Purge */

/* ── Records decoded from .rvr instruction stream ─────────────────────────── */

typedef struct {
    uint16_t node_id;
    uint32_t address;
    uint32_t salted_hash;
} node_record_t;

typedef struct {
    uint8_t  sector_id;
    uint64_t cluster_mask;   /* 1=clean, 0=dirty */
} sector_record_t;

typedef struct {
    uint16_t arity;
    uint8_t  flags;
} reservoir_record_t;

/* ── Enclave ───────────────────────────────────────────────────────────────── */

typedef struct {
    uint32_t session_salt;   /* 32-bit primitive — zeroed atomically on wipe */
    uint8_t  wiped;          /* 1 after river_enclave_wipe() */
} enclave_t;

/* ── TAG palette — 65535 colour slots, one per active river ───────────────── */

/* 65535 bits packed into 1024 × u64 words */
typedef struct {
    uint64_t active[1024];
    uint16_t next_free;
} tag_palette_t;

/* ── Quarantine table ──────────────────────────────────────────────────────── */

typedef struct {
    int      node_indices[RIVER_MAX_QUARANTINE];
    uint32_t until_ms[RIVER_MAX_QUARANTINE];   /* monotonic clock */
    int      count;
} quarantine_table_t;

/* ── .rvr file header (parsed from binary) ─────────────────────────────────── */

typedef struct {
    uint32_t magic;
    uint32_t epoch_id;
    uint32_t node_count;
    uint64_t sector_map;
    uint32_t manifest_length;
} rvr_header_t;

/* ── river_state_t — the concrete struct behind the opaque river_t ─────────── */

typedef struct river_state_s river_state_t;

struct river_state_s {
    /* Parsed manifest */
    rvr_header_t       header;
    node_record_t      nodes[RIVER_MAX_NODES];
    uint32_t           node_count;
    sector_record_t    sectors[RIVER_MAX_SECTORS];
    uint32_t           sector_count;
    reservoir_record_t reservoir;
    uint8_t            has_reservoir;

    /* Security */
    enclave_t          enclave;
    uint8_t            epoch_validated;
    tag_palette_t      tag_palette;
    quarantine_table_t quarantine;

    /* Runtime state */
    uint16_t           active_tag;
    river_status_t     last_status;
    uint8_t            cry_code;
    uint32_t           pain_hash;
    char               last_error[256];

    /* Simulation — set to 1 until real silicon is present */
    uint8_t            sim_mode;
    uint64_t           sim_result;
};

/* ── Little-endian read helpers ────────────────────────────────────────────── */

static inline uint16_t read_u16_le(const uint8_t *p) {
    return (uint16_t)(p[0] | ((uint16_t)p[1] << 8));
}

static inline uint32_t read_u32_le(const uint8_t *p) {
    return (uint32_t)p[0]
         | ((uint32_t)p[1] <<  8)
         | ((uint32_t)p[2] << 16)
         | ((uint32_t)p[3] << 24);
}

static inline uint64_t read_u64_le(const uint8_t *p) {
    return (uint64_t)p[0]
         | ((uint64_t)p[1] <<  8)
         | ((uint64_t)p[2] << 16)
         | ((uint64_t)p[3] << 24)
         | ((uint64_t)p[4] << 32)
         | ((uint64_t)p[5] << 40)
         | ((uint64_t)p[6] << 48)
         | ((uint64_t)p[7] << 56);
}

/* ── Internal function declarations ───────────────────────────────────────── */

river_state_t *river_state_alloc(void);
void           river_state_free(river_state_t *s);
void           river_set_error(river_state_t *s, const char *fmt, ...);
void           river_secure_zero(void *ptr, size_t len);
uint16_t       tag_palette_alloc(tag_palette_t *p);
void           tag_palette_free(tag_palette_t *p, uint16_t tag);
uint32_t       river_now_ms(void);
uint64_t       river_now_ns(void);
uint32_t       river_epoch_advance(void);
uint32_t       river_salt_rotate(uint32_t current_salt, uint32_t epoch);

/* ── Simulation entry points (river-sim Rust crate via stub or FFI) ────────── */

uint64_t sim_fibonacci(uint64_t n);

#ifdef __cplusplus
}
#endif

#endif /* RIVER_RUNTIME_H */
