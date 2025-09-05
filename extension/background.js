// Background script for the File Sync extension

chrome.runtime.onInstalled.addListener(() => {
    console.log('File Sync QR Extension installed');
});

const API_BASE_URL = 'https://e8fb5a98c01660.lhr.life';

// Listen for messages from popup to start polling or open downloads
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'openDownloads') {
        chrome.tabs.create({ url: message.url });
    }
    if (message.type === 'startPolling' && message.sessionId) {
        // persist session and schedule first poll
        chrome.storage.local.set({ fileSyncSession: { sessionId: message.sessionId, timestamp: Date.now() } }, () => {
            schedulePoll(message.sessionId, 1000);
        });
    }
});

// Schedule periodic cleanup of stored sessions (every 5 minutes)
chrome.alarms.create('cleanupSessions', { periodInMinutes: 5 });

// Schedule poll helper: create an alarm that fires after delayMs
function schedulePoll(sessionId, delayMs) {
    const name = `poll_${sessionId}`;
    chrome.alarms.create(name, { when: Date.now() + delayMs });
}

// Alarm handler: either cleanup or poll specific session
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'cleanupSessions') {
        chrome.storage.local.get(['fileSyncSession'], (result) => {
            const session = result.fileSyncSession;
            if (session) {
                const now = Date.now();
                const sessionAge = now - session.timestamp;
                const fifteenMinutes = 15 * 60 * 1000;
                if (sessionAge > fifteenMinutes) {
                    chrome.storage.local.remove(['fileSyncSession']);
                    console.log('Expired session cleaned up');
                }
            }
        });
        return;
    }

    // poll alarms named poll_<sessionId>
    if (alarm.name && alarm.name.startsWith('poll_')) {
        const sessionId = alarm.name.slice('poll_'.length);
        try {
            const res = await fetch(`${API_BASE_URL}/session/${sessionId}/status`);
            if (res.ok) {
                const data = await res.json();
                if (data.uploads && data.uploads.length > 0) {
                    // open downloads tab and clear alarm
                    chrome.tabs.create({ url: `${API_BASE_URL}/downloads/${sessionId}` });
                    chrome.alarms.clear(alarm.name);
                    return;
                }
            }
        } catch (err) {
            console.warn('Background poll error', err);
        }
        // schedule next poll in 5s
        schedulePoll(sessionId, 5000);
    }
});
