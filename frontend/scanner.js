// QR Code Scanner JavaScript
let html5QrcodeScanner = null;
let isScanning = false;
let scannedData = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeScanner();
    attachEventListeners();
});

function initializeScanner() {
    // Set default target URL
    const targetUrlInput = document.getElementById('target-url');
    targetUrlInput.value = 'https://file-synchronization.onrender.com';
}

function attachEventListeners() {
    const startBtn = document.getElementById('start-scanner-btn');
    const stopBtn = document.getElementById('stop-scanner-btn');
    const transferPostBtn = document.getElementById('transfer-post');
    const transferParamsBtn = document.getElementById('transfer-params');
    const transferNewTabBtn = document.getElementById('transfer-newtab');

    startBtn.addEventListener('click', startScanner);
    stopBtn.addEventListener('click', stopScanner);
    transferPostBtn.addEventListener('click', () => transferData('post'));
    transferParamsBtn.addEventListener('click', () => transferData('params'));
    transferNewTabBtn.addEventListener('click', () => transferData('newtab'));
}

function startScanner() {
    if (isScanning) return;

    const scannerElement = document.getElementById('scanner');
    const startBtn = document.getElementById('start-scanner-btn');
    const stopBtn = document.getElementById('stop-scanner-btn');
    const placeholder = document.getElementById('scanner-placeholder');

    try {
        // Hide placeholder
        placeholder.style.display = 'none';

        // Configure scanner
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };

        // Create scanner instance
        html5QrcodeScanner = new Html5Qrcode("scanner");

        // Start scanning
        html5QrcodeScanner.start(
            { facingMode: "environment" }, // Use back camera
            config,
            onScanSuccess,
            onScanFailure
        ).then(() => {
            isScanning = true;
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            showStatus('Scanner started. Point your camera at a QR code.', 'info');
        }).catch(err => {
            console.error('Failed to start scanner:', err);
            placeholder.style.display = 'flex';
            showStatus('Failed to start scanner. Please check camera permissions.', 'error');
        });

    } catch (error) {
        console.error('Scanner initialization error:', error);
        placeholder.style.display = 'flex';
        showStatus('Scanner not supported on this device.', 'error');
    }
}

function stopScanner() {
    if (!isScanning || !html5QrcodeScanner) return;

    const startBtn = document.getElementById('start-scanner-btn');
    const stopBtn = document.getElementById('stop-scanner-btn');
    const placeholder = document.getElementById('scanner-placeholder');

    html5QrcodeScanner.stop().then(() => {
        html5QrcodeScanner = null;
        isScanning = false;
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        placeholder.style.display = 'flex';
        showStatus('Scanner stopped.', 'info');
    }).catch(err => {
        console.error('Failed to stop scanner:', err);
    });
}

function onScanSuccess(decodedText, decodedResult) {
    console.log('QR Code scanned:', decodedText);
    
    scannedData = decodedText;
    
    // Stop scanner automatically after successful scan
    stopScanner();
    
    // Show result
    showScanResult(decodedText);
    
    // Show success status
    showStatus('QR Code scanned successfully!', 'success');
}

function onScanFailure(error) {
    // This is called when scanning fails - usually not an error
    // Just ignore it to avoid spamming console
}

function showScanResult(data) {
    const resultContainer = document.getElementById('result-container');
    const scannedResult = document.getElementById('scanned-result');
    
    scannedResult.textContent = data;
    resultContainer.classList.remove('hidden');
    
    // Scroll to result
    resultContainer.scrollIntoView({ behavior: 'smooth' });
}

function transferData(method) {
    if (!scannedData) {
        showStatus('No scanned data available.', 'error');
        return;
    }

    const targetUrl = document.getElementById('target-url').value.trim();
    
    if (!targetUrl) {
        showStatus('Please enter a target website URL.', 'error');
        return;
    }

    // Validate URL
    try {
        new URL(targetUrl);
    } catch (error) {
        showStatus('Please enter a valid URL.', 'error');
        return;
    }

    switch (method) {
        case 'post':
            transferViaPost(targetUrl, scannedData);
            break;
        case 'params':
            transferViaParams(targetUrl, scannedData);
            break;
        case 'newtab':
            transferViaNewTab(targetUrl, scannedData);
            break;
    }
}

async function transferViaPost(targetUrl, data) {
    try {
        showStatus('Sending data via POST...', 'info');
        
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                qrData: data,
                timestamp: new Date().toISOString(),
                source: 'qr-scanner'
            })
        });

        if (response.ok) {
            showStatus('Data sent successfully via POST!', 'success');
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('POST transfer error:', error);
        showStatus(`Failed to send data via POST: ${error.message}`, 'error');
    }
}

function transferViaParams(targetUrl, data) {
    try {
        const url = new URL(targetUrl);
        url.searchParams.set('qrData', data);
        url.searchParams.set('timestamp', new Date().toISOString());
        url.searchParams.set('source', 'qr-scanner');
        
        window.open(url.toString(), '_blank');
        showStatus('Data sent as URL parameters!', 'success');
    } catch (error) {
        console.error('Params transfer error:', error);
        showStatus(`Failed to send data as parameters: ${error.message}`, 'error');
    }
}

function transferViaNewTab(targetUrl, data) {
    try {
        // Store data in sessionStorage for the new tab to access
        const transferData = {
            qrData: data,
            timestamp: new Date().toISOString(),
            source: 'qr-scanner'
        };
        
        sessionStorage.setItem('qrTransferData', JSON.stringify(transferData));
        
        // Open target URL in new tab
        window.open(targetUrl, '_blank');
        
        showStatus('Opening target website in new tab...', 'success');
    } catch (error) {
        console.error('New tab transfer error:', error);
        showStatus(`Failed to open in new tab: ${error.message}`, 'error');
    }
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    statusDiv.classList.remove('hidden');
    
    // Auto-hide after 5 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 5000);
    }
}

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden && isScanning) {
        // Page is hidden, stop scanner to preserve resources
        stopScanner();
    }
});

// Handle errors
window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
    showStatus('An unexpected error occurred.', 'error');
});

// Check if camera is available
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(function(stream) {
            // Camera is available
            stream.getTracks().forEach(track => track.stop());
        })
        .catch(function(error) {
            console.warn('Camera not available:', error);
            showStatus('Camera access not available. Please check permissions.', 'error');
        });
} else {
    showStatus('Camera API not supported on this browser.', 'error');
}
