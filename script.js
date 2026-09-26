// --- 1. ANIMACIÓN DE LLUVIA DE MATRIX ---
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');

// Ajustar tamaño del canvas al navegador
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const katakana = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ1234567890XYZ";
const alphabet = katakana.split("");

const fontSize = 16;
let columns = canvas.width / fontSize;
const rainDrops = [];

for (let x = 0; x < columns; x++) {
  rainDrops[x] = 1;
}

function drawMatrix() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; // Crea el efecto de rastro difuminado
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


// --- 2. CONFIGURACIÓN DEL REPRODUCTOR, FILTROS Y ECUALIZADOR ---
const playBtn = document.getElementById('play-btn');
const audioFileInput = document.getElementById('audio-file');
const songTitle = document.getElementById('song-title');
const artistName = document.getElementById('artist-name');
const pitchSlider = document.getElementById('pitch-slider');
const distortionSlider = document.getElementById('distortion-slider');
const visualizerContainer = document.getElementById('visualizer');

let audioCtx = null;
let audioBuffer = null;
let currentSource = null;
let isPlaying = false;

// Nodos de audio profesionales
let distortionNode = null;
let analyserNode = null;
let dataArray = [];

// Crear las 14 barritas físicas del ecualizador en el HTML mediante JS
const totalBars = 14;
const barElements = [];
for (let i = 0; i < totalBars; i++) {
  const bar = document.createElement('div');
  bar.classList.add('bar');
  visualizerContainer.appendChild(bar);
  barElements.push(bar);
}

// Cargar archivo de audio local sin bloqueos
audioFileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  songTitle.textContent = file.name;
  artistName.textContent = "Estado: Decodificando código...";

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    audioCtx.decodeAudioData(evt.target.result, function(buffer) {
      audioBuffer = buffer;
      artistName.textContent = "Estado: Archivo cargado [Listo]";
      if (isPlaying) stopAudio();
    }, function(err) {
      artistName.textContent = "Error de descompresión de datos.";
    });
  };
  reader.readAsArrayBuffer(file);
});

// Algoritmo de distorsión digital
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

// Renderizar el movimiento de las barras según la frecuencia de la música
function renderVisuals() {
  if (!isPlaying) return;
  requestAnimationFrame(renderVisuals);

  // Extraer las frecuencias actuales del sonido en ejecución
  analyserNode.getByteFrequencyData(dataArray);

  // Mapear los datos de audio a nuestras barras del DOM
  for (let i = 0; i < totalBars; i++) {
    // Tomamos una porción balanceada del array de frecuencias
    const dataIndex = Math.floor((i / totalBars) * dataArray.length * 0.6);
    const value = dataArray[dataIndex];
    
    // Convertir el valor de frecuencia (0 a 255) a píxeles de altura (2px a 55px)
    const heightPercentage = (value / 255) * 55;
    barElements[i].style.height = `${Math.max(2, heightPercentage)}px`;
  }
}

// Iniciar reproducción
function playAudio() {
  if (!audioBuffer || !audioCtx) {
    artistName.textContent = "Aviso: Sube un archivo .mp3";
    isPlaying = false;
    playBtn.textContent = "▶️ RUN";
    return;
  }

  currentSource = audioCtx.createBufferSource();
  currentSource.buffer = audioBuffer;

  // Nodo de distorsión
  distortionNode = audioCtx.createWaveShaper();
  distortionNode.curve = makeDistortionCurve(parseInt(distortionSlider.value));
  distortionNode.oversample = '4x';

  // Nodo Analizador para el ecualizador
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 64; // Cantidad de muestras de frecuencias
  const bufferLength = analyserNode.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  currentSource.playbackRate.value = parseFloat(pitchSlider.value);

  // CONECTAR CADENA: Fuente -> Distorsión -> Analizador -> Altavoces
  currentSource.connect(distortionNode);
  distortionNode.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);

  currentSource.start(0);
  artistName.textContent = "Estado: Transmitiendo datos...";
  
  // Encender bucle visual
  renderVisuals();

  currentSource.onended = () => {
    if (isPlaying) stopAudio();
  };
}

function stopAudio() {
  if (currentSource) {
    currentSource.stop();
    currentSource.disconnect();
  }
  isPlaying = false;
  playBtn.textContent = "▶️ RUN";
  artistName.textContent = "Estado: Conexión pausada";
  
  // Resetear barras al apagar
  barElements.forEach(bar => bar.style.height = '2px');
}

// Eventos
playBtn.addEventListener('click', () => {
  isPlaying = !isPlaying;
  if (isPlaying) {
    playBtn.textContent = "固 HALT";
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    playAudio();
  } else {
    stopAudio();
  }
});

pitchSlider.addEventListener('input', (e) => {
  if (currentSource) currentSource.playbackRate.value = parseFloat(e.target.value);
});

distortionSlider.addEventListener('input', (e) => {
  if (distortionNode) distortionNode.curve = makeDistortionCurve(parseInt(e.target.value));
});