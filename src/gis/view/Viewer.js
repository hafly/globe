import {WGS84} from "../config/WGS84";

/**
 * 视图（基类）
 * @param {*} camera 相机
 * @param {*} domElement dom元素
 */
class Viewer {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;

        this.camera.far = WGS84.a * 2.4;
        this.camera.updateProjectionMatrix();
    }

    // 更新视图，子类实现
    update() {

    }

    dispose() {
        delete this.camera;
        delete this.domElement;
    }
}

export {Viewer};