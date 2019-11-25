import {Viewer} from "./Viewer";
import {WGS84} from "../config/WGS84";
import {_Math} from "../math/Math";
import {GeoMath} from "../math/GeoMath";

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
        this.onMouseUp = this.onMouseUp.bind(this)
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
})

export {OrbitViewer};