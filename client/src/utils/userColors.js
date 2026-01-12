// Generate a deterministic color based on username
// Uses a simple hash to create consistent colors for each user
export const getUserColor = (username) => {
    if (!username) return '#3b82f6'; // Default blue

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate HSL color with good saturation and lightness for dark theme
    const hue = Math.abs(hash) % 360;
    const saturation = 65 + (Math.abs(hash >> 8) % 20); // 65-85%
    const lightness = 55 + (Math.abs(hash >> 16) % 15); // 55-70%

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Get darker version of a color for backgrounds
export const getUserColorDark = (username) => {
    if (!username) return '#1e3a5f';

    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 40%, 25%)`;
};

// Get user initial (first letter, uppercase)
export const getUserInitial = (username) => {
    if (!username) return '?';
    return username.charAt(0).toUpperCase();
};
