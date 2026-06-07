const game = document.querySelector(".game");
const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");

const exitCount = document.querySelector("#exitCount");
const foundCount = document.querySelector("#foundCount");
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
  foundIds: new Set(),
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
  },
  {
    id: "left-sign-number",
    draw() {
      ctx.fillStyle = "#d7d1b6";
      ctx.font = "700 26px sans-serif";
      ctx.fillText("B1", 242, 218);
    }
  },
  {
    id: "narrow-center-door",
    draw() {
      ctx.fillStyle = "rgba(8, 8, 7, 0.72)";
      ctx.fillRect(616, 256, 52, 220);
      ctx.strokeStyle = "rgba(238, 231, 201, 0.18)";
      ctx.strokeRect(616, 256, 52, 220);
    }
  },
  {
    id: "orange-cable",
    draw() {
      ctx.strokeStyle = "#c26d32";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(160, 112);
      ctx.bezierCurveTo(326, 136, 396, 118, 520, 164);
      ctx.stroke();
    }
  },
  {
    id: "floor-drain",
    draw() {
      ctx.fillStyle = "rgba(12, 13, 12, 0.86)";
      ctx.beginPath();
      ctx.ellipse(694, 628, 34, 12, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(230, 222, 188, 0.2)";
      ctx.stroke();
      ctx.strokeStyle = "rgba(230, 222, 188, 0.28)";
      ctx.lineWidth = 1;
      for (let i = -2; i <= 2; i += 1) {
        ctx.beginPath();
        ctx.moveTo(672 + i * 9, 621);
        ctx.lineTo(680 + i * 9, 635);
        ctx.stroke();
      }
    }
  },
  {
    id: "missing-left-door",
    draw() {
      ctx.fillStyle = "#151a18";
      ctx.fillRect(208, 236, 94, 216);
    }
  },
  {
    id: "red-button",
    draw() {
      ctx.fillStyle = "#8c241e";
      ctx.beginPath();
      ctx.arc(812, 338, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 210, 190, 0.32)";
      ctx.stroke();
    }
  },
  {
    id: "ceiling-panel-open",
    draw() {
      ctx.fillStyle = "rgba(7, 7, 6, 0.82)";
      ctx.beginPath();
      ctx.moveTo(486, 78);
      ctx.lineTo(584, 62);
      ctx.lineTo(604, 112);
      ctx.lineTo(506, 128);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(236, 226, 188, 0.16)";
      ctx.stroke();
    }
  },
  {
    id: "right-poster-shift",
    draw() {
      ctx.save();
      ctx.translate(22, -12);
      drawPoster(986, 210, "#23241f");
      ctx.restore();
    }
  },
  {
    id: "handrail-low",
    draw() {
      ctx.strokeStyle = "rgba(216, 205, 166, 0.45)";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(926, 430);
      ctx.lineTo(1190, 462);
      ctx.stroke();
    }
  },
  {
    id: "small-floor-light",
    draw(t) {
      const glow = 0.18 + Math.sin(t / 220) * 0.08;
      ctx.fillStyle = `rgba(224, 198, 92, ${glow})`;
      ctx.beginPath();
      ctx.ellipse(808, 682, 58, 14, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "back-wall-stripe",
    draw() {
      ctx.fillStyle = "rgba(211, 173, 93, 0.32)";
      ctx.fillRect(442, 410, 398, 14);
      ctx.fillStyle = "rgba(10, 10, 8, 0.35)";
      for (let x = 456; x < 820; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, 410);
        ctx.lineTo(x + 16, 424);
        ctx.lineTo(x + 28, 424);
        ctx.lineTo(x + 12, 410);
        ctx.closePath();
        ctx.fill();
      }
    }
  },
  {
    id: "left-shadow-band",
    draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.moveTo(0, 520);
      ctx.lineTo(358, 472);
      ctx.lineTo(392, 510);
      ctx.lineTo(0, 620);
      ctx.closePath();
      ctx.fill();
    }
  }
];

updateFoundCount();

function startGame() {
  state.running = true;
  state.progress = 0;
  state.round = 0;
  state.lastIds = [];
  notice.classList.add("hidden");
  game.classList.remove("ok", "bad", "escaped");
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
  if (correct && state.current) {
    state.foundIds.add(state.current.id);
    updateFoundCount();
  }
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

function updateFoundCount() {
  foundCount.textContent = `発見 ${state.foundIds.size} / ${anomalies.length}`;
}

function win() {
  state.running = false;
  state.canJudge = false;
  setButtons(false);
  phaseLabel.textContent = "脱出";
  exitCount.textContent = `${WIN_TARGET} / ${WIN_TARGET}`;
  game.classList.add("escaped");
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

  const flicker = 0.91 + Math.sin(t / 700) * 0.018;
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
  drawSurfaceWear(t);

  if (state.current) state.current.draw(t);

  const haze = ctx.createLinearGradient(0, 0, 0, 720);
  haze.addColorStop(0, "rgba(0, 0, 0, 0.1)");
  haze.addColorStop(0.5, "rgba(0, 0, 0, 0.025)");
  haze.addColorStop(1, "rgba(0, 0, 0, 0.2)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, 1280, 720);

  if (state.flashUntil > t) {
    const color = state.flashClass === "ok" ? "215, 173, 95" : "169, 95, 72";
    ctx.fillStyle = `rgba(${color}, 0.07)`;
    ctx.fillRect(0, 0, 1280, 720);
  } else if (state.flashClass) {
    state.flashClass = "";
    game.classList.remove("ok", "bad");
  }

  ctx.restore();
}

function drawBase() {
  const backWall = ctx.createLinearGradient(440, 160, 840, 560);
  backWall.addColorStop(0, "#5b614f");
  backWall.addColorStop(0.5, "#817961");
  backWall.addColorStop(1, "#34372d");
  fillPoly([
    [440, 160],
    [840, 160],
    [840, 560],
    [440, 560]
  ], backWall);

  const leftWall = ctx.createLinearGradient(0, 0, 440, 560);
  leftWall.addColorStop(0, "#0b1110");
  leftWall.addColorStop(0.52, "#222d28");
  leftWall.addColorStop(1, "#0d1110");
  fillPoly([
    [0, 0],
    [440, 160],
    [440, 560],
    [0, 720]
  ], leftWall);

  const rightWall = ctx.createLinearGradient(1280, 0, 840, 560);
  rightWall.addColorStop(0, "#0b100f");
  rightWall.addColorStop(0.5, "#2a2f28");
  rightWall.addColorStop(1, "#0e1110");
  fillPoly([
    [1280, 0],
    [840, 160],
    [840, 560],
    [1280, 720]
  ], rightWall);

  const floor = ctx.createLinearGradient(0, 560, 0, 720);
  floor.addColorStop(0, "#373728");
  floor.addColorStop(0.52, "#22251d");
  floor.addColorStop(1, "#0d0f0d");
  fillPoly([
    [440, 560],
    [840, 560],
    [1280, 720],
    [0, 720]
  ], floor);

  const ceiling = ctx.createLinearGradient(0, 0, 0, 160);
  ceiling.addColorStop(0, "#111716");
  ceiling.addColorStop(0.58, "#292f28");
  ceiling.addColorStop(1, "#3d3b2d");
  fillPoly([
    [440, 160],
    [840, 160],
    [1280, 0],
    [0, 0]
  ], ceiling);

  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.fillRect(438, 158, 6, 406);
  ctx.fillRect(838, 158, 6, 406);
  ctx.fillStyle = "rgba(120, 196, 189, 0.04)";
  ctx.fillRect(448, 172, 384, 28);
}

function fillPoly(points, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
}

function drawWallTiles() {
  ctx.strokeStyle = "rgba(238, 231, 201, 0.055)";
  ctx.lineWidth = 1;

  for (let y = 214; y <= 500; y += 72) {
    ctx.beginPath();
    ctx.moveTo(440, y);
    ctx.lineTo(840, y);
    ctx.stroke();
  }

  for (let x = 510; x <= 770; x += 130) {
    ctx.beginPath();
    ctx.moveTo(x, 160);
    ctx.lineTo(x, 560);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 247, 213, 0.026)";
  ctx.fillRect(458, 184, 364, 30);
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  ctx.fillRect(452, 514, 376, 22);

  ctx.strokeStyle = "rgba(236, 226, 188, 0.038)";
  for (let i = 0; i < 5; i += 1) {
    const y1 = 180 + i * 78;
    ctx.beginPath();
    ctx.moveTo(86 + i * 22, 80 + i * 78);
    ctx.lineTo(434, y1);
    ctx.moveTo(1194 - i * 22, 80 + i * 78);
    ctx.lineTo(846, y1);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(236, 226, 188, 0.09)";
  for (const [x, y] of [[474, 210], [806, 210], [474, 356], [806, 356], [474, 504], [806, 504]]) {
    ctx.beginPath();
    ctx.arc(x, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTiles() {
  ctx.strokeStyle = "rgba(244, 239, 216, 0.105)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i += 1) {
    const y = 560 + i * 24;
    ctx.beginPath();
    ctx.moveTo(440 - i * 78, y);
    ctx.lineTo(840 + i * 78, y);
    ctx.stroke();
  }
  for (let i = -5; i <= 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(640 + i * 58, 560);
    ctx.lineTo(640 + i * 124, 720);
    ctx.stroke();
  }

  const reflection = ctx.createRadialGradient(640, 610, 18, 640, 660, 360);
  reflection.addColorStop(0, "rgba(231, 216, 171, 0.1)");
  reflection.addColorStop(0.45, "rgba(120, 196, 189, 0.035)");
  reflection.addColorStop(1, "rgba(255, 250, 220, 0)");
  ctx.fillStyle = reflection;
  ctx.beginPath();
  ctx.ellipse(640, 646, 360, 62, 0.02, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.moveTo(0, 720);
  ctx.lineTo(280, 678);
  ctx.lineTo(1000, 678);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fill();
}

function drawLights(flicker) {
  for (const [x, y, w, depth] of [[542, 32, 196, 1], [574, 104, 132, 0.72], [606, 154, 70, 0.48]]) {
    ctx.fillStyle = `rgba(17, 18, 15, ${0.7 * depth})`;
    roundRect(x - 12, y - 6, w + 24, 24, 4);
    ctx.fill();
    ctx.strokeStyle = `rgba(238, 231, 201, ${0.16 * depth})`;
    ctx.stroke();
    ctx.fillStyle = `rgba(246, 241, 202, ${0.82 * flicker})`;
    roundRect(x, y, w, 12, 3);
    ctx.fill();
    const glow = ctx.createRadialGradient(x + w / 2, y + 8, 10, x + w / 2, y + 8, 210);
    glow.addColorStop(0, `rgba(246, 241, 202, ${0.18 * flicker * depth})`);
    glow.addColorStop(1, "rgba(246, 241, 202, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 220, y, w + 440, 300);
  }
}

function drawPipes() {
  ctx.strokeStyle = "rgba(186, 177, 142, 0.24)";
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

  ctx.strokeStyle = "rgba(120, 124, 112, 0.22)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(90, 236);
  ctx.lineTo(404, 278);
  ctx.moveTo(890, 276);
  ctx.lineTo(1204, 232);
  ctx.stroke();

  ctx.fillStyle = "rgba(224, 214, 174, 0.12)";
  for (const [x, y, rot] of [[214, 164, 0.12], [332, 178, 0.12], [944, 178, -0.12], [1062, 164, -0.12]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillRect(-3, -15, 6, 30);
    ctx.restore();
  }
}

function drawFixtures() {
  ctx.fillStyle = "rgba(18, 18, 14, 0.72)";
  ctx.fillRect(435, 156, 18, 410);
  ctx.fillRect(827, 156, 18, 410);
  ctx.fillStyle = "rgba(236, 226, 188, 0.08)";
  ctx.fillRect(453, 170, 8, 382);
  ctx.fillRect(819, 170, 8, 382);

  drawServiceDoor(212, 240, 86, 204, false);
  drawServiceDoor(1004, 238, 86, 210, true);
  drawPoster(986, 210, "#23241f");

  ctx.fillStyle = "#d2c97b";
  ctx.beginPath();
  ctx.arc(278, 348, 6, 0, Math.PI * 2);
  ctx.arc(1020, 350, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d7d1b6";
  ctx.font = "700 32px sans-serif";
  ctx.fillText("B2", 469, 318);
}

function drawServiceDoor(x, y, w, h, rightSide) {
  const door = ctx.createLinearGradient(x, y, x + w, y + h);
  door.addColorStop(0, "#171d1b");
  door.addColorStop(0.48, "#2a302a");
  door.addColorStop(1, "#101312");
  ctx.fillStyle = door;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(244, 239, 216, 0.22)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = "rgba(244, 239, 216, 0.1)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 12, y + 18, w - 24, h - 36);
  ctx.fillStyle = "#d2c97b";
  ctx.beginPath();
  ctx.arc(x + (rightSide ? 18 : w - 20), y + h * 0.54, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPoster(x, y, color, missingLines = false) {
  ctx.fillStyle = color;
  roundRect(x, y, 92, 136, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(244, 239, 216, 0.16)";
  ctx.stroke();
  ctx.fillStyle = "#d6d1b8";
  ctx.fillRect(x + 14, y + 22, 64, 12);
  if (!missingLines) {
    ctx.fillRect(x + 14, y + 48, 50, 7);
    ctx.fillRect(x + 14, y + 64, 56, 7);
  }
}

function drawExitSign(reverse) {
  const sign = ctx.createLinearGradient(518, 151, 762, 193);
  sign.addColorStop(0, "#14372f");
  sign.addColorStop(1, "#1a5b47");
  ctx.fillStyle = sign;
  roundRect(518, 151, 244, 42, 5);
  ctx.fill();
  ctx.strokeStyle = "rgba(173, 235, 211, 0.22)";
  ctx.stroke();
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
  ctx.strokeStyle = "rgba(0, 0, 0, 0.32)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(104, 418);
  ctx.lineTo(354, 394);
  ctx.moveTo(926, 398);
  ctx.lineTo(1190, 428);
  ctx.stroke();

  ctx.strokeStyle = "rgba(207, 196, 157, 0.38)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(104, 410);
  ctx.lineTo(354, 386);
  ctx.moveTo(926, 390);
  ctx.lineTo(1190, 420);
  ctx.stroke();

  ctx.strokeStyle = "rgba(207, 196, 157, 0.18)";
  ctx.lineWidth = 3;
  for (const [x, y, side] of [[164, 404, -1], [284, 392, -1], [982, 398, 1], [1106, 412, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + side * 16, y + 34);
    ctx.stroke();
  }
}

function drawSurfaceWear(t) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.055)";
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 97) % 1280;
    const y = 190 + ((i * 53) % 420);
    const w = 18 + ((i * 11) % 38);
    const h = 2 + (i % 4);
    ctx.fillRect(x, y, w, h);
  }

  ctx.strokeStyle = "rgba(255, 247, 210, 0.032)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const y = 568 + i * 13;
    ctx.beginPath();
    ctx.moveTo(430 - i * 42, y + Math.sin(t / 800 + i) * 2);
    ctx.lineTo(850 + i * 42, y + Math.cos(t / 900 + i) * 2);
    ctx.stroke();
  }

  const depthFog = ctx.createRadialGradient(640, 280, 40, 640, 320, 420);
  depthFog.addColorStop(0, "rgba(224, 210, 168, 0.07)");
  depthFog.addColorStop(0.4, "rgba(120, 196, 189, 0.035)");
  depthFog.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = depthFog;
  ctx.fillRect(280, 80, 720, 500);
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
