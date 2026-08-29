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

// ==========================================
// Supabase の初期化
// ==========================================
const SUPABASE_URL = 'https://vtvlocbzbejslbrpubfr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0dmxvY2J6YmVqc2xicnB1YmZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5Nzc0MDksImV4cCI6MjEwMzU1MzQwOX0.W9t-qkr0CE7JSbgjXmzE3KUKkDSNqJ7nhbC8HKCKG-E';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  { id: 'tier-1', label: 'S+', color: '#ff7f7f' },
  { id: 'tier-2', label: 'S', color: '#ffbf7f' },
  { id: 'tier-3', label: 'A+', color: '#ffff7f' },
  { id: 'tier-4', label: 'A', color: '#bfff7f' },
  { id: 'tier-5', label: 'B+', color: '#7fff7f' },
  { id: 'tier-6', label: 'B', color: '#7fbfff' },
  { id: 'tier-7', label: 'C+', color: '#7f7fff' },
  { id: 'tier-8', label: 'C', color: '#bf7fff' },
  { id: 'tier-9', label: 'D+', color: '#ff7fff' },
  { id: 'tier-10', label: 'D', color: '#a6a6a6' },
  { id: 'tier-11', label: 'E', color: '#a6a6a6' }
];

const MIN_ROWS = 4;
const MAX_ROWS = 15;

function init() {
  renderMonsters();

  const params = new URLSearchParams(window.location.search);
  if (params.has('id') || params.has('data')) {
    loadFromUrl();
  } else {
    loadState();
  }

  setupEvents();
}

// 画像の読み込みエラーと名前表示のハンドリング共通関数
function setupMonsterImage(img, badge, monsterName) {
  if (!img) return;

  img.dataset.retry = '';
  img.style.display = 'block';
  if (badge) {
    badge.style.display = 'none';
    badge.textContent = monsterName;
  }

  img.onerror = function() {
    if (!this.dataset.retry) {
      this.dataset.retry = '1';
      this.src = `${monsterName}.png`;
    } else if (this.dataset.retry === '1') {
      this.dataset.retry = '2';
      this.src = `${monsterName}.jpg`;
    } else {
      this.style.display = 'none';
      if (badge) {
        badge.textContent = monsterName;
        badge.style.display = 'flex';
      }
    }
  };
}

function createMonsterCard(monster) {
  const card = document.createElement('div');
  card.className = 'monster-card';
  card.dataset.species = monster.species;
  card.dataset.name = monster.name;

  card.innerHTML = `
    <img src="${monster.name}.webp" alt="${monster.name}">
    <div class="no-image-badge" style="display: none;">${monster.name}</div>
  `;

  const img = card.querySelector('img');
  const badge = card.querySelector('.no-image-badge');

  setupMonsterImage(img, badge, monster.name);
  attachDragEvents(card);
  attachCardEvents(card);
  return card;
}

// 単一カードのTを次の段階（T1 -> T2 -> T3 -> T4 -> T1）へ切り替える処理
function cycleSingleMonsterTier(card) {
  const species = card.dataset.species;
  const currentName = card.dataset.name;

  const speciesVariants = rawMonsters.filter(m => m.species === species);
  if (speciesVariants.length <= 1) return;

  const currentIndex = speciesVariants.findIndex(m => m.name === currentName);
  const nextIndex = (currentIndex + 1) % speciesVariants.length;
  const nextMonster = speciesVariants[nextIndex];

  if (nextMonster) {
    card.dataset.name = nextMonster.name;
    const img = card.querySelector('img');
    const badge = card.querySelector('.no-image-badge');

    if (img) {
      setupMonsterImage(img, badge, nextMonster.name);
      img.src = `${nextMonster.name}.webp`;
    }
    saveState();
  }
}

// カードに対する個別イベントを設定（ダブルクリック／ダブルタップ）
function attachCardEvents(card) {
  // PC向け：ダブルクリック
  card.addEventListener('dblclick', (e) => {
    e.preventDefault();
    cycleSingleMonsterTier(card);
  });

  // スマホ向け：ダブルタップ判定
  let lastTap = 0;
  card.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    if (tapLength < 300 && tapLength > 0) {
      e.preventDefault();
      cycleSingleMonsterTier(card);
    }
    lastTap = currentTime;
  });
}

function renderMonsters() {
  if (!monsterPool) return;
  monsterPool.innerHTML = '';
  uniqueMonsters.forEach(m => {
    const card = createMonsterCard(m);
    monsterPool.appendChild(card);
  });
}

function changeAllMonstersTier(targetTier) {
  const allCards = document.querySelectorAll('.monster-card');
  
  allCards.forEach(card => {
    const species = card.dataset.species;
    const targetMonster = rawMonsters.find(m => m.species === species && Number(m.T) === Number(targetTier));
    
    if (targetMonster) {
      card.dataset.name = targetMonster.name;
      const img = card.querySelector('img');
      const badge = card.querySelector('.no-image-badge');
      
      if (img) {
        setupMonsterImage(img, badge, targetMonster.name);
        img.src = `${targetMonster.name}.webp`;
      }
    }
  });
  saveState();
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
  const draggableElements = Array.from(
    dropzone.querySelectorAll('.monster-card:not(.dragging)')
  );

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2;

    const distance = Math.hypot(x - centerX, y - centerY);

    if (x < centerX) {
      if (distance < closest.distance) {
        return { distance: distance, element: child };
      }
    } else {
      if (distance < closest.distance) {
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
    const imgSrc = (img && img.style.display !== 'none') ? img.src : '';

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
          } else if (afterElement !== placeholder && afterElement !== placeholder.nextElementSibling) {
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

  document.querySelectorAll('.tier-row').forEach((row, index) => {
    const label = row.querySelector('.tier-label');
    const colorSelect = row.querySelector('.row-color-select');

    rowsData.push([
      label ? label.innerText : '',
      colorSelect ? colorSelect.value : '#ff7f7f'
    ]);

    const cards = row.querySelectorAll('.monster-card');
    cards.forEach(card => {
      monstersData.push([
        card.dataset.species,
        index,
        card.dataset.name
      ]);
    });
  });

  const title = tierTableTitle ? tierTableTitle.value : DEFAULT_TITLE;

  return JSON.stringify([
    title,
    rowsData,
    monstersData
  ]);
}

function saveState() {
  const jsonStr = getCurrentStateJson();
  localStorage.setItem(STORAGE_KEY, jsonStr);
}

function applyState(jsonStr) {
  if (!tierTable) return;
  document.querySelectorAll('.tier-row').forEach(r => r.remove());

  try {
    const data = JSON.parse(jsonStr);

    let title = DEFAULT_TITLE;
    let rows = [];
    let monsters = [];

    if (Array.isArray(data)) {
      title = data[0] !== undefined ? data[0] : DEFAULT_TITLE;
      rows = data[1] || [];
      monsters = data[2] || [];
    } else {
      title = (data.t !== undefined ? data.t : data.title) || DEFAULT_TITLE;
      const rawRows = data.r !== undefined ? data.r : data.rows;
      const rawMonsters = data.m !== undefined ? data.m : data.monsters;

      if (rawRows) {
        rows = rawRows.map((r, i) => [
          r.l !== undefined ? r.l : r.label,
          r.c !== undefined ? r.c : r.color
        ]);
      }
      if (rawMonsters) {
        monsters = rawMonsters.map(m => [
          m.s !== undefined ? m.s : m.species,
          m.r !== undefined ? m.r : m.rowId,
          m.n !== undefined ? m.n : m.name
        ]);
      }
    }

    if (tierTableTitle) {
      tierTableTitle.value = title;
    }

    const rowElements = [];
    if (rows && rows.length >= MIN_ROWS) {
      rows.forEach((r, index) => {
        const labelText = Array.isArray(r) ? r[0] : (r.label || r.l);
        const colorHex = Array.isArray(r) ? r[1] : (r.color || r.c);

        const rowEl = createRowElement(`tier-row-${index}`, labelText, colorHex);
        tierTable.appendChild(rowEl);
        rowElements.push(rowEl);
      });
    } else {
      DEFAULT_ROWS.forEach(r => {
        const rowEl = createRowElement(r.id, r.label, r.color);
        tierTable.appendChild(rowEl);
        rowElements.push(rowEl);
      });
    }

    if (monsters && monsterPool) {
      monsters.forEach(item => {
        const species = Array.isArray(item) ? item[0] : (item.s !== undefined ? item.s : item.species);
        const rowIdx = Array.isArray(item) ? item[1] : (item.r !== undefined ? item.r : item.rowId);
        const savedName = Array.isArray(item) ? item[2] : (item.n !== undefined ? item.n : item.name);

        const card = monsterPool.querySelector(`[data-species="${species}"]`);

        let targetRowEl = null;
        if (typeof rowIdx === 'number' && rowElements[rowIdx]) {
          targetRowEl = rowElements[rowIdx];
        } else if (typeof rowIdx === 'string') {
          targetRowEl = document.querySelector(`.tier-row[data-row-id="${rowIdx}"]`);
        }

        if (card && targetRowEl) {
          let monsterName = savedName || card.dataset.name;
          if (!monsterName && typeof rawMonsters !== 'undefined') {
            const mData = rawMonsters.find(m => m.species === species);
            if (mData) monsterName = mData.name;
          }

          if (monsterName) {
            card.dataset.name = monsterName;
            const img = card.querySelector('img');
            const badge = card.querySelector('.no-image-badge');
            if (img) {
              setupMonsterImage(img, badge, monsterName);
              img.src = `${monsterName}.webp`;
            }
          }

          const targetDropzone = targetRowEl.querySelector('.tier-dropzone');
          if (targetDropzone) targetDropzone.appendChild(card);
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

async function generateShareUrl() {
  saveState();
  const jsonStr = localStorage.getItem(STORAGE_KEY);
  if (!jsonStr) return;

  const shareBtn = document.getElementById('shareBtn');
  const originalBtnText = shareBtn ? shareBtn.innerText : '';
  if (shareBtn) {
    shareBtn.disabled = true;
    shareBtn.innerText = 'URL生成中...';
  }

  try {
    const dataToSave = typeof LZString !== 'undefined' 
      ? LZString.compressToEncodedURIComponent(jsonStr) 
      : jsonStr;

    const { data, error } = await supabaseClient
      .from('tier_lists')
      .insert([{ data: dataToSave }])
      .select('id');

    if (error) throw error;

    const shortId = data[0].id;
    const shareUrl = `${window.location.origin}${window.location.pathname}?id=${shortId}`;

    copyToClipboard(shareUrl, '短縮した共有用リンクをクリップボードにコピーしました！\nそのまま貼り付けて共有してください。');

  } catch (e) {
    console.error('Supabase保存エラー:', e);
    alert('共有URLの作成に失敗しました。');
  } finally {
    if (shareBtn) {
      shareBtn.disabled = false;
      shareBtn.innerText = originalBtnText || '共有URL生成';
    }
  }
}

async function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const shortId = params.get('id');
  const legacyData = params.get('data');

  if (shortId) {
    try {
      const { data, error } = await supabaseClient
        .from('tier_lists')
        .select('data')
        .eq('id', shortId)
        .single();

      if (error || !data) throw new Error('データが見つかりません');

      const savedData = data.data;

      const decompressed = typeof LZString !== 'undefined' && !savedData.startsWith('[') && !savedData.startsWith('{')
        ? LZString.decompressFromEncodedURIComponent(savedData) 
        : savedData;

      localStorage.setItem(STORAGE_KEY, decompressed);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      applyState(decompressed);
      alert('共有されたティア表を復元・読み込みました！');
      return;

    } catch (e) {
      console.error('読み込みエラー:', e);
      alert('共有データの読み込みに失敗しました。URLが間違っているか、データが存在しません。');
    }
  } else if (legacyData && typeof LZString !== 'undefined') {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(legacyData);
      if (decompressed) {
        localStorage.setItem(STORAGE_KEY, decompressed);
        window.history.replaceState({}, document.title, window.location.pathname);
        applyState(decompressed);
        alert('共有されたティア表を復元・読み込みました！');
        return;
      }
    } catch (e) {
      console.error('旧URL解析エラー:', e);
    }
  }
  
  loadState();
}

async function copyToClipboard(text, successMessage) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
      return;
    } catch(err) {
      console.warn('Clipboard API失敗', err);
    }
  }
  prompt('以下のURLをコピーして共有してください:', text);
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
      const confirmReset = confirm('全ての配置・タイトル・行設定を初期状態にリセットしますか？');
      if (!confirmReset) return;

      localStorage.removeItem(STORAGE_KEY);

      if (tierTableTitle) tierTableTitle.value = DEFAULT_TITLE;

      renderMonsters();

      if (tierTable) {
        tierTable.innerHTML = '';
        DEFAULT_ROWS.forEach(r => {
          const rowEl = createRowElement(r.id, r.label, r.color);
          tierTable.appendChild(rowEl);
        });
      }

      updateRowControlsState();
      saveState();
    });
  }

  document.querySelectorAll('.btn-tier-switch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetTier = e.target.dataset.tier;
      changeAllMonstersTier(targetTier);
    });
  });

  // 画像保存処理（WebP形式での保存 ＆ 右側コントロールエリアの除外）
  const saveImgBtn = document.getElementById('saveImgBtn');
  if (saveImgBtn) {
    saveImgBtn.addEventListener('click', () => {
      const tableArea = document.getElementById('tierTableArea');

      html2canvas(tableArea, {
        backgroundColor: '#000000',
        scale: 2,
        useCORS: true,
        windowWidth: 1200,
        ignoreElements: (element) => element.classList.contains('tier-row-controls') // 右側の操作エリアを除外
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'tier-list.webp';
        link.href = canvas.toDataURL('image/webp', 0.95);
        link.click();
      }).catch(err => {
        console.error('保存エラー:', err);
        alert('画像の保存に失敗しました。');
      });
    });
  }
}

init();
