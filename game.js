const canvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d");

const exitCount = document.querySelector("#exitCount");
const routeLabel = document.querySelector("#routeLabel");
const phaseLabel = document.querySelector("#phaseLabel");
const bestLabel = document.querySelector("#bestLabel");
const notice = document.querySelector("#notice");
const startButton = document.querySelector("#startButton");
const backButton = document.querySelector("#backButton");
const forwardButton = document.querySelector("#forwardButton");
const focusButton = document.querySelector("#focusButton");
const focusRing = document.querySelector("#focusRing");
const roundNote = document.querySelector("#roundNote");
const history = document.querySelector("#history");
const scanBar = document.querySelector("#scanBar");

const OBSERVE_MS = 2400;
const WIN_TARGET = 8;

const state = {
  running: false,
  progress: 0,
  round: 0,
  best: Number(localStorage.getItem("exit-loop-best") || 0),
  current: null,
  phaseStarted: 0,
  canJudge: false,
  focus: false,
  lastIds: [],
  flashUntil: 0,
  mouse: { x: 640, y: 360 }
};

const anomalies = [
  {
    id: "poster-red",
    name: "右壁の広告が赤く染まっている",
    draw(t) {
      drawPoster(986, 210, "#4d1612");
      ctx.globalAlpha = 0.28 + Math.sin(t / 260) * 0.08;
      ctx.fillStyle = "#e14a3c";
      ctx.fillRect(986, 210, 92, 136);
      ctx.globalAlpha = 1;
    }
  },
  {
    id: "far-light",
    name: "奥の蛍光灯だけ点滅している",
    draw(t) {
      if (Math.sin(t / 88) > -0.35) return;
      ctx.fillStyle = "rgba(6, 7, 6, 0.64)";
      ctx.fillRect(526, 76, 228, 58);
    }
  },
  {
    id: "raised-tile",
    name: "床タイルが一枚だけ浮いている",
    draw() {
      ctx.fillStyle = "#343125";
      ctx.beginPath();
      ctx.moveTo(704, 528);
      ctx.lineTo(807, 508);
      ctx.lineTo(874, 594);
      ctx.lineTo(760, 627);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(244, 239, 216, 0.32)";
      ctx.stroke();
    }
  },
  {
    id: "reverse-sign",
    name: "出口案内の矢印が逆向き",
    draw() {
      drawExitSign(true);
    }
  },
  {
    id: "shadow",
    name: "奥の柱の横に黒い影が立っている",
    draw(t) {
      const sway = Math.sin(t / 440) * 4;
      ctx.fillStyle = "rgba(5, 5, 4, 0.92)";
      ctx.beginPath();
      ctx.ellipse(647 + sway, 241, 14, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(635 + sway, 261, 24, 76);
    }
  },
  {
    id: "open-door",
    name: "左の点検扉が少し開いている",
    draw() {
      ctx.fillStyle = "#050505";
      ctx.beginPath();
      ctx.moveTo(232, 249);
      ctx.lineTo(312, 226);
      ctx.lineTo(316, 471);
      ctx.lineTo(238, 431);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(244, 239, 216, 0.22)";
      ctx.stroke();
    }
  },
  {
    id: "missing-rail",
    name: "右壁の手すりが途中で消えている",
    draw() {
      ctx.fillStyle = "#1d1c18";
      ctx.fillRect(1026, 407, 158, 20);
    }
  },
  {
    id: "wrong-clock",
    name: "時計の針が真下を指している",
    draw() {
      drawClock(380, 190, true);
    }
  },
  {
    id: "wet-floor",
    name: "床に水たまりができている",
    draw(t) {
      const shimmer = 0.16 + Math.sin(t / 300) * 0.06;
      ctx.fillStyle = `rgba(142, 174, 178, ${shimmer})`;
      ctx.beginPath();
      ctx.ellipse(568, 636, 136, 22, -0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(205, 230, 224, 0.2)";
      ctx.stroke();
    }
  },
  {
    id: "ceiling-camera",
    name: "天井カメラの向きがこちら側",
    draw() {
      ctx.fillStyle = "#22231f";
      ctx.fillRect(606, 116, 38, 20);
      ctx.fillStyle = "#080808";
      ctx.beginPath();
      ctx.arc(625, 146, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a91e1a";
      ctx.beginPath();
      ctx.arc(625, 146, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: "floor-number",
    name: "柱の階数表示がB4になっている",
    draw() {
      ctx.fillStyle = "#d7d1b6";
      ctx.font = "700 32px sans-serif";
      ctx.fillText("B4", 469, 318);
    }
  },
  {
    id: "cone-shift",
    name: "奥のカラーコーンが通路中央に出ている",
    draw() {
      ctx.fillStyle = "#c35c2e";
      ctx.beginPath();
      ctx.moveTo(607, 475);
      ctx.lineTo(633, 475);
      ctx.lineTo(620, 416);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#eee2c5";
      ctx.fillRect(610, 452, 20, 7);
      ctx.fillRect(602, 474, 36, 8);
    }
  }
];

bestLabel.textContent = String(state.best);

function startGame() {
  state.running = true;
  state.progress = 0;
  state.round = 0;
  state.lastIds = [];
  history.innerHTML = "";
  notice.classList.add("hidden");
  setButtons(false);
  nextRound("観察中", "まずは基準の通路を目に入れてください。細部の位置関係が頼りです。");
}

function nextRound(phase, note) {
  state.round += 1;
  state.current = pickAnomaly();
  state.phaseStarted = performance.now();
  state.canJudge = false;
  state.focus = false;
  focusButton.setAttribute("aria-pressed", "false");
  focusRing.classList.remove("visible");
  phaseLabel.textContent = phase;
  roundNote.textContent = note;
  routeLabel.textContent = `B${2 + Math.floor(state.round / 4)}-${String(state.round).padStart(2, "0")}`;
  exitCount.textContent = `${state.progress} / ${WIN_TARGET}`;
  scanBar.style.width = "0%";
  setButtons(false);
}

function pickAnomaly() {
  const noAnomalyChance = state.round <= 2 ? 0.58 : 0.38;
  if (Math.random() < noAnomalyChance) return null;

  const choices = anomalies.filter((item) => !state.lastIds.includes(item.id));
  const selected = choices[Math.floor(Math.random() * choices.length)] || anomalies[0];
  state.lastIds = [selected.id, ...state.lastIds].slice(0, 3);
  return selected;
}

function setButtons(enabled) {
  backButton.disabled = !enabled;
  forwardButton.disabled = !enabled;
  focusButton.disabled = !state.running;
}

function updateObserve(t) {
  if (!state.running || state.canJudge) return;
  const ratio = Math.min(1, (t - state.phaseStarted) / OBSERVE_MS);
  scanBar.style.width = `${Math.round(ratio * 100)}%`;
  if (ratio >= 1) {
    state.canJudge = true;
    phaseLabel.textContent = "判定可能";
    roundNote.textContent = "異変があると思えば引き返す。なければ進む。";
    setButtons(true);
  }
}

function choose(turnBack) {
  if (!state.running || !state.canJudge) return;

  const hasAnomaly = Boolean(state.current);
  const correct = hasAnomaly === turnBack;
  const item = document.createElement("li");
  item.className = correct ? "good" : "bad";

  if (correct) {
    state.progress += 1;
    item.textContent = hasAnomaly
      ? `正解: ${state.current.name}。引き返した。`
      : "正解: 異変なし。そのまま進んだ。";
  } else {
    state.progress = 0;
    item.textContent = hasAnomaly
      ? `見落とし: ${state.current.name}。入口に戻された。`
      : "誤判定: この区画に異変はなかった。入口に戻された。";
  }

  history.prepend(item);
  state.best = Math.max(state.best, state.progress);
  localStorage.setItem("exit-loop-best", String(state.best));
  bestLabel.textContent = String(state.best);
  state.flashUntil = performance.now() + 520;

  if (state.progress >= WIN_TARGET) {
    win();
    return;
  }

  nextRound(
    correct ? "継続" : "リセット",
    correct ? "判断は合っています。次の区画も同じように観察してください。" : "連続記録が途切れました。基準の通路からやり直しです。"
  );
}

function win() {
  state.running = false;
  state.canJudge = false;
  setButtons(false);
  phaseLabel.textContent = "脱出";
  roundNote.textContent = "8区画を抜けました。";
  notice.querySelector("h1").textContent = "出口に到達";
  notice.querySelector("p").textContent = "異変の有無を正しく見極め、地下通路から出られました。もう一度遊ぶと配置は変わります。";
  startButton.textContent = "再開";
  notice.classList.remove("hidden");
}

function toggleFocus(force) {
  if (!state.running) return;
  state.focus = typeof force === "boolean" ? force : !state.focus;
  focusButton.setAttribute("aria-pressed", String(state.focus));
  focusRing.classList.toggle("visible", state.focus);
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

  const pulse = Math.sin(t / 540) * 0.04;
  const flicker = 0.87 + Math.sin(t / 130) * 0.018 + pulse;
  const focusZoom = state.focus ? 1.11 : 1;
  const driftX = (state.mouse.x - 640) * (state.focus ? 0.018 : 0.008);
  const driftY = (state.mouse.y - 360) * (state.focus ? 0.014 : 0.006);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  mapCanvas();
  ctx.translate(640, 360);
  ctx.scale(focusZoom, focusZoom);
  ctx.translate(-640 - driftX, -360 - driftY);

  drawBase(t, flicker);
  drawTiles();
  drawLights(flicker);
  drawFixtures();
  drawExitSign(false);
  drawClock(380, 190, false);
  drawHandrails();

  if (state.current) state.current.draw(t);

  const haze = ctx.createLinearGradient(0, 0, 0, 720);
  haze.addColorStop(0, "rgba(0, 0, 0, 0.16)");
  haze.addColorStop(0.48, "rgba(0, 0, 0, 0.05)");
  haze.addColorStop(1, "rgba(0, 0, 0, 0.28)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, 1280, 720);

  if (state.flashUntil > t) {
    ctx.fillStyle = "rgba(208, 170, 84, 0.08)";
    ctx.fillRect(0, 0, 1280, 720);
  }

  ctx.restore();
}

function drawBase() {
  const wall = ctx.createLinearGradient(0, 0, 1280, 720);
  wall.addColorStop(0, "#1c211e");
  wall.addColorStop(0.5, "#777261");
  wall.addColorStop(1, "#171b18");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, 1280, 720);

  ctx.fillStyle = "#181b18";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(440, 160);
  ctx.lineTo(440, 560);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#1d1c18";
  ctx.beginPath();
  ctx.moveTo(1280, 0);
  ctx.lineTo(840, 160);
  ctx.lineTo(840, 560);
  ctx.lineTo(1280, 720);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#4f4c3f";
  ctx.beginPath();
  ctx.moveTo(440, 160);
  ctx.lineTo(840, 160);
  ctx.lineTo(840, 560);
  ctx.lineTo(440, 560);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#24231d";
  ctx.beginPath();
  ctx.moveTo(440, 560);
  ctx.lineTo(840, 560);
  ctx.lineTo(1280, 720);
  ctx.lineTo(0, 720);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2d2c25";
  ctx.beginPath();
  ctx.moveTo(440, 160);
  ctx.lineTo(840, 160);
  ctx.lineTo(1280, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
}

function drawTiles() {
  ctx.strokeStyle = "rgba(244, 239, 216, 0.15)";
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
}

function drawLights(flicker) {
  for (const [x, y, w] of [[565, 32, 150], [585, 104, 110], [604, 154, 72]]) {
    ctx.fillStyle = `rgba(246, 241, 202, ${0.8 * flicker})`;
    ctx.fillRect(x, y, w, 12);
    const glow = ctx.createRadialGradient(x + w / 2, y + 8, 10, x + w / 2, y + 8, 210);
    glow.addColorStop(0, `rgba(246, 241, 202, ${0.16 * flicker})`);
    glow.addColorStop(1, "rgba(246, 241, 202, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 180, y, w + 360, 250);
  }
}

function drawFixtures() {
  ctx.strokeStyle = "rgba(244, 239, 216, 0.22)";
  ctx.lineWidth = 3;
  ctx.strokeRect(212, 240, 86, 204);
  ctx.strokeRect(1004, 238, 86, 210);

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

function drawPoster(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 92, 136);
  ctx.strokeStyle = "rgba(244, 239, 216, 0.16)";
  ctx.strokeRect(x, y, 92, 136);
  ctx.fillStyle = "#d6d1b8";
  ctx.fillRect(x + 14, y + 22, 64, 12);
  ctx.fillRect(x + 14, y + 48, 50, 7);
  ctx.fillRect(x + 14, y + 64, 56, 7);
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
  ctx.strokeStyle = "rgba(216, 205, 166, 0.38)";
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
focusButton.addEventListener("click", () => toggleFocus());

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
    else toggleFocus(true);
  }
  if (!state.running && event.key === "Enter") startGame();
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space" && state.running) toggleFocus(false);
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
requestAnimationFrame(loop);
