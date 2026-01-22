const featureService = require("../services/featureService");

exports.getAll = async (req, res) => {
  try {
    const features = await featureService.getAllFeatures();
    res.json(features);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { key, name, description } = req.body;
    const feature = await featureService.createFeature({
      key,
      name,
      description,
    });
    res.status(201).json(feature);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const feature = await featureService.updateFeature(id, req.body);
    res.json(feature);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await featureService.deleteFeature(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
