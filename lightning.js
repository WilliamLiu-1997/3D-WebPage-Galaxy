import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { LightningStorm } from './JS/vendor/objects/LightningStorm.js';
import {
  createFrameConfig,
  isLoadFinished,
  toggleAimingCursor,
  createResizeRendererHandler,
  createProgressHandler,
} from './JS/shared/scene-common.js';
import { initSharedUfo } from './JS/shared/ufo-factory.js';

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
  star_dx,
  star_dy,
  star_dz,
  star_dsx,
  star_dsy,
  star_dsz,
  star_s_speed,
  count = 0;
const CLOUD_GROUP_SIZE = 10;
let cloudGroupCount = 0;
let cloudGroupOrder;

let rain, rainGeo, rainGroupOrder;
const RAIN_TOTAL_DROPS = 100000;
const RAIN_DROP_GROUP_SIZE = 100;
const rainCount = RAIN_TOTAL_DROPS;
const RAIN_GROUP_COUNT = Math.ceil(rainCount / RAIN_DROP_GROUP_SIZE);
const RAIN_RESET_Y = 420;
const RAIN_AREA_HALF = 50;
const RAIN_WIND_X = 0.015;
const RAIN_WIND_Z = 0.01;
const RAIN_UFO_CLEAR_RADIUS = 5;
const RAIN_UFO_CLEAR_RADIUS_SQ = RAIN_UFO_CLEAR_RADIUS * RAIN_UFO_CLEAR_RADIUS;
const RAIN_SPEED_MIN = 0.2;
const RAIN_SPEED_MAX = 4.0;
const RAIN_SPEED_DEFAULT = 1;
let rainSpeedMultiplier = RAIN_SPEED_DEFAULT;
let rainCenterX = cameraPositionVec.x;
let rainCenterZ = cameraPositionVec.z;

let ringRipples, ringGeo, ringSurfaceRipples;
let ringLife,
  ringSpeed,
  ringScaleStart,
  ringScaleMax,
  ringDriftX,
  ringDriftZ,
  ringX,
  ringZ,
  ringPointSizes,
  ringPointAlphas,
  ringPositions,
  ringGroupOrder;
let splashDrops, splashDropsGeo;
let splashDropLife,
  splashDropSpeed,
  splashDropPeak,
  splashDropDriftX,
  splashDropDriftZ,
  splashDropPhase,
  splashDropAlphas,
  splashDropGroupOrder;
let splashDropCenterX = cameraPositionVec.x;
let splashDropCenterZ = cameraPositionVec.z;
const WATER_SURFACE_EFFECT_RADIUS = 400;
const RING_TOTAL = 80000;
const RING_GROUP_SIZE = 100;
const RING_GROUP_COUNT = Math.ceil(RING_TOTAL / RING_GROUP_SIZE);
const RING_BASE_Y = 0;
const RING_SURFACE_BASE_Y = 0.01;
const RING_SCALE_START_MIN = 0;
const RING_SCALE_START_MAX = 0;
const RING_SCALE_END_MIN = 1;
const RING_SCALE_END_MAX = 1;
const RING_SPEED_MIN = 0.025;
const RING_SPEED_MAX = 0.05;
const RING_DRIFT_MAX = 0.0015;
const RING_OPACITY_BASE = 0.8;
const RING_OPACITY_VARIANCE = 0.2;
const RING_FADE_START = 300;
const RING_FADE_END = 400;
const RING_FADE_MIN_ALPHA = 0;
const SPLASH_TOTAL_DROPS = 80000;
const SPLASH_DROP_GROUP_SIZE = 100;
const SPLASH_DROP_GROUP_COUNT = Math.ceil(
  SPLASH_TOTAL_DROPS / SPLASH_DROP_GROUP_SIZE,
);
const SPLASH_BASE_Y = 0.05;
const SPLASH_PEAK_MIN = 0.2;
const SPLASH_PEAK_MAX = 1.0;
const SPLASH_SPEED_MIN = 0.012;
const SPLASH_SPEED_MAX = 0.045;
const SPLASH_DRIFT_MAX = 0.035;
const SPLASH_RIPPLE_AMPLITUDE = 0.06;
const SPLASH_RIPPLE_FREQUENCY = 11;
const SPLASH_FADE_START = 300;
const SPLASH_FADE_END = 400;
const SPLASH_FADE_MIN_ALPHA = 0;
const ringMatrixDummy = new THREE.Object3D();
const ringColorDummy = new THREE.Color();

function setRandomWaterPositionAroundCenterInArrays(
  index,
  xArray,
  zArray,
  centerX,
  centerZ,
) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * WATER_SURFACE_EFFECT_RADIUS;
  xArray[index] = centerX + Math.cos(angle) * radius;
  zArray[index] = centerZ + Math.sin(angle) * radius;
}

function setRandomWaterPositionAroundCenterInBuffer(
  index,
  positions,
  centerX,
  centerZ,
) {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.sqrt(Math.random()) * WATER_SURFACE_EFFECT_RADIUS;
  const idx = index * 3;
  positions[idx] = centerX + Math.cos(angle) * radius;
  positions[idx + 2] = centerZ + Math.sin(angle) * radius;
}

function computeSplashDistanceAlpha(x, z, centerX, centerZ) {
  const dx = x - centerX;
  const dz = z - centerZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance <= SPLASH_FADE_START) return 1;
  if (distance >= SPLASH_FADE_END) return SPLASH_FADE_MIN_ALPHA;
  const fadeRange = Math.max(1e-6, SPLASH_FADE_END - SPLASH_FADE_START);
  const t = (distance - SPLASH_FADE_START) / fadeRange;
  return 1 - t * (1 - SPLASH_FADE_MIN_ALPHA);
}

function computeRingDistanceAlpha(x, z, centerX, centerZ) {
  const dx = x - centerX;
  const dz = z - centerZ;
  const distance = Math.sqrt(dx * dx + dz * dz);
  if (distance <= RING_FADE_START) return 1;
  if (distance >= RING_FADE_END) return RING_FADE_MIN_ALPHA;
  const fadeRange = Math.max(1e-6, RING_FADE_END - RING_FADE_START);
  const t = (distance - RING_FADE_START) / fadeRange;
  return 1 - t * (1 - RING_FADE_MIN_ALPHA);
}

function resetRingRipple(index, centerX, centerZ, randomLife = false) {
  setRandomWaterPositionAroundCenterInArrays(
    index,
    ringX,
    ringZ,
    centerX,
    centerZ,
  );
  ringLife[index] = randomLife ? Math.random() : 0;
  ringSpeed[index] =
    RING_SPEED_MIN + Math.random() * (RING_SPEED_MAX - RING_SPEED_MIN);
  ringScaleStart[index] =
    RING_SCALE_START_MIN +
    Math.random() * (RING_SCALE_START_MAX - RING_SCALE_START_MIN);
  ringScaleMax[index] =
    RING_SCALE_END_MIN +
    Math.random() * (RING_SCALE_END_MAX - RING_SCALE_END_MIN);
  ringDriftX[index] = (Math.random() * 2 - 1) * RING_DRIFT_MAX;
  ringDriftZ[index] = (Math.random() * 2 - 1) * RING_DRIFT_MAX;
}

function resetSplashDrop(
  index,
  positions,
  centerX,
  centerZ,
  randomLife = false,
) {
  setRandomWaterPositionAroundCenterInBuffer(
    index,
    positions,
    centerX,
    centerZ,
  );
  splashDropLife[index] = randomLife ? Math.random() : 0;
  splashDropSpeed[index] =
    SPLASH_SPEED_MIN + Math.random() * (SPLASH_SPEED_MAX - SPLASH_SPEED_MIN);
  splashDropPeak[index] =
    SPLASH_PEAK_MIN + Math.random() * (SPLASH_PEAK_MAX - SPLASH_PEAK_MIN);
  splashDropDriftX[index] = (Math.random() * 2 - 1) * SPLASH_DRIFT_MAX;
  splashDropDriftZ[index] = (Math.random() * 2 - 1) * SPLASH_DRIFT_MAX;
  splashDropPhase[index] = Math.random() * Math.PI * 2;

  const idx = index * 3;
  const t = splashDropLife[index];
  const arc = 4 * t * (1 - t);
  const ripple =
    SPLASH_RIPPLE_AMPLITUDE *
    Math.sin(splashDropPhase[index] + t * SPLASH_RIPPLE_FREQUENCY);
  positions[idx + 1] = SPLASH_BASE_Y + splashDropPeak[index] * arc + ripple;
  if (positions[idx + 1] < SPLASH_BASE_Y) {
    positions[idx + 1] = SPLASH_BASE_Y;
  }
}

function applyRingRippleInstance(index, px, pz, scale, opacity) {
  const idx = index * 3;
  ringPositions[idx] = px;
  ringPositions[idx + 1] = RING_BASE_Y;
  ringPositions[idx + 2] = pz;
  ringPointSizes[index] = scale;
  ringPointAlphas[index] = opacity;

  ringMatrixDummy.position.set(px, RING_SURFACE_BASE_Y, pz);
  ringMatrixDummy.scale.set(scale, scale, scale);
  ringMatrixDummy.rotation.set(-Math.PI / 2, 0, 0);
  ringMatrixDummy.updateMatrix();
  ringSurfaceRipples.setMatrixAt(index, ringMatrixDummy.matrix);

  ringColorDummy.setRGB(opacity, opacity, opacity);
  ringSurfaceRipples.setColorAt(index, ringColorDummy);
}

function setRainSpeed(multiplier) {
  const clamped = Math.max(
    RAIN_SPEED_MIN,
    Math.min(RAIN_SPEED_MAX, Number(multiplier)),
  );
  if (!Number.isFinite(clamped)) return rainSpeedMultiplier;
  rainSpeedMultiplier = clamped;

  return rainSpeedMultiplier;
}

function isFollowTargetObject(object) {
  if (!object) return false;
  if (object.userData && object.userData.ignoreClickFollow) return false;
  if (object.type === 'Sprite' || object.type === 'Points') return false;
  if (object.name === 'ring' || object.name === 'Sky') return false;
  return true;
}

function buildRandomGroupOrder(count) {
  const order = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    order[i] = i;
  }
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = order[i];
    order[i] = order[j];
    order[j] = temp;
  }
  return order;
}

if (typeof window !== 'undefined') {
  window.setRainSpeed = setRainSpeed;
  window.getRainSpeed = function () {
    return rainSpeedMultiplier;
  };
}

function createRainDropTexture() {
  const width = 32;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(
    width * 0.5,
    0,
    width * 0.5,
    height,
  );
  gradient.addColorStop(0, 'rgba(230,245,255,0)');
  gradient.addColorStop(0.2, 'rgba(230,245,255,0.9)');
  gradient.addColorStop(0.8, 'rgba(230,245,255,1)');
  gradient.addColorStop(1, 'rgba(230,245,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(width * 0.4, 0, width * 0.1, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapNearestFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createSplashDropTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    1,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, 'rgba(240,248,255,1.0)');
  gradient.addColorStop(0.45, 'rgba(220,235,255,0.85)');
  gradient.addColorStop(1, 'rgba(220,235,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createSplashRingTexture() {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size * 0.5;

  ctx.clearRect(0, 0, size, size);
  const ring = ctx.createRadialGradient(
    center,
    center,
    size * 0.01,
    center,
    center,
    size * 0.5,
  );
  ring.addColorStop(0.0, 'rgba(220,240,255,0)');
  ring.addColorStop(0.64, 'rgba(220,240,255,0)');
  ring.addColorStop(0.74, 'rgba(245,252,255,0.92)');
  ring.addColorStop(0.88, 'rgba(190,220,255,0.35)');
  ring.addColorStop(1.0, 'rgba(180,215,255,0)');
  ctx.fillStyle = ring;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

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

const ufolight = textureLoader.load('img/ufo_light1.png');

const starball = textureLoader.load('img/ball.png');
const cloudMap = textureLoader.load('img/cloud55.png');
const cloudMap1 = textureLoader.load('img/cloud11.png');
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
    waterNormals: textureLoader.load(
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
        star_dx[i] = Math.random() - 0.5;
        star_dy[i] = Math.random() - 0.5;
        star_dz[i] = Math.random() - 0.5;
        star_dsx[i] = Math.random() - 0.5;
        star_dsy[i] = Math.random() - 0.5;
        star_dsz[i] = Math.random() - 0.5;
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
        star_dx[i] = Math.random() - 0.5;
        star_dy[i] = Math.random() - 0.5;
        star_dz[i] = Math.random() - 0.5;
        star_dsx[i] = Math.random() - 0.5;
        star_dsy[i] = Math.random() - 0.5;
        star_dsz[i] = Math.random() - 0.5;
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

      particle.userData.ignoreClickFollow = true;
      scene.add(particle);
    }
  }
  cloudGroupCount = Math.ceil(particles.length / CLOUD_GROUP_SIZE);
  cloudGroupOrder = buildRandomGroupOrder(particles.length);

  rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 3);
  rainGroupOrder = buildRandomGroupOrder(rainCount);
  for (let groupIndex = 0; groupIndex < RAIN_GROUP_COUNT; groupIndex++) {
    const groupStart = groupIndex * RAIN_DROP_GROUP_SIZE;
    if (groupStart >= rainCount) break;
    const leaderDropIndex = rainGroupOrder[groupStart];
    const leaderIdx = leaderDropIndex * 3;

    const leaderX = rainCenterX + (Math.random() * 2 - 1) * RAIN_AREA_HALF;
    const leaderY = Math.random() * RAIN_RESET_Y;
    const leaderZ = rainCenterZ + (Math.random() * 2 - 1) * RAIN_AREA_HALF;

    rainPositions[leaderIdx] = leaderX;
    rainPositions[leaderIdx + 1] = leaderY;
    rainPositions[leaderIdx + 2] = leaderZ;

    for (
      let member = 1;
      member < RAIN_DROP_GROUP_SIZE && groupStart + member < rainCount;
      member++
    ) {
      const dropIndex = rainGroupOrder[groupStart + member];
      const idx = dropIndex * 3;
      const memberX = rainCenterX + (Math.random() * 2 - 1) * RAIN_AREA_HALF;
      const memberY = Math.random() * RAIN_RESET_Y;
      const memberZ = rainCenterZ + (Math.random() * 2 - 1) * RAIN_AREA_HALF;
      rainPositions[idx] = memberX;
      rainPositions[idx + 1] = memberY;
      rainPositions[idx + 2] = memberZ;
    }
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.PointsMaterial({
    color: 0xe8f6ff,
    size: 0.72,
    sizeAttenuation: true,
    map: createRainDropTexture(),
    transparent: true,
    opacity: 0.95,
    alphaTest: 0.01,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  rain = new THREE.Points(rainGeo, rainMaterial);
  rain.frustumCulled = false;
  rain.userData.ignoreClickFollow = true;
  scene.add(rain);

  MeshWater.rotation.x = -Math.PI / 2;
  MeshWater.position.set(0, 0, 0);
  MeshWater.name = 'Water';
  MeshWater.receiveShadow = true;
  MeshWater.castShadow = false;
  all_obj4.add(MeshWater);

  ringGeo = new THREE.BufferGeometry();
  ringPositions = new Float32Array(RING_TOTAL * 3);
  ringPointSizes = new Float32Array(RING_TOTAL);
  ringPointAlphas = new Float32Array(RING_TOTAL);
  const ringSurfaceGeometry = new THREE.PlaneGeometry(0.8, 0.8);
  const ringSurfaceColors = new Float32Array(
    ringSurfaceGeometry.attributes.position.count * 3,
  );
  ringSurfaceColors.fill(1);
  ringSurfaceGeometry.setAttribute(
    'color',
    new THREE.BufferAttribute(ringSurfaceColors, 3),
  );
  const ringSurfaceMaterial = new THREE.MeshBasicMaterial({
    color: 0xf3fbff,
    map: createSplashRingTexture(),
    transparent: true,
    opacity: 1.0,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    fog: false,
    toneMapped: false,
    vertexColors: true,
  });
  ringSurfaceRipples = new THREE.InstancedMesh(
    ringSurfaceGeometry,
    ringSurfaceMaterial,
    RING_TOTAL,
  );
  ringSurfaceRipples.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ringLife = new Float32Array(RING_TOTAL);
  ringSpeed = new Float32Array(RING_TOTAL);
  ringScaleStart = new Float32Array(RING_TOTAL);
  ringScaleMax = new Float32Array(RING_TOTAL);
  ringDriftX = new Float32Array(RING_TOTAL);
  ringDriftZ = new Float32Array(RING_TOTAL);
  ringX = new Float32Array(RING_TOTAL);
  ringZ = new Float32Array(RING_TOTAL);
  ringGroupOrder = buildRandomGroupOrder(RING_TOTAL);
  for (let groupIndex = 0; groupIndex < RING_GROUP_COUNT; groupIndex++) {
    const groupStart = groupIndex * RING_GROUP_SIZE;
    if (groupStart >= RING_TOTAL) break;
    const leaderRingIndex = ringGroupOrder[groupStart];
    resetRingRipple(
      leaderRingIndex,
      cameraPositionVec.x,
      cameraPositionVec.z,
      true,
    );

    const leaderLife = ringLife[leaderRingIndex];
    const leaderScale =
      ringScaleStart[leaderRingIndex] +
      (ringScaleMax[leaderRingIndex] - ringScaleStart[leaderRingIndex]) *
        leaderLife;
    const leaderDistanceAlpha = computeRingDistanceAlpha(
      ringX[leaderRingIndex],
      ringZ[leaderRingIndex],
      cameraPositionVec.x,
      cameraPositionVec.z,
    );
    const leaderOpacity =
      (RING_OPACITY_BASE +
        RING_OPACITY_VARIANCE * Math.sin(leaderLife * Math.PI)) *
      leaderDistanceAlpha;
    applyRingRippleInstance(
      leaderRingIndex,
      ringX[leaderRingIndex],
      ringZ[leaderRingIndex],
      leaderScale,
      leaderOpacity,
    );

    for (
      let member = 1;
      member < RING_GROUP_SIZE && groupStart + member < RING_TOTAL;
      member++
    ) {
      const memberRingIndex = ringGroupOrder[groupStart + member];
      setRandomWaterPositionAroundCenterInArrays(
        memberRingIndex,
        ringX,
        ringZ,
        cameraPositionVec.x,
        cameraPositionVec.z,
      );
      applyRingRippleInstance(
        memberRingIndex,
        ringX[memberRingIndex],
        ringZ[memberRingIndex],
        leaderScale,
        leaderOpacity,
      );
    }
  }
  const ringPositionAttribute = new THREE.BufferAttribute(ringPositions, 3);
  ringPositionAttribute.setUsage(THREE.DynamicDrawUsage);
  ringGeo.setAttribute('position', ringPositionAttribute);
  const ringSizeAttribute = new THREE.BufferAttribute(ringPointSizes, 1);
  ringSizeAttribute.setUsage(THREE.DynamicDrawUsage);
  ringGeo.setAttribute('pointSize', ringSizeAttribute);
  const ringAlphaAttribute = new THREE.BufferAttribute(ringPointAlphas, 1);
  ringAlphaAttribute.setUsage(THREE.DynamicDrawUsage);
  ringGeo.setAttribute('pointAlpha', ringAlphaAttribute);
  const ringMaterial = new THREE.PointsMaterial({
    color: 0xf3fbff,
    size: 2,
    sizeAttenuation: true,
    map: createSplashRingTexture(),
    transparent: true,
    opacity: 1.0,
    alphaTest: 0.01,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  ringMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        'uniform float size;',
        'uniform float size;\nattribute float pointSize;\nattribute float pointAlpha;\nvarying float vPointAlpha;',
      )
      .replace(
        'gl_PointSize = size;',
        'gl_PointSize = max(1.0, size * pointSize);\nvPointAlpha = pointAlpha;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vPointAlpha;',
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( diffuse, opacity * vPointAlpha );',
      );
  };
  ringMaterial.needsUpdate = true;
  ringRipples = new THREE.Points(ringGeo, ringMaterial);
  ringRipples.frustumCulled = false;
  ringRipples.userData.ignoreClickFollow = true;
  ringSurfaceRipples.instanceMatrix.needsUpdate = true;
  if (ringSurfaceRipples.instanceColor) {
    ringSurfaceRipples.instanceColor.needsUpdate = true;
  }
  ringSurfaceRipples.frustumCulled = false;
  ringSurfaceRipples.userData.ignoreClickFollow = true;
  all_obj4.add(ringRipples);
  all_obj4.add(ringSurfaceRipples);

  splashDropsGeo = new THREE.BufferGeometry();
  const splashPositions = new Float32Array(SPLASH_TOTAL_DROPS * 3);
  splashDropLife = new Float32Array(SPLASH_TOTAL_DROPS);
  splashDropSpeed = new Float32Array(SPLASH_TOTAL_DROPS);
  splashDropPeak = new Float32Array(SPLASH_TOTAL_DROPS);
  splashDropDriftX = new Float32Array(SPLASH_TOTAL_DROPS);
  splashDropDriftZ = new Float32Array(SPLASH_TOTAL_DROPS);
  splashDropPhase = new Float32Array(SPLASH_TOTAL_DROPS);
  splashDropAlphas = new Float32Array(SPLASH_TOTAL_DROPS);
  splashDropGroupOrder = buildRandomGroupOrder(SPLASH_TOTAL_DROPS);
  for (let groupIndex = 0; groupIndex < SPLASH_DROP_GROUP_COUNT; groupIndex++) {
    const groupStart = groupIndex * SPLASH_DROP_GROUP_SIZE;
    if (groupStart >= SPLASH_TOTAL_DROPS) break;
    const leaderDropIndex = splashDropGroupOrder[groupStart];
    const leaderIdx = leaderDropIndex * 3;
    resetSplashDrop(
      leaderDropIndex,
      splashPositions,
      splashDropCenterX,
      splashDropCenterZ,
      true,
    );
    splashDropAlphas[leaderDropIndex] = computeSplashDistanceAlpha(
      splashPositions[leaderIdx],
      splashPositions[leaderIdx + 2],
      splashDropCenterX,
      splashDropCenterZ,
    );

    for (
      let member = 1;
      member < SPLASH_DROP_GROUP_SIZE &&
      groupStart + member < SPLASH_TOTAL_DROPS;
      member++
    ) {
      const memberDropIndex = splashDropGroupOrder[groupStart + member];
      const memberIdx = memberDropIndex * 3;
      setRandomWaterPositionAroundCenterInBuffer(
        memberDropIndex,
        splashPositions,
        splashDropCenterX,
        splashDropCenterZ,
      );
      splashPositions[memberIdx + 1] =
        SPLASH_BASE_Y + Math.random() * SPLASH_PEAK_MAX * 0.8;
      splashDropAlphas[memberDropIndex] = computeSplashDistanceAlpha(
        splashPositions[memberIdx],
        splashPositions[memberIdx + 2],
        splashDropCenterX,
        splashDropCenterZ,
      );
    }
  }
  const splashPositionAttribute = new THREE.BufferAttribute(splashPositions, 3);
  splashPositionAttribute.setUsage(THREE.DynamicDrawUsage);
  splashDropsGeo.setAttribute('position', splashPositionAttribute);
  const splashAlphaAttribute = new THREE.BufferAttribute(splashDropAlphas, 1);
  splashAlphaAttribute.setUsage(THREE.DynamicDrawUsage);
  splashDropsGeo.setAttribute('pointAlpha', splashAlphaAttribute);
  const splashDropMaterial = new THREE.PointsMaterial({
    color: 0xeef7ff,
    size: 0.36,
    sizeAttenuation: true,
    map: createSplashDropTexture(),
    transparent: true,
    opacity: 0.9,
    alphaTest: 0.01,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  splashDropMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        'uniform float size;',
        'uniform float size;\nattribute float pointAlpha;\nvarying float vPointAlpha;',
      )
      .replace(
        'gl_PointSize = size;',
        'gl_PointSize = size;\nvPointAlpha = pointAlpha;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vPointAlpha;',
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( diffuse, opacity * vPointAlpha );',
      );
  };
  splashDropMaterial.needsUpdate = true;
  splashDrops = new THREE.Points(splashDropsGeo, splashDropMaterial);
  splashDrops.frustumCulled = false;
  splashDrops.userData.ignoreClickFollow = true;
  all_obj4.add(splashDrops);

  // MeshWater.rotation.x = - Math.PI / 2;
  // MeshWater.position.set(0, -503+500, 0)
  // MeshWater.name = "Water";
  // MeshWater.receiveShadow = true;
  // MeshWater.castShadow = false;
  // all_obj4.add(MeshWater);

  // let geometryGround = new THREE.CircleBufferGeometry(5000, 100, 100);
  // geometryGround.rotateX(Math.PI / 2);
  // //geometryGround.translate(0, 0, 0);
  // let texture = textureLoader.load("texture/pattern8.png");
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
      distanceDivisor: 10,
      decay: 0.75,
      castShadow: true,
      shadowMapSize: 512,
      shadowRadius: 3,
    },
    secondaryLight: {
      intensity: 1.5,
      distanceDivisor: 10,
      decay: 0.95,
      castShadow: true,
      shadowMapSize: 512,
      shadowRadius: 3,
    },
  });

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

    const cloudCount = count * 10;
    for (let groupIndex = 0; groupIndex < cloudGroupCount; groupIndex++) {
      const groupStart = groupIndex * CLOUD_GROUP_SIZE;
      if (groupStart >= particles.length) break;
      const leaderIndex = cloudGroupOrder[groupStart];

      const leaderCloud = particles[leaderIndex];
      const oldX = leaderCloud.position.x;
      const oldY = leaderCloud.position.y;
      const oldZ = leaderCloud.position.z;

      leaderCloud.position.x +=
        (star_dx[leaderIndex] * Math.cos(star_dsx[leaderIndex] * cloudCount)) /
        2;
      leaderCloud.position.y +=
        (star_dy[leaderIndex] * Math.cos(star_dsy[leaderIndex] * cloudCount)) /
        200;
      leaderCloud.position.z +=
        (star_dz[leaderIndex] * Math.cos(star_dsz[leaderIndex] * cloudCount)) /
        2;

      const deltaX = leaderCloud.position.x - oldX;
      const deltaY = leaderCloud.position.y - oldY;
      const deltaZ = leaderCloud.position.z - oldZ;

      for (
        let member = 1;
        member < CLOUD_GROUP_SIZE && groupStart + member < particles.length;
        member++
      ) {
        const memberIndex = cloudGroupOrder[groupStart + member];
        const memberCloud = particles[memberIndex];
        memberCloud.position.x += deltaX;
        memberCloud.position.y += deltaY;
        memberCloud.position.z += deltaZ;
      }
    }
    count += 0.0005 * fpsScale;

    // Update UFO transform first.
    operation_method_1(delta, count);

    const positions = rainGeo.attributes.position.array;
    const centerX = camera.position.x;
    const centerZ = camera.position.z;
    const ufoX = ufo.position.x;
    const ufoZ = ufo.position.z;
    const centerDx = centerX - rainCenterX;
    const centerDz = centerZ - rainCenterZ;
    for (let groupIndex = 0; groupIndex < RAIN_GROUP_COUNT; groupIndex++) {
      const groupStart = groupIndex * RAIN_DROP_GROUP_SIZE;
      if (groupStart >= rainCount) break;
      const leaderDropIndex = rainGroupOrder[groupStart];
      const leaderIdx = leaderDropIndex * 3;
      const oldLeaderX = positions[leaderIdx];
      const oldLeaderY = positions[leaderIdx + 1];
      const oldLeaderZ = positions[leaderIdx + 2];

      positions[leaderIdx] += centerDx;
      positions[leaderIdx + 2] += centerDz;
      positions[leaderIdx + 1] -= rainSpeedMultiplier;
      positions[leaderIdx] += RAIN_WIND_X * rainSpeedMultiplier;
      positions[leaderIdx + 2] += RAIN_WIND_Z * rainSpeedMultiplier;

      const duX = positions[leaderIdx] - ufoX;
      const duZ = positions[leaderIdx + 2] - ufoZ;
      const insideUfoClearZone =
        duX * duX + duZ * duZ < RAIN_UFO_CLEAR_RADIUS_SQ;

      if (
        insideUfoClearZone ||
        positions[leaderIdx + 1] < 0 ||
        positions[leaderIdx] < centerX - RAIN_AREA_HALF ||
        positions[leaderIdx] > centerX + RAIN_AREA_HALF ||
        positions[leaderIdx + 2] < centerZ - RAIN_AREA_HALF ||
        positions[leaderIdx + 2] > centerZ + RAIN_AREA_HALF
      ) {
        if (insideUfoClearZone) {
          const angle = Math.random() * Math.PI * 2;
          const radius =
            RAIN_UFO_CLEAR_RADIUS +
            Math.random() * (RAIN_AREA_HALF - RAIN_UFO_CLEAR_RADIUS);
          positions[leaderIdx] = ufoX + Math.cos(angle) * radius;
          positions[leaderIdx + 2] = ufoZ + Math.sin(angle) * radius;
        } else {
          positions[leaderIdx] =
            centerX + (Math.random() * 2 - 1) * RAIN_AREA_HALF;
          positions[leaderIdx + 2] =
            centerZ + (Math.random() * 2 - 1) * RAIN_AREA_HALF;
        }
        positions[leaderIdx + 1] = RAIN_RESET_Y;
      }

      const deltaX = positions[leaderIdx] - oldLeaderX;
      const deltaY = positions[leaderIdx + 1] - oldLeaderY;
      const deltaZ = positions[leaderIdx + 2] - oldLeaderZ;

      for (
        let member = 1;
        member < RAIN_DROP_GROUP_SIZE && groupStart + member < rainCount;
        member++
      ) {
        const memberDropIndex = rainGroupOrder[groupStart + member];
        const memberIdx = memberDropIndex * 3;
        positions[memberIdx] += deltaX;
        positions[memberIdx + 1] += deltaY;
        positions[memberIdx + 2] += deltaZ;
      }
    }
    rainCenterX = centerX;
    rainCenterZ = centerZ;
    rainGeo.attributes.position.needsUpdate = true;

    for (let groupIndex = 0; groupIndex < RING_GROUP_COUNT; groupIndex++) {
      const groupStart = groupIndex * RING_GROUP_SIZE;
      if (groupStart >= RING_TOTAL) break;
      const leaderRingIndex = ringGroupOrder[groupStart];
      const oldLeaderX = ringX[leaderRingIndex];
      const oldLeaderZ = ringZ[leaderRingIndex];

      ringX[leaderRingIndex] += ringDriftX[leaderRingIndex] * fpsScale;
      ringZ[leaderRingIndex] += ringDriftZ[leaderRingIndex] * fpsScale;
      ringLife[leaderRingIndex] += ringSpeed[leaderRingIndex] * fpsScale;

      if (ringLife[leaderRingIndex] >= 1) {
        resetRingRipple(leaderRingIndex, centerX, centerZ);
      }

      const leaderLife = ringLife[leaderRingIndex];
      const leaderScale =
        ringScaleStart[leaderRingIndex] +
        (ringScaleMax[leaderRingIndex] - ringScaleStart[leaderRingIndex]) *
          leaderLife;
      const leaderDistanceAlpha = computeRingDistanceAlpha(
        ringX[leaderRingIndex],
        ringZ[leaderRingIndex],
        centerX,
        centerZ,
      );
      const leaderOpacity =
        (RING_OPACITY_BASE +
          RING_OPACITY_VARIANCE * Math.sin(leaderLife * Math.PI)) *
        leaderDistanceAlpha;

      applyRingRippleInstance(
        leaderRingIndex,
        ringX[leaderRingIndex],
        ringZ[leaderRingIndex],
        leaderScale,
        leaderOpacity,
      );
      const deltaX = ringX[leaderRingIndex] - oldLeaderX;
      const deltaZ = ringZ[leaderRingIndex] - oldLeaderZ;

      for (
        let member = 1;
        member < RING_GROUP_SIZE && groupStart + member < RING_TOTAL;
        member++
      ) {
        const memberRingIndex = ringGroupOrder[groupStart + member];
        ringX[memberRingIndex] += deltaX;
        ringZ[memberRingIndex] += deltaZ;

        applyRingRippleInstance(
          memberRingIndex,
          ringX[memberRingIndex],
          ringZ[memberRingIndex],
          leaderScale,
          leaderOpacity,
        );
      }
    }
    ringGeo.attributes.position.needsUpdate = true;
    ringGeo.attributes.pointSize.needsUpdate = true;
    ringGeo.attributes.pointAlpha.needsUpdate = true;
    ringSurfaceRipples.instanceMatrix.needsUpdate = true;
    if (ringSurfaceRipples.instanceColor) {
      ringSurfaceRipples.instanceColor.needsUpdate = true;
    }

    const splashPositions = splashDropsGeo.attributes.position.array;
    for (
      let groupIndex = 0;
      groupIndex < SPLASH_DROP_GROUP_COUNT;
      groupIndex++
    ) {
      const groupStart = groupIndex * SPLASH_DROP_GROUP_SIZE;
      if (groupStart >= SPLASH_TOTAL_DROPS) break;
      const leaderDropIndex = splashDropGroupOrder[groupStart];
      const leaderIdx = leaderDropIndex * 3;
      const oldLeaderX = splashPositions[leaderIdx];
      const oldLeaderY = splashPositions[leaderIdx + 1];
      const oldLeaderZ = splashPositions[leaderIdx + 2];

      splashPositions[leaderIdx] +=
        splashDropDriftX[leaderDropIndex] * fpsScale;
      splashPositions[leaderIdx + 2] +=
        splashDropDriftZ[leaderDropIndex] * fpsScale;
      splashDropLife[leaderDropIndex] +=
        splashDropSpeed[leaderDropIndex] * fpsScale;

      if (splashDropLife[leaderDropIndex] >= 1) {
        resetSplashDrop(
          leaderDropIndex,
          splashPositions,
          centerX,
          centerZ,
          false,
        );
      } else {
        const t = splashDropLife[leaderDropIndex];
        const arc = 4 * t * (1 - t);
        const ripple =
          SPLASH_RIPPLE_AMPLITUDE *
          Math.sin(
            splashDropPhase[leaderDropIndex] + t * SPLASH_RIPPLE_FREQUENCY,
          );
        splashPositions[leaderIdx + 1] =
          SPLASH_BASE_Y + splashDropPeak[leaderDropIndex] * arc + ripple;
        if (splashPositions[leaderIdx + 1] < SPLASH_BASE_Y) {
          splashPositions[leaderIdx + 1] = SPLASH_BASE_Y;
        }
      }
      splashDropAlphas[leaderDropIndex] = computeSplashDistanceAlpha(
        splashPositions[leaderIdx],
        splashPositions[leaderIdx + 2],
        centerX,
        centerZ,
      );
      const deltaX = splashPositions[leaderIdx] - oldLeaderX;
      const deltaY = splashPositions[leaderIdx + 1] - oldLeaderY;
      const deltaZ = splashPositions[leaderIdx + 2] - oldLeaderZ;

      for (
        let member = 1;
        member < SPLASH_DROP_GROUP_SIZE &&
        groupStart + member < SPLASH_TOTAL_DROPS;
        member++
      ) {
        const memberDropIndex = splashDropGroupOrder[groupStart + member];
        const memberIdx = memberDropIndex * 3;
        splashPositions[memberIdx] += deltaX;
        splashPositions[memberIdx + 1] += deltaY;
        splashPositions[memberIdx + 2] += deltaZ;

        splashDropAlphas[memberDropIndex] = computeSplashDistanceAlpha(
          splashPositions[memberIdx],
          splashPositions[memberIdx + 2],
          centerX,
          centerZ,
        );
      }
    }
    splashDropsGeo.attributes.position.needsUpdate = true;
    splashDropsGeo.attributes.pointAlpha.needsUpdate = true;

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
