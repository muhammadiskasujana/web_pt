require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const sequelize = require("./config/db");
const path = require('path');

const { getAllTenants } = require('./services/tenantService');
const waSvc = require('./modules/whatsapp/service');

// Import models and set up associations
require("./models"); // This will load all models and associations

// Middleware
const tenantResolver = require("./middleware/tenantResolver");
const featureGuard = require("./middleware/featureGuard");
const authRoutes = require('./routes/auth');

// Routes

const tenantRoutes = require("./routes/master/tenants");
const featureRoutes = require("./routes/master/feature");
const tierRoutes = require("./routes/master/tier");
const tierFeatureRoutes = require("./routes/master/tierFeature");
const userRoutes = require("./modules/user/routes");
const userRoleRoutes = require("./modules/userRole/routes");
const productRoutes = require("./modules/product/routes");
const categoriesRoutes = require("./modules/categories/routes");
const companyRoutes = require('./modules/company/routes');
const branchRoutes = require('./modules/branch/routes');
const inventoryAssetRoutes = require('./modules/inventoryAsset/routes');
const rawMaterialRoutes = require('./modules/rawMaterial/routes');
const employeeRoutes = require('./modules/employee/routes');
const salesRoutes = require('./modules/sales/routes');
const receivableRoutes = require('./modules/receivable/routes');
const expenseRoutes = require('./modules/expense/routes');
const payableRoutes = require('./modules/payable/routes');
const reportRoutes = require('./modules/reports/routes');
const customerRoutes = require('./modules/customer/routes');
const progressRoutes = require('./modules/progres/routes');
const menuRoutes = require('./modules/menu/routes');
const waRoutes = require('./modules/whatsapp/routes')



const app = express();

// CORS configuration - Add this BEFORE other middleware
app.use(cors({
  origin: (origin, cb) => cb(null, true),  // mirror origin apapun
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Tenant'],
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser()); // ✅ Add this middleware

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Public routes
app.use('/api/auth', authRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Master routes (managing tenants, tiers, features, etc.)
app.use("/api/master/tenants", tenantRoutes);
app.use("/api/master/features", featureRoutes);
app.use("/api/master/tiers", tierRoutes);
app.use("/api/master/tier-features", tierFeatureRoutes);
app.use("/api/master/user-roles", userRoleRoutes);

// User management routes
app.use("/api/users", userRoutes);

// Tenant routes (per tenant schema)

app.use("/api/products", productRoutes);
app.use("/api/catalog", categoriesRoutes); // product|size|unit|customer
app.use("/api/company", companyRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/assets", inventoryAssetRoutes);
app.use("/api/raw-materials", rawMaterialRoutes);
app.use("/api/employees", employeeRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/receivables', receivableRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payables', payableRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/select', menuRoutes);
app.use('/api/whatsapp', waRoutes);


// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors.map(e => ({ field: e.path, message: e.message }))
    });
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      error: "Duplicate entry",
      field: err.errors[0]?.path,
      message: err.errors[0]?.message
    });
  }

  // Handle foreign key constraint errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      error: "Foreign key constraint violation",
      message: "Referenced record does not exist"
    });
  }

  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
async function start() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    // Sync models (be careful in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log("✅ Models synchronized");
    }

    // 🔁 Auto-resume semua sesi WhatsApp untuk tiap tenant
    try {
      const tenants = await getAllTenants(true); // true = includeInactive kalau mau
      for (const t of tenants) {
        const schema = t.schema_name;
        await waSvc.resumeAllForTenant(schema);
        console.log(`▶️  WA sessions resumed for ${schema}`);
      }

      // ✅ Add periodic health check (every 5 minutes)
      setInterval(async () => {
        try {
          for (const t of tenants) {
            await waSvc.healthCheck(t.schema_name);
          }
        } catch (error) {
          console.error("⚠️ Health check error:", error.message);
        }
      }, 5 * 60 * 1000); // 5 minutes

    } catch (e) {
      console.error("⚠️ WA resume error:", e.message);
    }

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

start();
