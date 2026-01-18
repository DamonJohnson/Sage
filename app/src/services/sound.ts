/**
 * Sound Service
 *
 * Handles playing sound effects throughout the app.
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// Sound effect URLs (using free sound effects from Mixkit)
const SOUNDS = {
  celebration: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3', // Positive notification ding
};

export type SoundType = keyof typeof SOUNDS;

// Cache loaded sounds
const soundCache: Map<SoundType, Audio.Sound> = new Map();

/**
 * Initialize audio settings
 */
export async function initializeAudio(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (error) {
    console.warn('Failed to initialize audio:', error);
  }
}

/**
 * Play a sound effect
 */
export async function playSound(
  type: SoundType,
  options?: { volume?: number }
): Promise<void> {
  try {
    // Check if sound effects are enabled (you could pass this from settings)
    const volume = options?.volume ?? 0.7;

    // Try to use cached sound first
    let sound = soundCache.get(type);

    if (!sound) {
      // Load the sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: SOUNDS[type] },
        { shouldPlay: false, volume }
      );
      sound = newSound;
      soundCache.set(type, sound);
    }

    // Reset to beginning and play
    await sound.setPositionAsync(0);
    await sound.setVolumeAsync(volume);
    await sound.playAsync();
  } catch (error) {
    // Silently fail - sound effects are not critical
    console.warn('Failed to play sound:', error);
  }
}

/**
 * Play celebration sound for quiz completion
 */
export async function playCelebrationSound(): Promise<void> {
  await playSound('celebration', { volume: 0.6 });
}

/**
 * Cleanup all cached sounds
 */
export async function cleanupSounds(): Promise<void> {
  for (const sound of soundCache.values()) {
    try {
      await sound.unloadAsync();
    } catch (error) {
      // Ignore cleanup errors
    }
  }
  soundCache.clear();
}
