// This file manages the background music for the game.

const songs = ['/Song1.mp3', '/Song2.mp3', '/Song3.mp3'];
const backgroundMusicPlayer = new Audio();
const hackerMusicPlayer = new Audio('/BeHackerSong1.mp3');

let currentMusic = null; // Can be 'background', 'hacker', or null
let isPausedForBoss = false;
export let musicVolume = 0.25;

/**
 * Sets the volume for all music players and saves it.
 * @param {number} volume - A value between 0.0 and 1.0.
 */
export function setMusicVolume(volume) {
    musicVolume = parseFloat(volume);
    if (isNaN(musicVolume)) {
        musicVolume = 0.25;
    }
    
    // Clamp the volume between 0 and 1
    musicVolume = Math.max(0, Math.min(1, musicVolume));
    
    backgroundMusicPlayer.volume = musicVolume;
    hackerMusicPlayer.volume = musicVolume;

    try {
        localStorage.setItem('admin_sim_music_volume', musicVolume);
    } catch (e) {
        console.warn("Could not save volume to localStorage:", e);
    }
}

/**
 * Stops all music playback.
 */
function stopAllMusic() {
    if (backgroundMusicPlayer) backgroundMusicPlayer.pause();
    if (hackerMusicPlayer) hackerMusicPlayer.pause();
    currentMusic = null;
}

/**
 * Picks a new random song and plays it. It avoids playing the same song twice in a row.
 */
function playRandomSong() {
    if (currentMusic !== 'background') return;

    // Get the current song path, if any, to avoid repeating it.
    const currentSrc = backgroundMusicPlayer.src ? new URL(backgroundMusicPlayer.src).pathname : '';
    
    // Filter out the currently playing song from the list of available songs.
    let availableSongs = songs.filter(song => song !== currentSrc);
    if (availableSongs.length === 0) {
        // If all songs have been filtered (e.g., only one song in the list), just use the full list.
        availableSongs = songs;
    }
    
    // Select a random song from the filtered list.
    const nextSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
    
    backgroundMusicPlayer.src = nextSong;
    backgroundMusicPlayer.play().catch(e => console.error("Audio playback failed:", e));
}

/**
 * Starts playing the background music playlist.
 */
export function startBackgroundMusic() {
    if (currentMusic === 'background') return;
    stopAllMusic();
    currentMusic = 'background';
    isPausedForBoss = false;
    playRandomSong();
}

/**
 * Starts playing the hacker theme music.
 */
export function startHackerMusic() {
    if (currentMusic === 'hacker') return;
    stopAllMusic();
    currentMusic = 'hacker';
    hackerMusicPlayer.loop = true;
    hackerMusicPlayer.play().catch(e => console.error("Hacker music playback failed:", e));
}

/**
 * Pauses the background music specifically for the boss fight.
 */
export function pauseForBoss() {
    if (!currentMusic) return;
    isPausedForBoss = true;
    if (currentMusic === 'background') backgroundMusicPlayer.pause();
    if (currentMusic === 'hacker') hackerMusicPlayer.pause();
}

/**
 * Resumes the background music after the boss fight has concluded.
 */
export function resumeAfterBoss() {
    // Only resume if it was specifically paused for the boss.
    if (isPausedForBoss) {
        isPausedForBoss = false;
        if (currentMusic === 'background') {
            backgroundMusicPlayer.play().catch(e => console.error("Audio resume failed:", e));
        } else if (currentMusic === 'hacker') {
            hackerMusicPlayer.play().catch(e => console.error("Audio resume failed:", e));
        }
    }
}

/**
 * Initializes the audio player by setting up the event listener for when a song ends.
 */
function initializeAudio() {
    // Load volume from storage if available
    try {
        const savedVolume = localStorage.getItem('admin_sim_music_volume');
        if (savedVolume !== null) {
            musicVolume = parseFloat(savedVolume);
        }
    } catch (e) {
        console.warn("Could not read volume from localStorage:", e);
    }
    setMusicVolume(musicVolume); // This also sets the player volumes

    // When the current song finishes, automatically play the next random one.
    backgroundMusicPlayer.addEventListener('ended', playRandomSong);
}

// Run the initialization function when the module is loaded.
initializeAudio();