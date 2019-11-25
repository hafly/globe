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

export {Layer};