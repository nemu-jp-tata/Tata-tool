// speciesData.js

/**
 * 種族ごとの発動効果（バフ・デバフ）マスタデータ
 * 
 * - baseEffects: その種族のモンスターが持つ基本効果
 * - tierEffects: 特定のTier以上で追加開放される効果（例: T2やT3で解放される効果）
 */
const speciesEffectsMaster = {
  "チーシェル種": {
    baseEffects: [
      { type: "debuff", text: "減速" }
    ]
  },
  "カピラス種": {
    baseEffects: [
      { type: "buff", text: "ミカン-ダメージ増加" },
      { type: "buff", text: "ミカン-攻撃力増加" }
    ],
    tierEffects: {
      2: [
        { type: "heal", text: "回復" }
      ]
    }
  },
  "ネコオリ種": {
    baseEffects: [
      { type: "debuff", text: "減速" },
      { type: "debuff", text: "凍結" }
    ]
  },
  "ナミアシカ種": {
    baseEffects: [
      { type: "debuff", text: "ノックバック" }
    ],
    tierEffects: {
      2: [
        { type: "debuff", text: "ダメージ減少" }
      ]
    }
  },
  "ウミミ種": {
    baseEffects: [
      { type: "debuff", text: "減速" },
      { type: "debuff", text: "睡眠" },
      { type: "debuff", text: "超被ダメージ増加" }
    ],
    tierEffects: {
      2: [
        { type: "debuff", text: "被ダメージ増加" }
      ]
    }
  },
  "ツヨカニ種": {
    baseEffects: [
      { type: "debuff", text: "ノックバック" }
    ],
    tierEffects: {
      2: [
        { type: "debuff", text: "裂傷" }
      ],
      3: [
        { type: "buff", text: "ツヨカニのみ攻撃力増加" }
      ]
    }
  },
  "ポタカゲ種": {
    baseEffects: [
      { type: "debuff", text: "減速" }
    ]
  },
  "ヒバイヌ種": {
    baseEffects: [
      { type: "debuff", text: "対面敵の防御力 -10%" }
    ],
    tierEffects: {
      3: [
        { type: "buff", text: "【T3以上】炎属性の攻撃力 +15%" }
      ]
    }
  },
  "コマキリ種": {
    baseEffects: [
      { type: "buff", text: "攻撃速度 +5%" }
    ],
    tierEffects: {
      3: [
        { type: "buff", text: "【T3以上】与えるダメージ +10%" }
      ]
    }
  }
};
