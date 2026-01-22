const jwt = require('jsonwebtoken');

class JWTService {
    constructor() {
        this.secret = process.env.JWT_SECRET;
        this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
        this.refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    }

    // Generate access token
    generateAccessToken(payload) {
        return jwt.sign(payload, this.secret, {
            expiresIn: this.expiresIn,
            issuer: 'your-app-name',
            audience: 'your-app-users'
        });
    }

    // Generate refresh token
    generateRefreshToken(payload) {
        return jwt.sign(payload, this.secret, {
            expiresIn: this.refreshTokenExpiresIn,
            issuer: 'your-app-name',
            audience: 'your-app-users'
        });
    }

    // Generate both tokens
    generateTokens(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            userRole: user.userRole,
            tenantId: user.tenantId || null,
            permissions: user.permissions || []
        };

        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken({ userId: user.id });

        return {
            accessToken,
            refreshToken,
            expiresIn: this.expiresIn
        };
    }

    // Verify token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.secret);
        } catch (error) {
            throw error;
        }
    }

    // Decode token without verification (useful for getting expired token data)
    decodeToken(token) {
        return jwt.decode(token);
    }
}

module.exports = new JWTService();