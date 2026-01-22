const bcrypt = require('bcrypt');
const TenantModelLoader = require('../../tenants/loader');
const UserRole = require('../userRole/model');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const axios = require('axios');

// modules/user/controller.js (di paling atas file, setelah import)
const ROLE_DEFAULT_PERMISSIONS = {
    owner: ['*'], // full akses
    admin: [
        'dashboard.view',
        'products.read','products.create','products.update',
        'sales.read','sales.create','sales.update',
        'customers.read','customers.create','customers.update',
        'receivables.read','receivables.manage',
        'expenses.read','expenses.create','expenses.update',
        'payables.read','payables.manage',
        'reports.view',
        'progress.read','progress.manage',
    ],
    kasir: [
        'dashboard.view',
        'sales.read','sales.create','sales.update',
        'customers.read','customers.create',
        'products.read',
        'progress.read',
    ],
    viewer: [
        'dashboard.view',
        'products.read',
        'sales.read',
        'customers.read',
        'reports.view',
        'progress.read',
    ],
};

function getDefaultPermissionsForRole(role) {
    return ROLE_DEFAULT_PERMISSIONS[role] || [];
}

class UserController {
    // ====== UTIL OTP (RESET PASSWORD) ======
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async sendWhatsAppOTP(phoneNumber, otp) {
        try {
            const response = await axios.post('http://arisbara.cloud:3414/send-message', {
                session_id: "c8fba9e7-58c3-44ea-b304-53d08de8c7c1",
                to: phoneNumber,
                message: `Kode OTP untuk reset password Anda adalah: ${otp}. Berlaku 5 menit. Jangan bagikan kode ini kepada siapapun.`
            });
            return response.data;
        } catch (error) {
            console.error('WhatsApp send error:', error?.response?.data || error.message);
            throw new Error('Failed to send WhatsApp message');
        }
    }

    // ====== COOKIE DEVICE ======
    setDeviceCookie(res, deviceId) {
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 365 * 24 * 60 * 60 * 1000, // 1 tahun
            path: '/'
        };
        res.cookie('device_id', deviceId, cookieOptions);
    }

    getDeviceIdFromCookie(req) {
        return req.cookies?.device_id;
    }

    // ====== PASSWORD RESET (OTP) ======
    async requestPasswordReset(req, res) {
        try {
            const { email } = req.body;
            const schema = req.schema;

            if (!email) return res.status(400).json({ error: 'Email is required', code: 'MISSING_EMAIL' });
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const User = TenantModelLoader.getModel('User', schema);
            const user = await User.scope('withOTP').findOne({ where: { email: email.toLowerCase().trim() } });

            if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
            if (!user.phone) return res.status(400).json({ error: 'No phone number registered for this user', code: 'NO_PHONE_NUMBER' });

            // Optional rate-limit: max 5 OTP/hari
            const today = moment().startOf('day').toDate();
            const otpRequestsToday = await User.count({
                where: {
                    email: email.toLowerCase().trim(),
                    updated_at: { [Op.gte]: today },
                    reset_otp: { [Op.ne]: null }
                }
            });
            if (otpRequestsToday >= 5) {
                return res.status(429).json({ error: 'Too many OTP requests today. Please try again tomorrow.', code: 'TOO_MANY_OTP_REQUESTS' });
            }

            const otp = this.generateOTP();
            const otpExpiresAt = moment().add(5, 'minutes').toDate();

            await user.update({
                reset_otp: otp,
                reset_otp_expires_at: otpExpiresAt,
                reset_otp_attempts: 0
            });

            try {
                await this.sendWhatsAppOTP(user.phone, otp);
                return res.json({
                    message: 'OTP sent to your WhatsApp number',
                    phone_masked: user.phone.replace(/(\d{4})\d+(\d{4})/, '$1****$2'),
                    expires_at: otpExpiresAt
                });
            } catch (e) {
                // rollback OTP bila kirim gagal
                await user.update({ reset_otp: null, reset_otp_expires_at: null, reset_otp_attempts: 0 });
                return res.status(500).json({ error: 'Failed to send OTP to WhatsApp', code: 'OTP_SEND_FAILED' });
            }
        } catch (error) {
            console.error('Request password reset error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async resetPasswordWithOTP(req, res) {
        try {
            const { email, otp, new_password } = req.body;
            const schema = req.schema;

            if (!email || !otp || !new_password) {
                return res.status(400).json({ error: 'Email, OTP, and new password are required', code: 'MISSING_REQUIRED_FIELDS' });
            }
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });
            if (new_password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters long', code: 'WEAK_PASSWORD' });
            }

            const User = TenantModelLoader.getModel('User', schema);
            const user = await User.scope(['withOTP', 'withPassword']).findOne({ where: { email: email.toLowerCase().trim() } });
            if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

            if (!user.reset_otp || !user.reset_otp_expires_at) {
                return res.status(400).json({ error: 'No active OTP found. Please request a new one.', code: 'NO_ACTIVE_OTP' });
            }
            if (moment().isAfter(user.reset_otp_expires_at)) {
                await user.update({ reset_otp: null, reset_otp_expires_at: null, reset_otp_attempts: 0 });
                return res.status(400).json({ error: 'OTP has expired. Please request a new one.', code: 'OTP_EXPIRED' });
            }
            if (user.reset_otp_attempts >= 3) {
                await user.update({ reset_otp: null, reset_otp_expires_at: null, reset_otp_attempts: 0 });
                return res.status(400).json({ error: 'Too many OTP attempts. Please request a new one.', code: 'TOO_MANY_OTP_ATTEMPTS' });
            }
            if (user.reset_otp !== otp) {
                await user.update({ reset_otp_attempts: user.reset_otp_attempts + 1 });
                return res.status(400).json({
                    error: 'Invalid OTP',
                    code: 'INVALID_OTP',
                    attempts_remaining: Math.max(0, 3 - (user.reset_otp_attempts + 1))
                });
            }

            const saltRounds = 12;
            const password_hash = await bcrypt.hash(new_password, saltRounds);

            await user.update({
                password_hash,
                reset_otp: null,
                reset_otp_expires_at: null,
                reset_otp_attempts: 0
            });

            return res.json({
                message: 'Password reset successful',
                user: { id: user.id, email: user.email, name: user.name }
            });
        } catch (error) {
            console.error('Reset password with OTP error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    // ====== REGISTER / CRUD USER ======
    async register(req, res) {
        try {
            const { name, email, password, first_name, last_name, phone } = req.body;
            const schema = req.schema;

            if (!name || !email || !password) {
                return res.status(400).json({ error: 'Name, email, and password are required', code: 'MISSING_REQUIRED_FIELDS' });
            }
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });
            if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long', code: 'WEAK_PASSWORD' });

            const cookieDeviceId = this.getDeviceIdFromCookie(req);
            const finalDeviceId = cookieDeviceId || uuidv4();

            const saltRounds = 12;
            const password_hash = await bcrypt.hash(password, saltRounds);

            const User = TenantModelLoader.getModel('User', schema);
            const defaultPermissions = getDefaultPermissionsForRole('kasir'); // default role 'kasir'
            const user = await User.create({
                name,
                email: email.toLowerCase().trim(),
                password_hash,
                role: 'kasir',
                permissions: defaultPermissions,            // ⬅️ tambahkan ini
                first_name,
                last_name,
                phone,
                device_id: finalDeviceId,
                is_active: true
            });

            this.setDeviceCookie(res, finalDeviceId);

            const userResponse = user.toJSON();
            delete userResponse.password_hash;

            return res.status(201).json({
                message: 'User registered successfully',
                user: userResponse,
                device_registered: true
            });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Email already exists', code: 'EMAIL_EXISTS' });
            }
            console.error('Register user error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async getAll(req, res) {
        try {
            const schema = req.schema;
            const currentUser = req.user;

            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const User = TenantModelLoader.getModel('User', schema);

            // permission minimal: master / owner / admin
            if (!(currentUser.role === 'master' || currentUser.role === 'tenant')) {
                return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
            }

            const queryOptions = {
                order: [['created_at', 'DESC']]
            };

            if (req.query.role) {
                queryOptions.where = { role: req.query.role };
            }
            if (req.query.active !== undefined) {
                queryOptions.where = {
                    ...queryOptions.where,
                    is_active: req.query.active === 'true'
                };
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;

            const { count, rows: users } = await User.findAndCountAll({
                ...queryOptions,
                limit,
                offset
            });

            return res.json({
                users,
                pagination: { page, limit, total: count, pages: Math.ceil(count / limit) }
            });
        } catch (error) {
            console.error('Get users error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async getById(req, res) {
        try {
            const { id } = req.params;
            const schema = req.schema;

            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const User = TenantModelLoader.getModel('User', schema);
            const user = await User.findByPk(id);
            if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

            return res.json({ user });
        } catch (error) {
            console.error('Get user error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async create(req, res) {
        try {
            const {
                name, email, password, role,
                first_name, last_name, phone, device_id
            } = req.body;

            const currentUser = req.user;
            const schema = req.schema;

            const cookieDeviceId = this.getDeviceIdFromCookie(req);
            const finalDeviceId = device_id || cookieDeviceId || uuidv4();

            if (!name || !email || !password) {
                return res.status(400).json({ error: 'Name, email, and password are required', code: 'MISSING_REQUIRED_FIELDS' });
            }

            // role validation
            const allowedRoles = ['owner', 'admin', 'kasir', 'viewer'];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role specified', code: 'INVALID_ROLE' });
            }

            // permission checks
            if (currentUser.role === 'master') {
                if (!schema) return res.status(400).json({ error: 'Tenant context required for user creation', code: 'TENANT_REQUIRED' });
            } else if (currentUser.role === 'tenant') {
                if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });
                const User = TenantModelLoader.getModel('User', schema);
                const actor = await User.findByPk(currentUser.userId);
                if (!actor || actor.role !== 'owner') {
                    return res.status(403).json({ error: 'Only owners can create users in tenant', code: 'INSUFFICIENT_PERMISSIONS' });
                }
                if (role === 'owner') {
                    return res.status(403).json({ error: 'Owners cannot create other owner accounts', code: 'CANNOT_CREATE_OWNER' });
                }
            } else {
                return res.status(403).json({ error: 'Insufficient permissions to create users', code: 'INSUFFICIENT_PERMISSIONS' });
            }

            const saltRounds = 12;
            const password_hash = await bcrypt.hash(password, saltRounds);

            const User = TenantModelLoader.getModel('User', schema);
            const payloadPermissions = Array.isArray(req.body.permissions) ? req.body.permissions : null;
            const defaultPermissions = getDefaultPermissionsForRole(role);
            const finalPermissions = payloadPermissions && (currentUser.role === 'master' || currentUser.role === 'tenant')
                ? payloadPermissions
                : defaultPermissions;

            const user = await User.create({
                name,
                email: email.toLowerCase().trim(),
                password_hash,
                role,
                permissions: finalPermissions,  // ⬅️
                first_name,
                last_name,
                phone,
                device_id: finalDeviceId,
                is_active: true
            });

            this.setDeviceCookie(res, finalDeviceId);

            const userResponse = user.toJSON();
            delete userResponse.password_hash;

            return res.status(201).json({ message: 'User created successfully', user: userResponse });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Email already exists', code: 'EMAIL_EXISTS' });
            }
            console.error('Create user error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const currentUser = req.user;
            const schema = req.schema;

            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const User = TenantModelLoader.getModel('User', schema);
            const user = await User.findByPk(id);
            if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

            // permissions
            if (currentUser.role === 'master') {
                // ok
            } else if (currentUser.role === 'tenant') {
                const actor = await User.findByPk(currentUser.userId);
                if (!actor || !['owner', 'admin'].includes(actor.role)) {
                    return res.status(403).json({ error: 'Only owners and admins can update users', code: 'INSUFFICIENT_PERMISSIONS' });
                }
                if (updates.role === 'owner' || user.role === 'owner') {
                    return res.status(403).json({ error: 'Cannot modify owner accounts', code: 'CANNOT_MODIFY_OWNER' });
                }
            } else {
                return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
            }

            if (updates.password) {
                const saltRounds = 12;
                updates.password_hash = await bcrypt.hash(updates.password, saltRounds);
                delete updates.password;
            }
            if (updates.email) {
                updates.email = updates.email.toLowerCase().trim();
            }

            const isPermissionsProvided = Array.isArray(updates.permissions);
            const isRoleChanging = updates.role && updates.role !== user.role;

            // Hanya owner/admin/masters yang boleh set custom permissions (selain owner target)
            if (isPermissionsProvided) {
                // validasi minimal: jangan izinkan edit permission OWNER
                if (user.role === 'owner') {
                    return res.status(403).json({ error: 'Cannot modify permissions of owner account', code: 'CANNOT_MODIFY_OWNER' });
                }
            } else if (isRoleChanging) {
                // jika role diganti dan permissions tidak dikirim => reset ke default role baru
                updates.permissions = getDefaultPermissionsForRole(updates.role);
            }

            await user.update(updates);

            const userResponse = user.toJSON();
            delete userResponse.password_hash;

            return res.json({ message: 'User updated successfully', user: userResponse });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error: 'Email already exists', code: 'EMAIL_EXISTS' });
            }
            console.error('Update user error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async delete(req, res) {
        try {
            const { id } = req.params;
            const currentUser = req.user;
            const schema = req.schema;

            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const UserModel = TenantModelLoader.getModel('User', schema);

            const targetUser = await UserModel.findByPk(id);
            if (!targetUser) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

            if (currentUser.role === 'master') {
                // ok
            } else if (currentUser.role === 'tenant') {
                const actorUser = await UserModel.findByPk(currentUser.userId);
                if (!actorUser || actorUser.role !== 'owner') {
                    return res.status(403).json({ error: 'Only owners can delete users', code: 'INSUFFICIENT_PERMISSIONS' });
                }
                if (targetUser.role === 'owner') {
                    return res.status(403).json({ error: 'Cannot delete owner accounts', code: 'CANNOT_DELETE_OWNER' });
                }
            } else {
                return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
            }

            const sequelize = UserModel.sequelize;
            await sequelize.transaction(async (t) => {
                await targetUser.destroy({
                    force: !!UserModel.options?.paranoid,
                    transaction: t
                });
            });

            return res.status(200).json({ message: 'User permanently deleted' });
        } catch (error) {
            console.error('Delete user error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    // ====== DEVICE ======
    async validateDevice(req, res) {
        try {
            const { email } = req.body;
            const device_id = this.getDeviceIdFromCookie(req);
            const schema = req.schema;

            if (!email || !device_id) {
                return res.status(400).json({ error: 'Email is required and device must be registered', code: 'MISSING_REQUIRED_FIELDS' });
            }
            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const User = TenantModelLoader.getModel('User', schema);
            const user = await User.findOne({
                where: { email: email.toLowerCase().trim(), is_active: true }
            });
            if (!user) return res.status(404).json({ error: 'User not found or inactive', code: 'USER_NOT_FOUND' });

            const isDeviceValid = user.device_id === device_id;

            return res.json({
                valid: isDeviceValid,
                message: isDeviceValid ? 'Device validated successfully' : 'Invalid device'
            });
        } catch (error) {
            console.error('Validate device error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    async resetDevice(req, res) {
        try {
            const { id } = req.params;
            const currentUser = req.user;
            const schema = req.schema;

            if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

            const User = TenantModelLoader.getModel('User', schema);

            if (currentUser.role === 'master') {
                // ok
            } else if (currentUser.role === 'tenant') {
                const actor = await User.findByPk(currentUser.userId);
                if (!actor || !['owner', 'admin'].includes(actor.role)) {
                    return res.status(403).json({ error: 'Only owners and admins can reset device IDs', code: 'INSUFFICIENT_PERMISSIONS' });
                }
            } else {
                return res.status(403).json({ error: 'Insufficient permissions', code: 'INSUFFICIENT_PERMISSIONS' });
            }

            const user = await User.findByPk(id);
            if (!user) return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });

            await user.update({ device_id: null });

            const userResponse = user.toJSON();
            delete userResponse.password_hash;

            return res.json({
                message: 'Device ID reset successfully. Next login will register a new device.',
                user: userResponse,
                device_reset: true,
                next_login_will_register_device: true
            });
        } catch (error) {
            console.error('Reset device error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }

    // ====== ROLES ======
    async getAvailableRoles(req, res) {
        try {
            const currentUser = req.user;
            let availableRoles = [];

            if (currentUser.role === 'master') {
                const customRoles = await UserRole.findAll({
                    where: { is_active: true },
                    order: [['level', 'DESC']]
                });

                const systemRoles = [
                    { role: 'owner', display_name: 'Owner', level: 100, is_system: true },
                    { role: 'admin', display_name: 'Admin', level: 80, is_system: true },
                    { role: 'kasir', display_name: 'Kasir', level: 50, is_system: true },
                    { role: 'viewer', display_name: 'Viewer', level: 20, is_system: true }
                ];

                availableRoles = [
                    ...systemRoles,
                    ...customRoles.map(role => ({
                        role: role.name,
                        display_name: role.display_name,
                        level: role.level,
                        is_system: false,
                        permissions: role.permissions
                    }))
                ];
            } else if (currentUser.role === 'tenant') {
                const schema = req.schema;
                if (!schema) return res.status(400).json({ error: 'Tenant context missing', code: 'TENANT_REQUIRED' });

                const User = TenantModelLoader.getModel('User', schema);
                const tenantUser = await User.findByPk(currentUser.userId);

                if (tenantUser && tenantUser.role === 'owner') {
                    const customRoles = await UserRole.findAll({
                        where: { is_active: true, level: { [Op.lt]: 100 } },
                        order: [['level', 'DESC']]
                    });

                    const systemRoles = [
                        { role: 'admin', display_name: 'Admin', level: 80, is_system: true },
                        { role: 'kasir', display_name: 'Kasir', level: 50, is_system: true },
                        { role: 'viewer', display_name: 'Viewer', level: 20, is_system: true }
                    ];

                    availableRoles = [
                        ...systemRoles,
                        ...customRoles.map(role => ({
                            role: role.name,
                            display_name: role.display_name,
                            level: role.level,
                            is_system: false,
                            permissions: role.permissions
                        }))
                    ];
                }
            }

            return res.json({ roles: availableRoles });
        } catch (error) {
            console.error('Get available roles error:', error);
            return res.status(500).json({ error: 'Internal server error', code: 'SERVER_ERROR' });
        }
    }
}

module.exports = new UserController();
