/**
 * E2EE Crypto Utilities for STChat
 * Uses Web Crypto API for AES-GCM encryption
 */

// Silent, fixed secret for the public room - never leaves the client
const ROOM_SECRET = "STChat_Public_Access_Secret_Key_2024";
const ROOM_SALT = new TextEncoder().encode("STChat_Global_Salt_v1");

/**
 * Derives a consistent AES-GCM key locally from a fixed secret.
 * This ensures the server never has the key.
 */
export async function getSharedRoomKey() {
    const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(ROOM_SECRET),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: ROOM_SALT,
            iterations: 100000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

// Generate a new room encryption key (DEPRECATED - moving to fixed derivation)
export async function generateRoomKey() {
    return getSharedRoomKey();
}

// Export key to base64 string for sharing
export async function exportKey(key) {
    const exported = await crypto.subtle.exportKey('raw', key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

// Import key from base64 string
export async function importKey(base64Key) {
    const keyData = Uint8Array.from(atob(base64Key), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    return key;
}

// Encrypt a message
export async function encryptMessage(key, plaintext) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate random IV for each message
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    // Return base64 encoded ciphertext and IV
    return {
        ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv))
    };
}

// Decrypt a message
export async function decryptMessage(key, ciphertext, ivBase64) {
    try {
        const encryptedData = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encryptedData
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        return '[Decryption failed]';
    }
}
