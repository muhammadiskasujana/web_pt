const TenantModelLoader = require('../../tenants/loader');

async function seedDefaultMenu(schema, modules){
    const { NavMenu, NavItem } = TenantModelLoader.loadModels(schema);
    let menu = await NavMenu.findOne({ where:{ key:'main' } });
    if(!menu) menu = await NavMenu.create({ key:'main', name:'Main Menu' });

    const add = (p)=> NavItem.create({ menu_id: menu.id, ...p });

    // contoh mapping dari Layout kamu sekarang
    const groupAktivitas = 'Aktivitas';
    const groupOperasional = 'Operasional';
    const groupPenjualan = 'Penjualan';
    const groupKeuangan = 'Keuangan';
    const groupCompany = 'Data Perusahaan';

    // Root items (pakai parent_id:null)
    await add({ order_index: 0, label:'Dashboard', path:'/dashboard', icon:'LayoutDashboard', roles_allowed:null, features_required:null, group_label:null });

    // Aktivitas
    await add({ order_index: 10, label:'Progres', path:'/progress/instances', icon:'CableCar', roles_allowed:['owner','manager','admin'], features_required:['progress'], group_label:groupAktivitas });
    await add({ order_index: 11, label:'Progres Kategori', path:'/progress/categories', icon:'ChartBarStacked', roles_allowed:['owner','manager','admin'], features_required:['progress'], group_label:groupAktivitas });
    await add({ order_index: 12, label:'Set Progres Produk', path:'/progress/assign', icon:'Package', roles_allowed:['owner','manager','admin'], features_required:['progress','products'], group_label:groupAktivitas });

    // Operasional
    await add({ order_index: 20, label:'Produk', path:'/products', icon:'Package', roles_allowed:['owner','manager','admin'], features_required:['products'], group_label:groupOperasional });
    await add({ order_index: 21, label:'Bahan Baku', path:'/raw-materials', icon:'Boxes', roles_allowed:['owner','manager','admin'], features_required:['raw_materials'], group_label:groupOperasional });
    await add({ order_index: 22, label:'Pelanggan', path:'/customers', icon:'User', roles_allowed:['owner','manager','admin'], features_required:['customers'], group_label:groupOperasional });
    await add({ order_index: 23, label:'Karyawan', path:'/employees', icon:'Users', roles_allowed:['owner','manager','admin'], features_required:['employees'], group_label:groupOperasional });
    // Penjualan
    await add({ order_index: 30, label:'Penjualan', path:'/sales', icon:'FileText', roles_allowed:['owner','manager','admin'], features_required:['sales'], group_label:groupPenjualan });
    await add({ order_index: 31, label:'Pengeluaran', path:'/expenses', icon:'Wallet', roles_allowed:['owner','manager','admin'], features_required:['expenses'], group_label:groupPenjualan });
    await add({ order_index: 32, label:'Sales Approvals', path:'/sales/requests', icon:'FileText', roles_allowed:['owner','manager','admin'], features_required:['sales'], group_label:groupPenjualan });

    // Keuangan
    await add({ order_index: 40, label:'Piutang', path:'/receivables', icon:'FileText', roles_allowed:['owner','manager','admin'], features_required:['receivables'], group_label:groupKeuangan });
    await add({ order_index: 41, label:'Hutang', path:'/payables', icon:'FileText', roles_allowed:['owner','manager','admin'], features_required:['payables'], group_label:groupKeuangan });
    await add({ order_index: 42, label:'Laporan', path:'/reports', icon:'BarChart3', roles_allowed:['owner','manager','admin'], features_required:null, group_label:groupKeuangan });

    // Company
    await add({ order_index: 50, label:'Profil', path:'/company', icon:'Building2', roles_allowed:null, features_required:['company'], group_label:groupCompany });
    await add({ order_index: 51, label:'Cabang', path:'/branches', icon:'GitBranch', roles_allowed:null, features_required:['branches'], group_label:groupCompany });
    await add({ order_index: 52, label:'Transfer Modal', path:'/branches/transfers', icon:'Wallet', roles_allowed:null, features_required:['branches'], group_label:groupCompany });

    return true;
}

module.exports = { seedDefaultMenu };
