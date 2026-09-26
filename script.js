// --- 1. ANIMACIÓN DE LLUVIA DE MATRIX ---
const canvas = document.getElementById('matrix-bg');
const ctx = canvas.getContext('2d');

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

for (let x = 0; x < columns; x++) rainDrops[x] = 1;

function drawMatrix() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#00ff41';
  ctx.font = fontSize + 'px monospace';

  for (let i = 0; i < rainDrops.length; i++) {
    const text = alphabet[Math.floor(Math.random() * alphabet.length)];
    ctx.fillText(text, i * fontSize, rainDrops[i] * fontSize);
    if (rainDrops[i] * fontSize > canvas.height && Math.random() > 0.975) rainDrops[i] = 0;
    rainDrops[i]++;
  }
}
setInterval(drawMatrix, 30);

// --- 2. CONFIGURACIÓN DEL REPRODUCTOR CON PLAYLIST ---
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
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
let sequenceInterval = null;
let noteIndex = 0;

// NUEVA PLAYLIST INTEGRADA (Melodías matemáticas directas)
const playlist = [
  { title: "Secuencia Neo", type: "triangle", label: "Playlist: Pista 01", speed: 250, notes: [261, 293, 329, 349, 392, 440, 493, 523] },
  { title: "Overdrive Zion", type: "sawtooth", label: "Playlist: Pista 02", speed: 150, notes: [110, 130, 150, 130, 110, 90, 80, 90] },
  { title: "Nebuchadnezzar Eco", type: "sine", label: "Playlist: Pista 03", speed: 350, notes: [440, 523, 587, 659, 587, 523, 440, 392] }
];
let playlistIndex = 0;
let isUserFile = false; // Detecta si el sonido es un archivo propio o de la playlist

// Crear barras del ecualizador
const totalBars = 14;
const barElements = [];
for (let i = 0; i < totalBars; i++) {
  const bar = document.createElement('div');
  bar.classList.add('bar');
  visualizerContainer.appendChild(bar);
  barElements.push(bar);
}

function updateUI() {
  if (!isUserFile) {
    songTitle.textContent = playlist[playlistIndex].title;
    artistName.textContent = playlist[playlistIndex].label;
  }
}

// Cargar archivo propio
audioFileInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (isPlaying) stopAudio();
  isUserFile = true;
  songTitle.textContent = file.name.substring(0, 20) + "...";
  artistName.textContent = "Señal: Archivo Externo [Listo]";

  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const reader = new FileReader();
  reader.onload = function(evt) {
    audioCtx.decodeAudioData(evt.target.result, function(buffer) {
      audioBuffer = buffer;
    });
  };
  reader.readAsArrayBuffer(file);
});

function makeDistortionCurve(amount) {
  const k = amount;
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
  if (!isPlaying) return;
  requestAnimationFrame(renderVisuals);

  if (isUserFile && analyserNode) {
    analyserNode.getByteFrequencyData(dataArray);
    for (let i = 0; i < totalBars; i++) {
      const dataIndex = Math.floor((i / totalBars) * dataArray.length * 0.6);
      const height = (dataArray[dataIndex] / 255) * 55;
      barElements[i].style.height = `${Math.max(2, height)}px`;
    }
  } else if (!isUserFile) {
    // Animación rítmica simulada para la playlist de osciladores
    for (let i = 0; i < totalBars; i++) {
      const randomHeight = Math.random() * 45 + 5;
      barElements[i].style.height = `${randomHeight}px`;
    }
  }
}

let distortionNode = null;
let analyserNode = null;
let dataArray = [];

function playAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  if (isUserFile) {
    if (!audioBuffer) return;
    currentSource = audioCtx.createBufferSource();
    currentSource.buffer = audioBuffer;

    distortionNode = audioCtx.createWaveShaper();
    distortionNode.curve = makeDistortionCurve(parseInt(distortionSlider.value));
    distortionNode.oversample = '4x';

    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 64;
    dataArray = new Uint8Array(analyserNode.frequencyBinCount);

    currentSource.playbackRate.value = parseFloat(pitchSlider.value);

    currentSource.connect(distortionNode);
    distortionNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

    currentSource.start(0);
    renderVisuals();

    currentSource.onended = () => { if (isPlaying) stopAudio(); };
  } else {
    // REPRODUCIR PLAYLIST INTERNA (Sintetizador)
    const currentTrack = playlist[playlistIndex];
    sequenceInterval = setInterval(() => {
      if (!isPlaying) return;

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = currentTrack.type;
      oscillator.frequency.value = currentTrack.notes[noteIndex] * parseFloat(pitchSlider.value);

      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + (currentTrack.speed / 1000));

      // Conectar distorsión si el usuario la activa en la playlist
      if (parseInt(distortionSlider.value) > 0) {
        const dist = audioCtx.createWaveShaper();
        dist.curve = makeDistortionCurve(parseInt(distortionSlider.value));
        oscillator.connect(dist);
        dist.connect(gainNode);
      } else {
        oscillator.connect(gainNode);
      }
      
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + (currentTrack.speed / 1000));

      noteIndex = (noteIndex + 1) % currentTrack.notes.length;
    }, currentTrack.speed);
    
    renderVisuals();
  }
}

function stopAudio() {
  if (currentSource) { currentSource.stop(); currentSource.disconnect(); currentSource = null; }
  if (sequenceInterval) { clearInterval(sequenceInterval); sequenceInterval = null; }
  isPlaying = false;
  playBtn.textContent = "▶️ RUN";
  barElements.forEach(bar => bar.style.height = '2px');
}

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

function changeTrack(direction) {
  stopAudio();
  isUserFile = false; // Al presionar flechas volvemos a la playlist
  playlistIndex = (playlistIndex + direction + playlist.length) % playlist.length;
  noteIndex = 0;
  updateUI();
  
  // Auto-arrancar si estaba activo
  isPlaying = true;
  playBtn.textContent = "固 HALT";
  playAudio();
}

prevBtn.addEventListener('click', () => changeTrack(-1));
nextBtn.addEventListener('click', () => changeTrack(1));

pitchSlider.addEventListener('input', (e) => {
  if (currentSource && isUserFile) currentSource.playbackRate.value = parseFloat(e.target.value);
});

distortionSlider.addEventListener('input', (e) => {
  if (distortionNode && isUserFile) distortionNode.curve = makeDistortionCurve(parseInt(e.target.value));
});

updateUI();
