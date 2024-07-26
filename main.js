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
                imagePath: `https://hijaz.github.io/wisdom/${orb.imagePath}`
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
        mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
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
            <img src="${latestMetadata.imagePath}" alt="Book Cover">
            <div class="text">
                <div class="advice">${latestMetadata.sentence}</div>
                <div class="book-title">${latestMetadata.title}</div>
                <div class="author">${latestMetadata.author}</div>
            </div>
        </div>
    `;
}

// Function to populate virtualized log modal
function populateLogModal() {
    const logContent = document.getElementById('logContent');
    logContent.innerHTML = ''; // Clear existing content

    const virtualItems = metadataArray.slice().reverse();
    const itemHeight = 100; // Adjust based on your item height

    logContent.style.height = `${virtualItems.length * itemHeight}px`;

    console.log("Populating log modal with items:", virtualItems.length); // Debug log

    virtualItems.forEach((data, index) => {
        const item = document.createElement('div');
        item.className = 'virtualized-item';
        item.style.top = `${index * itemHeight}px`; // Adjust based on your item height
        item.innerHTML = `
            <div class="metadata-item">
                <img src="${data.imagePath}" alt="Book Cover">
                <div class="text">
                    <div class="advice">${data.sentence}</div>
                    <div class="book-title">${data.title}</div>
                    <div class="author">${data.author}</div>
                </div>
            </div>
        `;
        logContent.appendChild(item);

        console.log("Added item to log modal:", data); // Debug log
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.visibility = 'visible';
                console.log("Item is visible:", entry.target); // Debug log
            } else {
                entry.target.style.visibility = 'hidden';
            }
        });
    }, {
        root: logContent,
        threshold: 0.1
    });

    document.querySelectorAll('.virtualized-item').forEach(item => observer.observe(item));
}



// Populate about modal with project information and instructions
function populateAboutModal() {
    aboutModal.innerHTML = `
<div class="modal-content about-modal-content">
    <span class="close">&times;</span>
    <h2>Wisdom</h2>
    <p>This project visualizes thousands of insights from over 1,200 productivity and self-improvement books in a detailed 3D map. Similar suggestions are grouped together for easier exploration.</p>
    <h3>How to Use</h3>
    <p><strong>Fly Mode:</strong> The camera will automatically navigate through the orbs for you.</p>
    <p><strong>Explore Mode:</strong> You can manually navigate the 3D space. Click and drag to rotate the view, and use the zoom in/out buttons to adjust your perspective.</p>
    <p><strong>Log:</strong> Opens a modal displaying all the unique pieces of guidance you have come across so far.</p>
    <p>On desktop, hover over an orb to see the associated tip. On mobile, tap the orb to view the tip.</p>
    <p>Created by <a href="https://hassanijaz.com" target="_blank">Hassan Ijaz</a></p>
    <hr class="separator">
    <p class="music-credit">Music by <a href="https://pixabay.com/users/lorenzobuczek-16982400/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=179451">LAURENT BUCZEK</a> from <a href="https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=179451">Pixabay</a></p>
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


