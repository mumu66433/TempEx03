import * as Phaser from 'phaser';
import { GAME_TABS } from '../data/gameData.js';

export function makeThemeText(scene, x, y, text, style = {}) {
  return scene.add.text(x, y, text, {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    color: '#f8fafc',
    fontSize: '28px',
    align: 'center',
    ...style,
  }).setOrigin(0.5);
}

export function makeLabel(scene, x, y, text, style = {}) {
  return scene.add.text(x, y, text, {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    color: '#cbd5e1',
    fontSize: '18px',
    ...style,
  }).setOrigin(0.5);
}

export function drawRoundedPanel(scene, x, y, w, h, fill = 0x0b1220, alpha = 0.84, stroke = 0xffffff, strokeAlpha = 0.08, radius = 24) {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  g.lineStyle(2, stroke, strokeAlpha);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}

export function createButton(scene, x, y, w, h, text, fill = 0x2563eb, stroke = 0x7dd3fc, onClick) {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, fill, 1).setStrokeStyle(2, stroke, 0.48);
  const label = scene.add.text(0, 0, text, {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: '24px',
    color: '#ffffff',
  }).setOrigin(0.5);
  const hitArea = scene.add.zone(0, 0, w, h).setOrigin(0.5);
  container.add([bg, label]);
  container.add(hitArea);
  container.setSize(w, h);
  hitArea.setInteractive({ useHandCursor: true });
  hitArea.on('pointerover', () => {
    bg.setFillStyle(Phaser.Display.Color.IntegerToColor(fill).lighten(12).color, 1);
  });
  hitArea.on('pointerout', () => {
    bg.setFillStyle(fill, 1);
  });
  hitArea.on('pointerdown', () => {
    if (onClick) onClick();
  });
  return { container, bg, label, hitArea };
}

export function createPill(scene, x, y, w, h, text, fill = 0x111827, color = '#cbd5e1') {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, fill, 1).setStrokeStyle(1, 0xffffff, 0.12);
  const label = scene.add.text(0, 0, text, {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: '14px',
    color,
  }).setOrigin(0.5);
  container.add([bg, label]);
  return container;
}

export function createAvatar(scene, x, y, size = 72, text = '侠') {
  const container = scene.add.container(x, y);
  const outer = scene.add.circle(0, 0, size / 2 + 6, 0xffffff, 0.06).setStrokeStyle(2, 0x7dd3fc, 0.28);
  const inner = scene.add.circle(0, 0, size / 2, 0x0f172a, 0.95).setStrokeStyle(2, 0xffffff, 0.08);
  const label = scene.add.text(0, 0, text, {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: `${Math.max(18, Math.floor(size * 0.32))}px`,
    color: '#f8fafc',
    fontStyle: 'bold',
  }).setOrigin(0.5);
  container.add([outer, inner, label]);
  return container;
}

export function createProgressBar(scene, x, y, width, value = 0, fill = 0x22c55e, track = 0x334155) {
  const ratio = Phaser.Math.Clamp(value, 0, 1);
  const bg = scene.add.rectangle(x, y, width, 12, track, 1).setOrigin(0, 0.5);
  const bar = scene.add.rectangle(x, y, Math.max(8, width * ratio), 12, fill, 1).setOrigin(0, 0.5);
  return { bg, bar };
}

export function createBottomTabs(scene, activeTab, onSelect) {
  const { width, height } = scene.scale;
  const y = height - 54;
  const group = scene.add.container(0, 0);
  const tabWidth = width / GAME_TABS.length;

  GAME_TABS.forEach((tab, index) => {
    const x = tabWidth * index + tabWidth / 2;
    const isActive = tab.key === activeTab;
    const circle = scene.add.circle(0, -12, 28, isActive ? 0xd1d5db : 0xffffff, isActive ? 0.88 : 0.02)
      .setStrokeStyle(2, isActive ? 0x374151 : 0x94a3b8, isActive ? 0.18 : 0.26);
    const label = scene.add.text(0, 0, tab.label, {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '14px',
      color: isActive ? '#111827' : '#e2e8f0',
      fontStyle: isActive ? 'bold' : 'normal',
    }).setOrigin(0.5);
    label.y = 26;
    const button = scene.add.container(x, y, [circle, label]);
    const hitArea = scene.add.zone(0, 0, tabWidth, 78).setOrigin(0.5);
    button.add(hitArea);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => {
      if (onSelect) {
        onSelect(tab.key);
      }
    });
    group.add(button);
  });

  return group;
}
