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


// --- 2. CONFIGURACIÓN DEL REPRODUCTOR, PLAYLIST Y NODOS ---
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const audioFileInput = document.getElementById('audio-file');
const songTitle = document.getElementById('song-title');
const artistName = document.getElementById('artist-name');
const pitchSlider = document.getElementById('pitch-slider');
const distortionSlider = document.getElementById('distortion-slider');
const volumeSlider = document.getElementById('volume-slider'); // Control añadido
const playlistContainer = document.getElementById('playlist-tracks'); // Contenedor añadido
const visualizerContainer = document.getElementById('visualizer');

let audioCtx = null;
let currentSource = null;
let isPlaying = false;

// Nodos Web Audio API
let distortionNode = null;
let gainNode = null; // Nodo de volumen añadido
let analyserNode = null;
let dataArray = [];

// Estado de la Playlist
let playlist = []; // Guarda objetos { name: string, buffer: AudioBuffer }
let currentTrackIndex = 0;

const totalBars = 14;
const barElements = [];
for (let i = 0; i < totalBars; i++) {
  const bar = document.createElement('div');
  bar.classList.add('bar');
  visualizerContainer.appendChild(bar);
  barElements.push(bar);
}

// Cargar múltiples archivos a la Playlist
audioFileInput.addEventListener('change', function(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  artistName.textContent = `Estado: Decodificando ${files.length} pista(s)...`;

  let loadedCount = 0;

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = function(evt) {
      audioCtx.decodeAudioData(evt.target.result, function(buffer) {
        playlist.push({ name: file.name, buffer: buffer });
        loadedCount++;
        
        // Actualizar la interfaz de la playlist
        updatePlaylistUI();

        if (loadedCount === files.length) {
          artistName.textContent = "Estado: Playlist actualizada [Lista]";
          // Si no había nada reproduciéndose, seleccionamos la primera pista nueva
          if (!isPlaying && playlist.length === files.length) {
            selectTrack(0, false);
          }
        }
      }, function(err) {
        console.error("Error al decodificar audio:", err);
      });
    };
    reader.readAsArrayBuffer(file);
  });
});

// Renderizar la lista de reproducción en el DOM
function updatePlaylistUI() {
  playlistContainer.innerHTML = '';
  playlist.forEach((track, index) => {
    const li = document.createElement('li');
    li.textContent = `${index + 1}. ${track.name}`;
    li.classList.add('track-item');
    if (index === currentTrackIndex) li.classList.add('active');
    
    li.addEventListener('click', () => {
      selectTrack(index, true);
    });
    playlistContainer.appendChild(li);
  });
}

// Seleccionar pista de la playlist
function selectTrack(index, autoPlay = true) {
  if (index < 0 || index >= playlist.length) return;
  
  if (isPlaying) stopAudio();
  
  currentTrackIndex = index;
  songTitle.textContent = playlist[index].name;
  
  updatePlaylistUI();

  if (autoPlay) {
    isPlaying = true;
    playBtn.textContent = "固 HALT";
    playAudio();
  } else {
    artistName.textContent = "Estado: Pista seleccionada";
  }
}

// Algoritmo de distorsión
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

// Animación de frecuencias
function renderVisuals() {
  if (!isPlaying) return;
  requestAnimationFrame(renderVisuals);

  analyserNode.getByteFrequencyData(dataArray);

  for (let i = 0; i < totalBars; i++) {
    const dataIndex = Math.floor((i / totalBars) * dataArray.length * 0.6);
    const value = dataArray[dataIndex];
    const heightPercentage = (value / 255) * 55;
    barElements[i].style.height = `${Math.max(2, heightPercentage)}px`;
  }
}

// Iniciar audio enlazando la nueva cadena de GainNode
function playAudio() {
  if (playlist.length === 0 || !audioCtx) {
    artistName.textContent = "Aviso: Carga archivos a la playlist";
    isPlaying = false;
    playBtn.textContent = "▶️ RUN";
    return;
  }

  const track = playlist[currentTrackIndex];

  currentSource = audioCtx.createBufferSource();
  currentSource.buffer = track.buffer;

  // 1. Nodo de Distorsión
  distortionNode = audioCtx.createWaveShaper();
  distortionNode.curve = makeDistortionCurve(parseInt(distortionSlider.value));
  distortionNode.oversample = '4x';

  // 2. Nodo de Volumen (GainNode)
  gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(parseFloat(volumeSlider.value), audioCtx.currentTime);

  // 3. Nodo Analizador
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 64;
  const bufferLength = analyserNode.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  // Modificar Pitch (Velocidad)
  currentSource.playbackRate.value = parseFloat(pitchSlider.value);

  // NUEVA CADENA CONECTADA: Source -> Distortion -> Gain (Volumen) -> Analyser -> Output
  currentSource.connect(distortionNode);
  distortionNode.connect(gainNode);
  gainNode.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);

  currentSource.start(0);
  artistName.textContent = `Transmitiendo: [Pista ${currentTrackIndex + 1}/${playlist.length}]`;
  
  renderVisuals();

  currentSource.onended = () => {
    // Si terminó por sí sola, salta automáticamente a la siguiente pista
    if (isPlaying) {
      if (currentTrackIndex + 1 < playlist.length) {
        selectTrack(currentTrackIndex + 1, true);
      } else {
        stopAudio();
        artistName.textContent = "Estado: Fin de la playlist";
      }
    }
  };
}

function stopAudio() {
  isPlaying = false;
  playBtn.textContent = "▶️ RUN";
  artistName.textContent = "Estado: Conexión pausada";

  if (currentSource) {
    try { currentSource.stop(); } catch(e) {}
    currentSource.disconnect();
    currentSource = null;
  }
  barElements.forEach(bar => bar.style.height = '2px');
}

// --- 3. EVENTOS DE INTERFAZ ---
playBtn.addEventListener('click', () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

  isPlaying = !isPlaying;
  if (isPlaying) {
    playBtn.textContent = "固 HALT";
    playAudio();
  } else {
    stopAudio();
  }
});

// Botones de navegación de la playlist
prevBtn.addEventListener('click', () => {
  if (currentTrackIndex > 0) {
    selectTrack(currentTrackIndex - 1, isPlaying);
  }
});

nextBtn.addEventListener('click', () => {
  if (currentTrackIndex + 1 < playlist.length) {
    selectTrack(currentTrackIndex + 1, isPlaying);
  }
});

// Control de volumen reactivo en tiempo real
volumeSlider.addEventListener('input', (e) => {
  if (gainNode && audioCtx) {
    gainNode.gain.setValueAtTime(parseFloat(e.target.value), audioCtx.currentTime);
  }
});

pitchSlider.addEventListener('input', (e) => {
  if (currentSource && isPlaying) currentSource.playbackRate.value = parseFloat(e.target.value);
});

distortionSlider.addEventListener('input', (e) => {
  if (distortionNode) distortionNode.curve = makeDistortionCurve(parseInt(e.target.value));
});
