import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import {
  createFrameConfig,
  isLoadFinished,
  toggleAimingCursor,
  createResizeRendererHandler,
  createProgressHandler,
  navigateWithFade,
} from './JS/shared/scene-common.js';

const textureLoader = new THREE.TextureLoader();
function goAlienBaseWithFade() {
  navigateWithFade('alian_base.html');
}
function goIslandWithFade() {
  navigateWithFade('island.html');
}
function goLightningWithFade() {
  navigateWithFade('lightning.html');
}
let followFrame1 = 0;
let followFrame2 = 0;
let followFrame3 = 0;
const {
  targetFps: TARGET_FPS,
  frameInterval,
  fpsScale,
} = createFrameConfig(120);
let frameAccumulator = 0;
let scene;
let camera;
let renderer;
const rotatespeed = 3 * fpsScale;
//let stats = new Stats();
//stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
//document.body.appendChild(stats.dom);
const star_radius = new Array();

const add_solar = true;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let fast = false;
let esc = true;
const meteorites = [];
const METEOR_MAX_DISTANCE = 8000;
const METEOR_MAX_DISTANCE_SQ = METEOR_MAX_DISTANCE * METEOR_MAX_DISTANCE;
const METEOR_SPEED = 8 * fpsScale;
let arrived = 50;
const ufo_scale = 0.5;
let totalLoadItems = 0;
let loadedItemCount = 0;

const vec = new THREE.Vector3();
const originPoint = new THREE.Vector3(0, 0, 0);
const cameraPositionVec = vec.clone().set(-131.66, 0, 1296.76);
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
let hit_open = false;
const scaling = false;

const SEPARATION = 140,
  AMOUNTX = 24,
  AMOUNTY = 8,
  AMOUNTZ = 24;
let particles,
  particle,
  star_dx,
  star_dy,
  star_dz,
  star_dsx,
  star_dsy,
  star_dsz,
  star_s_speed,
  count = 0;

let angle = 0;

// Mouse Move
let mouseP = { x: 0, y: 0 };
let up = 0;
let down = 0;
let left = 0;
let right = 0;

let maxSpeed = 0.3 * fpsScale;
const acc = 3 * fpsScale;
let currentSpeedForward = 0;
let currentSpeedRight = 0;
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

const raycaster1 = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selected_object = false;
const followablePlanetNames = [
  'sun',
  'star1',
  'star2',
  'star3',
  'starlite3',
  'star4',
  'star5',
  'star6',
  'starlite6',
  'starlite61',
  'starlite62',
  'starlite63',
  'starlite64',
  'starlite65',
  'star7',
  'star8',
  'star9',
];

const lavaTexture = textureLoader.load('./texture/sun.jpg');
lavaTexture.wrapS = lavaTexture.wrapT = THREE.RepeatWrapping;
// multiplier for distortion speed
const baseSpeed = 0.025;
// number of times to repeat texture in each direction
const repeatS = 1.0;
const repeatT = 1.0;

// texture used to generate "randomness", distort all other textures
const noiseTexture = textureLoader.load('texture/cloud.png');
noiseTexture.wrapS = noiseTexture.wrapT = THREE.RepeatWrapping;
// magnitude of noise effect
const noiseScale = 0.0025;

// texture to additively blend with base image texture
const blendTexture = textureLoader.load(
  './texture/gstar-original.jpg',
);
blendTexture.wrapS = blendTexture.wrapT = THREE.RepeatWrapping;
// multiplier for distortion speed
const blendSpeed = 0.01;
// adjust lightness/darkness of blended texture
const blendOffset = 0.6;

// texture to determine normal displacement
const bumpTexture = noiseTexture;
bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping;
// multiplier for distortion speed
const bumpSpeed = 0.025;
// magnitude of normal displacement
const bumpScale = 2.5;
const noiseRepeat = 60;
const bumpRepeat = 30;

// use "this." to create global object
const customUniforms = {
  baseTexture: { type: 't', value: lavaTexture },
  baseSpeed: { type: 'f', value: baseSpeed },
  repeatS: { type: 'f', value: repeatS },
  repeatT: { type: 'f', value: repeatT },
  noiseRepeat: { type: 'f', value: noiseRepeat },
  bumpRepeat: { type: 'f', value: bumpRepeat },
  repeatT: { type: 'f', value: repeatT },
  noiseTexture: { type: 't', value: noiseTexture },
  noiseScale: { type: 'f', value: noiseScale },
  blendTexture: { type: 't', value: blendTexture },
  blendSpeed: { type: 'f', value: blendSpeed },
  blendOffset: { type: 'f', value: blendOffset },
  bumpTexture: { type: 't', value: bumpTexture },
  bumpSpeed: { type: 'f', value: bumpSpeed },
  bumpScale: { type: 'f', value: bumpScale },
  alpha: { type: 'f', value: 1.0 },
  time: { type: 'f', value: 1.0 },
};

// create custom material from the shader code above
//   that is within specially labeled script tags
const customMaterial = new THREE.ShaderMaterial({
  uniforms: customUniforms,
  vertexShader: document.getElementById('vertexShader').textContent,
  fragmentShader: document.getElementById('fragmentShader').textContent,
});

const sunlight = textureLoader.load('img/lensflare2.png');

const ufolight = textureLoader.load('img/ufo_light1.png');
let sunbackground;
let sunbackground1;
let sunbackground2;
let sunbackground3;
let sun;
let star1;
let star2;
let star3;
let starlite3;
let star4;
let ring4;
let star5;
let star6;
let starlite6;
let starlite61;
let starlite62;
let starlite63;
let starlite64;
let starlite65;
let star7;
let star8;
let ring8;
let star9;

if (add_solar) {
  const sunmaterial = new THREE.SpriteMaterial({
    blending: THREE.AdditiveBlending,
    map: sunlight,
    transparent: true,
    opacity: 0.1,
  });
  sunbackground = new THREE.Sprite(sunmaterial);
  sunbackground.position.set(0, 0, 0);
  sunbackground.scale.set(500, 400, 1);
  const sunlight1 = textureLoader.load('img/ball.png');
  const sunmaterial1 = new THREE.SpriteMaterial({
    blending: THREE.AdditiveBlending,
    map: sunlight1,
    transparent: true,
    opacity: 0.1,
  });
  sunbackground1 = new THREE.Sprite(sunmaterial1);
  sunbackground1.position.set(0, 0, 0);
  sunbackground1.scale.set(500, 400, 1);
  sun = obj_lighting('./texture/fluid1-original.png', 100, 0, 0, 0, 'sun');
  sun.material = customMaterial;
  star1 = obj('./texture/j022.jpg', 4, 180, 0, 0, 'star1');
  star2 = obj('./texture/j028.jpg', 8, 240, 0, 0, 'star2');
  star3 = obj(
    './texture/land_ocean_ice_cloud_2048.jpg',
    10,
    320,
    0,
    0,
    'star3',
  );
  starlite3 = obj('./texture/j029.jpg', 1, 349, 200 + 21, 0, 'starlite3');
  star4 = obj('./texture/saturnmap.jpg', 11, 780, 0, 0, 'star4');
  ring4 = ring1('./texture/ring1.png', 14, 15, 780, 0, 0);
  star5 = obj('./texture/j006.jpg', 6, 420, 0, 0, 'star5');
  star6 = obj('./texture/TDVC_Jupiter_Texture_Map.jpg', 25, 600, 0, 0, 'star6');
  starlite6 = obj('./texture/opura1.jpg', 0.8, 650, 200 + 40, 0, 'starlite6');
  starlite61 = obj(
    './texture/TDVC_Venus_Texture_Map.jpg',
    1.2,
    640,
    200 + 35,
    0,
    'starlite61',
  );
  starlite62 = obj(
    './texture/TDVC_Uranus_Moon_Texture_Map.jpg',
    1.3,
    655,
    200 + 45,
    0,
    'starlite62',
  );
  starlite63 = obj('./texture/j029.jpg', 1.2, 660, 200 + 50, 0, 'starlite63');
  starlite64 = obj('./texture/j019.jpg', 1.5, 665, 200 + 55, 0, 'starlite64');
  starlite65 = obj('./texture/j008.jpg', 1.4, 670, 200 + 60, 0, 'starlite65');
  star7 = obj('./texture/uranus.JPG', 13, 900, 0, 0, 'star7');
  star8 = obj('./texture/j030.jpg', 8, 1050, 0, 0, 'star8');
  ring8 = ring2('./texture/ring2.png', 20, 2, 900, 0, 0);
  star9 = obj('./texture/j033.jpg', 3, 1200, 0, 0, 'star9');

  sun.name = 'sun';
  star1.name = 'star1';
  star2.name = 'star2';
  star3.name = 'star3';
  starlite3.name = 'starlite3';
  star4.name = 'star4';
  ring4.name = 'ring';
  star5.name = 'star5';
  star6.name = 'star6';

  starlite61.name = 'starlite61';
  starlite62.name = 'starlite62';
  starlite63.name = 'starlite63';
  starlite64.name = 'starlite64';
  starlite65.name = 'starlite65';
  starlite6.name = 'starlite6';

  star7.name = 'star7';
  star8.name = 'star8';
  ring8.name = 'ring';
  star9.name = 'star9';

  star1.castShadow = true;
  star2.castShadow = true;
  star3.castShadow = true;
  starlite3.castShadow = true;
  star4.castShadow = true;
  //ring4.castShadow = true;
  star5.castShadow = true;
  star6.castShadow = true;
  starlite6.castShadow = true;

  starlite61.castShadow = true;
  starlite62.castShadow = true;
  starlite63.castShadow = true;
  starlite64.castShadow = true;
  starlite65.castShadow = true;
  star7.castShadow = true;
  star8.castShadow = true;
  //ring8.castShadow = true;
  star9.castShadow = true;

  star1.receiveShadow = true;
  star2.receiveShadow = true;
  star3.receiveShadow = true;
  starlite3.receiveShadow = true;
  star4.receiveShadow = true;
  ring4.receiveShadow = true;
  star5.receiveShadow = true;
  star6.receiveShadow = true;
  starlite6.receiveShadow = true;
  starlite61.receiveShadow = true;
  starlite62.receiveShadow = true;
  starlite63.receiveShadow = true;
  starlite64.receiveShadow = true;
  starlite65.receiveShadow = true;
  star7.receiveShadow = true;
  star8.receiveShadow = true;
  ring8.receiveShadow = true;
  star9.receiveShadow = true;
}

const starball = textureLoader.load('img/ball.png');
const meteoriteball = textureLoader.load('img/star0.png');
const meteoritetail = textureLoader.load('img/start0.png');

const meteoriteballr = textureLoader.load('img/star00.png');
const textureFlare0a = textureLoader.load('img/lensflare0a.png');
const textureFlare0b = textureLoader.load('img/lensflare0b.png');
if (add_solar) {
  const sunmaterial2 = new THREE.SpriteMaterial({
    map: textureFlare0a,
    transparent: true,
    opacity: 0.1,
  });
  sunbackground2 = new THREE.Sprite(sunmaterial2);
  sunbackground2.position.set(0, 0, 0);
  sunbackground2.scale.set(600, 600, 0.1);
  const sunmaterial3 = new THREE.SpriteMaterial({
    map: textureFlare0b,
    transparent: true,
    opacity: 0.1,
  });
  sunbackground3 = new THREE.Sprite(sunmaterial3);
  sunbackground3.position.set(0, 0, 0);
  sunbackground3.scale.set(900, 900, 0.1);
}

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

function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('container').appendChild(renderer.domElement);
  document.body.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  const skyGeometry = new THREE.SphereGeometry(5000, 100, 100);
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

  particles = new Array();
  star_dx = new Array();
  star_dy = new Array();
  star_dz = new Array();
  star_dsx = new Array();
  star_dsy = new Array();
  star_dsz = new Array();
  star_s_speed = new Array();
  const material = new THREE.SpriteMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    map: starball,
    color: 0xffffff,
  });
  const littlestar = new THREE.Sprite(material);
  let i = 0;
  for (let ix = 0; ix < AMOUNTX; ix++) {
    for (let iy = 0; iy < AMOUNTY; iy++) {
      for (let iz = 0; iz < AMOUNTZ; iz++) {
        particle = particles[i] = littlestar.clone();
        star_dx[i] = Math.random() - 0.5;
        star_dy[i] = Math.random() - 0.5;
        star_dz[i] = Math.random() - 0.5;
        star_dsx[i] = Math.random() - 0.5;
        star_dsy[i] = Math.random() - 0.5;
        star_dsz[i] = Math.random() - 0.5;
        star_s_speed[i] = Math.random() - 0.5;
        i++;
        particle.position.x =
          ix * SEPARATION -
          (AMOUNTX * SEPARATION) / 2 +
          (Math.random() - 0.5) * SEPARATION * 16;
        particle.position.y =
          (iy * SEPARATION) / 2 -
          (AMOUNTY * SEPARATION) / 4 +
          (Math.random() - 0.5) * SEPARATION * 16;
        particle.position.z =
          iz * SEPARATION -
          (AMOUNTZ * SEPARATION) / 2 +
          (Math.random() - 0.5) * SEPARATION * 16;
        scene.add(particle);
      }
    }
  }

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

  document.addEventListener('mousemove', mouseMove, false);

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

      case 32:
        hit_open = !hit_open;
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

  scene.add(new THREE.AmbientLight(0x111111));
  if (add_solar) {
    const light = new THREE.PointLight(
      0xffeecc,
      1.5,
      2500 * 1 /*ufo_scale/100*/,
      2,
    );
    light.position.set(0, 0, 0);
    light.penumbra = 0.3;
    light.castShadow = true;
    light.shadow.mapSize.width = 16384;
    light.shadow.mapSize.height = 16384;
    light.shadow.camera.far = 2500 * 1 /*ufo_scale/100*/;
    light.shadow.camera.near = 1 * 1 /*ufo_scale/100*/;
    all_obj4.add(light);

    all_obj4.add(sunbackground);
    all_obj4.add(sunbackground1);
    all_obj4.add(sunbackground2);
    all_obj4.add(sunbackground3);

    all_obj3.add(sun);
    all_obj3.add(star1);
    all_obj3.add(star2);
    all_obj3.add(star3);
    all_obj3.add(starlite3);
    all_obj3.add(star4);
    all_obj4.add(ring4);
    all_obj3.add(star5);
    all_obj3.add(star6);
    all_obj3.add(starlite6);

    all_obj3.add(starlite61);
    all_obj3.add(starlite62);
    all_obj3.add(starlite63);
    all_obj3.add(starlite64);
    all_obj3.add(starlite65);
    all_obj3.add(star7);
    all_obj3.add(star8);
    all_obj4.add(ring8);
    all_obj3.add(star9);
  }

  totalLoadItems += 2;
  const onProgress_obj = createProgressHandler(function markObjLoaded() {
    loadedItemCount += 1;
  }, 'obj');
  const onProgress_mtl = createProgressHandler(function markMtlLoaded() {
    loadedItemCount += 1;
  }, 'mtl');

  const mtlLoader = new MTLLoader();
  mtlLoader.load(
    'UFO2/UFO2.mtl',
    (mtl) => {
      mtl.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mtl);
      objLoader.load(
        'UFO2/UFO2.obj',
        (root) => {
          for (const k in root.children) {
            root.children[k].castShadow = true;
          }
          root.position.set(0, 0, 0);
          root.scale.set(0.1, 0.1, 0.1);
          const ufo_light_material = new THREE.SpriteMaterial({
            blending: THREE.AdditiveBlending,
            map: ufolight,
            transparent: true,
            opacity: 0.5,
          });
          const ufo_light = new THREE.Sprite(ufo_light_material);
          const ufo_top_light = new THREE.Mesh(
            new THREE.SphereGeometry(0.085, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xffffee }),
          );
          const white_light = littlestar.clone();

          const ring_m = new THREE.MeshPhongMaterial({
            color: 0xff51aa,
            specular: 0xff51aa,
            side: THREE.DoubleSide,
            emissive: 0xff51aa,
          });
          const ufo_ring1 = new THREE.Mesh(
            new THREE.TorusGeometry(
              0.0909 * 5,
              0.0025,
              3,
              144,
              Math.PI / 5.455,
            ),
            ring_m,
          );
          ufo_ring1.rotation.x = Math.PI / 2;
          ufo_ring1.rotation.z = Math.PI / 15.35;
          ufo_ring1.position.y = 0.021 * 5;
          const ufo_ring2 = new THREE.Mesh(
            new THREE.TorusGeometry(0.092 * 5, 0.0025, 3, 144, Math.PI / 5.455),
            ring_m,
          );
          ufo_ring2.rotation.x = Math.PI / 2;
          ufo_ring2.rotation.z = Math.PI / 9.35 + Math.PI / 3;
          ufo_ring2.position.y = 0.021 * 5;
          const ufo_ring3 = new THREE.Mesh(
            new THREE.TorusGeometry(
              0.09095 * 5,
              0.0025,
              3,
              144,
              Math.PI / 5.455,
            ),
            ring_m,
          );
          ufo_ring3.rotation.x = Math.PI / 2;
          ufo_ring3.rotation.z = Math.PI / 8.65 + (Math.PI * 2) / 3;
          ufo_ring3.position.y = 0.021 * 5;
          const ufo_ring4 = new THREE.Mesh(
            new THREE.TorusGeometry(
              0.09085 * 5,
              0.0025,
              3,
              144,
              Math.PI / 5.455,
            ),
            ring_m,
          );
          ufo_ring4.rotation.x = Math.PI / 2;
          ufo_ring4.rotation.z = Math.PI / 10.65 + Math.PI;
          ufo_ring4.position.y = 0.021 * 5;
          const ufo_ring5 = new THREE.Mesh(
            new THREE.TorusGeometry(
              0.09085 * 5,
              0.0025,
              3,
              144,
              Math.PI / 5.455,
            ),
            ring_m,
          );
          ufo_ring5.rotation.x = Math.PI / 2;
          ufo_ring5.rotation.z = Math.PI / 13.65 + (Math.PI * 4) / 3;
          ufo_ring5.position.y = 0.021 * 5;
          const ufo_ring6 = new THREE.Mesh(
            new THREE.TorusGeometry(
              0.09085 * 5,
              0.0025,
              3,
              144,
              Math.PI / 4.655,
            ),
            ring_m,
          );
          ufo_ring6.rotation.x = Math.PI / 2;
          ufo_ring6.rotation.z = Math.PI / 18.65 + (Math.PI * 5) / 3;
          ufo_ring6.position.y = 0.021 * 5;

          const ufo_ring0 = new THREE.Mesh(
            new THREE.TorusGeometry(0.0566 * 5, 0.06, 3, 72),
            new THREE.MeshPhongMaterial({
              color: 0x44e0ff,
              specular: 0x44e0ff,
              side: THREE.DoubleSide,
              emissive: 0x44e0ff,
            }),
          );
          ufo_top_light.position.set(0, 0.033 * 5, 0);
          white_light.position.set(0, 0.036 * 5, 0);
          white_light.scale.set(0.063 * 5, 0.0525 * 5);
          ufo_light.position.set(0, -0.04, 0);
          ufo_light.scale.set(0.05, 0.25);

          const light_for_ufo = new THREE.PointLight(
            0xffffee,
            0.1,
            (100 * ufo_scale) / 200,
            0.75,
          );
          light_for_ufo.penumbra = 0.1;
          // light_for_ufo.castShadow = true;
          // light_for_ufo.shadow.mapSize.width = 2048;
          // light_for_ufo.shadow.mapSize.height = 2048;
          // light_for_ufo.shadow.camera.far = (100 * ufo_scale) / 10;
          // light_for_ufo.shadow.camera.near = (0.1 * ufo_scale) / 10;

          light_for_ufo.position.set(0, 0.3, 0);

          const light_for_ufo1 = new THREE.PointLight(
            0xffffee,
            0.3,
            (30 * ufo_scale) / 60,
            0.95,
          );
          light_for_ufo1.penumbra = 0.1;
          // light_for_ufo1.castShadow = true;
          // light_for_ufo1.shadow.mapSize.width = 2048;
          // light_for_ufo1.shadow.mapSize.height = 2048;
          // light_for_ufo1.shadow.camera.far = (30 * ufo_scale) / 10;
          // light_for_ufo1.shadow.camera.near = (0.1 * ufo_scale) / 10;

          light_for_ufo1.position.set(0, 0, 0);

          const ufo_ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 20, 20),
            new THREE.MeshPhongMaterial({
              color: 0xffffff,
              specular: 0xffffff,
              emissive: 0xffffff,
              transparent: true,
              opacity: 0.95,
            }),
          );
          ufo_ball.scale.y = 0.1;
          ufo_ball.position.y = 0.065;
          ufo_ring0.rotation.x = Math.PI / 2;
          ufo_ring0.position.y = 0.0222 * 5;
          root.children[2].material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
          });
          root.children[3].material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
          });
          root.children[5].material = ufo_material;
          ufo.add(root);
          ufo.add(ufo_light);
          ufo.add(ufo_top_light);
          ufo.add(white_light);
          ufo.add(ufo_ring1);
          ufo.add(ufo_ring2);
          ufo.add(ufo_ring3);
          ufo.add(ufo_ring4);
          ufo.add(ufo_ring5);
          ufo.add(ufo_ring6);
          ufo.add(ufo_ring0);

          ufo.add(light_for_ufo);
          ufo.add(light_for_ufo1);
          ufo.add(ufo_ball);

          ufo.position.z -= 0.48 * 5;
          ufo.position.y -= 0.12 * 5;
        },
        onProgress_obj,
      );
    },
    onProgress_mtl,
  );
  ufo.scale.set(ufo_scale, ufo_scale, ufo_scale);
  scene.add(ufo);
  ufo.position.set(0, -1000, 0);

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
}
init();
// let controls = new (function () {
//   this.baseSpeed = 0.025;
//   this.noiseRepeat=60;
//   this.noiseScale = 0.0025;
//   this.bumpSpeed = 0.025;
//   this.bumpRepeat=30;
//   this.bumpScale = 2.5;
// })();
// const gui = new GUI();
// const sun_shader = gui.addFolder("shader");
// sun_shader.add(controls, "baseSpeed", 0.02, 0.2);
// sun_shader.add(controls, "noiseRepeat", 1, 100);
// sun_shader.add(controls, "noiseScale", 0.002, 0.02);
// sun_shader.add(controls, "bumpSpeed", 0.02, 0.5);
// sun_shader.add(controls, "bumpRepeat", 1, 100);
// sun_shader.add(controls, "bumpScale", 2, 20);

// sun_shader.open();

function obj_lighting(url, size, x, y, z, name) {
  size = size * 0.8;
  const startTexture = textureLoader.load(url);
  const starBall = new THREE.Mesh(
    new THREE.SphereGeometry(size, 100, 100),
    new THREE.MeshPhongMaterial({
      emissive: 0xffffff,
      emissiveMap: startTexture,
    }),
  );
  star_radius[name] = size * 1.02;
  starBall.position.set(x, y, z);
  return starBall;
}
function obj(url, size, x, y, z, name) {
  size = size * 0.8;
  const startTexture = textureLoader.load(url);
  let starBall = new THREE.Mesh(
    new THREE.SphereGeometry(size, 50, 50),
    new THREE.MeshPhongMaterial({ map: startTexture }),
  );
  if (name == 'star3') {
  } else if (name == 'star2') {
    //console.log(name)
    startTexture.wrapS = startTexture.wrapT = THREE.RepeatWrapping;
    startTexture.repeat.set(3, 3);
  } else if (size > 10 && size < 18 && size != 12) {
    if (name == 'star7') {
      startTexture.wrapS = startTexture.wrapT = THREE.RepeatWrapping;
      startTexture.repeat.set(3, 3);
    }
    starBall = new THREE.Mesh(
      new THREE.SphereGeometry(size, 50, 50),
      new THREE.MeshPhongMaterial({
        map: startTexture,
        normalMap: textureLoader.load(
          './texture/normal.jpg',
          function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          },
        ),
      }),
    );
  } else if (size < 18 && name != 'starlite6') {
    //console.log(name)
  } else if (name == 'starlite6') {
    //console.log(name)
    startTexture.wrapS = startTexture.wrapT = THREE.RepeatWrapping;
    startTexture.repeat.set(5, 5);
  } else if (size < 18) {
  } else {
  }
  star_radius[name] = size;
  starBall.position.set(x, y, z);
  return starBall;
}

function ring1(url, size, width, x, y, z) {
  size = size * 0.8;
  const startTexture = textureLoader.load(url);
  const r = new THREE.RingGeometry(size, size + width, size * 10);
  const pos = r.attributes.position;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    r.attributes.uv.setXY(i, v3.length() < size + 1 ? 0 : 1, 1);
  }
  const starBall = new THREE.Mesh(
    r,
    new THREE.MeshBasicMaterial({
      color: 0xffeecc,
      map: startTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
    }),
  );
  starBall.rotation.x = -Math.PI / 2;
  starBall.rotation.y = -Math.PI / 12;
  starBall.position.set(x, y, z);
  return starBall;
}
function ring2(url, size, width, x, y, z) {
  size = size * 0.8;
  const startTexture = textureLoader.load(url);
  const r = new THREE.RingGeometry(size, size + width, size * 10);
  const pos = r.attributes.position;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    r.attributes.uv.setXY(i, v3.length() < size + 1 ? 0 : 1, 1);
  }
  const starBall = new THREE.Mesh(
    r,
    new THREE.MeshBasicMaterial({
      map: startTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.1,
    }),
  );
  starBall.rotation.x = -Math.PI / 2;
  starBall.rotation.y = -Math.PI / 6;
  starBall.position.set(x, y, z);
  return starBall;
}

function getMousePosition() {
  const x = document.getElementById('aiming1').offsetLeft + 10;
  const y = document.getElementById('aiming1').offsetTop + 10;
  return { x: x, y: y };
}
function mouseMove(e) {
  mouse.x =
    ((document.getElementById('aiming1').offsetLeft + 10) / window.innerWidth) *
      2 -
    1;
  mouse.y =
    -(
      (document.getElementById('aiming1').offsetTop + 10) /
      window.innerHeight
    ) *
      2 +
    1;

  document.getElementById('aiming1').style.left = e.clientX - 10 + 'px';
  document.getElementById('aiming1').style.top = e.clientY - 10 + 'px';
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
  cameraPositionVec.y = Math.max(
    -508 + 0.55 * ufo_scale,
    Math.min(400, cameraPositionVec.y),
  );
  if (
    crash_detect(ufo, sun, 'sun') &&
    crash_detect(ufo, star1, 'star1') &&
    crash_detect(ufo, star2, 'star2') &&
    crash_detect(ufo, star3, 'star3') &&
    crash_detect(ufo, starlite3, 'starlite3') &&
    crash_detect(ufo, star4, 'star4') &&
    crash_detect(ufo, star5, 'star5') &&
    crash_detect(ufo, star6, 'star6') &&
    crash_detect(ufo, starlite6, 'starlite6') &&
    crash_detect(ufo, starlite61, 'starlite61') &&
    crash_detect(ufo, starlite62, 'starlite62') &&
    crash_detect(ufo, starlite63, 'starlite63') &&
    crash_detect(ufo, starlite64, 'starlite64') &&
    crash_detect(ufo, starlite65, 'starlite65') &&
    crash_detect(ufo, star7, 'star7') &&
    crash_detect(ufo, star8, 'star8') &&
    crash_detect(ufo, star9, 'star9')
  ) {
    return false;
  } else {
    return true;
  }
}
function crash_detect(a, b, i) {
  if (star_radius[i] + 1 > a.position.distanceTo(b.position)) {
    hitDirectionVec
      .set(
        a.position.x - b.position.x,
        a.position.y - b.position.y,
        a.position.z - b.position.z,
      )
      .normalize();
    return false;
  } else {
    return true;
  }
}

function onMouseClick(event) {
  if (document.getElementById('content').style.display == 'none' && !esc) {
    raycaster1.setFromCamera(mouse, camera);
    raycaster1.near = 0.1;
    raycaster1.far = 10000;
    const intersects = raycaster1.intersectObjects(scene.children, true);
    let hitIndex = -1;
    for (let i = 0; i < intersects.length; i++) {
      if (
        intersects[i].object.type != 'Sprite' &&
        intersects[i].object.name != 'ring' &&
        intersects[i].object.name != 'Sky'
      ) {
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

window.addEventListener('mousedown', onMouseClick, false);

function operation_method_1(delta) {
  if (!ufo || !ufo.children || !ufo.children[10]) return;
  if (bounder_detect() && hit_frame < 490) {
    hit_frame = 500;
    chasingFrame = 0;
  }
  if (hit_frame > 0) {
    moveForward = moveLeft = moveRight = moveBackward = false;
    currentSpeedForward = 0;
    currentSpeedRight = 0;
    cameraPositionVec.x +=
      (hitDirectionVec.x * hit_frame * rotatespeed) / 10000;
    cameraPositionVec.y +=
      (hitDirectionVec.y * hit_frame * rotatespeed) / 10000;
    cameraPositionVec.z +=
      (hitDirectionVec.z * hit_frame * rotatespeed) / 10000;

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
  if (fast) maxSpeed = 0.6 * fpsScale;
  else maxSpeed = Math.max(maxSpeed - 0.03 * fpsScale, 0.3 * fpsScale);

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
        maxSpeed,
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
        maxSpeed,
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
        maxSpeed / 2,
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
        maxSpeed / 2,
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
    add_solar &&
    selected_object &&
    followablePlanetNames.includes(selected_object.object.name) &&
    document.getElementById('content').style.display == 'none'
  ) {
    safe_dis = 1 * ufo_scale;
    if (selected_object.object.name == 'sun') safe_dis = 10;

    chasingFrame = 50;
    ufo.children[10].material.color.set(0xffff33);
    ufo.children[10].material.specular.set(0xffff33);
    ufo.children[10].material.emissive.set(0xffff33);
    catchspeed = Math.min(
      catchspeed + 0.01 * fpsScale,
      1.2 * fpsScale * ufo_scale,
    );
    const delx = selected_object.object.position.x - cameraPositionVec.x;
    const dely = selected_object.object.position.y - cameraPositionVec.y;
    const delz = selected_object.object.position.z - cameraPositionVec.z;
    const di = vec.clone().set(delx, dely, delz).normalize();
    chasing.set(
      delx - di.x * (star_radius[selected_object.object.name] + safe_dis),
      dely - di.y * (star_radius[selected_object.object.name] + safe_dis),
      delz - di.z * (star_radius[selected_object.object.name] + safe_dis),
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
    if (selected_object.object.name == 'starlite3') {
      cameraPositionVec.x += (chasing.x * catchspeed) / 10;
      cameraPositionVec.y += (chasing.y * catchspeed) / 10;
      cameraPositionVec.z += (chasing.z * catchspeed) / 10;
    } else {
      cameraPositionVec.x += (chasing.x * catchspeed) / 20;
      cameraPositionVec.y += (chasing.y * catchspeed) / 20;
      cameraPositionVec.z += (chasing.z * catchspeed) / 20;
    }
  } else if (
    arrived > 0 &&
    selected_object &&
    document.getElementById('content').style.display == 'none'
  ) {
    ////console.log(selected_object.point)
    safe_dis = 1 * ufo_scale;
    chasingFrame = 50;
    ufo.children[10].material.color.set(0xffff33);
    ufo.children[10].material.specular.set(0xffff33);
    ufo.children[10].material.emissive.set(0xffff33);
    catchspeed = Math.min(catchspeed + 0.01 * fpsScale, 1.2 * fpsScale);
    const delx =
      Math.max(-1500, Math.min(1500, selected_object.point.x)) -
      cameraPositionVec.x;
    const dely = selected_object.point.y - cameraPositionVec.y;
    const delz =
      Math.max(-1500, Math.min(1500, selected_object.point.z)) -
      cameraPositionVec.z;
    const di = vec.clone().set(delx, dely, delz).normalize();
    chasing.set(
      delx - di.x * safe_dis,
      dely - di.y * safe_dis,
      delz - di.z * safe_dis,
    );
    if (chasing.distanceTo(originPoint) < 50) {
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

function generate_meteoriteObject3D(size) {
  size = size * (Math.random() + 0.7);
  const osize = size;

  const meteoriteObject3D = meteorite_Object3D.clone();

  let x, y, z;
  x = (Math.random() - 0.5) * METEOR_MAX_DISTANCE;
  y = Math.random() * 4000 - 500;
  z =
    Math.sqrt(
      METEOR_MAX_DISTANCE_SQ - x * x - y * y,
    ) * (Math.random() > 0.5 ? 1 : -1);

  const v1 = new THREE.Vector3();
  const toCenter = new THREE.Vector3();
  let centerDot = 0;
  while (true) {
    v1
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize();
    toCenter.set(-x, -y, -z).normalize();
    centerDot = toCenter.dot(v1);
    if (
      !(
        (v1.y < 0 && y < 500) ||
        centerDot < 0.85 ||
        centerDot > 0.851 ||
        (z < 0 && v1.z < 0)
      )
    ) {
      break;
    }
  }
  const x1 = x;
  const y1 = y;
  const z1 = z;

  for (let i = 0; i < 2; i++) {
    const meteorite = i % 2 == 0 ? material.clone() : materialr.clone();
    meteorite.position.set(x - x1, y - y1, z - z1);
    meteorite.scale.set(size * 1.15, size * 1.15, 1);
    meteoriteObject3D.add(meteorite);
    x = x - (size * v1.x) / 3;
    y = y - (size * v1.y) / 3;
    z = z - (size * v1.z) / 3;
  }
  while (size > 1) {
    const meteorite = material.clone();
    const msize = Math.max(0.6, Math.pow(size / osize, 0.25));
    meteorite.scale.set(size * msize, size * msize, 1);
    meteorite.position.set(x - x1, y - y1, z - z1);
    meteoriteObject3D.add(meteorite);

    const meteoriteTail = material1.clone();
    meteoriteTail.scale.set(size, size, 1);
    meteoriteTail.position.set(x - x1, y - y1, z - z1);
    meteoriteObject3D.add(meteoriteTail);

    x = x - (size * v1.x) / 2.8;
    y = y - (size * v1.y) / 2.8;
    z = z - (size * v1.z) / 2.8;
    size *= 0.985;
  }
  meteoriteObject3D.position.set(x1, y1, z1);
  return [meteoriteObject3D, v1];
}

function meteorite_move(meteorite1) {
  const meteorObject = meteorite1[0];
  const meteorVelocity = meteorite1[1];
  if (meteorObject.position.lengthSq() > METEOR_MAX_DISTANCE_SQ) {
    scene.remove(meteorObject);
    return true;
  }
  meteorObject.position.addScaledVector(meteorVelocity, METEOR_SPEED);
  return false;
}

function animate() {
  toggleAimingCursor(esc);

  const delta = clock.getDelta();
  requestAnimationFrame(animate);
  if (isLoadFinished(loadedItemCount, totalLoadItems)) hide_loading();
  else return;
  customUniforms.time.value += delta;
  // customUniforms.baseSpeed.value = controls.baseSpeed;
  // customUniforms.noiseScale.value = controls.noiseScale;
  // customUniforms.bumpSpeed.value = controls.bumpSpeed;
  // customUniforms.bumpScale.value = controls.bumpScale;
  // customUniforms.bumpRepeat.value = controls.bumpRepeat;
  // customUniforms.noiseRepeat.value = controls.noiseRepeat;
  frameAccumulator += delta;
  if (frameAccumulator > frameInterval) {
    //stats.update();
    if (selected_object && selected_object.object.name == 'star3') {
      followFrame1 += 1;
    } else {
      followFrame1 = 0;
    }
    if (selected_object && selected_object.object.name == 'star4') {
      followFrame2 += 1;
    } else {
      followFrame2 = 0;
    }
    if (selected_object && selected_object.object.name == 'star6') {
      followFrame3 += 1;
    } else {
      followFrame3 = 0;
    }
    if (followFrame1 > TARGET_FPS * 5) {
      goIslandWithFade();
    } else if (followFrame2 > TARGET_FPS * 5) {
      goAlienBaseWithFade();
    } else if (followFrame3 > TARGET_FPS * 5) {
      goLightningWithFade();
    }

    const rotate = angle * Math.PI * rotatespeed;

    angle += 0.0005;
    if (add_solar) {
      sun.rotation.y -= ((0.005 / Math.PI) * rotatespeed) / 5;
      const position1 = (2 * rotate) / 5;
      star1.rotateOnWorldAxis(
        vec.clone().set(-1, 1, 0).normalize(),
        ((0.2 / Math.PI) * rotatespeed) / 5,
      );
      star1.position.x = Math.sin(position1) * 180;
      star1.position.z = Math.cos(position1) * 180;

      const position2 = (1.8 * rotate) / 5;
      star2.rotateOnWorldAxis(
        vec.clone().set(0, 2, 0).normalize(),
        ((0.02 / Math.PI) * rotatespeed) / 5,
      );
      star2.position.x = Math.sin(position2) * 240;
      star2.position.z = Math.cos(position2) * 240;

      const position3 = (1.5 * rotate) / 5;
      star3.rotateOnWorldAxis(
        vec.clone().set(0.2, 1, 0).normalize(),
        ((0.04 / Math.PI) * rotatespeed) / 5,
      );
      star3.position.x = Math.sin(position3) * 320;
      star3.position.z = Math.cos(position3) * 320;
      const starliteposition3 = (10 * rotate) / 5;
      starlite3.rotateOnWorldAxis(
        vec.clone().set(0.1, 1, 0).normalize(),
        ((0.4 / Math.PI) * rotatespeed) / 3 / 5,
      );
      starlite3.position.x =
        Math.sin(starliteposition3 / 2) * 19 + star3.position.x;
      starlite3.position.z =
        Math.cos(starliteposition3 / 2) * 19 + star3.position.z;
      starlite3.position.y =
        Math.sin(starliteposition3 / 2) * 21 + star3.position.y;

      const position4 = (0.85 * rotate) / 5;
      star4.rotateOnWorldAxis(
        vec.clone().set(0, 1, 0).normalize(),
        ((0.06 / Math.PI) * rotatespeed) / 5,
      );
      star4.position.x = Math.sin(position4) * 780;
      star4.position.z = Math.cos(position4) * 780;
      ring4.rotateOnWorldAxis(
        vec.clone().set(0, 1, 0).normalize(),
        ((((0.7 * 0.0005) / Math.PI) * rotatespeed) / 5) * 10,
      );
      ring4.position.x = Math.sin(position4) * 780;
      ring4.position.z = Math.cos(position4) * 780;

      const position5 = (1.3 * rotate) / 5;
      star5.rotateOnWorldAxis(
        vec.clone().set(1, 4, 1).normalize(),
        ((0.03 / Math.PI) * rotatespeed) / 5,
      );
      star5.position.x = Math.sin(position5) * 420;
      star5.position.z = Math.cos(position5) * 420;

      const position6 = (1.1 * rotate) / 5;
      star6.rotateOnWorldAxis(
        vec.clone().set(0, 5, 0).normalize(),
        ((0.02 / Math.PI) * rotatespeed) / 5,
      );
      star6.position.x = Math.sin(position6) * 600;
      star6.position.z = Math.cos(position6) * 600;
      const starliteposition6 = (2 * rotate) / 5;
      starlite6.rotateOnWorldAxis(
        vec.clone().set(0.1, 1, 0.3).normalize(),
        ((0.2 / Math.PI) * rotatespeed) / 50,
      );
      starlite6.position.x =
        Math.sin(starliteposition6) * 50 + star6.position.x;
      starlite6.position.z =
        Math.cos(starliteposition6) * 50 + star6.position.z;
      starlite6.position.y =
        Math.sin(starliteposition6) * 40 + star6.position.y;

      starlite61.rotateOnWorldAxis(
        vec.clone().set(0.5, 1, 0.2).normalize(),
        ((0.2 / Math.PI) * rotatespeed) / 50,
      );
      starlite61.position.x =
        Math.sin(starliteposition6 * 2) * 40 + star6.position.x;
      starlite61.position.z =
        Math.cos(starliteposition6 * 2) * 40 + star6.position.z;
      starlite61.position.y =
        Math.sin(starliteposition6 * 2) * 35 + star6.position.y;

      starlite62.rotateOnWorldAxis(
        vec.clone().set(0.2, 1, 0.6).normalize(),
        ((0.2 / Math.PI) * rotatespeed) / 50,
      );
      starlite62.position.x =
        Math.sin(starliteposition6 * 1.2) * 55 + star6.position.x;
      starlite62.position.z =
        Math.cos(starliteposition6 * 1.2) * 55 + star6.position.z;
      starlite62.position.y =
        Math.sin(starliteposition6 * 1.2) * 45 + star6.position.y;

      starlite63.rotateOnWorldAxis(
        vec.clone().set(0.1, 1, 0.5).normalize(),
        ((0.2 / Math.PI) * rotatespeed) / 50,
      );
      starlite63.position.x =
        Math.sin(starliteposition6 * 1.5) * 60 + star6.position.x;
      starlite63.position.z =
        Math.cos(starliteposition6 * 1.5) * 60 + star6.position.z;
      starlite63.position.y =
        Math.sin(starliteposition6 * 1.5) * 50 + star6.position.y;

      starlite64.rotateOnWorldAxis(
        vec.clone().set(0.2, 1, 0.3).normalize(),
        ((0.2 / Math.PI) * rotatespeed) / 50,
      );
      starlite64.position.x =
        Math.sin(starliteposition6 * 0.8) * 65 + star6.position.x;
      starlite64.position.z =
        Math.cos(starliteposition6 * 0.8) * 65 + star6.position.z;
      starlite64.position.y =
        Math.sin(starliteposition6 * 0.8) * 55 + star6.position.y;

      starlite65.rotateOnWorldAxis(
        vec.clone().set(0.6, 1, 0.3).normalize(),
        ((0.2 / Math.PI) * rotatespeed) / 50,
      );
      starlite65.position.x =
        Math.sin(starliteposition6 * 0.18) * 70 + star6.position.x;
      starlite65.position.z =
        Math.cos(starliteposition6 * 0.18) * 70 + star6.position.z;
      starlite65.position.y =
        Math.sin(starliteposition6 * 0.18) * 60 + star6.position.y;

      const position7 = (0.7 * rotate) / 5;
      star7.rotateOnWorldAxis(
        vec.clone().set(0.5, 3, 1).normalize(),
        ((0.015 / Math.PI) * rotatespeed) / 5,
      );
      star7.position.x = Math.sin(position7) * 900;
      star7.position.z = Math.cos(position7) * 900;

      const position8 = (0.4 * rotate) / 5;
      star8.rotateOnWorldAxis(
        vec.clone().set(0, 1, 0).normalize(),
        ((0.1 / Math.PI) * rotatespeed) / 5,
      );
      star8.position.x = Math.sin(position8) * 1050;
      star8.position.z = Math.cos(position8) * 1050;
      ring8.rotateOnWorldAxis(
        vec.clone().set(0, 1, 0).normalize(),
        ((((0.2 * 0.0005) / Math.PI) * rotatespeed) / 5) * 10,
      );
      ring8.position.x = Math.sin(position7) * 900;
      ring8.position.z = Math.cos(position7) * 900;

      const position9 = (0.2 * rotate) / 5;
      star9.rotateOnWorldAxis(
        vec.clone().set(0, 10, 1).normalize(),
        ((0.01 / Math.PI) * rotatespeed) / 5,
      );
      star9.position.x = Math.sin(position9) * 1200;
      star9.position.z = Math.cos(position9) * 1200;
    }

    //Ball Maving
    const scaleCount = count * 200;
    for (let i = 0; i < particles.length; i++) {
      particle = particles[i];
      particle.scale.x = particle.scale.y =
        Math.sin(star_s_speed[i] * scaleCount) + 3;
      particle.position.x += (star_dx[i] * Math.cos(star_dsx[i] * count)) / 6;
      particle.position.y += (star_dy[i] * Math.cos(star_dsy[i] * count)) / 6;
      particle.position.z += (star_dz[i] * Math.cos(star_dsz[i] * count)) / 6;
    }
    if (meteorites.length < 10) {
      const meteorite1 = generate_meteoriteObject3D(8);
      meteorites.push(meteorite1);
      scene.add(meteorite1[0]);
    }
    for (let i = meteorites.length - 1; i >= 0; i--) {
      if (meteorite_move(meteorites[i])) {
        meteorites.splice(i, 1);
      }
    }
    count += 0.0005 * fpsScale;

    operation_method_1(delta);

    renderer.render(scene, camera);

    frameAccumulator = frameAccumulator % frameInterval;
  }
}

animate();
const handleResize = createResizeRendererHandler(renderer, camera, scene);
window.addEventListener('resize', handleResize);
