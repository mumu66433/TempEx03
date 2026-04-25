import * as Phaser from 'phaser';

export const V0_COLORS = {
  panel: 0xfff8ee,
  panelAlt: 0xf4ece0,
  panelStroke: 0xd7c5aa,
  darkText: '#1f2937',
  mutedText: '#667085',
  gold: 0xf4c56a,
  goldLight: 0xffe4a0,
  goldStroke: 0xb78832,
  green: 0x5cbf75,
  red: 0xd96b6b,
  blueTint: 0x17314a,
};

function toHex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function drawRoundedBox(graphics, width, height, style) {
  const {
    fill,
    fillAlpha,
    stroke,
    strokeAlpha,
    radius,
    lineWidth,
  } = style;

  graphics.clear();
  graphics.fillStyle(fill, fillAlpha);
  graphics.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  if (lineWidth > 0) {
    graphics.lineStyle(lineWidth, stroke, strokeAlpha);
    graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
  }
}

function createRoundedShape(scene, width, height, options = {}) {
  const graphics = scene.add.graphics();
  const state = {
    fill: options.fill ?? V0_COLORS.panel,
    fillAlpha: options.fillAlpha ?? 1,
    stroke: options.stroke ?? V0_COLORS.panelStroke,
    strokeAlpha: options.strokeAlpha ?? 1,
    radius: options.radius ?? 24,
    lineWidth: options.lineWidth ?? 2,
  };

  const redraw = (next = {}) => {
    Object.assign(state, next);
    drawRoundedBox(graphics, width, height, state);
  };

  redraw();
  return { graphics, redraw, state };
}

export function drawV0Panel(scene, x, y, width, height, options = {}) {
  const { graphics, redraw } = createRoundedShape(scene, width, height, options);
  graphics.setPosition(x, y);
  graphics.redraw = redraw;
  return graphics;
}

export function makeV0Text(scene, x, y, text, style = {}) {
  return scene.add.text(x, y, text, {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: '28px',
    color: V0_COLORS.darkText,
    align: 'center',
    ...style,
  }).setOrigin(0.5);
}

export function createV0Pill(scene, x, y, width, height, text, options = {}) {
  const container = scene.add.container(x, y);
  const bg = drawV0Panel(scene, 0, 0, width, height, {
    fill: options.fill ?? 0xffe7a8,
    stroke: options.stroke ?? V0_COLORS.panelStroke,
    fillAlpha: options.fillAlpha ?? 1,
    strokeAlpha: options.strokeAlpha ?? 1,
    radius: options.radius ?? Math.min(18, Math.floor(height / 2)),
    lineWidth: options.lineWidth ?? 2,
  });
  const label = makeV0Text(scene, 0, 1, text, {
    fontSize: options.fontSize ?? '18px',
    fontStyle: options.fontStyle ?? '700',
    color: options.color ?? V0_COLORS.darkText,
  });
  container.add([bg, label]);
  return { container, bg, label };
}

const BUTTON_VARIANTS = {
  primary: {
    fill: V0_COLORS.gold,
    hoverFill: 0xffd98a,
    stroke: V0_COLORS.goldStroke,
    labelColor: V0_COLORS.darkText,
    shadowAlpha: 0.22,
  },
  secondary: {
    fill: V0_COLORS.panel,
    hoverFill: 0xfdf0d8,
    stroke: V0_COLORS.panelStroke,
    labelColor: V0_COLORS.darkText,
    shadowAlpha: 0.18,
  },
  danger: {
    fill: 0xf4b0a5,
    hoverFill: 0xf8c0b8,
    stroke: 0xb55b57,
    labelColor: V0_COLORS.darkText,
    shadowAlpha: 0.22,
  },
  muted: {
    fill: 0xe9dfc9,
    hoverFill: 0xf0e7d4,
    stroke: V0_COLORS.panelStroke,
    labelColor: V0_COLORS.darkText,
    shadowAlpha: 0.15,
  },
};

export function createV0Button(scene, x, y, width, height, text, variant = 'primary', onClick, options = {}) {
  const container = scene.add.container(x, y);
  const buttonStyle = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const shadow = drawV0Panel(scene, 0, 8, width, height, {
    fill: 0x09111d,
    fillAlpha: buttonStyle.shadowAlpha,
    stroke: 0x09111d,
    strokeAlpha: 0,
    radius: options.radius ?? 22,
    lineWidth: 0,
  });
  const { graphics: bg, redraw } = createRoundedShape(scene, width, height, {
    fill: buttonStyle.fill,
    stroke: buttonStyle.stroke,
    radius: options.radius ?? 22,
    lineWidth: 2,
  });
  const label = makeV0Text(scene, 0, 0, text, {
    fontSize: options.fontSize ?? '28px',
    fontStyle: '700',
    color: buttonStyle.labelColor,
  });
  const hitArea = scene.add.zone(0, 0, width, height).setOrigin(0.5);
  let enabled = true;

  bg.redraw = redraw;
  hitArea.setInteractive({ useHandCursor: true });
  hitArea.on('pointerover', () => {
    if (!enabled) {
      return;
    }
    bg.redraw({
      fill: buttonStyle.hoverFill,
      stroke: buttonStyle.stroke,
    });
  });
  hitArea.on('pointerout', () => {
    bg.redraw({
      fill: enabled ? buttonStyle.fill : 0xd6d3cb,
      stroke: enabled ? buttonStyle.stroke : 0xb8b3a6,
    });
  });
  hitArea.on('pointerdown', () => {
    if (enabled && onClick) {
      onClick();
    }
  });

  container.add([shadow, bg, label, hitArea]);

  return {
    container,
    bg,
    label,
    hitArea,
    setEnabled(nextEnabled) {
      enabled = Boolean(nextEnabled);
      hitArea.input.enabled = enabled;
      bg.redraw({
        fill: enabled ? buttonStyle.fill : 0xd6d3cb,
        stroke: enabled ? buttonStyle.stroke : 0xb8b3a6,
      });
      label.setAlpha(enabled ? 1 : 0.6);
      shadow.setAlpha(enabled ? buttonStyle.shadowAlpha : 0.08);
    },
    setText(nextText) {
      label.setText(nextText);
    },
    setVisible(nextVisible) {
      container.setVisible(nextVisible);
    },
  };
}

export function createV0HealthBar(scene, x, y, width, ratio, options = {}) {
  const group = scene.add.container(x, y);
  const track = scene.add.rectangle(0, 0, width, options.height ?? 14, options.track ?? 0xe4dacc, 1).setOrigin(0, 0.5);
  const bar = scene.add.rectangle(0, 0, Math.max(8, width * Phaser.Math.Clamp(ratio ?? 0, 0, 1)), options.height ?? 14, options.fill ?? V0_COLORS.green, 1).setOrigin(0, 0.5);
  group.add([track, bar]);

  return {
    container: group,
    track,
    bar,
    setValue(nextRatio) {
      bar.width = Math.max(8, width * Phaser.Math.Clamp(nextRatio ?? 0, 0, 1));
    },
  };
}

export function createV0Tabs(scene, activeTab, onSelect) {
  const { width } = scene.scale;
  const tabs = [
    { key: 'chapter', label: '章节' },
    { key: 'skill', label: '功法' },
    { key: 'role', label: '角色' },
    { key: 'shop', label: '商城' },
  ];
  const container = scene.add.container(0, 0);
  const bar = drawV0Panel(scene, width / 2, 1520, 702, 120, {
    fill: 0xe9dfc9,
    stroke: V0_COLORS.panelStroke,
    radius: 30,
  });
  container.add(bar);

  tabs.forEach((tab, index) => {
    const x = 82 + index * 168;
    const active = tab.key === activeTab;
    const circle = scene.add.circle(x, 1520, 34, active ? V0_COLORS.gold : 0xffffff, 1)
      .setStrokeStyle(2, active ? V0_COLORS.goldStroke : V0_COLORS.panelStroke, 1);
    const label = makeV0Text(scene, x, 1527, tab.label, {
      fontSize: '18px',
      fontStyle: active ? '700' : '500',
      color: V0_COLORS.darkText,
    });
    const hit = scene.add.zone(x, 1520, 120, 90).setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      if (onSelect) {
        onSelect(tab.key);
      }
    });
    container.add([circle, label, hit]);
  });

  return container;
}

export function createV0Avatar(scene, x, y, radius = 46, text = '侠') {
  const container = scene.add.container(x, y);
  const circle = scene.add.circle(0, 0, radius, V0_COLORS.gold, 1);
  const label = makeV0Text(scene, 0, 4, text, {
    fontSize: `${Math.round(radius * 0.62)}px`,
    fontStyle: '700',
    color: V0_COLORS.darkText,
  });
  container.add([circle, label]);
  return container;
}

export function createV0CardChip(scene, x, y, width, height, text, options = {}) {
  const panel = drawV0Panel(scene, x, y, width, height, {
    fill: options.fill ?? 0xffe7a8,
    stroke: options.stroke ?? V0_COLORS.panelStroke,
    radius: options.radius ?? 18,
  });
  const label = makeV0Text(scene, x, y + 1, text, {
    fontSize: options.fontSize ?? '20px',
    fontStyle: options.fontStyle ?? '700',
    color: options.color ?? V0_COLORS.darkText,
    wordWrap: options.wordWrap ? { width: options.wordWrap } : undefined,
  });
  return { panel, label };
}

export function createV0VerticalCard(scene, x, y, width, height, options = {}) {
  return drawV0Panel(scene, x, y, width, height, {
    fill: options.fill ?? V0_COLORS.panel,
    stroke: options.stroke ?? V0_COLORS.panelStroke,
    radius: options.radius ?? 28,
    fillAlpha: options.fillAlpha ?? 1,
    strokeAlpha: options.strokeAlpha ?? 1,
    lineWidth: options.lineWidth ?? 2,
  });
}

export function mutedTextColor(alpha = 1) {
  const color = Phaser.Display.Color.HexStringToColor(V0_COLORS.mutedText).color;
  return alpha >= 1 ? V0_COLORS.mutedText : toHex(color);
}
