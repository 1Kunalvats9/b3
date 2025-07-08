import { getAuth } from '@clerk/express';

export const protectRoute = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    
    console.log('Auth middleware - checking authentication');
    console.log('Auth object:', auth ? 'Present' : 'Missing');
    console.log('User ID:', auth?.userId || 'Missing');
    
    if (!auth || !auth.userId) {
      console.log('Authentication failed - no valid auth or userId');
      return res.status(401).json({ message: "Unauthorized - you must be logged in" });
    }
    
    console.log('Authentication successful for user:', auth.userId);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Unauthorized - you must be logged in" });
  }
};