const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const TenantModelLoader = require('../../tenants/loader');
const moment = require('moment');

function toNull(v) {
    return (v === undefined || v === null || String(v).trim() === '') ? null : v;
}
function toNumber(v, def = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}
// mirip genResiNo di modul sales
function pad4(n){ return n.toString().padStart(4,'0'); }
async function genEmpCode(sequelize, schema){
    const key = `EMP-${moment().format('YYYYMMDD')}`;
    await sequelize.query(`CREATE TABLE IF NOT EXISTS "${schema}"."_counters" (key text primary key, val integer not null default 0);`);
    const [rows] = await sequelize.query(
        `INSERT INTO "${schema}"."_counters"(key,val) VALUES ($1,1)
     ON CONFLICT (key) DO UPDATE SET val = "${schema}"."_counters".val + 1
     RETURNING val`,
        { bind: [key] }
    );
    return `${key}-${pad4(rows[0].val)}`;
}

class EmployeeController {
    buildUrl(req, absPath) {
        const uploadsRoot = path.join(__dirname, '../../uploads');
        const rel = path.relative(uploadsRoot, absPath).split(path.sep).join('/');
        const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
        const host = req.get('host');
        return `${proto}://${host}/uploads/${rel}`;
    }
    safeUnlink(p) { if (!p) return; fs.promises.unlink(p).catch(()=>{}); }

    async list(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Employee = TenantModelLoader.getModel('Employee', schema);
        const Branch = TenantModelLoader.getModel('Branch', schema);
        const rows = await Employee.findAll({
            include: [{ model: Branch, as: 'branch', attributes: ['id','code','name'] }],
            order: [['created_at','DESC']]
        });
        res.json({ employees: rows });
    }

    async create(req, res) {
        const schema = req.schema; if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Employee = TenantModelLoader.getModel('Employee', schema);

        const payload = { ...req.body };

        payload.branch_id = toNull(payload.branch_id);
        payload.user_id   = toNull(payload.user_id);
        payload.code      = (payload.code && String(payload.code).trim() !== '') ? payload.code : undefined; // biar auto-gen jalan (patch sebelumnya)
        payload.base_salary = toNumber(payload.base_salary, 0);
        payload.allowance   = toNumber(payload.allowance, 0);
        payload.deduction   = toNumber(payload.deduction, 0);
        payload.is_active   = payload.is_active === 'false' ? false : !!payload.is_active;
        payload.pay_cycle   = payload.pay_cycle || 'monthly';


        // ✅ generate code jika kosong/null/''
        if (!payload.code || String(payload.code).trim() === '') {
            const sequelize = Employee.sequelize;
            payload.code = await genEmpCode(sequelize, schema);
        }

        if (req.file) {
            payload.photo_path = req.file.path;
            payload.photo_url = this.buildUrl(req, req.file.path);
        }

        const emp = await Employee.create(payload);
        res.status(201).json({ message:'Employee created', employee: emp });
    }

    async update(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Employee = TenantModelLoader.getModel('Employee', schema);
        const emp = await Employee.findByPk(id); if (!emp) return res.status(404).json({ error:'NOT_FOUND' });

        const updates = { ...req.body };

        // ✅ bersihkan nilai kosong
        if ('branch_id' in updates) updates.branch_id = toNull(updates.branch_id);
        if ('user_id'   in updates) updates.user_id   = toNull(updates.user_id);
        if ('code'      in updates && String(updates.code).trim() === '') delete updates.code;
        if ('base_salary' in updates) updates.base_salary = toNumber(updates.base_salary, emp.base_salary ?? 0);
        if ('allowance'   in updates) updates.allowance   = toNumber(updates.allowance,   emp.allowance ?? 0);
        if ('deduction'   in updates) updates.deduction   = toNumber(updates.deduction,   emp.deduction ?? 0);
        if ('is_active'   in updates) updates.is_active   = (updates.is_active === 'false') ? false : !!updates.is_active;
        if ('pay_cycle'   in updates && !updates.pay_cycle) updates.pay_cycle = emp.pay_cycle || 'monthly';


        // ✅ jangan kosongkan code secara tak sengaja
        if (updates.code !== undefined && String(updates.code).trim() === '') {
            delete updates.code;
        }

        if (req.file) {
            if (emp.photo_path) this.safeUnlink(emp.photo_path);
            updates.photo_path = req.file.path;
            updates.photo_url = this.buildUrl(req, req.file.path);
        }

        await emp.update(updates);
        res.json({ message:'Employee updated', employee: emp });
    }


    async get(req, res) {
        const schema = req.schema; const { id }=req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Employee = TenantModelLoader.getModel('Employee', schema);
        const Branch = TenantModelLoader.getModel('Branch', schema);
        const emp = await Employee.findByPk(id, { include: [{ model: Branch, as:'branch', attributes: ['id','code','name'] }] });
        if (!emp) return res.status(404).json({ error:'NOT_FOUND' });
        res.json({ employee: emp });
    }

    async remove(req, res) {
        const schema = req.schema; const { id }=req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Employee = TenantModelLoader.getModel('Employee', schema);
        const emp = await Employee.findByPk(id); if (!emp) return res.status(404).json({ error:'NOT_FOUND' });
        if (emp.photo_path) this.safeUnlink(emp.photo_path);
        await emp.destroy();
        res.json({ message:'Employee deleted' });
    }

    async deletePhoto(req, res) {
        const schema = req.schema; const { id }=req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        const Employee = TenantModelLoader.getModel('Employee', schema);
        const emp = await Employee.findByPk(id); if (!emp) return res.status(404).json({ error:'NOT_FOUND' });
        if (emp.photo_path) this.safeUnlink(emp.photo_path);
        await emp.update({ photo_path: null, photo_url: null });
        res.json({ message:'Photo removed' });
    }

    // POST /api/employees/:id/create-user
    async createUserForEmployee(req, res) {
        const schema = req.schema; const { id } = req.params;
        const { email, password, role = 'user', name, phone: phoneFromBody } = req.body;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });
        if (!email || !password) return res.status(400).json({ error:'MISSING_EMAIL_PASSWORD' });

        const Employee = TenantModelLoader.getModel('Employee', schema);
        const User = TenantModelLoader.getModel('User', schema);

        const emp = await Employee.findByPk(id);
        if (!emp) return res.status(404).json({ error:'EMP_NOT_FOUND' });

        if (emp.user_id) {
            const u = await User.findByPk(emp.user_id);
            return res.status(409).json({ error:'USER_ALREADY_LINKED', user: u ? { id: u.id, email: u.email } : null });
        }

        // cek email unik
        const normEmail = email.toLowerCase().trim();
        const exists = await User.findOne({ where: { email: normEmail } });
        if (exists) return res.status(409).json({ error:'EMAIL_EXISTS' });

        // pilih phone: prioritas body, fallback ke emp.phone
        const normPhone = (phoneFromBody ?? emp.phone ?? '').toString().trim() || null;

        const password_hash = await bcrypt.hash(password, 12);
        const user = await User.create({
            name: name || emp.full_name,
            email: normEmail,
            password_hash,
            role,
            is_active: true,
            phone: normPhone,            // ✅ simpan nomor HP di akun user
        });

        await emp.update({
            user_id: user.id,
            email: user.email,
            phone: emp.phone || normPhone || null, // pastikan emp.phone terisi kalau sebelumnya kosong
        });

        res.status(201).json({
            message:'User created and linked',
            user: { id: user.id, email: user.email, name: user.name, phone: user.phone ?? null }
        });
    }

    // helper internal
    _setActiveFlag(v) {
        if (v === true || v === false) return v;
        if (typeof v === 'string') return v.trim().toLowerCase() !== 'false';
        return !!v;
    }

// PUT /api/employees/:id/active  { is_active: true|false }
    async setActive(req, res) {
        const schema = req.schema; const { id } = req.params;
        if (!schema) return res.status(400).json({ error:'TENANT_REQUIRED' });

        const { is_active } = req.body;
        if (typeof is_active === 'undefined') {
            return res.status(400).json({ error:'MISSING_IS_ACTIVE' });
        }

        const Employee = TenantModelLoader.getModel('Employee', schema);
        const emp = await Employee.findByPk(id);
        if (!emp) return res.status(404).json({ error:'NOT_FOUND' });

        const flag = this._setActiveFlag(is_active);
        await emp.update({ is_active: flag });

        res.json({ message: flag ? 'Employee activated' : 'Employee deactivated', employee: emp });
    }

// PUT /api/employees/:id/activate
    async activate(req, res) {
        req.body.is_active = true;
        return this.setActive(req, res);
    }

// PUT /api/employees/:id/deactivate
    async deactivate(req, res) {
        req.body.is_active = false;
        return this.setActive(req, res);
    }
}

module.exports = new EmployeeController();
