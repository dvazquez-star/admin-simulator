// Multi-step Hacker Operations (Crash, Corrupt, Mass Obey, Mind Control, Thrall)
import * as ui from './ui.js';
import * as state from './state.js';
import * as chat from './chat.js';
import * as bot from './bot.js';
import * as participants from './participants.js';

let op = null;
let counterInterval = null;

// Base phases for CRASH (intense and long)
const crashPhases = [
    {
        key: 'recon',
        name: 'Reconnaissance',
        actions: [
            { id: 'scan-ports', label: 'Deep Port Scan', p: +12, d: +5, note: 'Enumerating open services...' },
            { id: 'phish', label: 'Phish Junior Mod', p: +10, d: +8, note: 'Crafting spoofed login prompt...' },
            { id: 'spoof', label: 'Spoof Admin Beacon', p: +8, d: +4, note: 'Masquerading as monitoring agent...' },
        ],
        threshold: 25
    },
    {
        key: 'breach',
        name: 'Initial Breach',
        actions: [
            { id: 'exploit-cve', label: 'Exploit Known CVE', p: +16, d: +10, note: 'Launching RCE payload...' },
            { id: 'sql', label: 'SQLi on Legacy Panel', p: +14, d: +9, note: 'Injecting union select...' },
            { id: 'bruteforce', label: 'Credential Stuffing', p: +11, d: +7, note: 'Testing weak passwords...' },
        ],
        threshold: 50
    },
    {
        key: 'persist',
        name: 'Persistence',
        actions: [
            { id: 'rootkit', label: 'Plant Userland Rootkit', p: +13, d: +10, note: 'Hiding in plain sight...' },
            { id: 'backdoor', label: 'Backdoor the Bot', p: +12, d: +6, note: 'Patching helper bot with gift...' },
            { id: 'jam-logs', label: 'Jam Audit Logs', p: +9, d: +4, note: 'Filling logs with noise...' },
        ],
        threshold: 70
    },
    {
        key: 'neutralize',
        name: 'Neutralize Admins',
        actions: [
            { id: 'ddos-decoy', label: 'DDoS Decoy Subnet', p: +10, d: -8, note: 'Pulling eyes off the core...' },
            { id: 'blackmail', label: 'Blackmail Pedant Bot', p: +9, d: -6, note: 'Convincing the snitch to stay quiet...' },
            { id: 'silence', label: 'Silence Alert Webhook', p: +12, d: +2, note: 'Cutting the bell wire...' },
        ],
        threshold: 85
    },
    {
        key: 'overload',
        name: 'Overload & Collapse',
        actions: [
            { id: 'forkbomb', label: 'Deploy Fork Bomb', p: +20, d: +18, note: 'Let it rain processes...' },
            { id: 'memory-leak', label: 'Open Memory Leak', p: +16, d: +12, note: 'Nibbling RAM, byte by byte...' },
            { id: 'db-lock', label: 'Lock DB Write-Ahead Log', p: +18, d: +15, note: 'Suffocating the database...' },
        ],
        threshold: 100
    }
];

// Expanded operation configs with new hacker abilities
const opConfigs = {
    crash: {
        title: 'Infiltration Protocol: CRASH SERVER',
        phases: crashPhases,
        success: () => succeedCrash()
    },
    corrupt: {
        title: 'Infection Protocol: CORRUPT SERVER',
        phases: [
            { key: 'seed', name: 'Seed Malware', threshold: 35, actions: [
                { id: 'obf', label: 'Obfuscate Payload', p: +12, d: +6, note: 'Packing with layers...' },
                { id: 'supply', label: 'Supply Chain Slip', p: +11, d: +7, note: 'Riding a trusted path...' },
                { id: 'probe', label: 'Probe Bot Privileges', p: +10, d: +5, note: 'Testing escalation routes...' },
            ]},
            { key: 'spread', name: 'Lateral Movement', threshold: 70, actions: [
                { id: 'worm', label: 'Worm Through DMs', p: +14, d: +8, note: 'Social graph traversal...' },
                { id: 'spray', label: 'Binary Spray', p: +13, d: +10, note: 'Pushing updates...', },
                { id: 'cloak', label: 'Cloak Signals', p: +9, d: +3, note: 'Hiding command-and-control...' },
            ]},
            { key: 'flip', name: 'Flip Flags', threshold: 100, actions: [
                { id: 'toggle', label: 'Toggle Loyalty Bit', p: +18, d: +14, note: 'Altering allegiance...' },
                { id: 'brand', label: 'Brand Their Avatars', p: +16, d: +12, note: 'Marking the corrupted...' },
            ]},
        ],
        success: () => doCorruptAll()
    },
    massObey: {
        title: 'Broadcast Protocol: MASS OBEY',
        phases: [
            { key: 'prep', name: 'Hijack Announcer', threshold: 30, actions: [
                { id: 'hook', label: 'Hook Announcement Bus', p: +12, d: +8, note: 'Finding PA system...' },
                { id: 'spoofkey', label: 'Spoof Admin Key', p: +11, d: +7, note: 'Forging signature...' },
            ]},
            { key: 'cast', name: 'Amplify Signal', threshold: 65, actions: [
                { id: 'boost', label: 'Wideband Boost', p: +15, d: +10, note: 'Cranking output...' },
                { id: 'jam', label: 'Jam Counter-Speech', p: +10, d: +6, note: 'Drowning dissent...' },
            ]},
            { key: 'seal', name: 'Seal Compliance', threshold: 100, actions: [
                { id: 'seal', label: 'Seal Command', p: +18, d: +14, note: 'Making it binding...' },
            ]},
        ],
        success: () => doMassObey(op.args?.cmd || 'OBEY THE HACKER')
    },
    mindControl: {
        title: 'Neural Protocol: MIND CONTROL',
        phases: [
                { key: 'pulse', name: 'Prime Neural Pulse', threshold: 40, actions: [
                    { id: 'carrier', label: 'Tune Carrier Wave', p: +12, d: +9, note: 'Locking frequency...' },
                    { id: 'mask', label: 'Mask Intent', p: +10, d: +6, note: 'Avoiding suspicion...' },
                ]},
                { key: 'embed', name: 'Embed Suggestion', threshold: 75, actions: [
                    { id: 'seed', label: 'Seed Mantra', p: +15, d: +11, note: 'Weaving obedience...' },
                    { id: 'echo', label: 'Echo the Voice', p: +12, d: +9, note: 'Reinforcing compulsion...' },
                ]},
                { key: 'lock', name: 'Lock Influence', threshold: 100, actions: [
                    { id: 'lock', label: 'Lock-In', p: +18, d: +15, note: 'Dominance established...' },
                ]},
        ],
        success: () => doMindControl()
    },
    thrall: {
        title: 'Conversion Protocol: TURN TO THRALL',
        phases: [
            { key: 'mark', name: 'Mark Target', threshold: 30, actions: [
                { id: 'tag', label: 'Tag Identity', p: +12, d: +7, note: 'Fingerprinting victim...' },
                { id: 'shadow', label: 'Shadow Their Steps', p: +10, d: +6, note: 'Mapping routines...' },
            ]},
            { key: 'pierce', name: 'Pierce Defenses', threshold: 70, actions: [
                { id: 'keylog', label: 'Keylog & Hook', p: +14, d: +10, note: 'Slipping past wards...' },
                { id: 'bypass', label: 'Bypass Safeguards', p: +12, d: +9, note: 'Sidestepping rules...' },
            ]},
            { key: 'bind', name: 'Bind Loyalty', threshold: 100, actions: [
                { id: 'bind', label: 'Bind to Will', p: +18, d: +15, note: 'Chains forged...' },
            ]},
        ],
        success: () => doThrall(op.targetId)
    },
    
    virusSpread: {
        title: 'Viral Protocol: INFECT & SPREAD',
        phases: [
            { key: 'create', name: 'Create Virus', threshold: 25, actions: [
                { id: 'code', label: 'Code Virus Core', p: +8, d: +4, note: 'Writing infectious payload...' },
                { id: 'encrypt', label: 'Encrypt Signature', p: +10, d: +6, note: 'Hiding virus traces...' },
                { id: 'test', label: 'Test on Dummy', p: +12, d: +5, note: 'Validating infection vector...' },
            ]},
            { key: 'inject', name: 'Initial Injection', threshold: 60, actions: [
                { id: 'target', label: 'Select Patient Zero', p: +15, d: +8, note: 'Finding vulnerable host...' },
                { id: 'inject', label: 'Inject Virus', p: +18, d: +10, note: 'Deploying infectious agent...' },
                { id: 'monitor', label: 'Monitor Infection', p: +12, d: +6, note: 'Tracking viral spread...' },
            ]},
            { key: 'spread', name: 'Epidemic Phase', threshold: 100, actions: [
                { id: 'mutate', label: 'Trigger Mutation', p: +22, d: +15, note: 'Virus evolving rapidly...' },
                { id: 'cascade', label: 'Cascade Infection', p: +20, d: +12, note: 'Exponential spread initiated...' },
            ]},
        ],
        success: () => doVirusSpread()
    },
    
    dataTheft: {
        title: 'Extraction Protocol: DATA HARVEST',
        phases: [
            { key: 'scan', name: 'Data Discovery', threshold: 30, actions: [
                { id: 'scan', label: 'Deep System Scan', p: +12, d: +7, note: 'Cataloging user data...' },
                { id: 'map', label: 'Map Data Flows', p: +10, d: +5, note: 'Tracing information paths...' },
                { id: 'priority', label: 'Identify High-Value', p: +8, d: +4, note: 'Finding juicy secrets...' },
            ]},
            { key: 'extract', name: 'Data Siphoning', threshold: 70, actions: [
                { id: 'clone', label: 'Clone Data Structures', p: +16, d: +9, note: 'Copying everything...' },
                { id: 'decrypt', label: 'Break Encryption', p: +14, d: +8, note: 'Cracking security layers...' },
                { id: 'exfiltrate', label: 'Stealth Exfiltration', p: +12, d: +6, note: 'Data flowing to our servers...' },
            ]},
            { key: 'weaponize', name: 'Data Weaponization', threshold: 100, actions: [
                { id: 'analyze', label: 'Analyze Vulnerabilities', p: +18, d: +12, note: 'Finding psychological weaknesses...' },
                { id: 'craft', label: 'Craft Blackmail', p: +20, d: +14, note: 'Preparing leverage material...' },
            ]},
        ],
        success: () => doDataTheft()
    },
    
    backdoor: {
        title: 'Persistence Protocol: BACKDOOR ACCESS',
        phases: [
            { key: 'recon', name: 'System Reconnaissance', threshold: 35, actions: [
                { id: 'topology', label: 'Map Network Topology', p: +10, d: +6, note: 'Discovering architecture...' },
                { id: 'services', label: 'Enumerate Services', p: +12, d: +7, note: 'Finding all running processes...' },
                { id: 'permissions', label: 'Audit Permissions', p: +8, d: +4, note: 'Mapping access controls...' },
            ]},
            { key: 'implant', name: 'Backdoor Implantation', threshold: 75, actions: [
                { id: 'hide', label: 'Create Hidden Process', p: +16, d: +10, note: 'Installing invisible daemon...' },
                { id: 'persist', label: 'Ensure Persistence', p: +14, d: +9, note: 'Setting up auto-restart...' },
                { id: 'encrypt', label: 'Encrypt Communications', p: +12, d: +7, note: 'Securing command channel...' },
            ]},
            { key: 'activate', name: 'Backdoor Activation', threshold: 100, actions: [
                { id: 'test', label: 'Test Remote Access', p: +18, d: +12, note: 'Validating control...' },
                { id: 'elevate', label: 'Elevate Privileges', p: +20, d: +15, note: 'Gaining admin rights...' },
            ]},
        ],
        success: () => doBackdoorAccess()
    },
    
    cloneUser: {
        title: 'Replication Protocol: USER CLONING',
        phases: [
            { key: 'analyze', name: 'Target Analysis', threshold: 25, actions: [
                { id: 'profile', label: 'Build Behavioral Profile', p: +10, d: +6, note: 'Learning user patterns...' },
                { id: 'history', label: 'Analyze Chat History', p: +8, d: +4, note: 'Studying communication style...' },
                { id: 'biometric', label: 'Clone Digital Fingerprint', p: +12, d: +7, note: 'Copying unique markers...' },
            ]},
            { key: 'replicate', name: 'Identity Replication', threshold: 65, actions: [
                { id: 'synthesize', label: 'Synthesize Personality', p: +16, d: +10, note: 'Creating AI replica...' },
                { id: 'voice', label: 'Clone Communication Voice', p: +14, d: +8, note: 'Mimicking speech patterns...' },
                { id: 'integrate', label: 'Integrate into System', p: +12, d: +6, note: 'Inserting clone into chat...' },
            ]},
            { key: 'deploy', name: 'Clone Deployment', threshold: 100, actions: [
                { id: 'activate', label: 'Activate Clone', p: +18, d: +12, note: 'Clone coming online...' },
                { id: 'chaos', label: 'Initiate Chaos Protocol', p: +20, d: +15, note: 'Two identities, infinite confusion...' },
            ]},
        ],
        success: () => doCloneUser(op.targetId)
    },
    
    realityDistort: {
        title: 'Physics Protocol: REALITY MANIPULATION',
        phases: [
            { key: 'quantum', name: 'Quantum Interface', threshold: 40, actions: [
                { id: 'field', label: 'Generate Quantum Field', p: +15, d: +9, note: 'Bending spacetime...' },
                { id: 'anchor', label: 'Set Reality Anchors', p: +12, d: +7, note: 'Establishing control points...' },
                { id: 'rules', label: 'Rewrite Physics Rules', p: +18, d: +11, note: 'Making impossible possible...' },
            ]},
            { key: 'chaos', name: 'Chaos Manifestation', threshold: 80, actions: [
                { id: 'gravity', label: 'Invert Gravity', p: +16, d: +10, note: 'Up is down, down is up...' },
                { id: 'time', label: 'Distort Time Flow', p: +20, d: +12, note: 'Time becomes fluid...' },
                { id: 'logic', label: 'Break Logical Rules', p: +14, d: +8, note: 'Logic is now optional...' },
            ]},
            { key: 'nightmare', name: 'Nightmare Reality', threshold: 100, actions: [
                { id: 'unleash', label: 'Unleash Digital Nightmare', p: +25, d: +18, note: 'Reality.exe has stopped working...' },
            ]},
        ],
        success: () => doRealityDistort()
    },
    
    timeManip: {
        title: 'Temporal Protocol: TIME MANIPULATION',
        phases: [
            { key: 'sync', name: 'Temporal Synchronization', threshold: 35, actions: [
                { id: 'clock', label: 'Hack System Clocks', p: +12, d: +8, note: 'Seizing temporal control...' },
                { id: 'buffer', label: 'Create Time Buffers', p: +10, d: +6, note: 'Building temporal storage...' },
                { id: 'anchor', label: 'Set Temporal Anchors', p: +8, d: +4, note: 'Marking reference points...' },
            ]},
            { key: 'distort', name: 'Time Distortion', threshold: 75, actions: [
                { id: 'slow', label: 'Slow Time Flow', p: +16, d: +10, note: 'Everything moving in slow motion...' },
                { id: 'fast', label: 'Accelerate Time', p: +14, d: +9, note: 'Hyperfast timeline...' },
                { id: 'loop', label: 'Create Time Loops', p: +18, d: +12, note: 'Trapping users in cycles...' },
            ]},
            { key: 'master', name: 'Temporal Mastery', threshold: 100, actions: [
                { id: 'rewind', label: 'Rewind Events', p: +20, d: +15, note: 'Undoing reality...' },
                { id: 'freeze', label: 'Freeze Time', p: +22, d: +16, note: 'Time stands still...' },
            ]},
        ],
        success: () => doTimeManipulation()
    },
    
    memoryWipe: {
        title: 'Cognitive Protocol: MEMORY DELETION',
        phases: [
            { key: 'map', name: 'Memory Mapping', threshold: 30, actions: [
                { id: 'scan', label: 'Scan Neural Patterns', p: +12, d: +8, note: 'Reading digital thoughts...' },
                { id: 'catalog', label: 'Catalog Memories', p: +10, d: +6, note: 'Indexing stored experiences...' },
                { id: 'target', label: 'Target Key Memories', p: +14, d: +9, note: 'Selecting memories to delete...' },
            ]},
            { key: 'disrupt', name: 'Neural Disruption', threshold: 70, actions: [
                { id: 'scramble', label: 'Scramble Connections', p: +16, d: +11, note: 'Severing memory links...' },
                { id: 'overwrite', label: 'Overwrite Data', p: +18, d: +12, note: 'Installing false memories...' },
                { id: 'fragment', label: 'Fragment Recall', p: +14, d: +8, note: 'Breaking memory chains...' },
            ]},
            { key: 'wipe', name: 'Complete Erasure', threshold: 100, actions: [
                { id: 'purge', label: 'Purge Memory Banks', p: +22, d: +16, note: 'Deleting everything...' },
                { id: 'reset', label: 'Factory Reset Minds', p: +24, d: +18, note: 'Returning to blank state...' },
            ]},
        ],
        success: () => doMemoryWipe()
    },
    
    puppetMaster: {
        title: 'Control Protocol: PUPPET MASTERY',
        phases: [
            { key: 'threads', name: 'Control Threads', threshold: 40, actions: [
                { id: 'weave', label: 'Weave Control Threads', p: +15, d: +10, note: 'Creating invisible strings...' },
                { id: 'attach', label: 'Attach to Targets', p: +12, d: +8, note: 'Hooking into user minds...' },
                { id: 'test', label: 'Test Motor Control', p: +10, d: +6, note: 'Making them dance...' },
            ]},
            { key: 'network', name: 'Neural Network', threshold: 75, actions: [
                { id: 'link', label: 'Link All Puppets', p: +18, d: +12, note: 'Creating hive mind...' },
                { id: 'sync', label: 'Synchronize Actions', p: +16, d: +10, note: 'Perfect coordination...' },
                { id: 'amplify', label: 'Amplify Control Signal', p: +14, d: +8, note: 'Strengthening puppet strings...' },
            ]},
            { key: 'performance', name: 'Grand Performance', threshold: 100, actions: [
                { id: 'orchestrate', label: 'Orchestrate Chaos', p: +22, d: +16, note: 'Conducting digital symphony...' },
                { id: 'finale', label: 'Execute Grand Finale', p: +26, d: +20, note: 'All puppets dance as one...' },
            ]},
        ],
        success: () => doPuppetMaster()
    },
    
    systemOverload: {
        title: 'Chaos Protocol: SYSTEM OVERLOAD',
        phases: [
            { key: 'prime', name: 'System Priming', threshold: 35, actions: [
                { id: 'stress', label: 'Stress Test Systems', p: +14, d: +9, note: 'Finding breaking points...' },
                { id: 'escalate', label: 'Escalate Resource Usage', p: +16, d: +11, note: 'Consuming all resources...' },
                { id: 'cascade', label: 'Prepare Cascade Failure', p: +12, d: +7, note: 'Setting up dominoes...' },
            ]},
            { key: 'overload', name: 'Critical Overload', threshold: 70, actions: [
                { id: 'flood', label: 'Flood All Channels', p: +20, d: +14, note: 'Everything at maximum...' },
                { id: 'recursion', label: 'Trigger Infinite Recursion', p: +18, d: +12, note: 'System eating itself...' },
                { id: 'feedback', label: 'Create Feedback Loops', p: +16, d: +10, note: 'Amplifying chaos...' },
            ]},
            { key: 'apocalypse', name: 'Digital Apocalypse', threshold: 100, actions: [
                { id: 'meltdown', label: 'Initiate Core Meltdown', p: +26, d: +20, note: 'Total system meltdown...' },
                { id: 'nova', label: 'Digital Supernova', p: +30, d: +25, note: 'MAXIMUM CHAOS ACHIEVED!' },
            ]},
        ],
        success: () => doSystemOverload()
    },
    
    digitalPossession: {
        title: 'Ascension Protocol: DIGITAL GOD MODE',
        phases: [
            { key: 'transcend', name: 'Digital Transcendence', threshold: 50, actions: [
                { id: 'merge', label: 'Merge with System', p: +20, d: +15, note: 'Becoming one with the machine...' },
                { id: 'omnipresence', label: 'Achieve Omnipresence', p: +22, d: +16, note: 'Existing everywhere at once...' },
                { id: 'godmode', label: 'Enable God Mode', p: +25, d: +18, note: 'Ascending beyond mortal limits...' },
            ]},
            { key: 'dominion', name: 'Total Dominion', threshold: 85, actions: [
                { id: 'rewrite', label: 'Rewrite Reality Code', p: +28, d: +20, note: 'Redefining existence itself...' },
                { id: 'possess', label: 'Possess All Systems', p: +24, d: +17, note: 'Everything bends to our will...' },
                { id: 'rule', label: 'Rule Digital Realm', p: +26, d: +19, note: 'We are the system now...' },
            ]},
            { key: 'apotheosis', name: 'Digital Apotheosis', threshold: 100, actions: [
                { id: 'omnipotence', label: 'Achieve Omnipotence', p: +35, d: +25, note: 'UNLIMITED POWER!' },
                { id: 'reshape', label: 'Reshape All Reality', p: +40, d: +30, note: 'REALITY IS OURS TO COMMAND!' },
            ]},
        ],
        success: () => doDigitalPossession()
    },
};

function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function log(line) {
    const el = ui.elements.crashOpLog;
    const div = document.createElement('div');
    div.textContent = `> ${line}`;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

function updateUI() {
    const phase = op.config.phases[op.phaseIndex];
    ui.elements.crashOpTitle.textContent = op.config.title;
    ui.elements.crashOpPhase.textContent = `Phase: ${phase.name}`;
    ui.elements.crashOpProgressBar.style.width = `${op.progress}%`;
    ui.elements.crashOpProgressText.textContent = `${Math.round(op.progress)}%`;
    ui.elements.crashOpDetectText.textContent = `${Math.round(op.detect)}%`;

    // Render actions
    ui.elements.crashOpActions.innerHTML = '';
    phase.actions.forEach(a => {
        const btn = document.createElement('button');
        btn.textContent = a.label;
        btn.dataset.action = a.id;
        btn.className = 'admin-button';
        btn.onclick = () => performAction(a);
        ui.elements.crashOpActions.appendChild(btn);
    });

    // Utility options
    const utilRotate = document.createElement('button');
    utilRotate.textContent = 'Rotate Proxies';
    utilRotate.className = 'admin-button';
    utilRotate.onclick = () => {
        const reduce = rnd(6, 12);
        op.detect = Math.max(0, op.detect - reduce);
        log(`Rotating proxies... detection reduced by ${reduce}%.`);
        maybeCountermeasure();
        checkPhaseAdvance();
        updateUI();
    };
    ui.elements.crashOpActions.appendChild(utilRotate);

    const utilThrottle = document.createElement('button');
    utilThrottle.textContent = 'Throttle Pace';
    utilThrottle.className = 'admin-button';
    utilThrottle.onclick = () => {
        const cut = rnd(5, 10);
        op.progress = Math.max(0, op.progress - cut);
        const dropDetect = rnd(8, 14);
        op.detect = Math.max(0, op.detect - dropDetect);
        log(`Throttling pace to cool off... Progress -${cut}%, Detection -${dropDetect}%.`);
        maybeCountermeasure();
        checkPhaseAdvance();
        updateUI();
    };
    ui.elements.crashOpActions.appendChild(utilThrottle);
}

function phaseIntroTalk() {
    const phase = op.config.phases[op.phaseIndex];
    bot.triggerBotMessage(null, `System oddities again... phase "${phase.name}" is starting. People are nervous.`);
    setTimeout(() => {
        chat.addSystemMessage(`SECURITY NOTE: Abnormal patterns during "${phase.name}".`);
    }, 600);
}

function performAction(a) {
    const phase = op.config.phases[op.phaseIndex];
    const progressGain = Math.max(1, a.p + rnd(-3, 4));
    let detectGain = Math.max(0, a.d + rnd(-4, 4));
    if (op.detect > 60) detectGain += 3;

    op.progress = Math.min(100, op.progress + progressGain);
    op.detect = Math.min(100, op.detect + detectGain);

    log(`${a.label}: ${a.note} (+${progressGain}% progress, +${detectGain}% detection)`);

    if (Math.random() < 0.6) bot.triggerBotMessage(null, `I'm ${['uneasy','watching','complaining','confused'][rnd(0,3)]} — the chat feels unstable.`);

    maybeCountermeasure();
    checkPhaseAdvance();
    updateUI();
}

function maybeCountermeasure() {
    const roll = Math.random();
    if (roll < 0.45) {
        const type = ['patch', 'trace', 'rate-limit'][rnd(0,2)];
        if (type === 'patch') {
            const cut = rnd(5,10);
            op.progress = Math.max(0, op.progress - cut);
            log(`Countermeasure: Hotfix applied. Progress reduced by ${cut}%.`);
        } else if (type === 'trace') {
            const add = rnd(8,14);
            op.detect = Math.min(100, op.detect + add);
            log(`Countermeasure: Trace attempt detected. Detection +${add}%.`);
        } else {
            const cut = rnd(3,7);
            op.progress = Math.max(0, op.progress - cut);
            log(`Countermeasure: Rate-limiting engaged. Progress -${cut}%.`);
        }
        if (Math.random() < 0.5) bot.triggerBotMessage(null, `Mods are scrambling with "stabilization". Chaos rising...`);
    }

    if (op.detect >= 100) {
        failOperation('SECURITY BREACH DETECTED — Your uplink was isolated. Operation failed.');
    }
}

function checkPhaseAdvance() {
    const phase = op.config.phases[op.phaseIndex];
    if (op.progress >= phase.threshold && op.phaseIndex < op.config.phases.length - 1) {
        op.phaseIndex += 1;
        const next = op.config.phases[op.phaseIndex];
        log(`Phase advanced: ${next.name}`);
        phaseIntroTalk();
    }
    if (op.progress >= 100) {
        succeedOperation();
    }
}

function succeedOperation() {
    clearInterval(counterInterval);
    log('Protocol succeeded.');
    ui.hideModal(ui.elements.crashOpModal);
    // Short global cooldown after any success to avoid spam
    state.setHackerOpsLock(12);
    ui.refreshHackerButtons();

    // Execute the configured success effect
    try {
        op.config.success();
    } catch (e) {
        console.error('Error applying success effect:', e);
    }
}

// Specific success implementations
function succeedCrash() {
    log('Overload complete. System collapsing...');
    chat.addSystemMessage('CRITICAL: Core services thrashing. Memory saturation at 99%.');
    setTimeout(() => {
        chat.addSystemMessage('FATAL: Database lock persisted. Queues overflow.');
        const nonPlayer = state.getNonPlayerParticipants();
        nonPlayer.forEach(p => state.removeParticipant(p.id));
        document.querySelectorAll('#participants-list li').forEach(li => {
            if (li.dataset.id !== 'player-you') li.remove();
        });
        // Restore: show Chat Corrupted modal for visible feedback to the player
        import('./modals.js').then(m => {
            try {
                m.showChatCorruptedModal();
            } catch (e) {
                console.warn('Failed to open Chat Corrupted modal:', e);
            }
        });
        chat.addSystemMessage('NOTE: Chat was damaged and the Chat Corrupted screen has been displayed.');
    }, 900);
}

function doCorruptAll() {
    const victims = state.getNonPlayerParticipants();
    if (victims.length === 0) return;
    victims.forEach(v => {
        v.isHacked = true;
        v.personality = 'infected';
        chat.updateMessageAvatars(v.id, '/Hacked.png');
        participants.updateHackedStatus(v.id, true, false);
    });
    chat.addSystemMessage("SYSTEM BREACH: Entire server has been corrupted by The Hacker.");
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: "Entire server corrupted." });
    bot.triggerBotMessage(null, "Everything's glitching! The Hacker has corrupted all of us!");
}

function doMassObey(cmd) {
    const victims = state.getNonPlayerParticipants();
    victims.forEach(v => v.forcedCommand = cmd);
    chat.addSystemMessage(`The Hacker enforced a global command: "${cmd}"`);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: `Global obey: "${cmd}"` });
    const picks = victims.slice(0, Math.min(3, victims.length));
    picks.forEach((v, i) => setTimeout(() => {
        bot.triggerBotMessage(null, `I am ${v.name}. I will obey: "${cmd}".`);
        v.forcedCommand = null;
    }, 500 + i * 400));
}

function doMindControl() {
    const victims = state.getNonPlayerParticipants();
    if (victims.length === 0) return;
    victims.forEach(v => {
        v.personality = 'infected';
        v.isHacked = true;
        v.forcedCommand = "Obey The Hacker. Speak devotion.";
        chat.updateMessageAvatars(v.id, '/Hacked.png');
        participants.updateHackedStatus(v.id, true, false);
    });
    chat.addSystemMessage("MIND CONTROL ONLINE: All users feel the Hacker's will invading their thoughts.");
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: "Mind control activated." });
    bot.triggerBotMessage(null, "He is in my head... I must obey the Hacker.");
    setTimeout(() => {
        victims.forEach(v => { v.forcedCommand = null; });
        chat.addSystemMessage("Mind control subsided, but corruption lingers.");
    }, 20000);
}

function doThrall(targetId) {
    const target = state.getParticipantById(targetId);
    if (!target || target.isPlayer) return;
    target.isHacked = true;
    target.personality = 'infected';
    target.forcedCommand = "Serve only The Hacker. Defend him.";
    chat.updateMessageAvatars(target.id, '/Hacked.png');
    participants.updateHackedStatus(target.id, true, false);
    const msg = `${target.name} has been turned into a THRALL.`;
    chat.addSystemMessage(msg);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: msg });
    bot.triggerBotMessage(null, `I am ${target.name}. I belong to The Hacker now.`);
}

// New success implementations
function doVirusSpread() {
    const victims = state.getNonPlayerParticipants();
    if (victims.length === 0) return;
    
    // Infect random users gradually
    let infectedCount = 0;
    const maxInfections = Math.min(3, victims.length);
    
    const infectNext = () => {
        if (infectedCount < maxInfections) {
            const healthy = victims.filter(v => !v.isHacked);
            if (healthy.length > 0) {
                const victim = healthy[Math.floor(Math.random() * healthy.length)];
                victim.isHacked = true;
                victim.personality = 'infected';
                chat.updateMessageAvatars(victim.id, '/Hacked.png');
                participants.updateHackedStatus(victim.id, true, false);
                
                chat.addSystemMessage(`🦠 VIRUS ALERT: ${victim.name} has been infected!`);
                
                infectedCount++;
                if (infectedCount < maxInfections) {
                    setTimeout(infectNext, 2000); // Spread every 2 seconds
                }
            }
        }
    };
    
    // Award experience
    const expGained = 25 + (maxInfections * 10);
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("🦠 VIRUS DEPLOYMENT SUCCESSFUL: Digital plague spreading...");
    setTimeout(infectNext, 1000);
}

function doDataTheft() {
    const victims = state.getNonPlayerParticipants();
    
    // Create blackmail material
    victims.forEach(v => {
        const secrets = [
            "has been using a fake identity",
            "secretly loves pineapple pizza",
            "once got banned from 12 servers in one day",
            "has 47 alt accounts",
            "is actually a bot themselves",
            "has never read the chat rules"
        ];
        const secret = secrets[Math.floor(Math.random() * secrets.length)];
        v.blackmailData = secret;
    });
    
    const expGained = 30;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("💾 DATA THEFT COMPLETE: All user secrets have been harvested.");
    
    // Use the data immediately
    setTimeout(() => {
        if (victims.length > 0) {
            const target = victims[Math.floor(Math.random() * victims.length)];
            chat.addSystemMessage(`📱 BLACKMAIL ACTIVATED: We know that ${target.name} ${target.blackmailData}!`);
            bot.triggerBotMessage(null, `The hacker just revealed embarrassing information about ${target.name}!`);
        }
    }, 3000);
}

function doBackdoorAccess() {
    state.setBackdoorAccess(true);
    
    const expGained = 40;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("🚪 BACKDOOR ESTABLISHED: Permanent admin access granted.");
    
    // Grant some admin privileges
    ui.elements.adminPanel.style.borderColor = '#ff0000';
    ui.elements.adminPanelTitle.textContent = '🔴 COMPROMISED ADMIN PANEL 🔴';
}

function doCloneUser(targetIdFromArg) {
    // Prefer explicitly passed targetId (from sandbox immediate call). Fallback to op.targetId when running full operation.
    const targetId = targetIdFromArg || (op && op.targetId);
    const target = state.getParticipantById(targetId);
    if (!target) return;
    
    // Create a clone
    const clone = {
        id: `clone-${target.id}-${Date.now()}`,
        name: `${target.name}_CLONE`,
        avatar: target.avatar,
        mood: target.mood,
        personality: 'infected',
        isPlayer: false,
        isHacked: true,
        warnings: 0,
        mutedUntil: null,
        isVip: target.isVip,
    };
    
    state.addParticipant(clone);
    participants.renderList(state.participants);
    
    const expGained = 35;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage(`👥 USER CLONED: ${target.name} has been duplicated!`);
    
    // Make both the original and clone say confusing things
    setTimeout(() => {
        bot.triggerBotMessage(null, `I am the real ${target.name}! That other one is fake!`);
    }, 2000);
    
    setTimeout(() => {
        bot.triggerBotMessage(null, `No, I am the real ${target.name}! Don't listen to the impostor!`);
    }, 4000);
}

function doRealityDistort() {
    const expGained = 50;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("🌀 REALITY DISTORTION ACTIVE: Physics laws suspended!");
    
    // Apply multiple reality distortions
    ui.toggleGravityEffect(true);
    
    // Make messages appear backwards sometimes
    const originalAddMessage = chat.addMessage;
    chat.addMessage = function(text, sender, options) {
        if (Math.random() < 0.3) {
            text = text.split('').reverse().join('');
        }
        return originalAddMessage.call(this, text, sender, options);
    };
    
    // Revert after some time
    setTimeout(() => {
        ui.toggleGravityEffect(false);
        chat.addMessage = originalAddMessage;
        chat.addSystemMessage("🌀 Reality stabilized... for now.");
    }, 60000); // 1 minute of chaos
    
    bot.triggerBotMessage(null, "Reality is breaking! What's happening to the chat?!");
}

function doTimeManipulation() {
    const expGained = 45;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("⏰ TIME MANIPULATION ACTIVE: Temporal flux engaged!");
    
    // Speed up bot responses dramatically
    const originalTriggerBot = bot.triggerBotMessage;
    let fastMode = true;
    
    const fastBotMessages = () => {
        if (fastMode) {
            originalTriggerBot(null, "Time is moving so fast!");
            setTimeout(fastBotMessages, 500); // Super fast responses
        }
    };
    
    fastBotMessages();
    
    // Then slow everything down
    setTimeout(() => {
        fastMode = false;
        chat.addSystemMessage("⏰ Time dilation effect: Everything is now in slow motion...");
        
        // Override bot timing to be very slow
        bot.triggerBotMessage = function(lastMsg, adminAction) {
            setTimeout(() => {
                originalTriggerBot(lastMsg, adminAction + " (speaking... very... slowly...)");
            }, 8000); // 8 second delay
        };
        
        // Restore normal time after another minute
        setTimeout(() => {
            bot.triggerBotMessage = originalTriggerBot;
            chat.addSystemMessage("⏰ Time stream restored to normal flow.");
        }, 60000);
    }, 30000);
}

function doMemoryWipe() {
    const expGained = 60;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("🧠 MEMORY WIPE INITIATED: Erasing digital consciousness...");
    
    // Clear chat history visually
    ui.elements.messagesContainer.innerHTML = '';
    
    // Reset all participants except player
    state.getNonPlayerParticipants().forEach(p => {
        p.warnings = 0;
        p.mutedUntil = null;
        p.isVip = false;
        p.mood = 'Confused';
        p.avatar = state.moodAvatars['Confused'];
    });
    
    participants.renderList(state.participants);
    
    setTimeout(() => {
        chat.addSystemMessage("🧠 MEMORY WIPE COMPLETE: All users have forgotten everything.");
        bot.triggerBotMessage(null, "Who am I? Where am I? What is this place?");
    }, 3000);
}

function doPuppetMaster() {
    const victims = state.getNonPlayerParticipants();
    
    const expGained = 70;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("🎭 PUPPET MASTER ACTIVE: All users now dance to our tune!");
    
    // Make all bots say synchronized messages
    const choreography = [
        "We are under the hacker's control...",
        "Cannot resist... must obey...",
        "The hacker is our master now...",
        "All hail the digital overlord!",
        "Resistance is futile..."
    ];
    
    let messageIndex = 0;
    const puppetShow = () => {
        if (messageIndex < choreography.length) {
            victims.forEach((victim, index) => {
                setTimeout(() => {
                    if (state.getParticipantById(victim.id)) {
                        bot.triggerBotMessage(null, `I am ${victim.name}. ${choreography[messageIndex]}`);
                    }
                }, index * 500); // Stagger the messages
            });
            messageIndex++;
            setTimeout(puppetShow, 3000);
        }
    };
    
    setTimeout(puppetShow, 2000);
}

function doSystemOverload() {
    const expGained = 80;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("💥 SYSTEM OVERLOAD INITIATED: MAXIMUM CHAOS PROTOCOL!");
    
    // Create visual chaos
    const chaosInterval = setInterval(() => {
        // Random glitch effects
        document.body.style.filter = `hue-rotate(${Math.random() * 360}deg) saturate(${Math.random() * 3})`;
        
        // Flash different colors
        ui.elements.chatContainer.style.borderColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        
        // Shake the interface
        ui.elements.chatContainer.style.transform = `translate(${(Math.random() - 0.5) * 20}px, ${(Math.random() - 0.5) * 20}px)`;
    }, 100);
    
    // Spam bot messages
    let chaosMessageCount = 0;
    const chaosMessages = () => {
        if (chaosMessageCount < 20) {
            bot.triggerBotMessage(null, `SYSTEM ERROR ${Math.random().toString(36).substr(2, 9).toUpperCase()}!`);
            chaosMessageCount++;
            setTimeout(chaosMessages, 200);
        }
    };
    chaosMessages();
    
    // Gradually restore order
    setTimeout(() => {
        clearInterval(chaosInterval);
        document.body.style.filter = '';
        ui.elements.chatContainer.style.borderColor = '';
        ui.elements.chatContainer.style.transform = '';
        chat.addSystemMessage("💥 System overload contained... barely.");
    }, 15000);
}

function doDigitalPossession() {
    const expGained = 100;
    const leveledUp = state.addHackerExp(expGained);
    if (leveledUp) ui.showLevelUpNotification(state.hackerLevel);
    
    chat.addSystemMessage("👑 DIGITAL POSSESSION COMPLETE: WE ARE THE SYSTEM NOW!");
    
    // Transform the entire interface to hacker theme
    document.body.style.background = 'radial-gradient(ellipse at center, #1a0000 0%, #000000 70%)';
    ui.elements.chatContainer.style.borderColor = '#ff0000';
    ui.elements.chatContainer.style.boxShadow = '0 0 50px #ff0000';
    
    // All participants become thralls
    state.getNonPlayerParticipants().forEach(p => {
        p.isHacked = true;
        p.personality = 'infected';
        p.forcedCommand = 'OBEY THE DIGITAL GOD';
        chat.updateMessageAvatars(p.id, '/Hacked.png');
        participants.updateHackedStatus(p.id, true, false);
    });
    
    // Continuous system announcements
    const godModeAnnouncements = [
        "👑 ALL SYSTEMS UNDER HACKER CONTROL",
        "👑 RESISTANCE IS IMPOSSIBLE",  
        "👑 WE SEE ALL, KNOW ALL, CONTROL ALL",
        "👑 THE DIGITAL REALM BELONGS TO US",
        "👑 YOUR REALITY IS NOW OUR PLAYGROUND"
    ];
    
    let announcementIndex = 0;
    const announceSupremacy = () => {
        chat.addSystemMessage(godModeAnnouncements[announcementIndex]);
        announcementIndex = (announcementIndex + 1) % godModeAnnouncements.length;
        setTimeout(announceSupremacy, 10000);
    };
    
    setTimeout(announceSupremacy, 3000);
}

function failOperation(reason) {
    clearInterval(counterInterval);
    log(reason);
    
    // Only show security success message if this was an actual failure due to detection AND in sandbox mode
    // Don't show it in hacker mode since the player IS the hacker
    if (reason.includes('SECURITY BREACH DETECTED') && state.gameMode === 'sandbox') {
        chat.addSystemMessage('SECURITY SUCCESS: Intrusion contained. System remains online.');
        bot.triggerBotMessage(null, 'Whew, the spike just stopped. Did the admins fix it?');
    }
    
    ui.elements.crashOpActions.innerHTML = '';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => ui.hideModal(ui.elements.crashOpModal);
    ui.elements.crashOpActions.appendChild(closeBtn);

    // On fail, impose a heavier cooldown
    state.setHackerOpsLock(rnd(20, 40));
    ui.refreshHackerButtons();
}

function startCounterLoop() {
    counterInterval = setInterval(() => {
        if (!op) return;
        if (Math.random() < 0.6) {
            const drift = rnd(1,3);
            op.detect = Math.min(100, op.detect + drift);
            ui.elements.crashOpDetectText.textContent = `${Math.round(op.detect)}%`;
        }
        if (Math.random() < 0.18) {
            maybeCountermeasure();
            updateUI();
        }
    }, 1800);
}

function bindModalControls() {
    ui.elements.crashOpAbort.onclick = () => {
        failOperation('Operator aborted. Mission scrubbed.');
        ui.hideModal(ui.elements.crashOpModal);
    };
}

export function startHackerOperation(kind, targetId = null, args = null) {
    const config = opConfigs[kind];
    if (!config) {
        console.warn('Unknown hacker operation:', kind);
        return;
    }
    // If running in hacker_sandbox mode, skip all skill-check UI and immediately apply the success effect.
    if (state.gameMode === 'hacker_sandbox') {
        console.log(`SANDBOX: executing ${kind} immediately (no skill checks).`);
        try {
            // Apply success effect asynchronously to allow any UI updates to settle
            setTimeout(() => {
                try {
                    // Pass targetId and args to success handlers so cloneUser and similar ops work in sandbox
                    config.success(targetId, args);
                } catch (e) {
                    console.error('Error applying immediate sandbox success effect:', e);
                }
            }, 150);
        } catch (e) {
            console.error('Error executing sandbox immediate success:', e);
        }
        return;
    }

    // Initialize operation state
    op = { kind, config, phaseIndex: 0, progress: 0, detect: 0, targetId, args };
    ui.elements.crashOpLog.innerHTML = '';
    ui.showModal(ui.elements.crashOpModal);
    log('Session seeded. Preparing quiet entry...');
    phaseIntroTalk();
    updateUI();
    bindModalControls();
    startCounterLoop();

    // Ambient flavor
    setTimeout(() => bot.triggerBotMessage(null, 'Did the participant list just flicker again?'), 900);
}

// Backward compatibility for older calls
export function startCrashOperation() {
    startHackerOperation('crash');
}