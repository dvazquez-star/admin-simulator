// This file manages core chat functionality.

import * as state from './state.js';
import * as ui from './ui.js';
import * as bot from './bot.js';
import * as participants from './participants.js';
import { judgeAdminChatMessage } from './userActions.js';
import * as api from './api.js';

// --- TTS Playback Utility ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentTtsSource = null;
const DEFAULT_TTS_VOICE = 'en-male'; // Define a single fixed default voice

/**
 * Ensure the shared AudioContext is resumed (useful for browsers that require a user gesture).
 */
export async function resumeAudioContext() {
    try {
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
    } catch (e) {
        // ignore resume errors
    }
}

/**
 * Generates and plays a message using Text-to-Speech if enabled.
 * @param {string} text - The text to speak.
 * @param {string} [voiceId=DEFAULT_TTS_VOICE] - The specific voice ID or code to use.
 */
async function playTtsMessage(text, voiceId = DEFAULT_TTS_VOICE) {
    if (!state.isTtsEnabled) return;

    // Ensure AudioContext resumed via shared helper (fixes browsers that require a user gesture)
    try {
        await resumeAudioContext();
    } catch (e) {
        // ignore resume errors
    }

    // Stop previous TTS if still playing
    if (currentTtsSource) {
        try {
            currentTtsSource.stop();
        } catch (e) {
            // Ignore error if already stopped
        }
        currentTtsSource = null;
    }
    
    // Use the provided voiceId, falling back to default if needed.
    const ttsVoice = voiceId || DEFAULT_TTS_VOICE;

    try {
        // Try resuming; if browser requires prior user gesture this will succeed when resumeAudioContext() was called on first click.
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        const result = await websim.textToSpeech({ text, voice: ttsVoice });
        if (!result || !result.url) return;

        const response = await fetch(result.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.8; // TTS volume
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.start(0);
        currentTtsSource = source;
        source.onended = () => {
            if (currentTtsSource === source) {
                currentTtsSource = null;
            }
        };

    } catch (e) {
        console.warn("TTS playback failed:", e);
    }
}

// --- Message Display Functions ---

/**
 * Adds a new message to the chat display.
 * @param {string} text - The message content.
 * @param {object} sender - The participant object of the sender.
 * @param {object} options - Additional options like isBot, replyToId, and imageUrl.
 * @returns {string} The unique ID of the newly created message.
 */
export function addMessage(text, sender, { isBot = false, replyToId = null, imageUrl = null } = {}) {
    const messageId = `msg-${Date.now()}-${Math.random()}`;
    
    // --- Event-based modifications ---
    let modifiedText = text;
    if (state.activeEvent?.id === 'allcaps') {
        modifiedText = text.toUpperCase();
    }
    
    const appendMessage = () => {
        const messageElement = document.createElement('div');
        const senderType = sender.isPlayer ? 'user' : 'other';
        messageElement.classList.add('message', `message-${senderType}`);
        messageElement.id = messageId;
        messageElement.dataset.senderId = sender.id;

        if (sender.isCoAdmin) {
            messageElement.classList.add('message-co-admin');
        }
        
        // Apply gravity effect if active
        if (state.activeEvent?.id === 'gravity') {
            messageElement.classList.add('gravity-effect');
        }

        const highlightedText = modifiedText.replace(/@(\S+)/g, (match, name) => {
            const mentionedParticipant = state.getParticipantByName(name);
            if (mentionedParticipant) {
                const isYou = mentionedParticipant.isPlayer;
                return `<strong class="mention" style="color: ${isYou ? '#f0e68c' : '#33ccff'}; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 6px; box-shadow: 0 0 10px rgba(51, 204, 255, 0.3);">${match}</strong>`;
            }
            return match;
        });

        let replyHTML = '';
        if (replyToId) {
            const originalMessage = state.getMessageById(replyToId);
            if (originalMessage) {
                replyHTML = `
                    <div class="reply-quote">
                        <div class="reply-quote-sender">Replying to ${originalMessage.sender}</div>
                        <div class="reply-quote-text">${originalMessage.text}</div>
                    </div>
                `;
            }
        }
        
        const senderVipClass = sender.isVip ? 'vip' : '';
        const senderModClass = sender.isMod ? 'mod' : '';
        const customEmojiHtml = sender.customMoodEmoji ? `<span class="custom-mood-emoji">${sender.customMoodEmoji}</span>` : '';

        // Add image content if imageUrl is provided
        const imageHtml = imageUrl ? `<img src="${imageUrl}" alt="Attached image" class="message-image" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px;">` : '';

        messageElement.innerHTML = `
            <div class="message-avatar-container">
                <img src="${sender.avatar}" class="message-avatar" alt="avatar">
                ${customEmojiHtml}
            </div>
            <div class="message-content">
                ${replyHTML}
                <div class="message-sender ${senderVipClass} ${senderModClass}">${sender.name}</div>
                <div class="message-text">${highlightedText}</div>
                ${imageHtml}
            </div>
            <button class="reply-button" title="Reply">↩</button>
        `;
        
        // Add particle effect for special messages
        if (sender.isVip || sender.isPlayer) {
            createMessageParticles(messageElement);
        }
        
        ui.elements.messagesContainer.appendChild(messageElement);
        ui.elements.messagesContainer.scrollTop = ui.elements.messagesContainer.scrollHeight;
        
        // Prune oldest DOM messages beyond 200 to reduce memory
        while (ui.elements.messagesContainer.childElementCount > 200) {
            ui.elements.messagesContainer.firstElementChild.remove();
        }
        
        // Trigger message sound effect
        playMessageSound(sender);

        // TTS logic: Use the participant's assigned voice if TTS is enabled
        if (state.isTtsEnabled) {
            // Note: sender.ttsVoice is 'en-male' for all AI/Player participants now due to fixed logic in participants.js
            const voice = sender.ttsVoice || DEFAULT_TTS_VOICE; 
            playTtsMessage(modifiedText, voice);
        }
    };

    // Apply lag effect if active
    if (state.activeEvent?.id === 'lag') {
        const lagTime = (isBot ? Math.random() * 2000 : 0) + 1000; // Bots lag more variably
        setTimeout(appendMessage, lagTime);
    } else {
        appendMessage();
    }

    document.dispatchEvent(new CustomEvent('statechange'));

    return messageId;
}

/**
 * Creates particle effects for special messages
 */
function createMessageParticles(messageElement) {
    const particles = document.createElement('div');
    particles.className = 'message-particles';
    particles.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: hidden;
    `;
    
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: #00aaff;
            border-radius: 50%;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            animation: particle-float 2s ease-out forwards;
            animation-delay: ${i * 0.1}s;
            box-shadow: 0 0 10px #00aaff;
        `;
        particles.appendChild(particle);
    }
    
    messageElement.style.position = 'relative';
    messageElement.appendChild(particles);
    
    setTimeout(() => particles.remove(), 2000);
}

/**
 * Plays a subtle sound effect for messages
 */
function playMessageSound(sender) {
    try {
        // Reuse the shared audioContext instead of creating a new one per message
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different tones for different message types
        if (sender.isPlayer) {
            osc.frequency.setValueAtTime(800, audioContext.currentTime);
        } else if (sender.isVip) {
            osc.frequency.setValueAtTime(600, audioContext.currentTime);
        } else {
            osc.frequency.setValueAtTime(400, audioContext.currentTime);
        }
        
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.2);
    } catch (error) {
        // Ignore audio errors
    }
}

/**
 * Adds a system message (e.g., warning, ban) to the chat display.
 * @param {string} text - The message content.
 * @returns {string} The unique ID of the message.
 */
export function addSystemMessage(text) {
    const messageId = `sys-${Date.now()}`;
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'message-system');
    messageElement.id = messageId;

    if (state.activeEvent?.id === 'gravity') {
        messageElement.classList.add('gravity-effect');
    }

    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">${text}</div>
        </div>
    `;
    ui.elements.messagesContainer.appendChild(messageElement);
    ui.elements.messagesContainer.scrollTop = ui.elements.messagesContainer.scrollHeight;
    // Prune oldest DOM messages beyond 200
    while (ui.elements.messagesContainer.childElementCount > 200) {
        ui.elements.messagesContainer.firstElementChild.remove();
    }
    document.dispatchEvent(new CustomEvent('statechange'));
    
    // System messages should use the fixed default voice
    playTtsMessage(text, DEFAULT_TTS_VOICE);

    return messageId;
}

/**
 * Adds a global admin message (e.g. from the admin panel) to the chat display.
 * @param {string} text - The message content.
 * @returns {string} The unique ID of the message.
 */
export function addAdminMessage(text) {
    const messageId = `admin-${Date.now()}`;
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'message-admin');
    messageElement.id = messageId;
    
    if (state.activeEvent?.id === 'gravity') {
        messageElement.classList.add('gravity-effect');
    }

    messageElement.innerHTML = `
        <div class="message-content">
            <div class="message-text">${text}</div>
        </div>
    `;
    ui.elements.messagesContainer.appendChild(messageElement);
    ui.elements.messagesContainer.scrollTop = ui.elements.messagesContainer.scrollHeight;
    // Prune oldest DOM messages beyond 200
    while (ui.elements.messagesContainer.childElementCount > 200) {
        ui.elements.messagesContainer.firstElementChild.remove();
    }
    document.dispatchEvent(new CustomEvent('statechange'));
    
    // Check if the admin is the player or AI admin and get their voice
    const adminParticipant = state.getPlayer() || state.aiAdmin;
    // Use fixed voice from participant state, which is now 'en-male' for all.
    const adminVoice = adminParticipant?.ttsVoice || DEFAULT_TTS_VOICE; 

    playTtsMessage(text, adminVoice);

    return messageId;
}

/**
 * Adds a poll to the chat display.
 * @param {string} question - The poll question.
 * @param {Array<string>} options - The poll options.
 * @param {string} [messageId=`poll-${Date.now()}`] - Optional. The unique ID of the message.
 * @returns {string} The unique ID of the message.
 */
export function addPollMessage(question, options, messageId = `poll-${Date.now()}`) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', 'message-poll');
    messageElement.id = messageId;
    
    if (state.activeEvent?.id === 'gravity') {
        messageElement.classList.add('gravity-effect');
    }

    const optionsHTML = options.map(opt => `
        <li class="poll-option" data-option="${opt}">
            <div class="poll-option-text">${opt}</div>
            <div class="poll-option-bar-container">
                <div class="poll-option-bar"></div>
            </div>
            <div class="poll-option-votes">0 votes</div>
        </li>
    `).join('');

    messageElement.innerHTML = `
        <div class="message-content">
            <div class="poll-question">📊 POLL: ${question}</div>
            <ul class="poll-options">
                ${optionsHTML}
            </ul>
        </div>
    `;
    ui.elements.messagesContainer.appendChild(messageElement);
    ui.elements.messagesContainer.scrollTop = ui.elements.messagesContainer.scrollHeight;
    document.dispatchEvent(new CustomEvent('statechange'));
    return messageId;
}

// --- Chat UI Update Functions ---

/**
 * Updates the avatars on all existing chat messages from a specific participant.
 * @param {string} participantId - The ID of the participant whose messages should be updated.
 * @param {string} newAvatarUrl - The new URL for the avatar image.
 */
export function updateMessageAvatars(participantId, newAvatarUrl) {
    const messages = document.querySelectorAll(`.message[data-sender-id="${participantId}"]`);
    messages.forEach(msg => {
        const avatarImg = msg.querySelector('.message-avatar');
        if (avatarImg) {
            avatarImg.src = newAvatarUrl;
        }
    });
}

/**
 * Updates the visual display of an active poll in the chat.
 * @param {string} messageId The ID of the poll message.
 * @param {object} pollData The updated poll data from the state.
 */
export function updatePollDisplay(messageId, pollData) {
    const pollElement = document.getElementById(messageId);
    if (!pollElement) return;

    const totalVotes = pollData.totalVotes;

    Object.keys(pollData.options).forEach(optionText => {
        const optionElement = pollElement.querySelector(`.poll-option[data-option="${optionText}"]`);
        if (optionElement) {
            const votesForOption = pollData.options[optionText].length;
            const percentage = totalVotes > 0 ? (votesForOption / totalVotes) * 100 : 0;
            
            const votesEl = optionElement.querySelector('.poll-option-votes');
            const barEl = optionElement.querySelector('.poll-option-bar');

            votesEl.textContent = `${votesForOption} vote${votesForOption !== 1 ? 's' : ''}`;
            barEl.style.width = `${percentage}%`;
        }
    });
}

/**
 * Highlights a specific message in the chat.
 * @param {string} messageId - The ID of the message to highlight.
 */
export function spotlightMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        const content = messageElement.querySelector('.message-content');
        const oldSpotlight = document.querySelector('.message-content.spotlighted');
        if (oldSpotlight) {
            oldSpotlight.classList.remove('spotlighted');
        }
        content.classList.add('spotlighted');
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => content.classList.remove('spotlighted'), 10000); // Spotlight lasts 10 seconds
    }
}

/**
 * Shows or hides the typing indicator.
 * @param {boolean} show - Whether to show the indicator.
 * @param {string} [name=''] - The name of the person typing.
 */
export function showTypingIndicator(show, name = '') {
    if (show) {
        ui.elements.typingIndicator.textContent = `${name} is typing...`;
        ui.elements.typingIndicator.classList.remove('hidden');
        
        // Add typing animation dots
        const dots = document.createElement('span');
        dots.className = 'typing-dots';
        dots.style.cssText = `
            display: inline-block;
            margin-left: 5px;
        `;
        dots.innerHTML = '<span style="animation: typing-dot 1.4s infinite 0s;">.</span><span style="animation: typing-dot 1.4s infinite 0.2s;">.</span><span style="animation: typing-dot 1.4s infinite 0.4s;">.</span>';
        
        // Add CSS animation for dots
        if (!document.getElementById('typing-animation-style')) {
            const style = document.createElement('style');
            style.id = 'typing-animation-style';
            style.textContent = `
                @keyframes typing-dot {
                    0%, 60%, 100% { opacity: 0.3; }
                    30% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        ui.elements.typingIndicator.appendChild(dots);
    } else {
        ui.elements.typingIndicator.classList.add('hidden');
        const dots = ui.elements.typingIndicator.querySelector('.typing-dots');
        if (dots) dots.remove();
    }
}

/**
 * Handles player mood change in player mode.
 * @param {string} newMood - The new mood to set.
 */
export function changePlayerMood(newMood) {
    if (state.gameMode !== 'player') return;
    
    const player = state.getPlayer();
    if (!player) return;
    
    const oldMood = player.mood;
    state.updateParticipantMood(player.id, newMood);
    participants.updateUIAvatar(player.id, player.avatar);
    updateMessageAvatars(player.id, player.avatar);
    
    // Update mood selector UI
    const moodButtons = document.querySelectorAll('#mood-selector .mood-button');
    moodButtons.forEach(btn => {
        btn.classList.remove('current-mood');
        if (btn.dataset.mood === newMood) {
            btn.classList.add('current-mood');
        }
    });
    
    // Announce mood change
    const systemMessageText = `${player.name} changed their mood from ${oldMood} to ${newMood}.`;
    addSystemMessage(systemMessageText);
    state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
    
    // Let bots react
    bot.triggerBotMessage(null, `${player.name} just changed their mood to ${newMood}. I should react to this.`);
}

// --- Reply and Mention UI Functions ---

function showReplyIndicator() {
    ui.elements.replyIndicator.classList.remove('hidden');
    ui.elements.replyIndicatorText.innerHTML = `Replying to <strong>${state.replyingTo.sender}</strong>: <em>${state.replyingTo.text}</em>`;
    ui.elements.messageInput.focus();
}

function cancelReply() {
    state.setReplyingTo(null);
    ui.elements.replyIndicator.classList.add('hidden');
    ui.elements.replyIndicatorText.innerHTML = '';
}

function renderMentionSuggestions(suggestions) {
    ui.elements.mentionSuggestions.innerHTML = '';
    suggestions.forEach((p, index) => {
        const item = document.createElement('div');
        item.classList.add('mention-suggestion-item');
        if (index === 0) item.classList.add('selected');
        item.dataset.name = p.name;
        item.innerHTML = `
            <img src="${p.avatar}" alt="${p.name}">
            <span class="mention-name">${p.name}</span>
        `;
        ui.elements.mentionSuggestions.appendChild(item);
    });
    ui.elements.mentionSuggestions.classList.remove('hidden');
}

function hideMentionSuggestions() {
    ui.elements.mentionSuggestions.classList.add('hidden');
    state.setMentionQuery(null); // Ensure we clear the query state when hiding
}

function updateMentionSelection(items, newIndex) {
    items.forEach(item => item.classList.remove('selected'));
    items[newIndex].classList.add('selected');
    items[newIndex].scrollIntoView({ block: 'nearest' });
}

// --- Event Handlers ---

async function handleMessageSubmit(event) {
    event.preventDefault();
    let messageText = ui.elements.messageInput.value.trim();
    if (!messageText) return;

    if (messageText.toLowerCase().replace(/[^a-z]/g, '') === 'upupdowndownleftrightleftrightba') {
        // Handle Konami code text input
        const KONAMI_CODE_SEQUENCE_TEXT = "upupdowndownleftrightleftrightba";
        const cleanInput = messageText.toLowerCase().replace(/[^a-z]/g, '');

        if (cleanInput === KONAMI_CODE_SEQUENCE_TEXT) {
             // Handle Konami code text input
             const KONAMI_CODE_SEQUENCE_TEXT = "upupdowndownleftrightleftrightba";
             const cleanInput = messageText.toLowerCase().replace(/[^a-z]/g, '');

             if (cleanInput === KONAMI_CODE_SEQUENCE_TEXT) {
                  // Activate cheat (using the same logic from events.js)
                  // Check state and activate locally if needed.
                  if (state.gameMode === 'player' || (state.room && !state.room.isAdmin)) {
                     
                     addSystemMessage("✨ CHEAT ACTIVATED: Admin Panel Unlocked! ✨");

                     if (state.gameMode === 'player') {
                         // In player mode, change self to Admin and flip the mode state
                         state.setGameMode('sandbox');
                         state.getPlayer().name = 'Admin';
                         state.getPlayer().avatar = '/Admin.png';
                         state.getPlayer().isAiAdmin = false;
                         
                         // NOTE: keep the existing AI admin in the participant list — do not remove it
                         
                         if (state.botChatInterval) clearInterval(state.botChatInterval);
                         bot.startBotChatter();

                         import('./ui.js').then(uiModule => {
                             uiModule.showChatView(); // Re-render the UI in sandbox mode
                         });
                         participants.renderList(state.participants);
                     }
                     
                     ui.elements.messageInput.value = ''; // Clear input field
                     hideMentionSuggestions();
                     cancelReply();
                     return; // Stop processing message
                  } else {
                      addSystemMessage("Cheat detected, but you already have admin privileges.");
                  }
             }
         }
    }

    if (state.isChatFrozen) {
        const frozenMsg = addSystemMessage("Chat is frozen. You cannot send messages right now.");
        setTimeout(() => document.getElementById(frozenMsg)?.remove(), 3000);
        return;
    }

    // NEW: Apply player message filter if active
    if (state.playerMessageFilter) {
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a message filter. Your task is to rewrite the following message based on this rule: "${state.playerMessageFilter}". Respond ONLY with the rewritten message and no other text.`
                    },
                    {
                        role: "user",
                        content: messageText
                    }
                ]
            });
            messageText = completion.content.trim();
            addSystemMessage("Message filtered by custom rule.");
        } catch (error) {
            console.error("Failed to apply message filter:", error);
            addSystemMessage("Error applying message filter. Sending original message.");
        }
    }

    const replyToId = state.replyingTo ? state.replyingTo.id : null;
    let sender, messageId;

    const processMessage = async () => {
        if (state.controlledUser) {
            // If controlling a user, send the message as them
            sender = state.getParticipantById(state.controlledUser);
            if (!sender) {
                console.error("Controlled user not found!");
                return;
            }
            messageId = addMessage(messageText, sender, { replyToId });
            state.addMessageToHistory({ id: messageId, sender: sender.name, text: messageText, replyToId });
        } else {
            // Otherwise, send as the player/admin
            sender = state.getPlayer();
            messageId = addMessage(messageText, sender, { replyToId });
            state.addMessageToHistory({ id: messageId, sender: sender.name, text: messageText, replyToId });
        
            if (state.gameMode === 'story') {
                judgeAdminChatMessage(messageText);
            }
        }

        ui.elements.messageInput.value = '';
        hideMentionSuggestions();
        cancelReply();

        // Make bots react faster to player messages and restart chatter if needed
        if (state.botChatInterval) clearInterval(state.botChatInterval);
        setTimeout(() => bot.triggerBotMessage(messageText), Math.random() * 1500 + 500); // Reduced delay
        bot.startBotChatter(); // Ensure chatter continues
    };

    processMessage();
}

function handleMessageContainerClick(e) {
    const replyButton = e.target.closest('.reply-button');
    if (replyButton) {
        const messageElement = replyButton.closest('.message');
        const messageId = messageElement.id;
        const messageData = state.getMessageById(messageId);
        if (messageData) {
            state.setReplyingTo(messageData);
            showReplyIndicator();
        }
    }
}

function handleMentionInput(e) {
    if (!ui.elements.replyIndicator.classList.contains('hidden')) {
        hideMentionSuggestions();
        return;
    }
    const text = e.target.value;
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const spaceAfterAtIndex = textBeforeCursor.lastIndexOf(' ');

    if (atIndex === -1 || atIndex < spaceAfterAtIndex) {
        hideMentionSuggestions();
        state.setMentionQuery(null);
        return;
    }

    const query = textBeforeCursor.substring(atIndex + 1).toLowerCase();
    state.setMentionQuery(query);
    
    const filtered = state.getNonPlayerParticipants().filter(p => p.name.toLowerCase().startsWith(query));

    if (filtered.length > 0) {
        renderMentionSuggestions(filtered);
    } else {
        hideMentionSuggestions();
    }
}

function selectMention(name) {
    const text = ui.elements.messageInput.value;
    const cursorPos = ui.elements.messageInput.selectionStart;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = text.substring(cursorPos);
    
    const newText = `${text.substring(0, atIndex)}@${name} ${textAfterCursor.trimStart()}`;
    ui.elements.messageInput.value = newText;
    ui.elements.messageInput.focus();
    
    const newCursorPos = atIndex + name.length + 2;
    ui.elements.messageInput.setSelectionRange(newCursorPos, newCursorPos);
    
    hideMentionSuggestions();
    state.setMentionQuery(null);
}

function handleMentionKeyDown(e) {
    if (ui.elements.mentionSuggestions.classList.contains('hidden')) return;
    const items = ui.elements.mentionSuggestions.querySelectorAll('.mention-suggestion-item');
    if (items.length === 0) return;

    let currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const newIndex = (currentIndex + direction + items.length) % items.length;
        updateMentionSelection(items, newIndex);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const selectedName = items[currentIndex].dataset.name;
        selectMention(selectedName);
    } else if (e.key === 'Escape') {
        e.preventDefault();
        hideMentionSuggestions();
    }
}

/**
 * Binds event listeners related to the chat area.
 */
export function initializeChatEventListeners() {
    ui.elements.messageForm.addEventListener('submit', handleMessageSubmit);
    ui.elements.messagesContainer.addEventListener('click', handleMessageContainerClick);
    ui.elements.cancelReplyButton.addEventListener('click', cancelReply);
    
    // Mentions
    ui.elements.messageInput.addEventListener('input', handleMentionInput);
    ui.elements.messageInput.addEventListener('keydown', handleMentionKeyDown);
    ui.elements.mentionSuggestions.addEventListener('click', (e) => {
        const item = e.target.closest('.mention-suggestion-item');
        if (item) selectMention(item.dataset.name);
    });

    const closeSuggestionsOnClickOutside = (e) => {
        // If suggestions are visible and the click/touch is not on the input or the suggestions box
        if (!ui.elements.mentionSuggestions.classList.contains('hidden')) {
            if (!ui.elements.messageInput.contains(e.target) && !ui.elements.mentionSuggestions.contains(e.target)) {
                hideMentionSuggestions();
            }
        }
    };

    // Add listeners for both click and touch to close mention suggestions when tapping outside
    document.addEventListener('click', closeSuggestionsOnClickOutside);
    document.addEventListener('touchstart', closeSuggestionsOnClickOutside);
    
    // Player mode mood selector
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('mood-button')) {
            const mood = e.target.dataset.mood;
            changePlayerMood(mood);
        }
    });
}

// Export cancelReply for use in multiplayer client submission logic
export { cancelReply };