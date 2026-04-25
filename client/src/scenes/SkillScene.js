import BaseScene from './BaseScene.js';
import { createAvatar, createBottomTabs, createButton, createPill, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { getCurrentPlayer } from '../data/session.js';

export default class SkillScene extends BaseScene {
  constructor() {
    super('SkillScene');
  }

  create() {
    this.addBackground('skill');
    this.addTopBar('功法列表', '当前后端尚未开放功法接口，先补齐页面骨架和接口态');

    const player = getCurrentPlayer();

    createAvatar(this, 86, 150, 68, '侠');
    makeThemeText(this, 160, 136, player.nickname || player.name || '少侠', {
      fontSize: '26px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    makeLabel(this, 160, 172, '当前页签：功法', {
      fontSize: '14px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);

    drawRoundedPanel(this, 375, 250, 648, 150, 0x0b1220, 0.86, 0xffffff, 0.08, 28);
    makeLabel(this, 170, 202, '接口状态', { fontSize: '15px', color: '#94a3b8' });
    makeThemeText(this, 170, 242, '待接入', { fontSize: '30px', color: '#f8fafc', fontStyle: 'bold' });
    makeLabel(this, 375, 202, '当前策略', { fontSize: '15px', color: '#94a3b8' });
    makeThemeText(this, 375, 242, '保守占位', { fontSize: '30px', color: '#f8fafc', fontStyle: 'bold' });
    makeLabel(this, 580, 202, '后续对接', { fontSize: '15px', color: '#94a3b8' });
    makeThemeText(this, 580, 242, '功法接口', { fontSize: '30px', color: '#f8fafc', fontStyle: 'bold' });

    drawRoundedPanel(this, 375, 820, 648, 930, 0x0f172a, 0.9, 0xffffff, 0.06, 26);
    makeThemeText(this, 104, 346, '筛选与状态', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    createPill(this, 164, 406, 72, 34, '全部', 0x1d4ed8, '#dbeafe');
    createPill(this, 246, 406, 56, 34, 'N', 0x111827, '#e2e8f0');
    createPill(this, 312, 406, 56, 34, 'R', 0x111827, '#e2e8f0');
    createPill(this, 378, 406, 62, 34, 'SR', 0x111827, '#e2e8f0');
    createPill(this, 478, 406, 118, 34, '未解锁', 0x111827, '#e2e8f0');
    createPill(this, 608, 406, 118, 34, '可升级', 0x111827, '#e2e8f0');

    makeThemeText(this, 375, 552, '功法数据待后端开放', {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 626, '根据 README 的数据边界，前端不再伪造局内 / 局外功法数据。', {
      fontSize: '18px',
      color: '#cbd5e1',
      wordWrap: { width: 520 },
      align: 'center',
    });
    makeLabel(this, 375, 718, '当前页已补齐 V0 所需的功法页骨架、筛选标签、空态和后续接入说明。', {
      fontSize: '18px',
      color: '#94a3b8',
      wordWrap: { width: 520 },
      align: 'center',
    });

    drawRoundedPanel(this, 375, 1018, 540, 264, 0x111827, 0.95, 0xffffff, 0.08, 28);
    makeThemeText(this, 375, 924, '当前可继续做的前端内容', {
      fontSize: '22px',
      color: '#7dd3fc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 1014, '1. 接功法列表接口后替换当前空态\n2. 接功法详情与升级接口后补浮层\n3. 接战斗三选一结果后联动底部构筑条', {
      fontSize: '18px',
      color: '#e2e8f0',
      lineSpacing: 16,
      wordWrap: { width: 420 },
      align: 'left',
    });

    drawRoundedPanel(this, 375, 1324, 540, 208, 0x0b1220, 0.84, 0xffffff, 0.08, 26);
    makeThemeText(this, 375, 1262, '接口态说明', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 1330, '加载中：显示骨架卡\n失败：显示重试提示\n空数据：当前页使用本提示卡，不渲染假功法', {
      fontSize: '18px',
      color: '#cbd5e1',
      lineSpacing: 14,
      align: 'center',
    });

    createButton(this, 194, 1480, 190, 72, '返回主界面', 0x0f172a, 0x94a3b8, () => {
      this.scene.start('HomeScene');
    });
    createButton(this, 548, 1480, 190, 72, '切换账号', 0x0f172a, 0x94a3b8, () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    });

    createBottomTabs(this, 'skill', (tab) => {
      if (tab === 'chapter') {
        this.scene.start('HomeScene');
        return;
      }

      if (tab === 'role') {
        this.showFeedback('角色页暂未开放');
        return;
      }

      if (tab === 'shop') {
        this.showFeedback('功法商城暂未开放');
        return;
      }
    });

    this.feedback = makeLabel(this, 375, 1560, '当前页不再展示假功法数据，等待后端接口补齐。', {
      fontSize: '14px',
      color: '#94a3b8',
    });
  }

  showFeedback(message) {
    this.feedback.setText(message);
  }
}
