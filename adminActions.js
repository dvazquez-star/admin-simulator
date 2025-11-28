// This file contains handlers for all admin panel actions.
// REFACTORING NOTE: The logic for individual admin actions has been moved
// into two new files: `userActions.js` and `globalActions.js`.
// This file now primarily orchestrates the binding of event listeners.

import * as chat from './chat.js';
import * as state from './state.js';
import * as ui from './ui.js';
import * as modals from './modals.js';
import * as userActions from './userActions.js';
import * as globalActions from './globalActions.js';

/**
 * Binds event listeners to the admin panel buttons.
 */
export function initializeAdminEventListeners() {
    // --- User-specific actions ---
    ui.elements.warnButton?.addEventListener('click', userActions.handleWarn);
    ui.elements.banButton?.addEventListener('click', userActions.handleBan);
    ui.elements.kickUserButton?.addEventListener('click', userActions.handleKickUser);
    ui.elements.muteButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showMuteModal));
    ui.elements.impersonateButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showImpersonateModal));
    ui.elements.sayButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showSayAsModal)); // NEW: open Say modal
    ui.elements.mentionUserButton?.addEventListener('click', userActions.handleMentionUser);

    // Updated Change Nickname binding: prefer selected participant, fallback to player's own nickname modal in sandbox
    ui.elements.changeNicknameButton?.addEventListener('click', () => {
        const sel = state.selectedParticipants && state.selectedParticipants.length === 1 ? state.selectedParticipants[0] : null;
        if (sel) {
            // Open modal for the selected participant
            modals.showChangeNicknameModal(sel);
        } else {
            // If no participant selected, allow the player to change their own nickname (sandbox only)
            modals.showPlayerChangeNicknameModal();
        }
    });

    ui.elements.toggleVipButton?.addEventListener('click', userActions.handleToggleVip);
    ui.elements.resetUserButton?.addEventListener('click', userActions.handleResetUser);
    ui.elements.setMoodButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showSetMoodModal));
    ui.elements.setPersonalityButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showSetPersonalityModal));
    ui.elements.setAgeButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showSetAgeModal));
    ui.elements.setLocationButton?.addEventListener('click', globalActions.handleSetLocation);
    ui.elements.randomMoodButton?.addEventListener('click', userActions.handleRandomMood);
    ui.elements.spotlightMessageButton?.addEventListener('click', userActions.handleSpotlightMessage);
    ui.elements.revealPersonalityButton?.addEventListener('click', userActions.handleRevealPersonality);
    ui.elements.revealAgeButton?.addEventListener('click', userActions.handleRevealAge);
    ui.elements.obeyButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showObeyModal));

    // New: Give Ad Button (user-specific)
    ui.elements.giveAdButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showGiveAdModal));
    // New: Give Compliment Button (user-specific)
    ui.elements.giveComplimentButton?.addEventListener('click', userActions.handleGiveCompliment); 

    // --- Sandbox Actions ---
    ui.elements.promoteModButton?.addEventListener('click', userActions.handlePromoteToMod);
    ui.elements.promoteCoAdminButton?.addEventListener('click', userActions.handlePromoteCoAdmin); 
    ui.elements.demoteCoAdminButton?.addEventListener('click', userActions.handleDemoteCoAdmin); 
    ui.elements.setUserEmojiButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showSetUserEmojiModal)); 
    ui.elements.removeHackedStatusButton?.addEventListener('click', userActions.handleRemoveHackedStatus); 
    ui.elements.controlUserButton?.addEventListener('click', userActions.handleControlUser);
    ui.elements.stopControlButton?.addEventListener('click', userActions.handleStopControl);
    ui.elements.addCustomUserButton?.addEventListener('click', modals.showAddCustomUserModal);
    ui.elements.addWebsimUserButton?.addEventListener('click', modals.showAddWebsimUserModal);
    ui.elements.customActionButton?.addEventListener('click', () => userActions.initiateModalAction(modals.showCustomActionModal));
    ui.elements.addCustomPanelButton?.addEventListener('click', modals.showAddCustomPanelButtonModal);
    ui.elements.joinAsPlayerButton?.addEventListener('click', globalActions.handleJoinAsPlayer);
    ui.elements.toggleNicknamePrefixButton?.addEventListener('click', globalActions.handleToggleNicknamePrefix); 
    ui.elements.startCountdownButton?.addEventListener('click', globalActions.handleStartCountdown); 
    ui.elements.toggleChatBackgroundEffectButton?.addEventListener('click', globalActions.handleToggleChatBackgroundEffect); 
    ui.elements.massResetMoodButton?.addEventListener('click', globalActions.handleMassResetMood); 


    // --- Global actions ---
    ui.elements.adminMsgButton?.addEventListener('click', modals.showAdminMessageModal);
    // New: Send a system-level message (distinct from admin broadcasts)
    const sendSystemBtn = document.getElementById('send-system-button');
    if (sendSystemBtn) {
        sendSystemBtn.addEventListener('click', () => {
            const text = prompt('System message (will appear as System):');
            if (!text) return;
            const id = chat.addSystemMessage(text);
            state.addMessageToHistory({ id, sender: 'System', text });
        });
    }
    ui.elements.updateRulesButton?.addEventListener('click', modals.showRulesModal);
    ui.elements.runPollButton?.addEventListener('click', modals.showPollModal);
    ui.elements.addBotButton?.addEventListener('click', globalActions.handleAddBot);
    ui.elements.summonViolatorButton?.addEventListener('click', globalActions.handleSummonViolator);
    ui.elements.summonHackerButton?.addEventListener('click', globalActions.handleSummonHacker);
    ui.elements.toggleSlowModeButton?.addEventListener('click', globalActions.handleToggleSlowMode);
    ui.elements.toggleChatLockButton?.addEventListener('click', globalActions.handleToggleChatLock);
    ui.elements.toggleImagesButton?.addEventListener('click', () => {
        // Use the UI helper that toggles images, updates the button text, and announces via system message.
        import('./ui.js').then(u => u.toggleImagesAndAnnounce()).catch(console.error);
    });
    ui.elements.freezeChatButton?.addEventListener('click', globalActions.handleFreezeChat);
    ui.elements.clearChatButton?.addEventListener('click', globalActions.handleClearChat);
    ui.elements.shuffleNicknamesButton?.addEventListener('click', globalActions.handleShuffleNicknames);
    ui.elements.triggerEventButton?.addEventListener('click', globalActions.handleTriggerEvent);

    // --- Save/Load ---
    // These were moved from the main menu
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    if (saveButton) saveButton.addEventListener('click', globalActions.handleSaveConversation);
    if (loadButton) loadButton.addEventListener('click', globalActions.handleLoadConversation);
    
    // --- Clips Feature ---
    ui.elements.saveClipButton?.addEventListener('click', globalActions.handleSaveClip);
    ui.elements.viewClipsButton?.addEventListener('click', globalActions.handleViewClips);

    // --- Hacker Tools (power actions) ---
    ui.elements.crashServerButton?.addEventListener('click', globalActions.handleCrashServer);
    ui.elements.corruptServerButton?.addEventListener('click', globalActions.handleCorruptServer);
    ui.elements.massObeyButton?.addEventListener('click', globalActions.handleMassObey);
    ui.elements.mindControlButton?.addEventListener('click', globalActions.handleMindControl);
    ui.elements.turnThrallButton?.addEventListener('click', globalActions.handleTurnToThrall);

    // --- New Hacker Tools ---
    ui.elements.virusSpreadButton?.addEventListener('click', globalActions.handleVirusSpread);
    ui.elements.dataTheftButton?.addEventListener('click', globalActions.handleDataTheft);
    ui.elements.systemBackdoorButton?.addEventListener('click', globalActions.handleSystemBackdoor);
    ui.elements.cloneUserButton?.addEventListener('click', globalActions.handleCloneUser);
    ui.elements.realityDistortButton?.addEventListener('click', globalActions.handleRealityDistort);
    ui.elements.timeManipButton?.addEventListener('click', globalActions.handleTimeManipulation);
    ui.elements.memoryWipeButton?.addEventListener('click', globalActions.handleMemoryWipe);
    ui.elements.puppetMasterButton?.addEventListener('click', globalActions.handlePuppetMaster);
    ui.elements.systemOverloadButton?.addEventListener('click', globalActions.handleSystemOverload);
    ui.elements.digitalPossessionButton?.addEventListener('click', globalActions.handleDigitalPossession);

    // --- Boss Fight Actions ---
    ui.elements.unwarnPlayerButton?.addEventListener('click', userActions.handleUnwarnPlayer);
    ui.elements.unmutePlayerButton?.addEventListener('click', userActions.handleUnmutePlayer);
    ui.elements.changeMyNicknameButton?.addEventListener('click', userActions.handleChangeMyNickname);
    ui.elements.changeMyMoodButton?.addEventListener('click', userActions.handleChangeMyMood);
}