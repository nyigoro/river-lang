#ifndef RIVER_RUNTIME_H
#define RIVER_RUNTIME_H

#include <stddef.h>
#include <stdint.h>

int river_spawn(const uint8_t* payload, size_t payload_len, uint32_t* handle_out);
int river_await(uint32_t handle, uint8_t* out, size_t out_capacity, size_t* out_len);
int river_enclave_wipe(uint32_t enclave_id);
const char* river_runtime_version(void);

#endif