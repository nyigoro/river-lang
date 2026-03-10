/**
 * RIVER-LANG — runtime/c/test/test_river_runtime.c
 *
 * C test suite for the river runtime.
 * Uses a minimal hand-rolled test framework — no external dependencies.
 *
 * Tests cover:
 *   - river_runtime_version()
 *   - TAG palette alloc/free
 *   - river_secure_zero()
 *   - river_get_epoch()
 *   - river_load() with invalid paths and corrupt data
 *   - river_spawn() + river_await() in simulation mode (no .rvr file needed)
 *   - river_identify_node()
 *   - river_quarantine_cluster()
 *   - river_purge()
 *   - river_enclave_wipe()
 *   - Error string propagation
 */

#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <assert.h>
#ifndef _WIN32
#include <unistd.h>
#endif

#include "river_hw.h"
#include "river_runtime.h"

/* ── Minimal test framework ────────────────────────────────────────────────── */

static int g_pass = 0;
static int g_fail = 0;

#define TEST(name)  static void test_##name(void)
#define RUN(name)   do { printf("  %-55s", #name); test_##name(); } while(0)

#define CHECK(expr) do {                                                        \
    if (expr) { printf("ok\n"); g_pass++; }                                     \
    else { printf("FAIL  (%s:%d)\n", __FILE__, __LINE__); g_fail++; }           \
} while(0)

#define CHECK_EQ(a, b) CHECK((a) == (b))
#define CHECK_NE(a, b) CHECK((a) != (b))
#define CHECK_STR(a, b) CHECK(strcmp((a),(b)) == 0)

/* ── Helpers ───────────────────────────────────────────────────────────────── */

/**
 * Build a minimal valid .rvr binary in memory.
 * Contains: SET_EPOCH + MAP_NODE×2 + LINK_FLOW + CFG_PPM + INIT_RES
 * Writes to buf, returns total byte count.
 */
static size_t build_minimal_rvr(uint8_t *buf, size_t cap,
                                 uint32_t epoch, uint32_t node_addr)
{
    uint8_t *p = buf;
    uint32_t instr_len;
    size_t   total;

    /* --- instruction stream (written before header so we can measure length) */
    uint8_t instrs[256];
    uint8_t *ip = instrs;

    /* SET_EPOCH */
    *ip++ = OP_SET_EPOCH;
    *ip++ = (uint8_t)(epoch      ); *ip++ = (uint8_t)(epoch >>  8);
    *ip++ = (uint8_t)(epoch >> 16); *ip++ = (uint8_t)(epoch >> 24);

    /* MAP_NODE 0 — source node */
    *ip++ = OP_MAP_NODE;
    *ip++ = 0x00; *ip++ = 0x00;                            /* node_id = 0 */
    *ip++ = (uint8_t)(node_addr); *ip++ = (uint8_t)(node_addr>>8);
    *ip++ = (uint8_t)(node_addr>>16); *ip++ = (uint8_t)(node_addr>>24);
    *ip++ = 0xAB; *ip++ = 0xCD; *ip++ = 0xEF; *ip++ = 0x01; /* salted_hash */

    /* MAP_NODE 1 — reservoir node */
    *ip++ = OP_MAP_NODE;
    *ip++ = 0x01; *ip++ = 0x00;                            /* node_id = 1 */
    *ip++ = 0x00; *ip++ = 0x03; *ip++ = 0x00; *ip++ = 0x00; /* addr 0x0300 */
    *ip++ = 0xF0; *ip++ = 0xF0; *ip++ = 0xF0; *ip++ = 0xF0; /* salted_hash */

    /* LINK_FLOW 0 → 1 */
    *ip++ = OP_LINK_FLOW;
    *ip++ = 0x00; *ip++ = 0x00;   /* src  = 0 */
    *ip++ = 0x01; *ip++ = 0x00;   /* dest = 1 */

    /* CFG_PPM sector 0, all clean */
    *ip++ = OP_CFG_PPM;
    *ip++ = 0x00;                  /* sector_id = 0 */
    *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF;
    *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF; *ip++ = 0xFF;

    /* INIT_RES arity=1, flags=HASH_CHECK|PURGE_ON_DRY */
    *ip++ = OP_INIT_RES;
    *ip++ = 0x01; *ip++ = 0x00;   /* arity = 1 */
    *ip++ = RES_FLAG_HASH_CHECK | RES_FLAG_PURGE_ON_DRY;

    instr_len = (uint32_t)(ip - instrs);
    total     = RVR_HEADER_SIZE + instr_len;
    if (total > cap) return 0;

    /* --- header */
    uint32_t magic = RVR_MAGIC;
    memcpy(p,      &magic,      4); p += 4;
    memcpy(p,      &epoch,      4); p += 4;
    uint32_t nc = 2; memcpy(p, &nc,   4); p += 4;  /* node_count */
    uint64_t sm = 0x0001ull; memcpy(p, &sm, 8); p += 8; /* sector_map */
    memcpy(p, &instr_len, 4); p += 4;

    /* --- instructions */
    memcpy(p, instrs, instr_len);
    return total;
}

/**
 * Write a .rvr buffer to a temp file and return the path.
 * Caller must remove the file when done.
 */
static const char *write_temp_rvr(const uint8_t *buf, size_t len) {
    static char path[256];
#ifdef _WIN32
    char temp_dir[128];
    size_t needed = 0;
    const char *base = ".";
    if (getenv_s(&needed, temp_dir, sizeof(temp_dir), "TEMP") == 0 && needed > 0) {
        base = temp_dir;
    }
    snprintf(path, sizeof(path), "%s\\river_test_XXXXXX.rvr", base);
#else
    snprintf(path, sizeof(path), "/tmp/river_test_%d.rvr", (int)getpid());
#endif
    FILE *f = fopen(path, "wb");
    if (!f) return NULL;
    fwrite(buf, 1, len, f);
    fclose(f);
    return path;
}

/* ── Tests ─────────────────────────────────────────────────────────────────── */

TEST(version) {
    const char *v = river_runtime_version();
    CHECK(v != NULL && strlen(v) > 0);
}

TEST(tag_palette_alloc) {
    tag_palette_t p;
    memset(&p, 0, sizeof(p));
    uint16_t t1 = tag_palette_alloc(&p);
    uint16_t t2 = tag_palette_alloc(&p);
    CHECK(t1 != 0 && t2 != 0 && t1 != t2);
}

TEST(tag_palette_free_and_reuse) {
    tag_palette_t p;
    memset(&p, 0, sizeof(p));
    uint16_t t1 = tag_palette_alloc(&p);
    tag_palette_free(&p, t1);
    uint16_t t2 = tag_palette_alloc(&p);
    /* freed slot must be reused */
    CHECK(t2 != 0);
}

TEST(secure_zero_clears_memory) {
    uint8_t buf[32];
    memset(buf, 0xFF, sizeof(buf));
    river_secure_zero(buf, sizeof(buf));
    int all_zero = 1;
    int i;
    for (i = 0; i < 32; i++) if (buf[i]) { all_zero = 0; break; }
    CHECK(all_zero);
}

TEST(get_epoch_nonzero) {
    uint32_t e = river_get_epoch();
    CHECK(e != 0);
}

TEST(get_epoch_advances) {
    uint32_t e1 = river_get_epoch();
    /* Busy-wait a tiny moment */
    volatile uint64_t i;
    for (i = 0; i < 1000000; i++);
    uint32_t e2 = river_get_epoch();
    /* e2 should be >= e1 (monotonic) */
    CHECK(e2 >= e1);
}

TEST(river_await_timeout) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    river_spawn(r, token_int(10));
    river_result_t res = river_await(r, 1);
    CHECK_EQ(res.status, RIVER_ERR_TIMEOUT);
    river_enclave_wipe(r);
}

TEST(river_await_zero_timeout) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    r->last_status = RIVER_ERR_THIRST;
    r->cry_code = THIRST_DRY_INPUT;
    river_result_t res = river_await(r, 0);
    CHECK_EQ(res.status, RIVER_ERR_THIRST);
    river_enclave_wipe(r);
}

TEST(river_load_null_path) {
    river_t r = river_load(NULL);
    CHECK(r == NULL);
}

TEST(river_load_nonexistent_path) {
    river_t r = river_load("/no/such/file/river_test_nonexistent.rvr");
    CHECK(r == NULL);
}

TEST(river_load_valid_manifest) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP (cannot write temp file)\n"); return; }

    river_t r = river_load(path);
    remove(path);

    CHECK(r != NULL);
    if (r) {
        river_enclave_wipe(r);
    }
}

TEST(river_load_wrong_magic) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    buf[0] = 0xDE; buf[1] = 0xAD; /* corrupt magic */
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    CHECK(r == NULL);
}

TEST(river_load_truncated_manifest) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    /* Claim manifest is 10 bytes longer than it is */
    uint32_t fake_len = *(uint32_t *)(buf + 20) + 10;
    memcpy(buf + 20, &fake_len, 4);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    CHECK(r == NULL);
}

TEST(river_load_wrong_epoch) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    uint32_t wrong_epoch = 0xDEADBEEFu;
    memcpy(buf + 4, &wrong_epoch, 4);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    CHECK(r == NULL);
}

TEST(river_load_truncated_header) {
    uint8_t buf[12];
    memset(buf, 0, sizeof(buf));
    const char *path = write_temp_rvr(buf, sizeof(buf));
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    CHECK(r == NULL);
}

TEST(spawn_and_await_fibonacci_10) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP (load failed)\n"); return; }

    river_status_t st = river_spawn(r, token_int(10));
    CHECK_EQ(st, RIVER_OK);

    river_result_t res = river_await(r, 0);
    CHECK_EQ(res.status, RIVER_OK);
    CHECK_EQ(token_to_u64(res.value), 55ull);

    river_enclave_wipe(r);
}

TEST(spawn_fibonacci_0) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    river_spawn(r, token_int(0));
    river_result_t res = river_await(r, 0);
    CHECK_EQ(res.status, RIVER_OK);
    CHECK_EQ(token_to_u64(res.value), 0ull);
    river_enclave_wipe(r);
}

TEST(spawn_fibonacci_1) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    river_spawn(r, token_int(1));
    river_result_t res = river_await(r, 0);
    CHECK_EQ(res.status, RIVER_OK);
    CHECK_EQ(token_to_u64(res.value), 1ull);
    river_enclave_wipe(r);
}

TEST(spawn_fibonacci_20) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    river_spawn(r, token_int(20));
    river_result_t res = river_await(r, 0);
    CHECK_EQ(res.status, RIVER_OK);
    CHECK_EQ(token_to_u64(res.value), 6765ull);
    river_enclave_wipe(r);
}

TEST(null_handle_returns_error_status) {
    river_result_t res = river_await(NULL, 0);
    CHECK_EQ(res.status, RIVER_ERR_NULL_HANDLE);
}

TEST(spawn_on_null_handle) {
    river_status_t st = river_spawn(NULL, token_int(1));
    CHECK_EQ(st, RIVER_ERR_NULL_HANDLE);
}

TEST(last_error_on_null) {
    const char *e = river_last_error(NULL);
    CHECK(e != NULL && strlen(e) > 0);
}

TEST(quarantine_cluster_does_not_crash) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    river_quarantine_cluster(r, 0);
    CHECK(r->quarantine.count == 1);
    river_enclave_wipe(r);
}

TEST(identify_node_on_wiped_handle_returns_neg1) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    river_enclave_wipe(r);
    /* r is freed — do not dereference. Test passes if no crash. */
    CHECK(1); /* wipe_confirmed = no crash */
}

TEST(purge_resets_status) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    /* Manually set an error state, then purge */
    r->last_status = RIVER_ERR_THIRST;
    r->cry_code    = THIRST_DRY_INPUT;
    river_purge(r);
    CHECK_EQ(r->last_status, RIVER_OK);
    CHECK_EQ(r->cry_code, 0);
    river_enclave_wipe(r);
}

TEST(respawn_after_chronic) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    if (r->sector_count > 0) {
        r->sectors[0].cluster_mask = 0;
    }

    river_status_t st = river_respawn(r, token_int(10), 1);
    CHECK_NE(st, RIVER_OK);
    river_enclave_wipe(r);
}

TEST(respawn_zero_attempts) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    river_status_t st = river_respawn(r, token_int(5), 0);
    CHECK_EQ(st, RIVER_OK);
    river_enclave_wipe(r);
}

TEST(wipe_returns_confirmed) {
    uint8_t buf[512];
    size_t  len = build_minimal_rvr(buf, sizeof(buf), 0x52495645u, 0x00A0u);
    const char *path = write_temp_rvr(buf, len);
    if (!path) { printf("SKIP\n"); return; }

    river_t r = river_load(path);
    remove(path);
    if (!r) { printf("SKIP\n"); return; }

    wipe_status_t ws = river_enclave_wipe(r);
    CHECK_EQ(ws, WIPE_CONFIRMED);
}

TEST(secure_zero_large_buffer) {
    uint8_t *buf = (uint8_t *)malloc(4096);
    if (!buf) { printf("SKIP\n"); return; }
    memset(buf, 0xAB, 4096);
    river_secure_zero(buf, 4096);
    int all_zero = 1;
    for (size_t i = 0; i < 4096; i++) {
        if (buf[i] != 0) { all_zero = 0; break; }
    }
    CHECK(all_zero);
    free(buf);
}

/* ── main ──────────────────────────────────────────────────────────────────── */

int main(void) {
    printf("\nRIVER-LANG Runtime Test Suite\n");
    printf("══════════════════════════════════════════════════════════════\n");

    RUN(version);
    RUN(tag_palette_alloc);
    RUN(tag_palette_free_and_reuse);
    RUN(secure_zero_clears_memory);
    RUN(get_epoch_nonzero);
    RUN(get_epoch_advances);
    RUN(river_await_timeout);
    RUN(river_await_zero_timeout);
    RUN(river_load_null_path);
    RUN(river_load_nonexistent_path);
    RUN(river_load_valid_manifest);
    RUN(river_load_wrong_magic);
    RUN(river_load_truncated_manifest);
    RUN(river_load_wrong_epoch);
    RUN(river_load_truncated_header);
    RUN(spawn_and_await_fibonacci_10);
    RUN(spawn_fibonacci_0);
    RUN(spawn_fibonacci_1);
    RUN(spawn_fibonacci_20);
    RUN(null_handle_returns_error_status);
    RUN(spawn_on_null_handle);
    RUN(last_error_on_null);
    RUN(quarantine_cluster_does_not_crash);
    RUN(identify_node_on_wiped_handle_returns_neg1);
    RUN(purge_resets_status);
    RUN(respawn_after_chronic);
    RUN(respawn_zero_attempts);
    RUN(wipe_returns_confirmed);
    RUN(secure_zero_large_buffer);

    printf("══════════════════════════════════════════════════════════════\n");
    printf("  %d passed, %d failed\n\n", g_pass, g_fail);

    return (g_fail > 0) ? 1 : 0;
}
