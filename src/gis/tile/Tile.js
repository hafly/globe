import {GeoMath} from "../math/GeoMath";

/**
 * 瓦片
 */
class Tile {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.images = [];

        this.box2 = this._getBox(x, y, z);
        this.center = this._getCenter(this.box2);
    }

    // 获取包围盒
    _getBox(x, y, z) {
        let size = Math.PI * 2 / 2 ** z;
        let minX = -Math.PI + size * x;
        let maxX = minX + size;
        let maxY = Math.PI - size * y;
        let minY = maxY - size;

        minY = GeoMath.mercatorLatInvert(minY);
        maxY = GeoMath.mercatorLatInvert(maxY);

        return new THREE.Box2(
            new THREE.Vector2(minX, minY),
            new THREE.Vector2(maxX, maxY),
        );
    }

    // 获取中心点
    _getCenter(box2) {
        let center = new THREE.Vector2();
        return box2.getCenter(center);
    }
}

export {Tile};