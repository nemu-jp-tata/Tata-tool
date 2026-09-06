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
const MAX_LEVEL = 7;


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

  // ゾンビラッシュ時のみレベルボタンを有効にする
  if (playerSwitch) {
    playerSwitch.classList.toggle('zombie-mode', isZombieStage);
  }

  // ゾンビラッシュ時のみ、
  // モンスター選択エリアに「タタ選択 / チップ選択」を表示
  let modeSwitch = document.getElementById('selectionModeSwitch');

  if (isZombieStage) {

    if (!modeSwitch) {

      if (monsterTitle) {

        modeSwitch = document.createElement('div');
        modeSwitch.id = 'selectionModeSwitch';

        modeSwitch.style.cssText =
          'display: flex; gap: 8px; margin-bottom: 10px; flex-shrink: 0;';

        modeSwitch.innerHTML = `
          <button
            id="modeMonsterBtn"
            class="filter-btn ${currentSelectionMode === 'monster' ? 'active' : ''}"
            style="flex: 1; padding: 6px; text-align: center; cursor: pointer;"
          >タタ選択</button>

          <button
            id="modeChipBtn"
            class="filter-btn ${currentSelectionMode === 'chip' ? 'active' : ''}"
            style="flex: 1; padding: 6px; text-align: center; cursor: pointer;"
          >チップ選択</button>
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

    <button
      id="setChipsBtn"
      class="btn"
      style="background: #2563eb; border-color: #3b82f6; color: #fff; padding: 6px 14px; font-size: 12px; cursor: pointer; white-space: nowrap; flex-shrink: 0;"
    >セットする</button>
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
      <img
        class="monster-thumb"
        src="${chip.img}"
        alt="${chip.name}"
        draggable="false"
        style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; pointer-events: none; display: block; margin: auto;"
        onerror="this.outerHTML='<div class=\\'no-image-badge\\'>🌸 no image 🌸</div>';"
      >
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
        <img
          src="${chip.img}"
          alt="${chip.name}"
          title="[1P] ${chip.name}"
          style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; border-radius: 4px; display: block; margin: auto;"
          onerror="this.outerHTML='<span style=\\'font-size:9px; color:#fff;\\'>${chip.name}</span>';"
        >
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
        <img
          src="${chip.img}"
          alt="${chip.name}"
          title="[2P] ${chip.name}"
          style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; border-radius: 4px; display: block; margin: auto;"
          onerror="this.outerHTML='<span style=\\'font-size:9px; color:#fff;\\'>${chip.name}</span>';"
        >
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

let currentGridType =
  localStorage.getItem('monsterBoard_gridType') || '5';

let currentPlayer = "1P";

let draggingItem = null;

const dragGhost = document.getElementById('dragGhost');

const mainGrid = document.getElementById('mainGrid');
const monsterFrame = document.getElementById('monsterFrame');

const playerSwitchContainer =
  document.getElementById('playerSwitchContainer');

const btn1P = document.getElementById('btn1P');
const btn2P = document.getElementById('btn2P');

const levelBtn =
  document.getElementById('levelBtn');

const normalStageBtn =
  document.getElementById('normalStageBtn');

const zombieStageBtn =
  document.getElementById('zombieStageBtn');

const dojoStageBtn =
  document.getElementById('dojoStageBtn');

const selectedNameEl =
  document.getElementById('selectedName');

const boardNotice =
  document.getElementById('boardNotice');

const boardFrame =
  document.getElementById('boardFrame');

const monsterGrid =
  document.getElementById('monsterGrid');


let rafId = null;
let pendingX = 0;
let pendingY = 0;


// ========================================
// ドラッグゴースト
// ========================================

function updateGhostPosition(x, y) {

  pendingX = x;
  pendingY = y;

  if (!rafId) {

    rafId = requestAnimationFrame(() => {

      dragGhost.style.transform =
        `translate3d(${pendingX - 25}px, ${pendingY - 25}px, 0)`;

      rafId = null;
    });
  }
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

  if (
    targetCell &&
    mainGrid.contains(targetCell)
  ) {

    if (currentHoveredCell !== targetCell) {

      clearHoverHighlight();

      targetCell.classList.add('drag-over');

      currentHoveredCell = targetCell;
    }

  } else {

    clearHoverHighlight();
  }
}


function clearHoverHighlight() {

  if (currentHoveredCell) {

    currentHoveredCell.classList.remove('drag-over');

    currentHoveredCell = null;
  }
}


// ========================================
// セル内の「キャラクター本体」を取得
// タイプアイコンを追加したため重要
// ========================================

function getCellMonsterElement(cell) {

  return cell.querySelector(
    '.placed-monster-image, .no-image-badge'
  );
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

  const oldLevel =
    cell.querySelector('.placed-level');

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

  const levelBadge =
    document.createElement('div');

  levelBadge.className = 'placed-level';

  levelBadge.textContent = `Lv.${level}`;

  cell.appendChild(levelBadge);
}


// ========================================
// レベルモード
// ========================================

function setLevelMode(enabled) {

  // ゾンビラッシュ以外では強制OFF
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

    // モンスター選択を解除
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

  document
    .querySelectorAll('#mainGrid .cell')
    .forEach((cell, index) => {

      const monsterEl =
        getCellMonsterElement(cell);

      if (monsterEl) {

        const type =
          getMonsterType({
            species: monsterEl.dataset
              ? monsterEl.dataset.species
              : '',
            tier: monsterEl.dataset
              ? monsterEl.dataset.tier
              : ''
          });

        cellsData.push({

          index: index,

          src:
            monsterEl.dataset &&
            monsterEl.dataset.src
              ? monsterEl.dataset.src
              : (
                  monsterEl.src ||
                  ''
                ),

          species:
            monsterEl.dataset
              ? monsterEl.dataset.species
              : '',

          tier:
            monsterEl.dataset
              ? monsterEl.dataset.tier
              : '',

          player:
            monsterEl.dataset
              ? monsterEl.dataset.player
              : '',

          type: type,

          level:
            cell.dataset.level || null,

          className:
            cell.className
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
}


// ========================================
// 保存状態読み込み
// ========================================

function loadBoardState() {

  const savedCells =
    JSON.parse(
      localStorage.getItem(
        'monsterBoard_cells'
      ) || '[]'
    );

  savedCells.forEach(data => {

    const cell =
      mainGrid.children[data.index];

    if (cell) {

      fillCellWithMonster(cell, data);

      if (data.level) {
        setCellLevel(cell, data.level);
      }
    }
  });


  const savedChips =
    JSON.parse(
      localStorage.getItem(
        'monsterBoard_chips'
      ) || 'null'
    );

  if (savedChips) {
    selectedChipsMap = savedChips;
  }

  applyChipsToSlots();
}


// ========================================
// キャラクターをセルへ配置
// ========================================

function fillCellWithMonster(cell, data) {

  const type =
    getMonsterType(data);

  // 以前のレベルを保持
  const previousLevel =
    data.level ||
    cell.dataset.level ||
    null;

  // セルをリセット
  cell.className =
    data.className || 'cell';

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
      style="
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        pointer-events: auto;
        touch-action: none;
        display: block;
        margin: auto;
      "
      onerror="
        if(!this.dataset.retry){
          this.dataset.retry=1;
          this.src='${data.src}'.replace(/\\.webp$/i,'.png');
        }else if(this.dataset.retry=='1'){
          this.dataset.retry=2;
          this.src='${data.src}'.replace(/\\.webp$/i,'.jpg');
        }else{
          this.outerHTML='<div class=\\'no-image-badge\\' data-species=\\'${data.species || ''}\\' data-tier=\\'${data.tier || ''}\\' data-player=\\'${data.player || ''}\\'>🌸 no image 🌸</div>';
        }
      "
    >

    ${
      type
        ? `
          <img
            class="placed-type-icon"
            src="${type}.webp"
            alt="${type}"
            draggable="false"
            onerror="this.style.display='none'"
          >
        `
        : ''
    }

    ${
      data.tier
        ? `<div class="tier-badge">T${data.tier}</div>`
        : ''
    }
  `;


  // --------------------------------------
  // レベルを復元
  // --------------------------------------

  if (previousLevel) {
    setCellLevel(cell, previousLevel);
  }


  // --------------------------------------
  // キャラクター本体
  // --------------------------------------

  const targetEl =
    getCellMonsterElement(cell);

  if (!targetEl) {
    return;
  }


  // --------------------------------------
  // ドラッグ処理
  // --------------------------------------

  targetEl.addEventListener(
    'pointerdown',
    (e) => {

      e.stopPropagation();

      if (
        e.button !== 0 &&
        e.pointerType === 'mouse'
      ) {
        return;
      }

      // レベルモードではドラッグさせない
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

      const cells =
        Array.from(mainGrid.children);

      const sourceIndex =
        cells.indexOf(cell);


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
        targetEl.dataset &&
        targetEl.dataset.type
          ? targetEl.dataset.type
          : type;

      const cellLevel =
        cell.dataset.level || null;


      function onMove(moveEvent) {

        const dx =
          moveEvent.clientX - startX;

        const dy =
          moveEvent.clientY - startY;


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

              sourceClassName:
                cell.className
            };


            dragGhost.style.backgroundImage =
              `url(${data.src})`;

            dragGhost.style.display =
              'block';

            dragGhost.style.left =
              '0px';

            dragGhost.style.top =
              '0px';

            updateGhostPosition(
              moveEvent.clientX,
              moveEvent.clientY
            );


            // ドラッグ中は一旦空にする
            cell.innerHTML = '';

            cell.className = 'cell';
          }
        }


        if (isDragging) {

          if (moveEvent.cancelable) {
            moveEvent.preventDefault();
          }

          updateGhostPosition(
            moveEvent.clientX,
            moveEvent.clientY
          );

          updateHoverHighlight(
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


        try {
          targetEl.releasePointerCapture(pointerId);
        } catch (err) {}


        clearHoverHighlight();


        // ----------------------------------
        // タップだった場合 → 削除
        // ----------------------------------

        if (!isDragging) {

          cell.innerHTML = '';

          cell.className = 'cell';

          delete cell.dataset.level;

          saveBoardState();

          return;
        }


        // ----------------------------------
        // ドラッグ終了
        // ----------------------------------

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

        const isOverMonsterFrame =
          dropTarget &&
          monsterFrame &&
          monsterFrame.contains(dropTarget);


        // ----------------------------------
        // モンスター選択エリアへ戻した場合
        // → 削除
        // ----------------------------------

        if (isOverMonsterFrame) {

          draggingItem = null;

          saveBoardState();

          return;
        }


        // ----------------------------------
        // 盤面外
        // → 元の場所へ戻す
        // ----------------------------------

        if (
          !targetCell ||
          !mainGrid.contains(targetCell)
        ) {

          revertToSourceCell();

          return;
        }


        const targetIndex =
          cells.indexOf(targetCell);


        // ----------------------------------
        // 移動先のキャラクター
        // ----------------------------------

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
              targetCell.dataset.level || null,

            className:
              targetCell.className
          };
        }


        // ----------------------------------
        // 同種族チェック
        // ----------------------------------

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

          revertToSourceCell();

          return;
        }


        // ----------------------------------
        // 移動先を設定
        // ----------------------------------

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

            level:
              draggingItem.level,

            className:
              targetCell.className
          }
        );


        // ----------------------------------
        // 移動先に元からキャラがいた場合
        // → 元の場所へ移動
        // ----------------------------------

        const sourceCell =
          cells[sourceIndex];


        if (
          targetCellData &&
          sourceCell
        ) {

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
    }
  );
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

    fillCellWithMonster(
      sourceCell,
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

        level:
          draggingItem.level,

        className:
          draggingItem.sourceClassName
      }
    );
  }


  draggingItem = null;

  saveBoardState();
}


// ========================================
// 盤面作成
// ========================================

function buildBoard(gridType) {

  currentGridType = gridType;


  // ステージ切替時のレベルを解除
  setLevelMode(false);


  // ステージボタン
  normalStageBtn?.classList.remove('active');
  zombieStageBtn?.classList.remove('active');
  dojoStageBtn?.classList.remove('active');


  // --------------------------------------
  // ノーマル
  // --------------------------------------

  if (gridType === '5') {

    mainGrid.className =
      'grid-5x5';

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
  }


  // --------------------------------------
  // ゾンビラッシュ
  // --------------------------------------

  else if (gridType === '6') {

    mainGrid.className =
      'grid-6x6';

    if (playerSwitchContainer) {

      playerSwitchContainer.classList.add('show');

      // ★ここでレベルボタンを表示
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
  }


  // --------------------------------------
  // 道場
  // --------------------------------------

  else if (gridType === '3x4') {

    mainGrid.className =
      'grid-3x4';

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


  // --------------------------------------
  // 盤面を作り直す
  // --------------------------------------

  mainGrid.innerHTML = '';


  let totalCells = 25;

  if (gridType === '6') {
    totalCells = 36;
  }

  if (gridType === '3x4') {
    totalCells = 12;
  }


  for (
    let i = 0;
    i < totalCells;
    i++
  ) {

    const cell =
      document.createElement('div');

    cell.className =
      'cell';


    // ------------------------------------
    // セルクリック
    // ------------------------------------

    cell.addEventListener(
      'click',
      (e) => {

        e.stopPropagation();


        // ================================
        // ★ レベルモード
        // ================================

        if (
          levelMode &&
          currentGridType === '6'
        ) {

          const monsterEl =
            getCellMonsterElement(cell);

          // キャラがいない場合は何もしない
          if (!monsterEl) {
            return;
          }


          let currentLevel =
            parseInt(
              cell.dataset.level || '0',
              10
            );

          currentLevel++;


          if (
            currentLevel > MAX_LEVEL
          ) {
            currentLevel = 0;
          }


          setCellLevel(
            cell,
            currentLevel
          );

          saveBoardState();

          return;
        }


        // ================================
        // 通常のキャラクター配置
        // ================================

        if (!currentSelected) {

          cell.innerHTML = '';

          cell.className =
            'cell';

          delete cell.dataset.level;

          saveBoardState();

          return;
        }


        const targetSpecies =
          currentSelected.species;

        const targetTier =
          currentSelected.tierNum;


        // --------------------------------
        // 現在の配置数
        // --------------------------------

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
          existingImg.dataset.species ===
            targetSpecies &&
          (
            currentGridType !== '6' ||
            existingImg.dataset.player ===
              currentPlayer
          );


        // --------------------------------
        // 最大数チェック
        // --------------------------------

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


        // --------------------------------
        // 同種族チェック
        // --------------------------------

        let isSpeciesOnBoard = false;


        document
          .querySelectorAll('#mainGrid .cell')
          .forEach(c => {

            const im =
              getCellMonsterElement(c);

            if (
              im &&
              im.dataset &&
              im.dataset.species ===
                targetSpecies
            ) {

              if (
                gridType !== '6' ||
                im.dataset.player ===
                  currentPlayer
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


        // --------------------------------
        // 配置
        // --------------------------------

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


        fillCellWithMonster(
          cell,
          {

            src:
              currentSelected.imgUrl,

            species:
              targetSpecies,

            tier:
              targetTier,

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
          }
        );


        // 選択解除
        currentSelected = null;

        if (selectedNameEl) {
          selectedNameEl.textContent =
            'なし';
        }


        saveBoardState();

        renderMonsters();
      }
    );


    mainGrid.appendChild(cell);
  }


  // 保存状態読み込み
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

    const species =
      baseM.species;


    let activeTierNum =
      speciesTiersMap[species][0];

    let displayMonster =
      baseM;


    // ------------------------------------
    // 現在選択中のティア
    // ------------------------------------

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


    // ------------------------------------
    // モンスターカード
    // ------------------------------------

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
      <img
        class="monster-type-icon"
        src="${typeImgUrl}"
        alt="${baseM.type}"
        onerror="this.style.display='none'"
        draggable="false"
      >

      <img
        class="monster-thumb"
        src="${imgUrl}"
        alt="${name}"
        draggable="false"
        onerror="
          if(!this.dataset.retry){
            this.dataset.retry=1;
            this.src='${name}.png';
          }else if(this.dataset.retry=='1'){
            this.dataset.retry=2;
            this.src='${name}.jpg';
          }else{
            this.outerHTML='<div class=\\'no-image-badge\\'>🌸 no image 🌸</div>';
          }
        "
      >

      <div class="monster-name">
        ${name}
      </div>
    `;


    // ------------------------------------
    // ドラッグ / タップ
    // ------------------------------------

    item.addEventListener(
      'pointerdown',
      (e) => {

        e.stopPropagation();


        if (
          e.button !== 0 &&
          e.pointerType === 'mouse'
        ) {
          return;
        }


        // レベルモード中はモンスター選択を無効
        if (levelMode) {
          return;
        }


        const pointerId =
          e.pointerId;

        const startX =
          e.clientX;

        const startY =
          e.clientY;

        let isDragging =
          false;


        const availableTiers =
          speciesTiersMap[species];


        // ----------------------------------
        // 選択するデータ
        // ----------------------------------

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

            species:
              species,

            tierNum:
              minTier,

            name:
              t1Monster.name,

            imgUrl:
              `${t1Monster.name}.webp`,

            type:
              t1Monster.type
          };
        }


        // ----------------------------------
        // 移動
        // ----------------------------------

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


              updateGhostPosition(
                moveEvent.clientX,
                moveEvent.clientY
              );
            }
          }


          if (isDragging) {

            if (moveEvent.cancelable) {
              moveEvent.preventDefault();
            }


            updateGhostPosition(
              moveEvent.clientX,
              moveEvent.clientY
            );


            updateHoverHighlight(
              moveEvent.clientX,
              moveEvent.clientY
            );
          }
        }


        // ----------------------------------
        // 指を離した
        // ----------------------------------

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


          try {
            item.releasePointerCapture(
              pointerId
            );
          } catch (err) {}


          clearHoverHighlight();


          // ================================
          // タップ
          // ================================

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

                currentSelected =
                  null;
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


          // ================================
          // ドラッグ
          // ================================

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


            // ------------------------------
            // 配置数
            // ------------------------------

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
              existingMonster.dataset.species ===
                targetSpecies &&
              (
                currentGridType !== '6' ||
                existingMonster.dataset.player ===
                  draggingItem.player
              );


            // ------------------------------
            // 最大数チェック
            // ------------------------------

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


              if (
                currentGridType === '6'
              ) {

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


            // ------------------------------
            // 同種族チェック
            // ------------------------------

            let isSpeciesOnBoard =
              false;


            cells.forEach(
              (c, idx) => {

                if (
                  idx === targetIndex
                ) {
                  return;
                }


                const im =
                  getCellMonsterElement(c);


                if (
                  im &&
                  im.dataset &&
                  im.dataset.species ===
                    targetSpecies
                ) {

                  if (
                    currentGridType !== '6' ||
                    im.dataset.player ===
                      draggingItem.player
                  ) {

                    isSpeciesOnBoard =
                      true;
                  }
                }
              }
            );


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


            // ------------------------------
            // 配置
            // ------------------------------

            targetCell.className =
              'cell';


            if (
              currentGridType === '6'
            ) {

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
      }
    );


    monsterGrid.appendChild(item);
  });
}


// ========================================
// アプリ全体クリック
// ========================================

document
  .getElementById('appContainer')
  ?.addEventListener(
    'click',
    (e) => {

      if (
        !e.target.closest(
          '.cell, .board-slot'
        ) &&
        !e.target.closest(
          '.monster-item'
        )
      ) {

        if (currentSelected) {

          currentSelected =
            null;

          if (selectedNameEl) {
            selectedNameEl.textContent =
              'なし';
          }

          renderMonsters();
        }
      }
    }
  );


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

    btn.addEventListener(
      'click',
      (e) => {

        e.stopPropagation();

        btns.forEach(
          b => b.classList.remove('active')
        );

        btn.classList.add('active');

        callback(
          btn.dataset[attrName]
        );

        renderMonsters();
      }
    );
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
  ?.addEventListener(
    'click',
    (e) => {

      e.stopPropagation();

      currentSelected =
        null;

      setLevelMode(false);


      if (selectedNameEl) {
        selectedNameEl.textContent =
          'なし';
      }


      document
        .querySelectorAll('.cell')
        .forEach(cell => {

          cell.innerHTML = '';

          cell.className =
            'cell';

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
    }
  );


// ========================================
// 画像保存
// ========================================

document
  .getElementById('saveBtn')
  ?.addEventListener(
    'click',
    (e) => {

      e.stopPropagation();

      const boardFrame =
        document.getElementById(
          'boardFrame'
        );

      const titleInput =
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


      let titleText =
        'タタ配置ツール';


      if (
        titleInput &&
        titleInput.value.trim() !== ''
      ) {

        titleText =
          titleInput.value.trim();
      }


      const originalPlayerSwitchDisplay =
        playerSwitchContainer
          ? playerSwitchContainer.style.display
          : '';


      if (playerSwitchContainer) {
        playerSwitchContainer.style.display =
          'none';
      }


      const captureContainer =
        document.createElement('div');


      captureContainer.style.position =
        'absolute';

      captureContainer.style.top =
        '-9999px';

      captureContainer.style.left =
        '-9999px';

      captureContainer.style.width =
        `${boardFrame.offsetWidth}px`;

      captureContainer.style.background =
        '#181a29';

      captureContainer.style.padding =
        '16px';

      captureContainer.style.boxSizing =
        'border-box';

      captureContainer.style.borderRadius =
        '12px';


      const titleEl =
        document.createElement('div');


      titleEl.textContent =
        titleText;


      titleEl.style.fontSize =
        '20px';

      titleEl.style.fontWeight =
        'bold';

      titleEl.style.color =
        '#f8fafc';

      titleEl.style.textAlign =
        'center';

      titleEl.style.marginBottom =
        '12px';

      titleEl.style.fontFamily =
        'sans-serif';


      const boardClone =
        boardFrame.cloneNode(true);


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


      captureContainer.appendChild(
        titleEl
      );

      captureContainer.appendChild(
        boardClone
      );


      // ゾンビラッシュならチップも保存
      if (
        currentGridType === '6'
      ) {

        const chipsetContainer =
          document.getElementById(
            'chipsetContainer'
          );


        if (
          chipsetContainer &&
          chipsetContainer.style.display !==
            'none'
        ) {

          const chipsetClone =
            chipsetContainer.cloneNode(
              true
            );

          captureContainer.appendChild(
            chipsetClone
          );
        }
      }


      document.body.appendChild(
        captureContainer
      );


      html2canvas(
        captureContainer,
        {

          backgroundColor:
            '#181a29',

          scale: 3,

          useCORS: true,

          logging: false
        }
      )
      .then(canvas => {

        document.body.removeChild(
          captureContainer
        );


        if (playerSwitchContainer) {

          playerSwitchContainer.style.display =
            originalPlayerSwitchDisplay;
        }


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

      })
      .catch(err => {

        console.error(
          '画像保存エラー:',
          err
        );


        alert(
          '画像の保存に失敗しました。'
        );


        if (playerSwitchContainer) {

          playerSwitchContainer.style.display =
            originalPlayerSwitchDisplay;
        }


        if (
          document.body.contains(
            captureContainer
          )
        ) {

          document.body.removeChild(
            captureContainer
          );
        }
      });
    }
  );


// ========================================
// 1P / 2P切り替え
// ========================================

btn1P?.addEventListener(
  'click',
  (e) => {

    e.stopPropagation();

    currentPlayer =
      '1P';


    btn1P.classList.add(
      'active'
    );

    btn2P?.classList.remove(
      'active'
    );


    applyChipsToSlots();


    if (
      currentSelectionMode ===
      'chip'
    ) {

      renderChips();
    }
  }
);


btn2P?.addEventListener(
  'click',
  (e) => {

    e.stopPropagation();

    currentPlayer =
      '2P';


    btn2P.classList.add(
      'active'
    );

    btn1P?.classList.remove(
      'active'
    );


    applyChipsToSlots();


    if (
      currentSelectionMode ===
      'chip'
    ) {

      renderChips();
    }
  }
);


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

    if (
      currentGridType !== '5'
    ) {

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


    currentSelected =
      null;


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

    if (
      currentGridType !== '6'
    ) {

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


    currentSelected =
      null;


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

    if (
      currentGridType !== '3x4'
    ) {

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


    currentSelected =
      null;


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
// 初期化
// ========================================

buildBoard(
  currentGridType
);

renderMonsters();
