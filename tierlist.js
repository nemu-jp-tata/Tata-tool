// monsters.js の読み込みチェック
const rawMonsters = (typeof rawMonstersData !== 'undefined') ? rawMonstersData : [];

// 各種族の最小Tierモンスターのみ抽出
const baseMonstersMap = new Map();
rawMonsters.forEach(m => {
  if (!baseMonstersMap.has(m.species) || m.T < baseMonstersMap.get(m.species).T) {
    baseMonstersMap.set(m.species, m);
  }
});
const uniqueMonsters = Array.from(baseMonstersMap.values());

const monsterPool = document.getElementById('monsterPool');
const dragGhost = document.getElementById('dragGhost');
const tierTableTitle = document.getElementById('tierTableTitle');

let draggingCard = null;
let currentHoveredDropzone = null;

// ローカルストレージキー
const STORAGE_KEY = 'tierList_save_data_v2';

// 初期デフォルトデータ
const DEFAULT_TITLE = 'T1 ➔ T2 進化優先度表';
const DEFAULT_LABELS = {
  'tier-1': '進化優先 (高)',
  'tier-2': 'S',
  'tier-3': 'A',
  'tier-4': 'B',
  'tier-5': 'C',
  'tier-6': 'F'
};

// 初期描画
function init() {
  renderMonsters();
  loadState();
  setupEvents();
}

// モンスターカードの作成
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

// プールへのモンスター初期配置
function renderMonsters() {
  monsterPool.innerHTML = '';
  uniqueMonsters.forEach(m => {
    const card = createMonsterCard(m);
    monsterPool.appendChild(card);
  });
}

// Pointer Events によるドラッグ＆ドロップ実装（PC・スマホ両対応）
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

// 全状態（タイトル・各ラベル名・配置状況）の保存
function saveState() {
  const labelsData = {};
  const monstersData = [];

  // 各行のラベル名と配置モンスターを収集
  document.querySelectorAll('.tier-row').forEach(row => {
    const rowId = row.dataset.rowId;
    const labelText = row.querySelector('.tier-label').innerText;
    labelsData[rowId] = labelText;

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
    labels: labelsData,
    monsters: monstersData
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 状態復元
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  try {
    const state = JSON.parse(saved);

    // タイトル復元
    if (state.title !== undefined) {
      tierTableTitle.value = state.title;
    }

    // ラベル名復元
    if (state.labels) {
      Object.keys(state.labels).forEach(rowId => {
        const row = document.querySelector(`.tier-row[data-row-id="${rowId}"]`);
        if (row) {
          const labelEl = row.querySelector('.tier-label');
          if (labelEl) labelEl.innerText = state.labels[rowId];
        }
      });
    }

    // モンスター配置復元
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
}

// イベントリスナー設定
function setupEvents() {
  // タイトル変更時に保存
  tierTableTitle.addEventListener('input', saveState);

  // ラベル文字変更時に保存
  document.querySelectorAll('.tier-label').forEach(label => {
    label.addEventListener('input', saveState);
    label.addEventListener('blur', saveState);
  });

  // リセットボタン（全リセット）
  document.getElementById('resetBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);

    // タイトルを初期化
    tierTableTitle.value = DEFAULT_TITLE;

    // 各行のラベルと配置をクリア＆初期化
    document.querySelectorAll('.tier-row').forEach(row => {
      const rowId = row.dataset.rowId;
      const labelEl = row.querySelector('.tier-label');
      if (labelEl && DEFAULT_LABELS[rowId]) {
        labelEl.innerText = DEFAULT_LABELS[rowId];
      }
      const dropzone = row.querySelector('.tier-dropzone');
      if (dropzone) dropzone.innerHTML = '';
    });

    // モンスタープール再描画
    renderMonsters();
  });

  // 画像保存ボタン
  document.getElementById('saveImgBtn').addEventListener('click', () => {
    const table = document.getElementById('tierTable');
    
    // 入力領域の点線枠を一時的に消して綺麗に出力
    tierTableTitle.style.borderColor = 'transparent';

    html2canvas(table, {
      backgroundColor: '#000000',
      scale: 2,
      useCORS: true
    }).then(canvas => {
      const link = document.createElement('a');
      const filename = (tierTableTitle.value.trim() || 'tier-list') + '.png';
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => {
      console.error('保存エラー:', err);
      alert('画像の保存に失敗しました。');
    });
  });
}

init();
