export const protectRoute = async (req, res, next) => {
  try {
    const auth = req.auth();
    if (!auth || !auth.userId) {
      return res.status(401).json({ message: "Unauthorized - you must be logged in" });
    }
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Unauthorized - you must be logged in" });
  }
};