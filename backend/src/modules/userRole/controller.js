const UserRole = require('./model');

class UserRoleController {
    // Get all user roles
    async getAll(req, res) {
        try {
            const queryOptions = {
                order: [['level', 'DESC'], ['name', 'ASC']],
            };

            // Apply filters
            if (req.query.active !== undefined) {
                queryOptions.where = { is_active: req.query.active === 'true' };
            }

            const roles = await UserRole.findAll(queryOptions);
            res.json({ roles });
        } catch (error) {
            console.error('Get user roles error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'SERVER_ERROR'
            });
        }
    }

    // Get single role by ID
    async getById(req, res) {
        try {
            const { id } = req.params;
            const role = await UserRole.findByPk(id);

            if (!role) {
                return res.status(404).json({
                    error: 'Role not found',
                    code: 'ROLE_NOT_FOUND'
                });
            }

            res.json({ role });
        } catch (error) {
            console.error('Get user role error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'SERVER_ERROR'
            });
        }
    }

    // Create new role (Master only)
    async create(req, res) {
        try {
            const {
                name,
                display_name,
                description,
                level,
                permissions
            } = req.body;

            if (!name || !display_name) {
                return res.status(400).json({
                    error: 'Name and display_name are required',
                    code: 'MISSING_REQUIRED_FIELDS'
                });
            }

            const role = await UserRole.create({
                name: name.toLowerCase(),
                display_name,
                description,
                level: level || 0,
                permissions: permissions || [],
                created_by: req.user.userId,
            });

            res.status(201).json({
                message: 'Role created successfully',
                role,
            });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({
                    error: 'Role name already exists',
                    code: 'ROLE_EXISTS'
                });
            }

            console.error('Create role error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'SERVER_ERROR'
            });
        }
    }

    // Update role (Master only)
    async update(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const role = await UserRole.findByPk(id);
            if (!role) {
                return res.status(404).json({
                    error: 'Role not found',
                    code: 'ROLE_NOT_FOUND'
                });
            }

            // Prevent modification of system roles
            if (role.is_system) {
                return res.status(400).json({
                    error: 'System roles cannot be modified',
                    code: 'SYSTEM_ROLE_PROTECTED'
                });
            }

            await role.update(updates);

            res.json({
                message: 'Role updated successfully',
                role,
            });
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({
                    error: 'Role name already exists',
                    code: 'ROLE_EXISTS'
                });
            }

            console.error('Update role error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'SERVER_ERROR'
            });
        }
    }

    // Delete role (Master only)
    async delete(req, res) {
        try {
            const { id } = req.params;

            const role = await UserRole.findByPk(id);
            if (!role) {
                return res.status(404).json({
                    error: 'Role not found',
                    code: 'ROLE_NOT_FOUND'
                });
            }

            // Prevent deletion of system roles
            if (role.is_system) {
                return res.status(400).json({
                    error: 'System roles cannot be deleted',
                    code: 'SYSTEM_ROLE_PROTECTED'
                });
            }

            await role.destroy();

            res.json({
                message: 'Role deleted successfully',
            });
        } catch (error) {
            console.error('Delete role error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'SERVER_ERROR'
            });
        }
    }
}

module.exports = new UserRoleController();