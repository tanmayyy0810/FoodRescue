const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            message: "Authentication token required"
        });
    }

    if (!process.env.JWT_SECRET) {
        return res.status(500).json({
            message: "Authentication is not configured"
        });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(403).json({
            message: "Invalid or expired authentication token"
        });
    }
}
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required"
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Access denied: insufficient permissions"
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    requireRole
};