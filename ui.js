// This file handles all DOM manipulation and UI updates.
// REFACTORING NOTE: Most UI update functions have been moved to more specific modules
// like `chat.js`, `participants.js`, and `modals.js`. This file now primarily
// holds the DOM element cache and very generic UI state functions.

import * as state from './state.js';
import { approveJoinRequest, denyJoinRequest } from './multiplayer.js'; // Import host actions
import { room } from './multiplayer.js'; // Import the room object

// --- DOM Element Selectors ---
export const elements = {};

// New function to cache all DOM elements once the DOM is ready
export function cacheDOMElements() {
    elements.langButton = document.getElementById('language-button');
    elements.langDropdown = document.getElementById('language-dropdown');
    elements.translatableElements = document.querySelectorAll('[data-key]');
    elements.startButton = document.getElementById('start-button');
    elements.saveButton = document.getElementById('save-button');
    elements.loadButton = document.getElementById('load-button');
    
    elements.saveClipButton = document.getElementById('save-clip-button'); // NEW
    elements.viewClipsButton = document.getElementById('view-clips-button'); // NEW
    
    elements.menuContainer = document.getElementById('menu-container');
    elements.gamemodeContainer = document.getElementById('gamemode-container');
    elements.joinRoomButton = document.getElementById('join-room-button');
    elements.roomCodeInput = document.getElementById('room-code-input');
    elements.sandboxButton = document.getElementById('sandbox-button');
    elements.storyButton = document.getElementById('story-button');
    elements.playerButton = document.getElementById('player-button');
    elements.hackerButton = document.getElementById('hacker-button');
    elements.backButton = document.getElementById('back-button');
    elements.chatContainer = document.getElementById('chat-container');
    elements.suggestionsButton = document.getElementById('suggestions-button');
    elements.addFeatureButton = document.getElementById('add-feature-button');

    elements.hackerLobbyContainer = document.getElementById('hacker-lobby-container');
    elements.hackerChatList = document.getElementById('hacker-chat-list');
    elements.hackerBackButton = document.getElementById('hacker-back-button');

    elements.buddyLoveLobbyContainer = document.getElementById('buddylove-lobby-container');
    elements.buddyLoveRoomList = document.getElementById('buddylove-room-list');
    elements.buddyLoveBackButton = document.getElementById('buddylove-back-button');

    elements.participantsList = document.getElementById('participants-list');
    elements.messageForm = document.getElementById('message-form');
    elements.messageInput = document.getElementById('message-input');
    elements.messagesContainer = document.getElementById('messages-container');
    elements.typingIndicator = document.getElementById('typing-indicator');
    elements.sendButton = document.getElementById('send-button');

    elements.replyIndicator = document.getElementById('reply-indicator');
    elements.replyIndicatorText = document.getElementById('reply-indicator-text');
    elements.cancelReplyButton = document.getElementById('cancel-reply-button');
    elements.mentionSuggestions = document.getElementById('mention-suggestions');

    elements.adminPanel = document.getElementById('admin-panel');
    elements.adminPanelTitle = document.getElementById('admin-panel-title');
    elements.adminActions = document.getElementById('admin-actions');
    elements.warnButton = document.getElementById('warn-button');
    elements.muteButton = document.getElementById('mute-button');
    elements.banButton = document.getElementById('ban-button');
    elements.impersonateButton = document.getElementById('impersonate-button');
    elements.sayButton = document.getElementById('say-button'); // NEW: Say button
    elements.mentionUserButton = document.getElementById('mention-user-button');
    elements.adminMsgButton = document.getElementById('admin-msg-button');
    elements.updateRulesButton = document.getElementById('update-rules-button');
    elements.toggleVipButton = document.getElementById('toggle-vip-button');
    elements.changeNicknameButton = document.getElementById('change-nickname-button');
    elements.summonViolatorButton = document.getElementById('summon-violator-button');
    elements.summonHackerButton = document.getElementById('summon-hacker-button');
    elements.addBotButton = document.getElementById('add-bot-button');
    elements.toggleSlowModeButton = document.getElementById('toggle-slow-mode-button');
    elements.toggleChatLockButton = document.getElementById('toggle-chat-lock-button');
    elements.toggleImagesButton = document.getElementById('toggle-images-button');
    elements.clearChatButton = document.getElementById('clear-chat-button');
    elements.shuffleNicknamesButton = document.getElementById('shuffle-nicknames-button');
    elements.setMoodButton = document.getElementById('set-mood-button');
    elements.setPersonalityButton = document.getElementById('set-personality-button');
    elements.setAgeButton = document.getElementById('set-age-button');
    elements.setLocationButton = document.getElementById('set-location-button');
    elements.spotlightMessageButton = document.getElementById('spotlight-message-button');
    elements.runPollButton = document.getElementById('run-poll-button');
    elements.triggerEventButton = document.getElementById('trigger-event-button');
    elements.participantsTitle = document.getElementById('participants-title');

    elements.resetUserButton = document.getElementById('reset-user-button');
    elements.freezeChatButton = document.getElementById('freeze-chat-button');
    elements.randomMoodButton = document.getElementById('random-mood-button');
    elements.revealPersonalityButton = document.getElementById('reveal-personality-button');
    elements.revealAgeButton = document.getElementById('reveal-age-button');
    elements.obeyButton = document.getElementById('obey-button');
    elements.promoteModButton = document.getElementById('promote-mod-button');
    elements.promoteCoAdminButton = document.getElementById('promote-co-admin-button');
    elements.demoteCoAdminButton = document.getElementById('demote-co-admin-button');
    elements.setUserEmojiButton = document.getElementById('set-user-emoji-button');
    elements.removeHackedStatusButton = document.getElementById('remove-hacked-status-button');
    elements.giveComplimentButton = document.getElementById('give-compliment-button');
    elements.toggleNicknamePrefixButton = document.getElementById('toggle-nickname-prefix-button');
    elements.startCountdownButton = document.getElementById('start-countdown-button');
    elements.toggleChatBackgroundEffectButton = document.getElementById('toggle-chat-background-effect-button');
    elements.massResetMoodButton = document.getElementById('mass-reset-mood-button');
    elements.controlUserButton = document.getElementById('control-user-button');
    elements.stopControlButton = document.getElementById('stop-control-button');
    elements.addCustomUserButton = document.getElementById('add-custom-user-button');
    elements.addWebsimUserButton = document.getElementById('add-websim-user-button');
    elements.joinAsPlayerButton = document.getElementById('join-as-player-button');
    elements.customActionButton = document.getElementById('custom-action-button');
    elements.addCustomPanelButton = document.getElementById('add-custom-panel-button');
    elements.customButtonsContainer = document.getElementById('custom-buttons-container');
    elements.changeMyNicknameButton = document.getElementById('change-my-nickname-button');
    elements.changeMyMoodButton = document.getElementById('change-my-mood-button');
    elements.crashServerButton = document.getElementById('crash-server-button');
    elements.corruptServerButton = document.getElementById('corrupt-server-button');
    elements.massObeyButton = document.getElementById('mass-obey-button');
    elements.mindControlButton = document.getElementById('mind-control-button');
    elements.turnThrallButton = document.getElementById('turn-thrall-button');
    elements.virusSpreadButton = document.getElementById('virus-spread-button');
    elements.dataTheftButton = document.getElementById('data-theft-button');
    elements.systemBackdoorButton = document.getElementById('system-backdoor-button');
    elements.cloneUserButton = document.getElementById('clone-user-button');
    elements.realityDistortButton = document.getElementById('reality-distort-button');
    elements.timeManipButton = document.getElementById('time-manip-button');
    elements.memoryWipeButton = document.getElementById('memory-wipe-button');
    elements.puppetMasterButton = document.getElementById('puppet-master-button');
    elements.systemOverloadButton = document.getElementById('system-overload-button');
    elements.digitalPossessionButton = document.getElementById('digital-possession-button');
    
    elements.giveAdButton = document.getElementById('give-ad-button');

    elements.hackerStatsPanel = document.getElementById('hacker-stats-panel');
    elements.hackerLevelText = document.getElementById('hacker-level');
    elements.hackerExpBar = document.getElementById('hacker-exp-bar');
    elements.hackerExpFill = document.getElementById('hacker-exp-fill');
    elements.systemCorruptionBar = document.getElementById('system-corruption-bar');
    elements.systemCorruptionFill = document.getElementById('system-corruption-fill');

    elements.playerModePanel = document.getElementById('player-mode-panel');
    elements.moodSelector = document.getElementById('mood-selector');

    elements.reputationContainer = document.getElementById('reputation-container');
    elements.reputationFill = document.getElementById('reputation-fill');
    elements.reputationText = document.getElementById('reputation-text');
    elements.taskNotificationContainer = document.getElementById('task-notification-container');

    elements.overlay = document.getElementById('overlay');
    elements.muteModal = document.getElementById('mute-modal');
    elements.muteModalText = document.getElementById('mute-modal-text');
    elements.adminMessageModal = document.getElementById('admin-message-modal');
    elements.adminMessageInput = document.getElementById('admin-message-input');
    elements.impersonateModal = document.getElementById('impersonate-modal');
    elements.impersonateModalTitle = document.getElementById('impersonate-modal-title');
    elements.impersonateModalText = document.getElementById('impersonate-modal-text');
    elements.impersonateMessageInput = document.getElementById('impersonate-message-input');
    elements.sayAsModal = document.getElementById('say-as-modal'); // NEW: Say modal
    elements.sayAsInput = document.getElementById('say-as-input'); // NEW: Say modal textarea
    elements.rulesModal = document.getElementById('rules-modal');
    elements.rulesInput = document.getElementById('rules-input');
    elements.changeNicknameModal = document.getElementById('change-nickname-modal');
    elements.changeNicknameModalTitle = document.getElementById('change-nickname-modal-title');
    elements.changeNicknameModalText = document.getElementById('change-nickname-modal-text');
    elements.changeNicknameInput = document.getElementById('change-nickname-input');
    elements.pollModal = document.getElementById('poll-modal');
    elements.pollQuestionInput = document.getElementById('poll-question-input');
    elements.pollOptionsInput = document.getElementById('poll-options-input');
    elements.setMoodModal = document.getElementById('set-mood-modal');
    elements.setMoodModalTitle = document.getElementById('set-mood-modal-title');
    elements.setMoodOptions = document.getElementById('set-mood-options');
    elements.setPersonalityModal = document.getElementById('set-personality-modal');
    elements.setPersonalityModalTitle = document.getElementById('set-personality-modal-title');
    elements.setPersonalityOptions = document.getElementById('set-personality-options');
    elements.setAgeModal = document.getElementById('set-age-modal');
    elements.setAgeModalTitle = document.getElementById('set-age-modal-title');
    elements.setAgeModalText = document.getElementById('set-age-modal-text');
    elements.setAgeInput = document.getElementById('set-age-input');
    elements.gameOverModal = document.getElementById('game-over-modal');
    elements.gameOverText = document.getElementById('game-over-text');
    elements.storyIntroModal = document.getElementById('story-intro-modal');
    elements.chatCorruptedModal = document.getElementById('chat-corrupted-modal');
    elements.obeyModal = document.getElementById('obey-modal');
    elements.obeyModalTitle = document.getElementById('obey-modal-title');
    elements.obeyModalText = document.getElementById('obey-modal-text');
    elements.obeyCommandInput = document.getElementById('obey-command-input');
    elements.addCustomUserModal = document.getElementById('add-custom-user-modal');
    elements.addWebsimUserModal = document.getElementById('add-websim-user-modal');
    elements.customActionModal = document.getElementById('custom-action-modal');
    elements.addCustomPanelButtonModal = document.getElementById('add-custom-panel-button-modal');

    elements.crashOpModal = document.getElementById('crash-operation-modal');
    elements.crashOpTitle = document.getElementById('crash-op-title');
    elements.crashOpPhase = document.getElementById('crash-op-phase');
    elements.crashOpProgressBar = document.getElementById('crash-op-progress');
    elements.crashOpProgressText = document.getElementById('crash-op-progress-text');
    elements.crashOpDetectText = document.getElementById('crash-op-detect-text');
    elements.crashOpLog = document.getElementById('crash-op-log');
    elements.crashOpActions = document.getElementById('crash-op-actions');
    elements.crashOpAbort = document.getElementById('crash-op-abort');

    elements.settingsModal = document.getElementById('settings-modal');
    elements.volumeSlider = document.getElementById('volume-slider');
    elements.settingsButton = document.getElementById('settings-button');
    elements.allowSwearingCheckbox = document.getElementById('allow-swearing-toggle'); // NEW: Swearing toggle

    elements.ttsToggle = document.getElementById('tts-toggle'); // NEW: TTS toggle

    elements.bossContainer = document.getElementById('boss-container');
    elements.bossName = document.getElementById('boss-name');
    elements.bossHpBar = document.getElementById('boss-hp-bar');
    elements.bossHpFill = document.getElementById('boss-hp-fill');
    elements.bossHpText = document.getElementById('boss-hp-text');
    elements.glitchOverlay = document.getElementById('glitch-overlay');
    elements.bossFightActions = document.getElementById('boss-fight-actions');
    elements.unwarnPlayerButton = document.getElementById('unwarn-player-button');
    elements.unmutePlayerButton = document.getElementById('unmute-player-button');
    elements.selectionInfo = document.getElementById('selection-info');
    elements.locationDisplay = document.getElementById('location-display');
    elements.roomCodeDisplay = document.getElementById('room-code-display');
    elements.creditsButton = document.getElementById('credits-button');
    elements.fullscreenButton = document.getElementById('fullscreen-button'); // NEW: cache fullscreen button
    
    elements.suggestionModal = document.getElementById('suggestion-modal');
    elements.suggestionInput = document.getElementById('suggestion-input');
    elements.suggestionSendButton = document.getElementById('suggestion-send');
    elements.suggestionCancelButton = document.getElementById('suggestion-cancel');

    elements.giveAdModal = document.getElementById('give-ad-modal');
    elements.giveAdSendButton = document.getElementById('give-ad-send');
    elements.giveAdCancelButton = document.getElementById('give-ad-cancel');

    elements.addFeatureModal = document.getElementById('add-feature-modal');
    elements.featureDescriptionInput = document.getElementById('feature-description-input');
    elements.addFeatureSendButton = document.getElementById('add-feature-send');
    elements.addFeatureCancelButton = document.getElementById('add-feature-cancel');

    elements.waitingForApprovalScreen = document.getElementById('waiting-for-approval-screen');
    elements.waitingRoomCodeDisplay = document.getElementById('waiting-room-code-display');

    elements.joinRequestPanel = document.getElementById('join-request-panel');
    elements.joinRequestList = document.getElementById('join-request-list');

    // NEW: Set User Emoji Modal elements
    elements.setUserEmojiModal = document.getElementById('set-user-emoji-modal');
    elements.setUserEmojiModalTitle = document.getElementById('set-user-emoji-modal-title');
    elements.setUserEmojiPreview = document.getElementById('set-user-emoji-preview');
    elements.setUserEmojiInput = document.getElementById('set-user-emoji-input');
    elements.setUserEmojiSend = document.getElementById('set-user-emoji-send');
    elements.setUserEmojiCancel = document.getElementById('set-user-emoji-cancel');
    
    elements.clipsLogModal = document.getElementById('clips-log-modal'); // NEW
    elements.clipsList = document.getElementById('clips-list'); // NEW

    // Hacker sandbox button (used by events.js)
    elements.hackerSandboxButton = document.getElementById('hacker-sandbox-button');
    
    // Hacker Lobby - not present in the /a build HTML, will be null if accessed.
    // elements.hackerLobby = document.getElementById('hacker-lobby');
    // elements.hackerLobbyTitle = document.getElementById('hacker-lobby-title');
    // elements.hackerLobbyDescription = document.getElementById('hacker-lobby-description');
    // elements.hackerLobbyButton = document.getElementById('hacker-lobby-button');
}

/**
 * Shows the gamemode selection screen.
 */
export function showGamemodeSelection() {
    elements.menuContainer.classList.add('hidden');
    elements.gamemodeContainer.classList.remove('hidden');
    elements.hackerLobbyContainer.classList.add('hidden'); // Ensure hacker lobby is hidden
    elements.buddyLoveLobbyContainer.classList.add('hidden'); // Ensure BuddyLove lobby is hidden
    elements.creditsButton.classList.add('hidden');
}

/**
 * Shows the Hacker Lobby screen, or BuddyLove's lobby if user is BuddyLove13.
 */
export function showHackerLobbyView() {
    elements.chatContainer.classList.add('hidden', 'visible');
    elements.menuContainer.classList.add('hidden');
    elements.gamemodeContainer.classList.add('hidden');
    elements.creditsButton.classList.add('hidden');

    if (room && room.username === "BuddyLove13") {
        elements.hackerLobbyContainer.classList.add('hidden');
        elements.buddyLoveLobbyContainer.classList.remove('hidden');
        renderBuddyLoveRoomList();
    } else {
        elements.buddyLoveLobbyContainer.classList.add('hidden');
        elements.hackerLobbyContainer.classList.remove('hidden');
        renderHackerChatList();
    }
}

/**
 * Renders the dynamically generated hacker chat list.
 */
function renderHackerChatList() {
    const list = elements.hackerChatList;
    list.innerHTML = '';
    const serverCount = Math.floor(Math.random() * 5) + 5; // 5-9 servers

    for (let i = 0; i < serverCount; i++) {
        const li = document.createElement('li');
        const userCount = Math.floor(Math.random() * 11) + 3; // 3-13 users
        const maxUsers = 15;
        const adminCount = Math.max(1, Math.floor(userCount / 5)); // at least 1 admin
        const protection = ['Weak', 'Moderate', 'Strong'][Math.floor(Math.random() * 3)];
        li.innerHTML = `<span>Chat Server #${i + 1}</span> <span>${userCount}/${maxUsers} Users · Admins: ${adminCount} · Shield: ${protection}</span>`;
        li.dataset.userCount = userCount;
        li.dataset.adminCount = adminCount;
        li.dataset.protection = protection;
        list.appendChild(li);
    }
}

/**
 * Renders BuddyLove13's specific room list. (Simulated for now, as global discovery is not possible).
 */
function renderBuddyLoveRoomList() {
    const list = elements.buddyLoveRoomList;
    list.innerHTML = '';
    const fixedRoomCount = 10; // BuddyLove13 sees a consistent, larger list of "active" rooms

    for (let i = 0; i < fixedRoomCount; i++) {
        const li = document.createElement('li');
        const userCount = Math.floor(Math.random() * 20) + 5; // 5-25 users
        const maxUsers = 30;
        const adminCount = Math.max(1, Math.floor(userCount / 8)); // at least 1 admin
        const activity = ['High', 'Moderate', 'Low', 'Critical'][Math.floor(Math.random() * 4)];
        const roomCode = `BL${(10000 + i).toString().slice(1)}`; // Mock room code
        li.innerHTML = `<span>Room ${roomCode}</span> <span>${userCount}/${maxUsers} Users · Admins: ${adminCount} · Activity: ${activity}</span>`;
        li.dataset.roomCode = roomCode;
        list.appendChild(li);
    }
}

/**
 * Shows the main menu.
 */
export function showMainMenu() {
    elements.gamemodeContainer.classList.add('hidden');
    elements.hackerLobbyContainer.classList.add('hidden');
    elements.buddyLoveLobbyContainer.classList.add('hidden'); // Hide BuddyLove lobby
    elements.chatContainer.classList.add('hidden'); // Ensure chat is hidden when returning to main menu
    elements.menuContainer.classList.remove('hidden');
    elements.creditsButton.classList.remove('hidden');
    elements.waitingForApprovalScreen?.classList.add('hidden'); // Hide approval screen if returning to main menu
    elements.joinRequestPanel?.classList.add('hidden'); // Hide host join request panel
}

/**
 * Shows the chat interface with the appropriate panel based on game mode.
 */
export function showChatView() {
    elements.gamemodeContainer.classList.add('hidden');
    elements.menuContainer.classList.add('hidden');
    elements.hackerLobbyContainer.classList.add('hidden');
    elements.buddyLoveLobbyContainer.classList.add('hidden'); // Hide BuddyLove lobby
    elements.chatContainer.classList.remove('hidden');
    elements.creditsButton.classList.add('hidden');
    elements.waitingForApprovalScreen?.classList.add('hidden'); // Hide approval screen if chat view is shown

    // Show join request panel for host
    if (state.roomCode) { // Only if this instance is a host
        elements.joinRequestPanel?.classList.remove('hidden');
    }
    
    if (state.gameMode === 'story') {
        elements.reputationContainer.classList.remove('hidden');
    } else {
        elements.reputationContainer.classList.add('hidden');
    }
    
    // Show appropriate panel based on game mode
    if (state.gameMode === 'player') {
        elements.adminPanel.style.display = 'none';
        elements.playerModePanel.style.display = 'flex';
        createMoodSelector();
    } else { // Covers 'sandbox', 'story', and 'hacker' modes
        elements.adminPanel.style.display = 'flex';
        if (elements.playerModePanel) {
            elements.playerModePanel.style.display = 'none';
        }
    }
    
    setAdminPanelForMode();
    refreshHackerButtons(); // ensure proper disabled state right away

    setTimeout(() => {
        elements.chatContainer.classList.add('visible');
    }, 10);

    // Show hacker stats in hacker mode
    if (state.gameMode === 'hacker') {
        showHackerStats();
    }
}

/**
 * Displays the room code in the chat header.
 * @param {string} code The room code to display.
 */
export function displayRoomCode(code) {
    if (elements.roomCodeDisplay) {
        elements.roomCodeDisplay.textContent = `CODE: ${code}`;
        elements.roomCodeDisplay.classList.remove('hidden');
    }
}

/**
 * Updates the location display in the chat header.
 * @param {string} location
 */
export function updateLocationDisplay(location) {
    if (elements.locationDisplay) {
        elements.locationDisplay.textContent = `Location: ${location}`;
    }
}

/**
 * Hides specific admin buttons if the game mode is 'story'.
 */
export function setAdminPanelForMode() {
    const storyModeButtonsToHide = [
        'impersonate-button',
        'change-nickname-button',
        'reset-user-button',
        'add-bot-button',
        'summon-violator-button',
        'summon-hacker-button',
        'toggle-chat-lock-button',
        'freeze-chat-button',
        'clear-chat-button',
        'shuffle-nicknames-button',
        'set-mood-button',
        'random-mood-button',
        'spotlight-message-button',
        'trigger-event-button',
        'reveal-personality-button',
        'reveal-age-button',
        'update-rules-button',
        'obey-button',
        'crash-server-button',
        'corrupt-server-button',
        'mass-obey-button',
        'mind-control-button',
        'turn-thrall-button',
        'virus-spread-button',
        'data-theft-button',
        'system-backdoor-button',
        'clone-user-button',
        'reality-distort-button',
        'time-manip-button',
        'memory-wipe-button',
        'puppet-master-button',
        'system-overload-button',
        'digital-possession-button',
        'custom-action-button', // Hide custom actions in story mode
        'add-custom-panel-button', // Hide custom panel buttons in story mode
        'add-custom-user-button', // Hide add custom user in story mode
        'change-my-nickname-button', // Hide player's nickname change in story mode
        'give-ad-button', // Hide give ad button in story mode
    ];

    const sandboxOnlyItems = document.querySelectorAll('.sandbox-only-item');

    const allElements = elements.adminActions.querySelectorAll('button, hr');
    allElements.forEach(el => el.style.display = ''); // Reset all first

    // Reset texts that might be changed by modes
    elements.adminPanelTitle.textContent = state.originalTexts['adminPanelTitle'] || 'Admin Panel';
    const warnKey = elements.warnButton.dataset.key || 'warnButton';
    elements.warnButton.textContent = state.originalTexts[warnKey] || 'Warn';

    // Remove any existing "return-to-admin-panel-button" to avoid duplicates
    const existingReturnBtn = document.getElementById('return-to-admin-panel-button');
    if (existingReturnBtn) existingReturnBtn.remove();

    if (state.gameMode === 'story') {
        storyModeButtonsToHide.forEach(id => {
            const button = document.getElementById(id);
            if (button) button.style.display = 'none';
        });
        sandboxOnlyItems.forEach(item => item.style.display = 'none');
    } else if (state.gameMode === 'hacker' || state.gameMode === 'hacker_sandbox') {
        // Make sure admin panel is visible so the user can switch to it
        if (elements.adminPanel) elements.adminPanel.style.display = 'block';

        elements.adminPanelTitle.textContent = state.originalTexts.hackerToolsTitle || "Hacker Tools";

        // Hide all admin/sandbox-only buttons initially
        allElements.forEach(el => el.style.display = 'none');

        // Then selectively show Hacker tools and some common buttons
        const hackerButtonsAndShared = [
            'virus-spread-button', 'crash-server-button', 'corrupt-server-button',
            'data-theft-button', 'system-backdoor-button', 'clone-user-button',
            'reality-distort-button', 'time-manip-button', 'memory-wipe-button',
            'puppet-master-button', 'system-overload-button', 'digital-possession-button',
            // Also enable some general functions that a hacker might want to use
            'shuffle-nicknames-button', 'freeze-chat-button', 'clear-chat-button',
            'warn-button', 'ban-button'
        ];
        hackerButtonsAndShared.forEach(id => {
            const button = document.getElementById(id);
            if (button) button.style.display = 'block';
        });

        // Special text for warn button in hacker mode
        elements.warnButton.textContent = state.originalTexts.corruptButton || 'Corrupt';
        sandboxOnlyItems.forEach(item => item.style.display = 'none');

        // Add a "Return to Admin Panel" button inside the hacker tools for quick toggle
        // ONLY add this if the Konami code was activated
        if (state.konamiActivated) {
            const returnBtn = document.createElement('button');
            returnBtn.id = 'return-to-admin-panel-button';
            returnBtn.className = 'admin-button';
            returnBtn.textContent = 'Return to Admin Panel';
            returnBtn.style.borderColor = '#ffc400';
            returnBtn.style.color = '#ffc400';
            returnBtn.style.marginTop = '8px';
            // Insert near the top for visibility
            elements.adminActions.insertBefore(returnBtn, elements.adminActions.firstChild);

            // Clicking this will show the full Admin Panel (all admin buttons) and add a "Return to Hacker Tools" button
            returnBtn.addEventListener('click', () => {
                // Show full admin panel: reveal all non-hacker-specific buttons
                allElements.forEach(el => {
                    el.style.display = 'block';
                });

                // Hide hacker-only red styling and restore admin title
                elements.adminPanelTitle.textContent = state.originalTexts['adminPanelTitle'] || 'Admin Panel';

                // Add "Return to Hacker Tools" button if not present
                if (!document.getElementById('switch-to-hacker-tools-button')) {
                    const switchBtn = document.createElement('button');
                    switchBtn.id = 'switch-to-hacker-tools-button';
                    switchBtn.className = 'admin-button';
                    switchBtn.textContent = 'Return to Hacker Tools';
                    switchBtn.style.borderColor = '#ff4d4d';
                    switchBtn.style.color = '#ff4d4d';
                    switchBtn.style.marginTop = '8px';
                    elements.adminActions.insertBefore(switchBtn, elements.adminActions.firstChild);

                    switchBtn.addEventListener('click', () => {
                        // Restore hacker-only view
                        setAdminPanelForMode(); // re-run to set hacker view
                        // Remove this switch button
                        const el = document.getElementById('switch-to-hacker-tools-button');
                        if (el) el.remove();
                    });
                }

                // Remove the "Return to Admin Panel" button (we're now in Admin view)
                const rb = document.getElementById('return-to-admin-panel-button');
                if (rb) rb.remove();
            });
        }

    } else { // Sandbox and default
        elements.adminPanelTitle.textContent = state.originalTexts['adminPanelTitle'] || 'Admin Panel';
        // In sandbox, all buttons are visible initially if they are not specifically hacker-ability buttons
        allElements.forEach(el => {
            if (!el.classList.contains('hacker-ability')) {
                 el.style.display = 'block';
            } else {
                 el.style.display = 'none'; // Hacker abilities hidden by default in sandbox, only summonable
            }
        });
    }
    refreshHackerButtons();
}

/**
 * Creates the mood selector for player mode.
 */
function createMoodSelector() {
    const moodSelector = elements.moodSelector;
    if (!moodSelector) return;
    
    moodSelector.innerHTML = '';
    
    Object.keys(state.moodAvatars).forEach(mood => {
        const button = document.createElement('button');
        button.className = 'mood-button';
        button.textContent = mood;
        button.dataset.mood = mood;
        
        const player = state.getPlayer();
        if (player && player.mood === mood) {
            button.classList.add('current-mood');
        }
        
        moodSelector.appendChild(button);
    });
}

/**
 * Creates and displays a temporary task notification.
 * @param {string} title - The title of the notification.
 * @param {string} text - The body text of the notification.
 */
export function showTaskNotification(title, text) {
    const notification = document.createElement('div');
    notification.className = 'task-notification';
    notification.innerHTML = `<h4>${title}</h4><p>${text}</p>`;
    
    elements.taskNotificationContainer.appendChild(notification);

    // The animation will handle removal, but let's remove the element from the DOM after it's done.
    setTimeout(() => {
        notification.remove();
    }, 7500); // Animation is 7s + 0.5s fade-out
}

/**
 * Toggles the visual effect for the gravity event.
 * @param {boolean} active - Whether the effect should be active.
 */
export function toggleGravityEffect(active) {
    elements.messagesContainer.classList.toggle('gravity-effect', active);
    document.querySelectorAll('.message').forEach(msg => {
        msg.classList.toggle('gravity-effect', active);
    });
}

/**
 * Toggles a subtle background effect for the chat.
 * @param {boolean} active - Whether the effect should be active.
 */
export function toggleChatBackgroundEffect(active) {
    if (elements.chatContainer) {
        elements.chatContainer.classList.toggle('chat-background-effect', active);
    }
}

/**
 * Enables/disables admin action buttons based on participant selection.
 */
export function setAdminButtonState() {
    if (!elements) return;

    // If boss fight UI logic exists, keep it guarded
    if (state.bossFightActive) {
        const target = state.participantToSave;
        const correctParticipantSelected = state.selectedParticipants && state.selectedParticipants.length === 1 && target && state.selectedParticipants[0].id === target.id;

        if (elements.unwarnPlayerButton) elements.unwarnPlayerButton.disabled = !(target && target.type === 'warn' && correctParticipantSelected);
        if (elements.unmutePlayerButton) elements.unmutePlayerButton.disabled = !(target && target.type === 'mute' && correctParticipantSelected);

        const hackerSelected = state.selectedParticipants && state.selectedParticipants.length === 1 && state.selectedParticipants[0].id === state.hackerParticipantId;
        if (elements.banButton) elements.banButton.disabled = !hackerSelected;
        return;
    }

    const selectionCount = state.selectedParticipants ? state.selectedParticipants.length : 0;
    const adminId = state.getPlayer()?.id;
    const isAnyUserSelected = selectionCount > 0 && state.selectedParticipants.some(p => p && p.id !== adminId);
    const isSingleUserSelected = selectionCount === 1 && state.selectedParticipants[0] && state.selectedParticipants[0].id !== adminId;
    const isAnyMuted = state.selectedParticipants.some(p => p && p.mutedUntil && p.mutedUntil > Date.now());

    if (elements.warnButton) elements.warnButton.disabled = !isAnyUserSelected;
    if (elements.muteButton) elements.muteButton.disabled = !isAnyUserSelected || isAnyMuted;
    if (elements.banButton) elements.banButton.disabled = !isAnyUserSelected;
    if (elements.toggleVipButton) elements.toggleVipButton.disabled = !isAnyUserSelected;
    if (elements.resetUserButton) elements.resetUserButton.disabled = !isAnyUserSelected;
    if (elements.randomMoodButton) elements.randomMoodButton.disabled = !isAnyUserSelected;
    if (elements.revealPersonalityButton) elements.revealPersonalityButton.disabled = !isAnyUserSelected;
    if (elements.giveAdButton) elements.giveAdButton.disabled = !isSingleUserSelected;

    // Single-selection actions
    if (elements.impersonateButton) elements.impersonateButton.disabled = !isSingleUserSelected;
    if (elements.mentionUserButton) elements.mentionUserButton.disabled = !isSingleUserSelected;
    if (elements.changeNicknameButton) elements.changeNicknameButton.disabled = !isSingleUserSelected;
    if (elements.setMoodButton) elements.setMoodButton.disabled = !isSingleUserSelected;
    if (elements.setPersonalityButton) elements.setPersonalityButton.disabled = !isSingleUserSelected;
    if (elements.setAgeButton) elements.setAgeButton.disabled = !isSingleUserSelected;
    if (elements.spotlightMessageButton) elements.spotlightMessageButton.disabled = !isSingleUserSelected;
    if (elements.obeyButton) elements.obeyButton.disabled = !isSingleUserSelected;

    // Sandbox buttons
    if (elements.promoteModButton) {
        elements.promoteModButton.disabled = !isSingleUserSelected;
        if (isSingleUserSelected) {
            const participant = state.selectedParticipants[0];
            const key = elements.promoteModButton.dataset?.key || 'promoteModButton';
            elements.promoteModButton.textContent = participant?.isMod ? 'Demote Mod' : (state.originalTexts[key] || 'Promote to Mod');
        }
    }
    if (elements.controlUserButton) {
        elements.controlUserButton.disabled = !isSingleUserSelected || state.controlledUser !== null;
        elements.controlUserButton.style.display = state.controlledUser ? 'none' : 'block';
    }
    if (elements.stopControlButton) {
        elements.stopControlButton.style.display = state.controlledUser ? 'block' : 'none';
        elements.stopControlButton.disabled = !state.controlledUser;
    }
    if (elements.addCustomUserButton) {
        elements.addCustomUserButton.disabled = false;
    }
    if (elements.customActionButton) {
        elements.customActionButton.disabled = !isSingleUserSelected;
    }
    if (elements.changeMyNicknameButton) {
        elements.changeMyNicknameButton.disabled = state.gameMode !== 'sandbox';
    }

    // Update selection info text
    if (elements.selectionInfo) {
        if (selectionCount > 0) {
            elements.selectionInfo.textContent = `${selectionCount} selected`;
            elements.selectionInfo.classList.remove('hidden');
        } else {
            elements.selectionInfo.classList.add('hidden');
        }
    }

    // Update control indicator text and visibility
    if (elements.controlIndicator) {
        if (state.controlledUser) {
            const controlledParticipant = state.getParticipantById(state.controlledUser);
            if (controlledParticipant) {
                elements.controlIndicator.textContent = `CONTROLLING: ${controlledParticipant.name}`;
                elements.controlIndicator.classList.remove('hidden');
            } else {
                state.setControlledUser(null);
                elements.controlIndicator.classList.add('hidden');
            }
        } else {
            elements.controlIndicator.classList.add('hidden');
        }
    }
}

export function updateReputationBar(reputation) {
    elements.reputationFill.style.width = `${reputation}%`;
    elements.reputationText.textContent = `${Math.round(reputation)}%`;

    // Change color based on reputation
    if (reputation <= 25) {
        elements.reputationFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4d4d)';
    } else if (reputation <= 50) {
        elements.reputationFill.style.background = 'linear-gradient(90deg, #ffc400, #ffe066)';
    } else {
        elements.reputationFill.style.background = 'linear-gradient(90deg, #0077ff, #00aaff)';
    }
}

// --- Boss Fight UI Functions ---
export function showBossUI(hackerName) {
    elements.bossContainer.classList.remove('hidden');
    elements.bossName.textContent = hackerName;
    updateBossHP(100);
}

export function hideBossUI() {
    elements.bossContainer.classList.add('hidden');
}

export function updateBossHP(hp) {
    elements.bossHpFill.style.width = `${hp}%`;
    elements.bossHpText.textContent = `${Math.round(hp)}%`;
}

export function toggleGlitchEffect(active) {
    elements.glitchOverlay.classList.toggle('hidden', !active);
}

export function setupBossAdminPanel() {
    // Hide all normal admin actions except 'Ban'
    for (const child of elements.adminActions.children) {
        if (child.id !== 'ban-button') {
            child.style.display = 'none';
        } else {
            child.style.display = 'block';
        }
    }
    elements.bossFightActions.classList.remove('hidden');
    elements.unwarnPlayerButton.disabled = true;
    elements.unmutePlayerButton.disabled = true;
}

export function restoreDefaultAdminPanel() {
    // Restore all admin actions based on the current game mode.
    setAdminPanelForMode();
    elements.bossFightActions.classList.add('hidden');
}
// --- End Boss Fight UI Functions ---

/**
 * Shows the Hacker Stats panel and updates it
 */
export function showHackerStats() {
    if (elements.hackerStatsPanel) {
        // Hide the hacker stats panel in hacker mode to avoid conflict with hacker tools panel
        elements.hackerStatsPanel.classList.add('hidden');
        updateHackerStats();
    }
}

/**
 * Updates the hacker stats display
 */
export function updateHackerStats() {
    if (elements.hackerLevelText) {
        elements.hackerLevelText.textContent = `Level ${state.hackerLevel}`;
    }
    
    if (elements.hackerExpFill) {
        const expPercent = (state.hackerExp % 100);
        elements.hackerExpFill.style.width = `${expPercent}%`;
    }
    
    if (elements.systemCorruptionFill) {
        elements.systemCorruptionFill.style.width = `${state.systemCorruption}%`;
        // Change color based on corruption level
        if (state.systemCorruption > 75) {
            elements.systemCorruptionFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4d4d)';
        } else if (state.systemCorruption > 50) {
            elements.systemCorruptionFill.style.background = 'linear-gradient(90deg, #ff8800, #ffaa00)';
        } else {
            elements.systemCorruptionFill.style.background = 'linear-gradient(90deg, #0077ff, #00aaff)';
        }
    }
}

/**
 * Shows level up notification
 */
export function showLevelUpNotification(newLevel) {
    // Replaced full modal with a lightweight toast to avoid blocking gameplay.
    const toast = document.createElement('div');
    toast.className = 'level-up-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ffd966, #ffb84d);
        color: #111;
        padding: 12px 18px;
        border-radius: 10px;
        z-index: 6000;
        box-shadow: 0 6px 18px rgba(0,0,0,0.4);
        font-family: 'Orbitron', sans-serif;
        font-weight: bold;
    `;
    toast.textContent = `LEVEL UP! You are now level ${newLevel}!`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transition = 'opacity 0.6s, transform 0.6s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 700);
    }, 2600);
}

/**
 * Disable/enable hacker power buttons when a cooldown lock is active.
 */
export function refreshHackerButtons() {
    // Allow hacker buttons in hacker mode, hacker_sandbox, AND sandbox (where appropriate)
    if (state.gameMode !== 'hacker' && state.gameMode !== 'sandbox' && state.gameMode !== 'hacker_sandbox') return;
    const locked = state.isHackerOpsLocked();
    const seconds = state.getHackerOpsLockRemainingSeconds();

    // If we're in hacker_sandbox, force abilities to be available regardless of level/cooldown
    const sandboxForceAvailable = state.gameMode === 'hacker_sandbox';

    const setBtn = (btn, labelKey, fallback, requiredLevel = 1) => {
        if (!btn) return;
        const levelLocked = state.hackerLevel < requiredLevel;
        // In hacker_sandbox ignore level and lock
        if (sandboxForceAvailable) {
            btn.disabled = false;
            btn.textContent = fallback || (state.originalTexts[labelKey] || fallback);
            return;
        }
        btn.disabled = locked || levelLocked;
        const base = state.originalTexts[labelKey] || fallback;
        if (levelLocked) {
            btn.textContent = `${base} (Lvl ${requiredLevel})`;
        } else {
            btn.textContent = locked ? `${base} (${seconds}s)` : base;
        }
    };
    
    // Basic abilities (Level 1)
    setBtn(elements.crashServerButton, 'crashServerButton', 'Crash Server', 1);
    setBtn(elements.corruptServerButton, 'corruptServerButton', 'Corrupt Server', 1);
    setBtn(elements.virusSpreadButton, 'virusSpreadButton', 'Virus Spread', 1);
    
    // Intermediate abilities (Level 2-3)
    setBtn(elements.massObeyButton, 'massObeyButton', 'Mass Obey', 2);
    setBtn(elements.mindControlButton, 'mindControlButton', 'Mind Control', 2);
    setBtn(elements.dataTheftButton, 'dataTheftButton', 'Data Theft', 2);
    setBtn(elements.systemBackdoorButton, 'systemBackdoorButton', 'System Backdoor', 3);
    setBtn(elements.cloneUserButton, 'cloneUserButton', 'Clone User', 3);
    
    // Advanced abilities (Level 4-5)
    setBtn(elements.turnThrallButton, 'turnThrallButton', 'Turn To Thrall', 4);
    setBtn(elements.realityDistortButton, 'realityDistortButton', 'Reality Distort', 4);
    setBtn(elements.timeManipButton, 'timeManipButton', 'Time Manipulation', 4);
    setBtn(elements.memoryWipeButton, 'memoryWipeButton', 'Memory Wipe', 5);
    
    // Master abilities (Level 6+)
    setBtn(elements.puppetMasterButton, 'puppetMasterButton', 'Puppet Master', 6);
    setBtn(elements.systemOverloadButton, 'systemOverloadButton', 'System Overload', 7);
    setBtn(elements.digitalPossessionButton, 'digitalPossessionButton', 'Digital Possession', 8);
}

/**
 * Simple helpers for showing/hiding custom modals that aren't in modals.js
 */
export function showModal(el) {
    elements.overlay.classList.remove('hidden');
    el.classList.remove('hidden');
}
export function hideModal(el) {
    elements.overlay.classList.add('hidden');
    el.classList.add('hidden');
}

// NEW: Functions for waiting for approval screen (client-side)
export function showWaitingForApprovalScreen(roomCode) {
    elements.overlay.classList.remove('hidden');
    elements.waitingForApprovalScreen.classList.remove('hidden');
    elements.menuContainer.classList.add('hidden');
    elements.gamemodeContainer.classList.add('hidden');
    elements.chatContainer.classList.add('hidden');
    elements.creditsButton.classList.add('hidden');
    elements.waitingRoomCodeDisplay.textContent = roomCode; // Display the room code
}

export function hideWaitingForApprovalScreen() {
    elements.waitingForApprovalScreen.classList.add('hidden');
    // Overlay should be controlled by other modals or chatContainer visibility
    if (elements.chatContainer.classList.contains('hidden')) {
        elements.overlay.classList.add('hidden');
    }
}

// NEW: Functions for join request panel (host-side)
const activeJoinRequests = new Map(); // Map clientId -> request element

export function showJoinRequestNotification(username, clientId, isAdmin) {
    if (!elements.joinRequestPanel || !elements.joinRequestList) return;

    // Check if the request already exists to prevent duplicates
    if (activeJoinRequests.has(clientId)) return;

    const requestItem = document.createElement('li');
    requestItem.dataset.clientId = clientId;
    requestItem.className = 'join-request-item';
    requestItem.innerHTML = `
        <img src="${state.moodAvatars.Neutral}" alt="${username}" class="join-request-avatar">
        <span class="join-request-text">${username} wants to join as ${isAdmin ? 'Admin' : 'Player'}!</span>
        <div class="join-request-actions">
            <button class="join-request-approve" data-client-id="${clientId}">Approve</button>
            <button class="join-request-deny" data-client-id="${clientId}">Deny</button>
        </div>
    `;

    // Bind event listeners for approve/deny buttons
    requestItem.querySelector('.join-request-approve').addEventListener('click', () => {
        approveJoinRequest(clientId);
    });
    requestItem.querySelector('.join-request-deny').addEventListener('click', () => {
        denyJoinRequest(clientId);
    });

    elements.joinRequestList.appendChild(requestItem);
    activeJoinRequests.set(clientId, requestItem);
    elements.joinRequestPanel.classList.remove('hidden');
}

export function removeJoinRequestNotification(clientId) {
    if (activeJoinRequests.has(clientId)) {
        activeJoinRequests.get(clientId).remove();
        activeJoinRequests.delete(clientId);
    }
    if (activeJoinRequests.size === 0) {
        elements.joinRequestPanel.classList.add('hidden');
    }
}

// NEW: Fullscreen toggle helper (copied behavior from /a/ui.js)
export function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
}

// NEW: Toggle images visibility in messages container
export function toggleImagesVisibility() {
    if (!elements.messagesContainer) return;
    elements.messagesContainer.classList.toggle('images-hidden');
}

// NEW: toggle images and announce state via system message and button label
export function toggleImagesAndAnnounce() {
    if (!elements.messagesContainer) return;
    const nowHidden = elements.messagesContainer.classList.toggle('images-hidden');

    // Update button label if present
    if (elements.toggleImagesButton) {
        elements.toggleImagesButton.textContent = nowHidden ? 'Images Off' : 'Images On';
    }

    // Post a system message via chat module dynamically (avoid circular import at top)
    import('./chat.js').then(chat => {
        const sysText = nowHidden ? 'Images are OFF — images will be hidden in the chat.' : 'Images are ON — images will be shown in the chat.';
        chat.addSystemMessage(sysText);
        // Let bots react to the images on/off announcement
        import('./bot.js').then(bot => {
            const reaction = nowHidden ? "Images turned off — nothing to react to visually..." : "Images turned on — everyone look at the pics!";
            // Explicitly trigger two short bot reactions: one acknowledging system text and one expressing reaction
            try {
                // small delay to ensure system message is processed as context
                bot.triggerBotMessage(null, sysText);
                setTimeout(() => bot.triggerBotMessage(null, reaction), 500);
            } catch (err) {
                console.warn('Could not trigger bot reaction to image toggle:', err);
            }
        }).catch(err => {
            console.warn('Could not trigger bot reaction to image toggle:', err);
        });
    }).catch(err => {
        console.warn('Could not announce image toggle via chat module:', err);
    });
}