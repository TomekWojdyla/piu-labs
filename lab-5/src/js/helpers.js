// src/js/helpers.js

// losowy pastelowy kolor HSL
export function randomHsl() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 75%)`;
}
