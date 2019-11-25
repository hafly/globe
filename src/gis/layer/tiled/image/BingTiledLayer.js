import {TiledImageLayer} from "../TiledImageLayer";

class BingTiledLayer extends TiledImageLayer {
    constructor(globe) {
        super(globe);

        this.name = 'bing';
    }

    getUrl(x, y, z) {
        // return `http://t0.ssl.ak.tiles.virtualearth.net/tiles/a${this._tileXYToQuadKey(x, y, z)}.jpeg?g=5793`;
    }

    _tileXYToQuadKey(tileX, tileY, levelOfDetail) {
        let quadKey = '';
        let digit;
        let mask;
        for (let i = levelOfDetail; i > 0; i--) {
            digit = '0';
            mask = 1 << (i - 1);
            if ((tileX & mask) != 0) {
                digit++;
            }
            if ((tileY & mask) != 0) {
                digit++;
                digit++;
            }
            quadKey += digit;
        }
        return quadKey;
    }
}

export {BingTiledLayer};