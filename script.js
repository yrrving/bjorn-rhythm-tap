const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const missesEl = document.getElementById("misses");
const feedbackEl = document.getElementById("feedback");
const startButton = document.getElementById("startButton");
const songSelect = document.getElementById("songSelect");
const difficultySelect = document.getElementById("difficultySelect");
const songTitleEl = document.getElementById("songTitle");
const songProgressEl = document.getElementById("songProgress");
const songTimeEl = document.getElementById("songTime");
const resultsPanel = document.getElementById("resultsPanel");
const finalScoreEl = document.getElementById("finalScore");
const finalComboEl = document.getElementById("finalCombo");
const finalMissesEl = document.getElementById("finalMisses");
const resultMessageEl = document.getElementById("resultMessage");
const donButton = document.getElementById("donButton");
const kaButton = document.getElementById("kaButton");

const laneY = 230;
const hitX = 176;
const spawnX = 1040;
const travelTime = 2250;
const perfectWindow = 70;
const goodWindow = 145;
const missWindow = 185;
const endPadding = 1900;

const songs = {
  "bjorn-tune": {
    title: "Björn Tune",
    src: "songs/bjorn-tune.wav",
    bpm: 124,
    offset: 1080,
    duration: 127.88,
    phrase: "Björn groove",
  },
};

const difficulty = {
  easy: { label: "Easy", score: 1, phraseBeats: [0, 1, 2, 3, 4, 5, 6, 7] },
  normal: { label: "Normal", score: 1.15, phraseBeats: [0, 0.5, 1.5, 2, 3, 4, 4.5, 5.5, 6, 7] },
  hard: { label: "Hard", score: 1.35, phraseBeats: [0, 0.5, 1, 1.5, 2.5, 3, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5] },
};

const sprites = {
  bjorn: loadSprite("sprites/bjorn_peace.png?v=graph-clean-2"),
  don: loadSprite("sprites/note_don.png?v=graph-clean-2"),
  ka: loadSprite("sprites/note_ka.png?v=graph-clean-2"),
  perfect: loadSprite("sprites/judgement_perfect.png?v=graph-clean-2"),
};

function loadSprite(src) {
  const image = new Image();
  image.src = src;
  image.addEventListener("load", () => {
    draw(running ? currentSongTime(performance.now()) : 0, performance.now());
  });
  return image;
}

let audioCtx;
let songAudio = new Audio();
let musicPlaying = false;
let activeSong = songs["bjorn-tune"];
let beatMs = 60000 / activeSong.bpm;
let notes = [];
let score = 0;
let combo = 0;
let maxCombo = 0;
let misses = 0;
let running = false;
let startTime = 0;
let animationFrame = 0;
let lastBeat = -1;
let lastInputFlash = { don: 0, ka: 0 };
let floatingTexts = [];

songAudio.preload = "auto";
songAudio.volume = 0.72;
songAudio.addEventListener("ended", () => {
  if (running) endGame();
});

function buildBeatmap(levelName, song) {
  beatMs = 60000 / song.bpm;
  const pattern = difficulty[levelName].phraseBeats;
  const durationMs = getSongDurationMs(song);
  const lastHit = Math.max(song.offset + beatMs * 8, durationMs - 1800);
  const generated = [];
  let index = 0;

  for (let phraseStart = 0; song.offset + phraseStart * beatMs < lastHit; phraseStart += 8) {
    pattern.forEach((beatInPhrase) => {
      const beat = phraseStart + beatInPhrase;
      const hitTime = song.offset + beat * beatMs;
      if (hitTime > lastHit) return;
      generated.push({
        id: `${songSelect.value}-${levelName}-${index}`,
        type: chooseType(index, beat, levelName, song),
        hitTime,
        judged: false,
      });
      index += 1;
    });
  }

  return generated;
}

function getSongDurationMs(song) {
  const audioDuration = Number.isFinite(songAudio.duration) ? songAudio.duration : song.duration;
  return (audioDuration || song.duration) * 1000;
}

function chooseType(index, beat, levelName, song) {
  const shifted = song.title.includes("2") ? index + 1 : index;
  if (levelName === "easy") return shifted % 3 === 2 ? "ka" : "don";
  if (levelName === "hard") return (shifted + Math.floor(beat)) % 4 < 2 ? "don" : "ka";
  return shifted % 4 === 1 || shifted % 4 === 2 ? "ka" : "don";
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function playTone(kind) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = kind === "ka" ? "triangle" : "sine";
  osc.frequency.setValueAtTime(kind === "ka" ? 540 : kind === "beat" ? 190 : 260, now);
  gain.gain.setValueAtTime(kind === "beat" ? 0.035 : 0.095, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.09);
}

async function startGame() {
  ensureAudio();
  cancelAnimationFrame(animationFrame);
  songAudio.pause();

  activeSong = songs[songSelect.value];
  const levelName = difficultySelect.value;
  songAudio.src = activeSong.src;
  document.body.dataset.startSong = activeSong.title;
  document.body.dataset.startLevel = levelName;
  document.body.dataset.startDuration = String(getSongDurationMs(activeSong));
  notes = buildBeatmap(levelName, activeSong);
  document.body.dataset.builtNotes = String(notes.length);
  score = 0;
  combo = 0;
  maxCombo = 0;
  misses = 0;
  running = true;
  musicPlaying = false;
  startTime = performance.now();
  lastBeat = -1;
  floatingTexts = [];
  resultsPanel.hidden = true;
  startButton.textContent = "Starta om";
  setFeedback(activeSong.phrase, "#f7b829");
  updateHud();
  updateSongStatus(0);

  songAudio.load();
  songAudio.currentTime = 0;
  try {
    await songAudio.play();
    musicPlaying = true;
  } catch (error) {
    musicPlaying = false;
    setFeedback("Metronomläge", "#37b5c3");
  }

  animationFrame = requestAnimationFrame(loop);
}

function currentSongTime(now) {
  if (musicPlaying && Number.isFinite(songAudio.currentTime)) {
    return songAudio.currentTime * 1000;
  }
  return now - startTime;
}

function loop(now) {
  const t = currentSongTime(now);
  markLateMisses(t);
  playMetronome(t);
  updateSongStatus(t);
  updateDebugDataset(t);
  draw(t, now);

  const finalHit = notes.length ? notes[notes.length - 1].hitTime : 0;
  if (!musicPlaying && t > finalHit + endPadding) {
    endGame();
    return;
  }
  if (musicPlaying && songAudio.ended) {
    endGame();
    return;
  }
  animationFrame = requestAnimationFrame(loop);
}

function playMetronome(t) {
  if (musicPlaying) return;
  const beat = Math.floor((t - activeSong.offset) / beatMs);
  if (beat >= 0 && beat !== lastBeat) {
    lastBeat = beat;
    playTone("beat");
  }
}

function markLateMisses(t) {
  notes.forEach((note) => {
    if (!note.judged && t - note.hitTime > missWindow) {
      note.judged = true;
      combo = 0;
      misses += 1;
      setFeedback("Miss", "#d8c8ad");
      addFloat("Miss", hitX, laneY - 74, "#d8c8ad");
      updateHud();
    }
  });
}

function handleHit(type) {
  if (!running) return;
  const t = currentSongTime(performance.now());
  const candidates = notes
    .filter((note) => !note.judged)
    .map((note) => ({ note, diff: Math.abs(note.hitTime - t) }))
    .filter((entry) => entry.diff <= missWindow)
    .sort((a, b) => a.diff - b.diff);

  if (!candidates.length) {
    combo = 0;
    misses += 1;
    setFeedback("Miss", "#d8c8ad");
    addFloat("Miss", hitX, laneY - 74, "#d8c8ad");
    updateHud();
    playTone(type);
    flashKey(type);
    return;
  }

  const target = candidates[0].note;
  target.judged = true;
  flashKey(type);
  playTone(type);

  if (target.type !== type) {
    combo = 0;
    misses += 1;
    setFeedback("Miss", "#d8c8ad");
    addFloat("Wrong", hitX, laneY - 74, "#d8c8ad");
    updateHud();
    return;
  }

  const diff = candidates[0].diff;
  const levelScale = difficulty[difficultySelect.value].score;
  if (diff <= perfectWindow) {
    combo += 1;
    score += Math.round((900 + combo * 12) * levelScale);
    setFeedback("Perfect", "#f7b829");
    addFloat("Perfect!", hitX, laneY - 88, "#f7b829");
  } else {
    combo += 1;
    score += Math.round((430 + combo * 7) * levelScale);
    setFeedback("Good", "#8aa54e");
    addFloat("Good", hitX, laneY - 88, "#8aa54e");
  }
  maxCombo = Math.max(maxCombo, combo);
  updateHud();
}

function updateHud() {
  scoreEl.textContent = score.toString();
  comboEl.textContent = combo.toString();
  missesEl.textContent = misses.toString();
}

function updateDebugDataset(t = currentSongTime(performance.now())) {
  const next = getNextNoteState(t);
  document.body.dataset.noteCount = String(notes.length);
  document.body.dataset.visibleNotes = String(getVisibleNotes(t).length);
  document.body.dataset.nextNoteType = next ? next.type : "";
  document.body.dataset.nextNoteDiff = next ? String(next.diffMs) : "";
  document.body.dataset.score = String(score);
  document.body.dataset.misses = String(misses);
  document.body.dataset.running = String(running);
}

function updateSongStatus(t) {
  const durationMs = getSongDurationMs(activeSong);
  const clamped = Math.max(0, Math.min(t, durationMs));
  const progress = durationMs ? (clamped / durationMs) * 100 : 0;
  songTitleEl.textContent = activeSong.title;
  songProgressEl.style.width = `${progress.toFixed(2)}%`;
  songTimeEl.textContent = `${formatTime(clamped / 1000)} / ${formatTime(durationMs / 1000)}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const rest = String(safe % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function waitForMetadata() {
  if (Number.isFinite(songAudio.duration) && songAudio.duration > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      songAudio.removeEventListener("loadedmetadata", done);
      songAudio.removeEventListener("error", done);
      resolve();
    };
    songAudio.addEventListener("loadedmetadata", done, { once: true });
    songAudio.addEventListener("error", done, { once: true });
    setTimeout(done, 900);
  });
}

function setFeedback(text, color) {
  feedbackEl.textContent = text;
  feedbackEl.style.color = color;
}

function addFloat(text, x, y, color) {
  floatingTexts.push({ text, x, y, color, born: performance.now() });
}

function flashKey(type) {
  const key = type === "don" ? donButton : kaButton;
  key.classList.add("active");
  lastInputFlash[type] = performance.now();
  setTimeout(() => key.classList.remove("active"), 110);
}

function endGame() {
  running = false;
  musicPlaying = false;
  cancelAnimationFrame(animationFrame);
  songAudio.pause();
  finalScoreEl.textContent = score.toString();
  finalComboEl.textContent = maxCombo.toString();
  finalMissesEl.textContent = misses.toString();
  resultMessageEl.textContent = getResultMessage();
  resultsPanel.hidden = false;
  feedbackEl.textContent = "Klar";
  updateSongStatus(getSongDurationMs(activeSong));
  draw(getSongDurationMs(activeSong), performance.now());
}

function getResultMessage() {
  if (misses === 0) return "Full combo! Björn gör segertecknet.";
  if (maxCombo >= 16) return "Snyggt flyt. Björn hoppar nästan hela vägen.";
  if (score > 9000) return "Stabilt groove. Testa Hard med nästa Björn-låt.";
  return "Värm upp med Easy och följ Björns puls.";
}

function draw(t, now) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground(t);
  drawLane();
  drawHitTarget(now);
  drawNotes(t);
  drawBjorn(now);
  drawFloatingText(now);
  if (!running) drawMenuHint();
}

function drawBackground(t) {
  const pulse = Math.sin(t / 220) * 0.5 + 0.5;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#071019");
  gradient.addColorStop(0.48, "#132334");
  gradient.addColorStop(1, "#09070b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 186, 39, 0.86)";
  for (let i = 0; i < 12; i += 1) {
    const x = (i * 109 + t * 0.02) % canvas.width;
    const y = 36 + (i * 31) % 142;
    drawStar(x, y, 4 + pulse * 2);
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.46)";
  ctx.fillRect(0, 350, canvas.width, 80);
  ctx.fillStyle = "rgba(255, 239, 197, 0.74)";
  for (let x = 38; x < canvas.width; x += 92) {
    ctx.fillRect(x, 360 + Math.sin((t + x) / 280) * 7, 40, 50);
  }

  drawRoomShelf(t);
}

function drawRoomShelf(t) {
  ctx.save();
  ctx.globalAlpha = 0.58;
  ctx.fillStyle = "#05090e";
  ctx.fillRect(696, 44, 278, 96);
  ctx.fillStyle = "#ffefc5";
  for (let i = 0; i < 9; i += 1) {
    ctx.fillRect(714 + i * 27, 62 + (i % 3) * 8, 14, 58 - (i % 2) * 12);
  }
  ctx.fillStyle = "#2f6539";
  ctx.beginPath();
  ctx.ellipse(1000, 118 + Math.sin(t / 300) * 2, 22, 42, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLane() {
  roundRect(92, 142, 930, 176, 28, "rgba(255, 239, 197, 0.12)", "rgba(255, 239, 197, 0.38)", 4);
  roundRect(132, 184, 850, 92, 22, "rgba(0, 0, 0, 0.72)", "rgba(255, 186, 39, 0.58)", 3);

  ctx.strokeStyle = "rgba(247, 184, 41, 0.34)";
  ctx.lineWidth = 2;
  for (let x = hitX; x < 982; x += 86) {
    ctx.beginPath();
    ctx.moveTo(x, 188);
    ctx.lineTo(x, 272);
    ctx.stroke();
  }
}

function drawHitTarget(now) {
  const flash = Math.max(lastInputFlash.don, lastInputFlash.ka);
  const age = now - flash;
  const glow = age < 160 ? 1 - age / 160 : 0;
  ctx.save();
  ctx.translate(hitX, laneY);
  ctx.strokeStyle = `rgba(247, 184, 41, ${0.62 + glow * 0.35})`;
  ctx.lineWidth = 6 + glow * 5;
  ctx.beginPath();
  ctx.arc(0, 0, 49 + glow * 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 239, 197, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(247, 184, 41, 0.16)";
  ctx.fillRect(-2, -72, 4, 144);
  ctx.restore();
}

function drawNotes(t) {
  notes.forEach((note) => {
    if (note.judged) return;
    const progress = (note.hitTime - t) / travelTime;
    const x = hitX + (spawnX - hitX) * progress;
    if (x < hitX - 90 || x > spawnX + 80) return;
    drawNote(x, laneY, note.type, Math.abs(note.hitTime - t));
  });
}

function drawNote(x, y, type, timingDiff) {
  const color = type === "don" ? "#e95b25" : "#37b5c3";
  const eye = "#20160d";
  const near = timingDiff < goodWindow;
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = near ? "rgba(247, 184, 41, 0.72)" : "rgba(0, 0, 0, 0.32)";
  ctx.shadowBlur = near ? 18 : 8;
  ctx.strokeStyle = "#20160d";
  ctx.lineWidth = 4;
  ctx.fillStyle = "#ffefc5";
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 23, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = type === "don" ? "#9b2c1b" : "#0b6482";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = eye;
  ctx.beginPath();
  ctx.arc(-8, -4, 3.2, 0, Math.PI * 2);
  ctx.arc(8, -4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = eye;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 3, 8, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawBjorn(now) {
  const bounce = Math.sin(now / 155) * 5;
  ctx.save();
  ctx.translate(76, laneY + 71 + bounce);
  ctx.fillStyle = "#20160d";
  ctx.globalAlpha = 0.26;
  ctx.beginPath();
  ctx.ellipse(0, 33, 51, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (sprites.bjorn.complete && sprites.bjorn.naturalWidth) {
    drawSpriteImage(sprites.bjorn, -56, -112, 112, 190);
  }
  ctx.restore();
}

function drawSpriteImage(image, x, y, width, height) {
  if (image.complete && image.naturalWidth) {
    ctx.drawImage(image, x, y, width, height);
  }
}

function drawFloatingText(now) {
  floatingTexts = floatingTexts.filter((item) => now - item.born < 760);
  floatingTexts.forEach((item) => {
    const age = now - item.born;
    const alpha = 1 - age / 760;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = item.color;
    ctx.strokeStyle = "rgba(32, 22, 13, 0.78)";
    ctx.lineWidth = 5;
    ctx.font = "900 34px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.strokeText(item.text, item.x, item.y - age * 0.035);
    ctx.fillText(item.text, item.x, item.y - age * 0.035);
    ctx.restore();
  });
}

function drawMenuHint() {
  ctx.save();
  roundRect(294, 42, 430, 58, 18, "rgba(32, 22, 13, 0.48)", "rgba(255, 239, 197, 0.28)", 2);
  ctx.fillStyle = "rgba(255, 239, 197, 0.94)";
  ctx.font = "900 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Välj låt, starta och spela F / J", 509, 78);
  ctx.restore();
}

function drawStar(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.32, y - size * 0.32);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.32, y + size * 0.32);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.32, y + size * 0.32);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - size * 0.32, y - size * 0.32);
  ctx.closePath();
  ctx.fill();
}

function roundRect(x, y, width, height, radius, fill, stroke, lineWidth) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "f") handleHit("don");
  if (key === "j") handleHit("ka");
  if (event.code === "Space" && !running) startGame();
});

songSelect.addEventListener("change", () => {
  activeSong = songs[songSelect.value];
  setFeedback(activeSong.phrase, "#f7b829");
  updateSongStatus(0);
  draw(0, performance.now());
});

donButton.addEventListener("click", () => handleHit("don"));
kaButton.addEventListener("click", () => handleHit("ka"));
startButton.addEventListener("click", startGame);

window.bjornDebug = {
  getState: () => ({
    activeSong: activeSong.title,
    noteCount: notes.length,
    firstHit: notes.length ? notes[0].hitTime : 0,
    lastHit: notes.length ? notes[notes.length - 1].hitTime : 0,
    durationMs: getSongDurationMs(activeSong),
    running,
    musicPlaying,
    audioTime: songAudio.currentTime,
    score,
    combo,
    misses,
    visibleNotes: getVisibleNotes(currentSongTime(performance.now())).length,
    nextNote: getNextNoteState(currentSongTime(performance.now())),
  }),
  seek: (seconds) => {
    if (Number.isFinite(seconds) && musicPlaying) {
      songAudio.currentTime = Math.max(0, Math.min(seconds, getSongDurationMs(activeSong) / 1000));
    }
  },
};

function getVisibleNotes(t) {
  return notes.filter((note) => {
    if (note.judged) return false;
    const progress = (note.hitTime - t) / travelTime;
    const x = hitX + (spawnX - hitX) * progress;
    return x >= hitX - 90 && x <= spawnX + 80;
  });
}

function getNextNoteState(t) {
  const next = notes.find((note) => !note.judged);
  if (!next) return null;
  const progress = (next.hitTime - t) / travelTime;
  return {
    type: next.type,
    diffMs: Math.round(next.hitTime - t),
    x: Math.round(hitX + (spawnX - hitX) * progress),
  };
}

setFeedback(activeSong.phrase, "#f7b829");
updateSongStatus(0);
updateDebugDataset(0);
draw(0, performance.now());
