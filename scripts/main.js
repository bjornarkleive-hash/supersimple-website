import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Din ekte Firebase-konfigurasjon
const firebaseConfig = {
  apiKey: "AIzaSyDw5W3AUpuoJ9ys-bGVfSo8-j_5Mn5wm5g",
  authDomain: "supersimplewebsite-20fe9.firebaseapp.com",
  databaseURL: "https://supersimplewebsite-20fe9-default-rtdb.firebaseio.com",
  projectId: "supersimplewebsite-20fe9",
  storageBucket: "supersimplewebsite-20fe9.firebasestorage.app",
  messagingSenderId: "332243396525",
  appId: "1:332243396525:web:da28ba426b4e7191aea324",
  measurementId: "G-6XGQY7KMWS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messagesCol = collection(db, "messages");
const specsCol = collection(db, "shared_specs");

/* Specs-funksjonalitet */
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
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  };
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
    ['Språk', specs.language],
    ['Skjerm (px)', specs.screen.width && specs.screen.height ? specs.screen.width + ' × ' + specs.screen.height : null],
    ['CPU (kjerner)', specs.hardwareConcurrency],
    ['Est. RAM (GB)', specs.deviceMemory],
    ['Tidsone', specs.timezone]
  ];

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

function renderSharedSpecs(sharedSpecs) {
  const container = document.getElementById('shared-specs-list');
  if (!container) return;

  if (sharedSpecs.length === 0) {
    container.innerHTML = '<div style="padding:16px; text-align:center; color:#9ca3af;">Ingen delte specs ennå.</div>';
    return;
  }

  container.innerHTML = sharedSpecs.map(spec => `
    <div style="border:1px solid #e5e7eb; border-radius:6px; padding:12px; margin-bottom:12px; background:#f9fafb;">
      <div style="font-weight:600; margin-bottom:8px;">📊 ${spec.name}</div>
      <table style="width:100%; font-size:0.875rem;">
        <tr><td style="color:#6b7280;">OS:</td><td style="font-weight:500;">${osFromUA(spec.specs.userAgent)}</td></tr>
        <tr><td style="color:#6b7280;">Skjerm:</td><td style="font-weight:500;">${spec.specs.screen.width} × ${spec.specs.screen.height} px</td></tr>
        <tr><td style="color:#6b7280;">CPU:</td><td style="font-weight:500;">${spec.specs.hardwareConcurrency || 'Ukjent'} kjerner</td></tr>
        <tr><td style="color:#6b7280;">RAM:</td><td style="font-weight:500;">${spec.specs.deviceMemory || 'Ukjent'} GB</td></tr>
        <tr><td style="color:#6b7280;">Tidssone:</td><td style="font-weight:500;">${spec.specs.timezone}</td></tr>
        <tr><td style="color:#6b7280;">Tid:</td><td style="font-weight:500; font-size:0.8rem;">${new Date(spec.timestamp).toLocaleString('no-NO')}</td></tr>
      </table>
    </div>
  `).join('');
}

/* Sanntids chat-lytter fra Firestore */
const q = query(messagesCol, orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
  const container = document.getElementById('messages-list');
  if (!container) return;
  
  const messages = [];
  snapshot.forEach(doc => {
    messages.push({ id: doc.id, ...doc.data() });
  });

  if (messages.length === 0) {
    container.innerHTML = '<div style="padding:16px; text-align:center; color:#9ca3af;">Ingen meldinger ennå. Vær første!</div>';
    return;
  }

  container.innerHTML = messages.map(msg => `
    <div class="message-item">
      <div class="message-meta"><strong>${msg.name || 'Anonym'}</strong> • ${new Date(msg.timestamp).toLocaleString('no-NO')}</div>
      <div class="message-text">${msg.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
  `).join('');
});

/* Sanntids lytter for delte specs */
const specsQuery = query(specsCol, orderBy("timestamp", "desc"));
onSnapshot(specsQuery, (snapshot) => {
  const sharedSpecs = [];
  snapshot.forEach(doc => {
    sharedSpecs.push({ id: doc.id, ...doc.data() });
  });
  renderSharedSpecs(sharedSpecs);
});

/* Event Listeners */
document.addEventListener('DOMContentLoaded', async () => {
  const specs = await getSpecs();
  renderSpecs(specs);

  const sendBtn = document.getElementById('send-btn');
  const inputEl = document.getElementById('message-input');
  const nameEl = document.getElementById('name-input');
  const clearBtn = document.getElementById('clear-btn');
  const shareSpecsBtn = document.getElementById('share-specs-btn');

  // Send melding til Firestore (med namn)
  if (sendBtn && inputEl) {
    sendBtn.addEventListener('click', async () => {
      const text = inputEl.value.trim();
      const name = nameEl.value.trim();
      
      if (!text) return alert('Vennligst skriv ein melding');
      if (!name) return alert('Vennligst skriv ditt namn');

      try {
        await addDoc(messagesCol, {
          text: text,
          name: name,
          timestamp: new Date().toISOString()
        });
        inputEl.value = '';
      } catch (error) {
        console.error("Feil ved sending til Firestore:", error);
      }
    });

    inputEl.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) sendBtn.click();
    });
  }

  // Del dine specs
  if (shareSpecsBtn) {
    shareSpecsBtn.addEventListener('click', async () => {
      const name = prompt('Kva skal dine specs heite? (f.eks. "Min MacBook")');
      if (!name) return;

      try {
        await addDoc(specsCol, {
          name: name.trim(),
          specs: specs,
          timestamp: new Date().toISOString()
        });
        alert('Specs delt! 🎉');
      } catch (error) {
        console.error("Feil ved deling av specs:", error);
      }
    });
  }

  // Slett alle meldinger (fjerner alt globalt fra Firestore)
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Er du sikker på at du vil slette ALLE meldingar frå heile databasen?')) {
        const querySnapshot = await getDocs(messagesCol);
        querySnapshot.forEach(async (documentDoc) => {
          await deleteDoc(doc(db, "messages", documentDoc.id));
        });
      }
    });
  }
});
