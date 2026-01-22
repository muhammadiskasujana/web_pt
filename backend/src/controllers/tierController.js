const tierService = require("../services/tierService");

exports.getAll = async (req, res) => {
  try {
    const tiers = await tierService.getAllTiers();
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { key, name, description } = req.body;
    const tier = await tierService.createTier({
      key,
      name,
      description,
    });
    res.status(201).json(tier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const tier = await tierService.updateTier(id, req.body);
    res.json(tier);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    await tierService.deleteTier(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
