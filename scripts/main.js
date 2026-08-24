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
      <div class="message-meta">${new Date(msg.timestamp).toLocaleString('no-NO')}</div>
      <div class="message-text">${msg.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
    </div>
  `).join('');
});

/* Event Listeners */
document.addEventListener('DOMContentLoaded', async () => {
  const specs = await getSpecs();
  renderSpecs(specs);

  const sendBtn = document.getElementById('send-btn');
  const inputEl = document.getElementById('message-input');
  const clearBtn = document.getElementById('clear-btn');

  // Send melding til Firestore
  if (sendBtn && inputEl) {
    sendBtn.addEventListener('click', async () => {
      const text = inputEl.value.trim();
      if (!text) return alert('Vennligst skriv en melding');

      try {
        await addDoc(messagesCol, {
          text: text,
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

  // Slett alle meldinger (fjerner alt globalt fra Firestore)
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Er du sikker på at du vil slette ALLE meldinger fra hele databasen?')) {
        const querySnapshot = await getDocs(messagesCol);
        querySnapshot.forEach(async (documentDoc) => {
          await deleteDoc(doc(db, "messages", documentDoc.id));
        });
      }
    });
  }
});
