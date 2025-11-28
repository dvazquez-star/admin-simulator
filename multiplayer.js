import { WebsimSocket } from '@websim/websim-socket';
import * as state from './state.js';
import * as chat from './chat.js'; // Changed to chat.js for local chat functions like addMessage
import * as participants from './participants.js';
import * as ui from './ui.js';
import * as userActions from './userActions.js';
import * as globalActions from './globalActions.js';

export let room = null; // Export room so ui.js can access client.username

// --- State Synchronization ---

// Host and Client use these functions to execute actions.
// Host executes them directly. Client sends them to host.
const commandExecutors = {
    ...userActions,
    ...globalActions,
};

// --- Host Logic (Admin Window) ---

export async function initializeHost() {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    state.setRoomCode(roomCode);
    ui.displayRoomCode(roomCode);

    room = new WebsimSocket(roomCode);
    await room.initialize();

    // When the host's state changes, broadcast it to all players.
    document.addEventListener('statechange', broadcastFullStateToRoom);

    // Listen for actions sent from players (clients).
    room.onmessage = (event) => {
        const { type, payload, clientId, username, avatarUrl } = event.data;
        if (type === 'PLAYER_ACTION') {
            handlePlayerAction(payload, clientId);
        } else if (type === 'ADMIN_ACTION') {
            handleAdminAction(payload, clientId);
        } else if (type === 'ADMIN_PRESENCE') {
            handleAdminPresence(payload, clientId);
        } else if (type === 'ADMIN_MESSAGE_FROM_CLIENT') {
            handleAdminMessage(payload, clientId);
        } else if (type === 'REQUEST_JOIN') {
            handleJoinRequest(payload, clientId, username, avatarUrl);
        }
    };
    
    // Send the initial state to anyone who might already be waiting.
    broadcastFullStateToRoom();
}

function broadcastFullStateToRoom() {
    if (!room || state.gameMode === 'story' || state.gameMode === 'player') return;

    // A simple approach: send the entire relevant state to all clients.
    // This ensures everyone is in sync.
    room.send({
        type: 'SYNC_STATE',
        payload: {
            // Core sync data
            participants: state.participants,
            chatHistory: state.chatHistory,
            location: state.location,
            
            // Expanded game state sync
            rules: state.rules,
            isSlowMode: state.isSlowMode,
            isChatFrozen: state.isChatFrozen,
            isChatLocked: state.isChatLocked,
            controlledUser: state.controlledUser,
            activeEvent: state.activeEvent, // Sync active events
            
            // Sync boss fight state
            bossFightActive: state.bossFightActive,
            hackerParticipantId: state.hackerParticipantId,
            hackerHP: state.hackerHP,
            participantToSave: state.participantToSave,

            // Sync hacker mode state
            systemCorruption: state.systemCorruption,
        }
    });
}

async function handlePlayerAction(action, clientId) {
    const { type, payload } = action;

    if (type === 'JOIN') {
        const newPlayer = {
            id: clientId, // Use the client's unique ID provided by WebsimSocket.
            name: payload.name || `Player-${clientId.slice(-4)}`,
            avatar: payload.avatar || '/Neutral.png',
            mood: 'Neutral',
            isPlayer: true,
            isBot: false, // Explicitly mark as not a bot
            isExternalPlayer: true // Mark them as a remote player.
        };
        state.addParticipant(newPlayer);
        participants.renderList(state.participants);
        chat.addSystemMessage(`${newPlayer.name} has joined the game.`);
    } else if (type === 'LEAVE') {
        const player = state.getParticipantById(clientId);
        if (player) {
            chat.addSystemMessage(`${player.name} has left the game.`);
            state.removeParticipant(clientId);
            participants.renderList(state.participants);
        }
    } else if (type === 'MESSAGE') {
        const player = state.getParticipantById(clientId);
        if (player && payload.text) {
            // Check for commands from external players
            if (payload.text.toLowerCase() === '/sync') {
                broadcastFullStateToRoom(); // Manually trigger a sync for the player
                return;
            }
            // Use existing chat/state functions to correctly track the external player's message
            if (payload.imageUrl) {
                 const messageId = chat.addMessage(payload.text, player, { imageUrl: payload.imageUrl, replyToId: payload.replyToId });
                 state.addMessageToHistory({ id: messageId, sender: player.name, text: payload.text, imageUrl: payload.imageUrl, replyToId: payload.replyToId });
            } else {
                const messageId = chat.addMessage(payload.text, player, { replyToId: payload.replyToId });
                state.addMessageToHistory({ id: messageId, sender: player.name, text: payload.text, replyToId: payload.replyToId });
            }
        }
    }
    // After handling a player action that changes state, broadcast to everyone.
    broadcastFullStateToRoom();
}

function handleAdminMessage(payload, fromClientId) {
    const admin = state.getParticipantById(fromClientId);
    if (admin && payload.text) {
        // Use chat.addMessage which correctly handles Co-Admin styling and TTS/sound if applicable
        if (payload.imageUrl) {
            const messageId = chat.addMessage(payload.text, admin, { imageUrl: payload.imageUrl, isBot: admin.isBot, replyToId: payload.replyToId });
            state.addMessageToHistory({ id: messageId, sender: admin.name, text: payload.text, imageUrl: payload.imageUrl, replyToId: payload.replyToId });
        } else {
            const messageId = chat.addMessage(payload.text, admin, { isBot: admin.isBot, replyToId: payload.replyToId });
            state.addMessageToHistory({ id: messageId, sender: admin.name, text: payload.text, replyToId: payload.replyToId });
        }
    }
    // After adding the message, broadcast the new state to all clients.
    broadcastFullStateToRoom();
}

function handleAdminAction(action, fromClientId) {
    const { command, args } = action;
    const executor = commandExecutors[command];
    const coAdmin = state.getParticipantById(fromClientId);
    const adminName = coAdmin ? coAdmin.name : `Co-Admin-${fromClientId.slice(-4)}`;
    
    if (executor) {
        console.log(`Host executing admin command '${command}' from client ${fromClientId} with args:`, args);
        try {
            // Announce the command being used by the co-admin
            const commandAnnouncement = `${adminName} used command: ${command}`;
            chat.addSystemMessage(commandAnnouncement);

            state.setCurrentActor(adminName); // Set the actor for this action
            executor(...args);
            // After executing the command, broadcast the new state to all clients.
            broadcastFullStateToRoom();
        } catch (error) {
            console.error(`Error executing admin command '${command}':`, error);
        } finally {
            state.setCurrentActor(null); // Reset the actor after the action is done
        }
    } else {
        console.warn(`Unknown admin command received: ${command}`);
    }
}

function handleAdminPresence(payload, clientId) {
    if (payload.type === 'JOIN') {
        const newAdmin = {
            id: clientId,
            name: payload.username || `Co-Admin-${clientId.slice(-4)}`, // Use username from payload
            avatar: payload.avatar || '/co-admin.png',
            isPlayer: false,
            isBot: true, // Treat co-admins as 'bots' for message sending/TTS logic
            isCoAdmin: true
        };
        state.addParticipant(newAdmin);
        participants.renderList(state.participants);
        chat.addSystemMessage(`${newAdmin.name} has connected to the admin panel.`);
        document.dispatchEvent(new CustomEvent('statechange'));
    } else if (payload.type === 'LEAVE') {
        const admin = state.getParticipantById(clientId);
        if (admin) {
            chat.addSystemMessage(`${admin.name} has disconnected from the admin panel.`);
            state.removeParticipant(clientId);
            participants.renderList(state.participants);
            document.dispatchEvent(new CustomEvent('statechange'));
        }
    }
}

// New: Handle incoming join requests on the host side
function handleJoinRequest(payload, clientId, username, avatarUrl) {
    const { isAdmin } = payload;

    if (username === "BuddyLove13") {
        console.log("BuddyLove13 joined, auto-approving.");
        sendJoinApproved(clientId);
        if (isAdmin) {
            handleAdminPresence({ type: 'JOIN', username: username, avatar: avatarUrl }, clientId); // Pass username
        } else {
            handlePlayerAction({ type: 'JOIN', payload: { name: username, avatar: avatarUrl } }, clientId);
        }
        return;
    }

    // Add to pending requests and show in UI
    state.addPendingJoinRequest({ clientId, username, avatarUrl, isAdmin });
    ui.showJoinRequestNotification(username, clientId, isAdmin);
}

// New: Send approval/denial back to a specific client
function sendJoinApproved(clientId) {
    room.requestPresenceUpdate(clientId, { type: 'JOIN_REQUEST_STATUS', status: 'approved' });
}

function sendJoinDenied(clientId, reason = "Host denied your request.") {
    room.requestPresenceUpdate(clientId, { type: 'JOIN_REQUEST_STATUS', status: 'denied', reason: reason });
}

// New: Host actions to approve/deny
export function approveJoinRequest(clientId) {
    const request = state.getPendingJoinRequest(clientId);
    if (!request) return;

    sendJoinApproved(clientId);
    if (request.isAdmin) {
        handleAdminPresence({ type: 'JOIN', username: request.username, avatar: request.avatarUrl }, clientId); // Pass username
    } else {
        handlePlayerAction({ type: 'JOIN', payload: { name: request.username, avatar: request.avatarUrl } }, clientId);
    }
    state.removePendingJoinRequest(clientId);
    ui.removeJoinRequestNotification(clientId);
}

export function denyJoinRequest(clientId, reason = "Host denied your request.") {
    sendJoinDenied(clientId, reason);
    state.removePendingJoinRequest(clientId);
    ui.removeJoinRequestNotification(clientId);
}

// --- Client Logic (Player Window) ---

export async function initializeClient(roomCode, isAdminJoin = false) {
    try {
        room = new WebsimSocket(roomCode.toUpperCase());
        await room.initialize();
    } catch (error) {
        console.error("Failed to join room:", error);
        alert(`Failed to join room "${roomCode}". Please check the code and try again.`);
        // Reload to go back to the main menu on failure
        window.location.reload();
        return;
    }
    
    // New: Handle join requests on client side
    state.setIsWaitingForApproval(true);
    ui.showWaitingForApprovalScreen(roomCode.toUpperCase()); // Pass roomCode to display it

    // Listen for state updates from the host.
    room.onmessage = (event) => {
        const { type, payload } = event.data;
        if (type === 'SYNC_STATE') {
            handleStateSync(payload);
            if (state.isWaitingForApproval) { // If client receives state sync while waiting for approval, it implies approval
                state.setIsWaitingForApproval(false);
                ui.hideWaitingForApprovalScreen();
                setupClientUI(isAdminJoin);
            }
        }
    };

    // NEW: Subscribe to presence update requests from the host
    room.subscribePresenceUpdateRequests((updateRequest, fromClientId) => {
        // The host sends presence updates on their own presence, not directly on the client's.
        // We only care about approval/denial coming from the host, which is usually `room.peers[room.clientId]`
        // or a request targeted explicitly at this client's ID.
        // For simplicity, we assume the host is sending a request *to* this client.
        if (updateRequest.type === 'JOIN_REQUEST_STATUS') {
            if (updateRequest.status === 'approved') {
                state.setIsWaitingForApproval(false);
                ui.hideWaitingForApprovalScreen();
                setupClientUI(isAdminJoin);
            } else if (updateRequest.status === 'denied') {
                state.setIsWaitingForApproval(false);
                ui.hideWaitingForApprovalScreen();
                alert(`Your join request was denied: ${updateRequest.reason || 'No reason provided.'}`);
                window.location.reload(); // Go back to main menu
            }
        }
    });

    // Send a join request or directly join if BuddyLove13
    if (room.username === "BuddyLove13") {
        console.log("Client BuddyLove13 attempting direct join.");
        state.setIsWaitingForApproval(false);
        ui.hideWaitingForApprovalScreen();
        if (isAdminJoin) {
            room.send({
                type: 'ADMIN_PRESENCE',
                payload: { type: 'JOIN', username: room.username, avatar: room.avatarUrl } // Pass username
            });
        } else {
            room.send({
                type: 'PLAYER_ACTION',
                payload: { type: 'JOIN', payload: { name: room.username, avatar: room.avatarUrl } }
            });
        }
        setupClientUI(isAdminJoin);
    } else {
        console.log(`Client ${room.username} sending join request.`);
        room.send({
            type: 'REQUEST_JOIN',
            payload: { username: room.username, avatarUrl: room.avatarUrl, isAdmin: isAdminJoin }
        });
    }

    // Announce leaving when the window is closed.
    window.addEventListener('beforeunload', () => {
        if (room) {
            if (isAdminJoin) {
                room.send({
                    type: 'ADMIN_PRESENCE',
                    payload: { type: 'LEAVE' }
                });
            } else {
                room.send({
                    type: 'PLAYER_ACTION',
                    payload: { type: 'LEAVE' }
                });
            }
        }
    });
}

function setupClientUI(isAdminJoin) {
    if (isAdminJoin) {
        document.title = "Co-Admin - Admin Simulator";
        // Show admin panel, hide player-specific things
        if (ui.elements.playerModePanel) ui.elements.playerModePanel.style.display = 'none';
        if (ui.elements.reputationContainer) ui.elements.reputationContainer.style.display = 'none';
        
        // Ensure chat container is visible
        if (ui.elements.chatContainer) {
            ui.elements.chatContainer.classList.remove('hidden');
            setTimeout(() => ui.elements.chatContainer.classList.add('visible'), 10);
            ui.elements.chatContainer.style.height = '100vh';
            ui.elements.chatContainer.style.borderRadius = '0';
            ui.elements.chatContainer.style.border = 'none';
        }
        
        // Co-admins send commands instead of executing locally
        overrideAdminActionsForClient();

        // Also ensure menu and gamemode containers are hidden
        if (ui.elements.menuContainer) ui.elements.menuContainer.classList.add('hidden');
        if (ui.elements.gamemodeContainer) ui.elements.gamemodeContainer.classList.add('hidden');
        if (ui.elements.hackerLobbyContainer) ui.elements.hackerLobbyContainer.classList.add('hidden'); // Hide hacker lobby
        if (ui.elements.buddyLoveLobbyContainer) ui.elements.buddyLoveLobbyContainer.classList.add('hidden'); // Hide BuddyLove lobby

    } else {
        document.title = "Player - Admin Simulator";
        document.body.style.padding = '0';
        // Hide all admin-only elements.
        if (ui.elements.menuContainer) ui.elements.menuContainer.style.display = 'none';
        if (ui.elements.gamemodeContainer) ui.elements.gamemodeContainer.style.display = 'none';
        if (ui.elements.adminPanel) ui.elements.adminPanel.style.display = 'none';
        if (ui.elements.participantsContainer) ui.elements.participantsContainer.style.display = 'none';
        if (ui.elements.languageSwitcher) ui.elements.languageSwitcher.style.display = 'none';
        if (ui.elements.reputationContainer) ui.elements.reputationContainer.style.display = 'none';
        if (ui.elements.playerModePanel) ui.elements.playerModePanel.style.display = 'none';
        if (ui.elements.hackerLobbyContainer) ui.elements.hackerLobbyContainer.style.display = 'none'; // Hide hacker lobby
        if (ui.elements.buddyLoveLobbyContainer) ui.elements.buddyLoveLobbyContainer.style.display = 'none'; // Hide BuddyLove lobby
        
        // Make the chat view take up the whole screen for players.
        if (ui.elements.chatContainer) {
            ui.elements.chatContainer.classList.remove('hidden');
            setTimeout(() => ui.elements.chatContainer.classList.add('visible'), 10);
            ui.elements.chatContainer.style.height = '100vh';
            ui.elements.chatContainer.style.borderRadius = '0';
            ui.elements.chatContainer.style.border = 'none';
        }
    }

    // Override the form submission to send a message to the host.
    if (ui.elements.messageForm) {
        ui.elements.messageForm.onsubmit = async (e) => {
            e.preventDefault();
            const text = ui.elements.messageInput.value.trim();
            if (text) {
                // Get reply ID from local state managed by chat.js
                const replyToId = state.replyingTo ? state.replyingTo.id : null;
                
                // If it's an image command, the client needs to handle the upload/generation first
                if (text.startsWith('/image ')) {
                    const prompt = text.substring(7);
                    try {
                        const imageResult = await websim.imageGen({ prompt });
                        const payload = { text, imageUrl: imageResult.url, replyToId };
                        
                        if (isAdminJoin) {
                            room.send({ type: 'ADMIN_MESSAGE_FROM_CLIENT', payload });
                        } else {
                            room.send({ type: 'PLAYER_ACTION', payload: { type: 'MESSAGE', payload } });
                        }
                    } catch (error) {
                         const payload = { text: `${text} (image failed)`, replyToId };
                         if (isAdminJoin) {
                            room.send({ type: 'ADMIN_MESSAGE_FROM_CLIENT', payload });
                        } else {
                            room.send({ type: 'PLAYER_ACTION', payload: { type: 'MESSAGE', payload } });
                        }
                    }
                } else {
                    // Handle regular text and links
                    const imageUrlMatch = text.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg))/i);
                    const imageUrl = imageUrlMatch ? imageUrlMatch[0] : null;
                    const payload = { text, imageUrl, replyToId };
                    
                    if (isAdminJoin) {
                        room.send({ type: 'ADMIN_MESSAGE_FROM_CLIENT', payload });
                    } else {
                        room.send({ type: 'PLAYER_ACTION', payload: { type: 'MESSAGE', payload } });
                    }
                }

                ui.elements.messageInput.value = '';
                // The client manages its own reply UI state locally.
                import('./chat.js').then(m => m.cancelReply());
            }
        };
    }
}

function overrideAdminActionsForClient() {
    console.log("Overriding admin actions for co-admin client.");
    // This is a bit of a hack. We replace the functions in the other modules with
    // a function that sends a command to the host.
    for (const command in commandExecutors) {
        const originalFunction = commandExecutors[command];
        if (typeof originalFunction === 'function') {
            commandExecutors[command] = (...args) => {
                console.log(`Co-admin sending command: ${command}`, args);
                room.send({
                    type: 'ADMIN_ACTION',
                    payload: {
                        command: command,
                        args: args
                    }
                });
            };
        }
    }
}

function handleStateSync(payload) {
    // --- Update local state from host ---
    state.setParticipants(payload.participants || []);
    state.chatHistory.length = 0; // Clear before push
    (payload.chatHistory || []).forEach(msg => state.addMessageToHistory(msg));
    
    // Expanded state
    state.setLocation(payload.location);
    state.setRules(payload.rules);
    state.setSlowMode(payload.isSlowMode);
    state.setChatFrozen(payload.isChatFrozen);
    state.setChatLock(payload.isChatLocked);
    state.setControlledUser(payload.controlledUser);
    state.setActiveEvent(payload.activeEvent);
    
    // Boss fight state
    state.setBossFightState(payload.bossFightActive, payload.hackerParticipantId);
    state.setHackerHP(payload.hackerHP);
    state.setParticipantToSave(payload.participantToSave);
    
    // Hacker state
    state.setSystemCorruption(payload.systemCorruption);

    // --- Re-render UI based on new state ---
    ui.elements.messagesContainer.innerHTML = '';
    ui.updateLocationDisplay(payload.location);
    participants.renderList(state.participants);

    // Rerender chat history
    state.chatHistory.forEach(msg => {
        let sender = state.getParticipantByName(msg.sender);
        if (!sender) {
             sender = { name: msg.sender, avatar: '/Neutral.png' };
        }
        
        if (msg.pollData) {
            const pollId = chat.addPollMessage(msg.pollData.question, Object.keys(msg.pollData.options));
            const pollEl = document.getElementById(pollId);
            if (pollEl) pollEl.id = msg.id; // Ensure consistent ID for updates
            setTimeout(() => chat.updatePollDisplay(msg.id, msg.pollData), 10);
        } else if (msg.sender === 'System') {
            chat.addSystemMessage(msg.text);
        } else if (msg.sender === 'Admin' || msg.sender === 'Hacker') {
            chat.addAdminMessage(msg.text);
        } else {
            chat.addMessage(msg.text, sender, { imageUrl: msg.imageUrl, replyToId: msg.replyToId });
        }
    });

    // Update UI elements based on synced state
    ui.setAdminPanelForMode(); // This will show/hide buttons correctly for co-admins
    ui.setAdminButtonState(); // Update button disabled states
    
    // Sync boss UI visibility and state
    if (state.bossFightActive) {
        const hacker = state.getParticipantById(state.hackerParticipantId);
        ui.showBossUI(hacker ? hacker.name : 'HACKER');
        ui.updateBossHP(state.hackerHP);
        ui.setupBossAdminPanel();
    } else {
        ui.hideBossUI();
        ui.restoreDefaultAdminPanel();
    }
}