import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const PI = 3.141

const fov = 30;
const nearClippingPlane = 0.01;
const farClippingPlane = 10;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	fov, window.innerWidth / window.innerHeight, nearClippingPlane, farClippingPlane);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// create lights
const directionalLight = new THREE.DirectionalLight(0xffffff,3);
directionalLight.position.set(1, 4, 4);
directionalLight.castShadow = true;
directionalLight.shadow.camera.near = nearClippingPlane;
directionalLight.shadow.camera.far = farClippingPlane;
// by default the camera bounds are big and we get a blurry shadow -> make them smaller
directionalLight.shadow.camera.left = -0.2;
directionalLight.shadow.camera.right = 0.2;
directionalLight.shadow.camera.top = 0.2;
directionalLight.shadow.camera.bottom = -0.2;
console.log(directionalLight.shadow.camera.left, directionalLight.shadow.camera.right,
	directionalLight.shadow.camera.top, directionalLight.shadow.camera.bottom);

scene.add(directionalLight);
const hemisphereLight = new THREE.HemisphereLight( 0xffffbb, 0x080820, 2 );
scene.add(hemisphereLight);

// materials
const snowMaterial = new THREE.MeshStandardMaterial( { color: 0xccccff, emissive: 0x9999aa } );

// create objects
const sphere = create_sphere();
scene.add(sphere);
scene.add(create_table());
scene.add(...create_stand());
scene.add(create_snow());

camera.position.z = 0.7;
camera.position.y = 0.3;
camera.rotation.x = PI * -0.09;
const cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.autoRotate = true;
cameraControls.autoRotateSpeed = 1;

function render(time) {
	time *= 0.001; // convert to seconds
	
	// resize if needed
	const needResize = renderer.domElement.width !== window.innerWidth
		|| renderer.domElement.height !== window.innerHeight
	if (needResize) {
		renderer.setSize(window.innerWidth, window.innerHeight);
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	}

	cameraControls.target = sphere.position;
	cameraControls.update();

	renderer.render(scene, camera);

	requestAnimationFrame(render);
}

requestAnimationFrame(render);

function create_table() {
	const mesh = new THREE.Mesh(
		new THREE.PlaneGeometry(1, 1),
		new THREE.MeshStandardMaterial( { color: 0x421b13, roughness: 0.7 } ),
	);
	mesh.rotation.x = PI * -0.5;
	mesh.rotation.z = PI * 0.25;

	mesh.receiveShadow = true;

	return mesh;
}

function create_sphere() {
	const mesh = new THREE.Mesh(
		new THREE.SphereGeometry(0.1, 40, 40),
		new THREE.MeshPhysicalMaterial({
			roughness: 0,
			transmission: 1,
		}),
	);
	mesh.position.y = 0.11;

	mesh.receiveShadow = true;

	return mesh;
}

function create_stand() {
	const height = 0.035;
	const ringWidth = 0.003;

	const wood = new THREE.Mesh(
		new THREE.CylinderGeometry(0.07, 0.08, 0.035, 40),
		new THREE.MeshStandardMaterial( { color: 0x311815, roughness: 0.4 } ),
	);
	wood.position.y = height * 0.5;

	const ringMaterial = new THREE.MeshStandardMaterial({
		color: 0xe8b873, metalness: 1, roughness: 0.6
	});
	const upperRing = new THREE.Mesh(
		new THREE.TorusGeometry(0.07, ringWidth, 20, 40),
		ringMaterial,
	);
	upperRing.position.y = height;
	upperRing.rotation.x = PI * -0.5;

	const lowerRing = new THREE.Mesh(
		new THREE.TorusGeometry(0.08, ringWidth, 20, 40),
		ringMaterial,
	);
	lowerRing.position.y = ringWidth;
	lowerRing.rotation.x = PI * -0.5;

	wood.receiveShadow = true;
	upperRing.receiveShadow = true;
	lowerRing.receiveShadow = true;
	wood.castShadow = true;
	upperRing.castShadow = true;
	lowerRing.castShadow = true;

	return [wood, upperRing, lowerRing];
}

function create_snow() {
	const mesh = new THREE.Mesh(
		new THREE.CylinderGeometry(0.09, 0.07, 0.035, 40),
		snowMaterial,
	);
	mesh.position.y = 0.055;

	mesh.receiveShadow = true;
	mesh.castShadow = true;

	return mesh;
}
