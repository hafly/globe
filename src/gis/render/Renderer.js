/**
 * 渲染器（基类）
 */
class Renderer {
    constructor(globe) {
        this.globe = globe;

        this.camera = this.globe.camera;
        this.renderer = this.globe.renderer;
        this.gl = this.renderer.getContext();
    }

    /**
     * 执行渲染（由子类实现）
     * @param layer
     */
    render(layer) {

    }

    dispose() {
        delete this.camera;
        delete this.renderer;
        delete this.gl;
        delete this.globe;
    }
}

export {Renderer};