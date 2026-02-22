import * as THREE from 'three';
import {
  createFrameConfig,
  isLoadFinished,
  toggleAimingCursor,
  createResizeRendererHandler,
  createProgressHandler,
  navigateWithFade,
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
function goAlienBaseWithFade() {
  navigateWithFade('alien_base.html');
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
} = createFrameConfig(60);
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
const METEOR_MAX_DISTANCE = 5000;
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

const SEPARATION = 100,
  AMOUNTX = 33,
  AMOUNTY = 11,
  AMOUNTZ = 33;
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
const STAR_FADE_START_DISTANCE = 1000;
const STAR_FADE_END_DISTANCE = 800;

let angle = 0;

// Mouse Move
let mouseP = { x: 0, y: 0 };
let up = 0;
let down = 0;
let left = 0;
let right = 0;

let maxSpeed = 1.2 * fpsScale;
const acc = 6 * fpsScale;
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

const isFollowTargetObject = createFollowTargetFilter({
  excludedNames: ['ring', 'Sky'],
  excludedNamePrefixes: ['ring'],
});

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
const noiseScale = 0.005;

// texture to additively blend with base image texture
const blendTexture = textureLoader.load('./texture/gstar-original.jpg');
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
const bumpScale = 2;
const noiseRepeat = 32;
const bumpRepeat = 8;

const isMobileDevice =
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '') ||
  navigator.maxTouchPoints > 1 ||
  window.matchMedia('(pointer: coarse)').matches;
let sunShaderUniforms = null;
const SUN_BASE_SIZE = 100;
const SUN_RADIUS = SUN_BASE_SIZE * 0.8;
const SUN_VERTEX_SHADER = `
  uniform sampler2D noiseTexture;
  uniform float noiseScale;

  uniform sampler2D bumpTexture;
  uniform float bumpSpeed;
  uniform float bumpScale;

  uniform float time;
  uniform float bumpRepeat;
  uniform float noiseRepeat;

  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec2 uvTimeShift = vUv + vec2(1.1, 1.9) * time * bumpSpeed;
    vec4 noiseGeneratorTimeShift = texture2D(
      noiseTexture,
      uvTimeShift * vec2(noiseRepeat, noiseRepeat)
    );
    vec2 uvNoiseTimeShift =
      vUv + noiseScale * vec2(noiseGeneratorTimeShift.r, noiseGeneratorTimeShift.g);
    // below, using uvTimeShift seems to result in more of a "rippling" effect
    // while uvNoiseTimeShift seems to result in more of a "shivering" effect
    vec4 bumpData = texture2D(
      bumpTexture,
      uvTimeShift * vec2(bumpRepeat, bumpRepeat)
    );

    // move the position along the normal
    // but displace the vertices at the poles by the same amount
    float displacement =
      (vUv.y > 0.999 || vUv.y < 0.001)
        ? bumpScale * (0.3 + 0.02 * sin(time))
        : bumpScale * bumpData.r;
    vec3 newPosition = position + normal * displacement;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const SUN_FRAGMENT_SHADER = `
  uniform sampler2D baseTexture;
  uniform float baseSpeed;
  uniform float repeatS;
  uniform float repeatT;

  uniform sampler2D noiseTexture;
  uniform float noiseScale;

  uniform sampler2D blendTexture;
  uniform float blendSpeed;
  uniform float blendOffset;

  uniform float time;
  uniform float alpha;

  uniform float noiseRepeat;

  varying vec2 vUv;

  void main() {
    vec2 uvTimeShift = vUv + vec2(-0.7, 1.5) * time * baseSpeed;
    vec4 noiseGeneratorTimeShift = texture2D(
      noiseTexture,
      uvTimeShift * vec2(noiseRepeat, noiseRepeat)
    );
    vec2 uvNoiseTimeShift =
      vUv + noiseScale * vec2(noiseGeneratorTimeShift.r, noiseGeneratorTimeShift.b);
    vec4 baseColor = texture2D(baseTexture, uvNoiseTimeShift * vec2(repeatS, repeatT));

    vec2 uvTimeShift2 = vUv + vec2(1.3, -1.7) * time * blendSpeed;
    vec4 noiseGeneratorTimeShift2 = texture2D(
      noiseTexture,
      uvTimeShift2 * vec2(noiseRepeat, noiseRepeat)
    );
    vec2 uvNoiseTimeShift2 =
      vUv + noiseScale * vec2(noiseGeneratorTimeShift2.g, noiseGeneratorTimeShift2.b);
    vec4 blendColor =
      texture2D(blendTexture, uvNoiseTimeShift2 * vec2(repeatS, repeatT)) -
      blendOffset * vec4(1.0, 1.0, 1.0, 1.0);

    vec4 theColor = baseColor + blendColor;
    theColor.a = alpha;
    gl_FragColor = theColor;
  }
`;

function createSunShaderUniforms() {
  return {
    baseTexture: { value: lavaTexture },
    baseSpeed: { value: baseSpeed },
    repeatS: { value: repeatS },
    repeatT: { value: repeatT },
    noiseRepeat: { value: noiseRepeat },
    bumpRepeat: { value: bumpRepeat },
    noiseTexture: { value: noiseTexture },
    noiseScale: { value: noiseScale },
    blendTexture: { value: blendTexture },
    blendSpeed: { value: blendSpeed },
    blendOffset: { value: blendOffset },
    bumpTexture: { value: bumpTexture },
    bumpSpeed: { value: bumpSpeed },
    bumpScale: { value: bumpScale },
    alpha: { value: 1.0 },
    time: { value: 1.0 },
  };
}

function createSunFallbackMaterial() {
  return new THREE.MeshPhongMaterial({
    map: lavaTexture,
    emissive: 0xffaa55,
    emissiveMap: blendTexture,
    emissiveIntensity: 1.1,
  });
}

function createSunMaterialForRenderer(rendererRef) {
  const maxPrecision = rendererRef.capabilities.getMaxPrecision('highp');
  const hasBasicShaderSupport =
    maxPrecision !== 'lowp' && rendererRef.capabilities.maxTextures >= 8;
  if (!hasBasicShaderSupport) {
    return {
      material: createSunFallbackMaterial(),
      uniforms: null,
    };
  }

  const mobileSafeMode = isMobileDevice;
  const uniforms = createSunShaderUniforms();
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: SUN_VERTEX_SHADER,
    fragmentShader: SUN_FRAGMENT_SHADER,
    precision: mobileSafeMode ? 'mediump' : maxPrecision,
  });
  return {
    material,
    uniforms,
  };
}

function createSunEdgeGlow(
  peakPosition = 0.2,
  solidEnd = 0.21,
  sunEdgeGlowRadiusScale = 1.25,
  outerFadePower = 4,
  glowOpacity = 1.0,
  color = 0xff9a27,
) {
  const sunGlowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      peakPosition: { value: peakPosition },
      solidEnd: { value: solidEnd },
      glowOpacity: { value: glowOpacity },
      innerRadiusRatio: { value: 1 / sunEdgeGlowRadiusScale },
      outerFadePower: { value: outerFadePower },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float peakPosition;
      uniform float solidEnd;
      uniform float glowOpacity;
      uniform float innerRadiusRatio;
      uniform float outerFadePower;
      varying vec2 vUv;
      void main() {
        // Radial distance from quad center (0 = center, 1 = edge)
        vec2 centered = vUv * 2.0 - 1.0;
        float radial = length(centered);
        if (radial > 1.0) discard;
        float innerRatio = clamp(innerRadiusRatio, 0.0, 0.9999);
        float haloT = clamp(
          (radial - innerRatio) / max(1.0 - innerRatio, 0.0001),
          0.0,
          1.0
        );
        float profile;
        if (haloT <= peakPosition) {
          profile = haloT / max(peakPosition, 0.0001);
        } else if (haloT <= solidEnd) {
          profile = 1.0;
        } else {
          float outerT = (haloT - solidEnd) / max(1.0 - solidEnd, 0.0001);
          profile = pow(max(1.0 - outerT, 0.0), outerFadePower);
        }
        float alpha = clamp(profile, 0.0, 1.0) * glowOpacity;
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });

  const size = SUN_RADIUS * sunEdgeGlowRadiusScale * 0.96 * 2.0;
  const glowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    sunGlowMaterial,
  );
  glowMesh.name = 'sunEdgeGlow';
  glowMesh.userData.ignoreClickFollow = true;
  const worldGlowPosition = new THREE.Vector3();
  const baseHalfSize = size * 0.5;
  const targetSunEdgeRadius = SUN_RADIUS;
  const maxDynamicScale = 10;
  // Billboard direction is derived from (camera.position - glow.position).
  glowMesh.onBeforeRender = function (renderer, scene, camera) {
    glowMesh.getWorldPosition(worldGlowPosition);
    const distanceToCamera = worldGlowPosition.distanceTo(camera.position);
    const innerRatio = THREE.MathUtils.clamp(
      sunGlowMaterial.uniforms.innerRadiusRatio.value,
      0.001,
      0.9999,
    );
    const safeDistance = Math.max(
      distanceToCamera,
      targetSunEdgeRadius + 0.001,
    );
    const denom = Math.sqrt(
      Math.max(
        safeDistance * safeDistance - targetSunEdgeRadius * targetSunEdgeRadius,
        0.000001,
      ),
    );
    // Keep the glow inner edge aligned to the sun limb in screen space:
    // innerRatio * halfSize projects to the same angular radius as the sun sphere.
    const requiredHalfSize =
      (safeDistance * targetSunEdgeRadius) / (innerRatio * denom);
    const dynamicScale =
      THREE.MathUtils.clamp(
        requiredHalfSize / baseHalfSize,
        1,
        maxDynamicScale,
      ) * 0.965;
    glowMesh.scale.set(dynamicScale, dynamicScale, 1);
    glowMesh.lookAt(camera.position);
  };
  return glowMesh;
}

const ufolight = textureLoader.load('img/ufo_light1.png');
let sunEdgeGlow;
let sunEdgeGlow1;
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
  sun = obj_lighting(
    './texture/fluid1-original.png',
    SUN_BASE_SIZE,
    0,
    0,
    0,
    'sun',
  );
  sunEdgeGlow = createSunEdgeGlow();
  sunEdgeGlow.position.set(0, 0, 0);
  sunEdgeGlow1 = createSunEdgeGlow(0, 0, 5, 4, 0.25, 0xffbb88);
  sunEdgeGlow1.position.set(0, 0, 0);
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
  ring4 = ring1('./texture/ring1.gif', 14, 15);
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
  ring8 = ring2('./texture/ring2.png', 20, 2);
  star9 = obj('./texture/j033.jpg', 3, 1200, 0, 0, 'star9');

  sun.name = 'sun';
  star1.name = 'star1';
  star2.name = 'star2';
  star3.name = 'star3';
  starlite3.name = 'starlite3';
  star4.name = 'star4';
  ring4.name = 'ring4';
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
  ring8.name = 'ring8';

  ring4.userData.ignoreClickFollow = true;
  ring8.userData.ignoreClickFollow = true;
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
let meteorSystem;

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
  if (add_solar && sun) {
    const sunMaterialState = createSunMaterialForRenderer(renderer);
    sun.material = sunMaterialState.material;
    sunShaderUniforms = sunMaterialState.uniforms;
  }
  meteorSystem = createMeteorSystem({
    THREE,
    scene,
    meteorTemplate: meteorite_Object3D,
    meteorHeadMaterial: material,
    meteorHeadAltMaterial: materialr,
    meteorTailMaterial: material1,
    maxDistance: METEOR_MAX_DISTANCE,
    speed: METEOR_SPEED,
    sizeScaleMin: 0.7,
    sizeScaleRange: 1.0,
    centerDotMin: 0.85,
    centerDotMax: 0.851,
    trailStepDivisor: 2.8,
  });
  const skyGeometry = new THREE.SphereGeometry(5000, 64, 64);
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
    yBaseOffset: -(AMOUNTY * SEPARATION) / 4,
  });

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

  scene.add(new THREE.AmbientLight(0x111111, 1.5));
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
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.far = 2500 * 1 /*ufo_scale/100*/;
    light.shadow.camera.near = 100 * 1 /*ufo_scale/100*/;
    all_obj4.add(light);

    all_obj4.add(sunEdgeGlow);
    all_obj4.add(sunEdgeGlow1);

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
    ballSegments: 20,
    mainLight: {
      intensity: 0.1,
      distanceDivisor: 200,
      decay: 0.75,
    },
    secondaryLight: {
      intensity: 0.3,
      distanceDivisor: 60,
      decay: 0.95,
    },
  });

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
    new THREE.SphereGeometry(size, 64, 64),
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
    new THREE.SphereGeometry(size, 32, 32),
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
      new THREE.SphereGeometry(size, 32, 32),
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

function ring1(url, size, width) {
  size = size * 0.8;
  const startTexture = textureLoader.load(url);
  const r = new THREE.RingGeometry(size, size + width, 64);
  const pos = r.attributes.position;
  const v3 = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v3.fromBufferAttribute(pos, i);
    r.attributes.uv.setXY(i, v3.length() < size + 1 ? 0 : 1, 1);
  }
  const starBall = new THREE.Mesh(
    r,
    new THREE.MeshBasicMaterial({
      color: 0x888068,
      map: startTexture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
    }),
  );
  starBall.rotation.x = -Math.PI / 2;
  starBall.rotation.y = -Math.PI / 12;
  return starBall;
}
function ring2(url, size, width) {
  size = size * 0.8;
  const startTexture = textureLoader.load(url);
  const r = new THREE.RingGeometry(size, size + width, 64);
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
      blending: THREE.AdditiveBlending,
    }),
  );
  starBall.rotation.x = -Math.PI / 2;
  starBall.rotation.y = -Math.PI / 6;
  return starBall;
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
  if (bounder_detect() && hit_frame < 490) {
    hit_frame = 500;
    chasingFrame = 0;
  }
  const hitState = applyUfoHitEffect({
    ufo,
    cameraPositionVec,
    hitDirectionVec,
    hitFrame: hit_frame,
    rotatespeed,
    knockbackDivisor: 10000,
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
  if (fast) maxSpeed = 1.5 * fpsScale;
  else maxSpeed = Math.max(maxSpeed - 0.06 * fpsScale, 1.2 * fpsScale);
  const touchDrivenMove = isMobileDevice && touchControls.isMoveTouchActive();
  const moveSpeedScale = touchDrivenMove
    ? Math.max(0.05, moveInputStrength)
    : 1;
  const maxSpeedForward = maxSpeed * moveSpeedScale;
  const maxSpeedRight = (maxSpeed / 2) * moveSpeedScale;

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
      yawDivisor: 24,
      pitchUpDivisor: 1400,
      pitchDownDivisor: 1250,
    });
    currentSpeedForward = controlState.currentSpeedForward;
    currentSpeedRight = controlState.currentSpeedRight;
    Forward = controlState.forwardDirection;
    Right = controlState.rightDirection;
    angleX = controlState.angleX;
    angleY = controlState.angleY;
  }

  if (
    add_solar &&
    selected_object &&
    followablePlanetNames.includes(selected_object.object.name) &&
    isContentHidden('content')
  ) {
    safe_dis = 1 * ufo_scale;
    if (selected_object.object.name == 'sun') safe_dis = 10;

    chasingFrame = 50;
    setUfoIndicatorColor({ ufo, color: 0xffff33 });
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
    if (selected_object.object.name == 'starlite3') {
      cameraPositionVec.x += (chasing.x * catchspeed) / 10;
      cameraPositionVec.y += (chasing.y * catchspeed) / 10;
      cameraPositionVec.z += (chasing.z * catchspeed) / 10;
    } else {
      cameraPositionVec.x += (chasing.x * catchspeed) / 20;
      cameraPositionVec.y += (chasing.y * catchspeed) / 20;
      cameraPositionVec.z += (chasing.z * catchspeed) / 20;
    }
  } else if (arrived > 0 && selected_object && isContentHidden('content')) {
    ////console.log(selected_object.point)
    safe_dis = 1 * ufo_scale;
    chasingFrame = 50;
    setUfoIndicatorColor({ ufo, color: 0xffff33 });
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

  const delta = clock.getDelta();
  requestAnimationFrame(animate);
  if (isLoadFinished(loadedItemCount, totalLoadItems)) hide_loading();
  else return;
  if (sunShaderUniforms) {
    sunShaderUniforms.time.value += delta;
  }
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

    starfieldSystem.update(ufo.position, count);
    meteorSystem.updateMeteorites(meteorites, 30, 5);
    count += 0.0005 * fpsScale;

    operation_method_1(delta);

    renderer.render(scene, camera);

    frameAccumulator = frameAccumulator % frameInterval;
  }
}

animate();
const handleResize = createResizeRendererHandler(renderer, camera, scene);
window.addEventListener('resize', handleResize);
