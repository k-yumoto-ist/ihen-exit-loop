const game = document.querySelector(".game");
const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");

const exitCount = document.querySelector("#exitCount");
const phaseLabel = document.querySelector("#phaseLabel");
const notice = document.querySelector("#notice");
const startButton = document.querySelector("#startButton");
const backButton = document.querySelector("#backButton");
const forwardButton = document.querySelector("#forwardButton");
const scanBar = document.querySelector("#scanBar");

const OBSERVE_MS = 1800;
const WIN_TARGET = 8;

const state = {
  running: false,
  progress: 0,
  round: 0,
  current: null,
  canJudge: false,
  phaseStarted: 0,
  lastIds: [],
  flashUntil: 0,
  flashClass: "",
  mouse: { x: 640, y: 360 }
};

const anomalies = [
  {
    id: "poster-red",
    draw(t) {
      drawPoster(986, 210, "#4b1714");
      ctx.globalAlpha = 0.34 + Math.sin(t / 260) * 0.08;
      ctx.fillStyle = "#dd5140";
      ctx.fillRect(986, 210, 92, 136);
      ctx.globalAlpha = 1;
    }
  },
  {
    id: "far-light",
    draw(t) {
      if (Math.sin(t / 84) > -0.3) return;
      ctx.fillStyle = "rgba(4, 5, 4, 0.7)";
      ctx.fillRect(526, 76, 228, 62);
    }
  },
  {
    id: "raised-tile",
    draw() {
      ctx.fillStyle = "#363225";
      ctx.beginPath();
      ctx.moveTo(704, 528);
      ctx.lineTo(812, 506);
      ctx.lineTo(878, 596);
      ctx.lineTo(758, 630);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(244, 239, 216, 0.4)";
      ctx.stroke();
    }
  },
  {
    id: "reverse-sign",
    draw() {
      drawExitSign(true);
    }
  },
  {
    id: "shadow",
    draw(t) {
      const sway = Math.sin(t / 440) * 4;
      ctx.fillStyle = "rgba(4, 4, 3, 0.94)";
      ctx.beginPath();
      ctx.ellipse(647 + sway, 241, 15, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(634 + sway, 262, 26, 78);
    }
  },
  {
    id: "open-door",
    draw() {
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.moveTo(232, 249);
      ctx.lineTo(316, 224);
      ctx.lineTo(320, 474);
      ctx.lineTo(238, 431);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(244, 239, 216, 0.24)";
      ctx.stroke();
    }
  },
  {
    id: "missing-rail",
    draw() {
      ctx.fillStyle = "#1d1c18";
      ctx.fillRect(1020, 405, 168, 24);
    }
  },
  {
    id: "wrong-clock",
    draw() {
      drawClock(380, 190, true);
    }
  },
  {
    id: "wet-floor",
    draw(t) {
      const shimmer = 0.2 + Math.sin(t / 300) * 0.06;
      ctx.fillStyle = `rgba(142, 174, 178, ${shimmer})`;
      ctx.beginPath();
      ctx.ellipse(568, 636, 138, 24, -0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(205, 230, 224, 0.26)";
      ctx.stroke();
    }
  },
  {
    id: "camera",
    draw() {
      ctx.fillStyle = "#22231f";
      ctx.fillRect(606, 116, 38, 20);
      ctx.fillStyle = "#080808";
      ctx.beginPath();
      ctx.arc(625, 146, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#bf2d24";
      ctx.beginPath();
      ctx.arc(625, 146, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "left-pipe-leak",
    draw(t) {
      ctx.strokeStyle = "rgba(140, 180, 174, 0.48)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(190, 164);
      ctx.lineTo(190, 326 + Math.sin(t / 180) * 8);
      ctx.stroke();
      ctx.fillStyle = "rgba(160, 210, 204, 0.42)";
      ctx.beginPath();
      ctx.arc(190, 338 + Math.sin(t / 140) * 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "extra-exit-light",
    draw() {
      ctx.fillStyle = "#1f6c4f";
      ctx.fillRect(690, 206, 52, 22);
      ctx.fillStyle = "#ccebd8";
      ctx.font = "700 12px sans-serif";
      ctx.fillText("EXIT", 700, 222);
    }
  },
  {
    id: "wall-crack",
    draw() {
      ctx.strokeStyle = "rgba(24, 22, 18, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(910, 192);
      ctx.lineTo(934, 234);
      ctx.lineTo(922, 270);
      ctx.lineTo(954, 320);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(934, 234);
      ctx.lineTo(970, 218);
      ctx.moveTo(922, 270);
      ctx.lineTo(892, 292);
      ctx.stroke();
    }
  },
  {
    id: "floor-arrow",
    draw() {
      ctx.fillStyle = "rgba(211, 173, 93, 0.26)";
      ctx.beginPath();
      ctx.moveTo(600, 610);
      ctx.lineTo(680, 610);
      ctx.lineTo(680, 586);
      ctx.lineTo(742, 634);
      ctx.lineTo(680, 682);
      ctx.lineTo(680, 654);
      ctx.lineTo(600, 654);
      ctx.closePath();
      ctx.fill();
    }
  },
  {
    id: "missing-poster-lines",
    draw() {
      drawPoster(986, 210, "#23241f", true);
    }
  },
  {
    id: "double-clock",
    draw() {
      drawClock(450, 192, false);
    }
  },
  {
    id: "right-door-handle",
    draw() {
      ctx.fillStyle = "#d9c96c";
      ctx.beginPath();
      ctx.arc(1070, 350, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 245, 170, 0.35)";
      ctx.stroke();
    }
  },
  {
    id: "ceiling-stain",
    draw() {
      ctx.fillStyle = "rgba(30, 28, 22, 0.55)";
      ctx.beginPath();
      ctx.ellipse(748, 92, 92, 22, -0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "tile-dark-line",
    draw() {
      ctx.strokeStyle = "rgba(10, 10, 8, 0.72)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(482, 585);
      ctx.lineTo(808, 703);
      ctx.stroke();
    }
  }
];

function startGame() {
  state.running = true;
  state.progress = 0;
  state.round = 0;
  state.lastIds = [];
  notice.classList.add("hidden");
  game.classList.remove("ok", "bad");
  nextRound();
}

function nextRound() {
  state.round += 1;
  state.current = pickAnomaly();
  state.phaseStarted = performance.now();
  state.canJudge = false;
  phaseLabel.textContent = "観察中";
  exitCount.textContent = `${state.progress} / ${WIN_TARGET}`;
  scanBar.style.width = "0%";
  setButtons(false);
}

function pickAnomaly() {
  const emptyChance = state.round <= 2 ? 0.54 : 0.36;
  if (Math.random() < emptyChance) return null;

  const choices = anomalies.filter((item) => !state.lastIds.includes(item.id));
  const selected = choices[Math.floor(Math.random() * choices.length)] || anomalies[0];
  state.lastIds = [selected.id, ...state.lastIds].slice(0, 3);
  return selected;
}

function setButtons(enabled) {
  backButton.disabled = !enabled;
  forwardButton.disabled = !enabled;
}

function updateObserve(t) {
  if (!state.running || state.canJudge) return;

  const ratio = Math.min(1, (t - state.phaseStarted) / OBSERVE_MS);
  scanBar.style.width = `${Math.round(ratio * 100)}%`;

  if (ratio >= 1) {
    state.canJudge = true;
    phaseLabel.textContent = "判定";
    setButtons(true);
  }
}

function choose(turnBack) {
  if (!state.running || !state.canJudge) return;

  const correct = Boolean(state.current) === turnBack;
  state.progress = correct ? state.progress + 1 : 0;
  state.flashUntil = performance.now() + 540;
  state.flashClass = correct ? "ok" : "bad";
  game.classList.remove("ok", "bad");
  game.classList.add(state.flashClass);

  if (state.progress >= WIN_TARGET) {
    win();
    return;
  }

  phaseLabel.textContent = correct ? "正解" : "リセット";
  window.setTimeout(() => {
    if (state.running) nextRound();
  }, 620);
}

function win() {
  state.running = false;
  state.canJudge = false;
  setButtons(false);
  phaseLabel.textContent = "脱出";
  exitCount.textContent = `${WIN_TARGET} / ${WIN_TARGET}`;
  notice.querySelector("h1").textContent = "出口に到達";
  notice.querySelector("p").textContent = "8区画を抜けました。もう一度遊ぶと配置は変わります。";
  startButton.textContent = "再開";
  notice.classList.remove("hidden");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

function mapCanvas() {
  const rect = canvas.getBoundingClientRect();
  const sx = rect.width / 1280;
  const sy = rect.height / 720;
  ctx.scale(sx, sy);
}

function drawCorridor(t) {
  updateObserve(t);

  const flicker = 0.88 + Math.sin(t / 150) * 0.018 + Math.sin(t / 540) * 0.035;
  const driftX = (state.mouse.x - 640) * 0.006;
  const driftY = (state.mouse.y - 360) * 0.005;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  mapCanvas();
  ctx.translate(640, 360);
  ctx.translate(-640 - driftX, -360 - driftY);

  drawBase();
  drawWallTiles();
  drawTiles();
  drawLights(flicker);
  drawPipes();
  drawFixtures();
  drawExitSign(false);
  drawClock(380, 190, false);
  drawHandrails();

  if (state.current) state.current.draw(t);

  const haze = ctx.createLinearGradient(0, 0, 0, 720);
  haze.addColorStop(0, "rgba(0, 0, 0, 0.15)");
  haze.addColorStop(0.5, "rgba(0, 0, 0, 0.04)");
  haze.addColorStop(1, "rgba(0, 0, 0, 0.26)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, 1280, 720);

  if (state.flashUntil > t) {
    const color = state.flashClass === "ok" ? "129, 185, 169" : "211, 106, 88";
    ctx.fillStyle = `rgba(${color}, 0.08)`;
    ctx.fillRect(0, 0, 1280, 720);
  } else if (state.flashClass) {
    state.flashClass = "";
    game.classList.remove("ok", "bad");
  }

  ctx.restore();
}

function drawBase() {
  const wall = ctx.createLinearGradient(0, 0, 1280, 720);
  wall.addColorStop(0, "#171d1b");
  wall.addColorStop(0.5, "#807b68");
  wall.addColorStop(1, "#151918");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.fillStyle = "#151a18";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(440, 160);
  ctx.lineTo(440, 560);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1a1a17";
  ctx.beginPath();
  ctx.moveTo(1280, 0);
  ctx.lineTo(840, 160);
  ctx.lineTo(840, 560);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#585440";
  ctx.beginPath();
  ctx.moveTo(440, 160);
  ctx.lineTo(840, 160);
  ctx.lineTo(840, 560);
  ctx.lineTo(440, 560);
  ctx.closePath();
  ctx.fill();

  const floor = ctx.createLinearGradient(0, 560, 0, 720);
  floor.addColorStop(0, "#2f2d24");
  floor.addColorStop(1, "#171712");
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(440, 560);
  ctx.lineTo(840, 560);
  ctx.lineTo(1280, 720);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();

  const ceiling = ctx.createLinearGradient(0, 0, 0, 160);
  ceiling.addColorStop(0, "#24251f");
  ceiling.addColorStop(1, "#343227");
  ctx.fillStyle = ceiling;
  ctx.beginPath();
  ctx.moveTo(440, 160);
  ctx.lineTo(840, 160);
  ctx.lineTo(1280, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
}

function drawWallTiles() {
  ctx.strokeStyle = "rgba(238, 231, 201, 0.08)";
  ctx.lineWidth = 1;

  for (let y = 198; y <= 510; y += 52) {
    ctx.beginPath();
    ctx.moveTo(440, y);
    ctx.lineTo(840, y);
    ctx.stroke();
  }

  for (let x = 480; x <= 800; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 160);
    ctx.lineTo(x, 560);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 247, 213, 0.035)";
  ctx.fillRect(450, 176, 380, 26);
  ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
  ctx.fillRect(450, 520, 380, 18);
}

function drawTiles() {
  ctx.strokeStyle = "rgba(244, 239, 216, 0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 11; i += 1) {
    const y = 560 + i * 18;
    ctx.beginPath();
    ctx.moveTo(440 - i * 48, y);
    ctx.lineTo(840 + i * 48, y);
    ctx.stroke();
  }
  for (let i = -6; i <= 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(640 + i * 46, 560);
    ctx.lineTo(640 + i * 96, 720);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 250, 220, 0.055)";
  ctx.beginPath();
  ctx.ellipse(640, 622, 240, 32, 0.02, 0, Math.PI * 2);
  ctx.fill();
}

function drawLights(flicker) {
  for (const [x, y, w] of [[565, 32, 150], [585, 104, 110], [604, 154, 72]]) {
    ctx.fillStyle = `rgba(246, 241, 202, ${0.82 * flicker})`;
    ctx.fillRect(x, y, w, 12);
    const glow = ctx.createRadialGradient(x + w / 2, y + 8, 10, x + w / 2, y + 8, 210);
    glow.addColorStop(0, `rgba(246, 241, 202, ${0.17 * flicker})`);
    glow.addColorStop(1, "rgba(246, 241, 202, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 180, y, w + 360, 250);
  }
}

function drawPipes() {
  ctx.strokeStyle = "rgba(194, 184, 146, 0.28)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(116, 152);
  ctx.lineTo(430, 190);
  ctx.moveTo(860, 188);
  ctx.lineTo(1180, 148);
  ctx.stroke();

  ctx.strokeStyle = "rgba(30, 30, 25, 0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(116, 158);
  ctx.lineTo(430, 196);
  ctx.moveTo(860, 194);
  ctx.lineTo(1180, 154);
  ctx.stroke();
}

function drawFixtures() {
  ctx.strokeStyle = "rgba(244, 239, 216, 0.22)";
  ctx.lineWidth = 3;
  ctx.strokeRect(212, 240, 86, 204);
  ctx.strokeRect(1004, 238, 86, 210);

  drawPoster(986, 210, "#23241f");

  ctx.fillStyle = "rgba(18, 18, 14, 0.72)";
  ctx.fillRect(435, 156, 18, 410);
  ctx.fillRect(827, 156, 18, 410);
  ctx.fillStyle = "rgba(236, 226, 188, 0.08)";
  ctx.fillRect(453, 170, 8, 382);
  ctx.fillRect(819, 170, 8, 382);

  ctx.fillStyle = "#d2c97b";
  ctx.beginPath();
  ctx.arc(278, 348, 6, 0, Math.PI * 2);
  ctx.arc(1020, 350, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d7d1b6";
  ctx.font = "700 32px sans-serif";
  ctx.fillText("B2", 469, 318);
}

function drawPoster(x, y, color, missingLines = false) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 92, 136);
  ctx.strokeStyle = "rgba(244, 239, 216, 0.16)";
  ctx.strokeRect(x, y, 92, 136);
  ctx.fillStyle = "#d6d1b8";
  ctx.fillRect(x + 14, y + 22, 64, 12);
  if (!missingLines) {
    ctx.fillRect(x + 14, y + 48, 50, 7);
    ctx.fillRect(x + 14, y + 64, 56, 7);
  }
}

function drawExitSign(reverse) {
  ctx.fillStyle = "#15352e";
  ctx.fillRect(518, 151, 244, 42);
  ctx.fillStyle = "#dceee6";
  ctx.font = "700 24px sans-serif";
  ctx.fillText("EXIT", 556, 181);
  ctx.beginPath();
  if (reverse) {
    ctx.moveTo(716, 172);
    ctx.lineTo(682, 154);
    ctx.lineTo(682, 166);
    ctx.lineTo(642, 166);
    ctx.lineTo(642, 178);
    ctx.lineTo(682, 178);
    ctx.lineTo(682, 190);
  } else {
    ctx.moveTo(656, 172);
    ctx.lineTo(690, 154);
    ctx.lineTo(690, 166);
    ctx.lineTo(730, 166);
    ctx.lineTo(730, 178);
    ctx.lineTo(690, 178);
    ctx.lineTo(690, 190);
  }
  ctx.closePath();
  ctx.fill();
}

function drawClock(x, y, wrong) {
  ctx.fillStyle = "#ded8bd";
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#353327";
  ctx.stroke();
  ctx.strokeStyle = "#1b1b16";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + (wrong ? 0 : 13), y + (wrong ? 18 : -11));
  ctx.moveTo(x, y);
  ctx.lineTo(x + (wrong ? 0 : -8), y + (wrong ? 18 : 6));
  ctx.stroke();
}

function drawHandrails() {
  ctx.strokeStyle = "rgba(216, 205, 166, 0.4)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(104, 410);
  ctx.lineTo(354, 386);
  ctx.moveTo(926, 390);
  ctx.lineTo(1190, 420);
  ctx.stroke();
}

function loop(t) {
  drawCorridor(t);
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", startGame);
backButton.addEventListener("click", () => choose(true));
forwardButton.addEventListener("click", () => choose(false));

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  state.mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
  state.mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
});

window.addEventListener("keydown", (event) => {
  if (event.key === "a" || event.key === "A" || event.key === "ArrowLeft") choose(true);
  if (event.key === "d" || event.key === "D" || event.key === "ArrowRight") choose(false);
  if (event.code === "Space") {
    event.preventDefault();
    if (!state.running) startGame();
  }
  if (!state.running && event.key === "Enter") startGame();
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(loop);
