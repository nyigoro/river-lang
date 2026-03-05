/**
 * RIVER-LANG — examples/fibonacci/main.c
 *
 * Canonical C-Orchestrator: compute Fibonacci(10) = 55 using the RIVER-LANG
 * hardware router, demonstrating the full lifecycle:
 *
 *   river_load()          — load compiled .rvr manifest
 *   river_spawn()         — inject N=10 token into the river
 *   river_await()         — block until Reservoir fires
 *   river_enclave_wipe()  — unconditional staggered annihilation
 *
 * Build:
 *   cmake -B build && cmake --build build
 *   ./build/fibonacci_example fibonacci.rvr
 *
 * If no .rvr path is given, the program generates a synthetic in-memory
 * manifest and uses simulation mode automatically.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "river_hw.h"
#include "river_runtime.h"

/* ── Synthetic manifest builder (for demo without a real .rvr file) ────────── */

static size_t build_demo_rvr(uint8_t *buf, size_t cap) {
    uint32_t epoch = 0x52495645u;
    uint8_t instrs[256];
    uint8_t *ip = instrs;

    /* SET_EPOCH */
    *ip++ = OP_SET_EPOCH;
    *ip++ = 0x45; *ip++ = 0x56; *ip++ = 0x49; *ip++ = 0x52;

    /* MAP_NODE 0 — Seed_Gen @ 0x00A0 */
    *ip++ = OP_MAP_NODE;
    *ip++ = 0x00; *ip++ = 0x00;
    *ip++ = 0xA0; *ip++ = 0x00; *ip++ = 0x00; *ip++ = 0x00;
    *ip++ = 0xAA; *ip++ = 0xBB; *ip++ = 0xCC; *ip++ = 0xDD;

    /* MAP_NODE 1 — Feedback_Merge @ 0x00B4 */
    *ip++ = OP_MAP_NODE;
    *ip++ = 0x01; *ip++ = 0x00;
    *ip++ = 0xB4; *ip++ = 0x00; *ip++ = 0x00; *ip++ = 0x00;
    *ip++ = 0x11; *ip++ = 0x22; *ip++ = 0x33; *ip++ = 0x44;

    /* MAP_NODE 2 — Fibonacci_Adder @ 0x00C8 */
    *ip++ = OP_MAP_NODE;
    *ip++ = 0x02; *ip++ = 0x00;
    *ip++ = 0xC8; *ip++ = 0x00; *ip++ = 0x00; *ip++ = 0x00;
    *ip++ = 0x55; *ip++ = 0x66; *ip++ = 0x77; *ip++ = 0x88;

    /* MAP_NODE 3 — Counter_Sub @ 0x00D2 */
    *ip++ = OP_MAP_NODE;
    *ip++ = 0x03; *ip++ = 0x00;
    *ip++ = 0xD2; *ip++ = 0x00; *ip++ = 0x00; *ip++ = 0x00;
    *ip++ = 0x99; *ip++ = 0xAA; *ip++ = 0xBB; *ip++ = 0xCC;

    /* MAP_NODE 4 — Exit_Gate @ 0x0210 */
    *ip++ = OP_MAP_NODE;
    *ip++ = 0x04; *ip++ = 0x00;
    *ip++ = 0x10; *ip++ = 0x02; *ip++ = 0x00; *ip++ = 0x00;
    *ip++ = 0xDD; *ip++ = 0xEE; *ip++ = 0xFF; *ip++ = 0x00;

    /* MAP_NODE 5 — Final_Output @ 0x0300 */
    *ip++ = OP_MAP_NODE;
    *ip++ = 0x05; *ip++ = 0x00;
    *ip++ = 0x00; *ip++ = 0x03; *ip++ = 0x00; *ip++ = 0x00;
    *ip++ = 0xF0; *ip++ = 0xF0; *ip++ = 0xF0; *ip++ = 0xF0;

    /* LINK_FLOW — 7 downstream flows */
    uint8_t flows[7][4] = {
        {0x00,0x00, 0x01,0x00},   /* Seed → Merge        */
        {0x01,0x00, 0x02,0x00},   /* Merge → Adder       */
        {0x00,0x00, 0x03,0x00},   /* Seed → Counter      */
        {0x02,0x00, 0x04,0x00},   /* Adder → Gate        */
        {0x03,0x00, 0x04,0x00},   /* Counter → Gate      */
        {0x04,0x40, 0x01,0x00},   /* Gate.TRUE → Merge   */
        {0x04,0x20, 0x05,0x00},   /* Gate.FALSE → Output */
    };
    int fi;
    for (fi = 0; fi < 7; fi++) {
        *ip++ = OP_LINK_FLOW;
        *ip++ = flows[fi][0]; *ip++ = flows[fi][1];
        *ip++ = flows[fi][2]; *ip++ = flows[fi][3];
    }

    /* LINK_FLOW — 2 upstream nerves */
    *ip++ = OP_LINK_FLOW; *ip++ = 0x02; *ip++ = 0x80; *ip++ = 0x01; *ip++ = 0x00;
    *ip++ = OP_LINK_FLOW; *ip++ = 0x01; *ip++ = 0x80; *ip++ = 0x00; *ip++ = 0x00;

    /* CFG_PPM — sector Alpha */
    *ip++ = OP_CFG_PPM; *ip++ = 0x00;
    *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF;
    *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF;

    /* CFG_PPM — sector Beta */
    *ip++ = OP_CFG_PPM; *ip++ = 0x01;
    *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF;
    *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF;

    /* SET_CONSTRAINT ×2 */
    *ip++ = OP_SET_CONSTRAINT;
    *ip++ = 0x02; *ip++ = 0x00;    /* node_a = 2 (Fibonacci_Adder) */
    *ip++ = 0x01; *ip++ = 0x00;    /* node_b = 1 (Feedback_Merge)  */
    *ip++ = 0xDC; *ip++ = 0x05;    /* 1500 µm = 0x05DC             */

    *ip++ = OP_SET_CONSTRAINT;
    *ip++ = 0x01; *ip++ = 0x00;
    *ip++ = 0x00; *ip++ = 0x00;
    *ip++ = 0xDC; *ip++ = 0x05;

    /* INIT_RES */
    *ip++ = OP_INIT_RES;
    *ip++ = 0x01; *ip++ = 0x00;
    *ip++ = RES_FLAG_HASH_CHECK | RES_FLAG_PURGE_ON_DRY;

    uint32_t instr_len = (uint32_t)(ip - instrs);
    size_t   total     = RVR_HEADER_SIZE + instr_len;
    if (total > cap) return 0;

    uint8_t *p = buf;
    uint32_t magic = 0x52495645u;
    memcpy(p, &magic, 4); p += 4;                               /* magic  */
    memcpy(p, &epoch, 4); p += 4;                               /* epoch  */
    uint32_t nc = 6; memcpy(p, &nc, 4); p += 4;                 /* nodes  */
    uint64_t sm = 0x0003ull; memcpy(p, &sm, 8); p += 8;         /* sectors */
    memcpy(p, &instr_len, 4); p += 4;                           /* len    */
    memcpy(p, instrs, instr_len);
    return total;
}

/* ── Entry point ───────────────────────────────────────────────────────────── */

int main(int argc, char **argv) {
    const uint64_t N       = 10;
    const uint64_t EXPECTED = 55;

    printf("RIVER-LANG Fibonacci Orchestrator\n");
    printf("══════════════════════════════════\n");
    printf("Computing Fibonacci(%llu)...\n\n", (unsigned long long)N);

    /* ── Load manifest ──────────────────────────────────────────────────── */

    river_t r = NULL;
    const char *tmp_path = NULL;

    if (argc > 1) {
        /* Load from provided .rvr path */
        printf("Loading manifest: %s\n", argv[1]);
        r = river_load(argv[1]);
    }

    if (!r) {
        /* Generate synthetic demo manifest */
        uint8_t buf[1024];
        size_t  len = build_demo_rvr(buf, sizeof(buf));
        if (!len) {
            fprintf(stderr, "Failed to build demo manifest\n");
            return 1;
        }

#ifdef _WIN32
        static char path[256];
        snprintf(path, sizeof(path), "%s\\river_demo.rvr",
                 getenv("TEMP") ? getenv("TEMP") : ".");
        tmp_path = path;
#else
        tmp_path = "/tmp/river_demo.rvr";
#endif
        FILE *f = fopen(tmp_path, "wb");
        if (!f) { fprintf(stderr, "Cannot write demo manifest\n"); return 1; }
        fwrite(buf, 1, len, f);
        fclose(f);

        printf("Loading synthetic demo manifest (%zu bytes)\n", len);
        r = river_load(tmp_path);
    }

    if (!r) {
        fprintf(stderr, "river_load() failed\n");
        return 1;
    }

    printf("  Nodes:     %u\n", r->node_count);
    printf("  Sectors:   %u\n", r->sector_count);
    printf("  Reservoir: %s\n", r->has_reservoir ? "yes" : "no");
    printf("  Epoch:     0x%08X\n\n", r->header.epoch_id);

    /* ── Epoch check ────────────────────────────────────────────────────── */

    uint32_t hw_epoch = river_get_epoch();
    printf("Hardware epoch: 0x%08X\n", hw_epoch);

    /* ── Spawn ──────────────────────────────────────────────────────────── */

    printf("Spawning river with N=%llu...\n", (unsigned long long)N);
    river_status_t spawn_st = river_spawn(r, token_int(N));

    if (spawn_st != RIVER_OK) {
        fprintf(stderr, "river_spawn() failed: %s\n", river_last_error(r));
        river_enclave_wipe(r);
        if (tmp_path) remove(tmp_path);
        return 1;
    }
    printf("  Spawn:  ok\n");

    /* ── Await ──────────────────────────────────────────────────────────── */

    printf("Awaiting result (timeout: 1s)...\n");
    river_result_t result = river_await(r, 1000000000ull /* 1s */);

    /* ── Wipe — unconditional ───────────────────────────────────────────── */

    wipe_status_t wipe_st = river_enclave_wipe(r);
    /* r is freed — do not use after this point */

    if (tmp_path) remove(tmp_path);

    /* ── Report ─────────────────────────────────────────────────────────── */

    printf("\n══════════════════════════════════\n");
    printf("Wipe:   %s\n", wipe_st == WIPE_CONFIRMED ? "CONFIRMED" : "PARTIAL");

    if (result.status == RIVER_OK) {
        uint64_t value = token_to_u64(result.value);
        printf("Result: Fibonacci(%llu) = %llu\n",
               (unsigned long long)N, (unsigned long long)value);

        if (value == EXPECTED) {
            printf("Status: PASS ✓\n\n");
            return 0;
        } else {
            printf("Status: FAIL — expected %llu, got %llu\n\n",
                   (unsigned long long)EXPECTED, (unsigned long long)value);
            return 1;
        }
    } else {
        printf("Result: ERROR (status=0x%02X, cry_code=0x%02X)\n",
               result.status, result.cry_code);
        printf("Status: FAIL\n\n");
        return 1;
    }
}

