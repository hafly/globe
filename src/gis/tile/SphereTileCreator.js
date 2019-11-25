import {WGS84} from "../config/WGS84";
import {GeoMath} from "../math/GeoMath";
import {Tile} from "./Tile";
import {TileCreator} from "./TileCreator";

/**
 * 球形瓦片创建者
 */
class SphereTileCreator extends TileCreator {
    constructor(globe) {
        super(globe);

        this.cache = new Map();
        this.centerZoom = 0;
    }

    get(tiles) {
        tiles.length = 0;

        this.centerZoom = ~~GeoMath.altToZoom(this.camera.position.length() - WGS84.a);

        this.fork(0, 0, 1, tiles);
        this.fork(1, 0, 1, tiles);
        this.fork(0, 1, 1, tiles);
        this.fork(1, 1, 1, tiles);

        // 排序
        tiles = tiles.sort((a, b) => {
            if (a.z > b.z) {
                return 1;
            } else if (a.z < b.z) {
                return -1;
            } else {
                return 0;
            }
        });

        // 获取图层数据
        tiles.forEach(tile => {
            tile.images.length = 0;
            this.globe.globeLayers.forEach(n => {
                let image = n.get(tile.x, tile.y, tile.z);
                if (image) {
                    tile.images.push(image);
                }
            });
        });

        return tiles;
    }

    /**
     * 获取一个瓦片
     * @param {*} x
     * @param {*} y
     * @param {*} z
     */
    getTile(x, y, z) {
        let id = `${x}_${y}_${z}`;

        let tile = this.cache.get(id);

        if (!tile) {
            tile = new Tile(x, y, z);
            this.cache.set(id, tile);
        }

        return tile;
    }

    /**
     * 从1层级进行四分，返回满足要求的瓦片
     * @param {*} x
     * @param {*} y
     * @param {*} z
     * @param {*} tiles
     */
    fork(x, y, z, tiles) {
        let tile = this.getTile(x, y, z);

        if (!this.isVisible(tile)) {
            return;
        }

        tiles.push(tile);

        if (tile.z > this.centerZoom) {
            return;
        }

        this.fork(x * 2, y * 2, z + 1, tiles);
        this.fork(x * 2 + 1, y * 2, z + 1, tiles);
        this.fork(x * 2, y * 2 + 1, z + 1, tiles);
        this.fork(x * 2 + 1, y * 2 + 1, z + 1, tiles);
    }

    /**
     * 判断瓦片是否可见：
     * 1、材质上的底图已经下载完；
     * 2、当前视锥与该瓦片的包围盒相交。
     * @param {*} tile
     */
    isVisible(tile) {
        return this.globe.viewer.box2.intersectsBox(tile.box2);
    }

    dispose() {
        super.dispose();
        this.cache.clear();
    }
}

export {SphereTileCreator};