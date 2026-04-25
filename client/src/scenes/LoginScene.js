import BaseScene from './BaseScene.js';
import {
  V0_COLORS,
  createV0Button,
  drawV0Panel,
  makeV0Text,
} from '../utils/v0ui.js';
import { getCurrentPlayer, getSession, refreshPlayerSession } from '../data/session.js';

export default class LoginScene extends BaseScene {
  async create() {
    this.addBackground('login');

    const { width } = this.scale;
    const player = getCurrentPlayer();
    const session = getSession();

    const statusText = makeV0Text(this, width / 2, 1516, '正在读取最新玩家资料...', {
      fontSize: '18px',
      color: 'rgba(255,255,255,0.72)',
    });

    try {
      if (player.account) {
        await refreshPlayerSession(player.account);
      }
      statusText.setText('资料已同步，可以继续进入游戏。');
    } catch (error) {
      statusText.setText(`资料同步失败：${error.message}`);
    }

    const effectivePlayer = getCurrentPlayer();

    makeV0Text(this, 375, 86, '游戏入口', {
      fontSize: '34px',
      fontStyle: '700',
      color: '#ffffff',
    });
    makeV0Text(this, 375, 126, 'V0 仅承接登录后的入口，不新增复杂活动入口', {
      fontSize: '20px',
      color: 'rgba(255,255,255,0.72)',
    });
    makeV0Text(this, 375, 248, '江湖风云起，一剑定乾坤', {
      fontSize: '26px',
      color: 'rgba(255,255,255,0.78)',
    });

    this.add.circle(375, 426, 116, 0xffffff, 0.1).setStrokeStyle(2, 0xffffff, 0.28);
    makeV0Text(this, 375, 446, '剑', {
      fontSize: '88px',
      fontStyle: '700',
      color: '#ffffff',
    });
    makeV0Text(this, 375, 690, '剑侠风云', {
      fontSize: '84px',
      fontStyle: '700',
      color: '#ffffff',
    });
    makeV0Text(this, 375, 742, 'Roguelike 武侠构筑原型', {
      fontSize: '28px',
      color: 'rgba(255,255,255,0.78)',
    });

    drawV0Panel(this, 375, 1255, 610, 250, {
      fill: V0_COLORS.panel,
      stroke: V0_COLORS.panelStroke,
      radius: 32,
    });
    makeV0Text(this, 112, 1194, '当前账号', {
      fontSize: '26px',
      fontStyle: '700',
      color: V0_COLORS.darkText,
    }).setOrigin(0, 0.5);
    makeV0Text(this, 112, 1238, effectivePlayer.account || '未登录账号', {
      fontSize: '24px',
      color: V0_COLORS.mutedText,
    }).setOrigin(0, 0.5);
    makeV0Text(this, 112, 1296, session.backend.ready
      ? `已解锁至第${effectivePlayer.highestUnlockedChapterId || 1}章，资料同步完成`
      : 'V0 原型阶段沿用现有账号登录流程', {
      fontSize: '22px',
      color: V0_COLORS.mutedText,
      wordWrap: { width: 470 },
    }).setOrigin(0, 0.5);

    createV0Button(this, 375, 1352, 526, 88, '进入游戏', 'primary', () => {
      this.scene.start('HomeScene');
    }, { fontSize: '28px' });
    createV0Button(this, 375, 1456, 526, 72, '切换账号', 'secondary', () => {
      if (typeof window.__openLegacyAuth === 'function') {
        window.__openLegacyAuth();
      }
    }, { fontSize: '28px' });
  }
}
