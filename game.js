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
      const door = ctx.createLinearGradient(614, 252, 668, 488);
      door.addColorStop(0, "rgba(8, 12, 11, 0.84)");
      door.addColorStop(0.55, "rgba(13, 18, 16, 0.92)");
      door.addColorStop(1, "rgba(5, 7, 6, 0.86)");
      ctx.fillStyle = door;
      roundRect(614, 252, 54, 236, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(236, 226, 188, 0.22)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "rgba(123, 164, 154, 0.18)";
      roundRect(629, 286, 23, 114, 6);
      ctx.fill();
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

  const flicker = 0.92 + Math.sin(t / 860) * 0.012;
  const driftX = (state.mouse.x - 640) * 0.004;
  const driftY = (state.mouse.y - 360) * 0.0035;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  mapCanvas();
  ctx.translate(640, 360);
  ctx.translate(-640 - driftX, -360 - driftY);

  drawBase();
  drawLights(flicker);
  drawWallTiles();
  drawTiles();
  drawPipes();
  drawFixtures();
  drawExitSign(false);
  drawClock(380, 190, false);
  drawHandrails();
  drawSurfaceWear(t);

  if (state.current) state.current.draw(t);

  drawFinalGrade();

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
  const room = ctx.createLinearGradient(0, 0, 0, 720);
  room.addColorStop(0, "#050a09");
  room.addColorStop(0.32, "#1a2824");
  room.addColorStop(0.66, "#171b16");
  room.addColorStop(1, "#050605");
  ctx.fillStyle = room;
  ctx.fillRect(0, 0, 1280, 720);

  const backWall = ctx.createLinearGradient(440, 160, 840, 560);
  backWall.addColorStop(0, "#3a473d");
  backWall.addColorStop(0.42, "#7a765f");
  backWall.addColorStop(0.72, "#4a4d3f");
  backWall.addColorStop(1, "#242a25");
  fillPoly([
    [456, 174],
    [824, 174],
    [812, 548],
    [468, 548]
  ], backWall);

  const leftWall = ctx.createLinearGradient(0, 0, 440, 560);
  leftWall.addColorStop(0, "#050908");
  leftWall.addColorStop(0.34, "#152720");
  leftWall.addColorStop(0.62, "#243029");
  leftWall.addColorStop(1, "#070908");
  fillPoly([
    [0, 0],
    [456, 174],
    [468, 548],
    [0, 720]
  ], leftWall);

  const rightWall = ctx.createLinearGradient(1280, 0, 840, 560);
  rightWall.addColorStop(0, "#050908");
  rightWall.addColorStop(0.36, "#1d2923");
  rightWall.addColorStop(0.62, "#363428");
  rightWall.addColorStop(1, "#070908");
  fillPoly([
    [1280, 0],
    [824, 174],
    [812, 548],
    [1280, 720]
  ], rightWall);

  const floor = ctx.createLinearGradient(0, 560, 0, 720);
  floor.addColorStop(0, "#34362a");
  floor.addColorStop(0.48, "#222820");
  floor.addColorStop(0.78, "#11140f");
  floor.addColorStop(1, "#050605");
  fillPoly([
    [468, 548],
    [812, 548],
    [1280, 720],
    [0, 720]
  ], floor);

  const ceiling = ctx.createLinearGradient(0, 0, 0, 160);
  ceiling.addColorStop(0, "#050908");
  ceiling.addColorStop(0.52, "#18211e");
  ceiling.addColorStop(1, "#393629");
  fillPoly([
    [456, 174],
    [824, 174],
    [1280, 0],
    [0, 0]
  ], ceiling);

  const wallBloom = ctx.createRadialGradient(640, 286, 24, 640, 324, 330);
  wallBloom.addColorStop(0, "rgba(240, 222, 168, 0.16)");
  wallBloom.addColorStop(0.44, "rgba(120, 198, 189, 0.052)");
  wallBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = wallBloom;
  ctx.fillRect(340, 90, 600, 500);

  const floorPool = ctx.createRadialGradient(640, 548, 24, 640, 640, 500);
  floorPool.addColorStop(0, "rgba(236, 211, 151, 0.2)");
  floorPool.addColorStop(0.34, "rgba(179, 156, 100, 0.09)");
  floorPool.addColorStop(0.76, "rgba(63, 100, 91, 0.035)");
  floorPool.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = floorPool;
  ctx.beginPath();
  ctx.ellipse(640, 640, 500, 98, 0, 0, Math.PI * 2);
  ctx.fill();

  const endGlow = ctx.createRadialGradient(640, 332, 18, 640, 360, 250);
  endGlow.addColorStop(0, "rgba(120, 198, 189, 0.12)");
  endGlow.addColorStop(0.42, "rgba(221, 177, 96, 0.055)");
  endGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = endGlow;
  ctx.fillRect(390, 160, 500, 430);

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  roundRect(562, 222, 156, 326, 16);
  ctx.fill();

  const endDoor = ctx.createLinearGradient(570, 226, 710, 544);
  endDoor.addColorStop(0, "#2d3a34");
  endDoor.addColorStop(0.46, "#414a3f");
  endDoor.addColorStop(1, "#181f1b");
  ctx.fillStyle = endDoor;
  roundRect(572, 224, 136, 320, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(231, 211, 160, 0.18)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const doorHighlight = ctx.createLinearGradient(584, 236, 668, 526);
  doorHighlight.addColorStop(0, "rgba(255, 244, 199, 0.12)");
  doorHighlight.addColorStop(0.46, "rgba(255, 244, 199, 0.035)");
  doorHighlight.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = doorHighlight;
  roundRect(584, 238, 92, 286, 10);
  ctx.fill();

  const glass = ctx.createLinearGradient(620, 258, 660, 424);
  glass.addColorStop(0, "rgba(156, 203, 193, 0.28)");
  glass.addColorStop(0.5, "rgba(38, 59, 54, 0.36)");
  glass.addColorStop(1, "rgba(6, 9, 8, 0.46)");
  ctx.fillStyle = glass;
  roundRect(622, 260, 36, 156, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(203, 232, 221, 0.16)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 244, 199, 0.08)";
  ctx.fillRect(628, 270, 5, 132);

  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.fillRect(452, 172, 16, 382);
  ctx.fillRect(812, 172, 16, 382);
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
  const upperSoft = ctx.createLinearGradient(480, 196, 802, 270);
  upperSoft.addColorStop(0, "rgba(255, 245, 204, 0.055)");
  upperSoft.addColorStop(1, "rgba(0, 0, 0, 0.02)");
  ctx.fillStyle = upperSoft;
  roundRect(478, 196, 324, 78, 10);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  roundRect(482, 472, 316, 58, 10);
  ctx.fill();

  ctx.strokeStyle = "rgba(231, 211, 160, 0.055)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(492, 316);
  ctx.lineTo(788, 316);
  ctx.stroke();

  const leftBand = ctx.createLinearGradient(454, 178, 96, 52);
  leftBand.addColorStop(0, "rgba(238, 218, 164, 0.07)");
  leftBand.addColorStop(1, "rgba(0, 0, 0, 0)");
  fillPoly([[456, 174], [438, 196], [80, 72], [0, 20], [0, 0]], leftBand);

  const rightBand = ctx.createLinearGradient(826, 178, 1166, 52);
  rightBand.addColorStop(0, "rgba(238, 218, 164, 0.055)");
  rightBand.addColorStop(1, "rgba(0, 0, 0, 0)");
  fillPoly([[824, 174], [844, 196], [1200, 70], [1280, 18], [1280, 0]], rightBand);
}

function drawTiles() {
  const reflection = ctx.createRadialGradient(640, 584, 18, 640, 668, 440);
  reflection.addColorStop(0, "rgba(246, 232, 180, 0.18)");
  reflection.addColorStop(0.42, "rgba(120, 198, 189, 0.048)");
  reflection.addColorStop(1, "rgba(255, 250, 220, 0)");
  ctx.fillStyle = reflection;
  ctx.beginPath();
  ctx.ellipse(640, 648, 430, 76, 0.02, 0, Math.PI * 2);
  ctx.fill();

  const slick = ctx.createLinearGradient(520, 548, 760, 720);
  slick.addColorStop(0, "rgba(255, 240, 190, 0.055)");
  slick.addColorStop(0.52, "rgba(143, 174, 166, 0.05)");
  slick.addColorStop(1, "rgba(0, 0, 0, 0)");
  fillPoly([[508, 552], [776, 552], [1010, 720], [260, 720]], slick);

  ctx.strokeStyle = "rgba(231, 211, 160, 0.07)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const y = 560 + i * 52;
    ctx.beginPath();
    ctx.moveTo(466 - i * 148, y);
    ctx.lineTo(814 + i * 148, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 247, 210, 0.035)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(586, 548);
  ctx.lineTo(430, 720);
  ctx.moveTo(694, 548);
  ctx.lineTo(850, 720);
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.moveTo(0, 720);
  ctx.lineTo(236, 686);
  ctx.lineTo(1044, 686);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fill();
}

function drawLights(flicker) {
  for (const [x, y, w, depth] of [[520, 22, 240, 1], [566, 104, 148, 0.66], [604, 160, 72, 0.42]]) {
    ctx.fillStyle = `rgba(9, 10, 8, ${0.58 * depth})`;
    roundRect(x - 14, y - 7, w + 28, 26, 7);
    ctx.fill();
    ctx.strokeStyle = `rgba(238, 231, 201, ${0.11 * depth})`;
    ctx.stroke();
    ctx.fillStyle = `rgba(246, 236, 188, ${0.74 * flicker})`;
    roundRect(x, y, w, 12, 5);
    ctx.fill();
    const glow = ctx.createRadialGradient(x + w / 2, y + 8, 10, x + w / 2, y + 66, 270);
    glow.addColorStop(0, `rgba(246, 232, 180, ${0.18 * flicker * depth})`);
    glow.addColorStop(0.5, `rgba(221, 177, 96, ${0.055 * depth})`);
    glow.addColorStop(1, "rgba(246, 241, 202, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 310, y, w + 620, 420);
  }
}

function drawPipes() {
  ctx.strokeStyle = "rgba(186, 177, 142, 0.12)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(116, 152);
  ctx.lineTo(430, 190);
  ctx.moveTo(860, 188);
  ctx.lineTo(1180, 148);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(116, 158);
  ctx.lineTo(430, 196);
  ctx.moveTo(860, 194);
  ctx.lineTo(1180, 154);
  ctx.stroke();

  ctx.strokeStyle = "rgba(120, 124, 112, 0.1)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 236);
  ctx.lineTo(404, 278);
  ctx.moveTo(890, 276);
  ctx.lineTo(1204, 232);
  ctx.stroke();

  ctx.fillStyle = "rgba(224, 214, 174, 0.08)";
  for (const [x, y, rot] of [[214, 164, 0.12], [944, 178, -0.12]]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillRect(-3, -15, 6, 30);
    ctx.restore();
  }
}

function drawFixtures() {
  ctx.fillStyle = "rgba(3, 6, 5, 0.5)";
  roundRect(436, 160, 22, 396, 6);
  ctx.fill();
  roundRect(822, 160, 22, 396, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(236, 226, 188, 0.035)";
  ctx.fillRect(459, 190, 4, 330);
  ctx.fillRect(817, 190, 4, 330);

  drawServiceDoor(212, 240, 86, 204, false);
  drawServiceDoor(1004, 238, 86, 210, true);
  drawPoster(986, 210, "#23241f");

  ctx.fillStyle = "rgba(210, 201, 123, 0.8)";
  ctx.beginPath();
  ctx.arc(278, 348, 6, 0, Math.PI * 2);
  ctx.arc(1020, 350, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(247, 240, 216, 0.6)";
  ctx.font = "800 31px sans-serif";
  ctx.fillText("B2", 469, 318);
}

function drawServiceDoor(x, y, w, h, rightSide) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  roundRect(x - 8, y + 6, w + 16, h + 10, 10);
  ctx.fill();

  const door = ctx.createLinearGradient(x, y, x + w, y + h);
  door.addColorStop(0, "#151c19");
  door.addColorStop(0.48, "#2b312a");
  door.addColorStop(1, "#0e1110");
  ctx.fillStyle = door;
  roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(244, 239, 216, 0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(244, 239, 216, 0.065)";
  ctx.lineWidth = 1;
  roundRect(x + 12, y + 18, w - 24, h - 36, 4);
  ctx.stroke();
  ctx.fillStyle = "rgba(210, 201, 123, 0.72)";
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
  sign.addColorStop(0, "#0f453a");
  sign.addColorStop(0.5, "#1d795d");
  sign.addColorStop(1, "#0f4c40");
  ctx.shadowColor = "rgba(120, 198, 189, 0.35)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = sign;
  roundRect(512, 144, 256, 54, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(190, 244, 222, 0.32)";
  ctx.stroke();
  ctx.fillStyle = "#dceee6";
  ctx.font = "900 28px sans-serif";
  ctx.fillText("EXIT", 552, 180);
  ctx.beginPath();
  if (reverse) {
    ctx.moveTo(724, 171);
    ctx.lineTo(686, 151);
    ctx.lineTo(686, 164);
    ctx.lineTo(642, 164);
    ctx.lineTo(642, 179);
    ctx.lineTo(686, 179);
    ctx.lineTo(686, 192);
  } else {
    ctx.moveTo(650, 171);
    ctx.lineTo(688, 151);
    ctx.lineTo(688, 164);
    ctx.lineTo(734, 164);
    ctx.lineTo(734, 179);
    ctx.lineTo(688, 179);
    ctx.lineTo(688, 192);
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
  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(104, 418);
  ctx.lineTo(354, 394);
  ctx.moveTo(926, 398);
  ctx.lineTo(1190, 428);
  ctx.stroke();

  ctx.strokeStyle = "rgba(207, 196, 157, 0.22)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(104, 410);
  ctx.lineTo(354, 386);
  ctx.moveTo(926, 390);
  ctx.lineTo(1190, 420);
  ctx.stroke();

  ctx.strokeStyle = "rgba(207, 196, 157, 0.08)";
  ctx.lineWidth = 2;
  for (const [x, y, side] of [[184, 402, -1], [1088, 410, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + side * 16, y + 34);
    ctx.stroke();
  }
}

function drawSurfaceWear(t) {
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 131) % 1280;
    const y = 150 + ((i * 67) % 500);
    const w = 34 + ((i * 17) % 78);
    const h = 8 + (i % 5) * 3;
    ctx.fillStyle = i % 2 === 0 ? "rgba(0, 0, 0, 0.028)" : "rgba(255, 244, 194, 0.018)";
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, (i % 3 - 1) * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255, 247, 210, 0.018)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = 574 + i * 28;
    ctx.beginPath();
    ctx.moveTo(430 - i * 82, y + Math.sin(t / 800 + i) * 2);
    ctx.lineTo(850 + i * 82, y + Math.cos(t / 900 + i) * 2);
    ctx.stroke();
  }

  const depthFog = ctx.createRadialGradient(640, 280, 40, 640, 320, 420);
  depthFog.addColorStop(0, "rgba(224, 210, 168, 0.09)");
  depthFog.addColorStop(0.4, "rgba(120, 198, 189, 0.038)");
  depthFog.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = depthFog;
  ctx.fillRect(280, 80, 720, 500);

  const foregroundShade = ctx.createLinearGradient(0, 520, 0, 720);
  foregroundShade.addColorStop(0, "rgba(0, 0, 0, 0)");
  foregroundShade.addColorStop(1, "rgba(0, 0, 0, 0.38)");
  ctx.fillStyle = foregroundShade;
  ctx.fillRect(0, 520, 1280, 200);
}

function drawFinalGrade() {
  const vignette = ctx.createRadialGradient(640, 370, 150, 640, 360, 760);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.64, "rgba(0, 0, 0, 0.18)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.58)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 1280, 720);

  const topShade = ctx.createLinearGradient(0, 0, 0, 160);
  topShade.addColorStop(0, "rgba(0, 0, 0, 0.42)");
  topShade.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = topShade;
  ctx.fillRect(0, 0, 1280, 190);
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
