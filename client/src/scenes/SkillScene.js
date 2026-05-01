import BaseScene from './BaseScene.js';
import {
  V0_COLORS,
  createV0Avatar,
  createV0Button,
  createV0Pill,
  createV0Tabs,
  createV0VerticalCard,
  drawV0Panel,
  makeV0Text,
} from '../utils/v0ui.js';
import { ApiRequestError, fetchPlayerSkills } from '../data/api.js';
import { getCurrentPlayer } from '../data/session.js';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'N', label: 'N' },
  { key: 'R', label: 'R' },
  { key: 'SR', label: 'SR' },
  { key: 'upgrade', label: '可升级' },
  { key: 'locked', label: '未解锁' },
];

const GRADE_STYLES = {
  N: { fill: 0x9aa4b2, color: '#ffffff' },
  R: { fill: 0x4c89d9, color: '#ffffff' },
  SR: { fill: 0x8a63d2, color: '#ffffff' },
  SSR: { fill: 0xd99a3d, color: '#ffffff' },
  UR: { fill: 0xd94f5c, color: '#ffffff' },
};

function isInterfaceMissing(error) {
  return error instanceof ApiRequestError && error.status === 404;
}

function getGradeStyle(grade) {
  return GRADE_STYLES[grade] || GRADE_STYLES.N;
}

function buildSkillMeta(skill) {
  return skill.metaText || [skill.grade || '-', skill.sectType || '-', skill.moldType || '-'].join(' / ');
}

function buildSkillStatus(skill) {
  if (skill.statusText) {
    return skill.statusText;
  }
  if (!skill.unlocked) {
    return `未解锁 · 第${skill.unlockChapter || '-'}章开启`;
  }
  if (skill.canUpgrade) {
    return `已拥有 · 可升级 · 当前经验 ${skill.exp ?? 0}/${skill.nextUpgradeNeed || '-'}`;
  }
  if (skill.owned) {
    return `已拥有 · ${skill.stars ?? 0}星 · 等级 ${skill.level ?? 0}`;
  }
  return '章节已开放 · 尚未拥有';
}

function matchesFilter(skill, filterKey) {
  switch (filterKey) {
    case 'N':
    case 'R':
    case 'SR':
      return skill.grade === filterKey;
    case 'upgrade':
      return Boolean(skill.canUpgrade);
    case 'locked':
      return !skill.unlocked;
    default:
      return true;
  }
}

function formatEffectLines(skill) {
  const powerRateText = Array.isArray(skill.powerRateText) && skill.powerRateText.length
    ? skill.powerRateText
    : Array.isArray(skill.powerRate)
      ? skill.powerRate
      : [];
  const upgradeCondText = Array.isArray(skill.upgradeCondText) && skill.upgradeCondText.length
    ? skill.upgradeCondText
    : Array.isArray(skill.upgradeCond)
      ? skill.upgradeCond
      : [];

  return [
    `效果类型：${skill.powerType || '-'}`,
    `效果参数：${powerRateText.join(' / ') || '-'}`,
    `升星条件：${upgradeCondText.join(' / ') || '-'}`,
    `设计标签：${skill.designTag || '-'}`,
  ];
}

export default class SkillScene extends BaseScene {
  constructor() {
    super('SkillScene');
    this.selectedFilter = 'all';
    this.selectedSkillId = null;
    this.skillsPayload = null;
    this.filterButtons = [];
    this.listItems = [];
    this.detailOverlay = null;
    this.feedbackTimer = null;
  }

  create() {
    this.addBackground('skill');
    this.renderFrame();
    this.loadSkills();
  }

  renderFrame() {
    const player = getCurrentPlayer();

    makeV0Text(this, 375, 74, '功法列表', {
      fontSize: '40px',
      fontStyle: '700',
      color: '#ffffff',
    });
    makeV0Text(this, 375, 116, '真实功法数据来自后端接口，V0 不伪造玩法数据', {
      fontSize: '20px',
      color: 'rgba(255,255,255,0.72)',
    });

    drawV0Panel(this, 375, 260, 686, 220, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 32,
    });
    createV0Avatar(this, 104, 238, 46, '侠');
    this.playerName = makeV0Text(this, 166, 218, player.nickname || player.name || '少侠', {
      fontSize: '28px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    this.playerMeta = makeV0Text(this, 166, 258, player.account || '未登录账号', {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    this.summaryStatus = createV0Pill(this, 612, 202, 124, 44, '加载中', {
      fill: 0xffe7a8,
      fontSize: '18px',
    });
    this.switchButton = createV0Button(this, 606, 270, 150, 46, '切换账号', 'secondary', () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    }, { radius: 16, fontSize: '18px' });

    this.summaryUnlocked = this.createSummaryMetric(154, '已解锁 / 总数');
    this.summaryOwned = this.createSummaryMetric(376, '已拥有');
    this.summaryUpgradeable = this.createSummaryMetric(596, '可升级');

    createV0VerticalCard(this, 375, 904, 686, 1040, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 36,
    });
    makeV0Text(this, 72, 414, '筛选', {
      fontSize: '30px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    makeV0Text(this, 72, 456, '点击功法卡查看详情浮层，升级能力 V0 仅展示状态', {
      fontSize: '18px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);

    this.renderFilterButtons();

    this.stateGroup = this.add.container(0, 0);
    this.stateTitle = makeV0Text(this, 375, 814, '功法加载中', {
      fontSize: '34px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    this.stateDesc = makeV0Text(this, 375, 868, '正在读取后端功法列表', {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 520 },
    });
    this.retryButton = createV0Button(this, 375, 968, 240, 72, '重试', 'primary', () => {
      this.loadSkills();
    }, { fontSize: '26px' });
    this.stateGroup.add([this.stateTitle, this.stateDesc, this.retryButton.container]);

    this.feedbackText = makeV0Text(this, 375, 1406, '功法页优先消费后端 `/api/player/skills`。', {
      fontSize: '18px',
      color: '#fff5d6',
      wordWrap: { width: 560 },
    });

    createV0Tabs(this, 'skill', (tab) => {
      if (tab === 'chapter') {
        this.scene.start('HomeScene');
        return;
      }
      if (tab === 'role' || tab === 'shop') {
        this.showFeedback('该功能 V0 暂未开放');
      }
    });
  }

  createSummaryMetric(x, label) {
    makeV0Text(this, x, 318, label, {
      fontSize: '18px',
      color: 'rgba(255,255,255,0.72)',
    });
    return makeV0Text(this, x, 354, '--', {
      fontSize: '30px',
      fontStyle: '700',
      color: '#ffffff',
    });
  }

  renderFilterButtons() {
    this.filterButtons.forEach((button) => button.nodes.forEach((node) => node.destroy()));
    this.filterButtons = [];

    FILTERS.forEach((filter, index) => {
      const x = 116 + index * 104;
      const bg = drawV0Panel(this, x, 514, 92, 46, {
        fill: V0_COLORS.panelAlt,
        stroke: V0_COLORS.panelStroke,
        radius: 18,
      });
      const label = makeV0Text(this, x, 516, filter.label, {
        fontSize: '18px',
        fontStyle: '700',
        color: V0_COLORS.darkText,
      });
      const hit = this.add.zone(x, 514, 92, 46).setOrigin(0.5);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.selectedFilter = filter.key;
        this.renderSkillList();
      });
      this.filterButtons.push({ key: filter.key, bg, label, nodes: [bg, label, hit] });
    });
    this.updateFilterButtons();
  }

  updateFilterButtons() {
    this.filterButtons.forEach((button) => {
      const active = button.key === this.selectedFilter;
      button.bg.redraw({
        fill: active ? V0_COLORS.goldLight : V0_COLORS.panelAlt,
        stroke: active ? V0_COLORS.goldStroke : V0_COLORS.panelStroke,
        strokeAlpha: active ? 1 : 0.72,
      });
      button.label.setColor(active ? V0_COLORS.darkText : V0_COLORS.mutedText);
      button.label.setFontStyle(active ? '700' : '500');
    });
  }

  clearSkillList() {
    this.listItems.forEach((item) => item.destroy());
    this.listItems = [];
  }

  setSummaryStatus(text, fill = 0xffe7a8) {
    this.summaryStatus.bg.redraw({ fill });
    this.summaryStatus.label.setText(text);
  }

  setState(title, desc, showRetry = false) {
    this.stateGroup.setVisible(true);
    this.stateTitle.setText(title);
    this.stateDesc.setText(desc);
    this.retryButton.setVisible(showRetry);
  }

  hideState() {
    this.stateGroup.setVisible(false);
  }

  async loadSkills() {
    const player = getCurrentPlayer();
    this.playerName.setText(player.nickname || player.name || '少侠');
    this.playerMeta.setText(player.account || '未登录账号');
    this.setSummaryStatus('加载中', 0xffe7a8);
    this.summaryUnlocked.setText('-- / --');
    this.summaryOwned.setText('--');
    this.summaryUpgradeable.setText('--');
    this.skillsPayload = null;
    this.selectedSkillId = null;
    this.clearSkillList();
    this.setState('功法加载中', '正在读取后端功法列表');
    this.showFeedback('正在请求 `/api/player/skills`。');

    try {
      this.skillsPayload = await fetchPlayerSkills(player.account);
      const summary = this.skillsPayload.summary || {};
      this.setSummaryStatus('已接入', 0xdff4df);
      this.summaryUnlocked.setText(`${summary.unlocked ?? 0} / ${summary.total ?? 0}`);
      this.summaryOwned.setText(String(summary.owned ?? 0));
      this.summaryUpgradeable.setText(String(summary.upgradeable ?? 0));
      this.renderSkillList();
      this.showFeedback('功法数据已来自后端接口。');
    } catch (error) {
      this.skillsPayload = null;
      this.clearSkillList();
      this.summaryUnlocked.setText('-- / --');
      this.summaryOwned.setText('--');
      this.summaryUpgradeable.setText('--');

      if (isInterfaceMissing(error)) {
        this.setSummaryStatus('未就绪', 0xf4ece0);
        this.setState(
          '功法接口未就绪',
          '`/api/player/skills` 尚未返回真实数据，当前页不会渲染假功法卡。',
          false,
        );
      } else {
        this.setSummaryStatus('失败', 0xf4b0a5);
        this.setState('功法加载失败', error.message || '请检查网络后重试', true);
      }
      this.showFeedback(error.message);
    }
  }

  renderSkillList() {
    this.updateFilterButtons();
    this.clearSkillList();

    const skills = Array.isArray(this.skillsPayload?.skills)
      ? this.skillsPayload.skills.filter((skill) => matchesFilter(skill, this.selectedFilter))
      : [];

    if (!skills.length) {
      this.setState(
        this.skillsPayload ? '当前筛选暂无功法' : '暂无功法数据',
        this.skillsPayload ? '请切换筛选条件，或等待后端返回更多真实功法。' : '后端未返回可展示功法。',
        false,
      );
      return;
    }

    this.hideState();
    const selected = skills.find((skill) => skill.id === this.selectedSkillId) || skills[0];
    this.selectedSkillId = selected.id;

    skills.slice(0, 6).forEach((skill, index) => {
      this.renderSkillCard(skill, index, skill.id === this.selectedSkillId);
    });
  }

  renderSkillCard(skill, index, active) {
    const y = 612 + index * 126;
    const locked = !skill.unlocked;
    const gradeStyle = getGradeStyle(skill.grade);
    const alpha = locked ? 0.68 : 1;
    const card = createV0VerticalCard(this, 375, y, 610, 110, {
      fill: active ? V0_COLORS.panelAlt : V0_COLORS.panel,
      stroke: active ? V0_COLORS.goldStroke : V0_COLORS.panelStroke,
      radius: 28,
      fillAlpha: alpha,
      strokeAlpha: active ? 1 : 0.78,
    });
    const grade = createV0Pill(this, 112, y - 30, 62, 34, skill.grade || 'N', {
      fill: gradeStyle.fill,
      stroke: gradeStyle.fill,
      color: gradeStyle.color,
      fontSize: '17px',
      radius: 14,
    });
    const name = makeV0Text(this, 158, y - 32, skill.name || '未知功法', {
      fontSize: '26px',
      fontStyle: '700',
      color: locked ? '#8b8171' : V0_COLORS.darkText,
      wordWrap: { width: 278 },
    }).setOrigin(0, 0.5);
    const meta = makeV0Text(this, 158, y + 2, buildSkillMeta(skill), {
      fontSize: '18px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 286 },
    }).setOrigin(0, 0.5);
    const status = makeV0Text(this, 158, y + 34, buildSkillStatus(skill), {
      fontSize: '17px',
      color: skill.canUpgrade ? '#287a45' : V0_COLORS.mutedText,
      wordWrap: { width: 360 },
    }).setOrigin(0, 0.5);
    const level = makeV0Text(this, 598, y - 20, `Lv.${skill.level ?? 0}`, {
      fontSize: '22px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    const stars = makeV0Text(this, 598, y + 16, `${skill.stars ?? 0} 星`, {
      fontSize: '18px',
      color: V0_COLORS.mutedText,
    });
    const tagText = locked ? '未解锁' : skill.canUpgrade ? '可升级' : Number(skill.stars) >= 3 ? '满星' : '详情';
    const tag = createV0Pill(this, 500, y + 32, 82, 32, tagText, {
      fill: locked ? 0xe5ded2 : skill.canUpgrade ? 0xdff4df : 0xffe7a8,
      fontSize: '16px',
      radius: 14,
    });
    const hit = this.add.zone(375, y, 610, 110).setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => {
      this.selectedSkillId = skill.id;
      this.renderSkillList();
      this.openSkillDetail(skill);
    });

    this.listItems.push(card, grade.container, name, meta, status, level, stars, tag.container, hit);
  }

  openSkillDetail(skill) {
    if (this.detailOverlay) {
      this.detailOverlay.destroy(true);
    }

    const locked = !skill.unlocked;
    const gradeStyle = getGradeStyle(skill.grade);
    this.detailOverlay = this.add.container(0, 0);
    const mask = this.add.rectangle(375, 812, 750, 1624, 0x09111d, 0.58);
    const panel = drawV0Panel(this, 375, 812, 622, 820, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 34,
    });
    const grade = createV0Pill(this, 154, 472, 76, 42, skill.grade || 'N', {
      fill: gradeStyle.fill,
      stroke: gradeStyle.fill,
      color: gradeStyle.color,
      fontSize: '20px',
    });
    const title = makeV0Text(this, 204, 472, skill.name || '未知功法', {
      fontSize: '36px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
      wordWrap: { width: 360 },
    }).setOrigin(0, 0.5);
    const meta = makeV0Text(this, 142, 530, buildSkillMeta(skill), {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 480 },
    }).setOrigin(0, 0.5);
    const descPanel = drawV0Panel(this, 375, 642, 530, 138, {
      fill: 0xf4ece0,
      stroke: V0_COLORS.panelStroke,
      radius: 24,
    });
    const desc = makeV0Text(this, 142, 604, skill.desc || '当前配置未提供额外说明。', {
      fontSize: '22px',
      color: V0_COLORS.darkText,
      align: 'left',
      lineSpacing: 10,
      wordWrap: { width: 466 },
    }).setOrigin(0, 0);

    const effectPanel = drawV0Panel(this, 375, 836, 530, 202, {
      fill: 0xfff9f0,
      stroke: V0_COLORS.panelStroke,
      radius: 24,
    });
    const effectTitle = makeV0Text(this, 142, 760, '效果与升星', {
      fontSize: '26px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    const effect = makeV0Text(this, 142, 802, formatEffectLines(skill).join('\n'), {
      fontSize: '20px',
      color: V0_COLORS.mutedText,
      align: 'left',
      lineSpacing: 12,
      wordWrap: { width: 466 },
    }).setOrigin(0, 0);

    const statePanel = drawV0Panel(this, 375, 1030, 530, 142, {
      fill: locked ? 0xf4ece0 : 0xffe7a8,
      stroke: V0_COLORS.panelStroke,
      radius: 24,
    });
    const stateText = makeV0Text(this, 142, 988, [
      buildSkillStatus(skill),
      `拥有：${skill.owned ? '是' : '否'} / 等级：${skill.level ?? 0} / 星级：${skill.stars ?? 0}`,
      locked ? `解锁章节：第${skill.unlockChapter || '-'}章` : `当前经验：${skill.exp ?? 0} / ${skill.nextUpgradeNeed || '-'}`,
    ].join('\n'), {
      fontSize: '20px',
      color: V0_COLORS.darkText,
      align: 'left',
      lineSpacing: 10,
      wordWrap: { width: 466 },
    }).setOrigin(0, 0);

    const upgradeButton = createV0Button(this, 375, 1174, 480, 72, skill.canUpgrade ? '升级未开放' : '暂不可升级', skill.canUpgrade ? 'primary' : 'muted', () => {
      this.showFeedback('升级功能 V0 暂未开放');
    }, { fontSize: '26px' });
    if (!skill.canUpgrade) {
      upgradeButton.setEnabled(false);
    }
    const closeButton = createV0Button(this, 375, 1268, 480, 68, '关闭详情', 'secondary', () => {
      this.detailOverlay.destroy(true);
      this.detailOverlay = null;
    }, { fontSize: '24px' });

    this.detailOverlay.add([
      mask,
      panel,
      grade.container,
      title,
      meta,
      descPanel,
      desc,
      effectPanel,
      effectTitle,
      effect,
      statePanel,
      stateText,
      upgradeButton.container,
      closeButton.container,
    ]);
  }

  showFeedback(message) {
    this.feedbackText.setText(message);
    if (this.feedbackTimer) {
      this.feedbackTimer.remove(false);
    }
    this.feedbackTimer = this.time.delayedCall(2600, () => {
      this.feedbackText.setText('功法页优先消费后端 `/api/player/skills`。');
      this.feedbackTimer = null;
    });
  }
}
