import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class ARScene {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.reticle = null;
    this.hitTestSource = null;
    this.hitTestSourceRequested = false;

    this.currentMesh = null;
    this.isRotating = false;
    this.modelType = 'cube'; // 'cube' | 'torus' | 'cylinder'

    this.materials = {
      pbr: new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        roughness: 0.2,
        metalness: 0.8
      })
    };

    this.geometries = {
      cube: new THREE.BoxGeometry(0.16, 0.16, 0.16),
      torus: new THREE.TorusGeometry(0.09, 0.035, 24, 64),
      cylinder: new THREE.CylinderGeometry(0.08, 0.08, 0.18, 32)
    };

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Базовый свет
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(1, 2, 1);
    this.scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambLight);

    // Загрузка HDRI окружения для реалистичного PBR
    new RGBELoader()
      .setPath('https://threejs.org/examples/textures/equirectangular/')
      .load('royal_esplanade_1k.hdr', (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.environment = texture;
      });

    // Рендерер
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.xr.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // WebXR Button с поддержкой dom-overlay для UI поверх камеры
    const arButton = ARButton.createButton(this.renderer, {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay'],
      domOverlay: { root: document.getElementById('overlay-container') }
    });
    document.body.appendChild(arButton);

    // Hit-Test кольцо-прицел
    this.reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc })
    );
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    // Контроллер клика / тапа
    const controller = this.renderer.xr.getController(0);
    controller.addEventListener('select', () => this.placeObject());
    this.scene.add(controller);

    window.addEventListener('resize', () => this.onWindowResize());
    this.renderer.setAnimationLoop((t, f) => this.render(t, f));
  }

  placeObject() {
    if (this.reticle.visible) {
      if (this.currentMesh) {
        this.scene.remove(this.currentMesh);
      }

      this.currentMesh = new THREE.Mesh(this.geometries[this.modelType], this.materials.pbr);
      this.reticle.matrix.decompose(this.currentMesh.position, this.currentMesh.quaternion, this.currentMesh.scale);
      this.currentMesh.position.y += 0.09;
      this.scene.add(this.currentMesh);

      this.uiManager.showUI(true);
      this.uiManager.setStatus('Объект закреплён! Используйте кнопки снизу');
    }
  }

  changeColor() {
    if (this.currentMesh) {
      const randomColor = Math.floor(Math.random() * 16777215);
      this.materials.pbr.color.setHex(randomColor);
    }
  }

  toggleRotation() {
    this.isRotating = !this.isRotating;
    return this.isRotating;
  }

  switchModel() {
    const types = ['cube', 'torus', 'cylinder'];
    const nextIdx = (types.indexOf(this.modelType) + 1) % types.length;
    this.modelType = types[nextIdx];

    if (this.currentMesh) {
      this.currentMesh.geometry = this.geometries[this.modelType];
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(timestamp, frame) {
    if (this.currentMesh && this.isRotating) {
      this.currentMesh.rotation.y += 0.02;
    }

    if (frame) {
      const session = this.renderer.xr.getSession();
      const referenceSpace = this.renderer.xr.getReferenceSpace();

      if (!this.hitTestSourceRequested) {
        session.requestReferenceSpace('viewer').then((viewerSpace) => {
          session.requestHitTestSource({ space: viewerSpace }).then((source) => {
            this.hitTestSource = source;
          });
        });

        session.addEventListener('end', () => {
          this.hitTestSourceRequested = false;
          this.hitTestSource = null;
          this.uiManager.showUI(false);
          this.uiManager.setStatus('Нажмите START AR для запуска');
        });

        this.hitTestSourceRequested = true;
      }

      if (this.hitTestSource) {
        const hitTestResults = frame.getHitTestResults(this.hitTestSource);
        if (hitTestResults.length > 0) {
          const pose = hitTestResults[0].getPose(referenceSpace);
          this.reticle.visible = true;
          this.reticle.matrix.fromArray(pose.transform.matrix);
          if (!this.currentMesh) {
            this.uiManager.setStatus('Нажмите на экран для размещения');
          }
        } else {
          this.reticle.visible = false;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
