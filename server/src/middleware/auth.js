const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Middleware to verify JWT access token and attach user to req
 */
const requireAuth = async (req, res, next) => {
  let token;

  // Check if Authorization header exists and starts with Bearer
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Extract the token
      token = req.headers.authorization.split(" ")[1];

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      // Fetch the user from the database (excluding passwordHash)
      // Assuming payload has 'userId' or 'id'
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId).select("-passwordHash");

      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // Check if user is banned
      if (user.isBanned) {
        return res.status(403).json({ message: "Not authorized, account is banned" });
      }

      // Attach user object to request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

/**
 * Middleware to restrict route to specific user roles
 * @param  {...string} roles - Allowed roles (e.g., "STUDENT", "EMPLOYER", "ADMIN")
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, please login first" });
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: `Access denied. Role '${req.user.role}' is not authorized.` });
    }

    next();
  };
};

/**
 * Middleware to optionally authenticate a user.
 * Attaches req.user if a valid token is provided, otherwise continues without error.
 */
const optionalAuth = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId).select("-passwordHash");
      
      if (user && !user.isBanned) {
        req.user = user;
      }
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }
  next();
};

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth,
};
