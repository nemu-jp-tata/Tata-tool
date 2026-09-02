// リポジトリ直下の画像を参照するベースURL
const GITHUB_IMG_BASE = "https://cdn.jsdelivr.net/gh/nemu-jp-tata/Tata-tool@main/";

function diagnoseWithGitHubData() {
  // rawMonstersData の存在確認
  if (typeof rawMonstersData === 'undefined' || !Array.isArray(rawMonstersData)) {
    alert("エラー: モンスターデータ（monsters.js）が正しく読み込めていません。");
    return;
  }

  const tierElement = document.getElementById('user-tier');
  const output = document.getElementById('diag-output');

  if (!tierElement || !output) {
    alert("エラー: 診断ツールの画面要素が見つかりません。");
    return;
  }

  // 1. 全データを使いやすい形式にマッピング
  const allMonsters = rawMonstersData.map(m => ({
    name: m.name,
    species: m.species,
    attr: m.type,
    tierNum: m.T,
    role: m.role
  }));

  // 2. 各種族（species）ごとの最小Tier（初期形態）のデータを抽出するマップを作成
  const baseMonstersMap = new Map();
  allMonsters.forEach(m => {
    if (!baseMonstersMap.has(m.species) || m.tierNum < baseMonstersMap.get(m.species).tierNum) {
      baseMonstersMap.set(m.species, m);
    }
  });

  const tier = parseInt(tierElement.value, 10);
  const checkedAttrs = Array.from(document.querySelectorAll('.user-attr:checked')).map(cb => cb.value);
  const allAttrs = ['炎', '水', '草', '雷', '岩'];
  const missingAttrs = allAttrs.filter(a => !checkedAttrs.includes(a));

  output.style.display = 'block';

  let recommendHTML = "";

  if (missingAttrs.length > 0) {
    // 不足している属性から1つランダムに選ぶ
    const targetAttr = missingAttrs[Math.floor(Math.random() * missingAttrs.length)];
    
    // 不足属性に該当する高Tier（T3〜T4）のタタを検索
    const candidates = allMonsters.filter(m => m.attr === targetAttr && m.tierNum >= 3);
    
    if (candidates.length > 0) {
      // 目標となる最終進化タタを決定
      const targetMonster = candidates[Math.floor(Math.random() * candidates.length)];
      // そのタタの種族（species）の初期形態（最小Tier）を取得
      const baseMonster = baseMonstersMap.get(targetMonster.species) || targetMonster;

      recommendHTML = `
        <div style="margin-top:15px; background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #cbd5e1; display:flex; align-items:center; gap:12px;">
          <img src="${GITHUB_IMG_BASE}${encodeURIComponent(baseMonster.name)}.webp" width="60" height="60" style="border-radius:6px; object-fit:cover; background:#e2e8f0; flex-shrink:0;" alt="${baseMonster.name}" onerror="this.style.display='none'">
          <div>
            <div style="font-size:12px; color:#2563eb; font-weight:bold;">【おすすめ補強タタ】</div>
            <strong style="font-size:16px; color:#1e293b;">${baseMonster.name} （${baseMonster.attr}属性 / T${baseMonster.tierNum}）</strong>
            <div style="font-size:12px; color:#475569; margin-top:4px;">
              ${targetAttr}属性の戦力を補うため、まずは <b>${baseMonster.name}</b> を育成して <b>${targetMonster.name}（T${targetMonster.tierNum}）</b> を目指すのがおすすめです！
            </div>
          </div>
        </div>
      `;
    }
  }

  output.innerHTML = `
    <h3 style="margin-top:0; color:#1e3a8a; font-size:18px;">診断結果（主力目標：T${tier}段階）</h3>
    <p style="margin-bottom:8px; color:#334155;"><b>■ 属性バランス評価:</b><br>
    ${checkedAttrs.length === 5 
      ? '<span style="color:#16a34a; font-weight:bold;">全属性バランス良く揃っています！完璧な編成バランスです。</span>' 
      : `<span style="color:#dc2626; font-weight:bold;">[ ${missingAttrs.join('・')} ]</span> 属性の主力が不足しています。`}
    </p>
    ${recommendHTML}
  `;
}

// ボタンのクリックイベント登録（即時・遅延監視）
(function initDiagTool() {
  function attachEvent() {
    const btn = document.getElementById('diag-btn');
    if (btn) {
      btn.onclick = diagnoseWithGitHubData;
      return true;
    }
    return false;
  }

  if (!attachEvent()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (attachEvent() || attempts > 20) {
        clearInterval(timer);
      }
    }, 200);
  }
})();
