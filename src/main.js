const { app, BrowserWindow, ipcMain, screen } = require('electron/main')
const fs = require('fs');
const path = require('path');
const express = require('express');
// --- Fonctions utilitaires de stats déplacées dans statsUtils.js ---
const {
  recalculateTodayCount,
  recalculateWeekCount,
  recalculateMonthCount,
  recalculateYearCount,
  initializeStatsFile,
  updateStats
} = require('./statsUtils');
const { getSavedWindowState, saveWindowState } = require('./windowUtils');

const statsFilePath = path.join(__dirname, 'stats.json');

let mainWindow; // Déclare mainWindow en haut du fichier

function createWindow () {
  // Récupère la position/taille sauvegardée si dispo
  const savedState = getSavedWindowState();
  let x, y, width, height;
  if (savedState) {
    ({ x, y, width, height } = savedState);
  } else {
    const displays = screen.getAllDisplays();
    const targetIndex = displays[1] ? 1 : 0;
    const targetDisplay = displays[targetIndex];
    const { workArea } = targetDisplay;
    const halfWidth = Math.floor(workArea.width / 2);
    x = workArea.x + halfWidth;
    y = workArea.y;
    width = workArea.width - halfWidth;
    height = workArea.height;
  }

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

  // Sauvegarde la position/taille à chaque déplacement/redimensionnement
  mainWindow.on('move', () => saveWindowState(mainWindow));
  mainWindow.on('resize', () => saveWindowState(mainWindow));

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
    // Recalcule le compteur today à partir des messages du jour
    stats.current.byPeriod.today = recalculateTodayCount();
    stats.current.byPeriod.week = recalculateWeekCount();
    stats.current.byPeriod.month = recalculateMonthCount();
    stats.current.byPeriod.year = recalculateYearCount();
    fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf8');
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
    // Après suppression, recalculer le compteur today
    if (fs.existsSync(statsFilePath)) {
      const stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
      stats.current.byPeriod.today = recalculateTodayCount();
      stats.current.byPeriod.week = recalculateWeekCount();
      stats.current.byPeriod.month = recalculateMonthCount();
      stats.current.byPeriod.year = recalculateYearCount();
      fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf8');
      event.sender.send('stats-updated', stats);
    }
  });

  ipcMain.on('get-stats', (event) => {
    if (fs.existsSync(statsFilePath)) {
      try {
        const stats = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
        stats.current.byPeriod.today = recalculateTodayCount();
        stats.current.byPeriod.week = recalculateWeekCount();
        stats.current.byPeriod.month = recalculateMonthCount();
        stats.current.byPeriod.year = recalculateYearCount();
        fs.writeFileSync(statsFilePath, JSON.stringify(stats, null, 2), 'utf8');
        event.sender.send('stats-loaded', stats);
      } catch (e) {
        event.sender.send('stats-loaded', null);
      }
    }
  });

  ipcMain.on('reset-stats', (event) => {
    // Réinitialise le fichier stats.json à zéro
    const emptyStats = {
      current: {
        totals: { messages: 0, tokens: 0, avgCharactersPerMessage: 0 },
        byDay: {
          lundi: 0, mardi: 0, mercredi: 0, jeudi: 0, vendredi: 0, samedi: 0, dimanche: 0
        },
        byPeriod: { today: 0, week: 0, month: 0, year: 0 }
      },
      averages: { perDay: 0, perWeek: 0, perMonth: 0, perYear: 0 },
      history: { daily: [], weekly: [], monthly: [] },
      lastReset: {
        daily: null, weekly: null, monthly: null, yearly: null,
        today: new Date().toISOString(), week: new Date().toISOString(), month: new Date().toISOString(), year: new Date().toISOString()
      },
      lastMessageDate: null
    };
    fs.writeFileSync(statsFilePath, JSON.stringify(emptyStats, null, 2), 'utf8');
    event.sender.send('stats-updated', emptyStats);
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

  initializeStatsFile(statsFilePath);
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