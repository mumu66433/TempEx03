import * as Phaser from 'phaser';
import { createAvatar, createBottomTabs, createButton, drawRoundedPanel, makeLabel, makeThemeText } from '../utils/ui.js';
import { getPlayerChapter, getChapterConfigs } from '../data/gameData.js';
import { getSavedPlayer } from '../utils/storage.js';

export default class HomeScene extends Phaser.Scene {
  constructor() {
    super('HomeScene');
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 1);
    this.add.rectangle(width / 2, height / 2, width - 2, height - 2, 0xffffff, 0).setStrokeStyle(1, 0xb3b3b3, 1);

    const player = getSavedPlayer();
    const chapters = getChapterConfigs();
    const currentChapter = getPlayerChapter(player, chapters) || chapters[0] || null;
    const chapterId = Number(currentChapter?.id) || 1;
    const chapterName = String(currentChapter?.name || '章节');
    const chapterLabel = `${chapterId}、${chapterName}`;

    makeThemeText(this, 8, 8, '游戏主界面', {
      fontSize: '30px',
      color: '#333333',
      fontStyle: 'bold',
    }).setOrigin(0, 0);

    createAvatar(this, 88, 151, 68, '头像');

    const chapterArt = drawRoundedPanel(this, 375, 924, 408, 408, 0xffffff, 1, 0x9a9a9a, 1, 0);
    const chapterArtText = makeThemeText(this, 375, 924, '游戏章节插图', {
      fontSize: '34px',
      color: '#333333',
      fontStyle: 'normal',
    });

    makeLabel(this, 375, 1074, chapterLabel, {
      fontSize: '28px',
      color: '#333333',
    });

    createButton(this, 375, 1244, 284, 100, '开始战斗', 0xffffff, 0x9a9a9a, () => {
      chapterArt.setFillStyle(0xffffff, 1);
      chapterArtText.setText('游戏章节插图');
    });

    createBottomTabs(this, 'chapter', (tab) => {
      if (tab === 'skill') {
        this.scene.start('SkillScene');
        return;
      }

      if (tab === 'role') {
        return;
      }

      if (tab === 'shop') {
        return;
      }
    });
  }
}
