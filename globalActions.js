// This file contains handlers for admin actions that affect the entire chat (global actions).

import * as state from './state.js';
import * as ui from './ui.js';
import * as bot from './bot.js';
import * as api from './api.js';
import * as participants from './participants.js';
import * as chat from './chat.js';
import * as gameEvents from './gameEvents.js';
import * as modals from './modals.js'; // Ensure modals is imported

// Helper: allow abilities if in hacker_sandbox regardless of level/cooldown
function canUseHackerAbility(requiredLevel = 1) {
    if (state.gameMode === 'hacker_sandbox') return true;
    if (state.isHackerOpsLocked()) {
        alert(`Cooling down. Tools online in ${state.getHackerOpsLockRemainingSeconds()}s.`);
        return false;
    }
    if (state.hackerLevel < requiredLevel) {
        alert(`${requiredLevel > 1 ? `${requiredLevel} ` : ''}Hacker ability requires Hacker Level ${requiredLevel}.`);
        return false;
    }
    return true;
}

export function handleJoinAsPlayer() {
    if (state.gameMode !== 'sandbox') {
        alert("This feature is only available in Sandbox mode.");
        return;
    }
    if (!state.roomCode) {
        alert("A room has not been hosted yet. Start a Sandbox game to generate a room code.");
        return;
    }
    // Open a new window with the current room code in the URL
    window.open(`${window.location.pathname}?room=${state.roomCode}`, '_blank', 'width=800,height=700,menubar=no,toolbar=no,location=no,status=no');
}

export function handleToggleChatLock() {
    state.setChatLock(!state.isChatLocked);
    const actor = state.currentActor || (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');

    const systemMessageText = state.isChatLocked 
        ? `${actor} has locked the chat. New users cannot join.`
        : `${actor} has unlocked the chat.`;

    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    const button = ui.elements.toggleChatLockButton;
    const key = button.dataset.key || 'toggleChatLockButton';
    if (state.isChatLocked) {
        button.textContent = "Unlock Chat";
    } else {
        button.textContent = state.originalTexts[key] || 'Lock Chat';
    }

    const adminActionText = `The admin just ${state.isChatLocked ? 'locked' : 'unlocked'} the chat.`;
    bot.triggerBotMessage(null, adminActionText);
}

export function handleSetLocation() {
    const newLocation = prompt("Enter the new location for the chat:", state.location);
    if (newLocation && newLocation.trim() !== '') {
        const trimmedLocation = newLocation.trim();
        const actor = state.currentActor || 'The Admin';
        state.setLocation(trimmedLocation);
        ui.updateLocationDisplay(trimmedLocation);
        document.dispatchEvent(new CustomEvent('statechange'));
        const systemMessage = `${actor} has changed the location to: ${trimmedLocation}`;
        chat.addSystemMessage(systemMessage);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessage });
        bot.triggerBotMessage(null, `The location has just been changed to "${trimmedLocation}". I should react to this new environment.`);
    }
}

export async function handleAddBot() {
    const button = ui.elements.addBotButton;
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Adding...';
    try {
        const existingNames = state.participants.map(p => p.name);
        const [name] = await api.fetchParticipantNames(1, existingNames);

        if (!name || state.getParticipantByName(name)) {
            chat.addSystemMessage("Failed to add a unique bot. Please try again.");
            return;
        }

        const newBot = participants.createBot(name);
        state.addParticipant(newBot);
        participants.renderList(state.participants);

        const systemMessageText = `${name} has joined the chat.`;
        chat.addSystemMessage(systemMessageText);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

        ui.showTaskNotification('New Arrival', `A new user, ${name}, has joined. Help them get acquainted with the others and the chat rules.`);

        bot.triggerBotMessage(null, `A new user, ${name}, just joined. I should say hi.`);
    } catch (error) {
        console.error("Failed to add bot:", error);
        chat.addSystemMessage("An error occurred while adding a bot.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

export async function handleSummonViolator() {
    const button = ui.elements.summonViolatorButton;
    button.disabled = true;
    button.textContent = 'Summoning...';
    try {
        const existingNames = state.participants.map(p => p.name);
        const [name] = await api.fetchParticipantNames(1, existingNames, "Generate a JSON array containing one single, edgy or rule-breaking online nickname.");

        if (!name || state.getParticipantByName(name)) {
            chat.addSystemMessage("Failed to summon a unique violator. Please try again.");
            return;
        }

        const newViolator = participants.createBot(name);
        newViolator.personality = 'violator';
        newViolator.mood = 'Angry';
        newViolator.avatar = state.moodAvatars['Angry'];
        state.addParticipant(newViolator);
        
        participants.renderList(state.participants);

        const systemMessageText = `A new user, ${name}, has joined. They don't look friendly.`;
        chat.addSystemMessage(systemMessageText);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
        
        ui.showTaskNotification('Troublemaker Alert', `A disruptive user, ${name}, has appeared. Keep an eye on them and enforce the rules.`);
        
        bot.triggerBotMessage(null, `A new user, ${name}, just joined. They seem hostile and are here to break rules.`);

    } catch (error) {
        console.error("Failed to summon violator:", error);
        chat.addSystemMessage("An error occurred while summoning a violator.");
    } finally {
        button.disabled = false;
        const key = button.dataset.key || 'summonViolatorButton';
        button.textContent = state.originalTexts[key] || 'Summon Violator';
    }
}

export function handleSummonHacker() {
    if (state.gameMode !== 'sandbox') {
        alert("This action is only available in Sandbox mode.");
        return;
    }
    if (state.bossFightActive) {
        alert("A hacker event is already in progress!");
        return;
    }

    console.log("SANDBOX: Manually summoning Hacker...");
    const hacker = {
        id: 'hacker-boss',
        name: 'Hacker',
        avatar: '/Hacker.png',
        isPlayer: false,
        isHacked: false,
        personality: 'violator'
    };
    
    import('./gameEvents.js').then(module => {
        module.triggerEvent({
            id: 'hacker_attack',
            text: 'The Admin has summoned a Hacker to test the system!',
            participant: hacker
        });
    });
}

export function handleSaveConversation() {
    if (!state.participants.length) {
        alert("Cannot save an empty chat. Please start a game first.");
        return;
    }

    const saveData = {
        version: 1,
        savedAt: new Date().toISOString(),
        gameState: {
            gameMode: state.gameMode,
            adminReputation: state.adminReputation,
            rules: state.rules,
            location: state.location,
            isSlowMode: state.isSlowMode,
            isChatFrozen: state.isChatFrozen,
            isChatLocked: state.isChatLocked,
            globalNicknamePrefix: state.globalNicknamePrefix, // NEW
            isChatBackgroundEffectActive: state.isChatBackgroundEffectActive, // NEW
            allowSwearing: state.allowSwearing, // NEW
        },
        participants: state.participants,
        chatHistory: state.chatHistory,
    };

    const dataStr = JSON.stringify(saveData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-sim-save-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("Conversation saved!");
}

export function handleLoadConversation() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = event => {
            try {
                const saveData = JSON.parse(event.target.result);

                // --- Restore State ---
                const gs = saveData.gameState;
                state.setGameMode(gs.gameMode || 'sandbox');
                state.setAdminReputation(gs.adminReputation || 50);
                state.setRules(gs.rules || "Default rules.");
                state.setLocation(gs.location || "a generic chat room");
                state.setSlowMode(gs.isSlowMode || false);
                state.setChatFrozen(gs.isChatFrozen || false);
                state.setChatLock(gs.isChatLocked || false);
                state.setGlobalNicknamePrefix(gs.globalNicknamePrefix || null); // NEW
                state.setIsChatBackgroundEffectActive(gs.isChatBackgroundEffectActive || false); // NEW
                state.setAllowSwearing(gs.allowSwearing !== undefined ? gs.allowSwearing : false); // NEW

                state.setParticipants(saveData.participants || []);
                state.chatHistory.length = 0; // Clear before push
                saveData.chatHistory.forEach(msg => state.addMessageToHistory(msg));

                // --- Re-render UI ---
                ui.showChatView();
                ui.updateLocationDisplay(state.location);
                ui.updateReputationBar(state.adminReputation);
                ui.toggleChatBackgroundEffect(state.isChatBackgroundEffectActive); // NEW

                // Rerender all messages
                ui.elements.messagesContainer.innerHTML = '';
                saveData.chatHistory.forEach(msg => {
                    if (msg.sender === 'System') {
                        chat.addSystemMessage(msg.text);
                    } else if (msg.sender === 'Admin' || (state.gameMode === 'player' && msg.sender === state.aiAdmin?.name)) {
                        if (msg.pollData) {
                             chat.addPollMessage(msg.pollData.question, Object.keys(msg.pollData.options || {}), msg.id); // FIX: Add || {}
                             setTimeout(() => chat.updatePollDisplay(msg.id, msg.pollData), 100);
                        } else {
                            chat.addAdminMessage(msg.text);
                        }
                    } else { // Regular user messages
                        let sender = state.getParticipantByName(msg.sender);
                        if (!sender) {
                            // Create a fallback sender object if the participant isn't found
                            sender = {
                                id: `ghost-${msg.sender}`, // Unique ID
                                name: msg.sender,
                                avatar: '/Neutral.png', // Default avatar
                                mood: 'Neutral',
                                personality: 'normal',
                                isPlayer: false,
                                isBot: false, 
                                isVip: false,
                                isMod: false,
                                isCoAdmin: false,
                                isHacked: false,
                                customMoodEmoji: null,
                            };
                        }
                        
                        if (msg.pollData) {
                             chat.addPollMessage(msg.pollData.question, Object.keys(msg.pollData.options || {}), msg.id); // FIX: Add || {}
                             setTimeout(() => chat.updatePollDisplay(msg.id, msg.pollData), 100);
                        } else {
                            chat.addMessage(msg.text, sender, { replyToId: msg.replyToId, imageUrl: msg.imageUrl });
                        }
                    }
                });
                
                // Re-render participants
                participants.renderList(state.participants);

            } catch (error) {
                console.error("Failed to load or parse save file:", error);
                alert("Error: Could not load the save file. It may be corrupted. Details: " + error.message);
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

// NEW: Clips Feature Actions
export function handleSaveClip() {
    if (state.chatHistory.length === 0) {
        chat.addSystemMessage("Cannot save an empty clip. Send some messages first!");
        return;
    }

    const clipLength = 15; // Save the last 15 messages
    const lastMessage = state.chatHistory[state.chatHistory.length - 1];

    const newClip = {
        id: `clip-${Date.now()}`,
        savedAt: new Date().toISOString(),
        location: state.location,
        messages: state.chatHistory.slice(-clipLength),
        summary: `Clip ending with: "${lastMessage.text.substring(0, 50)}..."`,
        videoUrl: null // will be filled after recording
    };

    // Save immediately to localStorage so clip exists while we record
    try {
        const existingClipsJSON = localStorage.getItem('admin_sim_clips');
        const existingClips = existingClipsJSON ? JSON.parse(existingClipsJSON) : [];
        existingClips.push(newClip);
        try {
            localStorage.setItem('admin_sim_clips', JSON.stringify(existingClips));
            state.savedClips = existingClips; // Persisted
        } catch (lsErr) {
            // Fallback: keep clips in-memory only if localStorage fails (quota, disabled, etc.)
            state.savedClips = existingClips;
            console.warn('localStorage unavailable for clips, storing in memory only:', lsErr);
        }
        chat.addSystemMessage(`Clip saved! ${newClip.messages.length} messages captured. Recording video preview...`);
    } catch (e) {
        console.error("Error preparing clip save:", e);
        // Fallback: keep clip in memory even if anything unexpected failed
        state.savedClips = state.savedClips || [];
        state.savedClips.push(newClip);
        chat.addSystemMessage("Clip saved in memory, but persistent storage failed.");
    }

    // Asynchronously render and record a short video representation of the clip
    (async () => {
        try {
            // Create an offscreen container to render messages for the clip
            const container = document.createElement('div');
            container.style.cssText = `
                width: 720px;
                height: 480px;
                padding: 20px;
                box-sizing: border-box;
                background: linear-gradient(135deg,#0a0a1a,#000);
                color: #fff;
                font-family: 'Orbitron', sans-serif;
                overflow: hidden;
            `;
            // Simple message rendering
            newClip.messages.forEach(m => {
                const line = document.createElement('div');
                line.style.cssText = 'margin-bottom:8px; font-size:16px; line-height:1.2;';
                const sender = document.createElement('strong');
                sender.textContent = `${m.sender}: `;
                sender.style.color = '#00aaff';
                const text = document.createElement('span');
                text.textContent = m.text;
                line.appendChild(sender);
                line.appendChild(text);
                container.appendChild(line);
            });

            // Append hidden to DOM (needed for captureStream)
            container.style.position = 'fixed';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            // Use captureStream and MediaRecorder to create a short clip
            const stream = container.captureStream ? container.captureStream(30) : null;
            if (!stream) throw new Error('captureStream not supported in this browser.');

            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
            const chunks = [];
            recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

            recorder.start();

            // Wait a short duration to ensure the rendering is captured (1.8s)
            await new Promise(res => setTimeout(res, 1800));
            recorder.stop();

            await new Promise(resolve => recorder.onstop = resolve);

            const blob = new Blob(chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            // Update saved clip with video URL and persist
            try {
                const stored = JSON.parse(localStorage.getItem('admin_sim_clips') || '[]');
                const idx = stored.findIndex(c => c.id === newClip.id);
                if (idx !== -1) {
                    stored[idx].videoUrl = url;
                    try { localStorage.setItem('admin_sim_clips', JSON.stringify(stored)); } catch(e){ /*persist fail*/ }
                    state.savedClips = stored;
                } else {
                    newClip.videoUrl = url;
                    const updated = (state.savedClips || []).map(c => c.id === newClip.id ? { ...c, videoUrl: url } : c);
                    state.savedClips = updated;
                    try { localStorage.setItem('admin_sim_clips', JSON.stringify(updated)); } catch(e){ /*persist fail*/ }
                }
            } catch (err) {
                console.warn('Could not update clip list in localStorage, saving in-memory only:', err);
                // ensure in-memory state updated
                state.savedClips = state.savedClips || [];
                const idx = state.savedClips.findIndex(c => c.id === newClip.id);
                if (idx !== -1) state.savedClips[idx].videoUrl = url; else { newClip.videoUrl = url; state.savedClips.push(newClip); }
            }

            chat.addSystemMessage("Clip video recorded and saved.");
        } catch (err) {
            console.error("Clip video recording failed:", err);
            chat.addSystemMessage("Clip saved but video preview failed to generate in this browser.");
        } finally {
            // Remove the offscreen container if it exists
            document.querySelectorAll('div').forEach(el => {
                if (el && el.style && el.style.left === '-9999px') {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }
            });
        }
    })();
}

export function handleViewClips() {
    modals.showClipsLogModal();
}

export function handleFreezeChat() {
    state.setChatFrozen(!state.isChatFrozen);
    const actor = state.currentActor || (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');

    const systemMessageText = state.isChatFrozen 
        ? `${actor} has frozen the chat. No one can speak.`
        : `${actor} has unfrozen the chat.`;

    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    const key = ui.elements.freezeChatButton.dataset.key || 'freezeChatButton';
    if (state.isChatFrozen) {
        ui.elements.freezeChatButton.textContent = "Unfreeze Chat";
        ui.elements.messageInput.disabled = true;
        ui.elements.sendButton.disabled = true;
    } else {
        ui.elements.freezeChatButton.textContent = state.originalTexts[key] || 'Freeze Chat';
        ui.elements.messageInput.disabled = false;
        ui.elements.sendButton.disabled = false;
    }

    const adminActionText = `The admin just ${state.isChatFrozen ? 'froze' : 'unfroze'} the chat.`;
    bot.triggerBotMessage(null, adminActionText);
}

export function handleToggleSlowMode() {
    state.setSlowMode(!state.isSlowMode);

    const actor = state.currentActor || 'The Admin';
    const systemMessageText = state.isSlowMode 
        ? `${actor} enabled slow mode. Only one message every 10 seconds.`
        : `${actor} disabled slow mode.`;

    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    const key = ui.elements.toggleSlowModeButton.dataset.key || 'toggleSlowModeButton';
    if(state.isSlowMode){
         ui.elements.toggleSlowModeButton.textContent = "Slow Mode: ON";
    } else {
        ui.elements.toggleSlowModeButton.textContent = state.originalTexts[key] || 'Toggle Slow Mode';
    }

    const adminActionText = `The admin just toggled slow mode ${state.isSlowMode ? 'on' : 'off'}.`;
    bot.triggerBotMessage(null, adminActionText);
}

export function handleShuffleNicknames() {
    const confirmKey = state.gameMode === 'hacker' ? 'hackerShuffleConfirm' : 'adminShuffleConfirm';
    const confirmText = state.originalTexts[confirmKey] || "Are you sure you want to shuffle everyone's names? This will cause chaos.";

    if (confirm(confirmText)) {
        const bots = state.getNonPlayerParticipants();
        const names = bots.map(p => p.name);

        // Fisher-Yates shuffle
        for (let i = names.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [names[i], names[j]] = [names[j], names[i]];
        }

        let reactions = [];
        bots.forEach((p, index) => {
            const oldName = p.name;
            const newName = names[index];
            if(oldName !== newName) {
                p.name = newName;
                participants.updateUIName(p.id, newName);
                participants.updateMessageNames(p.id, newName);
                reactions.push(`The admin shuffled names. I, ${oldName}, am now called ${newName}. What is happening?!`);
            }
        });

        const actor = state.currentActor || (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');
        const systemMessageText = `${actor} has shuffled all the nicknames!`;
        chat.addSystemMessage(systemMessageText);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

        // Trigger a few bots to react
        if (reactions.length > 0) {
            const reactionToTrigger = reactions[Math.floor(Math.random() * reactions.length)];
            bot.triggerBotMessage(null, reactionToTrigger);
        }
    }
}

export function handleTriggerEvent() {
    if (state.activeEvent) {
        alert("An event is already in progress! Wait for it to finish.");
        return;
    }
    const event = state.randomEvents[Math.floor(Math.random() * state.randomEvents.length)];
    gameEvents.triggerEvent(event);
}

export function handleClearChat() {
    if (confirm("Are you sure you want to clear the entire chat history? This cannot be undone.")) {
        ui.elements.messagesContainer.innerHTML = '';
        state.chatHistory.length = 0; // Clear history array

        const actor = state.currentActor || (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');
        const systemMessageText = `${actor} has cleared the chat history.`;
        chat.addSystemMessage(systemMessageText);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

        const adminActionText = `The Admin just cleared the entire chat. What just happened?`;
        bot.triggerBotMessage(null, adminActionText);
    }
}

/**
 * Sets a specific mood for all non-player users.
 * @param {string} mood - The mood to set (e.g., 'Happy', 'Angry').
 */
export function handleSetMoodForAllUsers(mood) {
    // Normalize the mood string to match the keys in state.moodAvatars (e.g., "happy" -> "Happy")
    const normalizedMood = mood.charAt(0).toUpperCase() + mood.slice(1).toLowerCase();

    if (!state.moodAvatars[normalizedMood]) {
        chat.addSystemMessage(`Invalid mood "${mood}" for global mood change. Valid moods are: ${Object.keys(state.moodAvatars).join(', ')}.`);
        return;
    }

    const nonPlayerParticipants = state.getNonPlayerParticipants();
    if (nonPlayerParticipants.length === 0) {
        chat.addSystemMessage("No other users in chat to set mood for.");
        return;
    }

    nonPlayerParticipants.forEach(p => {
        if (p.mood !== normalizedMood) { // Only update if different
            const updated = state.updateParticipantMood(p.id, normalizedMood);
            if (updated) {
                participants.updateUIAvatar(p.id, updated.avatar);
                chat.updateMessageAvatars(p.id, updated.avatar);
                // Clear custom emoji if a standard mood is set
                if (p.customMoodEmoji) {
                    p.customMoodEmoji = null;
                    participants.renderList(state.participants); // Re-render to clear emoji
                }
            }
        }
    });

    const actor = state.currentActor || 'The Admin';
    chat.addSystemMessage(`${actor} set all users' mood to ${normalizedMood}.`);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: `All moods set to ${normalizedMood}` });
    bot.triggerBotMessage(null, `The admin just set everyone's mood to ${normalizedMood}! How interesting...`);
}

// --- Sandbox-only Actions ---
export function handleAddCustomUser(name, personality) {
    if (state.gameMode !== 'sandbox') return;
    
    if (!name || state.getParticipantByName(name)) {
        chat.addSystemMessage(`Failed to add bot: The name "${name}" is invalid or already taken.`);
        return;
    }

    const newBot = participants.createBot(name, personality);
    state.addParticipant(newBot);
    participants.renderList(state.participants);

    const systemMessageText = `${name} has joined the chat.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    bot.triggerBotMessage(null, `A new user, ${name}, just joined. I should say hi.`);
}

export async function handleAddWebsimUser(username) {
    if (state.gameMode !== 'sandbox') return;

    if (!username || state.getParticipantByName(username)) {
        throw new Error(`The username "${username}" is invalid or already in the chat.`);
    }

    // 1. Fetch user data
    const userData = await api.fetchWebsimUserData(username);
    if (!userData) {
        throw new Error(`Could not find a Websim user with the username "${username}".`);
    }

    // 2. Generate personality (this now returns a descriptive string)
    const personalityDescription = await api.generatePersonalityFromWebsimUser(userData);

    // 3. Create bot with the generated personality description
    const newBot = participants.createBot(userData.user.username, personalityDescription);
    // Override with Websim avatar if available
    newBot.avatar = `https://images.websim.com/avatar/${userData.user.username}`;
    
    // 4. Add to chat
    state.addParticipant(newBot);
    participants.renderList(state.participants);

    const systemMessageText = `${userData.user.username} (a real Websim user!) has been added to the chat with an AI-generated personality: "${personalityDescription}".`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    bot.triggerBotMessage(null, `A new user, ${userData.user.username}, just joined. Their personality is based on their Websim profile: "${personalityDescription}". I should interact with them.`);
}

/**
 * Virus Spread: Create and spread a virus through the chat
 */
export function handleVirusSpread() {
    if (!canUseHackerAbility(1) && state.gameMode !== 'hacker_sandbox') return;
    if (state.gameMode !== 'hacker' && state.gameMode !== 'sandbox' && state.gameMode !== 'hacker_sandbox') {
        alert('This ability is only available in Hacker mode or Sandbox mode.');
        return;
    }
    
    import('./hackerOps.js').then(m => m.startHackerOperation('virusSpread')).catch(e => {
        console.error('Failed to start virus spread operation:', e);
    });
}

/**
 * Data Theft: Steal user data and use it against them
 */
export function handleDataTheft() {
    if (!canUseHackerAbility(2) && state.gameMode !== 'hacker_sandbox') return;
    if (state.gameMode !== 'hacker' && state.gameMode !== 'sandbox' && state.gameMode !== 'hacker_sandbox') {
        alert('This ability is only available in Hacker mode or Sandbox mode.');
        return;
    }
    
    import('./hackerOps.js').then(m => m.startHackerOperation('dataTheft')).catch(e => {
        console.error('Failed to start data theft operation:', e);
    });
}

/**
 * System Backdoor: Create permanent access to admin functions
 */
export function handleSystemBackdoor() {
    if (!canUseHackerAbility(3) && state.gameMode !== 'hacker_sandbox') return;
    if (state.gameMode !== 'hacker' && state.gameMode !== 'sandbox' && state.gameMode !== 'hacker_sandbox') {
        alert('This ability is only available in Hacker mode or Sandbox mode.');
        return;
    }
    
    import('./hackerOps.js').then(m => m.startHackerOperation('backdoor')).catch(e => {
        console.error('Failed to start backdoor operation:', e);
    });
}

/**
 * Clone User: Create fake copies of users
 */
export function handleCloneUser() {
    if (!canUseHackerAbility(3) && state.gameMode !== 'hacker_sandbox') return;
    const target = state.selectedParticipants[0]; // Assuming single selection for this operation
    if (!target || target.isPlayer) {
        alert('Select a user to clone.');
        return;
    }
    if (state.isHackerOpsLocked()) {
        alert(`Cooling down. Tools online in ${state.getHackerOpsLockRemainingSeconds()}s.`);
        return;
    }

    // Immediate local clone for reliability
    try {
        // Create a cloned participant with similar visible properties
        const cloneNameBase = `${target.name}_CLONE`;
        // Ensure unique clone name
        let cloneName = cloneNameBase;
        let suffix = 1;
        while (state.getParticipantByName(cloneName)) {
            cloneName = `${cloneNameBase}${suffix++}`;
        }

        const cloned = participants.createBot(cloneName);
        // Mirror certain traits from target
        cloned.avatar = target.avatar;
        cloned.mood = target.mood;
        cloned.personality = target.personality;
        cloned.age = target.age || cloned.age;
        cloned.isVip = false; // clones shouldn't auto-get VIP
        cloned.isHacked = target.isHacked || false;

        state.addParticipant(cloned);
        participants.renderList(state.participants);

        const systemMessageText = `A clone of ${target.name} has been created: ${cloned.name}.`;
        import('./chat.js').then(chat => {
            chat.addSystemMessage(systemMessageText);
        }).catch(() => { console.log(systemMessageText); });

        // Award some hacker experience if applicable
        try {
            if (typeof state.addHackerExp === 'function') {
                const leveled = state.addHackerExp(20);
                if (leveled) {
                    import('./ui.js').then(u => u.showLevelUpNotification(state.hackerLevel)).catch(()=>{});
                }
            }
        } catch (e) {}

        // Also trigger a bot reaction about the clone
        import('./bot.js').then(bot => {
            bot.triggerBotMessage(null, `Weird — there's another ${target.name} here now (called ${cloned.name})!`);
        });
    } catch (err) {
        console.error('Clone user failed (local fallback):', err);
        // Fallback to starting hacker operation if local clone failed
        import('./hackerOps.js').then(m => m.startHackerOperation('cloneUser', target.id)).catch(e => {
            console.error('Failed to start cloneUser operation as fallback:', e);
            alert('Clone user failed.');
        });
    }
}

/**
 * Reality Distort: Manipulate chat physics and rules
 */
export function handleRealityDistort() {
    if (!canUseHackerAbility(4) && state.gameMode !== 'hacker_sandbox') return;
    import('./hackerOps.js').then(m => m.startHackerOperation('realityDistort')).catch(e => {
        console.error('Failed to start reality distort operation:', e);
    });
}

/**
 * Time Manipulation: Speed up or slow down chat time
 */
export function handleTimeManipulation() {
    if (!canUseHackerAbility(4) && state.gameMode !== 'hacker_sandbox') return;
    import('./hackerOps.js').then(m => m.startHackerOperation('timeManip')).catch(e => {
        console.error('Failed to start time manipulation operation:', e);
    });
}

/**
 * Memory Wipe: Delete user memories and chat history
 */
export function handleMemoryWipe() {
    if (!canUseHackerAbility(5) && state.gameMode !== 'hacker_sandbox') return;
    import('./hackerOps.js').then(m => m.startHackerOperation('memoryWipe')).catch(e => {
        console.error('Failed to start memory wipe operation:', e);
    });
}

/**
 * Puppet Master: Control multiple users simultaneously
 */
export function handlePuppetMaster() {
    if (!canUseHackerAbility(6) && state.gameMode !== 'hacker_sandbox') return;
    import('./hackerOps.js').then(m => m.startHackerOperation('puppetMaster')).catch(e => {
        console.error('Failed to start puppet master operation:', e);
    });
}

/**
 * System Overload: Cause massive system-wide chaos
 */
export function handleSystemOverload() {
    if (!canUseHackerAbility(7) && state.gameMode !== 'hacker_sandbox') return;
    import('./hackerOps.js').then(m => m.startHackerOperation('systemOverload')).catch(e => {
        console.error('Failed to start system overload operation:', e);
    });
}

/**
 * Digital Possession: Take complete control of admin interface
 */
export function handleDigitalPossession() {
    if (!canUseHackerAbility(8) && state.gameMode !== 'hacker_sandbox') return;
    import('./hackerOps.js').then(m => m.startHackerOperation('digitalPossession')).catch(e => {
        console.error('Failed to start digital possession operation:', e);
    });
}