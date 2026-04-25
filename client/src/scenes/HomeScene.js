import BaseScene from './BaseScene.js';
import {
  V0_COLORS,
  createV0Avatar,
  createV0Button,
  createV0CardChip,
  createV0Pill,
  createV0Tabs,
  createV0VerticalCard,
  drawV0Panel,
  makeV0Text,
} from '../utils/v0ui.js';
import {
  getCurrentPlayer,
  getSession,
  refreshHomeOverview,
  refreshPlayerSession,
  selectCurrentChapter,
} from '../data/session.js';

function buildTopMeta(player, overview) {
  return overview?.display?.playerMeta || `${player.account || '未登录账号'} / 已解锁至第${player.highestUnlockedChapterId || 1}章`;
}

function buildChapterSummary(chapter) {
  if (!chapter) {
    return '章节加载中';
  }

  return [
    `${chapter.missionCount || 5} 层`,
    `${chapter.totalWaveEstimate || '-'} 波`,
    `推荐生命 ${chapter.guessHeroLife ?? '-'}`,
    `推荐攻击 ${chapter.guessHeroAtk ?? '-'}`,
  ].join(' / ');
}

function buildChapterStatus(chapter, overview) {
  if (!chapter) {
    return { tag: '加载中', hint: '请稍候，正在读取章节配置。' };
  }
  if (!chapter.unlocked) {
    return { tag: '未解锁', hint: '通关上一章后解锁' };
  }
  if (chapter.isCurrent) {
    return { tag: '当前章节', hint: '当前可直接进入战斗' };
  }

  const highest = overview?.highestUnlockedChapterId || 1;
  return {
    tag: '已解锁',
    hint: Number(chapter.id) > Number(highest) ? '推荐战力不足，仍可挑战' : '点击卡片可切换为当前预览章节',
  };
}

function buildChapterPreview(chapter) {
  if (!chapter) {
    return '读取中';
  }

  if (!chapter.unlocked) {
    return '等待解锁';
  }

  return chapter.name || `第${chapter.id}章`;
}

function buildHomeSummary(overview) {
  if (!overview) {
    return '正在同步首页摘要';
  }

  const currentTitle = overview?.currentChapter?.title || overview?.chapterOverview?.currentChapterTitle || '当前章节';
  const skillSummary = overview?.skillSummary || {};
  return `当前章节：${currentTitle} · 功法已解锁 ${skillSummary.unlocked ?? '-'} / ${skillSummary.total ?? '-'} · 可升级 ${skillSummary.upgradeable ?? '-'}`;
}

export default class HomeScene extends BaseScene {
  constructor() {
    super('HomeScene');
    this.selectedChapterId = null;
    this.feedbackTimer = null;
    this.homeOverview = null;
    this.cardNodes = [];
  }

  async create() {
    this.addBackground('home');
    this.renderFrame();
    await this.loadChapterOverview();
  }

  renderFrame() {
    const player = getCurrentPlayer();

    this.topPanel = drawV0Panel(this, 375, 250, 686, 180, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 32,
    });
    createV0Avatar(this, 116, 250, 46, '铁');
    this.playerName = makeV0Text(this, 182, 230, player.nickname || player.name || '少侠', {
      fontSize: '30px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    this.playerMeta = makeV0Text(this, 182, 272, '正在同步资料', {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    createV0Pill(this, 608, 236, 132, 52, 'V0 原型', {
      fill: 0xffe7a8,
      color: V0_COLORS.darkText,
      fontSize: '22px',
    });
    this.debugButton = createV0Button(this, 580, 294, 106, 42, '调试', 'muted', () => {
      this.showFeedback('调试面板待后续接入。');
    }, { radius: 16, fontSize: '20px' });
    this.switchButton = createV0Button(this, 660, 294, 112, 42, '切换账号', 'secondary', () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    }, { radius: 16, fontSize: '18px' });

    this.mainPanel = createV0VerticalCard(this, 375, 840, 686, 920, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 36,
    });
    makeV0Text(this, 72, 450, '章节选择', {
      fontSize: '34px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    this.mainSubtitle = makeV0Text(this, 72, 492, 'V0 开放章节读取与章节推进', {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);

    this.currentCard = this.add.container(0, 0);
    this.chapterList = this.add.container(0, 0);
    this.stateGroup = this.add.container(0, 0);
    this.feedbackText = makeV0Text(this, 375, 1400, '', {
      fontSize: '18px',
      color: '#fff5d6',
    });

    this.stateTitle = makeV0Text(this, 375, 838, '章节加载中', {
      fontSize: '32px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    });
    this.stateDesc = makeV0Text(this, 375, 890, '正在读取服务端章节配置', {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 440 },
    });
    this.retryButton = createV0Button(this, 375, 982, 220, 72, '重试', 'primary', () => {
      this.loadChapterOverview();
    }, { fontSize: '26px' });
    this.stateGroup.add([this.stateTitle, this.stateDesc, this.retryButton.container]);

    createV0Tabs(this, 'chapter', (tab) => {
      if (tab === 'skill') {
        this.scene.start('SkillScene');
        return;
      }

      if (tab === 'role' || tab === 'shop') {
        this.showFeedback('暂未开放');
      }
    });
  }

  async loadChapterOverview() {
    const player = getCurrentPlayer();
    this.playerName.setText(player.nickname || player.name || '少侠');
    this.playerMeta.setText(player.account ? `${player.account} / 正在同步章节进度` : '尚未登录');
    this.showState('章节加载中', '正在读取服务端章节配置');
    this.clearCards();

    try {
      await refreshPlayerSession(player.account);
      this.homeOverview = await refreshHomeOverview(player.account).catch(() => null);
      this.renderOverview();
    } catch (error) {
      const backend = getSession().backend;
      this.showState('章节加载失败', backend.ready ? '请检查网络或稍后重试' : backend.message, true);
      this.mainSubtitle.setText('当前无法进入章节主流程');
      this.playerMeta.setText(player.account ? `${player.account} / 资料同步失败` : '尚未登录');
      this.showFeedback(`章节加载失败：${error.message}`);
    }
  }

  renderOverview() {
    const player = getCurrentPlayer();
    const session = getSession();
    const overview = session.chapterOverview;
    const chapters = Array.isArray(overview?.chapters) ? overview.chapters : [];

    this.playerName.setText(player.nickname || player.name || '少侠');
    this.playerMeta.setText(buildTopMeta(player, this.homeOverview));
    this.mainSubtitle.setText(buildHomeSummary(this.homeOverview));

    if (!chapters.length) {
      this.showState('暂无章节配置', '请检查服务端章节配置后重试');
      return;
    }

    this.hideState();
    this.selectedChapterId = this.selectedChapterId && chapters.some((chapter) => Number(chapter.id) === Number(this.selectedChapterId))
      ? this.selectedChapterId
      : overview.currentChapterId;
    this.renderChapters(chapters);
  }

  renderChapters(chapters) {
    const current = chapters.find((chapter) => Number(chapter.id) === Number(this.selectedChapterId)) || chapters[0];
    this.selectedChapter = current;
    this.currentCard.removeAll(true);
    this.chapterList.removeAll(true);

    const currentBg = createV0VerticalCard(this, 375, 665, 606, 250, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 28,
      fillAlpha: current.unlocked ? 1 : 0.78,
      strokeAlpha: current.unlocked ? 1 : 0.7,
    });
    this.currentCard.add(currentBg);

    const status = buildChapterStatus(current, getSession().chapterOverview);
    const tagFill = current.unlocked ? 0xffe7a8 : 0xf4ece0;
    const tag = createV0Pill(this, 142, 582, 92, 40, status.tag, {
      fill: tagFill,
      fontSize: '18px',
      color: V0_COLORS.darkText,
      radius: 16,
    });
    const title = makeV0Text(this, 100, 636, `第${current.id}章 ${current.name || '未命名章节'}`, {
      fontSize: '30px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    const summary = makeV0Text(this, 100, 684, buildChapterSummary(current), {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    const preview = createV0VerticalCard(this, 518, 665, 220, 150, {
      fill: 0xede3d1,
      stroke: V0_COLORS.panelStroke,
      radius: 24,
    });
    const previewText = makeV0Text(this, 518, 675, buildChapterPreview(current), {
      fontSize: '34px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
      wordWrap: { width: 170 },
    });
    const hint = makeV0Text(this, 375, 792, status.hint, {
      fontSize: '18px',
      color: current.unlocked ? '#826a44' : '#9f6d65',
    });
    const startButton = createV0Button(this, 375, 856, 562, 84, current.unlocked ? '开始战斗' : '尚未解锁', current.unlocked ? 'primary' : 'muted', () => {
      this.handleStartBattle();
    }, { fontSize: '28px' });
    startButton.setEnabled(current.unlocked);
    this.currentCard.add([
      tag.container,
      title,
      summary,
      preview,
      previewText,
      hint,
      startButton.container,
    ]);

    const extraCards = chapters.filter((chapter) => Number(chapter.id) !== Number(current.id)).slice(0, 2);
    extraCards.forEach((chapter, index) => {
      const y = 1002 + index * 162;
      const alpha = chapter.unlocked ? 1 : 0.72;
      const card = createV0VerticalCard(this, 375, y, 606, 140, {
        fill: V0_COLORS.panel,
        stroke: V0_COLORS.panelStroke,
        radius: 28,
        fillAlpha: alpha,
        strokeAlpha: alpha,
      });
      const meta = buildChapterStatus(chapter, getSession().chapterOverview);
      const tagNode = createV0Pill(this, 142, y - 48, 92, 40, meta.tag, {
        fill: chapter.unlocked ? 0xffe7a8 : 0xf4ece0,
        fontSize: '18px',
        radius: 16,
      });
      const titleNode = makeV0Text(this, 100, y - 2, `第${chapter.id}章 ${chapter.name || '未命名章节'}`, {
        fontSize: '30px',
        fontStyle: '700',
        color: V0_COLORS.darkText,
      }).setOrigin(0, 0.5);
      const descNode = makeV0Text(this, 100, y + 46, chapter.unlocked
        ? `已解锁 / 推荐生命 ${chapter.guessHeroLife ?? '-'} / 攻击 ${chapter.guessHeroAtk ?? '-'}`
        : '通关上一章后解锁', {
        fontSize: '22px',
        color: V0_COLORS.mutedText,
      }).setOrigin(0, 0.5);
      const hit = this.add.zone(375, y, 606, 140).setOrigin(0.5);
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.selectChapter(chapter.id);
      });
      this.chapterList.add([card, tagNode.container, titleNode, descNode, hit]);
    });
  }

  async selectChapter(chapterId) {
    const overview = getSession().chapterOverview;
    const chapters = overview?.chapters || [];
    const chapter = chapters.find((item) => Number(item.id) === Number(chapterId));
    if (!chapter) {
      return;
    }

    if (!chapter.unlocked) {
      this.showFeedback('通关上一章后解锁');
      return;
    }

    this.selectedChapterId = Number(chapter.id);
    this.renderChapters(chapters);
    if (!chapter.isCurrent) {
      this.showFeedback(`已切换预览到第${chapter.id}章`);
    }
  }

  async handleStartBattle() {
    const chapter = this.selectedChapter;
    if (!chapter?.unlocked) {
      this.showFeedback('通关上一章后解锁');
      return;
    }

    try {
      if (!chapter.isCurrent) {
        await selectCurrentChapter(chapter.id);
        this.homeOverview = await refreshHomeOverview(getCurrentPlayer().account).catch(() => this.homeOverview);
      }
      this.scene.start('BattleScene');
    } catch (error) {
      this.showFeedback(`切换章节失败：${error.message}`);
    }
  }

  clearCards() {
    this.currentCard.removeAll(true);
    this.chapterList.removeAll(true);
  }

  showState(title, description, showRetry = false) {
    this.stateGroup.setVisible(true);
    this.stateTitle.setText(title);
    this.stateDesc.setText(description);
    this.retryButton.setVisible(showRetry);
  }

  hideState() {
    this.stateGroup.setVisible(false);
  }

  showFeedback(message) {
    this.feedbackText.setText(message);
    if (this.feedbackTimer) {
      this.feedbackTimer.remove(false);
    }
    this.feedbackTimer = this.time.delayedCall(2400, () => {
      this.feedbackText.setText('');
      this.feedbackTimer = null;
    });
  }
}
