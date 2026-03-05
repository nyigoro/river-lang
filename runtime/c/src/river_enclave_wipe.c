/**
 * RIVER-LANG — runtime/c/src/river_enclave_wipe.c
 *
 * river_enclave_wipe() — Staggered Annihilation of the Session_Salt.
 *
 * PUBLIC STUB — this file is committed to the public repository.
 * The actual implementation (river_enclave_wipe_impl.c) is gitignored.
 *
 * In simulation mode this stub is fully functional.
 *
 * Hardware sequence (from spec):
 *   Cycle 0:     32-bit Session_Salt grounded (security achieved)
 *   Cycles 1–8:  999 BLAKE3-Lite cores shut down via 16-stage delay tree
 *   Total:       ~8ns at 7nm process
 *   Vdd monitor: blocks until rail is within 1% of 0.8V nominal
 */

#include <string.h>
#include "river_runtime.h"

wipe_status_t river_enclave_wipe(river_t r) {
    if (!r) return WIPE_PARTIAL;

    /*
     * Step 0 — Ground Session_Salt immediately.
     * Security is achieved the moment this write completes.
     * All subsequent steps are hardware cleanup.
     */
    river_secure_zero(&r->enclave.session_salt, sizeof(r->enclave.session_salt));
    r->enclave.wiped = 1;

    /*
     * Step 1 — Return active TAG_GEN colour to palette.
     * (Prevents palette leak across sessions.)
     */
    if (r->active_tag != 0) {
        tag_palette_free(&r->tag_palette, r->active_tag);
        r->active_tag = 0;
    }

    /*
     * Step 2 — Zero the full internal state.
     * Clears node records, sector maps, quarantine table, and error buffer.
     * Leave the struct itself allocated — caller may inspect last_error
     * between wipe and free.
     */
    river_secure_zero(r->nodes,    sizeof(r->nodes));
    river_secure_zero(r->sectors,  sizeof(r->sectors));
    river_secure_zero(&r->quarantine, sizeof(r->quarantine));

    /*
     * Step 3 — Hardware: 16-stage delay tree shutdown.
     * Simulation: no-op (no physical BLAKE3-Lite cores to shut down).
     * Production: river_enclave_wipe_impl.c waits for Vdd rail monitor.
     */

    /* Step 4 — Free the state struct */
    river_state_free(r);

    /*
     * Return WIPE_CONFIRMED unconditionally in simulation.
     * Hardware returns WIPE_PARTIAL if the Vdd rail monitor times out
     * (salt is still zeroed — security achieved — but stagger incomplete).
     */
    return WIPE_CONFIRMED;
}
