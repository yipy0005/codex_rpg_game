const state = {
  level: 1,
  xp: 0,
  xpToLevel: 100,
  maxHp: 100,
  hp: 100,
  energy: 5,
  enemy: null,
};

const moves = [
  { name: "Library Curation", type: "data", cost: 1, base: 12 },
  { name: "Virtual Screening", type: "model", cost: 2, base: 20 },
  { name: "Docking Strike", type: "chemistry", cost: 2, base: 22 },
  { name: "ADMET Scan", type: "biology", cost: 1, base: 14 },
  { name: "Molecular Dynamics", type: "physics", cost: 3, base: 28 },
  { name: "Lead Optimization", type: "chemistry", cost: 2, base: 18 },
];

const threats = [
  { name: "Noisy Dataset", weakness: "data", hp: 55, attack: 9 },
  { name: "False Positives", weakness: "biology", hp: 60, attack: 10 },
  { name: "Overfitting Phantom", weakness: "model", hp: 70, attack: 11 },
  { name: "Flexible Protein Mirage", weakness: "physics", hp: 74, attack: 12 },
  { name: "Lab Validation Wraith", weakness: "chemistry", hp: 80, attack: 13 },
];

const refs = {
  playerLevel: document.querySelector("#player-level"),
  playerHp: document.querySelector("#player-hp"),
  playerEnergy: document.querySelector("#player-energy"),
  playerXp: document.querySelector("#player-xp"),
  enemyName: document.querySelector("#enemy-name"),
  enemyHp: document.querySelector("#enemy-hp"),
  enemyWeakness: document.querySelector("#enemy-weakness"),
  spawnBtn: document.querySelector("#spawn-btn"),
  restBtn: document.querySelector("#rest-btn"),
  moves: document.querySelector("#moves"),
  log: document.querySelector("#log"),
};

function renderMoves() {
  moves.forEach((move) => {
    const button = document.createElement("button");
    button.className = "move-btn";
    button.textContent = `${move.name} (${move.cost}⚡)`;
    button.addEventListener("click", () => useMove(move));
    refs.moves.append(button);
  });
}

function rand(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function log(message, mood = "") {
  const item = document.createElement("p");
  item.className = `log-entry ${mood}`.trim();
  item.textContent = message;
  refs.log.prepend(item);
}

function refreshUI() {
  refs.playerLevel.textContent = `Level ${state.level}`;
  refs.playerHp.textContent = `HP: ${Math.max(0, state.hp)} / ${state.maxHp}`;
  refs.playerEnergy.textContent = `Energy: ${state.energy}`;
  refs.playerXp.textContent = `XP: ${state.xp} / ${state.xpToLevel}`;

  if (!state.enemy) {
    refs.enemyName.textContent = "No active threat";
    refs.enemyHp.textContent = "HP: --";
    refs.enemyWeakness.textContent = "Weak to: --";
  } else {
    refs.enemyName.textContent = state.enemy.name;
    refs.enemyHp.textContent = `HP: ${Math.max(0, state.enemy.hp)}`;
    refs.enemyWeakness.textContent = `Weak to: ${state.enemy.weakness}`;
  }

  const inBattle = Boolean(state.enemy);
  document.querySelectorAll(".move-btn").forEach((btn) => {
    btn.disabled = !inBattle || state.hp <= 0;
  });
  refs.spawnBtn.disabled = inBattle || state.hp <= 0;
}

function levelUpIfNeeded() {
  if (state.xp < state.xpToLevel) return;
  state.xp -= state.xpToLevel;
  state.level += 1;
  state.xpToLevel = Math.floor(state.xpToLevel * 1.25);
  state.maxHp += 12;
  state.hp = state.maxHp;
  state.energy = Math.min(7 + Math.floor(state.level / 2), 12);
  log(`Level up! You are now level ${state.level}. HP and energy fully restored.`, "good");
}

function spawnThreat() {
  if (state.enemy || state.hp <= 0) return;
  const t = rand(threats);
  const hpScale = 1 + (state.level - 1) * 0.22;
  const atkScale = 1 + (state.level - 1) * 0.15;

  state.enemy = {
    name: t.name,
    weakness: t.weakness,
    hp: Math.floor(t.hp * hpScale),
    attack: Math.floor(t.attack * atkScale),
  };

  log(`A wild ${state.enemy.name} appears! Weakness: ${state.enemy.weakness}.`);
  refreshUI();
}

function enemyTurn() {
  if (!state.enemy) return;
  const damage = Math.floor(state.enemy.attack * (0.8 + Math.random() * 0.5));
  state.hp -= damage;
  log(`${state.enemy.name} disrupts your workflow for ${damage} damage.`, "bad");
  if (state.hp <= 0) {
    log("You were overwhelmed by scientific chaos. Rest to continue the mission.", "bad");
    state.enemy = null;
  }
}

function useMove(move) {
  if (!state.enemy || state.hp <= 0) return;
  if (state.energy < move.cost) {
    log(`Not enough energy to use ${move.name}.`, "bad");
    refreshUI();
    return;
  }

  state.energy -= move.cost;
  let damage = Math.floor(move.base + Math.random() * 8 + state.level * 2.2);

  if (move.type === state.enemy.weakness) {
    damage = Math.floor(damage * 1.6);
    log(`Super effective ${move.name}! ${damage} damage dealt.`, "good");
  } else {
    log(`${move.name} hits for ${damage} damage.`);
  }

  state.enemy.hp -= damage;
  if (state.enemy.hp <= 0) {
    const earned = 42 + state.level * 9;
    state.xp += earned;
    log(`Threat neutralized! You gain ${earned} XP.`, "good");
    state.enemy = null;
    levelUpIfNeeded();
  } else {
    enemyTurn();
  }

  refreshUI();
}

function rest() {
  if (state.enemy) {
    log("Cannot rest during a live challenge.", "bad");
    return;
  }

  const heal = Math.floor(state.maxHp * 0.35);
  state.hp = Math.min(state.maxHp, state.hp + heal);
  state.energy = Math.min(5 + Math.floor(state.level / 2), 12);
  log(`You rest, recover ${heal} HP, and recalibrate your tools.`, "good");
  refreshUI();
}

refs.spawnBtn.addEventListener("click", spawnThreat);
refs.restBtn.addEventListener("click", rest);

renderMoves();
refreshUI();
log("Welcome, Hunter. Build your pipeline and defeat research bottlenecks.");
