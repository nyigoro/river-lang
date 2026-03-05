#include "river_hw.h"
#include "river_runtime.h"

int river_await(uint32_t handle, uint8_t* out, size_t out_capacity, size_t* out_len) {
  return river_hw_poll(handle, out, out_capacity, out_len);
}