const Tenant = require("../models/Tenant");

// async function tenantResolver(req, res, next) {
//   try {
//     let tenantIdentifier, tenant;
//
//     // For master routes with schema parameter
//     if (req.params.tenantSchema) {
//       // Try to find by schema_name first (for master routes)
//       tenant = await Tenant.findOne({
//         where: { schema_name: req.params.tenantSchema }
//       });
//
//       // If not found by schema, try by slug
//       if (!tenant) {
//         tenant = await Tenant.findOne({
//           where: { slug: req.params.tenantSchema }
//         });
//       }
//     } else {
//       // For regular routes, use header or subdomain
//       tenantIdentifier = req.headers["x-tenant"] || parseTenantFromHost(req.hostname);
//       if (!tenantIdentifier) {
//         return res.status(400).json({ error: "Tenant required" });
//       }
//
//       // Find by slug (default behavior)
//       tenant = await Tenant.findOne({
//         where: { slug: tenantIdentifier }
//       });
//     }
//
//     if (!tenant || !tenant.is_active) {
//       return res.status(404).json({ error: "Tenant not found" });
//     }
//
//     req.tenant = tenant;
//     req.schema = tenant.schema_name;
//     req.effectiveModules = computeEffectiveModules(tenant);
//     next();
//   } catch (error) {
//     console.error('Tenant resolver error:', error);
//     return res.status(500).json({ error: "Internal server error" });
//   }
// }
async function tenantResolver(req, res, next) {
  try {
    // 1) Kumpulkan kandidat dari berbagai sumber
    const routeTenant =
        req.params?.tenant ||
        req.params?.tenantSchema ||       // dukung master routes lama
        null;


    const queryTenant = (req.query?.tenant || "").toString().trim() || null;
    const headerTenant = (req.headers["x-tenant"] || "").toString().trim() || null;
    const subdomainTenant = parseTenantFromHost(req.hostname);

    // 2) Tentukan identifier dengan prioritas: route > query > header > subdomain
    const tenantIdentifier = (routeTenant || queryTenant || headerTenant || subdomainTenant || "").trim();

    if (!tenantIdentifier) {
      return res.status(400).json({ error: "Tenant required" });
    }

    // 3) Cari tenant: coba schema_name dulu, jika tidak ada baru slug
    let tenant =
        (await Tenant.findOne({ where: { schema_name: tenantIdentifier } })) ||
        (await Tenant.findOne({ where: { slug: tenantIdentifier } }));

    // 4) Jika tadi route param mengacu pada "schema" di master routes lama
    //    dan belum ketemu, fallback: kalau ada req.params.tenantSchema, coba lagi via slug
    if (!tenant && req.params?.tenantSchema) {
      tenant = await Tenant.findOne({ where: { slug: req.params.tenantSchema } });
    }

    if (!tenant || !tenant.is_active) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // 5) Set context untuk downstream
    req.tenant = tenant;
    req.schema = tenant.schema_name;
    req.effectiveModules = computeEffectiveModules(tenant);
    req.tenantModules   = req.effectiveModules;

    return next();
  } catch (error) {
    console.error("Tenant resolver error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// function parseTenantFromHost(hostname) {
//   // example: tenant1.example.com
//   if (!hostname) return null;
//   const parts = hostname.split(".");
//   if (parts.length < 3) return null;
//   return parts[0];
// }

function parseTenantFromHost(hostname) {
  if (!hostname) return null;

  // hilangkan port (mis. localhost:3313)
  const host = hostname.split(":")[0].toLowerCase();

  // cek special-case localhost/dev
  if (host === "localhost") return null;

  const parts = host.split(".");

  // contoh: brokerjersey.com → ['brokerjersey','com']
  // contoh: brokerjersey.co.id → ['brokerjersey','co','id']
  // contoh: sub.brokerjersey.com → ['sub','brokerjersey','com']

  if (parts.length === 2) {
    // domain 2 bagian → ambil bagian pertama
    return parts[0];
  }

  if (parts.length === 3 && parts[1] === "co" && parts[2] === "id") {
    // domain .co.id → ambil bagian pertama
    return parts[0];
  }

  if (parts.length >= 3) {
    // subdomain model lama → ambil yang paling kiri
    if (parts[0] !== "www") {
      return parts[0];
    }
  }

  return null;
}

function computeEffectiveModules(tenant) {
  // placeholder: merge tier defaults and tenant.modules overrides
  // fetch tier defaults from DB / cache, then merge
  return tenant.modules || {};
}

module.exports = tenantResolver;
