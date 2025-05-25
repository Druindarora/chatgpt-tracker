const messages = [];
    let totalMessagesCount = 0; // Nouveau compteur total
    const input = document.getElementById('messageInput');
    const logButton = document.getElementById('logButton');
    const counter = document.getElementById('counter');
    const timer = document.getElementById('timer');
    const logTable = document.getElementById('logTable');
    const progressBar = document.getElementById('progressBar');
    const totalMessages = document.getElementById('totalMessages'); // Récupère le nouvel élément
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

    function updateTotalMessages() {
      totalMessages.textContent = `Nombre de messages totaux enregistrés pendant la session : ${totalMessagesCount}`;
    }

    function logMessage(content) {
      const now = Date.now();
      const message = { content, timestamp: now };
      messages.push(message);
      addMessageToTable(message);
      updateCounter();
      totalMessagesCount++;
      updateTotalMessages();

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
    // Initialisation de l'affichage du compteur total au chargement
    updateTotalMessages();

    window.electronAPI.onLoadMessages((messagesFromMain) => {
      messagesFromMain.forEach(msg => {
        messages.push(msg);
        addMessageToTable(msg);
      });
      updateCounter();
      updateTotalMessages();
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