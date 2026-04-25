import BaseScene from './BaseScene.js';
import { createButton, createPill, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
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

function isInterfaceMissing(error) {
  return error instanceof ApiRequestError && error.status === 404;
}

function resolveChapter(sessionState, chapterId) {
  const normalizedChapterId = Number(chapterId || 1);
  return sessionState.chapterOverview?.chapters?.find((item) => Number(item.id) === normalizedChapterId)
    || sessionState.chapters?.find((item) => Number(item.id) === normalizedChapterId)
    || null;
}

function formatSessionStatus(session) {
  if (!session) {
    return '当前没有进行中的战斗会话';
  }
  if (session.status === 'settled') {
    return session.result === 'victory' ? '本局已通关结算' : '本局已失败结算';
  }
  return '战斗会话进行中';
}

function formatActorCard(actor, emptyText) {
  if (!actor) {
    return emptyText;
  }

  const lines = [
    `名称：${actor.name || '-'}`,
    `生命：${actor.life ?? '-'}${actor.maxLife ? ` / ${actor.maxLife}` : ''}`,
    `攻击：${actor.atk ?? '-'}`,
  ];
  return lines.join('\n');
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

function buildSessionMeta(session, chapter) {
  if (!session) {
    return `章节 ${chapter?.id || '-'} · ${chapter?.name || '未命名章节'} · 等待创建会话`;
  }

  return [
    `章节 ${session.chapterId} · ${session.chapter?.name || chapter?.name || '未命名章节'}`,
    `层数 ${session.layerIndex ?? '-'} / 波次 ${session.waveIndex ?? '-'}`,
    `状态 ${session.status || '-'}`,
  ].join(' · ');
}

function buildSessionDetail(session, chapter) {
  if (!session) {
    return [
      `章节：${chapter?.id || '-'} · ${chapter?.name || '未命名章节'}`,
      `关卡组：${chapter?.missionId ?? '-'}`,
      `关卡数：${chapter?.missionCount ?? '-'}`,
      `预计波次：${chapter?.totalWaveEstimate ?? '-'}`,
    ].join('\n');
  }

  return [
    `Mission：${session.missionId ?? '-'}`,
    `波次类型：${session.waveType || '-'}`,
    `敌人：${session.enemyName || '-'} × ${session.enemyCount ?? '-'}`,
    `敌方生命 / 攻击：${session.enemyLife ?? '-'} / ${session.enemyAtk ?? '-'}`,
  ].join('\n');
}

function buildLogLine(entry, index) {
  const turn = entry.turn ?? index + 1;
  return `第 ${turn} 回合\n${entry.text}`;
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
  }

  create() {
    this.addBackground('battle');
    this.player = getCurrentPlayer();
    this.syncSceneState();

    this.addTopBar('章节战斗', '真实请求战斗会话与模拟日志，按回合播放文字战报');
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
    drawRoundedPanel(this, 375, 310, 646, 184, 0x0b1220, 0.88, 0xffffff, 0.06, 28);
    this.interfacePill = createPill(this, 160, 258, 154, 38, '战斗页加载中', 0x1d4ed8, '#dbeafe');
    this.backendPill = createPill(
      this,
      338,
      258,
      140,
      38,
      this.sessionState.backend.ready ? '后端在线' : '后端异常',
      this.sessionState.backend.ready ? 0x14532d : 0x7f1d1d,
      this.sessionState.backend.ready ? '#bbf7d0' : '#fecaca',
    );
    this.titleText = makeThemeText(this, 375, 322, `${this.chapter?.name || '当前章节'} 战斗准备`, {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.subText = makeLabel(this, 375, 378, '开始战斗后会先创建会话，再请求后端模拟并播放文字日志。', {
      fontSize: '18px',
      color: '#cbd5e1',
      wordWrap: { width: 560 },
      align: 'center',
    });

    drawRoundedPanel(this, 375, 872, 646, 882, 0x0f172a, 0.88, 0xffffff, 0.06, 32);
    this.sessionTitle = makeThemeText(this, 375, 520, '正在读取战斗会话', {
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.sessionMeta = makeLabel(this, 375, 578, '', {
      fontSize: '17px',
      color: '#94a3b8',
      wordWrap: { width: 560 },
      align: 'center',
      lineSpacing: 10,
    });
    this.sessionDetail = makeLabel(this, 375, 652, '', {
      fontSize: '18px',
      color: '#e2e8f0',
      wordWrap: { width: 560 },
      align: 'center',
      lineSpacing: 14,
    });

    drawRoundedPanel(this, 212, 794, 230, 172, 0x111827, 0.9, 0xffffff, 0.06, 24);
    drawRoundedPanel(this, 538, 794, 230, 172, 0x1f2937, 0.9, 0xffffff, 0.06, 24);
    makeLabel(this, 212, 732, '我方快照', {
      fontSize: '16px',
      color: '#7dd3fc',
    });
    makeLabel(this, 538, 732, '敌方快照', {
      fontSize: '16px',
      color: '#fca5a5',
    });
    this.heroStatus = this.add.text(112, 766, '', {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '17px',
      color: '#f8fafc',
      lineSpacing: 10,
      wordWrap: { width: 200 },
    });
    this.enemyStatus = this.add.text(438, 766, '', {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '17px',
      color: '#f8fafc',
      lineSpacing: 10,
      wordWrap: { width: 200 },
    });

    makeThemeText(this, 375, 906, '战斗日志', {
      fontSize: '24px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.logCounter = makeLabel(this, 375, 944, '0 / 0', {
      fontSize: '15px',
      color: '#94a3b8',
    });
    drawRoundedPanel(this, 375, 1116, 566, 296, 0x0b1220, 0.96, 0xffffff, 0.06, 24);
    this.logContent = this.add.text(110, 986, '', {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '17px',
      color: '#e2e8f0',
      lineSpacing: 12,
      wordWrap: { width: 530 },
    });

    this.summaryText = makeLabel(this, 375, 1288, '', {
      fontSize: '17px',
      color: '#7dd3fc',
      wordWrap: { width: 560 },
      align: 'center',
      lineSpacing: 12,
    });
    this.feedback = makeLabel(this, 375, 1368, '', {
      fontSize: '14px',
      color: '#94a3b8',
      wordWrap: { width: 540 },
      align: 'center',
    });

    this.primaryButton = createButton(this, 192, 1452, 188, 72, '开始战斗', 0x2563eb, 0x7dd3fc, () => {
      this.handlePrimaryAction();
    });
    this.stepButton = createButton(this, 375, 1452, 150, 72, '下一回合', 0x1d4ed8, 0x7dd3fc, () => {
      this.playNextTurn();
    });
    this.autoButton = createButton(this, 558, 1452, 150, 72, '自动开', 0x0f766e, 0x5eead4, () => {
      this.toggleAutoPlay();
    });
    this.replayButton = createButton(this, 192, 1538, 188, 66, '重播战报', 0x111827, 0x94a3b8, () => {
      this.replaySimulation();
    });
    this.settleButton = createButton(this, 375, 1538, 188, 66, '重新结算', 0x7c2d12, 0xfdba74, () => {
      this.retrySettlement();
    });
    this.backButton = createButton(this, 558, 1538, 150, 66, '返回章节', 0x111827, 0x94a3b8, () => {
      this.scene.start('HomeScene');
    });

    this.updateSnapshots();
    this.renderLogState('正在读取后端战斗会话...');
    this.applyMode('loading', '');
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

    this.updateSnapshots();
    this.renderLogState(!keepSimulation ? '战斗日志会在模拟接口返回后按回合显示。' : '战报已重置，准备重新播放。');
  }

  updateSnapshots(hero = null, enemy = null) {
    const heroSnapshot = buildHeroSnapshot(this.player, this.chapter, hero || this.simulation?.hero || null);
    const enemySnapshot = buildEnemySnapshot(this.battleSession, enemy || this.simulation?.enemy || null);

    this.heroStatus.setText(formatActorCard(heroSnapshot, '等待后端返回我方快照'));
    this.enemyStatus.setText(formatActorCard(enemySnapshot, '等待后端返回敌方快照'));
  }

  updateHeader(title, subtitle) {
    this.titleText.setText(title);
    this.subText.setText(subtitle);
  }

  updateBattleInfo(title, meta, detail, summary, feedback) {
    this.sessionTitle.setText(title);
    this.sessionMeta.setText(meta);
    this.sessionDetail.setText(detail);
    this.summaryText.setText(summary);
    this.feedback.setText(feedback);
  }

  renderLogState(text) {
    this.logContent.setText(text);
    this.logCounter.setText(`${Math.min(this.playbackIndex, this.logEntries.length)} / ${this.logEntries.length}`);
  }

  applyMode(mode, feedback) {
    this.currentMode = mode;
    const pillTextMap = {
      loading: '读取中',
      ready: '待开始',
      'active-ready': '可播放',
      starting: '创建中',
      simulating: '模拟中',
      'simulate-missing': '缺接口',
      'playback-ready': '待播放',
      playback: '播放中',
      'playback-finished': '待结算',
      settling: '结算中',
      'settlement-error': '结算失败',
      settled: '已结算',
      failed: '失败',
      'interface-missing': '未就绪',
    };
    this.interfacePill.list[1].setText(pillTextMap[mode] || '战斗中');
    this.feedback.setText(feedback || '');
    this.updateActionButtons();
  }

  updateActionButtons() {
    const canCreateNew = !this.battleSession || this.battleSession.status === 'settled';
    const hasActiveSession = this.battleSession?.status === 'active';
    const hasSimulation = Boolean(this.simulation);
    const isSimulating = this.currentMode === 'simulating';
    const isPlaying = this.currentMode === 'playback';
    const isSettling = this.currentMode === 'settling';
    const canManualStep = hasSimulation && !isPlaying && !isSettling && this.playbackIndex < this.logEntries.length;
    const canReplay = hasSimulation && !isSettling && this.playbackIndex > 0;
    const canRetrySettlement = this.currentMode === 'settlement-error' && Boolean(this.pendingSettlementResult);

    const primaryLabel = canCreateNew
      ? '开始战斗'
      : hasActiveSession && !hasSimulation
        ? '开始播放'
        : isSimulating
          ? '模拟中'
          : isSettling
            ? '结算中'
            : '战报已生成';

    const primaryEnabled = (canCreateNew || (hasActiveSession && !hasSimulation)) && !isSimulating && !isSettling;
    this.primaryButton.label.setText(primaryLabel);
    this.setButtonState(this.primaryButton, primaryEnabled, primaryEnabled ? 0x2563eb : 0x334155);

    this.setButtonState(this.stepButton, canManualStep, canManualStep ? 0x1d4ed8 : 0x334155);

    const autoEnabled = (hasActiveSession || hasSimulation) && !isSettling;
    this.autoButton.label.setText(this.autoPlayEnabled ? '自动开' : '自动关');
    this.setButtonState(this.autoButton, autoEnabled, autoEnabled ? (this.autoPlayEnabled ? 0x0f766e : 0x334155) : 0x334155);

    this.setButtonState(this.replayButton, canReplay, canReplay ? 0x111827 : 0x334155);
    this.setButtonState(this.settleButton, canRetrySettlement, canRetrySettlement ? 0x7c2d12 : 0x334155);
    this.setButtonState(this.backButton, true, 0x111827);
  }

  setButtonState(button, enabled, fill) {
    button.bg.setFillStyle(fill, 1);
    if (button.hitArea?.input) {
      button.hitArea.input.enabled = enabled;
    }
  }

  async loadBattleSession() {
    this.resetPlayback();
    this.updateHeader(`${this.chapter?.name || '当前章节'} 战斗准备`, '正在读取已有战斗会话；如未开战可直接开始。');
    this.updateBattleInfo(
      '战斗会话读取中',
      '正在读取当前账号的战斗会话状态。',
      '',
      '',
      '',
    );
    this.applyMode('loading', '');

    try {
      const payload = await fetchBattleSession(this.player.account);
      this.battleSession = normalizeBattleSession(payload.session || null);
      this.syncSceneState(this.battleSession?.chapterId || this.chapterId);
      this.renderBattleSession();
    } catch (error) {
      this.battleSession = null;
      if (isInterfaceMissing(error)) {
        this.updateHeader('战斗接口未就绪', '已接入真实流程，但后端会话接口还没落地。');
        this.updateBattleInfo(
          '无法读取战斗会话',
          '`/api/battle/session` 还不可用，前端不会伪造会话或结果。',
          '需要后端先提供真实会话接口，战斗页才能继续联调。',
          '当前只能保留错误态与重试入口。',
          error.message,
        );
        this.renderLogState('等待后端提供战斗会话接口。');
        this.applyMode('interface-missing', error.message);
        return;
      }

      this.updateHeader('读取战斗会话失败', '后端在线时请检查账号、章节或会话数据。');
      this.updateBattleInfo(
        '读取战斗会话失败',
        error.message,
        '可以点击下方按钮重新读取会话；前端不会生成假战斗数据。',
        '如果是联调阶段，请优先确认 battle session 接口是否正常。',
        error.message,
      );
      this.renderLogState('读取会话失败，暂无可播放的战报。');
      this.applyMode('failed', error.message);
    }
  }

  renderBattleSession() {
    const session = this.battleSession;

    this.updateSnapshots();
    if (!session) {
      this.updateHeader(`${this.chapter?.name || '当前章节'} 战斗准备`, '未发现进行中的会话，可以直接开始本章战斗。');
      this.updateBattleInfo(
        `${this.chapter?.name || '当前章节'} 尚未开战`,
        buildSessionMeta(null, this.chapter),
        buildSessionDetail(null, this.chapter),
        '点击“开始战斗”后，前端会先请求创建会话，再请求战斗模拟并播放文字日志。',
        '等待开始战斗。',
      );
      this.renderLogState('战斗尚未开始，等待后端返回模拟日志。');
      this.applyMode('ready', '等待开始战斗。');
      return;
    }

    this.updateHeader(
      session.chapter?.name || this.chapter?.name || '章节战斗',
      session.status === 'active'
        ? '会话已创建，可以请求后端模拟并按回合播放。'
        : '当前会话已结算，可重新开始本章战斗。',
    );

    const summaryLines = session.status === 'settled'
      ? buildBattleSummaryLines(null, { result: session.result })
      : ['点击“开始播放”后会请求后端生成完整回合日志。'];

    this.updateBattleInfo(
      formatSessionStatus(session),
      buildSessionMeta(session, this.chapter),
      buildSessionDetail(session, this.chapter),
      summaryLines.join('\n'),
      session.status === 'active' ? '会话已就绪，等待拉取战斗日志。' : '会话已结算，可重新开始。',
    );
    this.renderLogState(
      session.status === 'active'
        ? '当前还没有回合日志。点击“开始播放”请求后端模拟战斗。'
        : '本局已结算，当前战报未持久化。重新开始后可查看新的文字日志。',
    );
    this.applyMode(session.status === 'active' ? 'active-ready' : 'settled', session.status === 'active' ? '会话已就绪。' : '会话已结算。');
  }

  async handlePrimaryAction() {
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
    this.updateHeader(`${this.chapter?.name || '当前章节'} 战斗准备`, '正在请求后端创建战斗会话。');
    this.applyMode('starting', '正在创建战斗会话...');

    try {
      const payload = await startBattleSession(this.player.account, this.chapterId);
      this.battleSession = normalizeBattleSession(payload.session || null);
      this.syncSceneState(this.battleSession?.chapterId || this.chapterId);
      this.updateBattleInfo(
        '战斗会话已创建',
        buildSessionMeta(this.battleSession, this.chapter),
        buildSessionDetail(this.battleSession, this.chapter),
        '会话创建成功，正在请求后端模拟战斗。',
        '会话已创建。',
      );
      await this.requestBattleSimulation();
    } catch (error) {
      this.updateBattleInfo(
        '开始战斗失败',
        error.message,
        '战斗会话创建失败，当前不会进入假战斗流程。',
        '请确认章节已解锁，且后端 start 接口已返回真实会话。',
        error.message,
      );
      this.renderLogState('开始战斗失败，暂无可播放日志。');
      this.applyMode('failed', `开始战斗失败：${error.message}`);
    }
  }

  async requestBattleSimulation() {
    if (!this.battleSession) {
      this.applyMode('failed', '当前没有可模拟的战斗会话。');
      return;
    }

    this.resetPlayback();
    this.updateHeader(
      this.battleSession.chapter?.name || this.chapter?.name || '章节战斗',
      '正在请求后端模拟战斗，返回后会按回合播放文字日志。',
    );
    this.updateBattleInfo(
      '正在请求战斗模拟',
      buildSessionMeta(this.battleSession, this.chapter),
      buildSessionDetail(this.battleSession, this.chapter),
      '后端需要返回 session、hero/enemy 快照、日志数组、最终结果和摘要。',
      '正在请求后端模拟战斗...',
    );
    this.renderLogState('模拟请求中，请稍候...');
    this.applyMode('simulating', '正在请求后端模拟战斗...');

    try {
      const payload = await simulateBattleSession(this.player.account, this.battleSession.id, this.chapterId);
      this.simulation = normalizeBattleSimulation(payload, this.battleSession);
      this.battleSession = this.simulation.session || this.battleSession;
      this.syncSceneState(this.battleSession?.chapterId || this.chapterId);
      this.logEntries = this.simulation.logs.length
        ? this.simulation.logs.slice()
        : [{
            id: 'sim-empty',
            turn: 1,
            text: '后端未返回回合日志，当前只能直接展示模拟完成状态。',
            hero: this.simulation.hero,
            enemy: this.simulation.enemy,
          }];
      this.pendingSettlementResult = normalizeBattleResult(this.simulation.result);
      this.playedLogs = [];
      this.playbackIndex = 0;

      this.updateBattleInfo(
        `${this.chapter?.name || '当前章节'} 战斗中`,
        buildSessionMeta(this.battleSession, this.chapter),
        buildSessionDetail(this.battleSession, this.chapter),
        `已收到 ${this.logEntries.length} 条回合日志${this.pendingSettlementResult ? `，预计结果：${formatBattleResult(this.pendingSettlementResult)}` : ''}。`,
        this.autoPlayEnabled ? '战报已生成，正在自动播放。' : '战报已生成，等待手动逐条推进。',
      );
      this.updateSnapshots(this.simulation.hero, this.simulation.enemy);
      this.renderLogState(this.autoPlayEnabled ? '准备自动播放战报...' : '已暂停自动播放，点击“下一回合”开始。');
      this.applyMode('playback-ready', this.autoPlayEnabled ? '准备自动播放战报。' : '已暂停自动播放。');

      if (this.autoPlayEnabled) {
        this.startAutoPlayback();
      }
    } catch (error) {
      const hint = isInterfaceMissing(error)
        ? '模拟接口尚未就绪，前端已保留真实接入点和错误态。'
        : '模拟请求失败，请检查后端返回结构或稍后重试。';

      this.updateBattleInfo(
        '请求战斗模拟失败',
        buildSessionMeta(this.battleSession, this.chapter),
        buildSessionDetail(this.battleSession, this.chapter),
        hint,
        error.message,
      );
      this.renderLogState(isInterfaceMissing(error)
        ? '等待后端提供 battle simulate 接口。'
        : '模拟请求失败，暂无战斗日志。');
      this.applyMode(isInterfaceMissing(error) ? 'simulate-missing' : 'failed', `请求战斗模拟失败：${error.message}`);
    }
  }

  startAutoPlayback() {
    this.clearTimers();
    this.applyMode('playback', '正在自动播放战报...');
    this.playNextTurn();

    if (this.playbackIndex >= this.logEntries.length) {
      return;
    }

    this.playbackTimer = this.time.addEvent({
      delay: AUTO_PLAY_DELAY,
      loop: true,
      callback: () => {
        this.playNextTurn();
        if (this.currentMode !== 'playback') {
          if (this.playbackTimer) {
            this.playbackTimer.remove(false);
            this.playbackTimer = null;
          }
        }
      },
    });
  }

  toggleAutoPlay() {
    this.autoPlayEnabled = !this.autoPlayEnabled;
    this.updateActionButtons();

    if (this.currentMode === 'playback' && !this.autoPlayEnabled) {
      this.clearTimers();
      this.applyMode('playback-ready', '已关闭自动播放，可手动逐条推进。');
      return;
    }

    if ((this.currentMode === 'playback-ready' || this.currentMode === 'playback') && this.autoPlayEnabled && this.playbackIndex < this.logEntries.length) {
      this.startAutoPlayback();
    }
  }

  playNextTurn() {
    if (!this.logEntries.length || this.playbackIndex >= this.logEntries.length) {
      this.finishPlayback();
      return;
    }

    const entry = this.logEntries[this.playbackIndex];
    this.playedLogs.push(buildLogLine(entry, this.playbackIndex));
    this.playbackIndex += 1;

    if (entry.hero || entry.enemy) {
      this.updateSnapshots(entry.hero || null, entry.enemy || null);
    }
    if (entry.result && !this.pendingSettlementResult) {
      this.pendingSettlementResult = normalizeBattleResult(entry.result);
    }

    this.renderLogState(this.playedLogs.slice(-4).join('\n\n'));

    if (this.playbackIndex >= this.logEntries.length) {
      this.finishPlayback();
      return;
    }

    if (!this.autoPlayEnabled || this.currentMode !== 'playback') {
      this.applyMode('playback-ready', '已暂停自动播放，可继续逐条推进。');
    }
  }

  finishPlayback() {
    if (this.currentMode === 'settling') {
      return;
    }

    this.clearTimers();
    const summaryLines = buildBattleSummaryLines(this.simulation?.summary, { result: this.pendingSettlementResult });
    this.summaryText.setText(summaryLines.join('\n'));
    this.applyMode('playback-finished', '战报播放完成，准备提交结算。');

    if (!this.pendingSettlementResult) {
      this.applyMode('settlement-error', '后端未返回最终结果，无法继续结算。');
      this.feedback.setText('后端未返回最终结果，无法继续结算。');
      return;
    }

    this.settleTimer = this.time.delayedCall(SETTLE_DELAY, () => {
      this.retrySettlement();
    });
  }

  replaySimulation() {
    if (!this.simulation) {
      return;
    }

    this.resetPlayback({ keepSimulation: true });
    this.summaryText.setText('');
    this.renderLogState(this.autoPlayEnabled ? '准备自动重播战报...' : '已重置战报，点击“下一回合”开始。');
    this.applyMode('playback-ready', this.autoPlayEnabled ? '准备自动重播战报。' : '战报已重置。');

    if (this.autoPlayEnabled) {
      this.startAutoPlayback();
    }
  }

  async retrySettlement() {
    if (!this.pendingSettlementResult) {
      this.applyMode('settlement-error', '缺少战斗结果，无法提交结算。');
      return;
    }

    this.clearTimers();
    this.applyMode('settling', `正在提交${formatBattleResult(this.pendingSettlementResult)}结算...`);

    try {
      const payload = await settleBattleSession(this.player.account, this.pendingSettlementResult);
      const settlement = normalizeBattleSettlement(payload, this.simulation);
      await refreshPlayerSession(this.player.account).catch(() => null);
      await refreshHomeOverview(this.player.account).catch(() => null);
      this.syncSceneState(settlement.profile?.currentChapterId || this.chapterId);
      setBattleSettlement(settlement);
      this.scene.start('ResultScene');
    } catch (error) {
      const summaryLines = buildBattleSummaryLines(this.simulation?.summary, { result: this.pendingSettlementResult });
      this.summaryText.setText(summaryLines.join('\n'));
      this.applyMode('settlement-error', `结算失败：${error.message}`);
      this.feedback.setText(`结算失败：${error.message}`);
    }
  }
}
