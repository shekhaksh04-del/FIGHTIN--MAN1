

/* --------------------------------------------------------------------------
   THREE.JS GRAPHICS ENGINE PIPELINE
   -------------------------------------------------------------------------- */

class GraphicEngine {
    constructor() {
        this.container = document.getElementById('canvas-container');
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x10171e);
        this.scene.fog = new THREE.FogExp2(0x10171e, 0.0035);

        // Camera setup (TPS)
        this.camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.container.appendChild(this.renderer.domElement);

        // Lighting setup for rugged realistic atmosphere
        this.setupLights();

        // Handle resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupLights() {
        // Ambient light for dark shadows
        const ambient = new THREE.AmbientLight(0x3a4b5c, 0.6);
        this.scene.add(ambient);

        // Directional Sun Light
        this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
        this.sunLight.position.set(120, 200, 80);
        this.sunLight.castShadow = true;
        
        // Shadow camera bounds
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        
        const d = 250;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0005;

        this.scene.add(this.sunLight);

        // Secondary rim/fill light for atmospheric depth
        const fillLight = new THREE.DirectionalLight(0x34495e, 0.4);
        fillLight.position.set(-100, 50, -100);
        this.scene.add(fillLight);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
