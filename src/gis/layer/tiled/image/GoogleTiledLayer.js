import {TiledImageLayer} from "../TiledImageLayer";

// 地图类型
const layerType = {
    m: 'm', // 路线图
    t: 't', // 地形图
    p: 'p', // 带标签的地形图
    s: 's', // 卫星图
    y: 'y', // 带标签的卫星图
    h: 'h', // 标签层（路名、地名等）
}

class GoogleTiledLayer extends TiledImageLayer {
    constructor(globe) {
        super(globe);

        this.type = layerType.m;
        this.scale = 3;     // 瓦片地图清晰度（谷歌地图1-4）
        this.lang = 'cn';
        this.name = 'google';
    }

    getUrl(x, y, z) {
        return `http://www.google.cn/maps/vt?lyrs=m&gl=${this.lang}&scale=${this.scale}&x=${x}&y=${y}&z=${z}`;
    }
}

export {GoogleTiledLayer};