/**
 * RIVER-LANG — runtime/c/src/river_sim_bridge.c
 *
 * Software simulation bridge.
 *
 * Provides sim_fibonacci() — called by river_await() when sim_mode=1.
 *
 * Two build configurations:
 *   1. Pure C (this file) — default. No Rust dependency.
 *      Simulates the Fibonacci Circular Canal in software.
 *
 *   2. FFI to river-sim crate — define RIVER_SIM_FFI=1 at compile time.
 *      Links to the Rust river-sim crate for full router simulation
 *      (three-stage kinetic valve, TAG-Lock, Cry propagation).
 *      Requires: `cargo build --release -p river-sim` and linking
 *      against `libriver_sim.a`.
 *
 * The interface is identical in both modes — river_await.c does not
 * need to change when switching from pure-C to FFI.
 */

#include <stdint.h>
#include "river_runtime.h"

#ifndef RIVER_SIM_FFI

/* ── Pure C simulation ─────────────────────────────────────────────────────── */

/**
 * Simulate the Fibonacci Circular Canal.
 *
 * Models the token flow:
 *   Seed_Gen(n) → Feedback_Merge → Fibonacci_Adder → Exit_Gate
 *   Exit_Gate.TRUE  → Feedback_Merge   (loop while counter > 0)
 *   Exit_Gate.FALSE → Final_Output     (exit)
 *
 * Returns Fibonacci(n).
 */
uint64_t sim_fibonacci(uint64_t n) {
    if (n == 0) return 0;
    if (n == 1) return 1;

    uint64_t a = 0;   /* fib(i-2) — held in Feedback_Merge */
    uint64_t b = 1;   /* fib(i-1) — output of Fibonacci_Adder */
    uint64_t counter = n - 1;

    /* Circular canal loop: counter tokens flow until counter reaches 0 */
    while (counter > 0) {
        uint64_t next = a + b;
        a = b;
        b = next;
        counter--;
    }

    return b; /* drains into Final_Output reservoir */
}

#else /* RIVER_SIM_FFI */

/* ── Rust FFI bridge ───────────────────────────────────────────────────────── */

/*
 * Declare the Rust function exported from river-sim.
 * Build with: cargo build --release -p river-sim --features c-ffi
 * Link with:  -L$(CARGO_TARGET)/release -lriver_sim
 */
extern uint64_t river_sim_fibonacci(uint64_t n);

uint64_t sim_fibonacci(uint64_t n) {
    return river_sim_fibonacci(n);
}

#endif /* RIVER_SIM_FFI */
