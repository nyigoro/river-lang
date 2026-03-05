cmake_minimum_required(VERSION 3.20)
project(river_runtime C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

# ── Compiler flags ────────────────────────────────────────────────────────────

if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(
        -Wall -Wextra -Wpedantic -Werror
        -Wno-unused-parameter
    )
endif()

# ── Simulation mode flag ──────────────────────────────────────────────────────
# Default: ON (pure-C sim, no Rust FFI)
# Set RIVER_SIM_FFI=ON to link against the river-sim Rust crate instead.

option(RIVER_SIM_FFI "Link against river-sim Rust crate via FFI" OFF)

if(RIVER_SIM_FFI)
    add_compile_definitions(RIVER_SIM_FFI=1)
    message(STATUS "river-sim: FFI mode (linking Rust crate)")
else()
    message(STATUS "river-sim: pure-C simulation mode")
endif()

# ── Library sources ───────────────────────────────────────────────────────────

set(RIVER_PUBLIC_SOURCES
    src/river_runtime.c        # river_load, helpers, quarantine
    src/river_await.c          # river_await
    src/river_purge.c          # river_purge, river_respawn
    src/river_sim_bridge.c     # sim_fibonacci (pure-C or FFI)
)

# river_spawn and river_enclave_wipe:
#   - Public stubs (committed) are always compiled.
#   - Private implementations (_impl.c) are compiled if present.
#     They override the stubs via a linker flag.

set(RIVER_SPAWN_SOURCES)

# Check for private implementation files (gitignored).
# Use exactly one source per symbol to avoid duplicate definitions.
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/src/river_spawn_impl.c")
    list(APPEND RIVER_SPAWN_SOURCES src/river_spawn_impl.c)
    message(STATUS "river_spawn: using private implementation")
else()
    list(APPEND RIVER_SPAWN_SOURCES src/river_spawn.c)
    message(STATUS "river_spawn: using public stub (simulation only)")
endif()

if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/src/river_enclave_wipe_impl.c")
    list(APPEND RIVER_SPAWN_SOURCES src/river_enclave_wipe_impl.c)
    message(STATUS "river_enclave_wipe: using private implementation")
else()
    list(APPEND RIVER_SPAWN_SOURCES src/river_enclave_wipe.c)
    message(STATUS "river_enclave_wipe: using public stub (simulation only)")
endif()

# ── Static library ────────────────────────────────────────────────────────────

add_library(river_runtime STATIC
    ${RIVER_PUBLIC_SOURCES}
    ${RIVER_SPAWN_SOURCES}
)

target_include_directories(river_runtime PUBLIC include)

# Link against Rust river-sim crate if FFI mode is enabled
if(RIVER_SIM_FFI)
    set(RUST_TARGET_DIR
        "${CMAKE_CURRENT_SOURCE_DIR}/../../rust/target/release"
        CACHE PATH "Cargo target directory")
    target_link_libraries(river_runtime
        "${RUST_TARGET_DIR}/libriver_sim.a"
    )
    if(UNIX)
        target_link_libraries(river_runtime pthread dl)
    endif()
endif()

# ── Test executable ───────────────────────────────────────────────────────────

enable_testing()

add_executable(test_river_runtime
    test/test_river_runtime.c
)
target_link_libraries(test_river_runtime river_runtime)
target_include_directories(test_river_runtime PRIVATE include)

add_test(NAME river_runtime_tests
    COMMAND test_river_runtime
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

# ── Fibonacci example ─────────────────────────────────────────────────────────

add_executable(fibonacci_example
    ../../examples/fibonacci/main.c
)
target_link_libraries(fibonacci_example river_runtime)
target_include_directories(fibonacci_example PRIVATE include)

add_test(NAME fibonacci_example
    COMMAND fibonacci_example
    WORKING_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}
)

# ── Install ───────────────────────────────────────────────────────────────────

install(TARGETS river_runtime
    ARCHIVE DESTINATION lib
)
install(FILES
    include/river_hw.h
    DESTINATION include/river-lang
)
# river_runtime.h is NOT installed — it is an internal header

# ── Summary ───────────────────────────────────────────────────────────────────

message(STATUS "")
message(STATUS "RIVER-LANG C Runtime")
message(STATUS "  Version:    0.1.0")
message(STATUS "  Sim mode:   ${RIVER_SIM_FFI}")
message(STATUS "  Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "")
