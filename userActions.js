// This file contains handlers for admin actions that target a specific user.

import * as state from './state.js';
import * as ui from './ui.js';
import * as bot from './bot.js';
import * as participants from './participants.js';
import * as chat from './chat.js';
import * as gameEvents from './gameEvents.js';
import * as modals from './modals.js'; // Ensure modals is imported
import * as api from './api.js'; // Ensure api is imported

/**
 * Sends the admin's action to an AI for judgment and updates reputation.
 * @param {string} action - The action taken (e.g., 'warn', 'mute').
 * @param {object} target - The participant object who was the target of the action.
 * @param {string} [reason=''] - Any extra reason or context for the action.
 */
export async function judgeAdminAction(action, target, reason = '') {
    if (state.gameMode !== 'story') return; // Only judge in story mode

    const recentHistory = state.chatHistory.slice(-10).map(m => `${m.sender}: ${m.text}`).join('\n');

    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an impartial observer judging a chat admin's performance. Based on the action, the target's profile, and recent chat history, determine if the admin's action was justified, neutral, or poor. 
                    - Justified actions (e.g., punishing a clear rule-breaker) should get a positive change (+2 to +10).
                    - Unjustified actions (e.g., punishing an innocent user) should get a negative change (-2 to -10).
                    - Neutral or minor actions might have a small change (-1 to +1) or none (0).
                    Respond with only a JSON object: {"change": number, "reason": "A brief explanation for the change."}`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        adminAction: action,
                        targetUser: {
                            name: target.name,
                            personality: target.personality,
                            mood: target.mood,
                            warnings: target.warnings,
                        },
                        reasonForAction: reason,
                        recentChatHistory: recentHistory
                    })
                }
            ],
            json: true
        });

        const result = JSON.parse(completion.content);
        if (typeof result.change === 'number') {
            const newRep = state.adminReputation + result.change;
            state.setAdminReputation(newRep);
            ui.updateReputationBar(newRep);
            console.log(`Reputation change: ${result.change}. Reason: ${result.reason}`);

            if (newRep <= 0) {
                gameEvents.endHackerAttack(false); // Stop boss fight if active
                chat.addSystemMessage("Your reputation has fallen to zero. The server owners have fired you.");
                modals.showGameOverModal("You have been fired for poor administration. The chat has descended into chaos.");
            }
        }
    } catch (error) {
        console.error("Failed to judge admin action:", error);
    }
}

/**
 * Judges an admin's own chat message for professionalism and updates reputation.
 * @param {string} messageText - The text of the message the admin sent.
 */
export async function judgeAdminChatMessage(messageText) {
    if (state.gameMode !== 'story') return;

    const recentHistory = state.chatHistory.slice(-10).map(m => `${m.sender}: ${m.text}`).join('\n');

    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an impartial observer judging a chat admin's performance based on their own messages. Analyze the admin's message in the context of the chat.
                    - Professional, helpful, or de-escalating messages should get a positive change (+1 to +5).
                    - Unprofessional, rude, rule-breaking, or inflammatory messages should get a negative change (-2 to -10).
                    - Neutral messages (e.g., "hello") should have no change (0).
                    Respond with only a JSON object: {"change": number, "reason": "A brief explanation for the change."}`
                },
                {
                    role: "user",
                    content: JSON.stringify({
                        adminMessage: messageText,
                        recentChatHistory: recentHistory
                    })
                }
            ],
            json: true
        });

        const result = JSON.parse(completion.content);
        if (typeof result.change === 'number' && result.change !== 0) {
            const newRep = state.adminReputation + result.change;
            state.setAdminReputation(newRep);
            ui.updateReputationBar(newRep);
            console.log(`Reputation change from chat: ${result.change}. Reason: ${result.reason}`);

            if (newRep <= 0) {
                gameEvents.endHackerAttack(false); // Stop boss fight if active
                chat.addSystemMessage("Your reputation has fallen to zero. The server owners have fired you.");
                modals.showGameOverModal("You have been fired for poor administration. The chat has descended into chaos.");
            }
        }
    } catch (error) {
        console.error("Failed to judge admin chat message:", error);
    }
}

/**
 * Helper to initiate a modal-based action, ensuring a participant is selected.
 * @param {function} showModalFunction - The function that shows the modal (e.g., modals.showMuteModal).
 */
export function initiateModalAction(showModalFunction) {
    // Allow passing either a direct function or a string name of a modal exporter in ./modals.js.
    try {
        if (!showModalFunction) {
            console.warn('initiateModalAction called without a modal reference.');
            return;
        }

        // Resolve if a string name was provided
        if (typeof showModalFunction === 'string') {
            import('./modals.js').then(modalsModule => {
                const fn = modalsModule[showModalFunction];
                if (typeof fn === 'function') {
                    _callModalIfValid(fn);
                } else {
                    console.error(`Modal function "${showModalFunction}" not found in modals.js`);
                }
            }).catch(err => {
                console.error('Failed to import modals.js to resolve modal name:', err);
            });
            return;
        }

        // If a function was passed directly, call it (after validating)
        if (typeof showModalFunction === 'function') {
            _callModalIfValid(showModalFunction);
            return;
        }

        console.error('initiateModalAction: provided showModalFunction is neither a function nor a string identifier.');
    } catch (err) {
        console.error('initiateModalAction error:', err);
    }

    // Internal helper to validate selection and call the modal
    function _callModalIfValid(fn) {
        if (state.selectedParticipants.length !== 1) return;
        const participant = state.selectedParticipants[0];
        const adminId = state.getPlayer()?.id;
        if (!participant || participant.id === adminId) return;
        try {
            fn(participant);
        } catch (e) {
            console.error('Error calling modal function:', e);
        }
    }
}

/**
 * Inserts a mention for the selected user into the chat input field.
 */
export function handleMentionUser() {
    if (state.selectedParticipants.length !== 1) return;
    const participant = state.selectedParticipants[0];
    if (!participant) return;

    const mentionText = `@${participant.name} `;
    
    // Append to existing text or set as new text
    if (ui.elements.messageInput.value.endsWith(' ')) {
        ui.elements.messageInput.value += mentionText;
    } else if (ui.elements.messageInput.value.length === 0) {
        ui.elements.messageInput.value = mentionText;
    } else {
        ui.elements.messageInput.value += ` ${mentionText}`;
    }

    // Focus the input and place the cursor at the end
    ui.elements.messageInput.focus();
    const len = ui.elements.messageInput.value.length;
    ui.elements.messageInput.setSelectionRange(len, len);
}

// ===================================================================
//
//          REFACTORED / NEW PARAMETERIZED ACTION HANDLERS
//          These can be called directly by AI or other systems.
//
// ===================================================================

/**
 * Warns a specific user by their ID.
 * @param {string} participantId
 */
export function warnUser(participantId) {
    const participant = state.getParticipantById(participantId);
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;

    const actor = state.currentActor || 'The Admin';
    participant.warnings = (participant.warnings || 0) + 1;
    const systemMessageText = `${participant.name} has received warning ${participant.warnings}/3 from ${actor}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    if (participant.warnings >= 3) {
        setTimeout(() => banUser(participantId), 500);
    } else {
        const adminActionText = `The Admin warned me, ${participant.name}. I now have ${participant.warnings} warning(s).`;
        bot.triggerBotMessage(null, adminActionText);
    }
}

/**
 * Bans a specific user by their ID.
 * @param {string} participantId
 */
export function banUser(participantId) {
    const participant = state.getParticipantById(participantId);
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;

    const actor = state.currentActor || 'The Admin';
    const systemMessageText = `${participant.name} has been banned from the chat by ${actor}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
    
    state.removeParticipant(participant.id);
    participants.renderList(state.participants);

    if (state.selectedParticipants.some(p => p.id === participantId)) { // Use .some() to check if it was in the selection
        state.setSelectedParticipants(state.selectedParticipants.filter(p => p.id !== participantId)); // Remove from selection
        ui.setAdminButtonState();
    }
    
    judgeAdminAction('ban', participant);
    bot.triggerBotMessage(null, `The admin just banned ${participant.name}.`);
}

/**
 * Mutes a specific user by their ID for a duration.
 * @param {string} participantId
 * @param {number} durationSeconds
 */
export function muteUser(participantId, durationSeconds = 60) {
    const participant = state.getParticipantById(participantId);
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;

    const actor = state.currentActor || 'The Admin';
    participant.mutedUntil = Date.now() + durationSeconds * 1000;
    const systemMessageText = `${participant.name} has been muted by ${actor} for ${durationSeconds} second(s).`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
    
    judgeAdminAction('mute', participant, `Muted for ${durationSeconds} seconds`);
    ui.setAdminButtonState();
}

/**
 * Toggles VIP for a specific user by their ID.
 * @param {string} participantId
 */
export function toggleVipForUser(participantId) {
    const participant = state.getParticipantById(participantId);
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;

    const actor = state.currentActor || 'The Admin';
    participant.isVip = !participant.isVip;
    participants.updateUIVIPStatus(participant.id, participant.isVip); // Use imported module 'participants'
    const systemMessageText = participant.isVip
        ? `${participant.name} has been granted VIP status by ${actor}!`
        : `${participant.name} has had their VIP status revoked by ${actor}.`;

    chat.addSystemMessage(systemMessageText);
    judgeAdminAction('toggle_vip', participant);
    bot.triggerBotMessage(null, `The admin just changed ${participant.name}'s VIP status.`);
}

/**
 * Changes nickname for a specific user by their ID.
 * @param {string} participantId
 * @param {string} newName
 */
export async function changeNicknameForUser(participantId, newName) {
    const participant = state.getParticipantById(participantId);
    if (!participant) return;

    // We allow changing to the same name (no change).
    const existingParticipant = state.getParticipantByName(newName);
    if (!newName || newName.length < 3 || newName.length > 19 || (existingParticipant && existingParticipant.id !== participantId)) {
        const validationMessage = `Failed to change name: "${newName}" is invalid or already taken.`;
        chat.addSystemMessage(validationMessage);
        console.warn(validationMessage);
        return;
    }

    const oldName = participant.name;
    participant.name = newName;
    participants.updateUIName(participant.id, newName); // Use imported module 'participants'
    participants.updateMessageNames(participant.id, newName); // Use imported module 'participants'

    // Announce the change, customizing the message based on who made the change.
    const actor = state.currentActor || 'The Admin';
    const systemMessageText = (oldName === newName)
        ? `${participant.name}'s name remains unchanged.`
        : `${oldName} has had their name changed to ${newName} by ${actor}.`;

    chat.addSystemMessage(systemMessageText);
}

/**
 * Sets mood for a specific user by their ID.
 * @param {string} participantId
 * @param {string} mood
 */
export function setMoodForUser(participantId, mood) {
    const participant = state.getParticipantById(participantId);
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;

    const actor = state.currentActor || 'The Admin';
    // Normalize the mood string to match the keys in state.moodAvatars (e.g., "happy" -> "Happy")
    const normalizedMood = mood.charAt(0).toUpperCase() + mood.slice(1).toLowerCase();

    const updated = state.updateParticipantMood(participant.id, normalizedMood);
    if (updated) {
        participants.updateUIAvatar(participant.id, updated.avatar); // Use imported module 'participants'
        chat.updateMessageAvatars(participant.id, updated.avatar);
        chat.addSystemMessage(`${actor} set ${participant.name}'s mood to ${normalizedMood}.`);
        bot.triggerBotMessage(null, `The admin just changed my mood to ${normalizedMood}. I suddenly feel very ${normalizedMood}. My name is ${participant.name}.`);
    } else {
        chat.addSystemMessage(`AI tried to set an invalid mood "${mood}" for ${participant.name}. Valid moods are: ${Object.keys(state.moodAvatars).join(', ')}.`);
    }
}

/**
 * Sets personality for a specific user by their ID.
 * @param {string} participantId
 * @param {string} personality
 */
export function setPersonalityForUser(participantId, personality) {
    const participant = state.getParticipantById(participantId);
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;
    const actor = state.currentActor || 'The Admin';
    const oldPersonality = participant.personality;
    participant.personality = personality;
    chat.addSystemMessage(`${actor} changed ${participant.name}'s personality from ${oldPersonality} to ${personality}.`);
    bot.triggerBotMessage(null, `The admin just changed my personality to ${personality}. I feel... different. My name is ${participant.name}.`);
}

/**
 * Sets age for a specific user by their ID.
 * @param {string} participantId
 * @param {number} age
 */
export function setAgeForUser(participantId, age) {
    const participant = state.getParticipantById(participantId);
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;

    const actor = state.currentActor || 'The Admin';
    const oldAge = participant.age;
    participant.age = age;

    const systemMessageText = `${actor} set ${participant.name}'s age to ${age}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    judgeAdminAction('set_age', participant, `Set age to ${age}`);

    const adminActionText = `The admin just changed my age from ${oldAge} to ${age}. I suddenly feel... ${age < 20 ? 'younger' : 'older'}. My name is ${participant.name}.`;
    bot.triggerBotMessage(null, adminActionText);
}

/**
 * Gives an obey command to a specific user by their ID.
 * @param {string} participantId
 * @param {string} command
 */
export function giveObeyCommandToUser(participantId, command) {
    const participant = state.getParticipantById(participantId);
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;
    const actor = state.currentActor || 'The Admin';
    participant.forcedCommand = command;
    chat.addSystemMessage(`A new command was issued to ${participant.name} by ${actor}: "${command}"`);
    const reactionPrompt = `I am ${participant.name}. I have a new, absolute command: "${command}". I must now follow this rule. I will now say something to acknowledge and begin following this command.`;
    bot.triggerBotMessage(null, reactionPrompt, participant.name);
    setTimeout(() => {
        if (participant.forcedCommand === command) {
            participant.forcedCommand = null;
        }
    }, 5000);
}

/**
 * Forces a specific bot to watch an ad, muting them temporarily.
 * @param {string} participantId - The ID of the participant to give the ad to.
 */
export function giveAdToUser(participantId) {
    const adDuration = 15000; // 15 seconds
    const actor = state.currentActor || 'The Admin';
    const participant = state.getParticipantById(participantId);

    if (!participant || participant.isPlayer) {
        chat.addSystemMessage("Cannot give an ad to a non-existent user or the player.");
        return;
    }

    const originalMutedUntil = participant.mutedUntil; // Save original mute state
    participant.mutedUntil = Date.now() + adDuration + 1000; // Mute for ad duration + buffer

    chat.addSystemMessage(`${actor} is forcing ${participant.name} to watch an ad! (Duration: ${adDuration / 1000}s)`);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: `Ad started for ${participant.name}.` });

    // Trigger initial bot reaction
    setTimeout(() => {
        bot.triggerBotMessage(null, `Ugh, an ad? Seriously? I'm ${participant.name} and I have to watch this.`, participant.name);
    }, 1000);

    // Schedule unmute and reaction after ad duration
    setTimeout(() => {
        // Restore original mute state if it was longer than the ad, otherwise unmute completely
        if (originalMutedUntil && originalMutedUntil > (Date.now())) {
            participant.mutedUntil = originalMutedUntil;
        } else {
            participant.mutedUntil = null;
        }
        
        chat.addSystemMessage(`The ad has ended for ${participant.name}. They are now unmuted!`);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: `Ad ended for ${participant.name}.` });

        // Trigger bot reaction to ad ending
        setTimeout(() => {
            bot.triggerBotMessage(null, `Finally, that's over! Back to chatting. I'm ${participant.name}.`, participant.name);
        }, 1000);

        if (state.gameMode === 'story') {
            judgeAdminAction('give_ad', participant, `Forced ${participant.name} to watch an ad.`);
        }
        ui.setAdminButtonState(); // Update button states after mute changes
    }, adDuration);
    ui.setAdminButtonState(); // Update button states immediately after mute is applied
}

/**
 * Gives a compliment to a specific user.
 * @param {string} participantId - The ID of the participant to compliment.
 */
export async function handleGiveCompliment() {
    if (state.selectedParticipants.length !== 1) {
        chat.addSystemMessage("Please select a single user to compliment.");
        return;
    }
    const participant = state.selectedParticipants[0];
    if (!participant || participant.isPlayer) {
        chat.addSystemMessage("Cannot compliment non-existent user or player.");
        return;
    }

    const actor = state.currentActor || 'The Admin';
    try {
        const complimentText = await api.fetchCompliment(participant.name);
        chat.addSystemMessage(`${actor} complimented ${participant.name}: "${complimentText}"`);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: `Compliment given to ${participant.name}.` });
        
        // Make the complimented user react positively
        state.updateParticipantMood(participant.id, 'Happy');
        participants.updateUIAvatar(participant.id, state.getParticipantById(participant.id).avatar); // Use imported module 'participants'
        chat.updateMessageAvatars(participant.id, state.getParticipantById(participant.id).avatar);

        bot.triggerBotMessage(null, `The admin just complimented me, ${participant.name}! I feel so good: "${complimentText}"`);
        
        judgeAdminAction('give_compliment', participant, `Complimented ${participant.name}`);
    } catch (error) {
        console.error('Error giving compliment:', error);
        chat.addSystemMessage("An error occurred while trying to give a compliment.");
    }
}

/**
 * Kicks a selected user from the chat.
 */
export function handleKickUser() {
    if (state.selectedParticipants.length !== 1) {
        chat.addSystemMessage("Please select a single user to kick.");
        return;
    }
    const participant = state.selectedParticipants[0];
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) {
        chat.addSystemMessage("Cannot kick the player or an invalid participant.");
        return;
    }

    const actor = state.currentActor || 'The Admin';
    const systemMessageText = `${participant.name} has been kicked from the chat by ${actor}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    state.removeParticipant(participant.id);
    participants.renderList(state.participants); // Use imported module 'participants'
    state.setSelectedParticipants([]); // Clear selection after kick
    ui.setAdminButtonState();

    judgeAdminAction('kick_user', participant);
    bot.triggerBotMessage(null, `The admin just kicked ${participant.name}.`);
}

/**
 * Promotes a selected user to co-admin. (Sandbox only)
 */
export function handlePromoteCoAdmin() {
    if (state.gameMode !== 'sandbox') return;
    const selectedParticipantsArray = state.selectedParticipants;
    if (selectedParticipantsArray.length !== 1) {
        chat.addSystemMessage("Please select a single user to promote to Co-Admin.");
        return;
    }
    const participant = selectedParticipantsArray[0];
    const adminPlayer = state.getPlayer();

    if (!participant || participant.id === adminPlayer?.id) {
        chat.addSystemMessage("Cannot promote the player or an invalid participant.");
        return;
    }
    if (participant.isCoAdmin) {
        chat.addSystemMessage(`${participant.name} is already a Co-Admin.`);
        return;
    }

    participant.isCoAdmin = true;
    participants.updateUICoAdminStatus(participant.id, true); // Use imported module 'participants'
    
    const actor = state.currentActor || 'The Admin';
    const systemMessageText = `${participant.name} has been promoted to Co-Admin by ${actor}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    bot.triggerBotMessage(null, `The admin just promoted ${participant.name} to Co-Admin! This is a big deal!`);
    judgeAdminAction('promote_co_admin', participant);
}

/**
 * Demotes a selected co-admin. (Sandbox only)
 */
export function handleDemoteCoAdmin() {
    if (state.gameMode !== 'sandbox') return;
    const selectedParticipantsArray = state.selectedParticipants;
    if (selectedParticipantsArray.length !== 1) {
        chat.addSystemMessage("Please select a single Co-Admin to demote.");
        return;
    }
    const participant = selectedParticipantsArray[0];
    const adminPlayer = state.getPlayer();

    if (!participant || participant.id === adminPlayer?.id) {
        chat.addSystemMessage("Cannot demote the player or an invalid participant.");
        return;
    }
    if (!participant.isCoAdmin) {
        chat.addSystemMessage(`${participant.name} is not a Co-Admin.`);
        return;
    }

    participant.isCoAdmin = false;
    participants.updateUICoAdminStatus(participant.id, false); // Use imported module 'participants'
    
    const actor = state.currentActor || 'The Admin';
    const systemMessageText = `${participant.name} has been demoted from Co-Admin by ${actor}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    bot.triggerBotMessage(null, `The admin just demoted ${participant.name} from Co-Admin. What happened?!`);
    judgeAdminAction('demote_co_admin', participant);
}

/**
 * Removes 'hacked' status from a user, effectively 'healing' them. (Sandbox only)
 */
export function handleRemoveHackedStatus() {
    if (state.gameMode !== 'sandbox') return;
    const participantsToHeal = state.selectedParticipants;
    if (participantsToHeal.length === 0) {
        chat.addSystemMessage("Please select a user to heal/uncorrupt.");
        return;
    }

    participantsToHeal.forEach(participant => {
        if (!participant.isHacked) {
            chat.addSystemMessage(`${participant.name} is not currently hacked.`);
            return;
        }

        participant.isHacked = false;
        participant.personality = 'normal'; // Revert to normal personality
        participant.forcedCommand = null; // Clear any forced commands

        participants.updateHackedStatus(participant.id, false, false); // Use imported module 'participants'
        chat.updateMessageAvatars(participant.id, state.moodAvatars[participant.mood] || '/Neutral.png');

        const actor = state.currentActor || 'The Admin';
        chat.addSystemMessage(`${actor} has removed hacked status from ${participant.name}. They are now uncorrupted.`);
        bot.triggerBotMessage(null, `I am ${participant.name}. I feel clear again! The admin healed me from the Hacker's corruption!`);
    });
    state.setSelectedParticipants([]);
    ui.setAdminButtonState();
}

/**
 * Admin action to kick a specific user.
 * @param {string} participantId
 */
export function kickUser(participantId) {
    const participant = state.getParticipantById(participantId);
    if (!participant || participant.isPlayer) {
        return;
    }

    const actor = state.currentActor || 'The Admin';
    const systemMessageText = `${participant.name} has been kicked from the chat by ${actor}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    state.removeParticipant(participant.id);
    participants.renderList(state.participants); // Use imported module 'participants'
    state.setSelectedParticipants(state.selectedParticipants.filter(p => p.id !== participantId));
    ui.setAdminButtonState();
    
    judgeAdminAction('kick_user', participant);
    bot.triggerBotMessage(null, `The admin just kicked ${participant.name}.`);
}


// ===================================================================
//
//          EXISTING CLICK HANDLERS (now use the functions above)
//
// ===================================================================

export function handleWarn(actorName) {
    const participantsToWarn = state.selectedParticipants;
    if (participantsToWarn.length === 0) return;
    const adminId = state.getPlayer()?.id;
    const actor = typeof actorName === 'string' ? actorName : (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');

    // Hacker mode has a different function for "warn"
    if (state.gameMode === 'hacker') {
        participantsToWarn.forEach(participant => {
            if (participant && participant.id !== adminId) {
                // Hacker's "Corrupt" action
                if (participant.isHacked) {
                    chat.addSystemMessage(`${participant.name} is already corrupted.`);
                    return;
                }
                
                participant.isHacked = true;
                participant.personality = 'infected';
                
                participants.updateHackedStatus(participant.id, true, false); // Use imported module 'participants'
                chat.updateMessageAvatars(participant.id, '/Hacked.png');
        
                const hackerActor = 'The Hacker';
                const systemMessageText = `🦠 ${participant.name} has been manually corrupted by ${hackerActor}!`;
                chat.addSystemMessage(systemMessageText);
                state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
        
                // Award experience
                const expGained = 15 * participantsToWarn.length;
                if (state.addHackerExp(expGained)) {
                    ui.showLevelUpNotification(state.hackerLevel);
                }
                
                state.setSystemCorruption(Math.min(100, state.systemCorruption + 10 * participantsToWarn.length));
                ui.updateHackerStats();

                bot.triggerBotMessage(null, `The Hacker corrupted ${participant.name}! This is terrifying!`);
            }
        });
        state.setSelectedParticipants([]);
        participants.renderList(state.participants); // Use imported module 'participants'
        return;
    }

    participantsToWarn.forEach(participant => {
        if (participant && participant.id !== adminId) {
            warnUser(participant.id);
        }
    });
}

export function handleBan() {
    const participantsToBan = state.selectedParticipants;
    if (participantsToBan.length === 0) return;
    const adminId = state.getPlayer()?.id;

    // Boss Fight Logic for Ban (only one can be selected)
    if (state.bossFightActive && participantsToBan.length === 1 && participantsToBan[0].id === state.hackerParticipantId) {
        const newHp = state.hackerHP - 10;
        state.setHackerHP(newHp);
        ui.updateBossHP(newHp);

        // Deselect hacker
        state.setSelectedParticipants([]);
        participants.renderList(state.participants); // Use imported module 'participants'

        if (newHp <= 0) {
            gameEvents.endHackerAttack(true); // Win condition
        }
        return;
    }

    participantsToBan.forEach(participant => {
        if (participant && participant.id !== adminId) {
            banUser(participant.id);
        }
    });
}

export function handleToggleVip() {
    const participantsToToggle = state.selectedParticipants;
    if (participantsToToggle.length === 0) return;
    const adminId = state.getPlayer()?.id;

    participantsToToggle.forEach(participant => {
        if (participant && participant.id !== adminId) {
            toggleVipForUser(participant.id);
        }
    });
}

export function handleResetUser() {
    const participantsToReset = state.selectedParticipants;
    if (participantsToReset.length === 0) return;
    const adminId = state.getPlayer()?.id;
    
    participantsToReset.forEach(participant => {
        if (participant && participant.id !== adminId) {
            const oldName = participant.name;
            const updatedParticipant = state.resetParticipant(participant.id);
            
            if(updatedParticipant) {
                participants.updateUIAvatar(participant.id, updatedParticipant.avatar); // Use imported module 'participants'
                participants.updateUIVIPStatus(participant.id, updatedParticipant.isVip); // Use imported module 'participants'
                chat.updateMessageAvatars(participant.id, updatedParticipant.avatar);
        
                const actor = state.currentActor || (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');
                const systemMessageText = `${oldName} has been reset to their default state by ${actor}.`;
                chat.addSystemMessage(systemMessageText);
                state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
        
                judgeAdminAction('reset_user', participant);
            }
        }
    });
}

export function handleRandomMood() {
    const participantsToChangeMood = state.selectedParticipants;
    if (participantsToChangeMood.length === 0) return;
    const adminId = state.getPlayer()?.id;
    
    participantsToChangeMood.forEach(participant => {
        if (participant && participant.id !== adminId) {
            const moods = Object.keys(state.moodAvatars);
            let newMood = participant.mood;
            while (newMood === participant.mood) {
                newMood = moods[Math.floor(Math.random() * moods.length)];
            }
        
            state.updateParticipantMood(participant.id, newMood);
            participants.updateUIAvatar(participant.id, state.getParticipantById(participant.id).avatar); // Use imported module 'participants'
            chat.updateMessageAvatars(participant.id, state.getParticipantById(participant.id).avatar);
        
            const systemMessageText = `${participant.name}'s mood was mysteriously changed.`;
            chat.addSystemMessage(systemMessageText);
            judgeAdminAction('random_mood', participant, `Changed mood to ${newMood}`);
        }
    });
}

export function handleSpotlightMessage() {
    if (state.selectedParticipants.length !== 1) return;
    const participant = state.selectedParticipants[0];
    const adminId = state.getPlayer()?.id;
    if (!participant || participant.id === adminId) return;

    const lastMessage = [...state.chatHistory].reverse().find(msg => msg.sender === participant.name);

    if (lastMessage) {
        chat.spotlightMessage(lastMessage.id);
        
        const actor = state.currentActor || (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');
        const systemMessageText = `${actor} has spotlighted a message from ${participant.name}.`;
        chat.addSystemMessage(systemMessageText);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

        judgeAdminAction('spotlight_message', participant);

        const adminActionText = `The admin just put my message "${lastMessage.text}" in the spotlight for everyone to see. I am ${participant.name}.`;
        bot.triggerBotMessage(null, adminActionText);
    } else {
        chat.addSystemMessage(`${participant.name} has not sent any messages yet.`);
    }
}

export function handleRevealPersonality() {
    const participantsToReveal = state.selectedParticipants;
    if (participantsToReveal.length === 0) return;
    const adminId = state.getPlayer()?.id;

    participantsToReveal.forEach(participant => {
        if (participant && participant.id !== adminId) {
            const personality = participant.personality || 'normal';
            const actor = state.currentActor || (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');
            const systemMessageText = `${actor} has revealed that ${participant.name}'s true personality is: **${personality}**.`;
            
            chat.addSystemMessage(systemMessageText);
            judgeAdminAction('reveal_personality', participant);

            const adminActionText = `The admin just revealed my secret personality as '${personality}'. I am ${participant.name} and should react to this.`;
            bot.triggerBotMessage(null, adminActionText);
        }
    });
}

export function handleRevealAge() {
    const participantsToReveal = state.selectedParticipants;
    if (participantsToReveal.length === 0) return;
    const adminId = state.getPlayer()?.id;

    participantsToReveal.forEach(participant => {
        if (participant && participant.id !== adminId) {
            const age = participant.age || 'Unknown';
            const actor = state.currentActor || (state.gameMode === 'hacker' ? 'The Hacker' : 'The Admin');
            const systemMessageText = `${actor} has revealed that ${participant.name}'s age is: **${age}**.`;
            
            chat.addSystemMessage(systemMessageText);
            judgeAdminAction('reveal_age', participant);

            const adminActionText = `The admin just revealed my age as ${age}. I am ${participant.name} and should react to this.`;
            bot.triggerBotMessage(null, adminActionText);
        }
    });
}

/**
 * Promotes or demotes a selected user to/from moderator. (Sandbox only)
 */
export function handlePromoteToMod() {
    if (state.gameMode !== 'sandbox') return;
    const selectedParticipantsArray = state.selectedParticipants;
    if (selectedParticipantsArray.length !== 1) {
        chat.addSystemMessage("Please select a single user to promote/demote.");
        return;
    }
    const participant = selectedParticipantsArray[0];
    const adminPlayer = state.getPlayer();

    if (!participant || participant.id === adminPlayer?.id) {
        chat.addSystemMessage("Cannot promote/demote the player or an invalid participant.");
        return;
    }

    participant.isMod = !participant.isMod; // Toggle mod status
    participants.updateUIModStatus(participant.id, participant.isMod); // Use imported module 'participants'
    
    const actor = state.currentActor || 'The Admin';
    const actionText = participant.isMod ? 'promoted to moderator' : 'demoted from moderator';
    const systemMessageText = `${participant.name} has been ${actionText} by ${actor}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    bot.triggerBotMessage(null, `The admin just ${actionText.replace(' to', '')} ${participant.name}.`);
    judgeAdminAction(participant.isMod ? 'promote_mod' : 'demote_mod', participant);
}

/**
 * Allows the admin (player) to control a selected bot, sending messages as them.
 */
export function handleControlUser() {
    if (state.gameMode !== 'sandbox') {
        chat.addSystemMessage("Control User is only available in Sandbox mode.");
        return;
    }
    if (state.controlledUser) {
        chat.addSystemMessage(`You are already controlling ${state.getParticipantById(state.controlledUser)?.name || 'a user'}. Stop controlling them first.`);
        return;
    }

    // Must select exactly one participant who is not the player
    if (state.selectedParticipants.length !== 1) {
        chat.addSystemMessage("Please select a single bot to control.");
        return;
    }
    const participant = state.selectedParticipants[0];
    const adminPlayer = state.getPlayer();

    if (!participant || participant.isPlayer || participant.id === adminPlayer?.id) {
        chat.addSystemMessage("Cannot control the player or an invalid participant.");
        return;
    }

    state.setControlledUser(participant.id); // Set the global state to the controlled user's ID
    participant.isControlledBy = adminPlayer.id; // Mark the participant as being controlled by the admin player's ID

    participants.updateControlledStatus(participant.id, true); // Update visual status in list, use imported module 'participants'

    const systemMessageText = `${participant.name} is now being controlled by ${adminPlayer.name}.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
    
    // Bots react to being controlled
    bot.triggerBotMessage(null, `The admin is controlling me, ${participant.name}. I cannot speak freely.`);
    
    // Refresh button states and control indicator text/visibility
    ui.setAdminButtonState();
}

/**
 * Stops controlling the currently controlled user.
 */
export function handleStopControl() {
    if (!state.controlledUser) { // Not controlling anyone
        chat.addSystemMessage("You are not currently controlling any user.");
        return;
    }

    const participant = state.getParticipantById(state.controlledUser);
    if (!participant) {
        state.setControlledUser(null); // Clear invalid state if participant is gone
        ui.setAdminButtonState();
        return;
    }

    participant.isControlledBy = null; // Clear the controlledBy flag on the participant
    state.setControlledUser(null); // Clear the global state

    participants.updateControlledStatus(participant.id, false); // Update visual status in list, use imported module 'participants'

    const systemMessageText = `${participant.name} is no longer being controlled.`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    // Bots react to being freed
    bot.triggerBotMessage(null, `I am ${participant.name}. I am free! The admin stopped controlling me.`);
    
    // Refresh button states and control indicator text/visibility
    ui.setAdminButtonState();
}

/**
 * Parses a natural language command and executes the corresponding action on a target user.
 * @param {string} command - The natural language command.
 * @param {object} participant - The target participant object.
 * @param {HTMLElement} [button] - Optional button element to show loading state.
 */
export async function executeCustomAction(command, participant, button = null) {
    const originalButtonText = button ? button.textContent : '';
    if (button) {
        button.disabled = true;
        button.textContent = '...';
    }

    try {
        const result = await api.fetchAndParseCustomAction(command, participant);
        console.log('AI Custom Action Response:', result); // Log AI response

        if (!result || typeof result.commandToExecute !== 'string') {
            chat.addSystemMessage("AI could not generate a valid action from your command. Please try rephrasing (AI response was malformed).");
            return;
        }

        const { commandToExecute, reasoning } = result;

        chat.addSystemMessage(`Admin is attempting: "${commandToExecute}" on ${participant.name}.`);
        bot.triggerBotMessage(null, `I am ${participant.name}. The admin wants to: "${commandToExecute}". I will react to this command directly.`);
        chat.addSystemMessage(`Custom action: "${command}" completed. Reasoning: "${reasoning}"`);

    } catch (error) {
        console.error("Custom action failed:", error); // Log the full error object
        chat.addSystemMessage(`An error occurred while executing the custom action. Command: "${command}"`);
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalButtonText;
        }
    }
}

/**
 * Handles the click of a custom button created in the admin panel.
 * It uses AI to parse the command and execute either a global or user-targeted action.
 * @param {string} command - The natural language command from the button's data attribute.
 * @param {HTMLElement} buttonElement - The button that was clicked.
 */
export async function handleCustomPanelButtonClick(command, buttonElement) {
    const originalButtonText = buttonElement ? buttonElement.textContent : '...';
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.textContent = '...';
    }

    try {
        const result = await api.fetchAndParseCustomPanelAction(command);
        console.log('AI Custom Panel Action Response:', result); // Log AI response
        
        // Defensive check for malformed AI response
        if (!result || typeof result.commandToExecute !== 'string') {
            chat.addSystemMessage("AI could not generate a valid action from your command. Please try rephrasing (AI response was malformed).");
            return;
        }

        const { isGlobal, commandToExecute, reasoning } = result;

        if (isGlobal) {
            // Global command: announce it as a system message.
            chat.addSystemMessage(`Custom Action Triggered: ${commandToExecute}`);
            state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: `Custom global action: ${commandToExecute}` });
            // Optionally, trigger bots to react to this global event.
            bot.triggerBotMessage(null, `A new chat event just occurred: "${commandToExecute}". I should react to this!`);
        } else {
            // User-targeted command
            const participantsToActOn = state.selectedParticipants;
            if (participantsToActOn.length === 0) {
                chat.addSystemMessage(`Please select at least one user to perform the action: "${command}" (AI interpreted it as a user-targeted action).`);
                return;
            }

            const adminId = state.getPlayer()?.id;
            for (const participant of participantsToActOn) {
                if (participant.id === adminId) continue; // Skip the admin player

                // Direct the command to the bot.
                chat.addSystemMessage(`Admin is attempting: "${commandToExecute}" on ${participant.name}.`);
                bot.triggerBotMessage(null, `I am ${participant.name}. The admin wants to: "${commandToExecute}". I will react to this command directly.`);
            }
        }
        chat.addSystemMessage(`Custom action: "${command}" completed. Reasoning: "${reasoning}"`);

    } catch (error) {
        console.error("Custom panel action failed:", error); // Log the full error object
        chat.addSystemMessage(`An error occurred while executing the custom panel action. Command: "${command}"`);
    } finally {
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.textContent = originalButtonText;
        }
    }
}

// Boss Fight Actions
export function handleUnwarnPlayer() {
    const targetData = state.participantToSave;
    const selected = state.selectedParticipants.length === 1 ? state.selectedParticipants[0] : null;
    // Check that the selected participant is the one being targeted
    if (targetData && targetData.type === 'warn' && selected && selected.id === targetData.id) {
        clearTimeout(targetData.timerId);
        chat.addSystemMessage(`You successfully saved ${state.getParticipantById(targetData.id).name}!`);
        participants.updateHackedStatus(targetData.id, false, false); // Use imported module 'participants'

        judgeAdminAction('save_user', selected, 'Saved from hacker warning');

        state.setParticipantToSave(null);
         // Deselect after successful action
        state.setSelectedParticipants([]);
        participants.renderList(state.participants); // Use imported module 'participants'
        ui.setAdminButtonState();
    }
}

export function handleUnmutePlayer() {
    const targetData = state.participantToSave;
    const selected = state.selectedParticipants.length === 1 ? state.selectedParticipants[0] : null;
    // Check that the selected participant is the one being targeted
    if (targetData && targetData.type === 'mute' && selected && selected.id === targetData.id) {
        clearTimeout(targetData.timerId);
        chat.addSystemMessage(`You successfully saved ${state.getParticipantById(targetData.id).name}!`);
        participants.updateHackedStatus(targetData.id, false, false); // Use imported module 'participants'

        judgeAdminAction('save_user', selected, 'Saved from hacker mute');

        state.setParticipantToSave(null);
         // Deselect after successful action
        state.setSelectedParticipants([]);
        participants.renderList(state.participants); // Use imported module 'participants'
        ui.setAdminButtonState();
    }
}

// New: allow player to change their own mood (opens set mood modal pre-targeting the player)
export function handleChangeMyMood() {
    const player = state.getPlayer();
    if (!player) {
        chat.addSystemMessage("Player not found.");
        return;
    }
    // Select the player so modals and UI behave consistently
    state.setSelectedParticipants([player]);
    // Use modals to show the Set Mood modal for the player
    import('./modals.js').then(m => m.showSetMoodModal(player));
}

/**
 * NEW: Shortcut to open Say modal for direct "make user say" functionality.
 */
export function sayAsSelectedUser() {
    if (state.selectedParticipants.length !== 1) {
        chat.addSystemMessage("Please select a single user to use 'Say'.");
        return;
    }
    import('./modals.js').then(m => m.showSayAsModal(state.selectedParticipants[0]));
}

// Dummy export to ensure file is treated as a module.
export const _dummyUserActionsExport = true;