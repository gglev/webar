export class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('ar-ui');
    this.statusEl = document.getElementById('status-msg');
    this.init();
  }

  init() {
    document.getElementById('btn-color').addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onChangeColor();
    });

    document.getElementById('btn-rotate').addEventListener('click', (e) => {
      e.stopPropagation();
      const isRotating = this.callbacks.onToggleRotate();
      e.target.classList.toggle('active', isRotating);
    });

    document.getElementById('btn-model').addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onSwitchModel();
    });
  }

  setStatus(text) {
    if (this.statusEl) {
      this.statusEl.innerText = text;
    }
  }

  showUI(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'flex' : 'none';
    }
  }
}
