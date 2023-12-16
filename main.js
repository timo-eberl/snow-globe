import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const PI = 3.141

// resolution is dynamically adjusted depending on the performance
let resolutionScale = 1;
const resolutionScaleTarget = 1;
const dynamicUpscalingInterval = 150;

const fov = 70;
const nearClippingPlane = 0.01;
const farClippingPlane = 100;

const scene = new THREE.Scene();
// fog does not act as normal fog, instead it is abused to create an effect when entering the globe
// inverse-fog -> the closer you are to the glass globe, the stronger the effect
scene.fog = new THREE.Fog( 0xaaaabb, 0.05, 0.0 );
const camera = new THREE.PerspectiveCamera(fov, 2, nearClippingPlane, farClippingPlane);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", updateWindowSize);

const textureLoader = new THREE.TextureLoader();
textureLoader.load("resources/fireplace_2k.jpg", onHdriLoaded);
textureLoader.load("resources/voronoi_8.png", onVoronoiLoaded);
textureLoader.load("resources/snow.png", onSnowTextureLoaded);

const objLoader = new OBJLoader();
objLoader.load("resources/tree.obj", onTreeMeshLoaded);

// materials that will be reused
const snowMaterial = new THREE.MeshStandardMaterial( { color: 0xccccff, fog: false } );
const darkerSnowMaterial = new THREE.MeshStandardMaterial( { color: 0xbbbbee, fog: false } );
const ppColdEffectMaterial = createColdImageEffectMaterial();

// add lights
const lights = createLights();
const houseSpotLight = lights[0];
scene.add(...lights);

// add objects
const spheres = createSphere();
const sphere = spheres[0];
scene.add(...spheres);
scene.add(...createTable());
scene.add(...createStand());
scene.add(...createSnow());
scene.add(...createHouse());
scene.add(...createSnowman());

const particles = createParticles();
scene.add(...particles);

// set up post processing
renderer.autoClear = false;
const ppCamera = new THREE.PerspectiveCamera(fov, 2, nearClippingPlane, farClippingPlane);
const ppCameraHelper = new THREE.CameraHelper(ppCamera);
const ppQuad = createImageEffectQuad();
const ppScene = new THREE.Scene();
ppScene.add(ppQuad);

// after we added our objects, we need to update the shadow map
renderer.shadowMap.needsUpdate = true;

camera.position.z = 0.25;
camera.position.y = 0.18;
const cameraControls = new OrbitControls(camera, renderer.domElement);
// limit the angles, because on when looking from low or high angles somehow the performance
// completely breaks down
cameraControls.minPolarAngle = PI * 0.28;
cameraControls.maxPolarAngle = PI * 0.6;
cameraControls.autoRotate = true;
cameraControls.autoRotateSpeed = 0;
cameraControls.target.copy(sphere.position);
cameraControls.target.y -= 0.025;

let lastTime = 0;
// used for dynamic resolution
let lastResizedTime = 0;
let stepsCurrInterval = 0;
let goodRenderTimeCounter = 0;
// used for image effect opacity
let ppOpacity = 0.0;

// before we begin rendering, update the window size one time
updateWindowSize();

function render(time) {
	time *= 0.001; // convert to seconds

	let delta = time - lastTime;
	updateDynamicResolution(delta);
	lastTime = time;

	cameraControls.update();

	// rotate the glass sphere in a way that the same side faces towards the camera
	// this way we can save geometry at the side we are looking at without it being obvious
	sphere.lookAt(camera.position);
	sphere.rotateX(0.5 * PI);

	// animate house light
	const flickerValue =
		(Math.cos(time * 1 * PI) + 2) * 0.1
		+ (Math.cos(time * 2 * PI) + 1) * 0.15
		+ (Math.cos((time + 23.4536) * 2.5 * PI) + 1) * 0.15;
	houseSpotLight.intensity = 0.6 * flickerValue;

	particles[0].rotation.x = (time/9) % (2*PI);
	particles[0].rotation.y = (time/5) % (2*PI);
	particles[0].rotation.z = (time/10) % (2*PI);
	particles[1].rotation.x = (-time/6) % (2*PI);
	particles[1].rotation.y = (-time/3) % (2*PI);
	particles[1].rotation.z = (-time/6) % (2*PI);
	particles[2].rotation.x = (-time/6) % (2*PI);
	particles[2].rotation.y = (time/4) % (2*PI);
	particles[2].rotation.z = (time/7) % (2*PI);

	const camSphereDistance = camera.position.distanceTo(sphere.position);
	const camInsideSphere = camSphereDistance < 0.11;
	if (camInsideSphere) {
		ppOpacity += delta;
	}
	else {
		ppOpacity -= delta;
	}
	ppOpacity = THREE.MathUtils.clamp(ppOpacity, 0, 0.5);
	ppColdEffectMaterial.uniforms["uOpacity"] = {
		value: ppOpacity
	};

	// first render the scene, then render post processing "on top"
	renderer.clear();
	renderer.render(scene, camera);
	renderer.clearDepth();
	renderer.render(ppScene, ppCamera);

	requestAnimationFrame(render);
}

requestAnimationFrame(render);

function updateRenderResolution() {
	renderer.setSize(
		window.innerWidth * resolutionScale, window.innerHeight * resolutionScale, false
	);
}

function updateWindowSize() {
	updateRenderResolution();
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	ppCamera.aspect = camera.aspect;
	ppCamera.updateProjectionMatrix();
	ppCameraHelper.update();

	updateImageEffectQuad();
	ppColdEffectMaterial.uniforms["uAspectRatio"] = {
		value: window.innerWidth / window.innerHeight
	};

	lastResizedTime = lastTime;
}

function updateDynamicResolution(delta) {
	if (stepsCurrInterval >= dynamicUpscalingInterval) {
		if (goodRenderTimeCounter >= dynamicUpscalingInterval && resolutionScale < resolutionScaleTarget) {
			// performance is stable -> steadily increase resolution
			resolutionScale += 0.05;
			resolutionScale = Math.min(resolutionScaleTarget, resolutionScale);
			updateRenderResolution();
		}
		stepsCurrInterval = 0;
		goodRenderTimeCounter = 0;
	}
	if (delta > 1.0/30 && lastTime - lastResizedTime > 1.0) {
		// performance is bad -> instantly lower resolution
		resolutionScale *= 0.9;
		resolutionScale = Math.max(0.2, resolutionScale);
		updateRenderResolution();
	}
	else if (delta < 1.0/55) {
		goodRenderTimeCounter++;
	}
	stepsCurrInterval++;
}

function onHdriLoaded(hdriTexture) {
	hdriTexture.colorSpace = THREE.SRGBColorSpace;
	hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
	scene.background = hdriTexture;
	scene.environment = hdriTexture;
	scene.backgroundBlurriness = 0.5;
	scene.backgroundIntensity = 0.5;
}

function onVoronoiLoaded(texture) {
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.colorSpace = THREE.SRGBColorSpace;
	houseSpotLight.map = texture;
}

function onSnowTextureLoaded(texture) {
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.wrapS = THREE.RepeatWrapping;
	texture.wrapT = THREE.RepeatWrapping;
	ppColdEffectMaterial.uniforms["uSnowTexture"] = { value: texture };
}

function onTreeMeshLoaded(mesh) {
	scene.add(...createTrees(mesh));
	renderer.shadowMap.needsUpdate = true;
}

function createLights() {
	const shadowMapSize = 1024;

	const directionalLight = new THREE.DirectionalLight(0xffffff,1);
	directionalLight.position.set(1.8, 1.6, 0.4);
	directionalLight.castShadow = true;
	directionalLight.shadow.camera.near = nearClippingPlane;
	directionalLight.shadow.camera.far = farClippingPlane;
	// by default the camera bounds are big and we get a blurry shadow -> make them smaller
	directionalLight.shadow.camera.left = -0.185;
	directionalLight.shadow.camera.right = 0.185;
	directionalLight.shadow.camera.top = 0.185;
	directionalLight.shadow.camera.bottom = -0.185;
	directionalLight.shadow.mapSize = new THREE.Vector2(shadowMapSize, shadowMapSize);

	const directionalLight2 = new THREE.DirectionalLight(0xffffff,0.5);
	directionalLight2.position.set(-0.3, 2, -0.8);
	directionalLight2.castShadow = true;
	directionalLight2.shadow.camera.near = nearClippingPlane;
	directionalLight2.shadow.camera.far = farClippingPlane;
	// by default the camera bounds are big and we get a blurry shadow -> make them smaller
	directionalLight2.shadow.camera.left = -0.17;
	directionalLight2.shadow.camera.right = 0.17;
	directionalLight2.shadow.camera.top = 0.17;
	directionalLight2.shadow.camera.bottom = -0.17;
	directionalLight2.shadow.mapSize = new THREE.Vector2(shadowMapSize, shadowMapSize);

	const houseSpotLight = new THREE.SpotLight(0xff9900, 0.2, 0.07);
	houseSpotLight.position.set(-0.0025,0.08,0.008);
	houseSpotLight.angle = 0.2 * PI;
	houseSpotLight.castShadow = true;
	houseSpotLight.shadow.camera.near = 0.001;
	houseSpotLight.shadow.camera.far = 0.1;
	houseSpotLight.shadow.mapSize = new THREE.Vector2(shadowMapSize, shadowMapSize);
	houseSpotLight.target.position.set(-0.3,-0.3,1);
	scene.add(houseSpotLight.target);

	const houseLight = new THREE.PointLight(0xff5500, 1, 0.01);
	houseLight.position.set(-0.003,0.075,0.01);
	
	const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 1);

	return [
		houseSpotLight, houseSpotLight.target, directionalLight, directionalLight2, hemisphereLight,
		houseLight
	];
}

function createTable() {
	const geometry = new THREE.PlaneGeometry(1, 1);
	const material = new THREE.MeshStandardMaterial({ color: 0x421b13, roughness: 0.7, fog: false });

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

function createSphere() {
	const outside = new THREE.Mesh(
		new THREE.SphereGeometry(0.1, 40, 10),
		new THREE.MeshPhysicalMaterial({
			color: 0xcccccc,
			roughness: 0,
			transmission: 1,
			ior: 2.33,
			thickness: 0.017,
		}),
	);
	outside.position.y = 0.11;

	const inside = new THREE.Mesh(
		new THREE.SphereGeometry(0.099, 20, 8),
		new THREE.MeshBasicMaterial({
			color: 0x000000,
			transparent: true,
			opacity: 0.3,
			side: THREE.BackSide,
			fog: false,
		}),
	);
	inside.position.y = 0.11;

	outside.castShadow = true;

	return [outside, inside];
}

function createStand() {
	const height = 0.035;
	const ringWidth = 0.003;

	const wood = new THREE.Mesh(
		new THREE.CylinderGeometry(0.07, 0.08, 0.035, 20),
		new THREE.MeshStandardMaterial( { color: 0x311815, roughness: 0.4, fog: false } ),
	);
	wood.position.y = height * 0.5;

	const ringMaterial = new THREE.MeshStandardMaterial({
		color: 0xe8b873, metalness: 1, roughness: 0.6, fog: false
	});
	const upperRing = new THREE.Mesh(
		new THREE.TorusGeometry(0.07, ringWidth, 4, 30),
		ringMaterial,
	);
	upperRing.position.y = height;
	upperRing.rotation.x = PI * -0.5;

	const lowerRing = new THREE.Mesh(
		new THREE.TorusGeometry(0.08, ringWidth, 4, 30),
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

function createSnow() {
	const mesh = new THREE.Mesh(
		new THREE.CylinderGeometry(0.09-0.007, 0.067, 0.035, 30),
		darkerSnowMaterial,
	);
	mesh.position.y = 0.055;

	mesh.receiveShadow = true;
	mesh.castShadow = true;

	return [mesh];
}

function createHouse() {
	const woodMaterial = new THREE.MeshStandardMaterial( { color: 0x553322, fog: false } );

	const block = new THREE.Mesh(
		new THREE.BoxGeometry(0.012, 0.013, 0.04),
		woodMaterial,
	);
	block.position.y = 0.078;
	block.position.x = -0.009;
	block.position.z = -0.003;
	block.rotation.y = -0.1 * PI;

	const block2 = new THREE.Mesh(
		new THREE.BoxGeometry(0.012, 0.013, 0.04),
		woodMaterial,
	);
	block2.position.y = 0.078;
	block2.position.x = 0.009;
	block2.position.z = 0.003;
	block2.rotation.y = -0.1 * PI;

	const block3 = new THREE.Mesh(
		new THREE.BoxGeometry(0.03, 0.005, 0.04),
		woodMaterial,
	);
	block3.position.y = 0.083;
	block3.rotation.y = -0.1 * PI;

	const block4 = new THREE.Mesh(
		new THREE.BoxGeometry(0.01, 0.01, 0.02),
		woodMaterial,
	);
	block4.position.y = 0.077;
	block4.rotation.y = -0.1 * PI;

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
	block2.receiveShadow = true;
	block2.castShadow = true;
	block3.receiveShadow = true;
	block3.castShadow = true;
	triangleFront.receiveShadow = true;
	triangleBack.receiveShadow = true;
	roofLeft.receiveShadow = true;
	roofLeft.castShadow = true;
	roofRight.receiveShadow = true;
	roofRight.castShadow = true;

	return [block, block2, block3, block4, triangleFront, triangleBack, roofLeft, roofRight];
}

function createSnowman() {
	const geometry = new THREE.SphereGeometry(1, 8, 6);

	const ballBottom = new THREE.Mesh(geometry, snowMaterial);
	ballBottom.position.set(-0.02, 0.08-0.006, 0.05);
	ballBottom.scale.set(0.0035, 0.0025, 0.0035);

	const ballMiddle = new THREE.Mesh(geometry, snowMaterial);
	ballMiddle.position.set(-0.02, 0.0828-0.006, 0.05);
	ballMiddle.scale.set(0.0025, 0.002, 0.0025);

	const head = new THREE.Mesh(geometry, snowMaterial);
	head.position.set(-0.02, 0.086-0.006, 0.05);
	head.scale.set(0.002, 0.0018, 0.002);

	const hat = new THREE.Mesh(
		new THREE.CylinderGeometry(0.0018, 0.0015, 0.0025, 8),
		new THREE.MeshStandardMaterial({
			color: 0x111111,
			fog: false,
		}),
	);
	hat.position.set(-0.0193, 0.088-0.006, 0.0495);
	hat.rotation.z = -0.1 * PI;
	hat.rotation.x = -0.1 * PI;

	const nose = new THREE.Mesh(
		new THREE.ConeGeometry(0.0004, 0.002, 5),
		new THREE.MeshStandardMaterial({
			color: 0xffaa33,
			fog: false,
		}),
	);
	nose.position.set(-0.02, 0.086-0.006, 0.053);
	nose.rotation.x = 0.5 * PI;

	ballBottom.castShadow = true;
	ballMiddle.castShadow = true;
	head.castShadow = true;
	hat.castShadow = true;

	return [ballBottom, ballMiddle, head, hat, nose];
}

function createTrees(tree) {

	tree = tree.children[0];
	tree.material = snowMaterial;
	tree.castShadow = true;

	const firstTree = tree.clone();
	let scale = 0.024;
	firstTree.scale.set(scale,scale*0.8,scale);
	firstTree.rotation.y = -0.32 * PI;
	firstTree.position.y = 0.075;
	firstTree.position.x = -0.02;
	firstTree.position.z = -0.02;

	const secondTree = tree.clone();
	scale = 0.02;
	secondTree.scale.set(scale,scale*0.8,scale);
	secondTree.rotation.y = 0.9 * PI;
	secondTree.position.y = 0.075;
	secondTree.position.x = -0.04;
	secondTree.position.z = 0.00;

	const thirdTree = tree.clone();
	scale = 0.01;
	thirdTree.scale.set(scale,scale*0.7,scale);
	thirdTree.position.y = 0.074;
	thirdTree.position.x = -0.05;
	thirdTree.position.z = 0.02;

	const fourthTree = tree.clone();
	scale = 0.018;
	fourthTree.scale.set(scale,scale*0.9,scale);
	fourthTree.position.y = 0.075;
	fourthTree.position.x = 0.03;
	fourthTree.position.z = -0.02;

	const fifthTree = tree.clone();
	fifthTree.rotation.y = 0.5 * PI;
	scale = 0.016;
	fifthTree.scale.set(scale,scale*0.8,scale);
	fifthTree.position.y = 0.075;
	fifthTree.position.x = 0.01;
	fifthTree.position.z = -0.03;

	const sixthTree = tree.clone();
	scale = 0.018;
	sixthTree.rotation.y = -0.4 * PI;
	sixthTree.scale.set(scale,scale*0.6,scale);
	sixthTree.position.y = 0.075;
	sixthTree.position.x = 0.04;
	sixthTree.position.z = 0.01;

	const seventhTree = tree.clone();
	scale = 0.01;
	seventhTree.scale.set(scale,scale*0.8,scale);
	seventhTree.position.y = 0.074;
	seventhTree.position.x = 0.07;
	seventhTree.position.z = -0.01;

	const eigthTree = tree.clone();
	scale = 0.008;
	eigthTree.rotation.y = -0.8 * PI;
	eigthTree.scale.set(scale,scale*0.7,scale);
	eigthTree.position.y = 0.074;
	eigthTree.position.x = 0.02;
	eigthTree.position.z = 0.05;

	return [
		firstTree, secondTree, thirdTree, fourthTree, fifthTree, sixthTree, seventhTree, eigthTree
	];
};

function createParticles() {
	const particlesArray = [];

	for (let i = 0; i < 3; i++) {
		const positions = generatePositionsInCircle(600 + i * 100, 0.09);
	
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
	
		const material = new THREE.PointsMaterial({ size: 0.0015 });
	
		const particles = new THREE.Points(geometry, material);
		particles.position.copy(sphere.position);

		particlesArray.push(particles)
	}

	return particlesArray;
}

function generatePositionsInCircle(n, radius) {
	const positions = [];
	for (let i = 0; i < n; i++) {
		let x,y,z,d;
		do {
			x = Math.random() * 2.0 - 1.0;
			y = Math.random() * 2.0 - 1.0;
			z = Math.random() * 2.0 - 1.0;
			d = x*x + y*y + z*z;
		} while(d > 1.0);
		positions.push(x*radius,y*radius,z*radius);
	}
	return positions;
}

function createImageEffectQuad() {
	const vertices = new Float32Array([
		0.0, 0.0,  0.0,
		0.0, 0.0,  0.0,
		0.0, 0.0,  0.0,
		0.0, 0.0,  0.0,
		0.0, 0.0,  0.0,
		0.0, 0.0,  0.0,
	]);

	const uvs = new Float32Array([
		0.0, 0.0,
		1.0, 0.0,
		0.0, 1.0,
		0.0, 1.0,
		1.0, 0.0,
		1.0, 1.0,
	]);

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
	geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

	const mesh = new THREE.Mesh(
		geometry,
		ppColdEffectMaterial,
	);

	return mesh;
}

function updateImageEffectQuad() {
	// corners of the near clipping plane which we get from the camera helper
	const n = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

	const quadPosAttribute = ppQuad.geometry.getAttribute("position");
	const cameraPosAttribute = ppCameraHelper.geometry.getAttribute("position");
	const cameraPosAttributeNames = [ "n1", "n2", "n3", "n4" ];

	for (let i = 0; i < 4; i++) {
		const attributeIndex = ppCameraHelper.pointMap[cameraPosAttributeNames[i]][0];
		n[i].set(
			cameraPosAttribute.getX(attributeIndex),
			cameraPosAttribute.getY(attributeIndex),
			cameraPosAttribute.getZ(attributeIndex),
		);

		// move the points away from the camera center to avoid clipping
		const vectorFromCenter =
			new THREE.Vector3 (0,0,0) // camera center
			.sub(n[i]) // subtract current near clipping plane point to get a vector from the center
			.multiplyScalar(nearClippingPlane * -0.01); // scale
		n[i].add(vectorFromCenter);

		// convert to world space
		n[i].applyMatrix4(ppCamera.matrixWorld);
	}
	// lower left triangle
	quadPosAttribute.setXYZ(0, n[0].x, n[0].y, n[0].z);
	quadPosAttribute.setXYZ(1, n[1].x, n[1].y, n[1].z);
	quadPosAttribute.setXYZ(2, n[2].x, n[2].y, n[2].z);
	// upper right triangle
	quadPosAttribute.setXYZ(3, n[2].x, n[2].y, n[2].z);
	quadPosAttribute.setXYZ(4, n[1].x, n[1].y, n[1].z);
	quadPosAttribute.setXYZ(5, n[3].x, n[3].y, n[3].z);

	quadPosAttribute.needsUpdate = true;
}

function createColdImageEffectMaterial() {
	return new THREE.ShaderMaterial({
		uniforms: {
			"uOpacity": { value: 0.6 },
			"uColor": { value: new THREE.Color(0xaaddff) },
			"uSnowTexture": { value: undefined }, // do not use another texture!
			"uAspectRatio": { value: window.innerWidth / window.innerHeight },
		},
		vertexShader: document.getElementById("vertex-shader").textContent,
		fragmentShader: document.getElementById("fragment-shader").textContent,
		transparent: true,
	});
}
