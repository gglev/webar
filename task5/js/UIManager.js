export class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('ar-ui');
    this.statusEl = document.getElementById('status-msg');
    this.rotationButton = document.getElementById('btn-rotate');
    // DOM click propagation and XR select are separate event streams.
    this.container.addEventListener('beforexrselect', event => event.preventDefault());
    this.container.addEventListener('click', event => event.stopPropagation());
    document.getElementById('btn-color').addEventListener('click', () => callbacks.onChangeColor());
    this.rotationButton.addEventListener('click', () => this.setRotating(callbacks.onToggleRotate()));
    document.getElementById('btn-model').addEventListener('click', () => callbacks.onSwitchModel());
  }
  setRotating(active) {
    this.rotationButton.classList.toggle('active', active);
    this.rotationButton.setAttribute('aria-pressed', String(active));
  }
  setStatus(text) { this.statusEl.textContent = text; }
  showUI(visible) { this.container.style.display = visible ? 'flex' : 'none'; }
}
