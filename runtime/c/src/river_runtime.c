/**
 * RIVER-LANG — runtime/c/src/river_runtime.c
 *
 * Core runtime:
 *   river_load()              — parse .rvr binary into river_state_t
 *   river_get_epoch()         — monotonic hardware epoch counter
 *   river_identify_node()     — Enclave blind lookup
 *   river_quarantine_cluster()— mark cluster infected
 *   river_last_error()        — diagnostic string
 *   river_runtime_version()   — version
 *   Shared utilities: alloc, clock, secure_zero, TAG palette
 */

#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdarg.h>
#include <time.h>
#ifdef _WIN32
#include <windows.h>
#endif

#include "river_runtime.h"

/* ── Version ───────────────────────────────────────────────────────────────── */

const char *river_runtime_version(void) {
    return "0.1.0";
}

/* ── Memory ────────────────────────────────────────────────────────────────── */

river_state_t *river_state_alloc(void) {
    return (river_state_t *)calloc(1, sizeof(river_state_t));
}

void river_state_free(river_state_t *s) {
    if (s) free(s);
}

/* ── Error ─────────────────────────────────────────────────────────────────── */

void river_set_error(river_state_t *s, const char *fmt, ...) {
    if (!s) return;
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(s->last_error, sizeof(s->last_error), fmt, ap);
    va_end(ap);
}

const char *river_last_error(river_t r) {
    if (!r) return "NULL handle";
    return r->last_error;
}

/* ── Secure zero ───────────────────────────────────────────────────────────── */

void river_secure_zero(void *ptr, size_t len) {
    volatile uint8_t *p = (volatile uint8_t *)ptr;
    size_t i;
    for (i = 0; i < len; i++) p[i] = 0;
    /* Memory barrier — prevents dead-store elimination */
#if defined(__GNUC__) || defined(__clang__)
    __asm__ __volatile__("" ::: "memory");
#endif
}

/* ── Clocks ────────────────────────────────────────────────────────────────── */

uint32_t river_now_ms(void) {
#ifdef _WIN32
    static LARGE_INTEGER freq = {0};
    LARGE_INTEGER now;
    if (freq.QuadPart == 0) {
        QueryPerformanceFrequency(&freq);
    }
    QueryPerformanceCounter(&now);
    return (uint32_t)((now.QuadPart * 1000ull) / (uint64_t)freq.QuadPart);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint32_t)((uint64_t)ts.tv_sec * 1000u
                    + (uint64_t)ts.tv_nsec / 1000000u);
#endif
}

uint64_t river_now_ns(void) {
#ifdef _WIN32
    static LARGE_INTEGER freq = {0};
    LARGE_INTEGER now;
    if (freq.QuadPart == 0) {
        QueryPerformanceFrequency(&freq);
    }
    QueryPerformanceCounter(&now);
    return (uint64_t)((now.QuadPart * 1000000000ull) / (uint64_t)freq.QuadPart);
#else
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec * 1000000000ull
         + (uint64_t)ts.tv_nsec;
#endif
}

/**
 * Hardware epoch counter.
 *
 * One epoch = one T_frame = 64ns.
 * Simulation: derives from the monotonic nanosecond clock.
 * Production: reads the chip's epoch register via memory-mapped I/O.
 */
uint32_t river_get_epoch(void) {
    return (uint32_t)(river_now_ns() / 64ull);
}

/* ── TAG palette ───────────────────────────────────────────────────────────── */

#define TAG_WORD(t) ((t) / 64u)
#define TAG_BIT(t)  (1ull << ((t) % 64u))

uint16_t tag_palette_alloc(tag_palette_t *p) {
    uint32_t i;
    for (i = 0; i < 65535u; i++) {
        uint16_t tag  = (uint16_t)(((uint32_t)p->next_free + i) % 65535u + 1u);
        uint16_t word = (uint16_t)TAG_WORD(tag);
        uint64_t bit  = TAG_BIT(tag);
        if (!(p->active[word] & bit)) {
            p->active[word] |= bit;
            p->next_free = (uint16_t)(tag % 65535u + 1u);
            return tag;
        }
    }
    return 0; /* exhausted */
}

void tag_palette_free(tag_palette_t *p, uint16_t tag) {
    if (!tag) return;
    p->active[TAG_WORD(tag)] &= ~TAG_BIT(tag);
}

/* ── Manifest instruction parser ───────────────────────────────────────────── */

static int parse_instructions(river_state_t *s,
                               const uint8_t *buf,
                               uint32_t       len,
                               uint32_t      *set_epoch,
                               int           *has_set_epoch)
{
    uint32_t pos = 0;

    while (pos < len) {
        uint8_t op = buf[pos++];

        switch (op) {

        case OP_SET_EPOCH:
            /* epoch already in header — consume 4 bytes */
            if (pos + 4 > len) goto trunc;
            if (set_epoch && has_set_epoch) {
                *set_epoch = read_u32_le(buf + pos);
                *has_set_epoch = 1;
            }
            pos += 4;
            break;

        case OP_MAP_NODE:
            if (pos + 10 > len) goto trunc;
            if (s->node_count >= RIVER_MAX_NODES) {
                river_set_error(s, "Node count exceeds RIVER_MAX_NODES (%u)", RIVER_MAX_NODES);
                return -1;
            }
            {
                node_record_t *n = &s->nodes[s->node_count++];
                n->node_id     = read_u16_le(buf + pos); pos += 2;
                n->address     = read_u32_le(buf + pos); pos += 4;
                n->salted_hash = read_u32_le(buf + pos); pos += 4;
            }
            break;

        case OP_LINK_FLOW:
            /* Topology only — not needed at runtime, skip 4 bytes */
            if (pos + 4 > len) goto trunc;
            pos += 4;
            break;

        case OP_CFG_PPM:
            if (pos + 9 > len) goto trunc;
            if (s->sector_count < RIVER_MAX_SECTORS) {
                sector_record_t *sec = &s->sectors[s->sector_count++];
                sec->sector_id    = buf[pos];              pos += 1;
                sec->cluster_mask = read_u64_le(buf + pos); pos += 8;
            } else {
                pos += 9;
            }
            break;

        case OP_INIT_RES:
            if (pos + 3 > len) goto trunc;
            s->reservoir.arity = read_u16_le(buf + pos); pos += 2;
            s->reservoir.flags = buf[pos++];
            s->has_reservoir   = 1;
            break;

        case OP_SET_CONSTRAINT:
            /* DRC only — skip 6 bytes at runtime */
            if (pos + 6 > len) goto trunc;
            pos += 6;
            break;

        default:
            river_set_error(s, "Unknown opcode 0x%02X at byte %u", op, pos - 1);
            return -1;
        }
    }
    return 0;

trunc:
    river_set_error(s, "Manifest truncated at byte %u (declared length %u)", pos, len);
    return -1;
}

/* ── river_load ────────────────────────────────────────────────────────────── */

river_t river_load(const char *rvr_path) {
    if (!rvr_path) return NULL;

    FILE *f = fopen(rvr_path, "rb");
    if (!f) return NULL;

    fseek(f, 0, SEEK_END);
    long file_size = ftell(f);
    rewind(f);

    if (file_size < (long)RVR_HEADER_SIZE) { fclose(f); return NULL; }

    uint8_t *buf = (uint8_t *)malloc((size_t)file_size);
    if (!buf) { fclose(f); return NULL; }

    if ((long)fread(buf, 1, (size_t)file_size, f) != file_size) {
        free(buf); fclose(f); return NULL;
    }
    fclose(f);

    /* Parse and validate header */
    rvr_header_t hdr;
    hdr.magic           = read_u32_le(buf +  0);
    hdr.epoch_id        = read_u32_le(buf +  4);
    hdr.node_count      = read_u32_le(buf +  8);
    hdr.sector_map      = read_u64_le(buf + 12);
    hdr.manifest_length = read_u32_le(buf + 20);

    if (hdr.magic != RVR_MAGIC) { free(buf); return NULL; }
    if ((uint32_t)file_size != RVR_HEADER_SIZE + hdr.manifest_length) {
        free(buf); return NULL;
    }

    river_state_t *s = river_state_alloc();
    if (!s) { free(buf); return NULL; }

    s->header   = hdr;
    s->sim_mode = 1;

    uint32_t set_epoch = 0;
    int has_set_epoch = 0;
    if (parse_instructions(s, buf + RVR_HEADER_SIZE, hdr.manifest_length, &set_epoch, &has_set_epoch) != 0) {
        free(buf); river_state_free(s); return NULL;
    }
    free(buf);

    if (has_set_epoch && set_epoch != hdr.epoch_id) {
        river_set_error(s, "Manifest epoch mismatch: header=0x%08X, set_epoch=0x%08X",
                        hdr.epoch_id, set_epoch);
        river_state_free(s);
        return NULL;
    }

    /* Assign initial TAG_GEN colour from palette */
    s->active_tag = tag_palette_alloc(&s->tag_palette);
    if (!s->active_tag) {
        river_set_error(s, "TAG_GEN palette exhausted on load");
        river_state_free(s); return NULL;
    }

    return s;
}

/* ── river_identify_node ───────────────────────────────────────────────────── */

int river_identify_node(river_t r, uint32_t pain_hash) {
    if (!r || r->enclave.wiped) return -1;

    uint32_t salt = r->enclave.session_salt;
    uint32_t i;

    for (i = 0; i < r->node_count; i++) {
        /* Same mixing function as geologist-backend spatial_mapper.rs */
        uint32_t h = salt ^ r->nodes[i].address ^ i;
        h ^= h >> 16;
        h *= 0x45D9F3B7u;
        h ^= h >> 16;
        h *= 0x45D9F3B7u;
        h ^= h >> 16;
        if (h == 0) h = 1u;
        if (h == pain_hash) return (int)i;
    }
    return -1;
}

/* ── river_quarantine_cluster ──────────────────────────────────────────────── */

void river_quarantine_cluster(river_t r, int node_idx) {
    if (!r || node_idx < 0) return;
    if (r->quarantine.count >= (int)RIVER_MAX_QUARANTINE) return;

    int slot = r->quarantine.count++;
    r->quarantine.node_indices[slot] = node_idx;
    r->quarantine.until_ms[slot]     = river_now_ms() + 1000u;

    /* Mark the containing cluster dirty in all sector PPM maps */
    uint32_t cluster = (uint32_t)node_idx / 16u;
    if (cluster < 64u) {
        uint32_t sec;
        for (sec = 0; sec < r->sector_count; sec++) {
            r->sectors[sec].cluster_mask &= ~(1ull << cluster);
        }
    }
}
