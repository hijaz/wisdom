// Create the scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const flyModeButton = document.getElementById('flyModeButton');
const exploreModeButton = document.getElementById('exploreModeButton');
const zoomInButton = document.getElementById('zoomInButton');
const zoomOutButton = document.getElementById('zoomOutButton');
const metadataDiv = document.getElementById('metadata');

let isFlyMode = true; // Default to fly mode
let currentTargetOrb = null;
let flyModeActive = false;
let startTime = 0;
const travelTime = 60 * 1000; // Travel time in milliseconds
const changeTargetTime = 30 * 1000; // Change target every 30 seconds
let isMouseDown = false;

// Set up initial camera position for explore mode
const exploreDistance = 100;
const exploreCenter = new THREE.Vector3(0, 0, 0);

// For raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

instructions.addEventListener('click', function () {
    blocker.style.display = 'none';
    startFlyMode();
}, false);

flyModeButton.addEventListener('click', function () {
    isFlyMode = true;
    flyModeButton.style.backgroundColor = 'lightblue';
    exploreModeButton.style.backgroundColor = 'white';
    startFlyMode();
});

exploreModeButton.addEventListener('click', function () {
    isFlyMode = false;
    flyModeButton.style.backgroundColor = 'white';
    exploreModeButton.style.backgroundColor = 'lightblue';
    startExploreMode();
});

zoomInButton.addEventListener('click', function () {
    camera.position.z -= 10;
});

zoomOutButton.addEventListener('click', function () {
    camera.position.z += 10;
});

// Scaling factor to spread out the orbs
const scalingFactor = 10;
let orbs = [];
let orbMetadata = {};

// Load orbs data
fetch('orbs_data_with_colors.json')
    .then(response => response.json())
    .then(data => {
        orbs = data.map((orb, index) => {
            const geometry = new THREE.SphereGeometry(1, 16, 16); // Reduced polygon count
            const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(orb.color.r, orb.color.g, orb.color.b) });
            const sphere = new THREE.Mesh(geometry, material);

            // Apply scaling factor to spread out the orbs
            sphere.position.set(orb.x * scalingFactor, orb.y * scalingFactor, orb.z * scalingFactor);
            scene.add(sphere);

            orbMetadata[sphere.id] = {
                sentence: orb.sentence,
                title: orb.title,
                author: orb.author,
                imageUrl: orb.imageUrl
            }; // Store metadata

            return sphere;
        });

        if (isFlyMode) {
            startFlyMode();
        } else {
            startExploreMode();
        }
    });

// Add ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

function startFlyMode() {
    flyModeActive = true;
    chooseNextTargetOrb();
}

function startExploreMode() {
    flyModeActive = false;

    camera.position.set(exploreCenter.x, exploreCenter.y, exploreCenter.z + exploreDistance);
    camera.lookAt(exploreCenter);

    document.addEventListener('mousedown', function (event) {
        if (event.button === 0) { // Left mouse button
            isMouseDown = true;
        }
    }, false);

    document.addEventListener('mouseup', function (event) {
        if (event.button === 0) { // Left mouse button
            isMouseDown = false;
        }
    }, false);

    document.addEventListener('mousemove', function (event) {
        if (isMouseDown) {
            const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

            camera.rotation.y -= movementX * 0.002;
            camera.rotation.x -= movementY * 0.002;
            camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
        }
    }, false);
}

function chooseNextTargetOrb() {
    currentTargetOrb = orbs[Math.floor(Math.random() * orbs.length)];
    startTime = Date.now();
}

// Mouse move event listener for raycasting
document.addEventListener('mousemove', onMouseMove, false);

function onMouseMove(event) {
    event.preventDefault();

    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(orbs);

    if (intersects.length > 0) {
        const intersectedOrb = intersects[0].object;
        const metadata = orbMetadata[intersectedOrb.id];
        metadataDiv.innerHTML = `
            <strong>Advice:</strong> ${metadata.sentence}<br>
            <strong>Book Title:</strong> ${metadata.title}<br>
            <strong>Author:</strong> ${metadata.author}<br>
            <img src="${metadata.imageUrl}" alt="Book Cover" style="width:50px;height:auto;">
        `;
        metadataDiv.style.display = 'block';
    } else {
        metadataDiv.style.display = 'none';
    }
}

// Animate
function animate() {
    requestAnimationFrame(animate);

    if (isFlyMode && flyModeActive && currentTargetOrb) {
        const currentTime = Date.now();
        const elapsedTime = currentTime - startTime;
        const totalTime = Math.min(elapsedTime, changeTargetTime);

        const targetPosition = currentTargetOrb.position.clone();
        const direction = targetPosition.sub(camera.position).normalize();
        const speed = direction.multiplyScalar(totalTime / travelTime);
        camera.position.add(speed);
        camera.lookAt(targetPosition);

        if (elapsedTime >= changeTargetTime) {
            chooseNextTargetOrb(); // Choose a new target every 30 seconds
        }
    }

    renderer.render(scene, camera);
}

animate();
