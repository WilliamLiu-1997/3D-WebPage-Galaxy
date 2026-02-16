import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { LightningStorm } from './JS/vendor/objects/LightningStorm.js';
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
let arrived = 50;
const ufo_scale = 2;

const vec = new THREE.Vector3();
const originPoint = new THREE.Vector3(0, 0, 0);
const cameraPositionVec = vec.clone().set(0, 30, 0);
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

let particles,
  particle,
  star_d,
  star_d_speed,
  star_s_speed,
  count = 0;

let rain, rainGeo;
const rainCount = 100000;
let all_drop, velocity;

// Mouse Move
let mouseP = { x: 0, y: 0 };
let up = 0;
let down = 0;
let left = 0;
let right = 0;

let maxSpeed = 0.03 * fpsScale;
const acc = 0.3 * fpsScale;
let currentSpeedForward = 0;
let currentSpeedRight = 0;
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

const raycaster1 = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selected_object = false;

const currentSceneIndex = 0;

let currentTime = 0;

const ufolight = new THREE.TextureLoader().load('img/ufo_light1.png');

const starball = new THREE.TextureLoader().load('img/ball.png');
const cloudMap = new THREE.TextureLoader().load('img/cloud55.png');
const cloudMap1 = new THREE.TextureLoader().load('img/cloud11.png');
const flash = new THREE.Color(0.11, 0.11, 0.11);
const cloudMaterial1 = new THREE.SpriteMaterial({
  map: cloudMap,
  color: flash,
});
const cloudMaterial2 = new THREE.SpriteMaterial({
  map: cloudMap1,
  color: flash,
});
const sky_plane = new THREE.MeshBasicMaterial({
  map: cloudMap1,
  color: flash,
});

const meteorite_Object3D = obj3d.clone();
const ufo = meteorite_Object3D.clone();
const GROUND_SIZE = 900;

const waterGeometry = new THREE.CircleGeometry(3500, 100);

const MeshWater = new Water(
  waterGeometry,
  {
    textureWidth: 2048,
    textureHeight: 2048,
    waterNormals: new THREE.TextureLoader().load(
      './texture/three/water/waternormals.jpg',
      function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      },
    ),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x000000,
    distortionScale: 8,
    fog: scene.fog !== undefined,
  },
  2.0,
);

// Storm

scene.lightningColor = new THREE.Color(0xffffff);

scene.lightningMaterial = new THREE.MeshBasicMaterial({
  color: scene.lightningColor,
});

scene.rayParams = {
  radius0: 0.75,
  radius1: 0.1,
  minRadius: 0.15,
  maxIterations: 9,

  timeScale: 0.01,
  propagationTimeFactor: 0.3,
  vanishingTimeFactor: 0.8,
  subrayPeriod: 3,
  subrayDutyCycle: 3,

  maxSubrayRecursion: 3,
  ramification: 4,
  recursionProbability: 1,

  roughness: 1,
  straightness: 0.7,

  onSubrayCreation: function (
    segment,
    parentSubray,
    childSubray,
    lightningStrike,
  ) {
    lightningStrike.subrayConePosition(
      segment,
      parentSubray,
      childSubray,
      0.6,
      0.6,
      0.5,
    );
  },
};

//

const storm = new LightningStorm({
  size: GROUND_SIZE,
  minHeight: 240,
  maxHeight: 250,
  maxSlope: 0.3,
  maxLightnings: 9,

  lightningParameters: scene.rayParams,

  lightningMaterial: scene.lightningMaterial,
});

scene.add(storm);

scene.render = function (time) {
  storm.update(time);
};

scene.sceneIndex = currentSceneIndex;
scene.timeRate = 1.5;
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
  // let i = 0;
  // for (let ix = 0; ix < AMOUNTX; ix++) {
  //   for (let iy = 0; iy < AMOUNTY; iy++) {
  //     for (let iz = 0; iz < AMOUNTZ; iz++) {
  //       particle = particles[i] = littlestar.clone();
  //       star_d[i] = vec.clone().set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  //       star_d_speed[i] = vec.clone().set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  //       star_s_speed[i] = Math.random() - 0.5;
  //       i++;
  //       particle.position.x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2 + ((Math.random() - 0.5) * SEPARATION * 16);
  //       particle.position.y = iy * SEPARATION / 2 + ((Math.random() - 0.5) * SEPARATION * 16);
  //       particle.position.z = iz * SEPARATION - (AMOUNTZ * SEPARATION) / 2 + ((Math.random() - 0.5) * SEPARATION * 16);
  //       scene.add(particle);
  //     }
  //   }
  // }
  scene.fog = new THREE.Fog(0x555555, 1, 1000);
  const cloudx = 46;
  const cloudy = 46;
  const clouds = 42;
  let i = 0;
  for (let ix = 0; ix < cloudx; ix++) {
    for (let iy = 0; iy < cloudy; iy++) {
      const scale_cloud = 100 + Math.random() * 20;
      const rotate_cloud = (Math.random() - 0.5) * 0.5;
      if (Math.random() > 0.5) {
        const cloudMaterial = cloudMaterial1.clone();
        cloudMaterial.rotation = Math.PI * rotate_cloud;
        const cloud = new THREE.Sprite(cloudMaterial);
        particle = particles[i] = cloud;
        star_d[i] = vec
          .clone()
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        star_d_speed[i] = vec
          .clone()
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        star_s_speed[i] = Math.random() - 0.5;
        i++;
        particle.position.y = 220 + Math.random() * 10;
        particle.position.x =
          ix * clouds -
          (cloudx * clouds) / 2 +
          (Math.random() - 0.5) * clouds * 2;
        particle.position.z =
          iy * clouds -
          (cloudy * clouds) / 2 +
          (Math.random() - 0.5) * clouds * 2;
        particle.scale.set(scale_cloud, scale_cloud);
      } else {
        const cloudMaterial = cloudMaterial2.clone();
        cloudMaterial.rotation = Math.PI * rotate_cloud;
        const cloud = new THREE.Sprite(cloudMaterial);
        particle = particles[i] = cloud;
        star_d[i] = vec
          .clone()
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        star_d_speed[i] = vec
          .clone()
          .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
        star_s_speed[i] = Math.random() - 0.5;
        i++;
        particle.position.y = 220 + Math.random() * 10;
        particle.position.x =
          ix * clouds -
          (cloudx * clouds) / 2 +
          (Math.random() - 0.5) * clouds * 2;
        particle.position.z =
          iy * clouds -
          (cloudy * clouds) / 2 +
          (Math.random() - 0.5) * clouds * 2;
        particle.scale.set(scale_cloud, scale_cloud);
      }

      scene.add(particle);
    }
  }

  rainGeo = new THREE.BufferGeometry();
  all_drop = [];
  velocity = [];
  for (i = 0; i < rainCount; i++) {
    const rainDrop = vec.clone();
    rainDrop.set(
      Math.random() * 1000 - 500,
      Math.random() * 350,
      Math.random() * 1000 - 500,
    );
    velocity.push(0);
    all_drop.push(rainDrop);
  }
  rainGeo.setFromPoints(all_drop);
  const rainMaterial = new THREE.PointsMaterial({
    color: 0xaaaaaa,
    size: 0.2,
    transparent: true,
  });
  rain = new THREE.Points(rainGeo, rainMaterial);
  scene.add(rain);

  MeshWater.rotation.x = -Math.PI / 2;
  MeshWater.position.set(0, 0, 0);
  MeshWater.name = 'Water';
  MeshWater.receiveShadow = true;
  MeshWater.castShadow = false;
  all_obj4.add(MeshWater);
  // MeshWater.rotation.x = - Math.PI / 2;
  // MeshWater.position.set(0, -503+500, 0)
  // MeshWater.name = "Water";
  // MeshWater.receiveShadow = true;
  // MeshWater.castShadow = false;
  // all_obj4.add(MeshWater);

  // let geometryGround = new THREE.CircleBufferGeometry(5000, 100, 100);
  // geometryGround.rotateX(Math.PI / 2);
  // //geometryGround.translate(0, 0, 0);
  // let texture = THREE.ImageUtils.loadTexture("texture/pattern8.png");
  // texture.wrapS = THREE.RepeatWrapping;
  // texture.wrapT = THREE.RepeatWrapping;
  // texture.repeat.set(500, 500);
  // let materialGround = new THREE.MeshStandardMaterial({
  //   map: texture,
  //   side:THREE.DoubleSide
  // });
  // let MeshGround = new THREE.Mesh(geometryGround, materialGround);
  // MeshGround.position.set(0, -510+500, 0)
  // MeshGround.name = "Ground";
  // MeshGround.receiveShadow = true;
  // MeshGround.castShadow = false;
  // all_obj4.add(MeshGround);

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

  scene.add(new THREE.AmbientLight(0x888888));
  // const directionalLight = new THREE.RectAreaLight( 0x777733, 2,1000,1000 );
  // directionalLight.position.set( 0, 500, 0 );
  // directionalLight.rotation.x=-Math.PI/2;
  // scene.add( directionalLight );

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
            (100 * ufo_scale) / 10,
            0.75,
          );
          light_for_ufo.penumbra = 0.1;
          light_for_ufo.castShadow = true;
          light_for_ufo.shadow.mapSize.width = 512;
          light_for_ufo.shadow.mapSize.height = 512;
          light_for_ufo.shadow.camera.far = (100 * ufo_scale) / 10;
          light_for_ufo.shadow.camera.near = (0.1 * ufo_scale) / 10;
          light_for_ufo.shadow.radius = 3;
          // light_for_ufo.shadowBias = -0.001;

          light_for_ufo.position.set(0, 0.3, 0);

          const light_for_ufo1 = new THREE.PointLight(
            0xffffee,
            1.5,
            (30 * ufo_scale) / 10,
            0.95,
          );
          light_for_ufo1.penumbra = 0.1;
          light_for_ufo1.castShadow = true;
          light_for_ufo1.shadow.mapSize.width = 512;
          light_for_ufo1.shadow.mapSize.height = 512;
          light_for_ufo1.shadow.camera.far = (30 * ufo_scale) / 10;
          light_for_ufo1.shadow.camera.near = (0.1 * ufo_scale) / 10;
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

  // const village1 = terrain_loader("obj/terrain/terrain4", 2);
  // village1.position.set(0, -50, 0);
  // village1.name = "Village1";
  // village1.rotation.x = -Math.PI / 2;
  //if (add_base) all_obj2.add(village1);

  // const gui = new GUI()
  // const cubeFolder = gui.addFolder("ball_light")
  // cubeFolder.add(moon.position, "x", 0, 1000, 0.05)
  // cubeFolder.add(moon.position, "y", 0, 32, 0.05)
  // cubeFolder.add(moon.position, "z",0, 1000, 0.05)

  // cubeFolder.open()
  const b = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), sky_plane);
  b.rotation.x = Math.PI / 2;
  b.position.set(0, 380, 0);
  if (add_base) all_obj2.add(b);
  all_obj2.scale.set(0.6, 0.6, 0.6);
  all_obj.add(all_obj1);
  all_obj.add(all_obj2);
  all_obj.add(all_obj3);
  all_obj.add(all_obj4);
  scene.add(all_obj);
}
init();

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
    ) - 300;
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
    0.15 * ufo_scale,
    Math.min(210, cameraPositionVec.y),
  );
  if (cameraPositionVec.y > 180) {
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
  // if (hit_detect(count)) {
  //   hit_frame = 500;
  //   chasingFrame = 0;
  // }
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
  if (fast) maxSpeed = 0.05 * fpsScale;
  else maxSpeed = Math.max(maxSpeed - 0.003 * fpsScale, 0.03 * fpsScale);

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
      ) - 300;
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
  toggleAimingCursor(esc);

  const delta = clock.getDelta();
  requestAnimationFrame(animate);
  if (isLoadFinished(loadedItemCount, totalLoadItems)) hide_loading();
  else return;
  MeshWater.material.uniforms['time'].value += 1.0 / 60.0;
  currentTime += scene.timeRate * delta;
  frameAccumulator += delta;
  if (frameAccumulator > frameInterval) {
    //stats.update();

    for (let i = 0; i < particles.length; i++) {
      particle = particles[i];
      const d = star_d[i];
      const ds = star_d_speed[i];
      particle.position.x += (d.x * Math.cos(ds.x * count * 10)) / 2;
      particle.position.y += (d.y * Math.cos(ds.y * count * 10)) / 200;
      particle.position.z += (d.z * Math.cos(ds.z * count * 10)) / 2;
    }

    const positions = rainGeo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      if (
        ufo.position.distanceTo(
          vec.clone().set(positions[i], positions[i + 1], positions[i + 2]),
        ) > 50
      ) {
        velocity[Math.round(i / 3)] -= 0.02 + Math.random() * 0.02;
        positions[i + 1] += velocity[Math.round(i / 3)];
        if (positions[i + 1] < 0) {
          positions[i + 1] = 350;
          velocity[Math.round(i / 3)] = 0;
        }
      } else {
        positions[i + 1] = -10;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
    count += 0.0005 * fpsScale;

    operation_method_1(delta, count);

    //all_obj4.children[1].position.y=-2.85+0.5*Math.sin(count*2)

    if (currentTime < 0) {
      currentTime = 0;
    }

    scene.render(currentTime);
    renderer.render(scene, camera);

    frameAccumulator = frameAccumulator % frameInterval;
  }
}

animate();
const handleResize = createResizeRendererHandler(renderer, camera, scene);
window.addEventListener('resize', handleResize);
