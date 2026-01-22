const path = require('path');
const fs = require('fs');
const TenantModelLoader = require('../../tenants/loader');

class CompanyController {
    buildUrl(req, absPath) {
        const uploadsRoot = path.join(__dirname, '../../uploads');
        const rel = path.relative(uploadsRoot, absPath).split(path.sep).join('/');
        const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http');
        const host = req.get('host');
        return `${proto}://${host}/uploads/${rel}`;
    }
    safeUnlink(p) { if (!p) return; fs.promises.unlink(p).catch(()=>{}); }

    // GET /api/company
    async get(req, res) {
        const schema = req.schema;
        if (!schema) return res.status(400).json({ error: 'TENANT_REQUIRED' });
        const CompanyProfile = TenantModelLoader.getModel('CompanyProfile', schema);
        const cp = await CompanyProfile.findOne();
        res.json({ company: cp || null });
    }

    // POST /api/company  (create once)
    async create(req, res) {
        const schema = req.schema;
        if (!schema) return res.status(400).json({ error: 'TENANT_REQUIRED' });
        const CompanyProfile = TenantModelLoader.getModel('CompanyProfile', schema);

        const payload = { ...req.body };
        if (req.file) {
            payload.logo_path = req.file.path;
            payload.logo_url = this.buildUrl(req, req.file.path);
        }
        const exists = await CompanyProfile.findOne();
        if (exists) return res.status(409).json({ error: 'ALREADY_EXISTS' });

        const cp = await CompanyProfile.create(payload);
        res.status(201).json({ message: 'Company created', company: cp });
    }

    // PUT /api/company  (update singleton)
    async update(req, res) {
        const schema = req.schema;
        if (!schema) return res.status(400).json({ error: 'TENANT_REQUIRED' });
        const CompanyProfile = TenantModelLoader.getModel('CompanyProfile', schema);
        const cp = await CompanyProfile.findOne();
        if (!cp) return res.status(404).json({ error: 'NOT_FOUND' });

        const updates = { ...req.body };
        if (req.file) {
            if (cp.logo_path) this.safeUnlink(cp.logo_path);
            updates.logo_path = req.file.path;
            updates.logo_url = this.buildUrl(req, req.file.path);
        }
        await cp.update(updates);
        res.json({ message: 'Company updated', company: cp });
    }

    // DELETE /api/company/logo
    async deleteLogo(req, res) {
        const schema = req.schema;
        if (!schema) return res.status(400).json({ error: 'TENANT_REQUIRED' });
        const CompanyProfile = TenantModelLoader.getModel('CompanyProfile', schema);
        const cp = await CompanyProfile.findOne();
        if (!cp) return res.status(404).json({ error: 'NOT_FOUND' });
        if (cp.logo_path) this.safeUnlink(cp.logo_path);
        await cp.update({ logo_path: null, logo_url: null });
        res.json({ message: 'Logo removed' });
    }
}

module.exports = new CompanyController();
