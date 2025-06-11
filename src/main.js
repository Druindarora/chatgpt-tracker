const { app, BrowserWindow, ipcMain, screen } = require('electron/main')
const fs = require('fs');
const path = require('path');
const express = require('express');

const statsFilePath = path.join(__dirname, 'stats.json');

function initializeStatsFile() {
  if (!fs.existsSync(statsFilePath)) {
    const initialStats = {
      totals: {
        messages: 0,
        tokens: 0,
        characters: 0,
        avgCharactersPerMessage: 0
      },
      byDay: {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0
      },
      byPeriod: {
        today: 0,
        week: 0,
        month: 0,
        year: 0
      },
      averages: {
        perDay: 0,
        perWeek: 0,
        perMonth: 0,
        perYear: 0
      },
      lastResetDate: null,
      lastWeekReset: null,
      lastMonthReset: null,
      lastYearReset: null
    };
    fs.writeFileSync(statsFilePath, JSON.stringify(initialStats, null, 2), 'utf8');
  }
}

// Fonction pour vérifier si une date est le début d'une nouvelle période
function isNewPeriod(lastMessageDate, currentMessageDate, period) {
  if (!lastMessageDate) return true;

  switch(period) {
    case 'daily':
      return lastMessageDate.getDate() !== currentMessageDate.getDate() || 
             lastMessageDate.getMonth() !== currentMessageDate.getMonth() || 
             lastMessageDate.getFullYear() !== currentMessageDate.getFullYear();
    
    case 'weekly':
      // On compare les numéros de semaine
      const lastWeek = getWeekNumber(lastMessageDate);
      const currentWeek = getWeekNumber(currentMessageDate);
      return lastWeek !== currentWeek || 
             lastMessageDate.getFullYear() !== currentMessageDate.getFullYear();
    
    case 'monthly':
      return lastMessageDate.getMonth() !== currentMessageDate.getMonth() || 
             lastMessageDate.getFullYear() !== currentMessageDate.getFullYear();
    
    case 'yearly':
      return lastMessageDate.getFullYear() !== currentMessageDate.getFullYear();
    
    default:
      return false;
  }
}

// Fonction pour obtenir le numéro de semaine
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Fonction pour sauvegarder les stats dans l'historique
function saveToHistory(stats, period) {
  const now = new Date();
  const historyEntry = {
    messages: stats.current.byPeriod[period],
    tokens: Math.ceil(stats.current.byPeriod[period] * 4),
    avgCharactersPerMessage: stats.current.totals.avgCharactersPerMessage,
    byDay: { ...stats.current.byDay }
  };

  switch(period) {
    case 'today':
      historyEntry.date = now.toISOString().split('T')[0];
      stats.history.daily.push(historyEntry);
      // Garder l'historique complet
      break;
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      historyEntry.weekStart = weekStart.toISOString().split('T')[0];
      historyEntry.weekEnd = new Date(weekStart.setDate(weekStart.getDate() + 6)).toISOString().split('T')[0];
      stats.history.weekly.push(historyEntry);
      // Garder l'historique complet
      break;
    case 'month':
      historyEntry.month = now.toISOString().slice(0, 7);
      stats.history.monthly.push(historyEntry);
      // Garder l'historique complet
      break;
  }
}

// Fonction pour réinitialiser les compteurs
function resetCounters(stats, period) {
  switch(period) {
    case 'today':
      stats.current.byPeriod.today = 0;
      break;
    case 'week':
      stats.current.byPeriod.week = 0;
      break;
    case 'month':
      stats.current.byPeriod.month = 0;
      break;
    case 'year':
      stats.current.byPeriod.year = 0;
      break;
  }
  stats.lastReset[period] = new Date().toISOString();
}

// Fonction principale de mise à jour des stats
function updateStats(message) {
  let stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
  const messageDate = new Date(message.timestamp);
  
  // Mise à jour des totaux
  stats.current.totals.messages++;
  const tokens = Math.ceil(message.content.length / 4);
  stats.current.totals.tokens += tokens;
  stats.current.totals.avgCharactersPerMessage = message.content.length;

  // Mise à jour par jour de la semaine
  const dayOfWeek = messageDate.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
  stats.current.byDay[dayOfWeek]++;

  // Vérification et sauvegarde des périodes
  const periods = ['today', 'week', 'month', 'year'];
  periods.forEach(period => {
    const lastMessageDate = stats.lastMessageDate ? new Date(stats.lastMessageDate) : null;
    if (isNewPeriod(lastMessageDate, messageDate, period)) {
      // Sauvegarder les stats actuelles dans l'historique
      saveToHistory(stats, period);
      // Réinitialiser les compteurs
      resetCounters(stats, period);
    }
  });

  // Mise à jour des compteurs de période
  stats.current.byPeriod.today++;
  stats.current.byPeriod.week++;
  stats.current.byPeriod.month++;
  stats.current.byPeriod.year++;

  // Sauvegarde de la date du dernier message
  stats.lastMessageDate = messageDate.toISOString();

  // Sauvegarde des stats
  fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf8');
  return stats;
}

let mainWindow; // Déclare mainWindow en haut du fichier

function createWindow () {
  const displays = screen.getAllDisplays();
  // Prend l'écran 2 si dispo, sinon l'écran 1
  const targetIndex = displays[1] ? 1 : 0;
  const targetDisplay = displays[targetIndex];
  const { workArea } = targetDisplay;
  const halfWidth = Math.floor(workArea.width / 2);
  const x = workArea.x + halfWidth; // Début de la moitié droite
  const y = workArea.y;
  const width = workArea.width - halfWidth; // Prend toute la moitié droite, même si largeur impaire
  const height = workArea.height;

  const filePath = path.join(__dirname, 'messages.json');
  // Nettoyage des messages trop anciens (plus de 3 heures)
  if (fs.existsSync(filePath)) {
    try {
      let messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const now = Date.now();
      // Garde uniquement les messages de moins de 3 heures
      messages = messages.filter(msg => now - msg.timestamp <= 3 * 60 * 60 * 1000);
      fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
    } catch (e) {
      // Si erreur, on laisse le fichier tel quel
    }
  }

  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, 'icone_app_tracker.png'),
    x,
    y,
    width,
    height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  ipcMain.on('set-title', (event, title) => {
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    win.setTitle(title)
  })

  ipcMain.on('save-message', (event, message) => {
    const filePath = path.join(__dirname, 'messages.json');
    let messages = [];
    if (fs.existsSync(filePath)) {
      try {
        messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        messages = [];
      }
    }
    messages.push(message);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
    
    const stats = updateStats(message);
    event.sender.send('stats-updated', stats);
  });

  ipcMain.on('delete-message', (event, timestamp) => {
    const filePath = path.join(__dirname, 'messages.json');
    let messages = [];
    if (fs.existsSync(filePath)) {
      try {
        messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        messages = [];
      }
    }
    // Filtre les messages pour supprimer celui avec le timestamp donné
    messages = messages.filter(msg => msg.timestamp !== timestamp);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
  });

  ipcMain.on('get-stats', (event) => {
    if (fs.existsSync(statsFilePath)) {
      try {
        const stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
        event.sender.send('stats-loaded', stats);
      } catch (e) {
        event.sender.send('stats-loaded', null);
      }
    }
  });

  let recentMessages = [];
  if (fs.existsSync(filePath)) {
    try {
      recentMessages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      recentMessages = [];
    }
  }
  mainWindow.loadFile('src/main.html').then(() => {
    mainWindow.webContents.send('load-messages', recentMessages);
  });

  initializeStatsFile();
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// --- Serveur HTTP ---
const api = express();
api.use(express.json());

api.post('/set-message', (req, res) => {
  const message = req.body.message;
  // Envoie le message à la fenêtre Angular via IPC
  mainWindow.webContents.send('set-message', message);
  res.send({ status: 'ok' });
});

api.listen(3001, () => {
  console.log('API Electron sur http://localhost:3001');
});