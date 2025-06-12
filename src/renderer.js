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

// Gestion du bouton de réinitialisation des stats
const resetStatsBtn = document.getElementById('reset-stats-btn');
if (resetStatsBtn) {
    resetStatsBtn.addEventListener('click', () => {
        // Envoie un message IPC pour demander la réinitialisation des stats
        window.electronAPI.resetStats();
    });
}
