const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  role: document.querySelector("#role"),
  hp: document.querySelector("#hp"),
  xp: document.querySelector("#xp"),
  level: document.querySelector("#level"),
  potions: document.querySelector("#potions"),
  controls: document.querySelector("#controls"),
};

const world = {
  width: 3400,
  floor: 525,
  gravity: 0.62,
  platforms: [
    { x: 320, y: 445, w: 210, h: 20 },
    { x: 700, y: 395, w: 245, h: 20 },
    { x: 1130, y: 460, w: 220, h: 20 },
    { x: 1530, y: 370, w: 260, h: 20 },
    { x: 1970, y: 435, w: 240, h: 20 },
    { x: 2450, y: 355, w: 280, h: 20 },
    { x: 2920, y: 430, w: 250, h: 20 },
  ],
};

const roles = ["Data Explorer", "Model Trainer", "Virtual Screening Ace", "Lead Discovery Master"];

const player = {
  x: 120,
  y: 160,
  w: 56,
  h: 96,
  vx: 0,
  vy: 0,
  facing: 1,
  speed: 4.6,
  jump: -13.5,
  onGround: false,
  hp: 120,
  maxHp: 120,
  xp: 0,
  xpNeed: 120,
  level: 1,
  role: roles[0],
  potions: 3,
  attackCD: 0,
  skillCD: 0,
  hurtCD: 0,
};

const enemies = [];
const particles = [];
const keys = new Set();
let cameraX = 0;
let done = false;

function makeEnemy(x, type) {
  const types = {
    slime: { name: "Noisy Data Slime", hp: 40, dmg: 9, speed: 1.4, w: 58, h: 44, c1: "#81ffd6", c2: "#48d8a8" },
    mimic: { name: "False Positive Mimic", hp: 55, dmg: 12, speed: 1.2, w: 60, h: 60, c1: "#ffd29a", c2: "#f09c5a" },
    bat: { name: "Overfit Bat", hp: 34, dmg: 10, speed: 2.1, w: 52, h: 32, c1: "#caadff", c2: "#8669db" },
  };
  const t = types[type];
  enemies.push({ ...t, type, x, y: world.floor - t.h, dir: Math.random() > 0.5 ? 1 : -1, flash: 0, phase: Math.random() * 9 });
}

function seedEnemies() {
  enemies.length = 0;
  const seq = ["slime", "bat", "mimic", "slime", "bat", "mimic", "slime", "bat", "mimic"];
  for (let i = 0; i < seq.length; i++) makeEnemy(520 + i * 320, seq[i]);
}
seedEnemies();

addEventListener("keydown", (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);
  if ([" ", "arrowleft", "arrowright", "arrowup"].includes(key)) e.preventDefault();
  if (key === "j") basicAttack();
  if (key === "k") skillAttack();
  if (key === "h") usePotion();
  if (key === "r") restart();
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnBurst(x, y, color, count = 16, power = 5) {
  for (let i = 0; i < count; i++) {
    particles.push({ x, y, vx: (Math.random() - 0.5) * power, vy: (Math.random() - 0.5) * power, life: 24 + Math.random() * 12, color });
  }
}

function gainXP(v) {
  player.xp += v;
  while (player.xp >= player.xpNeed) {
    player.xp -= player.xpNeed;
    player.level += 1;
    player.xpNeed = Math.floor(player.xpNeed * 1.25);
    player.maxHp += 12;
    player.hp = player.maxHp;
    player.potions += 1;
    player.role = roles[Math.min(roles.length - 1, Math.floor((player.level - 1) / 2))];
    spawnBurst(player.x + player.w / 2, player.y + 20, "#ffdf74", 30, 7);
  }
}

function basicAttack() {
  if (player.attackCD > 0 || player.hp <= 0 || done) return;
  player.attackCD = 16;
  const hit = { x: player.facing > 0 ? player.x + player.w : player.x - 64, y: player.y + 18, w: 64, h: 50 };
  enemies.forEach((e) => {
    if (!overlap(hit, e)) return;
    e.hp -= 14 + player.level * 2;
    e.flash = 5;
    spawnBurst(e.x + e.w / 2, e.y + e.h / 2, "#fff4b2", 12, 4);
    if (e.hp <= 0) {
      gainXP(32);
      spawnBurst(e.x + e.w / 2, e.y + e.h / 2, "#95e8ff", 24, 7);
    }
  });
}

function skillAttack() {
  if (player.skillCD > 0 || player.hp <= 0 || done) return;
  player.skillCD = 80;
  const range = { x: player.x - 60, y: player.y - 20, w: player.w + 120, h: player.h + 40 };
  enemies.forEach((e) => {
    if (!overlap(range, e)) return;
    e.hp -= 24 + player.level * 3;
    e.flash = 8;
    spawnBurst(e.x + e.w / 2, e.y + e.h / 2, "#8ff5ff", 18, 6);
    if (e.hp <= 0) gainXP(40);
  });
}

function usePotion() {
  if (player.potions <= 0 || player.hp <= 0 || done) return;
  player.potions -= 1;
  player.hp = Math.min(player.maxHp, player.hp + 46);
  spawnBurst(player.x + player.w / 2, player.y + 30, "#7fffd8", 20, 6);
}

function groundCollide(body) {
  body.onGround = false;
  const floorY = world.floor - body.h;
  if (body.y >= floorY) {
    body.y = floorY;
    body.vy = 0;
    body.onGround = true;
  }
  world.platforms.forEach((p) => {
    const withinX = body.x + body.w > p.x && body.x < p.x + p.w;
    const fallingOn = body.y + body.h <= p.y + body.vy + 3 && body.y + body.h + body.vy >= p.y;
    if (withinX && fallingOn && body.vy >= 0) {
      body.y = p.y - body.h;
      body.vy = 0;
      body.onGround = true;
    }
  });
}

function updatePlayer() {
  if (player.hp <= 0) return;
  player.vx = 0;
  if (keys.has("a") || keys.has("arrowleft")) {
    player.vx = -player.speed;
    player.facing = -1;
  }
  if (keys.has("d") || keys.has("arrowright")) {
    player.vx = player.speed;
    player.facing = 1;
  }
  if ((keys.has("w") || keys.has(" ") || keys.has("arrowup")) && player.onGround) {
    player.vy = player.jump;
    player.onGround = false;
  }

  player.vy += world.gravity;
  player.x = Math.max(0, Math.min(world.width - player.w, player.x + player.vx));
  player.y += player.vy;
  groundCollide(player);

  if (player.attackCD > 0) player.attackCD--;
  if (player.skillCD > 0) player.skillCD--;
  if (player.hurtCD > 0) player.hurtCD--;
}

function updateEnemies() {
  enemies.forEach((e) => {
    e.phase += 0.08;
    e.x += e.dir * e.speed;
    if (e.x < 20 || e.x > world.width - e.w - 20) e.dir *= -1;

    if (e.type === "bat") {
      e.y = world.floor - e.h - 45 + Math.sin(e.phase) * 22;
    }

    if (overlap(player, e) && player.hurtCD <= 0 && player.hp > 0) {
      player.hp -= e.dmg;
      player.hurtCD = 36;
      spawnBurst(player.x + player.w / 2, player.y + 25, "#ff96a4", 14, 5);
      if (player.hp <= 0) {
        player.hp = 0;
        done = true;
      }
    }

    if (e.flash > 0) e.flash--;
  });

  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].hp <= 0) enemies.splice(i, 1);
  if (!done && enemies.length === 0) done = true;
}

function updateParticles() {
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life -= 1;
  });
  for (let i = particles.length - 1; i >= 0; i--) if (particles[i].life <= 0) particles.splice(i, 1);
}

function updateCamera() {
  const target = player.x - canvas.width / 2 + player.w / 2;
  cameraX += (target - cameraX) * 0.08;
  cameraX = Math.max(0, Math.min(world.width - canvas.width, cameraX));
}

function drawSky() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#9de5ff");
  grad.addColorStop(1, "#d5f9ff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 8; i++) {
    const x = ((i * 220 - cameraX * 0.23) % (canvas.width + 260)) - 100;
    const y = 70 + (i % 3) * 35;
    drawCloud(x, y, 1.1 + (i % 2) * 0.4);
  }

  ctx.fillStyle = "#7dc462";
  ctx.fillRect(0, world.floor + 6, canvas.width, canvas.height - world.floor);
  ctx.fillStyle = "#9ddf84";
  ctx.fillRect(0, world.floor - 6, canvas.width, 12);
}

function drawCloud(x, y, s = 1) {
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(x, y, 45 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 35 * s, y + 6 * s, 32 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 35 * s, y + 8 * s, 30 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlatform(p) {
  const x = p.x - cameraX;
  if (x > canvas.width || x + p.w < -40) return;
  ctx.fillStyle = "#9c6942";
  ctx.fillRect(x, p.y, p.w, p.h);
  ctx.fillStyle = "#7e5233";
  ctx.fillRect(x, p.y + 10, p.w, 10);
  ctx.fillStyle = "#b9f087";
  ctx.fillRect(x, p.y - 8, p.w, 10);
}

function drawHunter() {
  const x = player.x - cameraX;
  const y = player.y;
  const bob = player.onGround ? 0 : Math.sin(Date.now() * 0.015) * 1.8;

  ctx.save();
  ctx.translate(x, y + bob);
  if (player.hurtCD > 0 && Math.floor(player.hurtCD / 3) % 2 === 0) ctx.globalAlpha = 0.5;

  // coat
  ctx.fillStyle = "#f2f7ff";
  roundRect(6, 26, 42, 56, 12, true);
  ctx.fillStyle = "#d5e3f7";
  roundRect(6, 26, 42, 12, 8, true);

  // shirt
  const coreGrad = ctx.createLinearGradient(0, 0, 0, 70);
  coreGrad.addColorStop(0, "#1c3248");
  coreGrad.addColorStop(1, "#0f2136");
  ctx.fillStyle = coreGrad;
  roundRect(16, 32, 24, 40, 8, true);

  // head/hair/goggles
  ctx.fillStyle = "#ffd3b0";
  ctx.beginPath();
  ctx.arc(28, 16, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2f1f1d";
  ctx.beginPath();
  ctx.arc(27, 10, 15, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#3ec9f3";
  roundRect(16, 10, 10, 6, 2, true);
  roundRect(29, 10, 10, 6, 2, true);

  // legs/boots
  ctx.fillStyle = "#1f2d40";
  roundRect(16, 74, 10, 18, 4, true);
  roundRect(30, 74, 10, 18, 4, true);
  ctx.fillStyle = "#7d512d";
  roundRect(12, 88, 16, 8, 3, true);
  roundRect(28, 88, 16, 8, 3, true);

  // attack effect
  if (player.attackCD > 8 || player.skillCD > 68) {
    ctx.strokeStyle = player.skillCD > 68 ? "#75f0ff" : "#ffce6b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    const sx = player.facing > 0 ? 52 : 4;
    ctx.arc(sx, 46, player.skillCD > 68 ? 36 : 24, -0.8, 0.8);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCompanion(x, y, type) {
  ctx.save();
  ctx.translate(x - cameraX, y);
  if (type === "solvy") {
    const g = ctx.createRadialGradient(20, 20, 3, 20, 20, 24);
    g.addColorStop(0, "#afffff");
    g.addColorStop(1, "#51c7f2");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(20, 20, 20, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#173f7a";
    roundRect(0, 0, 40, 32, 7, true);
    ctx.fillStyle = "#50ddff";
    ctx.fillRect(8, 9, 24, 14);
  }
  ctx.restore();
}

function drawEnemy(e) {
  const x = e.x - cameraX;
  const y = e.y;
  ctx.save();
  if (e.flash > 0) ctx.filter = "brightness(1.5)";

  if (e.type === "slime") {
    const g = ctx.createLinearGradient(x, y, x, y + e.h);
    g.addColorStop(0, e.c1);
    g.addColorStop(1, e.c2);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x + e.w / 2, y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === "bat") {
    ctx.fillStyle = e.c2;
    ctx.beginPath();
    ctx.ellipse(x + e.w / 2, y + e.h / 2, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.c1;
    ctx.fillRect(x + 2, y + 10, 14, 5);
    ctx.fillRect(x + e.w - 16, y + 10, 14, 5);
  } else {
    ctx.fillStyle = e.c2;
    roundRect(x, y, e.w, e.h, 9, true);
    ctx.fillStyle = e.c1;
    roundRect(x + 8, y + 10, e.w - 16, 16, 6, true);
  }

  ctx.fillStyle = "#14324a";
  ctx.fillRect(x + 16, y + 12, 6, 6);
  ctx.fillRect(x + e.w - 22, y + 12, 6, 6);

  // hp bar
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 4, y - 10, e.w - 8, 5);
  ctx.fillStyle = "#7dff9c";
  ctx.fillRect(x + 4, y - 10, (e.w - 8) * Math.max(0, e.hp) / (e.type === "mimic" ? 55 : e.type === "slime" ? 40 : 34), 5);

  ctx.restore();
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x - cameraX, p.y, 2.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawStatusText() {
  ctx.fillStyle = "rgba(10,22,42,0.7)";
  roundRect(20, canvas.height - 74, 410, 52, 10, true);
  ctx.fillStyle = "#eaf8ff";
  ctx.font = "22px Trebuchet MS";
  if (!done) ctx.fillText("Clear the map of research bottlenecks!", 35, canvas.height - 40);
  else if (player.hp > 0) ctx.fillText("Stage Cleared! Press R for a new run.", 35, canvas.height - 40);
  else ctx.fillText("Mission Failed. Press R to retry.", 35, canvas.height - 40);
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  if (fill) ctx.fill();
}

function render() {
  drawSky();
  world.platforms.forEach(drawPlatform);
  drawCompanion(player.x - 70, player.y + 48, "solvy");
  drawCompanion(player.x + 78, player.y + 55, "bytee");
  enemies.forEach(drawEnemy);
  drawHunter();
  drawParticles();
  drawStatusText();
}

function syncUI() {
  ui.role.textContent = player.role;
  ui.hp.textContent = `${Math.floor(player.hp)} / ${player.maxHp}`;
  ui.xp.textContent = `${player.xp} / ${player.xpNeed}`;
  ui.level.textContent = `${player.level}`;
  ui.potions.textContent = `${player.potions}`;
  ui.controls.style.opacity = done ? "0.35" : "1";
}

function restart() {
  player.x = 120;
  player.y = 160;
  player.vx = 0;
  player.vy = 0;
  player.hp = player.maxHp;
  player.potions = Math.max(3, player.potions);
  player.attackCD = 0;
  player.skillCD = 0;
  player.hurtCD = 0;
  done = false;
  seedEnemies();
  particles.length = 0;
}

function tick() {
  updatePlayer();
  if (!done) updateEnemies();
  updateParticles();
  updateCamera();
  render();
  syncUI();
  requestAnimationFrame(tick);
}

tick();
