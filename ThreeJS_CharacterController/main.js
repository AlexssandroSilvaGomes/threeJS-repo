import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.118/examples/jsm/loaders/FBXLoader.js';

class State {
    constructor(parent) {
        this._parent = parent;
    }

    Enter() {}
    Exit() {}
    Update() {}
}

class IdleState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'idle';
    }

    Enter(prevState) {
        const idleAction = this._parent._proxy._animations['idle'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            
            // Sincroniza o tempo com a animação anterior
            const idleClip = idleAction.getClip();
            const prevClip = prevAction.getClip();
            const ratio = prevAction.time % prevClip.duration / prevClip.duration;
            idleAction.time = ratio * idleClip.duration; // Mantém o progresso do ciclo

            idleAction.enabled = true;
            idleAction.setEffectiveTimeScale(1.0);
            idleAction.setEffectiveWeight(1.0);
            idleAction.crossFadeFrom(prevAction, 0.5, true);
            idleAction.play();
        } else {
            idleAction.play();
        }
    }

    Update(_, input) {
        if (input._keys.forward || input._keys.backward) {
            this._parent.SetState('walk');
        } else if (input._keys.space) {
            this._parent.SetState('dance');
        }
    }
}

class DanceState extends State {
    constructor(parent) {
        super(parent);

        this._FinishedCallback = () => {
            this._Finished();
        }
    }

    get Name() {
        return 'dance';
    }

    Enter(prevState) {
        const danceAction = this._parent._proxy._animations['dance'].action;
        const mixer = danceAction.getMixer();
        mixer.addEventListener('finished', this._FinishedCallback);

        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            
            danceAction.reset();
            danceAction.setLoop(THREE.LoopOnce, 1);
            danceAction.clampWhenFinished = true;
            danceAction.crossFadeFrom(prevAction, 0.5, true);
            danceAction.play();
        } else {
            danceAction.play();
        }
    }

    _Finished() {
        this._Cleanup();
        this._parent.SetState('idle');
    }

    _Cleanup() {
        const action = this._parent._proxy._animations['dance'].action;
        action.getMixer().removeEventListener('finished', this._FinishedCallback);
    }

    Exit() {
        this._Cleanup();
    }

    Update(_) {}
}

class WalkState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'walk';
    }

    Enter(prevState) {
        const walkAction = this._parent._proxy._animations['walk'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            
            // Sincroniza o tempo com a animação anterior
            const walkClip = walkAction.getClip();
            const prevClip = prevAction.getClip();
            const ratio = prevAction.time % prevClip.duration / prevClip.duration;
            walkAction.time = ratio * walkClip.duration;

            walkAction.enabled = true;
            walkAction.setEffectiveTimeScale(1.0);
            walkAction.setEffectiveWeight(1.0);
            walkAction.crossFadeFrom(prevAction, 0.5, true);
            walkAction.play();
        } else {
            walkAction.play();
        }
    }

    Update(_, input) {
        if (input._keys.forward && input._keys.shift) {
            this._parent.SetState('run');
        } else if (!input._keys.forward && !input._keys.backward) {
            this._parent.SetState('idle');
        }
    }
}

class RunState extends State {
    constructor(parent) {
        super(parent);
    }

    get Name() {
        return 'run';
    }

    Enter(prevState) {
        const runAction = this._parent._proxy._animations['run'].action;
        if (prevState) {
            const prevAction = this._parent._proxy._animations[prevState.Name].action;
            
            // Sincroniza o tempo com a animação anterior
            const runClip = runAction.getClip();
            const prevClip = prevAction.getClip();
            const ratio = prevAction.time % prevClip.duration / prevClip.duration;
            runAction.time = ratio * runClip.duration;

            runAction.enabled = true;
            runAction.setEffectiveTimeScale(1.0);
            runAction.setEffectiveWeight(1.0);
            runAction.crossFadeFrom(prevAction, 0.5, true);
            runAction.play();
        } else {
            runAction.play();
        }
    }

    Update(_, input) {
        if (!input._keys.forward || input._keys.backward) {
            this._parent.SetState('walk');
        }
    }
}

class FiniteStateMachine {
    constructor() {
        this._states = {};
        this._currentState = null;
    }

    _AddState(name, type) {
        this._states[name] = type;
    }

    SetState(name) {
        const prevState = this._currentState;
        
        if (prevState) {
            if (prevState.Name == name) {
                return;
            }
            prevState.Exit();
        }

        const state = new this._states[name](this);

        this._currentState = state;
        state.Enter(prevState);
    }

    Update(timeElapsed, input) {
        if (this._currentState) {
            this._currentState.Update(timeElapsed, input);
        }
    }
}

class CharacterFMS extends FiniteStateMachine {
    constructor(proxy) {
        super();
        this._proxy = proxy;
        this._Init();
    }

    _Init() {
        this._AddState('idle', IdleState);
        this._AddState('walk', WalkState);
        this._AddState('run', RunState);
        this._AddState('dance', DanceState);
    }
}

class BasicCharacterController {
    constructor(params) {
        this._Init(params);
    }

    _Init(params) {
        this._params = params;
        this._decceleration = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity = new THREE.Vector3(0, 0, 0);
        this._position = new THREE.Vector3();

        this._animations = {};
        this._input = new BasicCharacterControllerInput();
        this._stateMachine = new CharacterFMS(new BasicCharacterControllerProxy(this._params.scene, this._animations));
        this._LoadModels();
    }

    _LoadModels() {
        const loader = new FBXLoader();
        loader.setPath('./resources/paladin/');
        loader.load('idle.fbx', (fbx) => {
            fbx.position.set(0, 0, 0);
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });

            this._target = fbx;
            this._params.scene.add(this._target);

            this._mixer = new THREE.AnimationMixer(this._target);

            // Manager para controlar o carregamento de todas as animações
            this._manager = new THREE.LoadingManager();
            this._manager.onLoad = () => {
                // Inicia no estado 'idle' após carregar tudo
                this._stateMachine.SetState('idle');
            };

            const _OnLoad = (animName, anim) => {
                const clip = anim.animations[0];
                const action = this._mixer.clipAction(clip);
                
                // Configura a ação para não iniciar automaticamente
                action.stop();
                
                this._animations[animName] = {
                    clip: clip,
                    action: action,
                };
            };

            // Carrega cada animação com o manager
            const animLoader = new FBXLoader(this._manager);
            animLoader.setPath('./resources/paladin/');
            animLoader.load('idle.fbx', (a) => _OnLoad('idle', a));
            animLoader.load('walk.fbx', (a) => _OnLoad('walk', a));
            animLoader.load('run.fbx', (a) => _OnLoad('run', a));
            animLoader.load('dance.fbx', (a) => _OnLoad('dance', a));
        });
    }

    Update(timeInSeconds) {
        if (!this._target || !this._mixer) {
            return;
        }

        // Atualiza o AnimationMixer
        this._mixer.update(timeInSeconds);

        this._stateMachine.Update(timeInSeconds, this._input);

        const velocity = this._velocity;
        const frameDecceleration = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            velocity.y * this._decceleration.y,
            velocity.z * this._decceleration.z
        );
        frameDecceleration.multiplyScalar(timeInSeconds);
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(Math.abs(frameDecceleration.z), Math.abs(velocity.z));
        velocity.add(frameDecceleration);

        const controlObject = this._target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        if (this._input._keys.forward) {
            velocity.z += this._acceleration.z * timeInSeconds;
        }
        if (this._input._keys.backward) {
            velocity.z -= this._acceleration.z * timeInSeconds;
        }
        if (this._input._keys.left) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }
        if (this._input._keys.right) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, 4.0 * -Math.PI * timeInSeconds * this._acceleration.y);
            _R.multiply(_Q);
        }

        controlObject.quaternion.copy(_R);

        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();
        forward.multiplyScalar(velocity.z * timeInSeconds);

        controlObject.position.add(forward);

        this._position.copy(controlObject.position);

        if (oldPosition.distanceToSquared(controlObject.position) > 0.0001) {
            this._params.camera.position.add(forward);
            this._params.camera.lookAt(controlObject.position);
        }
    }
}

class BasicCharacterControllerInput {
    constructor() {
        this._Init();
    }

    _Init() {
        this._keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            space: false,
            shift: false,
        };
        document.addEventListener('keydown', (e) => this._OnKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._OnKeyUp(e), false);
    }

    _OnKeyDown(event) {
        switch (event.keyCode) {
            case 87: // W
                this._keys.forward = true;
                break;
            case 65: // A
                this._keys.left = true;
                break;
            case 83: // S
                this._keys.backward = true;
                break;
            case 68: // D
                this._keys.right = true;
                break;
            case 32: // SPACE
                this._keys.space = true;
                break;
            case 16: // SHIFT
                this._keys.shift = true;
                break;
        }
    }

    _OnKeyUp(event) {
        switch (event.keyCode) {
            case 87: // W
                this._keys.forward = false;
                break;
            case 65: // A
                this._keys.left = false;
                break;
            case 83: // S
                this._keys.backward = false;
                break;
            case 68: // D
                this._keys.right = false;
                break;
            case 32: // SPACE
                this._keys.space = false;
                break;
            case 16: // SHIFT
                this._keys.shift = false;
                break;
        }
    }
}

class BasicCharacterControllerProxy {
    constructor(scene, animations) {
        this._scene = scene;
        this._animations = animations;
    }
}

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
        //this.scene.add(box); //add to scene

        //requestAnimationFrame
        this._RAF(); //start render
        //this._LoadModels(); //load models

        this._character = new BasicCharacterController({
            camera: this.camera,
            scene: this.scene,
        });
    }

    _OnWindowResize() {
        this.threejs.setSize(window.innerWidth, window.innerHeight); //update size
        this.camera.aspect = window.innerWidth / window.innerHeight; //update aspect
        this.camera.updateProjectionMatrix(); //update camera
    } //resize event

    _RAF() {
        requestAnimationFrame((t) => {
            if (this._previousRAF === null) {
                this._previousRAF = t;
            }

            this._RAF();

            this.threejs.render(this.scene, this.camera);
            this.controls.update();

            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        });
    } //requestAnimationFrame

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        if (this._character) {
            this._character.Update(timeElapsedS);
        }
    }
}

new BasicWorldDemo(); //create instance