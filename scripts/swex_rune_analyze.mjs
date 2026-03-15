import fs from 'node:fs';

const FILE =
  process.argv[2] ||
  'C:\\project\\서머너즈워 프로젝트\\SMWR_FRONT\\src\\#매봉-199792.json';

const SET_NAMES = new Map([
  [1, '활력'],
  [2, '수호'],
  [3, '신속'],
  [4, '칼날'],
  [5, '격노'],
  [6, '집중'],
  [7, '인내'],
  [8, '맹공'],
  [10, '절망'],
  [11, '흡혈'],
  [13, '폭주'],
  [14, '신보'],
  [15, '응보'],
  [16, '의지'],
  [17, '보호'],
  [18, '반격'],
  [19, '파괴'],
  [20, '투지'],
  [21, '결의'],
  [22, '고양'],
  [23, '명중'],
  [24, '근성'],
  [25, '봉인'],
  [26, '무형'],
]);

// Max Roll(6성 전설 기준) - 가이드 기준
const MAX_ROLL = new Map([
  [2, 8], // HP%
  [4, 8], // ATK%
  [6, 8], // DEF%
  [10, 8], // ACC
  [12, 8], // RES
  [11, 6], // SPD
  [9, 6], // CR
  [8, 7], // CD
]);

function round2(n) {
  return Math.round(n * 100) / 100;
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sum(arr) {
  let s = 0;
  for (const x of arr) s += x || 0;
  return s;
}

function avg(arr) {
  if (!arr?.length) return 0;
  return sum(arr) / arr.length;
}

function computeEfficiencyPercent(secEff, prefixEff) {
  // sec_eff: [[id, total, grind, enchanted], ...]
  // prefix_eff: [id, value]
  let ratioSum = 0;

  if (Array.isArray(secEff)) {
    for (const e of secEff) {
      if (!Array.isArray(e) || e.length < 2) continue;
      const id = toNumber(e[0]);
      const val = toNumber(e[1]);
      if (!id || val === null) continue;
      const max = MAX_ROLL.get(id);
      if (!max) continue;
      ratioSum += val / max;
    }
  }

  if (Array.isArray(prefixEff) && prefixEff.length >= 2) {
    const id = toNumber(prefixEff[0]);
    const val = toNumber(prefixEff[1]);
    const max = id ? MAX_ROLL.get(id) : null;
    if (max && val !== null) ratioSum += val / max;
  }

  const eff = ((1 + ratioSum) / 2.8) * 100;
  return eff < 0 ? 0 : eff;
}

function computeRuneScore(effPercent) {
  return effPercent * 1.8;
}

function categoryForSetId(setId) {
  if (setId === 3) return 'swift';
  if (setId === 13) return 'violent';
  if (setId === 10) return 'despair';
  if (setId === 16) return 'will';
  if (setId === 18) return 'revenge';
  return 'others';
}

function getRuneList(root) {
  const candidates = [
    'runes',
    'rune_list',
    'runeInventory',
    'rune_inventory',
    'rune',
    'runeList',
  ];
  for (const k of candidates) {
    const v = root?.[k];
    if (Array.isArray(v)) return { key: k, list: v };
  }
  return { key: null, list: [] };
}

function main() {
  const raw = fs.readFileSync(FILE, 'utf8');
  const root = JSON.parse(raw);

  const { key, list } = getRuneList(root);
  if (!key || !list.length) {
    console.log('[ERROR] 룬 리스트를 찾지 못했습니다. (keys: runes/rune_list 등)');
    console.log('top keys:', Object.keys(root || {}).slice(0, 80));
    process.exit(2);
  }

  const runes = [];
  for (const r of list) {
    const setId = toNumber(r?.set_id);
    const runeId = toNumber(r?.rune_id ?? r?.runeId ?? r?.id);
    const slot = toNumber(r?.slot_no ?? r?.slot);
    const stars = toNumber(r?.class);
    const rank = toNumber(r?.rank);
    const level = toNumber(r?.upgrade_curr ?? r?.upgrade);

    const secEff = r?.sec_eff ?? r?.substats ?? r?.sub_stat ?? r?.sub_eff;
    const prefixEff = r?.prefix_eff ?? r?.prefix;

    const eff = computeEfficiencyPercent(secEff, prefixEff);
    const score = computeRuneScore(eff);

    runes.push({
      runeId,
      setId,
      setName: setId ? SET_NAMES.get(setId) || `set_${setId}` : 'unknown',
      slot,
      stars,
      rank,
      level,
      eff,
      score,
    });
  }

  // set별
  const bySet = new Map();
  for (const r of runes) {
    const sid = r.setId ?? -1;
    if (!bySet.has(sid)) bySet.set(sid, []);
    bySet.get(sid).push(r);
  }

  // general category별
  const byCat = new Map([
    ['swift', []],
    ['violent', []],
    ['despair', []],
    ['will', []],
    ['revenge', []],
    ['others', []],
  ]);
  for (const r of runes) {
    const cat = categoryForSetId(r.setId);
    byCat.get(cat).push(r);
  }

  function buildTop10ForSet(setId) {
    const arr = (bySet.get(setId) || []).slice().sort((a, b) => b.score - a.score);
    const top = arr.slice(0, 10);
    return {
      count: arr.length,
      considered: top.length,
      scoreSum: round2(sum(top.map((x) => x.score))),
      scoreAvg: round2(avg(top.map((x) => x.score))),
      effAvg: round2(avg(top.map((x) => x.eff))),
      minScore: top.length ? round2(top[top.length - 1].score) : 0,
    };
  }

  function buildGeneralForCat(cat) {
    const arr = byCat.get(cat) || [];
    return {
      count: arr.length,
      scoreSum: round2(sum(arr.map((x) => x.score))),
      scoreAvg: round2(avg(arr.map((x) => x.score))),
      effAvg: round2(avg(arr.map((x) => x.eff))),
    };
  }

  const top10 = {
    swift: buildTop10ForSet(3),
    violent: buildTop10ForSet(13),
    despair: buildTop10ForSet(10),
  };
  const general = {
    swift: buildGeneralForCat('swift'),
    violent: buildGeneralForCat('violent'),
    despair: buildGeneralForCat('despair'),
    will: buildGeneralForCat('will'),
    revenge: buildGeneralForCat('revenge'),
    others: buildGeneralForCat('others'),
  };

  // 진단: 평균 점수 기준 상위/하위 (count>=20만 기준으로)
  const diagCandidates = Object.entries(general)
    .map(([k, v]) => ({ k, ...v }))
    .filter((v) => v.count >= 20);
  diagCandidates.sort((a, b) => b.scoreAvg - a.scoreAvg);

  // 출력
  console.log('=== SWEX Rune Report ===');
  console.log('file:', FILE);
  console.log('rune_list_key:', key);
  console.log('rune_count:', runes.length);
  console.log('');

  console.log('--- Top10 (룬 기준, set별) ---');
  console.table({
    swift: top10.swift,
    violent: top10.violent,
    despair: top10.despair,
  });
  console.log('');

  console.log('--- General (분류별) ---');
  console.table(general);
  console.log('');

  // 상위 룬 20개
  const topOverall = runes.slice().sort((a, b) => b.score - a.score).slice(0, 20);
  console.log('--- Top 20 Runes (overall, by score) ---');
  console.table(
    topOverall.map((r) => ({
      runeId: r.runeId,
      set: `${r.setName}(${r.setId ?? '-'})`,
      slot: r.slot,
      stars: r.stars,
      rank: r.rank,
      level: r.level,
      eff: round2(r.eff),
      score: round2(r.score),
    })),
  );
  console.log('');

  console.log('--- Diagnosis (요약) ---');
  if (!diagCandidates.length) {
    console.log('* 룬 개수가 충분한 분류(count>=20)가 적어 진단이 제한적입니다.');
  } else {
    const best = diagCandidates[0];
    const worst = diagCandidates[diagCandidates.length - 1];
    console.log(
      `* 주력(평균 기준): ${best.k} (avg=${best.scoreAvg}, n=${best.count}) / 약점: ${worst.k} (avg=${worst.scoreAvg}, n=${worst.count})`,
    );
  }
  console.log(
    '* Top10과 General의 “합산” 비교는 룬 개수 영향이 매우 크므로, 진단은 평균(scoreAvg/effAvg)도 함께 보기를 권장합니다.',
  );
}

main();


