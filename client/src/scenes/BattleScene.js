import BaseScene from './BaseScene.js';
import {
  V0_COLORS,
  createV0Button,
  createV0HealthBar,
  createV0Pill,
  createV0VerticalCard,
  drawV0Panel,
  makeV0Text,
} from '../utils/v0ui.js';
import {
  ApiRequestError,
  confirmBattleSkillCandidate,
  fetchBattleSession,
  fetchBattleSessionBuild,
  fetchBattleSkillCandidates,
  fetchPlayerBuild,
  refreshBattleSkillCandidates,
  settleBattleSession,
  simulateBattleSessionStep,
  startBattleSession,
} from '../data/api.js';
import {
  buildBattleSummaryLines,
  formatBattleResult,
  normalizeBattleResult,
  normalizeBattleSession,
  normalizeBattleSettlement,
  normalizeBattleSimulation,
} from '../data/battle.js';
import { getCurrentPlayer, getSession, refreshHomeOverview, refreshPlayerSession, setBattleSettlement } from '../data/session.js';

const AUTO_PLAY_DELAY = 900;
const SETTLE_DELAY = 700;
const MAX_VISIBLE_LOGS = 6;
const BUILD_CARD_COUNT = 3;

const GRADE_COLORS = {
  N: 0x9aa4b2,
  R: 0x4c89d9,
  SR: 0x8a63d2,
  SSR: 0xd99a3d,
  UR: 0xd94f5c,
};

function isInterfaceMissing(error) {
  return error instanceof ApiRequestError && error.status === 404;
}

function resolveChapter(sessionState, chapterId) {
  const normalizedChapterId = Number(chapterId || 1);
  return sessionState.chapterOverview?.chapters?.find((item) => Number(item.id) === normalizedChapterId)
    || sessionState.chapters?.find((item) => Number(item.id) === normalizedChapterId)
    || null;
}

function buildHeroSnapshot(player, chapter, source = null) {
  if (source) {
    return source;
  }

  return {
    name: player?.nickname || player?.name || player?.account || '我方',
    life: chapter?.guessHeroLife ?? null,
    maxLife: chapter?.guessHeroLife ?? null,
    atk: chapter?.guessHeroAtk ?? null,
  };
}

function buildEnemySnapshot(session, source = null) {
  if (source) {
    return source;
  }

  if (!session) {
    return null;
  }

  return {
    name: session.enemyName || '敌方',
    life: session.enemyLife ?? null,
    maxLife: session.enemyLife ?? null,
    atk: session.enemyAtk ?? null,
  };
}

function getActorRatio(actor) {
  if (!actor?.maxLife || actor.life === null || actor.life === undefined) {
    return 1;
  }
  return actor.life / actor.maxLife;
}

function getGradeFill(grade) {
  return GRADE_COLORS[grade] || 0xe9dfc9;
}

function normalizeBuildBar(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      capacity: 20,
      used: 0,
      remaining: 20,
      slots: [],
      effectsPreview: [],
      display: { summaryText: '构筑条等待后端数据' },
    };
  }

  const capacity = Number(payload.capacity ?? payload.buildBar?.capacity ?? 20);
  const slots = Array.isArray(payload.slots)
    ? payload.slots
    : Array.isArray(payload.buildBar?.slots)
      ? payload.buildBar.slots
      : [];
  const used = Number(payload.used ?? payload.buildBar?.used ?? slots.length);
  const remaining = Number(payload.remaining ?? payload.buildBar?.remaining ?? Math.max(0, capacity - used));

  return {
    ...payload,
    capacity,
    used,
    remaining,
    slots,
    effectsPreview: Array.isArray(payload.effectsPreview) ? payload.effectsPreview : [],
    display: payload.display || payload.buildBar?.display || {},
  };
}

function getFlow(payload) {
  return payload?.flow || payload?.raw?.flow || {};
}

function isChoiceRequired(payload, session) {
  const flow = getFlow(payload);
  return Boolean(flow.requiresSkillChoice || flow.nextState === 'choice' || session?.status === 'choice');
}

function isSettlementReady(payload, session, result) {
  const flow = getFlow(payload);
  return Boolean(flow.canSettle || flow.nextState === 'finished' || session?.status === 'finished' || result);
}

function pickWaveBannerText(text, fallback = '等待波次推进') {
  if (!text) {
    return fallback;
  }

  if (text.includes('波') || text.includes('BOSS') || text.includes('Boss') || text.includes('来袭')) {
    return text;
  }

  return fallback;
}

export default class BattleScene extends BaseScene {
  constructor() {
    super('BattleScene');
    this.battleSession = null;
    this.simulation = null;
    this.currentMode = 'loading';
    this.playbackIndex = 0;
    this.logEntries = [];
    this.playedLogs = [];
    this.autoPlayEnabled = true;
    this.playbackTimer = null;
    this.settleTimer = null;
    this.pendingSettlementResult = null;
    this.overlayMode = null;
    this.buildBar = normalizeBuildBar(null);
    this.choiceOverlay = null;
    this.choicePayload = null;
    this.selectedCandidateId = null;
    this.choiceBusy = false;
  }

  create() {
    this.addBackground('battle');
    this.player = getCurrentPlayer();
    this.syncSceneState();
    this.renderFrame();
    this.events.once('shutdown', () => this.clearTimers());
    this.events.once('destroy', () => this.clearTimers());
    this.loadBattleSession();
  }

  syncSceneState(nextChapterId = null) {
    this.sessionState = getSession();
    this.player = getCurrentPlayer();
    this.chapterId = Number(nextChapterId || this.player.currentChapterId || this.player.chapterId || 1);
    this.chapter = resolveChapter(this.sessionState, this.chapterId);
  }

  renderFrame() {
    drawV0Panel(this, 375, 223, 686, 154, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 30,
    });
    this.chapterTitle = makeV0Text(this, 70, 204, `第${this.chapter?.id || this.chapterId}章 ${this.chapter?.name || '当前章节'}`, {
      fontSize: '26px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    this.waveText = makeV0Text(this, 70, 242, '第1层 第1波 / 共1波', {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    this.wavePill = createV0Pill(this, 125, 273, 110, 34, '普通波', {
      fill: 0xffe7a8,
      radius: 16,
      fontSize: '18px',
    });
    this.autoPill = createV0Pill(this, 259, 273, 126, 34, '自动战斗', {
      fill: 0xe8f2ff,
      radius: 16,
      fontSize: '18px',
    });
    this.statusCardLabel = makeV0Text(this, 372, 204, '双方状态卡', {
      fontSize: '26px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    this.heroStateLabel = makeV0Text(this, 420, 242, '我方生命', {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    this.heroBar = createV0HealthBar(this, 420, 256, 258, 1, { fill: V0_COLORS.green });
    this.enemyStateLabel = makeV0Text(this, 420, 290, '敌方生命', {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    this.enemyBar = createV0HealthBar(this, 420, 304, 258, 1, { fill: V0_COLORS.red });

    createV0VerticalCard(this, 375, 752, 670, 840, {
      fill: 0xffffff,
      fillAlpha: 0.08,
      stroke: 0xffffff,
      strokeAlpha: 0.2,
      radius: 34,
    });
    this.stageTitle = makeV0Text(this, 78, 388, '文字战报主表现区', {
      fontSize: '30px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    this.stageSubtitle = makeV0Text(this, 78, 424, '主舞台承载最新战报、回合日志、波次切换和战斗摘要', {
      fontSize: '20px',
      color: 'rgba(255,255,255,0.72)',
    }).setOrigin(0, 0.5);
    createV0Pill(this, 598, 380, 136, 36, 'V0 临时实现', {
      fill: 0xffe7a8,
      radius: 18,
      fontSize: '18px',
    });

    drawV0Panel(this, 375, 526, 606, 152, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 28,
    });
    this.latestLabel = makeV0Text(this, 104, 496, '最新战报', {
      fontSize: '18px',
      fontStyle: '700',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    this.latestReport = makeV0Text(this, 104, 546, '战斗尚未开始', {
      fontSize: '32px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
      wordWrap: { width: 500 },
    }).setOrigin(0, 0.5);
    this.latestMeta = makeV0Text(this, 104, 584, '当前节奏：等待创建战斗会话', {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 500 },
    }).setOrigin(0, 0.5);
    this.actionButton = createV0Button(this, 560, 570, 180, 62, '开始战斗', 'primary', () => {
      this.handlePrimaryAction();
    }, { fontSize: '24px', radius: 20 });

    drawV0Panel(this, 375, 782, 606, 312, {
      fill: 0x0a1220,
      fillAlpha: 0.68,
      stroke: 0xffffff,
      strokeAlpha: 0.18,
      radius: 28,
    });
    this.logLabel = makeV0Text(this, 104, 674, '回合日志', {
      fontSize: '24px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    this.logHint = makeV0Text(this, 104, 714, '默认自动滚动到最新内容，保留最近 6 条可视记录', {
      fontSize: '18px',
      color: 'rgba(255,255,255,0.70)',
    }).setOrigin(0, 0.5);
    this.logText = makeV0Text(this, 104, 764, '等待服务端返回战报', {
      fontSize: '22px',
      color: '#d7e7f7',
      wordWrap: { width: 520 },
      lineSpacing: 14,
      align: 'left',
    }).setOrigin(0, 0);
    this.stepButton = createV0Button(this, 598, 902, 122, 42, '推进', 'secondary', () => {
      this.playNextTurn();
    }, { fontSize: '20px', radius: 16 });

    drawV0Panel(this, 375, 1013, 606, 94, {
      fill: 0xffe7a8,
      stroke: V0_COLORS.gold,
      radius: 24,
    });
    this.bannerLabel = makeV0Text(this, 375, 1006, '波次切换横幅', {
      fontSize: '20px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    this.bannerText = makeV0Text(this, 375, 1040, '等待波次推进', {
      fontSize: '30px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
      wordWrap: { width: 540 },
    });

    drawV0Panel(this, 375, 1116, 606, 76, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 24,
    });
    this.summaryPrefix = makeV0Text(this, 104, 1124, '战斗摘要', {
      fontSize: '21px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    this.summaryLine = makeV0Text(this, 248, 1124, '累计记录 0 · 结果待定 · 主功法待接入', {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);

    drawV0Panel(this, 375, 1320, 686, 200, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 34,
    });
    this.buildTitle = makeV0Text(this, 72, 1280, '本局构筑条', {
      fontSize: '28px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    this.buildHint = makeV0Text(this, 72, 1314, '固定底部锚点，功法超出单屏后横向滚动', {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    this.buildCards = [
      createV0VerticalCard(this, 130, 1370, 116, 72, { fill: 0xffe7a8, stroke: V0_COLORS.panelStroke, radius: 18 }),
      createV0VerticalCard(this, 264, 1370, 116, 72, { fill: 0xe8f2ff, stroke: V0_COLORS.panelStroke, radius: 18 }),
      createV0VerticalCard(this, 398, 1370, 116, 72, { fill: 0xf3e8ff, stroke: V0_COLORS.panelStroke, radius: 18 }),
    ];
    this.buildTexts = [
      makeV0Text(this, 130, 1380, '待获得功法', { fontSize: '18px', fontStyle: '700', color: V0_COLORS.darkText, wordWrap: { width: 94 } }),
      makeV0Text(this, 264, 1380, '待获得功法', { fontSize: '18px', fontStyle: '700', color: V0_COLORS.darkText, wordWrap: { width: 94 } }),
      makeV0Text(this, 398, 1380, '待获得功法', { fontSize: '18px', fontStyle: '700', color: V0_COLORS.darkText, wordWrap: { width: 94 } }),
    ];
    this.buildMoreText = makeV0Text(this, 490, 1372, '读取中', {
      fontSize: '18px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 88 },
    });
    this.pauseButton = createV0Button(this, 609, 1367, 138, 74, '暂停', 'secondary', () => {
      this.openPauseOverlay();
    }, { fontSize: '28px' });

    this.feedbackText = makeV0Text(this, 375, 1450, '', {
      fontSize: '18px',
      color: '#fff5d6',
      wordWrap: { width: 560 },
    });

    this.renderOverlay();
    this.updateStageSnapshots();
    this.updateBuildBar();
    this.renderRecentLogs();
  }

  renderOverlay() {
    this.overlay = this.add.container(0, 0).setVisible(false);
    const mask = this.add.rectangle(375, 812, 750, 1624, 0x09111d, 0.56);
    const panel = drawV0Panel(this, 375, 820, 470, 292, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 32,
    });
    this.overlayTitle = makeV0Text(this, 375, 742, '暂停中', {
      fontSize: '40px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    this.overlayDesc = makeV0Text(this, 375, 824, '当前战斗已暂停', {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 360 },
    });
    this.overlayPrimary = createV0Button(this, 375, 914, 280, 72, '继续战斗', 'primary', () => {
      this.handleOverlayPrimary();
    }, { fontSize: '28px' });
    this.overlaySecondary = createV0Button(this, 375, 998, 280, 60, '返回章节', 'secondary', () => {
      this.handleOverlaySecondary();
    }, { fontSize: '24px' });
    this.overlay.add([
      mask,
      panel,
      this.overlayTitle,
      this.overlayDesc,
      this.overlayPrimary.container,
      this.overlaySecondary.container,
    ]);
  }

  handleOverlayPrimary() {
    if (this.overlayMode === 'pause') {
      this.closeOverlay();
      if (this.autoPlayEnabled && this.playbackIndex < this.logEntries.length && this.currentMode === 'playback-ready') {
        this.startAutoPlayback();
      }
      return;
    }

    if (this.overlayMode === 'confirm-exit') {
      this.closeOverlay();
      this.scene.start('HomeScene');
    }
  }

  handleOverlaySecondary() {
    if (this.overlayMode === 'pause') {
      this.openReturnConfirm();
      return;
    }

    this.closeOverlay();
  }

  openPauseOverlay() {
    this.clearTimers();
    this.overlayMode = 'pause';
    this.overlay.setVisible(true);
    this.overlayTitle.setText('暂停中');
    this.overlayDesc.setText('可继续当前挑战，或返回章节页结束本局');
    this.overlayPrimary.setText('继续战斗');
    this.overlaySecondary.setText('返回章节');
  }

  openReturnConfirm() {
    this.clearTimers();
    this.overlayMode = 'confirm-exit';
    this.overlay.setVisible(true);
    this.overlayTitle.setText('确认返回章节');
    this.overlayDesc.setText('返回章节将结束本局挑战，是否继续');
    this.overlayPrimary.setText('确认返回');
    this.overlaySecondary.setText('继续挑战');
  }

  showSettlementOverlay(text) {
    this.overlayMode = 'settling';
    this.overlay.setVisible(true);
    this.overlayTitle.setText('结算中');
    this.overlayDesc.setText(text);
    this.overlayPrimary.setVisible(false);
    this.overlaySecondary.setVisible(false);
  }

  closeOverlay() {
    this.overlayMode = null;
    this.overlay.setVisible(false);
    this.overlayPrimary.setVisible(true);
    this.overlaySecondary.setVisible(true);
  }

  clearTimers() {
    if (this.playbackTimer) {
      this.playbackTimer.remove(false);
      this.playbackTimer = null;
    }
    if (this.settleTimer) {
      this.settleTimer.remove(false);
      this.settleTimer = null;
    }
  }

  resetPlayback({ keepSimulation = false } = {}) {
    this.clearTimers();
    this.playbackIndex = 0;
    this.playedLogs = [];
    this.logEntries = keepSimulation && this.simulation ? this.simulation.logs.slice() : [];
    this.pendingSettlementResult = keepSimulation && this.simulation ? this.simulation.result : null;

    if (!keepSimulation) {
      this.simulation = null;
    }

    this.latestReport.setText('战斗尚未开始');
    this.latestMeta.setText('当前节奏：等待创建战斗会话');
    this.bannerText.setText('等待波次推进');
    this.summaryLine.setText('累计记录 0 · 结果待定 · 主功法待接入');
    this.renderRecentLogs();
    this.updateBuildBar();
  }

  async loadBuildBar() {
    try {
      const payload = this.battleSession?.id
        ? await fetchBattleSessionBuild(this.player.account, this.battleSession.id)
        : await fetchPlayerBuild(this.player.account);
      this.buildBar = normalizeBuildBar(payload);
    } catch (error) {
      this.buildBar = normalizeBuildBar({
        display: {
          summaryText: `构筑条读取失败：${error.message}`,
        },
      });
    }

    this.updateBuildBar();
  }

  updateStageSnapshots(hero = null, enemy = null) {
    const heroSnapshot = buildHeroSnapshot(this.player, this.chapter, hero || this.simulation?.hero || null);
    const enemySnapshot = buildEnemySnapshot(this.battleSession, enemy || this.simulation?.enemy || null);
    this.heroStateLabel.setText(heroSnapshot?.maxLife ? `我方生命 ${heroSnapshot.life}/${heroSnapshot.maxLife}` : '我方生命');
    this.enemyStateLabel.setText(enemySnapshot?.maxLife ? `敌方生命 ${enemySnapshot.life}/${enemySnapshot.maxLife}` : '敌方生命');
    this.heroBar.setValue(getActorRatio(heroSnapshot));
    this.enemyBar.setValue(getActorRatio(enemySnapshot));
  }

  updateBuildBar() {
    const slots = this.buildBar?.slots || [];
    const capacity = this.buildBar?.capacity ?? 20;
    const used = this.buildBar?.used ?? slots.length;
    const summaryText = this.buildBar?.display?.summaryText || `已拥有 ${used}/${capacity}`;

    this.buildTitle.setText(`本局构筑条 ${used}/${capacity}`);
    this.buildHint.setText(slots.length ? summaryText : '暂无已拥有功法，需通过三选一获得真实构筑');
    this.buildMoreText.setText(slots.length > BUILD_CARD_COUNT ? `+${slots.length - BUILD_CARD_COUNT}` : `${this.buildBar?.remaining ?? Math.max(0, capacity - used)} 空位`);

    this.buildTexts.forEach((textNode, index) => {
      const slot = slots[index];
      if (!slot) {
        this.buildCards[index].redraw({
          fill: 0xe9dfc9,
          stroke: V0_COLORS.panelStroke,
          fillAlpha: 1,
        });
        textNode.setText(index === 0 ? '暂无功法' : '待选择');
        textNode.setColor(V0_COLORS.mutedText);
        return;
      }

      this.buildCards[index].redraw({
        fill: getGradeFill(slot.grade),
        stroke: V0_COLORS.panelStroke,
        fillAlpha: 0.92,
      });
      textNode.setText(`${slot.name || '未知功法'}\nLv.${slot.level ?? 0} · ${slot.stars ?? 0}星`);
      textNode.setColor('#ffffff');
    });
  }

  renderRecentLogs() {
    const visibleLogs = this.playedLogs.slice(-MAX_VISIBLE_LOGS);
    this.logText.setText(visibleLogs.length ? visibleLogs.join('\n\n') : '等待服务端返回战报');
  }

  updateSummaryLine() {
    const summaryLines = buildBattleSummaryLines(this.simulation?.summary, { result: this.pendingSettlementResult });
    const summaryText = summaryLines[0]
      || `累计记录 ${this.playedLogs.length} · ${this.pendingSettlementResult ? `结果 ${formatBattleResult(this.pendingSettlementResult)}` : '结果待定'} · 主功法待接入`;
    this.summaryLine.setText(summaryText);
  }

  applyMode(mode, feedback = '') {
    this.currentMode = mode;
    const canStep = this.logEntries.length > 0 && this.playbackIndex < this.logEntries.length && !this.autoPlayEnabled && mode === 'playback-ready';
    const canAction = ['ready', 'active-ready', 'choice-ready', 'failed', 'simulate-missing', 'interface-missing', 'settled', 'settlement-error'].includes(mode);
    this.stepButton.setVisible(canStep);
    this.actionButton.setVisible(canAction);
    this.feedbackText.setText(feedback);
    this.autoPill.label.setText(this.autoPlayEnabled ? '自动战斗' : '手动推进');
  }

  renderBattleSession() {
    const session = this.battleSession;
    this.updateStageSnapshots();
    this.updateBuildBar();

    if (!session) {
      this.chapterTitle.setText(`第${this.chapter?.id || this.chapterId}章 ${this.chapter?.name || '当前章节'}`);
      this.waveText.setText('第1层 第1波 / 共1波');
      this.wavePill.label.setText('待命');
      this.latestReport.setText('战斗尚未开始');
      this.latestMeta.setText('当前节奏：等待创建战斗会话');
      this.bannerText.setText('等待波次推进');
      this.summaryLine.setText('累计记录 0 · 结果待定 · 主功法待接入');
      this.actionButton.setText('开始战斗');
      this.applyMode('ready', '等待开始战斗');
      return;
    }

    this.chapterTitle.setText(`第${session.chapterId || this.chapterId}章 ${session.chapter?.name || this.chapter?.name || '当前章节'}`);
    this.waveText.setText(`第${session.layerIndex ?? '-'}层 第${session.waveIndex ?? '-'}波 / 共${this.chapter?.totalWaveEstimate ?? '-'}波`);
    this.wavePill.label.setText(session.waveType || '普通波');

    if (session.status === 'choice') {
      this.latestReport.setText('普通波胜利，等待选择功法');
      this.latestMeta.setText('当前节奏：读取三选一候选功法');
      this.bannerText.setText('请选择一门功法');
      this.summaryLine.setText('本波已完成 · 等待三选一 · 构筑条来自后端');
      this.actionButton.setText('选择功法');
      this.applyMode('choice-ready', '等待选择功法');
      return;
    }

    if (session.status === 'finished') {
      this.latestReport.setText('本章战斗完成，等待结算');
      this.latestMeta.setText(`当前节奏：准备提交${formatBattleResult(session.result)}结算`);
      this.bannerText.setText(session.result === 'victory' ? '章节挑战胜利' : '章节挑战失败');
      this.summaryLine.setText(`累计记录 ${this.playedLogs.length} · 结果 ${formatBattleResult(session.result)} · 可进入结算`);
      this.pendingSettlementResult = session.result;
      this.actionButton.setText('进入结算');
      this.applyMode('settlement-error', '等待提交结算');
      return;
    }

    this.latestReport.setText(session.status === 'settled' ? '本局已结算，可重新挑战' : '会话已创建，准备推进下一波');
    this.latestMeta.setText(session.status === 'settled'
      ? '当前节奏：可重新开始本章战斗'
      : '当前节奏：点击按钮请求服务端逐波模拟');
    this.bannerText.setText(session.status === 'settled' ? '本局结算完成' : '等待波次推进');
    this.summaryLine.setText(session.status === 'settled'
      ? `累计记录 ${this.playedLogs.length} · 结果 ${formatBattleResult(session.result)} · 构筑条已同步`
      : '累计记录 0 · 结果待定 · 构筑条已接真实接口');
    this.actionButton.setText(session.status === 'settled' ? '再次挑战' : '推进一波');
    this.applyMode(session.status === 'settled' ? 'settled' : 'active-ready', session.status === 'settled' ? '本局已结算' : '会话已创建');
  }

  async loadBattleSession() {
    this.resetPlayback();
    this.applyMode('loading', '正在读取战斗会话');

    try {
      const payload = await fetchBattleSession(this.player.account);
      this.battleSession = normalizeBattleSession(payload.session || null);
      this.syncSceneState(this.battleSession?.chapterId || this.chapterId);
      this.renderBattleSession();
      await this.loadBuildBar();
    } catch (error) {
      this.battleSession = null;
      this.actionButton.setText('重新读取');
      this.latestReport.setText(isInterfaceMissing(error) ? '战斗接口未就绪' : '读取战斗会话失败');
      this.latestMeta.setText(error.message);
      this.bannerText.setText('等待波次推进');
      this.summaryLine.setText('累计记录 0 · 结果待定 · 主功法待接入');
      this.applyMode(isInterfaceMissing(error) ? 'interface-missing' : 'failed', error.message);
    }
  }

  async handlePrimaryAction() {
    if (this.currentMode === 'failed' || this.currentMode === 'interface-missing') {
      await this.loadBattleSession();
      return;
    }

    if (this.currentMode === 'choice-ready' || this.battleSession?.status === 'choice') {
      await this.openSkillChoiceOverlay();
      return;
    }

    if (this.currentMode === 'settlement-error' || this.battleSession?.status === 'finished') {
      await this.retrySettlement();
      return;
    }

    if (!this.battleSession || this.battleSession.status === 'settled') {
      await this.startAndSimulateBattle();
      return;
    }

    if (this.battleSession.status === 'active' && !this.simulation) {
      await this.requestBattleSimulationStep();
      return;
    }

    if (this.battleSession.status === 'active') {
      await this.requestBattleSimulationStep();
    }
  }

  async startAndSimulateBattle() {
    this.resetPlayback();
    this.latestReport.setText('正在创建战斗会话');
    this.latestMeta.setText('当前节奏：准备生成文字战报');
    this.applyMode('loading', '正在创建战斗会话');

    try {
      const payload = await startBattleSession(this.player.account, this.chapterId);
      this.battleSession = normalizeBattleSession(payload.session || null);
      this.syncSceneState(this.battleSession?.chapterId || this.chapterId);
      await this.loadBuildBar();
      await this.requestBattleSimulationStep();
    } catch (error) {
      this.latestReport.setText('开始战斗失败');
      this.latestMeta.setText(error.message);
      this.applyMode('failed', `开始战斗失败：${error.message}`);
    }
  }

  async requestBattleSimulationStep() {
    if (!this.battleSession) {
      this.applyMode('failed', '当前没有可模拟的会话');
      return;
    }

    this.resetPlayback();
    this.latestReport.setText('正在推进当前波次');
    this.latestMeta.setText('当前节奏：等待服务端逐波模拟');
    this.actionButton.setText('推进中');
    this.applyMode('loading', '正在请求逐波模拟');

    try {
      const payload = await simulateBattleSessionStep(this.player.account);
      this.simulation = normalizeBattleSimulation(payload, this.battleSession);
      this.simulation.flow = payload.flow || null;
      this.battleSession = this.simulation.session || this.battleSession;
      this.syncSceneState(this.battleSession?.chapterId || this.chapterId);
      this.logEntries = this.simulation.logs.length
        ? this.simulation.logs.slice()
        : [{ id: 'sim-empty', text: '后端未返回回合日志，当前仅展示摘要。' }];
      this.pendingSettlementResult = normalizeBattleResult(this.simulation.result);
      this.playbackIndex = 0;
      this.playedLogs = [];
      this.updateStageSnapshots(this.simulation.hero, this.simulation.enemy);
      this.updateBuildBar();
      this.wavePill.label.setText(this.battleSession.waveType || '普通波');
      this.latestReport.setText(this.logEntries[0]?.text || '战报已生成');
      this.latestMeta.setText(`当前节奏：已收到 ${this.logEntries.length} 条当前波战报`);
      this.bannerText.setText('等待波次推进');
      this.updateSummaryLine();
      this.applyMode('playback-ready', this.autoPlayEnabled ? '准备自动播放战报' : '等待手动推进');

      if (this.autoPlayEnabled) {
        this.startAutoPlayback();
      }
    } catch (error) {
      this.latestReport.setText(isInterfaceMissing(error) ? '逐波模拟接口未就绪' : '战斗模拟失败');
      this.latestMeta.setText(error.message);
      this.applyMode(isInterfaceMissing(error) ? 'simulate-missing' : 'failed', error.message);
    }
  }

  startAutoPlayback() {
    this.clearTimers();
    this.applyMode('playback-ready', '正在自动播放战报');
    this.playNextTurn();

    if (this.playbackIndex >= this.logEntries.length) {
      return;
    }

    this.playbackTimer = this.time.addEvent({
      delay: AUTO_PLAY_DELAY,
      loop: true,
      callback: () => {
        this.playNextTurn();
        if (this.playbackIndex >= this.logEntries.length) {
          this.clearTimers();
        }
      },
    });
  }

  playNextTurn() {
    if (!this.logEntries.length || this.playbackIndex >= this.logEntries.length) {
      this.finishPlayback();
      return;
    }

    const entry = this.logEntries[this.playbackIndex];
    this.playedLogs.push(entry.text);
    this.playbackIndex += 1;

    if (entry.hero || entry.enemy) {
      this.updateStageSnapshots(entry.hero || null, entry.enemy || null);
    }
    if (entry.result && !this.pendingSettlementResult) {
      this.pendingSettlementResult = normalizeBattleResult(entry.result);
    }

    this.latestReport.setText(entry.text || '战报已更新');
    this.latestMeta.setText(`当前节奏：最近展示 ${Math.min(this.playedLogs.length, MAX_VISIBLE_LOGS)} 条日志 / 总计 ${this.logEntries.length} 条`);
    this.bannerText.setText(pickWaveBannerText(entry.text, this.bannerText.text));
    this.renderRecentLogs();
    this.updateSummaryLine();

    if (this.playbackIndex >= this.logEntries.length) {
      this.finishPlayback();
    } else {
      this.applyMode('playback-ready', this.autoPlayEnabled ? '正在自动播放战报' : '等待手动推进');
    }
  }

  finishPlayback() {
    this.clearTimers();
    if (isChoiceRequired(this.simulation, this.battleSession)) {
      this.pendingSettlementResult = null;
      this.latestReport.setText('本波胜利，等待选择功法');
      this.latestMeta.setText('当前节奏：普通 / 精英胜利后进入三选一');
      this.bannerText.setText('选择一门功法继续挑战');
      this.actionButton.setText('选择功法');
      this.updateSummaryLine();
      this.applyMode('choice-ready', '等待选择功法');
      this.settleTimer = this.time.delayedCall(SETTLE_DELAY, () => {
        this.openSkillChoiceOverlay();
      });
      return;
    }

    if (!isSettlementReady(this.simulation, this.battleSession, this.pendingSettlementResult)) {
      this.pendingSettlementResult = null;
      this.latestReport.setText('当前波次已完成');
      this.latestMeta.setText('当前节奏：后端未要求结算，继续推进下一波');
      this.bannerText.setText('继续下一波');
      this.actionButton.setText('推进一波');
      this.updateSummaryLine();
      this.applyMode('active-ready', '可继续推进下一波');
      return;
    }
    if (!this.pendingSettlementResult) {
      this.applyMode('settlement-error', '后端未返回最终结果，无法继续结算');
      return;
    }

    this.bannerText.setText(this.pendingSettlementResult === 'victory' ? '本局战斗胜利' : '本局战斗失败');
    this.latestMeta.setText(`当前节奏：战报播放完成，准备提交${formatBattleResult(this.pendingSettlementResult)}结算`);
    this.updateSummaryLine();
    this.applyMode('playback-ready', '战报播放完成，准备结算');

    this.settleTimer = this.time.delayedCall(SETTLE_DELAY, () => {
      this.retrySettlement();
    });
  }

  destroyChoiceOverlay() {
    if (this.choiceOverlay) {
      this.choiceOverlay.destroy(true);
      this.choiceOverlay = null;
    }
  }

  async openSkillChoiceOverlay() {
    if (this.choiceBusy) {
      return;
    }

    this.clearTimers();
    this.destroyChoiceOverlay();
    this.selectedCandidateId = null;
    this.choicePayload = null;
    this.renderSkillChoiceOverlay({
      display: {
        title: '选择一门功法',
        subtitle: '正在读取后端候选功法',
      },
      candidates: [],
      loading: true,
    });

    try {
      const payload = await fetchBattleSkillCandidates(this.player.account, this.battleSession?.id || '');
      this.choicePayload = payload;
      this.renderSkillChoiceOverlay(payload);
    } catch (error) {
      this.renderSkillChoiceOverlay({
        display: {
          title: '功法刷新失败',
          subtitle: error.message || '候选功法未更新，请重试',
        },
        candidates: [],
        error,
      });
    }
  }

  renderSkillChoiceOverlay(payload) {
    this.destroyChoiceOverlay();
    const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];
    const display = payload?.display || {};
    const isLoading = Boolean(payload?.loading);
    const hasError = Boolean(payload?.error);
    const selected = candidates.find((candidate) => candidate.candidateId === this.selectedCandidateId);

    this.choiceOverlay = this.add.container(0, 0);
    const mask = this.add.rectangle(375, 812, 750, 1624, 0x09111d, 0.66);
    const panel = drawV0Panel(this, 375, 798, 672, 760, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 38,
    });
    const title = makeV0Text(this, 375, 484, display.title || '选择一门功法', {
      fontSize: '42px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    const subtitle = makeV0Text(this, 375, 536, display.subtitle || `本轮候选 ${candidates.length} 门，可刷新 ${payload?.maxRefreshCount ?? 1} 次`, {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 548 },
    });
    const hint = makeV0Text(this, 375, 1094, this.getChoiceHint(payload, selected), {
      fontSize: '20px',
      color: hasError ? '#b55b57' : V0_COLORS.mutedText,
      wordWrap: { width: 548 },
    });
    const refreshButton = createV0Button(this, 222, 1182, 240, 68, isLoading ? '读取中' : payload?.canRefresh === false ? '已刷新' : '刷新一次', 'secondary', () => {
      this.refreshChoiceCandidates();
    }, { fontSize: '24px' });
    const confirmButton = createV0Button(this, 528, 1182, 240, 68, this.choiceBusy ? '选择中' : '确认选择', 'primary', () => {
      this.confirmSelectedChoice();
    }, { fontSize: '24px' });
    const retryButton = createV0Button(this, 375, 1020, 260, 66, '重试读取', 'primary', () => {
      this.openSkillChoiceOverlay();
    }, { fontSize: '24px' });

    refreshButton.setEnabled(!isLoading && !hasError && payload?.canRefresh !== false && !this.choiceBusy);
    confirmButton.setEnabled(Boolean(selected) && !this.choiceBusy && !hasError);
    retryButton.setVisible(hasError);

    this.choiceOverlay.add([mask, panel, title, subtitle, hint, refreshButton.container, confirmButton.container, retryButton.container]);

    if (isLoading) {
      this.renderChoiceStateText('候选读取中', '正在请求 `/api/battle/session/skill-candidates`。');
      return;
    }

    if (hasError) {
      this.renderChoiceStateText('功法刷新失败', display.subtitle || '候选功法未更新，请重试。');
      return;
    }

    if (!candidates.length) {
      this.renderChoiceStateText(display.emptyText || '暂无可选功法', '后端未返回候选功法，当前不会使用假功法数据兜底。');
      return;
    }

    candidates.slice(0, 3).forEach((candidate, index) => {
      this.renderChoiceCard(candidate, index);
    });
  }

  renderChoiceStateText(titleText, descText) {
    const title = makeV0Text(this, 375, 742, titleText, {
      fontSize: '34px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    const desc = makeV0Text(this, 375, 800, descText, {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 500 },
    });
    this.choiceOverlay.add([title, desc]);
  }

  renderChoiceCard(candidate, index) {
    const x = 156 + index * 219;
    const selected = candidate.candidateId === this.selectedCandidateId;
    const disabled = candidate.selectState && candidate.selectState !== 'available';
    const maxed = Boolean(candidate.isMaxStars);
    const canSelect = !disabled && !maxed && !this.choiceBusy;
    const card = createV0VerticalCard(this, x, 804, 192, 430, {
      fill: selected ? V0_COLORS.goldLight : V0_COLORS.panelAlt,
      stroke: selected ? V0_COLORS.goldStroke : V0_COLORS.panelStroke,
      radius: 28,
      fillAlpha: canSelect ? 1 : 0.58,
      strokeAlpha: selected ? 1 : 0.78,
    });
    const grade = createV0Pill(this, x, 620, 70, 36, candidate.grade || 'N', {
      fill: getGradeFill(candidate.grade),
      stroke: getGradeFill(candidate.grade),
      color: '#ffffff',
      fontSize: '18px',
    });
    const name = makeV0Text(this, x, 672, candidate.name || '未知功法', {
      fontSize: '26px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
      wordWrap: { width: 148 },
    });
    const meta = makeV0Text(this, x, 734, [candidate.sectType, candidate.moldType].filter(Boolean).join(' / ') || '门派待定', {
      fontSize: '18px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 148 },
    });
    const desc = makeV0Text(this, x, 830, candidate.desc || '后端未提供功法描述。', {
      fontSize: '18px',
      color: V0_COLORS.darkText,
      lineSpacing: 8,
      wordWrap: { width: 148 },
    });
    const stars = makeV0Text(this, x, 972, `${candidate.stars ?? 0}/${candidate.maxStars ?? 3} 星 · Lv.${candidate.levelPreview ?? candidate.level ?? 0}`, {
      fontSize: '18px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 148 },
    });
    const stateText = maxed ? '已满星' : disabled ? (candidate.disabledReason || '不可选') : selected ? '已选中' : candidate.owned ? '升星收益' : '新功法';
    const state = createV0Pill(this, x, 1034, 122, 34, stateText, {
      fill: maxed || disabled ? 0xe5ded2 : selected ? V0_COLORS.gold : 0xdff4df,
      fontSize: '16px',
      radius: 14,
    });
    const hit = this.add.zone(x, 804, 192, 430).setOrigin(0.5);
    hit.setInteractive({ useHandCursor: canSelect });
    hit.on('pointerdown', () => {
      if (!canSelect) {
        this.feedbackText.setText(candidate.disabledReason || '该功法当前不可选择');
        return;
      }
      this.selectedCandidateId = candidate.candidateId;
      this.renderSkillChoiceOverlay(this.choicePayload);
    });
    this.choiceOverlay.add([card, grade.container, name, meta, desc, stars, state.container, hit]);
  }

  getChoiceHint(payload, selected) {
    if (payload?.loading) {
      return '加载中会禁用刷新与确认，避免重复请求。';
    }
    if (payload?.error) {
      return '接口失败时保留弹窗，不使用假候选功法掩盖问题。';
    }
    if (!Array.isArray(payload?.candidates) || !payload.candidates.length) {
      return payload?.display?.emptyText || '暂无可选功法，请联系后端确认候选池。';
    }
    if (selected) {
      return `已选择：${selected.name || '未知功法'}，确认后会写入后端构筑条。`;
    }
    return payload?.capacity ? `本局构筑容量 ${payload.capacity}，请选择 1 门功法继续。` : '请选择 1 门功法继续下一波。';
  }

  async refreshChoiceCandidates() {
    if (this.choiceBusy || !this.choicePayload) {
      return;
    }

    this.choiceBusy = true;
    this.selectedCandidateId = null;
    this.renderSkillChoiceOverlay({
      ...this.choicePayload,
      loading: true,
      display: {
        ...(this.choicePayload.display || {}),
        title: '刷新候选功法',
        subtitle: '正在请求后端刷新本轮三选一',
      },
    });

    try {
      const payload = await refreshBattleSkillCandidates(this.player.account, this.choicePayload.sessionId || this.battleSession?.id || '');
      this.choicePayload = payload;
      this.choiceBusy = false;
      this.renderSkillChoiceOverlay(payload);
    } catch (error) {
      this.choiceBusy = false;
      this.renderSkillChoiceOverlay({
        ...this.choicePayload,
        error,
        display: {
          ...(this.choicePayload.display || {}),
          title: '功法刷新失败',
          subtitle: error.message || '候选功法未更新，请重试',
        },
      });
    }
  }

  async confirmSelectedChoice() {
    if (this.choiceBusy || !this.choicePayload) {
      return;
    }

    const selected = (this.choicePayload.candidates || []).find((candidate) => candidate.candidateId === this.selectedCandidateId);
    if (!selected) {
      this.feedbackText.setText('请先选择一门功法');
      return;
    }

    this.choiceBusy = true;
    this.renderSkillChoiceOverlay(this.choicePayload);

    try {
      const payload = await confirmBattleSkillCandidate(this.player.account, {
        ...selected,
        sessionId: this.choicePayload.sessionId || this.battleSession?.id || '',
      });
      if (payload.buildBar) {
        this.buildBar = normalizeBuildBar(payload.buildBar);
        this.updateBuildBar();
      } else {
        await this.loadBuildBar();
      }
      const sessionPayload = await fetchBattleSession(this.player.account).catch(() => null);
      if (sessionPayload?.session) {
        this.battleSession = normalizeBattleSession(sessionPayload.session);
      } else {
        this.battleSession = {
          ...(this.battleSession || {}),
          status: 'active',
        };
      }
      this.choiceBusy = false;
      this.destroyChoiceOverlay();
      this.choicePayload = null;
      this.selectedCandidateId = null;
      this.latestReport.setText(payload.selected?.statusText || '功法已写入构筑条');
      this.latestMeta.setText('当前节奏：确认选择成功，继续推进下一波');
      this.actionButton.setText('推进一波');
      this.applyMode('active-ready', '功法选择成功');
      await this.requestBattleSimulationStep();
    } catch (error) {
      this.choiceBusy = false;
      this.renderSkillChoiceOverlay({
        ...this.choicePayload,
        error,
        display: {
          ...(this.choicePayload.display || {}),
          title: '选择提交失败',
          subtitle: error.message || '确认选择失败，请重试',
        },
      });
    }
  }

  toggleAutoPlay() {
    this.autoPlayEnabled = !this.autoPlayEnabled;
    if (this.autoPlayEnabled && this.playbackIndex < this.logEntries.length) {
      this.startAutoPlayback();
      return;
    }
    this.clearTimers();
    this.applyMode('playback-ready', this.autoPlayEnabled ? '已切回自动播放' : '已切到手动推进');
  }

  async retrySettlement() {
    if (!this.pendingSettlementResult) {
      this.applyMode('settlement-error', '缺少战斗结果，无法结算');
      return;
    }

    this.clearTimers();
    this.showSettlementOverlay(`正在提交${formatBattleResult(this.pendingSettlementResult)}结算`);
    this.applyMode('loading', `正在提交${formatBattleResult(this.pendingSettlementResult)}结算`);

    try {
      const payload = await settleBattleSession(this.player.account, this.pendingSettlementResult);
      const settlement = normalizeBattleSettlement(payload, this.simulation);
      await refreshPlayerSession(this.player.account).catch(() => null);
      await refreshHomeOverview(this.player.account).catch(() => null);
      this.syncSceneState(settlement.profile?.currentChapterId || this.chapterId);
      setBattleSettlement(settlement);
      this.closeOverlay();
      this.scene.start('ResultScene');
    } catch (error) {
      this.closeOverlay();
      this.applyMode('settlement-error', `结算失败：${error.message}`);
      this.latestMeta.setText(`当前节奏：${error.message}`);
    }
  }
}
