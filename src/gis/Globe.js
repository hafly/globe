import {Renderers} from "./render/Renderers";
import {OrbitViewer} from "./view/OrbitViewer";

import {GoogleTiledLayer} from "./layer/tiled/image/GoogleTiledLayer";
import {BingTiledLayer} from "./layer/tiled/image/BingTiledLayer";
import {AMapTiledLayer} from "./layer/tiled/image/AMapTiledLayer";

/**
 * 地球
 * @param {THREE.PerspectiveCamera} camera 相机
 * @param {THREE.WebGLRenderer} renderer 渲染器
 * @param {Object} options 配置
 */
class Globe extends THREE.Object3D {
    constructor(camera, renderer, options = {}) {
        super();

        this.name = 'Globe';
        this.type = 'Globe';

        this.camera = camera;
        this.renderer = renderer;
        this.options = options;

        this.thread = 0; // 当前线程总数
        options.maxThread = options.maxThread || 10;
        this.matrixAutoUpdate = false;

        this.globeLayers = [
            new GoogleTiledLayer(this)
        ];

        this.renderers = new Renderers(this);
        this.viewer = new OrbitViewer(this.camera, this.renderer.domElement);
    }

    // 需要由应用程序连续调用
    update() {
        this.renderers.render();
        this.viewer.update();
    }

    // 切换瓦片地图源
    switchMap(type) {
        switch (type) {
            case 'google':
                this.globeLayers[0] = new GoogleTiledLayer(this);
                break;
            case 'bing':
                this.globeLayers[0] = new BingTiledLayer(this);
                break;
            case 'amap':
                this.globeLayers[0] = new AMapTiledLayer(this);
            default:
                break;
        }
    }

    dispose() {
        this.renderers.dispose();
        this.viewer.dispose();

        this.globeLayers.forEach(n => {
            n.dispose();
        });

        delete this.globeLayers;
        delete this.renderers;
        delete this.viewer;

        delete this.camera;
        delete this.renderer;
    }
}

export {Globe};