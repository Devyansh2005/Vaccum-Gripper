import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);
scene.fog = new THREE.Fog(0x050505, 20, 100);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(10, 8, 15);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.target.set(0, 3, 0);
controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't allow camera to go far below ground

// --- Lighting & Environment ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x00e5ff, 2, 20);
pointLight.position.set(-5, 5, -5);
scene.add(pointLight);

// Floor grid and ground
const gridHelper = new THREE.GridHelper(20, 40, 0x00e5ff, 0x444444);
gridHelper.material.opacity = 0.2;
gridHelper.material.transparent = true;
scene.add(gridHelper);

const planeGeometry = new THREE.PlaneGeometry(50, 50);
const planeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x0a0a0a,
    roughness: 0.1,
    metalness: 0.8
});
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -0.01; // Slightly below grid
plane.receiveShadow = true;
scene.add(plane);

// --- Robot Construction (Forward Kinematics) ---
// Materials
const mainMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.3 });
const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.2, metalness: 0.8 });
const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.5, metalness: 0.5 });
const suctionMaterial = new THREE.MeshStandardMaterial({ color: 0xff3366, roughness: 0.8, metalness: 0.1 }); // distinct color for suction cup

// Helper function to create a link
function createLink(radiusTop, radiusBottom, height, colorMat) {
    const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 32);
    geo.translate(0, height / 2, 0); // Move origin to base of cylinder
    const mesh = new THREE.Mesh(geo, colorMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// Helper to create a joint visual
function createJointVisual() {
    const geo = new THREE.SphereGeometry(0.6, 32, 32);
    const mesh = new THREE.Mesh(geo, jointMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// Configuration: Yaw - Roll - Roll - Yaw - Roll - Yaw
const robotBase = new THREE.Group();
scene.add(robotBase);

// Base Pedestal (Static)
const pedestal = createLink(1.5, 2, 0.5, mainMaterial);
robotBase.add(pedestal);

// Joint 1: Base (Yaw - Y axis)
const joint1 = new THREE.Group();
joint1.position.y = 0.5;
robotBase.add(joint1);

const link1 = createLink(1.2, 1.2, 2, mainMaterial);
joint1.add(link1);

// Joint 2: Shoulder (Roll - X axis)
const joint2 = new THREE.Group();
joint2.position.y = 2; // top of link1
joint1.add(joint2);

const j2Visual = createJointVisual();
joint2.add(j2Visual);

const link2 = createLink(0.8, 0.8, 3.5, accentMaterial);
joint2.add(link2);

// Joint 3: Elbow (Roll - X axis)
const joint3 = new THREE.Group();
joint3.position.y = 3.5; // top of link2
joint2.add(joint3);

const j3Visual = createJointVisual();
joint3.add(j3Visual);

const link3 = createLink(0.6, 0.6, 3, mainMaterial);
joint3.add(link3);

// Joint 4: Wrist 1 (Yaw - Y axis)
const joint4 = new THREE.Group();
joint4.position.y = 3; // top of link3
joint3.add(joint4);

const link4 = createLink(0.5, 0.5, 1.5, accentMaterial);
joint4.add(link4);

// Joint 5: Wrist 2 (Roll - X axis)
const joint5 = new THREE.Group();
joint5.position.y = 1.5; // top of link4
joint4.add(joint5);

const j5Visual = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 32), jointMaterial);
joint5.add(j5Visual);

const link5 = createLink(0.4, 0.4, 1, mainMaterial);
joint5.add(link5);

// Joint 6: Suction Base (Yaw - Y axis)
const joint6 = new THREE.Group();
joint6.position.y = 1; // top of link5
joint5.add(joint6);

// Suction cup base visual
const suctionBaseGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 32);
suctionBaseGeo.translate(0, 0.15, 0);
const suctionBase = new THREE.Mesh(suctionBaseGeo, mainMaterial);
suctionBase.castShadow = true;
joint6.add(suctionBase);

// Suction cup
const cupGeo = new THREE.CylinderGeometry(0.6, 0.3, 0.4, 32, 1, true); // open ended cone
cupGeo.translate(0, 0.5, 0);
const suctionCup = new THREE.Mesh(cupGeo, suctionMaterial);
suctionCup.material.side = THREE.DoubleSide;
suctionCup.castShadow = true;
joint6.add(suctionCup);

// Add a grasp point at the center of the suction cup
const graspPoint = new THREE.Object3D();
graspPoint.position.set(0, 0.7, 0); // bottom of the cup
joint6.add(graspPoint);

// --- Pickable Objects (Paper) ---
const pickables = [];
// Paper geometry (thin box)
const paperGeo = new THREE.BoxGeometry(1.2, 0.05, 0.8);
const paperColors = [0xffffff, 0xffd700, 0xadd8e6]; // white, gold, lightblue

paperColors.forEach((color, i) => {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    const paper = new THREE.Mesh(paperGeo, mat);
    // position paper flat on the ground
    paper.position.set(4 * Math.cos(i * Math.PI / 1.5), 0.025, 4 * Math.sin(i * Math.PI / 1.5));
    // add some random rotation so it looks natural
    paper.rotation.y = Math.random() * Math.PI;
    paper.castShadow = true;
    paper.receiveShadow = true;
    scene.add(paper);
    pickables.push(paper);
});

// Keep references to joints for UI control
const joints = [joint1, joint2, joint3, joint4, joint5, joint6];
const axes = ['y', 'x', 'x', 'y', 'x', 'y']; // The axis of rotation for each joint

// --- UI Logic ---
const sliders = [];
const valDisplays = [];

for (let i = 1; i <= 6; i++) {
    const slider = document.getElementById(`joint${i}`);
    const display = document.getElementById(`val${i}`);
    
    sliders.push(slider);
    valDisplays.push(display);

    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        display.innerText = `${val}°`;
        // Convert to radians and apply to the correct axis
        joints[i - 1].rotation[axes[i - 1]] = THREE.MathUtils.degToRad(val);
    });
}

document.getElementById('reset-btn').addEventListener('click', () => {
    sliders.forEach((slider, index) => {
        slider.value = 0;
        valDisplays[index].innerText = `0°`;
        joints[index].rotation[axes[index]] = 0;
    });
});

// --- Suction Logic ---
let isSuctionOn = false;
let heldObject = null;
const suctionBtn = document.getElementById('suction-btn');
const worldPosTarget = new THREE.Vector3();
const objWorldPos = new THREE.Vector3();

suctionBtn.addEventListener('click', () => {
    isSuctionOn = !isSuctionOn;
    if (isSuctionOn) {
        suctionBtn.innerText = 'Release Suction';
        suctionBtn.style.background = 'rgba(255, 51, 102, 0.2)';
        suctionBtn.style.borderColor = '#ff3366';
        suctionBtn.style.color = '#ff3366';
        
        // Check distance to pickables
        graspPoint.getWorldPosition(worldPosTarget);
        let closest = null;
        let minDist = 1.0; // grab threshold
        
        pickables.forEach(obj => {
            obj.getWorldPosition(objWorldPos);
            const dist = worldPosTarget.distanceTo(objWorldPos);
            if (dist < minDist) {
                minDist = dist;
                closest = obj;
            }
        });
        
        if (closest) {
            heldObject = closest;
            // Add directly to graspPoint to change its coordinate space without maintaining world position.
            graspPoint.add(heldObject);
            
            // Now zero out local transforms so it lies flat exactly at the suction cup center.
            heldObject.position.set(0, 0, 0);
            heldObject.rotation.set(0, 0, 0);
        }
    } else {
        suctionBtn.innerText = 'Toggle Suction';
        suctionBtn.style.background = '';
        suctionBtn.style.borderColor = '';
        suctionBtn.style.color = '';
        
        if (heldObject) {
            scene.attach(heldObject);
            heldObject.getWorldPosition(objWorldPos);
            
            // Snap to floor if released
            heldObject.position.y = 0.025; // paper half-height
            
            // Reset rotation to flat on floor
            const currentYRot = heldObject.rotation.y;
            heldObject.rotation.set(0, currentYRot, 0);
            
            heldObject = null;
        }
    }
});

// Initial posture tweak for better visualization out of the box
sliders[1].value = 30; // Shoulder
sliders[1].dispatchEvent(new Event('input'));
sliders[2].value = -60; // Elbow
sliders[2].dispatchEvent(new Event('input'));
sliders[4].value = -30; // Wrist
sliders[4].dispatchEvent(new Event('input'));


// --- Window Resize Handling ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---
const tweenGroup = new TWEEN.Group();

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    tweenGroup.update(); // explicitly update our group
    renderer.render(scene, camera);
}

animate();

// --- Auto-Pilot Sequence Logic ---
const autoPilotBtn = document.getElementById('auto-pilot-btn');
const controlsContainer = document.querySelector('.controls-container');

function moveJointsTo(targetAngles, duration = 1000) {
    return new Promise((resolve, reject) => {
        try {
            const startObj = {};
            const endObj = {};
            sliders.forEach((s, i) => {
                startObj[i] = parseFloat(s.value);
                endObj[i] = targetAngles[i];
            });

            new TWEEN.Tween(startObj, tweenGroup)
                .to(endObj, duration)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate((obj) => {
                    sliders.forEach((slider, i) => {
                        slider.value = obj[i];
                        slider.dispatchEvent(new Event('input'));
                    });
                })
                .onComplete(() => resolve())
                .start();
        } catch (e) {
            console.error(e);
            reject(e);
        }
    });
}

autoPilotBtn.addEventListener('click', async () => {
    if (autoPilotBtn.classList.contains('running')) return;
    
    try {
        // Disable UI
        autoPilotBtn.classList.add('running');
        autoPilotBtn.innerText = 'Auto-Pilot Active...';
        Array.from(controlsContainer.children).forEach(child => {
            if (child.id !== 'auto-pilot-btn') child.classList.add('disabled-control');
        });

        // Make sure suction is off initially
        if (isSuctionOn) suctionBtn.click();

        // Wait a brief moment before starting
        await new Promise(r => setTimeout(r, 500));

        // Sequence
        // 1. Reset posture
        await moveJointsTo([0, 0, 0, 0, 0, 0], 1000);
        
        // 2. Hover over paper 1 (which is at angle 0)
        await moveJointsTo([0, 40, -50, 0, -80, 0], 1500);
        
        // 3. Descend
        await moveJointsTo([0, 55, -70, 0, -75, 0], 1000);
        
        // 4. Toggle Suction ON
        suctionBtn.click();
        await new Promise(r => setTimeout(r, 500));
        
        // 5. Lift
        await moveJointsTo([0, 20, -30, 0, -80, 0], 1000);
        
        // 6. Swing to Drop Zone (90 degrees)
        await moveJointsTo([90, 20, -30, 0, -80, 0], 1500);
        
        // 7. Descend to drop
        await moveJointsTo([90, 45, -60, 0, -75, 0], 1000);
        
        // 8. Toggle Suction OFF
        suctionBtn.click();
        await new Promise(r => setTimeout(r, 500));
        
        // 9. Lift and Return to Home
        await moveJointsTo([90, 0, 0, 0, 0, 0], 1000);
        await moveJointsTo([0, 0, 0, 0, 0, 0], 1000);
        
    } catch (error) {
        alert("Auto-Pilot Error: " + error.message);
        console.error(error);
    } finally {
        // Re-enable UI
        autoPilotBtn.classList.remove('running');
        autoPilotBtn.innerText = 'Run Auto-Pilot';
        Array.from(controlsContainer.children).forEach(child => {
            child.classList.remove('disabled-control');
        });
    }
});
