import BaseScene from './BaseScene.js';
import { getSavedPlayer, savePlayer } from '../utils/storage.js';
import { GAME_SUBTITLE, GAME_TITLE } from '../data/gameData.js';
import { createAvatar, createButton, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';

export default class LoginScene extends BaseScene {
  constructor() {
    super('LoginScene');
  }

  create() {
    this.addBackground('login');
    this.addTopBar('游戏登录', '同一设备会自动保存本地账号');

    const player = getSavedPlayer();
    const name = player.nickname || player.name || '少侠';

    createAvatar(this, 375, 276, 104, '侠');
    makeThemeText(this, 375, 392, GAME_TITLE, {
      fontSize: '56px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 446, GAME_SUBTITLE, {
      fontSize: '18px',
      color: '#94a3b8',
    });

    drawRoundedPanel(this, 375, 760, 620, 290, 0x0b1220, 0.84, 0xffffff, 0.08, 28);
    makeLabel(this, 375, 655, player.account ? `欢迎回来 · ${player.account}` : '欢迎回来', {
      fontSize: '16px',
      color: '#7dd3fc',
    });
    makeThemeText(this, 375, 716, name, {
      fontSize: '42px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 375, 778, '进入游戏后会显示章节首页、功法列表与预留页签。', {
      fontSize: '17px',
      color: '#cbd5e1',
    });
    makeLabel(this, 375, 826, '注册默认密码仍为 123456，切换账号会清除本机保存。', {
      fontSize: '15px',
      color: '#94a3b8',
    });

    const statCards = [
      ['章节', '7'],
      ['功法', '6'],
      ['页签', '4'],
    ];

    statCards.forEach(([title, value], index) => {
      const x = 196 + index * 178;
      drawRoundedPanel(this, x, 990, 150, 94, 0x111827, 0.86, 0xffffff, 0.06, 20);
      makeLabel(this, x, 964, title, { fontSize: '14px', color: '#94a3b8' });
      makeThemeText(this, x, 1000, value, { fontSize: '28px', color: '#f8fafc', fontStyle: 'bold' });
    });

    createButton(this, 375, 1184, 424, 84, '开始游戏', 0x2563eb, 0x7dd3fc, () => {
      savePlayer(player);
      this.scene.start('HomeScene');
    });

    createButton(this, 375, 1288, 320, 72, '切换账号', 0x0f172a, 0x94a3b8, () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    });
  }
}
