export function createFollowTargetFilter({
  excludedNames = ['ring', 'Sky'],
  excludedNamePrefixes = [],
} = {}) {
  return function isFollowTargetObject(object) {
    if (!object) return false;
    if (object.userData && object.userData.ignoreClickFollow) return false;
    if (object.type === 'Sprite' || object.type === 'Points') return false;

    if (excludedNames.includes(object.name)) return false;
    if (
      typeof object.name === 'string' &&
      excludedNamePrefixes.some((prefix) => object.name.startsWith(prefix))
    ) {
      return false;
    }

    return true;
  };
}

export function pickFollowTargetFromScene({
  mouse,
  camera,
  scene,
  raycaster,
  isFollowTargetObject,
}) {
  raycaster.setFromCamera(mouse, camera);
  raycaster.near = 0.1;
  raycaster.far = 10000;

  const intersects = raycaster.intersectObjects(scene.children, true);
  for (let i = 0; i < intersects.length; i++) {
    if (isFollowTargetObject(intersects[i].object)) {
      return intersects[i];
    }
  }

  return null;
}
