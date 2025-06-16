const fs = require('fs');
const path = require('path');

// --- Fonctions utilitaires de stats ---

/**
 * Détermine si une nouvelle période (jour, semaine, mois, année) a commencé en comparant deux dates.
 */
function isNewPeriod(lastMessageDate, currentMessageDate, period) {
  if (!lastMessageDate) return true;
  switch(period) {
    case 'daily':
      return lastMessageDate.getDate() !== currentMessageDate.getDate() || 
             lastMessageDate.getMonth() !== currentMessageDate.getMonth() || 
             lastMessageDate.getFullYear() !== currentMessageDate.getFullYear();
    case 'weekly':
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

/**
 * Calcule le numéro de la semaine de l’année pour une date donnée (semaine commence le dimanche).
 */
function getWeekNumber(date) {
  // Semaine commence le dimanche
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay(); // 0 = dimanche
  // Trouver le dimanche précédent ou courant
  d.setUTCDate(d.getUTCDate() - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const yearStartDay = yearStart.getUTCDay();
  // Premier dimanche de l'année
  const firstSunday = new Date(yearStart);
  if (yearStartDay !== 0) {
    firstSunday.setUTCDate(yearStart.getUTCDate() + (7 - yearStartDay));
  }
  // Calcul du numéro de semaine
  return Math.floor((d - firstSunday) / 604800000) + 1;
}

/**
 * Sauvegarde les statistiques courantes dans l’historique pour la période donnée (jour, semaine, mois).
 * Pour la semaine, la période va du dimanche au samedi.
 */
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
      break;
    case 'week':
      // Semaine du dimanche au samedi
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // dimanche
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // samedi
      historyEntry.weekStart = weekStart.toISOString().split('T')[0];
      historyEntry.weekEnd = weekEnd.toISOString().split('T')[0];
      stats.history.weekly.push(historyEntry);
      break;
    case 'month':
      historyEntry.month = now.toISOString().slice(0, 7);
      stats.history.monthly.push(historyEntry);
      break;
  }
}

/**
 * Réinitialise les compteurs de messages pour la période spécifiée (jour, semaine, mois, année).
 */
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

/**
 * Recompte le nombre de messages du jour courant à partir du fichier messages.json.
 */
function recalculateTodayCount() {
  const filePath = path.join(__dirname, 'messages.json');
  let messages = [];
  if (fs.existsSync(filePath)) {
    try {
      messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      messages = [];
    }
  }
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
  return messages.filter(msg => msg.timestamp >= startOfDay && msg.timestamp <= endOfDay).length;
}

/**
 * Recompte le nombre de messages de la semaine courante (du dimanche au samedi) à partir de messages.json.
 */
function recalculateWeekCount() {
  const filePath = path.join(__dirname, 'messages.json');
  let messages = [];
  if (fs.existsSync(filePath)) {
    try {
      messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      messages = [];
    }
  }
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche
  const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
  const saturday = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6, 23, 59, 59, 999);
  const sundayTime = sunday.getTime();
  const saturdayTime = saturday.getTime();
  return messages.filter(msg => msg.timestamp >= sundayTime && msg.timestamp <= saturdayTime).length;
}

/**
 * Recompte le nombre de messages du mois courant à partir de messages.json.
 */
function recalculateMonthCount() {
  const filePath = path.join(__dirname, 'messages.json');
  let messages = [];
  if (fs.existsSync(filePath)) {
    try {
      messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      messages = [];
    }
  }
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).getTime();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return messages.filter(msg => msg.timestamp >= startOfMonth && msg.timestamp <= endOfMonth).length;
}

/**
 * Recompte le nombre de messages de l’année courante à partir de messages.json.
 */
function recalculateYearCount() {
  const filePath = path.join(__dirname, 'messages.json');
  let messages = [];
  if (fs.existsSync(filePath)) {
    try {
      messages = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      messages = [];
    }
  }
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
  const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
  return messages.filter(msg => msg.timestamp >= startOfYear && msg.timestamp <= endOfYear).length;
}

/**
 * Initialise le fichier de statistiques avec des valeurs par défaut si le fichier n’existe pas.
 */
function initializeStatsFile(statsFilePath) {
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

/**
 * Met à jour les statistiques avec un nouveau message :
 * - Incrémente les totaux
 * - Met à jour les stats par jour de la semaine
 * - Vérifie si une nouvelle période commence et sauvegarde l’historique
 * - Met à jour les compteurs de période
 * - Sauvegarde la date du dernier message
 */
function updateStats(message, statsFilePath, statsUtils) {
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
    if (statsUtils.isNewPeriod(lastMessageDate, messageDate, period)) {
      statsUtils.saveToHistory(stats, period);
      statsUtils.resetCounters(stats, period);
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

module.exports = {
  isNewPeriod,
  getWeekNumber,
  saveToHistory,
  resetCounters,
  recalculateTodayCount,
  recalculateWeekCount,
  recalculateMonthCount,
  recalculateYearCount,
  initializeStatsFile,
  updateStats
};