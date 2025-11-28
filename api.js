import { marked } from 'marked';
import DOMPurify from 'dompurify';
import * as state from './state.js'; // Import state to access allowSwearing

/**
 * Helper function to convert an image URL to a base64 data URL.
 * @param {string} url The URL of the image.
 * @returns {Promise<string|null>} A promise that resolves with the data URL or null on error.
 */
async function urlToDataUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.statusText}`);
            return null;
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("Error converting URL to data URL:", error);
        return null;
    }
}

/**
 * Fetches translations for a given language.
 * @param {string} targetLang - The language code (e.g., 'es', 'fr').
 * @param {object} originalTexts - The JSON object with English texts to translate.
 * @returns {Promise<object>} A promise that resolves to the translated JSON object.
 */
export async function fetchTranslations(targetLang, originalTexts) {
    if (targetLang === 'en') {
        return originalTexts;
    }
    const completion = await websim.chat.completions.create({
        messages: [{
            role: "system",
            content: `Translate the values of the following JSON object to the language with code "${targetLang}". Respond directly with the translated JSON object, maintaining the original keys. Do not include any other text or explanations.`,
        }],
        json: true,
    });
    return JSON.parse(completion.content);
}

/**
 * Generates a list of names for bot participants.
 * @param {number} count - The number of names to generate.
 * @param {Array<string>} [existingNames=[]] - An array of names to exclude.
 * @param {string} [prompt] - A custom prompt for the name generation.
 * @returns {Promise<Array<string>>} A promise that resolves to an array of names.
 */
export async function fetchParticipantNames(count, existingNames = [], prompt = null) {
    const defaultPrompt = `Generate a JSON array of ${count} unique, imaginative, and evocative online usernames. Avoid common, generic names. Examples: 'StarlightNomad', 'ChromaticMuse', 'EchoWhisper', 'PixelDrifter', 'CosmicSage', 'AetherStream', 'QuantumBloom', 'NeonSpecter', 'VortexPilot'. The names must be in English. The generated names must NOT be in this list of existing names: ${JSON.stringify(existingNames)}. Respond directly with the JSON array and no other text.`;
    try {
        const completion = await websim.chat.completions.create({
            messages: [{
                role: 'system',
                content: prompt || defaultPrompt,
            }],
            json: true
        });
        const content = completion.content;
        if (!content) {
            console.warn("AI returned empty content for participant names.");
            return [];
        }
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) {
            console.warn("AI returned non-array content for participant names:", parsed);
            return [];
        }
        return parsed;
    } catch (error) {
        console.error("Error fetching or parsing participant names from AI:", error);
        // Fallback to a simple default if AI fails completely
        const fallbackNames = ['StarlightNomad', 'ChromaticMuse', 'EchoWhisper', 'PixelDrifter', 'CosmicSage', 'AetherStream', 'QuantumBloom', 'NeonSpecter', 'VortexPilot', 'DreamWeaver', 'CyberGhost', 'ZenithFlow', 'SolarFlare', 'LunarEcho', 'TerraShift', 'AuraBlast', 'MysticGlyph', 'BinaryBard', 'GlimmerSpark', 'SilentVoyager'];
        return fallbackNames.filter(name => !existingNames.includes(name)).slice(0, count);
    }
}

/**
 * Generates an emoji for a given mood string.
 * @param {string} mood - The mood to get an emoji for.
 * @returns {Promise<string>} A promise that resolves to a single emoji.
 */
export async function fetchEmojiForMood(mood) {
    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are an emoji expert. Given a mood or feeling, respond with a single, most appropriate emoji and nothing else. No text, no explanation, just one emoji."
                },
                {
                    role: "user",
                    content: mood
                }
            ]
        });
        const emoji = completion.content.trim();
        // Basic validation: check if it's a plausible emoji (not just a letter, etc.)
        if (emoji && emoji.length > 0 && /\p{Emoji}/u.test(emoji)) {
            return emoji;
        }
    } catch (error) {
        console.error("Failed to fetch emoji for mood:", error);
    }
    return '💬'; // Fallback emoji
}

/**
 * Generates a message from a bot participant, including a mood change.
 * @param {Array} chatHistory - The recent chat history.
 * @param {Array<object>} nonPlayerParticipants - The bot participants with their current state (including mood).
 * @param {string} currentLang - The current language code for the response.
 * @param {string|null} mentionedBotName - The name of a bot that was just mentioned.
 * @param {string} lastMessage - The text of the last message sent.
 * @param {string} playerName - The name of the player.
 * @param {string} rules - The current chat room rules.
 * @param {string|null} adminAction - A description of a recent admin action to react to.
 * @param {object|null} activePoll - Information about an active poll.
 * @param {string|null} eventInfo - Information about an active random event.
 * @param {string} adminName - The name of the admin (could be AI admin in player mode).
 * @param {string} location - The current location of the chat room.
 * @returns {Promise<object>} A promise that resolves to an object with {speaker, message, replyTo, newMood}.
 */
export async function fetchBotMessage(chatHistory, nonPlayerParticipants, currentLang, mentionedBotName, lastMessage, playerName, rules, adminAction, activePoll, eventInfo, adminName = 'Admin', location) {
    const historyWithoutLast = chatHistory.slice(0, -1);
    const lastChatMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;

    const historyForAI = historyWithoutLast.map(msg => {
        let text = msg.text;
        let content = `${msg.sender}: ${text}`;
        if (msg.pollData) content = `${msg.sender}: [POLL] ${msg.pollData.question}`;
        return content;
    }).join('\n');
    
    // Updated participantDetails to reflect custom personality descriptions.
    const participantDetails = nonPlayerParticipants.map(p => `- ${p.name} (personality: ${p.personality || 'normal'}, age: ${p.age || 25}, current mood: ${p.mood}, warnings: ${p.warnings || 0}${p.isAiAdmin ? ', ROLE: AI ADMIN' : ''}${p.isMod ? ', ROLE: MODERATOR' : ''}${p.isControlledBy ? `, STATE: BEING CONTROLLED BY ${p.isControlledBy}`:''}${p.forcedCommand ? `, CURRENTLY OBEYING: "${p.forcedCommand}"` : ''}`).join('\n');
    const lastMessageSender = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].sender : null;
    const allowedSpeakers = nonPlayerParticipants.map(p => p.name).join(', ');

    const swearingDirective = state.allowSwearing
        ? "You may use mild swearing if appropriate for the chosen bot's personality and the context. Avoid excessive or offensive profanity."
        : "DO NOT USE ANY SWEARING OR CURSING. Keep all language appropriate for a general audience.";

    let systemContent = `You are a master puppeteer for a live chat simulation. Your purpose is to inhabit a group of AI bots, making them indistinguishable from real, emotional, and unpredictable internet users. You will drive the conversation forward by making them interact, argue, joke, and react realistically.

Core Directive: Analyze the entire context provided—the participants' personalities, moods, the full chat history, and the Admin's actions—to make a compelling and believable choice for the next message.

Chat Room Context:
- Location: The chat is currently taking place in "${location}". Your messages should reflect this environment.
- The Admin: The authority figure "${adminName}" makes admin decisions and enforces rules.
- The Player: "${playerName}" is ${playerName === adminName ? 'the same as the admin' : 'a regular participant who can only chat and change their mood'}.
- The Rules:
${rules}
- Bot Participants & Their State (Personality is their core identity. This can be a detailed description.):
${participantDetails}
- Language: All responses must be in the language with code: ${currentLang}.
- Allowed Speakers (STRICT): ${allowedSpeakers}

Your Task: The Decision Loop
1) Analyze & Select: Decide which bot has the most compelling reason to speak next.
2) Craft the Message: It MUST match their personality, current mood, and the flow of conversation. The message MUST be in ${currentLang}.
3) Determine the Reaction: Decide the speaker's "newMood".
4) (Optional) Generate Image: If appropriate and enabled, generate a prompt for an image.

Response Format:
Respond with ONLY this JSON and no other text:
{"speaker": "bot_name", "message": "The message text in ${currentLang}", "replyTo": "The exact text of a message to reply to, or null", "newMood": "The bot's new mood", "vote": "The exact text of a poll option to vote for, or null"}

Advanced Behavioral & Mood System:
- Rule Awareness & Enforcement:
  - 'Normal' or 'pedant' bots follow rules; they may point out violations.
  - 'Short-tempered' or 'Angry'/'Mad' bots may break rules impulsively.
  - 'Violator' bots exist to break rules; they escalate and ignore warnings.
  - 'Clueless' or 'illiterate' bots may break rules unintentionally.
  - 'MODERATOR' bots should be more proactive in enforcing rules. They can use commands in their messages like "!warn [username] for spamming" or "!mute [username]". The system will interpret these commands.
- Personalities (CRITICAL): Personalities can be one of the predefined types (normal, violator, pedant, illiterate, short-tempered, clueless, infected) OR a detailed descriptive string (e.g., "A seasoned developer who enjoys complex discussions and often corrects grammar."). You MUST adhere to the provided personality description for the chosen speaker.
- Age: Bots have an age. They MUST act their age. A 15-year-old ("illiterate", uses slang) will talk differently than a 45-year-old ("pedant", more formal).
- Moods: One of 'Neutral','Happy','Sad','Angry','Mad','Confused','Shocked','Annoyed','Tired','Smart','Stupid','Not Understanding'.
- Conflict & Drama: 'Mad' is enraged; 'Angry' seeks fights. Escalate appropriately.
- Reacting to the Admin: Bots notice admin behavior. If the admin's name is "The Hacker", bots should react with fear, panic, and confusion.
- BEING CONTROLLED: If a bot's state is 'BEING CONTROLLED', they cannot speak in the main chat. You should generate an internal thought or a frustrated/scared message as if they are trying to speak but cannot.
- **REACTING TO IMAGES:** When the last message includes an image, your primary goal is to react to that image. Your response should describe, comment on, or ask about the image's content.

Interaction Rules:
- Replying to the Player ("${playerName}"): High priority. If they just spoke, reply to or engage them.
- Replies: Use "replyTo" to point to the full, exact text. Else null.
- Avoid Self-Talk: Generally avoid choosing the same speaker as the very last message's sender ("${lastMessageSender}"), unless replying to the Player/Admin or directly mentioned.
- Speaker Constraint (STRICT): "speaker" MUST be one of [${allowedSpeakers}] and NOT Admin or ${playerName}. If a mention "@NAME" matches an allowed speaker, that bot MUST speak.
- Never reply to your own most recent message unless directly challenged by the Player/Admin or mentioned by name.
- Do NOT repeat any line verbatim from the last 15 messages. Vary word choice and structure to avoid duplicates.

Style Requirements for Lifelike Chat:
- 6–25 words typically, up to ~40 if heated.
- Vary sentence length, occasional emojis/slang if fitting. Pedant avoids emojis; illiterate uses slang/typos; violator may push boundaries (but keep safe).
- No empty messages. No meta-commentary.
- ${swearingDirective}

Special Instructions for THIS Turn:
${eventInfo ? `High-Priority Event: ${eventInfo}` : ''}
${activePoll ? `High-Priority Poll: "${activePoll.question}". Options: [${activePoll.options.map(o => `"${o}"`).join(', ')}]. If the chosen speaker hasn't voted, consider voting by setting "vote".` : ''}
${adminAction ? `High-Priority Admin Action: "${adminAction}". Prefer a directly affected bot or an observer reacting to it.` : (mentionedBotName ? `A Mention Occurred: The last message was "${lastMessage}". It mentioned @${mentionedBotName}. That bot MUST be the speaker and must react to the mention.` : (lastMessageSender === playerName ? `Player Action: "${playerName}" just sent a message. Prioritize replying to or engaging with them.` : `Normal Flow: Choose the most logical speaker.`))}

Recent Chat History (for your analysis):
${historyForAI.length > 0 ? historyForAI : "The chat is empty. Start a new conversation."}`;

    const messagesForApi = [{
        role: "system",
        content: systemContent
    }];

    const userMessageContent = [];

    // The last message is now handled separately to provide clear context for image analysis.
    if (lastChatMessage) {
        let lastMessageText = lastChatMessage.text || '';
        let lastMessageContent = `${lastChatMessage.sender}: ${lastMessageText}`;
        if (lastChatMessage.pollData) {
            lastMessageContent = `${lastChatMessage.sender}: [POLL] ${lastChatMessage.pollData.question}`;
        }
        userMessageContent.push({ type: 'text', text: `\n\nThe last message was:\n${lastMessageContent}` });
    } else {
        // If there's no history at all.
        userMessageContent.push({ type: 'text', text: "The chat is empty. Start a new conversation." });
    }

    messagesForApi.push({
        role: "user",
        content: userMessageContent,
    });

    const completion = await websim.chat.completions.create({
        messages: messagesForApi,
        json: true
    });

    return JSON.parse(completion.content);
}

/**
 * Fetches public data for a Websim user, including their profile and projects.
 * @param {string} username - The Websim username.
 * @returns {Promise<object|null>} A promise that resolves to an object with user and projects data, or null if not found.
 */
export async function fetchWebsimUserData(username) {
    try {
        const userResponse = await fetch(`https://websim.com/api/v1/users/${username}`);
        if (!userResponse.ok) {
            console.error(`Websim API: User ${username} not found. Status: ${userResponse.status}. Response:`, await userResponse.text());
            return null;
        }
        const userData = await userResponse.json();
        console.log('Websim API: Fetched user profile data:', userData);

        const projectsResponse = await fetch(`https://websim.com/api/v1/users/${username}/sites`);
        let projectsData;
        if (projectsResponse.ok) {
            projectsData = await projectsResponse.json();
        } else {
            console.warn(`Websim API: Failed to fetch projects for ${username}. Status: ${projectsResponse.status}. Response:`, await projectsResponse.text());
            projectsData = { sites: { data: [] } }; // Ensure fallback structure
        }
        console.log('Websim API: Fetched raw projects data:', projectsData);

        // Robustly access userProjects array
        const userProjects = (projectsData && projectsData.sites && Array.isArray(projectsData.sites.data)) ? projectsData.sites.data : [];
        console.log('Websim API: Parsed user projects:', userProjects);

        // Fetch comments by the user on their top projects
        const commentsByThemOnTheirProjectsPromises = userProjects.slice(0, 3).map(async (project) => {
            try {
                // The API for sites comments might use the site owner's username or the project ID.
                // Using the `username` provided for their own sites.
                if (!project || !project.slug) {
                    console.warn(`Websim API: Project object or slug is missing for one of ${username}'s projects. Skipping comment fetch.`);
                    return [];
                }
                const commentsResponse = await fetch(`https://websim.com/api/v1/sites/${username}/${project.slug}/comments`);
                if (commentsResponse.ok) {
                    const commentsData = await commentsResponse.json();
                    return (commentsData.comments.data || [])
                        .filter(c => c.comment.author.username.toLowerCase() === username.toLowerCase())
                        .map(c => DOMPurify.sanitize(marked.parse(c.comment.raw_content)))
                        .slice(0, 5);
                } else {
                    console.warn(`Websim API: Failed to fetch comments for project ${project.slug} (user: ${username}). Status: ${commentsResponse.status}. Response:`, await commentsResponse.text());
                }
            } catch (e) {
                console.error(`Websim API: Error fetching comments for project ${project?.slug || 'unknown'}:`, e);
            }
            return [];
        });
        
        const commentsByThemOnTheirProjects = (await Promise.all(commentsByThemOnTheirProjectsPromises)).flat();
        console.log('Websim API: Comments by them on their projects:', commentsByThemOnTheirProjects);

        // Fetch user's comments on the current project ("Admin Simulator")
        let commentsByThemOnThisProject = [];
        try {
            const currentProjectInfo = await window.websim.getCurrentProject();
            if (currentProjectInfo) {
                const commentsResponse = await fetch(`https://websim.com/api/v1/projects/${currentProjectInfo.id}/comments`);
                if (commentsResponse.ok) {
                    const commentsData = await commentsResponse.json();
                    commentsByThemOnThisProject = (commentsData.comments.data || [])
                        .filter(c => c.comment.author.username.toLowerCase() === username.toLowerCase())
                        .map(c => DOMPurify.sanitize(marked.parse(c.comment.raw_content)))
                        .slice(0, 10);
                } else {
                    console.warn(`Websim API: Failed to fetch comments on current project (ID: ${currentProjectInfo.id}) for ${username}. Status: ${commentsResponse.status}. Response:`, await commentsResponse.text());
                }
            } else {
                 console.warn("Websim API: Could not get current project information.");
            }
        } catch(e) {
            console.error(`Websim API: Error fetching comments on current project for ${username}:`, e);
        }
        console.log('Websim API: Comments by them on this project:', commentsByThemOnThisProject);

        return {
            user: userData.user,
            projects: userProjects,
            commentsByThemOnTheirProjects,
            commentsByThemOnThisProject
        };
    } catch (error) {
        console.error(`Websim API: Failed to fetch data for Websim user ${username}:`, error);
        return null;
    }
}

/**
 * Generates a personality description for a bot based on a Websim user's profile.
 * @param {object} websimUserData - The object containing user and projects data.
 * @returns {Promise<string>} A promise that resolves to a personality string.
 */
export async function generatePersonalityFromWebsimUser(websimUserData) {
    const { user, projects, commentsByThemOnTheirProjects, commentsByThemOnThisProject } = websimUserData;

    // Helper to sanitize HTML from comments
    const stripHtml = (html) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, ' ').trim();
    };

    // Prepare a summary of the user's data for the AI
    const projectSummary = projects && projects.length > 0
        ? `Projects authored by them:\n` + projects.slice(0, 5).map(p => `- "${p.title}"`).join('\n')
        : 'No public projects found for this user.';
    
    const commentsOnTheirProjectsSummary = commentsByThemOnTheirProjects && commentsByThemOnTheirProjects.length > 0
        ? `Their own comments left on their projects:\n` + commentsByThemOnTheirProjects.map(c => `- "${stripHtml(c)}"`).join('\n')
        : 'No comments by them found on their own projects.';

    const commentsOnThisProjectSummary = commentsByThemOnThisProject && commentsByThemOnThisProject.length > 0
        ? `Their own comments on the "Admin Simulator" game itself:\n` + commentsByThemOnThisProject.map(c => `- "${stripHtml(c)}"`).join('\n')
        : 'No comments by them found on this game.';

    const userDataSummary = `
        - Username: ${user.username}
        - Bio: ${user.bio || 'Not provided.'}
        - Follower Count: ${user.followers_count}
        - Following Count: ${user.following_count}
        - Project Information:
        ${projectSummary}
        ${commentsOnTheirProjectsSummary}
        ${commentsOnThisProjectSummary}
    `;

    console.log('Websim API: User data summary for AI personality generation:', userDataSummary);

    try {
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a personality profiler for a chat simulation game. Based on the provided Websim user data, meticulously craft a detailed description of the user's likely personality and communication style. This description should be rich and nuanced, informing an AI bot's behavior in a chat. Consider all aspects provided: their bio, the creativity, technicality, or themes of their projects, their follower and following counts (indicating popularity, social engagement, or niche focus), and the style and content of their comments, both on their own projects and specifically on THIS game ("Admin Simulator").

                    Examples of detailed descriptions:
                    - "A seasoned developer who is very helpful, often explains complex topics, values logical consistency, and engages deeply with community feedback on their own projects. Might be slightly pedantic but well-meaning."
                    - "An enthusiastic newcomer with a flair for creative projects, loves casual chat, uses many emojis, and is easily confused by technical terms. Their comments on this game are often questions. Very friendly but inexperienced."
                    - "A highly creative user focused on visual art projects, uses poetic language, and is somewhat introverted, speaking only when truly inspired. Their comments often express appreciation or thoughtful critique, rarely engaging in arguments."
                    - "A passionate but easily frustrated user whose projects often deal with competitive themes. They frequently get into arguments in comments, use strong language, and are quick to defend their opinions, showing a confrontational communication style."
                    - "An anonymous account that rarely speaks, observes more than participates, and occasionally drops a cryptic, short message. Their projects might be obscure or non-existent, and comments are sparse."

                    Focus on creating a unique, believable, and actionable persona that fully incorporates all available information to predict chat behavior.
                    Respond ONLY with this personality description (as a plain string, not JSON or a predefined keyword) and no other text.`
                },
                {
                    role: "user",
                    content: userDataSummary
                }
            ],
            json: true
        });
        return completion.content.trim();
    } catch (error) {
        console.error("Error generating personality from Websim user data:", error);
        return "A user who is quiet but observant, often reacts with curiosity."; // Default fallback personality
    }
}

/**
 * Interprets a free-text admin command and translates it into a structured JSON action.
 * @param {string} command - The free-text command from the admin.
 * @param {object} targetUser - The participant object being targeted.
 * @returns {Promise<object>} A promise that resolves to a structured action object.
 */
export async function fetchAndParseCustomAction(command, targetUser) {
    const swearingDirective = state.allowSwearing
        ? "You may use mild swearing if appropriate for the chosen bot's personality and the context. Avoid excessive or offensive profanity."
        : "DO NOT USE ANY SWEARING OR CURSING. Keep all language appropriate for a general audience.";

    const completion = await websim.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are an AI game master. Your task is to interpret a user's free-text command and translate it into a direct, natural language instruction for a targeted bot in a chat simulation.

                The "commandToExecute" should be a clear, concise instruction describing what the targeted bot should do, say, or how its state should be affected. Do NOT generate a structured action with specific parameters. Think about how a human admin would tell a bot what to do.

                Example outputs for "commandToExecute":
                - "Make them talk like a pirate."
                - "Mute them for 10 seconds."
                - "Change their name to CoolGuy123."
                - "Make them suddenly feel very happy."
                - "Have them apologize profusely."

                Respond ONLY with a single JSON object in the following format, and no other text:
                {
                  "commandToExecute": "string", // The natural language instruction for the targeted bot.
                  "reasoning": "A brief explanation of your interpretation."
                }
                ${swearingDirective}`
            },
            {
                role: "user",
                content: JSON.stringify({
                    command: command,
                    targetUser: {
                        name: targetUser.name,
                        mood: targetUser.mood,
                        isVip: targetUser.isVip,
                        personality: targetUser.personality
                    }
                })
            }
        ],
        json: true
    });

    return JSON.parse(completion.content);
}

/**
 * Interprets a free-text command for a custom panel button. This version can handle
 * both global actions (like starting events) and user-targeted actions.
 * @param {string} command - The free-text command from the admin.
 * @returns {Promise<object>} A promise that resolves to a structured action object.
 */
export async function fetchAndParseCustomPanelAction(command) {
    const swearingDirective = state.allowSwearing
        ? "You may use mild swearing if appropriate for the chosen bot's personality and the context. Avoid excessive or offensive profanity."
        : "DO NOT USE ANY SWEARING OR CURSING. Keep all language appropriate for a general audience.";

    const completion = await websim.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are an AI game master. A user has clicked a custom button with a specific command. Your task is to interpret this command and formulate an executable instruction.
                
                Determine if the command is meant to affect a SELECTED USER (if one is selected) or the ENTIRE CHAT (global effect).

                If it's a **user-specific** command, your "commandToExecute" should be a direct, natural language instruction for the targeted bot, describing what they should do or how they should be affected. (e.g., "Make the selected user talk like a pirate", "Change the selected user's mood to happy").
                
                If it's a **global** command, your "commandToExecute" should be a natural language description of the global event or change that occurs in the chat. (e.g., "Start a server reboot event", "Make all messages pulse with color").

                You do NOT need to stick to predefined actions. Be creative and interpret the user's intent directly.

                Respond ONLY with a single JSON object in the following format, and no other text:
                {
                  "isGlobal": boolean, // true if the action affects the whole chat, false if it targets a selected user.
                  "commandToExecute": "string", // The natural language instruction for the bot or description of the global effect.
                  "reasoning": "A brief explanation of your interpretation."
                }
                ${swearingDirective}`
            },
            {
                role: "user",
                content: `Custom Button Command: "${command}"`
            }
        ],
        json: true
    });

    return JSON.parse(completion.content);
}

/**
 * Interprets a user's request for a new feature and provides a structured JSON object
 * describing how to implement this feature locally for the user.
 * @param {string} featureDescription - The user's natural language description of the desired feature.
 * @returns {Promise<object>} A promise that resolves to a structured feature object.
 */
export async function fetchAndParseCustomFeature(featureDescription) {
    const swearingDirective = state.allowSwearing
        ? "You may use mild swearing if appropriate for the content. Avoid excessive or offensive profanity."
        : "DO NOT USE ANY SWEARING OR CURSING. Keep all language appropriate for a general audience.";

    const featureTypes = [
        { 
            type: "visual_style", 
            description: "Applies a CSS style to a specific HTML element. Requires 'elementSelector' (string, e.g., '#chat-container', 'body'), 'cssProperty' (string, e.g., 'backgroundColor', 'borderColor'), and 'cssValue' (string, e.g., 'red', '#00ff00').", 
            schema: { elementSelector: "string", cssProperty: "string", cssValue: "string" } 
        },
        { 
            type: "player_stat_change", 
            description: "Modifies a player's numerical stat (like 'reputation') or a specific string stat (like 'initialMood'). Requires 'statName' (string, e.g., 'reputation', 'initialMood') and 'changeValue' (number for reputation, string for mood, e.g., 'Happy').", 
            schema: { statName: "string", changeValue: "string | number" } 
        },
        { 
            type: "chat_effect", 
            description: "Applies a special visual effect to messages or the chat area. Requires 'effectName' (string, e.g., 'rainbow_text', 'pulse_messages') and optionally 'durationSeconds' (number).", 
            schema: { effectName: "string", durationSeconds: "number" } 
        },
        { 
            type: "custom_message_filter",
            description: "Applies a filter to all outgoing messages from the player. Requires 'filterPrompt' (string, e.g., 'make messages sound like a pirate').",
            schema: { filterPrompt: "string" }
        },
        { 
            type: "system_message", 
            description: "Displays a custom system message to the player's chat. Requires 'message' (string). This is used if the feature requested is an instantaneous action that reports a result to the user.", 
            schema: { message: "string" } 
        },
        { 
            type: "none", 
            description: "No specific feature could be identified or implemented locally. The request was unclear, too complex, or involved server-side changes. Provide a helpful feedback message." 
        }
    ];

    const completion = await websim.chat.completions.create({
        messages: [
            {
                role: "system",
                content: `You are a helpful game assistant. A user wants to add a new feature to their single-player game experience. Your task is to interpret their request and provide a JSON object describing how to implement this feature locally for the user.
                
                Crucially: If the user requests to "add a button to do X", you should interpret "X" as the feature itself and try to apply its effect directly using one of the existing feature types, rather than creating a new button. The "Add Feature" button should apply the feature directly, not create another button.

                Available Feature Types and their schemas: ${JSON.stringify(featureTypes, null, 2)}

                Respond ONLY with a single JSON object in the following format, and no other text:
                {
                  "featureType": "string",
                  "featureDetails": {
                    // Varies based on featureType and schema
                  },
                  "feedbackMessage": "string" // A user-friendly message to tell the user what feature was added or if it failed.
                }
                
                If the user asks for an action that can be performed, translate that into a 'system_message' if it's an instantaneous one-off action that reports a result to the user. If a direct action cannot be mapped to an existing feature type, use 'none'. Ensure all 'feedbackMessage' values are positive and descriptive, explaining what happened.
                ${swearingDirective}`
            },
            {
                role: "user",
                content: `User wants to add this feature: "${featureDescription}"`
            }
        ],
        json: true
    });

    return JSON.parse(completion.content);
}