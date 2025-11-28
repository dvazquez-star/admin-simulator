// This file manages all modal interactions.

import * as state from './state.js';
import * as ui from './ui.js';
import * as bot from './bot.js';
import * as chat from './chat.js';
import * as participants from './participants.js';
import { judgeAdminAction, judgeAdminChatMessage, changeNicknameForUser, executeCustomAction, handleCustomPanelButtonClick, giveAdToUser, giveObeyCommandToUser } from './userActions.js';
import * as audio from './audio.js';
import * as api from './api.js';

// --- Modal Visibility Helpers ---

function showModal(modalElement) {
    ui.elements.overlay.classList.remove('hidden');
    modalElement.classList.remove('hidden');
}

function hideModal(modalElement) {
    ui.elements.overlay.classList.add('hidden');
    modalElement.classList.add('hidden');
}

// Global flag to indicate if the nickname modal is for the player
export let isChangingPlayerName = false;

// --- Specific Modal Show/Hide Functions ---

export function showMuteModal(participant) {
    if (state.selectedParticipants.length > 1) {
        ui.elements.muteModalText.textContent = `Select duration to mute ${state.selectedParticipants.length} users:`;
    } else {
        ui.elements.muteModalText.textContent = `Select duration to mute ${participant.name}:`;
    }
    showModal(ui.elements.muteModal);
}

function hideMuteModal() {
    hideModal(ui.elements.muteModal);
}

export function showChangeNicknameModal(participant) {
    isChangingPlayerName = false; // This is for other participants
    ui.elements.changeNicknameModalTitle.textContent = `Change Nickname for ${participant.name}`;
    ui.elements.changeNicknameModalText.textContent = `Enter a new, unique name (3-19 characters).`;
    ui.elements.changeNicknameInput.value = participant.name; // Pre-fill with current name
    showModal(ui.elements.changeNicknameModal);
    ui.elements.changeNicknameInput.focus();
}

// New function for player's nickname change
export function showPlayerChangeNicknameModal() {
    if (state.gameMode !== 'sandbox') {
        alert("This feature is only available in Sandbox mode.");
        return;
    }
    const player = state.getPlayer();
    if (!player) return;

    isChangingPlayerName = true; // This is for the player
    ui.elements.changeNicknameModalTitle.textContent = `Change My Nickname`;
    ui.elements.changeNicknameModalText.textContent = `Enter your new, unique name (3-19 characters).`;
    ui.elements.changeNicknameInput.value = player.name; // Pre-fill with current player name
    showModal(ui.elements.changeNicknameModal);
    ui.elements.changeNicknameInput.focus();
}

function hideChangeNicknameModal() {
    ui.elements.changeNicknameInput.value = '';
    ui.elements.changeNicknameInput.style.borderColor = '';
    hideModal(ui.elements.changeNicknameModal);
}

export function showImpersonateModal(participant) {
    ui.elements.impersonateModalTitle.textContent = `Send Message As ${participant.name}`;
    ui.elements.impersonateModalText.textContent = `The message will appear in chat as if ${participant.name} sent it. They will react immediately.`
    showModal(ui.elements.impersonateModal);
    ui.elements.impersonateMessageInput.focus();
}

// NEW: Show the Say-As modal for a participant (used by the Say button)
export function showSayAsModal(participant) {
    if (!participant || participant.isPlayer) return;
    ui.elements.sayAsModal.querySelector('#say-as-modal-title')?.textContent; // harmless touch for availability
    // Store target participant id for the modal handlers to use
    ui.elements.sayAsModal.dataset.targetParticipantId = participant.id;
    showModal(ui.elements.sayAsModal);
    ui.elements.sayAsInput.focus();
}

// NEW: Hide function for Say-As modal
function hideSayAsModal() {
    try {
        if (ui.elements.sayAsInput) ui.elements.sayAsInput.value = '';
        if (ui.elements.sayAsModal) ui.elements.sayAsModal.removeAttribute('data-targetParticipantId');
    } catch (e) {
        console.warn('hideSayAsModal cleanup error:', e);
    }
    hideModal(ui.elements.sayAsModal);
}

function hideImpersonateModal() {
    ui.elements.impersonateMessageInput.value = '';
    hideModal(ui.elements.impersonateModal);
}

export function showAdminMessageModal() {
    showModal(ui.elements.adminMessageModal);
    ui.elements.adminMessageInput.focus();
}

function hideAdminMessageModal() {
    ui.elements.adminMessageInput.value = '';
    hideModal(ui.elements.adminMessageModal);
}

export function showRulesModal() {
    ui.elements.rulesInput.value = state.rules;
    showModal(ui.elements.rulesModal);
    ui.elements.rulesInput.focus();
}

function hideRulesModal() {
    hideModal(ui.elements.rulesModal);
}

export function showPollModal() {
    showModal(ui.elements.pollModal);
    ui.elements.pollQuestionInput.focus();
}

function hidePollModal() {
    ui.elements.pollQuestionInput.value = '';
    ui.elements.pollOptionsInput.value = '';
    hideModal(ui.elements.pollModal);
}

export function showSetMoodModal(participant) {
    ui.elements.setMoodModalTitle.textContent = `Set Mood for ${participant.name}`;
    const moodOptionsContainer = ui.elements.setMoodOptions;
    moodOptionsContainer.innerHTML = ''; // Clear previous buttons

    for (const mood in state.moodAvatars) {
        const button = document.createElement('button');
        button.dataset.mood = mood;
        button.textContent = mood;
        moodOptionsContainer.appendChild(button);
    }
    
    // Add custom mood button
    const customButton = document.createElement('button');
    customButton.dataset.mood = 'custom';
    customButton.textContent = 'Custom...';
    customButton.style.borderColor = '#9a9a9a';
    moodOptionsContainer.appendChild(customButton);

    showModal(ui.elements.setMoodModal);
}

function hideSetMoodModal() {
    hideModal(ui.elements.setMoodModal);
}

export function showSetPersonalityModal(participant) {
    ui.elements.setPersonalityModalTitle.textContent = `Set Personality for ${participant.name}`;
    const personalityOptionsContainer = ui.elements.setPersonalityOptions;
    personalityOptionsContainer.innerHTML = ''; // Clear previous buttons

    const personalities = ['normal', 'pedant', 'illiterate', 'short-tempered', 'clueless', 'violator', 'infected'];

    personalities.forEach(p => {
        const button = document.createElement('button');
        button.dataset.personality = p;
        button.textContent = p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' ');
        if (participant.personality === p) {
            button.style.borderColor = '#ffc400'; // Highlight current personality
        }
        personalityOptionsContainer.appendChild(button);
    });
    
    // Add custom personality button
    const customButton = document.createElement('button');
    customButton.dataset.personality = 'custom';
    customButton.textContent = 'Custom...';
    customButton.style.borderColor = '#9a9a9a';
    personalityOptionsContainer.appendChild(customButton);

    showModal(ui.elements.setPersonalityModal);
}

function hideSetPersonalityModal() {
    hideModal(ui.elements.setPersonalityModal);
}

export function showSetAgeModal(participant) {
    ui.elements.setAgeModalTitle.textContent = `Set Age for ${participant.name}`;
    ui.elements.setAgeModalText.textContent = `Enter a new age. This will influence how they talk and behave.`;
    ui.elements.setAgeInput.value = participant.age || 25;
    showModal(ui.elements.setAgeModal);
    ui.elements.setAgeInput.focus();
}

function hideSetAgeModal() {
    ui.elements.setAgeInput.value = '';
    hideModal(ui.elements.setAgeModal);
}

export function showGameOverModal(reason) {
    ui.elements.gameOverText.textContent = reason;
    showModal(ui.elements.gameOverModal);
}

export function showStoryIntroModal() {
    showModal(ui.elements.storyIntroModal);
}

function hideStoryIntroModal() {
    hideModal(ui.elements.storyIntroModal);
}

export function showChatCorruptedModal() {
    showModal(ui.elements.chatCorruptedModal);
}

function hideChatCorruptedModal() {
    hideModal(ui.elements.chatCorruptedModal);
}

export function showObeyModal(participant) {
    ui.elements.obeyModalTitle.textContent = `Give Command To ${participant.name}`;
    ui.elements.obeyModalText.textContent = `The user will follow this new rule without hesitation. This overrides their personality for subsequent actions.`;
    showModal(ui.elements.obeyModal);
    ui.elements.obeyCommandInput.focus();
}

function hideObeyModal() {
    ui.elements.obeyCommandInput.value = '';
    hideModal(ui.elements.obeyModal);
}

export function showAddCustomUserModal() {
    if (state.gameMode !== 'sandbox') return;
    showModal(ui.elements.addCustomUserModal);
    ui.elements.addCustomUserModal.querySelector('input').focus();
}

function hideAddCustomUserModal() {
    const input = ui.elements.addCustomUserModal.querySelector('input');
    if (input) input.value = '';
    hideModal(ui.elements.addCustomUserModal);
}

export function showCustomActionModal(participant) {
    if (state.gameMode !== 'sandbox') return;
    const modal = ui.elements.customActionModal;
    modal.querySelector('#custom-action-modal-title').textContent = `Custom Action for ${participant.name}`;
    showModal(modal);
    modal.querySelector('textarea').focus();
}

function hideCustomActionModal() {
    const modal = ui.elements.customActionModal;
    const input = modal.querySelector('#custom-action-input');
    if (input) input.value = '';
    hideModal(modal);
}

export function showAddCustomPanelButtonModal() {
    if (state.gameMode !== 'sandbox') return;
    showModal(ui.elements.addCustomPanelButtonModal);
    ui.elements.addCustomPanelButtonModal.querySelector('input').focus();
}

function hideAddCustomPanelButtonModal() {
    const modal = ui.elements.addCustomPanelButtonModal;
    modal.querySelector('#custom-button-label-input').value = '';
    modal.querySelector('#custom-button-action-input').value = '';
    hideModal(modal);
}

export function showAddWebsimUserModal() {
    if (state.gameMode !== 'sandbox') return;
    showModal(ui.elements.addWebsimUserModal);
    ui.elements.addWebsimUserModal.querySelector('input').focus();
}

function hideAddWebsimUserModal() {
    const modal = ui.elements.addWebsimUserModal;
    const input = modal.querySelector('input');
    if (input) input.value = '';
    hideModal(modal);
}

export function showSettingsModal() {
    // Load current settings values when showing the modal
    if (ui.elements.volumeSlider) {
        ui.elements.volumeSlider.value = audio.musicVolume;
    }
    // NEW: Load swearing setting
    if (ui.elements.allowSwearingCheckbox) {
        ui.elements.allowSwearingCheckbox.checked = state.allowSwearing;
    }
    // NEW: Load TTS setting
    if (ui.elements.ttsToggle) {
        ui.elements.ttsToggle.checked = state.isTtsEnabled;
    }
    showModal(ui.elements.settingsModal);
}

function hideSettingsModal() {
    hideModal(ui.elements.settingsModal);
}

// New: Suggestion Modal functions
export function showSuggestionModal() {
    showModal(ui.elements.suggestionModal);
    ui.elements.suggestionInput.focus();
}

function hideSuggestionModal() {
    ui.elements.suggestionInput.value = '';
    hideModal(ui.elements.suggestionModal);
}

// New: Give Ad Modal functions
export function showGiveAdModal(participant) {
    if (!participant || participant.isPlayer) return; // Only show for non-player bots
    const modal = ui.elements.giveAdModal;
    if (!modal) {
        console.error("Give Ad Modal element not found!");
        return;
    }
    modal.querySelector('h3').textContent = `Give Ad to ${participant.name}`;
    modal.querySelector('#give-ad-modal-text').textContent = `Force ${participant.name} to watch a 15-second ad. They will be muted during this time.`;
    showModal(modal);
}

function hideGiveAdModal() {
    hideModal(ui.elements.giveAdModal);
}

// NEW: Add Feature Modal functions
export function showAddFeatureModal() {
    showModal(ui.elements.addFeatureModal);
    ui.elements.featureDescriptionInput.focus();
}

function hideAddFeatureModal() {
    ui.elements.featureDescriptionInput.value = '';
    hideModal(ui.elements.addFeatureModal);
}

/**
 * NEW: Clips Log Modal functions
 */
export function showClipsLogModal() {
    const list = ui.elements.clipsList;
    list.innerHTML = '';
    
    // Load clips from state (which is loaded from localStorage)
    const clips = state.getSavedClips() || [];
    if (clips.length === 0) {
        list.innerHTML = '<li>No clips saved yet.</li>';
    } else {
        clips.forEach((clip, index) => {
            const li = document.createElement('li');
            li.style.cssText = 'border-bottom: 1px dashed #0077ff; padding: 10px 0; margin-bottom: 10px; cursor: pointer;';
            
            const title = document.createElement('div');
            title.style.fontWeight = 'bold';
            title.style.color = '#ffc400';
            title.textContent = `Clip #${index + 1} (${new Date(clip.savedAt).toLocaleString()})`;

            const summary = document.createElement('div');
            summary.style.fontSize = '0.8em';
            summary.style.color = '#ccc';
            summary.textContent = clip.summary;

            li.appendChild(title);
            li.appendChild(summary);

            // If video preview exists, show a small video player and download button
            if (clip.videoUrl) {
                const video = document.createElement('video');
                video.src = clip.videoUrl;
                video.controls = true;
                video.style.cssText = 'width:100%; max-width:640px; margin-top:8px; border-radius:6px; background:#000;';
                li.appendChild(video);

                const dl = document.createElement('a');
                dl.href = clip.videoUrl;
                dl.download = `${clip.id}.webm`;
                dl.textContent = 'Download Video';
                dl.style.cssText = 'display:inline-block; margin-top:8px; color:#00aaff;';
                li.appendChild(dl);
            } else {
                const note = document.createElement('div');
                note.style.cssText = 'font-size:0.8em; color:#99aabb; margin-top:8px;';
                note.textContent = 'Video preview is being generated or not available for this clip.';
                li.appendChild(note);
            }

            // Clicking the summary will inject the clip messages into the chat as system logs
            li.addEventListener('click', () => {
                chat.addSystemMessage(`--- START CLIP #${index + 1} (Location: ${clip.location}) ---`);
                clip.messages.forEach(msg => {
                    const senderName = msg.sender;
                    const messageText = msg.text;
                    const logPrefix = senderName === 'System' ? '[SYS]' : (senderName.includes('Admin') ? '[ADMIN]' : `[${senderName}]`);
                    chat.addSystemMessage(`${logPrefix}: ${messageText}`);
                });
                chat.addSystemMessage(`--- END CLIP #${index + 1} ---`);
                hideClipsLogModal();
            });

            list.appendChild(li);
        });
    }

    showModal(ui.elements.clipsLogModal);
}

function hideClipsLogModal() {
    hideModal(ui.elements.clipsLogModal);
}

/**
 * NEW: Displays the Set User Emoji modal.
 * @param {object} participant - The participant to set the emoji for.
 */
export function showSetUserEmojiModal(participant) {
    if (state.gameMode !== 'sandbox') return;

    ui.elements.setUserEmojiModalTitle.textContent = `Set Emoji for ${participant.name}`;
    ui.elements.setUserEmojiInput.value = participant.customMoodEmoji || '';
    ui.elements.setUserEmojiPreview.textContent = participant.customMoodEmoji || ' ';
    showModal(ui.elements.setUserEmojiModal);

    const handleInput = () => {
        ui.elements.setUserEmojiPreview.textContent = ui.elements.setUserEmojiInput.value.trim() || ' ';
    };
    ui.elements.setUserEmojiInput.addEventListener('input', handleInput);
    
    // Store participant ID for send/cancel
    ui.elements.setUserEmojiModal.dataset.targetParticipantId = participant.id;

    ui.elements.setUserEmojiInput.focus();
}

function hideSetUserEmojiModal() {
    ui.elements.setUserEmojiInput.value = '';
    ui.elements.setUserEmojiPreview.textContent = ' ';
    ui.elements.setUserEmojiModal.removeAttribute('data-targetParticipantId');
    hideModal(ui.elements.setUserEmojiModal);
    // Remove temporary input listener to prevent duplicates
    ui.elements.setUserEmojiInput.removeEventListener('input', () => {
        ui.elements.setUserEmojiPreview.textContent = ui.elements.setUserEmojiInput.value.trim() || ' ';
    });
}

/**
 * Applies a custom feature to the client-side game based on AI interpretation.
 * This function should only affect the local user's experience.
 * @param {object} feature - The structured feature object from the AI.
 */
async function applyClientSideFeature(feature) {
    const { featureType, featureDetails, feedbackMessage } = feature;

    try {
        switch (featureType) {
            case 'custom_button':
                {
                    // For 'Add Feature' from main menu, we execute the button's action directly
                    // instead of adding a new permanent button to the admin panel.
                    if (!featureDetails || !featureDetails.actionDescription) {
                        throw new Error("Missing actionDescription for custom_button featureType.");
                    }
                    chat.addSystemMessage(`Applying feature: "${featureDetails.label || 'Custom Action'}"`);
                    // Execute the action directly using the custom panel button handler
                    await handleCustomPanelButtonClick(featureDetails.actionDescription, null);
                    chat.addSystemMessage(`Feature Applied: ${feedbackMessage}`);
                }
                break;
            case 'visual_style':
                {
                    if (!featureDetails || !featureDetails.elementSelector || !featureDetails.cssProperty || !featureDetails.cssValue) {
                        throw new Error("Missing details for visual_style featureType.");
                    }
                    const targetElement = document.querySelector(featureDetails.elementSelector);
                    if (targetElement) {
                        targetElement.style[featureDetails.cssProperty] = featureDetails.cssValue;
                        chat.addSystemMessage(`Feature Added: ${feedbackMessage}`);
                    } else {
                        throw new Error(`Element not found for selector: ${featureDetails.elementSelector}`);
                    }
                }
                break;
            case 'player_stat_change':
                {
                    if (!featureDetails || !featureDetails.statName || (typeof featureDetails.changeValue !== 'number' && typeof featureDetails.changeValue !== 'string')) {
                        throw new Error("Missing details for player_stat_change featureType.");
                    }
                    if (featureDetails.statName === 'reputation') {
                        state.setAdminReputation(state.adminReputation + featureDetails.changeValue);
                        ui.updateReputationBar(state.adminReputation);
                        chat.addSystemMessage(`Feature Added: ${feedbackMessage}`);
                    } else if (featureDetails.statName === 'initialMood') { // Handle changing player's mood
                        const player = state.getPlayer();
                        if (player && typeof featureDetails.changeValue === 'string') {
                            state.updateParticipantMood(player.id, featureDetails.changeValue); // changeValue would be the new mood string
                            chat.addSystemMessage(`Feature Added: ${feedbackMessage}`);
                        } else {
                            throw new Error(`Invalid value for player initialMood: ${featureDetails.changeValue}`);
                        }
                    } else {
                        throw new Error(`Unsupported player stat: ${featureDetails.statName}`);
                    }
                }
                break;
            case 'chat_effect':
                {
                    if (!featureDetails || !featureDetails.effectName) {
                        throw new Error("Missing details for chat_effect featureType.");
                    }
                    // For demo, let's implement a simple "pulse_messages" effect.
                    if (featureDetails.effectName === 'pulse_messages') {
                        const styleElement = document.createElement('style');
                        styleElement.id = 'pulse-messages-effect';
                        styleElement.textContent = `
                            .message {
                                animation: pulseEffect 2s infinite alternate;
                            }
                            @keyframes pulseEffect {
                                0% { transform: scale(1); opacity: 1; }
                                100% { transform: scale(1.02); opacity: 0.95; }
                            }
                        `;
                        document.head.appendChild(styleElement);
                        chat.addSystemMessage(`Feature Added: ${feedbackMessage}`);
                        if (featureDetails.durationSeconds) {
                            setTimeout(() => {
                                styleElement.remove();
                                chat.addSystemMessage("Pulse messages effect ended.");
                            }, featureDetails.durationSeconds * 1000);
                        }
                    } else if (featureDetails.effectName === 'rainbow_text') {
                        const styleElement = document.createElement('style');
                        styleElement.id = 'rainbow-text-effect';
                        styleElement.textContent = `
                            .message-text {
                                animation: rainbowText 5s infinite alternate;
                                background: linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet);
                                -webkit-background-clip: text;
                                -webkit-text-fill-color: transparent;
                            }
                            @keyframes rainbowText {
                                0% { filter: hue-rotate(0deg); }
                                100% { filter: hue-rotate(360deg); }
                            }
                        `;
                        document.head.appendChild(styleElement);
                        chat.addSystemMessage(`Feature Added: ${feedbackMessage}`);
                        if (featureDetails.durationSeconds) {
                            setTimeout(() => {
                                styleElement.remove();
                                chat.addSystemMessage("Rainbow text effect ended.");
                            }, featureDetails.durationSeconds * 1000);
                        }
                    }
                    else {
                        throw new Error(`Unsupported chat effect: ${featureDetails.effectName}`);
                    }
                }
                break;
            case 'custom_message_filter':
                {
                    if (!featureDetails || !featureDetails.filterPrompt) {
                        throw new Error("Missing details for custom_message_filter featureType.");
                    }
                    state.setPlayerMessageFilter(featureDetails.filterPrompt); // Set a global filter for player messages
                    chat.addSystemMessage(`Feature Added: ${feedbackMessage}`);
                }
                break;
            case 'none':
                chat.addSystemMessage(feedbackMessage || "Could not add feature. The request was unclear or impossible.");
                break;
            default:
                throw new Error(`Unknown feature type: ${featureType}`);
        }
    } catch (error) {
        console.error("Error applying custom feature:", error);
        chat.addSystemMessage(`Error applying your feature: ${error.message}. Please try a simpler request.`);
    }
}

function initializeMuteModalListener() {
    ui.elements.muteModal.addEventListener('click', (e) => {
        const participantsToMute = state.selectedParticipants;
        if (participantsToMute.length === 0) return;

        if (e.target.id === 'mute-modal-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hideMuteModal();
        } else if (e.target.dataset.duration) {
            const duration = parseInt(e.target.dataset.duration, 10);
            
            const names = [];
            participantsToMute.forEach(participant => {
                if (!participant.isPlayer) {
                    participant.mutedUntil = Date.now() + duration * 1000;
                    names.push(participant.name);
                }
            });

            if (names.length > 0) {
                const systemMessageText = `${names.join(', ')} has been muted for ${duration / 60} minute(s).`;
                chat.addSystemMessage(systemMessageText);
                state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
                
                // For simplicity, we judge based on the first participant in story mode
                judgeAdminAction('mute', participantsToMute[0], `Muted for ${duration} seconds`);
            }
            
            ui.setAdminButtonState();
            hideMuteModal();
        }
    });
}

function initializeObeyModalListener() {
    ui.elements.obeyModal.addEventListener('click', (e) => {
        if (e.target.id === 'obey-command-send') {
            const command = ui.elements.obeyCommandInput.value.trim();
            if (command) {
                // Ensure a participant is selected
                if (state.selectedParticipants.length === 1) {
                    const participant = state.selectedParticipants[0];
                    giveObeyCommandToUser(participant.id, command);
                } else {
                    alert('Please select a single participant to give a command to.');
                }
                hideObeyModal();
            }
        } else if (e.target.id === 'obey-command-cancel') {
            hideObeyModal();
        }
    });
}

function initializeSetMoodModalListener() {
    ui.elements.setMoodModal.addEventListener('click', async (e) => {
        if (state.selectedParticipants.length !== 1) return;
        const participant = state.selectedParticipants[0];

        if (e.target.id === 'set-mood-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hideSetMoodModal();
        } else if (e.target.dataset.mood) {
            const newMood = e.target.dataset.mood;

            if (newMood === 'custom') {
                const customMood = prompt("Enter a custom mood for the bot (e.g., 'Sarcastic', 'Overjoyed', 'Anxious'):");
                if (customMood && customMood.trim() !== '') {
                    const moodText = customMood.trim();
                    const emoji = await api.fetchEmojiForMood(moodText);
                    
                    // Update the participant's mood. Since it's custom, we might not have an avatar. Default to Neutral.
                    participant.mood = moodText;
                    participant.avatar = state.moodAvatars['Neutral']; // Fallback avatar
                    participant.customMoodEmoji = emoji;
                    
                    participants.renderList(state.participants); // Re-render to show emoji
                    chat.updateMessageAvatars(participant.id, participant.avatar);

                    const systemMessageText = `${participant.name}'s mood was set to a custom state: ${moodText} ${emoji}.`;
                    chat.addSystemMessage(systemMessageText);
                    const adminActionText = `The admin just changed my mood to ${moodText}. I suddenly feel very ${moodText}. My name is ${participant.name}.`;
                    bot.triggerBotMessage(null, adminActionText);
                    hideSetMoodModal();
                }
                return; // Stop further execution
            }
            
            state.updateParticipantMood(participant.id, newMood);
            participants.renderList(state.participants); // Re-render to remove emoji
            chat.updateMessageAvatars(participant.id, state.getParticipantById(participant.id).avatar);

            const systemMessageText = `${participant.name}'s mood was set to ${newMood}.`;
            chat.addSystemMessage(systemMessageText);
            state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
            
            judgeAdminAction('set_mood', participant, `Set mood to ${newMood}`);
            
            const adminActionText = `The admin just changed my mood to ${newMood}. I suddenly feel very ${newMood}. My name is ${participant.name}.`;
            bot.triggerBotMessage(null, adminActionText);

            hideSetMoodModal();
        }
    });
}

function initializeSetPersonalityModalListener() {
    ui.elements.setPersonalityModal.addEventListener('click', (e) => {
        if (state.selectedParticipants.length !== 1) return;
        const participant = state.selectedParticipants[0];

        if (e.target.id === 'set-personality-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hideSetPersonalityModal();
        } else if (e.target.dataset.personality) {
            const newPersonality = e.target.dataset.personality;
            const oldPersonality = participant.personality;

            if (newPersonality === 'custom') {
                const customPersonality = prompt("Enter a custom personality for the bot (e.g., 'Conspiracy Theorist', 'Drama Queen', 'Silent Observer'):");
                if (customPersonality && customPersonality.trim() !== '') {
                    participant.personality = customPersonality.trim();

                    const systemMessageText = `${participant.name}'s personality was changed to a custom state: ${customPersonality}.`;
                    chat.addSystemMessage(systemMessageText);
                    const adminActionText = `The admin just changed my personality to ${customPersonality}. I feel... different. My name is ${participant.name}.`;
                    bot.triggerBotMessage(null, adminActionText);
                    hideSetPersonalityModal();
                }
                return; // Stop further execution
            }

            participant.personality = newPersonality;
            
            // If they become a violator, maybe change mood too for effect
            if (newPersonality === 'violator' || newPersonality === 'infected') {
                state.updateParticipantMood(participant.id, 'Angry');
                participants.updateUIAvatar(participant.id, state.getParticipantById(participant.id).avatar);
                chat.updateMessageAvatars(participant.id, state.getParticipantById(participant.id).avatar);
            }

            const systemMessageText = `${participant.name}'s personality was changed from ${oldPersonality} to ${newPersonality}.`;
            chat.addSystemMessage(systemMessageText);
            state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
            
            judgeAdminAction('set_personality', participant, `Set personality to ${newPersonality}`);
            
            const adminActionText = `The admin just changed my personality from ${oldPersonality} to ${newPersonality}. I feel... different. My name is ${participant.name}.`;
            bot.triggerBotMessage(null, adminActionText);

            hideSetPersonalityModal();
        }
    });
}

function initializeSetAgeModalListener() {
    ui.elements.setAgeModal.addEventListener('click', async (e) => {
        if (state.selectedParticipants.length !== 1) return;
        const participant = state.selectedParticipants[0];

        if (e.target.id === 'set-age-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hideSetAgeModal();
        } else if (e.target.id === 'set-age-send') {
            const newAge = parseInt(ui.elements.setAgeInput.value, 10);

            if (isNaN(newAge)) {
                alert('Please enter a valid number for the age.');
                return;
            }

            // Call the action from userActions.js
            import('./userActions.js').then(userActions => {
                userActions.setAgeForUser(participant.id, newAge);
            });
            hideSetAgeModal();
        }
    });
}

function initializeAdminMessageModalListener() {
    ui.elements.adminMessageModal.addEventListener('click', (e) => {
        if (e.target.id === 'admin-message-send') {
            const text = ui.elements.adminMessageInput.value.trim();
            if (text) {
                // If admin wants to send a true system message, prefix with "/system "
                if (text.startsWith('/system ')) {
                    const systemText = text.replace(/^\/system\s+/, '');
                    const messageId = chat.addSystemMessage(systemText);
                    state.addMessageToHistory({ id: messageId, sender: 'System', text: systemText });
                    // Do NOT call bot.triggerBotMessage — keep it opaque to bots
                } else {
                    const messageId = chat.addAdminMessage(text);
                    state.addMessageToHistory({ id: messageId, sender: 'Admin', text });
                    if (state.gameMode === 'story') judgeAdminChatMessage(text);
                    // Bots may react to normal admin messages
                    const adminActionText = `The Admin sent a global message: "${text}"`;
                    bot.triggerBotMessage(text, adminActionText);
                }
                hideAdminMessageModal();
            }
        } else if (e.target.id === 'admin-message-cancel') {
            hideAdminMessageModal();
        }
    });
}

function initializeChangeNicknameModalListener() {
    ui.elements.changeNicknameModal.addEventListener('click', async (e) => {
        const newName = ui.elements.changeNicknameInput.value.trim();
        const currentPlayer = state.getPlayer();

        // Determine if action is for player or a selected bot
        const targetParticipant = isChangingPlayerName ? currentPlayer : (state.selectedParticipants.length === 1 ? state.selectedParticipants[0] : null);

        if (!targetParticipant) return; // No target, exit

        if (e.target.id === 'change-nickname-send') {
            // Basic validation
            // Check if the new name is already taken by another participant
            const existingParticipantWithNewName = state.getParticipantByName(newName);
            if (newName.length < 3 || newName.length > 19 || newName.toLowerCase() === 'admin' || (existingParticipantWithNewName && existingParticipantWithNewName.id !== targetParticipant.id)) {
                ui.elements.changeNicknameInput.style.borderColor = 'red';
                setTimeout(() => { ui.elements.changeNicknameInput.style.borderColor = '' }, 2000);
                return;
            }

            const oldName = targetParticipant.name;
            await changeNicknameForUser(targetParticipant.id, newName);

            // Trigger bot reaction specifically for player's name change
            if (isChangingPlayerName) {
                const adminActionText = `The Admin (player) just changed their name from ${oldName} to ${newName}.`;
                bot.triggerBotMessage(null, adminActionText);
            }

            hideChangeNicknameModal();
            state.setSelectedParticipants([]); // Deselect after action
            ui.setAdminButtonState();

        } else if (e.target.id === 'change-nickname-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hideChangeNicknameModal();
        }
    });
}

function initializeSayAsModalListener() {
    ui.elements.sayAsModal.addEventListener('click', (e) => {
        if (e.target.id === 'say-as-send') {
            const participantId = ui.elements.sayAsModal.dataset.targetParticipantId;
            const participant = state.getParticipantById(participantId);
            const text = ui.elements.sayAsInput.value.trim();
            if (!participant) {
                chat.addSystemMessage("Target participant not found.");
                hideSayAsModal();
                return;
            }
            if (!text) {
                alert("Please enter a message.");
                return;
            }

            // Add message as if the participant wrote it
            const messageId = chat.addMessage(text, participant, { replyToId: state.replyingTo ? state.replyingTo.id : null });
            state.addMessageToHistory({ id: messageId, sender: participant.name, text, replyToId: state.replyingTo ? state.replyingTo.id : null });

            // Let bots react naturally to the new message (do not add a system note that admin sent it)
            import('./bot.js').then(bot => bot.triggerBotMessage(text));

            hideSayAsModal();
        } else if (e.target.id === 'say-as-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hideSayAsModal();
        }
    });
}

function initializeImpersonateModalListener() {
    ui.elements.impersonateModal.addEventListener('click', (e) => {
        if (state.selectedParticipants.length !== 1) return;
        const participant = state.selectedParticipants[0];

        if (e.target.id === 'impersonate-message-send') {
            const text = ui.elements.impersonateMessageInput.value.trim();
            if (text) {
                const messageId = chat.addMessage(text, participant);
                state.addMessageToHistory({ id: messageId, sender: participant.name, text: text });
                
                const adminActionText = `The Admin just sent a message impersonating me, ${participant.name}. I DID NOT WRITE THIS. The fake message was: "${text}"`;
                bot.triggerBotMessage(null, adminActionText);

                hideImpersonateModal();
            }
        } else if (e.target.id === 'impersonate-message-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hideImpersonateModal();
        }
    });
}

function initializeRulesModalListener() {
    ui.elements.rulesModal.addEventListener('click', (e) => {
        if (e.target.id === 'rules-save') {
            const newRules = ui.elements.rulesInput.value.trim();
            if (newRules) {
                state.setRules(newRules);
                const systemMessageText = 'The chat rules have been updated by the Admin.';
                chat.addSystemMessage(systemMessageText);
                state.addMessageToHistory({ id: `sys-${Date.now()}`, sender: 'System', text: systemMessageText });
                const adminActionText = `The Admin updated the rules.`;
                bot.triggerBotMessage(null, adminActionText);
                hideRulesModal();
            }
        } else if (e.target.id === 'rules-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hideRulesModal();
        }
    });
}

function initializePollModalListener() {
    ui.elements.pollModal.addEventListener('click', (e) => {
        if (e.target.id === 'poll-send') {
            const question = ui.elements.pollQuestionInput.value.trim();
            const optionsText = ui.elements.pollOptionsInput.value.trim();
            if (question && optionsText) {
                const options = optionsText.split(',').map(opt => opt.trim()).filter(Boolean);
                if (options.length > 1) {
                    const messageId = chat.addPollMessage(question, options);
                    
                    const pollOptionsData = options.reduce((acc, opt) => {
                        acc[opt] = []; // Store voter IDs here
                        return acc;
                    }, {});

                    state.addMessageToHistory({ 
                        id: messageId, 
                        sender: 'Admin', 
                        text: `Poll: ${question}`,
                        pollData: {
                            question: question,
                            options: pollOptionsData,
                            totalVotes: 0
                        }
                    });

                    const adminActionText = `The admin started a poll: "${question}". The options are: ${options.join(', ')}. I should vote or comment on this.`;
                    bot.triggerBotMessage(null, adminActionText);
                    
                    hidePollModal();
                } else {
                    alert("Please provide at least two options, separated by commas.");
                }
            } else {
                alert("Please fill out both the question and options.");
            }
        } else if (e.target.id === 'poll-cancel' || e.target.classList.contains('modal-cancel-button')) {
            hidePollModal();
        }
    });
}

function initializeGameOverListener() {
    ui.elements.gameOverModal.addEventListener('click', (e) => {
        if (e.target.id === 'game-over-restart') {
            window.location.reload();
        }
    });
}

function initializeStoryIntroListener() {
    ui.elements.storyIntroModal.addEventListener('click', (e) => {
        if (e.target.id === 'story-intro-ok') {
            hideStoryIntroModal();
        }
    });
}

function initializeChatCorruptedListener() {
    const modal = ui.elements.chatCorruptedModal;
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'chat-corrupted-ok') {
            hideChatCorruptedModal();
            ui.showHackerLobbyView();
        }
    });
}

function initializeAddCustomUserModalListener() {
    const modal = ui.elements.addCustomUserModal;
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'create-custom-user-button') {
            const input = modal.querySelector('#custom-user-name-input');
            const personalitySelect = modal.querySelector('#custom-user-personality-select');
            const name = input.value.trim();
            let personality = personalitySelect.value;

            if (personality === 'custom') {
                const customPersonality = prompt("Enter a custom personality for the bot (e.g., 'Conspiracy Theorist', 'Drama Queen', 'Silent Observer'):");
                if (customPersonality && customPersonality.trim() !== '') {
                    personality = customPersonality.trim();
                } else {
                    return; // Abort if user cancels or enters empty string
                }
            }

            if (name.length > 2 && name.length < 20) {
                import('./globalActions.js').then(actions => {
                    actions.handleAddCustomUser(name, personality);
                });
                hideAddCustomUserModal();
            } else {
                alert('Name must be between 3 and 19 characters.');
            }
        } else if (e.target.id === 'custom-user-cancel-button') {
            hideAddCustomUserModal();
        }
    });
}

function initializeAddWebsimUserModalListener() {
    const modal = ui.elements.addWebsimUserModal;
    if (!modal) return;
    modal.addEventListener('click', async (e) => {
        if (e.target.id === 'create-websim-user-button') {
            const input = modal.querySelector('#websim-username-input');
            const username = input.value.trim();
            if (!username) {
                alert('Please enter a username.');
                return;
            }

            const createButton = e.target;
            createButton.disabled = true;
            createButton.textContent = 'Fetching...';

            try {
                // The actual logic will be in globalActions.js to keep modals clean.
                const globalActions = await import('./globalActions.js');
                await globalActions.handleAddWebsimUser(username);
                hideAddWebsimUserModal();
            } catch (error) {
                console.error(error);
                alert(`Error: ${error.message}`);
            } finally {
                createButton.disabled = false;
                createButton.textContent = 'Create';
            }
        } else if (e.target.id === 'websim-user-cancel-button') {
            hideAddWebsimUserModal();
        }
    });
}

function initializeCustomActionModalListener() {
    const modal = ui.elements.customActionModal;
    if (!modal) return;

    modal.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.id === 'custom-action-cancel' || target.classList.contains('modal-cancel-button')) {
            hideCustomActionModal();
            return;
        }

        if (target.id === 'custom-action-send') {
            if (state.selectedParticipants.length !== 1) {
                chat.addSystemMessage('Please select a single participant to perform a custom action on.');
                return;
            }
            const participant = state.selectedParticipants[0];

            const input = modal.querySelector('#custom-action-input');
            const command = input.value.trim();
            if (!command) return;

            target.disabled = true;
            target.textContent = 'Executing...';

            try {
                const userActions = await import('./userActions.js');
                await userActions.executeCustomAction(command, participant, target);
            } catch (error) {
                console.error("Custom action failed:", error);
                chat.addSystemMessage("An error occurred while executing the custom action.");
                target.disabled = false;
                target.textContent = 'Execute';
            } finally {
                hideCustomActionModal();
            }
        }
    });
}

function initializeAddCustomPanelButtonModalListener() {
    const modal = ui.elements.addCustomPanelButtonModal;
    if (!modal) return;

    modal.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.id === 'custom-panel-button-cancel' || target.classList.contains('modal-cancel-button')) {
            hideAddCustomPanelButtonModal();
            return;
        }

        if (target.id === 'create-custom-panel-button') {
            const labelInput = modal.querySelector('#custom-button-label-input');
            const actionInput = modal.querySelector('#custom-button-action-input');
            
            const label = labelInput.value.trim();
            const action = actionInput.value.trim();

            if (!label || !action) {
                alert('Please provide both a label and an action description.');
                return;
            }

            // --- Create the button and add it to the panel ---
            const newButton = document.createElement('button');
            newButton.className = 'admin-button custom-admin-button';
            newButton.textContent = label;
            newButton.dataset.customAction = action;
            newButton.title = `Action: "${action}"`; // Tooltip for clarity

            // --- Add the click listener to the new button ---
            newButton.addEventListener('click', async () => {
                const userActions = await import('./userActions.js');
                const command = newButton.dataset.customAction;
                // Pass the button element so it can show loading state
                await userActions.handleCustomPanelButtonClick(command, newButton);
            });

            // --- Append and finalize ---
            ui.elements.customButtonsContainer.appendChild(newButton);
            hideAddCustomPanelButtonModal();
        }
    });
}

/**
 * Initializes the suggestion modal event listener.
 */
function initializeSuggestionModalListener() {
    ui.elements.suggestionModal.addEventListener('click', async (e) => {
        if (e.target.id === 'suggestion-send') {
            const suggestionText = ui.elements.suggestionInput.value.trim();
            if (suggestionText) {
                const sendButton = e.target;
                sendButton.disabled = true;
                sendButton.textContent = 'Sending...';

                try {
                    const result = await window.websim.postComment({
                        content: suggestionText
                    });

                    if (result && result.error) {
                        alert(`Failed to submit suggestion: ${result.error}`);
                    } else {
                        alert('Thank you for your suggestion!');
                    }
                } catch (error) {
                    console.error('Error submitting suggestion:', error);
                    alert('An unexpected error occurred while submitting your suggestion.');
                } finally {
                    sendButton.disabled = false;
                    sendButton.textContent = 'Send';
                    hideSuggestionModal();
                }
            } else {
                alert('Please enter your suggestion before sending.');
            }
        } else if (e.target.id === 'suggestion-cancel') {
            hideSuggestionModal();
        }
    });
}

/**
 * Initializes the Give Ad modal event listener.
 */
function initializeGiveAdModalListener() {
    ui.elements.giveAdModal.addEventListener('click', async (e) => {
        if (e.target.id === 'give-ad-send') {
            if (state.selectedParticipants.length !== 1) {
                alert('Please select a single participant to give an ad to.');
                return;
            }
            const participant = state.selectedParticipants[0];

            const sendButton = e.target;
            sendButton.disabled = true;
            sendButton.textContent = 'Sending Ad...';

            try {
                giveAdToUser(participant.id);
            } catch (error) {
                console.error('Error giving ad:', error);
                chat.addSystemMessage("An error occurred while trying to give an ad.");
            } finally {
                sendButton.disabled = false;
                sendButton.textContent = ui.elements.giveAdSendButton.dataset.key ? (state.originalTexts[ui.elements.giveAdSendButton.dataset.key] || 'Send') : 'Send'; // Restore original 'Send' text
                hideGiveAdModal();
            }
        } else if (e.target.id === 'give-ad-cancel') {
            hideGiveAdModal();
        }
    });
}

/**
 * Initializes the Add Feature modal event listener.
 */
function initializeAddFeatureModalListener() {
    ui.elements.addFeatureModal.addEventListener('click', async (e) => {
        const target = e.target;
        if (target.id === 'add-feature-cancel' || target.classList.contains('modal-cancel-button')) {
            hideAddFeatureModal();
            return;
        }

        if (target.id === 'add-feature-send') {
            const featureDescription = ui.elements.featureDescriptionInput.value.trim();
            if (!featureDescription) {
                alert('Please describe the feature you want to add.');
                return;
            }

            target.disabled = true;
            target.textContent = 'Adding...';

            try {
                const feature = await api.fetchAndParseCustomFeature(featureDescription);
                await applyClientSideFeature(feature);
            } catch (error) {
                console.error('Error processing feature request:', error);
                chat.addSystemMessage("An error occurred while processing your feature request.");
            } finally {
                target.disabled = false;
                target.textContent = ui.elements.addFeatureSendButton.dataset.key ? (state.originalTexts[ui.elements.addFeatureSendButton.dataset.key] || 'Add Feature') : 'Add Feature';
                hideAddFeatureModal();
                ui.showMainMenu(); // Return to main menu after adding feature
            }
        }
    });
}

/**
 * NEW: Initializes the Set User Emoji modal event listener.
 */
function initializeSetUserEmojiModalListener() {
    ui.elements.setUserEmojiModal.addEventListener('click', async (e) => {
        const target = e.target;
        const participantId = ui.elements.setUserEmojiModal.dataset.targetParticipantId;
        const participant = state.getParticipantById(participantId);
        if (!participant) {
            console.error('Target participant not found for emoji modal.');
            hideSetUserEmojiModal();
            return;
        }

        if (target.id === 'set-user-emoji-send') {
            const emoji = ui.elements.setUserEmojiInput.value.trim();
            if (emoji) {
                // Basic emoji validation
                if (emoji.length > 2 || !/\p{Emoji}/u.test(emoji)) {
                    alert('Please enter a single emoji character.');
                    return;
                }
                participants.setUserEmoji(participant.id, emoji);
                chat.addSystemMessage(`${participant.name}'s avatar now displays: ${emoji}`);
                bot.triggerBotMessage(null, `The admin just put a ${emoji} emoji on ${participant.name}'s avatar!`);
            } else {
                // If empty, remove the custom emoji
                participants.setUserEmoji(participant.id, null);
                chat.addSystemMessage(`${participant.name}'s custom emoji was removed.`);
                bot.triggerBotMessage(null, `The admin just removed the emoji from ${participant.name}'s avatar!`);
            }
            hideSetUserEmojiModal();
        } else if (target.id === 'set-user-emoji-cancel') {
            hideSetUserEmojiModal();
        }
    });
}

function initializeClipsLogModalListener() {
    ui.elements.clipsLogModal.addEventListener('click', (e) => {
        if (e.target.id === 'clips-log-close' || e.target.classList.contains('modal-cancel-button')) {
            hideClipsLogModal();
        }
    });
}

/**
 * Binds event listeners for all modals.
 */
export function initializeModalEventListeners() {
    initializeMuteModalListener();
    initializeSetMoodModalListener();
    initializeSetPersonalityModalListener();
    initializeSetAgeModalListener();
    initializeAdminMessageModalListener();
    initializeChangeNicknameModalListener();
    initializeImpersonateModalListener();
    initializeSayAsModalListener(); // NEW
    initializeRulesModalListener();
    initializePollModalListener();
    initializeGameOverListener();
    initializeStoryIntroListener();
    initializeChatCorruptedListener();
    initializeObeyModalListener();
    initializeAddCustomUserModalListener();
    initializeAddWebsimUserModalListener();
    initializeCustomActionModalListener();
    initializeAddCustomPanelButtonModalListener();
    initializeSuggestionModalListener(); // New: Initialize suggestion modal listener
    initializeGiveAdModalListener(); // New: Initialize give ad modal listener
    initializeAddFeatureModalListener(); // NEW: Initialize Add Feature modal listener
    initializeSetUserEmojiModalListener(); // NEW: Initialize Set User Emoji modal listener
    initializeClipsLogModalListener(); // NEW: Initialize Clips Log listener

    // Settings Modal
    if (ui.elements.settingsModal) {
        ui.elements.volumeSlider.addEventListener('input', (e) => {
            import('./audio.js').then(audio => {
                audio.setMusicVolume(e.target.value);
            });
        });
        // NEW: Add listener for allow swearing toggle
        if (ui.elements.allowSwearingCheckbox) {
            ui.elements.allowSwearingCheckbox.addEventListener('change', (e) => {
                state.setAllowSwearing(e.target.checked);
            });
        }
        // NEW: Add listener for TTS toggle
        if (ui.elements.ttsToggle) {
            ui.elements.ttsToggle.addEventListener('change', (e) => {
                state.setIsTtsEnabled(e.target.checked);
            });
        }
        document.getElementById('settings-close-button').addEventListener('click', hideSettingsModal);
    }
}