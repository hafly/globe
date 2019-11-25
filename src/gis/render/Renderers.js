import {TiledLayerRenderer} from "./TiledLayerRenderer";

/**
 * 所有渲染器（组合）
 */
class Renderers {
    constructor(globe) {
        this.renderers = [
            new TiledLayerRenderer(globe)
        ];
    }

    render() {
        this.renderers.forEach((item) => {
            item.render();
        });
    }

    dispose() {
        this.renderers.forEach((item) => {
            item.dispose();
        });
    }
}

export {Renderers};