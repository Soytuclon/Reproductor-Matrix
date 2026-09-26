# 📟 Matrix Audio Terminal v4.0

¡Bienvenido al **Matrix Audio Terminal**! Una aplicación web interactiva que funciona como un reproductor de música local avanzado con estética ciberpunk estilo Matrix, cargado con filtros de audio y un ecualizador digital dinámico.

Este proyecto fue desarrollado utilizando **HTML5, CSS3 y JavaScript Vanila**, aprovechando el potencial de la API nativa de audio del navegador (`Web Audio API`) para manipular sonido en tiempo real sin bloqueos de seguridad.

---

## 🚀 Características Principales

* **Fondo Animado Matrix:** Cascada fluida de código digital verde generada dinámicamente mediante HTML5 Canvas.
* **Ecualizador en Tiempo Real:** Un analizador de frecuencias (`AnalyserNode`) que lee los graves y agudos de tu música y estira las barras físicas del reproductor al ritmo del sonido.
* **Carga Local Segura:** Importador de archivos `.mp3` o `.wav` a través de `FileReader`, garantizando compatibilidad total y evadiendo restricciones de red (CORS).
* **Filtros de Audio (Modificadores):**
  * 🎚️ **Velocidad y Tono:** Altera el `playbackRate` para ralentizar la música (voz grave) o acelerarla (efecto ardilla).
  * ⚡ **Distorsión Cypher:** Destruye la fidelidad de la onda de sonido mediante un algoritmo matemático (`WaveShaperNode`) para darle un toque industrial/cyberpunk.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 Canvas** (Para la animación de fondo)
* **CSS3 Custom Properties & Flexbox** (Estética Neón Green)
* **Web Audio API** (Procesamiento y deformación de audio digital)
* **FileReader API** (Inyección local de archivos)
* **Google Fonts** (Fuente digital 'Share Tech Mono')

---

## 💻 Cómo utilizarlo

1. Abre el enlace público del proyecto provisto por GitHub Pages.
2. Haz clic en el botón **📂 Cargar Archivo .MP3 / .WAV** y selecciona cualquier canción desde tu dispositivo.
3. Presiona el botón **▶️ RUN** para iniciar la transmisión de datos.
4. Interactúa con los controles deslizantes para alterar las frecuencias y distorsionar el audio en tiempo real.
5. Para detener el sistema, presiona **固 HALT**.

---

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la Licencia MIT. ¡Siéntete libre de hacerle un *fork*, experimentar y mejorar el código!
