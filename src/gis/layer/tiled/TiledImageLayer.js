import {ImageLayer} from "../ImageLayer";
import {TileCache} from "../../tile/TileCache";

/**
 * 图片瓦片图层（谷歌、必应瓦片图层基类）
 */
class TiledImageLayer extends ImageLayer {
    constructor(globe) {
        super(globe);

        this.cache = new TileCache();
    }

    /**
     * 返回下载图片的url（由子类实现）
     * @param x
     * @param y
     * @param z
     * @returns {null}
     */
    getUrl(x, y, z) {
        return null;
    }

    /**
     * 获取图片数据
     * @param {*} x
     * @param {*} y
     * @param {*} z
     */
    get(x, y, z) {
        // 图片缓存
        let img = this.cache.get(x, y, z);
        if (img && img.loaded) {
            return img;
        }

        if (img && (img.loading || img.error)) {
            return null;
        }

        if (this.globe.thread < this.globe.options.maxThread) {
            this._createImage(x, y, z);
        }

        return null;
    }

    // 创建图片
    _createImage(x, y, z) {
        let url = this.getUrl(x, y, z);

        if (!url) {
            console.warn(`TiledImageLayer: url is not defined.`);
            return null;
        }

        let img = document.createElement('img');

        img._x = x;
        img._y = y;
        img._z = z;
        img.crossOrigin = 'anonymous';
        img.loading = true;

        this.cache.set(x, y, z, img);

        img.onload = () => {
            img.onload = null;
            img.onerror = null;

            img.loaded = true;
            delete img.loading;

            // 避免下载过程中，切换地图，导致报错。
            if (this.globe) {
                this.globe.thread--;
            }
        };

        img.onerror = () => {
            img.onload = null;
            img.onerror = null;

            img.error = true;
            delete img.loading;

            if (this.globe) {
                this.globe.thread--;
            }
        };

        img.src = url;
        this.globe.thread++;
    }
}

export {TiledImageLayer};