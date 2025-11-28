// This file manages the application's state.


// --- Chat State ---
export let participants = [];
export let chatHistory = [];
export let replyingTo = null; // {id, sender, text} of message being replied to
export let mentionQuery = null; // Tracks current @mention query
export let rules = "1. Be respectful to the Admin and other users.\n2. No spamming or flooding the chat.\n3. Keep the conversation civil.";
export let isSlowMode = false;
export let isChatFrozen = false;
export let isChatLocked = false;
export let controlledUser = null; // ID of the currently controlled user
export let location = "a generic chat room"; // The current location of the chat
export let roomCode = null;
export let playerMessageFilter = null; // NEW: Custom filter applied to player's outgoing messages
export let allowSwearing = false; // NEW: Global setting for swearing
export let globalNicknamePrefix = null; // NEW: Global nickname prefix
export let activeCountdown = null; // NEW: Active countdown state
export let isChatBackgroundEffectActive = false; // NEW: Chat background effect
export let isTtsEnabled = false; // NEW: Text-to-speech toggle
export let savedClips = []; // NEW: Array to store saved chat clips

// New state for tracking the current action's performer
export let currentActor = null; // a temporary state for who is performing an action

// --- Multiplayer Join Requests ---
export let pendingJoinRequests = []; // Stores { clientId, username, avatarUrl, isAdmin }
export let isWaitingForApproval = false; // Client-side state

// --- Participant State ---
export let selectedParticipants = [];
export let lastSelectedParticipantId = null;

// --- Boss Fight State ---
export let bossFightActive = false;
export let hackerParticipantId = null;
export let hackerHP = 100;
export let participantToSave = null; // { id, type: 'mute'/'warn', timerId }
export let bossAudio; // To hold the AudioBufferSourceNode

// --- Hacker State ---
export let hackerLevel = 1;
export let hackerExp = 0;
export let hackerSkillPoints = 0;
export let hackerUnlockedAbilities = ['corrupt', 'basic_hack'];
export let activeViruses = [];
export let backdoorAccess = false;
export let systemCorruption = 0;

// --- Hacker Ops Lock (anti-spam/cooldown) ---
export let hackerOpsLockUntil = 0; // timestamp ms when tools become available again

export function isHackerOpsLocked() {
    return Date.now() < hackerOpsLockUntil;
}

export function setHackerOpsLock(seconds) {
    const ms = Math.max(1, Math.floor(seconds * 1000));
    hackerOpsLockUntil = Date.now() + ms;
}

export function getHackerOpsLockRemainingSeconds() {
    return Math.max(0, Math.ceil((hackerOpsLockUntil - Date.now()) / 1000));
}

// --- Bot State ---
export let isBotTyping = false;
export let botChatInterval = null;

// --- Game State ---
export let adminReputation = 50;
export let activeEvent = null; // e.g., { id: 'lag', timeoutId: 123, data: {} }
export let gameMode = 'sandbox'; // 'sandbox', 'story', 'player', 'hacker'
export let aiAdmin = null; // In player mode, this will be the AI admin participant
export let storyHackerEventTriggered = false; // Ensures the story mode hacker event only happens once

// NEW: Konami activation flag
export let konamiActivated = false;

export const randomEvents = [
    { 
        id: 'reboot',
        text: "A sudden server reboot is announced in 30 seconds."
    },
    {
        id: 'celebrity',
        text: "A famous celebrity has just joined the chat!"
    },
    {
        id: 'allcaps',
        text: "ALL CAPS MODE has been enabled for 1 minute! SHOUTING IS MANDATORY!",
        duration: 60000 // 1 minute
    },
    {
        id: 'lag',
        text: "A system-wide virus scan is initiated, causing major lag for 1 minute.",
        duration: 60000 // 1 minute
    },
    {
        id: 'topic',
        text: "The chat topic is now mandatory: 'Pineapple on Pizza'.",
        // This will be managed by a counter, not duration
    },
    {
        id: 'gravity',
        text: "Gravity in the chat has been reversed! All messages appear upside down."
        // This is a toggle
    },
    {
        id: 'free_vip',
        text: "A mysterious benefactor is giving away free VIP status to a random user."
    }
];

// --- Language State ---
export let currentLang = 'en'; // Default language
export const originalTexts = {};

// --- Mappings ---
export const moodAvatars = {
    'Happy': '/Happy.png',
    'Shocked': '/Shocked.png',
    'Neutral': '/Neutral.png',
    'Sad': '/Sad.png',
    'Confused': '/Confused.png',
    'Angry': '/Angry.png',
    'Mad': '/Mad.png',
    'Annoyed': '/Slightly-annoyed.png',
    'Tired': '/Tired.png',
    'Smart': '/smart.png',
    'Stupid': '/Stupid.png',
    'Not Understanding': '/Not-understanding.png'
};

// --- State Modifiers ---

// New: Multiplayer Join Request State
export function addPendingJoinRequest(request) {
    pendingJoinRequests.push(request);
}

export function getPendingJoinRequest(clientId) {
    return pendingJoinRequests.find(req => req.clientId === clientId);
}

export function removePendingJoinRequest(clientId) {
    pendingJoinRequests = pendingJoinRequests.filter(req => req.clientId !== clientId);
}

export function setIsWaitingForApproval(value) {
    isWaitingForApproval = value;
}

export function setRoomCode(code) {
    roomCode = code;
}

export function setAdminReputation(value) {
    adminReputation = Math.max(0, Math.min(100, value));
}

export function setSlowMode(value) {
    isSlowMode = value;
}

export function setChatFrozen(value) {
    isChatFrozen = value;
}

export function setChatLock(value) {
    isChatLocked = value;
}

export function setControlledUser(participantId) {
    controlledUser = participantId;
}

export function setLocation(newLocation) {
    location = newLocation;
}

export function setRules(newRules) {
    rules = newRules;
}

export function setBossFightState(isActive, hackerId = null) {
    bossFightActive = isActive;
    hackerParticipantId = hackerId;
    if (!isActive) {
        hackerHP = 100;
        hackerParticipantId = null;
        participantToSave = null;
        if (bossAudio) {
            bossAudio.stop();
            bossAudio = null;
        }
    }
}

export function setHackerHP(hp) {
    hackerHP = Math.max(0, Math.min(100, hp));
}

export function setParticipantToSave(data) {
    participantToSave = data;
}

export function setBossAudio(audioNode) {
    bossAudio = audioNode;
}

export function setParticipants(newParticipants) {
    participants = newParticipants;
}

export function addParticipant(participant) {
    participants.push(participant);
}

export function getParticipantById(id) {
    return participants.find(p => p.id === id);
}

export function removeParticipant(id) {
    participants = participants.filter(p => p.id !== id);
}

export function getParticipantByName(name) {
    return participants.find(p => p.name === name);
}

export function getNonPlayerParticipants() {
    // Non-player participants are bots. External players are still players.
    // The "player" is the admin.
    const admin = getPlayer();
    if (!admin) return participants.filter(p => !p.isPlayer);
    return participants.filter(p => p.id !== admin.id);
}

export function getPlayer() {
    // The "player" is the admin in sandbox/story/hacker mode, or the user in player mode.
    // It should never be an external player from the host's perspective.
    return participants.find(p => p.isPlayer && !p.isExternalPlayer);
}

export function setSelectedParticipants(participantsArray) {
    selectedParticipants = participantsArray;
}

export function setLastSelectedParticipantId(id) {
    lastSelectedParticipantId = id;
}

export function addMessageToHistory(message) {
    chatHistory.push(message);
    if (chatHistory.length > 25) { // Increased history slightly for polls
        chatHistory.shift();
    }
}

export function getMessageById(id) {
    return chatHistory.find(msg => msg.id === id);
}

export function setReplyingTo(messageData) {
    replyingTo = messageData;
}

export function setMentionQuery(query) {
    mentionQuery = query;
}

export function setIsBotTyping(typing) {
    isBotTyping = typing;
}

export function setBotChatInterval(intervalId) {
    botChatInterval = intervalId;
}

export function setCurrentActor(name) {
    currentActor = name;
}

export function setCurrentLang(lang) {
    currentLang = lang;
}

export function setActiveEvent(event) {
    activeEvent = event;
}

export function setGameMode(mode) {
    gameMode = mode;
}

export function setAiAdmin(participant) {
    aiAdmin = participant;
}

export function setStoryHackerEventTriggered(value) {
    storyHackerEventTriggered = value;
}

// NEW: Konami activation setter
export function setKonamiActivated(value) {
    konamiActivated = value;
}

export function updateParticipantMood(participantId, newMood) {
    const participant = getParticipantById(participantId);
    if (participant && moodAvatars[newMood]) {
        participant.mood = newMood;
        participant.avatar = moodAvatars[newMood];
        participant.customMoodEmoji = null; // Clear custom emoji when setting a standard mood
        return participant; // Return the updated participant
    }
    return null;
}

export function resetParticipant(participantId) {
    const participant = getParticipantById(participantId);
    if (participant && !participant.isPlayer) {
        participant.mood = 'Neutral';
        participant.avatar = moodAvatars['Neutral'];
        participant.customMoodEmoji = null;
        participant.warnings = 0;
        participant.mutedUntil = null;
        participant.isVip = false;
        participant.isMod = false; // Reset mod status
        participant.isCoAdmin = false; // Reset co-admin status
        participant.isHacked = false;
        participant.isControlledBy = null;
        participant.personality = 'normal'; // Reset personality too
        participant.age = 25; // Reset age
        return participant;
    }
    return null;
}

export function setHackerLevel(level) {
    hackerLevel = level;
}

export function setHackerExp(exp) {
    hackerExp = exp;
}

export function setHackerSkillPoints(points) {
    hackerSkillPoints = points;
}

export function setHackerUnlockedAbilities(abilities) {
    hackerUnlockedAbilities = abilities;
}

export function setActiveViruses(viruses) {
    activeViruses = viruses;
}

export function addHackerExp(exp) {
    hackerExp += exp;
    // Level up every 100 exp
    const newLevel = Math.floor(hackerExp / 100) + 1;
    if (newLevel > hackerLevel) {
        setHackerLevel(newLevel);
        hackerSkillPoints += 2;
        return true; // Leveled up
    }
    return false;
}

export function setSystemCorruption(value) {
    systemCorruption = Math.min(100, Math.max(0, value));
}

export function unlockHackerAbility(ability) {
    if (!hackerUnlockedAbilities.includes(ability)) {
        hackerUnlockedAbilities.push(ability);
    }
}

export function addActiveVirus(virus) {
    activeViruses.push(virus);
}

export function removeActiveVirus(virusId) {
    activeViruses = activeViruses.filter(v => v.id !== virusId);
}

export function setBackdoorAccess(value) {
    backdoorAccess = value;
}

// NEW: Player message filter
export function setPlayerMessageFilter(prompt) {
    playerMessageFilter = prompt;
}

// NEW: Allow swearing setting
export function setAllowSwearing(value) {
    allowSwearing = value;
    try {
        localStorage.setItem('admin_sim_allow_swearing', JSON.stringify(value));
    } catch (e) {
        console.warn("Could not save allow_swearing to localStorage:", e);
    }
}

// NEW: Global Nickname Prefix
export function setGlobalNicknamePrefix(prefix) {
    globalNicknamePrefix = prefix;
}

// NEW: Active Countdown
export function setActiveCountdown(countdown) {
    activeCountdown = countdown;
}

// NEW: Chat Background Effect
export function setIsChatBackgroundEffectActive(value) {
    isChatBackgroundEffectActive = value;
}

// NEW: Text-to-Speech
export function setIsTtsEnabled(value) {
    isTtsEnabled = value;
    try {
        localStorage.setItem('admin_sim_is_tts_enabled', JSON.stringify(value)); // Save TTS setting
    } catch (e) {
        console.warn("Could not save is_tts_enabled to localStorage:", e);
    }
}

// NEW: Load initial state from localStorage for allowSwearing AND isTtsEnabled
(function() {
    try {
        const savedSwearing = localStorage.getItem('admin_sim_allow_swearing');
        if (savedSwearing !== null) {
            allowSwearing = JSON.parse(savedSwearing);
        }
        
        // NEW TTS loading
        const savedTts = localStorage.getItem('admin_sim_is_tts_enabled');
        if (savedTts !== null) {
            isTtsEnabled = JSON.parse(savedTts);
        }

        // NEW Clips loading (on initialization)
        const savedClipsJSON = localStorage.getItem('admin_sim_clips');
        if (savedClipsJSON !== null) {
            try { setSavedClips(JSON.parse(savedClipsJSON)); } catch(e) { /* ignore parse errors */ }
        }

    } catch (e) {
        console.warn("Could not read local storage values:", e);
    }
})();