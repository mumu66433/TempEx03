import BaseScene from './BaseScene.js';
import { createAvatar, createBottomTabs, createButton, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
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

function isInterfaceMissing(error) {
  return error instanceof ApiRequestError && error.status === 404;
}

function buildSkillMeta(skill) {
  const parts = [skill.grade || '-', skill.sectType || '-', skill.moldType || '-'];
  return parts.join(' · ');
}

function buildSkillStatus(skill) {
  if (!skill.unlocked) {
    return `未解锁 · 第 ${skill.unlockChapter || '-'} 章开启`;
  }
  if (skill.canUpgrade) {
    return `已拥有 · 可升级 · 当前经验 ${skill.exp}/${skill.nextUpgradeNeed || '-'}`;
  }
  if (skill.owned) {
    return `已拥有 · ${skill.stars} 星 · 等级 ${skill.level}`;
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
      return skill.canUpgrade;
    case 'locked':
      return !skill.unlocked;
    default:
      return true;
  }
}

export default class SkillScene extends BaseScene {
  constructor() {
    super('SkillScene');
    this.selectedFilter = 'all';
    this.selectedSkillId = null;
    this.skillsPayload = null;
    this.filterButtons = [];
    this.listItems = [];
  }

  create() {
    this.addBackground('skill');
    this.addTopBar('功法列表', '优先读取后端接口；接口未就绪时明确提示');

    const player = getCurrentPlayer();
    createAvatar(this, 86, 150, 68, '侠');
    makeThemeText(this, 160, 136, player.nickname || player.name || '少侠', {
      fontSize: '26px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    makeLabel(this, 160, 172, player.account || '未登录账号', {
      fontSize: '14px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);

    this.summaryPanel = drawRoundedPanel(this, 375, 250, 648, 150, 0x0b1220, 0.86, 0xffffff, 0.08, 28);
    this.summaryStatus = makeThemeText(this, 170, 242, '加载中', {
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.summaryStatus.setOrigin(0.5);
    makeLabel(this, 170, 202, '接口状态', { fontSize: '15px', color: '#94a3b8' });
    makeLabel(this, 375, 202, '已解锁 / 总数', { fontSize: '15px', color: '#94a3b8' });
    this.summaryUnlocked = makeThemeText(this, 375, 242, '-- / --', {
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    makeLabel(this, 580, 202, '可升级', { fontSize: '15px', color: '#94a3b8' });
    this.summaryUpgradeable = makeThemeText(this, 580, 242, '--', {
      fontSize: '30px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });

    drawRoundedPanel(this, 220, 846, 296, 878, 0x0f172a, 0.92, 0xffffff, 0.06, 26);
    drawRoundedPanel(this, 534, 846, 332, 878, 0x0f172a, 0.92, 0xffffff, 0.06, 26);
    makeThemeText(this, 102, 346, '筛选', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.renderFilterButtons();
    this.listState = makeLabel(this, 220, 500, '正在读取功法列表...', {
      fontSize: '18px',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: 220 },
    });
    this.retryButton = createButton(this, 220, 562, 180, 60, '重新加载', 0x1d4ed8, 0x7dd3fc, () => {
      this.loadSkills();
    });
    this.retryButton.container.setVisible(false);

    this.detailTitle = makeThemeText(this, 534, 360, '等待功法数据', {
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    this.detailMeta = makeLabel(this, 534, 410, '后端接口返回后会展示真实功法。', {
      fontSize: '16px',
      color: '#94a3b8',
      wordWrap: { width: 280 },
      align: 'center',
    });
    this.detailDesc = makeLabel(this, 534, 520, '', {
      fontSize: '17px',
      color: '#cbd5e1',
      wordWrap: { width: 280 },
      align: 'center',
      lineSpacing: 10,
    });
    this.detailStatus = makeLabel(this, 534, 676, '', {
      fontSize: '16px',
      color: '#7dd3fc',
      wordWrap: { width: 280 },
      align: 'center',
      lineSpacing: 10,
    });
    this.detailExtra = makeLabel(this, 534, 826, '', {
      fontSize: '15px',
      color: '#94a3b8',
      wordWrap: { width: 280 },
      align: 'center',
      lineSpacing: 10,
    });
    this.detailFooter = makeLabel(this, 534, 1094, '当前页不生成假功法数据。', {
      fontSize: '15px',
      color: '#94a3b8',
      wordWrap: { width: 280 },
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

      if (tab === 'role' || tab === 'shop') {
        this.setFooterFeedback('暂未开放');
      }
    });

    this.footerFeedback = makeLabel(this, 375, 1560, '功法页将优先消费后端接口。', {
      fontSize: '14px',
      color: '#94a3b8',
    });

    this.loadSkills();
  }

  renderFilterButtons() {
    FILTERS.forEach((filter, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const x = 120 + col * 100;
      const y = 400 + row * 54;
      const button = createButton(this, x, y, 82, 38, filter.label, 0x111827, 0x475569, () => {
        this.selectedFilter = filter.key;
        this.renderSkillList();
      });
      button.label.setFontSize('16px');
      this.filterButtons.push({ ...button, key: filter.key });
    });
    this.updateFilterButtons();
  }

  updateFilterButtons() {
    this.filterButtons.forEach((button) => {
      const active = button.key === this.selectedFilter;
      button.bg.setFillStyle(active ? 0x1d4ed8 : 0x111827, 1);
      button.bg.setStrokeStyle(2, active ? 0x7dd3fc : 0x475569, active ? 0.72 : 0.4);
    });
  }

  clearSkillList() {
    this.listItems.forEach((item) => item.destroy());
    this.listItems = [];
  }

  async loadSkills() {
    const player = getCurrentPlayer();
    this.summaryStatus.setText('加载中');
    this.summaryUnlocked.setText('-- / --');
    this.summaryUpgradeable.setText('--');
    this.listState.setVisible(true);
    this.listState.setText('正在读取功法列表...');
    this.retryButton.container.setVisible(false);
    this.clearSkillList();
    this.setDetailPlaceholder('等待功法数据', '后端接口返回后会展示真实功法。', '', '', '当前页不生成假功法数据。');

    try {
      this.skillsPayload = await fetchPlayerSkills(player.account);
      this.summaryStatus.setText('已接入');
      this.summaryUnlocked.setText(`${this.skillsPayload.summary.unlocked} / ${this.skillsPayload.summary.total}`);
      this.summaryUpgradeable.setText(String(this.skillsPayload.summary.upgradeable));
      this.renderSkillList();
      this.setFooterFeedback('功法数据已来自后端接口。');
    } catch (error) {
      this.skillsPayload = null;
      if (isInterfaceMissing(error)) {
        this.summaryStatus.setText('未就绪');
        this.listState.setText('`/api/player/skills` 接口尚未就绪。\n当前页不会伪造功法数据。');
        this.setDetailPlaceholder(
          '接口未就绪',
          '后端尚未提供功法列表接口。',
          '缺少页面：功法列表、详情、升级态的真实数据源。',
          '如果继续不处理，功法页只能保持接口待接状态，无法进入联调。',
          '建议后端先提交 `/api/player/skills` 到共享分支。',
        );
      } else {
        this.summaryStatus.setText('失败');
        this.listState.setText(`读取失败：${error.message}`);
        this.retryButton.container.setVisible(true);
        this.setDetailPlaceholder(
          '读取失败',
          '当前无法读取功法列表。',
          '可能原因：后端离线、账号异常或接口返回错误。',
          '如果继续不处理，功法页无法验证筛选和详情态。',
          '请先重试，若仍失败再检查后端日志。',
        );
      }
      this.summaryUnlocked.setText('-- / --');
      this.summaryUpgradeable.setText('--');
      this.setFooterFeedback(error.message);
    }
  }

  renderSkillList() {
    this.updateFilterButtons();
    this.clearSkillList();

    const skills = Array.isArray(this.skillsPayload?.skills)
      ? this.skillsPayload.skills.filter((skill) => matchesFilter(skill, this.selectedFilter))
      : [];

    if (!skills.length) {
      this.listState.setVisible(true);
      this.listState.setText(this.skillsPayload ? '当前筛选下没有可展示功法。' : '暂无功法数据。');
      return;
    }

    this.listState.setVisible(false);
    const selected = skills.find((skill) => skill.id === this.selectedSkillId) || skills[0];
    this.selectedSkillId = selected.id;
    this.renderDetail(selected);

    skills.slice(0, 6).forEach((skill, index) => {
      const y = 546 + index * 112;
      const active = skill.id === this.selectedSkillId;
      const bg = this.add.rectangle(220, y, 238, 92, active ? 0x1d4ed8 : 0x111827, 1)
        .setStrokeStyle(2, skill.unlocked ? 0x7dd3fc : 0x475569, active ? 0.72 : 0.28);
      const name = this.add.text(108, y - 16, skill.name || `功法 ${skill.id}`, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '20px',
        color: skill.unlocked ? '#f8fafc' : '#94a3b8',
        fontStyle: active ? 'bold' : 'normal',
      }).setOrigin(0, 0.5);
      const meta = this.add.text(108, y + 10, buildSkillMeta(skill), {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '13px',
        color: '#cbd5e1',
      }).setOrigin(0, 0.5);
      const status = this.add.text(108, y + 32, buildSkillStatus(skill), {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: skill.canUpgrade ? '#86efac' : '#94a3b8',
      }).setOrigin(0, 0.5);
      const hit = this.add.rectangle(220, y, 238, 92, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.selectedSkillId = skill.id;
        this.renderSkillList();
      });
      this.listItems.push(bg, name, meta, status, hit);
    });
  }

  renderDetail(skill) {
    this.detailTitle.setText(skill.name || '未命名功法');
    this.detailMeta.setText(buildSkillMeta(skill));
    this.detailDesc.setText(skill.desc || '当前配置未提供额外说明。');
    this.detailStatus.setText([
      `状态：${skill.unlocked ? '已开放' : '未解锁'}`,
      `拥有：${skill.owned ? '是' : '否'}`,
      `等级：${skill.level}`,
      `星级：${skill.stars}`,
    ].join('\n'));
    this.detailExtra.setText([
      `效果类型：${skill.powerType || '-'}`,
      `效果参数：${(skill.powerRate || []).join(' / ') || '-'}`,
      `升级条件：${(skill.upgradeCond || []).join(' / ') || '-'}`,
      `设计标签：${skill.designTag || '-'}`,
    ].join('\n'));
    this.detailFooter.setText(skill.canUpgrade
      ? `当前经验 ${skill.exp} 已达到下一次升级条件 ${skill.nextUpgradeNeed}。`
      : skill.unlocked
        ? `当前经验 ${skill.exp}，下一升级需求 ${skill.nextUpgradeNeed || '-'}。`
        : `第 ${skill.unlockChapter || '-'} 章后可解锁。`);
  }

  setDetailPlaceholder(title, meta, desc, extra, footer) {
    this.detailTitle.setText(title);
    this.detailMeta.setText(meta);
    this.detailDesc.setText(desc);
    this.detailStatus.setText(extra);
    this.detailExtra.setText('');
    this.detailFooter.setText(footer);
  }

  setFooterFeedback(message) {
    this.footerFeedback.setText(message);
  }
}
