function featureGuard(featureKey) {
  return (req, res, next) => {
    const effective = req.effectiveModules || {};
    if (!effective[featureKey])
      return res.status(403).json({ error: "Feature not enabled" });
    next();
  };
}

module.exports = featureGuard;
