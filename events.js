// This file contains all event listeners and their handlers.
// REFACTORING NOTE: This file has been significantly refactored. Its main responsibility
// is now to orchestrate the initialization of event listeners from other, more
// specialized modules (`adminActions.js`, `chat.js`, `participants.js`, `modals.js`).

import * as ui from './ui.js';
import * as bot from './bot.js';
import * as language from './language.js';
import * as participants from './participants.js';
import * as state from './state.js';
import { initializeChatEventListeners } from './chat.js';
import { initializeAdminEventListeners } from './adminActions.js';
import { initializeModalEventListeners } from './modals.js';
import { initializeGameEventListeners } from './gameEvents.js';
import { startBackgroundMusic, startHackerMusic } from './audio.js';
import * as modals from './modals.js';
import * as globalActions from './globalActions.js';
import { initializeHost, initializeClient } from './multiplayer.js';
import * as chat from './chat.js';

const KONAMI_CODE_SEQUENCE = [
    "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
    "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
    "KeyB", "KeyA"
];
let konamiCodeTracker = [];

/**
 * Handles the Konami code activation by granting the user admin privileges
 * if they are in a mode without a full admin panel.
 */
function activateKonamiAdmin() {
    // Only activate if we are in a mode without an Admin panel shown (e.g., player mode)
    if (state.gameMode === 'player') {
        chat.addSystemMessage("✨ CHEAT ACTIVATED: Admin Panel Unlocked! ✨");
        
        // In player mode, change self to Admin and flip the mode state
        state.setGameMode('sandbox');
        state.getPlayer().name = 'Admin';
        state.getPlayer().avatar = '/Admin.png';
        state.getPlayer().isPlayer = true; // Still the main player
        
        // NOTE: keep the existing AI admin in the participant list — do not remove it
        
        if (state.botChatInterval) clearInterval(state.botChatInterval);
        import('./bot.js').then(m => m.startBotChatter());

        ui.showChatView(); // Re-render the UI in sandbox mode
        participants.renderList(state.participants);
    } else if (state.gameMode === 'hacker' || state.gameMode === 'hacker_sandbox') {
        // Mark konami activation so UI will show the Return to Admin Panel button
        state.setKonamiActivated(true);

        // For hacker modes: reveal the full admin panel without changing the underlying game mode.
        chat.addSystemMessage("✨ CHEAT ACTIVATED: Admin Panel Unlocked for Hacker Mode (temporary). Use the button to return to Hacker Tools. ✨");

        // Force admin panel visible and enable all admin buttons
        if (ui.elements.adminPanel) ui.elements.adminPanel.style.display = 'flex';
        // Show all buttons by temporarily overriding display
        const allButtons = ui.elements.adminPanel.querySelectorAll('button, hr');
        allButtons.forEach(el => el.style.display = 'block');

        // Add a temporary "Switch back to Hacker Tools" button if not already present
        if (!document.getElementById('switch-to-hacker-tools-button')) {
            const switchBtn = document.createElement('button');
            switchBtn.id = 'switch-to-hacker-tools-button';
            switchBtn.className = 'admin-button';
            switchBtn.textContent = 'Switch back to Hacker Tools';
            switchBtn.style.borderColor = '#ff4d4d';
            switchBtn.style.color = '#ff4d4d';
            switchBtn.style.marginTop = '10px';
            // Insert at top of admin actions for visibility
            ui.elements.adminActions.insertBefore(switchBtn, ui.elements.adminActions.firstChild);

            switchBtn.addEventListener('click', () => {
                // Restore admin panel view according to hacker mode rules
                ui.setAdminPanelForMode();
                // Remove this temporary button
                const el = document.getElementById('switch-to-hacker-tools-button');
                if (el) el.remove();
                chat.addSystemMessage('Returned to Hacker Tools view.');
            });
        }

        // Ensure chat view is visible so admin panel can be used
        ui.showChatView();
        participants.renderList(state.participants);
    } else {
        chat.addSystemMessage("Cheat detected, but you already have admin privileges.");
    }
}

function handleKonamiKeydown(e) {
    // Check if the input is focused; if so, only track B and A keys if they are the end of the code.
    const isInputFocused = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
    const keyName = e.code;
    
    // If the input is focused, only track the final two keys (B, A) if they complete the sequence.
    if (isInputFocused && konamiCodeTracker.length < KONAMI_CODE_SEQUENCE.length - 2) {
        return;
    }

    // Filter out modifier keys and non-directional keys unless B or A
    if (keyName.startsWith('Arrow') || keyName === 'KeyB' || keyName === 'KeyA') {
        konamiCodeTracker.push(keyName);
        if (konamiCodeTracker.length > KONAMI_CODE_SEQUENCE.length) {
            konamiCodeTracker.shift();
        }

        // Check for sequence match
        if (konamiCodeTracker.length === KONAMI_CODE_SEQUENCE.length &&
            konamiCodeTracker.every((key, index) => key === KONAMI_CODE_SEQUENCE[index])) {
            
            konamiCodeTracker = []; // Reset tracker
            // Prevent default action for the final keys (like the input B or A)
            e.preventDefault(); 
            activateKonamiAdmin();
        }
    } else if (!isInputFocused) {
        // If other keys are pressed while the input is NOT focused, reset the tracker entirely.
        konamiCodeTracker = [];
    }
}

/**
 * Handles the click on the start button.
 */
function handleStartClick() {
    ui.showGamemodeSelection();
}

async function initializeHostAndShowChat(mode) {
    state.setGameMode(mode);
    ui.showChatView();

    if (mode === 'player') {
        await participants.initializePlayerMode();
    } else if (mode === 'hacker') {
        // Now that hacker mode can be joined, it needs to act as a host.
        // We'll give it a default number of users to start with.
        await participants.initializeHackerMode(10);
    } else {
        await participants.initializeParticipants();
    }

    // Sandbox and Hacker modes are multiplayer-enabled and act as hosts.
    if (mode === 'sandbox' || mode === 'hacker') {
        await initializeHost();
    }

    if (['sandbox', 'story', 'player'].includes(mode)) {
        startBackgroundMusic();
    } else if (mode === 'hacker') {
        startHackerMusic();
    }
}

async function initializeClientAndShowChat(roomCode, isAdmin = false) {
    ui.showChatView();
    await initializeClient(roomCode, isAdmin);
    // Music is not started for clients to avoid autoplay issues.
}

/**
 * Binds all event listeners to the DOM elements by calling initializers from other modules.
 */
export function initializeEventListeners() {
    // Language switcher
    // Guarded language switcher wiring (elements may be absent in some builds)
    if (ui.elements.langButton) {
        ui.elements.langButton.addEventListener('click', () => {
            if (ui.elements.langDropdown) ui.elements.langDropdown.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', (event) => {
        try {
            const clickedInsideLangButton = ui.elements.langButton && ui.elements.langButton.contains(event.target);
            const clickedInsideLangDropdown = ui.elements.langDropdown && ui.elements.langDropdown.contains(event.target);
            if (!clickedInsideLangButton && !clickedInsideLangDropdown && ui.elements.langDropdown) {
                ui.elements.langDropdown.classList.add('hidden');
            }
        } catch (err) {
            // Defensive fallback: ignore dropdown handling if elements are not present
            console.warn('Language dropdown click handler skipped due to missing elements.', err);
        }
    });

    if (ui.elements.langDropdown) {
        ui.elements.langDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            language.handleLanguageChange(e.target);
        });
    }

    // --- Konami code: listen globally for keydown so it works in all modes (including hacker and hacker_sandbox)
    // Keep the handler lightweight and always registered
    document.addEventListener('keydown', handleKonamiKeydown);

    // --- Start -> show chat and populate participants
    ui.elements.startButton.addEventListener('click', async () => {
        // Show the gamemode selection menu first (user expected behavior)
        ui.showGamemodeSelection();
    });

    // Settings button (guarded)
    if (ui.elements.settingsButton) {
        ui.elements.settingsButton.addEventListener('click', () => {
            if (typeof modals !== 'undefined' && modals.showSettingsModal) {
                modals.showSettingsModal();
            }
        });
    }

    // --- Gamemode button handlers ---
    // Host modes
    if (ui.elements.sandboxButton) {
        ui.elements.sandboxButton.addEventListener('click', async () => {
            await initializeHostAndShowChat('sandbox');
        });
    }
    if (ui.elements.storyButton) {
        ui.elements.storyButton.addEventListener('click', async () => {
            state.setGameMode('story');
            ui.showChatView();
            await participants.initializeParticipants();
        });
    }
    if (ui.elements.hackerButton) {
        ui.elements.hackerButton.addEventListener('click', async () => {
            await initializeHostAndShowChat('hacker');
        });
    }

    // Player / Join controls
    if (ui.elements.playerButton) {
        ui.elements.playerButton.addEventListener('click', async () => {
            // Player mode runs locally (no multiplayer host)
            state.setGameMode('player');
            ui.showChatView();
            await participants.initializePlayerMode();
        });
    }

    // Join buttons in gamemode UI (use room code input)
    if (ui.elements.joinRoomButton) {
        ui.elements.joinRoomButton.addEventListener('click', async () => {
            const code = ui.elements.roomCodeInput?.value?.trim();
            if (!code) return alert('Please enter a room code to join.');
            await initializeClientAndShowChat(code, false);
        });
    }
    if (ui.elements.joinAdminButton) {
        ui.elements.joinAdminButton.addEventListener('click', async () => {
            const code = ui.elements.roomCodeInput?.value?.trim();
            if (!code) return alert('Please enter a room code to join as admin.');
            await initializeClientAndShowChat(code, true);
        });
    }
    if (ui.elements.hackerSandboxButton) {
        ui.elements.hackerSandboxButton.addEventListener('click', async () => {
            // Hacker sandbox: act like sandbox host but with hacker_sandbox mode toggled
            state.setGameMode('hacker_sandbox');
            ui.showChatView();
            await participants.initializeHackerMode(8);
            await initializeHost();
        });
    }

    // Initialize submodules, but only if their initializer functions exist
    try {
        if (typeof initializeAdminEventListeners === 'function') initializeAdminEventListeners();
    } catch (e) {
        console.warn('initializeAdminEventListeners missing or failed:', e);
    }
    try {
        if (typeof initializeChatEventListeners === 'function') initializeChatEventListeners();
    } catch (e) {
        console.warn('initializeChatEventListeners missing or failed:', e);
    }
    try {
        if (typeof participants.initializeParticipantEventListeners === 'function') participants.initializeParticipantEventListeners();
    } catch (e) {
        console.warn('participants.initializeParticipantEventListeners missing or failed:', e);
    }
    try {
        if (typeof initializeModalEventListeners === 'function') initializeModalEventListeners();
    } catch (e) {
        console.warn('initializeModalEventListeners missing or failed:', e);
    }
    try {
        if (typeof initializeGameEventListeners === 'function') initializeGameEventListeners();
    } catch (e) {
        console.warn('initializeGameEventListeners missing or failed:', e);
    }
}