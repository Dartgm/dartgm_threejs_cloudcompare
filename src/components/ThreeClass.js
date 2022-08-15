import * as THREE from 'three';

import {
    WEBGL
} from "three/examples/jsm/WebGL.js"
import {
    OrbitControls
} from "three/examples/jsm/controls/OrbitControls.js"
import Stats from 'three/examples/jsm/libs/stats.module.js';
import {
    GUI
} from 'three/examples/jsm/libs/dat.gui.module.js';
import TWEEN from 'tween';
import {
    CSS2DRenderer,
    CSS2DObject
} from "three/examples/jsm/renderers/CSS2DRenderer.js"
import {
    CSS3DRenderer,
    CSS3DObject
} from "three/examples/jsm/renderers/CSS3DRenderer.js"

import CommonClass from './CommonClass.js';
import AppMouseClass from './AppMouseClass.js';

import textureFloor from '../assets/img/floor/starcross.png'
import textureFloor2 from '../assets/img/floor/star.png'
import textureFloor3 from '../assets/img/floor/stargrid.png'

class ThreeClass {
    constructor(pageObj) {
        this.pageObj = pageObj;
        this.common = new CommonClass();

        //获取界面大小
        this.W = window.innerWidth;
        this.H = window.innerHeight;

        //动画计时
        this.delta = '';
        this.clock = new THREE.Clock();

        //初始化
        this.loadTime = 100; //加载时间计时
        this.renderOrder = 100;

        //基础
        this.container = '';
        this.scene = '';
        this.lightScene = '';
        this.camera = ''; //场景摄像机
        this.controls = ''; //控制
        this.renderer = '';
        this.css2dRenderer = '';
        this.css3dRenderer = '';
        this.stats = '';
        this.gui = '';
        this.axes = '';

        this.cameraView = ''; //观测摄像机

        //鼠标
        this.intersectArr = [];
        this.moveObject = '';
        this.selectObject = '';

        //是否
        this.flagLoad = false; //是否加载
        this.flagHalf = false;
        this.interval_load = '';

        //参数
        this.skyboxMethod = this.pageObj.skyboxMethod;
        this.skyboxOne = this.pageObj.skyboxOne;
        this.skybox = this.pageObj.skybox;
        this.backGound = this.pageObj.backGound;
        this.guiParams = this.pageObj.guiParams;
        this.mixerArray = [];
        this.mouseArr = this.pageObj.mouseArr;

        //启用
        this.isVision = this.pageObj.isVision != '' ? this.pageObj.isVision : false;
        this.isTween = this.pageObj.isTween != '' ? this.pageObj.isTween : false;
        this.isStats = this.pageObj.isStats != '' ? this.pageObj.isStats : false;
        this.isGui = this.pageObj.isGui != '' ? this.pageObj.isGui : false;
        this.isCutPic = this.pageObj.isCutPic != '' ? this.pageObj.isCutPic : 0;
        this.cutPicType = this.pageObj.cutPicType != '' ? this.pageObj.cutPicType : false;
        this.isAxes = this.pageObj.isAxes != '' ? this.pageObj.isAxes : false;
        this.isMouse = this.pageObj.isMouse != '' ? this.pageObj.isMouse : false;
        this.isMouseGroup = this.pageObj.isMouseGroup != '' ? this.pageObj.isMouseGroup : false;
        this.isDoubleClick = this.pageObj.isDoubleClick != '' ? this.pageObj.isDoubleClick : false;
        this.isCameraView = this.pageObj.isCameraView != '' ? this.pageObj.isCameraView : false;
        this.isSceneRotate = this.pageObj.isSceneRotate != '' ? this.pageObj.isSceneRotate : false;
        this.isControlRotate = this.pageObj.isControlRotate != '' ? this.pageObj.isControlRotate : false;
        this.isLimitControl = this.pageObj.isLimitControl != '' ? this.pageObj.isLimitControl : false;
        this.isHalfRenderer = this.pageObj.isHalfRenderer != '' ? this.pageObj.isHalfRenderer : false;
        this.isCss2dRenderer = this.pageObj.isCss2dRenderer != '' ? this.pageObj.isCss2dRenderer : false;
        this.isCss3dRenderer = this.pageObj.isCss3dRenderer != '' ? this.pageObj.isCss3dRenderer : false;

        this.mouseLeftClickFunc = this.pageObj.mouseLeftClickFunc != '' ? this.pageObj.mouseLeftClickFunc : '';
        this.mouseLeftClickCancelFunc = this.pageObj.mouseLeftClickCancelFunc != '' ? this.pageObj.mouseLeftClickCancelFunc : '';
        this.mouseRightClickFunc = this.pageObj.mouseRightClickFunc != '' ? this.pageObj.mouseRightClickFunc : '';
        this.mouseRightClickCancelFunc = this.pageObj.mouseRightClickCancelFunc != '' ? this.pageObj.mouseRightClickCancelFunc : '';
        this.mouseMoveFunc = this.pageObj.mouseMoveFunc != '' ? this.pageObj.mouseMoveFunc : '';
    }

    //加载
    load() {
        this.isVision ? console.log(THREE.REVISION) : '';
        //兼容性判断
        if (WEBGL.isWebGLAvailable() === false) {
            document.body.appendChild('您的浏览器不支持WebGL,请更换Chrome或360浏览器。');
        } else {
            this.init();
        }
    }

    //初始化
    init() {
        this.initCanvas();
        this.initScene();
        this.initCamera();
        this.isCameraView ? this.initCameraView() : '';
        this.initLight();
        this.initGround();
        this.initControls();
        this.initRenderer();
        this.initModel();
        this.initShader();

        this.isStats ? this.initStats() : '';
        this.isGui ? this.initGui() : '';
        this.isAxes ? this.initAxes() : '';

        //窗口变化
        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.interval_load = setInterval(() => {
            if (this.flagLoad) {
                clearInterval(this.interval_load);

                this.isMouse ? this.initMouse() : '';//鼠标
                if (this.isDoubleClick) {
                    $(document).on('dblclick', e => {
                        this.common.dBlclick(e, this.camera, this.scene);
                    });
                }

                this.start();
                this.animate(); //执行渲染
            }
        }, this.loadTime);
    }

    initModel() { }

    initShader() { }

    start() { }

    //初始化画布
    initCanvas() {
        this.container = document.createElement('div');
        this.container.id = 'div_canvas';
        this.container.className = 'container-hand';
        document.body.appendChild(this.container);
        //document.body.insertBefore(this.container, document.body.firstChild);
    }

    //初始化场景
    initScene() {
        this.scene = new THREE.Scene();
        this.lightScene = new THREE.Scene();

        //天空盒
        switch (this.skyboxMethod) {
            case 2:
                this.scene.background = new THREE.Color('#000d4d');
                //this.scene.background = new THREE.Color('#111C51');
                //this.scene.background = new THREE.Color('#101C4F');
                //this.scene.background = new THREE.Color('#333333');
                break;
            case 1:
                this.scene.background = new THREE.TextureLoader().load(this.skyboxOne);
                break;
            default:
                this.scene.background = new THREE.CubeTextureLoader().load(this.skybox);
        }

        //this.scene.fog = new THREE.Fog(this.scene.background, 1, 5000);

        //全景图
        /* const geometry = new THREE.SphereBufferGeometry(1000, 120, 80);
        geometry.scale(-1, 1, 1);
        const texture = new THREE.TextureLoader().load(panorama);
        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh); */
    }
    //初始化摄像机
    initCamera() {
        this.camera = new THREE.PerspectiveCamera(30, this.W / this.H, 1, 1000000000000000000000);
        // this.camera.position.set(-357, 96, 166);
        this.camera.position.set(700, 700, 700);
        if (this.isCameraView) {
            let helper = new THREE.CameraHelper(this.camera);
            this.scene.add(helper);
        }
    }
    //初始化观测摄像机
    initCameraView() {
        this.cameraView = new THREE.PerspectiveCamera(30, this.W / this.H, 1, 10000000000000000);
        this.cameraView.position.set(1000, 1000, 1000);
    }
    //初始化光线
    initLight() {
        this.scene.add(new THREE.AmbientLight(0x555555));

        const light = new THREE.DirectionalLight(0xdfebff, 2);
        light.position.set(50, 200, 100);
        light.position.multiplyScalar(1.3);
        light.castShadow = true;
        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        this.scene.add(light);
    }
    //初始化布料背景
    initGround() {
        //模式
        switch (this.pageObj.groundMethod) {
            case 0:
                //网格
                let helper = new THREE.GridHelper(5000, 100);
                this.scene.add(helper);
                break;
            case 1:
                //草地
                let loader = new THREE.TextureLoader();
                let groundTexture = loader.load(this.backGound);
                groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
                groundTexture.repeat.set(500, 500);
                groundTexture.anisotropy = 4;

                let meshMaterial = new THREE.MeshBasicMaterial({
                    /* side: THREE.BackSide,
                    map: groundTexture,transparent:false,opactiy:0, needUpdate:true,fog:false */
                    map: groundTexture
                });
                meshMaterial.side = THREE.BackSide;

                let groundMaterial = [];
                for (var i = 0; i < 6; ++i) {
                    groundMaterial.push(i == 2 ? new THREE.MeshBasicMaterial({
                        map: groundTexture
                    }) : '');
                }

                this.backGroundMesh = new THREE.Mesh(new THREE.BoxGeometry(1000000, 0, 1000000), groundMaterial);
                this.backGroundMesh.name = '背景';

                //ground.receiveShadow = true;
                this.scene.add(this.backGroundMesh);
                this.backGroundMesh.renderOrder = window['scene3d'] ? window['scene3d'].addOrder() : 0;
                break;
            case 2:
                //地板
                const planeGeometry = new THREE.PlaneGeometry(5000, 5000);
                let plane = new THREE.Mesh(planeGeometry);
                this.texture = new THREE.TextureLoader().load(textureFloor);
                //水平面旋转并且设置位置
                plane.rotation.x = -0.5 * Math.PI;
                //plane.material.update = true;
                plane.position.set(0, -2, 0);
                plane.name = 'plane';
                plane.material = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    side: THREE.DoubleSide,
                    depthTest: false
                });
                plane.material.map.matrixAutoUpdate = false;
                plane.material.map.matrix.identity().scale(300, 300);
                //plane.material.map.needsUpdate = true;
                plane.material.map.wrapS = plane.material.map.wrapT = THREE.RepeatWrapping;
                //plane.receiveShadow = true;
                this.scene.add(plane);
                break;
            case 3:
                //地板
                const planeGeometry2 = new THREE.PlaneGeometry(5000, 5000);
                let plane2 = new THREE.Mesh(planeGeometry2);
                this.texture = new THREE.TextureLoader().load(textureFloor2);
                //水平面旋转并且设置位置
                plane2.rotation.x = -0.5 * Math.PI;
                //plane.material.update = true;
                plane2.position.set(0, -2, 0);
                plane2.name = 'plane';
                plane2.material = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    side: THREE.DoubleSide,
                    depthTest: false,
                    color: '0x00FFFF'
                });
                plane2.material.map.matrixAutoUpdate = false;
                plane2.material.map.matrix.identity().scale(150, 150);
                //plane.material.map.needsUpdate = true;
                plane2.material.map.wrapS = plane2.material.map.wrapT = THREE.RepeatWrapping;
                //plane.receiveShadow = true;
                this.scene.add(plane2);
                break;
            case 4:
                //地板
                const planeGeometry3 = new THREE.PlaneGeometry(5000, 5000);
                let plane3 = new THREE.Mesh(planeGeometry3);
                this.texture = new THREE.TextureLoader().load(textureFloor3);
                //水平面旋转并且设置位置
                plane3.rotation.x = -0.5 * Math.PI;
                //plane.material.update = true;
                plane3.position.set(0, -2, 0);
                plane3.name = 'plane';
                plane3.material = new THREE.MeshBasicMaterial({
                    map: this.texture,
                    side: THREE.DoubleSide,
                    depthTest: false,
                    color: '0x00FFFF'
                });
                plane3.material.map.matrixAutoUpdate = false;
                plane3.material.map.matrix.identity().scale(60, 60);
                //plane.material.map.needsUpdate = true;
                plane3.material.map.wrapS = plane3.material.map.wrapT = THREE.RepeatWrapping;
                //plane.receiveShadow = true;
                this.scene.add(plane3);
                break;
        }

    }
    //加载界面控制器
    initControls() {
        this.controls = new OrbitControls(this.isCameraView ? this.cameraView : this.camera, this.container);
        this.isLimitControl ? this.controls.maxPolarAngle = Math.PI * 0.499 : '';
        //设置相机距离原点的最近距离
        this.controls.minDistance = 10;
        //设置相机距离原点的最远距离
        this.controls.maxDistance = 1000000000000000;
        this.isControlRotate ? this.controls.autoRotate = true : '';
    }
    //鼠标
    initMouse() {
        if (window['appmouse']) {
            window['appmouse'].removeListener(this);
            window['appmouse'] = null;
        }

        window['appmouse'] = new AppMouseClass(this);
        window['appmouse'].isMouseGroup = this.isMouseGroup;
        window['appmouse'].init();
    }
    //加载渲染器
    initRenderer() {
        //标签
        if (this.isCss2dRenderer) {
            this.css2dRenderer = new CSS2DRenderer();
            this.css2dRenderer.setSize(this.W, this.H);
            this.css2dRenderer.domElement.style.position = 'absolute';
            this.css2dRenderer.domElement.style.top = 0;
            this.container.appendChild(this.css2dRenderer.domElement);
        }

        //canvas
        if (this.isCss3dRenderer) {
            this.css3dRenderer = new CSS3DRenderer();
            this.css3dRenderer.setSize(this.W, this.H);
            this.css3dRenderer.domElement.style.position = 'absolute';
            this.css3dRenderer.domElement.style.top = 0;
            this.container.appendChild(this.css3dRenderer.domElement);
        }


        //场景
        if (!this.isCutPic) {
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                logarithmicDepthBuffer: true,//精度更高的z缓冲，来代替原有的Z缓冲
                //alpha: true
            });

        } else {
            //开启图形缓冲区用于截图
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                logarithmicDepthBuffer: true,
                preserveDrawingBuffer: true,//保留图形缓冲区
                //alpha: true
            });
        }

        this.renderer.setSize(this.W, this.H);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true;
        this.renderer.gammaFactor = 2.2;
        this.renderer.shadowMap.enabled = true;
        this.renderer.sortObjects = true;

        this.renderer.physicallyCorrectLights = true;
        this.renderer.outputEncoding = THREE.sRGBEncoding;

    }
    //动画
    animate() {
        //更新控制器
        requestAnimationFrame(this.animate.bind(this));

        this.render();
        this.stats ? this.stats.update() : '';
    }
    //渲染
    render() {
        this.delta = this.clock.getDelta();

        //动画
        if (this.mixerArray.length) {
            for (let i = 0; i < this.mixerArray.length; i++) {
                this.mixerArray[i].mixer.update(this.delta);
            }
        }

        this.isSceneRotate ? this.scene.rotation.y += Math.PI * 0.001 : '';
        this.controls ? this.controls.update(this.delta) : '';

        this.isTween ? TWEEN.update() : '';
        this.composer ? this.composer.render(this.delta) : '';

        if (this.isHalfRenderer) this.flagHalf = !this.flagHalf;

        if (this.isHalfRenderer) {
            if (this.flagHalf) {
                !this.composer ? this.renderer.render(this.scene, this.isCameraView ? this.cameraView : this.camera) : '';
                this.isCss2dRenderer ? this.css2dRenderer.render(this.scene, this.isCameraView ? this.cameraView : this.camera) : '';
                this.isCss3dRenderer ? this.css3dRenderer.render(this.scene, this.isCameraView ? this.cameraView : this.camera) : '';
            }
        } else {
            !this.composer ? this.renderer.render(this.scene, this.isCameraView ? this.cameraView : this.camera) : '';
            this.isCss2dRenderer ? this.css2dRenderer.render(this.scene, this.isCameraView ? this.cameraView : this.camera) : '';
            this.isCss3dRenderer ? this.css3dRenderer.render(this.scene, this.isCameraView ? this.cameraView : this.camera) : '';
        }


    }

    ////////////////辅助//////////////
    //性能监测
    initStats() {
        this.stats = new Stats(); // 创建一个性能监视器
        this.stats.setMode(0); // 0: fps, 1: ms
        this.stats.domElement.style.position = 'absolute'; // 样式， 坐标
        this.stats.domElement.style.left = '0px';
        this.stats.domElement.style.top = '0px';
        document.getElementById('canvas_frame').appendChild(this.stats.domElement); // 添加到canvas-frame

        !this.isStats ? this.stats = '' : '';
    }
    //GUI
    initGui() {
        let self = this;
        this.gui = new GUI(); //创建GUI

        if (this.isCutPic) {
            this.settings = {
                '截图'() {
                    self.cutPic();
                },
            };
            //button
            let folderCut = this.gui.addFolder('操作');
            folderCut.add(this.settings, '截图');
            folderCut.open();
        }
    }

    //截图
    cutPic() {
        let dom = document.getElementById('div_canvas').firstChild;
        switch (this.cutPicType) {
            case 1:
                this.downLoad(this.saveAsJPG(dom));
                break;
            default:
                this.downLoad(this.saveAsPNG(dom));
        }

    }

    // 保存成png格式的图片
    saveAsPNG(canvas) {
        return canvas.toDataURL('image/png');
        //return canvas.toDataURL('image/bmp');//bmp有些浏览器不支持
    }

    // 保存成jpg格式的图片
    saveAsJPG(canvas) {
        return canvas.toDataURL('image/jpeg');
    }

    //下载文件
    downLoad(url) {
        let fd = document.createElement('a');
        fd.download = '截图文件';//默认名是下载
        fd.href = url;
        document.body.appendChild(fd);
        fd.click();
        fd.remove();
    }

    //三维坐标轴的显示
    initAxes() {
        this.axes = new THREE.AxisHelper(1000000);
        this.scene.add(this.axes);
    }

    ///////////////其他///////////////
    onWindowResize() {
        //窗口变化时
        this.W = window.innerWidth;
        this.H = window.innerHeight;

        this.camera.aspect = this.W / this.H;
        this.camera.updateProjectionMatrix();

        if (this.isCameraView) {
            this.cameraView.aspect = this.W / this.H;
            this.cameraView.updateProjectionMatrix();
        }

        this.renderer.setSize(this.W, this.H);
        this.isCss2dRenderer ? this.css2dRenderer.setSize(this.W, this.H) : '';
        this.isCss3dRenderer ? this.css3dRenderer.setSize(this.W, this.H) : '';

        this.composer ? this.composer.setSize(window.innerWidth, window.innerHeight) : '';
    }
    addOrder() {
        //渲染层级
        this.renderOrder += 10;
        return this.renderOrder;
    }

}

export default ThreeClass;