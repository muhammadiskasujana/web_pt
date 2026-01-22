
// services/tenantService.js
const Tenant = require("../models/Tenant");
const Tier = require("../models/Tier");
const Feature = require("../models/Feature");
const TierFeature = require("../models/tierFeature");
const sequelize = require("../config/db");
const { seedDefaultMenu } = require('../modules/menu/seedDefault');
const TenantModelLoader = require("../tenants/loader");

async function createTenant({ name, slug, tierId, domain, enabledFeatures = [], metadata = {} }) {
    // Validate tier exists if provided
    if (tierId) {
        const tier = await Tier.findByPk(tierId, {
            include: [{
                model: Feature,
                as: 'features',
                through: { attributes: ['is_enabled'] }
            }]
        });

        if (!tier) {
            throw new Error("Invalid tier ID");
        }

        // Get tier's available features
        const tierFeatures = tier.features.map(f => f.key);

        // Validate requested features are available in tier
        const invalidFeatures = enabledFeatures.filter(f => !tierFeatures.includes(f));
        if (invalidFeatures.length > 0) {
            throw new Error(`Features not available in tier: ${invalidFeatures.join(', ')}`);
        }
    }

    // Generate schema name from slug
    const schema_name = `tenant_${slug}`;

    // Build modules object based on enabled features
    const modules = await buildModulesFromFeatures(enabledFeatures);

    const tenant = await Tenant.create({
        name,
        slug,
        schema_name,
        domain,
        tier_id: tierId,
        modules,
        metadata,
        is_active: true
    });

    // Create tenant schema in database
    await createTenantSchema(schema_name);

    // Create tables based on enabled features
    await createTenantTablesFromFeatures(schema_name, enabledFeatures);

    await seedDefaultMenu(schema_name, modules);

    return tenant;
}

async function buildModulesFromFeatures(enabledFeatures) {
    // Get all features from database
    const features = await Feature.findAll({
        where: { key: enabledFeatures }
    });

    const modules = {};
    features.forEach(feature => {
        modules[feature.key] = true;
    });

    return modules;
}

async function createTenantSchema(schemaName) {
    try {
        await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
        console.log(`✅ Schema '${schemaName}' created`);
    } catch (err) {
        console.error(`❌ Failed to create schema '${schemaName}':`, err.message);
        throw err;
    }
}

async function createTenantTablesFromFeatures(schemaName, enabledFeatures) {
    try {
        console.log(`🔄 Creating tables for features: ${enabledFeatures.join(', ')}`);
        const models = TenantModelLoader.loadModels(schemaName);

        // 1) Fitur tanpa urutan khusus
        for (const featureKey of enabledFeatures) {
            if (['raw_materials','products','customers','sales','receivables','expenses','payables'].includes(featureKey)) {
                continue;
            }
            switch (featureKey) {
                case 'users': await models.User.sync({ force:false }); break;
                case 'company': await models.CompanyProfile.sync({ force:false }); break;
                case 'branches':
                    await models.Branch.sync({ force:false });
                    await models.BranchCapitalTransaction.sync({ force:false });
                    break;
                case 'inventory_assets': await models.InventoryAsset.sync({ force:false }); break;
                case 'employees': await models.Employee.sync({ force:false }); break;
                default: console.log(`(info) No direct sync handler for feature '${featureKey}'`);
            }
        }

        // 2) RAW MATERIALS
        if (enabledFeatures.includes('raw_materials')) {
            await models.RawMaterialCategory.sync({ force:false });
            await models.RawMaterial.sync({ force:false });
            await models.RawMaterialStock.sync({ force:false });
            await models.RawMaterialMove.sync({ force:false });
        }

        // 3) PRODUCTS
        if (enabledFeatures.includes('products')) {
            await models.ProductCategory.sync({ force:false });
            await models.SizeCategory.sync({ force:false });
            await models.UnitCategory.sync({ force:false });
            await models.CustomerCategory.sync({ force:false });
            await models.Product.sync({ force:false });
            await models.ProductSpecialPrice.sync({ force:false });
        }

        // 4) CUSTOMERS
        if (enabledFeatures.includes('customers')) {
            await models.Customer.sync({ force:false });
            await models.CustomerDeposit.sync({ force:false });
            await models.CustomerComplaint.sync({ force:false });
        }

        // 5) SALES
        if (enabledFeatures.includes('sales')) {
            await models.SalesOrder.sync({ force:false });
            await models.SalesOrderItem.sync({ force:false });
            await models.SalesNoteRequest.sync({ force:false });
            await models.SalesNoteActionLog.sync({ force:false });
        }

        // 6) RECEIVABLES
        if (enabledFeatures.includes('receivables')) {
            await models.Receivable.sync({ force:false });
            await models.ReceivableSchedule.sync({ force:false });
            await models.ReceivablePayment.sync({ force:false });
        }

        // 7) EXPENSES
        if (enabledFeatures.includes('expenses')) {
            await models.Expense.sync({ force:false });
        }

        // 8) PAYABLES
        if (enabledFeatures.includes('payables')) {
            await models.Payable.sync({ force:false });
            await models.PayableSchedule.sync({ force:false });
            await models.PayablePayment.sync({ force:false });
        }

        if (enabledFeatures.includes('progress')) {
            await models.ProgressCategory.sync({ force:false });
            await models.ProgressStage.sync({ force:false });
            await models.ProgressInstance.sync({ force:false });
            await models.ProgressInstanceStage.sync({ force:false });
        }

        // Menu (selalu)
        if (enabledFeatures.includes('menus') || true) {
            await models.NavMenu.sync({ force:false });
            await models.NavItem.sync({ force:false });
        }

        // ✅ WhatsApp (Enhanced)
        if (enabledFeatures.includes('whatsapp') || enabledFeatures.includes('wa')) {
            // Sync dalam urutan yang benar (parent table dulu)
            await models.WaSessionMode.sync({ force:false });
            await models.WaSession.sync({ force:false });

            await models.WaGroupMode.sync({ force:false });
            await models.WaDetailMode.sync({ force:false });
            await models.WaGroup.sync({ force:false });

            await models.WaAuthorizedUser.sync({ force:false });
            await models.WaLogSession.sync({ force:false });

            console.log(`✅ WhatsApp tables synced for ${schemaName}`);
        }

        // 9) Core fallback
        if (!enabledFeatures.includes('users')) {
            await models.User.sync({ force:false });
        }

        console.log(`✅ All feature tables created for tenant: ${schemaName}`);
    } catch (err) {
        console.error(`❌ Failed to create tables for tenant '${schemaName}':`, err.message);
        throw err;
    }
}

async function getAllTenants(includeInactive = false) {
    const where = includeInactive ? {} : { is_active: true };
    return await Tenant.findAll({ where, order: [['created_at', 'ASC']] });
}

async function getTenantBySlug(slug) {
    return await Tenant.findOne({ where: { slug, is_active: true } });
}

async function getTenantByDomain(domain) {
    return await Tenant.findOne({ where: { domain, is_active: true } });
}

async function updateTenant(id, updates) {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
        throw new Error("Tenant not found");
    }

    return await tenant.update(updates);
}

async function deleteTenant(id) {
    const tenant = await Tenant.findByPk(id);
    if (!tenant) {
        throw new Error("Tenant not found");
    }

    // Optionally, you might want to drop the schema
    await sequelize.query(`DROP SCHEMA IF EXISTS "${tenant.schema_name}" CASCADE`);

    return await tenant.destroy();
}

module.exports = {
    createTenant,
    getAllTenants,
    getTenantBySlug,
    getTenantByDomain,
    updateTenant,
    deleteTenant,
    createTenantSchema,
    createTenantTablesFromFeatures
};