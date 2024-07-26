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
const logButton = document.getElementById('logButton');
const aboutButton = document.getElementById('aboutButton');
const metadataDiv = document.getElementById('metadata');
const logModal = document.getElementById('logModal');
const logContent = document.getElementById('logContent');
const aboutModal = document.getElementById('aboutModal');

let isFlyMode = true; // Default to fly mode
let currentTargetOrb = null;
let flyModeActive = false;
let startTime = 0;
const travelTime = 60 * 1000; // Travel time in milliseconds
const changeTargetTime = 15 * 1000; // Change target every 15 seconds
let metadataSet = new Set(); // Set to store unique metadata messages
let metadataArray = []; // Array to store metadata messages

// Create a group for the orbs
const orbGroup = new THREE.Group();
scene.add(orbGroup);

// For raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Add background music
const backgroundMusic = new Audio('background_music.mp3');
backgroundMusic.loop = true;

function initializeEventListeners() {
    instructions.addEventListener('click', function () {
        blocker.style.display = 'none';
        startFlyMode();
    }, false);

    flyModeButton.addEventListener('click', function () {
        isFlyMode = true;
        flyModeButton.disabled = true;
        exploreModeButton.disabled = false;
        zoomInButton.style.display = 'none';
        zoomOutButton.style.display = 'none';
        startFlyMode();
    });

    exploreModeButton.addEventListener('click', function () {
        isFlyMode = false;
        flyModeButton.disabled = false;
        exploreModeButton.disabled = true;
        zoomInButton.style.display = 'block';
        zoomOutButton.style.display = 'block';
        startExploreMode();
    });

    zoomInButton.addEventListener('click', function () {
        camera.position.z -= 10;
    });

    zoomOutButton.addEventListener('click', function () {
        camera.position.z += 10;
    });

    logButton.addEventListener('click', function () {
        logModal.style.display = 'block';
        populateLogModal();
    });

    aboutButton.addEventListener('click', function () {
        aboutModal.style.display = 'block';
    });

    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('close')) {
            if (event.target.parentElement.parentElement === logModal) {
                logModal.style.display = 'none';
            }
            if (event.target.parentElement.parentElement === aboutModal) {
                aboutModal.style.display = 'none';
            }
        }
    });

    window.addEventListener('click', function (event) {
        if (event.target === logModal) {
            logModal.style.display = 'none';
        }
        if (event.target === aboutModal) {
            aboutModal.style.display = 'none';
        }
    });

    // Touch events for mobile and tablet
    document.addEventListener('touchstart', function (event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            handleOrbSelection();
        }
    }, false);
}

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
            orbGroup.add(sphere);

            orbMetadata[sphere.id] = {
                sentence: orb.sentence,
                title: orb.title,
                author: orb.author,
                imageUrl: orb.imageUrl
            }; // Store metadata

            return sphere;
        });

        initializeEventListeners();

        startFlyMode();
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
    backgroundMusic.play();
}

function startExploreMode() {
    flyModeActive = false;
    backgroundMusic.pause();

    camera.position.set(0, 0, 100); // Set camera position for explore mode
    camera.lookAt(0, 0, 0); // Point camera at the center

    let isDragging = false;
    let previousMousePosition = {
        x: 0,
        y: 0
    };

    document.addEventListener('mousedown', function (event) {
        if (event.button === 0) { // Left mouse button
            isDragging = true;
            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    }, false);

    document.addEventListener('mouseup', function (event) {
        if (event.button === 0) { // Left mouse button
            isDragging = false;
        }
    }, false);

    document.addEventListener('mousemove', function (event) {
        if (isDragging) {
            const deltaMove = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y
            };

            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    toRadians(deltaMove.y * 1),
                    toRadians(deltaMove.x * 1),
                    0,
                    'XYZ'
                ));

            orbGroup.quaternion.multiplyQuaternions(deltaRotationQuaternion, orbGroup.quaternion);

            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    }, false);

    // Touch event handling for rotation
    document.addEventListener('touchstart', function (event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            isDragging = true;
            previousMousePosition = {
                x: touch.clientX,
                y: touch.clientY
            };
        }
    }, false);

    document.addEventListener('touchend', function (event) {
        if (event.touches.length === 0) {
            isDragging = false;
        }
    }, false);

    document.addEventListener('touchmove', function (event) {
        if (isDragging && event.touches.length === 1) {
            const touch = event.touches[0];
            const deltaMove = {
                x: touch.clientX - previousMousePosition.x,
                y: touch.clientY - previousMousePosition.y
            };

            const deltaRotationQuaternion = new THREE.Quaternion()
                .setFromEuler(new THREE.Euler(
                    toRadians(deltaMove.y * 1),
                    toRadians(deltaMove.x * 1),
                    0,
                    'XYZ'
                ));

            orbGroup.quaternion.multiplyQuaternions(deltaRotationQuaternion, orbGroup.quaternion);

            previousMousePosition = {
                x: touch.clientX,
                y: touch.clientY
            };
        }
    }, false);
}

function chooseNextTargetOrb() {
    currentTargetOrb = orbs[Math.floor(Math.random() * orbs.length)];
    startTime = Date.now();
}

function toRadians(angle) {
    return angle * (Math.PI / 180);
}

// Mouse move event listener for raycasting
document.addEventListener('mousemove', onMouseMove, false);
document.addEventListener('touchmove', onMouseMove, false);

function onMouseMove(event) {
    event.preventDefault();

    if (event.touches) {
        const touch = event.touches[0];
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(touch        .clientY / window.innerHeight) * 2 + 1;
    } else {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    handleOrbSelection();
}

function handleOrbSelection() {
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(orbGroup.children);

    if (intersects.length > 0) {
        const intersectedOrb = intersects[0].object;
        const metadata = orbMetadata[intersectedOrb.id];

        // Add unique metadata to the set and update the display
        if (!metadataSet.has(metadata.sentence)) {
            metadataSet.add(metadata.sentence);
            metadataArray.push(metadata);
            updateMetadataDisplay();

            metadataDiv.style.display = 'block';
        }
    }
}

// Update metadata display
function updateMetadataDisplay() {
    const latestMetadata = metadataArray[metadataArray.length - 1];
    metadataDiv.innerHTML = `
        <div class="metadata-item">
            <img src="${latestMetadata.imageUrl}" alt="Book Cover">
            <div class="text">
                <div class="advice">${latestMetadata.sentence}</div>
                <div class="book-title">${latestMetadata.title}</div>
                <div class="author">${latestMetadata.author}</div>
            </div>
        </div>
    `;
}

// Populate log modal with all unique metadata
function populateLogModal() {
    let logHTML = '';
    metadataArray.slice().reverse().forEach(data => {
        logHTML += `
            <div class="metadata-item">
                <img src="${data.imageUrl}" alt="Book Cover">
                <div class="text">
                    <div class="advice">${data.sentence}</div>
                    <div class="book-title">${data.title}</div>
                    <div class="author">${data.author}</div>
                </div>
            </div>
            <hr>
        `;
    });
    logContent.innerHTML = logHTML;
}

// Populate about modal with project information and instructions
function populateAboutModal() {
    aboutModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Wisdom</h2>
            <p>This project visualizes thousands of suggestions from over 1200 productivity and self-improvement books in a 3D map based on their similarity.</p>
            <h3>How to Use</h3>
            <p><strong>Fly Mode:</strong> The camera automatically navigates through the orbs, focusing on different pieces of advice every 15 seconds.</p>
            <p><strong>Explore Mode:</strong> You can manually navigate the 3D space. Click and drag to rotate the view. Use the zoom in/out buttons to adjust the view.</p>
            <p><strong>Log:</strong> Opens a modal displaying all unique pieces of advice you have encountered so far.</p>
        </div>
    `;
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
            chooseNextTargetOrb(); // Choose a new target every 15 seconds
        }
    }

    renderer.render(scene, camera);
}

populateAboutModal();
animate();

