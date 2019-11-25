import {WGS84} from "../config/WGS84";

/**
 * Geo数学工具类
 */
const GeoMath = {
    /**
     * 经纬度转笛卡尔坐标（弧度）
     * @param {THREE.Vector3} lonlat 经纬度（弧度）、海拔
     * @param {THREE.Vector3} xyz 笛卡尔坐标
     */
    lonlatToXYZ(lonlat, xyz = new THREE.Vector3()) {
        xyz.setFromSphericalCoords(WGS84.a, lonlat.x, lonlat.y);
        return xyz;
    },

    /**
     * 笛卡尔坐标转经纬度（弧度）
     * @param {THREE.Vector3} xyz 笛卡尔坐标
     * @param {THREE.Vector3} lonlat 经纬度（弧度）、海拔
     */
    xyzToLonlat(xyz, lonlat) {
        let lon = -Math.sign(xyz.z) * Math.acos(xyz.x / Math.sqrt(xyz.x ** 2 + xyz.z ** 2));
        let lat = Math.atan(xyz.y / Math.sqrt(xyz.x ** 2 + xyz.z ** 2));
        let alt = Math.sqrt(xyz.x ** 2 + xyz.y ** 2 + xyz.z ** 2) - WGS84.a;

        return lonlat.set(
            lon,
            lat,
            alt,
        );
    },

    /**
     * 层级转海拔
     * @param {Number} zoom 层级
     */
    zoomToAlt(zoom) {
        return 7820683 / 2 ** (zoom - 3);
    },

    /**
     * 海拔转层级
     * @param {Number} alt 海拔
     */
    altToZoom(alt) {
        return Math.log2(7820683 / alt) + 3;
    },

    /**
     * 墨卡托投影反算（弧度）
     * @param {Number} y 墨卡托投影Y坐标
     * @see https://github.com/d3/d3-geo/blob/master/src/projection/mercator.js
     */
    mercatorLatInvert: function (y) {
        return 2 * Math.atan(Math.exp(y)) - Math.PI / 2;
    },

    /**
     * 计算两个经纬度之间距离(弧度)
     * @param {*} lon1 经度1(弧度)
     * @param {*} lat1 纬度1(弧度)
     * @param {*} lon2 经度2(弧度)
     * @param {*} lat2 纬度2(弧度)
     * @see https://www.xuebuyuan.com/2173606.html
     */
    getDistance(lon1, lat1, lon2, lat2) {
        return 2 * WGS84.a * Math.asin(Math.sqrt(Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)));
    }
}

export {GeoMath};