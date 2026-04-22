import BaseScene from './BaseScene.js';

export default class BootScene extends BaseScene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.addBackground('login');
    this.addTopBar('剑侠风云', '准备进入江湖');
    this.time.delayedCall(80, () => {
      this.scene.start('LoginScene');
    });
  }
}
