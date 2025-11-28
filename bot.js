// This file contains the logic for bot behavior.
import * as api from './api.js';
import * as state from './state.js';
import * as chat from './chat.js';
import * as participants from './participants.js';
import * as ui from './ui.js';

// Anti-spam cooldowns per bot to avoid immediate double posts
const botCooldowns = new Map(); // id -> timestamp(ms)
function isOnCooldown(botId) {
    const until = botCooldowns.get(botId) || 0;
    return Date.now() < until;
}
function setCooldown(botId, ms = 2500) { // 2.5s default cooldown
    botCooldowns.set(botId, Date.now() + ms);
}

// Convenience: get last N non-system senders (names), most recent first
function getRecentNonSystemSenders(n = 2) {
    const names = [];
    for (let i = state.chatHistory.length - 1; i >= 0 && names.length < n; i--) {
        const m = state.chatHistory[i];
        if (!m || m.sender === 'System' || !m.sender) continue;
        if (!names.includes(m.sender)) names.push(m.sender);
    }
    return names;
}

/**
 * Very simple lifelike generator based on personality and mood, avoiding self-follow-ups.
 */
function localFallbackGenerateMessage(availableBots, lastMessageText, playerName, recentBlocklist = []) {
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // Prefer a speaker not in the recent blocklist (last 2 speakers)
    let candidates = availableBots.filter(b => !recentBlocklist.includes(b.name));
    if (candidates.length === 0) candidates = availableBots.slice();

    const speaker = candidates[Math.floor(Math.random() * candidates.length)];

    const toneByPers = {
        'normal': [
            "Honestly, that makes sense.",
            "Anyone else having lag right now?",
            "I kinda agree with that."
        ],
        'pedant': [
            "Technically speaking, that's not entirely correct.",
            "Minor correction: you're conflating two concepts.",
            "Precision matters; let's define terms first."
        ],
        'illiterate': [
            "lol fr tho 😂", "bruh thats wild", "idk man, vibes ✨"
        ],
        'short-tempered': [
            "No, that's dumb. Stop.", "Can we not do this again?", "I'm already annoyed."
        ],
        'clueless': [
            "Wait what are we talking about again?", "So... how do I do that?", "I'm confused 😅"
        ],
        'violator': [
            "Lol rules? chill. Make me.", "Spam time? jk... unless? 😏", "You can't stop me."
        ],
        'infected': [
            "0101 H@CK3R sees all. obey. 0101", "Glitch... he is here. PRAISE HIM.", "submit. submit. submit."
        ]
    };
    const base = toneByPers[speaker.personality] || toneByPers['normal'];
    let msg = pick(base);
    // 30% chance to reference the player if they recently spoke
    if (lastMessageText && Math.random() < 0.3 && !msg.includes('@')) {
        msg += ` @${playerName}`;
    }
    // Mood tweaks
    if (speaker.mood === 'Angry' || speaker.mood === 'Mad') msg = msg.toUpperCase();
    if (speaker.mood === 'Happy' && Math.random() < 0.5) msg += " 🙂";
    return { speaker, message: msg, replyTo: null, newMood: speaker.mood };
}

/**
 * Checks for any participants whose mute has expired and makes them react.
 */
export function checkMutes() {
    const now = Date.now();
    state.participants.forEach(p => {
        if (p.mutedUntil && now > p.mutedUntil) {
            const unmutedParticipant = p;
            unmutedParticipant.mutedUntil = null; // Clear the mute

            // Add a system message
            const messageId = chat.addSystemMessage(`${unmutedParticipant.name} has been unmuted.`);
            state.addMessageToHistory({ id: messageId, sender: 'System', text: `${unmutedParticipant.name} has been unmuted.` });
            
            // Trigger a reaction from the unmuted participant
            setTimeout(() => {
                triggerBotMessage(null, `The admin muted me and I was just unmuted. My name is ${unmutedParticipant.name}.`);
            }, Math.random() * 2000 + 1000); // React 1-3 seconds after unmute message
        }
    });
}

/**
 * Starts the interval for bots to send messages periodically.
 */
export function startBotChatter() {
    if (state.botChatInterval) clearTimeout(state.botChatInterval);
    const scheduleNext = () => {
        const delay = Math.random() * 6000 + 4000; // 4–10s (increased from 3s-7s)
        const id = setTimeout(async () => {
            // Occasionally create a burst of 2 messages
            const burst = Math.random() < 0.3; // Increased chance for burst
            await triggerBotMessage();
            if (burst) {
                setTimeout(() => triggerBotMessage(), Math.random() * 1500 + 600);
            }
            scheduleNext();
        }, delay);
        state.setBotChatInterval(id);
    };
    scheduleNext();
}

/**
 * Triggers a bot to generate and send a message.
 * @param {string|null} [lastMessageText=null] - The text of the last message, used for context.
 * @param {string|null} [adminAction=null] - A description of an admin action that just occurred.
 */
export async function triggerBotMessage(lastMessageText = null, adminAction = null) {
    if (state.isBotTyping && !adminAction) return; // Admin actions should interrupt
    
    // Bots have a higher chance to talk, especially if forced by admin action
    if (!adminAction && Math.random() > 0.85) { // Changed from 0.7 to 0.85 (higher chance to talk)
        return;
    }
    state.setIsBotTyping(true);

    try {
        const availableBots = state.getNonPlayerParticipants().filter(p => p.isBot && !p.mutedUntil && !p.isHacked && !isOnCooldown(p.id));
        if (availableBots.length === 0) {
            state.setIsBotTyping(false);
            return;
        }

        // Gather recent speakers to avoid self-talk and ping-pongs
        const recentBlocklist = getRecentNonSystemSenders(2);
        const lastHistory = state.chatHistory[state.chatHistory.length - 1];
        const lastSenderName = lastHistory?.sender || null;

        // Find the most recent active poll that bots can still vote in
        const activePollMessage = [...state.chatHistory].reverse().find(msg => {
            if (!msg.pollData) return false;
            const voters = Object.values(msg.pollData.options).flat();
            // A poll is active if there are bots who haven't voted yet.
            return availableBots.some(bot => !voters.includes(bot.id));
        });

        let activePollInfo = null;
        if(activePollMessage){
            const pollOptions = Object.keys(activePollMessage.pollData.options);
            activePollInfo = {
                question: activePollMessage.pollData.question,
                options: pollOptions
            };
        }

        // Pass active event data to the AI
        let eventInfo = null;
        if (state.activeEvent) {
            switch (state.activeEvent.id) {
                case 'topic':
                    eventInfo = `The mandatory topic is now '${state.activeEvent.data.topic}'. You must talk about this.`;
                    break;
                case 'allcaps':
                    eventInfo = `ALL CAPS MODE is active. All your messages must be in uppercase.`;
                    break;
                case 'lag':
                    eventInfo = `The chat is lagging badly. You should complain about the lag.`;
                    break;
                case 'gravity':
                    eventInfo = `Gravity is reversed. You should be confused or amused by this.`;
                    break;
                case 'hacker_attack':
                    eventInfo = `A HACKER is attacking the chat! Panic, confusion, fear are natural. React to that.`;
                    break;
            }
        }

        const participantNames = availableBots.map(p => p.name);

        let mentionedBotName = null;
        const lastMessage = lastMessageText || (state.chatHistory.length > 0 ? state.chatHistory[state.chatHistory.length - 1].text : "");

        if (lastMessage) {
            const mentionMatch = lastMessage.match(/@(\S+)/);
            if (mentionMatch) {
                const mentionedName = mentionMatch[1].replace(/[.,!?]$/, ''); // Clean trailing punctuation
                if (participantNames.includes(mentionedName)) {
                    mentionedBotName = mentionedName;
                }
            }
        }

        // Determine player name based on game mode
        const playerName = state.getPlayer()?.name || (state.gameMode === 'player' ? 'You' : 'Admin');
        const adminName = state.gameMode === 'player' && state.aiAdmin ? state.aiAdmin.name : (state.gameMode === 'hacker' ? 'The Hacker' : 'Admin');

        let result = await api.fetchBotMessage(
            state.chatHistory, 
            availableBots, 
            state.currentLang, 
            mentionedBotName, 
            lastMessage, 
            playerName,
            state.rules,
            adminAction,
            activePollInfo,
            eventInfo,
            adminName,
            state.location
        );

        // Validate the response
        const isValidSpeaker = result && result.speaker && participantNames.includes(result.speaker);
        const hasMessage = result && typeof result.message === 'string' && result.message.trim().length > 0;

        if (!isValidSpeaker || !hasMessage) {
            // Retry once with a stricter nudge
            try {
                const strictNudge = `STRICT REMINDER: "speaker" MUST be one of [${participantNames.join(', ')}], "message" must be non-empty, and avoid replying to your own last message or repeating text. Pick a different speaker than "${lastSenderName}" unless directly mentioned or addressed.`;
                result = await api.fetchBotMessage(
                    state.chatHistory,
                    availableBots,
                    state.currentLang,
                    mentionedBotName,
                    (lastMessage || '') + `\n${strictNudge}`,
                    playerName,
                    state.rules,
                    adminAction,
                    activePollInfo,
                    eventInfo,
                    adminName,
                    state.location
                );
            } catch {}
        }

        // If still invalid, use local fallback generator to avoid silence
        if (!result || !participantNames.includes(result.speaker) || !result.message || !result.message.trim()) {
            const fb = localFallbackGenerateMessage(availableBots, lastMessageText, state.getPlayer()?.name || 'Admin', recentBlocklist);
            const typingDelay = Math.min(fb.message.length * (Math.random() * 40 + 40), 3000) + 400;
            chat.showTypingIndicator(true, fb.speaker.name);
            setTimeout(() => {
                chat.showTypingIndicator(false);
                // De-dup: skip if identical to speaker's last message
                const lastFromSpeaker = [...state.chatHistory].reverse().find(m => m.sender === fb.speaker.name);
                if (lastFromSpeaker && lastFromSpeaker.text.trim() === fb.message.trim()) {
                    state.setIsBotTyping(false);
                    return;
                }
                const messageId = chat.addMessage(fb.message, fb.speaker, { isBot: true, replyToId: null });
                state.addMessageToHistory({ id: messageId, sender: fb.speaker.name, text: fb.message, replyToId: null });
                setCooldown(fb.speaker.id, 2000); // Reduced cooldown here too
                state.setIsBotTyping(false);
            }, typingDelay);
            return;
        }

        // Post-processing to avoid self-follow-ups and duplicates
        let speakerName = result.speaker;
        let messageText = result.message.trim();
        const replyToText = result.replyTo;
        const newMood = result.newMood;
        const vote = result.vote;
        const imagePrompt = result.imagePrompt; // REMOVED: AI Image generation

        // Strong anti-self-talk: if AI picked a recently-talking speaker (last 2), swap unless mention/adminAction forces it
        if (!mentionedBotName && !adminAction && recentBlocklist.includes(speakerName)) {
            const alt = availableBots.find(b => !recentBlocklist.includes(b.name));
            if (alt) speakerName = alt.name;
        }

        let speaker = state.getParticipantByName(speakerName);
        if (!speaker) {
            console.warn(`AI tried to speak as non-existent participant: "${speakerName}". Skipping this turn.`);
            state.setIsBotTyping(false);
            return;
        }

        // De-dup safeguard: Avoid exact duplicate of this speaker's latest message
        const recentFromSpeaker = [...state.chatHistory].reverse().find(m => m.sender === speaker.name);
        if (recentFromSpeaker && recentFromSpeaker.text.trim() === messageText) {
            if (messageText.length < 120) {
                messageText += ' (btw)';
            } else {
                state.setIsBotTyping(false);
                return; // drop if too similar and too long
            }
        }

        // Handle voting logic
        if (vote && activePollMessage && activePollMessage.pollData.options[vote]) {
            const poll = activePollMessage.pollData;
            const alreadyVoted = Object.values(poll.options).flat().includes(speaker.id);
            if (!alreadyVoted) {
                Object.keys(poll.options).forEach(opt => {
                    poll.options[opt] = poll.options[opt].filter(voterId => voterId !== speaker.id);
                });
                poll.options[vote].push(speaker.id);
                poll.totalVotes = (poll.totalVotes || 0) + 1;
                chat.updatePollDisplay(activePollMessage.id, poll);
            }
        }

        // First, update the bot's mood and avatar based on the AI's response.
        if (newMood) {
            const updatedParticipant = state.updateParticipantMood(speaker.id, newMood);
            if (updatedParticipant) {
                speaker = updatedParticipant;
                participants.updateUIAvatar(speaker.id, speaker.avatar);
                chat.updateMessageAvatars(speaker.id, speaker.avatar);
            }
        }

        // Resolve reply target: prefer a different sender than the speaker
        let replyToId = null;
        if (replyToText) {
            const candidates = [...state.chatHistory]
                .filter(msg => msg.text === replyToText && msg.sender !== speaker.name);
            const pick = candidates.length ? candidates[candidates.length - 1] : null;
            replyToId = pick ? pick.id : null;
        }

        // Prevent replying to own last message unless Admin/Player or mention/adminAction cases
        if (replyToId) {
            const original = state.getMessageById(replyToId);
            if (original && original.sender === speaker.name && !adminAction && !mentionedBotName) {
                replyToId = null;
            }
        }
            
        const typingDelay = Math.min(messageText.length * (Math.random() * 50 + 50), 4000) + 500;
        chat.showTypingIndicator(true, speaker.name);

        setTimeout(async () => {
            chat.showTypingIndicator(false);
            
            // AI Image generation logic: if the model returned an imagePrompt, try to generate an image.
            let imageUrl = null;
            const imagePrompt = result.imagePrompt; // re-enable reading image prompt from AI
            // Only generate images if chat images are enabled in the UI
            if (imagePrompt && ui.elements.messagesContainer && !ui.elements.messagesContainer.classList.contains('images-hidden')) {
                try {
                    const imageResult = await websim.imageGen({ prompt: imagePrompt });
                    if (imageResult && imageResult.url) imageUrl = imageResult.url;
                } catch (e) {
                    console.error("Image generation failed:", e);
                }
            }

            const messageId = chat.addMessage(messageText, speaker, { isBot: true, replyToId, imageUrl });
            state.addMessageToHistory({ id: messageId, sender: speaker.name, text: messageText, replyToId, imageUrl });
            setCooldown(speaker.id, 2000); // Reduced cooldown from 2.5s to 2s
            state.setIsBotTyping(false);
        }, typingDelay);

    } catch (error) {
        console.error("Bot chat generation failed:", error);
        try {
            const availableBots = state.getNonPlayerParticipants().filter(p => p.isBot && !p.mutedUntil && !p.isHacked && !isOnCooldown(p.id));
            if (availableBots.length) {
                const recentBlocklist = getRecentNonSystemSenders(2);
                const fb = localFallbackGenerateMessage(availableBots, lastMessageText, state.getPlayer()?.name || 'Admin', recentBlocklist);
                const typingDelay = Math.min(fb.message.length * (Math.random() * 40 + 40), 3000) + 400;
                chat.showTypingIndicator(true, fb.speaker.name);
                setTimeout(() => {
                    chat.showTypingIndicator(false);
                    const lastFromSpeaker = [...state.chatHistory].reverse().find(m => m.sender === fb.speaker.name);
                    if (lastFromSpeaker && lastFromSpeaker.text.trim() === fb.message.trim()) {
                        state.setIsBotTyping(false);
                        return;
                    }
                    const messageId = chat.addMessage(fb.message, fb.speaker, { isBot: true, replyToId: null });
                    state.addMessageToHistory({ id: messageId, sender: fb.speaker.name, text: fb.message, replyToId: null });
                    setCooldown(fb.speaker.id, 2000); // Reduced cooldown here too
                    state.setIsBotTyping(false);
                }, typingDelay);
            }
        } catch {}
        state.setIsBotTyping(false);
    }
}

/**
 * Periodically checks if a violator bot should spawn to cause chaos.
 */
export function startViolatorSpawner() {
    setInterval(async () => {
        // Only spawn if there isn't already a violator, to not overwhelm the chat
        const hasViolator = state.participants.some(p => p.personality === 'violator');
        
        // And use a random chance to make it feel less predictable
        if (!hasViolator && Math.random() < 0.25) { // 25% chance every 30 seconds
            console.log("Spawning a violator...");
            try {
                const existingNames = state.participants.map(p => p.name);
                // Get an edgy name
                const [name] = await api.fetchParticipantNames(1, existingNames, "Generate a JSON array containing one single, edgy or rule-breaking online nickname.");
                
                if (!name || state.getParticipantByName(name)) return;

                const newViolator = participants.createBot(name);
                newViolator.personality = 'violator';
                newViolator.mood = 'Angry';
                newViolator.avatar = state.moodAvatars['Angry'];
                
                state.addParticipant(newViolator);
                participants.renderList(state.participants);

                const systemMessageText = `A new user, ${name}, has joined. They don't look friendly.`;
                chat.addSystemMessage(systemMessageText);
                state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });

                triggerBotMessage(null, `A new user, ${name}, just joined. They seem hostile and are here to break rules.`);

            } catch (error) {
                console.error("Failed to spawn violator:", error);
            }
        }
    }, 30000); // Check every 30 seconds
}

/**
 * Periodically checks if a new participant should join the chat, with a chance for a Hacker boss.
 */
export function startBotSpawner() {
    setInterval(async () => {
        // Don't spawn anything if not in a chat mode or if we're in hacker mode (hacker is the player)
        if (!['sandbox', 'story', 'player'].includes(state.gameMode)) {
            return;
        }
        
        // NEW: Check if chat is locked before spawning
        if (state.isChatLocked) {
            return;
        }

        // --- Story Mode Hacker Event Trigger ---
        if (state.gameMode === 'story' && !state.storyHackerEventTriggered && state.chatHistory.length > 15) {
            // After 15 messages, there's a chance for the betrayal event to start.
            if (Math.random() < 0.2) { // 20% chance per check
                console.log("STORY MODE: Triggering hacker betrayal event...");
                state.setStoryHackerEventTriggered(true); // Fire only once

                const potentialTraitors = state.getNonPlayerParticipants().filter(p => p.isBot && p.personality !== 'violator');
                if (potentialTraitors.length > 0) {
                    const traitor = potentialTraitors[Math.floor(Math.random() * potentialTraitors.length)];
                    
                    // The event will handle the announcement and transformation.
                    import('./gameEvents.js').then(module => {
                        module.triggerEvent({
                            id: 'story_hacker_betrayal',
                            text: `A system security alert has been triggered by ${traitor.name}!`,
                            participant: traitor
                        });
                    });
                }
                return; // Don't also spawn a regular bot
            }
        }
        
        // --- Regular Bot Spawning ---
        if (Math.random() < 0.2) { // Increased from 0.15 to 0.2 (20% chance)
            
            // It's a regular bot
            console.log("Spawning a new participant...");
            try {
                const existingNames = state.participants.map(p => p.name);
                const [name] = await api.fetchParticipantNames(1, existingNames);

                if (!name || state.getParticipantByName(name)) return;

                const newBot = participants.createBot(name);
                state.addParticipant(newBot);
                participants.renderList(state.participants);

                let systemMessageText;
                let botReactionText;

                if (newBot.personality === 'violator') {
                    systemMessageText = `A new user, ${name}, has joined. They don't look friendly.`;
                    botReactionText = `A new user, ${name}, just joined. They seem hostile and are here to break rules.`;
                } else {
                    systemMessageText = `${name} has joined the chat.`;
                    botReactionText = `A new user, ${name}, just joined. I should say hi.`;
                }

                chat.addSystemMessage(systemMessageText);
                state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
                triggerBotMessage(null, botReactionText);
                
            } catch (error) {
                console.error("Failed to spawn participant:", error);
            }
        }
    }, 40000); // Reduced from 45000 to 40000 (40 seconds instead of 45)
}