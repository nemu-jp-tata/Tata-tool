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

const STORAGE_KEY = 'tierList_save_data_v4';

// デフォルト設定の変更
const DEFAULT_TITLE = '○○ティア表';
const DEFAULT_ROWS = [
  { id: 'tier-1', label: 'S', color: '#ff7f7f' },
  { id: 'tier-2', label: 'A', color: '#ffbf7f' },
  { id: 'tier-3', label: 'B', color: '#ffff7f' },
  { id: 'tier-4', label: 'C', color: '#7fff7f' },
  { id: 'tier-5', label: 'D', color: '#7fbfff' },
  { id: 'tier-6', label: 'E', color: '#bf7fff' }
];

// 行制限の定数
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
  monsterPool.innerHTML = '';
  uniqueMonsters.forEach(m => {
    const card = createMonsterCard(m);
    monsterPool.appendChild(card);
  });
}

// ティア行エレメントの動的生成
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

  // イベント登録：ラベル名変更・色変更・削除
  const label = row.querySelector('.tier-label');
  label.addEventListener('input', saveState);
  label.addEventListener('blur', saveState);

  const colorPicker = row.querySelector('.row-color-picker');
  colorPicker.addEventListener('input', (e) => {
    label.style.backgroundColor = e.target.value;
    saveState();
  });

  const deleteBtn = row.querySelector('.row-delete-btn');
  deleteBtn.addEventListener('click', () => {
    const currentRows = document.querySelectorAll('.tier-row').length;
    if (currentRows <= MIN_ROWS) {
      alert(`行は最低${MIN_ROWS}行必要です。`);
      return;
    }

    // 含まれていたモンスターを未配置プールへ戻す
    const cards = row.querySelectorAll('.monster-card');
    cards.forEach(card => monsterPool.appendChild(card));
    row.remove();
    
    updateRowControlsState();
    saveState();
  });

  return row;
}

// 行数の状態に応じて追加ボタン・削除ボタンの有効/無効を更新
function updateRowControlsState() {
  const rows = document.querySelectorAll('.tier-row');
  const count = rows.length;
  const addBtn = document.getElementById('addRowBtn');

  // 追加ボタンの制御（最大8行まで）
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

  // 削除ボタンの制御（最低5行まで）
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
        
        if (imgSrc) {
          dragGhost.style.backgroundImage = `url("${imgSrc}")`;
        } else {
          dragGhost.style.backgroundImage = 'none';
          dragGhost.style.backgroundColor = '#ffb6c1';
        }
        dragGhost.style.display = 'block';
        updateGhostPosition(moveEvent.clientX, moveEvent.clientY);

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
        dragGhost.style.display = 'none';
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
  dragGhost.style.left = `${x}px`;
  dragGhost.style.top = `${y}px`;
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
      label: label.innerText,
      color: colorPicker.value
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
    title: tierTableTitle.value,
    rows: rowsData,
    monsters: monstersData
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  
  // 既存の行をクリア
  document.querySelectorAll('.tier-row').forEach(r => r.remove());

  if (!saved) {
    tierTableTitle.value = DEFAULT_TITLE;
    DEFAULT_ROWS.forEach(r => {
      const rowEl = createRowElement(r.id, r.label, r.color);
      tierTable.appendChild(rowEl);
    });
    updateRowControlsState();
    return;
  }

  try {
    const state = JSON.parse(saved);

    if (state.title !== undefined) {
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

    if (state.monsters) {
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
  }

  updateRowControlsState();
}

function setupEvents() {
  tierTableTitle.addEventListener('input', saveState);

  // 行追加ボタン
  document.getElementById('addRowBtn').addEventListener('click', () => {
    const currentRows = document.querySelectorAll('.tier-row').length;
    if (currentRows >= MAX_ROWS) {
      alert(`行は最大${MAX_ROWS}行までです。`);
      return;
    }

    const newId = 'tier-' + Date.now();
    const newRow = createRowElement(newId, 'NEW', '#9c27b0');
    tierTable.appendChild(newRow);
    
    updateRowControlsState();
    saveState();
  });

  // リセットボタン
  document.getElementById('resetBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    tierTableTitle.value = DEFAULT_TITLE;
    loadState();
    renderMonsters();
  });

  // 画像保存ボタン
  document.getElementById('saveImgBtn').addEventListener('click', () => {
    const table = document.getElementById('tierTable');
    
    table.classList.add('html2canvas-exporting');
    tierTableTitle.style.borderColor = 'transparent';

    html2canvas(table, {
      backgroundColor: '#000000',
      scale: 2,
      useCORS: true
    }).then(canvas => {
      table.classList.remove('html2canvas-exporting');
      
      const link = document.createElement('a');
      const filename = (tierTableTitle.value.trim() || 'tier-list') + '.png';
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => {
      table.classList.remove('html2canvas-exporting');
      console.error('保存エラー:', err);
      alert('画像の保存に失敗しました。');
    });
  });
}

init();
