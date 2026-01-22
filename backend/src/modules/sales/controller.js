// modules/sales/controller.js
const { Op } = require('sequelize');
const moment = require('moment');
const TenantModelLoader = require('../../tenants/loader');

function pad4(n){ return n.toString().padStart(4,'0'); }
async function genResiNo(sequelize, schema){
    // counter per hari per schema — simple & transactional-safe
    const key = `SO-${moment().format('YYYYMMDD')}`;
    await sequelize.query(`CREATE TABLE IF NOT EXISTS "${schema}"."_counters" (key text primary key, val integer not null default 0);`);
    const [rows] = await sequelize.query(
        `INSERT INTO "${schema}"."_counters"(key,val) VALUES ($1,1)
     ON CONFLICT (key) DO UPDATE SET val = "${schema}"."_counters".val + 1
     RETURNING val`,
        { bind: [key] }
    );
    const seq = rows[0].val;
    return `${key}-${pad4(seq)}`;
}

// helper HTML template minimalis
// helper HTML template modern TANPA CSS variables
function printLayout({ title, body, theme = {}, cssExtra = '' }) {
    const primary   = theme?.primary   || '#0ea5e9';
    const secondary = theme?.secondary || '#111827';
    const mode      = (theme?.mode || 'light').toLowerCase();

    const BG     = mode === 'dark' ? '#0b0c10' : '#f8fafc';
    const CARD   = mode === 'dark' ? '#111827' : '#ffffff';
    const TEXT   = mode === 'dark' ? '#e5e7eb' : '#0f172a';
    const MUTED  = mode === 'dark' ? '#9ca3af' : '#64748b';
    const BORDER = mode === 'dark' ? '#1f2937' : '#e5e7eb';

    return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { height: 100%; }
    body {
      margin: 0; padding: 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Helvetica Neue", "Noto Sans", "Liberation Sans", sans-serif;
      color: ${TEXT};
      background-color: ${BG};
    }
    .doc {
      max-width: 960px; margin: 0 auto;
      background-color: ${CARD};
      border-width: 1px; border-style: solid; border-color: ${BORDER};
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(2, 6, 23, 0.08);
      overflow: hidden;
    }
    .section { padding: 24px; }
    .header {
      display: grid; grid-template-columns: 1fr auto; gap: 16px;
      border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: ${BORDER};
      background: linear-gradient(180deg, rgba(14, 165, 233, 0.06), transparent 60%);
    }
    .brand { display: flex; gap: 16px; align-items: center; }
    .logo {
      width: 64px; height: 64px; border-radius: 12px;
      border-width: 1px; border-style: solid; border-color: ${BORDER};
      object-fit: cover; background-color: #ffffff;
    }
    .brand h1 { margin: 0; font-size: 18px; letter-spacing: .2px; }
    .brand small { color: ${MUTED}; display: block; margin-top: 4px; }
    .meta {
      text-align: right; font-size: 12px; color: ${MUTED};
      display: grid; align-content: center; gap: 6px; min-width: 260px;
    }
    .badge {
      display: inline-block; padding: 4px 10px; border-radius: 999px;
      background-color: rgba(14, 165, 233, 0.12);
      color: ${primary};
      border-width: 1px; border-style: solid; border-color: rgba(14, 165, 233, 0.30);
      font-weight: 600; letter-spacing: .3px;
    }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .box {
      border-width: 1px; border-style: solid; border-color: ${BORDER};
      border-radius: 12px; padding: 16px;
      background: linear-gradient(180deg, rgba(2, 6, 23, 0.02), transparent 60%);
    }
    .box .title { font-size: 12px; color: ${MUTED}; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .6px; }
    .box .value { font-size: 14px; }

    table { width: 100%; border-collapse: collapse; }
    thead th {
      font-size: 12px; text-transform: uppercase; letter-spacing: .6px;
      color: ${MUTED}; text-align: left; padding: 12px;
      border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: ${BORDER};
      background-color: rgba(2, 6, 23, 0.02);
    }
    tbody td {
      padding: 12px;
      border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: ${BORDER};
      vertical-align: top;
    }
    tbody tr:nth-child(odd) { background-color: rgba(2, 6, 23, 0.015); }
    .right { text-align: right; }
    .muted { color: ${MUTED}; }

    .totals {
      display: grid; grid-template-columns: 1fr 340px; gap: 16px; align-items: start; margin-top: 16px;
    }
    .totals-card {
      border-width: 1px; border-style: solid; border-color: ${BORDER};
      border-radius: 12px; padding: 16px; background-color: #ffffff;
      box-shadow: 0 6px 18px rgba(2, 6, 23, 0.06);
    }
    .totals-row { display: grid; grid-template-columns: 1fr auto; padding: 6px 0; }
    .totals-row strong { font-size: 16px; }

    .footer {
      display: grid; grid-template-columns: 1fr auto; align-items: end;
      border-top-width: 1px; border-top-style: solid; border-top-color: ${BORDER};
      margin-top: 8px; padding-top: 16px; color: ${MUTED}; font-size: 12px;
    }
    .sign { text-align: center; }
    .sign .line {
      margin-top: 56px; width: 240px; margin-left: auto; margin-right: auto;
      border-top-width: 1px; border-top-style: solid; border-top-color: #000000;
    }

    .pill {
      display: inline-flex; gap: 8px; align-items: center;
      padding: 6px 10px;
      border-width: 1px; border-style: solid; border-color: ${BORDER};
      border-radius: 999px; font-size: 12px;
      background-color: #ffffff;
    }
    .pill b { color: ${secondary}; }

    @media print {
      body { padding: 0; background-color: #ffffff; }
      .doc { border-width: 0; border-radius: 0; box-shadow: none; }
      .section { padding: 16px 20px; }
      .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      a[href]:after { content: ""; }
    }

    ${cssExtra}
  </style>
</head>
<body>
  <div class="doc">
    ${body}
  </div>
</body>
</html>`;
}

function pickPriceOr(base, v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : Number(base || 0);
}

function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function firstPositive(...vals){
    for (const v of vals) { const n = num(v); if (n > 0) return n; }
    return 0;
}

// --- di atas class SalesController (setelah require & helper lain) ---
async function _instantiateProgressForSales(sequelize, schema, soId, tx) {
    const m = {
        SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
        SalesOrderItem: TenantModelLoader.getModel('SalesOrderItem', schema),
        Product: TenantModelLoader.getModel('Product', schema),
        ProgressCategory: TenantModelLoader.getModel('ProgressCategory', schema),
        ProgressStage: TenantModelLoader.getModel('ProgressStage', schema),
        ProgressInstance: TenantModelLoader.getModel('ProgressInstance', schema),
        ProgressInstanceStage: TenantModelLoader.getModel('ProgressInstanceStage', schema),
        Employee: TenantModelLoader.getModel('Employee', schema),
        User: TenantModelLoader.getModel('User', schema),
    };

    const so = await m.SalesOrder.findByPk(soId, { transaction: tx });
    if (!so) return [];

    let pic_user_id = null;
    if (so.processed_by_employee_id) {
        const emp = await m.Employee.findByPk(so.processed_by_employee_id, { transaction: tx });
        pic_user_id = emp?.user_id || null;
    }
    if (!pic_user_id && so.created_by_user_id) pic_user_id = so.created_by_user_id;

    const notifications = []; // <— NEW: kumpulkan (instanceId, stageId, stageName)

    const items = await m.SalesOrderItem.findAll({ where: { sales_order_id: soId }, transaction: tx });
    for (const it of items) {
        const product = await m.Product.findByPk(it.product_id, { transaction: tx });
        if (!product || !product.progress_category_id) continue;

        const category = await m.ProgressCategory.findByPk(product.progress_category_id, {
            include: [{
                model: m.ProgressStage,
                as: 'stages',
                attributes: ['id', 'name', 'order_index', 'sla_hours', 'color', 'category_id', 'created_at', 'updated_at']
            }],
            transaction: tx
        });

        if (!category) continue;

        const stages = (category.stages || []).sort((a, b) => a.order_index - b.order_index);

        const inst = await m.ProgressInstance.create({
            sales_order_id: so.id,
            sales_order_item_id: it.id,
            product_id: product.id,
            product_name: it.product_name_snap || product.name,
            category_id: category.id,
            pic_user_id,
            current_stage_id: stages[0]?.id || null,
            percent: 0,
            status: 'ongoing',
            started_at: new Date()
        }, { transaction: tx });

        for (const s of stages) {
            await m.ProgressInstanceStage.create({
                instance_id: inst.id,
                stage_id: s.id,
                name: s.name,
                order_index: s.order_index,
                status: 'pending'
            }, { transaction: tx });
        }

        if (stages[0]) {
            notifications.push({
                instanceId: inst.id,
                stageId: stages[0].id,
                stageName: stages[0].name
            });
        }
    }

    return notifications; // <— NEW
}

// ===== WhatsApp helpers (send ke customer) =====
const WA_SEND_PATH = "/whatsapp/send";

function _buildBaseApi() {
    let base = (process.env.API_BASE_URL || "http://localhost:5000")
        .trim()
        .replace(/^htpps:\/\//i, "https://");
    if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
    base = base.replace(/\/+$/, "");
    const hasApi = /\/api(\/|$)/i.test(base);
    return { base, hasApi };
}

function _forwardHeaders(req, schema) {
    const auth = req.headers["authorization"];
    const cookie = req.headers["cookie"];
    return {
        "X-Tenant": schema,
        ...(auth ? { Authorization: auth } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
    };
}

// ===== Helper kecil (taruh dekat helper lain di file ini) =====
function _idr(n){ return `Rp ${Number(n||0).toLocaleString('id-ID')}`; }
function _nullable(s){ return (s && String(s).trim()) ? String(s).trim() : null; }
function _safeUrl(u){
    if(!u) return null;
    let x = String(u).trim();
    if(/^htpps:\/\//i.test(x)) x = x.replace(/^htpps:\/\//i, 'https://');
    if(!/^https?:\/\//i.test(x)) x = 'https://' + x.replace(/^\/+/, '');
    return x;
}
function _formatTelForText(telp){
    if(!telp) return null;
    let d = String(telp).replace(/[^\d+]/g,'');
    if(d.startsWith('+')) d = d.slice(1);
    if(d.startsWith('0')) d = '62' + d.slice(1);
    if(!/^\d{7,15}$/.test(d)) return null;
    return d; // untuk wa.me/ link
}


function _normalizePhoneToJid(raw) {
    if (!raw) return null;
    let digits = String(raw).replace(/[^\d+]/g, "");
    if (digits.startsWith("+")) digits = digits.slice(1);
    if (digits.startsWith("0")) digits = "62" + digits.slice(1);
    // kalau sudah 62… biarkan
    if (!/^\d{7,15}$/.test(digits)) return null;
    return `${digits}@s.whatsapp.net`;
}

// --- Ambil nama petugas untuk SO (prioritas created_by_user_id) ---
async function _getPetugasName(schema, so) {
    const m = {
        User: TenantModelLoader.getModel('User', schema),
        Employee: TenantModelLoader.getModel('Employee', schema),
    };

    // 1) created_by_user_id (sesuai permintaan "seperti tadi")
    if (so?.created_by_user_id) {
        const u = await m.User.findByPk(so.created_by_user_id);
        if (u?.name) return u.name;
    }

    // 2) fallback: processed_by_employee_id -> Employee.name atau user_id->User.name
    if (so?.processed_by_employee_id) {
        const e = await m.Employee.findByPk(so.processed_by_employee_id);
        if (e?.name) return e.name;
        if (e?.user_id) {
            const u2 = await m.User.findByPk(e.user_id);
            if (u2?.name) return u2.name;
        }
    }

    return "-";
}

async function _sendWhatsAppText(req, schema, toJid, body) {
    const axios = require("axios");
    const { base, hasApi } = _buildBaseApi();
    const headers = _forwardHeaders(req, schema);
    const session_id = await _pickDefaultWaSessionId(schema);
    if (!session_id) throw new Error("NO_CONNECTED_WA_SESSION");
    const url = `${base}${hasApi ? "" : "/api"}/whatsapp/send/text`;
    await axios.post(url, { session_id, to: toJid, message: body }, { headers, timeout: 15000 });
}

async function _sendWhatsAppDocument(req, schema, toJid, filename, pdfBase64, caption = "") {
    const axios = require("axios");
    const { base, hasApi } = _buildBaseApi();
    const headers = _forwardHeaders(req, schema);
    const session_id = await _pickDefaultWaSessionId(schema);
    if (!session_id) throw new Error("NO_CONNECTED_WA_SESSION");
    const url = `${base}${hasApi ? "" : "/api"}/whatsapp/send/document`;
    await axios.post(url, {
        session_id,
        to: toJid,
        filename,
        mimetype: "application/pdf",
        base64: pdfBase64,
        caption
    }, { headers, timeout: 30000 });
}

// Render HTML → PDF (Puppeteer)
async function _renderHtmlToPdfBuffer(html) {
    const puppeteer = require("puppeteer");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
        });
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

// ===== Compose Nota HTML langsung dari DB (tanpa HTTP) =====
async function _composeNotaHtml(schema, salesId) {
    const m = {
        SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
        SalesOrderItem: TenantModelLoader.getModel('SalesOrderItem', schema),
        CompanyProfile: TenantModelLoader.getModel('CompanyProfile', schema),
        Branch: TenantModelLoader.getModel('Branch', schema),
    };

    const so = await m.SalesOrder.findByPk(salesId, { include: [{ model: m.SalesOrderItem, as: 'items' }] });
    if (!so) throw new Error('SALES_NOT_FOUND_FOR_PDF');

    const company = await m.CompanyProfile.findOne();
    const branch  = so.branch_id ? await m.Branch.findByPk(so.branch_id) : null;

    const itemsRows = (so.items||[]).map((it,i)=>`
    <tr>
      <td class="muted">${String(i+1).padStart(2,'0')}</td>
      <td>
        <div><strong>${it.product_name_snap || '-'}</strong></div>
        <div class="muted">${it.sku_snap || ''}</div>
      </td>
      <td class="right">
        ${it.is_area ? `${Number(it.area_w||0)} × ${Number(it.area_h||0)}` : Number(it.qty||0)}
      </td>
      <td class="right">
        ${(it.is_area ? (it.area_unit_price||0) : (it.unit_price||0)).toLocaleString('id-ID')}
      </td>
      <td class="right"><strong>${Number(it.subtotal||0).toLocaleString('id-ID')}</strong></td>
    </tr>
  `).join('');

    const paymentPill = `
    <span class="pill">
      <span>Status:</span> <b>${so.payment_status?.toUpperCase() || '-'}</b>
    </span>
  `;
    const txPill = `
    <span class="pill">
      <span>Transaksi:</span> <b>${so.transaction_type?.toUpperCase() || '-'}</b>
    </span>
  `;

    const body = `
    <div class="header section">
      <div class="brand">
        ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" class="logo" />` : `<div class="logo" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;">LOGO</div>`}
        <div>
          <h1>${company?.name || 'Perusahaan'}</h1>
          <small>${company?.address || ''}${company?.phone ? ' • '+company.phone : ''}${company?.email ? ' • '+company.email : ''}</small>
        </div>
      </div>
      <div class="meta">
        <div><span class="badge">NOTA</span></div>
        <div>No. Resi: <strong style="color:${(company?.theme?.secondary || '#111827')}">${so.resi_no}</strong></div>
        <div>Tanggal: ${new Date(so.created_at||so.createdAt).toLocaleString('id-ID')}</div>
        ${branch ? `<div>Cabang: ${branch.name}</div>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="grid-2">
        <div class="box">
          <div class="title">Kepada</div>
          <div class="value"><strong>${so.customer_name}</strong></div>
          ${so.deadline_at ? `<div class="muted" style="margin-top:6px">Deadline: ${new Date(so.deadline_at).toLocaleString('id-ID')}</div>`:''}
        </div>
        <div class="box" style="display:flex; gap:10px; align-items:center; justify-content:flex-start; flex-wrap:wrap;">
          ${paymentPill} ${txPill}
          <span class="pill"><span>Progres:</span> <b>${so.progress_status || '-'}</b></span>
        </div>
      </div>

      <div class="box" style="padding:0; margin-top:16px;">
        <table>
          <thead>
            <tr>
              <th style="width:56px">#</th>
              <th>Deskripsi</th>
              <th class="right" style="width:140px">Qty/Area</th>
              <th class="right" style="width:140px">Harga</th>
              <th class="right" style="width:160px">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div>${so.notes ? `<div class="box"><div class="title">Catatan</div><div class="value">${so.notes}</div></div>`:''}</div>
        <div class="totals-card">
          <div class="totals-row"><span>Subtotal</span><span class="right">${Number(so.subtotal).toLocaleString('id-ID')}</span></div>
          <div class="totals-row"><span>Diskon</span><span class="right">-${Number(so.discount).toLocaleString('id-ID')}</span></div>
          <div class="totals-row" style="margin-top:4px;"><strong>Total</strong><strong class="right">${Number(so.total).toLocaleString('id-ID')}</strong></div>
          <div class="totals-row"><span>Terbayar</span><span class="right">${Number(so.paid_amount).toLocaleString('id-ID')}</span></div>
          <div class="totals-row"><span>Sisa</span><span class="right">${Number(so.balance).toLocaleString('id-ID')}</span></div>
        </div>
      </div>

      <div class="footer" style="margin-top:20px;">
        <div>Dicetak: ${new Date().toLocaleString('id-ID')}</div>
        <div class="sign">
          <div>Petugas Nota</div>
          <div class="line"></div>
        </div>
      </div>
    </div>
  `;

    return printLayout({
        title: `Nota ${so.resi_no}`,
        body,
        theme: company?.theme || { mode: 'light', primary: '#0ea5e9', secondary: '#111827' }
    });
}

// === Data composer: ambil semua yang dibutuhkan untuk nota ===
async function _composeNotaData(schema, salesId) {
    const m = {
        SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
        SalesOrderItem: TenantModelLoader.getModel('SalesOrderItem', schema),
        CompanyProfile: TenantModelLoader.getModel('CompanyProfile', schema),
        Branch: TenantModelLoader.getModel('Branch', schema),
    };

    const so = await m.SalesOrder.findByPk(salesId, {
        include: [{ model: m.SalesOrderItem, as: 'items' }]
    });
    if (!so) throw new Error('SALES_NOT_FOUND_FOR_PDF');

    const company = await m.CompanyProfile.findOne();
    const branch  = so.branch_id ? await m.Branch.findByPk(so.branch_id) : null;
    const petugasName = await _getPetugasName(schema, so);

    return { so, company, branch, petugasName  };
}

// === PDF renderer: mirror layout HTML menggunakan PDFKit (LANDSCAPE) ===
async function _renderNotaPdfWithPdfkit({ so, company, branch, petugasName }) {
    const PDFDocument = require('pdfkit');
    const axios = require('axios');

    // ===== THEME (selaras HTML) =====
    const theme = company?.theme || { mode: 'light', primary: '#0ea5e9', secondary: '#111827' };
    const primary   = theme.primary   || '#0ea5e9';
    const secondary = theme.secondary || '#111827';
    const TEXT   = theme.mode === 'dark' ? '#e5e7eb' : '#0f172a';
    const MUTED  = theme.mode === 'dark' ? '#9ca3af' : '#64748b';
    const BORDER = theme.mode === 'dark' ? '#1f2937' : '#e5e7eb';

    // ===== helpers =====
    const money = n => Number(n || 0).toLocaleString('id-ID');
    const dt    = d => (d ? new Date(d).toLocaleString('id-ID') : '-');

    async function loadLogo(doc, urlOrPath, x, y, w, h) {
        if (!urlOrPath) return false;
        try {
            if (/^https?:\/\//i.test(urlOrPath)) {
                const resp = await axios.get(urlOrPath, { responseType: 'arraybuffer', timeout: 8000 });
                const buf = Buffer.from(resp.data);
                doc.image(buf, x, y, { width: w, height: h });
            } else {
                doc.image(urlOrPath, x, y, { width: w, height: h });
            }
            return true;
        } catch { return false; }
    }

    function pill(doc, x, y, left, right) {
        const padX = 8, padY = 4;
        doc.save();
        doc.fontSize(9).font('Helvetica');
        const textAll = `${left} ${right}`;
        const width = doc.widthOfString(textAll) + padX * 2;
        const height = doc.currentLineHeight() + padY * 2;
        doc.lineWidth(1).fillColor('#fff').strokeColor(BORDER);
        doc.roundedRect(x, y, width, height, 999).fillAndStroke('#fff', BORDER);
        doc.fillColor(MUTED).text(left, x + padX, y + padY, { continued: true });
        doc.fillColor(secondary).font('Helvetica-Bold').text(` ${right}`);
        doc.restore();
        return { width, height };
    }

    function badge(doc, x, y, text) {
        doc.save();
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primary).strokeColor(primary);
        const padX = 10, padY = 3;
        const w = doc.widthOfString(text) + padX * 2;
        const h = doc.currentLineHeight() + padY * 2;
        doc.roundedRect(x, y, w, h, 999).stroke();
        doc.text(text, x + padX, y + padY);
        doc.restore();
        return { w, h };
    }

    function drawTableHeader(doc, x, y, widths, headers) {
        const totalW = widths.reduce((a, b) => a + b, 0);
        doc.save();
        doc.rect(x, y, totalW, 22).fillOpacity(0.04).fill('#000').fillOpacity(1);
        let cx = x;
        headers.forEach((h, i) => {
            const align = (i >= headers.length - 3) ? 'right' : 'left';
            doc.fontSize(9).fillColor(MUTED)
                .text(h, cx + 8, y + 5, { width: widths[i] - 16, align });
            cx += widths[i];
        });
        doc.restore();
        return y + 22;
    }

    function drawTableRow(doc, x, y, widths, cells, zebra) {
        const totalW = widths.reduce((a, b) => a + b, 0);
        doc.save();
        if (zebra) {
            doc.rect(x, y, totalW, 22).fillOpacity(0.03).fill('#000').fillOpacity(1);
        }
        let cx = x;
        cells.forEach((c, i) => {
            const align = (i >= cells.length - 3) ? 'right' : 'left';
            doc.fontSize(10).fillColor(TEXT)
                .text(String(c), cx + 8, y + 4, { width: widths[i] - 16, align });
            cx += widths[i];
        });
        doc.strokeColor(BORDER).lineWidth(0.6)
            .moveTo(x, y + 22).lineTo(x + totalW, y + 22).stroke();
        doc.restore();
        return y + 22;
    }

    return new Promise(async (resolve, reject) => {
        // === LANDSCAPE ===
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 24 });
        const bufs = [];
        doc.on('data', d => bufs.push(d));
        doc.on('end', () => resolve(Buffer.concat(bufs)));
        doc.on('error', reject);

        // ===== FRAME / CARD =====
        const pageW = doc.page.width, pageH = doc.page.height;
        const cardX = 24, cardY = 24, cardW = pageW - 48, cardH = pageH - 48, radius = 12;

        doc.save().lineWidth(1).strokeColor(BORDER)
            .roundedRect(cardX, cardY, cardW, cardH, radius).stroke().restore();

        let y = cardY + 16;

        // ===== HEADER (brand kiri + meta kanan) =====
        const leftX = cardX + 16;
        const rightW = 320;                // meta min width (lebih lega di landscape)
        const rightX = cardX + cardW - 16 - rightW;
        const logoSize = 56;

        // logo
        const ok = await loadLogo(doc, company?.logo_url, leftX, y, logoSize, logoSize);
        if (!ok) {
            doc.rect(leftX, y, logoSize, logoSize).strokeColor(BORDER).stroke();
            doc.fontSize(8).fillColor(MUTED).text('LOGO', leftX + 16, y + 20);
        }

        // brand text
        doc.fontSize(14).fillColor(TEXT).font('Helvetica-Bold')
            .text(company?.name || 'Perusahaan', leftX + logoSize + 12, y);
        doc.fontSize(9).fillColor(MUTED).font('Helvetica')
            .text(
                [company?.address, company?.phone, company?.email].filter(Boolean).join(' • '),
                leftX + logoSize + 12, y + 20, { width: rightX - (leftX + logoSize + 12) - 8 }
            );

        // meta
        badge(doc, rightX + rightW - 64, y, 'NOTA');
        doc.fontSize(9).fillColor(MUTED).font('Helvetica')
            .text('', rightX, y + 22, { width: rightW, align: 'right', continued: true })
            .fillColor(secondary).font('Helvetica-Bold').text(so.resi_no);
        doc.fillColor(MUTED).font('Helvetica')
            .text(`Tanggal: ${dt(so.created_at || so.createdAt)}`, rightX, y + 38, { width: rightW, align: 'right' });
        if (branch?.name) {
            doc.text(`Cabang: ${branch.name}`, rightX, y + 54, { width: rightW, align: 'right' });
        }

        // garis bawah header
        y += 78;
        doc.save().strokeColor(BORDER).lineWidth(1)
            .moveTo(cardX, y).lineTo(cardX + cardW, y).stroke().restore();

        // ===== GRID-2 info (Kepada + Pills) =====
        y += 12;
        const gap = 16;
        const colW = (cardW - 16 * 3) / 2;

        // box kiri "Kepada"
        doc.save().lineWidth(1).strokeColor(BORDER).roundedRect(cardX + 16, y, colW, 70, 8).stroke().restore();
        doc.fontSize(9).fillColor(MUTED).text('Kepada', cardX + 28, y + 10);
        doc.fontSize(12).fillColor(TEXT).font('Helvetica-Bold').text(so.customer_name || '-', cardX + 28, y + 28);
        if (so.deadline_at) {
            doc.fontSize(9).fillColor(MUTED).font('Helvetica')
                .text(`Deadline: ${dt(so.deadline_at)}`, cardX + 28, y + 46);
        }

        // box kanan "pills"
        const pillsX = cardX + 16 + colW + gap;
        doc.save().lineWidth(1).strokeColor(BORDER).roundedRect(pillsX, y, colW, 70, 8).stroke().restore();
        let px = pillsX + 12, py = y + 22;
        const p1 = pill(doc, px, py, 'Status:', (so.payment_status || '-').toUpperCase()); px += p1.width + 8;
        const p2 = pill(doc, px, py, 'Transaksi:', (so.transaction_type || '-').toUpperCase()); px += p2.width + 8;
        pill(doc, px, py, 'Progres:', (so.progress_status || '-'));

        // ===== TABEL ITEMS =====
        y += 70 + 12;
        // kotak tabel
        const tableX = cardX + 16, tableW = cardW - 32;
        // kolom: #, Deskripsi (lebar), Qty/Area, Harga, Subtotal
        const widths = [56, tableW - (56 + 140 + 160 + 180), 140, 160, 180];

        // header
        let ty = drawTableHeader(doc, tableX, y, widths, ['#', 'Deskripsi', 'Qty/Area', 'Harga', 'Subtotal']);

        // rows
        (so.items || []).forEach((it, i) => {
            const qtyOrArea = it.is_area
                ? `${Number(it.qty || 0)} × ${Number(it.area_w || 0)} × ${Number(it.area_h || 0)}`
                : Number(it.qty || 0);
            const harga = it.is_area ? (it.area_unit_price || 0) : (it.unit_price || 0);
            const cells = [
                String(i + 1).padStart(2, '0'),
                `${it.product_name_snap || '-'}${it.sku_snap ? '\n' + (it.sku_snap || '') : ''}`,
                qtyOrArea,
                money(harga),
                money(it.subtotal || 0),
            ];

            ty = drawTableRow(doc, tableX, ty, widths, cells, i % 2 === 0);
        });

        // ===== TOTALS + CATATAN =====
        y = ty + 14;

        // kolom kiri: Catatan (opsional)
        const totalsW = 360;                         // card totals 360px agar mirip HTML
        const leftW   = tableW - totalsW - 16;       // sisa ruang untuk catatan
        if (so.notes) {
            doc.save().lineWidth(1).strokeColor(BORDER)
                .roundedRect(tableX, y, leftW, 90, 8).stroke().restore();
            doc.fontSize(9).fillColor(MUTED).text('Catatan', tableX + 12, y + 10);
            doc.fontSize(10).fillColor(TEXT)
                .text(so.notes, tableX + 12, y + 28, { width: leftW - 24 });
        }

        // kolom kanan: totals card
        const totalsX = tableX + leftW + 16, totalsH = 122;
        doc.save().lineWidth(1).strokeColor(BORDER)
            .roundedRect(totalsX, y, totalsW, totalsH, 8).stroke().restore();

        function totalRow(label, val, bold = false, offset = 0) {
            doc.fontSize(bold ? 12 : 10).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(TEXT);
            doc.text(label, totalsX + 12, y + 12 + offset, { width: totalsW / 2 - 12 });
            doc.text(val, totalsX + totalsW / 2, y + 12 + offset, { width: totalsW / 2 - 12, align: 'right' });
        }
        totalRow('Subtotal',  money(so.subtotal), false, 0);
        totalRow('Diskon',   `-${money(so.discount)}`, false, 20);
        totalRow('Total',     money(so.total), true, 40);
        totalRow('Terbayar',  money(so.paid_amount), false, 66);
        totalRow('Sisa',      money(so.balance), false, 88);

        // ===== FOOTER =====
        const footY = y + Math.max(totalsH, so.notes ? 90 : 0) + 16;
        doc.save().strokeColor(BORDER).lineWidth(1)
            .moveTo(cardX, footY).lineTo(cardX + cardW, footY).stroke().restore();

        doc.fontSize(9).fillColor(MUTED).text(`Dicetak: ${dt(new Date())}`, cardX + 16, footY + 8);

        const signW = 260, signX = cardX + cardW - 16 - signW;
        doc.fontSize(10).fillColor(TEXT)
            .text('Petugas Nota', signX, footY + 8, { width: signW, align: 'center' });
        doc.save().strokeColor('#000').lineWidth(0.7)
            .moveTo(signX + 24, footY + 62).lineTo(signX + signW - 24, footY + 62).stroke().restore();
        doc.fontSize(11).fillColor(TEXT).font('Helvetica-Bold')
            .text(petugasName || '-', signX, footY + 66, { width: signW, align: 'center' });

        doc.end();
    });
}

async function _pickDefaultWaSessionId(schema) {
    const WaSession = TenantModelLoader.getModel("WaSession", schema);
    const row = await WaSession.findOne({
        where: { status: "connected" },
        order: [["updated_at", "DESC"]],
    });
    return row?.id || null;
}


class SalesController {



    // Kirim WA ke customer: ringkasan + PDF nota
    // ==== REPLACE method ini seluruhnya ====
    async _notifyCustomerWithInvoice(req, schema, soId) {
        const m = this._m(schema);
        const so = await m.SalesOrder.findByPk(soId, {
            include: [{ model: m.SalesOrderItem, as: "items" }],
        });
        if (!so) return;

        const petugasName = await _getPetugasName(schema, so);

        // Ambil nomor telp customer
        let phone = null;
        if (so.customer_id) {
            const cust = await m.Customer.findByPk(so.customer_id);
            phone = cust?.phone || null;
        }
        if (!phone) return;

        const toJid = _normalizePhoneToJid(phone);
        if (!toJid) return;

        // === Ambil profil perusahaan & cabang utk pesan + caption PDF ===
        const company = await m.CompanyProfile.findOne();
        const branch  = so.branch_id ? await m.Branch.findByPk(so.branch_id) : null;

        const compName   = company?.name || 'Perusahaan';
        const compAddr   = _nullable(company?.address);
        const compPhone  = _nullable(company?.phone);
        const compEmail  = _nullable(company?.email);
        const compWeb    = _safeUrl(_nullable(company?.website || company?.site_url));
        const compIg     = _safeUrl(_nullable(company?.instagram_url || company?.instagram));
        const svcHours   = _nullable(company?.service_hours || company?.meta?.service_hours); // opsional (mis. "Senin–Sabtu 08.00–17.00 WITA")
        const tagline    = _nullable(company?.tagline || company?.meta?.tagline);
        const waClickNum = _formatTelForText(compPhone);

        // === Build header & ringkasan profesional
        const lines = [];
        lines.push(`*${compName}*`);
        if (tagline) lines.push(`_${tagline}_`);
        lines.push("────────────────────────");

        lines.push("🧾 *Konfirmasi Pesanan Berhasil*");
        lines.push("");
        lines.push(`• *No. Resi:* ${so.resi_no}`);
        lines.push(`• *Nama:* ${so.customer_name || "-"}`);
        const tgl = new Date(so.created_at || so.createdAt);
        lines.push(`• *Tanggal:* ${tgl.toLocaleString("id-ID")}`);
        if (so.deadline_at) lines.push(`• *Deadline:* ${new Date(so.deadline_at).toLocaleString("id-ID")}`);
        lines.push(`• *Total:* ${_idr(so.total)}`);
        lines.push(`• *Terbayar:* ${_idr(so.paid_amount)}`);
        lines.push(`• *Sisa:* ${_idr(so.balance)}`);
        lines.push(`• *Status Pembayaran:* ${(so.payment_status || '-').toUpperCase()}`);
        if (so.transaction_type) lines.push(`• *Tipe Transaksi:* ${(so.transaction_type||'-').toUpperCase()}`);
        if (branch?.name) lines.push(`• *Cabang:* ${branch.name}`);
        lines.push("");

        // === Preview items (maks 5)
        lines.push("📦 *Ringkasan Item*");
        const items = (so.items || []);
        items.slice(0, 5).forEach((it, i) => {
            const qtyOrArea = it.is_area
                ? `${Number(it.qty || 0)} buah • ${Number(it.area_w || 0)}×${Number(it.area_h || 0)}`
                : `${Number(it.qty || 0)} pcs`;
            lines.push(`${i + 1}. ${it.product_name_snap || "-"} — ${qtyOrArea}`);
        });
        if (items.length > 5) {
            lines.push(`… dan ${items.length - 5} item lainnya`);
        }
        lines.push("");
        lines.push(`• *Petugas:* ${petugasName}`);
        lines.push("");

        // === Jika masih ada sisa, beri instruksi pembayaran yang sopan
        if (Number(so.balance) > 0) {
            lines.push("💳 *Pembayaran (Sisa Tagihan)*");
            lines.push(`Mohon menyelesaikan sisa pembayaran sebesar *${_idr(so.balance)}*.`);
            // Jika Anda punya info Rekening/QR di company.meta, bisa ditambahkan di sini:
            // const bank = company?.meta?.bank_info; // mis. "BCA 123456 a.n. PT ..."
            // if (bank) lines.push(`• ${bank}`);
            lines.push("");
        }

        // === CTA Cek Progres
        lines.push("🚀 *Cek Progres Produksi*");
        lines.push(`Balas chat ini dengan:`);
        lines.push(`*CEK PROGRES ${so.resi_no}*`);
        lines.push("untuk mendapatkan update status pengerjaan Anda.");
        lines.push("");

        // === “Pemanis” (ucapan & jam layanan)
        lines.push("🙏 Terima kasih telah mempercayakan kebutuhan Anda kepada kami.");
        if (svcHours) lines.push(`🕒 *Jam Layanan:* ${svcHours}`);
        lines.push("");

        // === Blok Profil Perusahaan (rapi, mudah di-scan)
        lines.push("🏢 *Profil Perusahaan*");
        if (compAddr)  lines.push(`• Alamat: ${compAddr}`);
        if (compPhone) {
            if (waClickNum) lines.push(`• Telepon/WA: +${waClickNum} (wa.me/${waClickNum})`);
            else lines.push(`• Telepon: ${compPhone}`);
        }
        if (compEmail) lines.push(`• Email: ${compEmail}`);
        if (compWeb)   lines.push(`• Website: ${compWeb}`);
        if (compIg)    lines.push(`• Instagram: ${compIg}`);
        lines.push("");

        // === Disclaimer singkat (opsional)
        lines.push("_Dokumen digital ini sah dan diterbitkan otomatis oleh sistem. Harap menyimpan resi untuk kemudahan layanan._");

        // kirim teks
        await _sendWhatsAppText(req, schema, toJid, lines.join("\n"));

        // === Render & kirim PDF nota (caption diperindah)
        try {
            const data = await _composeNotaData(schema, so.id);
            const pdfBuffer = await _renderNotaPdfWithPdfkit(data);
            const base64 = pdfBuffer.toString("base64");
            const filename = `Nota-${so.resi_no}.pdf`;

            const cap = [
                `🧾 *Nota/Invoice* — ${compName}`,
                `No. Resi: ${so.resi_no}`,
                `Total: ${_idr(so.total)} • Terbayar: ${_idr(so.paid_amount)} • Sisa: ${_idr(so.balance)}`,
                branch?.name ? `Cabang: ${branch.name}` : null,
                `Petugas: ${petugasName}`,
                "",
                "Balas *CEK PROGRES " + so.resi_no + "* untuk update status.",
            ].filter(Boolean).join("\n");

            await _sendWhatsAppDocument(req, schema, toJid, filename, base64, cap);
        } catch (e) {
            console.error("[Sales] gagal render/kirim PDF (PDFKit):", e?.message || e);
        }
    }


    /**
     * Resolve customer dari 3 cara:
     * - customer_id → ambil dari DB
     * - customer_new → buat baru
     * - customer_name → kembalikan object ringan (tanpa id) agar SO bisa tersimpan snapshot namanya
     */
    async _resolveCustomer(m, { customer_id, customer_name, customer_new }) {
        // 1) by id
        if (customer_id) {
            const c = await m.Customer.findByPk(customer_id);
            return c || null;
        }

        // 2) create baru
        if (customer_new && customer_new.name) {
            const payload = {
                name: customer_new.name,
                code: customer_new.code || null,
                customer_category_id: customer_new.customer_category_id || null,
                email: customer_new.email || null,
                phone: customer_new.phone || null,
                address: customer_new.address || null,
                note: customer_new.note || null,
                is_active: true,
            };
            const c = await m.Customer.create(payload);
            return c;
        }

        // 3) hanya nama (snapshot ke SO, tanpa relasi id)
        if (customer_name) {
            return { id: null, name: customer_name, customer_category_id: null };
        }

        return null;
    }


    /**
     * Harga efektif:
     * - default: product.price (atau base_price)
     * - kalau ada override per kategori customer → pakai itu
     */
    async _getEffectivePrice(m, { product, customer_category_id }) {
        const base = Number(product?.price_normal ?? product?.price ?? product?.base_price ?? 0);
        if (!customer_category_id) return base;

        // --- SPECIAL PRICE (prioritas utama) ---
        try {
            const PSP = m.ProductSpecialPrice;
            if (PSP?.findOne) {
                const now = new Date();

                const sp = await PSP.findOne({
                    where: {
                        [Op.and]: [
                            { product_id: product.id },
                            { customer_category_id },
                            // jika valid_from/to dipakai, tetap aman bila null
                            { [Op.or]: [{ valid_from: null }, { valid_from: { [Op.lte]: now } }] },
                            { [Op.or]: [{ valid_to: null },   { valid_to:   { [Op.gte]: now } }] },
                        ],
                    },
                    order: [['created_at', 'DESC']],
                });

                if (sp) {
                    const raw = sp.special_price; // kolom di DB-mu
                    const price = (raw === null || raw === undefined) ? NaN : Number(raw);
                    console.log('[PRICE] product %s cat %s sp raw=%s parsed=%s',
                        product.id, customer_category_id, raw, price);
                    if (Number.isFinite(price) && price > 0) return price;
                } else {
                    console.log('[PRICE] no special price for product %s cat %s', product.id, customer_category_id);
                }
            }
        } catch (err) {
            console.warn('[PRICE][WARN] error reading ProductSpecialPrice:', err?.message);
        }

        // --- Override opsional lain (kalau memang ada modelnya) ---
        if (m.ProductPriceOverride?.findOne) {
            const ov = await m.ProductPriceOverride.findOne({
                where: { product_id: product.id, customer_category_id },
                order: [['created_at', 'DESC']],
            });
            if (ov && ov.price != null) return Number(ov.price);
        }

        if (m.CustomerCategoryPrice?.findOne) {
            const ov2 = await m.CustomerCategoryPrice.findOne({
                where: { product_id: product.id, customer_category_id },
                order: [['created_at', 'DESC']],
            });
            if (ov2 && ov2.price != null) return Number(ov2.price);
        }

        return base;
    }

    // List
    async getAll(req,res){
        try{
            const schema = req.schema; if(!schema) return res.status(400).json({error:'TENANT_REQUIRED'});
            const { q, payment_status, progress, branch_id, page=1, limit=10 } = req.query;

            const { SalesOrder, SalesOrderItem } = this._m(schema);
            const where = {};
            if(q) where[Op.or] = [{ resi_no: { [Op.iLike]: `%${q}%` } }, { customer_name: { [Op.iLike]: `%${q}%` } }];
            if(payment_status) where.payment_status = payment_status;
            if(progress) where.progress_status = progress;
            if(branch_id) where.branch_id = branch_id;

            const offset = (parseInt(page)-1)*parseInt(limit);
            const { count, rows } = await SalesOrder.findAndCountAll({
                where,
                include: [{ model: SalesOrderItem, as:'items' }],
                order:[['created_at','DESC']],
                limit: parseInt(limit), offset
            });

            res.json({ sales: rows, pagination:{ page:parseInt(page), limit:parseInt(limit), total:count, pages: Math.ceil(count/parseInt(limit)) }});
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // Get
    async getById(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { SalesOrder, SalesOrderItem } = this._m(schema);
            const so = await SalesOrder.findByPk(id, { include:[{ model: SalesOrderItem, as:'items'}] });
            if(!so) return res.status(404).json({error:'SALES_NOT_FOUND'});
            res.json({ sales_order: so });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // Create SO + items + stock out + (auto receivable)
    // Create SO + items + stock out + (auto receivable)
    async create(req, res) {
        // helper kecil lokal (aman kalau belum didefinisikan global)
        const num = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };
        const firstPositive = (...vals) => {
            for (const v of vals) {
                const n = num(v);
                if (n > 0) return n;
            }
            return 0;
        };

        const t0 = Date.now();
        const schema = req.schema;

        try {
            if (!schema) return res.status(400).json({ error: 'TENANT_REQUIRED' });
            const user = req.user;
            const {
                customer_id = null,
                customer_new = null,
                customer_name,
                customer_category_id = null,
                branch_id = null,
                deadline_at = null,
                payment_status = 'lunas',
                transaction_type = 'tunai',
                discount = 0,
                items = [],
                notes = null,
                dp_amount = 0,
                installments_count = 1,
                schedule_type = 'auto',
            } = req.body;

            if ((!customer_id && !customer_new && !customer_name) || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'INVALID_PAYLOAD' });
            }

            const m = this._m(schema);
            const sequelize = m.SalesOrder.sequelize;

            const out = await sequelize.transaction(async (tx) => {
                const resi_no = await genResiNo(sequelize, schema);

                // 1) resolve customer
                const customer = await this._resolveCustomer(m, { customer_id, customer_name, customer_new });
                const effectiveCustomerName = customer?.name || customer_name;
                const effectiveCategoryId =
                    customer?.customer_category_id || customer_new?.customer_category_id || customer_category_id || null;

                // 2) Siapkan line items dengan harga final (sekali hitung, pakai ulang)
                const productMap = new Map();
                const lines = [];
                for (const it of items) {
                    const p = await m.Product.findByPk(it.product_id, { transaction: tx });
                    if (!p) throw new Error('PRODUCT_NOT_FOUND:' + it.product_id);
                    productMap.set(it.product_id, p);

                    const is_area = !!it.is_area || !!p.is_area;

                    // harga dasar dari kategori/override (pastikan _getEffectivePrice di tempat lain membaca price_normal juga)
                    const basePrice = await this._getEffectivePrice(m, { product: p, customer_category_id: effectiveCategoryId });

                    // baca price_normal sebagai harga default (string → number)
                    const productUnit = num(p.price_normal) || num(p.price) || num(p.base_price) || 0;
                    // kalau tidak ada kolom area khusus, gunakan price_normal juga sbg "harga per satuan area"
                    const productArea = productUnit;

                    let final_unit_price;
                    let final_area_unit_price;
                    let qty = 0;
                    let area_w = 0;
                    let area_h = 0;
                    let subtotalLine = 0;

                    if (is_area) {
                        // ukuran boleh float
                        area_w = num(it.area_w);
                        area_h = num(it.area_h);
                        // qty buah; default 1 kalau tidak diisi/<=0
                        qty = Math.max(1, num(it.qty));

                        const area = area_w * area_h;

                        // pilih harga per area: client → basePrice → productArea → productUnit
                        const productUnit = num(p.price_normal) || num(p.price) || num(p.base_price) || 0;
                        const productArea = productUnit;
                        final_area_unit_price = firstPositive(it.area_unit_price, basePrice, productArea, productUnit);

                        // Kolom unit_price (NOT NULL) isi sama dengan harga per area
                        final_unit_price = final_area_unit_price;

                        // subtotal: qty × (W×H) × harga/area
                        subtotalLine = Math.round(qty * area * final_area_unit_price);
                    } else {
                        qty = Math.max(0, num(it.qty));
                        const productUnit = num(p.price_normal) || num(p.price) || num(p.base_price) || 0;
                        final_unit_price = firstPositive(it.unit_price, basePrice, productUnit);
                        final_area_unit_price = null;

                        subtotalLine = Math.round(qty * final_unit_price);
                    }


                    lines.push({
                        p,
                        is_area,
                        qty,
                        area_w,
                        area_h,
                        final_unit_price: num(final_unit_price), // pastikan number
                        final_area_unit_price: final_area_unit_price == null ? null : num(final_area_unit_price),
                        subtotalLine,
                        raw: it,
                    });
                }

                // 3) Hitung subtotal/total dari lines yang sudah final
                const subtotal = lines.reduce((acc, l) => acc + l.subtotalLine, 0);
                const total = Math.max(0, subtotal - num(discount || 0));
                let effPaymentStatus = payment_status;
                const intendedPaid = payment_status === 'lunas' ? total : Math.min(num(dp_amount || 0), total);
                if (payment_status === 'lunas' && intendedPaid < total) {
                    effPaymentStatus = 'dp';
                }
                const paid_amount = effPaymentStatus === 'lunas' ? total : Math.min(num(dp_amount || 0), total);
                const balance = Math.max(0, total - paid_amount);



                // 4) Buat SalesOrder
                const so = await m.SalesOrder.create(
                    {
                        resi_no,
                        branch_id,
                        customer_id: customer?.id || null,
                        customer_category_id: effectiveCategoryId,
                        customer_name: effectiveCustomerName,
                        deadline_at,
                        payment_status: effPaymentStatus,
                        transaction_type,
                        progress_status: 'registered',
                        created_by_user_id: user?.userId || user?.id,
                        processed_by_employee_id: null,
                        subtotal,
                        discount,
                        total,
                        paid_amount,
                        balance,
                        notes,
                    },
                    { transaction: tx }
                );

                // 5) Simpan SalesOrderItem pakai data final (unit_price selalu terisi)
                for (const line of lines) {
                    const { p, is_area, qty, area_w, area_h, final_unit_price, final_area_unit_price, subtotalLine } = line;

                    await m.SalesOrderItem.create(
                        {
                            sales_order_id: so.id,
                            product_id: p.id,
                            product_name_snap: p.name,
                            sku_snap: p.sku,
                            qty, // ⬅️ untuk area sekarang pakai qty sebenarnya
                            unit_price: final_unit_price, // harga per area disalin ke unit_price (NOT NULL)
                            is_area,
                            area_w: is_area ? area_w : null,
                            area_h: is_area ? area_h : null,
                            area_unit_price: is_area ? final_area_unit_price : null,
                            subtotal: subtotalLine,
                        },
                        { transaction: tx }
                    );

                    if (p.is_stock && !is_area) {
                        const newStock = num(p.stock || 0) - qty;
                        await p.update({ stock: newStock }, { transaction: tx });
                    }
                }

                await m.SalesNoteActionLog.create(
                    {
                        sales_order_id: so.id,
                        action: 'create',
                        actor_user_id: user?.userId || user?.id,
                        meta: { duration_ms: Date.now() - t0 },
                    },
                    { transaction: tx }
                );

                // 6) Auto receivable bila DP
                let receivable = null;
                if (payment_status === 'dp' && balance > 0) {
                    receivable = await m.Receivable.create(
                        {
                            sales_order_id: so.id,
                            customer_id: customer?.id || null,   // ⬅️ tambahkan
                            customer_name: effectiveCustomerName,
                            total_due: balance,
                            balance,
                            installments_count: Math.max(1, num(installments_count || 1)),
                            schedule_type,
                        },
                        { transaction: tx }
                    );

                    if (receivable.installments_count > 1 && schedule_type === 'auto') {
                        const per = Math.floor(balance / receivable.installments_count);
                        const remainder = balance - per * receivable.installments_count;
                        const now = moment();

                        for (let i = 1; i <= receivable.installments_count; i++) {
                            const amt = i === receivable.installments_count ? per + remainder : per;
                            await m.ReceivableSchedule.create(
                                {
                                    receivable_id: receivable.id,
                                    installment_no: i,
                                    due_at: now.clone().add(i, 'weeks').toDate(),
                                    amount: amt,
                                    paid_amount: 0,
                                    status: 'unpaid',
                                },
                                { transaction: tx }
                            );
                        }
                        await receivable.update({ next_due_at: moment().add(1, 'weeks').toDate() }, { transaction: tx });
                    }
                }
                // 7) Auto-instantiate progress per item (jika produk punya progress_category_id)
                // await _instantiateProgressForSales(sequelize, schema, so.id, tx);

                const notifications = await _instantiateProgressForSales(sequelize, schema, so.id, tx);
                return { so, receivable, notifications };
            });

            // === setelah transaksi sukses ===
            if (out?.notifications?.length) {
                await Promise.allSettled(
                    out.notifications.map(n =>
                        this.sendProgressNotificationToWhatsApp(
                            req,             // forward header auth/cookie
                            schema,
                            n.instanceId,
                            n.stageId,
                            'announce',      // ⬅️ hanya pengumuman awal
                            { source: 'sales.create', stageName: n.stageName }
                        )
                    )
                );
            }

            // === kirim WA ke customer (ringkasan + PDF nota)
            try {
                await this._notifyCustomerWithInvoice(req, schema, out.so.id);
            } catch (e) {
                console.error("[Sales] notify customer WA failed:", e?.message || e);
            }

            res.status(201).json({ message: 'Sales created', ...out });
        } catch (e) {
            console.error('Create sales error', e);
            if (String(e.message || '').startsWith('PRODUCT_NOT_FOUND'))
                return res.status(404).json({ error: e.message });
            res.status(500).json({ error: 'SERVER_ERROR' });
        }
    }

// modules/sales/controller.js
async sendProgressNotificationToWhatsApp(req, schema, instanceId, stageId, action, data = {}) {
    try {
        const axios = require("axios");

        // 1) Ambil instance & stage
        const { ProgressInstance, ProgressInstanceStage } = this._m(schema);
        const instance = await ProgressInstance.findByPk(instanceId, {
            include: [{ model: ProgressInstanceStage, as: 'stages', required: false }]
        });
        if (!instance) return;

        const stage = (instance.stages || []).find(s => s.id === stageId);
        const stageName = stage?.name || data?.stageName || 'Unknown';

        // 2) Base URL aman
        const rawBase = process.env.API_BASE_URL || "http://localhost:5000";
        let base = rawBase.trim().replace(/^htpps:\/\//i, "https://");
        if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
        base = base.replace(/\/+$/, "");
        const hasApi = /\/api(\/|$)/i.test(base);
        const url = `${base}${hasApi ? "" : "/api"}/whatsapp/progress/notify`;

        // 3) Header forward persis
        const authHeader = req.headers['authorization'];
        const cookieHeader = req.headers['cookie'];
        const headers = {
            'X-Tenant': schema,
            ...(authHeader ? { Authorization: authHeader } : {}),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        };

        // 4) Kirim notify (announce / start / done ditentukan pemanggil)
        await axios.post(url, {
            instance_id: instanceId,
            stage_name: stageName,
            action,           // 'announce' saat create; 'start'/'done' dari handler WA
            data
        }, { headers, timeout: 10000 });

        console.log(`📢 Progress notify OK: ${url} inst=${instanceId} stage=${stageName} action=${action}`);
    } catch (error) {
        const code = error?.response?.status;
        const method = error?.config?.method?.toUpperCase?.();
        const finalUrl = error?.config?.url;
        const respText = error?.response?.data || error?.message;
        console.error(`[Sales:sendProgressNotificationToWhatsApp] ${method || "POST"} ${finalUrl} -> ${code} ${respText}`);
    }
}



    // Update progress / assign processor / light edit
    async update(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { progress_status, processed_by_employee_id, notes } = req.body;
            const { SalesOrder } = this._m(schema);
            const so = await SalesOrder.findByPk(id); if(!so) return res.status(404).json({error:'SALES_NOT_FOUND'});

            await so.update({
                ...(progress_status? {progress_status}:{}),
                ...(processed_by_employee_id? {processed_by_employee_id}:{}),
                ...(notes!==undefined? {notes}:{}),
            });

            await this._m(schema).SalesNoteActionLog.create({
                sales_order_id: so.id, action:'update', actor_user_id:(req.user?.userId||req.user?.id),
                meta:{ fields:Object.keys(req.body||{}) }
            });

            res.json({ message:'Sales updated', sales_order:so });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    async listRevisionRequests(req,res){
        try{
            const schema = req.schema;
            const { SalesNoteRequest, SalesOrder } = this._m(schema);
            const { status = 'pending', page = 1, limit = 10 } = req.query;
            const offset = (parseInt(page)-1)*parseInt(limit);

            const { count, rows } = await SalesNoteRequest.findAndCountAll({
                where: { status },
                order: [['created_at','DESC']],
                limit: parseInt(limit), offset
            });

            // load SO ringan (optional)
            const ids = [...new Set(rows.map(r=>r.sales_order_id))];
            const soMap = new Map();
            if (ids.length){
                const list = await SalesOrder.findAll({ where: { id: ids } });
                list.forEach(s => soMap.set(s.id, s));
            }

            const data = rows.map(r => ({
                id: r.id,
                type: r.type,           // 'delete' | 'revise'
                status: r.status,       // 'pending' | 'approved' | 'rejected'
                sales_order_id: r.sales_order_id,
                reason: r.reason,
                payload_diff: r.payload_diff,
                created_at: r.created_at,
                sales_order: soMap.get(r.sales_order_id) || null,
            }));

            res.json({ requests: data, pagination: { page: Number(page), limit: Number(limit), total: count, pages: Math.ceil(count/Number(limit)) } });
        }catch(e){
            console.error(e); res.status(500).json({ error:'SERVER_ERROR' });
        }
    }


    // Delete / request delete
    async remove(req, res) {
        try {
            const schema = req.schema; const { id } = req.params;
            const m = this._m(schema); const user = req.user;

            const so = await m.SalesOrder.findByPk(id);
            if (!so) return res.status(404).json({ error: 'SALES_NOT_FOUND' });

            const isOwner = await this._isOwnerRole(schema, user);
            if (!isOwner) {
                const reqDel = await m.SalesNoteRequest.create({
                    sales_order_id: id, type: 'delete', status: 'pending',
                    reason: 'requested', requested_by_user_id: (user?.userId || user?.id)
                });
                await m.SalesNoteActionLog.create({
                    sales_order_id: id, action: 'delete_request',
                    actor_user_id: (user?.userId || user?.id), meta: { request_id: reqDel.id }
                });
                return res.json({ message: 'Delete requested, awaiting owner approval', request: reqDel });
            }

            const sequelize = m.SalesOrder.sequelize;
            await sequelize.transaction(async (tx) => {
                // --- 0) (opsional) ambil snapshot buat meta
                const snapshot = so.toJSON();

                // --- 1) TULIS LOG DULU saat FK masih valid
                await m.SalesNoteActionLog.create({
                    sales_order_id: id,
                    action: 'delete',
                    actor_user_id: (user?.userId || user?.id),
                    meta: { snapshot }
                }, { transaction: tx });

                // --- 2) HAPUS ANAK-ANAK SECARA AMAN (urutan penting jika FK di DB belum CASCADE)
                // Progress (hapus stage → instance)
                const instIds = (await m.ProgressInstance.findAll({
                    where: { sales_order_id: id }, attributes: ['id'], transaction: tx
                })).map(r => r.id);
                if (instIds.length) {
                    await m.ProgressInstanceStage.destroy({ where: { instance_id: instIds }, transaction: tx });
                    await m.ProgressInstance.destroy({ where: { id: instIds }, force: true, transaction: tx });
                }

                // Receivable (hapus payment → schedule → receivable)
                const rc = await m.Receivable.findOne({ where: { sales_order_id: id }, attributes: ['id'], transaction: tx });
                if (rc) {
                    await m.ReceivablePayment.destroy({ where: { receivable_id: rc.id }, transaction: tx });
                    await m.ReceivableSchedule.destroy({ where: { receivable_id: rc.id }, transaction: tx });
                    await m.Receivable.destroy({ where: { id: rc.id }, force: true, transaction: tx });
                }

                // Items
                await m.SalesOrderItem.destroy({ where: { sales_order_id: id }, force: true, transaction: tx });

                // Requests (kalau ada)
                await m.SalesNoteRequest.destroy({ where: { sales_order_id: id }, force: true, transaction: tx });

                // Logs LAMA (termasuk log 'delete' yang baru saja dibuat) – agar tidak menghalangi hard delete
                await m.SalesNoteActionLog.destroy({ where: { sales_order_id: id }, force: true, transaction: tx });

                // --- 3) Terakhir: HAPUS PARENT
                await m.SalesOrder.destroy({ where: { id }, force: true, transaction: tx });
            });

            return res.json({ message: 'Sales deleted' });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'SERVER_ERROR' });
        }
    }

    // Create revision request
    async createRevisionRequest(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { reason, payload_diff } = req.body;
            const m = this._m(schema); const user = req.user;
            const so = await m.SalesOrder.findByPk(id); if(!so) return res.status(404).json({error:'SALES_NOT_FOUND'});

            const isOwner = await this._isOwnerRole(schema, user);
            if(isOwner){
                // Owner langsung apply (sederhanakan: hanya allow update notes/progress di contoh ini)
                await so.update({ ...(payload_diff?.progress_status? {progress_status:payload_diff.progress_status}:{}) });
                await m.SalesNoteActionLog.create({ sales_order_id:id, action:'approve_revise', actor_user_id:(user?.userId||user?.id), meta:{payload_diff} });
                return res.json({ message:'Revision applied by owner', sales_order: so });
            }else{
                const r = await m.SalesNoteRequest.create({
                    sales_order_id:id, type:'revise', status:'pending', reason, requested_by_user_id:(user?.userId||user?.id), payload_diff
                });
                await m.SalesNoteActionLog.create({ sales_order_id:id, action:'revise_request', actor_user_id:(user?.userId||user?.id), meta:{request_id:r.id} });
                return res.json({ message:'Revision requested', request:r });
            }
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // Owner approve/reject request
    async approveRequest(req,res){
        try{
            const schema = req.schema; const { reqId } = req.params; const approve = req.path.endsWith('/approve');
            const m = this._m(schema); const user = req.user;
            const isOwner = await this._isOwnerRole(schema, user);
            if(!isOwner) return res.status(403).json({error:'ONLY_OWNER'});

            const r = await m.SalesNoteRequest.findByPk(reqId);
            if(!r || r.status!=='pending') return res.status(404).json({error:'REQUEST_NOT_FOUND_OR_NOT_PENDING'});

            const so = await m.SalesOrder.findByPk(r.sales_order_id);
            if(!so) return res.status(404).json({error:'SALES_NOT_FOUND'});

            if(approve){
                if(r.type==='delete'){
                    await so.destroy();
                    await r.update({ status:'approved', approved_by_user_id:(user?.userId||user?.id), approved_at: new Date() });
                    await m.SalesNoteActionLog.create({ sales_order_id: so.id, action:'approve_delete', actor_user_id:(user?.userId||user?.id), meta:{ request_id: r.id } });
                    return res.json({ message:'Sales deleted by approval' });
                }else if(r.type==='revise'){
                    // contoh sederhana: apply sebagian diff yang aman
                    const diff = r.payload_diff||{};
                    if(diff.progress_status) await so.update({ progress_status: diff.progress_status });
                    await r.update({ status:'approved', approved_by_user_id:(user?.userId||user?.id), approved_at: new Date() });
                    await m.SalesNoteActionLog.create({ sales_order_id: so.id, action:'approve_revise', actor_user_id:(user?.userId||user?.id), meta:{ request_id: r.id, diff } });
                    return res.json({ message:'Revision applied', sales_order: so });
                }
            }else{
                await r.update({ status:'rejected', approved_by_user_id:(user?.userId||user?.id), approved_at: new Date() });
                await m.SalesNoteActionLog.create({ sales_order_id: so.id, action: r.type==='delete'?'reject_delete':'reject_revise', actor_user_id:(user?.userId||user?.id), meta:{ request_id: r.id } });
                return res.json({ message:'Request rejected' });
            }
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // Payment to SO and/or receivable
    async pay(req,res){
        try{
            const schema = req.schema; const { id } = req.params;
            const { amount, method='tunai', reference_no=null, paid_at=new Date() } = req.body;
            if(!amount || amount<=0) return res.status(400).json({error:'INVALID_AMOUNT'});

            const m = this._m(schema);
            const so = await m.SalesOrder.findByPk(id); if(!so) return res.status(404).json({error:'SALES_NOT_FOUND'});

            const sequelize = m.SalesOrder.sequelize;
            await sequelize.transaction(async (tx)=>{
                // update SO amounts
                let newPaid = so.paid_amount + Number(amount);
                if(newPaid > so.total) newPaid = so.total;
                const newBalance = so.total - newPaid;
                await so.update({ paid_amount: newPaid, balance: newBalance, payment_status: newBalance===0?'lunas':so.payment_status }, { transaction: tx });

                // if receivable exists, record payment
                const rc = await m.Receivable.findOne({ where:{ sales_order_id: so.id }, transaction: tx });
                if(rc){
                    await m.ReceivablePayment.create({
                        receivable_id: rc.id, amount: Number(amount), method, reference_no, paid_at
                    }, { transaction: tx });

                    const rcNewBal = Math.max(0, rc.balance - Number(amount));
                    let nextDue = rc.next_due_at;
                    // update schedules greedily
                    const scheds = await m.ReceivableSchedule.findAll({ where:{ receivable_id: rc.id }, order:[['installment_no','ASC']], transaction: tx });
                    let rem = Number(amount);
                    for(const s of scheds){
                        if(rem<=0) break;
                        const left = s.amount - s.paid_amount;
                        const payNow = Math.min(left, rem);
                        if(payNow>0){
                            const paid_amount = s.paid_amount + payNow;
                            const status = paid_amount===s.amount ? 'paid' : 'partial';
                            await s.update({ paid_amount, status }, { transaction: tx });
                            rem -= payNow;
                        }
                    }
                    if(rcNewBal===0){
                        await rc.update({ balance:0, status:'closed', next_due_at: null }, { transaction: tx });
                    }else{
                        // next unpaid
                        const next = await m.ReceivableSchedule.findOne({ where:{ receivable_id: rc.id, status: { [Op.ne]:'paid' } }, order:[['due_at','ASC']], transaction: tx });
                        nextDue = next?.due_at || nextDue;
                        await rc.update({ balance: rcNewBal, next_due_at: nextDue }, { transaction: tx });
                    }
                }

                await m.SalesNoteActionLog.create({
                    sales_order_id: so.id, action:'payment', actor_user_id:(req.user?.userId||req.user?.id),
                    meta:{ amount, method, reference_no }
                }, { transaction: tx });
            });

            res.json({ message:'Payment recorded', sales_order: await m.SalesOrder.findByPk(id) });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    _m(schema){
        return {
            SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
            SalesOrderItem: TenantModelLoader.getModel('SalesOrderItem', schema),
            SalesNoteRequest: TenantModelLoader.getModel('SalesNoteRequest', schema),
            SalesNoteActionLog: TenantModelLoader.getModel('SalesNoteActionLog', schema),
            Product: TenantModelLoader.getModel('Product', schema),
            ProductSpecialPrice: TenantModelLoader.getModel('ProductSpecialPrice', schema),
            Receivable: TenantModelLoader.getModel('Receivable', schema),
            ReceivableSchedule: TenantModelLoader.getModel('ReceivableSchedule', schema),
            ReceivablePayment: TenantModelLoader.getModel('ReceivablePayment', schema),
            Customer: TenantModelLoader.getModel('Customer', schema),
            CustomerCategory: TenantModelLoader.getModel('CustomerCategory', schema),
            CompanyProfile: TenantModelLoader.getModel('CompanyProfile', schema),
            Branch: TenantModelLoader.getModel('Branch', schema),
            Employee: TenantModelLoader.getModel('Employee', schema),
            // Progress models (untuk WA notify)
            ProgressInstance: TenantModelLoader.getModel('ProgressInstance', schema),
            ProgressInstanceStage: TenantModelLoader.getModel('ProgressInstanceStage', schema),
            ProgressCategory: TenantModelLoader.getModel('ProgressCategory', schema),
            ProgressStage: TenantModelLoader.getModel('ProgressStage', schema),

        };
    }

    async _isOwnerRole(schema, user){
        if(user?.role === 'master') return true;
        if(user?.role === 'tenant'){
            const User = TenantModelLoader.getModel('User', schema);
            const me = await User.findByPk(user.userId);
            return me?.role === 'owner';
        }
        return false;
    }



    async printNota(req, res) {
        try {
            const schema = req.schema; const { id } = req.params;
            if (!schema) return res.status(400).send('TENANT_REQUIRED');

            const m = {
                SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
                SalesOrderItem: TenantModelLoader.getModel('SalesOrderItem', schema),
                CompanyProfile: TenantModelLoader.getModel('CompanyProfile', schema),
                Branch: TenantModelLoader.getModel('Branch', schema),
            };

            const so = await m.SalesOrder.findByPk(id, { include: [{ model: m.SalesOrderItem, as: 'items' }] });
            if (!so) return res.status(404).send('SALES_NOT_FOUND');

            const company = await m.CompanyProfile.findOne();
            const branch  = so.branch_id ? await m.Branch.findByPk(so.branch_id) : null;

            const petugasName = await _getPetugasName(schema, so);

            const itemsRows = (so.items||[]).map((it,i)=>`
      <tr>
        <td class="muted">${String(i+1).padStart(2,'0')}</td>
        <td>
          <div><strong>${it.product_name_snap || '-'}</strong></div>
          <div class="muted">${it.sku_snap || ''}</div>
        </td>
        <!-- Qty/Area: area = W × H, non-area = qty -->
        <td class="right">
  ${it.is_area
                ? `${Number(it.qty||0)} × ${Number(it.area_w||0)} × ${Number(it.area_h||0)}`
                : Number(it.qty||0)}
</td>
        <!-- Harga: area pakai area_unit_price, non-area pakai unit_price -->
        <td class="right">
          ${(it.is_area ? (it.area_unit_price||0) : (it.unit_price||0)).toLocaleString('id-ID')}
        </td>
        <td class="right"><strong>${Number(it.subtotal||0).toLocaleString('id-ID')}</strong></td>
      </tr>
    `).join('');

            const paymentPill = `
      <span class="pill">
        <span>Status:</span> <b>${so.payment_status?.toUpperCase() || '-'}</b>
      </span>
    `;
            const txPill = `
      <span class="pill">
        <span>Transaksi:</span> <b>${so.transaction_type?.toUpperCase() || '-'}</b>
      </span>
    `;

            const body = `
      <div class="header section">
        <div class="brand">
          ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" class="logo" />` : `<div class="logo" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;">LOGO</div>`}
          <div>
            <h1>${company?.name || 'Perusahaan'}</h1>
            <small>${company?.address || ''}${company?.phone ? ' • '+company.phone : ''}${company?.email ? ' • '+company.email : ''}</small>
          </div>
        </div>
        <div class="meta">
          <div><span class="badge">NOTA</span></div>
          <div>No. Resi: <strong style="color:${(company?.theme?.secondary || '#111827')}">${so.resi_no}</strong></div>
          <div>Tanggal: ${new Date(so.created_at||so.createdAt).toLocaleString('id-ID')}</div>
          ${branch ? `<div>Cabang: ${branch.name}</div>` : ''}
        </div>
      </div>

      <div class="section">
        <div class="grid-2">
          <div class="box">
            <div class="title">Kepada</div>
            <div class="value"><strong>${so.customer_name}</strong></div>
            ${so.deadline_at ? `<div class="muted" style="margin-top:6px">Deadline: ${new Date(so.deadline_at).toLocaleString('id-ID')}</div>`:''}
          </div>
          <div class="box" style="display:flex; gap:10px; align-items:center; justify-content:flex-start; flex-wrap:wrap;">
            ${paymentPill} ${txPill}
            <span class="pill"><span>Progres:</span> <b>${so.progress_status || '-'}</b></span>
          </div>
        </div>

        <div class="box" style="padding:0; margin-top:16px;">
          <table>
            <thead>
              <tr>
                <th style="width:56px">#</th>
                <th>Deskripsi</th>
                <th class="right" style="width:140px">Qty/Area</th>
                <th class="right" style="width:140px">Harga</th>
                <th class="right" style="width:160px">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <div class="totals">
          <div>${so.notes ? `<div class="box"><div class="title">Catatan</div><div class="value">${so.notes}</div></div>`:''}</div>
          <div class="totals-card">
            <div class="totals-row"><span>Subtotal</span><span class="right">${Number(so.subtotal).toLocaleString('id-ID')}</span></div>
            <div class="totals-row"><span>Diskon</span><span class="right">-${Number(so.discount).toLocaleString('id-ID')}</span></div>
            <div class="totals-row" style="margin-top:4px;"><strong>Total</strong><strong class="right">${Number(so.total).toLocaleString('id-ID')}</strong></div>
            <div class="totals-row"><span>Terbayar</span><span class="right">${Number(so.paid_amount).toLocaleString('id-ID')}</span></div>
            <div class="totals-row"><span>Sisa</span><span class="right">${Number(so.balance).toLocaleString('id-ID')}</span></div>
          </div>
        </div>

        <div class="footer" style="margin-top:20px;">
  <div>Dicetak: ${new Date().toLocaleString('id-ID')}</div>
  <div class="sign">
    <div>Petugas Nota</div>
    <div class="line"></div>
    <div style="margin-top:6px;font-weight:600">${petugasName}</div>
  </div>
</div>
      </div>
    `;

            const html = printLayout({
                title: `Nota ${so.resi_no}`,
                body,
                theme: company?.theme || { mode: 'light', primary: '#0ea5e9', secondary: '#111827' }
            });
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        } catch (e) {
            console.error(e);
            return res.status(500).send('SERVER_ERROR');
        }
    }



    async printSPK(req, res) {
        try {
            const schema = req.schema; const { id } = req.params;
            if (!schema) return res.status(400).send('TENANT_REQUIRED');

            const m = {
                SalesOrder: TenantModelLoader.getModel('SalesOrder', schema),
                SalesOrderItem: TenantModelLoader.getModel('SalesOrderItem', schema),
                CompanyProfile: TenantModelLoader.getModel('CompanyProfile', schema),
                Branch: TenantModelLoader.getModel('Branch', schema),
                Employee: TenantModelLoader.getModel('Employee', schema),
            };

            const so = await m.SalesOrder.findByPk(id, { include: [{ model: m.SalesOrderItem, as: 'items' }] });
            if (!so) return res.status(404).send('SALES_NOT_FOUND');

            const company = await m.CompanyProfile.findOne();
            const branch  = so.branch_id ? await m.Branch.findByPk(so.branch_id) : null;
            const pic     = so.processed_by_employee_id ? await m.Employee.findByPk(so.processed_by_employee_id) : null;
            const petugasName = await _getPetugasName(schema, so);
            const itemsRows = (so.items||[]).map((it,i)=>`
      <tr>
        <td class="muted">${String(i+1).padStart(2,'0')}</td>
        <td>
          <div><strong>${it.product_name_snap || '-'}</strong></div>
          <div class="muted">${it.sku_snap || ''}</div>
        </td>
        <td class="right">${it.is_area ? `${Number(it.area_w||0)} × ${Number(it.area_h||0)}` : Number(it.qty||0)}</td>
        <td class="muted">${it.is_area ? 'by area' : 'unit'}</td>
        <td>${(it.notes || '').slice(0,180)}</td>
      </tr>
    `).join('');

            const body = `
      <div class="header section" style="background: linear-gradient(180deg, rgba(16,185,129,0.08), transparent 60%);">
        <div class="brand">
          ${company?.logo_url ? `<img src="${company.logo_url}" alt="Logo" class="logo" />` : `<div class="logo" style="display:flex;align-items:center;justify-content:center;color:#94a3b8;">LOGO</div>`}
          <div>
            <h1>${company?.name || 'Perusahaan'}</h1>
            <small>SPK (Surat Perintah Kerja)</small>
          </div>
        </div>
        <div class="meta">
          <div><span class="badge" style="border-color:#10b981;color:#059669;background:rgba(16,185,129,0.12)">SPK</span></div>
          <div>No. Resi: <strong style="color:${(company?.theme?.secondary || '#111827')}">${so.resi_no}</strong></div>
          <div>Tanggal: ${new Date(so.created_at||so.createdAt).toLocaleString('id-ID')}</div>
          ${branch ? `<div>Cabang: ${branch.name}</div>`:''}
        </div>
      </div>

      <div class="section">
        <div class="grid-2">
          <div class="box">
            <div class="title">Customer</div>
            <div class="value"><strong>${so.customer_name}</strong></div>
            <div class="muted" style="margin-top:6px">Progress: <strong style="color:${(company?.theme?.secondary || '#111827')}">${so.progress_status}</strong></div>
          </div>
          <div class="box">
            <div class="title">PIC</div>
            <div class="value">${pic ? `${pic.name} ${pic.position ? `(${pic.position})` : ''}` : '-'}</div>
            <div class="muted" style="margin-top:6px">Deadline: ${so.deadline_at ? new Date(so.deadline_at).toLocaleString('id-ID') : '-'}</div>
          </div>
        </div>

        <div class="box" style="padding:0; margin-top:16px;">
          <table>
            <thead>
              <tr>
                <th style="width:56px">#</th>
                <th>Item</th>
                <th class="right" style="width:140px">Qty/Area</th>
                <th style="width:100px">Tipe</th>
                <th>Catatan Item</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        ${so.notes ? `<div class="box" style="margin-top:16px;"><div class="title">Instruksi Tambahan</div><div class="value">${so.notes}</div></div>`:''}

        <div class="footer" style="margin-top:20px;">
  <div>Dicetak: ${new Date().toLocaleString('id-ID')}</div>
  <div class="sign">
    <div>Disetujui</div>
    <div class="line"></div>
    <div style="margin-top:6px;font-weight:600">${petugasName}</div>
  </div>
</div>
      </div>
    `;

            const html = printLayout({
                title: `SPK ${so.resi_no}`,
                body,
                theme: company?.theme || { mode: 'light', primary: '#0ea5e9', secondary: '#111827' },
                cssExtra: `.badge{border-color:#0a7;}`
            });
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
        } catch (e) {
            console.error(e);
            return res.status(500).send('SERVER_ERROR');
        }
    }


}

module.exports = new SalesController();
