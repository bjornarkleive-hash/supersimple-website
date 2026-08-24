async function getSpecs() {
  const nav = navigator;
  const screenInfo = window.screen || {};

  const specs = {
    timestamp: new Date().toISOString(),
    userAgent: nav.userAgent || null,
    platform: nav.platform || null,
    vendor: nav.vendor || null,
    language: nav.language || null,
    languages: nav.languages || null,
    cookieEnabled: nav.cookieEnabled === undefined ? null : nav.cookieEnabled,
    hardwareConcurrency: nav.hardwareConcurrency || null,
    deviceMemory: nav.deviceMemory || null,
    doNotTrack: nav.doNotTrack || null,
    devicePixelRatio: window.devicePixelRatio || null,
    screen: {
      width: screenInfo.width || null,
      height: screenInfo.height || null,
      availWidth: screenInfo.availWidth || null,
      availHeight: screenInfo.availHeight || null,
      colorDepth: screenInfo.colorDepth || null,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    connection: null,
    battery: null,
    location: null
  };

  try {
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn) {
      specs.connection = {
        effectiveType: conn.effectiveType || null,
        downlink: conn.downlink || null,
        rtt: conn.rtt || null,
        saveData: conn.saveData || null
      };
    }
  } catch (e) { /* ignore */ }

  try {
    if (navigator.getBattery) {
      const bat = await navigator.getBattery();
      specs.battery = {
        charging: bat.charging,
        level: bat.level,
        chargingTime: bat.chargingTime,
        dischargingTime: bat.dischargingTime
      };
    }
  } catch (e) { /* ignore */ }

  try {
    if (navigator.geolocation) {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
      }).catch(() => null);
      if (pos && pos.coords) {
        specs.location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
      }
    }
  } catch (e) { /* ignore */ }

  return specs;
}

function osFromUA(ua) {
  ua = (ua || '').toLowerCase();
  if (ua.indexOf('windows') !== -1) return 'Windows';
  if (ua.indexOf('mac os x') !== -1 || ua.indexOf('macintosh') !== -1) return 'macOS';
  if (ua.indexOf('android') !== -1) return 'Android';
  if (ua.indexOf('iphone') !== -1 || ua.indexOf('ipad') !== -1 || ua.indexOf('ios') !== -1) return 'iOS';
  if (ua.indexOf('linux') !== -1) return 'Linux';
  return 'Ukjent';
}

function renderSpecs(specs) {
  const table = document.getElementById('specs-table');
  if (!table) return;
  table.innerHTML = '';

  const rows = [
    ['Tid (lokal ISO)', specs.timestamp],
    ['Nettleser UA', specs.userAgent],
    ['Operativsystem (estimat)', osFromUA(specs.userAgent)],
    ['Plattform', specs.platform],
    ['Produsent', specs.vendor],
    ['Språk', specs.language],
    ['Støttede språk', Array.isArray(specs.languages) ? specs.languages.join(', ') : specs.languages],
    ['Skjerm (px)', specs.screen.width && specs.screen.height ? specs.screen.width + ' × ' + specs.screen.height : null],
    ['Skjerm fargedybde', specs.screen.colorDepth],
    ['Skjerm pixel ratio', specs.devicePixelRatio],
    ['CPU (logiske kjerner)', specs.hardwareConcurrency],
    ['Est. RAM (GB)', specs.deviceMemory],
    ['Tidsone', specs.timezone],
    ['Cookies aktivert', specs.cookieEnabled],
    ['Do Not Track', specs.doNotTrack]
  ];

  if (specs.connection) {
    rows.push(['Nettverkstype', specs.connection.effectiveType]);
    rows.push(['Nedlast (Mbps)', specs.connection.downlink]);
    rows.push(['RTT (ms)', specs.connection.rtt]);
  }
  if (specs.battery) {
    rows.push(['Batteri - lading', specs.battery.charging]);
    rows.push(['Batteri nivå', specs.battery.level]);
  }
  if (specs.location) {
    rows.push(['Posisjon (lat,lon)', specs.location.latitude + ', ' + specs.location.longitude]);
    rows.push(['Posisjon nøyaktighet (m)', specs.location.accuracy]);
  }

  for (const [label, value] of rows) {
    const tr = document.createElement('tr');
    const tdLabel = document.createElement('td');
    tdLabel.className = 'label';
    tdLabel.textContent = label;
    const tdVal = document.createElement('td');
    tdVal.textContent = value === null || value === undefined ? 'Ikke tilgjengelig' : String(value);
    tr.appendChild(tdLabel);
    tr.appendChild(tdVal);
    table.appendChild(tr);
  }

  window.__lastSpecs = specs;
}

function specsToText(specs) {
  const lines = [];
  lines.push('Bjørnar Kleive — Besøkendes maskinrapport');
  lines.push('Tid: ' + specs.timestamp);
  lines.push('UA: ' + (specs.userAgent || ''));
  lines.push('OS (estimat): ' + osFromUA(specs.userAgent));
  lines.push('Plattform: ' + (specs.platform || ''));
  lines.push('Språk: ' + (specs.language || ''));
  lines.push('Skjerm: ' + ((specs.screen && specs.screen.width && specs.screen.height) ? (specs.screen.width + 'x' + specs.screen.height) : ''));
  lines.push('CPU kjerner: ' + (specs.hardwareConcurrency || ''));
  lines.push('Est. RAM (GB): ' + (specs.deviceMemory || ''));
  lines.push('Tidsone: ' + (specs.timezone || ''));
  if (specs.connection) {
    lines.push('Nettverkstype: ' + (specs.connection.effectiveType || ''));
    lines.push('Nedlast (Mbps): ' + (specs.connection.downlink || ''));
  }
  if (specs.location) {
    lines.push('Posisjon: ' + specs.location.latitude + ',' + specs.location.longitude + ' (nøyaktighet ' + specs.location.accuracy + ' m)');
  }
  return lines.join('\n');
}

/* Messages functionality */
function loadMessages() {
  const stored = localStorage.getItem('messages');
  return stored ? JSON.parse(stored) : [];
}

function saveMessages(messages) {
  localStorage.setItem('messages', JSON.stringify(messages));
}

function renderMessages() {
  const container = document.getElementById('messages-list');
  if (!container) return;
  const messages = loadMessages();

  if (messages.length === 0) {
    container.innerHTML = '<div style="padding:16px; text-align:center; color:#9ca3af;">Ingen meldinger ennå. Vær første!</div>';
    return;
  }

  container.innerHTML = messages.map(msg => `
    <div class="message-item">
      <div class="message-meta">${new Date(msg.timestamp).toLocaleString('no-NO')}</div>
      <div class="message-text">${msg.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
  `).join('');
}

function setupEventListeners() {
  const sendBtn = document.getElementById('send-btn');
  const inputEl = document.getElementById('message-input');
  const clearBtn = document.getElementById('clear-btn');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');

  if (sendBtn && inputEl) {
    sendBtn.addEventListener('click', () => {
      const text = inputEl.value.trim();
      if (!text) {
        alert('Vennligst skriv en melding');
        return;
      }
      const messages = loadMessages();
      messages.push({ text: text, timestamp: new Date().toISOString() });
      saveMessages(messages);
      inputEl.value = '';
      renderMessages();
    });

    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) sendBtn.click();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (confirm('Er du sikker på at du vil slette alle meldinger?')) {
        localStorage.removeItem('messages');
        renderMessages();
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const specs = window.__lastSpecs;
      if (!specs) return alert('Spesifikasjoner ikke klare ennå.');
      const text = specsToText(specs);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          alert('Rapport kopiert til utklippstavlen');
        }).catch(() => { alert('Kunne ikke kopiere'); });
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); alert('Rapport kopiert til utklippstavlen'); } catch (e) { alert('Kunne ikke kopiere'); }
        ta.remove();
      }
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      const specs = window.__lastSpecs;
      if (!specs) return alert('Spesifikasjoner ikke klare ennå.');
      const blob = new Blob([JSON.stringify(specs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'maskin-rapport.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }
}

/* On load, gather specs and render */
document.addEventListener('DOMContentLoaded', async () => {
  const specs = await getSpecs();
  renderSpecs(specs);
  renderMessages();
  setupEventListeners();
});
