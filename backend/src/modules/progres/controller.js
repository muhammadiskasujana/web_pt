// ───────────────────────────────────────────────────────────────────────────────
// 2) CONTROLLER — src/modules/progres/controller.js
// ───────────────────────────────────────────────────────────────────────────────
const { Op } = require('sequelize');
const TenantModelLoader = require('../../tenants/loader');
const axios = require("axios");

class ProgresController {
    _m(schema){
        return {
            ProgressCategory:       TenantModelLoader.getModel('ProgressCategory', schema),
            ProgressStage:          TenantModelLoader.getModel('ProgressStage', schema),
            ProgressInstance:       TenantModelLoader.getModel('ProgressInstance', schema),
            ProgressInstanceStage:  TenantModelLoader.getModel('ProgressInstanceStage', schema),
            Product:                TenantModelLoader.getModel('Product', schema),
        };
    }

    // ===== util kecil =====
    _baseURL() {
        const raw = process.env.API_BASE_URL || "http://localhost:5000";
        return raw.replace(/^htpps:\/\//i, "https://");
    }
    _notifyHeaders(schema, reqHeaders) {
        // Prioritas:
        // 1) Header request (JWT/cookie) bila ada
        // 2) Internal key bila disediakan
        const h = { 'X-Tenant': schema };
        if (reqHeaders?.authorization) h.Authorization = reqHeaders.authorization;
        if (reqHeaders?.cookie)        h.Cookie        = reqHeaders.cookie;
        if (!h.Authorization && !h.Cookie && process.env.INTERNAL_SERVICE_KEY) {
            h['X-Internal-Key'] = process.env.INTERNAL_SERVICE_KEY;
        }
        return h;
    }

    // Kirim WA Text ke nomor pelanggan
    async _sendWhatsAppTextTo(schema, toJid, text, reqHeaders = null) {
        const axios = require('axios');
        const base = this._baseURL().replace(/\/+$/,'');
        const hasApi = /\/api(\/|$)/i.test(base);
        const url = `${base}${hasApi ? '' : '/api'}/whatsapp/send/text`;
        const headers = this._notifyHeaders(schema, reqHeaders || {}); // X-Tenant + (JWT/Cookie | X-Internal-Key)
        // Ambil session id default di service pengirim (server WA kamu biasanya auto-pick di endpoint)
        await axios.post(url, { to: toJid, message: text }, { headers, timeout: 15000 });
    }

    _normalizePhoneToJid(raw) {
        if (!raw) return null;
        let digits = String(raw).replace(/[^\d+]/g, '');
        if (digits.startsWith('+')) digits = digits.slice(1);
        if (digits.startsWith('0')) digits = '62' + digits.slice(1);
        if (!/^\d{7,15}$/.test(digits)) return null;
        return `${digits}@s.whatsapp.net`;
    }

    async _resolveCustomerInfoByInstance(schema, instanceId) {
        const m = this._m(schema);
        const TenantModelLoader = require('../../tenants/loader');
        const SalesOrder = TenantModelLoader.getModel('SalesOrder', schema);
        const Customer  = TenantModelLoader.getModel('Customer', schema);

        const inst = await m.ProgressInstance.findByPk(instanceId);
        if (!inst?.sales_order_id) return { name: '-', resi_no: '-', phone: null };

        const so = await SalesOrder.findByPk(inst.sales_order_id);
        let phone = null;
        if (so?.customer_id) {
            const cust = await Customer.findByPk(so.customer_id);
            phone = cust?.phone || null;
        }
        return {
            name: so?.customer_name || '-',
            resi_no: so?.resi_no || '-',
            phone
        };
    }

    _idr(n) { return `Rp ${Number(n||0).toLocaleString('id-ID')}`; }

    async _notifyCustomerProgress(schema, { instance, changedStage, action, remarks }, reqHeaders = null) {
        try {
            // Ambil info pelanggan
            const { name, resi_no, phone } = await this._resolveCustomerInfoByInstance(schema, instance.id);
            if (!phone) return; // tidak kirim jika tidak ada nomor

            const toJid = this._normalizePhoneToJid(phone);
            if (!toJid) return;

            // Tebak next stage dari daftar stages pada instance (kalau tersedia)
            let nextStageName = null;
            try {
                const stages = Array.isArray(instance.stages) ? [...instance.stages] : [];
                stages.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

                // Posisi stage yang barusan berubah
                const curIdx = changedStage
                    ? stages.findIndex(s =>
                        (s.id && s.id === changedStage.id) ||
                        (s.stage_id && s.stage_id === changedStage.stage_id) ||
                        (s.name && s.name === changedStage.name)
                    )
                    : -1;

                // Cari next berdasarkan urutan
                if (curIdx >= 0) {
                    const next = stages[curIdx + 1] || null;
                    if (next && !["done", "canceled"].includes(String(next.status || "").toLowerCase())) {
                        nextStageName = next.name || null;
                    }
                } else {
                    // fallback: pakai current_stage_id untuk referensi
                    const curById = stages.findIndex(s => (s.stage_id === instance.current_stage_id || s.id === instance.current_stage_id));
                    if (curById >= 0 && stages[curById + 1]) nextStageName = stages[curById + 1].name || null;
                }
            } catch { /* no-op */ }

            const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
            const pct = Number(instance.percent || 0);

            const isStart = String(action).toLowerCase() === 'start';
            const isDone  = String(action).toLowerCase() === 'done';

            const stageName = changedStage?.name || '-';

            const headline = isStart
                ? `🚀 *${stageName} dimulai*`
                : isDone
                    ? `✅ *${stageName} selesai*`
                    : `🔔 *Update progres*`;

            let nextLine = "";
            if (isDone) {
                if (nextStageName) {
                    nextLine = `➡️ *Lanjut ke:* ${nextStageName} (menunggu diproses)`;
                } else {
                    nextLine = `🎯 *Semua tahap beres!* Pesanan *siap diambil/diantar*.`;
                }
            } else if (isStart && nextStageName) {
                nextLine = `⏭️ Setelah ini: *${nextStageName}*`;
            }

            const lines = [];
            lines.push(headline);
            lines.push('');
            lines.push(`• *No. Resi:* ${resi_no}`);
            lines.push(`• *Nama:* ${name}`);
            lines.push(`• *Produk:* ${instance.product_name || '-'}`);
            lines.push(`• *Tahap:* ${stageName}`);
            lines.push(`• *Aksi:* ${(action || '').toUpperCase()}`);
            lines.push(`• *Status Tahap:* ${(changedStage?.status || '-').toUpperCase()}`);
            lines.push(`• *Progres:* ${pct}%`);
            lines.push(`• *Waktu:* ${nowStr}`);
            if (remarks) lines.push(`• *Catatan:* ${remarks}`);
            if (nextLine) {
                lines.push('');
                lines.push(nextLine);
            }
            lines.push('');
            lines.push(`Ketik: *CEK PROGRES ${resi_no}* untuk lihat status terkini.`);
            lines.push('_Pesan otomatis dari sistem. Terima kasih sudah menunggu!_');

            await this._sendWhatsAppTextTo(schema, toJid, lines.join('\n'), reqHeaders);
        } catch (e) {
            console.warn('[notifyCustomerProgress] gagal kirim WA:', e?.message || e);
        }
    }


    // ===== CORE UPDATE (dipakai JWT & INTERNAL) =====
    async _updateStageCore({ schema, user, instanceId, stageId, action, remarks }) {
        const m = this._m(schema);

        // Ambil instance + semua stage (non-separate → simple, tanpa lock)
        const inst = await m.ProgressInstance.findByPk(instanceId, {
            include: [{ model: m.ProgressInstanceStage, as: 'stages' }],
        });
        if (!inst) return { status: 404, body: { error: 'NOT_FOUND' } };

        // RBAC (hanya untuk jalur JWT; untuk internal, user bisa null → skip)
        if (user) {
            const role = user?.role || user?.userRole || 'user';
            if (role === 'admin' && inst.pic_user_id && inst.pic_user_id !== user.id) {
                return { status: 403, body: { error: 'FORBIDDEN' } };
            }
        }

        const st = inst.stages.find(s => s.stage_id === stageId || s.id === stageId);
        if (!st) return { status: 404, body: { error: 'STAGE_NOT_FOUND' } };

        const now = new Date();
        let newStatus = st.status;

        if (action === 'start') {
            newStatus = 'in_progress';
            if (!st.started_at) st.started_at = now;
        } else if (action === 'done') {
            newStatus = 'done';
            if (!st.started_at) st.started_at = now;
            st.finished_at = now;
        } else if (action === 'cancel') {
            newStatus = 'canceled';
            if (!st.started_at) st.started_at = now;
            st.finished_at = now;
        } else if (action === 'reset') {
            newStatus = 'pending';
            st.started_at = null;
            st.finished_at = null;
        } else {
            return { status: 400, body: { error: 'INVALID_ACTION' } };
        }

        // Update stage
        st.status = newStatus;
        if (user?.id) st.actor_user_id = user.id;
        st.remarks = remarks ?? st.remarks ?? null;
        await st.save();

        // Rehitung percent & current_stage_id
        const total = inst.stages.length || 1;
        const doneCount = inst.stages.filter(x => x.status === 'done').length;
        inst.percent = Math.round((doneCount / total) * 100);

        const sorted = inst.stages.sort((a,b) => a.order_index - b.order_index);
        const current = sorted.find(x => !['done','canceled'].includes(x.status));
        inst.current_stage_id = current ? (current.stage_id || current.id) : null;

        if (inst.percent === 100) {
            // Map enum instance: ongoing|done|canceled (bukan in_progress)
            inst.status = 'done';
            inst.finished_at = inst.finished_at || now;
        } else if (inst.percent > 0 && inst.status !== 'done' && inst.status !== 'canceled') {
            inst.status = 'ongoing';
            inst.started_at = inst.started_at || now;
        }
        await inst.save();

        return {
            status: 200,
            body: {
                ok: true,
                data: { instance: inst, changed: st }
            }
        };
    }

    // ========== CATEGORY CRUD ==========
    async createCategory(req,res){
        try{
            const schema = req.schema; if(!schema) return res.status(400).json({error:'TENANT_REQUIRED'});
            const { name, description=null, stages=[] } = req.body;
            if(!name) return res.status(400).json({error:'INVALID_PAYLOAD'});
            const m = this._m(schema);

            const cat = await m.ProgressCategory.create({ name, description });
            if(Array.isArray(stages)){
                for(let i=0;i<stages.length;i++){
                    const s = stages[i];
                    await m.ProgressStage.create({
                        category_id: cat.id,
                        name: s.name,
                        order_index: i,
                        sla_hours: s.sla_hours||null,
                        color: s.color||null
                    });
                }
            }
            const withStages = await m.ProgressCategory.findByPk(cat.id, {
                include: [{ model: m.ProgressStage, as: 'stages', order: [['order_index','ASC']] }]
            });
            res.json({ ok:true, data: withStages });
        }catch(e){ res.status(500).json({error:'SERVER_ERROR', detail: e.message}); }
    }

    async listCategories(req,res){
        try{
            const schema = req.schema; if(!schema) return res.status(400).json({error:'TENANT_REQUIRED'});
            const m = this._m(schema);
            const rows = await m.ProgressCategory.findAll({
                include: [{ model: m.ProgressStage, as: 'stages', order: [['order_index','ASC']] }],
                order: [['created_at','DESC']]
            });
            res.json({ ok:true, data: rows });
        }catch(e){ res.status(500).json({error:'SERVER_ERROR', detail: e.message}); }
    }

    async updateCategory(req,res){
        try{
            const schema = req.schema; const { id } = req.params; const { name, description, stages } = req.body;
            const m = this._m(schema);
            const cat = await m.ProgressCategory.findByPk(id);
            if(!cat) return res.status(404).json({error:'NOT_FOUND'});
            await cat.update({ name: name??cat.name, description: description??cat.description });

            if(Array.isArray(stages)){
                await m.ProgressStage.destroy({ where: { category_id: id } });
                for(let i=0;i<stages.length;i++){
                    const s = stages[i];
                    await m.ProgressStage.create({
                        category_id: id, name: s.name, order_index: i,
                        sla_hours: s.sla_hours||null, color: s.color||null
                    });
                }
            }
            const withStages = await m.ProgressCategory.findByPk(id, {
                include: [{ model: m.ProgressStage, as: 'stages', order: [['order_index','ASC']] }]
            });
            res.json({ ok:true, data: withStages });
        }catch(e){ res.status(500).json({error:'SERVER_ERROR', detail: e.message}); }
    }

    async deleteCategory(req,res){
        try{
            const schema = req.schema; const { id } = req.params; const m = this._m(schema);
            await m.ProgressStage.destroy({ where: { category_id: id } });
            await m.ProgressCategory.destroy({ where: { id } });
            res.json({ ok:true });
        }catch(e){ res.status(500).json({error:'SERVER_ERROR', detail: e.message}); }
    }

    // ========== ASSIGN category to product ==========
    async assignCategoryToProduct(req,res){
        try{
            const schema = req.schema; const { product_id, category_id } = req.body; const m = this._m(schema);
            const product = await m.Product.findByPk(product_id);
            if(!product) return res.status(404).json({error:'PRODUCT_NOT_FOUND'});
            const cat = await m.ProgressCategory.findByPk(category_id);
            if(!cat) return res.status(404).json({error:'CATEGORY_NOT_FOUND'});
            await product.update({ progress_category_id: category_id });
            res.json({ ok:true });
        }catch(e){ res.status(500).json({error:'SERVER_ERROR', detail: e.message}); }
    }

    // ========== INSTANCES ==========
    async listInstances(req,res){
        try{
            const schema = req.schema; const user = req.user; if(!schema) return res.status(400).json({error:'TENANT_REQUIRED'});
            const { q='', status='', product_id='', page=1, limit=10 } = req.query;
            const m = this._m(schema);

            const where = {};
            if(status) where.status = status;
            if(product_id) where.product_id = product_id;
            if(q) where.product_name = { [Op.iLike]: `%${q}%` };

            const role = user?.role || user?.userRole || 'user';
            if(role==='admin') where.pic_user_id = user.id;

            const offset = (Number(page)-1)*Number(limit);
            const { rows, count } = await m.ProgressInstance.findAndCountAll({
                where,
                include: [
                    { model: m.ProgressCategory, as: 'category', attributes: ['id','name'] },
                    { model: m.ProgressInstanceStage, as: 'stages', separate: true, order: [['order_index','ASC']] },
                ],
                order: [['created_at','DESC']],
                offset, limit: Number(limit)
            });
            res.json({ ok:true, data: rows, meta: { page: Number(page), limit: Number(limit), total: count, pages: Math.ceil(count/Number(limit)) } });
        }catch(e){ res.status(500).json({error:'SERVER_ERROR', detail: e.message}); }
    }

    async getInstance(req,res){
        try{
            const schema = req.schema; const { id } = req.params; const user = req.user; const m = this._m(schema);
            const inst = await m.ProgressInstance.findByPk(id, {
                include: [
                    { model: m.ProgressInstanceStage, as: 'stages', separate: true, order: [['order_index','ASC']] },
                    { model: m.ProgressCategory, as: 'category', attributes: ['id','name'] }
                ]
            });

            if(!inst) return res.status(404).json({error:'NOT_FOUND'});
            const role = user?.role || user?.userRole || 'user';
            if(role==='admin' && inst.pic_user_id && inst.pic_user_id !== user.id){ return res.status(403).json({error:'FORBIDDEN'}); }
            res.json({ ok:true, data: inst });
        }catch(e){ res.status(500).json({error:'SERVER_ERROR', detail: e.message}); }
    }

    // ====== ENDPOINT JWT (FE / API publik)
    async updateStage(req,res){
        try{
            const schema = req.schema;
            const user = req.user;
            const { id, stage_id } = req.params;
            const { action, remarks=null } = req.body;

            const result = await this._updateStageCore({
                schema, user, instanceId: id, stageId: stage_id, action, remarks
            });
            if (result.status !== 200) return res.status(result.status).json(result.body);

            // Notify WA (best-effort)
            try {
                await axios.post(`${this._baseURL()}/api/whatsapp/progress/notify`, {
                    instance_id: result.body.data.instance.id,
                    stage_name: result.body.data.changed.name,
                    action,
                    data: {
                        status: result.body.data.changed.status,
                        percent: result.body.data.instance.percent,
                        remarks,
                        actor: user?.name || user?.username || 'System',
                    }
                }, {
                    headers: this._notifyHeaders(schema, {
                        authorization: req.headers['authorization'],
                        cookie: req.headers['cookie'],
                    }),
                    timeout: 10000
                });

                // Notifikasi ke pelanggan
                try {
                    await this._notifyCustomerProgress(schema, {
                        instance: result.body.data.instance,
                        changedStage: result.body.data.changed,
                        action,
                        remarks
                    }, {
                        authorization: req.headers['authorization'],
                        cookie: req.headers['cookie'],
                    });
                } catch (e) {
                    console.warn('[updateStage] Customer WA notify failed:', e?.message || e);
                }
            } catch (e) {
                console.warn('[updateStage] WhatsApp notification failed:', e?.message || e);
            }

            res.status(200).json(result.body);
        }catch(e){
            console.error('[updateStage] Error:', e);
            res.status(500).json({error:'SERVER_ERROR', detail: e.message});
        }
    }

    // ====== ENDPOINT INTERNAL (dipanggil WA handler, tanpa JWT)
    async updateStageInternal(req,res){
        try{
            const schema = req.schema;
            const { id, stage_id } = req.params;
            const { action, remarks=null } = req.body;

            // user null → skip RBAC
            const result = await this._updateStageCore({
                schema, user: null, instanceId: id, stageId: stage_id, action, remarks
            });
            if (result.status !== 200) return res.status(result.status).json(result.body);

            // Notify WA (best-effort) pakai X-Internal-Key
            try {
                await axios.post(`${this._baseURL()}/api/whatsapp/progress/notify`, {
                    instance_id: result.body.data.instance.id,
                    stage_name: result.body.data.changed.name,
                    action,
                    data: {
                        status: result.body.data.changed.status,
                        percent: result.body.data.instance.percent,
                        remarks,
                        actor: 'System', // tidak ada req.user
                    }
                }, {
                    headers: this._notifyHeaders(schema, /* no req headers */ null),
                    timeout: 10000
                });

                // Notifikasi ke pelanggan (pakai X-Internal-Key)
                try {
                    await this._notifyCustomerProgress(schema, {
                        instance: result.body.data.instance,
                        changedStage: result.body.data.changed,
                        action,
                        remarks
                    }, /* no req headers */ null);
                } catch (e) {
                    console.warn('[updateStageInternal] Customer WA notify failed:', e?.message || e);
                }

            } catch (e) {
                console.warn('[updateStageInternal] WhatsApp notification failed:', e?.message || e);
            }

            res.status(200).json(result.body);
        }catch(e){
            console.error('[updateStageInternal] Error:', e);
            res.status(500).json({error:'SERVER_ERROR', detail: e.message});
        }
    }

    async reassignPIC(req,res){
        try{
            const schema = req.schema; const user = req.user; const { id } = req.params; const { pic_user_id } = req.body; const m = this._m(schema);
            const inst = await m.ProgressInstance.findByPk(id);
            if(!inst) return res.status(404).json({error:'NOT_FOUND'});
            const role = user?.role || user?.userRole || 'user';
            if(!['owner','manager'].includes(role)) return res.status(403).json({error:'FORBIDDEN'});
            inst.pic_user_id = pic_user_id;
            await inst.save();
            res.json({ ok:true });
        }catch(e){ res.status(500).json({error:'SERVER_ERROR', detail: e.message}); }
    }
}

module.exports = new ProgresController();
