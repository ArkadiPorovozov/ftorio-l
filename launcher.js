const { spawn, execSync, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- ♂️ THE TITLES ♂️ ---
const GYM_TITLES = ["♂️BOSS OF THIS GYM♂️", "♂️LEATHER COMMAND♂️", "♂️DEEP DARK BOND♂️"];
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
    active_version: "2.1",
    active_profile: null
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
const C = { reset: "\x1b[0m", bright: "\x1b[1m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", cyan: "\x1b[36m", magenta: "\x1b[35m", white: "\x1b[37m", gray: "\x1b[90m" };

// --- ♂️ LOGIC & MONITORING ♂️ ---
let gameStatus = "OFF"; 
let isGameProcessRunning = false;
let wasGameRunning = false;
let colorTick = 0;
let menuState = "main";
const discoColors = [C.red, C.green, C.blue, C.white];

// Функция получения привязанного сейва
function getLinkedSave(profileName) {
    if (!profileName) return null;
    const saveLinkPath = path.join(PROFILES_DIR, profileName, 'linked_save.txt');
    return fs.existsSync(saveLinkPath) ? fs.readFileSync(saveLinkPath, 'utf8').trim() : null;
}

// Авто-синхронизация при выходе
function syncGameToProfile() {
    if (!config.active_profile) return;
    const pPath = path.join(PROFILES_DIR, config.active_profile);
    ['mod-list.json', 'mod-settings.dat'].forEach(file => {
        const src = path.join(config.mods_base_dir, file);
        const dest = path.join(pPath, file);
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    });
}

setInterval(() => {
    exec('tasklist /FI "IMAGENAME eq factorio.exe" /NH', (err, stdout) => {
        const running = stdout && stdout.includes('factorio.exe');
        isGameProcessRunning = running;
        if (!running) {
            gameStatus = "OFF";
            if (wasGameRunning) { syncGameToProfile(); wasGameRunning = false; }
        } else {
            if (gameStatus !== "LOADING") gameStatus = "ACTIVE";
            wasGameRunning = true;
        }
        updateStatusDisplay();
    });
}, 2000);

setInterval(() => {
    if (gameStatus === "LOADING" && menuState === "main") {
        colorTick = (colorTick + 1) % 4;
        updateStatusDisplay();
    }
}, 150);

function updateStatusDisplay() {
    if (menuState !== "main") return;
    let output = "";
    if (gameStatus === "LOADING") {
        const c1 = discoColors[colorTick], c2 = discoColors[(colorTick + 1) % 4], c3 = discoColors[(colorTick + 2) % 4];
        output = `${c1}1${c2}2${c3}3${C.reset} ${C.yellow}LOADING   ${C.reset}`;
    } else if (gameStatus === "ACTIVE") {
        output = `    ${C.green}WORK      ${C.reset}`;
    } else {
        output = `    ${C.red}not WORK  ${C.reset}`;
    }
    process.stdout.write(`\x1b[s\x1b[4;12H${output}\x1b[u`);
}

// --- ♂️ UI ♂️ ---
function showMenu() {
    menuState = "main";
    const linkedSave = getLinkedSave(config.active_profile);
    process.stdout.write('\x1Bc'); 
    console.log(`${C.magenta}============================================${C.reset}`);
    console.log(`${C.magenta}---   ♂️ DUNGEON MASTER CONSOLE V19 ♂️  ---${C.reset}`);
    console.log(`${C.magenta}============================================${C.reset}`);
    console.log(`${C.bright} STATUS:   ${C.reset}`); 
    console.log(`${C.bright} VERSION:  ${C.cyan}${config.active_version}${C.reset}`);
    console.log(`${C.bright} PROFILE:  ${C.yellow}${config.active_profile || 'NONE'}${C.reset}`); 
    console.log(`${C.bright} LINKED:   ${C.green}${linkedSave || 'NOT LINKED'}${C.reset}`);
    console.log(`${C.magenta}--------------------------------------------${C.reset}`);
    console.log(`${C.green} [1] - LAUNCH LINKED WORKOUT (SAVE)${C.reset}`);
    console.log(`${C.green} [2] - LAUNCH MENU ONLY${C.reset}`);
    console.log(`${C.yellow} [R] - RESTART (AUTO-SYNC)${C.reset}`);
    console.log(`${C.yellow} [V] - SWITCH VERSION${C.reset}`);
    console.log(`${C.magenta} - - - - - - - - - - - - - - - - - - - - - -${C.reset}`);
    console.log(`${C.cyan} [P] - PROFILE MANAGER (SAVE & MODS BOND)${C.reset}`);
    console.log(`${C.cyan} [M] - MOD CONTROL${C.reset}`);
    console.log(`${C.magenta} - - - - - - - - - - - - - - - - - - - - - -${C.reset}`);
    console.log(`${C.bright}${C.magenta} [C] - RELOAD CONSOLE${C.reset}`);
    console.log(`${C.red} [K] - KILL PROCESSES${C.reset}`);
    console.log(`${C.magenta} [Q] - EXIT${C.reset}`);
    console.log(`${C.magenta}============================================${C.reset}`);
    process.stdout.write("Command > "); 
    updateStatusDisplay();
}

function startPrompt() { rl.question("", handleInput); }

function handleInput(input) {
    const cmd = input.toLowerCase().trim();
    if (cmd === '1') launchGame(true);
    else if (cmd === '2') launchGame(false);
    else if (cmd === 'r') { killProcess(); setTimeout(() => launchGame(true), 1000); }
    else if (cmd === 'v') { config.active_version = config.active_version === "2.0" ? "2.1" : "2.0"; saveConfig(); showMenu(); startPrompt(); }
    else if (cmd === 'c') reloadConsole(); 
    else if (cmd === 'p') manageProfiles();
    else if (cmd === 'm') manageIndividualMods();
    else if (cmd === 'k') { killProcess(); showMenu(); startPrompt(); }
    else if (cmd === 'q') process.exit();
    else { showMenu(); startPrompt(); }
}

function launchGame(withSave) {
    if (!config.active_profile) { console.log("Select profile first!"); return setTimeout(() => {showMenu(); startPrompt();}, 1000); }
    const exe = config.versions[config.active_version];
    const linkedSave = getLinkedSave(config.active_profile);

    // Синхронизируем моды профиля в игру
    const pPath = path.join(PROFILES_DIR, config.active_profile);
    ['mod-list.json', 'mod-settings.dat'].forEach(file => {
        const src = path.join(pPath, file);
        const dest = path.join(config.mods_base_dir, file);
        if (fs.existsSync(src)) fs.copyFileSync(src, dest);
    });

    let args = [`--mod-directory "${config.mods_base_dir}"`];
    if (withSave && linkedSave) {
        const fullPath = path.resolve(config.saves_base_dir, linkedSave);
        if (fs.existsSync(fullPath)) args.push(`--load-game "${fullPath}"`);
    }

    gameStatus = "LOADING";
    exec(`powershell -NoProfile -Command "Start-Process '${exe}' -ArgumentList '${args.join(' ')}'"` );
    showMenu(); startPrompt();
}

function killProcess() {
    try { execSync('taskkill /f /im factorio.exe'); gameStatus = "OFF"; if (wasGameRunning) syncGameToProfile(); wasGameRunning = false; return true; } 
    catch(e) { return false; }
}

// --- ♂️ NEW BONDED PROFILE MANAGER ♂️ ---
function manageProfiles() {
    menuState = "profiles";
    process.stdout.write('\x1Bc');
    const profiles = fs.readdirSync(PROFILES_DIR);
    console.log(`${C.cyan}--- ♂️ MASTER PROFILE MANAGER ♂️ ---${C.reset}`);
    console.log(`${C.yellow}[N] - CREATE NEW BONDED PROFILE${C.reset}`);
    profiles.forEach((p, i) => {
        const save = getLinkedSave(p);
        console.log(` [${i+1}] - ${p.padEnd(15)} (Linked to: ${save || '???'}) ${p === config.active_profile ? C.green + "<< ACTIVE >>" + C.reset : ""}`);
    });
    console.log(`\n[B] - BACK`);

    rl.question("Choice > ", (val) => {
        const c = val.toLowerCase();
        if (c === 'b') { showMenu(); startPrompt(); return; }
        if (c === 'n') createNewProfile();
        else {
            const idx = parseInt(val) - 1;
            if (profiles[idx]) {
                config.active_profile = profiles[idx];
                saveConfig();
                console.log(`${C.green}Profile and Bond activated!${C.reset}`);
                setTimeout(manageProfiles, 1000);
            } else manageProfiles();
        }
    });
}

function createNewProfile() {
    rl.question("Enter New Profile Name: ", (name) => {
        if (!name) return manageProfiles();
        const saves = fs.readdirSync(config.saves_base_dir).filter(f => f.endsWith('.zip'));
        console.log(`\n${C.cyan}--- SELECT SAVE TO BOND WITH THIS PROFILE ---${C.reset}`);
        saves.forEach((s, i) => console.log(` [${i+1}] - ${s}`));
        
        rl.question("Select Save # > ", (sIdx) => {
            const save = saves[parseInt(sIdx) - 1];
            if (!save) return manageProfiles();

            const pPath = path.join(PROFILES_DIR, name);
            fs.mkdirSync(pPath);
            fs.writeFileSync(path.join(pPath, 'linked_save.txt'), save);
            
            // Копируем дефолтные моды если есть
            ['mod-list.json', 'mod-settings.dat'].forEach(f => {
                const src = path.join(config.mods_base_dir, f);
                if (fs.existsSync(src)) fs.copyFileSync(src, path.join(pPath, f));
            });

            config.active_profile = name;
            saveConfig();
            manageProfiles();
        });
    });
}

function manageIndividualMods() {
    const listPath = path.join(config.mods_base_dir, 'mod-list.json');
    if (!fs.existsSync(listPath)) { showMenu(); startPrompt(); return; }
    let modData = JSON.parse(fs.readFileSync(listPath, 'utf8'));
    process.stdout.write('\x1Bc');
    console.log(`${C.cyan}--- ♂️ MOD CONTROL ♂️ ---${C.reset}`);
    modData.mods.forEach((m, i) => console.log(` [${i.toString().padStart(3, ' ')}] ${m.enabled ? "[ON]" : "[OFF]"} ${m.name}`));
    rl.question("\nToggle Index > ", (val) => {
        if (val.toLowerCase() === 'b') { showMenu(); startPrompt(); return; }
        const idx = parseInt(val);
        if (modData.mods[idx]) {
            modData.mods[idx].enabled = !modData.mods[idx].enabled;
            fs.writeFileSync(listPath, JSON.stringify(modData, null, 2));
            syncGameToProfile(); 
            manageIndividualMods();
        } else manageIndividualMods();
    });
}

function reloadConsole() {
    const scriptPath = process.argv[1];
    exec(`start cmd /c node "${scriptPath}"`, () => {});
    exec(`taskkill /f /pid ${process.pid} /t`, () => { process.exit(); });
}

setRandomTitle();
showMenu();
startPrompt();