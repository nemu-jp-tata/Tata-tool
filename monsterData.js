// monsterData.js

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
  "ネムクラゲ種": {
    baseEffects: [
      { type: "heal", text: "回復" },
      { type: "debuff", text: "スタン" }
    ]
  },
  "シズクジ種": {
    baseEffects: [
      { type: "debuff", text: "減速" },
      { type: "debuff", text: "睡眠" }
    ]
  },
  "スケダコ種": {
    baseEffects: [
      { type: "debuff", text: "視界妨害" },
      { type: "buff", text: "被ダメージ減少" }
    ]
  },
  "ホネギョ種": {
    baseEffects: [
      { type: "debuff", text: "減速" },
      { type: "debuff", text: "スタン" },
      { type: "debuff", text: "潮流-被ダメージ増加" }
    ],
    tierEffects: {
      2: [
        { type: "buff", text: "潮流-被ダメージ減少" }
      ]
    }
  },
  "パクマ種": {
    baseEffects: [
      { type: "buff", text: "コーラ-ダメージ増加" },
      { type: "buff", text: "コーラ-攻防増加" }
    ]
  },
  "トスリス種": {
    baseEffects: [
      { type: "debuff", text: "スタン" }
    ]
  },
  "スズメラ種": {
    baseEffects: [
      { type: "debuff", text: "燃焼" }
    ]
  },
  "ヒバイヌ種": {
    baseEffects: [],
    tierEffects: {
      3: [
        { type: "debuff", text: "ダメージ減少" }
      ]
    }
  },
  "ヒモリ種": {
    baseEffects: [
      { type: "debuff", text: "燃焼" }
    ]
  },
  "ヒノムシ種": {
    baseEffects: [
      { type: "heal", text: "回復" },
      { type: "debuff", text: "火の蝶-被ダメージ増加" },
      { type: "buff", text: "蝶の翅-全ステータス増加" }
    ],
    tierEffects: {
      2: [
        { type: "buff", text: "潮流-被ダメージ減少" }
      ]
    }
  },
  "ヒエビ種": {
    baseEffects: [],
    tierEffects: {
      2: [
        { type: "debuff", text: "燃焼" }
      ]
    }
  },
  "ワンブー種": {
    baseEffects: [
      { type: "buff", text: "グリルシールド" },
      { type: "buff", text: "回復" },
      { type: "debuff", text: "スタン" },
      { type: "buff", text: "攻撃力増加" }
    ]
  },
   "トラーニー種": {
    baseEffects: [
      { type: "debuff", text: "燃焼" }
    ]
  },
   "ププンク種": {
    baseEffects: [
      { type: "buff", text: "ガス-攻防増加" }
    ]
  },
  "ヒニャオ種": {
    baseEffects: [
      { type: "debuff", text: "ダメージ減少" }
    ],
    tierEffects: {
      3: [
        { type: "buff", text: "ヒニャオ-攻撃力増加" }
      ]
    }
  },
   "フグマル種": {
    baseEffects: [
      { type: "heal", text: "回復" },
      { type: "debuff", text: "燃焼" },
      { type: "debuff", text: "スタン" }
    ],
    tierEffects: {
      2: [
        { type: "buff", text: "一貫-攻撃力増加" }
      ]
    }
  },
  "アタタマ種": {
    baseEffects: [
      { type: "debuff", text: "燃焼" },
      { type: "buff", text: "ダメージ増加" },
      { type: "buff", text: "攻撃力増加" },
      { type: "debuff", text: "減速" },
      { type: "debuff", text: "スタン" }
    ]
  },
  "フタバード種": {
    baseEffects: [
      { type: "heal", text: "回復" }
    ]
  },
  "フルッグ種": {
    baseEffects: [],
    tierEffects: {
      3: [
        { type: "debuff", text: "減速" }
      ]
    }
  },
  "コマキリ種": {
    baseEffects: [
      { type: "heal", text: "自己回復" }
    ],
    tierEffects: {
      3: [
        { type: "debuff", text: "被ダメージ増加" }
      ]
    }
  },
  "グリンビィ種": {
    baseEffects: [
      { type: "buff", text: "無敵" },
      { type: "buff", text: "ガス-ダメージ増加" },
      { type: "buff", text: "ガス-攻撃力増加" }
    ],
    tierEffects: {
      2: [
        { type: "debuff", text: "被ダメージ増加" }
      ],
      3: [
        { type: "debuff", text: "ノックバック" }
      ]
    }
  },
  "コパンダ種": {
    baseEffects: [
      { type: "debuff", text: "減速" },
      { type: "buff", text: "酒-攻撃力増加＆攻撃速度増加" },
      { type: "buff", text: "ダメージ増加" },
      { type: "buff", text: "被ダメージ減少" }
    ]
  },
  "ヒマワリン種": {
    baseEffects: [
      { type: "heal", text: "回復" },
      { type: "buff", text: "陽だまり-攻撃力増加" },
      { type: "debuff", text: "スタン" }
    ],
    tierEffects: {
      2: [
        { type: "buff", text: "陽だまり-攻防増加" }
      ]
  },
    "フクログモ種": {
    baseEffects: [
      { type: "buff", text: "雫シールド" },
      { type: "debuff", text: "クモの巣-束縛" }
    ],
    tierEffects: {
      2: [
        { type: "debuff", text: "スタン" }
      ]
  },
      "サボール種": {
    baseEffects: [
      { type: "debuff", text: "トゲ刺し" }
    ]
  },
      "マルッシュ種": {
    baseEffects: [
      { type: "buff", text: "胞子-攻撃速度増加" },
      { type: "debuff", text: "被ダメージ増加" }
    ],
    tierEffects: {
      3: [
        { type: "debuff", text: "胞子-被ダメージ増加" },
        { type: "buff", text: "胞子-被ダメージ減少" }
      ]
  },
    "ベロパカ種": {
    baseEffects: [
      { type: "buff", text: "ダメージ増加" },
      { type: "debuff", text: "強力減速エリア" },
      { type: "debuff", text: "減速" }
    ],
    tierEffects: {
      2: [
        { type: "debuff", text: "束縛" }
      ],
      tierEffects: {
      3: [
        { type: "debuff", text: "減速エリア" }
      ]
  },
      "フリコー種": {
    baseEffects: [
      { type: "heal", text: "回復" },
      { type: "debuff", text: "スロウクロック" }
    ]
  },
      "ヤミノメ種": {
    baseEffects: [
      { type: "debuff", text: "毒" },
      { type: "debuff", text: "寄生毒" }
    ],
    tierEffects: {
      3: [
        { type: "debuff", text: "毒エリア" }
      ]
  },
  "コマリ種": {
    baseEffects: [
      { type: "buff", text: "攻撃" }
    ],
    tierEffects: {
      3: [
        { type: "buff", text: "" }
      ]
    }
  }
};
