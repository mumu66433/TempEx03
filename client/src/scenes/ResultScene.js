import BaseScene from './BaseScene.js';
import { createButton, createPill, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { getSession, setBattleSettlement } from '../data/session.js';

export default class ResultScene extends BaseScene {
  constructor() {
    super('ResultScene');
  }

  create() {
    this.addBackground('battle');
    const settlement = getSession().battleSettlement;
    const profile = settlement?.profile || null;
    const battleSession = settlement?.session || null;
    const victory = battleSession?.result === 'victory';

    this.addTopBar(victory ? '通关结算' : '失败结算', '当前结算页基于后端结算接口返回结果');
    drawRoundedPanel(this, 375, 480, 646, 760, victory ? 0x082f49 : 0x2f0b0b, 0.88, 0xffffff, 0.08, 36);
    createPill(this, 190, 228, 132, 40, victory ? '结算成功' : '结算完成', victory ? 0x14532d : 0x7f1d1d, victory ? '#bbf7d0' : '#fecaca');
    createPill(this, 350, 228, 170, 40, battleSession?.status === 'settled' ? '会话已落库' : '状态异常', 0x111827, '#e2e8f0');

    makeThemeText(this, 375, 338, victory ? '挑战成功' : '挑战失败', {
      fontSize: '52px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 408, battleSession?.chapter?.name
      ? `章节：第 ${battleSession.chapterId} 章 · ${battleSession.chapter.name}`
      : '当前结算未附带章节名', {
      fontSize: '20px',
      color: '#cbd5e1',
    });
    makeLabel(this, 375, 528, [
      `结算结果：${battleSession?.result || '-'}`,
      `当前章节：${profile?.currentChapterId ?? '-'}`,
      `最高解锁：${profile?.highestUnlockedChapterId ?? '-'}`,
      `会话状态：${battleSession?.status || '-'}`,
    ].join('\n'), {
      fontSize: '22px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 18,
      wordWrap: { width: 420 },
    });
    makeLabel(this, 375, 746, victory
      ? '当前版本已能验证：通关会推进章节并刷新玩家进度。'
      : '当前版本已能验证：失败会完成结算，但不会推进章节。', {
      fontSize: '18px',
      color: '#7dd3fc',
      wordWrap: { width: 460 },
      align: 'center',
      lineSpacing: 12,
    });
    makeLabel(this, 375, 874, victory
      ? '缺口：当前接口还没有奖励摘要、掉落明细、三选一结果，结算页暂时只能展示章节进度回流。'
      : '缺口：当前接口还没有失败惩罚、奖励摘要和再试成本，结算页暂时只展示最小回流结果。', {
      fontSize: '17px',
      color: '#94a3b8',
      wordWrap: { width: 500 },
      align: 'center',
      lineSpacing: 10,
    });

    createButton(this, 375, 1160, 360, 76, victory ? '返回章节页查看新章节' : '返回章节页', 0x2563eb, 0x7dd3fc, () => {
      setBattleSettlement(null);
      this.scene.start('HomeScene');
    });
    createButton(this, 375, 1256, 360, 68, victory ? '继续前往下一章' : '再次挑战当前章节', 0x0f172a, 0x94a3b8, () => {
      setBattleSettlement(null);
      this.scene.start('BattleScene');
    });
  }
}
