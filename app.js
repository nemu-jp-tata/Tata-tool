// ========================================
// タタ配置ツール app.js
// ========================================
// ----------------------------------------
// 選択中のモード
// 'monster' または 'chip'
// ----------------------------------------
let currentSelectionMode = 'monster';

// プレイヤーごとの選択されたチップのリスト（最大3枚）
let selectedChipsMap = {
  '1P': [],
  '2P': []
};

// ----------------------------------------
// レベル機能
// ゾンビラッシュのみ使用
// ----------------------------------------
let levelMode = false;
const MAX_LEVEL = 8;

// ========================================
// 発動効果一覧（Buff Summary）の集計・更新
// ゾンビラッシュのみ表示
// 同じ効果名を統合・1P/2Pも統合
// ========================================
function updateBuffSummary() {
  const container = document.getElementById('buffSummaryContainer');
  const content = document.getElementById('buffSummaryContent');

  if (!container || !content) return;

  // ノーマル・道場では発動効果一覧を完全に非表示
  if (currentGridType !== '6') {
    container.style.display = 'none';
    return;
  }

  const cells = document.querySelectorAll('#mainGrid .cell');

  // ----------------------------------------
  // 効果を「効果名」をキーにしてまとめる
  // ----------------------------------------
  const effectMap = new Map();
  let totalMonsterCount = 0;

  cells.forEach(cell => {
    const monsterEl = getCellMonsterElement(cell);
    if (!monsterEl) return;

    totalMonsterCount++;

    const species = monsterEl.dataset.species;
    const tierNum = Number(monsterEl.dataset.tier) || 1;
    const player = monsterEl.dataset.player || '1P';

    if (!species || typeof speciesEffectsMaster === 'undefined') return;

    const master = speciesEffectsMaster[species];

    if (!master) return;

    // --------------------------------------
    // 効果を登録する関数
    // --------------------------------------
    const addEffect = (eff) => {
      if (!eff || !eff.text) return;

      const effectName = String(eff.text).trim();

      if (!effectName) return;

      if (!effectMap.has(effectName)) {
        effectMap.set(effectName, {
          text: effectName,
          type: eff.type || 'other',
          sources: []
        });
      }

      const effect = effectMap.get(effectName);

      // ------------------------------------
      // 同じタタ・同じPの重複登録を防止
      // ------------------------------------
      const alreadyExists = effect.sources.some(source =>
        source.species === species &&
        source.player === player
      );

      if (!alreadyExists) {
        effect.sources.push({
          species: species,
          tier: tierNum,
          player: player
        });
      }
    };

    // --------------------------------------
    // 基本効果
    // --------------------------------------
    if (master.baseEffects && Array.isArray(master.baseEffects)) {
      master.baseEffects.forEach(eff => {
        addEffect(eff);
      });
    }

    // --------------------------------------
    // Tier解放効果
    // --------------------------------------
    if (master.tierEffects) {
      Object.keys(master.tierEffects).forEach(tierKey => {
        if (tierNum >= Number(tierKey)) {
          master.tierEffects[tierKey].forEach(eff => {
            addEffect(eff);
          });
        }
      });
    }
  });

  // ----------------------------------------
  // モンスターがいない場合
  // ----------------------------------------
  if (totalMonsterCount === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';

  // ----------------------------------------
  // HTML生成
  // ----------------------------------------
  let html = '';

  if (effectMap.size === 0) {
    html += `
      <div style="font-size: 11px; color: #64748b;">
        発動中の効果なし
      </div>
    `;
  } else {
    html += `
      <ul style="margin: 0; padding-left: 18px; font-size: 11px; color: #cbd5e1;">
    `;

    const effectOrder = {
      buff: 1,
      debuff: 2,
      heal: 3
    };

    const sortedEffects = Array.from(effectMap.values()).sort((a, b) => {
      return (effectOrder[a.type] || 99) - (effectOrder[b.type] || 99);
    });

    sortedEffects.forEach(effect => {
      const badgeColor =
        effect.type === 'buff'
          ? '#ef4444'
          : effect.type === 'debuff'
            ? '#3b82f6'
            : effect.type === 'heal'
              ? '#22c55e'
              : '#94a3b8';

      // ------------------------------------
      // 発動元をまとめる
      // ------------------------------------
      const sourceText = effect.sources
        .map(source => {
          return `
            <span style="color: #94a3b8; font-size: 10px;">
              [${source.species}]
            </span>
          `;
        })
        .join(' ');

      html += `
        <li style="margin-bottom: 4px;">
          <span style="color: ${badgeColor}; font-weight: 600;">
            ${effect.text}
          </span>
          <span style="margin-left: 5px;">
            ${sourceText}
          </span>
        </li>
      `;
    });

    html += `
      </ul>
    `;
  }

  content.innerHTML = html;
}

// ========================================
// チップセットエリアの表示・非表示
// ========================================
function updateChipsetAreaVisibility(isZombieStage) {
  const chipsetContainer = document.getElementById('chipsetContainer');
  const monsterTitle = document.querySelector('.monster-title');
  const filterDetails = document.querySelector('.filter-details');
  const playerSwitch = document.getElementById('playerSwitchContainer');

  if (chipsetContainer) {
    chipsetContainer.style.display = isZombieStage ? 'block' : 'none';
  }

  if (playerSwitch) {
    playerSwitch.classList.toggle('zombie-mode', isZombieStage);
  }

  let modeSwitch = document.getElementById('selectionModeSwitch');

  if (isZombieStage) {
    if (!modeSwitch) {
      if (monsterTitle) {
        modeSwitch = document.createElement('div');
        modeSwitch.id = 'selectionModeSwitch';
        modeSwitch.style.cssText =
          'display: flex; gap: 8px; margin-bottom: 10px; flex-shrink: 0;';

        modeSwitch.innerHTML = `
          <button id="modeMonsterBtn" class="filter-btn ${currentSelectionMode === 'monster' ? 'active' : ''}" style="flex: 1; padding: 6px; text-align: center; cursor: pointer;">タタ選択</button>
          <button id="modeChipBtn" class="filter-btn ${currentSelectionMode === 'chip' ? 'active' : ''}" style="flex: 1; padding: 6px; text-align: center; cursor: pointer;">チップ選択</button>
        `;

        monsterTitle.after(modeSwitch);

        document.getElementById('modeMonsterBtn')?.addEventListener('click', (e) => {
          e.stopPropagation();

          currentSelectionMode = 'monster';

          document.getElementById('modeMonsterBtn')?.classList.add('active');
          document.getElementById('modeChipBtn')?.classList.remove('active');

          const fd = document.querySelector('.filter-details');

          if (fd) {
            fd.style.display = 'block';
          }

          renderMonsters();
        });

        document.getElementById('modeChipBtn')?.addEventListener('click', (e) => {
          e.stopPropagation();

          currentSelectionMode = 'chip';

          document.getElementById('modeChipBtn')?.classList.add('active');
          document.getElementById('modeMonsterBtn')?.classList.remove('active');

          const fd = document.querySelector('.filter-details');

          if (fd) {
            fd.style.display = 'none';
          }

          renderChips();
        });
      }
    } else {
      modeSwitch.style.display = 'flex';

      const monsterBtn = document.getElementById('modeMonsterBtn');
      const chipBtn = document.getElementById('modeChipBtn');

      if (monsterBtn && chipBtn) {
        if (currentSelectionMode === 'monster') {
          monsterBtn.classList.add('active');
          chipBtn.classList.remove('active');

          if (filterDetails) {
            filterDetails.style.display = 'block';
          }
        } else {
          chipBtn.classList.add('active');
          monsterBtn.classList.remove('active');

          if (filterDetails) {
            filterDetails.style.display = 'none';
          }
        }
      }
    }
  } else {
    if (modeSwitch) {
      modeSwitch.style.display = 'none';
    }

    currentSelectionMode = 'monster';

    if (filterDetails) {
      filterDetails.style.display = 'block';
    }
  }
}

// ========================================
// チップ一覧
// ========================================
function renderChips() {
  monsterGrid.innerHTML = '';

  const selectedChips = selectedChipsMap[currentPlayer];

  const actionArea = document.createElement('div');

  actionArea.style.cssText =
    'grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; background: #1e293b; padding: 8px 12px; border-radius: 6px; box-sizing: border-box; width: 100%; position: sticky; top: 0; z-index: 10;';

  actionArea.innerHTML = `
    <span style="font-size: 12px; color: #cbd5e1; white-space: nowrap;">
      [${currentPlayer}] 選択中:
      <strong id="selectedChipCount" style="color: #4ade80;">
        ${selectedChips.length}
      </strong>
      / 3枚
    </span>

    <button id="setChipsBtn" class="btn" style="background: #2563eb; border-color: #3b82f6; color: #fff; padding: 6px 14px; font-size: 12px; cursor: pointer; white-space: nowrap; flex-shrink: 0;">
      セットする
    </button>
  `;

  monsterGrid.appendChild(actionArea);

  document.getElementById('setChipsBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    applyChipsToSlots();
  });

  chipsetList.forEach(chip => {
    const isSelected = selectedChips.some(c => c.id === chip.id);

    const item = document.createElement('div');

    item.className = `monster-item ${isSelected ? 'active' : ''}`;

    item.style.cssText =
      'position: relative; aspect-ratio: 1 / 1; background: #0f172a; border: 1px solid #334155; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; touch-action: pan-y; padding: 2px; box-sizing: border-box;';

    item.innerHTML = `
      <img class="monster-thumb" src="${chip.img}" alt="${chip.name}" draggable="false" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; pointer-events: none; display: block; margin: auto;" onerror="this.outerHTML='<div class=\\'no-image-badge\\'>🌸 no image 🌸</div>';">
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();

      const index = selectedChips.findIndex(c => c.id === chip.id);

      if (index > -1) {
        selectedChips.splice(index, 1);
      } else {
        if (selectedChips.length >= 3) {
          alert('チップは最大3枚までしか選択できません。');
          return;
        }

        selectedChips.push(chip);
      }

      renderChips();
    });

    monsterGrid.appendChild(item);
  });
}

// ========================================
// チップをスロットへ反映
// ========================================
function applyChipsToSlots() {
  const p1Chips = selectedChipsMap['1P'] || [];
  const p1Slots = document.querySelectorAll('.chipset-slot.p1-slot');

  p1Slots.forEach((slot, index) => {
    slot.innerHTML = '';

    if (p1Chips[index]) {
      const chip = p1Chips[index];

      slot.innerHTML = `
        <img src="${chip.img}" alt="${chip.name}" title="[1P] ${chip.name}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; border-radius: 4px; display: block; margin: auto;" onerror="this.outerHTML='<span style=\\'font-size:9px; color:#fff;\\'>${chip.name}</span>';">
      `;
    }
  });

  const p2Chips = selectedChipsMap['2P'] || [];
  const p2Slots = document.querySelectorAll('.chipset-slot.p2-slot');

  p2Slots.forEach((slot, index) => {
    slot.innerHTML = '';

    if (p2Chips[index]) {
      const chip = p2Chips[index];

      slot.innerHTML = `
        <img src="${chip.img}" alt="${chip.name}" title="[2P] ${chip.name}" style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; border-radius: 4px; display: block; margin: auto;" onerror="this.outerHTML='<span style=\\'font-size:9px; color:#fff;\\'>${chip.name}</span>';">
      `;
    }
  });
}

// ========================================
// モンスターデータ
// ========================================
const allMonsters = rawMonstersData.map(m => ({
  name: m.name,
  species: m.species,
  attr: m.type,
  tier: "T" + m.T,
  tierNum: m.T,
  type: m.role
}));

const speciesTiersMap = {};

allMonsters.forEach(m => {
  if (!speciesTiersMap[m.species]) {
    speciesTiersMap[m.species] = [];
  }

  if (!speciesTiersMap[m.species].includes(m.tierNum)) {
    speciesTiersMap[m.species].push(m.tierNum);
  }
});

Object.keys(speciesTiersMap).forEach(species => {
  speciesTiersMap[species].sort((a, b) => a - b);
});

const baseMonstersMap = new Map();

allMonsters.forEach(m => {
  if (
    !baseMonstersMap.has(m.species) ||
    m.tierNum < baseMonstersMap.get(m.species).tierNum
  ) {
    baseMonstersMap.set(m.species, m);
  }
});

const monstersData = Array.from(baseMonstersMap.values());

// ========================================
// 現在の状態
// ========================================
let currentSelected = null;
let currentAttr = "all";
let currentType = "all";
let currentGridType = localStorage.getItem('monsterBoard_gridType') || '5';
let currentPlayer = "1P";
let draggingItem = null;

const dragGhost = document.getElementById('dragGhost');
const mainGrid = document.getElementById('mainGrid');
const monsterFrame = document.getElementById('monsterFrame');
const playerSwitchContainer = document.getElementById('playerSwitchContainer');
const btn1P = document.getElementById('btn1P');
const btn2P = document.getElementById('btn2P');
const levelBtn = document.getElementById('levelBtn');
const normalStageBtn = document.getElementById('normalStageBtn');
const zombieStageBtn = document.getElementById('zombieStageBtn');
const dojoStageBtn = document.getElementById('dojoStageBtn');
const selectedNameEl = document.getElementById('selectedName');
const boardNotice = document.getElementById('boardNotice');
const boardFrame = document.getElementById('boardFrame');
const monsterGrid = document.getElementById('monsterGrid');

// ========================================
// ガオデン裏技
// 画面のどこでも1.5秒以内に7回タップ
// ========================================
const GAODEN_TAP_MAX = 7;
const GAODEN_TAP_WINDOW = 1500;
const GAODEN_SPECIES = 'ガオデン種';
const GAODEN_ACCESSORY_SRC = 'アクセガオデン.webp';

let gaodenRapidTapCount = 0;
let gaodenLastTapTime = 0;
let gaodenTrickActivated = false;
let gaodenTapTimer = null;

document.addEventListener('click', () => {
  const now = Date.now();

  // すでに発動済みなら何もしない
  if (gaodenTrickActivated) {
    return;
  }

  // 前回タップから時間が空きすぎたら1回目からやり直し
  if (
    gaodenLastTapTime === 0 ||
    now - gaodenLastTapTime > GAODEN_TAP_WINDOW
  ) {
    gaodenRapidTapCount = 1;
  } else {
    gaodenRapidTapCount++;
  }

  gaodenLastTapTime = now;

  // タイマーをリセット
  if (gaodenTapTimer) {
    clearTimeout(gaodenTapTimer);
  }

  gaodenTapTimer = setTimeout(() => {
    gaodenRapidTapCount = 0;
    gaodenLastTapTime = 0;
  }, GAODEN_TAP_WINDOW);

  // ----------------------------------------
  // 7回で発動
  // ----------------------------------------
  if (gaodenRapidTapCount >= GAODEN_TAP_MAX) {
    gaodenTrickActivated = true;

    gaodenRapidTapCount = 0;
    gaodenLastTapTime = 0;

    if (gaodenTapTimer) {
      clearTimeout(gaodenTapTimer);
      gaodenTapTimer = null;
    }

    let changed = false;

    document.querySelectorAll('#mainGrid .cell').forEach(cell => {
      const monsterEl = cell.querySelector('.placed-monster-image');

      if (!monsterEl) {
        return;
      }

      if (monsterEl.dataset.species !== GAODEN_SPECIES) {
        return;
      }

      // 元画像を記録
      monsterEl.dataset.originalSrc =
        monsterEl.dataset.src || monsterEl.src;

      // アクセガオデンへ変更
      monsterEl.src = GAODEN_ACCESSORY_SRC;

      changed = true;
    });

    if (changed) {
      // localStorageには元のガオデン画像を保存する
      // → リロードすると通常のガオデンへ戻る
      saveBoardState();
    }
  }
}, true);

// ========================================
// ドラッグ処理用変数
// ========================================
let dragRafId = null;
let dragPendingX = 0;
let dragPendingY = 0;
let dragUpdatePending = false;

// ========================================
// ドラッグ中のゴースト＋ホバー処理
// 1フレームに1回だけ実行
// ========================================
function scheduleDragUpdate(x, y) {
  dragPendingX = x;
  dragPendingY = y;

  if (dragUpdatePending) {
    return;
  }

  dragUpdatePending = true;

  dragRafId = requestAnimationFrame(() => {
    dragUpdatePending = false;
    dragRafId = null;

    const currentX = dragPendingX;
    const currentY = dragPendingY;

    if (dragGhost) {
      dragGhost.style.transform =
        `translate3d(${currentX - 25}px, ${currentY - 25}px, 0)`;
    }

    updateHoverHighlight(currentX, currentY);
  });
}

// ========================================
// ドラッグ処理キャンセル
// ========================================
function cancelDragUpdate() {
  if (dragRafId !== null) {
    cancelAnimationFrame(dragRafId);
    dragRafId = null;
  }

  dragUpdatePending = false;
}

// ========================================
// ドラッグ中のセル強調
// ========================================
let currentHoveredCell = null;

function updateHoverHighlight(x, y) {
  const dropTarget = document.elementFromPoint(x, y);

  const targetCell =
    dropTarget
      ? dropTarget.closest('.cell, .board-slot')
      : null;

  if (targetCell && mainGrid.contains(targetCell)) {
    if (currentHoveredCell !== targetCell) {
      if (currentHoveredCell) {
        currentHoveredCell.classList.remove('drag-over');
      }

      targetCell.classList.add('drag-over');
      currentHoveredCell = targetCell;
    }
  } else if (currentHoveredCell) {
    currentHoveredCell.classList.remove('drag-over');
    currentHoveredCell = null;
  }
}

function clearHoverHighlight() {
  if (currentHoveredCell) {
    currentHoveredCell.classList.remove('drag-over');
    currentHoveredCell = null;
  }

  cancelDragUpdate();
}

// ========================================
// 互換用ゴースト位置更新
// ========================================
function updateGhostPosition(x, y) {
  scheduleDragUpdate(x, y);
}

// ========================================
// セル内の「キャラクター本体」を取得
// タイプアイコンを追加したため重要
// ========================================
function getCellMonsterElement(cell) {
  return cell.querySelector('.placed-monster-image, .no-image-badge');
}

// ========================================
// モンスターのタイプを取得
// 古い保存データにも対応
// ========================================
function getMonsterType(data) {
  if (data.type) {
    return data.type;
  }

  const found = allMonsters.find(m =>
    m.species === data.species &&
    Number(m.tierNum) === Number(data.tier)
  );

  if (found) {
    return found.type;
  }

  const speciesBase = allMonsters.find(
    m => m.species === data.species
  );

  return speciesBase ? speciesBase.type : '';
}

// ========================================
// レベル表示
// ========================================
function setCellLevel(cell, level) {
  const oldLevel = cell.querySelector('.placed-level');

  if (oldLevel) {
    oldLevel.remove();
  }

  level = Number(level) || 0;

  if (level <= 0) {
    delete cell.dataset.level;
    return;
  }

  if (level > MAX_LEVEL) {
    level = MAX_LEVEL;
  }

  cell.dataset.level = String(level);

  const levelBadge = document.createElement('div');

  levelBadge.className = 'placed-level';
  levelBadge.textContent = `Lv.${level}`;

  cell.appendChild(levelBadge);
}

// ========================================
// レベルモード
// ========================================
function setLevelMode(enabled) {
  if (currentGridType !== '6') {
    enabled = false;
  }

  levelMode = enabled;

  if (levelBtn) {
    levelBtn.classList.toggle('active', enabled);
  }

  if (boardFrame) {
    boardFrame.classList.toggle('level-mode', enabled);
  }

  if (enabled) {
    currentSelected = null;

    if (selectedNameEl) {
      selectedNameEl.textContent = 'なし';
    }

    document
      .querySelectorAll('.monster-item.active')
      .forEach(item => {
        item.classList.remove('active');
      });
  }
}

levelBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  setLevelMode(!levelMode);
});

// ========================================
// 盤面状態保存
// ========================================
function saveBoardState() {
  const cellsData = [];

  document.querySelectorAll('#mainGrid .cell').forEach((cell, index) => {
    const monsterEl = getCellMonsterElement(cell);

    if (monsterEl) {
      const type = getMonsterType({
        species: monsterEl.dataset
          ? monsterEl.dataset.species
          : '',
        tier: monsterEl.dataset
          ? monsterEl.dataset.tier
          : ''
      });

      cellsData.push({
        index: index,

        // アクセガオデン表示中でも元画像を保存
        src:
          monsterEl.dataset && monsterEl.dataset.originalSrc
            ? monsterEl.dataset.originalSrc
            : (
                monsterEl.dataset && monsterEl.dataset.src
                  ? monsterEl.dataset.src
                  : (monsterEl.src || '')
              ),

        species: monsterEl.dataset
          ? monsterEl.dataset.species
          : '',

        tier: monsterEl.dataset
          ? monsterEl.dataset.tier
          : '',

        player: monsterEl.dataset
          ? monsterEl.dataset.player
          : '',

        type: type,

        level: cell.dataset.level || null,

        className: cell.className
      });
    }
  });

  localStorage.setItem(
    'monsterBoard_gridType',
    currentGridType
  );

  localStorage.setItem(
    'monsterBoard_cells',
    JSON.stringify(cellsData)
  );

  localStorage.setItem(
    'monsterBoard_chips',
    JSON.stringify(selectedChipsMap)
  );

  // 保存のタイミングで発動効果一覧も更新
  updateBuffSummary();
}

// ========================================
// 保存状態読み込み
// ========================================
function loadBoardState() {
  const savedCells = JSON.parse(
    localStorage.getItem('monsterBoard_cells') || '[]'
  );

  savedCells.forEach(data => {
    const cell = mainGrid.children[data.index];

    if (cell) {
      fillCellWithMonster(cell, data);

      if (data.level) {
        setCellLevel(cell, data.level);
      }
    }
  });

  const savedChips = JSON.parse(
    localStorage.getItem('monsterBoard_chips') || 'null'
  );

  if (savedChips) {
    selectedChipsMap = savedChips;
  }

  applyChipsToSlots();
  updateBuffSummary();
}

// ========================================
// キャラクターをセルへ配置
// ========================================
function fillCellWithMonster(cell, data) {
  const type = getMonsterType(data);

  const previousLevel =
    data.level ||
    cell.dataset.level ||
    null;

  cell.className =
    data.className ||
    'cell';

  cell.classList.add('has-monster');

  delete cell.dataset.level;

  // --------------------------------------
  // HTML生成
  // --------------------------------------
  cell.innerHTML = `
    <img
      class="placed-monster-image"
      src="${data.src}"
      alt=""
      data-src="${data.src}"
      data-species="${data.species || ''}"
      data-tier="${data.tier || ''}"
      data-player="${data.player || ''}"
      data-type="${type || ''}"
      draggable="false"
      style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; pointer-events: auto; touch-action: none; display: block; margin: auto;"
      onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src='${data.src}'.replace(/\\.webp$/i,'.png');}else if(this.dataset.retry=='1'){this.dataset.retry=2;this.src='${data.src}'.replace(/\\.webp$/i,'.jpg');}else{this.outerHTML='<div class=\\'no-image-badge\\' data-species=\\'${data.species || ''}\\' data-tier=\\'${data.tier || ''}\\' data-player=\\'${data.player || ''}\\'>🌸 no image 🌸</div>';}">
    ${type ? `<img class="placed-type-icon" src="${type}.webp" alt="${type}" draggable="false" onerror="this.style.display='none'">` : ''}
    ${data.tier ? `<div class="tier-badge">T${data.tier}</div>` : ''}
  `;

  if (previousLevel) {
    setCellLevel(cell, previousLevel);
  }

  const targetEl = getCellMonsterElement(cell);

  if (!targetEl) {
    return;
  }

  // ========================================
  // ドラッグ処理
  // ========================================
  targetEl.addEventListener('pointerdown', (e) => {
    e.stopPropagation();

    if (e.button !== 0 && e.pointerType === 'mouse') {
      return;
    }

    if (levelMode) {
      return;
    }

    const pointerId = e.pointerId;
    const startX = e.clientX;
    const startY = e.clientY;

    let isDragging = false;

    const cells = Array.from(mainGrid.children);
    const sourceIndex = cells.indexOf(cell);

    const species =
      targetEl.dataset
        ? targetEl.dataset.species
        : data.species;

    const tier =
      targetEl.dataset
        ? targetEl.dataset.tier
        : data.tier;

    const player =
      targetEl.dataset
        ? targetEl.dataset.player
        : data.player;

    const monsterType =
      targetEl.dataset && targetEl.dataset.type
        ? targetEl.dataset.type
        : type;

    const cellLevel =
      cell.dataset.level ||
      null;

    function onMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!isDragging) {
        if (
          dy < -6 ||
          Math.hypot(dx, dy) > 8
        ) {
          isDragging = true;

          try {
            targetEl.setPointerCapture(pointerId);
          } catch (err) {}

          draggingItem = {
            type: 'board',
            src: data.src,
            species: species,
            tier: tier,
            player: player,
            monsterType: monsterType,
            level: cellLevel,
            sourceIndex: sourceIndex,
            sourceClassName: cell.className
          };

          dragGhost.style.backgroundImage =
            `url(${data.src})`;

          dragGhost.style.display = 'block';
          dragGhost.style.left = '0px';
          dragGhost.style.top = '0px';

          scheduleDragUpdate(
            moveEvent.clientX,
            moveEvent.clientY
          );

          cell.innerHTML = '';
          cell.className = 'cell';
        }
      }

      if (isDragging) {
        if (moveEvent.cancelable) {
          moveEvent.preventDefault();
        }

        scheduleDragUpdate(
          moveEvent.clientX,
          moveEvent.clientY
        );
      }
    }

    function onUp(upEvent) {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      cancelDragUpdate();

      try {
        targetEl.releasePointerCapture(pointerId);
      } catch (err) {}

      clearHoverHighlight();

      if (!isDragging) {
        cell.innerHTML = '';
        cell.className = 'cell';

        delete cell.dataset.level;

        saveBoardState();

        return;
      }

      dragGhost.style.display = 'none';

      const dropTarget =
        document.elementFromPoint(
          upEvent.clientX,
          upEvent.clientY
        );

      const targetCell =
        dropTarget
          ? dropTarget.closest('.cell, .board-slot')
          : null;

      const isOverMonsterFrame =
        dropTarget &&
        monsterFrame &&
        monsterFrame.contains(dropTarget);

      if (isOverMonsterFrame) {
        draggingItem = null;
        saveBoardState();
        return;
      }

      if (
        !targetCell ||
        !mainGrid.contains(targetCell)
      ) {
        revertToSourceCell();
        return;
      }

      const targetIndex =
        cells.indexOf(targetCell);

      const existingMonster =
        getCellMonsterElement(targetCell);

      let targetCellData = null;

      if (existingMonster) {
        targetCellData = {
          src:
            existingMonster.dataset &&
            existingMonster.dataset.src
              ? existingMonster.dataset.src
              : existingMonster.src,

          species:
            existingMonster.dataset
              ? existingMonster.dataset.species
              : '',

          tier:
            existingMonster.dataset
              ? existingMonster.dataset.tier
              : '',

          player:
            existingMonster.dataset
              ? existingMonster.dataset.player
              : '',

          type:
            existingMonster.dataset &&
            existingMonster.dataset.type
              ? existingMonster.dataset.type
              : getMonsterType({
                  species:
                    existingMonster.dataset
                      ? existingMonster.dataset.species
                      : '',
                  tier:
                    existingMonster.dataset
                      ? existingMonster.dataset.tier
                      : ''
                }),

          level:
            targetCell.dataset.level ||
            null,

          className:
            targetCell.className
        };
      }

      const targetSpecies =
        draggingItem.species;

      let isSpeciesOnBoard = false;

      cells.forEach((c, idx) => {
        if (
          idx === targetIndex ||
          idx === sourceIndex
        ) {
          return;
        }

        const im =
          getCellMonsterElement(c);

        if (
          im &&
          im.dataset &&
          im.dataset.species === targetSpecies
        ) {
          if (
            currentGridType === '5' ||
            currentGridType === '3x4' ||
            im.dataset.player === draggingItem.player
          ) {
            isSpeciesOnBoard = true;
          }
        }
      });

      if (isSpeciesOnBoard) {
        const playerText =
          currentGridType === '6'
            ? `[${draggingItem.player}]`
            : '';

        alert(
          `${playerText} 同じ種族のタタは既に盤面に配置されています。`
        );

        revertToSourceCell();

        return;
      }

      targetCell.className = 'cell';

      if (currentGridType === '6') {
        targetCell.classList.add(
          draggingItem.player === '1P'
            ? 'p1-cell'
            : 'p2-cell'
        );
      }

      fillCellWithMonster(targetCell, {
        src: draggingItem.src,
        species: draggingItem.species,
        tier: draggingItem.tier,
        player: draggingItem.player,
        type: draggingItem.monsterType,
        level: draggingItem.level,
        className: targetCell.className
      });

      const sourceCell =
        cells[sourceIndex];

      if (targetCellData && sourceCell) {
        fillCellWithMonster(
          sourceCell,
          targetCellData
        );
      }

      draggingItem = null;

      saveBoardState();
    }

    window.addEventListener(
      'pointermove',
      onMove
    );

    window.addEventListener(
      'pointerup',
      onUp
    );

    window.addEventListener(
      'pointercancel',
      onUp
    );
  });
}

// ========================================
// ドラッグしたキャラを元へ戻す
// ========================================
function revertToSourceCell() {
  if (
    !draggingItem ||
    draggingItem.type !== 'board'
  ) {
    return;
  }

  const cells =
    Array.from(mainGrid.children);

  const sourceCell =
    cells[draggingItem.sourceIndex];

  if (sourceCell) {
    fillCellWithMonster(sourceCell, {
      src: draggingItem.src,
      species: draggingItem.species,
      tier: draggingItem.tier,
      player: draggingItem.player,
      type: draggingItem.monsterType,
      level: draggingItem.level,
      className: draggingItem.sourceClassName
    });
  }

  draggingItem = null;

  saveBoardState();
}

// ========================================
// 盤面作成
// ========================================
function buildBoard(gridType) {
  currentGridType = gridType;

  setLevelMode(false);

  normalStageBtn?.classList.remove('active');
  zombieStageBtn?.classList.remove('active');
  dojoStageBtn?.classList.remove('active');

  if (gridType === '5') {
    mainGrid.className = 'grid-5x5';

    if (playerSwitchContainer) {
      playerSwitchContainer.classList.remove('show');
      playerSwitchContainer.classList.remove('zombie-mode');
    }

    if (normalStageBtn) {
      normalStageBtn.classList.add('active');
    }

    if (boardNotice) {
      boardNotice.style.display = 'block';
    }

    updateChipsetAreaVisibility(false);

  } else if (gridType === '6') {
    mainGrid.className = 'grid-6x6';

    if (playerSwitchContainer) {
      playerSwitchContainer.classList.add('show');
      playerSwitchContainer.classList.add('zombie-mode');
    }

    if (zombieStageBtn) {
      zombieStageBtn.classList.add('active');
    }

    if (boardNotice) {
      boardNotice.style.display = 'block';
    }

    currentPlayer = '1P';

    if (btn1P) {
      btn1P.classList.add('active');
    }

    if (btn2P) {
      btn2P.classList.remove('active');
    }

    updateChipsetAreaVisibility(true);

  } else if (gridType === '3x4') {
    mainGrid.className = 'grid-3x4';

    if (playerSwitchContainer) {
      playerSwitchContainer.classList.remove('show');
      playerSwitchContainer.classList.remove('zombie-mode');
    }

    if (dojoStageBtn) {
      dojoStageBtn.classList.add('active');
    }

    if (boardNotice) {
      boardNotice.style.display = 'none';
    }

    updateChipsetAreaVisibility(false);
  }

  mainGrid.innerHTML = '';

  let totalCells = 25;

  if (gridType === '6') {
    totalCells = 36;
  }

  if (gridType === '3x4') {
    totalCells = 12;
  }

  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');

    cell.className = 'cell';

    cell.addEventListener('click', (e) => {
      e.stopPropagation();

      if (
        levelMode &&
        currentGridType === '6'
      ) {
        const monsterEl =
          getCellMonsterElement(cell);

        if (!monsterEl) {
          return;
        }

        let currentLevel =
          parseInt(
            cell.dataset.level || '0',
            10
          );

        currentLevel++;

        if (currentLevel > MAX_LEVEL) {
          currentLevel = 0;
        }

        setCellLevel(
          cell,
          currentLevel
        );

        saveBoardState();

        return;
      }

      if (!currentSelected) {
        cell.innerHTML = '';
        cell.className = 'cell';

        delete cell.dataset.level;

        saveBoardState();

        return;
      }

      const targetSpecies =
        currentSelected.species;

      const targetTier =
        currentSelected.tierNum;

      let totalCount = 0;
      let p1Count = 0;
      let p2Count = 0;

      document
        .querySelectorAll('#mainGrid .cell')
        .forEach(c => {
          const im =
            getCellMonsterElement(c);

          if (im) {
            totalCount++;

            if (
              im.dataset &&
              im.dataset.player === '1P'
            ) {
              p1Count++;
            }

            if (
              im.dataset &&
              im.dataset.player === '2P'
            ) {
              p2Count++;
            }
          }
        });

      const existingImg =
        getCellMonsterElement(cell);

      const isReplacingSelf =
        existingImg &&
        existingImg.dataset &&
        existingImg.dataset.species === targetSpecies &&
        (
          currentGridType !== '6' ||
          existingImg.dataset.player === currentPlayer
        );

      if (!isReplacingSelf) {
        if (
          gridType === '5' &&
          totalCount >= 15
        ) {
          alert(
            'ノーマルステージでは最大15体までしか配置できません。'
          );
          return;
        }

        if (
          gridType === '3x4' &&
          totalCount >= 12
        ) {
          alert(
            '道場では最大12体までしか配置できません。'
          );
          return;
        }

        if (gridType === '6') {
          if (
            currentPlayer === '1P' &&
            p1Count >= 15
          ) {
            alert(
              '1Pは最大15体までしか配置できません。'
            );
            return;
          }

          if (
            currentPlayer === '2P' &&
            p2Count >= 15
          ) {
            alert(
              '2Pは最大15体までしか配置できません。'
            );
            return;
          }
        }
      }

      let isSpeciesOnBoard = false;

      document
        .querySelectorAll('#mainGrid .cell')
        .forEach(c => {
          const im =
            getCellMonsterElement(c);

          if (
            im &&
            im.dataset &&
            im.dataset.species === targetSpecies
          ) {
            if (
              gridType !== '6' ||
              im.dataset.player === currentPlayer
            ) {
              if (c !== cell) {
                isSpeciesOnBoard = true;
              }
            }
          }
        });

      if (isSpeciesOnBoard) {
        const playerText =
          gridType === '6'
            ? `[${currentPlayer}]`
            : '';

        alert(
          `${playerText} 同じ種族のタタは既に盤面に配置されています。`
        );

        return;
      }

      const newCellClassName =
        'cell ' +
        (
          gridType === '6'
            ? (
                currentPlayer === '1P'
                  ? 'p1-cell'
                  : 'p2-cell'
              )
            : ''
        );

      fillCellWithMonster(cell, {
        src: currentSelected.imgUrl,
        species: targetSpecies,
        tier: targetTier,
        player:
          gridType === '6'
            ? currentPlayer
            : '1P',
        type:
          currentSelected.type ||
          getMonsterType({
            species: targetSpecies,
            tier: targetTier
          }),
        className:
          newCellClassName.trim()
      });

      currentSelected = null;

      if (selectedNameEl) {
        selectedNameEl.textContent = 'なし';
      }

      saveBoardState();

      renderMonsters();
    });

    mainGrid.appendChild(cell);
  }

  loadBoardState();
}

// ========================================
// モンスター一覧
// ========================================
function renderMonsters() {
  if (
    currentSelectionMode === 'chip' &&
    currentGridType === '6'
  ) {
    renderChips();
    return;
  }

  monsterGrid.innerHTML = '';

  const filtered =
    monstersData.filter(m => {
      const matchAttr =
        currentAttr === 'all' ||
        m.attr === currentAttr;

      const matchType =
        currentType === 'all' ||
        m.type === currentType;

      return matchAttr && matchType;
    });

  filtered.forEach(baseM => {
    const species = baseM.species;

    let activeTierNum =
      speciesTiersMap[species][0];

    let displayMonster = baseM;

    if (
      currentSelected &&
      currentSelected.species === species
    ) {
      activeTierNum =
        currentSelected.tierNum;

      const found =
        allMonsters.find(
          m =>
            m.species === species &&
            m.tierNum === activeTierNum
        );

      if (found) {
        displayMonster = found;
      }
    }

    const name =
      displayMonster.name;

    const imgUrl =
      `${name}.webp`;

    const typeImgUrl =
      `${baseM.type}.webp`;

    const item =
      document.createElement('div');

    item.className =
      'monster-item';

    item.dataset.attr =
      baseM.attr;

    item.style.touchAction =
      'none';

    if (
      currentSelected &&
      currentSelected.species === species
    ) {
      item.classList.add('active');
    }

    item.innerHTML = `
      <img class="monster-type-icon" src="${typeImgUrl}" alt="${baseM.type}" onerror="this.style.display='none'" draggable="false">

      <img class="monster-thumb" src="${imgUrl}" alt="${name}" draggable="false" onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src='${name}.png';}else if(this.dataset.retry=='1'){this.dataset.retry=2;this.src='${name}.jpg';}else{this.outerHTML='<div class=\\'no-image-badge\\'>🌸 no image 🌸</div>';}">

      <div class="monster-name">${name}</div>
    `;

    item.addEventListener('pointerdown', (e) => {
      e.stopPropagation();

      if (
        e.button !== 0 &&
        e.pointerType === 'mouse'
      ) {
        return;
      }

      if (levelMode) {
        return;
      }

      const pointerId =
        e.pointerId;

      const startX =
        e.clientX;

      const startY =
        e.clientY;

      let isDragging = false;

      const availableTiers =
        speciesTiersMap[species];

      let paletteItemData;

      if (
        currentSelected &&
        currentSelected.species === species
      ) {
        paletteItemData = {
          species:
            currentSelected.species,

          tierNum:
            currentSelected.tierNum,

          name:
            currentSelected.name,

          imgUrl:
            currentSelected.imgUrl,

          type:
            currentSelected.type ||
            baseM.type
        };
      } else {
        const minTier =
          availableTiers[0];

        const t1Monster =
          allMonsters.find(
            m =>
              m.species === species &&
              m.tierNum === minTier
          ) || baseM;

        paletteItemData = {
          species: species,
          tierNum: minTier,
          name: t1Monster.name,
          imgUrl: `${t1Monster.name}.webp`,
          type: t1Monster.type
        };
      }

      function onMove(moveEvent) {
        const dx =
          moveEvent.clientX - startX;

        const dy =
          moveEvent.clientY - startY;

        if (!isDragging) {
          if (
            Math.hypot(dx, dy) > 3
          ) {
            isDragging = true;

            try {
              item.setPointerCapture(
                pointerId
              );
            } catch (err) {}

            draggingItem = {
              type: 'palette',
              src:
                paletteItemData.imgUrl,

              species:
                paletteItemData.species,

              tier:
                paletteItemData.tierNum,

              player:
                currentGridType === '6'
                  ? currentPlayer
                  : '1P',

              monsterType:
                paletteItemData.type
            };

            dragGhost.style.backgroundImage =
              `url(${paletteItemData.imgUrl})`;

            dragGhost.style.display =
              'block';

            dragGhost.style.left =
              '0px';

            dragGhost.style.top =
              '0px';

            scheduleDragUpdate(
              moveEvent.clientX,
              moveEvent.clientY
            );
          }
        }

        if (isDragging) {
          if (moveEvent.cancelable) {
            moveEvent.preventDefault();
          }

          scheduleDragUpdate(
            moveEvent.clientX,
            moveEvent.clientY
          );
        }
      }

      function onUp(upEvent) {
        window.removeEventListener(
          'pointermove',
          onMove
        );

        window.removeEventListener(
          'pointerup',
          onUp
        );

        window.removeEventListener(
          'pointercancel',
          onUp
        );

        cancelDragUpdate();

        try {
          item.releasePointerCapture(
            pointerId
          );
        } catch (err) {}

        clearHoverHighlight();

        if (!isDragging) {
          if (
            currentSelected &&
            currentSelected.species === species
          ) {
            const currentIndex =
              availableTiers.indexOf(
                currentSelected.tierNum
              );

            if (
              currentIndex <
              availableTiers.length - 1
            ) {
              const nextTier =
                availableTiers[
                  currentIndex + 1
                ];

              currentSelected.tierNum =
                nextTier;

              const nextM =
                allMonsters.find(
                  m =>
                    m.species === species &&
                    m.tierNum === nextTier
                );

              if (nextM) {
                currentSelected.name =
                  nextM.name;

                currentSelected.imgUrl =
                  `${nextM.name}.webp`;

                currentSelected.type =
                  nextM.type;
              }
            } else {
              currentSelected = null;
            }
          } else {
            currentSelected =
              paletteItemData;
          }

          renderMonsters();

          if (selectedNameEl) {
            if (currentSelected) {
              selectedNameEl.textContent =
                `${currentSelected.name} (T${currentSelected.tierNum})`;
            } else {
              selectedNameEl.textContent =
                'なし';
            }
          }

          return;
        }

        dragGhost.style.display =
          'none';

        const dropTarget =
          document.elementFromPoint(
            upEvent.clientX,
            upEvent.clientY
          );

        const targetCell =
          dropTarget
            ? dropTarget.closest(
                '.cell, .board-slot'
              )
            : null;

        const cells =
          Array.from(
            mainGrid.children
          );

        if (
          targetCell &&
          mainGrid.contains(targetCell)
        ) {
          const targetIndex =
            cells.indexOf(targetCell);

          const existingMonster =
            getCellMonsterElement(
              targetCell
            );

          const targetSpecies =
            draggingItem.species;

          let totalCount = 0;
          let p1Count = 0;
          let p2Count = 0;

          cells.forEach(c => {
            const im =
              getCellMonsterElement(c);

            if (im) {
              totalCount++;

              if (
                im.dataset &&
                im.dataset.player === '1P'
              ) {
                p1Count++;
              }

              if (
                im.dataset &&
                im.dataset.player === '2P'
              ) {
                p2Count++;
              }
            }
          });

          const isReplacingSelf =
            existingMonster &&
            existingMonster.dataset &&
            existingMonster.dataset.species === targetSpecies &&
            (
              currentGridType !== '6' ||
              existingMonster.dataset.player ===
                draggingItem.player
            );

          if (!isReplacingSelf) {
            if (
              currentGridType === '5' &&
              totalCount >= 15
            ) {
              alert(
                'ノーマルステージでは最大15体までしか配置できません。'
              );

              draggingItem = null;
              return;
            }

            if (
              currentGridType === '3x4' &&
              totalCount >= 12
            ) {
              alert(
                '道場では最大12体までしか配置できません。'
              );

              draggingItem = null;
              return;
            }

            if (currentGridType === '6') {
              if (
                draggingItem.player === '1P' &&
                p1Count >= 15
              ) {
                alert(
                  '1Pは最大15体までしか配置できません。'
                );

                draggingItem = null;
                return;
              }

              if (
                draggingItem.player === '2P' &&
                p2Count >= 15
              ) {
                alert(
                  '2Pは最大15体までしか配置できません。'
                );

                draggingItem = null;
                return;
              }
            }
          }

          let isSpeciesOnBoard =
            false;

          cells.forEach((c, idx) => {
            if (idx === targetIndex) {
              return;
            }

            const im =
              getCellMonsterElement(c);

            if (
              im &&
              im.dataset &&
              im.dataset.species === targetSpecies
            ) {
              if (
                currentGridType !== '6' ||
                im.dataset.player ===
                  draggingItem.player
              ) {
                isSpeciesOnBoard = true;
              }
            }
          });

          if (isSpeciesOnBoard) {
            const playerText =
              currentGridType === '6'
                ? `[${draggingItem.player}]`
                : '';

            alert(
              `${playerText} 同じ種族のタタは既に盤面に配置されています。`
            );

            draggingItem = null;
            return;
          }

          targetCell.className =
            'cell';

          if (currentGridType === '6') {
            targetCell.classList.add(
              draggingItem.player === '1P'
                ? 'p1-cell'
                : 'p2-cell'
            );
          }

          fillCellWithMonster(
            targetCell,
            {
              src:
                draggingItem.src,

              species:
                draggingItem.species,

              tier:
                draggingItem.tier,

              player:
                draggingItem.player,

              type:
                draggingItem.monsterType,

              className:
                targetCell.className
            }
          );

          saveBoardState();
        }

        draggingItem = null;
      }

      window.addEventListener(
        'pointermove',
        onMove
      );

      window.addEventListener(
        'pointerup',
        onUp
      );

      window.addEventListener(
        'pointercancel',
        onUp
      );
    });

    monsterGrid.appendChild(item);
  });
}

// ========================================
// アプリ全体クリック
// ========================================
document
  .getElementById('appContainer')
  ?.addEventListener('click', (e) => {
    if (
      !e.target.closest(
        '.cell, .board-slot'
      ) &&
      !e.target.closest(
        '.monster-item'
      )
    ) {
      if (currentSelected) {
        currentSelected = null;

        if (selectedNameEl) {
          selectedNameEl.textContent =
            'なし';
        }

        renderMonsters();
      }
    }
  });

// ========================================
// フィルター
// ========================================
function setupFilter(
  groupId,
  attrName,
  callback
) {
  const btns =
    document.querySelectorAll(
      `#${groupId} .filter-btn`
    );

  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      btns.forEach(b =>
        b.classList.remove('active')
      );

      btn.classList.add('active');

      callback(
        btn.dataset[attrName]
      );

      renderMonsters();
    });
  });
}

setupFilter(
  'attrFilterGroup',
  'attr',
  val => currentAttr = val
);

setupFilter(
  'typeFilterGroup',
  'type',
  val => currentType = val
);

// ========================================
// 盤面クリア
// ========================================
document
  .getElementById('clearBtn')
  ?.addEventListener('click', (e) => {
    e.stopPropagation();

    currentSelected = null;

    setLevelMode(false);

    if (selectedNameEl) {
      selectedNameEl.textContent =
        'なし';
    }

    document
      .querySelectorAll('.cell')
      .forEach(cell => {
        cell.innerHTML = '';
        cell.className = 'cell';
        delete cell.dataset.level;
      });

    localStorage.removeItem(
      'monsterBoard_cells'
    );

    localStorage.removeItem(
      'monsterBoard_chips'
    );

    selectedChipsMap = {
      '1P': [],
      '2P': []
    };

    applyChipsToSlots();
    renderMonsters();
    updateBuffSummary();
  });

// ========================================
// 画像保存（タイトル・発動効果の表示切替対応）
// ========================================
document
  .getElementById('saveBtn')
  ?.addEventListener('click', async (e) => {
    e.preventDefault();

    const boardFrame =
      document.getElementById(
        'boardFrame'
      );

    const appTitleInput =
      document.getElementById(
        'appTitleInput'
      );

    const playerSwitchContainer =
      document.getElementById(
        'playerSwitchContainer'
      );

    if (!boardFrame) {
      alert(
        '盤面が見つかりません。'
      );
      return;
    }

    const titleText =
      appTitleInput?.value?.trim() ||
      'タタ配置ツール';

    // ----------------------------------------
    // 発動効果を画像に含めるか
    // ゾンビラッシュのみ確認
    // ----------------------------------------
    let includeBuffSummary = true;

    if (currentGridType === '6') {
      includeBuffSummary = confirm(
        '発動効果を画像に含めますか？\n\n「OK」→ 含める\n「キャンセル」→ 含めない'
      );
    }

    // プレイヤー切り替えを一時的に非表示
    if (playerSwitchContainer) {
      playerSwitchContainer.style.visibility =
        'hidden';
    }

    // ----------------------------------------
    // キャプチャ用コンテナ作成
    // ----------------------------------------
    const captureContainer =
      document.createElement('div');

    captureContainer.style.position =
      'absolute';

    captureContainer.style.left =
      '-99999px';

    captureContainer.style.top =
      '0';

    captureContainer.style.width =
      `${boardFrame.offsetWidth}px`;

    captureContainer.style.backgroundColor =
      '#181a29';

    captureContainer.style.zIndex =
      '-1';

    captureContainer.style.boxSizing =
      'border-box';

    // ----------------------------------------
    // 画像保存用タイトル作成
    // ----------------------------------------
    const captureTitle =
      document.createElement('div');

    captureTitle.textContent =
      titleText;

    captureTitle.style.width =
      '100%';

    captureTitle.style.backgroundColor =
      '#181a29';

    captureTitle.style.color =
      '#f8fafc';

    captureTitle.style.fontSize =
      '18px';

    captureTitle.style.fontWeight =
      'bold';

    captureTitle.style.lineHeight =
      '1.4';

    captureTitle.style.padding =
      '8px 12px';

    captureTitle.style.textAlign =
      'center';

    captureTitle.style.boxSizing =
      'border-box';

    captureTitle.style.borderRadius =
      '8px 8px 0 0';

    captureTitle.style.overflow =
      'hidden';

    captureTitle.style.wordBreak =
      'break-word';

    // ----------------------------------------
    // 盤面を複製
    // ----------------------------------------
    const boardClone =
      boardFrame.cloneNode(true);

    // ----------------------------------------
    // 発動効果の画像表示設定
    // ----------------------------------------
    const buffSummaryContainer =
      boardClone.querySelector(
        '#buffSummaryContainer'
      );

    const buffSummaryContent =
      boardClone.querySelector(
        '#buffSummaryContent'
      );

    const buffToggleIcon =
      boardClone.querySelector(
        '#buffToggleIcon'
      );

    if (currentGridType === '6') {
      if (includeBuffSummary) {
        if (buffSummaryContainer) {
          buffSummaryContainer.style.setProperty(
            'display',
            'block',
            'important'
          );
        }

        if (buffSummaryContent) {
          buffSummaryContent.style.setProperty(
            'display',
            'block',
            'important'
          );

          buffSummaryContent.style.height =
            'auto';

          buffSummaryContent.style.visibility =
            'visible';

          buffSummaryContent.style.opacity =
            '1';
        }

        if (buffToggleIcon) {
          buffToggleIcon.textContent =
            '▲';
        }
      } else {
        if (buffSummaryContainer) {
          buffSummaryContainer.style.setProperty(
            'display',
            'none',
            'important'
          );
        }
      }
    }

    // ----------------------------------------
    // 盤面セルの画像表示調整
    // ----------------------------------------
    const cells =
      boardClone.querySelectorAll(
        '.cell'
      );

    cells.forEach(cell => {
      cell.style.aspectRatio =
        '1 / 1';

      cell.style.display =
        'flex';

      cell.style.alignItems =
        'center';

      cell.style.justifyContent =
        'center';

      const img =
        cell.querySelector(
          '.placed-monster-image'
        );

      if (img) {
        img.style.maxWidth =
          '100%';

        img.style.maxHeight =
          '100%';

        img.style.width =
          'auto';

        img.style.height =
          'auto';

        img.style.objectFit =
          'contain';

        img.style.display =
          'block';

        img.style.margin =
          'auto';
      }
    });

    // ----------------------------------------
    // タイトル → 盤面の順番で追加
    // ----------------------------------------
    captureContainer.appendChild(
      captureTitle
    );

    captureContainer.appendChild(
      boardClone
    );

    document.body.appendChild(
      captureContainer
    );

    // ----------------------------------------
    // DOMレンダリング確定待ち
    // ----------------------------------------
    await new Promise(resolve =>
      requestAnimationFrame(
        () =>
          setTimeout(
            resolve,
            50
          )
      )
    );

    try {
      // ----------------------------------------
      // html2canvasで画像化
      // ----------------------------------------
      const canvas =
        await html2canvas(
          captureContainer,
          {
            backgroundColor:
              '#181a29',

            scale: 3,

            useCORS: true,

            logging: false
          }
        );

      // ----------------------------------------
      // 後始末
      // ----------------------------------------
      captureContainer.remove();

      if (playerSwitchContainer) {
        playerSwitchContainer.style.visibility =
          '';
      }

      // ----------------------------------------
      // WebPとして保存
      // ----------------------------------------
      const imageURL =
        canvas.toDataURL(
          'image/webp',
          0.98
        );

      const downloadLink =
        document.createElement('a');

      downloadLink.href =
        imageURL;

      downloadLink.download =
        `${titleText}-${currentGridType}.webp`;

      document.body.appendChild(
        downloadLink
      );

      downloadLink.click();

      document.body.removeChild(
        downloadLink
      );

    } catch (err) {
      console.error(
        '画像保存エラー:',
        err
      );

      alert(
        '画像の保存に失敗しました。'
      );

      if (playerSwitchContainer) {
        playerSwitchContainer.style.visibility =
          '';
      }

      if (
        document.body.contains(
          captureContainer
        )
      ) {
        captureContainer.remove();
      }
    }
  });

// ========================================
// 1P / 2P切り替え
// ========================================
btn1P?.addEventListener('click', (e) => {
  e.stopPropagation();

  currentPlayer = '1P';

  btn1P.classList.add('active');

  btn2P?.classList.remove('active');

  applyChipsToSlots();

  if (
    currentSelectionMode === 'chip'
  ) {
    renderChips();
  }
});

btn2P?.addEventListener('click', (e) => {
  e.stopPropagation();

  currentPlayer = '2P';

  btn2P.classList.add('active');

  btn1P?.classList.remove('active');

  applyChipsToSlots();

  if (
    currentSelectionMode === 'chip'
  ) {
    renderChips();
  }
});

// ========================================
// メニュー
// ========================================
const menuOpenBtn =
  document.getElementById(
    'menuOpenBtn'
  );

const drawerOverlay =
  document.getElementById(
    'drawerOverlay'
  );

const drawerMenu =
  document.getElementById(
    'drawerMenu'
  );

menuOpenBtn?.addEventListener(
  'click',
  (e) => {
    e.stopPropagation();

    drawerOverlay?.classList.add(
      'open'
    );
  }
);

drawerOverlay?.addEventListener(
  'click',
  (e) => {
    if (
      e.target === drawerOverlay
    ) {
      drawerOverlay.classList.remove(
        'open'
      );
    }
  }
);

drawerMenu?.addEventListener(
  'click',
  (e) => {
    e.stopPropagation();
  }
);

// ========================================
// ノーマルステージ
// ========================================
normalStageBtn?.addEventListener(
  'click',
  () => {
    if (currentGridType !== '5') {
      localStorage.removeItem(
        'monsterBoard_cells'
      );

      localStorage.removeItem(
        'monsterBoard_chips'
      );

      selectedChipsMap = {
        '1P': [],
        '2P': []
      };
    }

    currentSelected = null;

    if (selectedNameEl) {
      selectedNameEl.textContent =
        'なし';
    }

    buildBoard('5');

    renderMonsters();

    drawerOverlay?.classList.remove(
      'open'
    );
  }
);

// ========================================
// ゾンビラッシュ
// ========================================
zombieStageBtn?.addEventListener(
  'click',
  () => {
    if (currentGridType !== '6') {
      localStorage.removeItem(
        'monsterBoard_cells'
      );

      localStorage.removeItem(
        'monsterBoard_chips'
      );

      selectedChipsMap = {
        '1P': [],
        '2P': []
      };
    }

    currentSelected = null;

    if (selectedNameEl) {
      selectedNameEl.textContent =
        'なし';
    }

    buildBoard('6');

    renderMonsters();

    drawerOverlay?.classList.remove(
      'open'
    );
  }
);

// ========================================
// 道場
// ========================================
dojoStageBtn?.addEventListener(
  'click',
  () => {
    if (currentGridType !== '3x4') {
      localStorage.removeItem(
        'monsterBoard_cells'
      );

      localStorage.removeItem(
        'monsterBoard_chips'
      );

      selectedChipsMap = {
        '1P': [],
        '2P': []
      };
    }

    currentSelected = null;

    if (selectedNameEl) {
      selectedNameEl.textContent =
        'なし';
    }

    buildBoard('3x4');

    renderMonsters();

    drawerOverlay?.classList.remove(
      'open'
    );
  }
);

// ========================================
// 発動効果一覧 アコーディオン
// ========================================
function initBuffSummaryToggle() {
  const container =
    document.getElementById(
      'buffSummaryContainer'
    );

  const content =
    document.getElementById(
      'buffSummaryContent'
    );

  const icon =
    document.getElementById(
      'buffToggleIcon'
    );

  if (!container || !content) {
    return;
  }

  // ----------------------------------------
  // ヘッダー部分を取得
  // contentの直前にある要素をヘッダーとして使用
  // ----------------------------------------
  const header =
    content.previousElementSibling;

  if (!header) {
    return;
  }

  // ----------------------------------------
  // クリック処理
  // ----------------------------------------
  header.addEventListener(
    'click',
    (e) => {
      e.stopPropagation();

      const isOpen =
        content.style.display !==
        'none';

      if (isOpen) {
        // 閉じる
        content.style.display =
          'none';

        if (icon) {
          icon.textContent =
            '▼';
        }
      } else {
        // 開く
        content.style.display =
          'block';

        if (icon) {
          icon.textContent =
            '▲';
        }
      }
    }
  );
}

// ========================================
// 初期化
// ========================================
initBuffSummaryToggle();
buildBoard(currentGridType);
renderMonsters();
