import * as Phaser from 'phaser';
import { createButton, makeThemeText } from '../utils/ui.js';
import { getSavedPlayer, savePlayer } from '../utils/storage.js';

export default class LoginScene extends Phaser.Scene {
  constructor() {
    super('LoginScene');
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 1);

    makeThemeText(this, width / 2, 290, '剑侠风云', {
      fontSize: '56px',
      color: '#111827',
      fontStyle: 'bold',
    });

    createButton(this, 646, 150, 128, 54, '切换账号', 0x0f172a, 0x94a3b8, () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    });

    createButton(this, width / 2, 1184, 424, 84, '开始游戏', 0x2563eb, 0x7dd3fc, () => {
      const player = getSavedPlayer();
      savePlayer(player);
      this.scene.start('HomeScene');
    });
  }
}
