const TenantModelLoader = require('../../tenants/loader');

class MenuController {
    _m(schema){
        return {
            NavMenu: TenantModelLoader.getModel('NavMenu', schema),
            NavItem: TenantModelLoader.getModel('NavItem', schema),
        };
    }

    // GET /api/menus/tree?key=main
    async getTree(req,res){
        try{
            const schema = req.schema; if(!schema) return res.status(400).json({error:'TENANT_REQUIRED'});
            const key = (req.query.key || 'main').toString();
            const role = req.user?.userRole || req.user?.role || 'user';
            const modules = req.tenantModules || {}; // isi via middleware tenantResolver (opsional)

            const { NavMenu, NavItem } = this._m(schema);
            const menu = await NavMenu.findOne({ where:{ key, is_active:true } });
            if(!menu) return res.json({ items: [] });

            const rows = await NavItem.findAll({ where:{ menu_id: menu.id, is_active: true }, order:[['order_index','ASC']] });

            // filter by role & features
            const pass = (item) => {
                // by role
                if (Array.isArray(item.roles_allowed) && item.roles_allowed.length > 0) {
                    if (!item.roles_allowed.includes(role)) return false;
                }
                // by features/modules
                if (Array.isArray(item.features_required) && item.features_required.length > 0) {
                    if (!modules || Object.keys(modules).length === 0) return false;
                    for (const f of item.features_required) {
                        if (modules[f] !== true) return false;
                    }
                }
                return true;
            };


            const byId = new Map(); rows.forEach(r=>byId.set(r.id, r));
            const tree = [];
            const childrenMap = new Map();
            for (const r of rows){
                if (!pass(r)) continue;
                const pid = r.parent_id || 'root';
                if (!childrenMap.has(pid)) childrenMap.set(pid, []);
                childrenMap.get(pid).push(r);
            }
            const sortKids = (arr)=> arr.sort((a,b)=> (a.order_index||0) - (b.order_index||0));

            const build = (pid, level=0)=>{
                const kids = sortKids(childrenMap.get(pid)||[]);
                return kids.map(k => ({
                    id: k.id, label: k.label, path: k.path, icon: k.icon, group_label: k.group_label,
                    children: build(k.id, level+1)
                }));
            };
            const root = build('root');

            res.json({ items: root });
        }catch(e){
            console.error(e);
            res.status(500).json({error:'SERVER_ERROR'});
        }
    }

    // POST /api/menus  { key, name }
    async createMenu(req,res){
        try{
            const schema = req.schema; const { key='main', name='Main Menu' } = req.body || {};
            const { NavMenu } = this._m(schema);
            const exists = await NavMenu.findOne({ where:{ key } });
            if (exists) return res.status(409).json({error:'MENU_KEY_EXISTS'});
            const m = await NavMenu.create({ key, name, is_active:true });
            res.status(201).json({ menu:m });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // POST /api/menus/items
    async upsertItem(req,res){
        try{
            const schema = req.schema; const { NavMenu, NavItem } = this._m(schema);
            const {
                id=null, menu_key='main', parent_id=null, order_index=0, group_label=null,
                label, path=null, icon=null, roles_allowed=null, features_required=null, is_active=true
            } = req.body;
            if(!label) return res.status(400).json({error:'LABEL_REQUIRED'});

            const menu = await NavMenu.findOne({ where:{ key:menu_key } });
            if(!menu) return res.status(404).json({error:'MENU_NOT_FOUND'});

            let item;
            if(id){
                item = await NavItem.findByPk(id);
                if(!item) return res.status(404).json({error:'ITEM_NOT_FOUND'});
                await item.update({ parent_id, order_index, group_label, label, path, icon, roles_allowed, features_required, is_active, menu_id: menu.id });
            }else{
                item = await NavItem.create({ menu_id: menu.id, parent_id, order_index, group_label, label, path, icon, roles_allowed, features_required, is_active });
            }
            res.status(201).json({ item });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }

    // DELETE /api/menus/items/:id
    async removeItem(req,res){
        try{
            const schema = req.schema; const { id } = req.params; const { NavItem } = this._m(schema);
            const it = await NavItem.findByPk(id);
            if(!it) return res.status(404).json({error:'NOT_FOUND'});
            // hapus subtree
            const all = await NavItem.findAll({ where:{ menu_id: it.menu_id } });
            const victims = new Set([id]);
            let changed = true;
            while(changed){
                changed = false;
                for (const r of all){
                    if (r.parent_id && victims.has(r.parent_id)) {
                        if(!victims.has(r.id)){ victims.add(r.id); changed = true; }
                    }
                }
            }
            await NavItem.destroy({ where:{ id:[...victims] } });
            res.json({ ok:true, removed: victims.size });
        }catch(e){ console.error(e); res.status(500).json({error:'SERVER_ERROR'}); }
    }
}

module.exports = new MenuController();
