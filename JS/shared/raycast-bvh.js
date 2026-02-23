import * as THREE from 'three';
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from 'three-mesh-bvh';

let bvhRaycastEnabled = false;
const preparedRoots = new WeakSet();
const preparedGeometries = new WeakSet();

export function ensureBvhRaycastEnabled() {
  if (bvhRaycastEnabled) return;

  THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
  THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
  THREE.Mesh.prototype.raycast = acceleratedRaycast;
  bvhRaycastEnabled = true;
}

function prepareGeometryBoundsTree(geometry) {
  if (!geometry || preparedGeometries.has(geometry)) return;
  if (!geometry.attributes || !geometry.attributes.position) return;
  if (typeof geometry.computeBoundsTree !== 'function') return;

  geometry.computeBoundsTree();
  preparedGeometries.add(geometry);
}

function prepareRootForRaycast(root) {
  if (!root || preparedRoots.has(root)) return;

  if (typeof root.traverse === 'function') {
    root.traverse((node) => {
      if (node && node.isMesh && node.geometry) {
        prepareGeometryBoundsTree(node.geometry);
      }
    });
  } else if (root.isMesh && root.geometry) {
    prepareGeometryBoundsTree(root.geometry);
  }

  preparedRoots.add(root);
}

export function prepareBvhRaycastTargets(roots) {
  ensureBvhRaycastEnabled();

  if (Array.isArray(roots)) {
    for (let i = 0; i < roots.length; i++) {
      prepareRootForRaycast(roots[i]);
    }
    return;
  }

  prepareRootForRaycast(roots);
}
