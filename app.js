// 選択中のモード（'monster' または 'chip'）
let currentSelectionMode = 'monster';
// プレイヤーごとの選択されたチップのリスト（最大3枚）
let selectedChipsMap = {
  '1P': [],
  '2P': []
};

// チップセットエリアの表示・非表示を切り替える関数を更新
function updateChipsetAreaVisibility(isZombieStage) {
  const chipsetContainer = document.getElementById('chipsetContainer');
  const monsterTitle = document.querySelector('.monster-title');
  
  if (chipsetContainer) {
    chipsetContainer.style.display = isZombieStage ? 'block' : 'none';
  }

  // ゾンビラッシュ時のみ、モンスター選択エリアにタブ（切り替えボタン）を挿入・表示する
  let modeSwitch = document.getElementById('selectionModeSwitch');
  if (isZombieStage) {
    if (!modeSwitch) {
      modeSwitch = document.createElement('div');
      modeSwitch.id = 'selectionModeSwitch';
      modeSwitch.style.cssText = 'display: flex; gap: 8px; margin-bottom: 10px; flex-shrink: 0;';
      modeSwitch.innerHTML = `
        <button id="modeMonsterBtn" class="filter-btn active" style="flex: 1; padding: 6px; text-align: center; cursor: pointer;">タタ選択</button>
        <button id="modeChipBtn" class="filter-btn" style="flex: 1; padding: 6px; text-align: center; cursor: pointer;">チップ選択</button>
      `;
      monsterTitle.after(modeSwitch);

      document.getElementById('modeMonsterBtn').addEventListener('click', () => {
        currentSelectionMode = 'monster';
        document.getElementById('modeMonsterBtn').classList.add('active');
        document.getElementById('modeChipBtn').classList.remove('active');
        document.querySelector('.filter-details').style.display = 'block';
        renderMonsters();
      });

      document.getElementById('modeChipBtn').addEventListener('click', () => {
        currentSelectionMode = 'chip';
        document.getElementById('modeChipBtn').classList.add('active');
        document.getElementById('modeMonsterBtn').classList.remove('active');
        document.querySelector('.filter-details').style.display = 'none';
        renderChips();
      });
    } else {
      modeSwitch.style.display = 'flex';
    }
  } else {
    if (modeSwitch) modeSwitch.style.display = 'none';
    currentSelectionMode = 'monster';
    document.querySelector('.filter-details').style.display = 'block';
  }
}

// チップ一覧を描画する関数（画像歪み防止スタイル修正版）
function renderChips() {
  monsterGrid.innerHTML = '';

  const selectedChips = selectedChipsMap[currentPlayer];

  // セットボタン用のコンテナを作成・配置（スクロール時に上部に追従するsticky配置）
  const actionArea = document.createElement('div');
  actionArea.style.cssText = 'grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; background: #1e293b; padding: 8px 12px; border-radius: 6px; box-sizing: border-box; width: 100%; position: sticky; top: 0; z-index: 10;';
  actionArea.innerHTML = `
    <span style="font-size: 12px; color: #cbd5e1; white-space: nowrap;">[${currentPlayer}] 選択中: <strong id="selectedChipCount" style="color: #4ade80;">${selectedChips.length}</strong> / 3枚</span>
    <button id="setChipsBtn" class="btn" style="background: #2563eb; border-color: #3b82f6; color: #fff; padding: 6px 14px; font-size: 12px; cursor: pointer; white-space: nowrap; flex-shrink: 0;">セットする</button>
  `;
  monsterGrid.appendChild(actionArea);

  document.getElementById('setChipsBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    applyChipsToSlots();
  });

  // 全49種のチップを描画
  chipsetList.forEach(chip => {
    const isSelected = selectedChips.some(c => c.id === chip.id);
    const item = document.createElement('div');
    item.className = `monster-item ${isSelected ? 'active' : ''}`;
    // タッチやホイールでのスクロール操作が阻害されないよう touch-action を指定
    item.style.cssText = 'position: relative; aspect-ratio: 1 / 1; background: #0f172a; border: 1px solid #334155; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; touch-action: pan-y; padding: 2px; box-sizing: border-box;';

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

// 1P・2P両方の選択したチップを各専用スロットに反映する関数（画像歪み防止スタイル修正版）
function applyChipsToSlots() {
  // 1Pのチップを反映
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

  // 2Pのチップを反映
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

// 全データをマッピング
const allMonsters = rawMonstersData.map(m => ({
  name: m.name,
  species: m.species,
  attr: m.type,
  tier: "T" + m.T,
  tierNum: m.T,
  type: m.role
}));

// 各種族が持っているTierのリストをマッピング
const speciesTiersMap = {};
allMonsters.forEach(m => {
  if (!speciesTiersMap[m.species]) speciesTiersMap[m.species] = [];
  if (!speciesTiersMap[m.species].includes(m.tierNum)) {
    speciesTiersMap[m.species].push(m.tierNum);
  }
});
Object.keys(speciesTiersMap).forEach(species => {
  speciesTiersMap[species].sort((a, b) => a - b);
});

// 一覧には各種族の最も低いTierのデータのみを抽出してベースにする
const baseMonstersMap = new Map();
allMonsters.forEach(m => {
  if (!baseMonstersMap.has(m.species) || m.tierNum < baseMonstersMap.get(m.species).tierNum) {
    baseMonstersMap.set(m.species, m);
  }
});
const monstersData = Array.from(baseMonstersMap.values());

let currentSelected = null; // { species, tierNum, name, imgUrl }
let currentAttr = "all";
let currentType = "all";
let currentGridSize = parseInt(localStorage.getItem('monsterBoard_size')) || 5;
let currentPlayer = "1P";

// ドラッグ＆ドロップ用の状態管理
let draggingItem = null; // { type: 'board'|'palette', src, species, tier, player, sourceIndex }
const dragGhost = document.getElementById('dragGhost');

const mainGrid = document.getElementById('mainGrid');
const monsterFrame = document.getElementById('monsterFrame');
const playerSwitchContainer = document.getElementById('playerSwitchContainer');
const btn1P = document.getElementById('btn1P');
const btn2P = document.getElementById('btn2P');
const normalStageBtn = document.getElementById('normalStageBtn');
const zombieStageBtn = document.getElementById('zombieStageBtn');
const selectedNameEl = document.getElementById('selectedName');

// --- ドロップ位置のハイライト処理（キャッシュ最適化） ---
let currentHoveredCell = null;

function updateHoverHighlight(x, y) {
  const dropTarget = document.elementFromPoint(x, y);
  const targetCell = dropTarget ? dropTarget.closest('.cell, .board-slot') : null;
  
  if (targetCell && mainGrid.contains(targetCell)) {
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

// ローカルストレージに盤面状態を保存する関数
function saveBoardState() {
  const cellsData = [];
  document.querySelectorAll('#mainGrid .cell').forEach((indexCell, index) => {
    const img = indexCell.querySelector('img');
    if (img) {
      cellsData.push({
        index: index,
        src: img.src,
        species: img.dataset.species,
        tier: img.dataset.tier,
        player: img.dataset.player,
        className: indexCell.className
      });
    }
  });
  localStorage.setItem('monsterBoard_size', currentGridSize);
  localStorage.setItem('monsterBoard_cells', JSON.stringify(cellsData));
  localStorage.setItem('monsterBoard_chips', JSON.stringify(selectedChipsMap));
}

// ローカルストレージから盤面状態を復元する関数
function loadBoardState() {
  const savedCells = JSON.parse(localStorage.getItem('monsterBoard_cells') || '[]');
  savedCells.forEach(data => {
    const cell = mainGrid.children[data.index];
    if (cell) {
      fillCellWithMonster(cell, data);
    }
  });

  const savedChips = JSON.parse(localStorage.getItem('monsterBoard_chips') || 'null');
  if (savedChips) {
    selectedChipsMap = savedChips;
  }
  applyChipsToSlots();
}

// セルにモンスター画像を設定し、ポインターイベントを付与する
function fillCellWithMonster(cell, data) {
  cell.className = data.className;
  cell.innerHTML = `
    <img src="${data.src}" 
         alt="" 
         data-species="${data.species}" 
         data-tier="${data.tier}"
         data-player="${data.player}"
         draggable="false"
         style="max-width: 100%; max-height: 100%; width: auto; height: auto; object-fit: contain; pointer-events: auto; touch-action: none; display: block; margin: auto;"
         onerror="this.outerHTML='<div class=\\'no-image-badge\\'>🌸 no image 🌸</div>';">
  `;

  const targetEl = cell.querySelector('img') || cell.querySelector('.no-image-badge');
  
  if (targetEl) {
    targetEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.cancelable) e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      let isDragging = false;

      const cells = Array.from(mainGrid.children);
      const sourceIndex = cells.indexOf(cell);

      const species = targetEl.dataset ? targetEl.dataset.species : data.species;
      const tier = targetEl.dataset ? targetEl.dataset.tier : data.tier;
      const player = targetEl.dataset ? targetEl.dataset.player : data.player;

      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!isDragging && Math.hypot(dx, dy) > 5) {
          isDragging = true;
          draggingItem = {
            type: 'board',
            src: data.src,
            species: species,
            tier: tier,
            player: player,
            sourceIndex: sourceIndex,
            sourceClassName: cell.className
          };

          dragGhost.style.backgroundImage = `url(${data.src})`;
          dragGhost.style.display = 'block';
          updateGhostPosition(moveEvent.clientX, moveEvent.clientY);

          cell.innerHTML = '';
          cell.className = 'cell';
        }

        if (isDragging) {
          updateGhostPosition(moveEvent.clientX, moveEvent.clientY);
          updateHoverHighlight(moveEvent.clientX, moveEvent.clientY);
        }
      }

      function onUp(upEvent) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        clearHoverHighlight();

        if (!isDragging) {
          cell.innerHTML = '';
          cell.className = 'cell';
          saveBoardState();
          return;
        }

        dragGhost.style.display = 'none';
        const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const targetCell = dropTarget ? dropTarget.closest('.cell, .board-slot') : null;
        const isOverMonsterFrame = dropTarget && monsterFrame.contains(dropTarget);

        if (isOverMonsterFrame) {
          draggingItem = null;
          saveBoardState();
          return;
        }

        if (!targetCell || !mainGrid.contains(targetCell)) {
          revertToSourceCell();
          return;
        }

        const targetIndex = cells.indexOf(targetCell);
        
        const existingImg = targetCell.querySelector('img, .no-image-badge');
        let targetCellData = null;
        if (existingImg && existingImg.dataset) {
          targetCellData = {
            src: existingImg.src,
            species: existingImg.dataset.species,
            tier: existingImg.dataset.tier,
            player: existingImg.dataset.player,
            className: targetCell.className
          };
        }

        const targetSpecies = draggingItem.species;

        let isSpeciesOnBoard = false;
        cells.forEach((c, idx) => {
          if (idx === targetIndex || idx === sourceIndex) return;
          const im = c.querySelector('img, .no-image-badge');
          if (im && im.dataset && im.dataset.species === targetSpecies) {
            if (currentGridSize === 5 || im.dataset.player === draggingItem.player) {
              isSpeciesOnBoard = true;
            }
          }
        });

        if (isSpeciesOnBoard) {
          const playerText = (currentGridSize === 6) ? `[${draggingItem.player}]` : "";
          alert(`${playerText} 同じ種族のタタは既に盤面に配置されています。`);
          revertToSourceCell();
          return;
        }

        targetCell.className = 'cell';
        if (currentGridSize === 6) {
          targetCell.classList.add(draggingItem.player === '1P' ? 'p1-cell' : 'p2-cell');
        }

        fillCellWithMonster(targetCell, {
          src: draggingItem.src,
          species: draggingItem.species,
          tier: draggingItem.tier,
          player: draggingItem.player,
          className: targetCell.className
        });

        const sourceCell = cells[sourceIndex];
        if (targetCellData && sourceCell) {
          fillCellWithMonster(sourceCell, targetCellData);
        }

        draggingItem = null;
        saveBoardState();
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }
}

function updateGhostPosition(x, y) {
  dragGhost.style.left = `${x - 25}px`;
  dragGhost.style.top = `${y - 25}px`;
}

function revertToSourceCell() {
  if (!draggingItem || draggingItem.type !== 'board') return;
  const cells = Array.from(mainGrid.children);
  const sourceCell = cells[draggingItem.sourceIndex];
  if (sourceCell) {
    fillCellWithMonster(sourceCell, {
      src: draggingItem.src,
      species: draggingItem.species,
      tier: draggingItem.tier,
      player: draggingItem.player,
      className: draggingItem.sourceClassName
    });
  }
  draggingItem = null;
  saveBoardState();
}

function buildBoard(size) {
  currentGridSize = size;
  mainGrid.className = `grid-${size}x${size}`;
  
  if (size === 6) {
    playerSwitchContainer.classList.add('show');
    zombieStageBtn.classList.add('active');
    normalStageBtn.classList.remove('active');
    updateChipsetAreaVisibility(true);
  } else {
    playerSwitchContainer.classList.remove('show');
    normalStageBtn.classList.add('active');
    zombieStageBtn.classList.remove('active');
    currentPlayer = "1P";
    updateChipsetAreaVisibility(false);
  }

  mainGrid.innerHTML = '';
  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    
    cell.addEventListener('click', (e) => {
      e.stopPropagation();

      if (!currentSelected) {
        cell.innerHTML = '';
        cell.className = 'cell';
        saveBoardState();
        return;
      }

      const targetSpecies = currentSelected.species;
      const targetTier = currentSelected.tierNum;
      
      let totalCount = 0;
      let p1Count = 0;
      let p2Count = 0;
      document.querySelectorAll('#mainGrid .cell').forEach(c => {
        const im = c.querySelector('img, .no-image-badge');
        if (im) {
          totalCount++;
          if (im.dataset && im.dataset.player === '1P') p1Count++;
          if (im.dataset && im.dataset.player === '2P') p2Count++;
        }
      });

      const existingImg = cell.querySelector('img, .no-image-badge');
      const isReplacingSelf = existingImg && existingImg.dataset &&
                              existingImg.dataset.species === targetSpecies &&
                              (currentGridSize === 5 || existingImg.dataset.player === currentPlayer);

      if (!isReplacingSelf) {
        if (currentGridSize === 5 && totalCount >= 15) {
          alert('ノーマルステージでは最大15体までしか配置できません。');
          return;
        }
        if (currentGridSize === 6) {
          if (currentPlayer === '1P' && p1Count >= 15) {
            alert('1Pは最大15体までしか配置できません。');
            return;
          }
          if (currentPlayer === '2P' && p2Count >= 15) {
            alert('2Pは最大15体までしか配置できません。');
            return;
          }
        }
      }

      let isSpeciesOnBoard = false;
      document.querySelectorAll('#mainGrid .cell').forEach(c => {
        const im = c.querySelector('img, .no-image-badge');
        if (im && im.dataset && im.dataset.species === targetSpecies) {
          if (currentGridSize === 5 || im.dataset.player === currentPlayer) {
            if (c !== cell) {
              isSpeciesOnBoard = true;
            }
          }
        }
      });

      if (isSpeciesOnBoard) {
        const playerText = (currentGridSize === 6) ? `[${currentPlayer}]` : "";
        alert(`${playerText} 同じ種族のタタは既に盤面に配置されています。`);
        return;
      }

      const newCellClassName = 'cell ' + (currentGridSize === 6 ? (currentPlayer === '1P' ? 'p1-cell' : 'p2-cell') : '');
      
      fillCellWithMonster(cell, {
        src: currentSelected.imgUrl,
        species: targetSpecies,
        tier: targetTier,
        player: currentGridSize === 6 ? currentPlayer : '1P',
        className: newCellClassName.trim()
      });
      
      currentSelected = null;
      selectedNameEl.textContent = 'なし';
      saveBoardState();
      renderMonsters();
    });

    mainGrid.appendChild(cell);
  }

  loadBoardState();
}

const monsterGrid = document.getElementById('monsterGrid');

function renderMonsters() {
  if (currentSelectionMode === 'chip' && currentGridSize === 6) {
    renderChips();
    return;
  }

  monsterGrid.innerHTML = '';

  const filtered = monstersData.filter(m => {
    const matchAttr = (currentAttr === 'all' || m.attr === currentAttr);
    const matchType = (currentType === 'all' || m.type === currentType);
    return matchAttr && matchType;
  });

  filtered.forEach(baseM => {
    const species = baseM.species;

    let activeTierNum = speciesTiersMap[species][0];
    let displayMonster = baseM;

    if (currentSelected && currentSelected.species === species) {
      activeTierNum = currentSelected.tierNum;
      const found = allMonsters.find(m => m.species === species && m.tierNum === activeTierNum);
      if (found) displayMonster = found;
    }

    const name = displayMonster.name;
    const imgUrl = `${name}.webp`;
    const typeImgUrl = `${baseM.type}.webp`;
    
    const item = document.createElement('div');
    item.className = 'monster-item';
    item.dataset.attr = baseM.attr;
    
    if (currentSelected && currentSelected.species === species) {
      item.classList.add('active');
    }

    item.innerHTML = `
      <img class="monster-type-icon" src="${typeImgUrl}" alt="${baseM.type}" onerror="this.style.display='none'" draggable="false">
      <img class="monster-thumb" src="${imgUrl}" alt="${name}" draggable="false" onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src='${name}.png';}else if(this.dataset.retry=='1'){this.dataset.retry=2;this.src='${name}.jpg';}else{this.outerHTML='<div class=\\'no-image-badge\\'>🌸 no image 🌸</div>';}">
      <div class="monster-name">${name}</div>
    `;

    item.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const startX = e.clientX;
      const startY = e.clientY;
      let isDragging = false;

      const availableTiers = speciesTiersMap[species];
      
      let paletteItemData;
      if (currentSelected && currentSelected.species === species) {
        paletteItemData = {
          species: currentSelected.species,
          tierNum: currentSelected.tierNum,
          name: currentSelected.name,
          imgUrl: currentSelected.imgUrl
        };
      } else {
        const minTier = availableTiers[0];
        const t1Monster = allMonsters.find(m => m.species === species && m.tierNum === minTier) || baseM;
        paletteItemData = {
          species: species,
          tierNum: minTier,
          name: t1Monster.name,
          imgUrl: `${t1Monster.name}.webp`
        };
      }

      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (!isDragging && Math.hypot(dx, dy) > 5) {
          isDragging = true;
          draggingItem = {
            type: 'palette',
            src: paletteItemData.imgUrl,
            species: paletteItemData.species,
            tier: paletteItemData.tierNum,
            player: currentGridSize === 6 ? currentPlayer : '1P'
          };

          dragGhost.style.backgroundImage = `url(${paletteItemData.imgUrl})`;
          dragGhost.style.display = 'block';
          updateGhostPosition(moveEvent.clientX, moveEvent.clientY);
        }

        if (isDragging) {
          updateGhostPosition(moveEvent.clientX, moveEvent.clientY);
          updateHoverHighlight(moveEvent.clientX, moveEvent.clientY);
        }
      }

      function onUp(upEvent) {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        clearHoverHighlight();

        if (!isDragging) {
          if (currentSelected && currentSelected.species === species) {
            const currentIndex = availableTiers.indexOf(currentSelected.tierNum);
            if (currentIndex < availableTiers.length - 1) {
              const nextTier = availableTiers[currentIndex + 1];
              currentSelected.tierNum = nextTier;
              const nextM = allMonsters.find(m => m.species === species && m.tierNum === nextTier);
              if (nextM) {
                currentSelected.name = nextM.name;
                currentSelected.imgUrl = `${nextM.name}.webp`;
              }
            } else {
              currentSelected = null;
            }
          } else {
            currentSelected = paletteItemData;
          }

          renderMonsters();
          if (currentSelected) {
            selectedNameEl.textContent = `${currentSelected.name} (T${currentSelected.tierNum})`;
          } else {
            selectedNameEl.textContent = 'なし';
          }
          return;
        }

        dragGhost.style.display = 'none';
        const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const targetCell = dropTarget ? dropTarget.closest('.cell, .board-slot') : null;
        const cells = Array.from(mainGrid.children);

        if (targetCell && mainGrid.contains(targetCell)) {
          const targetIndex = cells.indexOf(targetCell);
          const existingImg = targetCell.querySelector('img, .no-image-badge');
          const targetSpecies = draggingItem.species;

          let totalCount = 0;
          let p1Count = 0;
          let p2Count = 0;
          cells.forEach(c => {
            const im = c.querySelector('img, .no-image-badge');
            if (im) {
              totalCount++;
              if (im.dataset && im.dataset.player === '1P') p1Count++;
              if (im.dataset && im.dataset.player === '2P') p2Count++;
            }
          });

          const isReplacingSelf = existingImg && existingImg.dataset &&
                                  existingImg.dataset.species === targetSpecies &&
                                  (currentGridSize === 5 || existingImg.dataset.player === draggingItem.player);

          if (!isReplacingSelf) {
            if (currentGridSize === 5 && totalCount >= 15) {
              alert('ノーマルステージでは最大15体までしか配置できません。');
              draggingItem = null;
              return;
            }
            if (currentGridSize === 6) {
              if (draggingItem.player === '1P' && p1Count >= 15) {
                alert('1Pは最大15体までしか配置できません。');
                draggingItem = null;
                return;
              }
              if (draggingItem.player === '2P' && p2Count >= 15) {
                alert('2Pは最大15体までしか配置できません。');
                draggingItem = null;
                return;
              }
            }
          }

          let isSpeciesOnBoard = false;
          cells.forEach((c, idx) => {
            if (idx === targetIndex) return;
            const im = c.querySelector('img, .no-image-badge');
            if (im && im.dataset && im.dataset.species === targetSpecies) {
              if (currentGridSize === 5 || im.dataset.player === draggingItem.player) {
                isSpeciesOnBoard = true;
              }
            }
          });

          if (isSpeciesOnBoard) {
            const playerText = (currentGridSize === 6) ? `[${draggingItem.player}]` : "";
            alert(`${playerText} 同じ種族のタタは既に盤面に配置されています。`);
            draggingItem = null;
            return;
          }

          targetCell.className = 'cell';
          if (currentGridSize === 6) {
            targetCell.classList.add(draggingItem.player === '1P' ? 'p1-cell' : 'p2-cell');
          }

          fillCellWithMonster(targetCell, {
            src: draggingItem.src,
            species: draggingItem.species,
            tier: draggingItem.tier,
            player: draggingItem.player,
            className: targetCell.className
          });

          saveBoardState();
        }

        draggingItem = null;
      }

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    monsterGrid.appendChild(item);
  });
}

// 選択解除機能
document.getElementById('appContainer').addEventListener('click', (e) => {
  if (!e.target.closest('.cell, .board-slot') && !e.target.closest('.monster-item')) {
    if (currentSelected) {
      currentSelected = null;
      selectedNameEl.textContent = 'なし';
      renderMonsters();
    }
  }
});

function setupFilter(groupId, attrName, callback) {
  const btns = document.querySelectorAll(`#${groupId} .filter-btn`);
  btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset[attrName]);
      renderMonsters();
    });
  });
}

setupFilter('attrFilterGroup', 'attr', val => currentAttr = val);
setupFilter('typeFilterGroup', 'type', val => currentType = val);

document.getElementById('clearBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  currentSelected = null;
  selectedNameEl.textContent = 'なし';
  document.querySelectorAll('.cell').forEach(cell => {
    cell.innerHTML = '';
    cell.className = 'cell';
  });
  localStorage.removeItem('monsterBoard_cells');
  localStorage.removeItem('monsterBoard_chips');
  selectedChipsMap = { '1P': [], '2P': [] };
  applyChipsToSlots();
  renderMonsters();
});

// 保存ボタン処理（キャプチャ時のチップ画像のアスペクト比維持補正含む）
document.getElementById('saveBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  
  const boardFrame = document.getElementById('boardFrame');
  const titleInput = document.getElementById('appTitleInput');
  const playerSwitchContainer = document.getElementById('playerSwitchContainer');
  
  let titleText = 'タタ配置ツール';
  if (titleInput && titleInput.value.trim() !== '') {
    titleText = titleInput.value.trim();
  }

  const originalPlayerSwitchDisplay = playerSwitchContainer.style.display;
  playerSwitchContainer.style.display = 'none';

  const captureContainer = document.createElement('div');
  captureContainer.style.position = 'absolute';
  captureContainer.style.top = '-9999px';
  captureContainer.style.left = '-9999px';
  captureContainer.style.width = `${boardFrame.offsetWidth}px`;
  captureContainer.style.background = '#181a29';
  captureContainer.style.padding = '16px';
  captureContainer.style.boxSizing = 'border-box';
  captureContainer.style.borderRadius = '12px';

  const titleEl = document.createElement('div');
  titleEl.textContent = titleText;
  titleEl.style.fontSize = '20px';
  titleEl.style.fontWeight = 'bold';
  titleEl.style.color = '#f8fafc';
  titleEl.style.textAlign = 'center';
  titleEl.style.marginBottom = '12px';
  titleEl.style.fontFamily = 'sans-serif';

  const boardClone = boardFrame.cloneNode(true);

  // セル及び内部の画像が引き伸ばされたり変形しないようスタイルの補正を行う
  const cells = boardClone.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.style.aspectRatio = '1 / 1';
    cell.style.display = 'flex';
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
    
    const img = cell.querySelector('img');
    if (img) {
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100%';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      img.style.margin = 'auto';
    }
  });

  captureContainer.appendChild(titleEl);
  captureContainer.appendChild(boardClone);

  if (currentGridSize === 6) {
    const chipsetContainer = document.getElementById('chipsetContainer');
    if (chipsetContainer && chipsetContainer.style.display !== 'none') {
      const chipsetClone = chipsetContainer.cloneNode(true);

      // キャプチャ内のチップスロット画像の比率歪みを防止
      const slotImgs = chipsetClone.querySelectorAll('.chipset-slot img');
      slotImgs.forEach(img => {
        img.style.maxWidth = '100%';
        img.style.maxHeight = '100%';
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.display = 'block';
        img.style.margin = 'auto';
      });

      captureContainer.appendChild(chipsetClone);
    }
  }

  document.body.appendChild(captureContainer);

  html2canvas(captureContainer, {
    backgroundColor: '#181a29',
    scale: 3, 
    useCORS: true,
    logging: false
  }).then(canvas => {
    document.body.removeChild(captureContainer);
    playerSwitchContainer.style.display = originalPlayerSwitchDisplay;

    const imageURL = canvas.toDataURL('image/webp', 0.98);
    const downloadLink = document.createElement('a');
    downloadLink.href = imageURL;
    downloadLink.download = `${titleText}-${currentGridSize}x${currentGridSize}.webp`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }).catch(err => {
    console.error('画像保存エラー:', err);
    alert('画像の保存に失敗しました。');
    playerSwitchContainer.style.display = originalPlayerSwitchDisplay;
    if (document.body.contains(captureContainer)) {
      document.body.removeChild(captureContainer);
    }
  });
});

btn1P.addEventListener('click', (e) => {
  e.stopPropagation();
  currentPlayer = "1P";
  btn1P.classList.add('active');
  btn2P.classList.remove('active');
  applyChipsToSlots();
  if (currentSelectionMode === 'chip') {
    renderChips();
  }
});

btn2P.addEventListener('click', (e) => {
  e.stopPropagation();
  currentPlayer = "2P";
  btn2P.classList.add('active');
  btn1P.classList.remove('active');
  applyChipsToSlots();
  if (currentSelectionMode === 'chip') {
    renderChips();
  }
});

const menuOpenBtn = document.getElementById('menuOpenBtn');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerMenu = document.getElementById('drawerMenu');

menuOpenBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  drawerOverlay.classList.add('open');
});

drawerOverlay.addEventListener('click', (e) => {
  if (e.target === drawerOverlay) {
    drawerOverlay.classList.remove('open');
  }
});

drawerMenu.addEventListener('click', (e) => {
  e.stopPropagation();
});

normalStageBtn.addEventListener('click', () => {
  if (currentGridSize !== 5) {
    localStorage.removeItem('monsterBoard_cells');
    localStorage.removeItem('monsterBoard_chips');
  }
  currentSelected = null;
  selectedNameEl.textContent = 'なし';
  buildBoard(5);
  renderMonsters();
  drawerOverlay.classList.remove('open');
});

zombieStageBtn.addEventListener('click', () => {
  if (currentGridSize !== 6) {
    localStorage.removeItem('monsterBoard_cells');
    localStorage.removeItem('monsterBoard_chips');
  }
  currentSelected = null;
  selectedNameEl.textContent = 'なし';
  buildBoard(6);
  renderMonsters();
  drawerOverlay.classList.remove('open');
});

// 初期化実行
buildBoard(currentGridSize);
renderMonsters();
