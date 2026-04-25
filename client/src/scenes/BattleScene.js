import BaseScene from './BaseScene.js';
import { createButton, createPill, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { ApiRequestError, fetchBattleSession, settleBattleSession, startBattleSession } from '../data/api.js';
import { getCurrentPlayer, getSession, refreshHomeOverview, refreshPlayerSession, setBattleSettlement } from '../data/session.js';

function isInterfaceMissing(error) {
  return error instanceof ApiRequestError && error.status === 404;
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

export default class BattleScene extends BaseScene {
  constructor() {
    super('BattleScene');
    this.battleSession = null;
  }

  create() {
    this.addBackground('battle');
    this.player = getCurrentPlayer();
    this.sessionState = getSession();
    this.chapterId = Number(this.player.currentChapterId || this.player.chapterId || 1);
    this.chapter = this.sessionState.chapterOverview?.chapters?.find((item) => Number(item.id) === this.chapterId)
      || this.sessionState.chapters?.find((item) => Number(item.id) === this.chapterId)
      || null;

    this.addTopBar('战斗主流程', '优先读取战斗会话接口；没有接口时明确阻塞');
    this.renderFrame();
    this.loadBattleSession();
  }

  renderFrame() {
    drawRoundedPanel(this, 375, 310, 646, 176, 0x0b1220, 0.88, 0xffffff, 0.06, 28);
    this.interfacePill = createPill(this, 164, 260, 148, 38, '战斗会话加载中', 0x1d4ed8, '#dbeafe');
    this.backendPill = createPill(
      this,
      338,
      260,
      140,
      38,
      this.sessionState.backend.ready ? '后端在线' : '后端异常',
      this.sessionState.backend.ready ? 0x14532d : 0x7f1d1d,
      this.sessionState.backend.ready ? '#bbf7d0' : '#fecaca',
    );
    this.titleText = makeThemeText(this, 375, 324, `${this.chapter?.name || '当前章节'} 战斗准备`, {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.subText = makeLabel(this, 375, 374, '当前页会优先请求战斗会话接口，不再用前端拼装战斗假数据。', {
      fontSize: '18px',
      color: '#cbd5e1',
      wordWrap: { width: 560 },
      align: 'center',
    });

    drawRoundedPanel(this, 375, 842, 646, 770, 0x0f172a, 0.86, 0xffffff, 0.06, 32);
    this.sessionTitle = makeThemeText(this, 375, 574, '战斗会话读取中', {
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.sessionMeta = makeLabel(this, 375, 636, '', {
      fontSize: '18px',
      color: '#94a3b8',
      wordWrap: { width: 560 },
      align: 'center',
      lineSpacing: 12,
    });
    this.sessionDetail = makeLabel(this, 375, 846, '', {
      fontSize: '19px',
      color: '#e2e8f0',
      wordWrap: { width: 520 },
      align: 'center',
      lineSpacing: 16,
    });
    this.resultHint = makeLabel(this, 375, 1118, '', {
      fontSize: '17px',
      color: '#7dd3fc',
      wordWrap: { width: 520 },
      align: 'center',
      lineSpacing: 14,
    });
    this.feedback = makeLabel(this, 375, 1526, '', {
      fontSize: '14px',
      color: '#94a3b8',
      wordWrap: { width: 520 },
      align: 'center',
    });

    this.startButton = createButton(this, 208, 1386, 220, 74, '开始本章战斗', 0x2563eb, 0x7dd3fc, () => {
      this.handleStartBattle();
    });
    this.victoryButton = createButton(this, 375, 1386, 150, 74, '模拟通关', 0x14532d, 0x86efac, () => {
      this.handleSettle('victory');
    });
    this.defeatButton = createButton(this, 542, 1386, 150, 74, '模拟失败', 0x7f1d1d, 0xfca5a5, () => {
      this.handleSettle('defeat');
    });
    this.retryButton = createButton(this, 375, 1468, 220, 64, '重读战斗会话', 0x111827, 0x94a3b8, () => {
      this.loadBattleSession();
    });
    createButton(this, 375, 1548, 352, 60, '返回章节页', 0x0f172a, 0x94a3b8, () => {
      this.scene.start('HomeScene');
    });
  }

  async loadBattleSession() {
    this.setUiState({
      pill: '加载中',
      title: `${this.chapter?.name || '当前章节'} 战斗准备`,
      meta: '正在读取当前账号的战斗会话。如果接口未就绪，会明确提示。',
      detail: '',
      hint: '',
      feedback: '',
      mode: 'loading',
    });

    try {
      const payload = await fetchBattleSession(this.player.account);
      this.battleSession = payload.session || null;
      this.renderBattleSession();
    } catch (error) {
      this.battleSession = null;
      if (isInterfaceMissing(error)) {
        this.setUiState({
          pill: '未就绪',
          title: '战斗接口未就绪',
          meta: '`/api/battle/session` 还不可用，前端不会继续伪造战斗波次或结算。',
          detail: '阻塞点：战斗页需要真实的会话、结算和章节推进接口。\n缺失影响：战斗页无法进入可联调状态，只能保留接口待接壳子。',
          hint: '建议后端先提交 battle session 三个接口，再进入完整联调。',
          feedback: error.message,
          mode: 'interface-missing',
        });
      } else {
        this.setUiState({
          pill: '失败',
          title: '读取战斗会话失败',
          meta: error.message,
          detail: '当前无法读取战斗会话。\n如果后端在线，请检查账号、当前章节或战斗会话表数据。',
          hint: '可以点击“重读战斗会话”重试。',
          feedback: error.message,
          mode: 'failed',
        });
      }
    }
  }

  renderBattleSession() {
    const session = this.battleSession;
    if (!session) {
      this.setUiState({
        pill: '已接入',
        title: `${this.chapter?.name || '当前章节'} 尚未开战`,
        meta: '战斗接口已接通，但当前账号没有进行中的战斗会话。',
        detail: [
          `章节：${this.chapter?.id || this.chapterId} · ${this.chapter?.name || '未命名章节'}`,
          `关卡组：${this.chapter?.missionId ?? '-'}`,
          `关卡数：${this.chapter?.missionCount ?? '-'}`,
          `预计波次：${this.chapter?.totalWaveEstimate ?? '-'}`,
        ].join('\n'),
        hint: '点击“开始本章战斗”后，会由后端真实创建最小战斗会话并写库。',
        feedback: '等待开始战斗。',
        mode: 'ready',
      });
      return;
    }

    this.setUiState({
      pill: '已接入',
      title: formatSessionStatus(session),
      meta: `章节 ${session.chapterId} · ${session.chapter?.name || '未命名章节'} · 状态 ${session.status}`,
      detail: [
        `层数 / 波次：第 ${session.layerIndex} 层 · 第 ${session.waveIndex} 波`,
        `波次类型：${session.waveType || '-'}`,
        `敌人：${session.enemyName || '-'} × ${session.enemyCount ?? '-'}`,
        `敌方生命 / 攻击：${session.enemyLife ?? '-'} / ${session.enemyAtk ?? '-'}`,
        `Mission：${session.missionId ?? '-'}`,
      ].join('\n'),
      hint: session.status === 'active'
        ? '当前可以直接做“模拟通关 / 模拟失败”联调，验证章节推进和回流。'
        : `本局结果：${session.result || '-'}。如需再次验证，可重新开始本章战斗。`,
      feedback: session.status === 'active' ? '战斗会话已就绪。' : '战斗会话已结算。',
      mode: session.status === 'active' ? 'active' : 'settled',
    });
  }

  setUiState({ pill, title, meta, detail, hint, feedback, mode }) {
    this.interfacePill.list[1].setText(pill);
    this.sessionTitle.setText(title);
    this.sessionMeta.setText(meta);
    this.sessionDetail.setText(detail);
    this.resultHint.setText(hint);
    this.feedback.setText(feedback);

    const activeSession = mode === 'active';
    const canStart = mode === 'ready' || mode === 'settled';
    this.startButton.bg.setFillStyle(canStart ? 0x2563eb : 0x334155, 1);
    this.startButton.hitArea.input.enabled = canStart;
    this.victoryButton.bg.setFillStyle(activeSession ? 0x14532d : 0x334155, 1);
    this.defeatButton.bg.setFillStyle(activeSession ? 0x7f1d1d : 0x334155, 1);
    this.victoryButton.hitArea.input.enabled = activeSession;
    this.defeatButton.hitArea.input.enabled = activeSession;
  }

  async handleStartBattle() {
    this.feedback.setText('正在请求后端创建战斗会话...');
    try {
      await startBattleSession(this.player.account, this.chapterId);
      await refreshPlayerSession(this.player.account);
      await refreshHomeOverview(this.player.account).catch(() => null);
      await this.loadBattleSession();
      this.feedback.setText('战斗会话已创建。');
    } catch (error) {
      this.feedback.setText(`开始战斗失败：${error.message}`);
    }
  }

  async handleSettle(result) {
    this.feedback.setText(`正在提交 ${result === 'victory' ? '通关' : '失败'} 结果...`);
    try {
      const settlement = await settleBattleSession(this.player.account, result);
      await refreshPlayerSession(this.player.account);
      await refreshHomeOverview(this.player.account).catch(() => null);
      this.player = getCurrentPlayer();
      this.chapterId = Number(this.player.currentChapterId || this.player.chapterId || 1);
      this.chapter = getSession().chapterOverview?.chapters?.find((item) => Number(item.id) === this.chapterId)
        || getSession().chapters?.find((item) => Number(item.id) === this.chapterId)
        || null;
      setBattleSettlement(settlement);
      this.scene.start('ResultScene');
    } catch (error) {
      this.feedback.setText(`提交结果失败：${error.message}`);
    }
  }
}
