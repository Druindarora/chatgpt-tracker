import { updateProgressBar, addMessageToTable, getInput, getCounter, getLogTable, getLogButton } from './ui.js';

export const messages = [];

export function logMessage(content) {
    const now = Date.now();
    const message = { content, timestamp: now };
    messages.push(message);
    addMessageToTable(message);
    updateCounter();

    // Envoie le message à sauvegarder au main process via preload
    window.electronAPI.saveMessage(message);
}


// Adapter la suppression des messages pour retirer aussi la cellule minuteur associée
export function updateCounter() {
    const now = Date.now();
    const windowStart = now - 3 * 60 * 60 * 1000; // 3h
    while (messages.length && messages[0].timestamp <= windowStart) {
        const removed = messages.shift();
        getLogTable().removeChild(getLogTable().firstChild);
        timerCells.shift();

        // Demande au main process de supprimer ce message du fichier JSON
        window.electronAPI.deleteMessage(removed.timestamp);
    }

    const count = messages.length;
    updateProgressBar(count);

    let warning = count >= 70 ? ' ⚠️' : '';
    getCounter().textContent = `Messages dans les 3 dernières heures : ${count} / 80${warning}`; // Texte 3h

    // Désactive le bouton si la limite est atteinte
    getLogButton().disabled = count >= 80;
    getInput().disabled = count >= 80;
}

window.electronAPI.onLoadMessages((messagesFromMain) => {
    messagesFromMain.forEach(msg => {
    messages.push(msg);
    addMessageToTable(msg);
    });
    updateCounter();
});
