import BaseScene from './BaseScene.js';
import { CHAPTERS } from '../data/gameData.js';
import { createAvatar, createBottomTabs, createButton, createPill, createProgressBar, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { getSavedPlayer } from '../utils/storage.js';

export default class HomeScene extends BaseScene {
  constructor() {
    super('HomeScene');
  }

  create() {
    this.addBackground('home');
    this.addTopBar('游戏主界面', '章节入口与局外养成');

    const player = getSavedPlayer();
    const selectedNotice = makeLabel(this, 375, 1328, '点击章节卡可切换预览，其他页签先保留入口。', {
      fontSize: '14px',
      color: '#94a3b8',
    });

    createAvatar(this, 86, 150, 68, '少');
    makeThemeText(this, 160, 136, player.nickname || player.name || '少侠', {
      fontSize: '26px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    makeLabel(this, 160, 172, player.account ? `账号 ${player.account}` : '本地存档已加载', {
      fontSize: '14px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);

    createButton(this, 646, 150, 128, 54, '切换账号', 0x111827, 0x94a3b8, () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    });

    const statLabels = [
      { title: '战力', value: '12,800' },
      { title: '生命', value: '6,540' },
      { title: '攻击', value: '1,280' },
    ];

    statLabels.forEach((item, index) => {
      const x = 160 + index * 180;
      drawRoundedPanel(this, x, 236, 156, 88, 0x0f172a, 0.9, 0xffffff, 0.06, 18);
      makeLabel(this, x, 212, item.title, { fontSize: '14px', color: '#94a3b8' });
      makeThemeText(this, x, 246, item.value, { fontSize: '27px', color: '#f8fafc', fontStyle: 'bold' });
    });

    drawRoundedPanel(this, 375, 620, 648, 554, 0x0b1220, 0.86, 0xffffff, 0.08, 30);
    makeLabel(this, 86, 392, '章节地图', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    const previewTitle = makeThemeText(this, 188, 548, '', {
      fontSize: '34px',
      color: '#f8fafc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    const previewPlace = makeLabel(this, 188, 594, '', {
      fontSize: '17px',
      color: '#7dd3fc',
    }).setOrigin(0, 0.5);
    const previewDesc = makeLabel(this, 188, 640, '', {
      fontSize: '16px',
      color: '#cbd5e1',
      wordWrap: { width: 246 },
    }).setOrigin(0, 0.5);

    const illustration = drawRoundedPanel(this, 550, 610, 202, 230, 0x111827, 0.95, 0x7dd3fc, 0.18, 28);
    const illustrationLabel = makeThemeText(this, 550, 594, '', {
      fontSize: '22px',
      color: '#f8fafc',
      fontStyle: 'bold',
    });
    const illustrationSub = makeLabel(this, 550, 638, '', {
      fontSize: '15px',
      color: '#cbd5e1',
    });

    const challengeText = makeLabel(this, 188, 730, '', {
      fontSize: '15px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);
    const recommendText = makeLabel(this, 188, 772, '', {
      fontSize: '15px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);
    const chapterStatText = makeThemeText(this, 188, 820, '', {
      fontSize: '20px',
      color: '#7dd3fc',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    const startBattleButton = createButton(this, 375, 942, 330, 84, '开始战斗', 0x2563eb, 0x7dd3fc, () => {
      selectedNotice.setText(`已选择 ${CHAPTERS[selectedIndex].place}，后续可接入关卡入口`);
    });

    const chapterButtons = [];
    let selectedIndex = 0;

    const updatePreview = (index) => {
      selectedIndex = index;
      const chapter = CHAPTERS[index];
      previewTitle.setText(`${chapter.name} · ${chapter.place}`);
      previewPlace.setText(`章节定位：${chapter.tone}`);
      previewDesc.setText(chapter.desc);
      illustrationLabel.setText(chapter.place);
      illustrationSub.setText(`共 ${chapter.layers} 层`);
      challengeText.setText(`挑战节奏：${chapter.challenge}`);
      recommendText.setText(`推荐基准：生命 ${chapter.recommendedLife} / 攻击 ${chapter.recommendedAtk}`);
      chapterStatText.setText(`守关 Boss：${chapter.boss}`);

      chapterButtons.forEach((button, buttonIndex) => {
        button.bg.setFillStyle(buttonIndex === selectedIndex ? 0x1d4ed8 : 0x111827, 1);
        button.bg.setStrokeStyle(2, buttonIndex === selectedIndex ? 0x7dd3fc : 0x94a3b8, buttonIndex === selectedIndex ? 0.5 : 0.18);
        button.label.setStyle({ color: buttonIndex === selectedIndex ? '#ffffff' : '#cbd5e1' });
      });
    };

    CHAPTERS.slice(0, 4).forEach((chapter, index) => {
      const x = 184 + index * 146;
      const y = 1110;
      const button = createButton(this, x, y, 132, 60, chapter.place, 0x111827, 0x94a3b8, () => updatePreview(index));
      chapterButtons.push(button);
    });

    createPill(this, 188, 880, 120, 38, '章节选择', 0x1d4ed8, '#eff6ff');
    createProgressBar(this, 188, 892, 260, 0.72, 0x22c55e, 0x334155);
    makeLabel(this, 458, 892, '层数进度 72%', {
      fontSize: '13px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);

    updatePreview(0);

    createBottomTabs(this, 'chapter', (tab) => {
      if (tab === 'skill') {
        this.scene.start('SkillScene');
        return;
      }

      if (tab === 'role') {
        selectedNotice.setText('角色页签预留，后续会接角色属性与局外养成。');
        return;
      }

      if (tab === 'shop') {
        selectedNotice.setText('功法商城页签预留，后续会接抽功法与重复分解。');
        return;
      }

      selectedNotice.setText(`当前停留在 ${CHAPTERS[selectedIndex].place}，可以继续开始战斗。`);
    });
  }
}
