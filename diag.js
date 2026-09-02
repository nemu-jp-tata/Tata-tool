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

  const tier = parseInt(tierElement.value, 10);
  const checkedAttrs = Array.from(document.querySelectorAll('.user-attr:checked')).map(cb => cb.value);
  const allAttrs = ['炎', '水', '草', '雷', '岩'];
  const missingAttrs = allAttrs.filter(a => !checkedAttrs.includes(a));

  output.style.display = 'block';

  let recommendHTML = "";

  if (missingAttrs.length > 0) {
    // 不足している属性からランダムに1つ対象に選ぶ
    const targetAttr = missingAttrs[Math.floor(Math.random() * missingAttrs.length)];
    // 不足属性のT4タタを全データから検索
    const candidates = rawMonstersData.filter(m => m.type === targetAttr && m.T === 4);
    
    if (candidates.length > 0) {
      const rec = candidates[Math.floor(Math.random() * candidates.length)];
      
      recommendHTML = `
        <div style="margin-top:15px; background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #cbd5e1; display:flex; align-items:center; gap:12px;">
          <img src="${GITHUB_IMG_BASE}${encodeURIComponent(rec.name)}.webp" width="60" height="60" style="border-radius:6px; object-fit:cover; background:#e2e8f0; flex-shrink:0;" alt="${rec.name}" onerror="this.style.display='none'">
          <div>
            <div style="font-size:12px; color:#2563eb; font-weight:bold;">【おすすめ補強タタ】</div>
            <strong style="font-size:16px; color:#1e293b;">${rec.name} （${rec.type}属性 / ${rec.role}）</strong>
            <div style="font-size:12px; color:#475569; margin-top:4px;">${targetAttr}属性の戦力を補うため、<b>${rec.species}</b>（T1〜）の育成を目指すのがおすすめです！</div>
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

// ボタンクリックのイベントListenerを確実にバインドする（即時・遅延監視付き）
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
