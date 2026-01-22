const Tier = require("../models/Tier");

async function getAllTiers() {
  return Tier.findAll();
}

async function createTier(data) {
  return Tier.create(data);
}

async function updateTier(id, data) {
  const tier = await Tier.findByPk(id); // Fixed variable name from 'feature' to 'tier'
  if (!tier) throw new Error("Tier not found");
  return tier.update(data);
}

async function deleteTier(id) {
  const tier = await Tier.findByPk(id); // Fixed variable name from 'feature' to 'tier'
  if (!tier) throw new Error("Tier not found");
  await tier.destroy();
  return true;
}

module.exports = {
  getAllTiers,
  createTier,
  updateTier,
  deleteTier,
};