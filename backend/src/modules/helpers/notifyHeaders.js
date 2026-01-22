// helpers/notifyHeaders.js (opsional; atau taruh di file controller yang sama)
function buildNotifyHeaders(req, schema) {
    const authHeader   = req?.headers?.authorization;
    const cookieHeader = req?.headers?.cookie;

    const headers = {
        // SAMAKAN dengan middleware di layanan WA kamu:
        // kalau di WA pakai 'x-tenant-schema', ganti di sini juga
        'x-tenant-schema': schema,
    };

    if (authHeader) headers['Authorization'] = authHeader;
    if (cookieHeader) headers['Cookie'] = cookieHeader;

    // fallback optional: internal token bila mau dual-mode
    if (!authHeader && process.env.INTERNAL_TOKEN) {
        headers['X-Internal-Token'] = process.env.INTERNAL_TOKEN;
    }

    return headers;
}
module.exports = { buildNotifyHeaders };
