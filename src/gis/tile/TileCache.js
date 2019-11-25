/**
 * 瓦片缓存
 */
class TileCache {
    constructor() {
        this.cache = new Map();
    }

    get(x, y, z) {
        let cache = this.cache.get(z);

        if (!cache) {
            return cache;
        }

        cache = cache.get(y);

        if (!cache) {
            return cache;
        }

        return cache.get(x);
    }

    set(x, y, z, data) {
        let zcache = this.cache.get(z);

        if (!zcache) {
            zcache = new Map();
            this.cache.set(z, zcache);
        }

        let ycache = zcache.get(y);

        if (!ycache) {
            ycache = new Map();
            zcache.set(y, ycache);
        }

        ycache.set(x, data);
    }

    clear() {
        this.cache.clear();
    }
}

export {TileCache};