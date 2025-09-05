// qrtest.js
// Usage: node qrtest.js <sessionId>
const QRCode = require('qrcode');

async function main() {
  // Use native fetch (Node 18+)
  const res = await fetch('https://e8fb5a98c01660.lhr.life', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    console.error('Failed to get session:', await res.text());
    process.exit(1);
  }
  const { sessionId, uploadUrl, expiresAt } = await res.json();
  console.log('Session created:', { sessionId, uploadUrl, expiresAt });

  // Replace with your actual laptop IP address
  const laptopIp = '192.168.29.16'; // <-- CHANGE THIS
  const statusUrl = ` https://e8fb5a98c01660.lhr.life/session/${sessionId}/status`;

  QRCode.toDataURL(statusUrl, function (err, dataUrl) {
    if (err) {
      console.error('Error generating QR:', err);
      process.exit(1);
    }
    console.log('QR for:', statusUrl);
    console.log(dataUrl);
  });
}

main();
