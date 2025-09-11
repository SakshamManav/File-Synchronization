// File Sync QR - Web App JavaScript
const API_BASE_URL = 'https://file-synchronization.onrender.com';

let currentSessionId = null;
let pollInterval = null;
let statusPollInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeWebApp();

    // Attach button listeners
    const newSessionBtn = document.getElementById('new-session-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-btn');

    newSessionBtn.addEventListener('click', () => {
        clearSession();
        initializeWebApp();
    });

    openDownloadsBtn.addEventListener('click', () => {
        if (currentSessionId) {
            window.open(`${API_BASE_URL}/downloads/${currentSessionId}`, '_blank');
        }
    });

    // Buttons are always visible by design; do not hide or disable them here.

    // Handle page visibility change (pause polling when tab is hidden)
    document.addEventListener('visibilitychange', handleVisibilityChange);
});

async function initializeWebApp() {
    const statusDiv = document.getElementById('status');
    const qrCodeImg = document.getElementById('qr-code');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const newSessionBtn = document.getElementById('new-session-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-btn');

    // Check for existing session in localStorage
    const storedSession = getStoredSession();
    if (storedSession && isSessionValid(storedSession)) {
        currentSessionId = storedSession.sessionId;
        showConnectedState();
        startPolling();
        return;
    }

    try {
        // Create new session
        statusDiv.className = 'status generating';
        statusDiv.innerHTML = '<div class="loading"></div> Creating new session...';

        const response = await fetch(`${API_BASE_URL}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const sessionData = await response.json();
        currentSessionId = sessionData.sessionId;

        // Store session in localStorage
        storeSession({
            sessionId: currentSessionId,
            timestamp: Date.now(),
            expiresAt: sessionData.expiresAt
        });

        // Generate QR code
        statusDiv.innerHTML = '<div class="loading"></div> Generating QR Code...';
        const statusUrl = `${API_BASE_URL}/session/${currentSessionId}/status`;
        const qrDataUrl = await generateQRCode(statusUrl);

        // Update UI
        qrCodeImg.src = qrDataUrl;
        qrCodeImg.classList.remove('hidden');
        qrCodeImg.classList.add('show');
        qrPlaceholder.style.display = 'none';

    statusDiv.className = 'status ready';
    statusDiv.innerHTML = '✅ QR Code Ready - Scan with Mobile Device';
    openDownloadsBtn.disabled = false;
    openDownloadsBtn.style.opacity = 1;
    openDownloadsBtn.title = 'Open downloads for this session';

        // Start polling for file uploads
        startPolling();

        // Start status polling to update UI when mobile connects
        startStatusPolling();

    } catch (error) {
        console.error('Error creating session:', error);
        statusDiv.className = 'status error';
        statusDiv.innerHTML = `❌ Failed to create session: ${error.message}`;
        newSessionBtn.classList.remove('hidden');
    }
}

async function generateQRCode(text) {
    // Using QR Server API for QR code generation
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text)}&format=png&margin=10`;
    return qrUrl;
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        if (!currentSessionId) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/session/${currentSessionId}/status`);
            if (response.ok) {
                const statusData = await response.json();
                
                if (statusData.uploads && statusData.uploads.length > 0) {
                    // Files have been uploaded!
                    showFilesAvailable(statusData.uploads.length);
                    clearInterval(pollInterval);
                    
                    // Auto-open downloads page after a short delay
                    setTimeout(() => {
                        window.open(`${API_BASE_URL}/downloads/${currentSessionId}`, '_blank');
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 3000); // Poll every 3 seconds
}

function startStatusPolling() {
    if (statusPollInterval) clearInterval(statusPollInterval);
    
    statusPollInterval = setInterval(async () => {
        if (!currentSessionId) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/session/${currentSessionId}/status`);
            if (response.ok) {
                const statusData = await response.json();
                
                if (statusData.connection_created === true) {
                    showConnectedState();
                    clearInterval(statusPollInterval);
                }
            }
        } catch (error) {
            console.error('Status polling error:', error);
        }
    }, 2000); // Poll every 2 seconds for connection status
}

function showConnectedState() {
    const statusDiv = document.getElementById('status');
    const qrCodeImg = document.getElementById('qr-code');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const newSessionBtn = document.getElementById('new-session-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-btn');

    statusDiv.className = 'status connected';
    statusDiv.innerHTML = '🔗 Mobile Device Connected - Waiting for Files...';

    // Make QR code clickable to open downloads page
    qrCodeImg.style.cursor = 'pointer';
    qrCodeImg.title = 'Click to open downloads page';
    qrCodeImg.onclick = () => {
        if (currentSessionId) {
            window.open(`${API_BASE_URL}/downloads/${currentSessionId}`, '_blank');
        }
    };

    // Buttons remain visible and enabled; do not modify their state here.
}

function showFilesAvailable(fileCount) {
    const statusDiv = document.getElementById('status');
    const qrCodeImg = document.getElementById('qr-code');
    const qrPlaceholder = document.getElementById('qr-placeholder');

    statusDiv.className = 'status ready';
    statusDiv.innerHTML = `🎉 ${fileCount} File(s) Available - Opening Downloads...`;

    qrCodeImg.classList.add('hidden');
    qrPlaceholder.style.display = 'block';
    qrPlaceholder.innerHTML = `✅ ${fileCount} File(s) Ready for Download`;
}

function getStoredSession() {
    try {
        const stored = localStorage.getItem('fileSyncSession');
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('Error reading stored session:', error);
        return null;
    }
}

function storeSession(sessionData) {
    try {
        localStorage.setItem('fileSyncSession', JSON.stringify(sessionData));
    } catch (error) {
        console.error('Error storing session:', error);
    }
}

function isSessionValid(sessionData) {
    if (!sessionData || !sessionData.sessionId) return false;
    
    const now = Date.now();
    const sessionAge = now - sessionData.timestamp;
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    return sessionAge < fifteenMinutes;
}

function clearSession() {
    currentSessionId = null;
    
    // Clear intervals
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    if (statusPollInterval) {
        clearInterval(statusPollInterval);
        statusPollInterval = null;
    }
    
    // Clear localStorage
    localStorage.removeItem('fileSyncSession');
    
    // Reset UI
    resetUI();
}

function resetUI() {
    const statusDiv = document.getElementById('status');
    const qrCodeImg = document.getElementById('qr-code');
    const qrPlaceholder = document.getElementById('qr-placeholder');
    const newSessionBtn = document.getElementById('new-session-btn');
    const openDownloadsBtn = document.getElementById('open-downloads-btn');

    statusDiv.className = 'status generating';
    statusDiv.innerHTML = '<div class="loading"></div> Generating QR Code...';
    
    qrCodeImg.classList.add('hidden');
    qrCodeImg.classList.remove('show');
    qrPlaceholder.style.display = 'block';
    qrPlaceholder.innerHTML = 'QR Code will appear here';
    
    // Keep action buttons visible; do not hide or disable them here.

    // Remove click handlers
    qrCodeImg.style.cursor = '';
    qrCodeImg.title = '';
    qrCodeImg.onclick = null;
}

function handleVisibilityChange() {
    if (document.hidden) {
        // Page is hidden, continue polling but less frequently
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = setInterval(async () => {
                if (!currentSessionId) return;
                
                try {
                    const response = await fetch(`${API_BASE_URL}/session/${currentSessionId}/status`);
                    if (response.ok) {
                        const statusData = await response.json();
                        
                        if (statusData.uploads && statusData.uploads.length > 0) {
                            showFilesAvailable(statusData.uploads.length);
                            clearInterval(pollInterval);
                            window.open(`${API_BASE_URL}/downloads/${currentSessionId}`, '_blank');
                        }
                    }
                } catch (error) {
                    console.error('Background polling error:', error);
                }
            }, 10000); // Poll every 10 seconds when hidden
        }
    } else {
        // Page is visible, resume normal polling
        if (currentSessionId && !pollInterval) {
            startPolling();
        }
    }
}

// Handle errors globally
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// Check for service worker support and register for potential offline functionality
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
        console.log('ServiceWorker registration successful');
    }).catch(function(err) {
        console.log('ServiceWorker registration failed');
    });
}
