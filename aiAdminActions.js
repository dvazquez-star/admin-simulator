// This file contains the implementations for all actions the AI Admin can perform.
// It is imported by `aiAdmin.js`, which handles the decision-making loop.

import * as api from './api.js';
import * as state from './state.js';
import * as chat from './chat.js';
import * as participants from './participants.js';
import * as gameEvents from './gameEvents.js';
import * as bot from './bot.js';
import * as ui from './ui.js';

// --- Helper Functions ---

/**
 * A helper to make the AI Admin "chat" by triggering the bot message generation with a specific prompt.
 * @param {string} prompt - The prompt to guide the AI's message.
 */
async function triggerAdminChatMessage(prompt) {
    // We use the main bot message trigger but give it a very specific context.
    await bot.triggerBotMessage(null, prompt);
}

/**
 * Selects a target for an admin action. Prioritizes violators or troublemakers.
 * @param {Array<object>} availableBots - The list of bots to choose from.
 * @returns {object|null} The selected bot participant or null if none available.
 */
function selectTarget(availableBots) {
    if (availableBots.length === 0) return null;

    // Prioritize targeting bots that are actively causing trouble.
    const troublemakers = availableBots.filter(p =>
        p.personality === 'violator' ||
        p.warnings > 0 ||
        p.mood === 'Mad' ||
        p.mood === 'Angry'
    );

    if (troublemakers.length > 0 && Math.random() < 0.75) { // 75% chance to target a troublemaker
        return troublemakers[Math.floor(Math.random() * troublemakers.length)];
    }

    // Otherwise, pick a random bot.
    return availableBots[Math.floor(Math.random() * availableBots.length)];
}


// --- Action Implementations ---

export async function handleChat(aiAdmin) {
    const prompt = `I am ${aiAdmin.name}, the admin. I should say something to keep the conversation going, or comment on what's happening.`;
    await triggerAdminChatMessage(prompt);
}

export async function handleEnforceRules(aiAdmin, availableBots) {
    const target = selectTarget(availableBots);
    let prompt;
    if (target && (target.personality === 'violator' || target.warnings > 0)) {
        prompt = `User ${target.name} is causing trouble. As ${aiAdmin.name}, I need to enforce the rules.`;
    } else {
        prompt = `Things seem quiet. As ${aiAdmin.name}, I'll remind everyone to follow the rules.`;
    }
    await triggerAdminChatMessage(prompt);
}

export async function handleWarn(aiAdmin, availableBots) {
    const target = selectTarget(availableBots);
    if (!target) return;

    target.warnings = (target.warnings || 0) + 1;
    const warnMessage = `${target.name} has received warning ${target.warnings}/3 from ${aiAdmin.name}.`;
    chat.addSystemMessage(warnMessage);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: warnMessage });

    await triggerAdminChatMessage(`I just warned ${target.name}. They need to be careful. I am ${aiAdmin.name}.`);

    if (target.warnings >= 3) {
        await handleBan(aiAdmin, [target]); // Pass the specific target to ban
    }
}

export async function handleBan(aiAdmin, availableBots) {
    const target = selectTarget(availableBots);
    if (!target) return;

    const banMessage = `${target.name} has been banned by ${aiAdmin.name}.`;
    chat.addSystemMessage(banMessage);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: banMessage });

    await triggerAdminChatMessage(`I just banned ${target.name}. That's what happens when you break the rules. I am ${aiAdmin.name}.`);

    state.removeParticipant(target.id);
    participants.renderList(state.participants);
}

export async function handleMute(aiAdmin, availableBots) {
    const target = selectTarget(availableBots);
    if (!target) return;

    const duration = [60, 300, 900][Math.floor(Math.random() * 3)]; // 1, 5, or 15 minutes
    target.mutedUntil = Date.now() + duration * 1000;

    const muteMessage = `${target.name} has been muted for ${duration / 60} minute(s) by ${aiAdmin.name}.`;
    chat.addSystemMessage(muteMessage);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: muteMessage });

    await triggerAdminChatMessage(`I muted ${target.name}. Let them cool off for a bit. I am ${aiAdmin.name}.`);
}

export async function handleToggleVip(aiAdmin, availableBots) {
    const target = selectTarget(availableBots);
    if (!target) return;

    target.isVip = !target.isVip;
    participants.updateUIVIPStatus(target.id, target.isVip);

    const vipMessage = `${aiAdmin.name} has ${target.isVip ? 'granted' : 'revoked'} VIP status for ${target.name}.`;
    chat.addSystemMessage(vipMessage);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: vipMessage });
    
    await triggerAdminChatMessage(`I just changed ${target.name}'s VIP status. I am ${aiAdmin.name}.`);
}

export async function handleChangeNickname(aiAdmin, availableBots) {
    // This action can be very disruptive, so make it rare or remove it for AI Admin
    if (Math.random() > 0.1) return; // 10% chance to actually do it

    const target = selectTarget(availableBots);
    if (!target) return;

    const [newName] = await api.fetchParticipantNames(1, state.participants.map(p => p.name));
    if (newName && newName !== target.name) {
        const oldName = target.name;
        target.name = newName;
        participants.updateUIName(target.id, newName);
        participants.updateMessageNames(target.id, newName);

        const changeMessage = `${oldName} is now known as ${newName}, by order of ${aiAdmin.name}.`;
        chat.addSystemMessage(changeMessage);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: changeMessage });
        await triggerAdminChatMessage(`I've changed ${oldName}'s name to ${newName}. I am ${aiAdmin.name}.`);
    }
}

export async function handleSendAdminMessage(aiAdmin) {
    const adminMessages = ["I'm watching everyone.", "Follow the rules, or else.", "This is an official admin broadcast."];
    const message = adminMessages[Math.floor(Math.random() * adminMessages.length)];
    const msgId = chat.addAdminMessage(message);
    state.addMessageToHistory({ id: msgId, sender: aiAdmin.name, text: message });
}

export async function handleRunPoll(aiAdmin) {
    const questions = ["Should we add more rules?", "Is this chat fun?", "Who is the most likely to be banned?"];
    const question = questions[Math.floor(Math.random() * questions.length)];
    const options = ["Yes", "No", "Maybe"];

    const pollId = chat.addPollMessage(question, options);
    const pollOptionsData = options.reduce((acc, opt) => ({ ...acc, [opt]: [] }), {});
    state.addMessageToHistory({ id: pollId, sender: aiAdmin.name, text: `Poll: ${question}`, pollData: { question, options: pollOptionsData, totalVotes: 0 } });
    
    await triggerAdminChatMessage(`I've started a poll: "${question}". Everyone should vote. I am ${aiAdmin.name}.`);
}

export async function handleAddBot(aiAdmin) {
    const [name] = await api.fetchParticipantNames(1, state.participants.map(p => p.name));
    if (name) {
        const newBot = participants.createBot(name);
        state.addParticipant(newBot);
        participants.renderList(state.participants);
        const joinMsg = `${aiAdmin.name} has invited ${name} to the chat.`;
        chat.addSystemMessage(joinMsg);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: joinMsg });
        await triggerAdminChatMessage(`${name} has joined us. Welcome them. I am ${aiAdmin.name}.`);
    }
}

export async function handleSummonViolator(aiAdmin) {
    if (state.participants.some(p => p.personality === 'violator')) return; // Only one violator at a time

    const [name] = await api.fetchParticipantNames(1, state.participants.map(p => p.name), "Generate a single, edgy or rule-breaking online nickname.");
    if (name) {
        const violator = participants.createBot(name);
        violator.personality = 'violator';
        violator.mood = 'Angry';
        violator.avatar = state.moodAvatars['Angry'];
        state.addParticipant(violator);
        participants.renderList(state.participants);

        const summonMsg = `${aiAdmin.name} has summoned a new user, ${name}, to shake things up.`;
        chat.addSystemMessage(summonMsg);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: summonMsg });
        await triggerAdminChatMessage(`Let's see what kind of trouble ${name} gets into. I am ${aiAdmin.name}.`);
    }
}

export async function handleTriggerEvent(aiAdmin) {
    if (state.activeEvent) return; // Don't stack events
    const event = state.randomEvents[Math.floor(Math.random() * state.randomEvents.length)];
    gameEvents.triggerEvent(event);
}

export async function handleShuffleNames(aiAdmin, availableBots) {
    // Make this action very rare as it's highly disruptive.
    if (availableBots.length < 2 || Math.random() > 0.05) return;

    const names = availableBots.map(p => p.name);
    // Fisher-Yates shuffle
    for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [names[i], names[j]] = [names[j], names[i]];
    }

    availableBots.forEach((p, index) => {
        const oldName = p.name;
        const newName = names[index];
        if (oldName !== newName) {
            p.name = newName;
            participants.updateUIName(p.id, newName);
            participants.updateMessageNames(p.id, newName);
        }
    });

    const shuffleMsg = `${aiAdmin.name} has shuffled everyone's nicknames!`;
    chat.addSystemMessage(shuffleMsg);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: shuffleMsg });
}

export async function handleSetMood(aiAdmin, availableBots) {
    const target = selectTarget(availableBots);
    if (!target) return;
    const moods = Object.keys(state.moodAvatars);
    const newMood = moods[Math.floor(Math.random() * moods.length)];

    state.updateParticipantMood(target.id, newMood);
    participants.updateUIAvatar(target.id, target.avatar);
    chat.updateMessageAvatars(target.id, target.avatar);

    const moodMsg = `${aiAdmin.name} has changed ${target.name}'s mood to ${newMood}.`;
    chat.addSystemMessage(moodMsg);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: moodMsg });
}

export async function handleResetUser(aiAdmin, availableBots) {
    const target = selectTarget(availableBots);
    if (!target) return;

    const updated = state.resetParticipant(target.id);
    if (updated) {
        participants.updateUIAvatar(target.id, updated.avatar);
        participants.updateUIVIPStatus(target.id, updated.isVip);
        chat.updateMessageAvatars(target.id, updated.avatar);
        const resetMsg = `${aiAdmin.name} has reset ${target.name} to default.`;
        chat.addSystemMessage(resetMsg);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: resetMsg });
    }
}

export async function handleSpotlightMessage(aiAdmin) {
    const recentMessages = state.chatHistory.slice(-10).filter(msg => msg.sender !== 'System' && msg.sender !== aiAdmin.name);
    if (recentMessages.length > 0) {
        const targetMessage = recentMessages[Math.floor(Math.random() * recentMessages.length)];
        chat.spotlightMessage(targetMessage.id);
        const spotlightMsg = `${aiAdmin.name} has highlighted a message from ${targetMessage.sender}.`;
        chat.addSystemMessage(spotlightMsg);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: spotlightMsg });
    }
}

export async function handleFreezeChat(aiAdmin) {
    // This is very disruptive, only allow very rarely.
    if (Math.random() < 0.02) { // 2% chance
        state.setChatFrozen(true);
        const freezeMessage = `${aiAdmin.name} has temporarily frozen the chat for 15 seconds.`;
        chat.addSystemMessage(freezeMessage);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: freezeMessage });
        
        setTimeout(() => {
            state.setChatFrozen(false);
            const unfreezeMessage = `${aiAdmin.name} has unfrozen the chat.`;
            chat.addSystemMessage(unfreezeMessage);
            state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: unfreezeMessage });
        }, 15000);
    }
}

export async function handleClearChat(aiAdmin) {
    // This is very disruptive, only allow very rarely.
     if (Math.random() < 0.01) { // 1% chance
        ui.elements.messagesContainer.innerHTML = '';
        state.chatHistory.length = 0;
        
        const clearMessage = `${aiAdmin.name} cleared the entire chat history!`;
        chat.addSystemMessage(clearMessage);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: clearMessage });
    }
}

export async function handleImpersonate(aiAdmin, availableBots) {
    // This is extremely disruptive and confusing, disable for AI admin.
    return;
}