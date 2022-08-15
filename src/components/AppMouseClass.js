/////鼠标类/////
/////lb-20191009/////
import * as THREE from 'three';

import CommonClass from './CommonClass.js';

class AppMouseClass {
    constructor(scene) {
        this.scene = scene.scene;
        this.container = scene.container;
        this.camera = scene.camera;
        this.moveObject = scene.moveObject;
        this.selectObject = scene.selectObject;
        this.isMouseGroup = false;//是否组
        this.mouseLeftClickFunc = scene.mouseLeftClickFunc;
        this.mouseLeftClickCancelFunc = scene.mouseLeftClickCancelFunc;
        this.mouseRightClickFunc = scene.mouseRightClickFunc;
        this.mouseRightClickCancelFunc = scene.mouseRightClickCancelFunc;
        this.mouseMoveFunc = scene.mouseMoveFunc;

        //射线数组及鼠标过滤数组
        this.intersectArr = scene.intersectArr.length ? scene.intersectArr : this.scene.children;
        this.mouseArr = scene.mouseArr;
        this.oldObject = '';

        //鼠标
        this.mouse = new THREE.Vector2();
        this.selectCube = ''; //选中的方块
        this.mouseCircle = '';

        //PC端
        this.pcclickTime = 0;
        this.pcLastTap = 0;

        //移动端
        this.clickTime = 0;
        this.lastTap = 0;

        //是否PC端
        this.isPc = new CommonClass().isPc();
    }

    init() {
        //this.searchSceneItems();
        //this.initCircle();

        if (this.isPc) {
            //监听事件
            this.initMouseRight();
            this.container.addEventListener('click', this.onDocumentClick.bind(this), false);
            this.container.addEventListener('mousemove', this.onDocumentMove.bind(this), false);
            this.container.addEventListener('dblclick', this.onDocumentDoubleClick.bind(this), false);
        } else {
            //监听移动端事件
            this.container.addEventListener('touchstart', this.onTouchStart.bind(this), {
                passive: false
            }); //点击时
            this.container.addEventListener('touchmove', this.onTouchMove.bind(this), {
                passive: false
            }); //移动时
            this.container.addEventListener('touchend', this.onTouchEnd.bind(this), {
                passive: false
            }); //停止时
            //scope.domElement.addEventListener( 'touchstart', onTouchStart, {passive: false} );
            //window.addEventListener( 'mousewheel', onDocumentMousewheel, false );
        }

    };

    //返回选中的设备模型数据
    returnSelectMesh(event) {
        if (this.isPc) {
            // 通过鼠标点击位置,计算出 raycaster 所需点的位置,以屏幕为中心点,范围 -1 到 1
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        } else {
            //移动端点击位置
            let touch = event.touches[0] ? event.touches[0] : event.changedTouches[0];
            this.mouse.x = (touch.pageX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.pageY / window.innerHeight) * 2 + 1;
        }

        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(this.mouse, this.camera);
        let intersects = raycaster.intersectObjects(this.intersectArr, true);

        return intersects;
    };

    //鼠标左键点击
    onDocumentClick(event) {
        let intersects = this.returnSelectMesh(event);
        //左键点击
        this.leftClick(event, intersects)

        event.preventDefault();
    };

    //左键点击
    leftClick(event, intersects) {
        this.clearPageElement();

        if (intersects.length > 0) {
            //对象筛选
            this.getItem(intersects);
            this.scene.moveObject = this.moveObject;
            this.scene.selectObject = this.moveObject;
            this.selectObject = this.moveObject;

            //创建外框
            if (this.selectObject) {
                this.createModelBorder();

                this.mouseLeftClickFunc && this.mouseLeftClickFunc();
            } else {
                return false;
            }
        }else{
            this.mouseLeftClickCancelFunc && this.mouseLeftClickCancelFunc();
        }
    };

    //加载鼠标右键
    initMouseRight() {
        this.container.oncontextmenu = (event) => {
            this.onDocumentRightClick(event);

            return false; //屏蔽浏览器自带的右键菜单
        };
    };

    //鼠标右键点击
    onDocumentRightClick(event) {
        let intersects = this.returnSelectMesh(event);
        //选中并执行显示各类右键菜单
        this.rightClick(event, intersects);
    };

    //右键点击
    rightClick(event, intersects) {
        this.clearPageElement();

        if (intersects.length > 0) {
            //对象筛选
            this.getItem(intersects);
            this.scene.moveObject = this.moveObject;
            this.scene.selectObject = this.moveObject;
            this.selectObject = this.moveObject;

            //创建外框
            if (this.selectObject) {
                this.createModelBorder();

                this.mouseRightClickFunc && this.mouseRightClickFunc();
            } else {
                return false;
            }
        }else{
            this.mouseRightClickCancelFunc && this.mouseRightClickCancelFunc();
        }
    }

    //鼠标双击时
    onDocumentDoubleClick(event) {
        let intersects = this.returnSelectMesh(event);

        //method:0为左键,1为右键
        if (intersects.length > 0) {
            //对象筛选
            this.getItem(intersects);
            this.scene.moveObject = this.moveObject;
            this.scene.selectObject = this.moveObject;
            this.selectObject = this.moveObject;
        }

        event.preventDefault();
    };

    //鼠标移动时
    onDocumentMove(event) {
        let intersects = this.returnSelectMesh(event);

        if (intersects.length > 0) {
            this.oldObject = this.moveObject;

            $('.container-hand').css('cursor', 'auto');
            for (let i = 0; i < intersects.length; i++) {
                let obj = intersects[i].object;

                if (this.isMouseGroup) {
                    this.moveObject = this.checkParent(obj);
                    if (this.moveObject && this.mouseArr.indexOf(this.moveObject.name) !== -1) {
                        $('.container-hand').css('cursor', 'pointer');

                        this.mouseMoveFunc && this.mouseMoveFunc();
                    }
                    break;
                } else if (this.mouseArr.indexOf(obj.name) !== -1) { //obj.isMesh && 
                    $('.container-hand').css('cursor', 'pointer');
                    this.mouseMoveFunc && this.mouseMoveFunc();
                    break;
                }


            }
        }

        event.preventDefault();
    };

    //移动端操作-点击开始
    onTouchStart(event) {
        let touch = event.touches[0] ? event.touches[0] : event.changedTouches[0];
        if (flagSmallMap)
            if (touch.pageX > window.innerWidth - mapWidth && touch.pageY > window.innerHeight - mapaHeight) {
                controls.enabled = false; //鼠标在小地图按下时控制失效
            }
        this.clickTime = Date.now();
    }

    //移动端操作-点击停止
    onTouchEnd(event) {
        if (Date.now() - this.clickTime <= 700) {
            let intersects = this.returnSelectMesh(event);
            this.leftClick(event, intersects);

            this.onDocumentMove(event);

            if (Date.now() - this.lastTap <= 300) {
                //双击
                this.onDocumentDoubleClick(event);
            }

            //this.lastTap = Date.now();

        } else {
            let intersects = this.returnSelectMesh(event);
            this.rightClick(event, intersects);

        }
        this.lastTap = Date.now();

        return false;
    }

    //检测GROUP上层
    checkParent(object) {
        if (object && object.type == 'Scene') return;

        if (object.type == 'Group') return object;

        let obj = this.checkParent(object.parent);
        return obj;
    }

    //对象筛选
    getItem(intersects) {
        for (let i = 0; i < intersects.length; i++) {
            let obj = intersects[i].object;

            //检测组或网格
            if (this.isMouseGroup) {
                this.moveObject = this.checkParent(obj);
                break;
            } else {
                if (this.mouseArr.indexOf(obj.name) !== -1) { //obj.isMesh && 
                    this.moveObject = obj;
                    break;
                }
            }
        }
    };

    //所有场景元素 //---
    searchSceneItems() {
        this.sceneItems = [];
        this.scene.traverse(child => {
            switch (child.type) {
                case 'Mesh':
                    this.sceneItems.push(child);
                    break;
            }
        });
    };

    //创建模型选中外框
    createModelBorder() {
        if (this.selectObject) {
            this.selectCube = new THREE.BoxHelper(this.selectObject, 0xa10000); //BoundingBoxHelper //0x193677
            this.selectCube.update();
            this.scene.add(this.selectCube);
            this.selectCube.renderOrder = window['three3d'] ? window['three3d'].addOrder() : 0;
        }
    };

    //重建外框
    reCreateModelBorder() {
        this.scene.remove(this.selectCube);
        this.createModelBorder();
    }

    //清除监听
    removeListener() {
        if (this.isPc) {
            this.container.removeEventListener('click', this.onDocumentClick.bind(this), false);
            this.container.removeEventListener('mousemove', this.onDocumentMove.bind(this), false);
            this.container.addEventListener('dblclick', this.onDocumentDoubleClick.bind(this), false);
        } else {
            //监听移动端事件
            this.container.removeEventListener('touchstart', this.onTouchStart.bind(this), {
                passive: false
            }); //点击时
            this.container.removeEventListener('touchmove', this.onTouchMove.bind(this), {
                passive: false
            }); //移动时
            this.container.removeEventListener('touchend', this.onTouchEnd.bind(this), {
                passive: false
            }); //停止时
        }
    };

    //清除页面元素
    clearPageElement() {
        //面板信息
        this.scene.moveObject = '';
        this.scene.selectObject = '';
        this.moveObject = '';
        this.selectObject = '';
        this.scene.remove(this.selectCube);
    }

    initCircle() {
        let geometry = new THREE.CircleBufferGeometry(50, 50);
        let material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6
        });
        this.mouseCircle = new THREE.Mesh(geometry, material);
        this.scene.add(this.mouseCircle);
        this.mouseCircle.visible = false;
        this.mouseCircle.renderOrder = window['three3d'] ? window['three3d'].addOrder() : 0;
    }

}

export default AppMouseClass;