import {Globe} from "./Globe";

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

export {Scene};