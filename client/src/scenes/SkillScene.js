import BaseScene from './BaseScene.js';
import { SKILLS } from '../data/gameData.js';
import { createAvatar, createBottomTabs, createButton, createProgressBar, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { getSavedPlayer } from '../utils/storage.js';

function qualityLabel(quality) {
  const map = {
    N: '普通',
    R: '稀有',
    SR: '史诗',
    SSR: '传说',
    UR: '绝品',
  };
  return map[quality] || quality;
}

export default class SkillScene extends BaseScene {
  constructor() {
    super('SkillScene');
  }

  create() {
    this.addBackground('skill');
    this.addTopBar('功法列表', '查看已获得的功法与羁绊信息');

    const player = getSavedPlayer();
    const notice = makeLabel(this, 375, 1328, '点击左侧功法卡可刷新详情浮窗。', {
      fontSize: '14px',
      color: '#94a3b8',
    });

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
    makeLabel(this, 170, 202, '已收录功法', { fontSize: '15px', color: '#94a3b8' });
    makeThemeText(this, 170, 242, String(SKILLS.length), { fontSize: '30px', color: '#f8fafc', fontStyle: 'bold' });
    makeLabel(this, 375, 202, '当前流派', { fontSize: '15px', color: '#94a3b8' });
    makeThemeText(this, 375, 242, '武侠通用', { fontSize: '30px', color: '#f8fafc', fontStyle: 'bold' });
    makeLabel(this, 580, 202, '推荐羁绊', { fontSize: '15px', color: '#94a3b8' });
    makeThemeText(this, 580, 242, '轻功 / 外功', { fontSize: '30px', color: '#f8fafc', fontStyle: 'bold' });

    drawRoundedPanel(this, 222, 820, 300, 930, 0x0f172a, 0.9, 0xffffff, 0.06, 26);
    drawRoundedPanel(this, 530, 820, 370, 930, 0x0f172a, 0.9, 0xffffff, 0.06, 26);
    makeThemeText(this, 94, 346, '功法目录', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    const detailName = makeThemeText(this, 368, 356, SKILLS[0].name, {
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const detailMeta = makeLabel(this, 368, 402, '', {
      fontSize: '16px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);
    const detailEffect = makeThemeText(this, 368, 456, '', {
      fontSize: '24px',
      color: '#7dd3fc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const detailSummary = makeLabel(this, 368, 520, '', {
      fontSize: '16px',
      color: '#cbd5e1',
      wordWrap: { width: 280 },
    }).setOrigin(0, 0.5);
    const detailUpgrade = makeLabel(this, 368, 596, '', {
      fontSize: '15px',
      color: '#a7f3d0',
      wordWrap: { width: 280 },
    }).setOrigin(0, 0.5);

    const stars = [];
    for (let index = 0; index < 3; index += 1) {
      stars.push(this.add.text(368 + index * 26, 650, '★', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '24px',
        color: '#fbbf24',
      }).setOrigin(0, 0.5));
    }
    const detailLevel = makeLabel(this, 368, 686, '', {
      fontSize: '15px',
      color: '#cbd5e1',
    }).setOrigin(0, 0.5);
    const detailProgress = makeThemeText(this, 368, 724, '', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const progressBar = createProgressBar(this, 368, 758, 252, 0.5, 0x22c55e, 0x334155);

    const detailFaction = makePillText(this, 368, 812, '');
    const detailType = makePillText(this, 450, 812, '');
    const detailQuality = makePillText(this, 532, 812, '');

    const detailColorPanel = this.add.rectangle(552, 590, 132, 170, SKILLS[0].color, 1)
      .setStrokeStyle(2, 0xffffff, 0.2);
    const detailColorTitle = this.add.text(552, 552, '', {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '26px',
      color: '#0f172a',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);
    const detailColorSub = this.add.text(552, 608, '', {
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      fontSize: '15px',
      color: '#0f172a',
      align: 'center',
    }).setOrigin(0.5);

    const listButtons = [];
    let selected = 0;

    const updateDetail = (index) => {
      selected = index;
      const skill = SKILLS[index];
      detailName.setText(skill.name);
      detailMeta.setText(`${qualityLabel(skill.rarity)} · ${skill.sect} · ${skill.sectTag}`);
      detailEffect.setText(skill.effect);
      detailSummary.setText(skill.summary);
      detailUpgrade.setText(skill.upgrade);
      detailLevel.setText(`等级 Lv.${skill.level} · 星级 ${skill.stars}`);
      detailProgress.setText(`经验 ${skill.exp}/${skill.maxExp}`);
      detailFaction.setText(skill.sectTag);
      detailType.setText(skill.sect);
      detailQuality.setText(skill.rarity);
      detailColorPanel.setFillStyle(skill.color, 1);
      detailColorTitle.setText(skill.name);
      detailColorSub.setText(skill.effect);
      progressBar.bar.width = Math.max(8, 252 * Math.min(1, skill.exp / skill.maxExp));

      stars.forEach((star, starIndex) => {
        star.setColor(starIndex < skill.stars ? '#fbbf24' : '#475569');
      });

      listButtons.forEach((button, buttonIndex) => {
        const active = buttonIndex === selected;
        button.bg.setFillStyle(active ? 0x1d4ed8 : 0x111827, 1);
        button.bg.setStrokeStyle(2, active ? skill.color : skill.color, active ? 0.6 : 0.25);
      });

      notice.setText(`已选中 ${skill.name}，${skill.summary}`);
    };

    SKILLS.forEach((skill, index) => {
      const y = 405 + index * 128;
      const bg = this.add.rectangle(222, y, 250, 108, index === 0 ? 0x1d4ed8 : 0x111827, 1)
        .setStrokeStyle(2, skill.color, 0.26);
      const name = this.add.text(108, y - 20, skill.name, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
        fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      const meta = this.add.text(108, y + 12, `${qualityLabel(skill.rarity)} · Lv.${skill.level}`, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
      }).setOrigin(0, 0.5);
      const tag = this.add.text(108, y + 38, skill.sectTag, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '13px',
        color: '#94a3b8',
      }).setOrigin(0, 0.5);
      const barTrack = this.add.rectangle(108, y + 63, 190, 8, 0x334155, 1).setOrigin(0, 0.5);
      const barFill = this.add.rectangle(108, y + 63, Math.max(8, 190 * Math.min(1, skill.exp / skill.maxExp)), 8, skill.color, 1).setOrigin(0, 0.5);
      const hit = this.add.rectangle(222, y, 250, 108, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => updateDetail(index));
      listButtons.push({ bg, name, meta, tag, barTrack, barFill, hit });
    });

    updateDetail(0);

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
        notice.setText('角色页签预留，后续会接角色属性与局外养成。');
        return;
      }

      if (tab === 'shop') {
        notice.setText('功法商城页签预留，后续会接抽功法与重复分解。');
        return;
      }

      notice.setText(`当前页签：${tab}`);
    });
  }
}

function makePillText(scene, x, y, text) {
  return scene.add.text(x, y, text, {
    fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: '14px',
    color: '#e2e8f0',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: { left: 10, right: 10, top: 6, bottom: 6 },
  }).setOrigin(0, 0.5);
}
