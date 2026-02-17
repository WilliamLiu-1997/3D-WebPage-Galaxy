import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

const DEFAULT_MODEL_PATHS = {
  mtl: 'UFO2/UFO2.mtl',
  obj: 'UFO2/UFO2.obj',
};

const RING_Y_OFFSET = 0.021 * 5;
const LIGHT_COLOR = 0xffffee;
const OUTER_RING_COLOR = 0xff51aa;
const CENTER_RING_COLOR = 0x44e0ff;

const OUTER_RING_CONFIGS = [
  {
    radius: 0.0909 * 5,
    thetaLength: Math.PI / 5.455,
    rotationZ: Math.PI / 15.35,
  },
  {
    radius: 0.092 * 5,
    thetaLength: Math.PI / 5.455,
    rotationZ: Math.PI / 9.35 + Math.PI / 3,
  },
  {
    radius: 0.09095 * 5,
    thetaLength: Math.PI / 5.455,
    rotationZ: Math.PI / 8.65 + (Math.PI * 2) / 3,
  },
  {
    radius: 0.09085 * 5,
    thetaLength: Math.PI / 5.455,
    rotationZ: Math.PI / 10.65 + Math.PI,
  },
  {
    radius: 0.09085 * 5,
    thetaLength: Math.PI / 5.455,
    rotationZ: Math.PI / 13.65 + (Math.PI * 4) / 3,
  },
  {
    radius: 0.09085 * 5,
    thetaLength: Math.PI / 4.655,
    rotationZ: Math.PI / 18.65 + (Math.PI * 5) / 3,
  },
];

function createRingMaterial(THREE, ringDoubleSide) {
  const options = {
    color: OUTER_RING_COLOR,
    specular: OUTER_RING_COLOR,
    emissive: OUTER_RING_COLOR,
  };
  if (ringDoubleSide) {
    options.side = THREE.DoubleSide;
  }
  return new THREE.MeshPhongMaterial(options);
}

function createCenterRingMaterial(THREE, ringDoubleSide) {
  const options = {
    color: CENTER_RING_COLOR,
    specular: CENTER_RING_COLOR,
    emissive: CENTER_RING_COLOR,
  };
  if (ringDoubleSide) {
    options.side = THREE.DoubleSide;
  }
  return new THREE.MeshPhongMaterial(options);
}

function createUfoPointLight(THREE, ufoScale, baseDistance, config, defaultPosition) {
  const intensity = config.intensity ?? 0.5;
  const distanceDivisor = config.distanceDivisor ?? 20;
  const decay = config.decay ?? 0.75;
  const light = new THREE.PointLight(
    LIGHT_COLOR,
    intensity,
    (baseDistance * ufoScale) / distanceDivisor,
    decay,
  );

  light.penumbra = config.penumbra ?? 0.1;

  if (config.castShadow) {
    light.castShadow = true;
    const shadowMapSize = config.shadowMapSize ?? 512;
    light.shadow.mapSize.width = shadowMapSize;
    light.shadow.mapSize.height = shadowMapSize;

    const shadowFarBaseDistance = config.shadowFarBaseDistance ?? baseDistance;
    const shadowFarDivisor = config.shadowFarDivisor ?? distanceDivisor;
    light.shadow.camera.far = (shadowFarBaseDistance * ufoScale) / shadowFarDivisor;

    const shadowNearBaseDistance = config.shadowNearBaseDistance ?? 0.1;
    const shadowNearDivisor = config.shadowNearDivisor ?? distanceDivisor;
    light.shadow.camera.near =
      (shadowNearBaseDistance * ufoScale) / shadowNearDivisor;

    if (typeof config.shadowRadius === 'number') {
      light.shadow.radius = config.shadowRadius;
    }

    if (typeof config.shadowBias === 'number') {
      // Keep compatibility with existing scene code that uses `shadowBias`.
      light.shadowBias = config.shadowBias;
      light.shadow.bias = config.shadowBias;
    }
  }

  const [x, y, z] = config.position ?? defaultPosition;
  light.position.set(x, y, z);
  return light;
}

export function initSharedUfo({
  THREE,
  scene,
  ufo,
  ufoScale,
  ufoLightTexture,
  littleStar,
  ufoMaterial,
  onProgressObj,
  onProgressMtl,
  ringDoubleSide = false,
  ballSegments = 30,
  mainLight = {},
  secondaryLight = {},
  modelPaths = DEFAULT_MODEL_PATHS,
  ufoLightRenderOrder,
  whiteLightRenderOrder,
}) {
  if (
    !THREE ||
    !scene ||
    !ufo ||
    !ufoLightTexture ||
    !littleStar ||
    !ufoMaterial
  ) {
    return;
  }

  const mtlLoader = new MTLLoader();
  mtlLoader.load(
    modelPaths.mtl,
    (mtl) => {
      mtl.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(mtl);
      objLoader.load(
        modelPaths.obj,
        (root) => {
          for (const child of root.children) {
            child.castShadow = true;
          }

          root.position.set(0, 0, 0);
          root.scale.set(0.1, 0.1, 0.1);

          const ufoLightMaterial = new THREE.SpriteMaterial({
            blending: THREE.AdditiveBlending,
            map: ufoLightTexture,
            transparent: true,
            opacity: 0.5,
          });
          const ufoLight = new THREE.Sprite(ufoLightMaterial);
          if (typeof ufoLightRenderOrder === 'number') {
            ufoLight.renderOrder = ufoLightRenderOrder;
          }
          const ufoTopLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.085, 32, 32),
            new THREE.MeshBasicMaterial({ color: LIGHT_COLOR }),
          );
          const whiteLight = littleStar.clone();
          if (typeof whiteLightRenderOrder === 'number') {
            whiteLight.renderOrder = whiteLightRenderOrder;
          }

          const ringMaterial = createRingMaterial(THREE, ringDoubleSide);
          const outerRings = OUTER_RING_CONFIGS.map((ringConfig) => {
            const ring = new THREE.Mesh(
              new THREE.TorusGeometry(
                ringConfig.radius,
                0.0025,
                3,
                144,
                ringConfig.thetaLength,
              ),
              ringMaterial,
            );
            ring.rotation.x = Math.PI / 2;
            ring.rotation.z = ringConfig.rotationZ;
            ring.position.y = RING_Y_OFFSET;
            return ring;
          });

          const centerRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.0566 * 5, 0.06, 3, 72),
            createCenterRingMaterial(THREE, ringDoubleSide),
          );

          ufoTopLight.position.set(0, 0.033 * 5, 0);
          whiteLight.position.set(0, 0.036 * 5, 0);
          whiteLight.scale.set(0.063 * 5, 0.0525 * 5);
          ufoLight.position.set(0, -0.04, 0);
          ufoLight.scale.set(0.05, 0.25);

          const mainBeamLight = createUfoPointLight(
            THREE,
            ufoScale,
            100,
            mainLight,
            [0, 0.3, 0],
          );
          const secondaryBeamLight = createUfoPointLight(
            THREE,
            ufoScale,
            30,
            secondaryLight,
            [0, 0, 0],
          );

          const ufoBall = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, ballSegments, ballSegments),
            new THREE.MeshPhongMaterial({
              color: 0xffffff,
              specular: 0xffffff,
              emissive: 0xffffff,
              transparent: true,
              opacity: 0.95,
            }),
          );
          ufoBall.scale.y = 0.1;
          ufoBall.position.y = 0.065;

          centerRing.rotation.x = Math.PI / 2;
          centerRing.position.y = 0.0222 * 5;

          root.children[2].material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
          });
          root.children[3].material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
          });
          root.children[5].material = ufoMaterial;

          ufo.add(root);
          ufo.add(ufoLight);
          ufo.add(ufoTopLight);
          ufo.add(whiteLight);
          for (const ring of outerRings) {
            ufo.add(ring);
          }
          ufo.add(centerRing);
          ufo.add(mainBeamLight);
          ufo.add(secondaryBeamLight);
          ufo.add(ufoBall);

          ufo.position.z -= 0.48 * 5;
          ufo.position.y -= 0.12 * 5;
        },
        onProgressObj,
      );
    },
    onProgressMtl,
  );

  ufo.scale.set(ufoScale, ufoScale, ufoScale);
  scene.add(ufo);
  ufo.position.set(0, -1000, 0);
}
