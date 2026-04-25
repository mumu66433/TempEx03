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
import { ApiRequestError, fetchBattleSession, settleBattleSession, simulateBattleSession, startBattleSession } from '../data/api.js';
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

function buildBuildTexts(simulation, session) {
  const labels = [];
  if (simulation?.summary?.lines?.length) {
    labels.push(...simulation.summary.lines.slice(0, 2));
  }
  if (session?.waveType) {
    labels.push(`${session.waveType} 波`);
  }
  while (labels.length < 3) {
    labels.push('待获得功法');
  }
  return labels.slice(0, 3);
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

  updateStageSnapshots(hero = null, enemy = null) {
    const heroSnapshot = buildHeroSnapshot(this.player, this.chapter, hero || this.simulation?.hero || null);
    const enemySnapshot = buildEnemySnapshot(this.battleSession, enemy || this.simulation?.enemy || null);
    this.heroStateLabel.setText(heroSnapshot?.maxLife ? `我方生命 ${heroSnapshot.life}/${heroSnapshot.maxLife}` : '我方生命');
    this.enemyStateLabel.setText(enemySnapshot?.maxLife ? `敌方生命 ${enemySnapshot.life}/${enemySnapshot.maxLife}` : '敌方生命');
    this.heroBar.setValue(getActorRatio(heroSnapshot));
    this.enemyBar.setValue(getActorRatio(enemySnapshot));
  }

  updateBuildBar() {
    const labels = buildBuildTexts(this.simulation, this.battleSession);
    this.buildTexts.forEach((textNode, index) => {
      textNode.setText(labels[index]);
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
    const canAction = ['ready', 'active-ready', 'failed', 'simulate-missing', 'interface-missing', 'settled', 'settlement-error'].includes(mode);
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
    this.latestReport.setText(session.status === 'settled' ? '本局已结算，可重新挑战' : '会话已创建，准备生成最新战报');
    this.latestMeta.setText(session.status === 'settled'
      ? '当前节奏：可重新开始本章战斗'
      : '当前节奏：点击按钮请求服务端模拟战斗');
    this.bannerText.setText(session.status === 'settled' ? '本局结算完成' : '等待波次推进');
    this.summaryLine.setText(session.status === 'settled'
      ? `累计记录 ${this.playedLogs.length} · 结果 ${formatBattleResult(session.result)} · 主功法待接入`
      : '累计记录 0 · 结果待定 · 主功法待接入');
    this.actionButton.setText(session.status === 'settled' ? '再次挑战' : '开始战斗');
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

    if (!this.battleSession || this.battleSession.status === 'settled') {
      await this.startAndSimulateBattle();
      return;
    }

    if (this.battleSession.status === 'active' && !this.simulation) {
      await this.requestBattleSimulation();
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
      await this.requestBattleSimulation();
    } catch (error) {
      this.latestReport.setText('开始战斗失败');
      this.latestMeta.setText(error.message);
      this.applyMode('failed', `开始战斗失败：${error.message}`);
    }
  }

  async requestBattleSimulation() {
    if (!this.battleSession) {
      this.applyMode('failed', '当前没有可模拟的会话');
      return;
    }

    this.resetPlayback();
    this.latestReport.setText('正在请求战斗模拟');
    this.latestMeta.setText('当前节奏：等待服务端返回文字战报');
    this.applyMode('loading', '正在请求战斗模拟');

    try {
      const payload = await simulateBattleSession(this.player.account, this.battleSession.id, this.chapterId);
      this.simulation = normalizeBattleSimulation(payload, this.battleSession);
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
      this.latestMeta.setText(`当前节奏：已收到 ${this.logEntries.length} 条服务端战报`);
      this.bannerText.setText('等待波次推进');
      this.updateSummaryLine();
      this.applyMode('playback-ready', this.autoPlayEnabled ? '准备自动播放战报' : '等待手动推进');

      if (this.autoPlayEnabled) {
        this.startAutoPlayback();
      }
    } catch (error) {
      this.latestReport.setText(isInterfaceMissing(error) ? '模拟接口未就绪' : '战斗模拟失败');
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
