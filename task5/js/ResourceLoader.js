import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export class ResourceLoader {
  constructor(renderer) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.pmrem.compileEquirectangularShader();
    this.environment = null;
  }
  async loadEnvironment(scene, url) {
    const hdr = await new RGBELoader().loadAsync(url);
    try {
      this.environment = this.pmrem.fromEquirectangular(hdr);
      scene.environment = this.environment.texture;
    } finally {
      hdr.dispose();
      this.pmrem.dispose();
    }
  }
}
