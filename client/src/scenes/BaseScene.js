import * as Phaser from 'phaser';
import { makeLabel, makeThemeText } from '../utils/ui.js';

export default class BaseScene extends Phaser.Scene {
  addBackground(theme = 'login') {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x050b16);
    this.add.rectangle(width / 2, height / 2, width, height, 0x0b1220, 0.82);
    this.add.circle(width * 0.16, height * 0.16, 280, theme === 'skill' ? 0x10b981 : 0x38bdf8, 0.12);
    this.add.circle(width * 0.84, height * 0.18, 260, theme === 'home' ? 0xf59e0b : 0x0ea5e9, 0.12);
    this.add.circle(width * 0.5, height * 0.52, 380, 0xffffff, 0.03);
    this.add.circle(width * 0.52, height * 0.82, 260, 0x7c3aed, 0.06);

    this.add.triangle(width * 0.18, height * 0.67, 0, 220, 180, 0, 360, 220, 0x111827, 1).setOrigin(0.5).setAlpha(0.85);
    this.add.triangle(width * 0.52, height * 0.66, 0, 260, 210, 0, 420, 260, 0x0f172a, 1).setOrigin(0.5).setAlpha(0.92);
    this.add.triangle(width * 0.82, height * 0.69, 0, 240, 190, 0, 380, 240, 0x111827, 1).setOrigin(0.5).setAlpha(0.85);

    this.add.rectangle(width / 2, height * 0.42, width, 8, 0xffffff, 0.04);
    this.add.rectangle(width / 2, height - 84, width, 2, 0xffffff, 0.08);

    if (theme === 'login') {
      this.add.circle(width * 0.5, height * 0.19, 210, 0xf8fafc, 0.04);
      this.add.circle(width * 0.5, height * 0.21, 280, 0x38bdf8, 0.05);
    } else if (theme === 'home') {
      this.add.circle(width * 0.5, height * 0.14, 160, 0xf59e0b, 0.08);
      this.add.circle(width * 0.82, height * 0.12, 100, 0xf8fafc, 0.05);
    } else {
      this.add.circle(width * 0.5, height * 0.18, 160, 0x10b981, 0.08);
      this.add.circle(width * 0.2, height * 0.12, 100, 0xf8fafc, 0.05);
    }
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
