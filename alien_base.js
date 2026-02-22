import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
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
import {
  computeLookInputFromMousePosition,
  getAimingMousePosition,
  isContentHidden,
  isGameplayActive,
  updatePointerFromClient,
} from './JS/shared/input-common.js';
import {
  createFollowTargetFilter,
  pickFollowTargetFromScene,
} from './JS/shared/follow-click.js';
import { createTouchRockerControls } from './JS/shared/touch-rocker-controls.js';
import {
  applyUfoHitEffect,
  setUfoIndicatorColor,
  stepUfoStarlight,
  updateUfoControlState,
  updateUfoFollowThrustEffect,
  updateUfoIdleThrustEffect,
  updateUfoThrustEffect,
} from './JS/shared/ufo-control.js';

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
const ufo_scale = 10;

let distance_to_protection = 500;

const shield_color_red = new THREE.Color(1, 0.5, 0.5);
const shield_color_blue = new THREE.Color(0xeeffff);
const vec = new THREE.Vector3();
const originPoint = new THREE.Vector3(0, 0, 0);
const cameraPositionVec = vec.clone().set(-131.66, -465, 1296.76);
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
const hit_open = true;

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
const ALIEN_BASE_SEA_LEVEL_Y = -504;
const STAR_CONE_CENTER_HEIGHT_FROM_SEA = 500;
const STAR_CONE_EDGE_HEIGHT_FROM_SEA = 50;
const STAR_CONE_EDGE_RADIUS =
  Math.max(AMOUNTX, AMOUNTZ) * (SEPARATION / 2) + SEPARATION * 8;

let city1;

// Mouse Move
let mouseP = { x: 0, y: 0 };
let up = 0;
let down = 0;
let left = 0;
let right = 0;

let maxSpeed = 0.05 * fpsScale;
const acc = 0.5 * fpsScale;
let currentSpeedForward = 0;
let currentSpeedRight = 0;
let moveInputStrength = 0;
let Forward = true;
let Right = true;
const clock = new THREE.Clock();
let angleX = 0;
let angleY = 0;
const scaling = false;

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
const touchControls = createTouchRockerControls({
  moveDeadzone: 0.1,
  lookDeadzone: 0.1,
  lookScale: 0.35,
  rockerTravelRatio: 1,
  tapMaxDuration: 280,
  tapMaxMove: 18,
  isGameplayActive: () => isGameplayActive('content', esc),
  onMoveAxis: (horizontal, vertical, strength) => {
    moveInputStrength = strength;
    moveLeft = horizontal < 0;
    moveRight = horizontal > 0;
    moveForward = vertical < 0;
    moveBackward = vertical > 0;

    if (moveLeft || moveRight || moveForward || moveBackward) {
      selected_object = false;
    }
  },
  onLookAxis: (horizontal, vertical) => {
    left = Math.max(0, -horizontal);
    right = Math.max(0, horizontal);
    up = Math.max(0, -vertical);
    down = Math.max(0, vertical);
  },
  onTap: (clientX, clientY) => {
    onMouseClick({ clientX, clientY });
  },
});
const isMobileDevice =
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
  navigator.maxTouchPoints > 1 ||
  window.matchMedia('(pointer: coarse)').matches;

const isFollowTargetObject = createFollowTargetFilter({
  excludedNames: ['ring', 'Sky'],
});

function getStarConeMinY(x, z) {
  const radialDistance = Math.sqrt(x * x + z * z);
  const t = Math.min(radialDistance / STAR_CONE_EDGE_RADIUS, 1);
  const minHeightFromSea =
    STAR_CONE_CENTER_HEIGHT_FROM_SEA +
    (STAR_CONE_EDGE_HEIGHT_FROM_SEA - STAR_CONE_CENTER_HEIGHT_FROM_SEA) * t;
  return ALIEN_BASE_SEA_LEVEL_Y + minHeightFromSea;
}

const env_light = new THREE.AmbientLight(0x282930);

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
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -10,
  }),
);
const materialr = new THREE.Sprite(
  new THREE.SpriteMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    map: meteoriteballr,
    color: 0xffffff,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -10,
  }),
);
const material1 = new THREE.Sprite(
  new THREE.SpriteMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    map: meteoritetail,
    color: 0xffffff,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -10,
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
  centerDotMin: 0.82,
  centerDotMax: 0.821,
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
  0.6,
);
const ju_map = textureLoader.load('./texture/ju.jpg');
const jupiter_m = new THREE.MeshBasicMaterial({
  map: ju_map,
  transparent: true,
  opacity: 0.75,
});
const jupiter = new THREE.Mesh(new THREE.PlaneGeometry(2500, 2500), jupiter_m);
jupiter.name = 'jupiter';
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
  clearcoatNormalScale: new THREE.Vector2(1.0, -1.0),
});

const shield_uniforms = {
  s: { type: 'f', value: -0.75 },
  b: { type: 'f', value: 0.5 },
  p: { type: 'f', value: 3 },
  glowColor: { type: 'c', value: shield_color_blue },
};
const customMaterial = new THREE.ShaderMaterial({
  uniforms: shield_uniforms,
  vertexShader: document.getElementById('vertexShader').textContent,
  fragmentShader: document.getElementById('fragmentShader').textContent,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  transparent: true,
  depthWrite: false,
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
    10, //near
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
  littlestar.renderOrder = 2;
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
    sizeVariationScale: 1,
    renderOrder: 2,
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
    side: THREE.DoubleSide,
  });
  const MeshGround = new THREE.Mesh(geometryGround, materialGround);
  MeshGround.position.set(0, -510, 0);
  MeshGround.name = 'Ground';
  MeshGround.receiveShadow = true;
  MeshGround.castShadow = false;
  all_obj4.add(MeshGround);

  MeshWater.rotation.x = -Math.PI / 2;
  MeshWater.position.set(0, ALIEN_BASE_SEA_LEVEL_Y, 0);
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
    touchControls.setup();
  }

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
        $('#blocker').fadeIn(1000);
        $('#content').fadeIn(1000);
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
    }
  };

  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);

  scene.add(env_light);

  renderer = new THREE.WebGLRenderer();
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
    ringDoubleSide: true,
    ballSegments: 30,
    ufoLightRenderOrder: 2,
    whiteLightRenderOrder: 2,
    mainLight: {
      intensity: 0.5,
      distanceDivisor: 10,
      decay: 0.75,
      castShadow: true,
      shadowMapSize: 1024,
      shadowRadius: 3,
      shadowBias: -0.001,
    },
    secondaryLight: {
      intensity: 1.5,
      distanceDivisor: 10,
      decay: 0.95,
      castShadow: true,
      shadowMapSize: 1024,
      shadowRadius: 3,
      shadowBias: -0.001,
    },
  });

  // let citylight1 = light_loader("obj/light3/light3", "obj/light3/light3", 0.5, true);
  // citylight1.position.set(0, -512, 0);
  // citylight1.rotation.y = Math.PI;
  // citylight1.name = "citylight1";
  // if (add_base) all_obj2.add(citylight1);
  // all_obj2.position.y += 50;

  const big_light = obj3d.clone();
  const Cylinder1 = new THREE.Mesh(
    new THREE.CylinderGeometry(4.65, 5, 1, 50),
    new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: 0xffffff,
      emissive: 0xffffff,
      transparent: true,
      opacity: 0.95,
    }),
  );
  const light_white1 = new THREE.PointLight(
    0xffffff,
    0.3,
    700 * 1 /*ufo_scale/100*/,
  );
  light_white1.penumbra = 0.3;
  light_white1.castShadow = true;
  light_white1.shadow.mapSize.width = 1024;
  light_white1.shadow.mapSize.height = 1024;
  light_white1.shadow.camera.far = 700 * 1 /*ufo_scale/100*/;
  light_white1.shadow.camera.near = 5 * 1 /*ufo_scale/100*/;
  light_white1.shadowBias = -0.001;
  light_white1.shadow.radius = 3;
  light_white1.position.y = 4;
  big_light.add(light_white1);
  big_light.add(Cylinder1);

  const new_light8 = big_light.clone();
  new_light8.position.set(-78.35, -373.4, 133.85);
  new_light8.scale.set(3.5, 5.3, 3.5);
  if (add_base) all_obj2.add(new_light8);

  const new_light9 = big_light.clone();
  new_light9.position.set(67.45, -373.4, 133.85);
  new_light9.scale.set(3.5, 5.3, 3.5);
  if (add_base) all_obj2.add(new_light9);

  const new_light10 = big_light.clone();
  new_light10.position.set(-82.5, -215.15, -47.75);
  new_light10.scale.set(2.5, 6.2, 2.5);
  if (add_base) all_obj2.add(new_light10);

  const new_light11 = big_light.clone();
  new_light11.position.set(69.25, -215.15, -47.75);
  new_light11.scale.set(2.5, 6.2, 2.5);
  if (add_base) all_obj2.add(new_light11);

  const new_light12 = big_light.clone();
  new_light12.position.set(82.1, -400.6, -196.4);
  new_light12.scale.set(9.5, 6.2, 9.5);
  if (add_base) all_obj2.add(new_light12);

  city1 = obj_loader('obj/city2/city2', 'obj/city2/city2', 1.5, true);
  city1.position.set(21.5, -560, 499);
  city1.name = 'city1';
  if (add_base) all_obj2.add(city1);
  all_obj2.position.y += 50;

  const protection_texture = textureLoader.load('texture/shield4.png');
  protection_texture.wrapS = THREE.RepeatWrapping;
  protection_texture.wrapT = THREE.RepeatWrapping;
  protection_texture.repeat.set(500, 500);
  const protection_material = new THREE.MeshPhongMaterial({
    color: 0xeeffff,
    map: protection_texture,
    transparent: true,
    opacity: 1,
    side: THREE.DoubleSide,
    shininess: 0,
    depthWrite: false,
  });
  const protection = new THREE.Mesh(
    new THREE.SphereGeometry(499.5, 100, 100),
    protection_material,
  );

  protection.position.y = -560;
  protection.scale.y = 1.6;
  protection.renderOrder = 1;
  protection.name = 'protection';
  all_obj3.add(protection);

  const protection1 = new THREE.Mesh(
    new THREE.SphereGeometry(500, 100, 100),
    customMaterial,
  );

  protection1.position.y = -560;
  protection1.scale.y = 1.6;
  protection1.renderOrder = 1;
  protection1.name = 'protection';
  all_obj3.add(protection1);

  // let blue_light = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.5, 1, 50), new THREE.MeshPhongMaterial({ color: 0x54a1b2, specular: 0xFFFFFF, emissive: 0x54a1b2, transparent: true, opacity: 0.95 }));

  // let new_light3 = blue_light.clone();
  // new_light3.position.set(-0.4, -273.1, 51);
  // new_light3.scale.set(0.77, 3.5, 0.77);
  // if(add_base)all_obj2.add(new_light3);

  // let new_light4 = blue_light.clone();
  // new_light4.position.set(-4.1, -370.9, 197.05);
  // new_light4.scale.set(1.2, 3.6, 1.2);
  // if(add_base)all_obj2.add(new_light4);

  // let new_light5 = blue_light.clone();
  // new_light5.position.set(-155.35, -366.4, 82.5);
  // new_light5.scale.set(1.2, 3.6, 1.2);
  // if(add_base)all_obj2.add(new_light5);

  // let new_light6 = blue_light.clone();
  // new_light6.position.set(151.25, -366.4, 82.5);
  // new_light6.scale.set(1.2, 3.6, 1.2);
  // if(add_base)all_obj2.add(new_light6);

  // let new_light7 = blue_light.clone();
  // new_light7.position.set(-0.2, -143.45, -31.65);
  // new_light7.scale.set(1.2, 3.6, 1.2);
  // if(add_base)all_obj2.add(new_light7);
  jupiter.position.set(0, 4000, -6500);
  //jupiter.rotation.z=Math.PI/4
  jupiter.rotation.x = Math.PI / 7;
  scene.add(jupiter);

  all_obj2.position.y -= 20;

  all_obj.add(all_obj1);
  all_obj.add(all_obj2);
  all_obj.add(all_obj3);
  all_obj.add(all_obj4);
  all_obj.scale.set(
    1 /*ufo_scale/100*/,
    1 /*ufo_scale/100*/,
    1 /*ufo_scale/100*/,
  );
  scene.add(all_obj);

  // const gui = new GUI()
  // const cubeFolder = gui.addFolder("new_light12")
  // cubeFolder.add(new_light12.position, "x", 50, 120, 0.05)
  // cubeFolder.add(new_light12.position, "y", -450, -400, 0.05)
  // cubeFolder.add(new_light12.position, "z", -250, -150, 0.05)

  // cubeFolder.add(new_light12.scale, "x", 0.5, 10, 0.01)
  // cubeFolder.add(new_light12.scale, "y", 0.5, 10, 0.01)
  // cubeFolder.add(new_light12.scale, "z", 0.5, 10, 0.01)
  // cubeFolder.add(new_light12.children[0].position, "y", 0.5, 30, 0.01)

  //  cubeFolder.open()
}
init();

function obj_loader(url, url1, scale, double = true) {
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
          root.children[1].material = new THREE.MeshPhongMaterial({
            color: 0x54a1b2,
            specular: 0xffffff,
            emissive: 0x54a1b2,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
          });

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

function mouseMove(e) {
  if (isMobileDevice) return;

  document.getElementById('aiming1').style.left = e.clientX - 10 + 'px';
  document.getElementById('aiming1').style.top = e.clientY - 10 + 'px';
  updatePointerFromClient(mouse, e.clientX, e.clientY);

  if (esc) {
    mouseP = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  } else {
    mouseP = getAimingMousePosition('aiming1', 10);
  }
  const lookInput = computeLookInputFromMousePosition(
    mouseP.x,
    mouseP.y,
    window.innerWidth,
    window.innerHeight,
  );
  up = lookInput.up;
  down = lookInput.down;
  left = lookInput.left;
  right = lookInput.right;
}

function bounder_detect() {
  const distance =
    Math.sqrt(
      cameraPositionVec.x * cameraPositionVec.x +
        cameraPositionVec.z * cameraPositionVec.z,
    ) - 1500;
  const dir = vec
    .clone()
    .set(0 - cameraPositionVec.x, 0, 0 - cameraPositionVec.z)
    .normalize();
  if (distance > 0) {
    selected_object = false;
    cameraPositionVec.z += distance * dir.z;
    cameraPositionVec.x += distance * dir.x;
  }
  // cameraPositionVec.x = Math.max(-1500, Math.min(1500, cameraPositionVec.x));
  // cameraPositionVec.z = Math.max(-1500, Math.min(1500, cameraPositionVec.z));
  cameraPositionVec.y = Math.max(
    -504 + 0.15 * ufo_scale,
    Math.min(1200, cameraPositionVec.y),
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
function hit_detect() {
  distance_to_protection = 500;
  if (!hit_open) return false;
  const detect_obj = [all_obj3];
  raycaster.near = 0.1;
  raycaster.far = 550;
  const local = vec
    .clone()
    .set(ufo.position.x, ufo.position.y + 0.2 * ufo_scale, ufo.position.z);
  const all_direct1 = [vec.clone().set(-ufo.position.x, 0, -ufo.position.z)];
  for (let i = 0; i < all_direct1.length; i++) {
    raycaster.set(local, all_direct1[i].normalize());
    const hit_face = raycaster.intersectObjects(detect_obj, true);
    if (hit_face.length > 0) {
      if (
        hit_face[0].object.name == 'protection' &&
        hit_face[0].distance < distance_to_protection
      ) {
        distance_to_protection = hit_face[0].distance;
      }
      if (hit_face[0].distance < 0.45 * ufo_scale) {
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
      if (
        hit_face[0].object.name == 'protection' &&
        hit_face[0].distance < distance_to_protection
      ) {
        distance_to_protection = hit_face[0].distance;
      }
      if (hit_face[0].distance < 0.2 * ufo_scale) {
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
    updatePointerFromClient(mouse, event.clientX, event.clientY);
  }

  if (isGameplayActive('content', esc)) {
    const selectedHit = pickFollowTargetFromScene({
      mouse,
      camera,
      scene,
      raycaster: raycaster1,
      isFollowTargetObject,
    });
    if (selectedHit) {
      arrived = 50;
      selected_object = selectedHit;
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

function operation_method_1(delta) {
  if (!ufo || !ufo.children || !ufo.children[10]) return;
  bounder_detect();
  if (hit_detect() && hit_frame < 490) {
    hit_frame = 500;
    chasingFrame = 0;
  }
  const hitState = applyUfoHitEffect({
    ufo,
    cameraPositionVec,
    hitDirectionVec,
    hitFrame: hit_frame,
    rotatespeed,
    knockbackDivisor: 100000,
    fpsScale,
    speed,
  });

  if (hitState.active) {
    moveForward = moveLeft = moveRight = moveBackward = false;
    currentSpeedForward = 0;
    currentSpeedRight = 0;
    hit_frame = hitState.hitFrame;
    speed = hitState.speed;
    selected_object = false;
  } else {
    ufo.rotation.x = 0;
    setUfoIndicatorColor({ ufo, color: 0x44e0ff });
  }
  if (isContentHidden('content')) {
    esc = false;
  }
  if (fast) maxSpeed = 0.12 * fpsScale;
  else maxSpeed = Math.max(maxSpeed - 0.002 * fpsScale, 0.05 * fpsScale);
  const touchDrivenMove = isMobileDevice && touchControls.isMoveTouchActive();
  const moveSpeedScale = touchDrivenMove
    ? Math.max(0.05, moveInputStrength)
    : 1;

  const maxSpeedForward = maxSpeed * moveSpeedScale;
  const maxSpeedRight = maxSpeed * moveSpeedScale;

  if (hit_frame <= 0) {
    speed = updateUfoThrustEffect({
      ufo,
      moveForward,
      moveBackward,
      moveLeft,
      moveRight,
      fast,
      fpsScale,
      speed,
    });
    // Mouse Move

    const controlState = updateUfoControlState({
      moveForward,
      moveBackward,
      moveLeft,
      moveRight,
      cameraPositionVec,
      cameraDirectionVec,
      currentSpeedForward,
      currentSpeedRight,
      forwardDirection: Forward,
      rightDirection: Right,
      delta,
      acceleration: acc,
      maxSpeedForward,
      maxSpeedRight,
      leftInput: left,
      rightInput: right,
      upInput: up,
      downInput: down,
      angleX,
      angleY,
      fpsScale,
      ufoScale: ufo_scale,
      scaling,
      yawDivisor: 15,
      pitchUpDivisor: 600,
      pitchDownDivisor: 500,
    });
    currentSpeedForward = controlState.currentSpeedForward;
    currentSpeedRight = controlState.currentSpeedRight;
    Forward = controlState.forwardDirection;
    Right = controlState.rightDirection;
    angleX = controlState.angleX;
    angleY = controlState.angleY;
  }

  if (arrived > 0 && selected_object && isContentHidden('content')) {
    //console.log(selected_object.point)
    safe_dis = 2 * ufo_scale;
    chasingFrame = 50;
    setUfoIndicatorColor({ ufo, color: 0xffff33 });
    catchspeed = Math.min(catchspeed + 0.01 * fpsScale, 1.2 * fpsScale);

    const distance =
      Math.sqrt(
        selected_object.point.x * selected_object.point.x +
          selected_object.point.z * selected_object.point.z,
      ) - 1500;
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
    if (chasing.distanceTo(originPoint) < 100) {
      t_in = false;
    }
    if (t_in) {
      ufo_starlight = stepUfoStarlight({
        ufo,
        ufoStarlight: ufo_starlight,
        fpsScale,
        increase: true,
      });
      updateUfoFollowThrustEffect({ ufo, fpsScale, engaged: true });
      transferSpeed = Math.min(transferSpeed + 1 * fpsScale, 10 / speed);
    } else {
      ufo_starlight = stepUfoStarlight({
        ufo,
        ufoStarlight: ufo_starlight,
        fpsScale,
        increase: false,
      });
      updateUfoFollowThrustEffect({ ufo, fpsScale, engaged: false });
      transferSpeed = Math.max(transferSpeed - 0.1 * fpsScale, 1);
      arrived -= 1;
    }
    if (chasing.distanceTo(vec.clone().set(0, 0, 0)) > 500)
      chasing.setLength(500);
    cameraPositionVec.x += (chasing.x * catchspeed) / 50;
    cameraPositionVec.y += (chasing.y * catchspeed) / 50;
    cameraPositionVec.z += (chasing.z * catchspeed) / 50;
  } else {
    if (hit_frame <= 0) {
      setUfoIndicatorColor({ ufo, color: 0x44e0ff });
      cameraPositionVec.x += ((chasing.x * catchspeed) / 2500) * chasingFrame;
      cameraPositionVec.y += ((chasing.y * catchspeed) / 2500) * chasingFrame;
      cameraPositionVec.z += ((chasing.z * catchspeed) / 2500) * chasingFrame;
      if (chasingFrame > 0) chasingFrame -= fpsScale;
      else chasingFrame = 0;
    }
    ufo_starlight = stepUfoStarlight({
      ufo,
      ufoStarlight: ufo_starlight,
      fpsScale,
      increase: false,
    });
    updateUfoIdleThrustEffect({ ufo, fpsScale });
    transferSpeed = Math.max(transferSpeed - 0.1 * fpsScale, 1);
  }

  const follow = 1;
  //ufo.position.set((cameraPositionVec.x-ufo.position.x)/follow+ufo.position.x, (cameraPositionVec.y-ufo.position.y)/follow+ufo.position.y, (cameraPositionVec.z-ufo.position.z)/follow+ufo.position.z);
  ufo.position.set(
    cameraPositionVec.x,
    cameraPositionVec.y,
    cameraPositionVec.z,
  );
  ufo.rotation.y += (0.01 / Math.PI) * speed * transferSpeed * fpsScale;
  ufo.position.y += Math.sin(count * 60) * 0.01 * speed * ufo_scale;

  //camera.position.set(cameraPositionVec.x - cameraDirectionVec.x, cameraPositionVec.y - cameraDirectionVec.y + 0.6 * ufo_scale, cameraPositionVec.z - cameraDirectionVec.z);
  camera.position.set(
    (cameraPositionVec.x - cameraDirectionVec.x - camera.position.x) / follow +
      camera.position.x,
    (cameraPositionVec.y -
      cameraDirectionVec.y +
      0.6 * ufo_scale -
      camera.position.y) /
      follow +
      camera.position.y,
    (cameraPositionVec.z - cameraDirectionVec.z - camera.position.z) / follow +
      camera.position.z,
  );
  camera.lookAt(
    cameraPositionVec.x,
    cameraPositionVec.y + 0.6 * ufo_scale,
    cameraPositionVec.z,
  );
}

function animate() {
  toggleAimingCursor(esc || isMobileDevice);
  if (isMobileDevice) {
    touchControls.updateVisibility();
  }

  requestAnimationFrame(animate);
  if (isLoadFinished(loadedItemCount, totalLoadItems)) hide_loading();
  else return;
  const delta = clock.getDelta();
  MeshWater.material.uniforms['time'].value += 1.0 / 180.0;
  frameAccumulator += delta;
  if (frameAccumulator > frameInterval) {
    //stats.update();
    meteorSystem.updateMeteorites(meteorites, 30, 6);

    //all_obj2.children[0].rotation.y -= 0.02

    starfieldSystem.update(ufo.position, count);
    count += 0.0005 * fpsScale;

    operation_method_1(delta);
    if (distance_to_protection >= 300) {
      // all_obj3.children[0].material.color.r=0.7
      // all_obj3.children[0].material.color.g=0.7
      // all_obj3.children[0].material.color.b=1
      // all_obj3.children[0].material.specular.r=0.7
      // all_obj3.children[0].material.specular.g=0.7
      // all_obj3.children[0].material.specular.b=1
      all_obj3.children[0].material.color.r = 0.9;
      all_obj3.children[0].material.color.g = 0.9;
      all_obj3.children[0].material.color.b = 1;
      all_obj3.children[0].material.opacity = 1;
      all_obj3.children[1].material.uniforms['glowColor'].value =
        shield_color_blue;
      for (let i = 0; i < 5; i++) {
        all_obj2.children[i].children[0].color.r = 0.9;
        all_obj2.children[i].children[0].color.g = 0.92;
        all_obj2.children[i].children[0].color.b = 1;
        if (i == 2 || i == 3) {
          all_obj2.children[i].children[0].intensity = 0.3;
        } else {
          all_obj2.children[i].children[0].intensity = 0.6;
        }
        all_obj2.children[i].children[1].material.color.r = 0.9;
        all_obj2.children[i].children[1].material.color.g = 0.92;
        all_obj2.children[i].children[1].material.color.b = 1;

        all_obj2.children[i].children[1].material.emissive.r = 0.9;
        all_obj2.children[i].children[1].material.emissive.g = 0.92;
        all_obj2.children[i].children[1].material.emissive.b = 1;
      }
      city1.children[0].children[1].material.color.r = 0.33;
      city1.children[0].children[1].material.emissive.r = 0.33;
      // city1.children[0].children[2].material.color.r = 0.3
      // city1.children[0].children[2].material.emissive.r = 0.3
      env_light.color.r = 0.1 / 1.5;
      city1.children[0].children[1].material.color.g = 0.63;
      city1.children[0].children[1].material.emissive.g = 0.63;
      // city1.children[0].children[2].material.color.g = 0.6
      // city1.children[0].children[2].material.emissive.g = 0.6
      env_light.color.g = 0.11 / 1.5;
      city1.children[0].children[1].material.color.b = 0.7;
      city1.children[0].children[1].material.emissive.b = 0.7;
      // city1.children[0].children[2].material.color.b = 0.65
      // city1.children[0].children[2].material.emissive.b = 0.65
      env_light.color.b = 0.13 / 1.5;
      // for(let i=5;i<10;i++)
      // {
      //   all_obj2.children[i].material.emissive.r=0.475
      //   all_obj2.children[i].material.emissive.g=0.906
      //   all_obj2.children[i].material.emissive.b=1
      // }
    } else {
      // all_obj3.children[0].material.color.r=1
      // all_obj3.children[0].material.color.g=0.3
      // all_obj3.children[0].material.color.b=0.3
      // all_obj3.children[0].material.specular.r=1
      // all_obj3.children[0].material.specular.g=0
      // all_obj3.children[0].material.specular.b=0
      all_obj3.children[0].material.opacity =
        Math.abs(Math.sin(count * 4000)) * 0.36 + 0.64;
      all_obj3.children[0].material.color.r = 1;
      all_obj3.children[0].material.color.g = 0.3;
      all_obj3.children[0].material.color.b = 0.3;
      all_obj3.children[1].material.uniforms['glowColor'].value =
        shield_color_red;
      const loop_red = Math.abs(Math.sin(count * 50)) * 0.6 + 0.2;
      for (let i = 0; i < 5; i++) {
        all_obj2.children[i].children[0].color.r = 1 * loop_red;
        all_obj2.children[i].children[0].color.g = 0.2 * loop_red;
        all_obj2.children[i].children[0].color.b = 0.2 * loop_red;
        if (i == 2 || i == 3) {
          all_obj2.children[i].children[0].intensity = 0.4;
        } else {
          all_obj2.children[i].children[0].intensity = 0.8;
        }

        all_obj2.children[i].children[1].material.color.r = 1 * loop_red;
        all_obj2.children[i].children[1].material.color.g = 1 * loop_red;
        all_obj2.children[i].children[1].material.color.b = 1 * loop_red;

        all_obj2.children[i].children[1].material.emissive.r = 1 * loop_red;
        all_obj2.children[i].children[1].material.emissive.g = 0.2 * loop_red;
        all_obj2.children[i].children[1].material.emissive.b = 0.2 * loop_red;
      }
      city1.children[0].children[1].material.color.r = 0.75 * loop_red;
      city1.children[0].children[1].material.emissive.r = 0.75 * loop_red;
      // city1.children[0].children[2].material.color.r = 0.4 * loop_red
      // city1.children[0].children[2].material.emissive.r = 0.4 * loop_red
      env_light.color.r = 0.1 * loop_red;
      city1.children[0].children[1].material.color.g = 0.15 * loop_red;
      city1.children[0].children[1].material.emissive.g = 0.15 * loop_red;
      // city1.children[0].children[2].material.color.g = 0.08 * loop_red
      // city1.children[0].children[2].material.emissive.g = 0.08 * loop_red
      env_light.color.g = 0.08 * loop_red;
      city1.children[0].children[1].material.color.b = 0.15 * loop_red;
      city1.children[0].children[1].material.emissive.b = 0.15 * loop_red;
      // city1.children[0].children[2].material.color.b = 0.08 * loop_red
      // city1.children[0].children[2].material.emissive.b = 0.08 * loop_red
      env_light.color.b = 0.08 * loop_red;
      // for(let i=5;i<10;i++)
      // {
      //   all_obj2.children[i].material.emissive.r=0
      //   all_obj2.children[i].material.emissive.g=0
      //   all_obj2.children[i].material.emissive.b=0
      // }
    }
    renderer.render(scene, camera);

    frameAccumulator = frameAccumulator % frameInterval;
  }
}

animate();
const handleResize = createResizeRendererHandler(renderer, camera, scene);
window.addEventListener('resize', handleResize);
