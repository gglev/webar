import { UIManager } from './UIManager.js';
import { ARScene } from './ARScene.js';

window.addEventListener('DOMContentLoaded', () => {
  let sceneInstance = null;

  const uiManager = new UIManager({
    onChangeColor: () => sceneInstance.changeColor(),
    onToggleRotate: () => sceneInstance.toggleRotation(),
    onSwitchModel: () => sceneInstance.switchModel()
  });

  sceneInstance = new ARScene(uiManager);
});
