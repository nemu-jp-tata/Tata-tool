// 各種族の最小Tierモンスターのみ抽出
const baseMonstersMap = new Map();
rawMonstersData.forEach(m => {
  if (!baseMonstersMap.has(m.species) || m.T < baseMonstersMap.get(m.species).T) {
    baseMonstersMap.set(m.species, m);
  }
});
const uniqueMonsters = Array.from(baseMonstersMap.values());

const monsterPool = document.getElementById('monsterPool');
const dragGhost = document.getElementById('dragGhost');
let draggingCard = null;
let currentHoveredDropzone = null;

// ローカルストレージキー
const STORAGE_KEY = 'tierList_save_data';

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

// 状態保存（ローカルストレージ）
function saveState() {
  const state = [];
  document.querySelectorAll('.tier-row').forEach(row => {
    const tier = row.dataset.tier;
    const cards = row.querySelectorAll('.monster-card');
    cards.forEach(card => {
      state.push({
        species: card.dataset.species,
        name: card.dataset.name,
        tier: tier
      });
    });
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 状態復元
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;

  const state = JSON.parse(saved);
  state.forEach(item => {
    const card = monsterPool.querySelector(`[data-species="${item.species}"]`);
    const targetRow = document.querySelector(`.tier-row[data-tier="${item.tier}"] .tier-dropzone`);
    if (card && targetRow) {
      targetRow.appendChild(card);
    }
  });
}

// イベントリスナー設定
function setupEvents() {
  // リセットボタン
  document.getElementById('resetBtn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderMonsters();
  });

  // 画像保存ボタン
  document.getElementById('saveImgBtn').addEventListener('click', () => {
    const table = document.getElementById('tierTable');
    html2canvas(table, {
      backgroundColor: '#121212',
      scale: 2,
      useCORS: true
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = 'tier-list.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => {
      console.error('保存エラー:', err);
      alert('画像の保存に失敗しました。');
    });
  });
}

init();
