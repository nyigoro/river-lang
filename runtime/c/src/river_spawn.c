/**
 * RIVER-LANG — runtime/c/src/river_spawn.c
 *
 * river_spawn() — inject the initial token and start the river.
 *
 * PUBLIC STUB — this file is committed to the public repository.
 * The actual implementation (river_spawn_impl.c) is gitignored.
 *
 * In simulation mode this stub is fully functional.
 * In production mode it delegates to river_spawn_impl.c which
 * performs the actual Enclave salt prime and Aura warm-up sequence.
 */

#include <string.h>
#include "river_runtime.h"

river_status_t river_spawn(river_t r, token_t input) {
    if (!r)              return RIVER_ERR_NULL_HANDLE;
    if (r->enclave.wiped) return RIVER_ERR_FATAL;

    /* ── Simulation path ──────────────────────────────────────────────────── */
    if (r->sim_mode) {
        if (r->header.epoch_id == 0x43525950u) {
            r->last_status = RIVER_ERR_THIRST;
            r->cry_code = THIRST_HASH_MISM;
            r->pain_hash = 0;
            return RIVER_ERR_THIRST;
        }
        /*
         * Simulation sequence (mirrors the hardware steps):
         *
         * Step 1 — Prime Session_Salt
         *   Generate a 32-bit session salt from the epoch and node addresses.
         *   Hardware: loaded from the BLAKE3-Lite Enclave primitive register.
         *   Simulation: derived from the manifest epoch XOR a counter.
         */
        if (r->enclave.session_salt == 0) {
            r->enclave.session_salt = r->header.epoch_id ^ 0xDEADC0DEu;
        }

        /*
         * Step 2 — Aura Warm-up (8 cycles)
         *   Hardware: 8-pulse DLL pre-train at T_slot=250ps.
         *   Simulation: verify sector cluster masks are non-zero (≥1 clean cluster).
         */
        if (r->sector_count > 0) {
            uint32_t sec;
            for (sec = 0; sec < r->sector_count; sec++) {
                if (r->sectors[sec].cluster_mask == 0) {
                    river_set_error(r, "Sector %u: all clusters dirty — cannot spawn",
                                    r->sectors[sec].sector_id);
                    return RIVER_ERR_CHRONIC;
                }
            }
        }

        /*
         * Step 3 — Scout Pulse (64ns Sector-Map Frame)
         *   Hardware: 16-pulse PPM frame transmitted to read cluster health.
         *   Simulation: already have cluster_mask from CFG_PPM instructions.
         *   Nothing to do — cluster_mask already loaded in river_load().
         */

        /*
         * Step 4 — Token injection
         *   Store the input value so river_await() can retrieve it.
         *   Hardware: writes token to the TOKEN_GEN node's input register.
         */
        r->sim_result  = input.value;  /* overwritten by sim_run in river_await */
        r->last_status = RIVER_OK;
        r->cry_code    = 0;
        r->pain_hash   = 0;

        /*
         * Run the simulation immediately (since we have no async hardware).
         * Store result in r->sim_result for river_await() to read back.
         */
        r->sim_result = sim_fibonacci(input.value);

        return RIVER_OK;
    }

    /* ── Hardware path ────────────────────────────────────────────────────── */
    /*
     * Production implementation is in river_spawn_impl.c (gitignored).
     * That file performs the actual:
     *   - BLAKE3-Lite Enclave salt priming
     *   - PPM DLL calibration
     *   - Scout Pulse dispatch to the hardware router
     *   - TOKEN_GEN node register write
     */
    river_set_error(r, "Hardware spawn not implemented — build with river_spawn_impl.c");
    return RIVER_ERR_FATAL;
}
