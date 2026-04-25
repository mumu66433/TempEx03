import BaseScene from './BaseScene.js';
import {
  V0_COLORS,
  createV0Button,
  drawV0Panel,
  makeV0Text,
} from '../utils/v0ui.js';
import { getSession, setBattleSettlement } from '../data/session.js';

function buildRecordLines(settlement) {
  const logs = Array.isArray(settlement?.simulation?.logs) ? settlement.simulation.logs : [];
  const directLines = logs
    .map((entry) => entry?.text)
    .filter(Boolean);

  if (directLines.length) {
    return directLines.slice(-4);
  }

  const summaryText = settlement?.settlement?.summaryText || settlement?.summary?.text;
  if (summaryText) {
    return [summaryText];
  }

  return ['当前没有可展示的本局战报摘要。'];
}

function buildOutcomeLines(settlement, victory) {
  const rewards = settlement?.rewards || settlement?.simulation?.rewards || null;
  const unlockedChapter = settlement?.settlement?.justUnlockedChapter;
  const currentChapter = settlement?.settlement?.currentChapter;
  const summaryLines = [];

  if (typeof rewards?.coin === 'number') {
    summaryLines.push(`铜钱 +${rewards.coin}`);
  }
  if (typeof rewards?.exp === 'number') {
    summaryLines.push(`功法经验 +${rewards.exp}`);
  }

  if (victory) {
    if (unlockedChapter?.name) {
      summaryLines.push(`章节进度：第${unlockedChapter.id}章已开放`);
    } else if (currentChapter?.name) {
      summaryLines.push(`章节进度：当前可挑战第${currentChapter.id}章`);
    }
  } else {
    summaryLines.push('建议提升：生命向功法优先');
  }

  if (!summaryLines.length) {
    summaryLines.push(victory ? '章节进度已同步到最新解锁状态' : '可返回章节页继续准备后再试一次');
  }

  return summaryLines.slice(0, 4);
}

export default class ResultScene extends BaseScene {
  create() {
    this.addBackground('battle');

    const settlement = getSession().battleSettlement;
    if (!settlement) {
      this.renderMissingState();
      return;
    }

    const battleSession = settlement.session || null;
    const victory = (settlement.result || battleSession?.result) === 'victory';
    const currentChapter = settlement?.settlement?.currentChapter || battleSession?.chapter || null;
    const recordLines = buildRecordLines(settlement);
    const outcomeLines = buildOutcomeLines(settlement, victory);
    const introText = settlement?.settlement?.summaryText
      || settlement?.summary?.text
      || (victory ? 'V0 文字战斗验证通过：流程已从战斗页稳定回流到章节推进。' : 'V0 文字战斗失败回流已打通，可继续重试与返回章节。');

    drawV0Panel(this, 375, 784, 618, 1160, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 40,
    });

    this.add.circle(375, 372, 88, victory ? V0_COLORS.green : V0_COLORS.red, 0.14)
      .setStrokeStyle(3, victory ? V0_COLORS.green : V0_COLORS.red, 1);
    makeV0Text(this, 375, 394, victory ? '胜利' : '失败', {
      fontSize: '56px',
      fontStyle: '700',
      color: victory ? '#5cbf75' : '#d96b6b',
    });
    makeV0Text(this, 375, 494, victory ? '章节通关' : '挑战失败', {
      fontSize: '42px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    makeV0Text(this, 375, 540, victory
      ? `第${battleSession?.chapterId || currentChapter?.id || 1}章 ${battleSession?.chapter?.name || currentChapter?.name || '当前章节'} 已完成挑战`
      : '止步于当前波次，可返回继续养成', {
      fontSize: '24px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 520 },
    });
    makeV0Text(this, 375, 578, introText, {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 530 },
    });

    drawV0Panel(this, 375, 765, 530, 246, {
      fill: 0xf4ece0,
      stroke: V0_COLORS.panelStroke,
      radius: 28,
    });
    makeV0Text(this, 142, 700, '本局战报摘要', {
      fontSize: '28px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    makeV0Text(this, 142, 742, recordLines.join('\n'), {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
      align: 'left',
      lineSpacing: 16,
      wordWrap: { width: 470 },
    }).setOrigin(0, 0);

    drawV0Panel(this, 375, 1005, 530, 186, {
      fill: 0xf8f2e8,
      stroke: V0_COLORS.panelStroke,
      radius: 28,
    });
    makeV0Text(this, 142, 970, victory ? '章节推进结果' : '失败复盘', {
      fontSize: '28px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    makeV0Text(this, 142, 1012, outcomeLines.join('\n'), {
      fontSize: '24px',
      color: V0_COLORS.mutedText,
      align: 'left',
      lineSpacing: 16,
      wordWrap: { width: 470 },
    }).setOrigin(0, 0);

    const primaryText = victory ? '返回章节' : '再试一次';
    const secondaryText = victory ? '继续查看功法' : '返回章节';

    const primaryButton = createV0Button(this, 375, 1184, 530, 88, primaryText, 'primary', () => {
      setBattleSettlement(null);
      this.scene.start(victory ? 'HomeScene' : 'BattleScene');
    }, { fontSize: '28px', radius: 22 });
    const secondaryButton = createV0Button(this, 375, 1280, 530, 72, secondaryText, 'secondary', () => {
      setBattleSettlement(null);
      this.scene.start(victory ? 'SkillScene' : 'HomeScene');
    }, { fontSize: '28px', radius: 22 });
  }

  renderMissingState() {
    drawV0Panel(this, 375, 520, 646, 620, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 36,
    });
    makeV0Text(this, 375, 360, '暂无结算数据', {
      fontSize: '44px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    makeV0Text(this, 375, 496, '可能是直接进入了结果页，或上一轮结算数据已被清空。', {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 480 },
    });
    createV0Button(this, 375, 860, 360, 72, '返回章节页', 'primary', () => {
      this.scene.start('HomeScene');
    }, { fontSize: '28px' });
    createV0Button(this, 375, 950, 360, 68, '返回战斗页', 'secondary', () => {
      this.scene.start('BattleScene');
    }, { fontSize: '24px' });
  }
}
