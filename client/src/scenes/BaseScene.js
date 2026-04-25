import * as Phaser from 'phaser';
import { makeLabel, makeThemeText } from '../utils/ui.js';

export default class BaseScene extends Phaser.Scene {
  addBackground(theme = 'login') {
    const { width, height } = this.scale;
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x102033, 0x102033, 0x2b5c7a, 0x17314a, 1);
    bg.fillRect(0, 0, width, height);

    this.add.circle(width * 0.52, height * 0.26, theme === 'login' ? 116 : 96, 0xffffff, 0.08);
    this.add.circle(width * 0.16, height * 0.12, 180, theme === 'battle' ? 0xd96b6b : 0xffffff, theme === 'battle' ? 0.07 : 0.04);
    this.add.circle(width * 0.84, height * 0.16, 140, theme === 'home' ? 0xf4c56a : 0xffffff, theme === 'home' ? 0.08 : 0.03);
    this.add.circle(width * 0.5, height * 0.84, 280, 0x09111d, 0.12);

    const frame = this.add.graphics();
    frame.lineStyle(2, 0xffffff, 0.18);
    frame.strokeRoundedRect(24, 24, width - 48, height - 48, 36);
  }

  addTopBar(title, subtitle) {
    const { width } = this.scale;
    makeThemeText(this, width * 0.5, 70, title, {
      fontSize: '26px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, width * 0.5, 102, subtitle, {
      fontSize: '14px',
      color: '#94a3b8',
    });
  }
}
