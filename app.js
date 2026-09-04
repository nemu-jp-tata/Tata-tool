// ==========================================
// 1. 変数定義・初期設定
// ==========================================

// 選択中のモード（'monster' または 'chip'）
let currentSelectionMode = 'monster';

// プレイヤーごとの選択されたチップのリスト（最大3枚）
let selectedChipsMap = {
  '1P': [],
  '2P': []
};

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
const monsterGrid = document.getElementById('monsterGrid');
const playerSwitchContainer = document.getElementById('playerSwitchContainer');
const btn1P = document.getElementById('btn1P');
const btn2P = document.getElementById('btn2P');
const normalStageBtn = document.getElementById('normalStageBtn');
const zombieStageBtn = document.getElementById('zombieStageBtn');
const selectedNameEl = document.getElementById('selectedName');

// --- ドロップ位置のハイライト処理 ---
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

function updateGhostPosition(x, y) {
  dragGhost.style.left = `${x - 25}px`;
  dragGhost.style.top = `${y - 25}px`;
}

// ==========================================
// 2. 状態保存・復元処理
// ==========================================

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

// ==========================================
// 3. 盤面セル操作（ドラッグ判定最適化）
// ==========================================

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
    ${data.tier ? `<div class="tier-badge">T${data.tier}</div>` : ''}
  `;

  const targetEl = cell.querySelector('img') || cell.querySelector('.no-image-badge');
  
  if (targetEl) {
    targetEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0 && e.pointerType === 'mouse') return;

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
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (!isDragging) {
          // 横スクロールゾーン（左右遊び）：横方向移動が優勢かつ15px未満の場合はスクロールとみなす
          if (moveEvent.pointerType === 'touch' && absX > absY * 1.2 && absX < 15) {
            return; 
          }

          // ドラッグ開始（上方向 dy < 0 または一定距離移動）
          if (Math.hypot(dx, dy) > 8) {
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
        }

        if (isDragging) {
          if (moveEvent.cancelable) moveEvent.preventDefault();
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
        const isOverMonsterFrame = dropTarget && monsterFrame && monsterFrame.contains(dropTarget);

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

      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
    });
  }
}
// ==========================================
// 4. パレット側の表示 & Pointer Eventドラッグ処理
// ==========================================

function renderMonsters() {
  monsterGrid.innerHTML = '';

  const isChipMode = (currentSelectionMode === 'chip');
  playerSwitchContainer.style.display = isChipMode ? 'block' : 'none';

  if (isChipMode) {
    monsterFrame.style.border = (currentPlayer === '1P') 
      ? '3px solid rgba(220, 20, 60, 0.8)' 
      : '3px solid rgba(30, 144, 255, 0.8)';
  } else {
    monsterFrame.style.border = 'none';
  }

  const currentBoardSpecies = new Set();
  document.querySelectorAll('#mainGrid .cell img, #mainGrid .cell .no-image-badge').forEach(img => {
    if (img.dataset && img.dataset.species) {
      if (currentGridSize === 5) {
        currentBoardSpecies.add(img.dataset.species);
      } else {
        if (img.dataset.player === currentPlayer) {
          currentBoardSpecies.add(img.dataset.species);
        }
      }
    }
  });

  const filtered = monstersData.filter(m => {
    const matchAttr = (currentAttr === "all") || (m.attr === currentAttr);
    const matchType = (currentType === "all") || (m.type === currentType);
    return matchAttr && matchType;
  });

  filtered.forEach(m => {
    const item = document.createElement('div');
    item.className = 'monster-item';
    
    if (currentGridSize === 6 && isChipMode) {
      item.classList.add(currentPlayer === '1P' ? 'p1-border' : 'p2-border');
    }

    const availableTiers = speciesTiersMap[m.species] || [m.tierNum];
    let selectedTierNum = availableTiers[0];

    const isSelected = currentSelected && currentSelected.species === m.species;
    if (isSelected) {
      selectedTierNum = currentSelected.tierNum;
      item.classList.add('selected');
    }

    let currentTierData = allMonsters.find(x => x.species === m.species && x.tierNum === selectedTierNum);
    if (!currentTierData) currentTierData = m;

    let paddedSpecies = String(m.species).padStart(3, '0');
    let paddedTier = String(selectedTierNum).padStart(2, '0');
    let imgUrl = `images/${paddedSpecies}_${paddedTier}.png`;

    const isDisable = currentBoardSpecies.has(m.species);
    if (isDisable) item.classList.add('disabled-monster');

    let tierSelectorHTML = '';
    if (availableTiers.length > 1) {
      const buttonsHTML = availableTiers.map(t => {
        const activeClass = (t === selectedTierNum) ? 'active' : '';
        return `<button class="tier-btn ${activeClass}" data-tier="${t}">T${t}</button>`;
      }).join('');
      tierSelectorHTML = `<div class="tier-selector">${buttonsHTML}</div>`;
    } else {
      tierSelectorHTML = `<div class="tier-single-label">T${selectedTierNum}</div>`;
    }

    item.innerHTML = `
      <div class="monster-img-container">
        <img src="${imgUrl}" 
             alt="${m.name}" 
             draggable="false"
             style="touch-action: none;"
             onerror="this.outerHTML='<div class=\\'no-image-badge\\'>🌸 no image 🌸</div>';">
      </div>
      ${tierSelectorHTML}
      <div class="monster-name">${m.name}</div>
    `;

    // Tier切り替えボタンのクリックイベント
    item.querySelectorAll('.tier-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const newTier = parseInt(btn.dataset.tier);
        currentSelected = {
          species: m.species,
          tierNum: newTier,
          name: m.name,
          imgUrl: `images/${String(m.species).padStart(3, '0')}_${String(newTier).padStart(2, '0')}.png`
        };
        renderMonsters();
      });
    });

    // ----------------------------------------------------
    // 上方向への引き出しスワイプ＆ドラッグ判定の最適化
    // ----------------------------------------------------
    const targetEl = item.querySelector('img') || item.querySelector('.no-image-badge');

    if (targetEl) {
      targetEl.addEventListener('pointerdown', (e) => {
        if (isDisable) return;
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        const startX = e.clientX;
        const startY = e.clientY;
        let isDragging = false;

        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);

          if (!isDragging) {
            // 【横にスクロールゾーンの余白・遊び】
            // 横移動が主流かつ、一定のスクロール閾値(15px)未満はパレットの左右スクロールを優先
            if (moveEvent.pointerType === 'touch' && absX > absY * 1.2 && absX < 15) {
              return; 
            }

            // 【上方向のスムーズなドラッグ動作開始】
            // dy < 0 (上方向) の動きを敏感に検知し、即座にドラッグを開始
            if (dy < -6 || Math.hypot(dx, dy) > 8) {
              isDragging = true;

              currentSelected = {
                species: m.species,
                tierNum: selectedTierNum,
                name: m.name,
                imgUrl: imgUrl
              };

              draggingItem = {
                type: 'palette',
                src: imgUrl,
                species: m.species,
                tier: selectedTierNum,
                player: currentPlayer
              };

              dragGhost.style.backgroundImage = `url(${imgUrl})`;
              dragGhost.style.display = 'block';
              updateGhostPosition(moveEvent.clientX, moveEvent.clientY);
            }
          }

          if (isDragging) {
            if (moveEvent.cancelable) moveEvent.preventDefault();
            updateGhostPosition(moveEvent.clientX, moveEvent.clientY);
            updateHoverHighlight(moveEvent.clientX, moveEvent.clientY);
          }
        }

        function onUp(upEvent) {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          clearHoverHighlight();

          if (!isDragging) {
            currentSelected = {
              species: m.species,
              tierNum: selectedTierNum,
              name: m.name,
              imgUrl: imgUrl
            };
            if (selectedNameEl) selectedNameEl.innerText = `${m.name} (T${selectedTierNum})`;
            renderMonsters();
            return;
          }

          dragGhost.style.display = 'none';
          const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
          const targetCell = dropTarget ? dropTarget.closest('.cell, .board-slot') : null;

          if (targetCell && mainGrid.contains(targetCell)) {
            const cells = Array.from(mainGrid.children);
            const targetIndex = cells.indexOf(targetCell);

            const targetSpecies = draggingItem.species;
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
            renderMonsters();
          }

          draggingItem = null;
        }

        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', onUp);
      });
    }

    monsterGrid.appendChild(item);
  });
}

// ==========================================
// 5. ボードサイズ変更 & グリッド生成
// ==========================================

function createBoard(size) {
  currentGridSize = size;
  mainGrid.innerHTML = '';
  mainGrid.className = `grid-${size}`;

  const totalCells = size * size;
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';

    // 空のセルをクリックして選択中のモンスターを配置する処理
    cell.addEventListener('click', () => {
      if (!currentSelected) return;

      const cells = Array.from(mainGrid.children);
      let isSpeciesOnBoard = false;
      cells.forEach((c) => {
        const im = c.querySelector('img, .no-image-badge');
        if (im && im.dataset && im.dataset.species === String(currentSelected.species)) {
          if (currentGridSize === 5 || im.dataset.player === currentPlayer) {
            isSpeciesOnBoard = true;
          }
        }
      });

      if (isSpeciesOnBoard) {
        const playerText = (currentGridSize === 6) ? `[${currentPlayer}]` : "";
        alert(`${playerText} 同じ種族のタタは既に盤面に配置されています。`);
        return;
      }

      cell.className = 'cell';
      if (currentGridSize === 6) {
        cell.classList.add(currentPlayer === '1P' ? 'p1-cell' : 'p2-cell');
      }

      fillCellWithMonster(cell, {
        src: currentSelected.imgUrl,
        species: currentSelected.species,
        tier: currentSelected.tierNum,
        player: currentPlayer,
        className: cell.className
      });

      saveBoardState();
      renderMonsters();
    });

    mainGrid.appendChild(cell);
  }

  renderMonsters();
}

// ==========================================
// 6. チップスロット処理 & プレイヤー切替
// ==========================================

function applyChipsToSlots() {
  const currentP1 = selectedChipsMap['1P'] || [];
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`p1-slot-${i+1}`);
    if (slot) {
      if (currentP1[i]) {
        slot.innerHTML = `<img src="${currentP1[i].src}" alt="" style="max-width:100%; max-height:100%;">`;
      } else {
        slot.innerHTML = '';
      }
    }
  }

  const currentP2 = selectedChipsMap['2P'] || [];
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`p2-slot-${i+1}`);
    if (slot) {
      if (currentP2[i]) {
        slot.innerHTML = `<img src="${currentP2[i].src}" alt="" style="max-width:100%; max-height:100%;">`;
      } else {
        slot.innerHTML = '';
      }
    }
  }
}

// プレイヤー切り替え処理
btn1P.addEventListener('click', () => {
  currentPlayer = '1P';
  btn1P.classList.add('active');
  btn2P.classList.remove('active');
  renderMonsters();
});

btn2P.addEventListener('click', () => {
  currentPlayer = '2P';
  btn2P.classList.add('active');
  btn1P.classList.remove('active');
  renderMonsters();
});

// ステージモード切り替え
normalStageBtn.addEventListener('click', () => {
  normalStageBtn.classList.add('active');
  zombieStageBtn.classList.remove('active');
  createBoard(5);
  loadBoardState();
});

zombieStageBtn.addEventListener('click', () => {
  zombieStageBtn.classList.add('active');
  normalStageBtn.classList.remove('active');
  createBoard(6);
  loadBoardState();
});

// 属性・タイプフィルターのイベント
document.querySelectorAll('.filter-attr-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-attr-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentAttr = e.target.dataset.attr;
    renderMonsters();
  });
});

document.querySelectorAll('.filter-type-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-type-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentType = e.target.dataset.type;
    renderMonsters();
  });
});

// リセットボタン処理
document.getElementById('resetBtn').addEventListener('click', () => {
  if (confirm('盤面と選択したチップを初期化しますか？')) {
    localStorage.removeItem('monsterBoard_cells');
    localStorage.removeItem('monsterBoard_chips');
    selectedChipsMap = { '1P': [], '2P': [] };
    createBoard(currentGridSize);
  }
});

// ==========================================
// 7. 画像保存・キャプチャ機能（追加修正箇所）
// ==========================================

const saveBtn = document.getElementById('saveBtn');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    const boardContainer = document.getElementById('boardContainer') || mainGrid;
    
    if (typeof html2canvas === 'undefined') {
      alert('html2canvas ライブラリが読み込まれていません。');
      return;
    }

    html2canvas(boardContainer, {
      useCORS: true,
      allowTaint: true,
      scale: 2
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `tata-board-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => {
      console.error('画像キャプチャエラー:', err);
      alert('画像の保存に失敗しました。');
    });
  });
}

// ==========================================
// 8. 初期化実行
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (currentGridSize === 6) {
    zombieStageBtn.classList.add('active');
    normalStageBtn.classList.remove('active');
  } else {
    normalStageBtn.classList.add('active');
    zombieStageBtn.classList.remove('active');
  }

  createBoard(currentGridSize);
  loadBoardState();
});
