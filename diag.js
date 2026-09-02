// jsDelivrを経由した画像参照ベースパス
const GITHUB_IMG_BASE = "https://cdn.jsdelivr.net/gh/nemu-jp-tata/Tata-tool@main/images/";

function diagnoseWithGitHubData() {
  // rawMonstersData (monsters.js) が読み込まれているか確認
  if (typeof rawMonstersData === 'undefined') {
    alert("モンスターデータの読み込みに失敗しました。ファイルパスまたは通信状況を確認してください。");
    return;
  }

  const tier = parseInt(document.getElementById('user-tier').value);
  const checkedAttrs = Array.from(document.querySelectorAll('.user-attr:checked')).map(cb => cb.value);
  const allAttrs = ['炎', '水', '草', '雷', '岩'];
  const missingAttrs = allAttrs.filter(a => !checkedAttrs.includes(a));

  const output = document.getElementById('diag-output');
  output.style.display = 'block';

  let recommendHTML = "";
  if (missingAttrs.length > 0) {
    const targetAttr = missingAttrs[0];
    // 不足属性のT4タタを全データから自動抽出
    const candidates = rawMonstersData.filter(m => m.type === targetAttr && m.T === 4);
    
    if (candidates.length > 0) {
      // 候補からランダムで1体提案
      const rec = candidates[Math.floor(Math.random() * candidates.length)];
      
      recommendHTML = `
        <div style="margin-top:15px; background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #cbd5e1; display:flex; align-items:center; gap:12px;">
          <img src="${GITHUB_IMG_BASE}${rec.name}.webp" width="50" height="50" style="border-radius:6px; object-fit:cover; background:#ccc;" alt="${rec.name}" onerror="this.style.display='none'">
          <div>
            <div style="font-size:12px; color:#64748b;">【おすすめ補強タタ】</div>
            <strong style="font-size:15px; color:#1e293b;">${rec.name} （${rec.type}属性 / ${rec.role}）</strong>
            <div style="font-size:12px; color:#475569;">${targetAttr}属性の戦力を補うため、<b>${rec.species}</b>（T1〜）の育成を目指すのがおすすめです！</div>
          </div>
        </div>
      `;
    }
  }

  output.innerHTML = `
    <h3 style="margin-top:0; color:#1e3a8a;">診断結果（主力段階：T${tier}中心）</h3>
    <p><b>■ 属性バランス評価:</b><br>
    ${checkedAttrs.length === 5 
      ? '全属性バランス良く揃っています！理想的です。' 
      : `<span style="color:#dc2626; font-weight:bold;">[ ${missingAttrs.join('・')} ]</span> 属性が不足しています。`}
    </p>
    ${recommendHTML}
  `;
}
