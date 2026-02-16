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
const {
  targetFps: TARGET_FPS,
  frameInterval,
  fpsScale,
} = createFrameConfig(120);
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

const SEPARATION = 250,
  AMOUNTX = 12,
  AMOUNTY = 4,
  AMOUNTZ = 12;
let particles,
  particle,
  star_d,
  star_d_speed,
  star_s_speed,
  count = 0;

// Mouse Move
let mouseP = { x: 0, y: 0 };
let up = 0;
let down = 0;
let left = 0;
let right = 0;

let maxSpeed = 0.01 * fpsScale;
const acc = 0.1 * fpsScale;
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

const raycaster = new THREE.Raycaster();
const raycaster1 = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selected_object = false;

const ufolight = new THREE.TextureLoader().load('img/ufo_light1.png');

const starball = new THREE.TextureLoader().load('img/ball.png');
const meteoriteball = new THREE.TextureLoader().load('img/star0.png');
const meteoritetail = new THREE.TextureLoader().load('img/start0.png');

const meteoriteballr = new THREE.TextureLoader().load('img/star00.png');

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
const waterGeometry = new THREE.CircleGeometry(5000, 100);

const MeshWater = new Water(
  waterGeometry,
  {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: new THREE.TextureLoader().load(
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
const normalMap2 = new THREE.TextureLoader().load(
  './texture/three/water/Water_1_M_Normal.jpg',
);
const clearcoatNormaMap = new THREE.TextureLoader().load(
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
  const map = new THREE.TextureLoader().load('img/bg5.png');
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
  star_d = new Array();
  star_d_speed = new Array();
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
        star_d[i] = vec
          .clone()
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        star_d_speed[i] = vec
          .clone()
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        star_s_speed[i] = Math.random() - 0.5;
        i++;
        particle.position.x =
          ix * SEPARATION -
          (AMOUNTX * SEPARATION) / 2 +
          (Math.random() - 0.5) * SEPARATION * 16;
        particle.position.y =
          (iy * SEPARATION) / 2 + (Math.random() - 0.5) * SEPARATION * 16;
        particle.position.z =
          iz * SEPARATION -
          (AMOUNTZ * SEPARATION) / 2 +
          (Math.random() - 0.5) * SEPARATION * 16;
        scene.add(particle);
      }
    }
  }

  const geometryGround = new THREE.CircleGeometry(5000, 100, 100);
  geometryGround.rotateX(Math.PI / 2);
  geometryGround.translate(0, 0, 0);
  const texture = THREE.ImageUtils.loadTexture('texture/pattern5.jpg');
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
  MeshWater.position.set(0, -503 + 500, 0);
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

  document.addEventListener('mousemove', mouseMove, false);

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
            0.5,
            (100 * ufo_scale) / 20,
            0.75,
          );
          light_for_ufo.penumbra = 0.1;
          light_for_ufo.castShadow = true;
          light_for_ufo.shadow.mapSize.width = 512;
          light_for_ufo.shadow.mapSize.height = 512;
          light_for_ufo.shadow.camera.far = (100 * ufo_scale) / 20;
          light_for_ufo.shadow.camera.near = (0.1 * ufo_scale) / 20;
          light_for_ufo.shadow.radius = 3;
          // light_for_ufo.shadowBias = -0.001;

          light_for_ufo.position.set(0, 0.3, 0);

          const light_for_ufo1 = new THREE.PointLight(
            0xffffee,
            1.5,
            (30 * ufo_scale) / 20,
            0.95,
          );
          light_for_ufo1.penumbra = 0.1;
          light_for_ufo1.castShadow = true;
          light_for_ufo1.shadow.mapSize.width = 512;
          light_for_ufo1.shadow.mapSize.height = 512;
          light_for_ufo1.shadow.camera.far = (30 * ufo_scale) / 20;
          light_for_ufo1.shadow.camera.near = (0.1 * ufo_scale) / 20;
          light_for_ufo1.shadow.radius = 3;
          //light_for_ufo1.shadowBias = -0.001;

          light_for_ufo1.position.set(0, 0, 0);

          const ufo_ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 30, 30),
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
      document.getElementById('secondBlocker').innerHTML =
        'Press Q or E to change the size of UFO. Current size: ' +
        Math.floor(ufo_scale * 20 - 20).toString() +
        '%';
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
      document.getElementById('secondBlocker').innerHTML =
        'Press Q or E to change the size of UFO. Current size: ' +
        Math.floor(ufo_scale * 20 - 20).toString() +
        '%';
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
const stacy_txt = new THREE.TextureLoader().load('./obj/model/model.jpg');

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
  if (fast) maxSpeed = 0.02 * fpsScale;
  else maxSpeed = Math.max(maxSpeed - 0.001 * fpsScale, 0.01 * fpsScale);

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

function generate_meteoriteObject3D(size) {
  size = size * (Math.random() * 0.6 + 0.7);
  const osize = size;

  const meteoriteObject3D = meteorite_Object3D.clone();

  let x, y, z;
  x = (Math.random() - 0.5) * 8000;
  y = Math.random() * 4000 - 500;
  z = Math.sqrt(7999 * 7999 - x * x - y * y) * (Math.random() > 0.5 ? 1 : -1);

  let v1 = vec
    .clone()
    .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
    .normalize();
  while (
    (v1.y < 0 && y < 500) ||
    vec.clone().set(-x, -y, -z).normalize().dot(v1) < 0.85 ||
    vec.clone().set(-x, -y, -z).normalize().dot(v1) > 0.851 ||
    (z < 0 && v1.z < 0)
  ) {
    v1 = vec
      .clone()
      .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .normalize();
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

    x = x - (size * v1.x) / 2.5;
    y = y - (size * v1.y) / 2.5;
    z = z - (size * v1.z) / 2.5;
    size *= 0.985;
  }
  meteoriteObject3D.position.set(x1, y1, z1);
  return [meteoriteObject3D, v1];
}

function meteorite_move(meteorite1) {
  if (meteorite1[0].position.distanceTo(originPoint) > 8000) {
    scene.remove(meteorite1[0]);
    return true;
  }
  meteorite1[0].position.x += meteorite1[1].x * 3 * fpsScale;
  meteorite1[0].position.y += meteorite1[1].y * 3 * fpsScale;
  meteorite1[0].position.z += meteorite1[1].z * 3 * fpsScale;
  return false;
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
  toggleAimingCursor(esc);

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
    if (meteorites.length < 5) {
      const meteorite1 = generate_meteoriteObject3D(10);
      meteorites.push(meteorite1);
      scene.add(meteorite1[0]);
    }
    for (const met in meteorites) {
      if (meteorite_move(meteorites[met])) meteorites.splice(met, 1);
    }

    for (let i = 0; i < particles.length; i++) {
      particle = particles[i];
      particle.scale.x = particle.scale.y =
        Math.sin(star_s_speed[i] * count * 200) + 3;
      const d = star_d[i];
      const ds = star_d_speed[i];
      particle.position.x += (d.x * Math.cos(ds.x * count)) / 6;
      particle.position.y += (d.y * Math.cos(ds.y * count)) / 6;
      particle.position.z += (d.z * Math.cos(ds.z * count)) / 6;
    }
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
