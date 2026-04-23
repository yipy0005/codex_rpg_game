const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const ui = {
  role: document.querySelector("#role"),
  hp: document.querySelector("#hp"),
  xp: document.querySelector("#xp"),
  level: document.querySelector("#level"),
  potions: document.querySelector("#potions"),
  overlay: document.querySelector("#overlay"),
};

const world = {
  width: 3200,
  gravity: 0.65,
  floorY: 520,
  platforms: [
    { x: 260, y: 455, w: 190, h: 18 },
    { x: 640, y: 400, w: 220, h: 18 },
    { x: 1040, y: 460, w: 210, h: 18 },
    { x: 1430, y: 385, w: 240, h: 18 },
    { x: 1840, y: 445, w: 180, h: 18 },
    { x: 2300, y: 370, w: 250, h: 18 },
    { x: 2710, y: 435, w: 220, h: 18 },
  ],
};

const player = {
  x: 120,
  y: 100,
  w: 52,
  h: 72,
  vx: 0,
  vy: 0,
  speed: 4.2,
  jump: -13,
  facing: 1,
  onGround: false,
  attackCooldown: 0,
  hitCooldown: 0,
  level: 1,
  xp: 0,
  xpNeed: 100,
  hp: 100,
  maxHp: 100,
  potions: 3,
  role: "Data Explorer",
};

const roles = [
  "Data Explorer",
  "Model Trainer",
  "Virtual Screening Ace",
  "Lead Discovery Master",
];

const keys = new Set();
const enemies = [];
const particles = [];
let cameraX = 0;
let gameOver = false;

function spawnEnemy(x) {
  const roll = Math.random();
  const type = roll < 0.35 ? "slime" : roll < 0.7 ? "bat" : "mimic";
  const base = {
    slime: { name: "Noisy Data Slime", hp: 24, speed: 1.2, color: "#74ff99", dmg: 8, w: 52, h: 38 },
    bat: { name: "Overfit Bat", hp: 18, speed: 2.1, color: "#b48aff", dmg: 7, w: 48, h: 28 },
    mimic: { name: "False Positive Mimic", hp: 34, speed: 1.5, color: "#ff9f79", dmg: 11, w: 55, h: 50 },
  }[type];

  enemies.push({
    ...base,
    type,
    x,
    y: world.floorY - base.h,
    vx: Math.random() < 0.5 ? -1 : 1,
    hitFlash: 0,
  });
}

for (let x = 460; x < world.width - 300; x += 340) spawnEnemy(x);

addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());

  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }

  if (e.key.toLowerCase() === "j") attack();
  if (e.key.toLowerCase() === "h") heal();
  if (e.key.toLowerCase() === "r") restart();
});

addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

function heal() {
  if (player.potions <= 0 || player.hp <= 0) return;
  player.potions -= 1;
  player.hp = Math.min(player.maxHp, player.hp + 40);
  burst(player.x + player.w / 2, player.y + player.h / 3, "#7bffd9", 18);
}

function attack() {
  if (player.attackCooldown > 0 || player.hp <= 0) return;
  player.attackCooldown = 18;

  const range = {
    x: player.facing === 1 ? player.x + player.w : player.x - 55,
    y: player.y + 10,
    w: 55,
    h: 42,
  };

  enemies.forEach((enemy) => {
    if (overlap(range, enemy)) {
      enemy.hp -= 12 + player.level * 2;
      enemy.hitFlash = 5;
      burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#fff5aa", 10);
      if (enemy.hp <= 0) {
        gainXp(26);
        burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#9fe2ff", 22);
      }
    }
  });
}

function gainXp(amount) {
  player.xp += amount;
  if (player.xp < player.xpNeed) return;

  player.level += 1;
  player.xp -= player.xpNeed;
  player.xpNeed = Math.floor(player.xpNeed * 1.28);
  player.maxHp += 14;
  player.hp = player.maxHp;
  player.potions += 1;
  player.role = roles[Math.min(roles.length - 1, Math.floor((player.level - 1) / 2))];

  burst(player.x + player.w / 2, player.y, "#ffd45c", 30);
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function applyPlatformCollision(entity) {
  entity.onGround = false;

  const floorTop = world.floorY - entity.h;
  if (entity.y >= floorTop) {
    entity.y = floorTop;
    entity.vy = 0;
    entity.onGround = true;
  }

  world.platforms.forEach((p) => {
    const standing = entity.x + entity.w > p.x && entity.x < p.x + p.w;
    const fallingOnto = entity.y + entity.h <= p.y + entity.vy + 3 && entity.y + entity.h + entity.vy >= p.y;
    if (standing && fallingOnto && entity.vy >= 0) {
      entity.y = p.y - entity.h;
      entity.vy = 0;
      entity.onGround = true;
    }
  });
}

function updatePlayer() {
  if (player.hp <= 0) {
    player.vx = 0;
    return;
  }

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

  applyPlatformCollision(player);

  if (player.attackCooldown > 0) player.attackCooldown -= 1;
  if (player.hitCooldown > 0) player.hitCooldown -= 1;
}

function updateEnemies() {
  for (const enemy of enemies) {
    enemy.x += enemy.vx * enemy.speed;

    if (enemy.x < 10 || enemy.x > world.width - enemy.w - 10) enemy.vx *= -1;

    const ledgeLeft = enemy.x + enemy.vx * enemy.speed;
    const willFall = !world.platforms.some((p) => ledgeLeft + enemy.w / 2 > p.x && ledgeLeft + enemy.w / 2 < p.x + p.w && enemy.y + enemy.h === p.y);
    if (enemy.y + enemy.h === world.floorY && (enemy.x < 20 || enemy.x > world.width - 90)) enemy.vx *= -1;
    if (willFall && enemy.type !== "bat" && enemy.y + enemy.h !== world.floorY) enemy.vx *= -1;

    if (enemy.type === "bat") enemy.y += Math.sin((Date.now() + enemy.x) * 0.008) * 0.8;

    if (overlap(player, enemy) && player.hitCooldown <= 0 && player.hp > 0) {
      player.hp -= enemy.dmg;
      player.hitCooldown = 35;
      burst(player.x + player.w / 2, player.y + 20, "#ff8b8b", 16);
      if (player.hp <= 0) {
        player.hp = 0;
        gameOver = true;
      }
    }

    if (enemy.hitFlash > 0) enemy.hitFlash -= 1;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].hp <= 0) enemies.splice(i, 1);
  }

  if (enemies.length === 0 && !gameOver) {
    gameOver = true;
  }
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 25 + Math.random() * 10,
      color,
    });
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08;
    p.life -= 1;
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

function updateCamera() {
  const target = player.x - canvas.width / 2 + player.w / 2;
  cameraX += (target - cameraX) * 0.08;
  cameraX = Math.max(0, Math.min(world.width - canvas.width, cameraX));
}

function drawBackground() {
  const t = Date.now() * 0.00005;
  ctx.fillStyle = "#8ed4ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 6; i++) {
    const x = ((i * 300 - cameraX * 0.2 + t * 100) % (canvas.width + 260)) - 130;
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.beginPath();
    ctx.ellipse(x, 140 + (i % 2) * 20, 95, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#76b767";
  ctx.fillRect(0, world.floorY + 10, canvas.width, canvas.height - world.floorY);
}

function drawPlatforms() {
  for (const p of world.platforms) {
    const x = p.x - cameraX;
    if (x < -p.w || x > canvas.width) continue;
    ctx.fillStyle = "#705640";
    ctx.fillRect(x, p.y, p.w, p.h);
    ctx.fillStyle = "#9ed579";
    ctx.fillRect(x, p.y - 8, p.w, 9);
  }
}

function drawPlayer() {
  const x = player.x - cameraX;
  ctx.save();
  if (player.hitCooldown > 0 && Math.floor(player.hitCooldown / 3) % 2 === 0) ctx.globalAlpha = 0.4;

  ctx.fillStyle = "#1f2d3d";
  ctx.fillRect(x + 12, player.y + 24, 28, 44);
  ctx.fillStyle = "#eff9ff";
  ctx.fillRect(x + 6, player.y + 20, 40, 34);
  ctx.fillStyle = "#ffcfa7";
  ctx.beginPath();
  ctx.arc(x + 26, player.y + 16, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#40d2ff";
  const bladeX = player.facing === 1 ? x + player.w + 8 : x - 16;
  if (player.attackCooldown > 12) {
    ctx.fillRect(bladeX, player.y + 24, 16, 6);
    ctx.fillRect(bladeX + (player.facing === 1 ? 10 : -10), player.y + 22, 10, 10);
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  const x = enemy.x - cameraX;
  ctx.save();
  if (enemy.hitFlash > 0) ctx.filter = "brightness(1.8)";
  ctx.fillStyle = enemy.color;

  if (enemy.type === "slime") {
    ctx.beginPath();
    ctx.ellipse(x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.type === "bat") {
    ctx.beginPath();
    ctx.ellipse(x + enemy.w / 2, enemy.y + enemy.h / 2, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 2, enemy.y + 8, 12, 4);
    ctx.fillRect(x + enemy.w - 14, enemy.y + 8, 12, 4);
  } else {
    ctx.fillRect(x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = "#3f2f25";
    ctx.fillRect(x + 8, enemy.y + 8, enemy.w - 16, 12);
  }

  ctx.fillStyle = "#102439";
  ctx.fillRect(x + 14, enemy.y + 12, 6, 6);
  ctx.fillRect(x + enemy.w - 20, enemy.y + 12, 6, 6);
  ctx.restore();
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = Math.max(0, p.life / 30);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - cameraX, p.y, 4, 4);
  });
  ctx.globalAlpha = 1;
}

function drawLabels() {
  ctx.fillStyle = "rgba(5, 18, 34, 0.58)";
  ctx.fillRect(12, canvas.height - 96, 350, 82);
  ctx.fillStyle = "#ebf8ff";
  ctx.font = "20px Trebuchet MS";
  if (!gameOver) {
    ctx.fillText("Defeat all data-monsters!", 24, canvas.height - 60);
  } else if (player.hp > 0) {
    ctx.fillText("Stage Cleared! Press R to replay.", 24, canvas.height - 60);
  } else {
    ctx.fillText("Mission Failed. Press R to retry.", 24, canvas.height - 60);
  }
}

function render() {
  drawBackground();
  drawPlatforms();
  enemies.forEach(drawEnemy);
  drawPlayer();
  drawParticles();
  drawLabels();
}

function updateUI() {
  ui.hp.textContent = `${Math.floor(player.hp)} / ${player.maxHp}`;
  ui.xp.textContent = `${player.xp} / ${player.xpNeed}`;
  ui.level.textContent = String(player.level);
  ui.potions.textContent = String(player.potions);
  ui.role.textContent = player.role;

  if (gameOver) ui.overlay.style.opacity = "0.25";
}

function restart() {
  player.x = 120;
  player.y = 100;
  player.vx = 0;
  player.vy = 0;
  player.hp = player.maxHp;
  player.potions = Math.max(3, player.potions);
  player.hitCooldown = 0;
  gameOver = false;
  enemies.length = 0;
  for (let x = 460; x < world.width - 300; x += 340) spawnEnemy(x);
}

function loop() {
  updatePlayer();
  if (!gameOver) updateEnemies();
  updateParticles();
  updateCamera();
  render();
  updateUI();
  requestAnimationFrame(loop);
}

loop();
