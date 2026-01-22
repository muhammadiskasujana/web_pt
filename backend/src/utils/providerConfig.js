const fs = require('fs');
const path = require('path');

const CONFIG_DIR  = path.join(process.cwd(), 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'ceklog.provider.json');

const DEFAULT_CONFIG = {
    provider: 'legacy', // 'legacy' | 'vscode3'
    updated_at: new Date().toISOString()
};

async function ensureDir(p) {
    await fs.promises.mkdir(p, { recursive: true }).catch(() => {});
}

async function loadProviderConfig() {
    try {
        await ensureDir(CONFIG_DIR);
        const raw = await fs.promises.readFile(CONFIG_FILE, 'utf-8');
        const json = JSON.parse(raw);
        if (!json || (json.provider !== 'legacy' && json.provider !== 'vscode3')) {
            return DEFAULT_CONFIG;
        }
        return json;
    } catch {
        // create default when missing/corrupt
        await saveProviderConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
    }
}

async function saveProviderConfig(cfg) {
    await ensureDir(CONFIG_DIR);
    const data = JSON.stringify(
        { ...DEFAULT_CONFIG, ...cfg, updated_at: new Date().toISOString() },
        null,
        2
    );
    // atomic-ish write
    const tmp = CONFIG_FILE + '.tmp';
    await fs.promises.writeFile(tmp, data, 'utf-8');
    await fs.promises.rename(tmp, CONFIG_FILE);
}

async function getActiveProvider() {
    const cfg = await loadProviderConfig();
    return cfg.provider;
}

async function setActiveProvider(provider) {
    if (!['legacy', 'vscode3'].includes(provider)) {
        const err = new Error('Invalid provider');
        err.code = 'INVALID_PROVIDER';
        throw err;
    }
    await saveProviderConfig({ provider });
    return provider;
}

module.exports = {
    loadProviderConfig,
    saveProviderConfig,
    getActiveProvider,
    setActiveProvider,
    CONFIG_FILE
};
