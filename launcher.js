const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- ♂️ THE TITLES ♂️ ---
const GYM_TITLES = [
    "CMD",
    "CONSOLE",
    "ZALUPA",
];

function setRandomTitle() {
    const title = GYM_TITLES[Math.floor(Math.random() * GYM_TITLES.length)];
    process.title = title;
    process.stdout.write(`\x1b]0;${title}\x07`);
}

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
        if (config[key] === undefined) { config[key] = DEFAULT_CONFIG[key]; updated = true; }
    }
    if (updated) saveConfig();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const C = {
    reset: "\x1b[0m", bright: "\x1b[1m", green: "\x1b[32m", 
    yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m", 
    magenta: "\x1b[35m", blue: "\x1b[34m", white: "\x1b[37m", gray: "\x1b[90m"
};

// --- ♂️ STATUS & GARLAND LOGIC ♂️ ---
let gameStatus = "OFF"; // OFF, LOADING, ACTIVE
let isGameProcessRunning = false;
let garlandTick = 0;
let menuState = "main";
const discoColors = [C.red, C.green, C.blue, C.white];

// Мониторинг процесса игры
setInterval(() => {
    exec('tasklist /FI "IMAGENAME eq factorio.exe" /NH', (err, stdout) => {
        const running = stdout && stdout.includes('factorio.exe');
        isGameProcessRunning = running;
        
        if (!running) {
            gameStatus = "OFF";
        } else if (gameStatus !== "LOADING") {
            gameStatus = "ACTIVE";
        }
        updateTopStatus();
    });
}, 2000);

// Анимация гирлянды 123 (только в статусе LOADING)
setInterval(() => {
    if (gameStatus === "LOADING" && menuState === "main") {
        renderGarland();
        garlandTick = (garlandTick + 1) % discoColors.length;
    }
}, 150);

function renderGarland() {
    const c1 = discoColors[garlandTick];
    const c2 = discoColors[(garlandTick + 1) % discoColors.length];
    const c3 = discoColors[(garlandTick + 2) % discoColors.length];
    // Позиция: Строка 4, Колонка 12 (сразу после " STATUS: ")
    process.stdout.write(`\x1b[s\x1b[4;12H${c1}1${c2}2${c3}3${C.reset}\x1b[u`);
}

function updateTopStatus() {
    if (menuState !== "main") return;
    
    let statusText = "";
    let color = C.reset;
    
    if (gameStatus === "OFF") { statusText = "not WORK"; color = C.red; }
    if (gameStatus === "LOADING") { statusText = "LOADING"; color = C.yellow; }
    if (gameStatus === "ACTIVE") { statusText = "WORK"; color = C.green; }

    // Если не грузимся - чистим место под цифры 123 (колонки 12-14)
    if (gameStatus !== "LOADING") {
        process.stdout.write(`\x1b[s\x1b[4;12H   \x1b[u`);
    }

    // Печатаем текст статуса в колонку 16
    process.stdout.write(`\x1b[s\x1b[4;16H\x1b[K${color}${statusText}${C.reset}\x1b[u`);
}

// --- ♂️ UI INTERFACE ♂️ ---
function showMenu() {
    menuState = "main";
    process.stdout.write('\x1Bc'); 
    console.log(`${C.magenta}============================================${C.reset}`);
    console.log(`${C.magenta}---      DUNGEON MASTER CONSOLE V10      ---${C.reset}`);
    console.log(`${C.magenta}============================================${C.reset}`);
    console.log(`${C.bright} STATUS:   ${C.reset}`); // Строка 4
    console.log(`${C.bright} VERSION:  ${C.cyan}${config.active_version}${C.reset}`);
    console.log(`${C.bright} PROFILE:  ${C.yellow}${config.active_profile}${C.reset}`); 
    console.log(`${C.bright} SAVE:     ${C.green}${config.auto_load_save || 'NONE'}${C.reset}`);
    console.log(`${C.magenta}--------------------------------------------${C.reset}`);
    console.log(`${C.green} [1] - LAUNCH FACTORIO (AUTO-LOAD)${C.reset}`);
    console.log(`${C.yellow} [V] - SWITCH VERSION (2.0 / 2.1)${C.reset}`);
    console.log(`${C.magenta} - - - - - - - - - - - - - - - - - - - - - -${C.reset}`);
    console.log(`${C.cyan} [S] - SELECT AUTO-LOAD SAVE${C.reset}`);
    console.log(`${C.cyan} [P] - PROFILE MANAGER${C.reset}`);
    console.log(`${C.cyan} [M] - MOD CONTROL${C.reset}`);
    console.log(`${C.magenta} - - - - - - - - - - - - - - - - - - - - - -${C.reset}`);
    console.log(`${C.bright}${C.magenta} [C] - FORCE RELOAD (NEW TITLE)${C.reset}`);
    console.log(`${C.red} [K] - KILL PROCESSES${C.reset}`);
    console.log(`${C.magenta} [Q] - EXIT${C.reset}`);
    console.log(`${C.magenta}============================================${C.reset}`);
    
    // Ввод команды (вернули к началу строки)
    process.stdout.write("Command > "); 
    updateTopStatus();
}

function startPrompt() {
    rl.question("", (input) => {
        handleInput(input);
    });
}

function handleInput(input) {
    const cmd = input.toLowerCase().trim();
    if (cmd === '1') launchGame();
    else if (cmd === 'v') { 
        config.active_version = config.active_version === "2.0" ? "2.1" : "2.0"; 
        saveConfig(); showMenu(); startPrompt();
    }
    else if (cmd === 'c') reloadConsole(); 
    else if (cmd === 's') { menuState = "saves"; manageSaves(); }
    else if (cmd === 'p') { menuState = "profiles"; manageProfiles(); }
    else if (cmd === 'm') { menuState = "mods"; manageIndividualMods(); }
    else if (cmd === 'k') { killProcess(); showMenu(); startPrompt(); }
    else if (cmd === 'q') process.exit();
    else { showMenu(); startPrompt(); }
}

function killProcess() {
    try { 
        execSync('taskkill /f /im factorio.exe'); 
        gameStatus = "OFF";
        updateTopStatus();
        return true; 
    } catch(e) { return false; }
}

function launchGame() {
    const exe = config.versions[config.active_version];
    if (!fs.existsSync(exe)) {
        showMenu(); startPrompt();
        return;
    }

    gameStatus = "LOADING";
    updateTopStatus();

    // Симуляция LOADING статуса на 20 сек (пока игра реально не разгонится)
    setTimeout(() => {
        if (isGameProcessRunning) {
            gameStatus = "ACTIVE";
            updateTopStatus();
        }
    }, 20000);

    let factorioArgs = [`--mod-directory "${config.mods_base_dir}"`];
    if (config.auto_load_save) {
        const fullSavePath = path.resolve(config.saves_base_dir, config.auto_load_save);
        if (fs.existsSync(fullSavePath)) factorioArgs.push(`--load-game "${fullSavePath}"`);
    }

    const psCommand = `Start-Process "${exe}" -ArgumentList '${factorioArgs.join(' ')}'`;
    exec(`powershell -NoProfile -Command "${psCommand}"`);

    showMenu(); 
    startPrompt();
}

function reloadConsole() {
    const scriptPath = process.argv[1];
    exec(`start cmd /c node "${scriptPath}"`, () => {});
    exec(`taskkill /f /pid ${process.pid} /t`, () => {
        process.exit();
    });
}

function manageSaves() {
    process.stdout.write('\x1Bc');
    console.log(`${C.cyan}--- ♂️ SELECT TARGET SAVE ♂️ ---${C.reset}`);
    if (!fs.existsSync(config.saves_base_dir)) fs.mkdirSync(config.saves_base_dir, { recursive: true });
    const saves = fs.readdirSync(config.saves_base_dir).filter(f => f.endsWith('.zip'));
    console.log(`${C.yellow}[0] - DISABLE AUTO-LOAD${C.reset}`);
    saves.forEach((s, i) => {
        const marker = (s === config.auto_load_save) ? `${C.green} >> ACTIVE <<${C.reset}` : "";
        console.log(` [${i + 1}] - ${s}${marker}`);
    });
    console.log(`\n[B] - BACK`);
    rl.question("Choice > ", (val) => {
        const c = val.toLowerCase();
        if (c === 'b') { showMenu(); startPrompt(); return; }
        if (c === '0') { config.auto_load_save = null; saveConfig(); manageSaves(); return; }
        const idx = parseInt(val) - 1;
        if (saves[idx]) { config.auto_load_save = saves[idx]; saveConfig(); manageSaves(); }
        else manageSaves();
    });
}

function manageProfiles() {
    process.stdout.write('\x1Bc');
    const profiles = fs.readdirSync(PROFILES_DIR);
    console.log(`${C.cyan}--- ♂️ PROFILE MANAGER ♂️ ---${C.reset}`);
    console.log(`[S] - SAVE CURRENT AS NEW`);
    profiles.forEach((p, i) => console.log(`[${i+1}] - LOAD: ${p}`));
    console.log(`\n[B] - BACK`);
    rl.question("Choice > ", (val) => {
        const cmd = val.toLowerCase();
        if (cmd === 'b') { showMenu(); startPrompt(); return; }
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
                config.active_profile = profiles[idx]; saveConfig(); showMenu(); startPrompt();
            } else manageProfiles();
        }
    });
}

function manageIndividualMods() {
    const listPath = path.join(config.mods_base_dir, 'mod-list.json');
    if (!fs.existsSync(listPath)) { showMenu(); startPrompt(); return; }
    let modData = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    process.stdout.write('\x1Bc');
    console.log(`${C.cyan}--- ♂️ MOD CONTROL ♂️ ---${C.reset}`);
    modData.mods.forEach((m, i) => {
        const status = m.enabled ? `${C.green}[ON]${C.reset}` : `${C.red}[OFF]${C.reset}`;
        console.log(` [${i.toString().padStart(3, ' ')}] ${status} ${m.name}`);
    });
    console.log(`\n[B] - BACK`);
    rl.question("Toggle Index > ", (val) => {
        if (val.toLowerCase() === 'b') { showMenu(); startPrompt(); return; }
        const idx = parseInt(val);
        if (modData.mods[idx]) {
            modData.mods[idx].enabled = !modData.mods[idx].enabled;
            fs.writeFileSync(listPath, JSON.stringify(modData, null, 2));
            manageIndividualMods();
        } else manageIndividualMods();
    });
}

// --- ♂️ RUN ♂️ ---
setRandomTitle();
showMenu();
startPrompt();