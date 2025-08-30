const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const drawCanvas = document.createElement("canvas");
const drawCtx = drawCanvas.getContext("2d");

canvas.width = drawCanvas.width = window.innerWidth;
canvas.height = drawCanvas.height = window.innerHeight;

let drawing = false;
let prevX = 0, prevY = 0;
let erasing = false;

const colors = ["black", "red", "green", "blue"];
let colorIndex = 0;
let brushColor = colors[colorIndex];

// Helper: count how many fingers are up
function countFingers(landmarks) {
  const tips = [8, 12, 16, 20]; // index, middle, ring, pinky
  let count = 0;
  for (let i = 0; i < tips.length; i++) {
    const tip = landmarks[tips[i]];
    const dip = landmarks[tips[i] - 2];
    if (tip.y < dip.y) count++; // finger is up
  }
  return count;
}

let lastGestureTime = 0;

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.8,
  minTrackingConfidence: 0.8,
});

hands.onResults((results) => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(drawCanvas, 0, 0);

  const now = Date.now();

  if (results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];
    const index = landmarks[8];
    const x = index.x * canvas.width;
    const y = index.y * canvas.height;

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = erasing ? "white" : brushColor;
    ctx.fill();

    const fingersUp = countFingers(landmarks);
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const isFist = fingersUp === 0 && (Math.abs(thumbTip.x - thumbIP.x) < 0.05);

    // Change color if two fingers are up
    if (fingersUp === 2 && now - lastGestureTime > 1000) {
      colorIndex = (colorIndex + 1) % colors.length;
      brushColor = colors[colorIndex];
      erasing = false;
      lastGestureTime = now;
    }

    // Fist = eraser
    if (isFist && now - lastGestureTime > 1000) {
      erasing = true;
      lastGestureTime = now;
    }

    if (!drawing) {
      prevX = x;
      prevY = y;
      drawing = true;
    }

    drawCtx.strokeStyle = erasing ? "white" : brushColor;
    drawCtx.lineWidth = erasing ? 30 : 5;
    drawCtx.lineCap = "round";
    drawCtx.beginPath();
    drawCtx.moveTo(prevX, prevY);
    drawCtx.lineTo(x, y);
    drawCtx.stroke();

    prevX = x;
    prevY = y;
  } else {
    drawing = false;
  }
});

const camera = new Camera(video, {
  onFrame: async () => {
    await hands.send({ image: video });
  },
  width: 640,
  height: 480,
});
camera.start();
