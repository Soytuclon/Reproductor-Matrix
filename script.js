// --- 1. ANIMACIÓN DE LLUVIA DE MATRIX ---
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');

const katakana = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890XYZ";
const alphabet = katakana.split("");
const fontSize = 16;
let rainDrops = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const columns = Math.floor(canvas.width / fontSize);
  while (rainDrops.length < columns) {
    rainDrops.push(Math.random() * -canvas.height / fontSize);
  }
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function drawMatrix() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#00ff41';
  ctx.font = fontSize + 'px monospace';
  for (let i = 0; i < rainDrops.length; i++) {
    const text = alphabet[Math.floor(Math.random() * alphabet.length)];
    ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);
    if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      rainDrops[i] = 0;
    }
    rainDrops[i]++;
  }
}
setInterval(drawMatrix, 30);


// --- 2. BASE DE DATOS LOCAL (PERSISTENCIA VIA INDEXEDDB) ---
const DB_NAME = "MatrixPlayerDB";
const STORE_NAME = "playlist";
let db = null;

function initDB(callback) {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = function(e) {
    const database = e.target.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
    }
  };
  request.onsuccess = function(e) {
    db = e.target.result;
    if (callback) callback();
  };
  request.onerror = function() {
    artistName.textContent = "Error: Al inicializar el almacenamiento local.";
  };
}

function saveTrackToDB(name, fileBlob) {
  if (!db) return;
  const transaction = db.transaction([STORE_NAME], "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  store.add({ name: name, blob: fileBlob });
}

function loadPlaylistFromDB() {
  if (!db || !audioCtx) return;
  const transaction = db.transaction([STORE_NAME], "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = function(e) {
    const savedTracks = e.target.result;
    if (savedTracks.length === 0) return;

    artistName.textContent = `Estado: Restaurando ${savedTracks.length} pista(s)...`;
    let processed = 0;

    savedTracks.forEach(trackData => {
      const reader = new FileReader();
      reader.onload = function(evt) {
        audioCtx.decodeAudioData(evt.target.result, function(buffer) {
          playlist.push({ name: trackData.name, buffer: buffer });
          processed++;
          
          updatePlaylistUI();

          if (processed === savedTracks.length) {
            artistName.textContent = "Estado: Playlist restaurada del Core";
            selectTrack(0, false);
          }
        }, function(err) { console.error("Error decodificando caché local", err); });
      };
      reader.readAsArrayBuffer(trackData.blob);
    });
  };
}


// --- 3. CONFIGURACIÓN DEL REPRODUCTOR Y PLAYLIST ---
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const audioFileInput = document.getElementById('audio-file');
const songTitle = document.getElementById('song-title');
const artistName = document.getElementById('artist-name');
const pitchSlider = document.getElementById('pitch-slider');
const distortionSlider = document.getElementById('distortion-slider');
const volumeSlider = document.getElementById('volume-slider');
const playlistContainer = document.getElementById('playlist-tracks');
const visualizerContainer = document.getElementById('visualizer');

let audioCtx = null;
let currentSource = null;
let isPlaying = false;

let startTime = 0;
let pauseTime = 0;

let distortionNode = null;
let gainNode = null;
let analyserNode = null;
let dataArray = [];

let playlist = [];
let currentTrackIndex = 0;

const totalBars = 14;
const barElements = [];
for (let i = 0; i < totalBars; i++) {
  const bar = document.createElement('div');
  bar.classList.add('bar');
  visualizerContainer.appendChild(bar);
  barElements.push(bar);
}

// Inicialización asíncrona segura de la base de datos
window.addEventListener('DOMContentLoaded', () => {
  initDB(() => {
    if (audioCtx) {
      loadPlaylistFromDB();
    }
  });
});

// Forzar activación del AudioContext tras interacciones del usuario (Evita bloqueos de navegador)
function ensureAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (db && playlist.length === 0) {
      loadPlaylistFromDB();
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Capturar e importar nuevos archivos
audioFileInput.addEventListener('change', function(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  ensureAudioContext();

  artistName.textContent = `Estado: Descifrando ${files.length} pista(s)...`;
  let loadedCount = 0;

  files.forEach(file => {
    saveTrackToDB(file.name, file);

    const reader = new FileReader();
    reader.onload = function(evt) {
      audioCtx.decodeAudioData(evt.target.result, function(buffer) {
        playlist.push({ name: file.name, buffer: buffer });
        loadedCount++;
        
        updatePlaylistUI();

        if (loadedCount === files.length) {
          artistName.textContent = "Estado: Nodos de la lista cargados";
          if (!isPlaying && playlist.length === files.length) {
            selectTrack(0, false);
          }
        }
      }, function(err) {
        artistName.textContent = "Error analítico de decodificación.";
      });
    };
    reader.readAsArrayBuffer(file);
  });
});

function updatePlaylistUI() {
  playlistContainer.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${track.name}`;
    li.classList.add('track-item');
    if (index === currentTrackIndex) li.classList.add('active');
    
    li.addEventListener('click', () => {
      ensureAudioContext();
      selectTrack(index, true);
    });
    playlistContainer.appendChild(li);
  });
}

function selectTrack(index, autoPlay = true) {
  if (index < 0 || index >= playlist.length) return;
  
  stopAudio();
  pauseTime = 0;
  
  currentTrackIndex = index;
  songTitle.textContent = playlist[index].name;
  
  updatePlaylistUI();

  if (autoPlay) {
    isPlaying = true;
    playBtn.textContent = "固 HALT";
    playAudio();
  } else {
    artistName.textContent = `Pista ${index + 1} en espera`;
  }
}

function makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

function renderVisuals() {
  if (!isPlaying || !analyserNode) return;
  requestAnimationFrame(renderVisuals);

  analyserNode.getByteFrequencyData(dataArray);

  for (let i = 0; i < totalBars; i++) {
    const dataIndex = Math.floor((i / totalBars) * dataArray.length * 0.6);
    const value = dataArray[dataIndex];
    const heightPercentage = (value / 255) * 55;
    barElements[i].style.height = `${Math.max(2, heightPercentage)}px`;
  }
}

function playAudio() {
  if (playlist.length === 0 || !audioCtx) return;

  const track = playlist[currentTrackIndex];

  currentSource = audioCtx.createBufferSource();
  currentSource.buffer = track.buffer;

  distortionNode = audioCtx.createWaveShaper();
  distortionNode.curve = makeDistortionCurve(parseInt(distortionSlider.value));
  distortionNode.oversample = '4x';

  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(parseFloat(volumeSlider.value), audioCtx.currentTime);

  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 64;
  const bufferLength = analyserNode.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  currentSource.playbackRate.value = parseFloat(pitchSlider.value);

  currentSource.connect(distortionNode);
  distortionNode.connect(gainNode);
  gainNode.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);

  startTime = audioCtx.currentTime - pauseTime;
  currentSource.start(0, pauseTime % track.buffer.duration);
  
  artistName.textContent = `Streaming: [Pista ${currentTrackIndex + 1}/${playlist.length}]`;
  renderVisuals();

  currentSource.onended = () => {
    if (isPlaying) {
      if (currentTrackIndex + 1 < playlist.length) {
        selectTrack(currentTrackIndex + 1, true);
      } else {
        stopAudio();
        pauseTime = 0;
        artistName.textContent = "Estado: Fin del canal de datos";
      }
    }
  };
}

function stopAudio() {
  if (currentSource) {
    if (audioCtx) {
      pauseTime = audioCtx.currentTime - startTime;
    }
    try { currentSource.stop(); } catch(e) {}
    currentSource.disconnect();
    currentSource = null;
  }
  barElements.forEach(bar => bar.style.height = '2px');
}

// --- 4. ASIGNACIÓN DINÁMICA DE EVENTOS DE INTERFAZ ---
playBtn.addEventListener('click', () => {
  ensureAudioContext();

  if (playlist.length === 0) {
    artistName.textContent = "Aviso: Sube canciones primero";
    return;
  }

  isPlaying = !isPlaying;
  if (isPlaying) {
    playBtn.textContent = "固 HALT";
    playAudio();
  } else {
    playBtn.textContent = "▶️ RUN";
    artistName.textContent = "Estado: Transmisión pausada";
    stopAudio();
  }
});

volumeSlider.addEventListener('input', (e) => {
  const volValue = parseFloat(e.target.value);
  if (gainNode && audioCtx) {
