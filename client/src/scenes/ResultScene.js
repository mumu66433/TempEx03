import BaseScene from './BaseScene.js';
import { createButton, createPill, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { buildBattleSummaryLines, formatBattleResult } from '../data/battle.js';
import { getSession, setBattleSettlement } from '../data/session.js';

function buildSettlementLines(settlement, battleSession, profile, simulation) {
  return [
    `结算结果：${formatBattleResult(settlement?.result || battleSession?.result)}`,
    `会话状态：${battleSession?.status || '-'}`,
    `当前章节：${profile?.currentChapterId ?? '-'}`,
    `最高解锁：${profile?.highestUnlockedChapterId ?? '-'}`,
    `日志条数：${simulation?.logs?.length ?? 0}`,
  ].join('\n');
}

function buildProgressHint(settlement) {
  const currentChapter = settlement?.settlement?.currentChapter;
  const unlockedChapter = settlement?.settlement?.justUnlockedChapter;
  const nextAction = settlement?.settlement?.nextAction;

  const parts = [];
  if (currentChapter?.name) {
    parts.push(`当前进度：第 ${currentChapter.id} 章 · ${currentChapter.name}`);
  }
  if (unlockedChapter?.name) {
    parts.push(`新解锁：第 ${unlockedChapter.id} 章 · ${unlockedChapter.name}`);
  }
  if (nextAction) {
    parts.push(nextAction);
  }
  return parts.join('\n');
}

export default class ResultScene extends BaseScene {
  constructor() {
    super('ResultScene');
  }

  create() {
    this.addBackground('battle');

    const settlement = getSession().battleSettlement;
    if (!settlement) {
      this.renderMissingState();
      return;
    }

    const battleSession = settlement.session || null;
    const profile = settlement.profile || null;
    const simulation = settlement.simulation || null;
    const victory = (settlement.result || battleSession?.result) === 'victory';
    const summaryLines = buildBattleSummaryLines(settlement.summary || settlement.settlement?.summary || simulation?.summary, {
      result: settlement.result || battleSession?.result,
    });

    this.addTopBar(victory ? '通关结算' : '失败结算', '结果页承接模拟摘要、回合日志统计与章节进度回流');
    drawRoundedPanel(this, 375, 488, 646, 820, victory ? 0x082f49 : 0x2f0b0b, 0.9, 0xffffff, 0.08, 36);
    createPill(this, 184, 228, 132, 40, victory ? '结算成功' : '结算完成', victory ? 0x14532d : 0x7f1d1d, victory ? '#bbf7d0' : '#fecaca');
    createPill(this, 350, 228, 176, 40, battleSession?.status === 'settled' ? '会话已落库' : '状态待确认', 0x111827, '#e2e8f0');

    makeThemeText(this, 375, 334, victory ? '挑战成功' : '挑战失败', {
      fontSize: '52px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 404, battleSession?.chapter?.name
      ? `章节：第 ${battleSession.chapterId} 章 · ${battleSession.chapter.name}`
      : '当前结算未附带章节名', {
      fontSize: '20px',
      color: '#cbd5e1',
    });
    makeLabel(this, 375, 540, buildSettlementLines(settlement, battleSession, profile, simulation), {
      fontSize: '22px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 18,
      wordWrap: { width: 460 },
    });

    drawRoundedPanel(this, 375, 808, 560, 208, 0x0b1220, 0.78, 0xffffff, 0.06, 28);
    makeThemeText(this, 375, 706, '模拟摘要', {
      fontSize: '26px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 810, summaryLines.length ? summaryLines.join('\n') : '本次结算未返回额外摘要，结果页已回退到基础结算信息。', {
      fontSize: '18px',
      color: '#7dd3fc',
      wordWrap: { width: 460 },
      align: 'center',
      lineSpacing: 14,
    });

    makeLabel(this, 375, 980, buildProgressHint(settlement) || (victory
      ? '本次胜利应已推动章节进度；如未变化，请继续和后端核对结算回流。'
      : '本次失败不会推进章节，可返回章节页重新挑战。'), {
      fontSize: '17px',
      color: '#94a3b8',
      wordWrap: { width: 500 },
      align: 'center',
      lineSpacing: 12,
    });

    createButton(this, 375, 1172, 360, 76, victory ? '返回章节页查看新章节' : '返回章节页', 0x2563eb, 0x7dd3fc, () => {
      setBattleSettlement(null);
      this.scene.start('HomeScene');
    });
    createButton(this, 375, 1268, 360, 68, victory ? '继续前往下一章' : '再次挑战当前章节', 0x0f172a, 0x94a3b8, () => {
      setBattleSettlement(null);
      this.scene.start('BattleScene');
    });
  }

  renderMissingState() {
    this.addTopBar('结算页', '当前没有可展示的结算结果');
    drawRoundedPanel(this, 375, 520, 646, 620, 0x0f172a, 0.9, 0xffffff, 0.08, 36);
    makeThemeText(this, 375, 360, '暂无结算数据', {
      fontSize: '44px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 496, '可能是直接进入了结果页，或上一轮结算数据已经被清空。', {
      fontSize: '20px',
      color: '#cbd5e1',
      wordWrap: { width: 460 },
      align: 'center',
      lineSpacing: 12,
    });
    makeLabel(this, 375, 612, '请返回章节页重新开始战斗，或重新进入战斗页拉取最新会话。', {
      fontSize: '18px',
      color: '#94a3b8',
      wordWrap: { width: 480 },
      align: 'center',
      lineSpacing: 10,
    });
    createButton(this, 375, 860, 360, 72, '返回章节页', 0x2563eb, 0x7dd3fc, () => {
      this.scene.start('HomeScene');
    });
    createButton(this, 375, 950, 360, 68, '返回战斗页', 0x0f172a, 0x94a3b8, () => {
      this.scene.start('BattleScene');
    });
  }
}
