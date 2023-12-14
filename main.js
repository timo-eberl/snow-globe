import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const PI = 3.141

const fov = 70;
const nearClippingPlane = 0.01;
const farClippingPlane = 10;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	fov, window.innerWidth / window.innerHeight, nearClippingPlane, farClippingPlane);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(...createLights());

const textureLoader = new THREE.TextureLoader();
textureLoader.load("resources/fireplace_2k.jpg", (hdriTexture) => {
	hdriTexture.colorSpace = THREE.SRGBColorSpace;
	hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
	scene.background = hdriTexture;
	scene.environment = hdriTexture;
	scene.backgroundBlurriness = 0.5;
	scene.backgroundIntensity = 0.5;
});

// materials
const snowMaterial = new THREE.MeshStandardMaterial( { color: 0xccccff, side: THREE.DoubleSide } );
const darkerSnowMaterial = new THREE.MeshStandardMaterial( { color: 0xbbbbee, side: THREE.DoubleSide } );

// create objects
const objLoader = new OBJLoader();
objLoader.load("resources/tree.obj", (mesh) => {
	scene.add(...createTrees(mesh));
});
const sphere = create_sphere();
scene.add(sphere);
scene.add(...create_table());
scene.add(...create_stand());
scene.add(create_snow());
scene.add(...create_house());

camera.position.z = 0.14;
camera.position.y = 0.13;
const cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.autoRotate = true;
cameraControls.autoRotateSpeed = 0;
cameraControls.target.copy(sphere.position);

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

	cameraControls.update();

	renderer.render(scene, camera);

	requestAnimationFrame(render);
}

requestAnimationFrame(render);

function createLights() {
	const directionalLight = new THREE.DirectionalLight(0xffffff,3);
	directionalLight.position.set(5, 4, 1);
	directionalLight.castShadow = true;
	directionalLight.shadow.camera.near = nearClippingPlane;
	directionalLight.shadow.camera.far = farClippingPlane;
	// by default the camera bounds are big and we get a blurry shadow -> make them smaller
	directionalLight.shadow.camera.left = -0.2;
	directionalLight.shadow.camera.right = 0.2;
	directionalLight.shadow.camera.top = 0.2;
	directionalLight.shadow.camera.bottom = -0.2;
	directionalLight.shadow.mapSize = new THREE.Vector2(1024, 1024);

	const directionalLight2 = new THREE.DirectionalLight(0xffffff,1);
	directionalLight2.position.set(-1, 4, -1);
	directionalLight2.castShadow = true;
	directionalLight2.shadow.camera.near = nearClippingPlane;
	directionalLight2.shadow.camera.far = farClippingPlane;
	// by default the camera bounds are big and we get a blurry shadow -> make them smaller
	directionalLight2.shadow.camera.left = -0.2;
	directionalLight2.shadow.camera.right = 0.2;
	directionalLight2.shadow.camera.top = 0.2;
	directionalLight2.shadow.camera.bottom = -0.2;
	directionalLight2.shadow.mapSize = new THREE.Vector2(1024, 1024);
	
	const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 4);

	return [directionalLight, directionalLight2, hemisphereLight];
}

function create_table() {
	const geometry = new THREE.PlaneGeometry(1, 1);
	const material = new THREE.MeshStandardMaterial( { color: 0x421b13, roughness: 0.7 } );

	const up = new THREE.Mesh(geometry, material);
	up.rotation.x = PI * -0.5;
	up.rotation.z = PI * 0.25;

	const down = new THREE.Mesh(geometry, material);
	down.rotation.x = PI * 0.5;
	down.rotation.z = PI * 0.25;
	down.position.y = -0.0001; // avoid z-fighting

	up.receiveShadow = true;
	down.receiveShadow = true;

	return [up, down];
}

function create_sphere() {
	const mesh = new THREE.Mesh(
		new THREE.SphereGeometry(0.1, 40, 40),
		new THREE.MeshPhysicalMaterial({
			roughness: 0,
			transmission: 1,
			ior: 1,
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
		new THREE.CylinderGeometry(0.09, 0.068, 0.035, 40),
		darkerSnowMaterial,
	);
	mesh.position.y = 0.055;

	mesh.receiveShadow = true;
	mesh.castShadow = true;

	return mesh;
}

function create_house() {
	const woodMaterial = new THREE.MeshStandardMaterial( {color: 0x221816 } );

	const block = new THREE.Mesh(
		new THREE.BoxGeometry(0.03, 0.013, 0.04),
		woodMaterial,
	);
	block.position.y = 0.078;
	block.rotation.y = -0.1 * PI;

	const triangleGeometry = new THREE.BufferGeometry().setFromPoints([
		new THREE.Vector3(0.0, 0.01, 0.0),
		new THREE.Vector3(0.0, 0.00, 0.015),
		new THREE.Vector3(0.0, 0.00, -0.015),
	]);
	triangleGeometry.computeVertexNormals();

	const triangleFront = new THREE.Mesh(triangleGeometry, woodMaterial,);
	triangleFront.position.y = 0.078 + 0.0065;
	triangleFront.position.z = 0.019;
	triangleFront.position.x = -0.006;
	triangleFront.rotation.y = (-0.1 - 0.5) * PI;
	
	const triangleBack = new THREE.Mesh(triangleGeometry, woodMaterial,);
	triangleBack.position.y = 0.078 + 0.0065;
	triangleBack.position.z = -0.019;
	triangleBack.position.x = +0.006;
	triangleBack.rotation.y = (-0.1 + 0.5) * PI;

	const roofGeometry = new THREE.BoxGeometry(0.025, 0.002, 0.043);
	const roofLeft = new THREE.Mesh(roofGeometry, snowMaterial);
	roofLeft.position.y = 0.078 + 0.01;
	roofLeft.position.x = 0.0093;
	roofLeft.position.z = 0.0033;
	roofLeft.rotation.y = (-0.1) * PI;
	roofLeft.rotation.z = (-0.185) * PI;

	const roofRight = new THREE.Mesh(roofGeometry, snowMaterial);
	roofRight.position.y = 0.078 + 0.01;
	roofRight.position.x = -0.0093;
	roofRight.position.z = -0.0033;
	roofRight.rotation.y = (-0.1 + 1) * PI;
	roofRight.rotation.z = (-0.185) * PI;

	block.receiveShadow = true;
	block.castShadow = true;
	triangleFront.receiveShadow = true;
	triangleFront.castShadow = true;
	triangleBack.receiveShadow = true;
	triangleBack.castShadow = true;
	roofLeft.receiveShadow = true;
	roofLeft.castShadow = true;
	roofRight.receiveShadow = true;
	roofRight.castShadow = true;

	return [block, triangleFront, triangleBack, roofLeft, roofRight];
}

function createTrees(tree) {

	tree = tree.children[0];
	tree.castShadow = true;

	const firstTree = tree.clone();
	let scale = 0.024;
	firstTree.scale.set(scale,scale*0.8,scale);
	firstTree.position.y = 0.075;
	firstTree.position.x = -0.02;
	firstTree.position.z = -0.02;

	console.log(tree);

	const secondTree = tree.clone();
	scale = 0.02;
	secondTree.scale.set(scale,scale*0.8,scale);
	secondTree.position.y = 0.075;
	secondTree.position.x = -0.04;
	secondTree.position.z = 0.00;

	const thirdTree = tree.clone();
	scale = 0.01;
	thirdTree.scale.set(scale,scale*0.7,scale);
	thirdTree.position.y = 0.075;
	thirdTree.position.x = -0.05;
	thirdTree.position.z = 0.02;

	const fourthTree = tree.clone();
	scale = 0.018;
	fourthTree.scale.set(scale,scale*0.9,scale);
	fourthTree.position.y = 0.075;
	fourthTree.position.x = 0.03;
	fourthTree.position.z = -0.02;

	const fifthTree = tree.clone();
	scale = 0.016;
	fifthTree.scale.set(scale,scale*0.8,scale);
	fifthTree.position.y = 0.075;
	fifthTree.position.x = 0.01;
	fifthTree.position.z = -0.03;

	const sixthTree = tree.clone();
	scale = 0.018;
	sixthTree.scale.set(scale,scale*0.6,scale);
	sixthTree.position.y = 0.075;
	sixthTree.position.x = 0.04;
	sixthTree.position.z = 0.01;

	const seventhTree = tree.clone();
	scale = 0.01;
	seventhTree.scale.set(scale,scale*0.8,scale);
	seventhTree.position.y = 0.075;
	seventhTree.position.x = 0.07;
	seventhTree.position.z = -0.01;

	const eigthTree = tree.clone();
	scale = 0.008;
	eigthTree.scale.set(scale,scale*0.7,scale);
	eigthTree.position.y = 0.075;
	eigthTree.position.x = 0.02;
	eigthTree.position.z = 0.05;

	return [
		firstTree, secondTree, thirdTree, fourthTree, fifthTree, sixthTree, seventhTree, eigthTree
	];
};
