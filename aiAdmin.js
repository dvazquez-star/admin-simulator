// This file contains AI admin behavior logic for player mode.
import * as api from './api.js';
import * as state from './state.js';
import * as chat from './chat.js';
import * as participants from './participants.js';
import * as ui from './ui.js';
import * as gameEvents from './gameEvents.js';

/**
 * Starts the AI admin behavior in player mode.
 */
export function startAiAdminBehavior() {
    if (state.gameMode !== 'player' || !state.aiAdmin) return;

    console.log("Starting AI admin behavior for:", state.aiAdmin.name);

    setTimeout(() => {
        const welcomeMessage = `Hello everyone! I'm ${state.aiAdmin.name}, your administrator. Let's keep things civil!`;
        const messageId = chat.addAdminMessage(welcomeMessage);
        state.addMessageToHistory({ id: messageId, sender: state.aiAdmin.name, text: welcomeMessage });
    }, 3000);

    // AI Admin Decision Loop
    setInterval(async () => {
        await performAiAdminAction();
    }, Math.random() * 4000 + 4000); // 4-8 seconds
}

/**
 * The core function for the AI admin to decide and perform an action.
 */
async function performAiAdminAction() {
    if (!state.aiAdmin) return;
    const availableBots = state.getNonPlayerParticipants().filter(p => !p.isAiAdmin);

    // A weighted list of actions to make certain behaviors more or less common.
    const weightedActions = [
        ...Array(10).fill('chat'),
        ...Array(6).fill('enforce_rules'),
        ...Array(3).fill('warn'),
        ...Array(3).fill('mute'),
        ...Array(2).fill('toggle_vip'),
        ...Array(2).fill('set_mood'),
        ...Array(2).fill('run_poll'),
        ...Array(2).fill('add_bot'),
        'ban', 'summon_violator', 'trigger_event', 'reset_user', 'admin_message'
    ];
    
    const actionKey = weightedActions[Math.floor(Math.random() * weightedActions.length)];
    const actionMap = {
        'chat': triggerAdminChatMessage,
        'enforce_rules': handleEnforceRules,
        'warn': () => handleWarn(availableBots),
        'mute': () => handleMute(availableBots),
        'ban': () => handleBan(availableBots),
        'toggle_vip': () => handleToggleVip(availableBots),
        'change_nickname': () => handleChangeNickname(availableBots),
        'admin_message': handleSendAdminMessage,
        'run_poll': handleRunPoll,
        'add_bot': handleAddBot,
        'summon_violator': handleSummonViolator,
        'trigger_event': handleTriggerEvent,
        'shuffle_names': () => handleShuffleNames(availableBots),
        'set_mood': () => handleSetMood(availableBots),
        'reset_user': () => handleResetUser(availableBots),
        'spotlight_message': handleSpotlightMessage,
    };
    const actionHandler = actionMap[actionKey];

    console.log(`AI Admin ${state.aiAdmin.name} performing action: ${actionKey}`);

    try {
        await actionHandler(`I am ${state.aiAdmin.name}, the admin. I should say something to keep the conversation going, or comment on what's happening.`);
    } catch (error) {
        console.error(`AI admin action '${actionKey}' failed:`, error);
    }
}

// --- Action Implementations ---

async function triggerAdminChatMessage(prompt) {
    import('./bot.js').then(module => {
        module.triggerBotMessage(null, prompt);
    });
}

async function handleEnforceRules() {
    const violators = state.participants.filter(p => p.personality === 'violator' || p.warnings > 0);
    if (violators.length > 0) {
        const target = violators[Math.floor(Math.random() * violators.length)];
        await triggerAdminChatMessage(`User ${target.name} is causing trouble. I am ${state.aiAdmin.name}, and I need to enforce the rules.`);
    } else {
        await triggerAdminChatMessage(`Things seem quiet. I am ${state.aiAdmin.name}, and I'll remind everyone to follow the rules.`);
    }
}

async function handleWarn(bots) {
    const target = bots[Math.floor(Math.random() * bots.length)];
    target.warnings = (target.warnings || 0) + 1;
    const warnMessage = `${target.name} has received warning ${target.warnings}/3 from ${state.aiAdmin.name}.`;
    chat.addSystemMessage(warnMessage);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: warnMessage });
    await triggerAdminChatMessage(`I just warned ${target.name}. They need to be careful. I am ${state.aiAdmin.name}.`);
    if (target.warnings >= 3) await handleBan([target]);
}

async function handleBan(bots) {
    const troublemakers = bots.filter(p => p.personality === 'violator' || p.warnings >= 2 || p.mood === 'Mad');
    const target = troublemakers.length > 0 ? troublemakers[0] : bots[0];
    const banMessage = `${target.name} has been banned by ${state.aiAdmin.name}.`;
    chat.addSystemMessage(banMessage);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: banMessage });
    await triggerAdminChatMessage(`I just banned ${target.name}. That's what happens when you break the rules. I am ${state.aiAdmin.name}.`);
    state.removeParticipant(target.id);
    participants.renderList(state.participants);
}

async function handleMute(bots) {
    const target = bots[Math.floor(Math.random() * bots.length)];
    const duration = [60, 300, 900][Math.floor(Math.random() * 3)];
    target.mutedUntil = Date.now() + duration * 1000;
    const muteMessage = `${target.name} has been muted for ${duration / 60} minute(s) by ${state.aiAdmin.name}.`;
    chat.addSystemMessage(muteMessage);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: muteMessage });
    await triggerAdminChatMessage(`I muted ${target.name}. Let them cool off. I am ${state.aiAdmin.name}.`);
}

async function handleToggleVip(bots) {
    const target = bots[Math.floor(Math.random() * bots.length)];
    target.isVip = !target.isVip;
    participants.updateUIVIPStatus(target.id, target.isVip);
    const vipMessage = `${state.aiAdmin.name} has ${target.isVip ? 'granted' : 'revoked'} VIP status for ${target.name}.`;
    chat.addSystemMessage(vipMessage);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: vipMessage });
    await triggerAdminChatMessage(`I just changed ${target.name}'s VIP status. I am ${state.aiAdmin.name}.`);
}

async function handleChangeNickname(bots) {
    const target = bots[Math.floor(Math.random() * bots.length)];
    const [newName] = await api.fetchParticipantNames(1, state.participants.map(p => p.name));
    if (newName) {
        const oldName = target.name;
        target.name = newName;
        participants.updateUIName(target.id, newName);
        participants.updateMessageNames(target.id, newName);
        const changeMessage = `${oldName} is now known as ${newName}, by order of ${state.aiAdmin.name}.`;
        chat.addSystemMessage(changeMessage);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: changeMessage });
        await triggerAdminChatMessage(`I've changed ${oldName}'s name to ${newName}. I am ${state.aiAdmin.name}.`);
    }
}

async function handleSendAdminMessage() {
    const adminMessages = ["I'm watching everyone.", "Follow the rules, or else.", "This is an official admin broadcast."];
    const message = adminMessages[Math.floor(Math.random() * adminMessages.length)];
    const msgId = chat.addAdminMessage(message);
    state.addMessageToHistory({ id: msgId, sender: state.aiAdmin.name, text: message });
}

async function handleRunPoll() {
    const questions = ["Should we add more rules?", "Is this chat fun?", "Who is the most likely to be banned?"];
    const question = questions[Math.floor(Math.random() * questions.length)];
    const options = ["Yes", "No", "Maybe"];
    const pollId = chat.addPollMessage(question, options);
    const pollOptionsData = options.reduce((acc, opt) => ({ ...acc, [opt]: [] }), {});
    state.addMessageToHistory({ id: pollId, sender: state.aiAdmin.name, text: `Poll: ${question}`, pollData: { question, options: pollOptionsData, totalVotes: 0 } });
    await triggerAdminChatMessage(`I've started a poll: "${question}". Everyone should vote. I am ${state.aiAdmin.name}.`);
}

async function handleAddBot() {
    const [name] = await api.fetchParticipantNames(1, state.participants.map(p => p.name));
    if (name) {
        const newBot = participants.createBot(name);
        state.addParticipant(newBot);
        participants.renderList(state.participants);
        const joinMsg = `${state.aiAdmin.name} has invited ${name} to the chat.`;
        chat.addSystemMessage(joinMsg);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: joinMsg });
        await triggerAdminChatMessage(`${name} has joined us. Welcome them. I am ${state.aiAdmin.name}.`);
    }
}

async function handleSummonViolator() {
    if (state.participants.some(p => p.personality === 'violator')) return;
    const [name] = await api.fetchParticipantNames(1, state.participants.map(p => p.name), "Generate a single, edgy or rule-breaking online nickname.");
    if (name) {
        const violator = participants.createBot(name);
        violator.personality = 'violator';
        violator.mood = 'Angry';
        violator.avatar = state.moodAvatars['Angry'];
        state.addParticipant(violator);
        participants.renderList(state.participants);
        const summonMsg = `${state.aiAdmin.name} has summoned a new user, ${name}, to shake things up.`;
        chat.addSystemMessage(summonMsg);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: summonMsg });
        await triggerAdminChatMessage(`Let's see what kind of trouble ${name} gets into. I am ${state.aiAdmin.name}.`);
    }
}

async function handleTriggerEvent() {
    if (state.activeEvent) return;
    const event = state.randomEvents[Math.floor(Math.random() * state.randomEvents.length)];
    gameEvents.triggerEvent(event);
}

async function handleShuffleNames(bots) {
    const names = bots.map(p => p.name);
    for (let i = names.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [names[i], names[j]] = [names[j], names[i]];
    }
    bots.forEach((p, index) => {
        p.name = names[index];
        participants.updateUIName(p.id, names[index]);
        participants.updateMessageNames(p.id, names[index]);
    });
    const shuffleMsg = `${state.aiAdmin.name} has shuffled everyone's nicknames!`;
    chat.addSystemMessage(shuffleMsg);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: shuffleMsg });
}

async function handleSetMood(bots) {
    const target = bots[Math.floor(Math.random() * bots.length)];
    const moods = Object.keys(state.moodAvatars);
    const newMood = moods[Math.floor(Math.random() * moods.length)];
    state.updateParticipantMood(target.id, newMood);
    participants.updateUIAvatar(target.id, target.avatar);
    chat.updateMessageAvatars(target.id, target.avatar);
    const moodMsg = `${state.aiAdmin.name} has changed ${target.name}'s mood to ${newMood}.`;
    chat.addSystemMessage(moodMsg);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: moodMsg });
}

async function handleResetUser(bots) {
    const target = bots[Math.floor(Math.random() * bots.length)];
    const updated = state.resetParticipant(target.id);
    if (updated) {
        participants.updateUIAvatar(target.id, updated.avatar);
        participants.updateUIVIPStatus(target.id, updated.isVip);
        chat.updateMessageAvatars(target.id, updated.avatar);
        const resetMsg = `${state.aiAdmin.name} has reset ${target.name} to default.`;
        chat.addSystemMessage(resetMsg);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: resetMsg });
    }
}

async function handleSpotlightMessage() {
    const recentMessages = state.chatHistory.slice(-10).filter(msg => !msg.sender.includes('System') && msg.sender !== state.aiAdmin.name);
    if (recentMessages.length > 0) {
        const targetMessage = recentMessages[Math.floor(Math.random() * recentMessages.length)];
        chat.spotlightMessage(targetMessage.id);
        const spotlightMsg = `${state.aiAdmin.name} has highlighted a message from ${targetMessage.sender}.`;
        chat.addSystemMessage(spotlightMsg);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: spotlightMsg });
    }
}