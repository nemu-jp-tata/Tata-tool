// モード切替用の状態変数
let currentSelectionMode = 'monster'; // 'monster' or 'chip'

// プレイヤーごとの選択されたチップのリスト（最大3枚）
let selectedChipsMap = {
  '1P': [],
  '2P': []
};

// 全データをマッピング
const allMonsters = rawMonstersData.map(m => ({
  name: m.name,
  species: m.species,
  attr: m.type,      // 火, 水, 木, 光, 闇
  tier: "T" + m.T,   // 表示用
  tierNum: m.T,      // 数値
  type: m.role       // 攻撃, 防御, 補助...
}));

// 各種族が持っているTierのリストをマッピング { 1: [1, 2], 2: [1], ... }
const speciesTiersMap = {};
allMonsters.forEach(m => {
  if (!speciesTiersMap[m.species]) speciesTiersMap[m.species] = [];
  if (!speciesTiersMap[m.species].includes(m.tierNum)) {
    speciesTiersMap[m.species].push(m.tierNum);
  }
});
// Tierを昇順にソート
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
let currentPlayer = "1P"; // '1P' or '2P'

// ドラッグ＆ドロップ用の状態管理
let draggingItem = null; // { type: 'board'|'palette', src, species, tier, player, sourceIndex }
const dragGhost = document.getElementById('dragGhost');

const mainGrid = document.getElementById('mainGrid');
const monsterFrame = document.getElementById('monsterFrame');
const monsterGrid = document.getElementById('monsterGrid');

// モード切替・プレイヤー切替用UI要素
const modeMonsterBtn = document.getElementById('modeMonsterBtn');
const modeChipBtn = document.getElementById('modeChipBtn');
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
  
  if (targetCell && (mainGrid.contains(targetCell) || targetCell.classList.contains('board-slot'))) {
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

// ゴースト位置更新（指・カーソルの真上に表示）
function updateGhostPosition(x, y) {
  dragGhost.style.left = `${x - 25}px`;
  dragGhost.style.top = `${y - 25}px`;
}

// ==========================================
// ローカルストレージ関連処理
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
// 盤面セルへの描写 & Pointer Events ドラッグ（盤面内）
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
          // 余白ゾーン（横スクロール優先遊び）判定
          if (moveEvent.pointerType === 'touch' && absX > absY * 1.2 && absX < 15) {
            return; 
          }

          // 移動距離が閾値（8px）を超えた場合、ドラッグ開始
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
  if (playerSwitchContainer) {
    playerSwitchContainer.style.display = isChipMode ? 'block' : 'none';
  }

  if (monsterFrame) {
    if (isChipMode) {
      monsterFrame.style.border = (currentPlayer === '1P') 
        ? '3px solid rgba(220, 20, 60, 0.8)' 
        : '3px solid rgba(30, 144, 255, 0.8)';
    } else {
      monsterFrame.style.border = 'none';
    }
  }

  // --- モンスター選択モード ---
  if (!isChipMode) {
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

      const isDisable = currentBoardSpecies.has(String(m.species));
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
              // 横スクロールゾーン（遊び）：横移動優先時はスクロールを許可
              if (moveEvent.pointerType === 'touch' && absX > absY * 1.2 && absX < 15) {
                return; 
              }

              // 上方向（dy < -6）または一定距離でドラッグ開始
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

              const targetSpecies = String(draggingItem.species);
              let isSpeciesOnBoard = false;
              cells.forEach((c, idx) => {
                if (idx === targetIndex) return;
                const im = c.querySelector('img, .no-image-badge');
                if (im && im.dataset && String(im.dataset.species) === targetSpecies) {
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
  } else {
    // --- チップ選択モード ---
    const chipList = [
      { id: 'chip_01', name: 'チップ1', src: 'images/chip_01.png' },
      { id: 'chip_02', name: 'チップ2', src: 'images/chip_02.png' },
      { id: 'chip_03', name: 'チップ3', src: 'images/chip_03.png' },
      { id: 'chip_04', name: 'チップ4', src: 'images/chip_04.png' },
      { id: 'chip_05', name: 'チップ5', src: 'images/chip_05.png' }
    ];

    chipList.forEach(chip => {
      const item = document.createElement('div');
      item.className = 'monster-item chip-item';
      if (currentPlayer === '1P') item.classList.add('p1-border');
      else item.classList.add('p2-border');

      item.innerHTML = `
        <div class="monster-img-container">
          <img src="${chip.src}" alt="${chip.name}" draggable="false" style="touch-action: none;">
        </div>
        <div class="monster-name">${chip.name}</div>
      `;

      item.addEventListener('click', () => {
        const currentList = selectedChipsMap[currentPlayer] || [];
        if (currentList.length < 3) {
          currentList.push(chip);
          selectedChipsMap[currentPlayer] = currentList;
          applyChipsToSlots();
          saveBoardState();
        } else {
          alert('チップは最大3枚までしか選択できません。');
        }
      });

      monsterGrid.appendChild(item);
    });
  }
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

    cell.addEventListener('click', () => {
      if (!currentSelected || currentSelectionMode === 'chip') return;

      const cells = Array.from(mainGrid.children);
      let isSpeciesOnBoard = false;
      cells.forEach((c) => {
        const im = c.querySelector('img, .no-image-badge');
        if (im && im.dataset && String(im.dataset.species) === String(currentSelected.species)) {
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
// 6. チップスロット処理 & プレイヤー/モード切替
// ==========================================

function applyChipsToSlots() {
  ['1P', '2P'].forEach(p => {
    const currentChips = selectedChipsMap[p] || [];
    const prefix = p.toLowerCase();
    for (let i = 0; i < 3; i++) {
      const slot = document.getElementById(`${prefix}-slot-${i+1}`);
      if (slot) {
        if (currentChips[i]) {
          slot.innerHTML = `<img src="${currentChips[i].src}" alt="" style="max-width:100%; max-height:100%;">`;
          slot.onclick = () => {
            selectedChipsMap[p].splice(i, 1);
            applyChipsToSlots();
            saveBoardState();
          };
        } else {
          slot.innerHTML = '';
          slot.onclick = null;
        }
      }
    }
  });
}

if (modeMonsterBtn && modeChipBtn) {
  modeMonsterBtn.addEventListener('click', () => {
    currentSelectionMode = 'monster';
    modeMonsterBtn.classList.add('active');
    modeChipBtn.classList.remove('active');
    renderMonsters();
  });

  modeChipBtn.addEventListener('click', () => {
    currentSelectionMode = 'chip';
    modeChipBtn.classList.add('active');
    modeMonsterBtn.classList.remove('active');
    renderMonsters();
  });
}

if (btn1P && btn2P) {
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
}

if (normalStageBtn && zombieStageBtn) {
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
}

// フィルター関連イベント
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

// リセットボタン
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (confirm('盤面と選択したチップを初期化しますか？')) {
      localStorage.removeItem('monsterBoard_cells');
      localStorage.removeItem('monsterBoard_chips');
      selectedChipsMap = { '1P': [], '2P': [] };
      createBoard(currentGridSize);
    }
  });
}

// ==========================================
// 7. 画像保存 & キャプチャ・シェア処理
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
      console.error('画像保存エラー:', err);
      alert('画像の保存に失敗しました。');
    });
  });
}

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
  shareBtn.addEventListener('click', () => {
    const boardContainer = document.getElementById('boardContainer') || mainGrid;
    if (typeof html2canvas === 'undefined') {
      alert('html2canvas ライブラリが読み込まれていません。');
      return;
    }

    html2canvas(boardContainer, { useCORS: true, allowTaint: true, scale: 2 }).then(canvas => {
      canvas.toBlob(blob => {
        if (navigator.share && blob) {
          const file = new File([blob], 'tata-board.png', { type: 'image/png' });
          navigator.share({
            title: 'タタ配置ボード',
            text: '私の編成・配置です！',
            files: [file]
          }).catch(() => {});
        } else {
          alert('お使いのブラウザは直接共有に対応していません。保存ボタンをご利用ください。');
        }
      });
    });
  });
}

// ==========================================
// 8. 初期化実行
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  if (currentGridSize === 6) {
    if (zombieStageBtn) zombieStageBtn.classList.add('active');
    if (normalStageBtn) normalStageBtn.classList.remove('active');
  } else {
    if (normalStageBtn) normalStageBtn.classList.add('active');
    if (zombieStageBtn) zombieStageBtn.classList.remove('active');
  }

  createBoard(currentGridSize);
  loadBoardState();
});
