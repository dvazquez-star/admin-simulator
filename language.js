// This file manages language switching and translations.
import * as api from './api.js';
import * as state from './state.js';
import { elements } from './ui.js';

/**
 * Stores the initial text content of translatable elements.
 */
export function storeOriginalTexts() {
    elements.translatableElements.forEach(el => {
        const key = el.dataset.key;
        if (el.tagName === 'INPUT') {
             state.originalTexts[key] = el.placeholder;
        } else if (el.tagName === 'TEXTAREA') { // Added for textarea
             state.originalTexts[key] = el.placeholder;
        }
        else {
             state.originalTexts[key] = el.textContent;
        }
    });
    
    // Store additional texts
    state.originalTexts.reputationLabel = "Admin Reputation";
    state.originalTexts.gameOverTitle = "Game Over";
    state.originalTexts.chooseGamemode = "Choose Gamemode";
    state.originalTexts.sandboxButton = "Sandbox";
    state.originalTexts.storyButton = "Story Mode";
    state.originalTexts.playerButton = "Be the Player (vs AI Admin)";
    state.originalTexts.hackerButton = "Be Hacker";
    state.originalTexts.joinRoomButton = "Join as Player";
    state.originalTexts.joinAdminButton = "Join as Admin";
    state.originalTexts.backButton = "Back";
    state.originalTexts.playerModeTitle = "Player Controls";
    state.originalTexts.storyIntroTitle = "Welcome to Story Mode";
    state.originalTexts.storyIntroText = "Your reputation is on the line. Moderate the chat, enforce the rules, and keep the peace. Your actions will be judged. But be warned... not everyone here is who they seem. A threat looms within the system.";
    state.originalTexts.hackerLobbyTitle = "Choose a Target";
    state.originalTexts.joinAsPlayerButton = "Join as Player";
    state.originalTexts.setPersonalityButton = "Set Personality";
    state.originalTexts.setAgeButton = "Set Age";
    state.originalTexts.setLocationButton = "Set Location";
    state.originalTexts.setAgeModalTitle = "Set Age For...";
    state.originalTexts.setPersonalityModalTitle = "Set Personality for...";
    state.originalTexts.revealAgeButton = "Reveal Age";
    state.originalTexts.hackerToolsTitle = "Hacker Tools";
    state.originalTexts.corruptButton = "Corrupt";
    state.originalTexts.summonHackerButton = "Summon Hacker";
    state.originalTexts.toggleChatLockButton = "Lock Chat";
    state.originalTexts.toggleImagesButton = "Toggle Images";
    // Sandbox Buttons
    state.originalTexts.promoteModButton = "Promote to Mod";
    state.originalTexts.controlUserButton = "Control User";
    state.originalTexts.stopControlButton = "Stop Control";
    state.originalTexts.addCustomUserButton = "Add Custom User";
    state.originalTexts.addCustomUserTitle = "Add a Custom User";
    state.originalTexts.addWebsimUserButton = "Add Websim User";
    state.originalTexts.addWebsimUserTitle = "Add a Websim User";
    state.originalTexts.customActionButton = "Custom Action";
    // New custom button modal texts
    state.originalTexts.addCustomPanelButton = "Add Custom Button";
    state.originalTexts.addCustomPanelButtonTitle = "Create a Custom Panel Button";
    state.originalTexts.addCustomPanelButtonText = "This button will perform a custom action on the selected user when clicked.";
    // New Hacker Tool labels
    state.originalTexts.crashServerButton = "Crash Server";
    state.originalTexts.corruptServerButton = "Corrupt Entire Server";
    state.originalTexts.massObeyButton = "Mass Obey";
    state.originalTexts.mindControlButton = "Mind Control";
    state.originalTexts.turnThrallButton = "Turn To Thrall";
    state.originalTexts.obeyButton = "Obey";
    state.originalTexts.chatCorruptedTitle = "Chat Corrupted";
    state.originalTexts.chatCorruptedText = "System integrity compromised. All users have been purged. Moving to the next target.";
    state.originalTexts.adminShuffleConfirm = "Are you sure you want to shuffle everyone's names? This will cause chaos.";
    state.originalTexts.hackerShuffleConfirm = "Are you sure you want to shuffle the remaining users' names? This will increase their confusion.";
    state.originalTexts.settingsModalTitle = "Settings";
    state.originalTexts.volumeLabel = "Music Volume";
    state.originalTexts.closeButton = "Close";
    state.originalTexts.saveButton = "Save";
    state.originalTexts.loadButton = "Load";
    state.originalTexts.changeMyNicknameButton = "Change My Nickname";
    
    // New suggestion modal texts
    state.originalTexts.suggestionsButton = "Suggestions";
    state.originalTexts.suggestionModalTitle = "Submit Suggestion";
    state.originalTexts.suggestionInputPlaceholder = "Your suggestion...";

    // New ad button text
    state.originalTexts.giveAdButton = "Give Ad";
    state.originalTexts.giveAdModalTitle = "Give Ad to Participant"; // New modal title

    // New feature button/modal texts
    state.originalTexts.addFeatureButton = "Add Feature";
    state.originalTexts.addFeatureModalTitle = "Add a Custom Feature";
    state.originalTexts.addFeatureModalText = "Describe the feature you want to add to your game. This will only affect your local experience! (e.g., \"Add a button to make all users happy\", \"Change the chat border to green\", \"Give me 100 reputation\", \"Make messages pulse with color\")";
    state.originalTexts.featureDescriptionPlaceholder = "Describe your feature...";
    state.originalTexts.addFeatureSend = "Add Feature";

    // NEW: BuddyLove13 Lobby texts
    state.originalTexts.buddyLoveLobbyTitle = "BuddyLove13's Control Panel";
    state.originalTexts.buddyLoveLobbyDescription = "Active Rooms (Simulated List):";

    // NEW: Swearing toggle label
    state.originalTexts.allowSwearingLabel = "Allow Swearing";

    // NEW: TTS label
    state.originalTexts.ttsLabel = "Enable TTS for Admin/Bot Messages";
    
    // NEW: Clips Feature texts
    state.originalTexts.saveClipButton = "Save Clip";
    state.originalTexts.viewClipsButton = "View Clips";
    state.originalTexts.clipsLogTitle = "Saved Chat Clips";

    // New feature button/modal texts
    state.originalTexts.addFeatureButton = "Add Feature";
    state.originalTexts.addFeatureModalTitle = "Add a Custom Feature";
    state.originalTexts.addFeatureModalText = "Describe the feature you want to add to your game. This will only affect your local experience! (e.g., \"Add a button to make all users happy\", \"Change the chat border to green\", \"Give me 100 reputation\", \"Make messages pulse with color\")";
    state.originalTexts.featureDescriptionPlaceholder = "Describe your feature...";
    state.originalTexts.addFeatureSend = "Add Feature";

    // NEW: BuddyLove13 Lobby texts
    state.originalTexts.buddyLoveLobbyTitle = "BuddyLove13's Control Panel";
    state.originalTexts.buddyLoveLobbyDescription = "Active Rooms (Simulated List):";

    // NEW: Swearing toggle label
    state.originalTexts.allowSwearingLabel = "Allow Swearing";

    // NEW: TTS label
    state.originalTexts.ttsLabel = "Enable TTS for Admin/Bot Messages";
}

/**
 * Handles the logic for changing the application's language.
 * @param {HTMLElement} target - The clicked language link element.
 */
export async function handleLanguageChange(target) {
    if (target.tagName !== 'A' || !target.dataset.lang) return;

    const langCode = target.dataset.lang;
    const langName = target.textContent;
    elements.langDropdown.classList.add('hidden');
    state.setCurrentLang(langCode);

    elements.langButton.textContent = 'Translating...';

    try {
        const translations = await api.fetchTranslations(langCode, state.originalTexts);
        
        applyTranslations(translations);
        
        elements.langButton.textContent = langName;
    } catch (error) {
        console.error("Translation failed:", error);
        // Revert to original English text on failure
        applyTranslations(state.originalTexts);
        elements.langButton.textContent = "Language";
        state.setCurrentLang('en');
    }
}

/**
 * Applies a set of translations to the UI elements.
 * @param {object} translations - The object containing translated strings.
 */
function applyTranslations(translations) {
    elements.translatableElements.forEach(el => {
        const key = el.dataset.key;
        if (translations[key]) {
             if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[key];
            } else {
                el.textContent = translations[key];
            }
        }
    });

    // Manually set text for buttons that might change, to revert them correctly
    const slowModeKey = elements.toggleSlowModeButton.dataset.key || 'toggleSlowModeButton';
    if(state.isSlowMode){
         elements.toggleSlowModeButton.textContent = "Slow Mode: ON"; // Or a translated version
    } else {
        elements.toggleSlowModeButton.textContent = translations[slowModeKey] || "Toggle Slow Mode";
    }

    if (translations.messagePlaceholder) {
        elements.messageInput.placeholder = translations.messagePlaceholder;
    }
    if (translations.sendButton) {
        elements.sendButton.textContent = translations.sendButton;
        // Check if giveAdSendButton exists before setting text
        if (elements.giveAdSendButton) {
            elements.giveAdSendButton.textContent = translations.sendButton;
        }
    }
    if (translations.adminPanelTitle) {
        elements.adminPanelTitle.textContent = translations.adminPanelTitle;
    }
    if (translations.warnButton) {
        elements.warnButton.textContent = translations.warnButton;
    }
    if (translations.muteButton) {
        elements.muteButton.textContent = translations.muteButton;
    }
    if (translations.banButton) {
        elements.banButton.textContent = translations.banButton;
    }
    if (translations.adminMsgButton) {
        elements.adminMsgButton.textContent = translations.adminMsgButton;
    }
    if (translations.updateRulesButton) {
        elements.updateRulesButton.textContent = translations.updateRulesButton;
    }

    // Apply text for new feature button/modal elements
    if (elements.addFeatureButton && translations.addFeatureButton) {
        elements.addFeatureButton.textContent = translations.addFeatureButton;
    }
    if (elements.addFeatureModalTitle && translations.addFeatureModalTitle) {
        elements.addFeatureModalTitle.textContent = translations.addFeatureModalTitle;
    }
    // Set textContent for the paragraph in the modal as well
    const addFeatureModalText = document.querySelector('#add-feature-modal p[data-key="addFeatureModalText"]');
    if (addFeatureModalText && translations.addFeatureModalText) {
        addFeatureModalText.textContent = translations.addFeatureModalText;
    }
    if (elements.featureDescriptionInput && translations.featureDescriptionPlaceholder) {
        elements.featureDescriptionInput.placeholder = translations.featureDescriptionPlaceholder;
    }
    if (elements.addFeatureSendButton && translations.addFeatureSend) {
        elements.addFeatureSendButton.textContent = translations.addFeatureSend;
    }
}