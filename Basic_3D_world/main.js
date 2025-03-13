import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/GLTFLoader.js';
import {FBXLoader} from 'https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/loaders/FBXLoader.js';

class BasicWorldDemo {
    constructor() {
        this._Initialize();
    }

    _Initialize() {
        this.threejs = new THREE.WebGLRenderer(); //create renderer
        this.threejs.shadowMap.enabled = true; //enable shadow
        this.threejs.shadowMap.type = THREE.PCFSoftShadowMap; //default
        this.threejs.setPixelRatio(window.devicePixelRatio); //set pixel ratio
        this.threejs.setSize(window.innerWidth, window.innerHeight); //set size
        
        document.body.appendChild(this.threejs.domElement); //add to body

        window.addEventListener('resize', () => {
            this._OnWindowResize();
        }, false); //resize event

        const fov = 60;
        const aspect = 1920 / 1080;
        const near = 1.0; 
        const far = 1000.0; 
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far); //create camera
        camera.position.set(75, 20, 0); //set position
        this.camera = camera; //set camera
        this.scene = new THREE.Scene(); //create scene

        // Inicialize os controles de órbita
        this.controls = new OrbitControls(this.camera, this.threejs.domElement);

        let light = new THREE.DirectionalLight(0xFFFFFF);
        light.position.set(100, 100, 100);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        light.shadow.bias = -0.01;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        light.shadow.camera.near = 1.0;
        light.shadow.camera.far = 500;
        light.shadow.camera.left = 200;
        light.shadow.camera.right = -200;
        light.shadow.camera.top = 200; 
        light.shadow.camera.bottom = -200; 
        this.scene.add(light); //add light to scene

        light = new THREE.AmbientLight(0x404040); // soft white light
        this.scene.add(light); //add light to scene

        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            './resources/xneg.png',
            './resources/xpos.png',
            './resources/zpos.png',
            './resources/zneg.png',
            './resources/ypos.png',
            './resources/yneg.png',
        ], () => {
            // Callback após carregar todas as texturas
            this.scene.background = texture; //set background
        }, undefined, (err) => {
            console.error('Erro ao carregar as texturas do cubemap:', err);
        }); //load textures

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100, 1, 1),
            new THREE.MeshStandardMaterial({
                color: 0xFFFFFF,
            })
        ); //create plane
        plane.castShadow = false; //default is false
        plane.receiveShadow = true; //default
        plane.rotation.x = -Math.PI / 2; //rotate to horizontal
        this.scene.add(plane); //add to scene

        const box = new THREE.Mesh(
            new THREE.BoxGeometry(8, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0x808080,
            })
        ); //create box
        box.position.set(0, 4, 0); //set position
        box.castShadow = true; //default is false
        box.receiveShadow = true; //default
        this.scene.add(box); //add to scene

        //reqiestAnimationFrame
        this._RAF(); //start render
        //this._LoadModels(); //load models
        //this._LoadAnimatedModel(); //load animated model
    }

    _LoadAnimatedModel() {
        const loader = new FBXLoader(); //create loader
        loader.setPath('./resources/paladin/'); //set path
        loader.load('ZombieIdle.fbx', (fbx) => {
            fbx.scale.setScalar(0.1); //set scale
            fbx.traverse(c => {
                c.castShadow = true; //default is false
            }); 
            
            const anim = new FBXLoader(); //create loader
            anim.setPath('./resources/paladin/'); //set path
            anim.load('SwordAndShieldRun.fbx', (anim) => {
                this._mixer = new THREE.AnimationMixer(fbx); //create mixer
                const idle = this._mixer.clipAction(fbx.animations[0]); //create clip
                idle.play(); //play animation
            });
            this.scene.add(fbx); //add to scene
        }, undefined, (error) => {
            console.error('Erro ao carregar o modelo FBX:', error);
        }); //load model //load animation
    }

    _LoadModels() {
        const loader = new GLTFLoader(); //create loader
        loader.load('./resources/scene.gltf', (gltf) => {
            gltf.scene.traverse((c) => {
                c.castShadow = true; //default is false
            }); //traverse
            this.scene.add(gltf.scene); //add to scene
        }, undefined, (error) => {
            console.error('Erro ao carregar o modelo GLTF:', error);
        }); //load model
    }

    _OnWindowResize() {
        this.threejs.setSize(window.innerWidth, window.innerHeight); //update size
        this.camera.aspect = window.innerWidth / window.innerHeight; //update aspect
        this.camera.updateProjectionMatrix(); //update camera
    } //resize event

    _RAF() {
        requestAnimationFrame(() => {
            this.threejs.render(this.scene, this.camera); //render
            this.controls.update(); // Atualize os controles
            this._RAF(); 
        }); 
    } //requestAnimationFrame
}

new BasicWorldDemo(); //create instance