const { app, BrowserWindow, ipcMain, screen } = require('electron/main')
const fs = require('fs');
const path = require('path');

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

  const mainWindow = new BrowserWindow({
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
    // Lis le fichier s'il existe déjà
    if (fs.existsSync(filePath)) {
      try {
        messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        messages = [];
      }
    }
    messages.push(message);
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
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