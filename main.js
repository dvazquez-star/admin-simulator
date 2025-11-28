import { initializeEventListeners } from './events.js';
import { storeOriginalTexts } from './language.js';
import { cacheDOMElements, setAdminButtonState, showChatView } from './ui.js'; // Import cacheDOMElements
import { checkMutes, startBotChatter, startBotSpawner } from './bot.js';
import { initializeHost, initializeClient } from './multiplayer.js';
import './gameEvents.js'; // Import to register event logic

/**
 * Main entry point of the application.
 * This function is called when the DOM is fully loaded.
 */
async function main() {
    // Cache all DOM elements first
    cacheDOMElements();

    // 1. Store the original English text from the DOM for translations.
    storeOriginalTexts();

    // 2. Set the initial state for UI elements like the admin buttons.
    setAdminButtonState();

    // 3. Attach all necessary event listeners to make the UI interactive.
    initializeEventListeners();

    // 4. Start checking for expired mutes periodically.
    setInterval(checkMutes, 5000); // Check every 5 seconds

    // 5. Start the bot chatter and spawner loops.
    startBotChatter();
    startBotSpawner();

    // Ensure AudioContext for TTS is resumed on first user gesture to avoid silent TTS.
    // Import chat module lazily and resume audioContext once on the first user interaction.
    const resumeOnFirstGesture = () => {
        import('./chat.js').then(m => m.resumeAudioContext()).catch(() => {});
    };
    document.addEventListener('click', resumeOnFirstGesture, { once: true, capture: true });
    document.addEventListener('keydown', resumeOnFirstGesture, { once: true, capture: true });
}

// Wait for the DOM to be fully loaded before running the main function.
document.addEventListener('DOMContentLoaded', main);