function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function firstText(...values) {
  return values.find((value) => typeof value === 'string' && value.trim());
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeBattleResult(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['victory', 'win', 'won', 'success', 'clear', 'passed'].includes(normalized)) {
    return 'victory';
  }
  if (['defeat', 'lose', 'lost', 'loss', 'fail', 'failed'].includes(normalized)) {
    return 'defeat';
  }
  return null;
}

export function formatBattleResult(result) {
  if (result === 'victory') {
    return '胜利';
  }
  if (result === 'defeat') {
    return '失败';
  }
  return '未结算';
}

export function normalizeBattleSession(session) {
  if (!session || typeof session !== 'object') {
    return null;
  }

  return {
    ...session,
    id: firstDefined(session.id, session.sessionId),
    chapterId: toNumber(firstDefined(session.chapterId, session.chapter_id)) ?? session.chapterId,
    layerIndex: toNumber(firstDefined(session.layerIndex, session.layer, session.layer_id)) ?? session.layerIndex,
    waveIndex: toNumber(firstDefined(session.waveIndex, session.wave, session.wave_id)) ?? session.waveIndex,
    missionId: firstDefined(session.missionId, session.mission_id),
    enemyCount: toNumber(firstDefined(session.enemyCount, session.enemy_count)) ?? session.enemyCount,
    enemyLife: toNumber(firstDefined(session.enemyLife, session.enemyHp, session.enemyHP, session.enemy_life)) ?? session.enemyLife,
    enemyAtk: toNumber(firstDefined(session.enemyAtk, session.enemyAttack, session.enemyATK, session.enemy_atk)) ?? session.enemyAtk,
    status: String(session.status || '').trim().toLowerCase() || session.status,
    result: normalizeBattleResult(firstDefined(session.result, session.finalResult, session.outcome)),
  };
}

function normalizeActorSnapshot(snapshot, fallbackName) {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  const name = firstText(snapshot.name, snapshot.actorName, snapshot.nickname, snapshot.label) || fallbackName;
  const life = toNumber(firstDefined(
    snapshot.life,
    snapshot.hp,
    snapshot.currentHp,
    snapshot.currentLife,
    snapshot.remainingLife,
    snapshot.remainingEnemyLife,
  ));
  const maxLife = toNumber(firstDefined(
    snapshot.maxLife,
    snapshot.maxHp,
    snapshot.totalHp,
    snapshot.totalLife,
    snapshot.totalEnemyLife,
  ));
  const atk = toNumber(firstDefined(snapshot.atk, snapshot.attack, snapshot.damage));

  return {
    ...snapshot,
    name,
    life,
    maxLife,
    atk,
  };
}

function normalizeLogEntry(entry, index) {
  if (typeof entry === 'string') {
    return {
      id: `log-${index}`,
      turn: index + 1,
      text: entry,
      hero: null,
      enemy: null,
    };
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const text = firstText(
    entry.text,
    entry.message,
    entry.log,
    entry.content,
    entry.description,
    entry.summary,
    entry.title,
  );

  if (!text) {
    return null;
  }

  return {
    ...entry,
    id: String(firstDefined(entry.id, entry.logId, entry.turnId, `log-${index}`)),
    turn: toNumber(firstDefined(entry.turn, entry.round, entry.turnIndex, entry.roundIndex)) ?? index + 1,
    text,
    hero: normalizeActorSnapshot(
      firstDefined(entry.hero, entry.heroSnapshot, entry.heroState, entry.player, entry.attacker),
      '我方',
    ),
    enemy: normalizeActorSnapshot(
      firstDefined(entry.enemy, entry.enemySnapshot, entry.enemyState, entry.target, entry.defender),
      '敌方',
    ),
    result: normalizeBattleResult(firstDefined(entry.result, entry.outcome)),
  };
}

function normalizeSummary(summary) {
  if (typeof summary === 'string' && summary.trim()) {
    return {
      text: summary.trim(),
      lines: [summary.trim()],
      result: null,
    };
  }

  if (!summary || typeof summary !== 'object') {
    return null;
  }

  const lines = firstDefined(summary.lines, summary.items, summary.messages, summary.highlights);
  return {
    ...summary,
    result: normalizeBattleResult(firstDefined(summary.result, summary.finalResult, summary.outcome)),
    lines: Array.isArray(lines)
      ? lines
        .map((line) => {
          if (typeof line === 'string') {
            return line.trim();
          }
          if (line && typeof line === 'object') {
            return firstText(line.text, line.label, line.value, line.message) || '';
          }
          return '';
        })
        .filter(Boolean)
      : [],
  };
}

function normalizeRewards(source) {
  if (!source || typeof source !== 'object') {
    return null;
  }

  const coin = toNumber(firstDefined(source.coin, source.gold, source.money));
  const exp = toNumber(firstDefined(source.exp, source.experience));
  if (coin === null && exp === null) {
    return null;
  }

  return {
    coin,
    exp,
  };
}

export function normalizeBattleSimulation(payload, fallbackSession = null) {
  const root = payload?.simulation && typeof payload.simulation === 'object'
    ? payload.simulation
    : payload || {};
  const session = normalizeBattleSession(firstDefined(payload?.session, root.session, fallbackSession));
  const logsSource = firstDefined(
    payload?.turnLogs,
    payload?.roundLogs,
    payload?.logs,
    payload?.logLines,
    payload?.battleLogs,
    payload?.timeline,
    root.turnLogs,
    root.roundLogs,
    root.logs,
    root.logLines,
    root.battleLogs,
    root.timeline,
  );
  const logs = Array.isArray(logsSource)
    ? logsSource.map((entry, index) => normalizeLogEntry(entry, index)).filter(Boolean)
    : [];

  const hero = normalizeActorSnapshot(
    firstDefined(
      payload?.hero,
      payload?.heroSnapshot,
      payload?.snapshots?.hero,
      payload?.actors?.hero,
      root.hero,
      root.heroSnapshot,
      root.snapshots?.hero,
      root.actors?.hero,
    ),
    '我方',
  );
  const enemy = normalizeActorSnapshot(
    firstDefined(
      payload?.enemy,
      payload?.enemySnapshot,
      payload?.snapshots?.enemy,
      payload?.actors?.enemy,
      root.enemy,
      root.enemySnapshot,
      root.snapshots?.enemy,
      root.actors?.enemy,
    ),
    '敌方',
  );
  const summary = normalizeSummary(
    firstDefined(
      payload?.summary,
      payload?.summaryText,
      payload?.resultSummary,
      payload?.displaySummary,
      root.summary,
      root.summaryText,
      root.resultSummary,
      root.displaySummary,
    ),
  );
  const result = normalizeBattleResult(
    firstDefined(
      payload?.result,
      payload?.finalResult,
      payload?.outcome,
      summary?.result,
      root.result,
      root.finalResult,
      root.outcome,
      session?.result,
    ),
  );

  return {
    session,
    hero,
    enemy,
    logs,
    summary,
    rewards: normalizeRewards(firstDefined(payload?.rewards, root.rewards)),
    result,
    raw: payload,
  };
}

export function normalizeBattleSettlement(payload, simulation = null) {
  const session = normalizeBattleSession(firstDefined(payload?.session, simulation?.session));
  const summary = normalizeSummary(firstDefined(payload?.summary, payload?.settlement?.summary, simulation?.summary));
  const summaryFromText = normalizeSummary(firstDefined(
    payload?.summaryText,
    payload?.settlement?.summaryText,
    simulation?.summary?.text,
  ));
  const result = normalizeBattleResult(
    firstDefined(payload?.result, payload?.settlement?.result, session?.result, simulation?.result),
  );

  return {
    ...(payload || {}),
    session,
    summary: summary || summaryFromText,
    rewards: normalizeRewards(firstDefined(payload?.rewards, payload?.settlement?.rewards, simulation?.rewards)),
    result,
    simulation: simulation
        ? {
          ...simulation,
          session,
          result,
          summary: simulation.summary || summary || summaryFromText,
        }
      : null,
  };
}

export function buildBattleSummaryLines(summary, fallback = {}) {
  const lines = [];
  const source = summary && typeof summary === 'object' ? summary : null;

  if (source?.lines?.length) {
    return source.lines.slice(0, 4);
  }

  const resultText = source?.resultText || source?.title || source?.text;
  if (resultText) {
    lines.push(String(resultText));
  } else if (fallback.result) {
    lines.push(`战斗结果：${formatBattleResult(fallback.result)}`);
  }

  const subtitle = source?.subtitle || source?.description;
  if (subtitle) {
    lines.push(String(subtitle));
  }

  const rewardText = source?.rewardText || source?.rewardSummary;
  if (rewardText) {
    lines.push(`奖励摘要：${rewardText}`);
  }

  const nextAction = source?.nextAction;
  if (nextAction) {
    lines.push(`后续动作：${nextAction}`);
  }

  return lines.filter(Boolean).slice(0, 4);
}
