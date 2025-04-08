import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const TWEEN = window.TWEEN;

const manager = new THREE.LoadingManager();

let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
let mixer;

const clock = new THREE.Clock();

const assets = [
    'Hip Hop Dancing',
    'Silly Dancing',
    'Swing Dancing',
    'House Dancing',
    'Salsa Dancing'
];

let currentAssetIndex = 0;

const params = {
    asset: assets[currentAssetIndex]
};

init();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(100, 200, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    loader = new FBXLoader(manager);
    loadAsset(params.asset);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.update();

    window.addEventListener('resize', onWindowResize);

    // Keyboard controls
    window.addEventListener('keydown', function (event) {
        switch (event.key.toLowerCase()) {
            case 'x':
                loadNextAsset();
                break;
            case 'z':
                loadPreviousAsset();
                break;
        }
    });

    // stats
    stats = new Stats();
    container.appendChild(stats.dom);

    const gui = new GUI();
    gui.add(params, 'asset', assets).onChange(function (value) {
        currentAssetIndex = assets.indexOf(value);
        loadAsset(value);
    });

    guiMorphsFolder = gui.addFolder('Morphs').hide();
}

function fadeOutObject(obj, onComplete) {
    obj.traverse((child) => {
        if (child.material && child.material.transparent !== undefined) {
            child.material.transparent = true;
            new TWEEN.Tween({ opacity: 1 })
                .to({ opacity: 0 }, 500)
                .onUpdate((val) => {
                    child.material.opacity = val.opacity;
                })
                .onComplete(() => {
                    if (onComplete) onComplete();
                })
                .start();
        }
    });
}

function fadeInObject(obj) {
    obj.traverse((child) => {
        if (child.material && child.material.transparent !== undefined) {
            child.material.transparent = true;
            child.material.opacity = 0;
            new TWEEN.Tween({ opacity: 0 })
                .to({ opacity: 1 }, 500)
                .onUpdate((val) => {
                    child.material.opacity = val.opacity;
                })
                .start();
        }
    });
}

function loadNextAsset() {
    currentAssetIndex = (currentAssetIndex + 1) % assets.length;
    params.asset = assets[currentAssetIndex];
    loadAsset(params.asset);
}

function loadPreviousAsset() {
    currentAssetIndex = (currentAssetIndex - 1 + assets.length) % assets.length;
    params.asset = assets[currentAssetIndex];
    loadAsset(params.asset);
}

function loadAsset(asset) {
    const fadeAndLoad = () => {
        loader.load('../models/fbx/' + asset + '.fbx', function (group) {
            object = group;

            if (object.animations && object.animations.length) {
                mixer = new THREE.AnimationMixer(object);
                const action = mixer.clipAction(object.animations[0]);
                action.play();
            } else {
                mixer = null;
            }

            guiMorphsFolder.children.forEach((child) => child.destroy());
            guiMorphsFolder.hide();

            object.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.morphTargetDictionary) {
                        guiMorphsFolder.show();
                        const meshFolder = guiMorphsFolder.addFolder(child.name || child.uuid);
                        Object.keys(child.morphTargetDictionary).forEach((key) => {
                            meshFolder.add(child.morphTargetInfluences, child.morphTargetDictionary[key], 0, 1, 0.01);
                        });
                    }
                }
            });

            scene.add(object);
            fadeInObject(object);
        });
    };

    if (object) {
        fadeOutObject(object, () => {
            object.traverse((child) => {
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material.map) material.map.dispose();
                        material.dispose();
                    });
                }
                if (child.geometry) child.geometry.dispose();
            });
            scene.remove(object);
            object = null;
            fadeAndLoad();
        });
    } else {
        fadeAndLoad();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    renderer.render(scene, camera);
    stats.update();
    TWEEN.update(); // <- necesario para animaciones
}
