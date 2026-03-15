const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TrueDocsModule", (m) => {
  const registry = m.contract("TrueDocsRegistry", []);

  return { registry };
});
