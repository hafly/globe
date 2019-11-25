(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.GLOBE = {}));
}(this, function (exports) { 'use strict';

	/**
	 * 渲染器（基类）
	 */
	class Renderer {
	    constructor(globe) {
	        this.globe = globe;

	        this.camera = this.globe.camera;
	        this.renderer = this.globe.renderer;
	        this.gl = this.renderer.getContext();
	    }

	    /**
	     * 执行渲染（由子类实现）
	     * @param layer
	     */
	    render(layer) {

	    }

	    dispose() {
	        delete this.camera;
	        delete this.renderer;
	        delete this.gl;
	        delete this.globe;
	    }
	}

	/**
	 * WGS84
	 * @see https://zhidao.baidu.com/question/535863620.html
	 */
	const WGS84 = {
	    // 长半轴
	    a: 6378137,

	    // 短半轴
	    b: 6356752.3142,

	    // 扁率
	    alpha: 1 / 298.2572236,

	    // 第一偏心率平方 = (a**2 - b**2) / a**2
	    e2_1: 0.00669437999013,

	    // 第二偏心率平方 = (a**2 - b**2) / b**2
	    e2_2: 0.006739496742227,
	};

	const _Math={
	    DEG2RAD: Math.PI / 180,
	    RAD2DEG: 180 / Math.PI,
	};

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
	};

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

	var TiledVertex = "precision highp float;\r\n\r\nattribute vec3 position;\r\nattribute vec3 normal;\r\nattribute vec2 uv;\r\n\r\nuniform mat4 modelMatrix;\r\nuniform mat4 viewMatrix;\r\nuniform mat4 projectionMatrix;\r\n\r\nuniform int x;\r\nuniform int y;\r\nuniform int z;\r\n\r\nvarying vec3 vNormal;\r\nvarying vec2 vUV;\r\n\r\n// 必应地图参数，纬度180是85.05112878的墨卡托投影\r\n#define EARTH_RADIUS 6378137.0\r\n#define MIN_LATITUDE -180.0\r\n#define MAX_LATITUDE 180.0\r\n#define MIN_LONGITUDE -180.0\r\n#define MAX_LONGITUDE 180.0\r\n#define PI 3.141592653589793\r\n\r\nvoid main() {\r\n    // 每个瓦片位置\r\n    float size = pow(2.0, float(z));\r\n    float dlon = (MAX_LONGITUDE - MIN_LONGITUDE) / size;\r\n    float dlat = (MAX_LATITUDE - MIN_LATITUDE) / size;\r\n\r\n    float left = MIN_LONGITUDE + dlon * float(x);\r\n    float top = MAX_LATITUDE - dlat * float(y);\r\n    float right = left + dlon;\r\n    float bottom = top - dlat;\r\n\r\n    // 瓦片上每个小格位置\r\n    // +0.5的原因是：position范围是-0.5到0.5\r\n    float lon = left + (right - left) * (0.5 + position.x);\r\n    float lat = top - (top - bottom) * (0.5 + position.y);\r\n\r\n    lon = lon * PI / 180.0;\r\n    lat = lat * PI / 180.0;\r\n\r\n    // 墨卡托投影反算\r\n    lat = 2.0 * atan(exp(lat)) - PI / 2.0;\r\n\r\n    vec3 transformed = vec3(\r\n        EARTH_RADIUS * cos(lat) * cos(lon),\r\n        EARTH_RADIUS * sin(lat),\r\n        -EARTH_RADIUS * cos(lat) * sin(lon)\r\n    );\r\n\r\n    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(transformed, 1.0);\r\n\r\n    vNormal = normal;\r\n    vUV = uv;\r\n}";

	var TiledFragment = "precision highp float;\r\n\r\nuniform sampler2D map;\r\n\r\nvarying vec2 vUV;\r\n\r\nvoid main() {\r\n    gl_FragColor = texture2D(map, vUV);\r\n}";

	/**
	 * 瓦片图层渲染器
	 */
	class TiledLayerRenderer extends Renderer {
	    constructor(globe) {
	        super(globe);

	        this.creator = new SphereTileCreator(this.globe);

	        this.geometry = new THREE.PlaneBufferGeometry(1, 1, 16, 16);
	        this.modelMatrix = new THREE.Matrix4();

	        this.program = null;
	        this.attributes = {};
	        this.uniforms = {};
	        this.buffers = {};

	        this.tiles = [];

	        this.initProgram();
	        this.initBuffers();
	    }

	    // 初始化着色器
	    initProgram() {
	        let gl = this.gl;

	        // 顶点着色器
	        let vertexShader = gl.createShader(gl.VERTEX_SHADER);
	        gl.shaderSource(vertexShader, TiledVertex);
	        gl.compileShader(vertexShader);

	        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
	            console.warn(gl.getShaderInfoLog(vertexShader));
	            gl.deleteShader(vertexShader);
	            return;
	        }

	        // 片源着色器
	        let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	        gl.shaderSource(fragmentShader, TiledFragment);
	        gl.compileShader(fragmentShader);

	        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
	            console.warn(gl.getShaderInfoLog(fragmentShader));
	            gl.deleteShader(fragmentShader);
	            return;
	        }

	        // 着色器程序
	        let program = gl.createProgram();
	        gl.attachShader(program, vertexShader);
	        gl.attachShader(program, fragmentShader);
	        gl.linkProgram(program);

	        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
	            console.warn("Could not initialise shaders");
	            gl.deleteProgram(program);
	            return;
	        }

	        // 使用着色器程序
	        gl.useProgram(program);
	        this.program = program;

	        // 获取attributes和uniform信息
	        Object.assign(this.attributes, {
	            position: gl.getAttribLocation(program, 'position'),
	            normal: gl.getAttribLocation(program, 'normal'),
	            uv: gl.getAttribLocation(program, 'uv'),
	        });

	        Object.assign(this.uniforms, {
	            modelMatrix: gl.getUniformLocation(program, 'modelMatrix'),
	            viewMatrix: gl.getUniformLocation(program, 'viewMatrix'),
	            projectionMatrix: gl.getUniformLocation(program, 'projectionMatrix'),
	            x: gl.getUniformLocation(program, 'x'),
	            y: gl.getUniformLocation(program, 'y'),
	            z: gl.getUniformLocation(program, 'z'),
	            map: gl.getUniformLocation(program, 'map'),
	        });
	    }

	    // 初始化缓冲区
	    initBuffers() {
	        let gl = this.gl;
	        let geometry = this.geometry;
	        let attributes = geometry.attributes;

	        let positionBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	        gl.bufferData(gl.ARRAY_BUFFER, attributes.position.array, gl.STATIC_DRAW);

	        let normalBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
	        gl.bufferData(gl.ARRAY_BUFFER, attributes.normal.array, gl.STATIC_DRAW);

	        let uvBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
	        gl.bufferData(gl.ARRAY_BUFFER, attributes.uv.array, gl.STATIC_DRAW);

	        let indexBuffer = gl.createBuffer();
	        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.index.array, gl.STATIC_DRAW);

	        Object.assign(this.buffers, {
	            position: positionBuffer,
	            normal: normalBuffer,
	            uv: uvBuffer,
	            index: indexBuffer,
	        });
	    }

	    render() {
	        this.creator.get(this.tiles);
	        this.renderMesh();
	        this.renderer.state.reset();
	    }

	    renderMesh() {
	        let gl = this.gl;
	        let camera = this.camera;

	        gl.useProgram(this.program);

	        gl.enable(gl.CULL_FACE);
	        gl.cullFace(gl.BACK);
	        gl.frontFace(gl.CW);

	        gl.enable(gl.DEPTH_TEST);
	        // gl.depthFunc(gl.LEQUAL);
	        // gl.depthMask(true);
	        gl.disable(gl.BLEND);

	        gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, this.modelMatrix.elements);
	        gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, camera.matrixWorldInverse.elements);
	        gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, camera.projectionMatrix.elements);

	        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
	        gl.enableVertexAttribArray(this.attributes.position);
	        gl.vertexAttribPointer(this.attributes.position, 3, gl.FLOAT, false, 0, 0);

	        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.normal);
	        gl.enableVertexAttribArray(this.attributes.normal);
	        gl.vertexAttribPointer(this.attributes.normal, 3, gl.FLOAT, false, 0, 0);

	        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.uv);
	        gl.enableVertexAttribArray(this.attributes.uv);
	        gl.vertexAttribPointer(this.attributes.uv, 2, gl.FLOAT, false, 0, 0);

	        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);

	        // x, y, z
	        this.tiles.forEach(tile => {
	            tile.images.forEach(n => {
	                gl.uniform1i(this.uniforms.x, n._x);
	                gl.uniform1i(this.uniforms.y, n._y);
	                gl.uniform1i(this.uniforms.z, n._z);

	                if (!n.texture) {
	                    let texture = gl.createTexture();
	                    gl.activeTexture(gl.TEXTURE0);
	                    gl.bindTexture(gl.TEXTURE_2D, texture);
	                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, n);

	                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	                    n.texture = texture;
	                }

	                gl.activeTexture(gl.TEXTURE0);
	                gl.bindTexture(gl.TEXTURE_2D, n.texture);
	                gl.uniform1i(this.uniforms.map, 0);

	                gl.drawElements(gl.TRIANGLES, this.geometry.index.count, gl.UNSIGNED_SHORT, 0);
	            });
	        });

	        gl.bindBuffer(gl.ARRAY_BUFFER, null);
	        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	        gl.bindTexture(gl.TEXTURE_2D, null);
	    }
	}

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

	/**
	 * 视图（基类）
	 * @param {*} camera 相机
	 * @param {*} domElement dom元素
	 */
	class Viewer {
	    constructor(camera, domElement) {
	        this.camera = camera;
	        this.domElement = domElement;

	        this.camera.far = WGS84.a * 2.4;
	        this.camera.updateProjectionMatrix();
	    }

	    // 更新视图，子类实现
	    update() {

	    }

	    dispose() {
	        delete this.camera;
	        delete this.domElement;
	    }
	}

	/**
	 * 操作视图
	 */
	class OrbitViewer extends Viewer {
	    constructor(camera, domElement) {
	        super(camera, domElement);

	        // 碰撞判断
	        this.isDown = false;
	        this.isPan = false;

	        this.sphere = new THREE.Sphere(undefined, WGS84.a);
	        this.intersectPoint = new THREE.Vector3(); // 碰撞点

	        // 包围盒
	        this.box2 = new THREE.Box2(
	            new THREE.Vector2(-Math.PI, -Math.PI / 2),
	            new THREE.Vector2(Math.PI, Math.PI / 2),
	        );

	        // 事件绑定
	        this.onMouseDown = this.onMouseDown.bind(this);
	        this.onMouseMove = this.onMouseMove.bind(this);
	        this.onMouseUp = this.onMouseUp.bind(this);
	        this.onMouseWheel = this.onMouseWheel.bind(this);

	        this.domElement.addEventListener('mousedown', this.onMouseDown);
	        this.domElement.addEventListener('mousemove', this.onMouseMove);
	        document.body.addEventListener('mouseup', this.onMouseUp);
	        this.domElement.addEventListener('mousewheel', this.onMouseWheel);

	        this.updateBox2();
	    }

	    setPosition(lon, lat, alt) {
	        let xyz = GeoMath.lonlatToXYZ(new THREE.Vector3(lon, lat, alt));
	        this.camera.position.copy(xyz);
	        this.camera.lookAt(new THREE.Vector3());
	    }

	    getPosition() {

	    }

	    update() {

	    }

	    dispose() {
	        super.dispose();
	        this.domElement.removeEventListener('mousedown', this.onMouseDown);
	        this.domElement.removeEventListener('mousemove', this.onMouseMove);
	        document.body.removeEventListener('mouseup', this.onMouseUp);
	        this.domElement.removeEventListener('mousewheel', this.onMouseWheel);
	    }
	}

	Object.assign(OrbitViewer.prototype, {
	    onMouseDown: function (event) {
	        this.isDown = true;
	        this.isPan = false;
	    },

	    onMouseMove: function (event) {
	        // 计算碰撞
	        let lastIntersectPoint = new THREE.Vector3();

	        // 计算旋转
	        let unit1 = new THREE.Vector3();
	        let unit2 = new THREE.Vector3();

	        // 旋转校正
	        let yAxis = new THREE.Vector3(0, 1, 0);
	        let minAngle = 30 * _Math.DEG2RAD;
	        let maxAngle = 150 * _Math.DEG2RAD;
	        let axis = new THREE.Vector3();

	        let startTime = 0;
	        let endTime = 0;

	        let quat = new THREE.Quaternion();
	        let dir1 = new THREE.Vector3();
	        let dir2 = new THREE.Vector3();

	        return function (event) {
	            if (!this.isDown) {
	                return;
	            }

	            // 1. 按下鼠标，第一次拖动
	            if (!this.isPan) {
	                if (!this.intersectSphere(event.offsetX, event.offsetY, this.intersectPoint)) { // 鼠标在地球外
	                    return;
	                }

	                this.isPan = true;
	                lastIntersectPoint.copy(this.intersectPoint);

	                startTime = new Date().getTime();
	                return;
	            }

	            // 2. 后续的拖动
	            if (!this.intersectSphere(event.offsetX, event.offsetY, this.intersectPoint)) { // 鼠标在地球外
	                return;
	            }

	            // 3. 计算碰撞点相对于地心旋转
	            unit1.copy(lastIntersectPoint).normalize();
	            unit2.copy(this.intersectPoint).normalize();
	            quat.setFromUnitVectors(unit2, unit1);

	            // 4. 计算相机相对于地心旋转
	            let distance = this.camera.position.length();
	            dir1.copy(this.camera.position).normalize();
	            dir2.copy(dir1);
	            dir2.applyQuaternion(quat).normalize();

	            // 5. 限制dir与y轴的夹角
	            let angle = dir2.angleTo(yAxis);

	            if (angle && Math.abs(angle) < minAngle) {
	                axis.crossVectors(dir2, yAxis);
	                axis.normalize();
	                dir2.copy(yAxis);
	                dir2.applyAxisAngle(axis, -minAngle);
	            }

	            if (angle && Math.abs(angle) > maxAngle) {
	                axis.crossVectors(dir2, yAxis);
	                axis.normalize();
	                dir2.copy(yAxis);
	                dir2.applyAxisAngle(axis, -maxAngle);
	            }

	            // 6. 校正碰撞点
	            quat.setFromUnitVectors(dir2, dir1);
	            unit2.copy(unit1);
	            unit2.applyQuaternion(quat);
	            this.intersectPoint.copy(unit2).multiplyScalar(WGS84.a);

	            // 7. 计算相机位置和旋转
	            this.camera.position.copy(dir2).multiplyScalar(distance);
	            this.camera.lookAt(this.sphere.center);

	            // 8. 计算旋转速度
	            endTime = new Date().getTime();

	            // if (endTime > startTime) {
	            //     this.rotationSpeed.subVectors(endLonLat, startLonLat)
	            //         .multiplyScalar(endTime - startTime);
	            // }

	            // 9. 更新旧碰撞点
	            lastIntersectPoint.copy(this.intersectPoint);
	        }
	    }(),

	    onMouseUp: function (event) {
	        this.isDown = false;
	        this.isPan = false;
	        this.updateBox2();
	    },

	    onMouseWheel: function (event) {
	        let dir = new THREE.Vector3();

	        return function (event) {
	            let delta = -event.wheelDelta;

	            let distance = dir.copy(this.camera.position).length();
	            dir.copy(this.camera.position).normalize();

	            if (distance < WGS84.a) {
	                distance = WGS84.a;
	            }

	            let d = delta * (distance - WGS84.a) / 1000;

	            let d_1 = GeoMath.zoomToAlt(2) + WGS84.a;

	            if (distance + d >= d_1) { // 最远2层级距离
	                d = 0;
	            }

	            let d_2 = GeoMath.zoomToAlt(18) + WGS84.a;

	            if (distance + d <= d_2) { // 最近18层级
	                d = 0;
	            }

	            this.camera.position.set(
	                this.camera.position.x + d * dir.x,
	                this.camera.position.y + d * dir.y,
	                this.camera.position.z + d * dir.z,
	            );

	            this.updateBox2();
	        }
	    }(),

	    /**
	     * 计算屏幕坐标与地球表面交点
	     * @param {float} x 屏幕坐标X
	     * @param {float} y 屏幕坐标Y
	     * @param {THREE.Vector3} intersectPoint 计算出的碰撞点
	     */
	    intersectSphere: function () {
	        let projectionMatrixInverse = new THREE.Matrix4();
	        let matrixWorld = new THREE.Matrix4();
	        let ray = new THREE.Ray();

	        return function (x, y, intersectPoint) {
	            if (!this.isPan) {
	                // 只在鼠标按下时，计算一次矩阵的原因是：1、提高性能 2、避免由于浮点数问题抖动。
	                projectionMatrixInverse.getInverse(this.camera.projectionMatrix);
	                matrixWorld.copy(this.camera.matrixWorld);
	            }

	            ray.origin.set(x / this.domElement.clientWidth * 2 - 1, -y / this.domElement.clientHeight * 2 + 1, 0.1,);

	            ray.direction.copy(ray.origin);
	            ray.direction.z = 1;

	            ray.origin.applyMatrix4(projectionMatrixInverse).applyMatrix4(matrixWorld);
	            ray.direction.applyMatrix4(projectionMatrixInverse).applyMatrix4(matrixWorld).sub(ray.origin).normalize();

	            return ray.intersectSphere(this.sphere, intersectPoint);
	        };
	    }(),

	    // 计算当前视野内的经纬度范围
	    updateBox2: function () {
	        let min = new THREE.Vector3();
	        let max = new THREE.Vector3();

	        return function () {
	            if (!this.intersectSphere(0, this.domElement.clientHeight, min)) { // 未发生碰撞
	                this.box2.min.set(-Math.PI, -Math.PI / 2);
	                this.box2.max.set(Math.PI, Math.PI / 2);
	                return;
	            }

	            this.intersectSphere(this.domElement.clientWidth, 0, max);

	            GeoMath.xyzToLonlat(min, min);
	            GeoMath.xyzToLonlat(max, max);

	            this.box2.min.copy(min);
	            this.box2.max.copy(max);
	        };
	    }()
	});

	/**
	 * 图层（图片图层基类）
	 */
	class Layer {
	    constructor(globe){
	        this.globe = globe;
	    }

	    /**
	     * 获取某个经纬度范围内的资源
	     * @param {THREE.Box2} box2
	     */
	    get(box2){

	    }

	    dispose(){
	        delete this.globe;
	    }
	}

	/**
	 * 图片图层（图片瓦片图层基类）
	 */
	class ImageLayer extends Layer{
	    constructor(globe){
	        super(globe);
	    }
	}

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

	// 地图类型
	const layerType = {
	    m: 'm', // 路线图
	    t: 't', // 地形图
	    p: 'p', // 带标签的地形图
	    s: 's', // 卫星图
	    y: 'y', // 带标签的卫星图
	    h: 'h', // 标签层（路名、地名等）
	};

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

	class AMapTiledLayer extends TiledImageLayer {
	    constructor(globe) {
	        super(globe);

	        this.name = 'amap';
	    }

	    getUrl(x, y, z) {
	        return `https://webst04.is.autonavi.com/appmaptile?x=${x}&y=${y}&z=${z}&lang=zh_cn&scl=1&style=7`;
	    }
	}

	/**
	 * 地球
	 * @param {THREE.PerspectiveCamera} camera 相机
	 * @param {THREE.WebGLRenderer} renderer 渲染器
	 * @param {Object} options 配置
	 */
	class Globe extends THREE.Object3D {
	    constructor(camera, renderer, options = {}) {
	        super();

	        this.name = 'Globe';
	        this.type = 'Globe';

	        this.camera = camera;
	        this.renderer = renderer;
	        this.options = options;

	        this.thread = 0; // 当前线程总数
	        options.maxThread = options.maxThread || 10;
	        this.matrixAutoUpdate = false;

	        this.globeLayers = [
	            new GoogleTiledLayer(this)
	        ];

	        this.renderers = new Renderers(this);
	        this.viewer = new OrbitViewer(this.camera, this.renderer.domElement);
	    }

	    // 需要由应用程序连续调用
	    update() {
	        this.renderers.render();
	        this.viewer.update();
	    }

	    // 切换瓦片地图源
	    switchMap(type) {
	        switch (type) {
	            case 'google':
	                this.globeLayers[0] = new GoogleTiledLayer(this);
	                break;
	            case 'bing':
	                this.globeLayers[0] = new BingTiledLayer(this);
	                break;
	            case 'amap':
	                this.globeLayers[0] = new AMapTiledLayer(this);
	            default:
	                break;
	        }
	    }

	    dispose() {
	        this.renderers.dispose();
	        this.viewer.dispose();

	        this.globeLayers.forEach(n => {
	            n.dispose();
	        });

	        delete this.globeLayers;
	        delete this.renderers;
	        delete this.viewer;

	        delete this.camera;
	        delete this.renderer;
	    }
	}

	class Scene {
	    constructor(app) {
	        this.app = app;
	    }

	    start() {
	        let editor = this.app.editor;

	        this.globe = new Globe(editor.camera, editor.renderer);
	        editor.scene.add(this.globe);

	        editor.scene.onBeforeRender = this.update.bind(this);
	    }

	    update() {
	        this.globe.update();
	    }

	    stop(){
	        this.globe.dispose();
	        delete this.globe;
	    }
	}

	exports.Scene = Scene;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
