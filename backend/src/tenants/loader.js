
// tenants/loader.js
const defineProductModel = require("../modules/product/model");
const defineProductCategoryModel = require("../modules/productCategory/model");
const defineSizeCategoryModel = require("../modules/sizeCategory/model");
const defineUnitCategoryModel = require("../modules/unitCategory/model");
const defineCustomerCategoryModel = require("../modules/customerCategory/model");
const defineProductSpecialPriceModel = require("../modules/productSpecialPrice/model");

const defineUserModel = require("../modules/user/model");

// company & branch
const defineCompanyProfileModel = require("../modules/company/model");
const { defineBranchModel, defineBranchCapitalTxnModel } = require("../modules/branch/model");

// assets
const defineInventoryAssetModel = require("../modules/inventoryAsset/model");

// raw materials
const {
    defineRawMaterialCategoryModel,
    defineRawMaterialModel,
    defineRawMaterialStockModel,
    defineRawMaterialMoveModel
} = require("../modules/rawMaterial/model");

const {
    defineCustomerModel,
    defineCustomerDepositModel,
    defineCustomerComplaintModel,
} = require('../modules/customer/model');

// employees
const defineEmployeeModel = require("../modules/employee/model");

const {
    defineSalesOrderModel,
    defineSalesOrderItemModel,
    defineSalesNoteRequestModel,
    defineSalesNoteActionLogModel
} = require('../modules/sales/model');

const {
    defineReceivableModel,
    defineReceivableScheduleModel,
    defineReceivablePaymentModel
} = require('../modules/receivable/model');

const defineExpenseModel = require('../modules/expense/model');

const {
    definePayableModel,
    definePayableScheduleModel,
    definePayablePaymentModel
} = require('../modules/payable/model');

const {
    defineProgressCategoryModel,
    defineProgressStageModel,
    defineProgressInstanceModel,
    defineProgressInstanceStageModel,
} = require('../modules/progres/model');

// ✅ Update WhatsApp imports
const {
    defineWhatsappSessionModel,
    defineWhatsappSessionModeModel,
    defineWhatsappGroupModel,
    defineWhatsappGroupModeModel,
    defineWhatsappDetailModeModel,
    defineWhatsappAuthorizedUserModel,
    defineWhatsappMessageLogModel
} = require("../modules/whatsapp/model");

const { defineNavMenuModel, defineNavItemModel } = require('../modules/menu/model');

class TenantModelLoader {
    static _bySchema = new Map();

    static loadModels(schema) {
        const cached = this._bySchema.get(schema);
        if (cached) return cached;

        const models = {
            // core
            User: defineUserModel(schema),

            // products (lengkap)
            ProductCategory: defineProductCategoryModel(schema),
            SizeCategory: defineSizeCategoryModel(schema),
            UnitCategory: defineUnitCategoryModel(schema),
            CustomerCategory: defineCustomerCategoryModel(schema),
            Product: defineProductModel(schema),
            ProductSpecialPrice: defineProductSpecialPriceModel(schema),

            ProgressCategory : defineProgressCategoryModel(schema),
            ProgressStage : defineProgressStageModel(schema),
            ProgressInstance : defineProgressInstanceModel(schema),
            ProgressInstanceStage : defineProgressInstanceStageModel(schema),

            // company & branch
            CompanyProfile: defineCompanyProfileModel(schema),
            Branch: defineBranchModel(schema),
            BranchCapitalTransaction: defineBranchCapitalTxnModel(schema),

            // inventory assets
            InventoryAsset: defineInventoryAssetModel(schema),

            // raw materials
            RawMaterialCategory: defineRawMaterialCategoryModel(schema),
            RawMaterial: defineRawMaterialModel(schema),
            RawMaterialStock: defineRawMaterialStockModel(schema),
            RawMaterialMove: defineRawMaterialMoveModel(schema),

            // employees
            Employee: defineEmployeeModel(schema),

            // Sales
            SalesOrder: defineSalesOrderModel(schema),
            SalesOrderItem: defineSalesOrderItemModel(schema),
            SalesNoteRequest: defineSalesNoteRequestModel(schema),
            SalesNoteActionLog: defineSalesNoteActionLogModel(schema),

            // Receivable
            Receivable: defineReceivableModel(schema),
            ReceivableSchedule: defineReceivableScheduleModel(schema),
            ReceivablePayment: defineReceivablePaymentModel(schema),

            // Expense
            Expense: defineExpenseModel(schema),

            // Payable
            Payable: definePayableModel(schema),
            PayableSchedule: definePayableScheduleModel(schema),
            PayablePayment: definePayablePaymentModel(schema),

            Customer: defineCustomerModel(schema),
            CustomerDeposit: defineCustomerDepositModel(schema),
            CustomerComplaint: defineCustomerComplaintModel(schema),

            NavMenu: defineNavMenuModel(schema),
            NavItem: defineNavItemModel(schema),

            // ✅ WhatsApp models (updated)
            WaSession: defineWhatsappSessionModel(schema),
            WaSessionMode: defineWhatsappSessionModeModel(schema),
            WaGroup: defineWhatsappGroupModel(schema),
            WaGroupMode: defineWhatsappGroupModeModel(schema),
            WaDetailMode: defineWhatsappDetailModeModel(schema),
            WaAuthorizedUser: defineWhatsappAuthorizedUserModel(schema),
            WaLogSession: defineWhatsappMessageLogModel(schema),

            _associationsReady: false
        };

        this.setupAssociations(models);
        this._bySchema.set(schema, models);
        return models;
    }

    static setupAssociations(m) {
        if (m._associationsReady) return;

        // ===== PRODUCTS =====
        // Product ↔ categories
        m.Product.belongsTo(m.ProductCategory, { as: 'category', foreignKey: 'product_category_id' });
        m.ProductCategory.hasMany(m.Product, { as: 'products', foreignKey: 'product_category_id' });

        m.Product.belongsTo(m.SizeCategory, { as: 'sizeCategory', foreignKey: 'size_category_id' });
        m.SizeCategory.hasMany(m.Product, { as: 'products', foreignKey: 'size_category_id' });

        m.Product.belongsTo(m.UnitCategory, { as: 'unitCategory', foreignKey: 'unit_category_id' });
        m.UnitCategory.hasMany(m.Product, { as: 'products', foreignKey: 'unit_category_id' });

        // Product ↔ special prices ↔ customer categories
        m.Product.hasMany(m.ProductSpecialPrice, { as: 'specialPrices', foreignKey: 'product_id', onDelete: 'CASCADE' });
        m.ProductSpecialPrice.belongsTo(m.Product, { as: 'product', foreignKey: 'product_id' });

        m.CustomerCategory.hasMany(m.ProductSpecialPrice, { as: 'specialPrices', foreignKey: 'customer_category_id', onDelete: 'CASCADE' });
        m.ProductSpecialPrice.belongsTo(m.CustomerCategory, { as: 'customerCategory', foreignKey: 'customer_category_id' });

        // ===== BRANCH capital transfers =====
        m.BranchCapitalTransaction.belongsTo(m.Branch, { as: 'fromBranch', foreignKey: 'from_branch_id' });
        m.BranchCapitalTransaction.belongsTo(m.Branch, { as: 'toBranch', foreignKey: 'to_branch_id' });
        m.Branch.hasMany(m.BranchCapitalTransaction, { as: 'capitalOut', foreignKey: 'from_branch_id' });
        m.Branch.hasMany(m.BranchCapitalTransaction, { as: 'capitalIn', foreignKey: 'to_branch_id' });

        // ===== Inventory assets ↔ branch =====
        m.InventoryAsset.belongsTo(m.Branch, { as: 'branch', foreignKey: 'branch_id' });
        m.Branch.hasMany(m.InventoryAsset, { as: 'assets', foreignKey: 'branch_id' });

        // ===== Raw materials =====
        m.RawMaterial.belongsTo(m.RawMaterialCategory, { as: 'category', foreignKey: 'category_id' });
        m.RawMaterialCategory.hasMany(m.RawMaterial, { as: 'materials', foreignKey: 'category_id' });

        m.RawMaterialStock.belongsTo(m.RawMaterial, { as: 'material', foreignKey: 'material_id' });
        m.RawMaterial.hasMany(m.RawMaterialStock, { as: 'stocks', foreignKey: 'material_id' });

        m.RawMaterialStock.belongsTo(m.Branch, { as: 'branch', foreignKey: 'branch_id' });
        m.Branch.hasMany(m.RawMaterialStock, { as: 'materialStocks', foreignKey: 'branch_id' });

        m.RawMaterialMove.belongsTo(m.RawMaterial, { as: 'material', foreignKey: 'material_id' });
        m.RawMaterial.hasMany(m.RawMaterialMove, { as: 'moves', foreignKey: 'material_id' });

        m.RawMaterialMove.belongsTo(m.Branch, { as: 'branch', foreignKey: 'branch_id' });
        m.Branch.hasMany(m.RawMaterialMove, { as: 'materialMoves', foreignKey: 'branch_id' });

        // ===== Employee ↔ branch =====
        m.Employee.belongsTo(m.Branch, { as: 'branch', foreignKey: 'branch_id' });
        m.Branch.hasMany(m.Employee, { as: 'employees', foreignKey: 'branch_id' });

        // ===== Sales =====
        m.SalesOrder.belongsTo(m.Customer, { as: 'customer', foreignKey: 'customer_id' });
        m.Customer.hasMany(m.SalesOrder, { as: 'salesOrders', foreignKey: 'customer_id' });

        m.SalesOrder.belongsTo(m.Branch, { as: 'branch', foreignKey: 'branch_id' });
        m.Branch.hasMany(m.SalesOrder, { as: 'salesOrders', foreignKey: 'branch_id' });

        m.SalesOrderItem.belongsTo(m.SalesOrder, { as: 'salesOrder', foreignKey: 'sales_order_id' });
        m.SalesOrder.hasMany(m.SalesOrderItem, {
            as: 'items',
            foreignKey: 'sales_order_id',
            onDelete: 'CASCADE',
        });

// ✅ SalesNoteRequest (single definition with CASCADE)
        m.SalesNoteRequest.belongsTo(m.SalesOrder, {
            as: 'salesOrder',
            foreignKey: 'sales_order_id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
        m.SalesOrder.hasMany(m.SalesNoteRequest, {
            as: 'noteRequests',
            foreignKey: 'sales_order_id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

// ✅ SalesNoteActionLog (new, keep this)
        m.SalesNoteActionLog.belongsTo(m.SalesOrder, {
            as: 'salesOrder',
            foreignKey: 'sales_order_id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
        m.SalesOrder.hasMany(m.SalesNoteActionLog, {
            as: 'actionLogs',
            foreignKey: 'sales_order_id',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        // ===== Receivables =====
        m.Receivable.belongsTo(m.Customer, { as: 'customer', foreignKey: 'customer_id' });
        m.Customer.hasMany(m.Receivable, { as: 'receivables', foreignKey: 'customer_id' });

        m.Receivable.belongsTo(m.SalesOrder, { as: 'salesOrder', foreignKey: 'sales_order_id' });
        m.SalesOrder.hasOne(m.Receivable, { as: 'receivable', foreignKey: 'sales_order_id' });

        m.ReceivableSchedule.belongsTo(m.Receivable, { as: 'receivable', foreignKey: 'receivable_id' });
        m.Receivable.hasMany(m.ReceivableSchedule, { as: 'schedules', foreignKey: 'receivable_id', onDelete: 'CASCADE' });

        m.ReceivablePayment.belongsTo(m.Receivable, { as: 'receivable', foreignKey: 'receivable_id' });
        m.Receivable.hasMany(m.ReceivablePayment, { as: 'payments', foreignKey: 'receivable_id', onDelete: 'CASCADE' });

        // ===== Payables =====
        m.PayableSchedule.belongsTo(m.Payable, { as: 'payable', foreignKey: 'payable_id' });
        m.Payable.hasMany(m.PayableSchedule, { as: 'schedules', foreignKey: 'payable_id', onDelete: 'CASCADE' });

        m.PayablePayment.belongsTo(m.Payable, { as: 'payable', foreignKey: 'payable_id' });
        m.Payable.hasMany(m.PayablePayment, { as: 'payments', foreignKey: 'payable_id', onDelete: 'CASCADE' });

        // ===== Customers =====
        m.Customer.belongsTo(m.CustomerCategory, { as: 'category', foreignKey: 'customer_category_id' });
        m.CustomerCategory.hasMany(m.Customer, { as: 'customers', foreignKey: 'customer_category_id' });

        m.CustomerDeposit.belongsTo(m.Customer, { as: 'customer', foreignKey: 'customer_id' });
        m.Customer.hasMany(m.CustomerDeposit, { as: 'deposits', foreignKey: 'customer_id' });

        m.CustomerComplaint.belongsTo(m.Customer, { as: 'customer', foreignKey: 'customer_id' });
        m.Customer.hasMany(m.CustomerComplaint, { as: 'complaints', foreignKey: 'customer_id' });

        // ===== Progress =====
        m.ProgressStage.belongsTo(m.ProgressCategory, { as: 'category', foreignKey: 'category_id' });
        m.ProgressCategory.hasMany(m.ProgressStage, { as: 'stages', foreignKey: 'category_id' });

        m.ProgressInstance.belongsTo(m.ProgressCategory, { as: 'category', foreignKey: 'category_id' });
        m.ProgressCategory.hasMany(m.ProgressInstance, { as: 'instances', foreignKey: 'category_id' });

        m.ProgressInstanceStage.belongsTo(m.ProgressInstance, { as: 'instance', foreignKey: 'instance_id' });
        m.ProgressInstance.hasMany(m.ProgressInstanceStage, { as: 'stages', foreignKey: 'instance_id' });

        m.ProgressInstanceStage.belongsTo(m.ProgressStage, { as: 'stage', foreignKey: 'stage_id' });
        m.ProgressStage.hasMany(m.ProgressInstanceStage, { as: 'instanceStages', foreignKey: 'stage_id' });

        m.ProgressInstance.belongsTo(m.SalesOrder, {
            as: 'salesOrder',
            foreignKey: 'sales_order_id',
            onDelete: 'CASCADE',
        });
        m.SalesOrder.hasMany(m.ProgressInstance, {
            as: 'progressInstances',
            foreignKey: 'sales_order_id',
            onDelete: 'CASCADE',
        });

// (opsional tapi disarankan) SalesOrderItem ↔ ProgressInstance
        m.ProgressInstance.belongsTo(m.SalesOrderItem, {
            as: 'salesOrderItem',
            foreignKey: 'sales_order_item_id',
            onDelete: 'CASCADE',
        });
        m.SalesOrderItem.hasMany(m.ProgressInstance, {
            as: 'progressInstances',
            foreignKey: 'sales_order_item_id',
            onDelete: 'CASCADE',
        });
        // ===== Navigation =====
        m.NavItem.belongsTo(m.NavMenu, { as: 'menu', foreignKey: 'menu_id' });
        m.NavMenu.hasMany(m.NavItem, { as: 'items', foreignKey: 'menu_id', onDelete: 'CASCADE' });

        m.NavItem.belongsTo(m.NavItem, { as: 'parent', foreignKey: 'parent_id' });
        m.NavItem.hasMany(m.NavItem, { as: 'children', foreignKey: 'parent_id', onDelete: 'CASCADE' });

        // ===== ✅ WHATSAPP ASSOCIATIONS =====
        // Session ↔ Session Mode
        m.WaSession.belongsTo(m.WaSessionMode, { as: 'sessionMode', foreignKey: 'session_mode_id' });
        m.WaSessionMode.hasMany(m.WaSession, { as: 'sessions', foreignKey: 'session_mode_id' });

        // Group ↔ Session
        m.WaGroup.belongsTo(m.WaSession, { as: 'session', foreignKey: 'session_id' });
        m.WaSession.hasMany(m.WaGroup, { as: 'groups', foreignKey: 'session_id', onDelete: 'CASCADE' });

        // Group ↔ Group Mode
        m.WaGroup.belongsTo(m.WaGroupMode, { as: 'groupMode', foreignKey: 'group_mode_id' });
        m.WaGroupMode.hasMany(m.WaGroup, { as: 'groups', foreignKey: 'group_mode_id' });

        // Group ↔ Detail Mode
        m.WaGroup.belongsTo(m.WaDetailMode, { as: 'detailMode', foreignKey: 'detail_mode_id' });
        m.WaDetailMode.hasMany(m.WaGroup, { as: 'groups', foreignKey: 'detail_mode_id' });

        // Detail Mode ↔ Group Mode
        m.WaDetailMode.belongsTo(m.WaGroupMode, { as: 'groupMode', foreignKey: 'group_mode_id' });
        m.WaGroupMode.hasMany(m.WaDetailMode, { as: 'detailModes', foreignKey: 'group_mode_id', onDelete: 'CASCADE' });

        // Authorized Users ↔ Session
        m.WaAuthorizedUser.belongsTo(m.WaSession, { as: 'session', foreignKey: 'session_id' });
        m.WaSession.hasMany(m.WaAuthorizedUser, { as: 'authorizedUsers', foreignKey: 'session_id', onDelete: 'CASCADE' });

        // Authorized Users ↔ Group
        m.WaAuthorizedUser.belongsTo(m.WaGroup, { as: 'group', foreignKey: 'group_id' });
        m.WaGroup.hasMany(m.WaAuthorizedUser, { as: 'authorizedUsers', foreignKey: 'group_id', onDelete: 'CASCADE' });

        // Message Log ↔ Session
        m.WaLogSession.belongsTo(m.WaSession, { as: 'session', foreignKey: 'session_id' });
        m.WaSession.hasMany(m.WaLogSession, { as: 'messageLogs', foreignKey: 'session_id', onDelete: 'CASCADE' });

        // Message Log ↔ Group
        m.WaLogSession.belongsTo(m.WaGroup, { as: 'group', foreignKey: 'group_id' });
        m.WaGroup.hasMany(m.WaLogSession, { as: 'messageLogs', foreignKey: 'group_id', onDelete: 'CASCADE' });

        m._associationsReady = true;
    }

    static getModel(modelName, schema) {
        const models = this.loadModels(schema);
        const model = models[modelName];
        if (!model) {
            throw new Error(`Model '${modelName}' not found in schema '${schema}'`);
        }
        return model;
    }
}

module.exports = TenantModelLoader;