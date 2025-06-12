import { logMessage } from './messages.js';
import { updateStatsDisplay, renderHistoryTable } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('data-cliprelay-tracker-input');
  const logButton = document.getElementById('logButton'); // Correction ici
  const copyLastButton = document.getElementById('copyLastButton'); // Correction ici

  logButton.addEventListener('click', () => {
      console.log('[LOG] Clic sur le bouton ENREGISTRER');
      const content = input.value.trim();
      console.log('[LOG] Valeur de l\'input :', content);
      if (!content) {
        console.log('[LOG] Aucun contenu, on ne fait rien.');
        return;
      }
      logMessage(content);
      console.log('[LOG] logMessage appelé depuis le clic');
      input.value = '';
  });

  document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement === input) {
        e.preventDefault();
        console.log('[LOG] Touche Entrée pressée dans l\'input');
        const content = input.value.trim();
        console.log('[LOG] Valeur de l\'input :', content);
        if (!content) {
          console.log('[LOG] Aucun contenu, on ne fait rien.');
          return;
        }
        logMessage(content);
        console.log('[LOG] logMessage appelé depuis Entrée');
        input.value = '';
      }
  });

  copyLastButton.addEventListener('click', () => {
      if (messages.length === 0) return;
      const lastMessage = messages[messages.length - 1].content;
      navigator.clipboard.writeText(lastMessage)
      .then(() => {
          copyLastButton.textContent = 'Copié !';
          setTimeout(() => {
            copyLastButton.textContent = 'Copier le dernier message';
          }, 1000);
      });
  });

  document.getElementById('history-period-select').addEventListener('change', function() {
      const period = this.value;
      renderHistoryTable(window.currentStats, period);
  });

  window.electronAPI.onStatsUpdated((stats) => {
      window.currentStats = stats;
      updateStatsDisplay(stats);
      const period = document.getElementById('history-period-select').value;
      renderHistoryTable(stats, period);
  });

  window.electronAPI.onStatsLoaded((stats) => {
      if (stats) {
        window.currentStats = stats;
        updateStatsDisplay(stats);
        renderHistoryTable(stats, 'daily');
      }
  });

  window.electronAPI.onSetMessage((message) => {
    if (input) {
      input.value = message;
      input.focus();
    }
  });
});