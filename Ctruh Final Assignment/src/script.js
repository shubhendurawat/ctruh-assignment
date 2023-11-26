import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import * as dat from 'dat.gui';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x888590);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();

let model;
let draggableMesh;
let ambientLight, directionalLight, backLight;

const composer = new EffectComposer(renderer);

const params = {
  exposure: 1,
  bloomStrength: 1.5,
  bloomThreshold: 0.2,
  bloomRadius: 0.1,
  bloomColor: new THREE.Color('#ff0000'), // Set red color for the hologram effect
  hologramEffect: 'Red', // Default hologram effect color
};

const outlinePass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
outlinePass.threshold = params.bloomThreshold;
outlinePass.strength = params.bloomStrength;
outlinePass.radius = params.bloomRadius;
outlinePass.bloomColor = params.bloomColor;

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
composer.addPass(outlinePass);

const gui = new dat.GUI();

const lightControls = {
  ambientLightIntensity: 0.5,
  directionalLightIntensity: 0.5,
  backLightIntensity: 0.2,
};

gui.add(lightControls, 'ambientLightIntensity', 0, 1).onChange((value) => {
  ambientLight.intensity = value;
});
gui.add(lightControls, 'directionalLightIntensity', 0, 1).onChange((value) => {
  directionalLight.intensity = value;
});
gui.add(lightControls, 'backLightIntensity', 0, 1).onChange((value) => {
  backLight.intensity = value;
});

const rotationControls = {
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
};

gui.add(rotationControls, 'rotateX', -Math.PI, Math.PI).onChange((value) => {
  model.rotation.x = value;
});
gui.add(rotationControls, 'rotateY', -Math.PI, Math.PI).onChange((value) => {
  model.rotation.y = value;
});
gui.add(rotationControls, 'rotateZ', -Math.PI, Math.PI).onChange((value) => {
  model.rotation.z = value;
});

const animationControls = {
  animate: true,
  toggleAnimation: () => {
    animationControls.animate = !animationControls.animate;
  },
};

gui.add(animationControls, 'toggleAnimation').name('Toggle Animation');

gui.add(params, 'hologramEffect', ['Red', 'Blue']).onChange((value) => {
  // Change the hologram color based on the selected value
  params.bloomColor = new THREE.Color(value === 'Red' ? '#ff0000' : '#0000ff');
  outlinePass.bloomColor = params.bloomColor;
});

loader.load('level5.glb', (gltf) => {
  model = gltf.scene;
  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);

  const sphere = new THREE.Sphere();
  box.getBoundingSphere(sphere);
  const radius = sphere.radius;

  const desiredDistance = radius / Math.tan((camera.fov / 2) * (Math.PI / 180));
  camera.position.set(0, 5, desiredDistance * 0.7);

  ambientLight = new THREE.HemisphereLight(0xffffff, 0x222222);
  ambientLight.position.set(0, 20, 0);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  backLight = new THREE.DirectionalLight(0xffffff, 0.2);
  backLight.position.set(-5, -10, -5);
  scene.add(backLight);

  const geometry = new THREE.BoxGeometry(5, 5, 5);
  const material = new THREE.MeshStandardMaterial({ color: 0x0000ff, metalness: 1.0, roughness: 0.0 });
  draggableMesh = new THREE.Mesh(geometry, material);
  draggableMesh.position.set(0, 5, -10);
  scene.add(draggableMesh);

  // Set up drag and drop
  draggableMesh.userData.draggable = true;
  draggableMesh.userData.imageMaterial = material; // Store the original material for resetting

  draggableMesh.addEventListener('dragstart', (event) => {
    event.dataTransfer.setData('text/plain', 'Draggable Mesh');
  });

  draggableMesh.addEventListener('dragend', () => {
    // Reset the material when dragging ends
    draggableMesh.material = draggableMesh.userData.imageMaterial;
  });

  document.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  document.addEventListener('drop', (event) => {
    event.preventDefault();
    const data = event.dataTransfer.getData('text/plain');
    if (data === 'Draggable Mesh') {
      // Check if the drop occurred on the draggable mesh
      const intersects = getIntersects(event.layerX, event.layerY);
      if (intersects.length > 0 && intersects[0].object === draggableMesh) {
        handleDrop(event);
      }
    }
  });
});

const pointerLockControls = new PointerLockControls(camera, renderer.domElement);
scene.add(pointerLockControls.getObject());

document.addEventListener('click', () => {
  pointerLockControls.lock();
});

const moveForward = () => {
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3(0, 0, -1);
  const rotation = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
  direction.applyEuler(rotation);
  velocity.copy(direction).multiplyScalar(10);
  pointerLockControls.getObject().position.add(velocity);
};

const moveBackward = () => {
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3(0, 0, 1);
  const rotation = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
  direction.applyEuler(rotation);
  velocity.copy(direction).multiplyScalar(10);
  pointerLockControls.getObject().position.add(velocity);
};

const moveLeft = () => {
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3(-1, 0, 0);
  const rotation = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
  direction.applyEuler(rotation);
  velocity.copy(direction).multiplyScalar(10);
  pointerLockControls.getObject().position.add(velocity);
};

const moveRight = () => {
  const velocity = new THREE.Vector3();
  const direction = new THREE.Vector3(1, 0, 0);
  const rotation = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
  direction.applyEuler(rotation);
  velocity.copy(direction).multiplyScalar(10);
  pointerLockControls.getObject().position.add(velocity);
};

const stopMoving = () => {};

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'KeyW':
      moveForward();
      break;
    case 'KeyS':
      moveBackward();
      break;
    case 'KeyA':
      moveLeft();
      break;
    case 'KeyD':
      moveRight();
      break;
  }
});

document.addEventListener('keyup', stopMoving);

let isRotating = false;

document.addEventListener('mousedown', () => {
  isRotating = true;
});

document.addEventListener('mouseup', () => {
  isRotating = false;
});

document.addEventListener('mousemove', (event) => {
  if (isRotating) {
    const sensitivity = 0.01;
    camera.rotation.y -= event.movementX * sensitivity;
    camera.rotation.x -= event.movementY * sensitivity;
  }
});

let isDragging = false;

document.addEventListener('mousedown', () => {
  isDragging = true;
  updateOutline();
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  outlinePass.selectedObjects = [];
});

document.addEventListener('mousemove', (event) => {
  if (isDragging) {
    updateOutline(event);
  }
});

const updateOutline = (event) => {
  if (event) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(model);
    if (intersects.length > 0) {
      const selectedObject = intersects[0].object;
      applyHologramEffect(selectedObject);
    } else {
      removeHologramEffect();
    }
  }
};

const applyHologramEffect = (object) => {
  
  const hologramMaterial = new THREE.MeshBasicMaterial({ color: params.bloomColor, transparent: true, opacity: 0.5 });
  object.material = hologramMaterial;
};

const removeHologramEffect = () => {
  // Reset the material to its original state
  if (model) {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({ color: 0x0000ff, metalness: 1.0, roughness: 0.0 });
      }
    });
  }
};

const animate = () => {
  requestAnimationFrame(animate);

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xc0c0c0);
  renderer.antialias = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  if (animationControls.animate && model) {
    model.rotation.y += 0.01;
  }

  composer.render(); // Use the composer for rendering

  updateOutline();
};

function getIntersects(x, y) {
  const mouse = new THREE.Vector2();
  mouse.x = (x / window.innerWidth) * 2 - 1;
  mouse.y = -(y / window.innerHeight) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObject(draggableMesh);
}

function handleDrop(event) {
  event.preventDefault();

  const files = event.dataTransfer.files;
  if (files.length > 0) {
    const file = files[0];

    if (file.type.startsWith('image/')) {
      // Handle image file
      const reader = new FileReader();
      reader.onload = (e) => {
        const texture = new THREE.TextureLoader().load(e.target.result);
        draggableMesh.material = new THREE.MeshBasicMaterial({ map: texture });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      // Handle video file
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.controls = true;
      draggableMesh.material = new THREE.MeshBasicMaterial({ map: new THREE.VideoTexture(video) });
      video.play();
    }
  }
}

animate();
