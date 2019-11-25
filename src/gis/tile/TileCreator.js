/**
 * 瓦片创建者（基类）
 */

class TileCreator {
    constructor(globe) {
        this.globe = globe;
        this.option = this.globe.option;
        this.camera = this.globe.camera;
        this.renderer = this.globe.renderer;
    }

    get(tiles) {
        return tiles;
    }

    dispose() {
        delete this.globe;
        delete this.options;
        delete this.camera;
        delete this.renderer;
    }
}

export {TileCreator};