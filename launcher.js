const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- INITIAL SETUP ---
const CONFIG_PATH = './config.json';
const PROFILES_DIR = './profiles';
if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR);

const DEFAULT_CONFIG = {
    versions: { 
        "2.0": "D:\\Factorio_2.0\\bin\\x64\\factorio.exe", 
        "2.1": "D:\\Factorio_2.1\\bin\\x64\\factorio.exe" 
    },
    mods_base_dir: "D:\\Factorio_Shared\\mods",
    saves_base_dir: "D:\\Factorio_Shared\\saves",
    auto_load_save: null,
    active_version: "2.1",
    active_profile: "standart"
};

let config;
function saveConfig() { fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2)); }

if (!fs.existsSync(CONFIG_PATH)) {
    config = DEFAULT_CONFIG;
    saveConfig();
} else {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    let updated = false;
    for (let key in DEFAULT_CONFIG) {
        if (config[key] === undefined) {
            config[key] = DEFAULT_CONFIG[key];
            updated = true;
        }
    }
    if (updated) saveConfig();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const C = {
    reset: "\x1b[0m", bright: "\x1b[1m", green: "\x1b[32m", 
    yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m", 
    magenta: "\x1b[35m", blue: "\x1b[34m"
};

// --- UI ---
function showMenu() {
    process.stdout.write('\x1Bc'); 
    console.log(`${C.magenta}============================================${C.reset}`);
    console.log(`${C.magenta}--- DUNGEON MASTER CONSOLE (DMC) ---${C.reset}`);
    console.log(`${C.magenta}============================================${C.reset}`);
    console.log(`${C.bright} VERSION: ${C.cyan}${config.active_version}${C.reset}`);
    console.log(`${C.bright} PROFILE: ${C.yellow}${config.active_profile}${C.reset}`); 
    console.log(`${C.bright} TARGET SAVE: ${C.green}${config.auto_load_save || 'NONE'}${C.reset}`);
    console.log(`${C.magenta}--------------------------------------------${C.reset}`);
    console.log(`${C.green} [1] - LAUNCH FACTORIO (AUTO-LOAD)${C.reset}`);
    console.log(`${C.yellow} [V] - SWITCH VERSION (2.0 / 2.1)${C.reset}`);
    console.log(`${C.magenta} - - - - - - - - - - - - - - - - - - - - - -${C.reset}`);
    console.log(`${C.cyan} [S] - SELECT AUTO-LOAD SAVE${C.reset}`);
    console.log(`${C.cyan} [P] - PROFILE MANAGER${C.reset}`);
    console.log(`${C.cyan} [M] - MOD CONTROL${C.reset}`);
    console.log(`${C.magenta} - - - - - - - - - - - - - - - - - - - - - -${C.reset}`);
    console.log(`${C.bright}${C.magenta} [C] - RELOAD CONSOLE${C.reset}`);
    console.log(`${C.red} [K] - KILL PROCESSES${C.reset}`);
    console.log(`${C.magenta} [Q] - EXIT${C.reset}`);
    console.log(`${C.magenta}============================================${C.reset}`);
    rl.question("Command > ", handleInput);
}

function handleInput(input) {
    const cmd = input.toLowerCase();
    if (cmd === '1') launchGame();
    else if (cmd === 'v') { 
        config.active_version = config.active_version === "2.0" ? "2.1" : "2.0"; 
        saveConfig(); showMenu(); 
    }
    else if (cmd === 's') manageSaves();
    else if (cmd === 'p') manageProfiles();
    else if (cmd === 'm') manageIndividualMods();
    else if (cmd === 'c') reloadConsole(); 
    else if (cmd === 'k') { killProcess(); showMenu(); }
    else if (cmd === 'q') process.exit();
    else showMenu();
}

function killProcess() {
    try { execSync('taskkill /f /im factorio.exe'); return true; } 
    catch(e) { return false; }
}

function launchGame() {
    const exe = config.versions[config.active_version];
    if (!fs.existsSync(exe)) {
        console.log(`${C.red}Executable not found at ${exe}${C.reset}`);
        setTimeout(showMenu, 2000);
        return;
    }

    // ♂️ THE RIGHT VERSION ARGUMENTS ♂️
    let factorioArgs = [`--mod-directory "${config.mods_base_dir}"`];

    if (config.auto_load_save) {
        const fullSavePath = path.resolve(config.saves_base_dir, config.auto_load_save);
        if (fs.existsSync(fullSavePath)) {
            // МЫ ИСПОЛЬЗУЕМ --load-game КАК В ТВОЕМ ХЕЛПЕ!
            factorioArgs.push(`--load-game "${fullSavePath}"`);
        }
    }

    // Запускаем через PowerShell Start-Process для полной изоляции (никаких логов в консоль!)
    const psCommand = `Start-Process "${exe}" -ArgumentList '${factorioArgs.join(' ')}'`;
    
    exec(`powershell -NoProfile -Command "${psCommand}"`, (err) => {
        if (err) console.log(`${C.red}Error: ${err.message}${C.reset}`);
    });

    console.log(`${C.yellow}♂️ Step on it! Game is loading in silence. ♂️${C.reset}`);
    setTimeout(showMenu, 1500);
}

function manageSaves() {
    process.stdout.write('\x1Bc');
    console.log(`${C.cyan}--- ♂️ SELECT TARGET SAVE ♂️ ---${C.reset}`);
    if (!fs.existsSync(config.saves_base_dir)) {
        fs.mkdirSync(config.saves_base_dir, { recursive: true });
    }
    const saves = fs.readdirSync(config.saves_base_dir).filter(f => f.endsWith('.zip'));
    console.log(`${C.yellow}[0] - DISABLE AUTO-LOAD${C.reset}`);
    saves.forEach((s, i) => {
        const marker = (s === config.auto_load_save) ? `${C.green} >> ACTIVE <<${C.reset}` : "";
        console.log(` [${i + 1}] - ${s}${marker}`);
    });
    console.log(`\n[B] - BACK`);
    rl.question("Choice > ", (val) => {
        if (val.toLowerCase() === 'b') return showMenu();
        if (val === '0') { config.auto_load_save = null; saveConfig(); return manageSaves(); }
        const idx = parseInt(val) - 1;
        if (saves[idx]) { config.auto_load_save = saves[idx]; saveConfig(); manageSaves(); }
        else manageSaves();
    });
}

function reloadConsole() {
    const child = spawn(process.argv[0], process.argv.slice(1), { detached: true, stdio: 'inherit' });
    child.unref();
    process.exit();
}

function manageProfiles() {
    process.stdout.write('\x1Bc');
    const profiles = fs.readdirSync(PROFILES_DIR);
    console.log(`${C.cyan}--- PROFILE MANAGER ---${C.reset}`);
    console.log(`[S] - SAVE CURRENT AS NEW`);
    profiles.forEach((p, i) => console.log(`[${i+1}] - LOAD: ${p}`));
    console.log(`[B] - BACK`);
    rl.question("Choice > ", (val) => {
        const cmd = val.toLowerCase();
        if (cmd === 'b') return showMenu();
        if (cmd === 's') {
            rl.question("New Profile Name: ", (name) => {
                const pPath = path.join(PROFILES_DIR, name);
                if (!fs.existsSync(pPath)) fs.mkdirSync(pPath);
                ['mod-list.json', 'mod-settings.dat'].forEach(file => {
                    const src = path.join(config.mods_base_dir, file);
                    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(pPath, file));
                });
                config.active_profile = name; saveConfig(); manageProfiles();
            });
        } else {
            const idx = parseInt(val) - 1;
            if (profiles[idx]) {
                const pPath = path.join(PROFILES_DIR, profiles[idx]);
                ['mod-list.json', 'mod-settings.dat'].forEach(file => {
                    const src = path.join(pPath, file);
                    const dest = path.join(config.mods_base_dir, file);
                    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
                });
                config.active_profile = profiles[idx]; saveConfig(); showMenu();
            } else manageProfiles();
        }
    });
}

function manageIndividualMods() {
    const listPath = path.join(config.mods_base_dir, 'mod-list.json');
    if (!fs.existsSync(listPath)) return showMenu();
    let modData = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    process.stdout.write('\x1Bc');
    console.log(`${C.cyan}--- MOD CONTROL ---${C.reset}`);
    modData.mods.forEach((m, i) => {
        const status = m.enabled ? `${C.green}[ON]${C.reset}` : `${C.red}[OFF]${C.reset}`;
        console.log(` [${i.toString().padStart(2, ' ')}] ${status} ${m.name}`);
    });
    console.log(`\n[B] - BACK`);
    rl.question("Toggle Index > ", (val) => {
        if (val.toLowerCase() === 'b') return showMenu();
        const idx = parseInt(val);
        if (modData.mods[idx]) {
            modData.mods[idx].enabled = !modData.mods[idx].enabled;
            fs.writeFileSync(listPath, JSON.stringify(modData, null, 2));
            manageIndividualMods();
        } else manageIndividualMods();
    });
}

showMenu();