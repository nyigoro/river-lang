cmake_minimum_required(VERSION 3.20)
project(river_hdl_backend CXX)

add_library(river_hdl_backend STATIC
  src/drc_phase1.cpp
  src/drc_phase2.cpp
  src/hdl_emitter.cpp
)

target_compile_features(river_hdl_backend PUBLIC cxx_std_20)
target_include_directories(river_hdl_backend PUBLIC include)

option(RIVER_WITH_CXXBRIDGE "Build CXX bridge adapter" OFF)
if(RIVER_WITH_CXXBRIDGE)
  target_sources(river_hdl_backend PRIVATE src/ffi_bridge.cpp)
  set(RIVER_CXXBRIDGE_INCLUDE_DIR "" CACHE PATH "Path to cxxbridge include directory")
  if(RIVER_CXXBRIDGE_INCLUDE_DIR STREQUAL "")
    message(FATAL_ERROR "RIVER_CXXBRIDGE_INCLUDE_DIR is required when RIVER_WITH_CXXBRIDGE=ON")
  endif()
  target_include_directories(river_hdl_backend PRIVATE "${RIVER_CXXBRIDGE_INCLUDE_DIR}")
endif()

enable_testing()

add_executable(test_drc_phase1 tests/test_drc_phase1.cpp)
target_link_libraries(test_drc_phase1 PRIVATE river_hdl_backend)
add_test(NAME test_drc_phase1 COMMAND test_drc_phase1)

add_executable(test_drc_phase2 tests/test_drc_phase2.cpp)
target_link_libraries(test_drc_phase2 PRIVATE river_hdl_backend)
add_test(NAME test_drc_phase2 COMMAND test_drc_phase2)

add_executable(test_hdl_emitter tests/test_hdl_emitter.cpp)
target_link_libraries(test_hdl_emitter PRIVATE river_hdl_backend)
add_test(NAME test_hdl_emitter COMMAND test_hdl_emitter)
