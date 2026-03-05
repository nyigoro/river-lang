#ifndef RIVER_HW_H
#define RIVER_HW_H

#include <stddef.h>
#include <stdint.h>

int river_hw_submit(const uint8_t* payload, size_t payload_len, uint32_t* handle_out);
int river_hw_poll(uint32_t handle, uint8_t* out, size_t out_capacity, size_t* out_len);
int river_hw_secure_zero(uint32_t enclave_id);

#endif