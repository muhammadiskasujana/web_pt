const Feature = require("../models/Feature");

async function getAllFeatures() {
  return Feature.findAll();
}

async function createFeature(data) {
  return Feature.create(data);
}

async function updateFeature(id, data) {
  const feature = await Feature.findByPk(id);
  if (!feature) throw new Error("Feature not found");
  return feature.update(data);
}

async function deleteFeature(id) {
  const feature = await Feature.findByPk(id);
  if (!feature) throw new Error("Feature not found");
  await feature.destroy();
  return true;
}

module.exports = {
  getAllFeatures,
  createFeature,
  updateFeature,
  deleteFeature,
};
