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

    this.addTopBar('战斗页占位', '当前仅展示真实章节数据，战斗接口尚未就绪');
    drawRoundedPanel(this, 375, 310, 646, 176, 0x0b1220, 0.88, 0xffffff, 0.06, 28);
    createPill(this, 158, 260, 136, 38, '战斗接口未就绪', 0x7f1d1d, '#fecaca');
    createPill(this, 326, 260, 140, 38, session.backend.ready ? '后端在线' : '后端异常', session.backend.ready ? 0x14532d : 0x7f1d1d, session.backend.ready ? '#bbf7d0' : '#fecaca');
    makeThemeText(this, 375, 324, `${chapter?.name || '当前章节'} 已就绪`, {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 374, '当前页面只消费后端返回的章节数据，不再用前端伪造波次、敌人或结算结果。', {
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
    makeLabel(this, 375, 676, '后续会在这里接入 Phaser 战斗、敌人入场、暂停和结算。当前先确认章节入口与接口态。', {
      fontSize: '18px',
      color: '#94a3b8',
    });
    makeLabel(this, 375, 840, `当前章节：${chapter?.id || chapterId} · ${chapter?.name || '未命名章节'}`, {
      fontSize: '22px',
      color: '#f8fafc',
    });
    makeLabel(this, 375, 924, `关卡组：${chapter?.missionId ?? '-'} · 关卡数：${chapter?.missionCount ?? '-'} · 预计波次：${chapter?.totalWaveEstimate ?? '-'}`, {
      fontSize: '17px',
      color: '#cbd5e1',
      wordWrap: { width: 520 },
      align: 'center',
    });
    makeLabel(this, 375, 978, `推荐生命：${chapter?.guessHeroLife ?? '-'} · 推荐攻击：${chapter?.guessHeroAtk ?? '-'}`, {
      fontSize: '17px',
      color: '#cbd5e1',
      wordWrap: { width: 520 },
      align: 'center',
    });
    makeLabel(this, 375, 1034, '当前实现边界', {
      fontSize: '18px',
      color: '#7dd3fc',
    });
    makeLabel(this, 375, 1148, '1. 当前章节来自后端接口\n2. 当前章节切换已落到服务端\n3. 战斗、结算、功法三选一仍等待后端继续补接口', {
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
