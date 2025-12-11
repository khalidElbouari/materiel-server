export const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

export const getCurrentUser = (req, res, next) => {
  if (req.user) {
    req.userId = req.user._id;
  }
  next();
};