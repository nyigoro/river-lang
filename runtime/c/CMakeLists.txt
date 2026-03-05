cmake_minimum_required(VERSION 3.20)
project(river_runtime C)

add_library(river_runtime STATIC
  src/river_runtime.c
  src/river_spawn.c
  src/river_await.c
  src/river_enclave_wipe.c
)

target_include_directories(river_runtime PUBLIC include)