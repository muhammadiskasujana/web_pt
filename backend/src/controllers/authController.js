const jwtService = require('../services/jwtService');
const bcrypt = require('bcrypt');
const TenantModelLoader = require('../tenants/loader');
const { v4: uuidv4 } = require('uuid');

class AuthController {
    // ===================== Cookie helpers =====================
    getCookieOptions(isRefreshToken = false) {
        const baseOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            path: '/'
        };
        baseOptions.maxAge = (isRefreshToken ? 7 : 1) * 24 * 60 * 60 * 1000;
        return baseOptions;
    }

    setAuthCookies(res, tokens, userType) {
        const prefix = userType === 'master' ? 'master_' : 'tenant_';
        res.cookie(`${prefix}access_token`, tokens.accessToken, this.getCookieOptions(false));
        res.cookie(`${prefix}refresh_token`, tokens.refreshToken, this.getCookieOptions(true));
    }

    clearAuthCookies(res, userType) {
        const prefix = userType === 'master' ? 'master_' : 'tenant_';
        const optsAccess  = { ...this.getCookieOptions(false) };
        const optsRefresh = { ...this.getCookieOptions(true)  };
        delete optsAccess.maxAge;
        delete optsRefresh.maxAge;
        res.clearCookie(`${prefix}access_token`,  optsAccess);
        res.clearCookie(`${prefix}refresh_token`, optsRefresh);
        // legacy cleanup
        res.clearCookie(`${prefix}access_token`,  { path: '/' });
        res.clearCookie(`${prefix}refresh_token`, { path: '/' });
    }

    setDeviceCookie(res, deviceId) {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 365 * 24 * 60 * 60 * 1000,
            path: '/'
        };
        res.cookie('device_id', deviceId, cookieOptions);
    }

    // ===================== Entry points =====================
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password are required', code: 'MISSING_CREDENTIALS' });

            if (email === process.env.MASTER_EMAIL) {
                return this.handleMasterLogin(req, res, email, password);
            }
            if (req.tenant && req.schema) {
                return this.handleTenantLogin(req, res, email, password);
            }
            return res.status(400).json({ error: 'Unable to determine login context', code: 'INVALID_LOGIN_CONTEXT' });
        } catch (err) {
            console.error('Login error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async masterLogin(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password are required', code: 'MISSING_CREDENTIALS' });
            return this.handleMasterLogin(req, res, email, password);
        } catch (err) {
            console.error('Master login error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async tenantLogin(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) return res.status(400).json({ error: 'Email and password are required', code: 'MISSING_CREDENTIALS' });
            if (!req.tenant || !req.schema) return res.status(400).json({ error: 'Tenant context required', code: 'TENANT_REQUIRED' });
            return this.handleTenantLogin(req, res, email, password);
        } catch (err) {
            console.error('Tenant login error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    // ===================== Master handlers =====================
    async handleMasterLogin(req, res, email, password) {
        if (email !== process.env.MASTER_EMAIL || password !== process.env.MASTER_PASSWORD) {
            return res.status(401).json({ error: 'Invalid master credentials', code: 'INVALID_CREDENTIALS' });
        }

        const masterUser = {
            id: 'master',
            email: process.env.MASTER_EMAIL,
            role: 'master',
            tenantId: null,
            userRole: 'master',
            permissions: ['*'],
        };

        const tokens = jwtService.generateTokens(masterUser);
        this.setAuthCookies(res, tokens, 'master');

        return res.json({
            message: 'Master login successful',
            user: { id: masterUser.id, email: masterUser.email, role: masterUser.role, userRole: masterUser.userRole, permissions: masterUser.permissions }
        });
    }

    // // ===================== Tenant handlers =====================
    // async handleTenantLogin(req, res, email, password) {
    //     const schema = req.schema;
    //     try {
    //         const User = TenantModelLoader.getModel('User', schema);
    //         const user = await User.scope(['active', 'withPassword']).findOne({
    //             where: { email: email.toLowerCase().trim() }
    //         });
    //         if (!user) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    //
    //         const ok = await bcrypt.compare(password, user.password_hash);
    //         if (!ok) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });
    //
    //         // Device enforcement
    //         const cookieDeviceId = req.cookies?.device_id;
    //         const userDeviceId = user.device_id;
    //         let deviceUpdated = false;
    //
    //         if (!cookieDeviceId) {
    //             if (userDeviceId) {
    //                 return res.status(403).json({ error: 'Device not recognized. Please contact admin to reset your device registration.', code: 'DEVICE_MISMATCH', action_required: 'CONTACT_ADMIN' });
    //             } else {
    //                 const newDeviceId = uuidv4();
    //                 await user.update({ device_id: newDeviceId });
    //                 this.setDeviceCookie(res, newDeviceId);
    //                 deviceUpdated = true;
    //             }
    //         } else {
    //             if (!userDeviceId) {
    //                 await user.update({ device_id: cookieDeviceId });
    //                 deviceUpdated = true;
    //             } else if (userDeviceId !== cookieDeviceId) {
    //                 return res.status(403).json({ error: 'Device not recognized. Please contact admin to reset your device registration.', code: 'DEVICE_MISMATCH', action_required: 'CONTACT_ADMIN' });
    //             }
    //         }
    //
    //         await user.update({ last_login_at: new Date() });
    //
    //         // Build JWT payload with userRole + permissions from DB
    //         const tenantUser = {
    //             id: user.id,
    //             email: user.email,
    //             role: 'tenant',                          // tipe principal (master/tenant)
    //             userRole: user.role,                     // role operasional: owner/admin/kasir/viewer
    //             tenantId: req.tenant?.id || req.tenant?.schema_name || null,
    //             permissions: Array.isArray(user.permissions) ? user.permissions : [],
    //         };
    //
    //         const tokens = jwtService.generateTokens(tenantUser);
    //         this.setAuthCookies(res, tokens, 'tenant');
    //
    //         return res.json({
    //             message: 'Login successful',
    //             user: {
    //                 id: user.id,
    //                 email: user.email,
    //                 name: user.name,
    //                 role: 'tenant',                        // konsisten dengan FE (tipe principal)
    //                 userRole: user.role,                   // role bisnis
    //                 permissions: Array.isArray(user.permissions) ? user.permissions : [],
    //                 tenantId: tenantUser.tenantId
    //             },
    //             device_updated: deviceUpdated
    //         });
    //
    //     } catch (err) {
    //         console.error('Tenant login error:', err);
    //         return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
    //     }
    // }

    // ===================== Tenant handlers =====================
    async handleTenantLogin(req, res, email, password) {
        const schema = req.schema;
        try {
            const User = TenantModelLoader.getModel('User', schema);
            const user = await User.scope(['active', 'withPassword']).findOne({
                where: { email: email.toLowerCase().trim() }
            });
            if (!user) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });

            const ok = await bcrypt.compare(password, user.password_hash);
            if (!ok) return res.status(401).json({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });

            // ===== NEW: owners are not device-restricted =====
            const isOwner = user.role === 'owner';

            let deviceUpdated = false;
            if (!isOwner) {
                // Device enforcement for NON-owners
                const cookieDeviceId = req.cookies?.device_id;
                const userDeviceId   = user.device_id;

                if (!cookieDeviceId) {
                    if (userDeviceId) {
                        return res.status(403).json({
                            error: 'Device not recognized. Please contact admin to reset your device registration.',
                            code: 'DEVICE_MISMATCH',
                            action_required: 'CONTACT_ADMIN'
                        });
                    } else {
                        const newDeviceId = uuidv4();
                        await user.update({ device_id: newDeviceId });
                        this.setDeviceCookie(res, newDeviceId);
                        deviceUpdated = true;
                    }
                } else {
                    if (!userDeviceId) {
                        await user.update({ device_id: cookieDeviceId });
                        deviceUpdated = true;
                    } else if (userDeviceId !== cookieDeviceId) {
                        return res.status(403).json({
                            error: 'Device not recognized. Please contact admin to reset your device registration.',
                            code: 'DEVICE_MISMATCH',
                            action_required: 'CONTACT_ADMIN'
                        });
                    }
                }
            } else {
                // Optional: for owners only, ensure they have a convenience cookie without binding it.
                if (!req.cookies?.device_id) {
                    this.setDeviceCookie(res, user.device_id || uuidv4());
                }
            }

            await user.update({ last_login_at: new Date() });

            // Build JWT payload with userRole + permissions from DB
            const tenantUser = {
                id: user.id,
                email: user.email,
                role: 'tenant',                          // principal type
                userRole: user.role,                     // business role: owner/admin/manager/user/viewer
                tenantId: req.tenant?.id || req.tenant?.schema_name || null,
                permissions: Array.isArray(user.permissions) ? user.permissions : [],
            };

            const tokens = jwtService.generateTokens(tenantUser);
            this.setAuthCookies(res, tokens, 'tenant');

            return res.json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: 'tenant',
                    userRole: user.role,
                    permissions: Array.isArray(user.permissions) ? user.permissions : [],
                    tenantId: tenantUser.tenantId
                },
                device_updated: deviceUpdated,
                device_restriction: isOwner ? 'bypassed_for_owner' : 'enforced'
            });

        } catch (err) {
            console.error('Tenant login error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }


    // ===================== Refresh =====================
    async refreshToken(req, res) {
        try {
            const refreshToken = req.cookies.master_refresh_token || req.cookies.tenant_refresh_token || req.body.refreshToken;
            if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required', code: 'MISSING_REFRESH_TOKEN' });

            const decoded = jwtService.verifyRefreshToken(refreshToken);

            if (decoded.role === 'master') {
                return this.handleMasterRefresh(req, res, decoded);
            } else if (decoded.role === 'tenant') {
                return this.handleTenantRefresh(req, res, decoded);
            }
            return res.status(401).json({ error: 'Invalid token type', code: 'INVALID_TOKEN_TYPE' });
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Refresh token has expired', code: 'REFRESH_TOKEN_EXPIRED' });
            }
            console.error('Refresh token error:', err);
            return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
        }
    }

    async masterRefresh(req, res) {
        try {
            const refreshToken = req.cookies.master_refresh_token || req.body.refreshToken;
            if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required', code: 'MISSING_REFRESH_TOKEN' });
            const decoded = jwtService.verifyRefreshToken(refreshToken);
            if (decoded.role !== 'master') return res.status(401).json({ error: 'Invalid master refresh token', code: 'INVALID_REFRESH_TOKEN' });
            return this.handleMasterRefresh(req, res, decoded);
        } catch (err) {
            console.error('Master refresh error:', err);
            return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
        }
    }

    async tenantRefresh(req, res) {
        try {
            const refreshToken = req.cookies.tenant_refresh_token || req.body.refreshToken;
            if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required', code: 'MISSING_REFRESH_TOKEN' });
            if (!req.tenant || !req.schema) return res.status(400).json({ error: 'Tenant context required', code: 'TENANT_REQUIRED' });

            const decoded = jwtService.verifyRefreshToken(refreshToken);
            if (decoded.role !== 'tenant') return res.status(401).json({ error: 'Invalid tenant refresh token', code: 'INVALID_REFRESH_TOKEN' });

            return this.handleTenantRefresh(req, res, decoded);
        } catch (err) {
            console.error('Tenant refresh error:', err);
            return res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' });
        }
    }

    async handleMasterRefresh(req, res, decoded) {
        const masterUser = {
            id: 'master',
            email: process.env.MASTER_EMAIL,
            role: 'master',
            tenantId: null,
            userRole: 'master',
            permissions: ['*']
        };
        const tokens = jwtService.generateTokens(masterUser);
        this.setAuthCookies(res, tokens, 'master');
        return res.json({ message: 'Master token refreshed successfully' });
    }

    async handleTenantRefresh(req, res, decoded) {
        try {
            const schema = req.schema;
            const userPayload = await this.findUserById(decoded.id, { context: 'tenant', schema, tenant: req.tenant });
            if (!userPayload) return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

            const tokens = jwtService.generateTokens(userPayload);
            this.setAuthCookies(res, tokens, 'tenant');

            return res.json({ message: 'Token refreshed successfully' });
        } catch (err) {
            console.error('Tenant refresh handler error:', err);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    // ===================== Logout =====================
    async logout(req, res) {
        try {
            const userRole = req.user?.role;
            if (userRole === 'master') {
                this.clearAuthCookies(res, 'master');
            } else if (userRole === 'tenant') {
                this.clearAuthCookies(res, 'tenant');
            } else {
                this.clearAuthCookies(res, 'master');
                this.clearAuthCookies(res, 'tenant');
            }
            return res.json({ message: `Logout successful${userRole ? ` for ${userRole}` : ''}`, clearedTokens: userRole || 'all' });
        } catch (err) {
            console.error('Logout error:', err);
            this.clearAuthCookies(res, 'master');
            this.clearAuthCookies(res, 'tenant');
            return res.status(500).json({ error: 'Logout error, but tokens cleared', code: 'LOGOUT_ERROR' });
        }
    }

    // ===================== Session =====================
    async getSession(req, res) {
        try {
            const accessToken  = req.cookies.master_access_token || req.cookies.tenant_access_token;
            const refreshToken = req.cookies.master_refresh_token || req.cookies.tenant_refresh_token;

            if (!accessToken && !refreshToken) return res.status(401).json({ error: 'Not authenticated' });

            let decoded;
            try {
                decoded = jwtService.verifyToken(accessToken);
            } catch (err) {
                if (!refreshToken) return res.status(401).json({ error: 'Session expired' });

                const r = jwtService.verifyToken(refreshToken);

                if (r.role === 'master') {
                    const masterUser = {
                        id: 'master',
                        email: process.env.MASTER_EMAIL,
                        role: 'master',
                        tenantId: null,
                        userRole: 'master',
                        permissions: ['*'],
                    };
                    const tokens = jwtService.generateTokens(masterUser);
                    this.setAuthCookies(res, tokens, 'master');
                    decoded = jwtService.verifyToken(tokens.accessToken);
                } else if (r.role === 'tenant') {
                    // Build from refresh token (contains userRole & permissions if jwtService menyimpan payload penuh)
                    const tenantUser = {
                        id: r.id,
                        email: r.email,
                        role: 'tenant',
                        userRole: r.userRole,
                        tenantId: r.tenantId || null,
                        permissions: r.permissions || [],
                    };
                    const tokens = jwtService.generateTokens(tenantUser);
                    this.setAuthCookies(res, tokens, 'tenant');
                    decoded = jwtService.verifyToken(tokens.accessToken);
                } else {
                    return res.status(401).json({ error: 'Invalid token type' });
                }
            }

            // (Opsional) sinkronkan dari DB untuk tenant agar paling up-to-date
            let base = {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,                  // master | tenant
                userRole: decoded.userRole || null,  // owner/admin/kasir/viewer
                tenantId: decoded.tenantId || null,
                permissions: decoded.permissions || [],
            };

            if (base.role === 'tenant' && req.schema) {
                const User = TenantModelLoader.getModel('User', req.schema);
                const u = await User.findByPk(base.id);
                if (u) {
                    base.userRole = u.role;
                    base.permissions = Array.isArray(u.permissions) ? u.permissions : [];
                }
            }

            return res.json({ user: base });
        } catch (err) {
            console.error('getSession error:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // ===================== Helper =====================
    async findUserById(id, opts = {}) {
        if (opts.context === 'master') {
            if (id !== 'master') return null;
            const masterEmail = process.env.MASTER_EMAIL;
            if (!masterEmail) return null;
            return { id: 'master', email: masterEmail, role: 'master', tenantId: null, userRole: 'master', permissions: ['*'] };
        }

        // tenant
        const schema = opts.schema;
        if (!schema) return null;
        const User = TenantModelLoader.getModel('User', schema);
        const user = await User.scope('active').findByPk(id);
        if (!user) return null;

        return {
            id: user.id,
            email: user.email,
            role: 'tenant',
            tenantId: opts.tenant?.id || opts.tenant?.schema_name || null,
            userRole: user.role,
            permissions: Array.isArray(user.permissions) ? user.permissions : [],
        };
    }

    // Ke belakang kompatibel (tidak dipakai)
    async findUserByEmail() {
        throw new Error('Use masterLogin or tenantLogin instead');
    }
}

module.exports = new AuthController();
