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
         style="pointer-events: auto; touch-action: none;"
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
          // タップされた場合：盤面から削除
          cell.innerHTML = '';
          cell.className = 'cell';
          saveBoardState();
          return;
        }

        // ドラッグ終了時の処理
        dragGhost.style.display = 'none';
        const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const targetCell = dropTarget ? dropTarget.closest('.cell, .board-slot') : null;
        const isOverMonsterFrame = dropTarget && monsterFrame.contains(dropTarget);

        // モンスター選択ボックスの上でドロップされた場合 → 元に戻さず削除する
        if (isOverMonsterFrame) {
          draggingItem = null;
          saveBoardState();
          return;
        }

        // 盤面外にドロップされた場合 → 元の位置に戻す
        if (!targetCell || !mainGrid.contains(targetCell)) {
          revertToSourceCell();
          return;
        }

        const targetIndex = cells.indexOf(targetCell);
        
        // 移動先セルに既に存在する画像データを取得
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

        // 同種族が元々自分自身だったか・交換対象かどうかのチェック
        let isSpeciesOnBoard = false;
        cells.forEach((c, idx) => {
          if (idx === targetIndex || idx === sourceIndex) return; // 移動先・移動元は除外して判定
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

        // 1. 移動先のセルにドラッグ要素を配置
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

        // 2. 移動先にタタが存在していた場合、移動元（sourceCell）へそれを配置して入れ替える
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
  } else {
    playerSwitchContainer.classList.remove('show');
    normalStageBtn.classList.add('active');
    zombieStageBtn.classList.remove('active');
    currentPlayer = "1P";
  }

  mainGrid.innerHTML = '';
  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    
    // 空セルをクリックして新規配置する処理
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
  renderMonsters();
});

document.getElementById('saveBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  
  const boardFrame = document.getElementById('boardFrame');
  const appTitleEl = document.querySelector('.app-title');
  
  // input要素の入力値、または通常の要素のテキストを取得
  let titleText = 'タタ配置ツール';
  if (appTitleEl) {
    titleText = (appTitleEl.tagName === 'INPUT' || appTitleEl.tagName === 'TEXTAREA') 
      ? appTitleEl.value.trim() 
      : appTitleEl.textContent.trim();
  }
  if (!titleText) titleText = 'タタ配置ツール';

  // 1. キャプチャ用の一時コンテナを作成（画面外に設置）
  const captureContainer = document.createElement('div');
  captureContainer.style.position = 'absolute';
  captureContainer.style.top = '-9999px';
  captureContainer.style.left = '-9999px';
  captureContainer.style.width = `${boardFrame.offsetWidth}px`;
  captureContainer.style.background = '#181a29';
  captureContainer.style.padding = '16px';
  captureContainer.style.boxSizing = 'border-box';
  captureContainer.style.borderRadius = '12px';

  // 2. 題名（タイトル）要素の生成
  const titleEl = document.createElement('div');
  titleEl.textContent = titleText;
  titleEl.style.fontSize = '20px';
  titleEl.style.fontWeight = 'bold';
  titleEl.style.color = '#f8fafc';
  titleEl.style.textAlign = 'center';
  titleEl.style.marginBottom = '12px';

  // 3. 盤面フレームをそのままクローン
  const boardClone = boardFrame.cloneNode(true);

  // 4. 画像の正方形比率（1:1）を固定保持させる処理
document.getElementById('saveBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  
  const boardFrame = document.getElementById('boardFrame');
  const titleInput = document.getElementById('appTitleInput');
  
  // 入力されたタイトルを取得（未入力の場合はデフォルト値）
  const titleText = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : 'タタ配置ツール';

  // 1. キャプチャ用の一時コンテナを作成（画面外に設置）
  const captureContainer = document.createElement('div');
  captureContainer.style.position = 'absolute';
  captureContainer.style.top = '-9999px';
  captureContainer.style.left = '-9999px';
  captureContainer.style.width = `${boardFrame.offsetWidth}px`;
  captureContainer.style.background = '#181a29';
  captureContainer.style.padding = '16px';
  captureContainer.style.boxSizing = 'border-box';
  captureContainer.style.borderRadius = '12px';

  // 2. 題名（タイトル）要素の生成（画像の上にテキストとして合成）
  const titleEl = document.createElement('div');
  titleEl.textContent = titleText;
  titleEl.style.fontSize = '20px';
  titleEl.style.fontWeight = 'bold';
  titleEl.style.color = '#f8fafc';
  titleEl.style.textAlign = 'center';
  titleEl.style.marginBottom = '12px';

  // 3. 盤面フレームをそのままクローン
  const boardClone = boardFrame.cloneNode(true);

  // 4. 画像の正方形比率（1:1）を固定保持させる処理
  const cells = boardClone.querySelectorAll('.cell');
  cells.forEach(cell => {
    cell.style.aspectRatio = '1 / 1';
    cell.style.width = '100%';
    cell.style.height = '100%';
    
    const img = cell.querySelector('img');
    if (img) {
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
    }
  });

  captureContainer.appendChild(titleEl);
  captureContainer.appendChild(boardClone);
  document.body.appendChild(captureContainer);

    // 5. 画像生成と保存処理
  html2canvas(captureContainer, {
    backgroundColor: '#181a29',
    scale: 2,
    useCORS: true
  }).then(canvas => {
    document.body.removeChild(captureContainer);

    // MIMEタイプを 'image/webp' に変更
    const imageURL = canvas.toDataURL('image/webp', 0.92); // 0.92は画質（0.0〜1.0）
    const downloadLink = document.createElement('a');
    downloadLink.href = imageURL;
    
    // 拡張子を .webp に変更
    downloadLink.download = `${titleText}-${currentGridSize}x${currentGridSize}.webp`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }).catch(err => {
    console.error('画像保存エラー:', err);
    alert('画像の保存に失敗しました。');
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
});

btn2P.addEventListener('click', (e) => {
  e.stopPropagation();
  currentPlayer = "2P";
  btn2P.classList.add('active');
  btn1P.classList.remove('active');
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
  }
  currentSelected = null;
  selectedNameEl.textContent = 'なし';
  buildBoard(6);
  renderMonsters();
  drawerOverlay.classList.remove('open');
});

buildBoard(currentGridSize);
renderMonsters();
