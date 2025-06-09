const messages = [];
    const input = document.getElementById('messageInput');
    const logButton = document.getElementById('logButton');
    const counter = document.getElementById('counter');
    const timer = document.getElementById('timer');
    const logTable = document.getElementById('logTable');
    const progressBar = document.getElementById('progressBar');
    const copyLastButton = document.getElementById('copyLastButton');

    function updateTimerDisplay() {
      if (messages.length === 0) {
        timer.textContent = 'Minuteur : 00:00:00';
        return;
      }
      const now = Date.now();
      const firstMessage = messages[0];
      const elapsed = now - firstMessage.timestamp;
      const hours = String(Math.floor(elapsed / 3600000)).padStart(2, '0');
      const minutes = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, '0');
      const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
      timer.textContent = `Minuteur : ${hours}:${minutes}:${seconds}`;
    }

    function updateProgressBar(count) {
      const percent = Math.min((count / 80) * 100, 100);
      progressBar.style.width = `${percent}%`;
      if (count >= 70) {
        progressBar.style.backgroundColor = 'red';
      } else if (count >= 50) {
        progressBar.style.backgroundColor = 'orange';
      } else {
        progressBar.style.backgroundColor = '#4caf50';
      }
    }

    function formatTime(ms) {
      const totalSeconds = Math.max(0, Math.floor(ms / 1000));
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }

    // On garde une référence sur les cellules minuteur pour les mettre à jour
    const timerCells = [];

    function addMessageToTable(message) {
      const row = document.createElement('tr');
      const timeCell = document.createElement('td');
      const timerCell = document.createElement('td');
      const contentCell = document.createElement('td');
      const date = new Date(message.timestamp);
      timeCell.textContent = date.toLocaleTimeString();

      // Minuteur individuel (commence à 03:00:00)
      timerCell.textContent = '03:00:00'; // 3h
      timerCells.push({cell: timerCell, timestamp: message.timestamp, row});

      // Affiche les 40 premiers caractères, puis "..." s'il y a une suite
      let displayContent = message.content.slice(0, 40);
      if (message.content.length > 40) {
        displayContent += '...';
      }
      contentCell.textContent = displayContent;
      contentCell.title = message.content;

      if (messages.length >= 70) {
        const warningIcon = document.createElement('span');
        warningIcon.textContent = '⚠️';
        warningIcon.classList.add('warning-icon');
        contentCell.prepend(warningIcon);
      }

      row.appendChild(timeCell);
      row.appendChild(timerCell);
      row.appendChild(contentCell);
      logTable.appendChild(row);
    }

    // Met à jour tous les minuteurs individuels
    function updateAllMessageTimers() {
      const now = Date.now();
      for (const {cell, timestamp, row} of timerCells) {
        const elapsed = now - timestamp;
        const remaining = 3 * 60 * 60 * 1000 - elapsed; // 3h
        if (remaining <= 0) {
          cell.textContent = '00:00:00';
        } else {
          cell.textContent = formatTime(remaining);
        }
      }
    }

    // Adapter la suppression des messages pour retirer aussi la cellule minuteur associée
    function updateCounter() {
      const now = Date.now();
      const windowStart = now - 3 * 60 * 60 * 1000; // 3h
      while (messages.length && messages[0].timestamp <= windowStart) {
        const removed = messages.shift();
        logTable.removeChild(logTable.firstChild);
        timerCells.shift();

        // Demande au main process de supprimer ce message du fichier JSON
        window.electronAPI.deleteMessage(removed.timestamp);
      }

      const count = messages.length;
      updateProgressBar(count);

      let warning = count >= 70 ? ' ⚠️' : '';
      counter.textContent = `Messages dans les 3 dernières heures : ${count} / 80${warning}`; // Texte 3h

      // Désactive le bouton si la limite est atteinte
      logButton.disabled = count >= 80;
      input.disabled = count >= 80;
    }

    function logMessage(content) {
      const now = Date.now();
      const message = { content, timestamp: now };
      messages.push(message);
      addMessageToTable(message);
      updateCounter();

      // Envoie le message à sauvegarder au main process via preload
      window.electronAPI.saveMessage(message);
    }

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

    setInterval(() => {
      updateCounter();
      updateTimerDisplay();
      updateAllMessageTimers();
    }, 1000);

    updateCounter();
    updateTimerDisplay();

    window.electronAPI.onLoadMessages((messagesFromMain) => {
      messagesFromMain.forEach(msg => {
        messages.push(msg);
        addMessageToTable(msg);
      });
      updateCounter();
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

    // (Optionnel) Désactive le bouton si aucun message n'est enregistré
    function updateCopyButtonState() {
      copyLastButton.disabled = messages.length === 0;
    }
    setInterval(updateCopyButtonState, 500);

    // Gestion des onglets
    document.querySelectorAll('.tabs a').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Désactive tous les onglets
        document.querySelectorAll('.tabs li').forEach(li => li.classList.remove('is-active'));
        document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        
        // Active l'onglet cliqué
        const tabId = e.target.getAttribute('data-tab');
        e.target.parentElement.classList.add('is-active');
        document.getElementById(`${tabId}-tab`).style.display = 'block';
      });
    });

    // Fonction pour mettre à jour l'affichage des stats
    function updateStatsDisplay(stats) {
      // Totaux
      document.getElementById('total-messages').textContent = stats.totals.messages;
      document.getElementById('total-tokens').textContent = stats.totals.tokens;
      document.getElementById('avg-chars').textContent = Math.round(stats.totals.avgCharactersPerMessage);
      
      // Par jour
      document.getElementById('monday-count').textContent = stats.byDay.monday;
      document.getElementById('tuesday-count').textContent = stats.byDay.tuesday;
      document.getElementById('wednesday-count').textContent = stats.byDay.wednesday;
      document.getElementById('thursday-count').textContent = stats.byDay.thursday;
      document.getElementById('friday-count').textContent = stats.byDay.friday;
      document.getElementById('saturday-count').textContent = stats.byDay.saturday;
      document.getElementById('sunday-count').textContent = stats.byDay.sunday;
      
      // Par période
      document.getElementById('today-count').textContent = stats.byPeriod.today;
      document.getElementById('week-count').textContent = stats.byPeriod.week;
      document.getElementById('month-count').textContent = stats.byPeriod.month;
      document.getElementById('year-count').textContent = stats.byPeriod.year;
      
      // Moyennes
      document.getElementById('avg-day').textContent = Math.round(stats.averages.perDay);
      document.getElementById('avg-week').textContent = Math.round(stats.averages.perWeek);
      document.getElementById('avg-month').textContent = Math.round(stats.averages.perMonth);
      document.getElementById('avg-year').textContent = Math.round(stats.averages.perYear);
    }

    // Ajouter les écouteurs d'événements pour les stats
    window.electronAPI.onStatsUpdated((stats) => {
      window.currentStats = stats;
      updateStatsDisplay(stats);
      // Recharge l'historique selon la période sélectionnée
      const period = document.getElementById('history-period-select').value;
      renderHistoryTable(stats, period);
    });

    window.electronAPI.onStatsLoaded((stats) => {
      if (stats) {
        window.currentStats = stats; // Pour garder les stats accessibles
        updateStatsDisplay(stats);
        // Affichage initial de l'historique (par défaut quotidien)
        renderHistoryTable(stats, 'daily');
      }
    });

    // Fonction pour générer dynamiquement le tableau d'historique
    function renderHistoryTable(stats, period) {
      const tableHeader = document.getElementById('history-table-header');
      const tableBody = document.getElementById('history-table-body');
      tableHeader.innerHTML = '';
      tableBody.innerHTML = '';

      // Définir les colonnes selon la période
      let columns = [];
      if (period === 'daily') {
        columns = ['Date', 'Messages', 'Tokens', 'Moyenne caractères'];
      } else if (period === 'weekly') {
        columns = ['Début semaine', 'Fin semaine', 'Messages', 'Tokens', 'Moyenne caractères'];
      } else if (period === 'monthly') {
        columns = ['Mois', 'Messages', 'Tokens', 'Moyenne caractères'];
      }

      // Générer l'en-tête
      columns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col;
        tableHeader.appendChild(th);
      });

      // Récupérer les données
      const data = stats.history[period];

      // Pour le calcul de la moyenne globale sur la période sélectionnée
      let totalMessages = 0;
      let totalTokens = 0;
      let totalAvgChars = 0;

      data.forEach(entry => {
        const tr = document.createElement('tr');
        if (period === 'daily') {
          tr.innerHTML = `
            <td>${entry.date}</td>
            <td>${entry.messages}</td>
            <td>${entry.tokens}</td>
            <td>${Math.round(entry.avgCharactersPerMessage)}</td>
          `;
        } else if (period === 'weekly') {
          tr.innerHTML = `
            <td>${entry.weekStart}</td>
            <td>${entry.weekEnd}</td>
            <td>${entry.messages}</td>
            <td>${entry.tokens}</td>
            <td>${Math.round(entry.avgCharactersPerMessage)}</td>
          `;
        } else if (period === 'monthly') {
          tr.innerHTML = `
            <td>${entry.month}</td>
            <td>${entry.messages}</td>
            <td>${entry.tokens}</td>
            <td>${Math.round(entry.avgCharactersPerMessage)}</td>
          `;
        }
        tableBody.appendChild(tr);

        // Pour la moyenne globale
        totalMessages += entry.messages;
        totalTokens += entry.tokens;
        totalAvgChars += entry.avgCharactersPerMessage;
      });

      // Afficher la moyenne globale en bas du tableau
      if (data.length > 0) {
        const avgMessages = Math.round(totalMessages / data.length);
        const avgTokens = Math.round(totalTokens / data.length);
        const avgChars = Math.round(totalAvgChars / data.length);

        const tr = document.createElement('tr');
        tr.style.fontWeight = 'bold';
        if (period === 'daily') {
          tr.innerHTML = `
            <td>Moyenne</td>
            <td>${avgMessages}</td>
            <td>${avgTokens}</td>
            <td>${avgChars}</td>
          `;
        } else if (period === 'weekly') {
          tr.innerHTML = `
            <td colspan="2">Moyenne</td>
            <td>${avgMessages}</td>
            <td>${avgTokens}</td>
            <td>${avgChars}</td>
          `;
        } else if (period === 'monthly') {
          tr.innerHTML = `
            <td>Moyenne</td>
            <td>${avgMessages}</td>
            <td>${avgTokens}</td>
            <td>${avgChars}</td>
          `;
        }
        tableBody.appendChild(tr);
      }
    }

    // ... après avoir chargé les stats ...
    document.getElementById('history-period-select').addEventListener('change', function() {
      const period = this.value;
      // On suppose que tu as déjà les stats chargées dans une variable globale, sinon il faut les recharger
      renderHistoryTable(window.currentStats, period);
    });