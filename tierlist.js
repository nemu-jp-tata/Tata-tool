const rawMonsters = (typeof rawMonstersData !== 'undefined') ? rawMonstersData : [];

const baseMonstersMap = new Map();
rawMonsters.forEach(m => {
  if (!baseMonstersMap.has(m.species) || m.T < baseMonstersMap.get(m.species).T) {
    baseMonstersMap.set(m.species, m);
  }
});
const uniqueMonsters = Array.from(baseMonstersMap.values());

const monsterPool = document.getElementById('monsterPool');
const dragGhost = document.getElementById('dragGhost');
const tierTable = document.getElementById('tierTable');
const tierTableTitle = document.getElementById('tierTableTitle');

let draggingCard = null;
let currentHoveredDropzone = null;

// リアルタイムな隙間を作るプレースホルダー要素
const placeholder = document.createElement('div');
placeholder.className = 'drop-placeholder';

const STORAGE_KEY = 'tierList_save_data_v7';

const DEFAULT_TITLE = '○○ティア表';

const COLOR_PALETTE = [
  { name: '赤', hex: '#ff7f7f' },
  { name: '橙', hex: '#ffbf7f' },
  { name: '黄', hex: '#ffff7f' },
  { name: '黄緑', hex: '#bfff7f' },
  { name: '緑', hex: '#7fff7f' },
  { name: '水', hex: '#7fbfff' },
  { name: '青', hex: '#7f7fff' },
  { name: '紫', hex: '#bf7fff' },
  { name: '桃', hex: '#ff7fff' },
  { name: '灰', hex: '#a6a6a6' }
];

const DEFAULT_ROWS = [
  { id: 'tier-1', label: 'S', color: '#ff7f7f' },
  { id: 'tier-2', label: 'A', color: '#ffbf7f' },
  { id: 'tier-3', label: 'B', color: '#ffff7f' },
  { id: 'tier-4', label: 'C', color: '#7fff7f' },
  { id: 'tier-5', label: 'D', color: '#7fbfff' },
  { id: 'tier-6', label: 'E', color: '#bf7fff' }
];

const MIN_ROWS = 5;
const MAX_ROWS = 8;

function init() {
  renderMonsters();

  // URLに共有データがある場合は読み込み、無ければLocalStorageから読み込む
  if (window.location.search.includes('data=')) {
    loadFromUrl();
  } else {
    loadState();
  }

  setupEvents();
}

function createMonsterCard(monster) {
  const card = document.createElement('div');
  card.className = 'monster-card';
  card.dataset.species = monster.species;
  card.dataset.name = monster.name;

  const imgUrl = `${monster.name}.webp`;

  card.innerHTML = `
    <img src="${imgUrl}" 
         alt="${monster.name}" 
         onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src='${monster.name}.png';}else if(this.dataset.retry=='1'){this.dataset.retry=2;this.src='${monster.name}.jpg';}else{this.outerHTML='<div class=\\'no-image-badge\\'>🌸 no image 🌸</div>';}">
  `;

  attachDragEvents(card);
  return card;
}

function renderMonsters() {
  if (!monsterPool) return;
  monsterPool.innerHTML = '';
  uniqueMonsters.forEach(m => {
    const card = createMonsterCard(m);
    monsterPool.appendChild(card);
  });
}

function createRowElement(id, labelText, colorHex) {
  const row = document.createElement('div');
  row.className = 'tier-row';
  row.dataset.rowId = id;

  let colorOptionsHtml = '';
  COLOR_PALETTE.forEach(c => {
    const isSelected = (c.hex.toLowerCase() === colorHex.toLowerCase()) ? 'selected' : '';
    colorOptionsHtml += `<option value="${c.hex}" ${isSelected}>${c.name}</option>`;
  });

  row.innerHTML = `
    <div class="tier-label" contenteditable="true" spellcheck="false" style="background-color: ${colorHex};">${labelText}</div>
    <div class="tier-dropzone"></div>
    <div class="tier-row-controls">
      <button class="row-move-btn row-move-up-btn" title="上へ移動">▲</button>
      <select class="row-color-select" title="背景色を選択">
        ${colorOptionsHtml}
      </select>
      <button class="row-move-btn row-move-down-btn" title="下へ移動">▼</button>
      <button class="row-delete-btn" title="行を削除">✕</button>
    </div>
  `;

  const label = row.querySelector('.tier-label');
  if (label) {
    label.addEventListener('input', saveState);
    label.addEventListener('blur', saveState);
  }

  const colorSelect = row.querySelector('.row-color-select');
  if (colorSelect) {
    colorSelect.addEventListener('change', (e) => {
      if (label) label.style.backgroundColor = e.target.value;
      saveState();
    });
  }

  const upBtn = row.querySelector('.row-move-up-btn');
  if (upBtn) {
    upBtn.addEventListener('click', () => {
      const prevRow = row.previousElementSibling;
      if (prevRow && prevRow.classList.contains('tier-row')) {
        tierTable.insertBefore(row, prevRow);
        updateRowControlsState();
        saveState();
      }
    });
  }

  const downBtn = row.querySelector('.row-move-down-btn');
  if (downBtn) {
    downBtn.addEventListener('click', () => {
      const nextRow = row.nextElementSibling;
      if (nextRow && nextRow.classList.contains('tier-row')) {
        tierTable.insertBefore(nextRow, row);
        updateRowControlsState();
        saveState();
      }
    });
  }

  const deleteBtn = row.querySelector('.row-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const currentRows = document.querySelectorAll('.tier-row').length;
      if (currentRows <= MIN_ROWS) {
        alert(`行は最低${MIN_ROWS}行必要です。`);
        return;
      }

      const cards = row.querySelectorAll('.monster-card');
      cards.forEach(card => {
        if (monsterPool) monsterPool.appendChild(card);
      });
      row.remove();
      
      updateRowControlsState();
      saveState();
    });
  }

  return row;
}

function updateRowControlsState() {
  const rows = Array.from(document.querySelectorAll('.tier-row'));
  const count = rows.length;
  const addBtn = document.getElementById('addRowBtn');

  if (addBtn) {
    if (count >= MAX_ROWS) {
      addBtn.disabled = true;
      addBtn.style.opacity = '0.5';
      addBtn.style.cursor = 'not-allowed';
    } else {
      addBtn.disabled = false;
      addBtn.style.opacity = '1';
      addBtn.style.cursor = 'pointer';
    }
  }

  rows.forEach((row, index) => {
    const deleteBtn = row.querySelector('.row-delete-btn');
    if (deleteBtn) {
      if (count <= MIN_ROWS) {
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.3';
        deleteBtn.style.cursor = 'not-allowed';
      } else {
        deleteBtn.disabled = false;
        deleteBtn.style.opacity = '1';
        deleteBtn.style.cursor = 'pointer';
      }
    }

    const upBtn = row.querySelector('.row-move-up-btn');
    if (upBtn) {
      if (index === 0) {
        upBtn.disabled = true;
        upBtn.style.opacity = '0.3';
        upBtn.style.cursor = 'default';
      } else {
        upBtn.disabled = false;
        upBtn.style.opacity = '1';
        upBtn.style.cursor = 'pointer';
      }
    }

    const downBtn = row.querySelector('.row-move-down-btn');
    if (downBtn) {
      if (index === count - 1) {
        downBtn.disabled = true;
        downBtn.style.opacity = '0.3';
        downBtn.style.cursor = 'default';
      } else {
        downBtn.disabled = false;
        downBtn.style.opacity = '1';
        downBtn.style.cursor = 'pointer';
      }
    }
  });
}

function getDragAfterElement(dropzone, x, y) {
  const draggableElements = Array.from(dropzone.querySelectorAll('.monster-card:not(.dragging)'));

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offsetX = x - (box.left + box.width / 2);
    const offsetY = y - (box.top + box.height / 2);

    if (offsetY < 0 && offsetX < 0) {
      const distance = Math.hypot(offsetX, offsetY);
      if (distance < closest.distance) {
        return { distance: distance, element: child };
      }
    }
    
    const distance = Math.hypot(x - (box.left + box.width / 2), y - (box.top + box.height / 2));
    if (distance < closest.distance) {
      if (x < box.left + box.width / 2) {
        return { distance: distance, element: child };
      } else {
        return { distance: distance, element: child.nextElementSibling };
      }
    }

    return closest;
  }, { distance: Number.POSITIVE_INFINITY }).element;
}

function attachDragEvents(card) {
  card.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.cancelable) e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    let isDragging = false;

    const img = card.querySelector('img');
    const imgSrc = img ? img.src : '';

    function onPointerMove(moveEvent) {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!isDragging && Math.hypot(dx, dy) > 5) {
        isDragging = true;
        draggingCard = card;
        card.classList.add('dragging');
        
        if (dragGhost) {
          if (imgSrc) {
            dragGhost.style.backgroundImage = `url("${imgSrc}")`;
          } else {
            dragGhost.style.backgroundImage = 'none';
            dragGhost.style.backgroundColor = '#ffb6c1';
          }
          dragGhost.style.display = 'block';
          updateGhostPosition(moveEvent.clientX, moveEvent.clientY);
        }

        card.style.display = 'none';
      }

      if (isDragging) {
        updateGhostPosition(moveEvent.clientX, moveEvent.clientY);
        
        const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const dropzone = target ? target.closest('.tier-dropzone') : null;

        if (dropzone) {
          highlightDropzone(dropzone);
          const afterElement = getDragAfterElement(dropzone, moveEvent.clientX, moveEvent.clientY);
          
          if (afterElement == null) {
            dropzone.appendChild(placeholder);
          } else {
            dropzone.insertBefore(placeholder, afterElement);
          }
        } else {
          clearHighlight();
          if (placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
          }
        }
      }
    }

    function onPointerUp(upEvent) {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (isDragging) {
        if (dragGhost) dragGhost.style.display = 'none';
        card.classList.remove('dragging');
        card.style.display = 'flex';

        if (placeholder.parentNode) {
          placeholder.parentNode.insertBefore(card, placeholder);
          placeholder.parentNode.removeChild(placeholder);
        }

        clearHighlight();
        saveState();
        draggingCard = null;
      }
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  });
}

function updateGhostPosition(x, y) {
  if (dragGhost) {
    dragGhost.style.left = `${x}px`;
    dragGhost.style.top = `${y}px`;
  }
}

function highlightDropzone(dropzone) {
  if (currentHoveredDropzone !== dropzone) {
    clearHighlight();
    if (dropzone) {
      dropzone.classList.add('drag-over');
      currentHoveredDropzone = dropzone;
    }
  }
}

function clearHighlight() {
  if (currentHoveredDropzone) {
    currentHoveredDropzone.classList.remove('drag-over');
    currentHoveredDropzone = null;
  }
}

function getCurrentStateJson() {
  const rowsData = [];
  const monstersData = [];

  document.querySelectorAll('.tier-row').forEach(row => {
    const rowId = row.dataset.rowId;
    const label = row.querySelector('.tier-label');
    const colorSelect = row.querySelector('.row-color-select');

    rowsData.push({
      id: rowId,
      label: label ? label.innerText : '',
      color: colorSelect ? colorSelect.value : '#ff7f7f'
    });

    const cards = row.querySelectorAll('.monster-card');
    cards.forEach(card => {
      monstersData.push({
        species: card.dataset.species,
        rowId: rowId
      });
    });
  });

  return JSON.stringify({
    title: tierTableTitle ? tierTableTitle.value : DEFAULT_TITLE,
    rows: rowsData,
    monsters: monstersData
  });
}

function saveState() {
  const jsonStr = getCurrentStateJson();
  localStorage.setItem(STORAGE_KEY, jsonStr);
}

function applyState(jsonStr) {
  if (!tierTable) return;
  document.querySelectorAll('.tier-row').forEach(r => r.remove());

  try {
    const state = JSON.parse(jsonStr);

    if (tierTableTitle && state.title !== undefined) {
      tierTableTitle.value = state.title;
    }

    if (state.rows && state.rows.length >= MIN_ROWS) {
      state.rows.forEach(r => {
        const rowEl = createRowElement(r.id, r.label, r.color);
        tierTable.appendChild(rowEl);
      });
    } else {
      DEFAULT_ROWS.forEach(r => {
        const rowEl = createRowElement(r.id, r.label, r.color);
        tierTable.appendChild(rowEl);
      });
    }

    if (state.monsters && monsterPool) {
      state.monsters.forEach(item => {
        const card = monsterPool.querySelector(`[data-species="${item.species}"]`);
        const targetRow = document.querySelector(`.tier-row[data-row-id="${item.rowId}"] .tier-dropzone`);
        if (card && targetRow) {
          targetRow.appendChild(card);
        }
      });
    }
  } catch (e) {
    console.error('復元エラー:', e);
    DEFAULT_ROWS.forEach(r => {
      const rowEl = createRowElement(r.id, r.label, r.color);
      tierTable.appendChild(rowEl);
    });
  }

  updateRowControlsState();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    if (tierTableTitle) tierTableTitle.value = DEFAULT_TITLE;
    DEFAULT_ROWS.forEach(r => {
      const rowEl = createRowElement(r.id, r.label, r.color);
      tierTable.appendChild(rowEl);
    });
    updateRowControlsState();
    return;
  }
  applyState(saved);
}

// 共有URLの生成
function generateShareUrl() {
  saveState();
  const jsonStr = localStorage.getItem(STORAGE_KEY);
  if (!jsonStr) return;

  if (typeof LZString === 'undefined') {
    alert('圧縮ライブラリの読み込みに失敗しています。');
    return;
  }

  const compressed = LZString.compressToEncodedURIComponent(jsonStr);
  const shareUrl = `${window.location.origin}${window.location.pathname}?data=${compressed}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('共有用リンクをクリップボードにコピーしました！\nDiscordやSNSにそのまま貼り付けて共有してください。');
    }).catch(() => {
      prompt('以下のURLをコピーして共有してください:', shareUrl);
    });
  } else {
    prompt('以下のURLをコピーして共有してください:', shareUrl);
  }
}

// URLからデータ読み込み
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get('data');

  if (compressed && typeof LZString !== 'undefined') {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
      if (decompressed) {
        localStorage.setItem(STORAGE_KEY, decompressed);
        window.history.replaceState({}, document.title, window.location.pathname);
        applyState(decompressed);
        alert('共有されたティア表を復元・読み込みました！');
        return;
      }
    } catch (e) {
      console.error('URL解析エラー:', e);
    }
  }
  loadState();
}

function setupEvents() {
  if (tierTableTitle) {
    tierTableTitle.addEventListener('input', saveState);
  }

  const addRowBtn = document.getElementById('addRowBtn');
  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      const currentRows = document.querySelectorAll('.tier-row').length;
      if (currentRows >= MAX_ROWS) {
        alert(`行は最大${MAX_ROWS}行までです。`);
        return;
      }

      const newId = 'tier-' + Date.now();
      const newRow = createRowElement(newId, 'NEW', '#bf7fff');
      if (tierTable) tierTable.appendChild(newRow);
      
      updateRowControlsState();
      saveState();
    });
  }

  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) {
    shareBtn.addEventListener('click', generateShareUrl);
  }

  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      if (tierTableTitle) tierTableTitle.value = DEFAULT_TITLE;
      renderMonsters();
      loadState();
    });
  }

  const saveImgBtn = document.getElementById('saveImgBtn');
  if (saveImgBtn) {
    saveImgBtn.addEventListener('click', () => {
      const tableArea = document.getElementById('tierTableArea');

      tableArea.classList.add('exporting');

      html2canvas(tableArea, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        windowWidth: 1200
      }).then(canvas => {
        tableArea.classList.remove('exporting');

        const link = document.createElement('a');
        link.download = 'tier-list.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      }).catch(err => {
        console.error('保存エラー:', err);
        tableArea.classList.remove('exporting');
        alert('画像の保存に失敗しました。');
      });
    });
  }
}

init();
