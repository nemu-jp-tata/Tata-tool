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

// キーを更新して古い破損データをリセット
const STORAGE_KEY = 'tierList_save_data_v5';

const DEFAULT_TITLE = '○○ティア表';
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
  loadState();
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

  row.innerHTML = `
    <div class="tier-label" contenteditable="true" spellcheck="false" style="background-color: ${colorHex};">${labelText}</div>
    <div class="tier-dropzone"></div>
    <div class="tier-row-controls">
      <input type="color" class="row-color-picker" value="${colorHex}" title="背景色を変更">
      <button class="row-delete-btn" title="行を削除">✕</button>
    </div>
  `;

  const label = row.querySelector('.tier-label');
  if (label) {
    label.addEventListener('input', saveState);
    label.addEventListener('blur', saveState);
  }

  const colorPicker = row.querySelector('.row-color-picker');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      if (label) label.style.backgroundColor = e.target.value;
      saveState();
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
  const rows = document.querySelectorAll('.tier-row');
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

  rows.forEach(row => {
    const deleteBtn = row.querySelector('.row-delete-btn');
    if (deleteBtn) {
      if (count <= MIN_ROWS) {
        deleteBtn.style.opacity = '0.3';
        deleteBtn.style.cursor = 'not-allowed';
      } else {
        deleteBtn.style.opacity = '1';
        deleteBtn.style.cursor = 'pointer';
      }
    }
  });
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

        card.style.opacity = '0.3';
      }

      if (isDragging) {
        updateGhostPosition(moveEvent.clientX, moveEvent.clientY);
        highlightDropzone(moveEvent.clientX, moveEvent.clientY);
      }
    }

    function onPointerUp(upEvent) {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      if (isDragging) {
        if (dragGhost) dragGhost.style.display = 'none';
        card.style.opacity = '1';

        const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
        const dropzone = dropTarget ? dropTarget.closest('.tier-dropzone') : null;

        if (dropzone) {
          dropzone.appendChild(card);
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

function highlightDropzone(x, y) {
  const target = document.elementFromPoint(x, y);
  const dropzone = target ? target.closest('.tier-dropzone') : null;

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

function saveState() {
  const rowsData = [];
  const monstersData = [];

  document.querySelectorAll('.tier-row').forEach(row => {
    const rowId = row.dataset.rowId;
    const label = row.querySelector('.tier-label');
    const colorPicker = row.querySelector('.row-color-picker');

    rowsData.push({
      id: rowId,
      label: label ? label.innerText : '',
      color: colorPicker ? colorPicker.value : '#ff7f7f'
    });

    const cards = row.querySelectorAll('.monster-card');
    cards.forEach(card => {
      monstersData.push({
        species: card.dataset.species,
        rowId: rowId
      });
    });
  });

  const state = {
    title: tierTableTitle ? tierTableTitle.value : DEFAULT_TITLE,
    rows: rowsData,
    monsters: monstersData
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  if (!tierTable) return;

  const saved = localStorage.getItem(STORAGE_KEY);
  
  // 既存の行を削除
  document.querySelectorAll('.tier-row').forEach(r => r.remove());

  if (!saved) {
    if (tierTableTitle) tierTableTitle.value = DEFAULT_TITLE;
    DEFAULT_ROWS.forEach(r => {
      const rowEl = createRowElement(r.id, r.label, r.color);
      tierTable.appendChild(rowEl);
    });
    updateRowControlsState();
    return;
  }

  try {
    const state = JSON.parse(saved);

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

function setupEvents() {
  if (tierTableTitle) {
    tierTableTitle.addEventListener('input', saveState);
  }

  // 行追加ボタン
  const addRowBtn = document.getElementById('addRowBtn');
  if (addRowBtn) {
    addRowBtn.addEventListener('click', () => {
      const currentRows = document.querySelectorAll('.tier-row').length;
      if (currentRows >= MAX_ROWS) {
        alert(`行は最大${MAX_ROWS}行までです。`);
        return;
      }

      const newId = 'tier-' + Date.now();
      const newRow = createRowElement(newId, 'NEW', '#9c27b0');
      if (tierTable) tierTable.appendChild(newRow);
      
      updateRowControlsState();
      saveState();
    });
  }

  // リセットボタン
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      if (tierTableTitle) tierTableTitle.value = DEFAULT_TITLE;
      loadState();
      renderMonsters();
    });
  }

  // 画像保存ボタン
  const saveImgBtn = document.getElementById('saveImgBtn');
  if (saveImgBtn) {
    saveImgBtn.addEventListener('click', () => {
      if (!tierTable) return;
      
      tierTable.classList.add('html2canvas-exporting');
      if (tierTableTitle) tierTableTitle.style.borderColor = 'transparent';

      html2canvas(tierTable, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true
      }).then(canvas => {
        tierTable.classList.remove('html2canvas-exporting');
        
        const link = document.createElement('a');
        const filename = ((tierTableTitle ? tierTableTitle.value.trim() : '') || 'tier-list') + '.png';
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }).catch(err => {
        tierTable.classList.remove('html2canvas-exporting');
        console.error('保存エラー:', err);
        alert('画像の保存に失敗しました。');
      });
    });
  }
}

init();
