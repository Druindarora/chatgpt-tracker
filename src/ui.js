import { messages, updateCounter } from './messages.js';

export function getInput() { return document.getElementById('data-cliprelay-tracker-input'); }
export function getLogButton() { return document.getElementById('logButton'); }
export function getCounter() { return document.getElementById('counter'); }
export function getTimer() { return document.getElementById('timer'); }
export function getLogTable() { return document.getElementById('logTable'); }
export function getProgressBar() { return document.getElementById('progressBar'); }
export function getCopyLastButton() { return document.getElementById('copyLastButton'); }

export function updateTimerDisplay() {
    const timerElem = getTimer();
    if (!timerElem) return;
    if (messages.length === 0) {
        timerElem.textContent = 'Minuteur : 00:00:00';
        return;
    }
    const now = Date.now();
    const firstMessage = messages[0];
    const elapsed = now - firstMessage.timestamp;
    const hours = String(Math.floor(elapsed / 3600000)).padStart(2, '0');
    const minutes = String(Math.floor((elapsed % 3600000) / 60000)).padStart(2, '0');
    const seconds = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');
    timerElem.textContent = `Minuteur : ${hours}:${minutes}:${seconds}`;
}

export function updateProgressBar(count) {
    const progressBarElem = getProgressBar();
    if (!progressBarElem) return;
    const percent = Math.min((count / 80) * 100, 100);
    progressBarElem.style.width = `${percent}%`;
    if (count >= 70) {
        progressBarElem.style.backgroundColor = 'red';
    } else if (count >= 50) {
        progressBarElem.style.backgroundColor = 'orange';
    } else {
        progressBarElem.style.backgroundColor = '#4caf50';
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
export { timerCells }; // <-- à exporter si utilisé ailleurs

export function addMessageToTable(message) {
    const logTableElem = getLogTable();
    if (!logTableElem) return;
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
    logTableElem.appendChild(row);
}

// Met à jour tous les minuteurs individuels
export function updateAllMessageTimers() {
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

// Fonction pour générer dynamiquement le tableau d'historique
export function renderHistoryTable(stats, period) {
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

// Fonction pour mettre à jour l'affichage des stats
export function updateStatsDisplay(stats) {
    // Totaux
    const totalMessagesElem = document.getElementById('total-messages');
    if (totalMessagesElem) totalMessagesElem.textContent = stats?.current?.totals?.messages ?? 0;
    const totalTokensElem = document.getElementById('total-tokens');
    if (totalTokensElem) totalTokensElem.textContent = stats?.current?.totals?.tokens ?? 0;
    const avgCharsElem = document.getElementById('avg-chars');
    if (avgCharsElem) avgCharsElem.textContent = Math.round(stats?.current?.totals?.avgCharactersPerMessage ?? 0);
    // Par jour
    const mondayElem = document.getElementById('monday-count');
    if (mondayElem) mondayElem.textContent = stats?.current?.byDay?.lundi ?? 0;
    const tuesdayElem = document.getElementById('tuesday-count');
    if (tuesdayElem) tuesdayElem.textContent = stats?.current?.byDay?.mardi ?? 0;
    const wednesdayElem = document.getElementById('wednesday-count');
    if (wednesdayElem) wednesdayElem.textContent = stats?.current?.byDay?.mercredi ?? 0;
    const thursdayElem = document.getElementById('thursday-count');
    if (thursdayElem) thursdayElem.textContent = stats?.current?.byDay?.jeudi ?? 0;
    const fridayElem = document.getElementById('friday-count');
    if (fridayElem) fridayElem.textContent = stats?.current?.byDay?.vendredi ?? 0;
    const saturdayElem = document.getElementById('saturday-count');
    if (saturdayElem) saturdayElem.textContent = stats?.current?.byDay?.samedi ?? 0;
    const sundayElem = document.getElementById('sunday-count');
    if (sundayElem) sundayElem.textContent = stats?.current?.byDay?.dimanche ?? 0;
    // Par période
    const todayElem = document.getElementById('today-count');
    if (todayElem) todayElem.textContent = stats?.current?.byPeriod?.today ?? 0;
    const weekElem = document.getElementById('week-count');
    if (weekElem) weekElem.textContent = stats?.current?.byPeriod?.week ?? 0;
    const monthElem = document.getElementById('month-count');
    if (monthElem) monthElem.textContent = stats?.current?.byPeriod?.month ?? 0;
    const yearElem = document.getElementById('year-count');
    if (yearElem) yearElem.textContent = stats?.current?.byPeriod?.year ?? 0;
    // Moyennes
    const avgDayElem = document.getElementById('avg-day');
    if (avgDayElem) avgDayElem.textContent = Math.round(stats?.averages?.perDay ?? 0);
    const avgWeekElem = document.getElementById('avg-week');
    if (avgWeekElem) avgWeekElem.textContent = Math.round(stats?.averages?.perWeek ?? 0);
    const avgMonthElem = document.getElementById('avg-month');
    if (avgMonthElem) avgMonthElem.textContent = Math.round(stats?.averages?.perMonth ?? 0);
    const avgYearElem = document.getElementById('avg-year');
    if (avgYearElem) avgYearElem.textContent = Math.round(stats?.averages?.perYear ?? 0);
}

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

// À la fin du fichier, pour charger les stats au démarrage
window.electronAPI.getStats();
