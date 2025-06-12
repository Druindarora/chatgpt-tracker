import { updateCounter } from './messages.js';
import { updateTimerDisplay, updateAllMessageTimers, updateStatsDisplay } from './ui.js';

// Ajoute ces écouteurs pour mettre à jour les stats à la réception des événements IPC
window.electronAPI.onStatsUpdated((stats) => {
    updateStatsDisplay(stats);
});
window.electronAPI.onStatsLoaded((stats) => {
    updateStatsDisplay(stats);
});

setInterval(() => {
    updateCounter();
    updateTimerDisplay();
    updateAllMessageTimers();
}, 1000);
