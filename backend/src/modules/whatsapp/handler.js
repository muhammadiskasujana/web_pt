// modules/whatsapp/handler.js

const { upper, cube } = require("./fungsi");
const { Op } = require("sequelize");

const WA_PROGRESS_NOTIFY_STRATEGY = process.env.WA_PROGRESS_NOTIFY_STRATEGY || 'api';

// =========================
// (Opsional) Auth headers utk mode HTTP (fallback publik ber-JWT)
// =========================
let AUTH_HEADERS = (() => {
    const bearer = process.env.API_SERVICE_BEARER
        ? `Bearer ${process.env.API_SERVICE_BEARER}`
        : null;
    const cookie = process.env.API_SERVICE_COOKIE || null;
    return {
        ...(bearer ? { Authorization: bearer } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
    };
})();

function setAuthHeaders(h = {}) {
    const clean = {};
    if (h.Authorization) clean.Authorization = h.Authorization;
    if (h.Cookie) clean.Cookie = h.Cookie;
    AUTH_HEADERS = clean;
}

// =========================
// Helpers: URL & headers
// =========================
function buildBaseApi() {
    let base = (process.env.API_BASE_URL || "http://localhost:5000")
        .trim()
        .replace(/^htpps:\/\//i, "https://");
    if (!/^https?:\/\//i.test(base)) base = `http://${base}`;
    base = base.replace(/\/+$/, "");
    const hasApi = /\/api(\/|$)/i.test(base);
    return { base, hasApi };
}

function buildPublicHeaders(schema) {
    return {
        "X-Tenant": schema,
        ...AUTH_HEADERS,
    };
}

function buildInternalHeaders(schema) {
    const key = process.env.INTERNAL_SERVICE_KEY;
    const h = { "X-Tenant": schema };
    if (key) h["X-Internal-Key"] = key;
    return h;
}

let _getContentType = null;
async function ensureGetContentType() {
    if (_getContentType) return _getContentType;
    const mod = await import("@whiskeysockets/baileys");
    _getContentType = mod.getContentType;
    return _getContentType;
}

// =========================
// Commands
// =========================
const commands = [
    {
        name: "ping",
        scope: "any",
        match: (t) => /^ping$/i.test(t),
        run: async ({ client, chatJid, m }) =>
            client.sendMessage(chatJid, { text: "pong 🏓" }, { quoted: m }),
    },
    {
        name: "cube",
        scope: "any",
        match: (t) => /^cube\s+.+/i.test(t),
        run: async ({ client, chatJid, m, text }) => {
            const angka = text.replace(/^cube\s+/i, "");
            const hasil = cube(angka);
            await client.sendMessage(chatJid, { text: hasil }, { quoted: m });
        },
    },
    {
        name: "upper",
        scope: "any",
        match: (t) => /^upper\s+.+/i.test(t),
        run: async ({ client, chatJid, m, text }) => {
            const kalimat = text.replace(/^upper\s+/i, "");
            const hasil = upper(kalimat);
            await client.sendMessage(chatJid, { text: hasil }, { quoted: m });
        },
    },
    {
        name: "me",
        scope: "private",
        match: (t) => /^me$/i.test(t),
        run: async ({ client, chatJid, senderJid, m }) => {
            const txt = `Ini chat pribadi.\nSender: ${senderJid}`;
            await client.sendMessage(chatJid, { text: txt }, { quoted: m });
        },
    },
    {
        name: "groupinfo",
        scope: "group",
        match: (t) => /^(groupinfo|gi)$/i.test(t),
        run: async ({ client, chatJid, senderJid, m }) => {
            const txt = `Ini chat grup.\nPengirim: ${senderJid}\nGroup JID: ${chatJid}`;
            await client.sendMessage(chatJid, { text: txt }, { quoted: m });
        },
    },

    {
        name: "cekprogres",
        scope: "any",
        match: (t) => /^(cek\s*progres|cek\s*progress)\s+(.+)/i.test(t),
        run: async ({ client, chatJid, m, text, schema }) => {
            try {
                const mres = text.match(/^(cek\s*progres|cek\s*progress)\s+(.+)/i);
                const resi = (mres?.[2] || "").trim();
                if (!resi) {
                    return client.sendMessage(chatJid, { text: "Format: *CEK PROGRES <NoResi>*\nContoh: CEK PROGRES ABC123" }, { quoted: m });
                }

                const found = await findInstanceByResi(schema, resi);
                if (!found || !found.inst) {
                    return client.sendMessage(chatJid, { text: "❌ Resi tidak ditemukan atau belum ada progres." }, { quoted: m });
                }

                const summary = formatProgressSummary(found);
                await client.sendMessage(chatJid, { text: summary }, { quoted: m });
            } catch (e) {
                console.error("[cekprogres] error:", e?.message || e);
                await client.sendMessage(chatJid, { text: "❌ Gagal mengambil data progres." }, { quoted: m });
            }
        },
    },
];

const commandMap = new Map(commands.map((c) => [c.name, c]));

// =========================
// Utils
// =========================
async function bodyOf(m) {
    try {
        const getContentType = await ensureGetContentType();
        const ct = getContentType(m.message);
        const node =
            ct === "viewOnceMessage" ? m.message.viewOnceMessage?.message : m.message[ct];
        const innerCt = node ? getContentType(node) : null;
        const msg = innerCt ? node[innerCt] : node;
        return (m.message?.conversation || msg?.text || msg?.caption || "").trim();
    } catch {
        return "";
    }
}

async function onMessage({ client, m, schema, sessionId }) {
    if (m?.key?.fromMe) return;

    const text = await bodyOf(m);
    if (!text) return;

    const chatJid = m.key?.remoteJid;
    if (!chatJid) return;

    const isGroup = chatJid.endsWith("@g.us");
    const senderJid = m.key?.participant || m.key?.remoteJid;

    const candidates = commands.filter(
        (c) =>
            c.scope === "any" ||
            (c.scope === "group" && isGroup) ||
            (c.scope === "private" && !isGroup)
    );

    for (const cmd of candidates) {
        try {
            if (cmd.match(text)) {
                return await cmd.run({
                    client,
                    m,
                    text,
                    schema,
                    sessionId,
                    isGroup,
                    chatJid,
                    senderJid,
                });
            }
        } catch (e) {
            console.error(
                `[whatsapp/handler] command ${cmd.name} error:`,
                e?.message || e
            );
            return;
        }
    }
    // diam
}

// =========================
// NEW: Helper — resolve customer name
// =========================
async function resolveCustomerName(schema, instance) {
    // 1) kalau suatu hari kamu tambahkan kolom customer_name di ProgressInstance
    if (instance?.customer_name && String(instance.customer_name).trim()) {
        return instance.customer_name;
    }

    // 2) fallback: ambil dari SalesOrder → Customer
    try {
        const TenantModelLoader = require("../../tenants/loader");
        const SalesOrder = TenantModelLoader.getModel("SalesOrder", schema);
        const Customer   = TenantModelLoader.getModel("Customer", schema);
        if (!instance?.sales_order_id) return "-";

        const so = await SalesOrder.findByPk(instance.sales_order_id, {
            include: [{ model: Customer, as: "customer", attributes: ["id", "name"] }],
            attributes: ["id"],
        });
        return so?.customer?.name || "-";
    } catch (e) {
        console.warn("[WA] resolveCustomerName failed:", e?.message || e);
        return "-";
    }
}

// =========================
// NEW: Helper — resolve kategori & stages untuk produk / instance
// =========================
async function getProductCategoryAndStages(schema, { instance = null, productId = null }) {
    const TenantModelLoader = require("../../tenants/loader");
    const ProgressCategory = TenantModelLoader.getModel("ProgressCategory", schema);
    const ProgressStage = TenantModelLoader.getModel("ProgressStage", schema);
    const Product = TenantModelLoader.getModel("Product", schema);

    // 1) Tentukan category_id
    let categoryId = null;

    // a) dari instance langsung (kalau model menyimpan relasi category)
    if (instance?.category_id) {
        categoryId = instance.category_id;
    } else if (instance?.category?.id) {
        categoryId = instance.category.id;
    }

    // b) dari produk yang di-assign
    if (!categoryId) {
        const pid = instance?.product_id || productId;
        if (pid) {
            const product = await Product.findByPk(pid);
            categoryId = product?.progress_category_id || null;
        }
    }

    if (!categoryId) return null;

    // 2) Ambil kategori + urutan stages
    const category = await ProgressCategory.findByPk(categoryId);
    if (!category) return null;

    const stages = await ProgressStage.findAll({
        where: { category_id: categoryId },
        order: [["order_index", "ASC"]],
    });

    return { category, stages };
}


function normalizePhoneToJid(raw) {
    if (!raw) return null;
    let d = String(raw).replace(/[^\d+]/g,'');
    if (d.startsWith('+')) d = d.slice(1);
    if (d.startsWith('0')) d = '62' + d.slice(1);
    if (!/^\d{7,15}$/.test(d)) return null;
    return `${d}@s.whatsapp.net`;
}

async function resolveCustomerPhone(schema, instance) {
    try {
        const TenantModelLoader = require("../../tenants/loader");
        const SalesOrder = TenantModelLoader.getModel("SalesOrder", schema);
        const Customer   = TenantModelLoader.getModel("Customer", schema);
        if (!instance?.sales_order_id) return { name: '-', resi_no: '-', phone: null };

        const so = await SalesOrder.findByPk(instance.sales_order_id);
        let phone = null;
        if (so?.customer_id) {
            const cust = await Customer.findByPk(so.customer_id);
            phone = cust?.phone || null;
        }
        return { name: so?.customer_name || '-', resi_no: so?.resi_no || '-', phone };
    } catch {
        return { name: '-', resi_no: '-', phone: null };
    }
}

// =========================
// CEK PROGRES — Helpers
// =========================
async function findInstanceByResi(schema, resiNo) {
    const TenantModelLoader = require("../../tenants/loader");
    const SalesOrder = TenantModelLoader.getModel("SalesOrder", schema);
    const ProgressInstance = TenantModelLoader.getModel("ProgressInstance", schema);
    const ProgressInstanceStage = TenantModelLoader.getModel("ProgressInstanceStage", schema);

    // 1) cari SO by resi_no
    const so = await SalesOrder.findOne({ where: { resi_no: resiNo } });
    if (!so) return null;

    // 2) cari instance yang terkait SO tsb (ambil yang terbaru kalau ada beberapa)
    const inst = await ProgressInstance.findOne({
        where: { sales_order_id: so.id },
        include: [
            { model: ProgressInstanceStage, as: "stages", separate: true, order: [["order_index", "ASC"]] },
        ],
        order: [["created_at", "DESC"]],
    });
    return { so, inst };
}

function _statusEmoji(s) {
    const x = String(s || "").toLowerCase();
    if (x === "done") return "✅";
    if (x === "in_progress" || x === "ongoing") return "🟡";
    if (x === "canceled") return "⛔";
    return "⬜"; // pending / unknown
}

function _fmtTimeID(d) {
    try {
        return new Date(d).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    } catch {
        return "-";
    }
}

function formatProgressSummary({ so, inst }) {
    if (!so || !inst) return "❌ Data tidak ditemukan untuk resi tersebut.";

    // baris header
    const nowStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const pct = Number(inst.percent || 0);
    const lines = [];

    lines.push("📦 *Status Progres Pesanan*");
    lines.push("");
    lines.push(`• *No. Resi:* ${so.resi_no || "-"}`);
    lines.push(`• *Nama:* ${so.customer_name || "-"}`);
    lines.push(`• *Produk:* ${inst.product_name || "-"}`);
    lines.push(`• *Progres:* ${pct}%`);
    lines.push(`• *Status Order:* ${(inst.status || "-").toUpperCase()}`);
    lines.push(`• *Waktu Cek:* ${nowStr}`);
    lines.push("");

    // daftar tahap
    if (Array.isArray(inst.stages) && inst.stages.length) {
        lines.push("*Tahapan:*");
        for (const s of inst.stages) {
            const emoji = _statusEmoji(s.status);
            const detailTime =
                s.finished_at
                    ? ` — selesai ${_fmtTimeID(s.finished_at)}`
                    : s.started_at
                        ? ` — mulai ${_fmtTimeID(s.started_at)}`
                        : "";
            lines.push(`${emoji} ${s.order_index + 1}. ${s.name}${detailTime}`);
        }
    }

    // next step info
    const notDone = inst.stages?.find((s) => !["done", "canceled"].includes(String(s.status).toLowerCase()));
    if (notDone) {
        lines.push("");
        lines.push(`⏭️ *Tahap Berjalan:* ${notDone.name}`);
    } else {
        lines.push("");
        lines.push("🎯 *Semua tahap beres!* Pesanan *siap diambil/diantar*.");
    }

    return lines.join("\n");
}

function idr(n){ return `Rp ${Number(n||0).toLocaleString('id-ID')}`; }

async function notifyCustomerProgressFromHandler(client, schema, instance, stageName, action, remarks = null) {
    try {
        const { name, resi_no, phone } = await resolveCustomerPhone(schema, instance);
        if (!phone) return;
        const toJid = normalizePhoneToJid(phone);
        if (!toJid) return;

        // Coba tebak stage berikutnya (pakai helper yang sudah ada)
        let nextStageName = null;
        try {
            nextStageName = await getNextStageName(schema, {
                instance,
                currentStageName: stageName || null,
                currentStageId: instance?.current_stage_id || null,
            });
        } catch { /* no-op */ }

        const nowStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        const pct = Number(instance.percent || 0);

        // Headline tergantung action
        const isStart = String(action).toLowerCase() === "start";
        const isDone  = String(action).toLowerCase() === "done";

        const headline = isStart
            ? `🚀 *${stageName || "Tahap"} dimulai*`
            : isDone
                ? `✅ *${stageName || "Tahap"} selesai*`
                : `🔔 *Update progres*`;

        // Info langkah berikutnya
        let nextLine = "";
        if (isDone) {
            if (nextStageName) {
                nextLine = `➡️ *Lanjut ke:* ${nextStageName} (menunggu diproses)`;
            } else {
                nextLine = `🎯 *Semua tahap beres!* Pesanan *siap diambil/diantar*.`;
            }
        } else if (isStart && nextStageName) {
            // Saat start kita juga infokan glimpse apa setelahnya, biar pelanggan paham alurnya
            nextLine = `⏭️ Setelah ini: *${nextStageName}*`;
        }

        const lines = [];
        lines.push(headline);
        lines.push("");
        lines.push(`• *No. Resi:* ${resi_no}`);
        lines.push(`• *Nama:* ${name}`);
        lines.push(`• *Produk:* ${instance.product_name || "-"}`);
        lines.push(`• *Tahap:* ${stageName || "-"}`);
        lines.push(`• *Aksi:* ${(action || "").toUpperCase()}`);
        lines.push(`• *Progres:* ${pct}%`);
        lines.push(`• *Waktu:* ${nowStr}`);
        if (remarks) lines.push(`• *Catatan:* ${remarks}`);
        if (nextLine) {
            lines.push("");
            lines.push(nextLine);
        }
        lines.push("");
        lines.push(`Ketik: *CEK PROGRES ${resi_no}* untuk lihat status terkini.`);
        lines.push("_Pesan otomatis dari sistem. Terima kasih sudah menunggu!_");

        await client.sendMessage(toJid, { text: lines.join("\n") });
    } catch (e) {
        console.warn("[notifyCustomerProgressFromHandler] gagal kirim:", e?.message || e);
    }
}
// =========================
// NEW: Helper — tentukan next stage name dari stage saat ini
// =========================
async function getNextStageName(schema, { instance, currentStageName = null, currentStageId = null }) {
    const cat = await getProductCategoryAndStages(schema, { instance });
    if (!cat?.stages?.length) return null;

    // Temukan stage saat ini di definisi kategori:
    let cur = null;
    if (currentStageId) {
        cur = cat.stages.find(s => s.id === currentStageId || s.stage_id === currentStageId) || null;
    }
    if (!cur && currentStageName) {
        // cocokkan nama case-insensitive
        const cmp = (s) => String(s.name || "").trim().toLowerCase();
        cur = cat.stages.find(s => cmp(s) === String(currentStageName).trim().toLowerCase()) || null;
    }

    // Jika belum ketemu, fallback ke "pertama yang belum selesai" dari instance (kalau ada daftar stages instance)
    if (!cur && Array.isArray(instance?.stages) && instance.stages.length) {
        const sortedInst = [...instance.stages].sort((a, b) => a.order_index - b.order_index);
        const notDone = sortedInst.find(s => !["done", "canceled"].includes(s.status));
        if (notDone) {
            // cocokkan ke definisi kategori berdasarkan nama dulu, lalu id
            cur = cat.stages.find(s => (s.name === notDone.name)) ||
                cat.stages.find(s => (s.id === notDone.stage_id || s.id === notDone.id)) ||
                null;
        }
    }

    // Jika tetap tidak ketemu, asumsikan posisi -1 agar next = stage[0]
    let next = null;
    if (cur) {
        next = cat.stages.find(s => s.order_index === (cur.order_index + 1)) || null;
    } else {
        next = cat.stages[0] || null;
    }

    return next?.name || null;
}

// =========================
// NEW: Helper — resolve JID grup untuk next stage
// =========================
async function resolveNextProgressGroup(schema, sessionId, nextStageName) {
    if (!nextStageName) return { groupJid: null, nextStageName: null };

    // Cari grup yang tepat untuk mode 'progress' & detail = nextStageName
    const exact = await findGroupByModeAndDetail(schema, {
        sessionId,
        modeName: "progress",
        detailName: nextStageName,
    });

    // Jika tidak ada mapping → return null (jangan salah kirim)
    return { groupJid: exact?.group_jid || null, nextStageName };
}

// =========================
// NEW: Helper — resolve ID mode & detail dari nama
// =========================
async function getModeAndDetailIds(schema, { modeName = "progress", detailName = null }) {
    const TenantModelLoader = require("../../tenants/loader");
    const { Op } = require("sequelize");
    const WaGroupMode = TenantModelLoader.getModel("WaGroupMode", schema);
    const WaDetailMode = TenantModelLoader.getModel("WaDetailMode", schema);

    let modeId = null, detailId = null;

    if (WaGroupMode && modeName) {
        const mode = await WaGroupMode.findOne({
            where: { name: { [Op.iLike]: modeName }, is_active: true },
        });
        modeId = mode?.id || null;
    }

    if (WaDetailMode && modeId && detailName) {
        const det = await WaDetailMode.findOne({
            where: { name: { [Op.iLike]: detailName }, group_mode_id: modeId, is_active: true },
        });
        detailId = det?.id || null;
    }

    return { modeId, detailId };
}


async function findGroupByModeAndDetail(
    schema,
    { sessionId, groupJid = null, modeName = "progress", detailName = null }
) {
    const TenantModelLoader = require("../../tenants/loader");
    const { Op } = require("sequelize");

    const WaGroup = TenantModelLoader.getModel("WaGroup", schema);
    const WaGroupMode = TenantModelLoader.getModel("WaGroupMode", schema);
    const WaDetailMode = TenantModelLoader.getModel("WaDetailMode", schema);

    // include untuk dapat nama mode/detail dari relasi
    const includes = [
        { model: WaGroupMode, as: "groupMode", required: false, attributes: ["id", "name"] },
        { model: WaDetailMode, as: "detailMode", required: false, attributes: ["id", "name", "group_mode_id"] },
    ];

    // 0) Jika groupJid spesifik diberikan → ambil persis
    if (groupJid) {
        const exact = await WaGroup.findOne({
            where: { session_id: sessionId, is_active: true, group_jid: groupJid },
            include: includes,
        });
        if (exact) return exact;
    }

    // 1) Cari ID mode & detail berdasarkan nama
    const { modeId, detailId } = await getModeAndDetailIds(schema, { modeName, detailName });

    // 2) Query ke WaGroup memakai *_id (paling reliable)
    if (modeId && detailId) {
        const byBoth = await WaGroup.findOne({
            where: {
                session_id: sessionId,
                is_active: true,
                group_mode_id: modeId,
                detail_mode_id: detailId,
            },
            include: includes,
            order: [["updated_at", "DESC"]],
        });
        if (byBoth) return byBoth;
    }

    if (modeId && !detailName) {
        const byModeOnly = await WaGroup.findOne({
            where: {
                session_id: sessionId,
                is_active: true,
                group_mode_id: modeId,
                [Op.or]: [{ detail_mode_id: null }],
            },
            include: includes,
            order: [["updated_at", "DESC"]],
        });
        if (byModeOnly) return byModeOnly;
    }

    // 3) Tidak ada fallback “ambil entri pertama” — mencegah salah kirim
    return null;
}


// =========================
// INTERNAL DIRECT DB (fallback terakhir)
// =========================
async function updateProgressStageDirect(schema, instanceId, stageId, action) {
    const TenantModelLoader = require("../../tenants/loader");

    const ProgressInstance = TenantModelLoader.getModel("ProgressInstance", schema);
    const ProgressInstanceStage = TenantModelLoader.getModel(
        "ProgressInstanceStage",
        schema
    );

    const sequelize =
        (ProgressInstance && ProgressInstance.sequelize) ||
        (ProgressInstanceStage && ProgressInstanceStage.sequelize);
    if (!sequelize) throw new Error("SEQUELIZE_INSTANCE_NOT_FOUND");

    return await sequelize.transaction(async (t) => {
        // 1) Lock parent TANPA include (hindari FOR UPDATE + OUTER JOIN)
        const instance = await ProgressInstance.findByPk(instanceId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!instance) throw new Error("INSTANCE_NOT_FOUND");

        // 2) Ambil stages via query terpisah
        const stages = await ProgressInstanceStage.findAll({
            where: { instance_id: instance.id },
            order: [["order_index", "ASC"]],
            transaction: t,
        });

        // 3) Temukan stage target
        const stage =
            stages.find((s) => s.id === stageId || s.stage_id === stageId) || null;
        if (!stage) throw new Error("STAGE_NOT_FOUND");

        const now = new Date();

        if (action === "start") {
            // stage
            stage.status = "in_progress";
            if (!stage.started_at) stage.started_at = now;
            await stage.save({ transaction: t });

            // instance
            instance.current_stage_id = stage.id ?? stage.stage_id ?? instance.current_stage_id;
            if (!instance.started_at) instance.started_at = now;
            instance.status = "ongoing"; // enum valid
            if (instance.percent == null) instance.percent = 0;
            await instance.save({ transaction: t });

            return { instance, stage, changed: "started" };
        }

        if (action === "done") {
            // stage
            stage.status = "done";
            if (!stage.finished_at) stage.finished_at = now;
            await stage.save({ transaction: t });

            // next stage?
            const next = stages.find(
                (s) => s.order_index === stage.order_index + 1
            ) || null;

            if (next) {
                instance.current_stage_id = next.id ?? next.stage_id ?? instance.current_stage_id;
                instance.status = "ongoing";
            } else {
                instance.current_stage_id = null;
                instance.status = "done";
                if (!instance.finished_at) instance.finished_at = now;
                instance.percent = 100;
            }
            await instance.save({ transaction: t });

            return { instance, stage, changed: "finished", next };
        }

        throw new Error("UNSUPPORTED_ACTION");
    });
}

// =========================
// HTTP updater — prioritas 1: INTERNAL endpoint (tanpa JWT)
// =========================
async function updateProgressStageInternalHttp(schema, instanceId, stageId, action) {
    const axios = require("axios");
    const { base } = buildBaseApi();
    const url = `${base}/api/progres/internal/instances/${instanceId}/stages/${stageId}`;
    const headers = buildInternalHeaders(schema);
    if (!headers["X-Internal-Key"]) {
        throw new Error("INTERNAL_SERVICE_KEY_NOT_SET");
    }
    await axios.post(url, { action }, { headers, timeout: 10000 });
}

// =========================
// HTTP updater — prioritas 2: Publik (butuh JWT/Cookie)
// =========================
async function updateProgressStagePublicHttp(schema, instanceId, stageId, action) {
    const axios = require("axios");
    const { base, hasApi } = buildBaseApi();
    const url = `${base}${hasApi ? "" : "/api"}/progres/instances/${instanceId}/stages/${stageId}`;
    // perhatikan: route publik dari controller kamu berada di `/api/progres/...`
    // jika base sudah mengandung /api, maka path di atas benar (tanpa double /api)
    const headers = buildPublicHeaders(schema);
    if (!headers.Authorization && !headers.Cookie) {
        throw new Error("PUBLIC_HTTP_NO_AUTH_HEADERS");
    }
    await axios.post(url, { action }, { headers, timeout: 10000 });
}

// =========================
// Router pemilihan jalur (INTERNAL HTTP -> PUBLIC HTTP -> DIRECT DB)
// =========================
async function updateProgressStage(schema, instanceId, stageId, action) {
    // 1) coba INTERNAL HTTP
    try {
        if (process.env.INTERNAL_SERVICE_KEY) {
            await updateProgressStageInternalHttp(schema, instanceId, stageId, action);
            return;
        }
    } catch (e) {
        console.error("[WA:updateProgressStage][internal-http]", e?.response?.status || e?.message, e?.response?.data || "");
    }

    // 2) fallback PUBLIC HTTP (JWT/Cookie)
    try {
        await updateProgressStagePublicHttp(schema, instanceId, stageId, action);
        return;
    } catch (e) {
        console.error("[WA:updateProgressStage][public-http]", e?.response?.status || e?.message, e?.response?.data || "");
    }

    // 3) fallback DIRECT DB
    try {
        await updateProgressStageDirect(schema, instanceId, stageId, action);
    } catch (e) {
        console.error("[WA:updateProgressStage][direct-db]", e?.message || e);
        throw e;
    }
}

// =========================
// Progress reply handler (start/done)
// =========================
async function handleProgressGroupMessage(client, message, schema, sessionId) {
    const { key, message: msg } = message;
    if (!msg) return;

    const userText = msg?.conversation || msg?.extendedTextMessage?.text || "";
    const normalizedText = userText.trim().toLowerCase();
    if (!["start", "done"].includes(normalizedText)) return;

    // teks yang di-reply (quoted)
    const quotedText =
        msg?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
        msg?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
        msg?.contextInfo?.quotedMessage?.conversation ||
        msg?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
        "";

    // OrderID berupa UUID (tag: #OrderID<uuid>)
    const orderIdMatch = quotedText.match(/#OrderID([0-9a-fA-F-]{8,})/);
    if (!orderIdMatch) return;

    const instanceId = orderIdMatch[1];
    const fromJid = key.remoteJid;

    try {
        const TenantModelLoader = require("../../tenants/loader");
        const ProgressInstance = TenantModelLoader.getModel(
            "ProgressInstance",
            schema
        );
        const ProgressInstanceStage = TenantModelLoader.getModel(
            "ProgressInstanceStage",
            schema
        );

        const instance = await ProgressInstance.findByPk(instanceId, {
            include: [
                {
                    model: ProgressInstanceStage,
                    as: "stages",
                    separate: true,
                    order: [["order_index", "ASC"]],
                },
            ],
        });
        if (!instance) {
            await client.sendMessage(fromJid, {
                text: "❌ Order tidak ditemukan atau sudah tidak aktif.",
            });
            return;
        }

        const currentGroup = await findGroupByModeAndDetail(schema, {
            sessionId,
            groupJid: fromJid,
            modeName: "progress",
        });
        if (!currentGroup) return;

        // Tentukan stage aktif sesuai detailMode.name (dari relasi), fallback ke current_stage_id
        const currentGroupStageName = currentGroup?.detailMode?.name || null;

        let currentStage = null;
        if (currentGroupStageName) {
            currentStage = instance.stages.find(s => String(s.name || "").toLowerCase().trim() === String(currentGroupStageName).toLowerCase().trim());
        }
        if (!currentStage && instance.current_stage_id) {
            currentStage = instance.stages.find(
                (s) => s.stage_id === instance.current_stage_id || s.id === instance.current_stage_id
            );
        }
        if (!currentStage) return; // tidak bisa menentukan stage yang dioperasikan

        const customerName = await resolveCustomerName(schema, instance);

        if (normalizedText === "start") {
            await updateProgressStage(
                schema,
                instanceId,
                currentStage.stage_id || currentStage.id,
                "start"
            );
            await notifyCustomerProgressFromHandler(client, schema, instance, currentStage.name, "start");

            const startedAt = new Date().toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
            });
            const dimulai = `🟡 Progress DIMULAI

📋 Order Details:
• Customer: ${customerName || "-"}
• Produk: ${instance.product_name || "-"}
• Stage: ${currentStage.name}
• Status: DIMULAI
• Waktu: ${startedAt}

⏰ Balas pesan ini dengan "done" jika tahap ${currentStage.name} sudah selesai

#Progress #${currentStage.name.replace(/\s/g, "")} #OrderID${instance.id}`;
            await client.sendMessage(fromJid, { text: dimulai });
        } else if (normalizedText === "done") {
            await updateProgressStage(
                schema,
                instanceId,
                currentStage.stage_id || currentStage.id,
                "done"
            );

            // fallback: pastikan pelanggan dapat notif progres selesai tahap
            await notifyCustomerProgressFromHandler(client, schema, instance, currentStage.name, "done");


            // ✅ Tentukan next stage berdasarkan kategori progress produk
            const nextStageName = await getNextStageName(schema, {
                instance,
                currentStageName: currentStage.name,
                currentStageId: currentStage.stage_id || currentStage.id,
            });

            if (nextStageName) {
                await client.sendMessage(fromJid, {
                    text: `🎉 Tahap *${currentStage.name}* selesai!\n\n➡️ Dilanjutkan ke tahap *${nextStageName}*`,
                });
                await sendToNextProgressGroup(client, schema, sessionId, instance, nextStageName);
            } else {
                await client.sendMessage(fromJid, {
                    text: `🎉 Semua tahap selesai!\n\n✨ Order telah selesai dikerjakan.`,
                });
            }
        }
    }



    catch (error) {
        console.error("[WA:handleProgressGroupMessage]", error?.message || error);
        await client.sendMessage(fromJid, {
            text: "❌ Terjadi kesalahan saat memproses perintah.",
        });
    }
}

// =========================
// Kirim pengumuman ke grup stage berikutnya
// =========================
// =========================
// Kirim pengumuman ke grup stage berikutnya (by name)
// =========================
async function sendToNextProgressGroup(client, schema, sessionId, instance, nextStageName) {
    try {
        const { groupJid } = await resolveNextProgressGroup(schema, sessionId, nextStageName);
        if (!groupJid) return;

        const customerName = await resolveCustomerName(schema, instance);

        const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        const txt = `🟢 *Order Baru Masuk*

📋 *Order Details:*
• Customer: ${customerName || "-"}
• Produk: ${instance.product_name || "-"}
• Stage: ${nextStageName}
• Status: MENUNGGU
• Waktu: ${now}

⏰ _Balas pesan ini dengan "start" untuk memulai, lalu "done" jika sudah selesai._

#Progress #${String(nextStageName).replace(/\s/g, "")} #OrderID${instance.id}`;

        await client.sendMessage(groupJid, { text: txt });
    } catch (error) {
        console.error("[WA:sendToNextProgressGroup]", error?.message || error);
    }
}

// =========================
// Attach handler
// =========================
function attachWhatsappHandler({ client, schema, sessionId }) {
    if (client.__handlerAttached) return;
    client.__handlerAttached = true;

    client.ev.on("messages.upsert", async (up) => {
        try {
            const m = up?.messages?.[0];
            if (!m?.message) return;

            if (m.message?.ephemeralMessage)
                m.message = m.message.ephemeralMessage.message;

            if (m.key?.remoteJid === "status@broadcast") return;

            if (m.key?.id?.startsWith?.("BAE5") && m.key.id.length === 16) return;

            // 1) command
            await onMessage({ client, m, schema, sessionId });

            // 2) progress reply
            await handleProgressGroupMessage(client, m, schema, sessionId);
        } catch (e) {
            console.error("[whatsapp/handler] upsert error:", e?.message || e);
        }
    });
}

module.exports = {
    attachWhatsappHandler,
    commandMap,
    setAuthHeaders,
};
