/**
 * RIVER-LANG — runtime/c/src/river_await.c
 *
 * river_await() — block until the Reservoir fires the Three-Way Handshake.
 *
 * Handshake sequence:
 *   1. Reservoir receives arity tokens
 *   2. PATH_HASH verified against session salt
 *   3. ACK_PULSE transmitted upstream (Layer 3 Cry path)
 *   4. C-Orchestrator unblocks with result
 *
 * On Cry:    returns RIVER_ERR_THIRST + cry_code populated
 * On Chronic: returns RIVER_ERR_CHRONIC + pain_hash populated
 * On timeout: returns RIVER_ERR_TIMEOUT
 */

#include <string.h>
#include "river_runtime.h"

/* ── river_await ───────────────────────────────────────────────────────────── */

river_result_t river_await(river_t r, uint64_t timeout_ns) {
    river_result_t result;
    memset(&result, 0, sizeof(result));

    if (!r) {
        result.status = RIVER_ERR_NULL_HANDLE;
        return result;
    }

    if (r->enclave.wiped) {
        result.status = RIVER_ERR_FATAL;
        river_set_error(r, "river_await called on wiped handle");
        return result;
    }

    uint64_t deadline = (timeout_ns > 0) ? (river_now_ns() + timeout_ns) : 0;

    /* ── Simulation path ──────────────────────────────────────────────────── */
    if (r->sim_mode) {
        /*
         * In simulation: check deadline before running. In a real
         * hardware implementation this loop spins on the reservoir
         * ACK_PULSE interrupt, polling at each T_frame boundary (64ns).
         */
        if (deadline > 0 && river_now_ns() >= deadline) {
            result.status = RIVER_ERR_TIMEOUT;
            river_set_error(r, "river_await timed out (deadline exceeded before sim start)");
            return result;
        }

        /* Retrieve the result computed by river_spawn → sim_run */
        result.value  = token_int(r->sim_result);
        result.status = r->last_status;
        result.epoch  = r->header.epoch_id;

        if (result.status != RIVER_OK) {
            result.cry_code  = r->cry_code;
            result.pain_hash = r->pain_hash;
        }

        return result;
    }

    /* ── Hardware path (future) ───────────────────────────────────────────── */
    /*
     * Poll the Reservoir ACK_PULSE interrupt register at each T_frame.
     * T_frame = 64ns. Poll interval kept at 100ns to avoid bus saturation.
     */
    while (1) {
        if (deadline > 0 && river_now_ns() >= deadline) {
            result.status = RIVER_ERR_TIMEOUT;
            river_set_error(r, "river_await timed out after %llu ns",
                            (unsigned long long)timeout_ns);
            return result;
        }

        /*
         * HARDWARE STUB:
         * uint8_t irq = read_reservoir_irq_register(r->header.epoch_id);
         * if (irq & IRQ_ACK_PULSE) {
         *     result = read_reservoir_result();
         *     return result;
         * }
         * if (irq & IRQ_CRY) {
         *     result.status   = RIVER_ERR_THIRST;
         *     result.cry_code = read_cry_code();
         *     return result;
         * }
         * nanosleep 100ns;
         */
        result.status = RIVER_ERR_FATAL;
        river_set_error(r, "Hardware polling not implemented — run with sim_mode=1");
        return result;
    }
}
