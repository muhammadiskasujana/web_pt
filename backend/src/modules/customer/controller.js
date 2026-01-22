// modules/customer/controller.js
const { Op, fn, col, literal } = require('sequelize');
const TenantModelLoader = require('../../tenants/loader');

class CustomerController {
    // ===== Customers =====
    async list(req, res) {
        try {
            const schema = req.schema;
            const { q, category_id, is_active, page=1, limit=10 } = req.query;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });

            const Customer = TenantModelLoader.getModel('Customer', schema);
            const CustomerCategory = TenantModelLoader.getModel('CustomerCategory', schema);

            const where = {};
            if (q) where[Op.or] = [
                { name: { [Op.iLike]: `%${q}%` } },
                { phone: { [Op.iLike]: `%${q}%` } },
                { email: { [Op.iLike]: `%${q}%` } },
            ];
            if (category_id) where.customer_category_id = category_id;
            if (is_active !== undefined) where.is_active = is_active === 'true';

            const offset = (parseInt(page)-1) * parseInt(limit);
            const { count, rows } = await Customer.findAndCountAll({
                where,
                include: [{ model: CustomerCategory, as:'category', attributes:['id','name'] }],
                order: [['created_at','DESC']],
                limit: parseInt(limit),
                offset
            });

            res.json({ customers: rows, pagination: { page: +page, limit: +limit, total: count, pages: Math.ceil(count/limit) }});
        } catch (e) {
            console.error('Customer list error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async getById(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });

            const Customer = TenantModelLoader.getModel('Customer', schema);
            const CustomerCategory = TenantModelLoader.getModel('CustomerCategory', schema);

            const customer = await Customer.findByPk(id, {
                include: [{ model: CustomerCategory, as:'category', attributes:['id','name'] }]
            });
            if (!customer) return res.status(404).json({ error:'Customer not found', code:'CUSTOMER_NOT_FOUND' });

            res.json({ customer });
        } catch (e) {
            console.error('Customer get error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async create(req, res) {
        try {
            const schema = req.schema;
            const { name, customer_category_id, email, phone, address, note, code, metadata={} } = req.body;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });
            if (!name) return res.status(400).json({ error:'Name is required', code:'MISSING_NAME' });

            const Customer = TenantModelLoader.getModel('Customer', schema);
            const customer = await Customer.create({ name, customer_category_id, email, phone, address, note, code, metadata });

            res.status(201).json({ message:'Customer created', customer });
        } catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error:'Code already exists', code:'CODE_EXISTS' });
            }
            console.error('Customer create error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async update(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });

            const Customer = TenantModelLoader.getModel('Customer', schema);
            const customer = await Customer.findByPk(id);
            if (!customer) return res.status(404).json({ error:'Customer not found', code:'CUSTOMER_NOT_FOUND' });

            await customer.update(req.body);
            res.json({ message:'Customer updated', customer });
        } catch (e) {
            if (e.name === 'SequelizeUniqueConstraintError') {
                return res.status(409).json({ error:'Code already exists', code:'CODE_EXISTS' });
            }
            console.error('Customer update error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async remove(req, res) {
        try {
            const schema = req.schema;
            const { id } = req.params;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });

            const Customer = TenantModelLoader.getModel('Customer', schema);
            const customer = await Customer.findByPk(id);
            if (!customer) return res.status(404).json({ error:'Customer not found', code:'CUSTOMER_NOT_FOUND' });

            await customer.destroy();
            res.json({ message:'Customer deleted' });
        } catch (e) {
            console.error('Customer delete error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    // ===== Deposit =====
    async getDepositBalance(req, res) {
        try {
            const schema = req.schema;
            const { customerId } = req.params;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });

            const CustomerDeposit = TenantModelLoader.getModel('CustomerDeposit', schema);
            const sums = await CustomerDeposit.findAll({
                where: { customer_id: customerId },
                attributes: [
                    [fn('COALESCE', fn('SUM', literal(`CASE WHEN type='credit' THEN amount ELSE 0 END`)), 0), 'credit'],
                    [fn('COALESCE', fn('SUM', literal(`CASE WHEN type='debit' THEN amount ELSE 0 END`)), 0), 'debit'],
                ],
                raw: true
            });
            const credit = parseInt(sums?.[0]?.credit || 0, 10);
            const debit  = parseInt(sums?.[0]?.debit  || 0, 10);
            const balance = credit - debit;

            res.json({ balance, credit, debit });
        } catch (e) {
            console.error('Deposit balance error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async listDeposits(req, res) {
        try {
            const schema = req.schema;
            const { customerId } = req.params;
            const { page=1, limit=10 } = req.query;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });

            const CustomerDeposit = TenantModelLoader.getModel('CustomerDeposit', schema);
            const offset = (parseInt(page)-1) * parseInt(limit);
            const { count, rows } = await CustomerDeposit.findAndCountAll({
                where: { customer_id: customerId },
                order: [['created_at','DESC']],
                limit: parseInt(limit),
                offset
            });
            res.json({ deposits: rows, pagination: { page:+page, limit:+limit, total:count, pages: Math.ceil(count/limit) } });
        } catch (e) {
            console.error('Deposit list error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async creditDeposit(req, res) { // topup
        try {
            const schema = req.schema;
            const { customerId } = req.params;
            const { amount, description, reference_type='manual', reference_id=null } = req.body;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });
            if (!amount || amount <= 0) return res.status(400).json({ error:'Valid amount required', code:'INVALID_AMOUNT' });

            const Customer = TenantModelLoader.getModel('Customer', schema);
            const CustomerDeposit = TenantModelLoader.getModel('CustomerDeposit', schema);
            const cust = await Customer.findByPk(customerId);
            if (!cust) return res.status(404).json({ error:'Customer not found', code:'CUSTOMER_NOT_FOUND' });

            const trx = await Customer.sequelize.transaction();
            try {
                const dep = await CustomerDeposit.create({
                    customer_id: customerId,
                    type: 'credit',
                    amount,
                    description,
                    reference_type, reference_id
                }, { transaction: trx });

                await trx.commit();
                res.status(201).json({ message:'Deposit credited', deposit: dep });
            } catch (err) {
                await trx.rollback();
                throw err;
            }
        } catch (e) {
            console.error('Credit deposit error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async debitDeposit(req, res) { // tarik/pakai
        try {
            const schema = req.schema;
            const { customerId } = req.params;
            const { amount, description, reference_type='manual', reference_id=null } = req.body;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });
            if (!amount || amount <= 0) return res.status(400).json({ error:'Valid amount required', code:'INVALID_AMOUNT' });

            const Customer = TenantModelLoader.getModel('Customer', schema);
            const CustomerDeposit = TenantModelLoader.getModel('CustomerDeposit', schema);

            const cust = await Customer.findByPk(customerId);
            if (!cust) return res.status(404).json({ error:'Customer not found', code:'CUSTOMER_NOT_FOUND' });

            // cek saldo
            const sums = await CustomerDeposit.findAll({
                where: { customer_id: customerId },
                attributes: [
                    [fn('COALESCE', fn('SUM', literal(`CASE WHEN type='credit' THEN amount ELSE 0 END`)), 0), 'credit'],
                    [fn('COALESCE', fn('SUM', literal(`CASE WHEN type='debit' THEN amount ELSE 0 END`)), 0), 'debit'],
                ], raw:true
            });
            const balance = (parseInt(sums?.[0]?.credit || 0,10) - parseInt(sums?.[0]?.debit || 0,10));
            if (amount > balance) return res.status(400).json({ error:'Insufficient balance', code:'INSUFFICIENT_DEPOSIT' });

            const trx = await Customer.sequelize.transaction();
            try {
                const dep = await CustomerDeposit.create({
                    customer_id: customerId,
                    type: 'debit',
                    amount,
                    description,
                    reference_type, reference_id
                }, { transaction: trx });

                await trx.commit();
                res.status(201).json({ message:'Deposit debited', deposit: dep });
            } catch (err) {
                await trx.rollback();
                throw err;
            }
        } catch (e) {
            console.error('Debit deposit error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    // ===== Portfolio (riwayat pembelian) =====
    async portfolio(req, res) {
        try {
            const schema = req.schema;
            const { customerId } = req.params;
            const { page=1, limit=10 } = req.query;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });

            const SalesOrder = TenantModelLoader.getModel('SalesOrder', schema);
            const SalesOrderItem = TenantModelLoader.getModel('SalesOrderItem', schema);

            const where = {};
            if (SalesOrder.rawAttributes.customer_id) where.customer_id = customerId;
            // fallback (kalau belum tambah kolom customer_id), bisa gunakan nama/phone via join ke Customer—disarankan tambahkan kolom.

            const offset = (parseInt(page)-1) * parseInt(limit);
            const { count, rows } = await SalesOrder.findAndCountAll({
                where,
                include: [{ model: SalesOrderItem, as:'items' }],
                order: [['created_at','DESC']],
                limit: parseInt(limit),
                offset
            });

            res.json({ orders: rows, pagination: { page:+page, limit:+limit, total:count, pages: Math.ceil(count/limit) } });
        } catch (e) {
            console.error('Portfolio error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    // ===== Complaints =====
    async listComplaints(req, res) {
        try {
            const schema = req.schema;
            const { customerId } = req.params;
            const { status, page=1, limit=10 } = req.query;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });

            const CustomerComplaint = TenantModelLoader.getModel('CustomerComplaint', schema);
            const where = { customer_id: customerId };
            if (status) where.status = status;

            const offset = (parseInt(page)-1) * parseInt(limit);
            const { count, rows } = await CustomerComplaint.findAndCountAll({
                where, order: [['created_at','DESC']], limit: parseInt(limit), offset
            });

            res.json({ complaints: rows, pagination: { page:+page, limit:+limit, total:count, pages: Math.ceil(count/limit) } });
        } catch (e) {
            console.error('List complaints error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async createComplaint(req, res) {
        try {
            const schema = req.schema;
            const { customerId } = req.params;
            const { sales_order_id=null, title, content } = req.body;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });
            if (!title || !content) return res.status(400).json({ error:'title & content required', code:'MISSING_FIELDS' });

            const Customer = TenantModelLoader.getModel('Customer', schema);
            const CustomerComplaint = TenantModelLoader.getModel('CustomerComplaint', schema);
            const cust = await Customer.findByPk(customerId);
            if (!cust) return res.status(404).json({ error:'Customer not found', code:'CUSTOMER_NOT_FOUND' });

            const complaint = await CustomerComplaint.create({ customer_id: customerId, sales_order_id, title, content });
            res.status(201).json({ message:'Complaint created', complaint });
        } catch (e) {
            console.error('Create complaint error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }

    async updateComplaintStatus(req, res) {
        try {
            const schema = req.schema;
            const { customerId, complaintId } = req.params;
            const { status, resolution_note } = req.body;
            if (!schema) return res.status(400).json({ error:'Tenant context missing', code:'TENANT_REQUIRED' });
            if (!['open','in_progress','resolved','rejected'].includes(status || '')) {
                return res.status(400).json({ error:'Invalid status', code:'INVALID_STATUS' });
            }

            const CustomerComplaint = TenantModelLoader.getModel('CustomerComplaint', schema);
            const c = await CustomerComplaint.findOne({ where: { id: complaintId, customer_id: customerId } });
            if (!c) return res.status(404).json({ error:'Complaint not found', code:'COMPLAINT_NOT_FOUND' });

            await c.update({ status, resolution_note: resolution_note ?? c.resolution_note, resolved_at: (status==='resolved')? new Date(): null });
            res.json({ message:'Complaint updated', complaint: c });
        } catch (e) {
            console.error('Update complaint error:', e);
            res.status(500).json({ error:'Internal server error', code:'SERVER_ERROR' });
        }
    }
}

module.exports = new CustomerController();
