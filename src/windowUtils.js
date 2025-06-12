const path = require('path');
const fs = require('fs');
const { screen } = require('electron');

const windowStatePath = path.join(__dirname, 'userSettings.json');

function getSavedWindowState() {
  try {
    if (fs.existsSync(windowStatePath)) {
      return JSON.parse(fs.readFileSync(windowStatePath, 'utf8'));
    } else {
      // Si le fichier n'existe pas, on le crée avec des valeurs par défaut (centré, taille 800x600)
      const displays = screen.getAllDisplays();
      const targetIndex = displays[1] ? 1 : 0;
      const targetDisplay = displays[targetIndex];
      const { x, y, width, height } = targetDisplay.workArea;
      const defaultState = {
        x: x + Math.floor(width / 4),
        y: y + Math.floor(height / 4),
        width: Math.floor(width / 2),
        height: Math.floor(height / 2)
      };
      fs.writeFileSync(windowStatePath, JSON.stringify(defaultState, null, 2), 'utf8');
      return defaultState;
    }
  } catch (e) {}
  return null;
}

function saveWindowState(win) {
  if (!win) return;
  const bounds = win.getBounds();
  fs.writeFileSync(windowStatePath, JSON.stringify(bounds, null, 2), 'utf8');
}

module.exports = {
  getSavedWindowState,
  saveWindowState,
  windowStatePath
};
