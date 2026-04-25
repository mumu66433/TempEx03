import BaseScene from './BaseScene.js';
import { createButton, createPill, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { getCurrentPlayer, getSession } from '../data/session.js';

export default class BattleScene extends BaseScene {
  constructor() {
    super('BattleScene');
  }

  create() {
    this.addBackground('battle');
    const session = getSession();
    const player = getCurrentPlayer();
    const chapterId = Number(player.currentChapterId || player.chapterId || 1);
    const chapter = session.chapterOverview?.chapters?.find((item) => Number(item.id) === chapterId)
      || session.chapters?.find((item) => Number(item.id) === chapterId)
      || null;

    this.addTopBar('战斗页骨架', 'V0 当前先联通章节主流程，战斗系统待下一轮接入');
    drawRoundedPanel(this, 375, 310, 646, 176, 0x0b1220, 0.88, 0xffffff, 0.06, 28);
    createPill(this, 144, 260, 118, 38, '第 1 层 / 1 波', 0x111827, '#e2e8f0');
    createPill(this, 284, 260, 140, 38, '自动战斗预留', 0x1d4ed8, '#dbeafe');
    makeThemeText(this, 375, 324, `${chapter?.name || '当前章节'} 准备中`, {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 374, '这里会承接波次、敌人、三选一和结算。当前版本先验证前端章节与资料链路。', {
      fontSize: '18px',
      color: '#cbd5e1',
      wordWrap: { width: 560 },
      align: 'center',
    });

    drawRoundedPanel(this, 375, 838, 646, 762, 0x0f172a, 0.82, 0xffffff, 0.06, 32);
    makeThemeText(this, 375, 608, '战斗表现区占位', {
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 676, '后续会在这里接入 Phaser 战斗、敌人入场、暂停和结算。', {
      fontSize: '18px',
      color: '#94a3b8',
    });
    makeLabel(this, 375, 840, `当前章节：${chapter?.id || chapterId} · ${chapter?.name || '未命名章节'}`, {
      fontSize: '22px',
      color: '#f8fafc',
    });
    makeLabel(this, 375, 892, chapter?.description || '章节描述待后端配置继续补充。', {
      fontSize: '17px',
      color: '#cbd5e1',
      wordWrap: { width: 520 },
      align: 'center',
    });
    makeLabel(this, 375, 1034, '当前实现边界', {
      fontSize: '18px',
      color: '#7dd3fc',
    });
    makeLabel(this, 375, 1148, '1. 已打通登录后进入章节主流程\n2. 已支持章节切换并落到服务端\n3. 战斗、结算、功法三选一接口待继续接入', {
      fontSize: '18px',
      color: '#e2e8f0',
      align: 'left',
      lineSpacing: 16,
      wordWrap: { width: 500 },
    });

    createButton(this, 375, 1416, 352, 82, '返回章节页', 0x2563eb, 0x7dd3fc, () => {
      this.scene.start('HomeScene');
    });
  }
}
