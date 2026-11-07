import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { ResourceLoader } from './ResourceLoader.js';

export class ARScene {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 20);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');
    document.body.appendChild(this.renderer.domElement);
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(1, 2, 1);
    this.scene.add(light, new THREE.HemisphereLight(0xffffff, 0x334466, 1));
    this.material = new THREE.MeshStandardMaterial({color: 0x00aaff, roughness: 0.2, metalness: 0.8});
    this.geometries = {
      cube: new THREE.BoxGeometry(0.16, 0.16, 0.16),
      torus: new THREE.TorusGeometry(0.09, 0.035, 24, 64),
      cylinder: new THREE.CylinderGeometry(0.08, 0.08, 0.18, 32)
    };
    this.modelType = 'cube';
    this.isRotating = false;
    this.lastTime = null;
    this.session = null;
    this.hitTestSource = null;
    this.currentMesh = null;
    this.objectRoot = new THREE.Group();
    this.scene.add(this.objectRoot);
    this.reticle = new THREE.Mesh(new THREE.RingGeometry(0.08,0.1,32).rotateX(-Math.PI/2), new THREE.MeshBasicMaterial({color:0x00ffcc}));
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);
    const controller = this.renderer.xr.getController(0);
    controller.addEventListener('select', () => this.placeObject());
    this.scene.add(controller);
    const overlay = document.getElementById('overlay-container');
    overlay.appendChild(ARButton.createButton(this.renderer, {
      requiredFeatures: ['hit-test','dom-overlay'], domOverlay: {root:overlay}
    }));
    this.renderer.xr.addEventListener('sessionstart', () => this.startSession());
    this.renderer.xr.addEventListener('sessionend', () => this.endSession());
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    this.showPreview();
    this.resources = new ResourceLoader(this.renderer);
    this.resources.loadEnvironment(this.scene, '../task1/assets/environment.hdr').catch(error => {
      console.error('HDRI loading failed',error);
      this.uiManager.setStatus('HDRI не загрузилась. Обновите страницу; пока используется обычный свет.');
    });
    this.renderer.setAnimationLoop((t,frame) => this.render(t,frame));
  }
  createObject() {
    if (this.currentMesh) this.objectRoot.remove(this.currentMesh);
    this.currentMesh = new THREE.Mesh(this.geometries[this.modelType],this.material);
    this.objectRoot.add(this.currentMesh);
    this.adjustHeight();
  }
  adjustHeight() {
    this.currentMesh.geometry.computeBoundingBox();
    this.currentMesh.position.y = -this.currentMesh.geometry.boundingBox.min.y;
  }
  showPreview() {
    this.camera.position.set(0,0.2,0.65);
    this.camera.lookAt(0,0.07,0);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
    this.objectRoot.position.set(0,0,0);
    this.objectRoot.quaternion.identity();
    this.createObject();
    this.uiManager.showUI(true);
    this.uiManager.setStatus('3D-предпросмотр · Для размещения на поверхности нажмите START AR');
  }
  async startSession() {
    const session = this.renderer.xr.getSession();
    this.session = session;
    this.lastTime = null;
    this.isRotating = false;
    this.uiManager.setRotating(false);
    this.reticle.visible = false;
    if (this.currentMesh) this.objectRoot.remove(this.currentMesh);
    this.currentMesh = null;
    this.uiManager.showUI(false);
    this.uiManager.setStatus('Наведите камеру на пол или стол');
    try {
      const viewer = await session.requestReferenceSpace('viewer');
      if (this.session !== session) return;
      const source = await session.requestHitTestSource({space:viewer});
      if (this.session !== session) { source.cancel(); return; }
      this.hitTestSource = source;
    } catch(error) {
      if (this.session === session) this.uiManager.setStatus('Не удалось включить поиск поверхностей. Перезапустите AR.');
      console.error(error);
    }
  }
  endSession() {
    this.session = null;
    if (this.hitTestSource) { try {this.hitTestSource.cancel();} catch {} }
    this.hitTestSource = null;
    this.reticle.visible = false;
    this.isRotating = false;
    this.uiManager.setRotating(false);
    this.lastTime = null;
    this.showPreview();
  }
  placeObject() {
    if (!this.session || !this.reticle.visible) return;
    this.createObject();
    this.reticle.matrix.decompose(this.objectRoot.position,this.objectRoot.quaternion,this.objectRoot.scale);
    this.uiManager.showUI(true);
    this.uiManager.setStatus('Объект размещён · Кнопки меняют свойства, касание вне панели — положение');
  }
  changeColor() {
    this.material.color.setHex(Math.floor(Math.random()*0x1000000));
  }
  toggleRotation() {
    this.isRotating = !this.isRotating;
    return this.isRotating;
  }
  switchModel() {
    const types = Object.keys(this.geometries);
    this.modelType = types[(types.indexOf(this.modelType)+1)%types.length];
    if (this.currentMesh) {
      this.currentMesh.geometry = this.geometries[this.modelType];
      this.adjustHeight();
    }
  }
  render(timestamp,frame) {
    const dt = this.lastTime === null ? 0 : Math.min((timestamp-this.lastTime)/1000,0.1);
    this.lastTime = timestamp;
    if (this.currentMesh && this.isRotating) this.currentMesh.rotation.y += 1.2*dt;
    if (frame && this.hitTestSource) {
      const space = this.renderer.xr.getReferenceSpace();
      const hit = space && frame.getHitTestResults(this.hitTestSource)[0];
      const pose = hit && hit.getPose(space);
      this.reticle.visible = !!pose;
      if (pose) {
        this.reticle.matrix.fromArray(pose.transform.matrix);
        if (!this.currentMesh) this.uiManager.setStatus('Коснитесь поверхности, чтобы разместить объект');
      }
    }
    this.renderer.render(this.scene,this.camera);
  }
}
