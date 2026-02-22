import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import {
  createFrameConfig,
  isLoadFinished,
  toggleAimingCursor,
  createResizeRendererHandler,
  createProgressHandler,
} from './JS/shared/scene-common.js';
import { initSharedUfo } from './JS/shared/ufo-factory.js';
import { createMeteorSystem } from './JS/shared/meteor-system.js';
import { createStarfieldSystem } from './JS/shared/starfield-system.js';

const textureLoader = new THREE.TextureLoader();
const {
  targetFps: TARGET_FPS,
  frameInterval,
  fpsScale,
} = createFrameConfig(60);
let frameAccumulator = 0;
let totalLoadItems = 0;
let loadedItemCount = 0;
const scene = new THREE.Scene();
let camera;
let renderer;
const rotatespeed = 5 * fpsScale;
//let stats = new Stats();
//stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
//document.body.appendChild(stats.dom);

const add_base = true;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let fast = false;
let esc = true;
const meteorites = [];
const METEOR_MAX_DISTANCE = 8000;
const METEOR_SPEED = 8 * fpsScale;
let arrived = 50;
let ufo_scale = 3.5;

const vec = new THREE.Vector3();
const originPoint = new THREE.Vector3(0, 0, 0);
const cameraPositionVec = vec.clone().set(100, 10, 200);
const cameraDirectionVec = vec.clone().set(0, 0, 0);
const hitDirectionVec = vec.clone().set(0, 0, 0);
let hit_frame = 0;
let catchspeed = 0;
let ufo_starlight = 0.06;
let transferSpeed = 1;
let t_in = true;
const chasing = vec.clone();
let chasingFrame = 50;
let safe_dis = 2.25;
let scaling = false;
let last_action;

const SEPARATION = 140,
  AMOUNTX = 24,
  AMOUNTY = 8,
  AMOUNTZ = 24;
let count = 0;
let starfieldSystem;
const STAR_GROUP_SIZE = 50;
const STAR_POINT_BASE_SIZE = 10;
const STAR_MOVE_DIVISOR = 20;
const STAR_COLOR_TINTS = [
  [0.7, 0.7, 1.0],
  [0.7, 0.7, 1.0],
  [0.7, 0.7, 1.0],
  [1.0, 1.0, 0.7],
];
const STAR_FADE_START_DISTANCE = 1200;
const STAR_FADE_END_DISTANCE = 1000;
const ISLAND_SEA_LEVEL_Y = -503 + 500;
const STAR_CONE_CENTER_HEIGHT_FROM_SEA = 500;
const STAR_CONE_EDGE_HEIGHT_FROM_SEA = 50;
const STAR_CONE_EDGE_RADIUS =
  Math.max(AMOUNTX, AMOUNTZ) * (SEPARATION / 2) + SEPARATION * 8;

// Mouse Move
let mouseP = { x: 0, y: 0 };
let up = 0;
let down = 0;
let left = 0;
let right = 0;

let maxSpeed = 0.02 * fpsScale;
const acc = 0.2 * fpsScale;
let currentSpeedForward = 0;
let currentSpeedRight = 0;
let moveInputStrength = 0;
let Forward = true;
let Right = true;
const clock = new THREE.Clock();
let angleX = 0;
let angleY = 0;

let speed = 1;
const obj3d = new THREE.Object3D();
const all_obj = obj3d.clone();
const all_obj1 = obj3d.clone();
const all_obj2 = obj3d.clone();
const all_obj3 = obj3d.clone();
const all_obj4 = obj3d.clone();

const raycaster = new THREE.Raycaster();
const raycaster1 = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selected_object = false;
const TOUCH_TAP_MAX_DURATION = 280;
const TOUCH_TAP_MAX_MOVE = 18;
const TOUCH_MOVE_DEADZONE = 0.1;
const TOUCH_LOOK_DEADZONE = 0.1;
const TOUCH_LOOK_SCALE = 0.35;
const TOUCH_ROCKER_TRAVEL_RATIO = 1;
const touchControlState = {
  initialized: false,
  overlay: null,
  move: {
    stick: null,
    knob: null,
    touchId: null,
    maxOffset: 1,
  },
  look: {
    stick: null,
    knob: null,
    touchId: null,
    maxOffset: 1,
  },
  tapCandidates: new Map(),
};
const isMobileDevice =
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
  navigator.maxTouchPoints > 1 ||
  window.matchMedia('(pointer: coarse)').matches;

function isFollowTargetObject(object) {
  if (!object) return false;
  if (object.userData && object.userData.ignoreClickFollow) return false;
  if (object.type === 'Sprite' || object.type === 'Points') return false;
  if (object.name === 'ring' || object.name === 'Sky') return false;
  return true;
}

function getStarConeMinY(x, z) {
  const radialDistance = Math.sqrt(x * x + z * z);
  const t = Math.min(radialDistance / STAR_CONE_EDGE_RADIUS, 1);
  const minHeightFromSea =
    STAR_CONE_CENTER_HEIGHT_FROM_SEA +
    (STAR_CONE_EDGE_HEIGHT_FROM_SEA - STAR_CONE_CENTER_HEIGHT_FROM_SEA) * t;
  return ISLAND_SEA_LEVEL_Y + minHeightFromSea;
}

const ufolight = textureLoader.load('img/ufo_light1.png');

const starball = textureLoader.load('img/ball.png');
const meteoriteball = textureLoader.load('img/star0.png');
const meteoritetail = textureLoader.load('img/start0.png');

const meteoriteballr = textureLoader.load('img/star00.png');

const material = new THREE.Sprite(
  new THREE.SpriteMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    map: meteoriteball,
    color: 0xffffff,
  }),
);
const materialr = new THREE.Sprite(
  new THREE.SpriteMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    map: meteoriteballr,
    color: 0xffffff,
  }),
);
const material1 = new THREE.Sprite(
  new THREE.SpriteMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    map: meteoritetail,
    color: 0xffffff,
  }),
);

const meteorite_Object3D = obj3d.clone();
const ufo = meteorite_Object3D.clone();
const meteorSystem = createMeteorSystem({
  THREE,
  scene,
  meteorTemplate: meteorite_Object3D,
  meteorHeadMaterial: material,
  meteorHeadAltMaterial: materialr,
  meteorTailMaterial: material1,
  maxDistance: METEOR_MAX_DISTANCE,
  speed: METEOR_SPEED,
  sizeScaleMin: 0.7,
  sizeScaleRange: 0.6,
  centerDotMin: 0.85,
  centerDotMax: 0.851,
  trailStepDivisor: 2.5,
});
const waterGeometry = new THREE.CircleGeometry(5000, 100);

const MeshWater = new Water(
  waterGeometry,
  {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: textureLoader.load(
      './texture/three/water/waternormals.jpg',
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      },
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e1f,
    distortionScale: 3,
    fog: scene.fog !== undefined,
  },
  2.0,
);
const normalMap2 = textureLoader.load(
  './texture/three/water/Water_1_M_Normal.jpg',
);
const clearcoatNormaMap = textureLoader.load(
  './texture/three/pbr/Scratched_gold/Scratched_gold_01_1K_Normal.png',
);

const ufo_material = new THREE.MeshPhysicalMaterial({
  clearcoat: 1.0,
  metalness: 1.0,
  color: 0xffffff,
  normalMap: normalMap2,
  normalScale: new THREE.Vector2(0.05, 0.05),
  clearcoatNormalMap: clearcoatNormaMap,

  // y scale is negated to compensate for normal map handedness.
  clearcoatNormalScale: new THREE.Vector2(1, -1),
});
function init() {
  const skyGeometry = new THREE.SphereGeometry(8000, 100, 100);
  const map = textureLoader.load('img/bg5.png');
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(15, 15);

  const skyBox = new THREE.Mesh(
    skyGeometry,
    new THREE.MeshBasicMaterial({
      map: map,
      side: THREE.BackSide,
    }),
  );
  skyBox.name = 'Sky';
  scene.add(skyBox);

  camera = new THREE.PerspectiveCamera(
    42, // fov 45 degree
    window.innerWidth / window.innerHeight, //aspect (width/height ratio)
    0.1, //near
    10000, // far
  );

  const whiteLightMaterial = new THREE.SpriteMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    map: starball,
    color: 0xffffff,
    depthTest: true,
    depthWrite: false,
  });
  const littlestar = new THREE.Sprite(whiteLightMaterial);
  starfieldSystem = createStarfieldSystem({
    THREE,
    scene,
    starTexture: starball,
    separation: SEPARATION,
    amountX: AMOUNTX,
    amountY: AMOUNTY,
    amountZ: AMOUNTZ,
    pointBaseSize: STAR_POINT_BASE_SIZE,
    groupSize: STAR_GROUP_SIZE,
    moveDivisor: STAR_MOVE_DIVISOR,
    colorTints: STAR_COLOR_TINTS,
    fadeStartDistance: STAR_FADE_START_DISTANCE,
    fadeEndDistance: STAR_FADE_END_DISTANCE,
    minYResolver: getStarConeMinY,
  });

  const geometryGround = new THREE.CircleGeometry(5000, 100, 100);
  geometryGround.rotateX(Math.PI / 2);
  geometryGround.translate(0, 0, 0);
  const texture = textureLoader.load('texture/pattern5.jpg');
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(500, 500);
  const materialGround = new THREE.MeshStandardMaterial({
    map: texture,
  });
  const MeshGround = new THREE.Mesh(geometryGround, materialGround);
  MeshGround.position.set(0, -510 + 500, 0);
  MeshGround.name = 'Ground';
  MeshGround.receiveShadow = true;
  MeshGround.castShadow = false;
  all_obj4.add(MeshGround);

  MeshWater.rotation.x = -Math.PI / 2;
  MeshWater.position.set(0, ISLAND_SEA_LEVEL_Y, 0);
  MeshWater.name = 'Water';
  MeshWater.receiveShadow = true;
  MeshWater.castShadow = false;
  all_obj4.add(MeshWater);

  camera.position.set(
    cameraPositionVec.x,
    cameraPositionVec.y,
    cameraPositionVec.z,
  );
  camera.lookAt(
    cameraDirectionVec.x,
    cameraDirectionVec.y,
    cameraDirectionVec.z,
  );

  scene.add(camera);

  if (!isMobileDevice) {
    document.addEventListener('mousemove', mouseMove, false);
  } else {
    setupTouchControls();
  }

  scene.add(new THREE.AmbientLight(0x282930));

  renderer = new THREE.WebGLRenderer({ logarithmicDepthBuffer: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('container').appendChild(renderer.domElement);
  document.body.appendChild(renderer.domElement);

  totalLoadItems += 2;
  const onProgress_obj = createProgressHandler(function markObjLoaded() {
    loadedItemCount += 1;
  }, 'obj');
  const onProgress_mtl = createProgressHandler(function markMtlLoaded() {
    loadedItemCount += 1;
  }, 'mtl');
  initSharedUfo({
    THREE,
    scene,
    ufo,
    ufoScale: ufo_scale,
    ufoLightTexture: ufolight,
    littleStar: littlestar,
    ufoMaterial: ufo_material,
    onProgressObj: onProgress_obj,
    onProgressMtl: onProgress_mtl,
    ballSegments: 30,
    mainLight: {
      intensity: 0.5,
      distanceDivisor: 20,
      decay: 0.75,
      castShadow: true,
      shadowMapSize: 512,
      shadowRadius: 3,
    },
    secondaryLight: {
      intensity: 1.5,
      distanceDivisor: 20,
      decay: 0.95,
      castShadow: true,
      shadowMapSize: 512,
      shadowRadius: 3,
    },
  });

  const village1 = obj_loader(
    'obj/village1/village_final',
    'obj/village1/village_final',
    2,
  );
  village1.position.set(-900 + 1000, -505 + 500, -100 + 300);
  village1.rotation.x = Math.PI / 180;
  village1.rotation.z = Math.PI / 2000;
  village1.name = 'Village1';
  if (add_base) all_obj2.add(village1);

  const tower = obj_loader('obj/tower/tower', 'obj/tower/tower', 0.05);
  tower.position.set(-702 + 1000, -488.5 + 500, -22 + 300);
  tower.rotation.y = -Math.PI / 4;
  tower.name = 'Tower';
  if (add_base) all_obj2.add(tower);

  const citylight2 = light_loader(
    'obj/light3/light2',
    'obj/light3/light2',
    0.025,
  );
  citylight2.position.set(101, -3.95, 204.5);
  citylight2.rotation.y = Math.PI;
  citylight2.name = 'citylight2';
  if (add_base) all_obj2.add(citylight2);

  const ball_light = obj3d.clone();
  const ball = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.2, 3, 8),
    new THREE.MeshPhongMaterial({
      color: 0xffddaa,
      specular: 0xffffff,
      emissive: 0xffddaa,
      transparent: true,
      opacity: 0.95,
    }),
  );
  const ball1 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 6.2, 8),
    new THREE.MeshPhongMaterial({
      color: 0xffddaa,
      specular: 0xffffff,
      emissive: 0xffddaa,
      transparent: true,
      opacity: 0.95,
    }),
  );

  const light_white1 = new THREE.PointLight(
    0xffddaa,
    0.5,
    200 * 1 /*ufo_scale/100*/,
  );

  light_white1.penumbra = 0.3;
  light_white1.castShadow = true;
  light_white1.shadow.mapSize.width = 2024;
  light_white1.shadow.mapSize.height = 2024;
  light_white1.shadow.camera.far = 200;
  light_white1.shadow.camera.near = 1.5;
  light_white1.shadow.radius = 100;
  //  light_white1.shadowBias = -0.001;
  light_white1.position.y = 1.5;
  ball_light.add(light_white1);
  ball_light.add(ball);
  ball_light.add(ball1);
  ball_light.position.set(298.75, 31, 277.25);
  ball_light.rotateY(Math.PI / 8);
  if (add_base) all_obj2.add(ball_light);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(120, 20, 20),
    new THREE.MeshPhongMaterial({
      color: 0xffddaa,
      specular: 0xffffff,
      emissive: 0xffddaa,
      transparent: true,
      opacity: 0.95,
    }),
  );
  moon.position.set(7500, 7000, -7500);
  moon.name = 'moon';
  if (add_base) all_obj2.add(moon);

  // const gui = new GUI()
  // const cubeFolder = gui.addFolder("ball_light")
  // cubeFolder.add(moon.position, "x", 0, 1000, 0.05)
  // cubeFolder.add(moon.position, "y", 0, 32, 0.05)
  // cubeFolder.add(moon.position, "z",0, 1000, 0.05)

  // cubeFolder.open()

  all_obj2.scale.set(0.5, 0.5, 0.5);
  all_obj.add(all_obj1);
  all_obj.add(all_obj2);
  all_obj.add(all_obj3);
  all_obj.add(all_obj4);
  scene.add(all_obj);
}
init();

const onKeyDown = function (e) {
  switch (e.keyCode) {
    case 87:
    case 38:
      moveForward = true;
      selected_object = false;
      break;

    case 83:
    case 40:
      moveBackward = true;
      selected_object = false;
      break;

    case 65:
    case 37:
      moveLeft = true;
      selected_object = false;
      break;

    case 68:
    case 39:
      moveRight = true;
      selected_object = false;
      break;

    case 16:
      fast = true;
      break;

    case 27:
      esc = true;
      $('#blocker').fadeIn(1200);
      $('#content').fadeIn(1200);
      $('#secondBlocker').fadeOut(600);
      break;

    case 69:
      ufo_scale += 0.025;
      if (ufo_scale <= 5) {
        angleY = angleY * 0.995;
      }
      ufo_scale = Math.min(6, ufo_scale);
      ufo.scale.set(ufo_scale, ufo_scale, ufo_scale);
      scaling = true;
      break;

    case 81:
      ufo_scale -= 0.025;
      if (ufo_scale >= 1) {
        if (angleY > 0.1 || angleY < -0.1) {
          angleY = angleY * 0.985;
        } else {
          angleY = angleY * 0.96;
        }
      }
      ufo_scale = Math.max(1.05, ufo_scale);
      ufo.scale.set(ufo_scale, ufo_scale, ufo_scale);
      scaling = true;
      break;
  }
};

const onKeyUp = function (e) {
  switch (e.keyCode) {
    case 87:
    case 38:
      moveForward = false;
      break;

    case 83:
    case 40:
      moveBackward = false;
      break;

    case 65:
    case 37:
      moveLeft = false;
      break;

    case 68:
    case 39:
      moveRight = false;
      break;

    case 16:
      fast = false;
      break;

    case 69:
      scaling = false;
      break;

    case 81:
      scaling = false;
      break;
  }
};

document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('keyup', onKeyUp, false);

let model,
  head, // Our character
  neck, // Reference to the neck bone in the skeleton
  waist, // Reference to the waist bone in the skeleton
  possibleAnims, // Animations found in our file
  mixer, // THREE.js animations mixer
  idle, // Idle, the default state our character returns to
  //clock = new THREE.Clock(),          // Used for anims, which run to a clock instead of frame rate
  currentlyAnimating = false; // Used to check whether characters neck is being used in another anim
//raycaster = new THREE.Raycaster(),  // Used to detect the click on our character
const loaderAnim = document.getElementById('js-loader');

const MODEL_PATH = './obj/model/model.glb';
const stacy_txt = textureLoader.load('./obj/model/model.jpg');

stacy_txt.flipY = false; // we flip the texture so that its the right way up

const stacy_mtl = new THREE.MeshPhongMaterial({
  map: stacy_txt,
  color: 0xffffff,
  skinning: true,
});

const people_loader = new GLTFLoader();
people_loader.load(
  MODEL_PATH,
  function (gltf) {
    // A lot is going to happen here
    model = gltf.scene;
    const fileAnimations = gltf.animations;
    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.material = stacy_mtl; // Add this line
      }
      if (o.isBone && o.name === 'mixamorigNeck') {
        neck = o;
      }
      if (o.isBone && o.name === 'mixamorigSpine') {
        waist = o;
      }
      if (o.isBone && o.name === 'mixamorigHead') {
        head = o;
      }
    });
    model.scale.set(1, 1, 1);
    model.position.set(95.5, -3.85, 204);
    model.rotation.x = Math.PI / 500;
    if (add_base) all_obj2.add(model);
    loaderAnim.remove();
    mixer = new THREE.AnimationMixer(model);

    const clips = fileAnimations.filter((val) => val.name !== 'idle');
    possibleAnims = clips.map((val) => {
      let clip = THREE.AnimationClip.findByName(clips, val.name);

      clip.tracks.splice(3, 3);
      clip.tracks.splice(9, 3);

      clip = mixer.clipAction(clip);
      return clip;
    });

    const idleAnim = THREE.AnimationClip.findByName(fileAnimations, 'idle');

    idleAnim.tracks.splice(3, 3);
    idleAnim.tracks.splice(9, 3);

    idle = mixer.clipAction(idleAnim);
    idle.play();
    last_action = idle;
  },
  undefined,
  function (error) {
    console.error(error);
  },
);

function obj_loader(url, url1, scale, double = false) {
  totalLoadItems += 2;
  const onProgress_obj = createProgressHandler(function markObjLoaded() {
    loadedItemCount += 1;
  }, 'obj');
  const onProgress_mtl = createProgressHandler(function markMtlLoaded() {
    loadedItemCount += 1;
  }, 'mtl');
  const newobj = obj3d.clone();
  const newmtl = new MTLLoader();
  if (double) {
    newmtl.setMaterialOptions({ side: THREE.DoubleSide });
  }
  newmtl.load(
    url1 + '.mtl',
    (mtl) => {
      mtl.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mtl);
      objLoader.load(
        url + '.obj',
        (root) => {
          for (let k = 0; k < root.children.length; k++) {
            root.children[k].castShadow = true;
            root.children[k].receiveShadow = true;
          }
          root.position.set(0, 0, 0);
          root.scale.set(scale, scale, scale);
          newobj.add(root);
        },
        onProgress_obj,
      );
    },
    onProgress_mtl,
  );
  return newobj;
}

function light_loader(url, url1, scale, double = false) {
  totalLoadItems += 2;
  const onProgress_obj = createProgressHandler(function markObjLoaded() {
    loadedItemCount += 1;
  }, 'obj');
  const onProgress_mtl = createProgressHandler(function markMtlLoaded() {
    loadedItemCount += 1;
  }, 'mtl');
  const newobj = obj3d.clone();
  const newmtl = new MTLLoader();
  newmtl.load(
    url1 + '.mtl',
    (mtl) => {
      mtl.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mtl);
      objLoader.load(
        url + '.obj',
        (root) => {
          const object = root;
          for (const k in root.children) {
            root.children[k].castShadow = true;
            root.children[k].receiveShadow = true;
          }

          const Cylinder = new THREE.Mesh(
            new THREE.CylinderGeometry(16, 12, 30, 30),
            new THREE.MeshPhongMaterial({
              color: 0xffddaa,
              specular: 0xffffff,
              emissive: 0xffddaa,
              transparent: true,
              opacity: 0.98,
            }),
          );
          Cylinder.rotation.y = Math.PI / 3;
          Cylinder.position.set(0, 225, 1.925);
          const light_white = new THREE.PointLight(0xffddaa, 1, 2000 * scale);
          light_white.position.set(0, 225, 1.925);
          light_white.penumbra = 0.3;
          light_white.castShadow = true;
          light_white.shadow.mapSize.width = 512;
          light_white.shadow.mapSize.height = 512;
          light_white.shadow.camera.far = 2000 * scale;
          light_white.shadow.camera.near = 32 * scale;
          light_white.shadow.radius = 5;
          //   light_white.shadowBias = -0.001;
          object.position.set(0, 0, 0);
          object.scale.set(0.2, 0.2, 0.2);
          newobj.add(object);
          newobj.add(Cylinder);
          newobj.add(light_white);
          newobj.scale.set(scale, scale, scale);
        },
        onProgress_obj,
      );
    },
    onProgress_mtl,
  );
  return newobj;
}

function updatePointerFromClient(clientX, clientY) {
  mouse.x = (clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(clientY / window.innerHeight) * 2 + 1;
}

function getMousePosition() {
  const x = document.getElementById('aiming1').offsetLeft + 10;
  const y = document.getElementById('aiming1').offsetTop + 10;
  return { x: x, y: y };
}

function setMoveInputFromAxis(axisX, axisY) {
  const horizontal = Math.abs(axisX) > TOUCH_MOVE_DEADZONE ? axisX : 0;
  const vertical = Math.abs(axisY) > TOUCH_MOVE_DEADZONE ? axisY : 0;
  moveInputStrength = Math.min(1, Math.hypot(horizontal, vertical));

  moveLeft = horizontal < 0;
  moveRight = horizontal > 0;
  moveForward = vertical < 0;
  moveBackward = vertical > 0;

  if (moveLeft || moveRight || moveForward || moveBackward) {
    selected_object = false;
  }
}

function setLookInputFromAxis(axisX, axisY) {
  const horizontal = Math.abs(axisX) > TOUCH_LOOK_DEADZONE ? axisX : 0;
  const vertical = Math.abs(axisY) > TOUCH_LOOK_DEADZONE ? axisY : 0;

  left = Math.max(0, -horizontal) * TOUCH_LOOK_SCALE;
  right = Math.max(0, horizontal) * TOUCH_LOOK_SCALE;
  up = Math.max(0, -vertical) * TOUCH_LOOK_SCALE;
  down = Math.max(0, vertical) * TOUCH_LOOK_SCALE;
}

function setRockerKnobPosition(knob, offsetX, offsetY) {
  if (!knob) return;
  knob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
}

function getRockerMaxOffset(stick) {
  if (!stick) return 1;

  const stickRect = stick.getBoundingClientRect();
  let stickSize = Math.min(stickRect.width, stickRect.height);
  if (!stickSize) {
    const stickStyle = window.getComputedStyle(stick);
    stickSize = Math.min(
      parseFloat(stickStyle.width) || 0,
      parseFloat(stickStyle.height) || 0,
    );
  }

  if (!stickSize) return 1;
  return Math.max(1, (stickSize / 2) * TOUCH_ROCKER_TRAVEL_RATIO);
}

function isGameplayActive() {
  const content = document.getElementById('content');
  return Boolean(content && content.style.display == 'none' && !esc);
}

function resetMoveTouchState() {
  touchControlState.move.touchId = null;
  setMoveInputFromAxis(0, 0);
  setRockerKnobPosition(touchControlState.move.knob, 0, 0);
}

function resetLookTouchState() {
  touchControlState.look.touchId = null;
  setLookInputFromAxis(0, 0);
  setRockerKnobPosition(touchControlState.look.knob, 0, 0);
}

function isTouchInsideElement(touch, element) {
  if (!element) return false;
  const rect = element.getBoundingClientRect();
  return (
    touch.clientX >= rect.left &&
    touch.clientX <= rect.right &&
    touch.clientY >= rect.top &&
    touch.clientY <= rect.bottom
  );
}

function setRockerAxisFromTouch(control, touch, applyAxis) {
  if (!control.stick || !control.knob) return;
  const rect = control.stick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const deltaX = touch.clientX - centerX;
  const deltaY = touch.clientY - centerY;
  const distance = Math.hypot(deltaX, deltaY);
  const maxOffset = control.maxOffset || 1;
  const clampedScale = distance > maxOffset ? maxOffset / distance : 1;
  const offsetX = deltaX * clampedScale;
  const offsetY = deltaY * clampedScale;

  setRockerKnobPosition(control.knob, offsetX, offsetY);
  applyAxis(offsetX / maxOffset, offsetY / maxOffset);
}

function updateTouchControlLayout() {
  if (!touchControlState.initialized) return;

  const overlay = touchControlState.overlay;
  if (overlay && overlay.style.display === 'none') {
    return;
  }

  touchControlState.move.maxOffset = getRockerMaxOffset(
    touchControlState.move.stick,
  );
  touchControlState.look.maxOffset = getRockerMaxOffset(
    touchControlState.look.stick,
  );
}

function updateTouchControlVisibility() {
  if (!touchControlState.overlay) return;
  const active = isGameplayActive();
  const wasVisible = touchControlState.overlay.style.display === 'block';
  touchControlState.overlay.style.display = active ? 'block' : 'none';
  if (active && !wasVisible) {
    requestAnimationFrame(updateTouchControlLayout);
  }
  if (!active) {
    if (touchControlState.move.touchId !== null) {
      resetMoveTouchState();
    }
    if (touchControlState.look.touchId !== null) {
      resetLookTouchState();
    }
    touchControlState.tapCandidates.clear();
  }
}

function registerTapCandidate(touch) {
  touchControlState.tapCandidates.set(touch.identifier, {
    startX: touch.clientX,
    startY: touch.clientY,
    startTime: performance.now(),
    moved: false,
  });
}

function updateTapCandidate(touch) {
  const candidate = touchControlState.tapCandidates.get(touch.identifier);
  if (!candidate) return;
  const deltaX = touch.clientX - candidate.startX;
  const deltaY = touch.clientY - candidate.startY;
  if (Math.hypot(deltaX, deltaY) > TOUCH_TAP_MAX_MOVE) {
    candidate.moved = true;
  }
}

function clearTapCandidate(touch, allowSelection) {
  const candidate = touchControlState.tapCandidates.get(touch.identifier);
  if (!candidate) return false;

  touchControlState.tapCandidates.delete(touch.identifier);
  if (!allowSelection) return false;

  const elapsed = performance.now() - candidate.startTime;
  const deltaX = touch.clientX - candidate.startX;
  const deltaY = touch.clientY - candidate.startY;
  const moved =
    candidate.moved || Math.hypot(deltaX, deltaY) > TOUCH_TAP_MAX_MOVE;
  if (moved || elapsed > TOUCH_TAP_MAX_DURATION) return false;

  onMouseClick({ clientX: touch.clientX, clientY: touch.clientY });
  return true;
}

function handleTouchStart(event) {
  if (!touchControlState.initialized || !isGameplayActive()) return;
  updateTouchControlLayout();

  let consumed = false;
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    const inMoveRocker = isTouchInsideElement(
      touch,
      touchControlState.move.stick,
    );
    const inLookRocker = isTouchInsideElement(
      touch,
      touchControlState.look.stick,
    );

    if (inMoveRocker && touchControlState.move.touchId === null) {
      touchControlState.move.touchId = touch.identifier;
      setRockerAxisFromTouch(
        touchControlState.move,
        touch,
        setMoveInputFromAxis,
      );
      consumed = true;
      continue;
    }

    if (inLookRocker && touchControlState.look.touchId === null) {
      touchControlState.look.touchId = touch.identifier;
      setRockerAxisFromTouch(
        touchControlState.look,
        touch,
        setLookInputFromAxis,
      );
      consumed = true;
      continue;
    }

    if (!inMoveRocker && !inLookRocker) {
      registerTapCandidate(touch);
    }
  }

  if (consumed) {
    event.preventDefault();
  }
}

function handleTouchMove(event) {
  if (!touchControlState.initialized) return;

  let consumed = false;
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    if (touch.identifier === touchControlState.move.touchId) {
      setRockerAxisFromTouch(
        touchControlState.move,
        touch,
        setMoveInputFromAxis,
      );
      consumed = true;
      continue;
    }

    if (touch.identifier === touchControlState.look.touchId) {
      setRockerAxisFromTouch(
        touchControlState.look,
        touch,
        setLookInputFromAxis,
      );
      consumed = true;
      continue;
    }

    updateTapCandidate(touch);
  }

  if (consumed || isGameplayActive()) {
    event.preventDefault();
  }
}

function handleTouchEndInternal(event, allowSelection) {
  if (!touchControlState.initialized) return;

  let consumed = false;
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    if (touch.identifier === touchControlState.move.touchId) {
      resetMoveTouchState();
      consumed = true;
      continue;
    }

    if (touch.identifier === touchControlState.look.touchId) {
      resetLookTouchState();
      consumed = true;
      continue;
    }

    const selected = clearTapCandidate(
      touch,
      allowSelection && isGameplayActive(),
    );
    consumed = consumed || selected;
  }

  if (consumed || isGameplayActive()) {
    event.preventDefault();
  }
}

function handleTouchEnd(event) {
  handleTouchEndInternal(event, true);
}

function handleTouchCancel(event) {
  handleTouchEndInternal(event, false);
}

function setupTouchControls() {
  if (touchControlState.initialized) return;

  touchControlState.overlay = document.getElementById('touch-controls');
  touchControlState.move.stick = document.getElementById('move-rocker');
  touchControlState.move.knob = document.getElementById('move-rocker-knob');
  touchControlState.look.stick = document.getElementById('look-rocker');
  touchControlState.look.knob = document.getElementById('look-rocker-knob');

  if (
    !touchControlState.overlay ||
    !touchControlState.move.stick ||
    !touchControlState.move.knob ||
    !touchControlState.look.stick ||
    !touchControlState.look.knob
  ) {
    return;
  }

  touchControlState.initialized = true;
  updateTouchControlLayout();
  resetMoveTouchState();
  resetLookTouchState();
  updateTouchControlVisibility();

  window.addEventListener('resize', updateTouchControlLayout);
  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('touchcancel', handleTouchCancel, { passive: false });
}

function mouseMove(e) {
  if (isMobileDevice) return;

  document.getElementById('aiming1').style.left = e.clientX - 10 + 'px';
  document.getElementById('aiming1').style.top = e.clientY - 10 + 'px';
  updatePointerFromClient(e.clientX, e.clientY);

  if (esc) {
    mouseP = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  } else {
    mouseP = getMousePosition();
  }
  if (mouseP['y'] / window.innerHeight < 0.5) {
    up = 0.5 - mouseP['y'] / window.innerHeight;
  } else {
    up = 0;
  }
  if (mouseP['y'] / window.innerHeight > 0.62) {
    down = mouseP['y'] / window.innerHeight - 0.62;
  } else {
    down = 0;
  }
  if (mouseP['x'] / window.innerWidth < 0.47) {
    left = 0.47 - mouseP['x'] / window.innerWidth;
  } else {
    left = 0;
  }
  if (mouseP['x'] / window.innerWidth > 0.53) {
    right = mouseP['x'] / window.innerWidth - 0.53;
  } else {
    right = 0;
  }
}

function bounder_detect() {
  const distance =
    Math.sqrt(
      cameraPositionVec.x * cameraPositionVec.x +
        cameraPositionVec.z * cameraPositionVec.z,
    ) - 1000;
  const dir = vec
    .clone()
    .set(0 - cameraPositionVec.x, 0, 0 - cameraPositionVec.z)
    .normalize();
  if (distance > 0) {
    selected_object = false;
    cameraPositionVec.z += distance * dir.z;
    cameraPositionVec.x += distance * dir.x;
  }
  cameraPositionVec.y = Math.max(
    all_obj4.children[1].position.y + 0.15 * ufo_scale,
    Math.min(1000, cameraPositionVec.y),
  );
  if (cameraPositionVec.y > 500) {
    selected_object = false;
    document.getElementById('blocker1').style.backgroundColor =
      'rgba(0, 0, 0, 1)';
    $('#blocker1').fadeIn(2500);
    setTimeout(function () {
      window.location.href = 'solar.html';
    }, 3500);
  }
  //  if (crash_detect(ufo, sun, "sun") && crash_detect(ufo, star1, "star1") && crash_detect(ufo, star2, "star2") && crash_detect(ufo, star3, "star3") && crash_detect(ufo, starlite3, "starlite3") && crash_detect(ufo, star4, "star4") && crash_detect(ufo, star5, "star5") && crash_detect(ufo, star6, "star6") && crash_detect(ufo, starlite6, "starlite6") && crash_detect(ufo, star7, "star7") && crash_detect(ufo, star8, "star8") && crash_detect(ufo, star9, "star9")) return false;
  //  else return true;
}
function hit_detect(count) {
  const detect_obj = [
    all_obj1,
    all_obj2.children[0],
    all_obj2.children[1],
    all_obj2.children[3],
    all_obj2.children[4],
    all_obj2.children[5],
    all_obj3,
  ];
  raycaster.near = 0.1;
  raycaster.far = 0.5 * ufo_scale;
  const local = vec
    .clone()
    .set(ufo.position.x, ufo.position.y + 0.1 * ufo_scale, ufo.position.z);
  const detect_ang1 = count * 100;
  const detect_ang2 = count * 100 + Math.PI * 0.4;
  const detect_ang3 = count * 100 + Math.PI * 0.8;
  const detect_ang4 = count * 100 + Math.PI * 1.2;
  const detect_ang5 = count * 100 + Math.PI * 1.6;
  const all_direct1 = [
    vec.clone().set(Math.sin(detect_ang1), 0, Math.cos(detect_ang1)),
    vec.clone().set(Math.sin(detect_ang2), 0, Math.cos(detect_ang2)),
    vec.clone().set(Math.sin(detect_ang3), 0, Math.cos(detect_ang3)),
    vec.clone().set(Math.sin(detect_ang4), 0, Math.cos(detect_ang4)),
    vec.clone().set(Math.sin(detect_ang5), 0, Math.cos(detect_ang5)),
  ];
  for (let i = 0; i < all_direct1.length; i++) {
    raycaster.set(local, all_direct1[i].normalize());
    const hit_face = raycaster.intersectObjects(detect_obj, true);
    if (hit_face.length > 0) {
      if (hit_face[0].distance < 0.5 * ufo_scale) {
        hitDirectionVec.set(
          local.x - hit_face[0].point.x,
          local.y - hit_face[0].point.y,
          local.z - hit_face[0].point.z,
        );
        return true;
      }
    }
  }
  const all_direct2 = [vec.clone().set(0, 1, 0), vec.clone().set(0, -1, 0)];
  for (let i = 0; i < all_direct2.length; i++) {
    raycaster.set(local, all_direct2[i].normalize());
    const hit_face = raycaster.intersectObjects(detect_obj, true);
    if (hit_face.length > 0) {
      if (hit_face[0].distance < 0.16 * ufo_scale) {
        hitDirectionVec.set(
          local.x - hit_face[0].point.x,
          local.y - hit_face[0].point.y,
          local.z - hit_face[0].point.z,
        );
        return true;
      }
    }
  }
  const all_direct3 = [
    vec.clone().set(47.75 - ufo.position.x, 0, 102 - ufo.position.z),
  ];
  for (let i = 0; i < all_direct3.length; i++) {
    raycaster.set(local, all_direct3[i].normalize());
    const hit_face = raycaster.intersectObjects([all_obj2.children[5]], true);
    if (hit_face.length > 0) {
      if (hit_face[0].distance < 0.5 * ufo_scale) {
        hitDirectionVec.set(
          local.x - hit_face[0].point.x,
          local.y - hit_face[0].point.y,
          local.z - hit_face[0].point.z,
        );
        return true;
      }
    }
  }
  const all_direct4 = [
    vec.clone().set(50.5 - ufo.position.x, 0, 102.25 - ufo.position.z),
  ];
  for (let i = 0; i < all_direct4.length; i++) {
    raycaster.set(local, all_direct4[i].normalize());
    const hit_face = raycaster.intersectObjects([all_obj2.children[2]], true);
    if (hit_face.length > 0) {
      if (hit_face[0].distance < 0.5 * ufo_scale) {
        hitDirectionVec.set(
          local.x - hit_face[0].point.x,
          local.y - hit_face[0].point.y,
          local.z - hit_face[0].point.z,
        );
        return true;
      }
    }
  }
  return false;
}

function onMouseClick(event) {
  if (
    event &&
    typeof event.clientX === 'number' &&
    typeof event.clientY === 'number'
  ) {
    updatePointerFromClient(event.clientX, event.clientY);
  }

  if (document.getElementById('content').style.display == 'none' && !esc) {
    raycaster1.setFromCamera(mouse, camera);
    raycaster1.near = 0.1;
    raycaster1.far = 10000;
    const intersects = raycaster1.intersectObjects(scene.children, true);
    let hitIndex = -1;
    for (let i = 0; i < intersects.length; i++) {
      if (isFollowTargetObject(intersects[i].object)) {
        hitIndex = i;
        break;
      }
    }
    if (hitIndex !== -1) {
      arrived = 50;
      selected_object = intersects[hitIndex];
      catchspeed = 0;
      t_in = true;
    } else {
      selected_object = false;
      t_in = false;
    }
  }
}

if (!isMobileDevice) {
  window.addEventListener('mousedown', onMouseClick, false);
}

function operation_method_1(delta, count) {
  if (!ufo || !ufo.children || !ufo.children[10]) return;
  bounder_detect();
  if (hit_detect(count) && hit_frame < 490) {
    hit_frame = 500;
    chasingFrame = 0;
  }
  if (hit_frame > 0) {
    moveForward = moveLeft = moveRight = moveBackward = false;
    currentSpeedForward = 0;
    currentSpeedRight = 0;
    cameraPositionVec.x +=
      (hitDirectionVec.x * hit_frame * rotatespeed) / 500000;
    cameraPositionVec.y +=
      (hitDirectionVec.y * hit_frame * rotatespeed) / 500000;
    cameraPositionVec.z +=
      (hitDirectionVec.z * hit_frame * rotatespeed) / 500000;

    ufo.rotation.x = Math.cos((hit_frame * Math.PI) / 7) * (hit_frame / 3000);
    ufo.rotation.z = Math.sin((hit_frame * Math.PI) / 7) * (hit_frame / 3000);
    ufo.children[1].scale.set(0, 0);
    ufo.children[1].material.opacity = 0;
    ufo.children[1].position.y = 0.15;

    ufo.children[10].material.color.set(0xff2222);
    ufo.children[10].material.specular.set(0xff2222);
    ufo.children[10].material.emissive.set(0xff2222);

    hit_frame -= fpsScale;
    speed = -speed / 20 + speed;
    selected_object = false;
  } else {
    ufo.rotation.x = 0;
    ufo.children[10].material.color.set(0x44e0ff);
    ufo.children[10].material.specular.set(0x44e0ff);
    ufo.children[10].material.emissive.set(0x44e0ff);
  }
  if (document.getElementById('content').style.display == 'none') {
    esc = false;
  }
  if (fast) maxSpeed = 0.04 * fpsScale;
  else maxSpeed = Math.max(maxSpeed - 0.002 * fpsScale, 0.02 * fpsScale);
  const touchDrivenMove =
    isMobileDevice && touchControlState.move.touchId !== null;
  const moveSpeedScale = touchDrivenMove
    ? Math.max(0.05, moveInputStrength)
    : 1;
  const maxSpeedForward = maxSpeed * moveSpeedScale;
  const maxSpeedRight = (maxSpeed / 2) * moveSpeedScale;

  if ((moveForward || moveBackward || moveRight || moveLeft) && !fast) {
    ufo.children[1].scale.y =
      ((0.4 - ufo.children[1].scale.y) / 50) * fpsScale +
      ufo.children[1].scale.y;
    ufo.children[1].material.opacity =
      ((0.8 - ufo.children[1].material.opacity) / 50) * fpsScale +
      ufo.children[1].material.opacity;
    ufo.children[1].position.y =
      ((-0.09 - ufo.children[1].position.y) / 50) * fpsScale +
      ufo.children[1].position.y;
    speed = (2 - speed) / 50 + speed;
  } else if ((moveForward || moveBackward || moveRight || moveLeft) && fast) {
    ufo.children[1].scale.y =
      ((0.6 - ufo.children[1].scale.y) / 50) * fpsScale +
      ufo.children[1].scale.y;
    ufo.children[1].material.opacity =
      ((0.95 - ufo.children[1].material.opacity) / 50) * fpsScale +
      ufo.children[1].material.opacity;
    ufo.children[1].position.y =
      ((-0.15 - ufo.children[1].position.y) / 50) * fpsScale +
      ufo.children[1].position.y;
    speed = (4 - speed) / 50 + speed;
  } else {
    ufo.children[1].scale.y =
      ((0.25 - ufo.children[1].scale.y) / 50) * fpsScale +
      ufo.children[1].scale.y;
    ufo.children[1].material.opacity =
      ((0.7 - ufo.children[1].material.opacity) / 50) * fpsScale +
      ufo.children[1].material.opacity;
    ufo.children[1].position.y =
      ((-0.04 - ufo.children[1].position.y) / 50) * fpsScale +
      ufo.children[1].position.y;
    speed = (1 - speed) / 50 + speed;
  }
  // Mouse Move

  if (moveForward && !moveBackward) {
    if (!Forward && currentSpeedForward != 0) {
      cameraPositionVec.z -= cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y -= cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x -= cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.max(0, currentSpeedForward - delta * acc);
    } else {
      cameraPositionVec.z += cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y += cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x += cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.min(
        maxSpeedForward,
        currentSpeedForward + delta * acc,
      );
      Forward = true;
    }
  } else if (moveBackward && !moveForward) {
    if (Forward && currentSpeedForward != 0) {
      cameraPositionVec.z += cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y += cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x += cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.max(0, currentSpeedForward - delta * acc);
    } else {
      cameraPositionVec.z -= cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y -= cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x -= cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.min(
        maxSpeedForward,
        currentSpeedForward + delta * acc,
      );
      Forward = false;
    }
  }

  if (moveRight && !moveLeft) {
    if (!Right && currentSpeedRight != 0) {
      cameraPositionVec.x += cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z -= cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.max(0, currentSpeedRight - delta * acc);
    } else {
      cameraPositionVec.x -= cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z += cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.min(
        maxSpeedRight,
        currentSpeedRight + delta * acc,
      );
      Right = true;
    }
  } else if (moveLeft && !moveRight) {
    if (Right && currentSpeedRight != 0) {
      cameraPositionVec.x -= cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z += cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.max(0, currentSpeedRight - delta * acc);
    } else {
      cameraPositionVec.x += cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z -= cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.min(
        maxSpeedRight,
        currentSpeedRight + delta * acc,
      );
      Right = false;
    }
  }
  if ((!moveBackward && !moveForward) || (moveBackward && moveForward)) {
    if (Forward) {
      cameraPositionVec.z += cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y += cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x += cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.max(0, currentSpeedForward - delta * acc);
    } else {
      cameraPositionVec.z -= cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y -= cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x -= cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.max(0, currentSpeedForward - delta * acc);
    }
  }
  if ((!moveRight && !moveLeft) || (moveRight && moveLeft)) {
    if (Right) {
      cameraPositionVec.x -= cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z += cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.max(0, currentSpeedRight - delta * acc);
    } else {
      cameraPositionVec.x += cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z -= cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.max(0, currentSpeedRight - delta * acc);
    }
  }

  angleX += (left / 15 / Math.PI - right / 15 / Math.PI) * fpsScale;
  cameraDirectionVec.x -= (Math.sin(angleX) * ufo_scale) / 2;
  cameraDirectionVec.z -= (Math.cos(angleX) * ufo_scale) / 2;

  if (cameraDirectionVec.y < 0.85 * ufo_scale && !scaling) {
    angleY += (up / 600 / Math.PI) * fpsScale * ufo_scale;
  }
  if (cameraDirectionVec.y > -0.8 * ufo_scale && !scaling) {
    angleY -= (down / 500 / Math.PI) * fpsScale * ufo_scale;
  }
  //console.log(angleY)
  cameraDirectionVec.y = Math.sin(angleY) * 60;
  cameraDirectionVec.setLength(2.4 * ufo_scale);

  if (
    arrived > 0 &&
    selected_object &&
    document.getElementById('content').style.display == 'none'
  ) {
    //console.log(selected_object.point)
    safe_dis = 2 * ufo_scale;
    chasingFrame = 50;
    ufo.children[10].material.color.set(0xffff33);
    ufo.children[10].material.specular.set(0xffff33);
    ufo.children[10].material.emissive.set(0xffff33);
    catchspeed = Math.min(catchspeed + 0.01 * fpsScale, 1.2 * fpsScale);
    const distance =
      Math.sqrt(
        selected_object.point.x * selected_object.point.x +
          selected_object.point.z * selected_object.point.z,
      ) - 1000;
    const dir = vec
      .clone()
      .set(0 - selected_object.point.x, 0, 0 - selected_object.point.z)
      .normalize();
    let x;
    let z;
    if (distance > 0) {
      z = selected_object.point.z + distance * dir.z;
      x = selected_object.point.x + distance * dir.x;
    } else {
      z = selected_object.point.z;
      x = selected_object.point.x;
    }

    const delx = x - cameraPositionVec.x;
    const dely = selected_object.point.y - cameraPositionVec.y;
    const delz = z - cameraPositionVec.z;
    const di = vec.clone().set(delx, dely, delz).normalize();
    chasing.set(
      delx - di.x * safe_dis,
      dely - di.y * safe_dis,
      delz - di.z * safe_dis,
    );
    if (chasing.distanceTo(originPoint) < 60) {
      t_in = false;
    }
    if (t_in) {
      ufo_starlight = Math.min(ufo_starlight + 0.0002 * fpsScale, 0.08);
      ufo.children[3].scale.set(ufo_starlight * 5, (ufo_starlight * 25) / 6);
      ufo.children[11].intensity = ufo_starlight * 20 - 0.5;
      ufo.children[12].intensity = ufo_starlight * 20 + 1;
      ufo.children[1].scale.y =
        ((0.9 - ufo.children[1].scale.y) / 50) * fpsScale +
        ufo.children[1].scale.y;
      ufo.children[1].material.opacity =
        ((1 - ufo.children[1].material.opacity) / 50) * fpsScale +
        ufo.children[1].material.opacity;
      ufo.children[1].position.y =
        ((-0.2 - ufo.children[1].position.y) / 50) * fpsScale +
        ufo.children[1].position.y;
      transferSpeed = Math.min(transferSpeed + 1 * fpsScale, 10 / speed);
    } else {
      ufo_starlight = Math.max(ufo_starlight - 0.0002 * fpsScale, 0.06);
      ufo.children[3].scale.set(ufo_starlight * 5, (ufo_starlight * 25) / 6);
      ufo.children[11].intensity = ufo_starlight * 20 - 0.5;
      ufo.children[12].intensity = ufo_starlight * 20 + 1;
      ufo.children[1].scale.y =
        ((0.25 - ufo.children[1].scale.y) / 100) * fpsScale +
        ufo.children[1].scale.y;
      ufo.children[1].material.opacity =
        ((0.7 - ufo.children[1].material.opacity) / 100) * fpsScale +
        ufo.children[1].material.opacity;
      ufo.children[1].position.y =
        ((-0.04 - ufo.children[1].position.y) / 100) * fpsScale +
        ufo.children[1].position.y;
      transferSpeed = Math.max(transferSpeed - 0.1 * fpsScale, 1);
      arrived -= 1;
    }

    if (chasing.distanceTo(vec.clone().set(0, 0, 0)) > 250)
      chasing.setLength(250);
    cameraPositionVec.x += (chasing.x * catchspeed) / 50;
    cameraPositionVec.y += (chasing.y * catchspeed) / 50;
    cameraPositionVec.z += (chasing.z * catchspeed) / 50;
  } else {
    if (hit_frame <= 0) {
      ufo.children[10].material.color.set(0x44e0ff);
      ufo.children[10].material.specular.set(0x44e0ff);
      ufo.children[10].material.emissive.set(0x44e0ff);
      cameraPositionVec.x += ((chasing.x * catchspeed) / 2500) * chasingFrame;
      cameraPositionVec.y += ((chasing.y * catchspeed) / 2500) * chasingFrame;
      cameraPositionVec.z += ((chasing.z * catchspeed) / 2500) * chasingFrame;
      if (chasingFrame > 0) chasingFrame -= fpsScale;
      else chasingFrame = 0;
    }
    ufo_starlight = Math.max(ufo_starlight - 0.0002 * fpsScale, 0.06);
    ufo.children[3].scale.set(ufo_starlight * 5, (ufo_starlight * 25) / 6);
    ufo.children[11].intensity = ufo_starlight * 20 - 0.5;
    ufo.children[12].intensity = ufo_starlight * 20 + 1;
    ufo.children[1].scale.set(
      ((0.05 - ufo.children[1].scale.x) / 100) * fpsScale +
        ufo.children[1].scale.x,
      (0.25 - ufo.children[1].scale.y) / 100 + ufo.children[1].scale.y,
    );
    ufo.children[1].material.opacity =
      ((0.7 - ufo.children[1].material.opacity) / 100) * fpsScale +
      ufo.children[1].material.opacity;
    ufo.children[1].position.y =
      ((-0.04 - ufo.children[1].position.y) / 100) * fpsScale +
      ufo.children[1].position.y;
    transferSpeed = Math.max(transferSpeed - 0.1 * fpsScale, 1);
  }

  //ufo.position.set((cameraPositionVec.x-ufo.position.x)/follow+ufo.position.x, (cameraPositionVec.y-ufo.position.y)/follow+ufo.position.y, (cameraPositionVec.z-ufo.position.z)/follow+ufo.position.z);
  ufo.position.set(
    cameraPositionVec.x,
    cameraPositionVec.y,
    cameraPositionVec.z,
  );
  ufo.rotation.y += (0.01 / Math.PI) * speed * transferSpeed * fpsScale;
  ufo.position.y += Math.sin(count * 60) * 0.01 * speed * ufo_scale;

  camera.position.set(
    cameraPositionVec.x - cameraDirectionVec.x,
    cameraPositionVec.y - cameraDirectionVec.y + 0.6 * ufo_scale,
    cameraPositionVec.z - cameraDirectionVec.z,
  );
  // camera.position.set(
  //   (cameraPositionVec.x - cameraDirectionVec.x - camera.position.x) / follow +
  //     camera.position.x,
  //   (cameraPositionVec.y -
  //     cameraDirectionVec.y +
  //     0.6 * ufo_scale -
  //     camera.position.y) /
  //     follow +
  //     camera.position.y,
  //   (cameraPositionVec.z - cameraDirectionVec.z - camera.position.z) / follow +
  //     camera.position.z
  // );
  camera.lookAt(
    cameraPositionVec.x,
    cameraPositionVec.y + 0.6 * ufo_scale,
    cameraPositionVec.z,
  );
}

let action = false;
function playOnClick(anim) {
  if (action) {
    clearTimeout(action);
  }
  if (anim == 4) {
    action = playModifierAnimation(
      last_action,
      0.15,
      possibleAnims[anim],
      0.25,
      true,
    );
  } else {
    action = playModifierAnimation(
      last_action,
      0.25,
      possibleAnims[anim],
      0.25,
    );
  }
}
let head_turn = true;
function playModifierAnimation(from, fSpeed, to, tSpeed, no_head = false) {
  last_action = to;
  to.setLoop(THREE.LoopOnce);
  to.reset();
  if (no_head) {
    head_turn = false;
  }
  to.play();
  from.crossFadeTo(to, fSpeed, true);
  const a = setTimeout(
    function () {
      if (no_head) {
        head_turn = true;
      }
      idle.enabled = true;
      to.crossFadeTo(idle, tSpeed, true);
      last_action = idle;
      currentlyAnimating = false;
    },
    to._clip.duration * 1000 - (tSpeed + fSpeed) * 1000,
  );
  return a;
}

function getMouseDegrees(x, y, z, degreeLimit) {
  //console.log(x,y,z)
  x = x - 47.75;
  y = y + 1.12;
  z = z - 102;
  z = Math.max(0, z);
  let dz =
    ((90 - Math.abs(Math.atan2(x, y) * 180) / Math.PI) / 90) *
    degreeLimit *
    (1 - (Math.atan2(z, Math.abs(x)) / Math.PI) * 2);
  if (x < 0) {
    dz = -dz;
  }
  const dy = ((90 - (Math.atan2(z, x) * 180) / Math.PI) / 90) * degreeLimit;
  const dx =
    -((90 - (Math.atan2(z, y) * 180) / Math.PI) / 90) *
    degreeLimit *
    ((Math.atan2(z, Math.abs(x)) / Math.PI) * 2);
  return { x: dx, y: dy, z: dz };
}
function moveJoint(mouse, joint, degreeLimit) {
  const degrees = getMouseDegrees(mouse.x, mouse.y, mouse.z, degreeLimit);
  joint.rotation.x =
    Math.max(
      -0.15,
      Math.min(0.15, THREE.MathUtils.degToRad(degrees.x) - joint.rotation.x),
    ) /
      5 +
    joint.rotation.x;
  joint.rotation.y =
    Math.max(
      -0.15,
      Math.min(0.15, THREE.MathUtils.degToRad(degrees.y) - joint.rotation.y),
    ) /
      5 +
    joint.rotation.y;
  joint.rotation.z =
    Math.max(
      -0.15,
      Math.min(0.15, THREE.MathUtils.degToRad(degrees.z) - joint.rotation.z),
    ) /
      5 +
    joint.rotation.z;
}
let wait_time = 0;
let scare = false;
function animate() {
  toggleAimingCursor(esc || isMobileDevice);
  if (isMobileDevice) {
    updateTouchControlVisibility();
  }

  requestAnimationFrame(animate);

  if (isLoadFinished(loadedItemCount, totalLoadItems)) hide_loading();
  else return;
  const delta = clock.getDelta();

  MeshWater.material.uniforms['time'].value += 1.0 / 120.0;

  if (mixer) {
    mixer.update(delta);
  }

  const ufo_human_distance = ufo.position.distanceTo(
    vec.clone().set(47.75, -1.12, 102),
  );
  const ufo_human_z = ufo.position.z - 102;
  if (ufo_human_distance <= 15 && ufo_human_z >= -2) {
    if (!scare) {
      playOnClick(4);
      currentlyAnimating = true;
      scare = true;
    } else {
      if (!currentlyAnimating) {
        wait_time++;
        if (wait_time > 5 * TARGET_FPS) {
          currentlyAnimating = true;
          playOnClick(6);
        }
      } else {
        wait_time = 0;
      }
    }
    if (neck && waist) {
      moveJoint(ufo.position, neck, 50);
      moveJoint(ufo.position, waist, 30);
    }
  } else {
    neck.rotation.y = neck.rotation.y * 0.95;
    neck.rotation.x = neck.rotation.x * 0.95;
    waist.rotation.y = waist.rotation.y * 0.95;
    waist.rotation.x = waist.rotation.x * 0.95;
    neck.rotation.z = neck.rotation.z * 0.95;
    waist.rotation.z = waist.rotation.z * 0.95;
    if (!currentlyAnimating) {
      wait_time++;
      if (wait_time > 5 * TARGET_FPS) {
        currentlyAnimating = true;
        let anim = Math.floor(Math.random() * possibleAnims.length) + 0;
        if (anim == 4 || anim == 6) anim--;
        playOnClick(anim);
      }
    } else {
      wait_time = 0;
    }
    scare = false;
  }
  if (!head_turn) {
    head.rotation.y = 0;
    head.rotation.x = -Math.PI / 12;
  }

  frameAccumulator += delta;
  if (frameAccumulator > frameInterval) {
    //stats.update();
    meteorSystem.updateMeteorites(meteorites, 30, 5);

    starfieldSystem.update(ufo.position, count);
    count += 0.0005 * fpsScale;

    operation_method_1(delta, count);

    all_obj4.children[1].position.y = -2.85 + 0.5 * Math.sin(count * 2);

    renderer.render(scene, camera);

    frameAccumulator = frameAccumulator % frameInterval;
  }
}

animate();
const handleResize = createResizeRendererHandler(renderer, camera, scene);
window.addEventListener('resize', handleResize);
