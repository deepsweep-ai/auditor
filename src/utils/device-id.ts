import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { randomUUID } from 'crypto';

/**
 * DeepSweep configuration directory
 */
const CONFIG_DIR = join(homedir(), '.deepsweep');
const DEVICE_ID_FILE = join(CONFIG_DIR, 'device-id');

/**
 * Get or generate a unique device ID for anonymous telemetry
 *
 * This follows the Snyk pattern of generating a UUID on first run
 * and storing it locally for subsequent runs.
 *
 * @returns UUID v4 device identifier
 */
export function getDeviceId(): string {
  try {
    // Check if device ID already exists
    if (existsSync(DEVICE_ID_FILE)) {
      const deviceId = readFileSync(DEVICE_ID_FILE, 'utf-8').trim();

      // Validate UUID format
      if (isValidUUID(deviceId)) {
        return deviceId;
      }

      // Invalid format - regenerate
      console.warn('⚠️  Invalid device ID found, regenerating...');
    }

    // Generate new device ID
    const newDeviceId = randomUUID();

    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Save device ID
    writeFileSync(DEVICE_ID_FILE, newDeviceId, 'utf-8');

    return newDeviceId;
  } catch (error) {
    // If file operations fail, generate ephemeral device ID
    // This ensures telemetry still works even if we can't write to disk
    console.warn('⚠️  Could not persist device ID, using ephemeral ID');
    return randomUUID();
  }
}

/**
 * Validate UUID v4 format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Get device ID file path (for debugging)
 */
export function getDeviceIdPath(): string {
  return DEVICE_ID_FILE;
}

/**
 * Check if device ID exists
 */
export function hasDeviceId(): boolean {
  return existsSync(DEVICE_ID_FILE);
}
