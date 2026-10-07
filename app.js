const camera = document.getElementById('camera');
const fallback = document.getElementById('cameraFallback');
const reference = document.getElementById('referenceImage');
const imageInput = document.getElementById('imageInput');
const opacityRange = document.getElementById('opacityRange');
const zoomRange = document.getElementById('zoomRange');
const resetBtn = document.getElementById('resetBtn');
const flipBtn = document.getElementById('flipBtn');
const flashBtn = document.getElementById('flashBtn');
const cameraBtn = document.getElementById('cameraBtn');
const startCameraBtn = document.getElementById('startCameraBtn');
const statusText = document.getElementById('status');

let stream = null;
let track = null;
let x = 50;
let y = 50;
let zoom = 1;
let flipped = false;
let dragging = false;
let startX = 0;
let startY = 0;
let startPosX = 50;
let startPosY = 50;
let pinchStartDistance = 0;
let pinchStartZoom = 1;

async function startCamera() {
  try {
    if (stream) stream.getTracks().forEach(t => t.stop());

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });

    camera.srcObject = stream;
    track = stream.getVideoTracks()[0];
    fallback.classList.remove('visible');
    statusText.textContent = 'Cámara activa';
  } catch (error) {
    console.error(error);
    fallback.classList.add('visible');
    statusText.textContent = 'No se pudo acceder a la cámara';
  }
}

function applyTransform() {
  const flip = flipped ? -1 : 1;
  reference.style.left = `${x}%`;
  reference.style.top = `${y}%`;
  reference.style.transform = `translate(-50%, -50%) scale(${zoom * flip}, ${zoom})`;
  reference.style.opacity = opacityRange.value;
}

imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  reference.src = url;
  reference.style.display = 'block';
  resetPosition();
  statusText.textContent = 'Imagen cargada';
});

opacityRange.addEventListener('input', applyTransform);
zoomRange.addEventListener('input', () => {
  zoom = Number(zoomRange.value);
  applyTransform();
});

function resetPosition() {
  x = 50;
  y = 50;
  zoom = 1;
  flipped = false;
  zoomRange.value = 1;
  applyTransform();
}

resetBtn.addEventListener('click', resetPosition);

flipBtn.addEventListener('click', () => {
  flipped = !flipped;
  applyTransform();
});

async function toggleFlash() {
  if (!track) {
    statusText.textContent = 'Primero activa la cámara';
    return;
  }

  const capabilities = track.getCapabilities ? track.getCapabilities() : {};
  if (!capabilities.torch) {
    statusText.textContent = 'La luz no está disponible en este navegador';
    return;
  }

  const current = track.getSettings().torch === true;
  try {
    await track.applyConstraints({ advanced: [{ torch: !current }] });
    flashBtn.textContent = current ? '🔦 Luz' : '💡 Luz';
  } catch (e) {
    statusText.textContent = 'No se pudo cambiar la luz';
  }
}

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

reference.addEventListener('pointerdown', (e) => {
  reference.setPointerCapture(e.pointerId);
  dragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startPosX = x;
  startPosY = y;
});

reference.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = (e.clientX - startX) / window.innerWidth * 100;
  const dy = (e.clientY - startY) / window.innerHeight * 100;
  x = Math.max(-100, Math.min(200, startPosX + dx));
  y = Math.max(-100, Math.min(200, startPosY + dy));
  applyTransform();
});

reference.addEventListener('pointerup', () => dragging = false);
reference.addEventListener('pointercancel', () => dragging = false);

let touches = [];
reference.addEventListener('touchstart', (e) => {
  touches = [...e.touches];
  if (touches.length === 2) {
    pinchStartDistance = distance(touches[0], touches[1]);
    pinchStartZoom = zoom;
  }
}, {passive: false});

reference.addEventListener('touchmove', (e) => {
  if (e.touches.length !== 2) return;
  e.preventDefault();
  const d = distance(e.touches[0], e.touches[1]);
  zoom = Math.max(.25, Math.min(3, pinchStartZoom * (d / pinchStartDistance)));
  zoomRange.value = zoom;
  applyTransform();
}, {passive: false});

cameraBtn.addEventListener('click', startCamera);
startCameraBtn.addEventListener('click', startCamera);
flashBtn.addEventListener('click', toggleFlash);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));
}

if (navigator.mediaDevices?.getUserMedia) startCamera();
