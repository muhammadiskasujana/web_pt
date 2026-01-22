const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');

// JWT Authentication Middleware (supports both Bearer tokens and cookies)
const authenticateJWT = (req, res, next) => {
    // Try Bearer token first, then cookies
    let token;

    // Check Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    // If no Bearer token, check cookies
    if (!token) {
        token = req.cookies?.master_access_token || req.cookies?.tenant_access_token;
    }

    if (!token) {
        return res.status(401).json({
            error: 'Access denied. No token provided.',
            code: 'NO_TOKEN'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token has expired.',
                code: 'TOKEN_EXPIRED'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                error: 'Invalid token.',
                code: 'INVALID_TOKEN'
            });
        } else {
            return res.status(500).json({
                error: 'Token verification failed.',
                code: 'TOKEN_VERIFICATION_FAILED'
            });
        }
    }
};

// Role-based authorization middleware
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Authentication required.',
                code: 'AUTH_REQUIRED'
            });
        }

        const { role } = req.user;

        if (!allowedRoles.includes(role)) {
            return res.status(403).json({
                error: 'Insufficient permissions.',
                code: 'INSUFFICIENT_PERMISSIONS',
                requiredRoles: allowedRoles,
                userRole: role
            });
        }

        next();
    };
};

// Master-only access middleware
const requireMaster = authorize('master');

// Tenant-only access middleware
const requireTenant = authorize('tenant');

// Master or Tenant access middleware
const requireMasterOrTenant = authorize('master', 'tenant');

// Tenant-specific access middleware (ensures user can only access their own tenant data)
const requireTenantAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required.',
            code: 'AUTH_REQUIRED'
        });
    }

    const { role, tenantId } = req.user;
    const requestedTenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;

    // Masters can access any tenant
    if (role === 'master') {
        return next();
    }

    // Tenants can only access their own data
    if (role === 'tenant' && tenantId === requestedTenantId) {
        return next();
    }

    return res.status(403).json({
        error: 'Access denied. You can only access your own tenant data.',
        code: 'TENANT_ACCESS_DENIED'
    });
};

module.exports = {
    authenticateJWT,
    authorize,
    requireMaster,
    requireTenant,
    requireMasterOrTenant,
    requireTenantAccess
};