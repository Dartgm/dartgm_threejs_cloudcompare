import '../../themes/css/style.css'

import * as THREE from 'three';
import {
    GLTFLoader
} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    PLYLoader
} from 'three/examples/jsm/loaders/PLYLoader.js';
import {
    DragControls
} from 'three/examples/jsm/controls/DragControls.js'

import ThreeClass from '../../components/ThreeClass.js';
import CommonClass from '../../components/CommonClass.js';

import ply from '../../assets/models/glb/hbgtdl.ply'
import {PLYExporter} from '../../utils/PLYExporter'

$(function () {
    let common = new CommonClass();
    let pageObj = $.extend(common.pageObj, {
        isGui: true,
        mouseArr: ['up', 'down', 'front', 'behind', 'left', 'right'],
        skyboxMethod: 1,
        skybox: [],
        groundMethod: 0
    });

    window['scene3d'] = new SceneClass(pageObj);
    window['scene3d'].load();

    let tipArr = ['内容', '1、剖切', '2、多视点观察'];
    window['scene3d'].intOperationTip(tipArr, 1);
});

class SceneClass extends ThreeClass {
    constructor(pageObj) {
        super(pageObj);

        this.flagStart = false;//开始拖动

        this.object = '';
        this.mouse = { x: 0, y: 0 };
        this.dragControls = '';

        this.boxHelp = '';
        this.pointArr = [];//BOX点变化数组
        this.helpPointArr = [];//辅助点数组
        this.lineArr = [];//辅助线数组
        this.geometryArr = [];//几何体数组
        this.disArr = [];//剖切面距离
        this.limitArr = [];//限制的数组
        this.clippingBoxMesh = [];
        this.clippingLocalPlane = [];
        this.cName = '';//控制中的网格

        this.material1 = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,//0x00BFFF
            side: THREE.DoubleSide,
            opacity: 0,
            transparent: true,
            // polygonOffset:true,
            // polygonOffsetFactor:0.75,
            // polygonOffsetUnits:4.0
            // depthTest:true,
            // depthWrite:false,
        });

        this.material2 = new THREE.MeshBasicMaterial({
            color: 0x00BFFF,//0x00BFFF
            side: THREE.DoubleSide,
            opacity: .5,
            transparent: true,
            // polygonOffset:true,
            // polygonOffsetFactor:0.75,
            // polygonOffsetUnits:4.0
            // depthTest:true,
            // depthWrite:false,
        });

        this.lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000
        })
    }

    initModel() {
        var loader = new PLYLoader();
        loader.load(ply, (geometry) => {
            geometry.computeVertexNormals();
            let material = new THREE.PointsMaterial({ size: 0.1 });
            // geometry.computeBoundingBox();
            // geometry.boundingBox.getCenter(center);
            // geometry.center();//设置中心点
            // geometry.position.set(center.x, center.y, center.z);//回原位

            let figure = new THREE.Points(geometry, material);
            //figure.sortParticles = true;
            figure.name = "point_cloud"
            figure.renderOrder = this.addOrder();
            figure.scale.multiplyScalar(1);

            this.object = figure;

            this.scene.add(figure);

            this.initData();//初始化数据
            this.initSectioning(0);//初始化剖切
            this.addClipFunc();//开启剖切
            this.addPoint();//增加辅助点
            this.addLine();//画线

            this.container.addEventListener('mousemove', this.onDocumentMove.bind(this), false);

            this.flagLoad = true;
        });
    }

    //初始化数据
    initData() {
        // this.boxHelp = this.createBoxHelper(this.object);
        // this.scene.add(this.boxHelp);

        //获取到需要剖切模型的包围盒，并计算每个包围盒的顶点位置,放大包围盒
        const objectN = this.object.clone();
        objectN.scale.set(1.5, 1.5, 1.5)
        const Box = new THREE.Box3().setFromObject(objectN);

        this.pointArr.push(new THREE.Vector3(Box.max.x, Box.max.y, Box.max.z));
        this.pointArr.push(new THREE.Vector3(Box.min.x, Box.max.y, Box.max.z));
        this.pointArr.push(new THREE.Vector3(Box.max.x, Box.max.y, Box.min.z));
        this.pointArr.push(new THREE.Vector3(Box.max.x, Box.min.y, Box.max.z));
        this.pointArr.push(new THREE.Vector3(Box.min.x, Box.min.y, Box.min.z));
        this.pointArr.push(new THREE.Vector3(Box.min.x, Box.max.y, Box.min.z));
        this.pointArr.push(new THREE.Vector3(Box.min.x, Box.min.y, Box.max.z));
        this.pointArr.push(new THREE.Vector3(Box.max.x, Box.min.y, Box.min.z));
    }

    //鼠标移动时
    onDocumentMove(event) {
        //如果在拖动，不发送射线
        if (this.flagStart) {
            return;
        }

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(this.mouse, this.camera);
        let intersects = raycaster.intersectObjects(this.clippingBoxMesh, true);
        this.getItem(intersects);

        $('.container-hand').css('cursor', 'auto');
        this.clippingBoxMesh.forEach(item => {
            item.material = this.material1;
        });
        if (this.moveObject) {
            $('.container-hand').css('cursor', 'pointer');
            this.moveObject.material = this.material2;
            //如果有控制，不再注册控制
            if (this.dragControls) {
                return;
            }

            //渲染到最前
            this.moveObject.renderOrder = this.addOrder();

            //注册拖动
            this.dragControls = new DragControls(this.clippingBoxMesh, this.camera, this.renderer.domElement);

            this.dragControls.addEventListener('dragstart', event => {
                this.controls.enabled = false;
                this.flagStart = true;

                this.position = new THREE.Vector3(this.moveObject.position.x, this.moveObject.position.y, this.moveObject.position.z);
            });
            this.dragControls.addEventListener('drag', event => {
                //变换的是世界矩阵 event.object.matrixWorld
                let object = this.moveObject;
                let dis = 0;

                this.cName = object.name;

                switch (object.name) {
                    case 'up':
                        object.position.x = this.position.x;
                        object.position.y >= this.limitArr[0] ? object.position.y = this.limitArr[0] : '';
                        object.position.y <= this.clippingBoxMesh[1].position.y ? object.position.y = this.clippingBoxMesh[1].position.y + 0.01 : '';
                        object.position.z = this.position.z;

                        //更新截面距离
                        dis = object.position.y;
                        this.clippingLocalPlane[0].constant = dis;

                        //更新截面点坐标
                        this.pointArr[0].y = dis;
                        this.pointArr[1].y = dis;
                        this.pointArr[5].y = dis;
                        this.pointArr[2].y = dis;

                        this.disArr[0] = dis;
                        break;
                    case 'down':
                        //更新截面位置
                        object.position.x = this.position.x;
                        object.position.y <= this.limitArr[1] ? object.position.y = this.limitArr[1] : '';
                        object.position.y >= this.clippingBoxMesh[0].position.y ? object.position.y = this.clippingBoxMesh[0].position.y - 0.01 : '';
                        object.position.z = this.position.z;

                        //更新截面距离
                        dis = object.position.y;
                        this.clippingLocalPlane[1].constant = -dis;

                        //更新截面点坐标
                        this.pointArr[3].y = dis;
                        this.pointArr[7].y = dis;
                        this.pointArr[4].y = dis;
                        this.pointArr[6].y = dis;

                        this.disArr[1] = -dis;
                        break;
                    case 'left':
                        //更新截面位置
                        object.position.x >= this.limitArr[2] ? object.position.x = this.limitArr[2] : '';
                        object.position.x <= this.clippingBoxMesh[3].position.x ? object.position.x = this.clippingBoxMesh[3].position.x + 0.01 : '';
                        object.position.y = this.position.y;
                        object.position.z = this.position.z;

                        //更新截面距离
                        dis = object.position.x;
                        this.clippingLocalPlane[2].constant = dis;

                        //更新截面点坐标
                        this.pointArr[2].x = dis;
                        this.pointArr[0].x = dis;
                        this.pointArr[3].x = dis;
                        this.pointArr[7].x = dis;

                        this.disArr[2] = dis;

                        break;
                    case 'right':
                        //更新截面位置
                        object.position.x <= this.limitArr[3] ? object.position.x = this.limitArr[3] : '';
                        object.position.x >= this.clippingBoxMesh[2].position.x ? object.position.x = this.clippingBoxMesh[2].position.x - 0.01 : '';
                        object.position.y = this.position.y;
                        object.position.z = this.position.z;

                        //更新截面距离
                        dis = object.position.x;
                        this.clippingLocalPlane[3].constant = -dis;

                        //更新截面点坐标
                        this.pointArr[6].x = dis;
                        this.pointArr[4].x = dis;
                        this.pointArr[5].x = dis;
                        this.pointArr[1].x = dis;

                        this.disArr[3] = -dis;
                        break;
                    case 'front':
                        //更新截面位置
                        object.position.x = this.position.x;
                        object.position.y = this.position.y;
                        object.position.z >= this.limitArr[4] ? object.position.z = this.limitArr[4] : '';
                        object.position.z <= this.clippingBoxMesh[5].position.z ? object.position.z = this.clippingBoxMesh[5].position.z + 0.01 : '';

                        //更新截面距离
                        dis = object.position.z;
                        this.clippingLocalPlane[4].constant = dis;

                        //更新截面点坐标
                        this.pointArr[1].z = dis;
                        this.pointArr[6].z = dis;
                        this.pointArr[3].z = dis;
                        this.pointArr[0].z = dis;

                        this.disArr[4] = dis;
                        break;
                    case 'behind':
                        //更新截面位置
                        object.position.x = this.position.x;
                        object.position.y = this.position.y;
                        object.position.z <= this.limitArr[5] ? object.position.z = this.limitArr[5] : '';
                        object.position.z >= this.clippingBoxMesh[4].position.z ? object.position.z = this.clippingBoxMesh[4].position.z - 0.01 : '';

                        //更新截面距离
                        dis = object.position.z;
                        this.clippingLocalPlane[5].constant = -dis;

                        //更新截面点坐标
                        this.pointArr[7].z = dis;
                        this.pointArr[2].z = dis;
                        this.pointArr[5].z = dis;
                        this.pointArr[4].z = dis;

                        this.disArr[5] = -dis;
                        break;
                }

                //重新创建剖面
                for (let i = 0; i < this.clippingBoxMesh.length; i++) {
                    this.destroyObject(this.clippingBoxMesh[i]);
                }
                this.initSectioning(1);
                this.addClipFunc();
                this.changePoint(object.name, dis);//变更辅助点位置
                //清除线画线
                for (let i = 0; i < this.lineArr.length; i++) {
                    this.destroyObject(this.lineArr[i]);
                }
                this.addLine();

            });
            this.dragControls.addEventListener('dragend', event => {
                this.controls.enabled = true;
                this.flagStart = false;
                this.dragControls.dispose();
                this.dragControls = '';

                this.cName = '';
            });
        } else {
            if (this.dragControls) {
                this.dragControls.dispose();
                this.dragControls = '';
            }
        }

    }

    //初始化剖切
    initSectioning(method) {
        this.geometryArr = [];
        this.clippingBoxMesh = [];
        this.clippingLocalPlane = [];
        //前切面可视化-剖切面可视化，这里以前切面为例，别的切面以此类推，这里的clippingBoxMesh为全局变量        
        let geometry = new THREE.Geometry();
        for (let i = 0; i < 6; i++) {
            this.geometryArr[i] = geometry.clone();
            let geom = this.geometryArr[i];
            switch (i) {
                case 0:
                    geom.vertices.push(this.pointArr[0], this.pointArr[1], this.pointArr[5], this.pointArr[2]);
                    break;
                case 1:
                    geom.vertices.push(this.pointArr[3], this.pointArr[7], this.pointArr[4], this.pointArr[6]);
                    break;
                case 2:
                    geom.vertices.push(this.pointArr[2], this.pointArr[0], this.pointArr[3], this.pointArr[7]);
                    break;
                case 3:
                    geom.vertices.push(this.pointArr[6], this.pointArr[4], this.pointArr[5], this.pointArr[1]);
                    break;
                case 4:
                    geom.vertices.push(this.pointArr[1], this.pointArr[6], this.pointArr[3], this.pointArr[0]);
                    break;
                case 5:
                    geom.vertices.push(this.pointArr[7], this.pointArr[2], this.pointArr[5], this.pointArr[4]);
                    break;
            }
            geom.faces.push(new THREE.Face3(0, 1, 2, new THREE.Vector3(0, 1, 0), new THREE.Color("red"), 0));
            geom.faces.push(new THREE.Face3(2, 3, 0, new THREE.Vector3(0, 1, 0), new THREE.Color("red"), 0));

            geom.computeBoundingSphere();
            geom.computeBoundingBox();
            // let centerPoint = geom.boundingSphere.center;
            // geom.boundingBox.getCenter(new THREE.Vector3());
            // geom.center();//设置中心点
            // console.log(centerPoint)
            // geom.verticesNeedUpdate = true;

            let mesh = new THREE.Mesh();
            mesh.geometry = geom.clone().center();

            mesh.renderOrder = this.addOrder();
            this.clippingBoxMesh.push(mesh);
            this.scene.add(mesh);
            mesh.position.x = geom.boundingSphere.center.x;
            mesh.position.y = geom.boundingSphere.center.y;
            mesh.position.z = geom.boundingSphere.center.z;
            // if (i == 0) this.createAxesHelper(mesh);//辅助线

            //初始位置及切割位置
            switch (i) {
                case 0:
                    mesh.name = 'up';
                    if (method == 0) {
                        this.limitArr[0] = mesh.position.y;
                        this.disArr[i] = Math.abs(this.pointArr[0].y);
                    }
                    this.clippingLocalPlane[i] = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.disArr[i]);//对应可视化切面的真实切面,记得打开剖切的局部效果
                    break;
                case 1:
                    mesh.name = 'down';
                    if (method == 0) {
                        this.limitArr[1] = mesh.position.y;
                        this.disArr[i] = Math.abs(this.pointArr[4].y);
                    }
                    this.clippingLocalPlane[i] = new THREE.Plane(new THREE.Vector3(0, 1, 0), this.disArr[i]);
                    break;
                case 2:
                    mesh.name = 'left';
                    if (method == 0) {
                        this.limitArr[2] = mesh.position.x;
                        this.disArr[i] = Math.abs(this.pointArr[0].x);
                    }
                    this.clippingLocalPlane[i] = new THREE.Plane(new THREE.Vector3(-1, 0, 0), this.disArr[i]);
                    break;
                case 3:
                    mesh.name = 'right';
                    if (method == 0) {
                        this.limitArr[3] = mesh.position.x;
                        this.disArr[i] = Math.abs(this.pointArr[4].x);
                    }
                    this.clippingLocalPlane[i] = new THREE.Plane(new THREE.Vector3(1, 0, 0), this.disArr[i]);
                    break;
                case 4:
                    mesh.name = 'front';
                    if (method == 0) {
                        this.limitArr[4] = mesh.position.z;
                        this.disArr[i] = Math.abs(this.pointArr[0].z);
                    }
                    this.clippingLocalPlane[i] = new THREE.Plane(new THREE.Vector3(0, 0, -1), this.disArr[i]);
                    break;
                case 5:
                    mesh.name = 'behind';
                    if (method == 0) {
                        this.limitArr[5] = mesh.position.z;
                        this.disArr[i] = Math.abs(this.pointArr[4].z);
                    }
                    this.clippingLocalPlane[i] = new THREE.Plane(new THREE.Vector3(0, 0, 1), this.disArr[i]);
                    break;
            }

            //变色
            if (mesh.name == this.cName) {
                mesh.material = this.material2.clone();
            } else {
                mesh.material = this.material1.clone();
            }

        }
    }

    //增加裁剪功能
    addClipFunc() {
        this.renderer.localClippingEnabled = true; // 开启模型对象的局部剪裁平面功能

        ///绑定需要切面的mesh,以及对各个可视化切面的自身的剖切
        this.object.traverse(child => {
            if (child.isMesh || child.isPoints) {
                child.material.clippingPlanes = this.clippingLocalPlane;
                // child.material.side = THREE.DoubleSide;
            }
        });

        for (let i = 0; i < this.clippingBoxMesh.length; i++) {
            let clippingArr = new Array();
            for (let j = 0; j < this.clippingBoxMesh.length; j++) {
                if (i != j) {
                    clippingArr.push(this.clippingLocalPlane[j]);// 显示剖面
                }
            }
            this.clippingBoxMesh[i].material.clippingPlanes = clippingArr;//// 设置材质的剪裁平面的属性
            this.clippingBoxMesh[i].material.clipIntersection = true;////改变剪裁方式，剪裁所有平面要剪裁部分的交集
        }
    }

    //添加辅助点
    addPoint() {
        let scale = new THREE.Vector3(.3, .3, .3);
        for (let i = 0; i < this.pointArr.length; i++) {
            let help = this.createSphereHelp(this.pointArr[i], scale);
            help.userData.index = i;
            this.helpPointArr.push(help);
            this.scene.add(help);
        }
    }

    //画线
    addLine() {
        let lineGeometry = new THREE.Geometry();
        let line = new THREE.Line();
        lineGeometry.vertices.push(this.pointArr[0], this.pointArr[1]);//记录两个点的顶点位置
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);
        lineGeometry.vertices.push(this.pointArr[0], this.pointArr[2]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);
        lineGeometry.vertices.push(this.pointArr[0], this.pointArr[3]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);

        lineGeometry = new THREE.Geometry();
        line = new THREE.Line();
        lineGeometry.vertices.push(this.pointArr[1], this.pointArr[5]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);
        lineGeometry.vertices.push(this.pointArr[1], this.pointArr[6]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);

        lineGeometry = new THREE.Geometry();
        line = new THREE.Line();
        lineGeometry.vertices.push(this.pointArr[2], this.pointArr[5]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);
        lineGeometry.vertices.push(this.pointArr[2], this.pointArr[7]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);

        lineGeometry = new THREE.Geometry();
        line = new THREE.Line();
        lineGeometry.vertices.push(this.pointArr[3], this.pointArr[6]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);
        lineGeometry.vertices.push(this.pointArr[3], this.pointArr[7]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);

        lineGeometry = new THREE.Geometry();
        line = new THREE.Line();
        lineGeometry.vertices.push(this.pointArr[4], this.pointArr[5]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);
        lineGeometry.vertices.push(this.pointArr[4], this.pointArr[6]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);
        lineGeometry = new THREE.Geometry();
        line = new THREE.Line();
        lineGeometry.vertices.push(this.pointArr[4], this.pointArr[7]);
        line = new THREE.Line(lineGeometry, this.lineMaterial);
        this.lineArr.push(line);
        this.scene.add(line);
    }

    //变更辅助点位置
    changePoint(name, dis) {
        switch (name) {
            case 'up':
                //辅助点位置
                this.helpPointArr[0].position.y = dis;
                this.helpPointArr[1].position.y = dis;
                this.helpPointArr[5].position.y = dis;
                this.helpPointArr[2].position.y = dis;
                break;
            case 'down':
                this.helpPointArr[3].position.y = dis;
                this.helpPointArr[7].position.y = dis;
                this.helpPointArr[4].position.y = dis;
                this.helpPointArr[6].position.y = dis;
                break;
            case 'left':
                this.helpPointArr[2].position.x = dis;
                this.helpPointArr[0].position.x = dis;
                this.helpPointArr[3].position.x = dis;
                this.helpPointArr[7].position.x = dis;
                break;
            case 'right':
                this.helpPointArr[6].position.x = dis;
                this.helpPointArr[4].position.x = dis;
                this.helpPointArr[5].position.x = dis;
                this.helpPointArr[1].position.x = dis;
                break;
            case 'front':
                this.helpPointArr[1].position.z = dis;
                this.helpPointArr[6].position.z = dis;
                this.helpPointArr[3].position.z = dis;
                this.helpPointArr[0].position.z = dis;
                break;
            case 'behind':
                this.helpPointArr[7].position.z = dis;
                this.helpPointArr[2].position.z = dis;
                this.helpPointArr[5].position.z = dis;
                this.helpPointArr[4].position.z = dis;
                break;
        }
    }

    //对象筛选
    getItem(intersects) {
        this.moveObject = '';
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;
            console.log(obj)
            if (this.mouseArr.indexOf(obj.name) !== -1) { //obj.isMesh && 
                this.moveObject = obj;
                break;
            }
        }
    }
    
    // 保存图像
    export() {
        const exporter = new PLYExporter();
        const source = exporter.parse(this.scene);
        this.downloadFile(source);
    }
    downloadFile(source) {
        let aTag = document.createElement('a')
        let blob = new Blob([source])
        aTag.href = URL.createObjectURL(blob)
        aTag.download = 'untitile.ply'
        aTag.click()
        URL.revokeObjectURL(blob)
    }
    //到点观察
    goPoint(method) {
        switch (method) {
            case 0:
                this.camera.position.set(0, 100, 0);
                break;
            case 1:
                this.camera.position.set(0, -100, 0);
                break;
            case 2:
                this.camera.position.set(100, 0, 0);
                break;
            case 3:
                this.camera.position.set(-100, 0, 0);
                break;
            case 4:
                this.camera.position.set(0, 0, 100);
                break;
            case 5:
                this.camera.position.set(0, 0, -100);
                break;
            default:
                this.camera.position.set(0, 30, 200);

        }
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(60, this.W / this.H, 1, 100000000);
        this.camera.position.set(0, 30, 200);
    }

    initScene() {
        super.initScene();
        //this.scene.background = '';
    }

    initGround() {
        //super.initGround();
    }

    //GUI
    initGui() {
        super.initGui();
        let self = this;

        this.settings = {
            '上方视点'() {
                self.goPoint(0);
            },
            '下方视点'() {
                self.goPoint(1);
            },
            '左方视点'() {
                self.goPoint(2);
            },
            '右方视点'() {
                self.goPoint(3);
            },
            '前方视点'() {
                self.goPoint(4);
            },
            '后方视点'() {
                self.goPoint(5);
            },
            '恢复视点'() {
                self.goPoint();
            },
            '刨切'() {
                self.export()
            },
            '保存刨切视角'() {

            },
            '恢复刨切'() {

            },
        };

        let folder = this.gui.addFolder('操作');
        folder.add(this.settings, '上方视点');
        folder.add(this.settings, '下方视点');
        folder.add(this.settings, '左方视点');
        folder.add(this.settings, '右方视点');
        folder.add(this.settings, '前方视点');
        folder.add(this.settings, '后方视点');
        folder.add(this.settings, '恢复视点');
        folder.add(this.settings, '刨切')
        folder.open();
    }

    render() {
        super.render();
    }

    //销毁
    destroyObject(object) {
        if (!object) return;
        object.traverse(item => {
            if (item.isMesh) {
                item.geometry.dispose(); //删除几何体
                item.material.dispose(); //删除材质
            }
        });

        this.scene.remove(object);
    }

    //操作提示
    intOperationTip(tipArr, fontMethod) {
        let div = document.createElement('div');
        div.className = 'div-pagetip';
        switch (fontMethod) {
            case 0:
                div.style = 'color:#000000;';
                break;
            case 1:
                div.style = 'color:#ffffff;';
                break;
        }
        tipArr.forEach((item, index) => {
            let divs = document.createElement('div');
            divs.append(item);
            div.appendChild(divs);
            divs.className = index ? 'div-pagetip-other' : 'div-pagetip-first';
        })
        $('body').append(div);
    }

    //创建一个圆球辅助
    createSphereHelp(position, scale) {
        let geometry = new THREE.SphereGeometry(0.1, 30, 30);
        let material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        let mesh = new THREE.Mesh(geometry, material);
        position ? mesh.position.set(position.x, position.y, position.z) : '';
        scale ? mesh.scale.set(scale.x, scale.y, scale.z) : '';
        return mesh;
    }


}