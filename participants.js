// This file manages participant-related logic and UI updates.

import * as state from './state.js';
import * as ui from './ui.js';
import * as api from './api.js';
import * as chat from './chat.js';
import * as bot from './bot.js';

// --- Participant UI Update Functions ---

/**
 * Renders the list of participants in the UI.
 * @param {Array} participants - The array of participant objects.
 */
export function renderList(participants) {
    const selectedIds = new Set(state.selectedParticipants.map(p => p.id));
    ui.elements.participantsList.innerHTML = '';
    participants.forEach(p => {
        const li = document.createElement('li');
        li.dataset.id = p.id;
        li.dataset.name = p.name;
        
        const emojiHtml = p.customMoodEmoji ? `<span class="custom-mood-emoji">${p.customMoodEmoji}</span>` : '';
        let displayName = p.name;
        if (state.globalNicknamePrefix) {
            displayName = state.globalNicknamePrefix + displayName;
        }

        li.innerHTML = `
            <div class="participant-avatar-container">
                <img src="${p.avatar}" alt="User">
                ${emojiHtml}
            </div>
            <span>${displayName}</span>`;

        if (p.isPlayer) {
            li.classList.add('participant-you');
        }
        if (p.isVip) {
            li.classList.add('vip');
        }
        if (p.isMod) {
            li.classList.add('mod');
        }
        if (p.isCoAdmin) {
            li.classList.add('co-admin');
        }
        if (p.isControlledBy) {
            li.classList.add('controlled');
        }
        if (p.isHacked) { // Style for hacked users
            li.classList.add('hacked');
        }
        if (selectedIds.has(p.id)) {
            li.classList.add('selected');
        }
        ui.elements.participantsList.appendChild(li);
    });
    document.dispatchEvent(new CustomEvent('statechange'));
}

/**
 * Updates the avatar for a participant in the participants list.
 * @param {string} participantId - The ID of the participant to update.
 * @param {string} newAvatarUrl - The new URL for the avatar image.
 */
export function updateUIAvatar(participantId, newAvatarUrl) {
    const participantLi = ui.elements.participantsList.querySelector(`li[data-id="${participantId}"]`);
    if (participantLi) {
        const img = participantLi.querySelector('img');
        if (img) {
            img.src = newAvatarUrl;
        }
    }
}

export function updateHackedStatus(participantId, isHacked, isTarget) {
    const participantLi = ui.elements.participantsList.querySelector(`li[data-id="${participantId}"]`);
    if (participantLi) {
        participantLi.classList.toggle('hacked', isHacked);
        participantLi.classList.toggle('hacker-target', isTarget);
        if (isHacked) {
             const img = participantLi.querySelector('img');
             if (img) img.src = '/Hacked.png';
        } else if (!isHacked && !isTarget) {
            const participant = state.getParticipantById(participantId);
            if (participant) {
                const img = participantLi.querySelector('img');
                if (img) img.src = participant.avatar;
            }
        }
    }
}

/**
 * Updates a participant's name in the participants list UI.
 * @param {string} participantId - The ID of the participant.
 * @param {string} newName - The new name.
 */
export function updateUIName(participantId, newName) {
    const participantLi = ui.elements.participantsList.querySelector(`li[data-id="${participantId}"]`);
    if (participantLi) {
        const span = participantLi.querySelector('span');
        if (span) {
            let display = newName;
            if (state.globalNicknamePrefix) {
                display = state.globalNicknamePrefix + display;
            }
            span.textContent = display;
        }
        participantLi.dataset.name = newName; // Always store original name in dataset
    }
}

/**
 * Adds or updates a custom emoji for a participant and re-renders the list.
 * @param {string} participantId - The ID of the participant.
 * @param {string} emoji - The emoji to set.
 */
export function setUserEmoji(participantId, emoji) {
    const participant = state.getParticipantById(participantId);
    if (participant) {
        participant.customMoodEmoji = emoji;
        renderList(state.participants); // Re-render the entire list to show the new emoji
    }
}

/**
 * Updates a participant's name on all their past messages.
 * @param {string} participantId - The ID of the participant.
 * @param {string} newName - The new name.
 */
export function updateMessageNames(participantId, newName) {
    const messages = document.querySelectorAll(`.message[data-sender-id="${participantId}"]`);
    messages.forEach(msg => {
        const senderEl = msg.querySelector('.message-sender');
        if (senderEl) {
            senderEl.textContent = newName;
        }
    });
}

/**
 * Updates the VIP status styling for a participant across the UI.
 * @param {string} participantId - The ID of the participant.
 * @param {boolean} isVip - The new VIP status.
 */
export function updateUIVIPStatus(participantId, isVip) {
    const participantLi = ui.elements.participantsList.querySelector(`li[data-id="${participantId}"]`);
    if (participantLi) {
        participantLi.classList.toggle('vip', isVip);
    }
    const messages = document.querySelectorAll(`.message[data-sender-id="${participantId}"]`);
    messages.forEach(msg => {
        const senderEl = msg.querySelector('.message-sender');
        if (senderEl) {
            senderEl.classList.toggle('vip', isVip);
        }
    });
}

/**
 * Updates the visual styling for a participant's mod status.
 * @param {string} participantId - The ID of the participant.
 * @param {boolean} isMod - The new mod status.
 */
export function updateUIModStatus(participantId, isMod) {
    const participantLi = ui.elements.participantsList.querySelector(`li[data-id="${participantId}"]`);
    if (participantLi) {
        participantLi.classList.toggle('mod', isMod);
    }
    const messages = document.querySelectorAll(`.message[data-sender-id="${participantId}"]`);
    messages.forEach(msg => {
        const senderEl = msg.querySelector('.message-sender');
        if (senderEl) {
            senderEl.classList.toggle('mod', isMod);
        }
    });
}

/**
 * Updates the visual styling for a participant's co-admin status.
 * @param {string} participantId - The ID of the participant.
 * @param {boolean} isCoAdmin - The new co-admin status.
 */
export function updateUICoAdminStatus(participantId, isCoAdmin) {
    const participantLi = ui.elements.participantsList.querySelector(`li[data-id="${participantId}"]`);
    if (participantLi) {
        participantLi.classList.toggle('co-admin', isCoAdmin);
    }
    const messages = document.querySelectorAll(`.message[data-sender-id="${participantId}"]`);
    messages.forEach(msg => {
        const senderEl = msg.querySelector('.message-sender');
        if (senderEl) {
            senderEl.classList.toggle('co-admin', isCoAdmin);
        }
    });
}

/**
 * Updates the visual styling for a participant's controlled status.
 * @param {string} participantId - The ID of the participant.
 * @param {boolean} isControlled - The new controlled status.
 */
export function updateControlledStatus(participantId, isControlled) {
    const participantLi = ui.elements.participantsList.querySelector(`li[data-id="${participantId}"]`);
    if (participantLi) {
        participantLi.classList.toggle('controlled', isControlled);
    }
}

// --- Participant Creation ---

/**
 * FIXED TTS VOICE FOR ALL AI
 */
const AI_TTS_VOICE = 'en-male'; // Use a consistent voice ID or code

/**
 * Deterministically assigns a gender based on participant ID.
 * This ensures the voice assigned to a bot is consistent across sessions.
 * @param {string} id
 * @returns {'male'|'female'}
 */
function determineGender(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Check if the hash is odd or even
    return (hash % 2 === 0) ? 'male' : 'female';
}

/**
 * Assigns a random personality to a new bot based on predefined weights.
 * @returns {string} The assigned personality.
 */
function assignRandomPersonality() {
    const personalities = {
        'normal': 0.40,
        'pedant': 0.15,
        'illiterate': 0.15,
        'short-tempered': 0.15,
        'clueless': 1, // Will be chosen if others fail, effectively 15%
        // Note: 'violator' has a small chance, handled separately for impact.
    };

    // 5% chance of being a violator, separate from other personalities
    if (Math.random() < 0.05) {
        return 'violator';
    }

    const rand = Math.random();
    let cumulative = 0;
    for (const personality in personalities) {
        cumulative += personalities[personality];
        if (rand < cumulative) {
            return personality;
        }
    }
    return 'clueless'; // Fallback
}

/**
 * Creates a new bot participant object with default values and a random personality.
 * @param {string} name - The name of the bot.
 * @param {string} [personality=null] - The personality to assign. Can be a predefined keyword or a descriptive string.
 * @returns {object} A participant object.
 */
export function createBot(name, personality = null) {
    let chosenPersonality;
    // Check if the provided personality is a recognized keyword or a custom description
    const predefinedPersonalities = ['normal', 'pedant', 'illiterate', 'short-tempered', 'clueless', 'violator', 'infected'];
    if (personality && predefinedPersonalities.includes(personality.toLowerCase())) {
        chosenPersonality = personality.toLowerCase();
    } else if (personality && typeof personality === 'string' && personality.trim() !== '') {
        // If it's a descriptive string, use it directly
        chosenPersonality = personality.trim();
    } else {
        // Otherwise, assign a random predefined personality
        chosenPersonality = assignRandomPersonality();
    }
    
    let initialMood = 'Neutral';
    // If personality is a keyword, set initial mood based on it.
    // If it's a descriptive string, default to Neutral for initial spawn.
    if (chosenPersonality === 'violator' || chosenPersonality === 'short-tempered' || chosenPersonality === 'infected') {
        initialMood = 'Annoyed';
    } else if (chosenPersonality === 'clueless') {
        initialMood = 'Confused';
    }

    const initialAvatar = state.moodAvatars[initialMood] || '/Neutral.png';
    const id = `participant-${Date.now()}-${Math.random()}`; // Generate ID before returning

    return {
        id: id,
        name: name,
        avatar: initialAvatar,
        mood: initialMood,
        customMoodEmoji: null,
        personality: chosenPersonality,
        age: Math.floor(Math.random() * 30) + 15, // Age between 15-44
        isPlayer: false,
        isBot: true, // Explicitly mark as a bot
        warnings: 0,
        mutedUntil: null,
        isVip: false,
        isMod: false,
        isCoAdmin: false, // Add co-admin flag
        isControlledBy: null,
        isHacked: false,
        isAiAdmin: false,
        forcedCommand: null, // For the "obey" command
        ttsVoice: AI_TTS_VOICE, // FIXED VOICE for all bots
    };
}

// --- Initialization and Event Handling ---

/**
 * Populates the participants list with AI-generated names and the player.
 */
export async function initializeParticipants() {
    ui.elements.participantsList.innerHTML = '<li>Loading...</li>';
    const count = Math.floor(Math.random() * 5) + 4; // 4-8 bots initially

    // Reset state
    state.setParticipants([]);
    state.setSelectedParticipants([]);
    state.setLastSelectedParticipantId(null);
    state.chatHistory.length = 0;
    ui.elements.messagesContainer.innerHTML = '';
    ui.setAdminButtonState();

    try {
        const names = await api.fetchParticipantNames(count);
        
        const adminId = 'player-you'; // Ensure ID is consistent
        state.addParticipant({ 
            id: adminId, 
            name: 'Admin', 
            avatar: '/Admin.png', 
            isPlayer: true, 
            personality: 'admin', 
            ttsVoice: AI_TTS_VOICE // FIXED VOICE for admin
        });
        
        names.forEach((name, index) => {
            // Ensure generated names are not 'Admin'
            if (name.toLowerCase() === 'admin') return;

            state.addParticipant(createBot(name));
        });

        renderList(state.participants);

    } catch (error) {
        console.error('Failed to generate participants:', error);
        ui.elements.participantsList.innerHTML = '<li>Error loading participants.</li>';
    }
}

/**
 * Initializes the chat for Hacker mode.
 * @param {number} initialUserCount - The number of bots to create.
 */
export async function initializeHackerMode(initialUserCount) {
    ui.elements.participantsList.innerHTML = '<li>Infiltrating...</li>';
    
    // Reset state
    state.setParticipants([]);
    state.setSelectedParticipants([]);
    state.setLastSelectedParticipantId(null);
    state.chatHistory.length = 0;
    ui.elements.messagesContainer.innerHTML = '';
    ui.setAdminButtonState();

    try {
        const names = await api.fetchParticipantNames(initialUserCount);
        
        const hackerId = 'player-you';
        // The player is the hacker
        state.addParticipant({ 
            id: hackerId, 
            name: 'Hacker', 
            avatar: '/Hacker.png', 
            isPlayer: true, 
            personality: 'hacker',
            ttsVoice: AI_TTS_VOICE // FIXED VOICE for hacker
        });
        
        names.forEach(name => {
            if (name.toLowerCase() === 'hacker') return;
            state.addParticipant(createBot(name));
        });

        renderList(state.participants);

        // Announce Hacker's arrival and trigger reactions
        const joinMessage = 'The Hacker has infiltrated the chat.';
        chat.addSystemMessage(joinMessage);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: joinMessage });

        // Removed automatic corruption startup to make Hacker Sandbox non-destructive
        // (previously startHackerCorruption() was invoked here)

        setTimeout(() => {
             bot.triggerBotMessage(null, `A user named "Hacker" just joined. I have a bad feeling about this.`);
        }, 1500);

    } catch (error) {
        console.error('Failed to initialize hacker mode:', error);
        ui.elements.participantsList.innerHTML = '<li>Infiltration failed.</li>';
    }
}

/**
 * Starts the hacker's corruption process in hacker mode
 * NOTE: This function has been disabled to prevent automatic corruption in hacker sandbox.
 */
function startHackerCorruption() {
    // Intentionally left empty to disable automatic corruption
    console.log('startHackerCorruption disabled (no automatic corruption in hacker sandbox).');
}

/**
 * Initializes player mode where a random participant becomes the AI admin.
 */
export async function initializePlayerMode() {
    ui.elements.participantsList.innerHTML = '<li>Loading...</li>';
    const count = Math.floor(Math.random() * 5) + 4; // 4-8 bots initially

    // Reset state
    state.setParticipants([]);
    state.setSelectedParticipants([]);
    state.setLastSelectedParticipantId(null);
    state.chatHistory.length = 0;
    ui.elements.messagesContainer.innerHTML = '';

    try {
        const names = await api.fetchParticipantNames(count + 1); // +1 for the AI admin
        
        // Create regular player
        const playerId = 'player-you';
        const player = { 
            id: playerId, 
            name: 'You', 
            avatar: '/Neutral.png', 
            mood: 'Neutral',
            personality: 'normal',
            age: 25,
            isPlayer: true,
            ttsVoice: AI_TTS_VOICE // FIXED VOICE for player
        };
        state.addParticipant(player);
        
        // Create AI admin (first bot becomes admin)
        const aiAdminName = names[0];
        const aiAdminId = `participant-${Date.now()}-admin`;
        const aiAdmin = {
            id: aiAdminId,
            name: aiAdminName,
            avatar: '/Admin.png',
            mood: 'Neutral',
            personality: 'normal', // AI admin has a special role, not a personality
            age: 25,
            isPlayer: false,
            isAiAdmin: true,
            isCoAdmin: false,
            warnings: 0,
            mutedUntil: null,
            isVip: true, // AI admin is always VIP
            ttsVoice: AI_TTS_VOICE // FIXED VOICE for AI Admin
        };
        state.addParticipant(aiAdmin);
        state.setAiAdmin(aiAdmin);
        
        // Create other bots
        names.slice(1).forEach((name, index) => {
            if (name.toLowerCase() === 'admin' || name === aiAdminName) return;
            state.addParticipant(createBot(name));
        });

        renderList(state.participants);

        // Announce the AI admin
        const systemMessageText = `${aiAdminName} is now the chat administrator.`;
        chat.addSystemMessage(systemMessageText);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

        // Start the AI Admin logic
        import('./aiAdmin.js').then(module => {
            module.startAiAdminBehavior();
        });

    } catch (error) {
        console.error('Failed to initialize player mode:', error);
        ui.elements.participantsList.innerHTML = '<li>Error loading participants.</li>';
    }
}

/**
 * Handles clicks on the participant list for selection.
 * @param {Event} event The click event.
 */
function handleParticipantClick(event) {
    const targetLi = event.target.closest('li');
    if (!targetLi) return;

    const id = targetLi.dataset.id;
    const clickedParticipant = state.getParticipantById(id);
    if (!clickedParticipant) return;

    const isSelected = state.selectedParticipants.some(p => p.id === id);
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    if (event.shiftKey && state.lastSelectedParticipantId) {
        // Shift-click for range selection
        const allLIs = Array.from(ui.elements.participantsList.children);
        const allIds = allLIs.map(li => li.dataset.id);

        const lastIndex = allIds.indexOf(state.lastSelectedParticipantId);
        const currentIndex = allIds.indexOf(id);

        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        
        const newSelection = [];
        if (start !== -1 && end !== -1) {
            for (let i = start; i <= end; i++) {
                const participantInRange = state.getParticipantById(allIds[i]);
                if (participantInRange) {
                    newSelection.push(participantInRange);
                }
            }
        }
        state.setSelectedParticipants(newSelection);

    } else if (isTouchDevice || event.ctrlKey || event.metaKey) {
        // Ctrl/Cmd-click for toggling selection, or any tap on a touch device
        if (isSelected) {
            state.setSelectedParticipants(state.selectedParticipants.filter(p => p.id !== id));
        } else {
            state.setSelectedParticipants([...state.selectedParticipants, clickedParticipant]);
        }
        state.setLastSelectedParticipantId(id);
    } else {
        // Normal click on a non-touch device
        if (isSelected && state.selectedParticipants.length === 1) {
             state.setSelectedParticipants([]);
        } else {
            state.setSelectedParticipants([clickedParticipant]);
        }
        state.setLastSelectedParticipantId(id);
    }

    // Re-render the list to update selection visuals
    renderList(state.participants);
    ui.setAdminButtonState();
}

/**
 * Binds the event listener for the participants list.
 */
export function initializeParticipantEventListeners() {
    ui.elements.participantsList.addEventListener('click', handleParticipantClick);
}