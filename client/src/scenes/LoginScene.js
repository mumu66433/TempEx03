import BaseScene from './BaseScene.js';
import { createAvatar, createButton, createPill, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { getCurrentPlayer, getSession, refreshPlayerSession } from '../data/session.js';

export default class LoginScene extends BaseScene {
  constructor() {
    super('LoginScene');
  }

  async create() {
    const { width, height } = this.scale;
    this.addBackground('login');
    this.addTopBar('游戏入口页', '登录成功后进入 V0 主流程');

    const player = getCurrentPlayer();
    const session = getSession();
    const status = makeLabel(this, width / 2, 1322, '正在读取最新玩家资料...', {
      fontSize: '17px',
      color: '#94a3b8',
    });

    try {
      if (player.account) {
        await refreshPlayerSession(player.account);
      }
      status.setText('资料已同步，可以进入章节页继续体验。');
    } catch (error) {
      status.setText(`资料同步失败：${error.message}`);
      status.setColor('#fca5a5');
    }

    const effectivePlayer = getCurrentPlayer();

    createAvatar(this, 120, 206, 82, '侠');
    makeThemeText(this, 210, 184, effectivePlayer.nickname || effectivePlayer.name || '少侠', {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    makeLabel(this, 210, 228, effectivePlayer.account || '未登录账号', {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);

    createButton(this, 646, 150, 128, 54, '切换账号', 0x0f172a, 0x94a3b8, () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    });

    drawRoundedPanel(this, 375, 620, 646, 440, 0x0b1220, 0.82, 0xffffff, 0.06, 36);
    createPill(this, 174, 438, 120, 40, 'V0 原型', 0x1d4ed8, '#dbeafe');
    createPill(this, 308, 438, 150, 40, '单分支联调', 0x0f172a, '#cbd5e1');
    createPill(this, 516, 438, 144, 40, session.backend.ready ? '后端在线' : '后端异常', session.backend.ready ? 0x14532d : 0x7f1d1d, session.backend.ready ? '#bbf7d0' : '#fecaca');
    makeThemeText(this, 375, 536, '剑侠风云', {
      fontSize: '60px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 596, '章节推进 + 自动战斗 + 功法三选一', {
      fontSize: '20px',
      color: '#cbd5e1',
    });
    makeLabel(this, 375, 706, '当前前端先打通登录、章节读取、章节切换与基础流转。', {
      fontSize: '18px',
      color: '#94a3b8',
    });
    makeLabel(this, 375, 804, `上次停留章节：第 ${effectivePlayer.currentChapterId || 1} 章`, {
      fontSize: '26px',
      color: '#f8fafc',
    });
    makeLabel(this, 375, 866, `已解锁章节：${effectivePlayer.highestUnlockedChapterId || 1}`, {
      fontSize: '18px',
      color: '#7dd3fc',
    });
    makeLabel(this, 375, 930, session.backend.message, {
      fontSize: '15px',
      color: session.backend.ready ? '#86efac' : '#fca5a5',
      wordWrap: { width: 520 },
      align: 'center',
    });

    createButton(this, width / 2, 1184, 424, 84, '进入章节页', 0x2563eb, 0x7dd3fc, () => {
      this.scene.start('HomeScene');
    });

    makeLabel(this, width / 2, height - 166, '如果账号已切换，本页会重新同步玩家资料并覆盖本地展示。', {
      fontSize: '16px',
      color: '#94a3b8',
    });
  }
}
