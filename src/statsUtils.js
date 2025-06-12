const fs = require('fs');
const path = require('path');

// --- Fonctions utilitaires de stats ---

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

function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

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
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      historyEntry.weekStart = weekStart.toISOString().split('T')[0];
      historyEntry.weekEnd = new Date(weekStart.setDate(weekStart.getDate() + 6)).toISOString().split('T')[0];
      stats.history.weekly.push(historyEntry);
      break;
    case 'month':
      historyEntry.month = now.toISOString().slice(0, 7);
      stats.history.monthly.push(historyEntry);
      break;
  }
}

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
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
  const mondayTime = monday.getTime();
  const sundayTime = sunday.getTime();
  return messages.filter(msg => msg.timestamp >= mondayTime && msg.timestamp <= sundayTime).length;
}

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