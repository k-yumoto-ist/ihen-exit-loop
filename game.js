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
const TRANSITION_MS = 850;
const WIN_TARGET = 8;

const state = {
  running: false,
  progress: 0,
  round: 0,
  current: null,
  canJudge: false,
  phaseStarted: 0,
  foundIds: new Set(),
  seenAnomalyIds: new Set(),
  lastIds: [],
  transitionUntil: 0,
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
  },
  {
    id: "exit-sign-dim",
    draw() {
      ctx.fillStyle = "rgba(3, 21, 17, 0.5)";
      roundRect(512, 138, 256, 58, 9);
      ctx.fill();
      ctx.fillStyle = "rgba(220, 238, 230, 0.52)";
      ctx.font = "900 29px sans-serif";
      ctx.fillText("EXIT", 552, 176);
    }
  },
  {
    id: "exit-arrow-down",
    draw() {
      ctx.fillStyle = "#dceee6";
      ctx.beginPath();
      ctx.moveTo(707, 184);
      ctx.lineTo(682, 158);
      ctx.lineTo(696, 158);
      ctx.lineTo(696, 138);
      ctx.lineTo(718, 138);
      ctx.lineTo(718, 158);
      ctx.lineTo(732, 158);
      ctx.closePath();
      ctx.fill();
    }
  },
  {
    id: "b2-missing",
    draw() {
      ctx.fillStyle = "rgba(27, 35, 30, 0.74)";
      ctx.fillRect(462, 292, 58, 36);
    }
  },
  {
    id: "b2-upside-down",
    draw() {
      ctx.save();
      ctx.translate(500, 318);
      ctx.rotate(Math.PI);
      ctx.fillStyle = "rgba(247, 240, 216, 0.72)";
      ctx.font = "800 31px sans-serif";
      ctx.fillText("B2", -31, 8);
      ctx.restore();
    }
  },
  {
    id: "left-rail-gap",
    draw() {
      ctx.strokeStyle = "rgba(15, 22, 18, 0.82)";
      ctx.lineWidth = 18;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(206, 404);
      ctx.lineTo(276, 396);
      ctx.stroke();
      ctx.lineCap = "butt";
    }
  },
  {
    id: "right-rail-end-cap",
    draw() {
      ctx.fillStyle = "rgba(230, 210, 150, 0.62)";
      ctx.beginPath();
      ctx.ellipse(1192, 424, 14, 9, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.32)";
      ctx.stroke();
    }
  },
  {
    id: "left-wall-panel-open",
    draw() {
      ctx.fillStyle = "rgba(5, 7, 6, 0.72)";
      ctx.beginPath();
      ctx.moveTo(150, 286);
      ctx.lineTo(224, 300);
      ctx.lineTo(226, 396);
      ctx.lineTo(144, 420);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(241, 226, 181, 0.18)";
      ctx.stroke();
    }
  },
  {
    id: "right-panel-light",
    draw() {
      ctx.fillStyle = "rgba(142, 222, 202, 0.58)";
      roundRect(1052, 270, 34, 12, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(120, 222, 202, 0.16)";
      ctx.beginPath();
      ctx.ellipse(1068, 278, 54, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "door-window-bright",
    draw() {
      ctx.fillStyle = "rgba(174, 238, 224, 0.5)";
      roundRect(620, 276, 40, 154, 9);
      ctx.fill();
    }
  },
  {
    id: "door-handle-center",
    draw() {
      ctx.fillStyle = "rgba(222, 200, 128, 0.76)";
      ctx.beginPath();
      ctx.arc(682, 406, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 241, 190, 0.26)";
      ctx.stroke();
    }
  },
  {
    id: "ceiling-light-shift",
    draw() {
      ctx.fillStyle = "rgba(5, 6, 5, 0.78)";
      roundRect(196, 110, 86, 24, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(248, 237, 188, 0.7)";
      roundRect(204, 115, 70, 10, 5);
      ctx.fill();
    }
  },
  {
    id: "floor-long-reflection",
    draw() {
      const glow = ctx.createLinearGradient(620, 548, 660, 720);
      glow.addColorStop(0, "rgba(248, 230, 168, 0.18)");
      glow.addColorStop(1, "rgba(248, 230, 168, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(640, 650, 76, 148, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "floor-scuff-mark",
    draw() {
      ctx.strokeStyle = "rgba(220, 206, 160, 0.22)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(526, 648);
      ctx.bezierCurveTo(580, 624, 646, 650, 718, 626);
      ctx.stroke();
    }
  },
  {
    id: "right-wall-shadow-window",
    draw() {
      ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
      ctx.beginPath();
      ctx.moveTo(920, 226);
      ctx.lineTo(1014, 204);
      ctx.lineTo(1034, 342);
      ctx.lineTo(920, 356);
      ctx.closePath();
      ctx.fill();
    }
  },
  {
    id: "left-wall-glow-mark",
    draw() {
      ctx.fillStyle = "rgba(221, 177, 96, 0.16)";
      ctx.beginPath();
      ctx.ellipse(250, 332, 62, 18, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "pipe-extra-joint",
    draw() {
      ctx.fillStyle = "rgba(216, 202, 160, 0.22)";
      ctx.save();
      ctx.translate(322, 174);
      ctx.rotate(0.12);
      roundRect(-8, -20, 16, 40, 5);
      ctx.fill();
      ctx.restore();
    }
  },
  {
    id: "poster-blank",
    draw() {
      drawPoster(986, 210, "#20231f", true);
      ctx.fillStyle = "rgba(9, 12, 11, 0.66)";
      ctx.fillRect(1000, 232, 64, 70);
    }
  },
  {
    id: "clock-no-hands",
    draw() {
      ctx.fillStyle = "#ded8bd";
      ctx.beginPath();
      ctx.arc(380, 190, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#353327";
      ctx.stroke();
      ctx.fillStyle = "#1b1b16";
      ctx.beginPath();
      ctx.arc(380, 190, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "small-ceiling-drip",
    draw(t) {
      const y = 190 + Math.sin(t / 160) * 5;
      ctx.strokeStyle = "rgba(142, 190, 180, 0.48)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(720, 142);
      ctx.lineTo(720, y);
      ctx.stroke();
      ctx.fillStyle = "rgba(160, 212, 202, 0.38)";
      ctx.beginPath();
      ctx.arc(720, y + 8, 4, 0, Math.PI * 2);
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
  state.transitionUntil = 0;
  state.phaseStarted = performance.now();
  state.canJudge = false;
  phaseLabel.textContent = "観察中";
  exitCount.textContent = `${state.progress} / ${WIN_TARGET}`;
  scanBar.style.width = "0%";
  setButtons(false);
}

function pickAnomaly() {
  const choices = anomalies.filter((item) => !state.seenAnomalyIds.has(item.id));
  if (choices.length === 0) return null;

  const emptyChance = state.round <= 2 ? 0.54 : 0.36;
  if (Math.random() < emptyChance) return null;

  const selected = choices[Math.floor(Math.random() * choices.length)];
  state.seenAnomalyIds.add(selected.id);
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
  state.canJudge = false;
  state.transitionUntil = performance.now() + TRANSITION_MS;
  state.flashUntil = performance.now() + 540;
  state.flashClass = correct ? "ok" : "bad";
  setButtons(false);
  game.classList.remove("ok", "bad");
  game.classList.add(state.flashClass);

  if (state.progress >= WIN_TARGET) {
    win();
    return;
  }

  phaseLabel.textContent = correct ? "正解" : "リセット";
  window.setTimeout(() => {
    if (state.running) nextRound();
  }, TRANSITION_MS);
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
  const transitioning = state.transitionUntil > t;
  if (!transitioning) updateObserve(t);

  const flicker = 0.92 + Math.sin(t / 860) * 0.012;
  const driftX = (state.mouse.x - 640) * 0.004;
  const driftY = (state.mouse.y - 360) * 0.0035;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  mapCanvas();
  ctx.translate(640, 360);
  ctx.translate(-640 - driftX, -360 - driftY);

  if (transitioning) {
    drawTransitionScreen(t);
    ctx.restore();
    return;
  }

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

function drawTransitionScreen(t) {
  const base = ctx.createLinearGradient(0, 0, 0, 720);
  base.addColorStop(0, "#020504");
  base.addColorStop(0.42, "#07110f");
  base.addColorStop(1, "#020302");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1280, 720);

  const sweep = (t / 8) % 220;
  const leftWall = ctx.createLinearGradient(0, 160, 520, 560);
  leftWall.addColorStop(0, "rgba(0, 0, 0, 0.82)");
  leftWall.addColorStop(0.52, "rgba(22, 42, 35, 0.5)");
  leftWall.addColorStop(1, "rgba(0, 0, 0, 0)");
  fillPoly([
    [0, 0],
    [520 - sweep * 0.28, 150],
    [498 - sweep * 0.18, 560],
    [0, 720]
  ], leftWall);

  const rightWall = ctx.createLinearGradient(1280, 160, 760, 560);
  rightWall.addColorStop(0, "rgba(0, 0, 0, 0.82)");
  rightWall.addColorStop(0.52, "rgba(42, 38, 26, 0.48)");
  rightWall.addColorStop(1, "rgba(0, 0, 0, 0)");
  fillPoly([
    [1280, 0],
    [760 + sweep * 0.28, 150],
    [782 + sweep * 0.18, 560],
    [1280, 720]
  ], rightWall);

  const centerGlow = ctx.createRadialGradient(640, 320, 10, 640, 390, 420);
  centerGlow.addColorStop(0, "rgba(221, 177, 96, 0.16)");
  centerGlow.addColorStop(0.48, "rgba(120, 198, 189, 0.055)");
  centerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = centerGlow;
  ctx.fillRect(240, 70, 800, 600);

  const slit = ctx.createLinearGradient(530, 0, 750, 720);
  slit.addColorStop(0, "rgba(255, 237, 184, 0)");
  slit.addColorStop(0.44, "rgba(255, 237, 184, 0.13)");
  slit.addColorStop(0.56, "rgba(130, 206, 190, 0.08)");
  slit.addColorStop(1, "rgba(255, 237, 184, 0)");
  fillPoly([
    [594, 0],
    [690, 0],
    [756, 720],
    [520, 720]
  ], slit);

  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, 1280, 116);
  ctx.fillRect(0, 604, 1280, 116);

  ctx.strokeStyle = "rgba(236, 218, 164, 0.08)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(130 - sweep, 418);
  ctx.lineTo(510 - sweep * 0.25, 382);
  ctx.moveTo(1150 + sweep, 418);
  ctx.lineTo(770 + sweep * 0.25, 382);
  ctx.stroke();

  const vignette = ctx.createRadialGradient(640, 360, 110, 640, 360, 720);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(0.55, "rgba(0, 0, 0, 0.28)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.78)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 1280, 720);

  if (state.flashUntil > t) {
    const color = state.flashClass === "ok" ? "215, 173, 95" : "169, 95, 72";
    ctx.fillStyle = `rgba(${color}, 0.05)`;
    ctx.fillRect(0, 0, 1280, 720);
  }
}

function drawBase() {
  const room = ctx.createLinearGradient(0, 0, 0, 720);
  room.addColorStop(0, "#020504");
  room.addColorStop(0.26, "#10201c");
  room.addColorStop(0.56, "#1d2119");
  room.addColorStop(1, "#030403");
  ctx.fillStyle = room;
  ctx.fillRect(0, 0, 1280, 720);

  const backWall = ctx.createLinearGradient(440, 160, 840, 560);
  backWall.addColorStop(0, "#2a3832");
  backWall.addColorStop(0.32, "#6f705b");
  backWall.addColorStop(0.58, "#868067");
  backWall.addColorStop(0.82, "#3c463d");
  backWall.addColorStop(1, "#151b18");
  fillPoly([
    [456, 174],
    [824, 174],
    [812, 548],
    [468, 548]
  ], backWall);

  const leftWall = ctx.createLinearGradient(0, 40, 470, 548);
  leftWall.addColorStop(0, "#020504");
  leftWall.addColorStop(0.25, "#0c1a16");
  leftWall.addColorStop(0.48, "#27352d");
  leftWall.addColorStop(0.74, "#111713");
  leftWall.addColorStop(1, "#030403");
  fillPoly([
    [0, 0],
    [456, 174],
    [468, 548],
    [0, 720]
  ], leftWall);

  const rightWall = ctx.createLinearGradient(1280, 40, 810, 548);
  rightWall.addColorStop(0, "#020504");
  rightWall.addColorStop(0.25, "#121d18");
  rightWall.addColorStop(0.5, "#353426");
  rightWall.addColorStop(0.76, "#151611");
  rightWall.addColorStop(1, "#030403");
  fillPoly([
    [1280, 0],
    [824, 174],
    [812, 548],
    [1280, 720]
  ], rightWall);

  const floor = ctx.createLinearGradient(0, 560, 0, 720);
  floor.addColorStop(0, "#3b3c2d");
  floor.addColorStop(0.4, "#22281f");
  floor.addColorStop(0.7, "#10140f");
  floor.addColorStop(1, "#020302");
  fillPoly([
    [468, 548],
    [812, 548],
    [1280, 720],
    [0, 720]
  ], floor);

  const ceiling = ctx.createLinearGradient(0, 0, 0, 160);
  ceiling.addColorStop(0, "#020504");
  ceiling.addColorStop(0.52, "#141e1a");
  ceiling.addColorStop(1, "#443d2d");
  fillPoly([
    [456, 174],
    [824, 174],
    [1280, 0],
    [0, 0]
  ], ceiling);

  drawWallDepth();

  const wallBloom = ctx.createRadialGradient(640, 286, 24, 640, 324, 380);
  wallBloom.addColorStop(0, "rgba(246, 229, 174, 0.24)");
  wallBloom.addColorStop(0.38, "rgba(120, 198, 189, 0.06)");
  wallBloom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = wallBloom;
  ctx.fillRect(290, 72, 700, 520);

  const floorPool = ctx.createRadialGradient(640, 540, 16, 640, 652, 560);
  floorPool.addColorStop(0, "rgba(246, 224, 159, 0.26)");
  floorPool.addColorStop(0.32, "rgba(191, 163, 99, 0.12)");
  floorPool.addColorStop(0.68, "rgba(83, 122, 110, 0.05)");
  floorPool.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = floorPool;
  ctx.beginPath();
  ctx.ellipse(640, 642, 540, 104, 0, 0, Math.PI * 2);
  ctx.fill();

  const endGlow = ctx.createRadialGradient(640, 318, 18, 640, 354, 310);
  endGlow.addColorStop(0, "rgba(139, 217, 199, 0.2)");
  endGlow.addColorStop(0.44, "rgba(221, 177, 96, 0.075)");
  endGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = endGlow;
  ctx.fillRect(330, 116, 620, 460);

  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.fillRect(452, 172, 16, 382);
  ctx.fillRect(812, 172, 16, 382);

  drawEndDoor();
}

function drawWallDepth() {
  const leftRecess = ctx.createLinearGradient(80, 210, 470, 430);
  leftRecess.addColorStop(0, "rgba(0, 0, 0, 0.44)");
  leftRecess.addColorStop(0.42, "rgba(16, 36, 30, 0.18)");
  leftRecess.addColorStop(1, "rgba(245, 222, 158, 0.055)");
  fillPoly([[42, 190], [422, 244], [430, 468], [0, 612], [0, 272]], leftRecess);

  const leftFace = ctx.createLinearGradient(106, 140, 424, 520);
  leftFace.addColorStop(0, "rgba(231, 211, 160, 0.09)");
  leftFace.addColorStop(0.42, "rgba(22, 43, 36, 0.22)");
  leftFace.addColorStop(1, "rgba(0, 0, 0, 0.34)");
  fillPoly([[118, 150], [438, 206], [432, 528], [62, 616], [46, 300]], leftFace);

  const rightRecess = ctx.createLinearGradient(1200, 210, 810, 430);
  rightRecess.addColorStop(0, "rgba(0, 0, 0, 0.46)");
  rightRecess.addColorStop(0.44, "rgba(42, 39, 27, 0.24)");
  rightRecess.addColorStop(1, "rgba(245, 222, 158, 0.05)");
  fillPoly([[1238, 190], [858, 244], [850, 468], [1280, 612], [1280, 272]], rightRecess);

  const rightFace = ctx.createLinearGradient(1174, 140, 856, 520);
  rightFace.addColorStop(0, "rgba(231, 211, 160, 0.075)");
  rightFace.addColorStop(0.42, "rgba(45, 42, 30, 0.24)");
  rightFace.addColorStop(1, "rgba(0, 0, 0, 0.36)");
  fillPoly([[1162, 150], [842, 206], [848, 528], [1218, 616], [1234, 300]], rightFace);

  const baseShadow = ctx.createLinearGradient(0, 450, 1280, 450);
  baseShadow.addColorStop(0, "rgba(0, 0, 0, 0.55)");
  baseShadow.addColorStop(0.5, "rgba(0, 0, 0, 0)");
  baseShadow.addColorStop(1, "rgba(0, 0, 0, 0.55)");
  ctx.fillStyle = baseShadow;
  ctx.fillRect(0, 300, 1280, 300);

  ctx.strokeStyle = "rgba(255, 236, 180, 0.055)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(438, 206);
  ctx.lineTo(432, 528);
  ctx.moveTo(842, 206);
  ctx.lineTo(848, 528);
  ctx.stroke();
}

function drawEndDoor() {
  const alcove = ctx.createLinearGradient(548, 206, 728, 558);
  alcove.addColorStop(0, "rgba(5, 8, 7, 0.52)");
  alcove.addColorStop(0.5, "rgba(24, 35, 31, 0.56)");
  alcove.addColorStop(1, "rgba(0, 0, 0, 0.58)");
  ctx.fillStyle = alcove;
  roundRect(548, 210, 184, 350, 22);
  ctx.fill();

  const jamb = ctx.createLinearGradient(560, 222, 720, 548);
  jamb.addColorStop(0, "#4c5546");
  jamb.addColorStop(0.42, "#7d7961");
  jamb.addColorStop(1, "#242d27");
  ctx.fillStyle = jamb;
  roundRect(560, 220, 160, 334, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(246, 226, 168, 0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const endDoor = ctx.createLinearGradient(584, 244, 696, 536);
  endDoor.addColorStop(0, "#25332e");
  endDoor.addColorStop(0.38, "#465143");
  endDoor.addColorStop(0.72, "#25302b");
  endDoor.addColorStop(1, "#0f1513");
  ctx.fillStyle = endDoor;
  roundRect(586, 244, 108, 300, 14);
  ctx.fill();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.34)";
  ctx.lineWidth = 8;
  roundRect(586, 244, 108, 300, 14);
  ctx.stroke();
  ctx.strokeStyle = "rgba(238, 222, 170, 0.22)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const glass = ctx.createLinearGradient(616, 270, 664, 432);
  glass.addColorStop(0, "rgba(170, 220, 206, 0.34)");
  glass.addColorStop(0.42, "rgba(48, 74, 68, 0.42)");
  glass.addColorStop(1, "rgba(4, 7, 6, 0.58)");
  ctx.fillStyle = glass;
  roundRect(616, 270, 48, 166, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(206, 238, 224, 0.2)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 244, 198, 0.12)";
  ctx.fillRect(624, 282, 6, 138);
  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  roundRect(608, 458, 64, 12, 5);
  ctx.fill();
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
  const upperSoft = ctx.createLinearGradient(480, 190, 802, 278);
  upperSoft.addColorStop(0, "rgba(255, 245, 204, 0.07)");
  upperSoft.addColorStop(0.56, "rgba(126, 112, 78, 0.05)");
  upperSoft.addColorStop(1, "rgba(0, 0, 0, 0.035)");
  ctx.fillStyle = upperSoft;
  roundRect(478, 196, 324, 78, 10);
  ctx.fill();

  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  roundRect(482, 472, 316, 58, 10);
  ctx.fill();

  ctx.strokeStyle = "rgba(231, 211, 160, 0.04)";
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
  const reflection = ctx.createRadialGradient(640, 564, 18, 640, 666, 510);
  reflection.addColorStop(0, "rgba(246, 232, 180, 0.24)");
  reflection.addColorStop(0.36, "rgba(120, 198, 189, 0.058)");
  reflection.addColorStop(0.68, "rgba(65, 86, 72, 0.03)");
  reflection.addColorStop(1, "rgba(255, 250, 220, 0)");
  ctx.fillStyle = reflection;
  ctx.beginPath();
  ctx.ellipse(640, 644, 500, 86, 0.02, 0, Math.PI * 2);
  ctx.fill();

  const slick = ctx.createLinearGradient(520, 548, 760, 720);
  slick.addColorStop(0, "rgba(255, 240, 190, 0.08)");
  slick.addColorStop(0.5, "rgba(143, 174, 166, 0.06)");
  slick.addColorStop(1, "rgba(0, 0, 0, 0)");
  fillPoly([[508, 552], [776, 552], [1010, 720], [260, 720]], slick);

  const centerWear = ctx.createLinearGradient(590, 548, 690, 720);
  centerWear.addColorStop(0, "rgba(0, 0, 0, 0)");
  centerWear.addColorStop(0.64, "rgba(0, 0, 0, 0.18)");
  centerWear.addColorStop(1, "rgba(0, 0, 0, 0.34)");
  fillPoly([[610, 552], [670, 552], [800, 720], [480, 720]], centerWear);

  ctx.strokeStyle = "rgba(231, 211, 160, 0.045)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 2; i += 1) {
    const y = 586 + i * 72;
    ctx.beginPath();
    ctx.moveTo(360 - i * 170, y);
    ctx.lineTo(920 + i * 170, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 247, 210, 0.024)";
  ctx.lineWidth = 1;
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
    ctx.fillStyle = `rgba(5, 6, 5, ${0.66 * depth})`;
    roundRect(x - 14, y - 7, w + 28, 26, 7);
    ctx.fill();
    ctx.strokeStyle = `rgba(238, 231, 201, ${0.14 * depth})`;
    ctx.stroke();
    ctx.fillStyle = `rgba(248, 237, 188, ${0.82 * flicker})`;
    roundRect(x, y, w, 12, 5);
    ctx.fill();
    const glow = ctx.createRadialGradient(x + w / 2, y + 8, 10, x + w / 2, y + 86, 330);
    glow.addColorStop(0, `rgba(246, 232, 180, ${0.23 * flicker * depth})`);
    glow.addColorStop(0.48, `rgba(221, 177, 96, ${0.07 * depth})`);
    glow.addColorStop(1, "rgba(246, 241, 202, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 370, y, w + 740, 500);
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
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  roundRect(436, 160, 22, 396, 6);
  ctx.fill();
  roundRect(822, 160, 22, 396, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(236, 226, 188, 0.045)";
  ctx.fillRect(459, 190, 4, 330);
  ctx.fillRect(817, 190, 4, 330);

  drawServiceDoor(214, 248, 86, 192, false);
  drawServiceDoor(998, 246, 92, 196, true);
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
  ctx.save();
  const skew = rightSide ? -0.06 : 0.06;
  ctx.transform(1, 0, skew, 1, 0, 0);
  const sx = x - y * skew;

  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  roundRect(sx - 12, y + 8, w + 24, h + 16, 12);
  ctx.fill();

  const recess = ctx.createLinearGradient(sx, y, sx + w, y + h);
  recess.addColorStop(0, "rgba(5, 8, 7, 0.9)");
  recess.addColorStop(0.52, "rgba(20, 28, 24, 0.92)");
  recess.addColorStop(1, "rgba(4, 6, 5, 0.96)");
  ctx.fillStyle = recess;
  roundRect(sx - 5, y - 4, w + 10, h + 8, 10);
  ctx.fill();

  const door = ctx.createLinearGradient(sx, y, sx + w, y + h);
  door.addColorStop(0, "#1d2722");
  door.addColorStop(0.46, "#34382f");
  door.addColorStop(1, "#101412");
  ctx.fillStyle = door;
  roundRect(sx, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(244, 239, 216, 0.16)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = "rgba(244, 239, 216, 0.07)";
  ctx.lineWidth = 1;
  roundRect(sx + 12, y + 20, w - 24, h - 40, 5);
  ctx.stroke();

  const shine = ctx.createLinearGradient(sx, y, sx + w, y);
  shine.addColorStop(0, "rgba(255, 242, 190, 0.09)");
  shine.addColorStop(1, "rgba(255, 242, 190, 0)");
  ctx.fillStyle = shine;
  roundRect(sx + 5, y + 5, w - 10, 32, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(210, 201, 123, 0.72)";
  ctx.beginPath();
  ctx.arc(sx + (rightSide ? 18 : w - 20), y + h * 0.54, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
  const halo = ctx.createRadialGradient(640, 174, 20, 640, 180, 210);
  halo.addColorStop(0, "rgba(105, 225, 190, 0.22)");
  halo.addColorStop(0.42, "rgba(70, 170, 140, 0.07)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(430, 92, 420, 210);

  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  roundRect(506, 148, 270, 62, 10);
  ctx.fill();

  const side = ctx.createLinearGradient(520, 194, 768, 206);
  side.addColorStop(0, "#082821");
  side.addColorStop(0.5, "#0d3a30");
  side.addColorStop(1, "#061e1a");
  ctx.fillStyle = side;
  roundRect(522, 184, 248, 18, 5);
  ctx.fill();

  const sign = ctx.createLinearGradient(518, 145, 762, 193);
  sign.addColorStop(0, "#0b4a3d");
  sign.addColorStop(0.5, "#208f6b");
  sign.addColorStop(1, "#0c5d4c");
  ctx.shadowColor = "rgba(120, 228, 198, 0.36)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = sign;
  roundRect(512, 138, 256, 58, 9);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(203, 252, 230, 0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fillRect(526, 146, 222, 3);

  ctx.fillStyle = "#dceee6";
  ctx.font = "900 29px sans-serif";
  ctx.fillText("EXIT", 552, 176);
  ctx.beginPath();
  if (reverse) {
    ctx.moveTo(724, 167);
    ctx.lineTo(686, 147);
    ctx.lineTo(686, 160);
    ctx.lineTo(642, 160);
    ctx.lineTo(642, 175);
    ctx.lineTo(686, 175);
    ctx.lineTo(686, 188);
  } else {
    ctx.moveTo(650, 167);
    ctx.lineTo(688, 147);
    ctx.lineTo(688, 160);
    ctx.lineTo(734, 160);
    ctx.lineTo(734, 175);
    ctx.lineTo(688, 175);
    ctx.lineTo(688, 188);
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
  drawRail([
    [104, 414],
    [354, 386]
  ], -1);
  drawRail([
    [926, 390],
    [1190, 424]
  ], 1);
}

function drawRail(points, side) {
  const [[x1, y1], [x2, y2]] = points;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.38)";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(x1, y1 + 9);
  ctx.lineTo(x2, y2 + 9);
  ctx.stroke();

  const rail = ctx.createLinearGradient(x1, y1, x2, y2);
  rail.addColorStop(0, "rgba(143, 134, 102, 0.34)");
  rail.addColorStop(0.5, "rgba(227, 210, 160, 0.42)");
  rail.addColorStop(1, "rgba(108, 103, 80, 0.26)");
  ctx.strokeStyle = rail;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 238, 184, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x1 + side * 4, y1 - 3);
  ctx.lineTo(x2 + side * 4, y2 - 3);
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  for (const p of [0.26, 0.78]) {
    const x = x1 + (x2 - x1) * p;
    const y = y1 + (y2 - y1) * p;
    roundRect(x - 8, y + 4, 18, 34, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(197, 184, 139, 0.17)";
    roundRect(x - 5, y + 1, 12, 30, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  }

  ctx.lineCap = "butt";
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
