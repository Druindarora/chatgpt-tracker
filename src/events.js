import { logMessage } from './messages.js';
import { updateStatsDisplay, renderHistoryTable } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('data-cliprelay-tracker-input');
  const logButton = document.getElementById('log-button');
  const copyLastButton = document.getElementById('copy-last-button');

  logButton.addEventListener('click', () => {
      const content = input.value.trim();
      if (!content) return;
      logMessage(content);
      input.value = '';
  });

  document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && document.activeElement === input) {
        e.preventDefault();
        const content = input.value.trim();
        if (!content) return;
        logMessage(content);
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