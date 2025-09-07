// Small HTML renderer for the downloads page.
// Export a function that returns the full HTML string given required values.
function renderDownloadsPage({ sessionId, status, fileListHtml, messagesHtml }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('https://e0bd612f814534.lhr.life/session/' + sessionId + '/status')}`;
  let leftPanelHtml = '';
  if (status === 'expired') {
    leftPanelHtml = `
      <h1>Session</h1>
      <div style="color:#d32f2f;font-size:1.1em;margin:2em 0;text-align:center;">
        <strong>Session Expired</strong><br>
        Please generate a new QR from the extension to start a new session.
      </div>
    `;
  } else {
    leftPanelHtml = `
      <h1>Session</h1>
      <div class="qr-block">
        <img src="${qrUrl}" alt="Session QR" />
        <div style="font-size:0.98em;color:#555;margin-top:0.5em;">Scan to connect/upload</div>
      </div>
      <div class="meta"><strong>Session ID:</strong><br><span style="word-break:break-all;">${sessionId}</span></div>
      <div class="status-badge"><strong>Status:</strong> ${status}</div>
    `;
  }
  return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Downloads - ${sessionId}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: linear-gradient(120deg, #f0f4ff 0%, #e9f7ef 100%); min-height: 100vh; margin: 0; }
          .container { max-width: 1100px; margin: 2.5em auto; background: #fff; border-radius: 18px; box-shadow: 0 4px 24px #0002; padding: 2.5em 2em; display: flex; gap: 2.5em; }
          .left-panel { flex: 0 0 270px; display: flex; flex-direction: column; align-items: center; border-right: 1.5px solid #e5e7eb; padding-right: 2em; }
          .right-panel { flex: 1 1 0; padding-left: 2em; }
          h1 { text-align: center; color: #2d3748; margin-bottom: 0.5em; }
          .meta { color: #666; font-size: 1em; margin-bottom: 0.5em; text-align: center; }
          .qr-block { text-align: center; margin: 1.5em 0; }
          .qr-block img { border: 1px solid #eee; padding: 8px; background: #fafafa; border-radius: 12px; }
          .status-badge { display: inline-block; padding: 0.3em 1em; border-radius: 1em; font-size: 1em; font-weight: 500; margin-top: 0.7em; background: #e3f2fd; color: #1976d2; }
          .file-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5em; margin-top: 1.5em; }
          @media (max-width: 900px) { .container { flex-direction: column; gap: 1.5em; } .left-panel, .right-panel { padding: 0; border: none; } .file-list { grid-template-columns: 1fr; } }
          .file-card { background: #f8fafc; border-radius: 12px; box-shadow: 0 2px 8px #0001; padding: 1.2em; display: flex; flex-direction: column; align-items: center; transition: box-shadow 0.2s; }
          .file-card:hover { box-shadow: 0 4px 16px #0002; }
          .file-preview { width: 100%; height: 120px; display: flex; align-items: center; justify-content: center; background: #e6eaf3; border-radius: 8px; margin-bottom: 1em; overflow: hidden; }
          .file-preview img, .file-preview video, .file-preview audio, .file-preview iframe { max-width: 100%; max-height: 100%; border-radius: 6px; }
          .file-info { text-align: center; margin-bottom: 0.7em; }
          .file-name { font-weight: 600; color: #2d3748; word-break: break-all; }
          .file-meta { font-size: 0.95em; color: #888; }
          .download-btn { background: #28a745; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 0.7em; transition: background 0.2s; display: inline-block; }
          .download-btn:hover { background: #218838; }
          .messages-list { margin-bottom:2em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="left-panel">
            ${leftPanelHtml}
          </div>
          <div class="right-panel">
            <div id="messages-list">${messagesHtml || ''}</div>
            <h2 style="text-align:left;margin-top:0;">Available Files:</h2>
            <div id="file-list" class="file-list">${fileListHtml}</div>
          </div>
        </div>

        <script>
          // Poll every 5s for session updates and refresh file list and messages
          (function() {
            const sessionId = ${JSON.stringify(sessionId)};
            const statusEl = document.querySelector('.meta:nth-of-type(2)');
            const fileListEl = document.getElementById('file-list');
            const messagesListEl = document.getElementById('messages-list');

            function buildList(uploads) {
              if (!uploads || uploads.length === 0) return '<p style="text-align:center;color:#888;font-size:1.1em;">No files uploaded yet.</p>';
              function getPreview(u) {
                var ext = u.filename.split('.').pop().toLowerCase();
                var previewUrl = '/preview/' + sessionId + '/' + encodeURIComponent(u.filename);
                if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) {
                  return '<img src="' + previewUrl + '" alt="preview" />';
                } else if (["mp4","webm","ogg"].includes(ext)) {
                  return '<video src="' + previewUrl + '" controls style="max-height:100px;max-width:100%"></video>';
                } else if (["mp3","wav","m4a","aac"].includes(ext)) {
                  return '<audio src="' + previewUrl + '" controls style="width:100%"></audio>';
                } else if (["pdf"].includes(ext)) {
                  return '<iframe src="' + previewUrl + '" style="width:100%;height:100px;border:none;background:#fff;"></iframe>';
                } else if (["txt","md","csv","log"].includes(ext)) {
                  return '<div style="font-size:0.95em;color:#444;padding:0.5em;overflow-x:auto;max-height:90px;background:#f3f3f3;border-radius:4px;">Text file</div>';
                } else {
                  return '<div style="font-size:2.5em;color:#bbb;">📄</div>';
                }
              }
              var items = uploads.map(function(u) {
                var fname = encodeURIComponent(u.filename);
                var preview = '<div class="file-preview">' + getPreview(u) + '</div>';
                var info = '<div class="file-info"><div class="file-name">' + u.filename + '</div><div class="file-meta">' + (u.size/1024).toFixed(1) + ' KB<br>' + new Date(u.uploadedAt).toLocaleString() + '</div></div>';
                return '<div class="file-card">' + preview + info + '<a href="/download/' + sessionId + '/' + fname + '" class="download-btn">Download</a></div>';
              }).join('');
              return items;
            }

            function buildMessages(messages) {
              if (!messages || messages.length === 0) return '';
              return '<div class="messages-list" style="margin-bottom:2em;">' +
                '<h3 style="margin-bottom:0.5em;color:#1976d2;">Messages</h3>' +
                messages.map(function(m) {
                  return '<div style="background:#f1f8ff;padding:0.7em 1em;border-radius:8px;margin-bottom:0.5em;max-width:90%;word-break:break-word;">'
                    + '<span style="color:#333;">' + (m.text || '') + '</span><br>'
                    + '<span style="font-size:0.85em;color:#888;">' + (m.sentAt ? new Date(m.sentAt).toLocaleString() : '') + '</span>'
                    + '</div>';
                }).join('') + '</div>';
            }

            async function pollOnce() {
              try {
                var res = await fetch('/' + sessionId + '/status', { cache: 'no-store' });
                if (!res.ok) return;
                var data = await res.json();
                // update status line
                if (statusEl) statusEl.innerHTML = '<strong>Status:</strong> ' + (data.status || 'unknown');
                // update file list
                fileListEl.innerHTML = buildList(data.uploads || []);
                // update messages
                if (messagesListEl) messagesListEl.innerHTML = buildMessages(data.messages || []);
              } catch (err) {
                // ignore temporary errors
                console.warn('Polling error', err);
              }
            }

            // initial quick poll and then interval
            pollOnce();
            setInterval(pollOnce, 5000);
          })();
        </script>
      </body>
    </html>`;
}

module.exports = { renderDownloadsPage };
