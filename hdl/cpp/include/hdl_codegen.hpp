#pragma once

#include <string>
#include <vector>

namespace river {

struct ModuleSpec {
  std::string name;
  std::vector<std::string> ports;
};

std::string emit_systemverilog(const ModuleSpec& spec);
bool enforce_drc_rules(const ModuleSpec& spec, std::string& message);

}  // namespace river