// portfolio/src/scripts/pcbShowcaseLogic.js
console.log('[Astro Client] pcbShowcaseLogic.js script started');
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

// Get pcbModelsData from the data attribute on the section element
const pcbShowcaseSection = document.getElementById('pcb-3d-showcase');
let pcbModelsData = [];

function tryLoadPcbModelsData() {
    if (pcbShowcaseSection && pcbShowcaseSection.dataset.pcbModels) {
        try {
            const rawData = pcbShowcaseSection.dataset.pcbModels;
            if (rawData && rawData.trim() !== "") {
                pcbModelsData = JSON.parse(rawData);
                console.log('[Astro Client] pcbModelsData loaded from data attribute:', pcbModelsData);
                return true;
            } else {
                console.warn('[Astro Client] pcbModelsData data attribute is present but empty.');
                return false;
            }
        } catch (e) {
            console.error('[Astro Client] Error parsing pcbModelsData from data attribute:', e);
            return false;
        }
    } else {
        console.warn('[Astro Client] pcbModelsData data attribute not found on #pcb-3d-showcase section.');
        return false;
    }
}

// --- Global State & Config ---
let threeScene, camera, renderer, controls, raycaster, mouse, composer, outlinePass;
let dynamicPointLight, currentLoadedModel, pcbMaterial;
let pcbContainer,
    loadingIndicator,
    thumbnailContainer,
    thumbnailWrapper, // Added for fade control
    prevArrow,
    nextArrow; // Will be queried
const annotations = {};
let currentHoveredHotspot = null;
const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
).matches;
const USE_PLACEHOLDER_PRIMITIVES = false; // Set to false to use GLB files
const DEBUG_MATERIAL = false; // Flag to use basic material for GLB models

// Fresnel Shader code removed as per plan

// --- Utility Functions ---
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        // Use rest parameters
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

function worldToScreen(object, cameraInstance, rendererInstance) {
    const vector = new THREE.Vector3();
    object.updateMatrixWorld();
    vector.setFromMatrixPosition(object.matrixWorld);
    vector.project(cameraInstance);
    const widthHalf =
        (0.5 * rendererInstance.domElement.width) /
        rendererInstance.getPixelRatio();
    const heightHalf =
        (0.5 * rendererInstance.domElement.height) /
        rendererInstance.getPixelRatio();
    vector.x = vector.x * widthHalf + widthHalf;
    vector.y = -(vector.y * heightHalf) + heightHalf;
    return { x: vector.x, y: vector.y };
}

// --- Three.js Scene Setup ---
function initThreeJS() {
    console.log('[Astro Client] initThreeJS called');
    pcbContainer = document.getElementById("pcb-3d-render-container");
    loadingIndicator = document.getElementById("loading-indicator");

    if (!pcbContainer) {
        console.error("3D container not found!");
        return;
    }
    if (!pcbModelsData || pcbModelsData.length === 0) {
        console.error("initThreeJS: CRITICAL - pcbModelsData is not available or empty. Cannot load initial model. This should have been caught by pre-init checks.");
        if (loadingIndicator) loadingIndicator.textContent = "Critical: Model data missing.";
        return; // Stop initialization if data is missing, though polling should prevent this.
    }

    threeScene = new THREE.Scene();
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    const aspect = pcbContainer.clientWidth / pcbContainer.clientHeight;
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 0, 0); // Explicitly look at origin for test cube

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(pcbContainer.clientWidth, pcbContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // Configure renderer for better visibility
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Adjust as needed

    pcbContainer.appendChild(renderer.domElement);

    // Initialize EffectComposer and Passes
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(threeScene, camera);
    composer.addPass(renderPass);

    outlinePass = new OutlinePass(new THREE.Vector2(pcbContainer.clientWidth, pcbContainer.clientHeight), threeScene, camera);
    composer.addPass(outlinePass);

    // Configure OutlinePass
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue("--color-accent-primary").trim() || "#58A6FF";
    outlinePass.selectedObjects = [];
    outlinePass.visibleEdgeColor.set(accentColor);
    outlinePass.hiddenEdgeColor.set(accentColor);
    outlinePass.edgeStrength = 5;  // Adjust for desired intensity
    outlinePass.edgeGlow = 1.5;    // Key parameter for glow.
    outlinePass.edgeThickness = 0.5; // Adjust for desired thickness
    outlinePass.pulsePeriod = 0;   // 0 for static glow

    // Add Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Color, Intensity
    threeScene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.8); // Increased intensity
    threeScene.add(hemiLight);
    // const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.25); // Further reduced intensity
    // dirLight1.position.set(8, 12, 8);
    // threeScene.add(dirLight1);

    dynamicPointLight = new THREE.PointLight(0xffccaa, 0.5, 150, 2.5); // Increased intensity
    dynamicPointLight.position.set(0, 2, 5);
    threeScene.add(dynamicPointLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 2;
    controls.maxDistance = 100;
    controls.autoRotate = !prefersReducedMotion;
    controls.autoRotateSpeed = 0.75;
    controls.target.set(0, 0, 0);

    // New pcbMaterial
    pcbMaterial = new THREE.MeshStandardMaterial({
        color: 0x009988, // Brighter base color
        metalness: 0.3,
        roughness: 0.5, // Slightly less rough
        side: THREE.DoubleSide, // Keep if necessary for your models
        emissive: 0x111111, // Slight emissive component
        emissiveIntensity: 0.5 // Intensity of the emissive component
    });

    if (pcbModelsData && pcbModelsData.length > 0) {
        console.log("[Astro Client] initThreeJS: Attempting to load initial model:", pcbModelsData[0]);
        loadPCBModel(pcbModelsData[0]);
    } else {
        // This case should ideally not be reached if pre-init checks are effective
        console.warn("[Astro Client] initThreeJS: No PCB models available to load initially, though pcbModelsData might exist but be empty.");
        if (loadingIndicator) {
            loadingIndicator.textContent = "No models available for display.";
            loadingIndicator.style.display = "block";
        }
    }
    // console.log("[Debug] GLB model loading temporarily disabled for test cube visibility check."); // Keep for now if still debugging other parts

    renderer.domElement.addEventListener(
        "pointermove",
        onCanvasPointerMove,
        false,
    );
    renderer.domElement.addEventListener("click", onCanvasClick, false);
    window.addEventListener("resize", onWindowResize, false);
    onWindowResize(); // Initial call
    animateThreeJS();
}

function loadPCBModel(modelData) {
    if (!modelData || !modelData.key) {
        console.error("Invalid modelData:", modelData);
        return;
    }
    const modelKey = modelData.key;

    // Update dynamic description
    const descriptionElement = document.getElementById('pcb-dynamic-description');
    if (descriptionElement) {
        descriptionElement.textContent = modelData.shortDescription || 'Select a model to see its description.';
    }

    // Update dynamic link
    const linkElement = document.getElementById('pcb-dynamic-link');
    const linkWrapper = linkElement ? linkElement.parentElement : null;

    if (linkElement && linkWrapper) {
        if (modelData.githubUrl) {
            linkElement.href = modelData.githubUrl;
            linkWrapper.style.display = 'block'; // Or remove a 'hidden' class
        } else {
            linkWrapper.style.display = 'none'; // Or add a 'hidden' class
        }
    }

    if (currentLoadedModel) {
        threeScene.remove(currentLoadedModel);
        if (currentLoadedModel.geometry)
            currentLoadedModel.geometry.dispose(); // For Meshes
        // For GLTF scenes, dispose materials and geometries of children
        currentLoadedModel.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach((material) =>
                            material.dispose(),
                        );
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        Object.keys(annotations).forEach((key) => {
            if (annotations[key].remove) annotations[key].remove();
            delete annotations[key];
        });
        currentHoveredHotspot = null;
    }
    if (loadingIndicator) {
        loadingIndicator.style.display = "block";
        loadingIndicator.textContent = `Loading ${modelData.name || modelKey}...`;
    }

    if (USE_PLACEHOLDER_PRIMITIVES) {
        let geometry;
        let modelScale = 1.5;
        if (modelKey === "pcb_model_1") {
            geometry = new THREE.BoxGeometry(1, 1, 1);
        } else if (modelKey === "pcb_model_2") {
            geometry = new THREE.SphereGeometry(0.75, 32, 32);
        } else if (modelKey === "pcb_model_3") {
            geometry = new THREE.TorusKnotGeometry(0.6, 0.2, 100, 16);
            modelScale = 1.2;
        } else if (modelKey === "pcb_model_4") {
            geometry = new THREE.OctahedronGeometry(0.9);
        } else if (modelKey === "pcb_model_5") {
            geometry = new THREE.IcosahedronGeometry(0.8);
        } else if (modelKey === "pcb_model_6") {
            geometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32);
            modelScale = 1.0;
        } else if (modelKey === "pcb_model_7") {
            geometry = new THREE.TorusGeometry(0.7, 0.25, 16, 100);
            modelScale = 1.3;
        } else if (modelKey === "pcb_model_8") {
            geometry = new THREE.CapsuleGeometry(0.5, 1, 4, 8);
            modelScale = 1.1;
        } else if (modelKey === "pcb_model_9") {
            geometry = new THREE.PlaneGeometry(1.5, 1.5);
            modelScale = 1.0;
        } else if (modelKey === "pcb_model_10") {
            geometry = new THREE.ConeGeometry(0.7, 1.5, 32);
            modelScale = 1.0;
        } else if (modelKey === "pcb_model_11") {
            geometry = new THREE.DodecahedronGeometry(0.7);
        } else if (modelKey === "pcb_model_12") {
            geometry = new THREE.TetrahedronGeometry(0.9);
        } else if (modelKey === "pcb_model_13") {
            const points = [];
            for (let i = 0; i < 10; i++) {
                points.push(
                    new THREE.Vector2(
                        Math.sin(i * 0.2) * 0.5 + 0.25,
                        (i - 5) * 0.08,
                    ),
                );
            }
            geometry = new THREE.LatheGeometry(points);
            modelScale = 1.2;
        } else if (modelKey === "pcb_model_14") {
            geometry = new THREE.RingGeometry(0.4, 0.7, 32);
            modelScale = 1.2;
        } else if (modelKey === "pcb_model_15") {
            const path = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.5, 0, 0),
                new THREE.Vector3(0, 0.5, 0),
                new THREE.Vector3(0.5, 0, 0),
            ]);
            geometry = new THREE.TubeGeometry(path, 20, 0.1, 8, false);
            modelScale = 1.5;
        } else {
            geometry = new THREE.BoxGeometry(1, 1, 1);
        } // Default

        currentLoadedModel = new THREE.Mesh(geometry, pcbMaterial);
        currentLoadedModel.scale.set(modelScale, modelScale, modelScale);
        threeScene.add(currentLoadedModel);
        currentLoadedModel.userData.sourceKey = modelKey;

        if (outlinePass && currentLoadedModel) { // Add placeholder to outline
            outlinePass.selectedObjects = [currentLoadedModel];
        }

        camera.position.set(0, 1, 5);
        controls.target.set(0, 0, 0);
        controls.update();
        controls.autoRotate = !prefersReducedMotion; // Explicitly set based on preference
        if (loadingIndicator) loadingIndicator.style.display = "none";
        console.log(`Placeholder ${modelData.name || modelKey} loaded.`);
    } else {
        // Use modelData.modelPath which should be like '/assets/models/pcb_model_1.glb'
        const modelPath = modelData.modelPath;
        if (!modelPath) {
            console.error("Model path not defined for:", modelData);
            if (loadingIndicator)
                loadingIndicator.textContent = "Model path error.";
            return;
        }
        const loader = new GLTFLoader();
        loader.load(
            modelPath,
            (gltf) => {
                currentLoadedModel = gltf.scene;
                currentLoadedModel.userData.sourcePath = modelPath; // Store the path used

                if (outlinePass) {
                    outlinePass.selectedObjects = []; // Clear for new model
                }

                currentLoadedModel.traverse((child) => {
                    if (child.isMesh) {
                        if (child.name.startsWith("hotspot_")) {
                            child.userData.isHotspot = true;
                            child.userData.info = child.name
                                .replace("hotspot_", "")
                                .replace(/_/g, " ");
                            child.material = new THREE.MeshBasicMaterial({
                                visible: false,
                                depthTest: false,
                            });
                        } else {
                            console.log(`[Debug] Applying material to mesh: ${child.name}`, child);
                            console.log(`[Debug] Mesh: ${child.name}, Position Attribute:`, child.geometry.attributes.position);
                            console.log(`[Debug] Mesh: ${child.name}, Normal Attribute:`, child.geometry.attributes.normal);
                            if (child.geometry && !child.geometry.attributes.normal) {
                                console.log(`[Debug] Computing vertex normals for mesh: ${child.name}`);
                                child.geometry.computeVertexNormals();
                                console.log(`[Debug] Mesh: ${child.name}, Normal Attribute AFTER COMPUTE:`, child.geometry.attributes.normal);
                            }
                            if (DEBUG_MATERIAL && !USE_PLACEHOLDER_PRIMITIVES) {
                                console.log("[Debug] Using DEBUG MeshStandardMaterial for GLB model");
                                child.material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x222222, metalness: 0.1, roughness: 0.7, wireframe: false, side: THREE.DoubleSide });
                            } else { // This implies !DEBUG_MATERIAL, and we are in the !USE_PLACEHOLDER_PRIMITIVES block (GLB loading)
                                // Original GLB material is used by default if not overridden.
                                // No explicit assignment to child.material is needed here to preserve original materials.
                                console.log(`[Debug] Using original GLB material for mesh: ${child.name}`);
                            }
                            console.log(`[Debug] Final material for ${child.name}:`, child.material);
                            if (outlinePass && child.material) { // Add mesh to outline if it has a material
                                outlinePass.selectedObjects.push(child);
                                console.log(`[Debug] Added to OutlinePass: ${child.name}`);
                            }
                        }
                    }
                });
                threeScene.add(currentLoadedModel);
                const box = new THREE.Box3().setFromObject(
                    currentLoadedModel,
                );
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const fov = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / 1.8 / Math.tan(fov / 2));
                cameraZ = Math.max(cameraZ, controls.minDistance * 2);
                camera.position.set(
                    center.x,
                    center.y + size.y * 0.7, // Increased Y offset for a more top-down view
                    center.z + cameraZ,
                );
                controls.target.copy(center);
                controls.update(); // Ensure controls target is updated

                console.log(`Model ${modelPath} loaded.`);
                console.log("[Debug] Loaded GLB Scene:", gltf.scene);
                const loadedBox = new THREE.Box3().setFromObject(gltf.scene); // Re-calculate for precision if needed
                const loadedSize = loadedBox.getSize(new THREE.Vector3());
                const loadedCenter = loadedBox.getCenter(new THREE.Vector3());
                console.log("[Debug] Loaded Model - Size:", loadedSize, "Center:", loadedCenter);
                // Ensure camera is looking at the center of the loaded model
                camera.lookAt(loadedCenter); // Explicitly point camera
                controls.update(); // Update controls again after lookAt

                controls.autoRotate = !prefersReducedMotion; // Explicitly set based on preference
                if (loadingIndicator)
                    loadingIndicator.style.display = "none";
            },
            (xhr) => {
                if (loadingIndicator)
                    loadingIndicator.textContent = `Loading ${modelData.name || modelKey}: ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
            },
            (error) => {
                console.error(`Error loading ${modelPath}:`, error);
                if (loadingIndicator)
                    loadingIndicator.textContent = `Error loading.`;
            },
        );
    }
}

function onWindowResize() {
    if (!pcbContainer || !renderer || !camera) return;
    const newWidth = pcbContainer.clientWidth;
    const newHeight = pcbContainer.clientHeight;

    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(newWidth, newHeight);
    if (composer) {
        composer.setSize(newWidth, newHeight);
    }
}

function onCanvasPointerMove(event) {
    if (!renderer || !camera || !threeScene) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (dynamicPointLight && currentLoadedModel) {
        let modelCenter = USE_PLACEHOLDER_PRIMITIVES
            ? new THREE.Vector3(0, 0, 0)
            : new THREE.Box3()
                .setFromObject(currentLoadedModel)
                .getCenter(new THREE.Vector3());
        const planeNormal = camera.getWorldDirection(new THREE.Vector3());
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
            planeNormal,
            modelCenter,
        );
        const mousePoint = new THREE.Vector3();
        raycaster.setFromCamera(mouse, camera);
        if (raycaster.ray.intersectPlane(plane, mousePoint)) {
            const lightFollowStrength = 0.6;
            dynamicPointLight.position.lerp(
                mousePoint,
                lightFollowStrength,
            );
            dynamicPointLight.position.y = Math.max(
                dynamicPointLight.position.y,
                modelCenter.y + (USE_PLACEHOLDER_PRIMITIVES ? 0.5 : 1),
            );
            dynamicPointLight.position.z = THREE.MathUtils.lerp(
                dynamicPointLight.position.z,
                modelCenter.z + (USE_PLACEHOLDER_PRIMITIVES ? 1 : 3),
                0.1,
            );
        }
    }
    if (!USE_PLACEHOLDER_PRIMITIVES) {
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(
            threeScene.children,
            true,
        );
        let foundHotspot = null;
        for (let i = 0; i < intersects.length; i++) {
            if (
                intersects[i].object.userData &&
                intersects[i].object.userData.isHotspot
            ) {
                foundHotspot = intersects[i].object;
                break;
            }
        }
        if (currentHoveredHotspot !== foundHotspot) {
            if (
                currentHoveredHotspot &&
                annotations[currentHoveredHotspot.uuid]
            ) {
                annotations[currentHoveredHotspot.uuid].classList.remove(
                    "visible",
                );
            }
            currentHoveredHotspot = foundHotspot;
            if (currentHoveredHotspot) {
                showAnnotation(currentHoveredHotspot);
            }
        }
    }
}

function onCanvasClick(event) {
    if (!USE_PLACEHOLDER_PRIMITIVES && currentHoveredHotspot) {
        console.log(
            "Clicked hotspot:",
            currentHoveredHotspot.userData.info,
        );
    }
}

function showAnnotation(hotspotObject) {
    const hotspotId = hotspotObject.uuid;
    if (!annotations[hotspotId]) {
        const div = document.createElement("div");
        div.className = "annotation";
        div.textContent = hotspotObject.userData.info || "Hotspot";
        if (pcbContainer) pcbContainer.appendChild(div); // Ensure pcbContainer exists
        annotations[hotspotId] = div;
    }
    annotations[hotspotId].classList.add("visible");
}

function updateAnnotations() {
    if (!USE_PLACEHOLDER_PRIMITIVES && camera && renderer) {
        for (const id in annotations) {
            const hotspotObject = threeScene.getObjectByProperty(
                "uuid",
                id,
            );
            if (
                hotspotObject &&
                annotations[id].classList.contains("visible")
            ) {
                const screenPos = worldToScreen(
                    hotspotObject,
                    camera,
                    renderer,
                );
                annotations[id].style.left = `${screenPos.x}px`;
                annotations[id].style.top = `${screenPos.y}px`;
            } else if (annotations[id].classList.contains("visible")) {
                annotations[id].classList.remove("visible");
            }
        }
    }
}

function animateThreeJS() {
    requestAnimationFrame(animateThreeJS);
    if (controls) controls.update();
    if (
        currentLoadedModel &&
        USE_PLACEHOLDER_PRIMITIVES &&
        !prefersReducedMotion &&
        !controls.autoRotate
    ) {
        currentLoadedModel.rotation.x += 0.002;
        currentLoadedModel.rotation.y += 0.003;
    }
    // if (renderer && threeScene && camera) renderer.render(threeScene, camera); // Old rendering
    if (composer) composer.render(); // New rendering with post-processing

    if (!USE_PLACEHOLDER_PRIMITIVES) updateAnnotations();
}

// --- Initialize PCB Thumbnail Selector ---
function populateThumbnails() {
    console.log('[Astro Client] populateThumbnails called');
    thumbnailContainer = document.querySelector(".pcb-thumbnail-selector"); // Query inside function
    if (!thumbnailContainer) return;

    // The Astro template part already renders the thumbnails. This JS part is for interaction.
    document
        .querySelectorAll(".pcb-thumbnail-item")
        .forEach((thumbItem) => {
            thumbItem.addEventListener("click", () => {
                const modelKey = thumbItem.dataset.modelKey;
                // Ensure pcbModelsData is available and populated
                if (!pcbModelsData || pcbModelsData.length === 0) {
                    console.warn("populateThumbnails: pcbModelsData not available for click handler.");
                    return;
                }
                const modelToLoad = pcbModelsData.find(
                    (m) => m.key === modelKey,
                );
                if (
                    modelToLoad &&
                    currentLoadedModel?.userData?.sourceKey !== modelKey
                ) {
                    loadPCBModel(modelToLoad);
                    setActiveThumbnail(modelKey);
                }
            });
        });

    if (pcbModelsData && pcbModelsData.length > 0) {
        setActiveThumbnail(pcbModelsData[0].key);
    }
    updateScrollArrows();
}

function setActiveThumbnail(modelKey) {
    document.querySelectorAll(".pcb-thumbnail-item").forEach((item) => {
        item.classList.remove("active-model-thumbnail");
        if (item.dataset.modelKey === modelKey) {
            item.classList.add("active-model-thumbnail");
        }
    });
    updateScrollArrows();
}

function updateScrollArrows() {
    thumbnailContainer = document.querySelector(".pcb-thumbnail-selector");
    thumbnailWrapper = document.querySelector(".pcb-thumbnail-selector-wrapper");
    prevArrow = thumbnailWrapper?.querySelector(".prev-arrow");
    nextArrow = thumbnailWrapper?.querySelector(".next-arrow");

    if (!thumbnailContainer || !thumbnailWrapper || !prevArrow || !nextArrow) return;

    const scrollWidth = thumbnailContainer.scrollWidth;
    const clientWidth = thumbnailContainer.clientWidth;
    const scrollLeft = thumbnailContainer.scrollLeft;

    const isScrollable = scrollWidth > clientWidth + 1;

    if (isScrollable) {
        thumbnailContainer.classList.remove("is-centered");
        prevArrow.classList.remove("hidden");
        nextArrow.classList.remove("hidden");
        thumbnailWrapper.classList.remove("no-scroll-fades");

        prevArrow.disabled = scrollLeft <= 0;
        nextArrow.disabled = scrollLeft >= scrollWidth - clientWidth - 1;

        thumbnailWrapper.classList.toggle("can-scroll-left", scrollLeft > 1);
        thumbnailWrapper.classList.toggle(
            "can-scroll-right",
            scrollLeft < scrollWidth - clientWidth - 1
        );
    } else {
        thumbnailContainer.classList.add("is-centered");
        prevArrow.classList.add("hidden");
        nextArrow.classList.add("hidden");
        thumbnailWrapper.classList.add("no-scroll-fades");
        thumbnailWrapper.classList.remove("can-scroll-left");
        thumbnailWrapper.classList.remove("can-scroll-right");
    }
}

function setupThumbnailControls() {
    thumbnailContainer = document.querySelector(".pcb-thumbnail-selector");
    prevArrow = document.querySelector(
        ".pcb-thumbnail-selector-wrapper .prev-arrow",
    );
    nextArrow = document.querySelector(
        ".pcb-thumbnail-selector-wrapper .next-arrow",
    );

    if (prevArrow && nextArrow && thumbnailContainer) {
        prevArrow.addEventListener("click", () => {
            thumbnailContainer.scrollBy({
                left: -thumbnailContainer.clientWidth * 0.7,
                behavior: "smooth",
            });
        });
        nextArrow.addEventListener("click", () => {
            thumbnailContainer.scrollBy({
                left: thumbnailContainer.clientWidth * 0.7,
                behavior: "smooth",
            });
        });
        thumbnailContainer.addEventListener(
            "scroll",
            throttle(updateScrollArrows, 50),
        );
        new ResizeObserver(throttle(updateScrollArrows, 100)).observe(
            thumbnailContainer,
        );
    }
}

// --- Final DOM Ready Initializations ---
// This script is now a standard module. It will execute when parsed.
// DOM elements it needs should be available if the script tag is placed after them in the HTML,
// or if we wrap this initialization in a DOMContentLoaded listener.
// Given Astro's processing of <script src="...">, it's typically placed at the end of <body> or handled by Astro.
// For safety, let's wrap in DOMContentLoaded.

function mainInit() {
    console.log('[Astro Client] mainInit called.');
    initThreeJS();
    populateThumbnails();
    setupThumbnailControls();
    updateScrollArrows(); // Initial call after thumbnails are populated
}

function attemptDataLoadAndInit() {
    console.log('[Astro Client] attemptDataLoadAndInit called.');
    if (tryLoadPcbModelsData() && pcbModelsData.length > 0) {
        console.log('[Astro Client] pcbModelsData successfully loaded. Proceeding with mainInit.');
        mainInit();
    } else {
        console.warn('[Astro Client] pcbModelsData not immediately available or empty. Starting polling...');
        let attempts = 0;
        const maxAttempts = 15; // Poll for up to 3 seconds (15 * 200ms)
        const pollInterval = 200;

        const intervalId = setInterval(() => {
            attempts++;
            console.log(`[Astro Client] Polling for pcbModelsData, attempt ${attempts}`);
            if (tryLoadPcbModelsData() && pcbModelsData.length > 0) {
                clearInterval(intervalId);
                console.log('[Astro Client] pcbModelsData loaded via polling. Proceeding with mainInit.');
                mainInit();
            } else if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                console.error('[Astro Client] Failed to load pcbModelsData after multiple attempts. Initialization may fail or be incomplete.');
                // Optionally, still call mainInit to setup the rest of the UI,
                // but initThreeJS might fail gracefully or show an error.
                // Or, display a persistent error message to the user.
                const pcbContainer = document.getElementById("pcb-3d-render-container");
                if (pcbContainer) {
                    pcbContainer.innerHTML = '<p style="color: var(--color-text-primary); padding: 20px; text-align: center;">Failed to load 3D model data. Please try refreshing the page.</p>';
                }
                // Fallback: attempt to initialize other parts that don't depend on 3D models
                populateThumbnails(); // Thumbnails might still be renderable from HTML
                setupThumbnailControls();
                updateScrollArrows();
            }
        }, pollInterval);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attemptDataLoadAndInit);
} else {
    attemptDataLoadAndInit();
}