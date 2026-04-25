import BaseScene from './BaseScene.js';
import {
  createAvatar,
  createBottomTabs,
  createButton,
  createPill,
  drawRoundedPanel,
  makeLabel,
  makeThemeText,
} from '../utils/ui.js';
import { getCurrentPlayer, getSession, refreshPlayerSession, selectCurrentChapter } from '../data/session.js';

function buildChapterSummary(chapter) {
  if (!chapter) {
    return '请稍候，正在向后端同步章节和玩家进度。';
  }

  const detailParts = [
    `关卡组 ${chapter.missionId || '-'}`,
    `关卡数 ${chapter.missionCount || '-'}`,
    `预计波次 ${chapter.totalWaveEstimate || '-'}`,
  ];
  return detailParts.join(' · ');
}

function buildChapterDetail(chapter) {
  if (!chapter) {
    return '等待章节数据返回';
  }

  const lines = [
    `章节名：${chapter.name || '未命名章节'}`,
    `推荐生命：${chapter.guessHeroLife ?? '-'}`,
    `推荐攻击：${chapter.guessHeroAtk ?? '-'}`,
    `普通波规则：${chapter.normalWaveRule || '-'}`,
  ];
  return lines.join('\n');
}

export default class HomeScene extends BaseScene {
  constructor() {
    super('HomeScene');
    this.selectedChapterId = null;
    this.feedbackTimer = null;
  }

  async create() {
    this.addBackground('home');
    this.addTopBar('章节页', '真实读取玩家资料和章节进度');
    this.renderFrame();
    await this.loadChapterOverview();
  }

  renderFrame() {
    createAvatar(this, 88, 152, 68, '侠');
    this.playerName = makeThemeText(this, 152, 138, '少侠', {
      fontSize: '28px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.playerMeta = makeLabel(this, 152, 176, '正在同步资料', {
      fontSize: '15px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);

    createButton(this, 618, 146, 110, 48, '调试', 0x111827, 0x94a3b8, () => {
      this.showFeedback('调试面板待下一轮接入。');
    });
    createButton(this, 646, 214, 128, 48, '切换账号', 0x111827, 0x94a3b8, () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    });

    drawRoundedPanel(this, 375, 434, 646, 168, 0x0b1220, 0.86, 0xffffff, 0.06, 30);
    makeLabel(this, 128, 366, '当前章节', {
      fontSize: '15px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);
    this.currentBadge = createPill(this, 118, 432, 104, 38, '加载中', 0x1d4ed8, '#dbeafe');
    this.chapterTitle = makeThemeText(this, 184, 428, '正在读取章节数据', {
      fontSize: '32px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.chapterSummary = makeLabel(this, 184, 474, '请稍候，正在向后端同步章节和玩家进度。', {
      fontSize: '16px',
      color: '#cbd5e1',
      wordWrap: { width: 430 },
    }).setOrigin(0, 0.5);

    drawRoundedPanel(this, 375, 804, 646, 514, 0x0f172a, 0.88, 0xffffff, 0.06, 30);
    makeThemeText(this, 106, 580, '章节列表', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    makeLabel(this, 375, 628, '当前已支持：加载中 / 失败重试 / 未解锁提示 / 章节切换同步。', {
      fontSize: '15px',
      color: '#94a3b8',
    });

    this.chapterListGroup = this.add.container(0, 0);
    this.sectionState = makeLabel(this, 375, 804, '章节加载中...', {
      fontSize: '18px',
      color: '#cbd5e1',
    });
    this.retryButton = createButton(this, 375, 870, 180, 64, '重新加载', 0x1d4ed8, 0x7dd3fc, () => {
      this.loadChapterOverview();
    });
    this.retryButton.container.setVisible(false);

    drawRoundedPanel(this, 375, 1298, 646, 250, 0x0b1220, 0.8, 0xffffff, 0.06, 30);
    this.chapterHint = makeLabel(this, 375, 1236, '已选中章节详情会显示在这里。', {
      fontSize: '16px',
      color: '#94a3b8',
    });
    this.chapterDetail = makeLabel(this, 375, 1304, '等待章节数据返回', {
      fontSize: '20px',
      color: '#f8fafc',
      wordWrap: { width: 520 },
      align: 'center',
    });
    this.chapterWarning = makeLabel(this, 375, 1376, '', {
      fontSize: '16px',
      color: '#fde68a',
      wordWrap: { width: 520 },
      align: 'center',
    });

    this.startButton = createButton(this, 375, 1470, 352, 82, '开始战斗', 0x2563eb, 0x7dd3fc, () => {
      if (!this.selectedChapter?.unlocked) {
        this.showFeedback('该章节尚未解锁。');
        return;
      }
      this.scene.start('BattleScene');
    });

    this.feedbackText = makeLabel(this, 375, 1544, '', {
      fontSize: '15px',
      color: '#94a3b8',
    });

    createBottomTabs(this, 'chapter', (tab) => {
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
    this.playerMeta.setText(player.account ? `${player.account} · 正在读取最新章节进度` : '尚未登录');
    this.sectionState.setVisible(true);
    this.sectionState.setText('章节加载中...');
    this.retryButton.container.setVisible(false);
    this.clearChapterCards();

    try {
      await refreshPlayerSession(player.account);
      this.renderChapterOverview();
    } catch (error) {
      this.sectionState.setText(`加载失败：${error.message}`);
      this.retryButton.container.setVisible(true);
      this.chapterTitle.setText('章节读取失败');
      this.chapterSummary.setText('请确认后端已启动、账号已存在，或者点击下方按钮重试。');
      this.currentBadge.list[1].setText('失败');
      this.chapterDetail.setText('当前无法读取章节列表。\n如果后端离线，这属于接口失败；如果后端在线但无章节配置，这会在下一步显示为空数据。');
      const backend = getSession().backend;
      this.chapterWarning.setText(backend.ready ? '后端在线，但当前请求未成功，请检查账号或接口返回。' : `后端不可用：${backend.message}`);
    }
  }

  renderChapterOverview() {
    const session = getSession();
    const overview = session.chapterOverview;
    const player = getCurrentPlayer();
    const chapters = Array.isArray(overview?.chapters) ? overview.chapters : [];

    this.playerName.setText(player.nickname || player.name || '少侠');
    this.playerMeta.setText(`${player.account} · 已解锁至第 ${player.highestUnlockedChapterId || 1} 章`);

    if (!chapters.length) {
      this.sectionState.setVisible(true);
      this.sectionState.setText('暂无章节配置，请检查服务端配置。');
      this.chapterTitle.setText('无可用章节');
      this.chapterSummary.setText('后端未返回有效章节配置，当前无法进入战斗。');
      this.currentBadge.list[1].setText('空数据');
      this.chapterDetail.setText('暂无章节配置，请检查 `/api/config/chapter`。');
      this.chapterWarning.setText('这是 README 约定的空态：前端不生成假章节。');
      this.startButton.container.setAlpha(0.5);
      return;
    }

    this.sectionState.setVisible(false);
    this.selectedChapterId = this.selectedChapterId && chapters.some((item) => Number(item.id) === Number(this.selectedChapterId))
      ? this.selectedChapterId
      : overview.currentChapterId;
    this.renderChapterCards(chapters);
    this.selectChapter(this.selectedChapterId, { silent: true });
  }

  clearChapterCards() {
    this.chapterListGroup.removeAll(true);
  }

  renderChapterCards(chapters) {
    this.clearChapterCards();
    chapters.slice(0, 4).forEach((chapter, index) => {
      const y = 716 + index * 116;
      const isSelected = Number(chapter.id) === Number(this.selectedChapterId);
      const fill = chapter.unlocked ? (isSelected ? 0x1d4ed8 : 0x111827) : 0x0f172a;
      const alpha = chapter.unlocked ? 1 : 0.48;
      const bg = this.add.rectangle(375, y, 586, 92, fill, alpha)
        .setStrokeStyle(2, chapter.isCurrent ? 0xf59e0b : 0x475569, chapter.isCurrent ? 0.7 : 0.4);
      const title = this.add.text(112, y - 18, `第 ${chapter.id} 章 · ${chapter.name}`, {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '22px',
        color: '#f8fafc',
        fontStyle: chapter.isCurrent ? 'bold' : 'normal',
      }).setOrigin(0, 0.5);
      const meta = this.add.text(112, y + 16, chapter.unlocked ? (chapter.isCurrent ? '当前章节 · 可挑战' : '已解锁 · 点击切换') : '未解锁 · 通关上一章后开放', {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: chapter.unlocked ? '#cbd5e1' : '#94a3b8',
      }).setOrigin(0, 0.5);
      const tag = this.add.text(604, y, chapter.isCurrent ? '当前' : (chapter.unlocked ? '已解锁' : '未解锁'), {
        fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
        fontSize: '15px',
        color: chapter.isCurrent ? '#fef3c7' : '#e2e8f0',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(375, y, 586, 92, 0xffffff, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.selectChapter(chapter.id);
      });

      this.chapterListGroup.add([bg, title, meta, tag, hit]);
    });
  }

  async selectChapter(chapterId, options = {}) {
    const session = getSession();
    const chapters = session.chapterOverview?.chapters || [];
    const chapter = chapters.find((item) => Number(item.id) === Number(chapterId));
    if (!chapter) {
      return;
    }

    this.selectedChapterId = Number(chapter.id);
    this.selectedChapter = chapter;
    this.chapterTitle.setText(`第 ${chapter.id} 章 · ${chapter.name}`);
    this.chapterSummary.setText(buildChapterSummary(chapter));
    this.currentBadge.list[1].setText(chapter.isCurrent ? '当前章节' : (chapter.unlocked ? '已解锁' : '未解锁'));
    this.chapterDetail.setText(chapter.unlocked
      ? `${buildChapterDetail(chapter)}\n\n点击开始战斗会进入当前章节的战斗骨架页。`
      : `第 ${chapter.id} 章尚未解锁，当前账号最高只解锁到第 ${session.chapterOverview.highestUnlockedChapterId} 章。`);
    this.chapterWarning.setText(chapter.unlocked && Number(chapter.id) > Number(session.chapterOverview.currentChapterId)
      ? `推荐战力：生命 ${chapter.guessHeroLife ?? '-'} / 攻击 ${chapter.guessHeroAtk ?? '-'}。当前版本不强拦截，仍允许进入挑战。`
      : '');
    this.startButton.bg.setFillStyle(chapter.unlocked ? 0x2563eb : 0x334155, 1);
    this.startButton.label.setText(chapter.unlocked ? '开始战斗' : '尚未解锁');
    this.renderChapterCards(chapters);

    if (options.silent || chapter.isCurrent || !chapter.unlocked) {
      if (!chapter.unlocked) {
        this.showFeedback('该章节尚未解锁。');
      }
      return;
    }

    this.showFeedback('正在同步当前章节...');
    try {
      await selectCurrentChapter(chapter.id);
      this.showFeedback(`当前章节已切换到第 ${chapter.id} 章。`);
      this.renderChapterOverview();
    } catch (error) {
      this.showFeedback(`章节切换失败：${error.message}`);
    }
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
