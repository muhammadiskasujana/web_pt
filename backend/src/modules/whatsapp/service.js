
// modules/whatsapp/service.js
const path = require("path");
const fs = require("fs");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const TenantModelLoader = require("../../tenants/loader");
const { attachWhatsappHandler } = require("./handler");

// dynamic import Baileys (ESM)
async function loadBaileys() {
    const baileys = await import("@whiskeysockets/baileys");
    return baileys;
}

const live = new Map();   // key: `${schema}:${sessionId}` -> client
const qrCache = new Map();// key: `${schema}:${sessionId}` -> qr string
const reconnectAttempts = new Map(); // Track reconnection attempts

const keyOf = (schema, id) => `${schema}:${id}`;
const ensureDir = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };

function sanitizeJid(to) {
    if (!to) throw new Error("TO_REQUIRED");

    const s = String(to).trim();

    // 1) Sudah JID valid? langsung pakai.
    if (/@s\.whatsapp\.net$/.test(s) || /@g\.us$/.test(s)) return s;

    // 2) Nomor telpon mentah → normalisasi ke 62
    //    terima format: "0812...", "62812...", "+62812...", "8xxxx"
    let num = s.replace(/[^\d+]/g, ""); // keep + untuk deteksi awal
    if (num.startsWith("+")) num = num.slice(1);     // buang +
    if (num.startsWith("0")) num = "62" + num.slice(1);
    else if (num.startsWith("8")) num = "62" + num;  // "812..." => "62812..."
    // kalau sudah "62..." biarkan

    // pastikan hanya angka
    num = num.replace(/\D/g, "");
    if (!num) throw new Error("INVALID_PHONE");

    return `${num}@s.whatsapp.net`;
}

// ✅ Helper function to send connection notification
async function sendConnectionNotification(client, schema, sessionId, isReconnect = false) {
    try {
        // Wait a bit to ensure connection is fully established
        await new Promise(resolve => setTimeout(resolve, 2000));

        const me = client.user || {};
        if (!me.id) {
            console.warn(`[WA:notification] No user ID available for ${schema}:${sessionId}`);
            return;
        }

        // Extract own phone number from user ID
        const ownNumber = me.id.split(":")[0].replace("@s.whatsapp.net", "");
        const ownJid = `${ownNumber}@s.whatsapp.net`;

        const currentTime = new Date().toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const message = isReconnect
            ? `🔄 *WhatsApp Reconnected*\n\n✅ Koneksi WhatsApp berhasil dipulihkan dengan aman\n\n📱 Device: ${me.name || 'Unknown'}\n📞 Number: ${ownNumber}\n⏰ Time: ${currentTime}\n\n_Sistem siap menerima dan mengirim pesan._`
            : `🔗 *WhatsApp Connected*\n\n✅ WhatsApp terkoneksi dengan aman\n\n📱 Device: ${me.name || 'Unknown'}\n📞 Number: ${ownNumber}\n⏰ Time: ${currentTime}\n\n_Sistem siap menerima dan mengirim pesan._`;

        // Send message to own number
        const result = await client.sendMessage(ownJid, { text: message });

        // Log the notification
        await logMessage(schema, {
            session_id: sessionId,
            direction: "out",
            to_jid: ownJid,
            mtype: "text",
            content_preview: message.slice(0, 300),
            raw: result,
        });

        console.log(`📢 Connection notification sent to ${ownNumber} for ${schema}:${sessionId}`);

    } catch (error) {
        console.error(`❌ Failed to send connection notification for ${schema}:${sessionId}:`, error.message);
    }
}

async function start({ schema, sessionRow, retryCount = 0 }) {
    const baileys = await loadBaileys();
    const {
        default: makeWASocket,
        useMultiFileAuthState,
        Browsers,
        fetchLatestWaWebVersion,
        fetchLatestBaileysVersion,
        jidDecode,
        DisconnectReason,
    } = baileys;

    // helper harus didefinisikan SETELAH import
    const getWaVersion = async () => {
        try {
            return await fetchLatestWaWebVersion();
        } catch {
            return await fetchLatestBaileysVersion();
        }
    };

    const decodeJidLocal = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const d = jidDecode(jid) || {};
            return (d.user && d.server && `${d.user}@${d.server}`) || jid;
        }
        return jid;
    };

    const { id: sessionId } = sessionRow;
    const K = keyOf(schema, sessionId);

    // Jika sudah ada koneksi aktif, return yang ada
    if (live.has(K)) return live.get(K);

    const base = path.join(process.cwd(), "session", schema, sessionId);
    ensureDir(base);

    const { state, saveCreds } = await useMultiFileAuthState(base);
    const { version, isLatest } = await getWaVersion();

    const client = makeWASocket({
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
        auth: state,
        version,
        markOnlineOnConnect: true, // ✅ Change to true for better presence
        connectTimeoutMs: 120_000, // ✅ Increase timeout to 2 minutes
        defaultQueryTimeoutMs: 60_000, // ✅ Add query timeout
        keepAliveIntervalMs: 30_000, // ✅ Keep alive every 30 seconds
        retryRequestDelayMs: 1000, // ✅ Retry delay
        maxMsgRetryCount: 5, // ✅ Max retry for messages
        syncFullHistory: false,
        generateHighQualityLinkPreview: false, // ✅ Reduce load
        getMessage: async (key) => { // ✅ Handle message requests
            return undefined;
        },
    });

    client.decodeJid = decodeJidLocal;

    // ✅ Add periodic ping to keep connection alive
    const keepAliveInterval = setInterval(async () => {
        try {
            if (client.ws?.readyState === 1) { // WebSocket.OPEN
                await client.query({ tag: 'iq', attrs: { type: 'get', to: '@s.whatsapp.net' } });
            }
        } catch (error) {
            console.warn(`[WA:keepAlive] ${K}:`, error.message);
        }
    }, 45_000); // Every 45 seconds

    client.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        const WaSession = TenantModelLoader.getModel("WaSession", schema);

        if (qr) {
            qrCache.set(K, qr);
            await WaSession.update({
                status: "starting",
                last_qr_at: new Date(),
                meta: { ...sessionRow.meta, qr_generated: true }
            }, { where: { id: sessionId } });
        }

        if (connection === "open") {
            qrCache.delete(K);
            reconnectAttempts.delete(K); // ✅ Reset reconnect attempts on success

            const me = client.user || {};
            const isReconnect = retryCount > 0; // ✅ Check if this is a reconnection

            await WaSession.update({
                status: "connected",
                wa_number: me.id ? me.id.split(":")[0].replace("@s.whatsapp.net", "") : null,
                device_name: me.name || null,
                connected_at: new Date(),
                disconnected_at: null,
                meta: {
                    version,
                    isLatest,
                    retryCount,
                    last_connected: new Date().toISOString()
                },
            }, { where: { id: sessionId } });

            console.log(`✅ WhatsApp connected: ${K}${isReconnect ? ' (reconnected)' : ''}`);

            // ✅ Send connection notification to own number
            sendConnectionNotification(client, schema, sessionId, isReconnect).catch(err => {
                console.warn(`[WA:notification] Error for ${K}:`, err.message);
            });
        }

        if (connection === "close") {
            clearInterval(keepAliveInterval); // ✅ Clear keep alive interval

            const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

            // ✅ Enhanced disconnect reason handling - particularly for 515 error
            const isError515 = reason === 515; // Stream error after successful pairing
            const shouldReconnect = ![
                DisconnectReason.loggedOut,        // 401
                DisconnectReason.connectionReplaced, // 440
                DisconnectReason.badSession,       // 428
                // Remove restartRequired from no-reconnect list since 515 needs reconnection
            ].includes(reason) || isError515; // ✅ Always reconnect for 515 error

            console.log(`❌ WhatsApp disconnected: ${K}, reason: ${reason}${isError515 ? ' (stream error after pairing)' : ''}, shouldReconnect: ${shouldReconnect}`);

            await WaSession.update({
                status: shouldReconnect ? "disconnected" : "error",
                disconnected_at: new Date(),
                meta: {
                    ...sessionRow.meta,
                    last_disconnect_reason: reason,
                    disconnect_time: new Date().toISOString(),
                    is_515_error: isError515
                }
            }, { where: { id: sessionId } });

            live.delete(K);
            qrCache.delete(K);

            // ✅ Enhanced reconnection logic with special handling for 515
            if (shouldReconnect) {
                const currentAttempts = reconnectAttempts.get(K) || 0;
                const maxAttempts = isError515 ? 3 : 10; // ✅ Fewer attempts for 515 since it should reconnect quickly

                if (currentAttempts < maxAttempts) {
                    reconnectAttempts.set(K, currentAttempts + 1);

                    // ✅ Special handling for 515 - immediate reconnect
                    const delay = isError515 ?
                        Math.min(1000 * (currentAttempts + 1), 5000) : // 1s, 2s, 3s, max 5s for 515
                        Math.min(3000 * Math.pow(2, currentAttempts), 300_000); // Exponential for others

                    console.log(`🔄 Scheduling reconnection ${currentAttempts + 1}/${maxAttempts} for ${K} in ${delay/1000}s${isError515 ? ' (515 quick retry)' : ''}`);

                    setTimeout(async () => {
                        try {
                            console.log(`🔄 Attempting reconnection ${currentAttempts + 1}/${maxAttempts} for ${K}${isError515 ? ' (515 recovery)' : ''}`);
                            const updatedRow = await WaSession.findByPk(sessionId);
                            if (updatedRow) {
                                await start({ schema, sessionRow: updatedRow, retryCount: currentAttempts + 1 });
                            }
                        } catch (error) {
                            console.error(`❌ Reconnection failed for ${K}:`, error.message);
                        }
                    }, delay);
                } else {
                    console.error(`❌ Max reconnection attempts reached for ${K}${isError515 ? ' (515 error)' : ''}`);
                    await WaSession.update({
                        status: "error",
                        meta: {
                            ...sessionRow.meta,
                            max_attempts_reached: true,
                            last_attempt_time: new Date().toISOString(),
                            final_error_code: reason
                        }
                    }, { where: { id: sessionId } });
                }
            }
        }
    });

    client.ev.on("creds.update", saveCreds);

    // ✅ Handle WebSocket errors
    client.ws?.on('error', (error) => {
        console.warn(`[WA:ws-error] ${K}:`, error.message);
    });

    // ✅ Add cleanup on process exit
    const cleanup = () => {
        clearInterval(keepAliveInterval);
        live.delete(K);
        qrCache.delete(K);
        reconnectAttempts.delete(K);
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);

    // attach custom handler untuk pesan masuk
    attachWhatsappHandler({ client, schema, sessionId });

    live.set(K, client);
    return client;
}

async function stop({ schema, sessionId }) {
    const K = keyOf(schema, sessionId);
    const c = live.get(K);
    if (!c) return false;

    // ✅ Clear reconnection attempts when manually stopping
    reconnectAttempts.delete(K);

    await c.end();
    live.delete(K);
    qrCache.delete(K);
    return true;
}

function isRunning({ schema, sessionId }) {
    return live.has(keyOf(schema, sessionId));
}

async function getQRDataURL({ schema, sessionId }) {
    const qrcode = require("qrcode");
    const val = qrCache.get(keyOf(schema, sessionId));
    if (!val) return null;
    return await qrcode.toDataURL(val);
}

async function ensureClient({ schema, sessionId, maxWait = 15000 }) {
    const K = keyOf(schema, sessionId);
    let c = live.get(K);

    if (c) {
        console.log(`✅ Client already available for ${K}`);
        return c;
    }

    console.log(`⚡ Creating new client for ${K}`);

    const WaSession = TenantModelLoader.getModel("WaSession", schema);
    const row = await WaSession.findByPk(sessionId);
    if (!row) {
        console.error(`❌ Session not found in DB: ${K}`);
        throw new Error("SESSION_NOT_FOUND");
    }

    // Cek status database
    if (row.status !== 'connected' && row.status !== 'starting') {
        console.error(`❌ Session status not suitable: ${K} status=${row.status}`);
        throw new Error(`SESSION_STATUS_${row.status.toUpperCase()}`);
    }

    console.log(`🔄 Starting session ${K} with status=${row.status}`);
    await start({ schema, sessionRow: row });

    // Tunggu dengan logging
    const startedAt = Date.now();
    let attempts = 0;
    while (!(c = live.get(K)) && Date.now() - startedAt < maxWait) {
        attempts++;
        if (attempts % 10 === 0) { // Log setiap 2 detik
            console.log(`⏳ Waiting for client ${K} (attempt ${attempts})`);
        }
        await new Promise(r => setTimeout(r, 200));
    }

    if (!c) {
        console.error(`❌ Client not available after ${maxWait}ms for ${K}`);
        throw new Error("SESSION_NOT_RUNNING");
    }

    console.log(`✅ Client ready for ${K} after ${Date.now() - startedAt}ms`);
    return c;
}


async function sendText({ schema, sessionId, to, message }) {
    const c = await ensureClient({ schema, sessionId });
    const jid = sanitizeJid(to);
    const r = await c.sendMessage(jid, { text: message });
    await logMessage(schema, {
        session_id: sessionId, direction: "out", to_jid: jid,
        mtype: "text", content_preview: (message || "").slice(0, 300), raw: r,
    });
    return r;
}

async function sendImage({ schema, sessionId, to, image_url, caption = "" }) {
    const c = await ensureClient({ schema, sessionId });
    const jid = sanitizeJid(to);
    const r = await c.sendMessage(jid, { image: { url: image_url }, caption });
    await logMessage(schema, {
        session_id: sessionId, direction: "out", to_jid: jid,
        mtype: "image", content_preview: (caption || image_url || "").toString().slice(0, 300), raw: r,
    });
    return r;
}

// ========= NEW: sendDocument =========
async function sendDocument({
                                schema,
                                sessionId,
                                to,
                                file_url = null,
                                base64 = null,
                                filename = "document.pdf",
                                mimetype = "application/pdf",
                                caption = ""
                            }) {
    const c   = await ensureClient({ schema, sessionId });
    const jid = sanitizeJid(to);

    // siapkan payload dokumen (pakai URL langsung atau Buffer dari base64)
    let docPayload;
    if (file_url) {
        // kirim memakai URL (Baileys akan fetch sendiri)
        docPayload = { url: file_url };
    } else if (base64) {
        // dukung dua bentuk: "abc..." atau "data:...;base64,abc..."
        const clean = String(base64).includes(";base64,")
            ? String(base64).split(";base64,").pop()
            : String(base64);
        const buf = Buffer.from(clean, "base64");
        // optional guard 16MB
        if (buf.length > 16 * 1024 * 1024) {
            throw new Error("FILE_TOO_LARGE");
        }
        docPayload = buf;
    } else {
        throw new Error("BASE64_OR_FILE_URL_REQUIRED");
    }

    // kirim
    const r = await c.sendMessage(jid, {
        document: docPayload,
        mimetype,
        fileName: filename,
        caption
    });

    // log seperti pola kamu
    const preview = [
        filename || "",
        caption || "",
        file_url || "",
    ].join(" • ").trim();

    await logMessage(schema, {
        session_id: sessionId,
        direction: "out",
        to_jid: jid,
        mtype: "document",
        content_preview: preview.slice(0, 300),
        raw: r,
    });

    return r;
}


async function logMessage(schema, payload) {
    try {
        const WaLogSession = TenantModelLoader.getModel("WaLogSession", schema);
        await WaLogSession.create({ ...payload, sent_at: new Date() });
    } catch (e) {
        console.warn("[WA:logMessage] skip:", e?.message);
    }
}

// ✅ Improved resume function with better error handling
async function resumeAllForTenant(schema) {
    const WaSession = TenantModelLoader.getModel("WaSession", schema);
    const rows = await WaSession.findAll({
        where: {
            status: ['connected', 'starting', 'disconnected', 'created', 'stopped']
        }
    });

    console.log(`🔄 Resuming ${rows.length} WhatsApp sessions for tenant: ${schema}`);

    const results = await Promise.allSettled(
        rows.map(async (row) => {
            try {
                await start({ schema, sessionRow: row });
                console.log(`✅ Resumed session ${schema}:${row.id}`);
                return { sessionId: row.id, success: true };
            } catch (e) {
                console.warn(`❌ Failed to resume ${schema}:${row.id}:`, e.message);
                return { sessionId: row.id, success: false, error: e.message };
            }
        })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    console.log(`📊 Resume summary for ${schema}: ${successful} successful, ${failed} failed`);
}

// ✅ Add function to check and restart dead connections
async function healthCheck(schema) {
    const WaSession = TenantModelLoader.getModel("WaSession", schema);
    const sessions = await WaSession.findAll({
        where: { status: 'connected' }
    });

    for (const session of sessions) {
        const K = keyOf(schema, session.id);
        const client = live.get(K);

        if (!client || client.ws?.readyState !== 1) {
            console.log(`🏥 Health check: Restarting dead session ${K}`);
            try {
                await stop({ schema, sessionId: session.id });
                await start({ schema, sessionRow: session });
            } catch (error) {
                console.error(`❌ Health check restart failed for ${K}:`, error.message);
            }
        }
    }
}

module.exports = {
    start,
    stop,
    isRunning,
    getQRDataURL,
    ensureClient,
    sendText,
    sendImage,
    sendDocument,
    resumeAllForTenant,
    healthCheck, // ✅ Export new health check function
    live
};

// // modules/whatsapp/service.js
// const path = require("path");
// const fs = require("fs");
// const pino = require("pino");
// const { Boom } = require("@hapi/boom");
// const TenantModelLoader = require("../../tenants/loader");
// const { attachWhatsappHandler } = require("./handler");
//
// // dynamic import Baileys (ESM)
// async function loadBaileys() {
//     const baileys = await import("@whiskeysockets/baileys");
//     return baileys;
// }
//
// const live = new Map();              // key: `${schema}:${sessionId}` -> client
// const qrCache = new Map();           // key: `${schema}:${sessionId}` -> qr string
// const reconnectAttempts = new Map(); // track reconnection attempts
// const startLocks = new Set();        // single-flight guard per session
//
// const keyOf = (schema, id) => `${schema}:${id}`;
// const ensureDir = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };
//
// function sanitizeJid(to) {
//     if (!to) throw new Error("TO_REQUIRED");
//     const s = String(to).trim();
//     if (/@s\.whatsapp\.net$/.test(s) || /@g\.us$/.test(s)) return s;
//     let num = s.replace(/[^\d+]/g, "");
//     if (num.startsWith("+")) num = num.slice(1);
//     if (num.startsWith("0")) num = "62" + num.slice(1);
//     else if (num.startsWith("8")) num = "62" + num;
//     num = num.replace(/\D/g, "");
//     if (!num) throw new Error("INVALID_PHONE");
//     return `${num}@s.whatsapp.net`;
// }
//
// // (Opsional) Helper untuk notifikasi setelah connect — DISABLED by default
// async function sendConnectionNotification(client, schema, sessionId, isReconnect = false) {
//     try {
//         await new Promise((r) => setTimeout(r, 2000));
//         const me = client.user || {};
//         if (!me.id) return;
//
//         const base = me.id?.includes("@") ? me.id.split("@")[0] : (me.id || "");
//         const numPart = base.includes(":") ? base.split(":")[0] : base;
//         const ownNumber = (numPart || "").replace(/\D/g, "");
//         if (!ownNumber) return;
//
//         const ownJid = `${ownNumber}@s.whatsapp.net`;
//         const currentTime = new Date().toLocaleString("id-ID", {
//             timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric",
//             hour: "2-digit", minute: "2-digit", second: "2-digit",
//         });
//
//         const message = isReconnect
//             ? `🔄 *WhatsApp Reconnected*\n\n✅ Koneksi dipulihkan\n📱 Device: ${me.name || "Unknown"}\n📞 Number: ${ownNumber}\n⏰ ${currentTime}`
//             : `🔗 *WhatsApp Connected*\n\n✅ WhatsApp terkoneksi\n📱 Device: ${me.name || "Unknown"}\n📞 Number: ${ownNumber}\n⏰ ${currentTime}`;
//
//         const result = await client.sendMessage(ownJid, { text: message });
//
//         await logMessage(schema, {
//             session_id: sessionId,
//             direction: "out",
//             to_jid: ownJid,
//             mtype: "text",
//             content_preview: message.slice(0, 300),
//             raw: result,
//         });
//     } catch {}
// }
//
// // Hapus folder kredensial untuk re-pair bersih
// async function removeAuthDir(baseDir) {
//     try { await fs.promises.rm(baseDir, { recursive: true, force: true }); }
//     catch (e) { console.warn("[WA:auth-cleanup] ", e?.message); }
// }
//
// async function start({ schema, sessionRow, retryCount = 0 }) {
//     const baileys = await loadBaileys();
//     const {
//         default: makeWASocket,
//         useMultiFileAuthState,
//         Browsers,
//         fetchLatestWaWebVersion,
//         fetchLatestBaileysVersion,
//         jidDecode,
//         DisconnectReason,
//     } = baileys;
//
//     const getWaVersion = async () => {
//         try { return await fetchLatestWaWebVersion(); }
//         catch { return await fetchLatestBaileysVersion(); }
//     };
//
//     const decodeJidLocal = (jid) => {
//         if (!jid) return jid;
//         if (/:\d+@/gi.test(jid)) {
//             const d = jidDecode(jid) || {};
//             return (d.user && d.server && `${d.user}@${d.server}`) || jid;
//         }
//         return jid;
//     };
//
//     const { id: sessionId } = sessionRow;
//     const K = keyOf(schema, sessionId);
//
//     // Sudah ada koneksi?
//     if (live.has(K)) return live.get(K);
//
//     // Single-flight guard
//     if (startLocks.has(K)) {
//         const t0 = Date.now();
//         while (startLocks.has(K) && Date.now() - t0 < 10000) {
//             await new Promise(r => setTimeout(r, 100));
//         }
//         if (live.has(K)) return live.get(K);
//     }
//     startLocks.add(K);
//
//     try {
//         const base = path.join(process.cwd(), "session", schema, sessionId);
//         ensureDir(base);
//
//         const { state, saveCreds } = await useMultiFileAuthState(base);
//         const { version, isLatest } = await getWaVersion();
//
//         const client = makeWASocket({
//             logger: pino({ level: "silent" }),         // samakan dengan kode yang jalan
//             browser: Browsers.macOS("Desktop"),         // fingerprint seperti yang jalan
//             auth: state,
//             version,
//             markOnlineOnConnect: false,                 // aman saat pairing
//             connectTimeoutMs: 120_000,
//             defaultQueryTimeoutMs: 60_000,
//             keepAliveIntervalMs: 30_000,
//             retryRequestDelayMs: 1000,
//             maxMsgRetryCount: 5,
//             syncFullHistory: false,
//             generateHighQualityLinkPreview: false,
//             printQRInTerminal: false,
//             getMessage: async () => undefined,
//         });
//
//         client.decodeJid = decodeJidLocal;
//
//         client.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
//             const WaSession = TenantModelLoader.getModel("WaSession", schema);
//
//             if (qr) {
//                 qrCache.set(K, qr);
//                 await WaSession.update({
//                     status: "starting",
//                     last_qr_at: new Date(),
//                     meta: { ...(sessionRow.meta || {}), qr_generated: true },
//                 }, { where: { id: sessionId } });
//             }
//
//             if (connection === "open") {
//                 qrCache.delete(K);
//                 reconnectAttempts.delete(K);
//
//                 const me = client.user || {};
//                 const isReconnect = retryCount > 0;
//
//                 await WaSession.update({
//                     status: "connected",
//                     wa_number: me.id ? (me.id.split("@")[0].split(":")[0] || "").replace(/\D/g, "") : null,
//                     device_name: me.name || null,
//                     connected_at: new Date(),
//                     disconnected_at: null,
//                     meta: { version, isLatest, retryCount, last_connected: new Date().toISOString() },
//                 }, { where: { id: sessionId } });
//
//                 console.log(`✅ WhatsApp connected: ${K}${isReconnect ? " (reconnected)" : ""}`);
//
//                 // Samakan dengan kode yang jalan: jangan spam pesan segera setelah connect.
//                 // Jika butuh, aktifkan dengan jeda aman:
//                 // setTimeout(() => sendConnectionNotification(client, schema, sessionId, isReconnect).catch(()=>{}), 60_000);
//             }
//
//             if (connection === "close") {
//                 // Parse reason defensif
//                 let reason;
//                 try { reason = new Boom(lastDisconnect?.error)?.output?.statusCode; } catch (_) {}
//                 const desc = lastDisconnect?.error?.message || String(lastDisconnect?.error || "");
//                 if (!reason && /Connection Closed/i.test(desc)) reason = DisconnectReason.connectionClosed;
//                 if (!reason && /Timed Out/i.test(desc)) reason = DisconnectReason.timedOut;
//
//                 const isError515 = reason === 515; // stream error after pairing
//                 const baseDir = path.join(process.cwd(), "session", schema, sessionId);
//
//                 // Mirror perilaku yang jalan:
//                 // - 401/loggedOut (device_removed), 428/badSession, 440/connectionReplaced => hard reset creds & jangan auto-reconnect.
//                 if (
//                     reason === DisconnectReason.loggedOut ||     // 401
//                     reason === DisconnectReason.badSession ||    // 428
//                     reason === DisconnectReason.connectionReplaced // 440
//                 ) {
//                     console.warn(`❌ ${K} disconnected with fatal reason ${reason}, cleaning auth & stopping.`);
//                     await TenantModelLoader.getModel("WaSession", schema).update({
//                         status: "error",
//                         disconnected_at: new Date(),
//                         meta: { ...(sessionRow.meta || {}), last_disconnect_reason: reason, disconnect_time: new Date().toISOString() },
//                     }, { where: { id: sessionId } });
//
//                     await removeAuthDir(baseDir);
//                     live.delete(K); qrCache.delete(K);
//                     reconnectAttempts.delete(K);
//                     startLocks.delete(K);
//                     return; // biarkan user re-scan
//                 }
//
//                 // 515 / restartRequired → segera restart (tanpa hapus creds)
//                 if (reason === DisconnectReason.restartRequired || isError515) {
//                     console.log(`🔁 ${K} restartRequired/515 — quick restart`);
//                     live.delete(K); qrCache.delete(K);
//                     startLocks.delete(K);
//                     setTimeout(async () => {
//                         try {
//                             const updatedRow = await WaSession.findByPk(sessionId);
//                             if (updatedRow) await start({ schema, sessionRow: updatedRow, retryCount: (retryCount || 0) + 1 });
//                         } catch (e) { console.error(`❌ quick restart failed for ${K}:`, e.message); }
//                     }, isError515 ? 1000 : 2000);
//                     return;
//                 }
//
//                 // Lainnya → reconnect dengan backoff (mirip yang jalan: close/lost/timeout)
//                 const shouldReconnect = true;
//
//                 console.log(`❌ WhatsApp disconnected: ${K}, reason: ${reason}, shouldReconnect: ${shouldReconnect}`);
//
//                 await WaSession.update({
//                     status: shouldReconnect ? "disconnected" : "error",
//                     disconnected_at: new Date(),
//                     meta: {
//                         ...(sessionRow.meta || {}),
//                         last_disconnect_reason: reason,
//                         disconnect_time: new Date().toISOString(),
//                         is_515_error: false,
//                     },
//                 }, { where: { id: sessionId } });
//
//                 live.delete(K);
//                 qrCache.delete(K);
//                 startLocks.delete(K);
//
//                 const current = reconnectAttempts.get(K) || 0;
//                 const maxAttempts = 10;
//                 if (current < maxAttempts) {
//                     reconnectAttempts.set(K, current + 1);
//                     const delay = Math.min(3000 * Math.pow(2, current), 300_000); // 3s, 6s, 12s ... max 5m
//                     console.log(`🔄 Scheduling reconnection ${current + 1}/${maxAttempts} for ${K} in ${delay / 1000}s`);
//                     setTimeout(async () => {
//                         try {
//                             const updatedRow = await WaSession.findByPk(sessionId);
//                             if (updatedRow) await start({ schema, sessionRow: updatedRow, retryCount: current + 1 });
//                         } catch (err) {
//                             console.error(`❌ Reconnection failed for ${K}:`, err.message);
//                         }
//                     }, delay);
//                 } else {
//                     console.error(`❌ Max reconnection attempts reached for ${K}`);
//                     await WaSession.update({
//                         status: "error",
//                         meta: {
//                             ...(sessionRow.meta || {}),
//                             max_attempts_reached: true,
//                             last_attempt_time: new Date().toISOString(),
//                             final_error_code: reason,
//                         },
//                     }, { where: { id: sessionId } });
//                 }
//             }
//         });
//
//         client.ev.on("creds.update", saveCreds);
//
//         client.ws?.on("error", (error) => {
//             console.warn(`[WA:ws-error] ${K}:`, error.message);
//         });
//
//         const cleanup = () => {
//             live.delete(K);
//             qrCache.delete(K);
//             reconnectAttempts.delete(K);
//             startLocks.delete(K);
//         };
//         process.once("SIGINT", cleanup);
//         process.once("SIGTERM", cleanup);
//
//         attachWhatsappHandler({ client, schema, sessionId });
//
//         live.set(K, client);
//         startLocks.delete(K);
//         return client;
//     } catch (err) {
//         startLocks.delete(K);
//         throw err;
//     }
// }
//
// async function stop({ schema, sessionId }) {
//     const K = keyOf(schema, sessionId);
//     const c = live.get(K);
//     if (!c) return false;
//
//     reconnectAttempts.delete(K);
//     startLocks.delete(K);
//
//     await c.end();
//     live.delete(K);
//     qrCache.delete(K);
//     return true;
// }
//
// function isRunning({ schema, sessionId }) {
//     return live.has(keyOf(schema, sessionId));
// }
//
// async function getQRDataURL({ schema, sessionId }) {
//     const qrcode = require("qrcode");
//     const val = qrCache.get(keyOf(schema, sessionId));
//     if (!val) return null;
//     return await qrcode.toDataURL(val);
// }
//
// async function ensureClient({ schema, sessionId, maxWait = 15000 }) {
//     const K = keyOf(schema, sessionId);
//     let c = live.get(K);
//
//     if (c) {
//         console.log(`✅ Client already available for ${K}`);
//         return c;
//     }
//
//     console.log(`⚡ Creating new client for ${K}`);
//
//     const WaSession = TenantModelLoader.getModel("WaSession", schema);
//     const row = await WaSession.findByPk(sessionId);
//     if (!row) {
//         console.error(`❌ Session not found in DB: ${K}`);
//         throw new Error("SESSION_NOT_FOUND");
//     }
//
//     // izinkan dari status umum (seperti yang jalan)
//     const allowed = new Set(["connected", "starting", "disconnected", "created", "stopped"]);
//     if (!allowed.has(row.status)) {
//         console.error(`❌ Session status not suitable: ${K} status=${row.status}`);
//         throw new Error(`SESSION_STATUS_${row.status.toUpperCase()}`);
//     }
//
//     console.log(`🔄 Starting session ${K} with status=${row.status}`);
//     await start({ schema, sessionRow: row });
//
//     const startedAt = Date.now();
//     let attempts = 0;
//     while (!(c = live.get(K)) && Date.now() - startedAt < maxWait) {
//         attempts++;
//         if (attempts % 10 === 0) console.log(`⏳ Waiting for client ${K} (attempt ${attempts})`);
//         await new Promise((r) => setTimeout(r, 200));
//     }
//
//     if (!c) {
//         console.error(`❌ Client not available after ${maxWait}ms for ${K}`);
//         throw new Error("SESSION_NOT_RUNNING");
//     }
//
//     console.log(`✅ Client ready for ${K} after ${Date.now() - startedAt}ms`);
//     return c;
// }
//
// async function sendText({ schema, sessionId, to, message }) {
//     const c = await ensureClient({ schema, sessionId });
//     const jid = sanitizeJid(to);
//     const r = await c.sendMessage(jid, { text: message });
//     await logMessage(schema, {
//         session_id: sessionId,
//         direction: "out",
//         to_jid: jid,
//         mtype: "text",
//         content_preview: (message || "").slice(0, 300),
//         raw: r,
//     });
//     return r;
// }
//
// async function sendImage({ schema, sessionId, to, image_url, caption = "" }) {
//     const c = await ensureClient({ schema, sessionId });
//     const jid = sanitizeJid(to);
//     const r = await c.sendMessage(jid, { image: { url: image_url }, caption });
//     await logMessage(schema, {
//         session_id: sessionId,
//         direction: "out",
//         to_jid: jid,
//         mtype: "image",
//         content_preview: (caption || image_url || "").toString().slice(0, 300),
//         raw: r,
//     });
//     return r;
// }
//
// // ========= sendDocument =========
// async function sendDocument({
//                                 schema,
//                                 sessionId,
//                                 to,
//                                 file_url = null,
//                                 base64 = null,
//                                 filename = "document.pdf",
//                                 mimetype = "application/pdf",
//                                 caption = "",
//                             }) {
//     const c = await ensureClient({ schema, sessionId });
//     const jid = sanitizeJid(to);
//
//     let docPayload;
//     if (file_url) {
//         docPayload = { url: file_url };
//     } else if (base64) {
//         const clean = String(base64).includes(";base64,")
//             ? String(base64).split(";base64,").pop()
//             : String(base64);
//         const buf = Buffer.from(clean, "base64");
//         if (buf.length > 16 * 1024 * 1024) throw new Error("FILE_TOO_LARGE");
//         docPayload = buf;
//     } else {
//         throw new Error("BASE64_OR_FILE_URL_REQUIRED");
//     }
//
//     const r = await c.sendMessage(jid, {
//         document: docPayload,
//         mimetype,
//         fileName: filename,
//         caption,
//     });
//
//     const preview = [filename || "", caption || "", file_url || ""].join(" • ").trim();
//
//     await logMessage(schema, {
//         session_id: sessionId,
//         direction: "out",
//         to_jid: jid,
//         mtype: "document",
//         content_preview: preview.slice(0, 300),
//         raw: r,
//     });
//
//     return r;
// }
//
// async function logMessage(schema, payload) {
//     try {
//         const WaLogSession = TenantModelLoader.getModel("WaLogSession", schema);
//         await WaLogSession.create({ ...payload, sent_at: new Date() });
//     } catch (e) {
//         console.warn("[WA:logMessage] skip:", e?.message);
//     }
// }
//
// // ===== resume all for tenant
// async function resumeAllForTenant(schema) {
//     const WaSession = TenantModelLoader.getModel("WaSession", schema);
//     const rows = await WaSession.findAll({
//         where: { status: ["connected", "starting", "disconnected", "created", "stopped"] },
//     });
//
//     console.log(`🔄 Resuming ${rows.length} WhatsApp sessions for tenant: ${schema}`);
//
//     const results = await Promise.allSettled(
//         rows.map(async (row) => {
//             try {
//                 await start({ schema, sessionRow: row });
//                 console.log(`✅ Resumed session ${schema}:${row.id}`);
//                 return { sessionId: row.id, success: true };
//             } catch (e) {
//                 console.warn(`❌ Failed to resume ${schema}:${row.id}:`, e.message);
//                 return { sessionId: row.id, success: false, error: e.message };
//             }
//         })
//     );
//
//     const successful = results.filter((r) => r.status === "fulfilled" && r.value.success).length;
//     const failed = results.length - successful;
//     console.log(`📊 Resume summary for ${schema}: ${successful} successful, ${failed} failed`);
// }
//
// // ===== health check
// async function healthCheck(schema) {
//     const WaSession = TenantModelLoader.getModel("WaSession", schema);
//     const sessions = await WaSession.findAll({ where: { status: "connected" } });
//
//     for (const session of sessions) {
//         const K = keyOf(schema, session.id);
//         const client = live.get(K);
//         if (!client || client.ws?.readyState !== 1) {
//             console.log(`🏥 Health check: Restarting dead session ${K}`);
//             try {
//                 await stop({ schema, sessionId: session.id });
//                 await start({ schema, sessionRow: session });
//             } catch (error) {
//                 console.error(`❌ Health check restart failed for ${K}:`, error.message);
//             }
//         }
//     }
// }
//
// module.exports = {
//     start,
//     stop,
//     isRunning,
//     getQRDataURL,
//     ensureClient,
//     sendText,
//     sendImage,
//     sendDocument,
//     resumeAllForTenant,
//     healthCheck,
//     live,
// };


