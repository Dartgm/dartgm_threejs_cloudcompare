import * as THREE from 'three';
import TWEEN from 'tween';

import {
	CSS2DRenderer,
	CSS2DObject
} from "three/examples/jsm/renderers/CSS2DRenderer.js"

import skybox1 from '../assets/img/skybox/star/1/px.jpg'
import skybox2 from '../assets/img/skybox/star/1/nx.jpg'
import skybox3 from '../assets/img/skybox/star/1/py.jpg'
import skybox4 from '../assets/img/skybox/star/1/ny.jpg'
import skybox5 from '../assets/img/skybox/star/1/pz.jpg'
import skybox6 from '../assets/img/skybox/star/1/nz.jpg'

import grasslight from '../assets/img/floor/grasslight.jpg'
import skyboxOne1 from '../assets/img/back/blue.jpg'

class CommonClass {
	constructor() {
		this.pageObj = '';

		this.fixedPageobj();
	}

	//默认对象值
	fixedPageobj() {
		this.pageObj = {

			isVision: false, //版本
			isTween: false, //动画
			isStats: false, //性能监测
			isGui: false, //GUI显示
			isCutPic: false,//Canvas截图
			cutPicType: 0,//截图类型，0-PNG，1-JPG，2-BMP
			isAxes: false, //三维坐标轴
			isMouse: false, //鼠标射线
			isMouseGroup: false,//鼠标射线是否拾取GROUP
			isDoubleClick: false,//双击打印点的位置

			mouseLeftClickFunc: '', //左键点击执行
			mouseLeftClickCancelFunc: '', //左键取消执行
			mouseRightClickFunc: '', //右键点击执行
			mouseRightClickCancelFunc: '', //右键取消执行
			mouseMoveFunc: '',//鼠标移动执行

			isCameraView: false, //观察者模式
			isSceneRotate: false, //场景旋转
			isControlRotate: false, //物体旋转

			isLimitControl: false, //限制地平线上

			isHalfRenderer: false,//帧数对半
			isCss2dRenderer: false, //CSS2D
			isCss3dRenderer: false, //CSS3D


			groundMethod: 0, //地板样式
			backGound: grasslight, //地板背景
			skyboxMethod: 0,//场景背景方式
			skyboxOne: skyboxOne1, //场景背景-单一
			skybox: [skybox1, skybox2, skybox3, skybox4, skybox5, skybox6], //场景背景-天空盒
			guiParams: {}, //GUI参数
			mouseArr: []//鼠标射线数组
		};
	}

}

export default CommonClass;