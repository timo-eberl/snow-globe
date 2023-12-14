import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const fov = 75;
const nearClippingPlane = 0.1;
const farClippingPlane = 1000;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	fov, window.innerWidth / window.innerHeight, nearClippingPlane, farClippingPlane);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(
	0xffffff,
	3
);
light.position.set(-1, 2, 4);
scene.add(light);

const cube = new THREE.Mesh(
	new THREE.BoxGeometry(1,1,1),
	new THREE.MeshPhongMaterial( { color:0x883344 } ),
);
scene.add(cube);

camera.position.z = 5;

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

	renderer.render(scene, camera);

	cube.rotation.x = time;
	cube.rotation.y = time;

	requestAnimationFrame(render);
}

requestAnimationFrame(render);
