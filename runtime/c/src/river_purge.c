/**
 * RIVER-LANG — runtime/c/src/river_purge.c
 *
 * river_purge()   — Flash Flood Purge (TAG_GEN = 0xFFFF)
 * river_respawn() — Purge + re-salt + re-spawn on new path
 */

#include <string.h>
#include "river_runtime.h"

/* ── river_purge ───────────────────────────────────────────────────────────── */

void river_purge(river_t r) {
    if (!r || r->enclave.wiped) return;

    /*
     * Hardware: inject a token with TAG_GEN = 0xFFFF (RIVER_TAG_PURGE)
     * on the current river path. All NodeWires that receive it reset
     * their TAG-Lock Latches and propagate a PURGE_ALL Cry upstream.
     * We block until the Cry reaches the Token_Gen node.
     *
     * Simulation: reset all wire latches via the simulator state and
     * return TAG_GEN colour to the palette.
     */
    if (r->active_tag != 0) {
        tag_palette_free(&r->tag_palette, r->active_tag);
        r->active_tag = 0;
    }

    /* Reset last status — purge is a clean slate */
    r->last_status = RIVER_OK;
    r->cry_code    = 0;
    r->pain_hash   = 0;
    r->last_error[0] = '\0';

    /* Simulation: mark purge completed immediately */
    /* Hardware: would block on IRQ_PURGE_COMPLETED from the Reservoir */
}

/* ── river_respawn ─────────────────────────────────────────────────────────── */

river_status_t river_respawn(river_t r, token_t input, int attempts) {
    if (!r)        return RIVER_ERR_NULL_HANDLE;
    if (!attempts) attempts = 3;

    int i;
    for (i = 0; i < attempts; i++) {
        /* 1. Purge the current river path */
        river_purge(r);

        /* 2. Allocate a new TAG_GEN colour */
        r->active_tag = tag_palette_alloc(&r->tag_palette);
        if (!r->active_tag) {
            river_set_error(r, "TAG_GEN palette exhausted on respawn attempt %d", i + 1);
            return RIVER_ERR_FATAL;
        }

        /*
         * 3. Rotate the session salt.
         * Hardware: the Enclave generates a new 32-bit primitive using
         * BLAKE3-Lite seeded from the current salt XOR hardware_nonce.
         * Simulation: increment the salt by a prime step.
         */
        r->enclave.session_salt ^= 0x9E3779B9u; /* golden ratio step */
        r->enclave.session_salt  = r->enclave.session_salt * 0x6C62272Eu + 1u;

        /* 4. Spawn on the new salt */
        river_status_t status = river_spawn(r, input);
        if (status == RIVER_OK) return RIVER_OK;

        /*
         * 5. On chronic infection: quarantine before next attempt
         */
        if (status == RIVER_ERR_CHRONIC && r->pain_hash != 0) {
            int node_idx = river_identify_node(r, r->pain_hash);
            if (node_idx >= 0) {
                river_quarantine_cluster(r, node_idx);
            }
        }

        river_set_error(r, "Respawn attempt %d/%d failed (status=0x%02X)",
                        i + 1, attempts, status);
    }

    river_set_error(r, "All %d respawn attempts exhausted", attempts);
    return RIVER_ERR_FATAL;
}
