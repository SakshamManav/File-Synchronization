const API_BASE_URL = 'https://e0bd612f814534.lhr.life';

let currentSessionId = null;
let pollInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeExtension();

    // Always attach button listeners
    const newSessionBtn = document.getElementById('new-session-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-btn');

    newSessionBtn.addEventListener('click', () => {
        clearSession();
        initializeExtension();
    });

    openDownloadsBtn.addEventListener('click', () => {
        if (currentSessionId) {
            chrome.tabs.create({ url: `${API_BASE_URL}/downloads/${currentSessionId}` });
        }
    });
});

async function initializeExtension() {
    const statusDiv = document.getElementById('status');
    const qrCodeImg = document.getElementById('qr-code');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const newSessionBtn = document.getElementById('new-session-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-btn');

    // Check for existing session
    const storedSession = await getStoredSession();
    if (storedSession && isSessionValid(storedSession)) {
        currentSessionId = storedSession.sessionId;
        showConnectedState();
        // start background polling to open downloads tab when files arrive
        chrome.runtime.sendMessage({ type: 'startPolling', sessionId: currentSessionId });
        return;
    }

    try {
        // Create new session
        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const sessionData = await response.json();
        currentSessionId = sessionData.sessionId;

        // Store session
        await storeSession({
            sessionId: currentSessionId,
            timestamp: Date.now(),
            expiresAt: sessionData.expiresAt
        });

        // Generate QR code
        const statusUrl = `${API_BASE_URL}/session/${currentSessionId}/status`;
        const qrDataUrl = await generateQRCode(statusUrl);

        // Update UI
        qrCodeImg.src = qrDataUrl;
        qrCodeImg.classList.remove('hidden');
        qrPlaceholder.style.display = 'none';

        statusDiv.className = 'status ready';
        statusDiv.innerHTML = '✅ QR Code Ready - Scan with Mobile';

        newSessionBtn.classList.remove('hidden');
        openDownloadsBtn.classList.remove('hidden');

        // Start background polling for file uploads (background will open downloads tab)
        chrome.runtime.sendMessage({ type: 'startPolling', sessionId: currentSessionId });

        // Start popup polling to update UI when connection_created is true
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(async () => {
            try {
                const resp = await fetch(`${API_BASE_URL}/session/${currentSessionId}/status`);
                if (resp.ok) {
                    const statusData = await resp.json();
                    if (statusData.connection_created === true) {
                        showConnectedState();
                        clearInterval(pollInterval);
                    }
                }
            } catch (err) {
                // ignore
            }
        }, 3000);

    } catch (error) {
        console.error('Error creating session:', error);
        statusDiv.className = 'status error';
        statusDiv.innerHTML = '❌ Failed to generate QR code';
        newSessionBtn.classList.remove('hidden');
    }

    // (Button listeners are now attached globally after DOMContentLoaded)
}

async function generateQRCode(text) {
    // Simple QR code generation using Google Charts API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    return qrUrl;
}

async function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/session/${currentSessionId}/status`);
            if (response.ok) {
                const statusData = await response.json();
                
                if (statusData.uploads && statusData.uploads.length > 0) {
                    // Files have been uploaded!
                    showConnectedState();
                    clearInterval(pollInterval);
                    
                    // Auto-open downloads page
                    chrome.tabs.create({ 
                        url: `${API_BASE_URL}/downloads/${currentSessionId}` 
                    });
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 3000); // Poll every 3 seconds
}

function showConnectedState() {
    const statusDiv = document.getElementById('status');
    const qrCodeImg = document.getElementById('qr-code');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const newSessionBtn = document.getElementById('new-session-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-btn');

    statusDiv.className = 'status connected';
    statusDiv.innerHTML = '🔗 Mobile Connected - Files Available';

    qrCodeImg.classList.add('hidden');
    qrPlaceholder.style.display = 'block';
    qrPlaceholder.innerHTML = '✅ Connection Established';

    newSessionBtn.classList.remove('hidden');
    openDownloadsBtn.classList.remove('hidden');

    if (pollInterval) {
        clearInterval(pollInterval);
    }

    // Make QR clickable to open downloads page
    qrCodeImg.style.cursor = 'pointer';
    qrCodeImg.title = 'Open downloads for this session';
    qrCodeImg.onclick = () => {
        if (currentSessionId) {
            chrome.tabs.create({ url: `${API_BASE_URL}/downloads/${currentSessionId}` });
        }
    };
}

async function getStoredSession() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['fileSyncSession'], (result) => {
            resolve(result.fileSyncSession || null);
        });
    });
}

async function storeSession(sessionData) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ fileSyncSession: sessionData }, resolve);
    });
}

function isSessionValid(sessionData) {
    if (!sessionData) return false;
    
    const now = Date.now();
    const sessionAge = now - sessionData.timestamp;
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    return sessionAge < fifteenMinutes;
}

async function clearSession() {
    currentSessionId = null;
    if (pollInterval) {
        clearInterval(pollInterval);
    }
    
    chrome.storage.local.remove(['fileSyncSession']);
    
    // Reset UI
    const statusDiv = document.getElementById('status');
    const qrCodeImg = document.getElementById('qr-code');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const newSessionBtn = document.getElementById('new-session-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-btn');

    statusDiv.className = 'status generating';
    statusDiv.innerHTML = '<div class="loading"></div> Generating QR Code...';
    
    qrCodeImg.classList.add('hidden');
    qrPlaceholder.style.display = 'block';
    qrPlaceholder.innerHTML = 'QR Code will appear here';
    
    newSessionBtn.classList.add('hidden');
    openDownloadsBtn.classList.add('hidden');

    // remove click handler
    qrCodeImg.style.cursor = '';
    qrCodeImg.title = '';
    qrCodeImg.onclick = null;
}
