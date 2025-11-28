// =====================================================================================
//
//                                  REFACTORING NOTE
//
// The contents of this file have been refactored into a modular structure for better
// maintainability and scalability. The new entry point for the application is `main.js`.
//
// The logic has been split into the following files:
//
// - `main.js`: The main entry point, initializes the application.
// - `state.js`: Manages the application's state (participants, chat history, etc.).
// - `ui.js`: Handles all DOM manipulation and UI updates.
// - `api.js`: Contains all functions that interact with the AI services (websim).
// - `bot.js`: Encapsulates the logic for the chat bots' behavior.
// - `language.js`: Manages language switching and translations.
// - `events.js`: Contains all event listeners and their handlers.
//
// All functions and variables previously in this file have been moved to their
// respective modules. This file is now empty and is no longer loaded by `index.html`.
//
// =====================================================================================