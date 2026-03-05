cmake_minimum_required(VERSION 3.20)
project(river_hdl_backend CXX)

add_library(river_hdl_backend STATIC
  src/hdl_codegen.cpp
  src/drc_engine.cpp
)

target_compile_features(river_hdl_backend PUBLIC cxx_std_20)
target_include_directories(river_hdl_backend PUBLIC include)