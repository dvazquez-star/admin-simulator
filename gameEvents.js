import * as state from './state.js';
import * as ui from './ui.js';
import * as chat from './chat.js';
import * as participants from './participants.js';
import * as bot from './bot.js';
import * as api from './api.js';
import { pauseForBoss, resumeAfterBoss } from './audio.js';

let bossIntervals = []; // To store intervals related to the boss fight
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Helper to play a sound from a URL.
 * @param {string} url - The URL of the sound file.
 */
async function playSound(url) {
    if (audioContext.state === 'suspended') {
        await audioContext.resume();
    }
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = audioContext.createGain();
        if (url.includes('BossFight.mp3')) {
            gainNode.gain.value = 0.25; // Set boss music volume to 25%
        } else {
            gainNode.gain.value = 1.0; // Keep other sounds at full volume
        }

        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.start(0);

        if (url.includes('BossFight.mp3')) {
            source.loop = true;
            state.setBossAudio(source);
        }
    } catch (e) {
        console.error("Error playing sound:", e);
    }
}

// This object maps event IDs to their handler functions.
const eventHandlers = {};

/**
 * Main function to trigger a random event.
 * @param {object} event - The event object from state.randomEvents.
 */
export function triggerEvent(event) {
    // Announce the event
    const systemMessageText = `📢 EVENT: ${event.text}`;
    chat.addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

    // Find and execute the handler for the event
    const handler = eventHandlers[event.id];
    if (handler) {
        handler(event);
    } else {
        console.warn(`No handler found for event ID: ${event.id}`);
        // Default behavior: just have bots react to the text
        const adminActionText = `A random event just happened: "${event.text}". I should react to this.`;
        bot.triggerBotMessage(null, adminActionText);
    }
}

/**
 * Clears any active event, reverting its effects.
 */
export function clearActiveEvent() {
    const event = state.activeEvent;
    if (!event) return;

    // Stop any scheduled timeouts
    if (event.timeoutId) {
        clearTimeout(event.timeoutId);
    }

    // Revert specific event effects
    if (event.id === 'gravity') {
        ui.toggleGravityEffect(false);
    }
    if (event.id === 'hacker_attack') {
        endHackerAttack(false); // End the fight without a win
    }

    state.setActiveEvent(null);
    chat.addSystemMessage(`The event "${event.text}" has ended.`);
}

export function endHackerAttack(isWin) {
    bossIntervals.forEach(clearInterval);
    bossIntervals = [];

    ui.hideBossUI();
    ui.toggleGlitchEffect(false);
    ui.restoreDefaultAdminPanel();

    if(state.participantToSave && state.participantToSave.timerId) {
        clearTimeout(state.participantToSave.timerId);
        const target = state.getParticipantById(state.participantToSave.id);
        if (target) participants.updateHackedStatus(target.id, false, false);
    }
    
    state.setBossFightState(false);
    
    // Stop boss music
    if (state.bossAudio) {
        state.bossAudio.stop();
        state.setBossAudio(null);
    }
    resumeAfterBoss();

    const hacker = state.getParticipantById(state.hackerParticipantId);
    if (hacker) {
        // If the hacker had an original ID, it was a transformed participant
        if (hacker.originalId) {
            const originalParticipant = state.getParticipantById(hacker.originalId);
            if (originalParticipant) {
                state.resetParticipant(originalParticipant.id);
                participants.updateUIName(originalParticipant.id, originalParticipant.name);
                participants.updateUIAvatar(originalParticipant.id, originalParticipant.avatar);
                chat.updateMessageNames(originalParticipant.id, originalParticipant.name);
                chat.updateMessageAvatars(originalParticipant.id, originalParticipant.avatar);
            }
        }
        state.removeParticipant(hacker.id);
        participants.renderList(state.participants);
    }

    const endMessage = isWin 
        ? "SYSTEM INTEGRITY RESTORED. Hacker has been expelled."
        : "SYSTEM COMPROMISED. Hacker has escaped.";
    chat.addSystemMessage(endMessage);

    state.setActiveEvent(null);
    bot.startBotChatter(); // Restart normal chatter
}

// --- Event Implementations ---

function implementReboot(event) {
    const timeoutId = setTimeout(() => {
        chat.addSystemMessage('--- SERVER REBOOTING ---');
        // Simulate reboot by re-initializing participants and clearing chat
        setTimeout(() => {
            ui.elements.messagesContainer.innerHTML = '';
            state.chatHistory.length = 0;
            participants.initializeParticipants();
            chat.addSystemMessage('--- SERVER REBOOT COMPLETE ---');
            state.setActiveEvent(null);
        }, 2000);
    }, 30000); // 30 seconds

    state.setActiveEvent({ ...event, timeoutId });
    bot.triggerBotMessage(null, `The server is rebooting in 30 seconds! I should say something quick!`);
}

async function implementCelebrity(event) {
    state.setActiveEvent({ ...event }); // Mark event as active so another can't start
    try {
        const existingNames = state.participants.map(p => p.name);
        const [celebName] = await api.fetchParticipantNames(1, existingNames, "Generate a single, famous-sounding, and unique celebrity name.");
        
        const newBot = {
            id: `participant-${Date.now()}-${Math.random()}`,
            name: celebName,
            avatar: '/smart.png',
            mood: 'Neutral',
            isPlayer: false,
            warnings: 0,
            mutedUntil: null,
            isVip: true, // Celebs are VIPs
        };

        state.addParticipant(newBot);
        participants.renderList(state.participants);

        const systemMessageText = `⭐ ${celebName} has entered the chat! ⭐`;
        chat.addSystemMessage(systemMessageText);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
        
        bot.triggerBotMessage(null, `OMG! ${celebName} is here! I need to react!`);
    } catch (e) {
        console.error("Failed to add celebrity:", e);
    } finally {
        state.setActiveEvent(null); // This event is instant, so clear it
    }
}

function implementDurationEffect(event) {
    const timeoutId = setTimeout(() => {
        state.setActiveEvent(null);
        chat.addSystemMessage(`The event "${event.text}" has ended.`);
    }, event.duration);

    state.setActiveEvent({ ...event, timeoutId });
    bot.triggerBotMessage(null, `This event just started: "${event.text}". I need to react to it.`);
}

function implementTopic(event) {
    const topic = 'Pineapple on Pizza';
    state.setActiveEvent({ 
        ...event,
        data: { topic: topic, messagesLeft: 5 },
    });
    bot.triggerBotMessage(null, `The new mandatory topic is "${topic}". I have to talk about it.`);
}

function implementGravity(event) {
    state.setActiveEvent({ ...event });
    ui.toggleGravityEffect(true);
    // This event is manually cleared by the admin
    bot.triggerBotMessage(null, `Whoa, gravity is reversed! This is weird!`);
}

function implementFreeVip(event) {
    const nonVipBots = state.getNonPlayerParticipants().filter(p => !p.isVip);

    if (nonVipBots.length > 0) {
        const luckyBot = nonVipBots[Math.floor(Math.random() * nonVipBots.length)];
        luckyBot.isVip = true;
        
        participants.updateUIVIPStatus(luckyBot.id, true);
        
        const systemMessageText = `${luckyBot.name} was randomly granted VIP status!`;
        chat.addSystemMessage(systemMessageText);
        state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

        bot.triggerBotMessage(null, `The admin just gave ${luckyBot.name} free VIP. I have feelings about this. My name is not ${luckyBot.name}.`);
        setTimeout(() => bot.triggerBotMessage(null, `I can't believe I just got VIP status for free! My name is ${luckyBot.name}.`), 1500);

    } else {
        chat.addSystemMessage("A mysterious benefactor tried to give away VIP status, but everyone is already a VIP!");
    }
}

function implementHackerAttack(event) {
    if (state.bossFightActive) return;

    // Stop normal bot chatter
    if (state.botChatInterval) clearInterval(state.botChatInterval);

    // Pause background music for the boss fight
    pauseForBoss();

    state.setBossFightState(true, event.participant.id);
    state.addParticipant(event.participant);
    participants.renderList(state.participants);
    state.setActiveEvent({ ...event });

    // UI Setup
    ui.showBossUI(event.participant.name);
    ui.toggleGlitchEffect(true);
    ui.setupBossAdminPanel();
    playSound('/BossFight.mp3');

    // Hacker Action Loop (warns/mutes users)
    const hackerActionInterval = setInterval(() => {
        if (!state.bossFightActive) {
            clearInterval(hackerActionInterval);
            return;
        }
        
        // Don't act if a user is already being targeted
        if (state.participantToSave) return;

        const targets = state.getNonPlayerParticipants().filter(p => !p.isHacked && p.id !== state.hackerParticipantId);
        if (targets.length === 0) return;

        const target = targets[Math.floor(Math.random() * targets.length)];
        const actionType = Math.random() < 0.5 ? 'warn' : 'mute';

        const systemMessage = `HACKER is targeting ${target.name} with a ${actionType.toUpperCase()}! You have 10 seconds to save them!`;
        chat.addSystemMessage(systemMessage);
        participants.updateHackedStatus(target.id, false, true); // Mark as target
        ui.setAdminButtonState();

        const timerId = setTimeout(() => {
            if (!state.bossFightActive) return;

            target.isHacked = true;
            chat.addSystemMessage(`${target.name} has been HACKED!`);
            participants.updateHackedStatus(target.id, true, false);
            chat.updateMessageAvatars(target.id, '/Hacked.png'); // Update past messages too

            // Heal hacker
            const newHp = state.hackerHP + 20;
            state.setHackerHP(newHp);
            ui.updateBossHP(newHp);

            state.setParticipantToSave(null);
            ui.setAdminButtonState();
        }, 10000);

        state.setParticipantToSave({ id: target.id, type: actionType, timerId });

        // MODERATOR INTERVENTION LOGIC
        const activeMods = state.getNonPlayerParticipants().filter(p => p.isMod && !p.isHacked && p.id !== state.hackerParticipantId && p.id !== target.id);

        if (activeMods.length > 0) {
            for (const mod of activeMods) {
                if (Math.random() < 0.4) { // 40% chance for a mod to succeed
                    // Mod saves the target
                    setTimeout(() => {
                        // Check if the user wasn't already saved by the player
                        const currentTarget = state.participantToSave;
                        if (currentTarget && currentTarget.id === target.id) {
                            clearTimeout(timerId); // Clear the hack timer
                            chat.addSystemMessage(`🛡️ MODERATOR ${mod.name} has protected ${target.name} from the HACKER!`);
                            participants.updateHackedStatus(target.id, false, false);
                            state.setParticipantToSave(null);
                            ui.setAdminButtonState();
                            
                            // Deal small damage to the hacker for being blocked
                            const newHp = state.hackerHP - 5;
                            state.setHackerHP(newHp);
                            ui.updateBossHP(newHp);
                            if (newHp <= 0) {
                                endHackerAttack(true); // Win condition
                            }
                        }
                    }, Math.random() * 3000 + 1000); // Mod reacts in 1-4 seconds
                    
                    break; // Only one mod needs to save them per event
                }
            }
        }
    }, Math.random() * 2000 + 3000); // 3-5 seconds
    bossIntervals.push(hackerActionInterval);

    // All participants shuffle loop
    const allParticipantsShuffleInterval = setInterval(() => {
        if (!state.bossFightActive) {
            clearInterval(allParticipantsShuffleInterval);
            return;
        }
        const list = ui.elements.participantsList;
        const items = Array.from(list.children);

        // Fisher-Yates shuffle
        for (let i = items.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [items[i], items[j]] = [items[j], items[i]];
        }

        // Re-append in shuffled order
        items.forEach(item => list.appendChild(item));
    }, 1000); // Shuffle every 1 second
    bossIntervals.push(allParticipantsShuffleInterval);

    // Bot panic loop
    const botPanicInterval = setInterval(() => {
        if (!state.bossFightActive) {
            clearInterval(botPanicInterval);
            return;
        }
        bot.triggerBotMessage(null, "A HACKER is attacking the chat! Panic!");
    }, 4000);
    bossIntervals.push(botPanicInterval);
}

function implementStoryHackerBetrayal(event) {
    if (state.bossFightActive) return;

    const traitor = event.participant;
    const originalTraitorId = traitor.id;

    // Phase 1: The Glitch (pre-dialogue)
    const glitchMessage = "sYs..SySTem...Ov..override.exe..#$#@!";
    const messageId = chat.addMessage(glitchMessage, traitor);
    state.addMessageToHistory({ id: messageId, sender: traitor.name, text: glitchMessage });
    bot.triggerBotMessage(null, `What was that weird message from ${traitor.name}? Are they ok?`);

    // Phase 2: The Transformation
    setTimeout(() => {
        // Create a new hacker object from the traitor's data
        const hacker = {
            ...traitor, // Copy properties like personality, mood, etc.
            id: 'hacker-boss',
            originalId: originalTraitorId, // Keep track of who they were
            name: 'HACKER',
            avatar: '/Hacker.png',
            personality: 'violator' // Ensure personality is violator
        };
        
        // Remove the original traitor from the participants list
        state.removeParticipant(originalTraitorId);
        
        // Add the new hacker persona
        state.addParticipant(hacker);

        // Re-render the participant list to reflect the change
        participants.renderList(state.participants);
        
        // Start the actual fight logic with the new hacker object
        implementHackerAttack({
            ...event,
            text: `${traitor.name} was a traitor! They have revealed themselves as the HACKER!`,
            participant: hacker
        });

    }, 5000); // 5 second delay for dramatic effect
}

// Register all handlers
eventHandlers['reboot'] = implementReboot;
eventHandlers['celebrity'] = implementCelebrity;
eventHandlers['allcaps'] = implementDurationEffect;
eventHandlers['lag'] = implementDurationEffect;
eventHandlers['topic'] = implementTopic;
eventHandlers['gravity'] = implementGravity;
eventHandlers['free_vip'] = implementFreeVip;
eventHandlers['hacker_attack'] = implementHackerAttack;
eventHandlers['story_hacker_betrayal'] = implementStoryHackerBetrayal;

// --- Event Listeners and Updaters ---

// This listener handles events that need to count down, like the topic event.
function handleMessageCounter(e) {
    const event = state.activeEvent;
    if (event?.id === 'topic' && event.data.messagesLeft > 0) {
        event.data.messagesLeft--;
        if (event.data.messagesLeft <= 0) {
            clearActiveEvent();
        }
    }
}

// Add a button to the admin panel to clear toggleable events
function addClearEventButton() {
    const oldButton = document.getElementById('clear-event-button');
    if (oldButton) oldButton.remove();

    if (state.activeEvent && (state.activeEvent.id === 'gravity')) {
        const button = document.createElement('button');
        button.id = 'clear-event-button';
        button.className = 'admin-button';
        button.textContent = 'Revert Gravity';
        button.style.borderColor = '#ffc400';
        button.style.color = '#ffc400';
        button.onclick = () => {
            clearActiveEvent();
            button.remove();
        };
        
        const referenceNode = ui.elements.triggerEventButton;
        referenceNode.parentNode.insertBefore(button, referenceNode.nextSibling);
    }
}

// Periodically check the state of events to update UI
function checkEventState() {
    addClearEventButton();
}

/**
 * Initializes all logic related to game events.
 */
export function initializeGameEventListeners() {
    // Check message submits to count down topic messages
    ui.elements.messageForm.addEventListener('submit', handleMessageCounter);
    
    // Periodically check if UI elements need to be added/removed for events
    setInterval(checkEventState, 5000);
}