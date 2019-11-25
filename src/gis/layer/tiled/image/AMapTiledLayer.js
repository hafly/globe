import {TiledImageLayer} from "../TiledImageLayer";

class AMapTiledLayer extends TiledImageLayer {
    constructor(globe) {
        super(globe);

        this.name = 'amap';
    }

    getUrl(x, y, z) {
        return `https://webst04.is.autonavi.com/appmaptile?x=${x}&y=${y}&z=${z}&lang=zh_cn&scl=1&style=7`;
    }
}

export {AMapTiledLayer};