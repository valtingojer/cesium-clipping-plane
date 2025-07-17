// Main application file
class TinnyApp {
    constructor() {
        this.viewer = null;
        this.tileset = null;
        this.init();
    }
    
    async init() {
        try {
            // Set Cesium access token (you may need to use other models)
            // Cesium.Ion.defaultAccessToken = 'your-cesium-ion-access-token-here';
            
            this.setupViewer();
            await this.loadTileset();
            this.initializeClippingPlanes();
            this.setupControls();
            
            console.log('Tinny app initialized successfully');
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }
    
    setupViewer() {
        this.viewer = new Cesium.Viewer('cesiumContainer', {
            globe: false,
            skyBox: false,
            skyAtmosphere: false,
            fullscreenButton: true,
            baseLayerPicker: false,
            vrButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            animation: false,
            creditContainer: document.createElement('div'),
            terrainProvider: new Cesium.EllipsoidTerrainProvider()
        });
        
        this.viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#1e1e1e');
        
        this.viewer.scene.screenSpaceCameraController.enableRotate = true;
        this.viewer.scene.screenSpaceCameraController.enableTranslate = true;
        this.viewer.scene.screenSpaceCameraController.enableZoom = true;
        this.viewer.scene.screenSpaceCameraController.enableTilt = true;
        this.viewer.scene.screenSpaceCameraController.enableLook = true;
        
        console.log('Viewer setup complete');
    }
    
    async loadTileset() {
        try {
            this.tileset = await Cesium.Cesium3DTileset.fromUrl('/public/DigitalHubV2/tileset.json');
            
            // use transform to move tileset to world origin + 0.25 (0,0,0.25)
            // this is used so we don't have to set it on ion, nor expect it to be present on ifc
            // 0.25 is to ensure it is not on exact 0, creating a safety place for the grid
            const position = Cesium.Cartesian3.fromDegrees(0, 0, 0.25);
            const transform = Cesium.Transforms.eastNorthUpToFixedFrame(position);
            this.tileset.modelMatrix = transform;
            
            this.viewer.scene.primitives.add(this.tileset);
            await this.tileset.readyPromise;
            this.setupCameraAndGrid();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // ensure some visible tile is present before going backward
            setTimeout(()=>{
                this.viewer.camera.moveBackward(100);        
            }, 1000)
            
            console.log('Tileset loaded successfully');
        } catch (error) {
            console.error('Error loading tileset:', error);
            this.showError('Failed to load 3D model. Please check if the tileset.json file exists.');
        }
    }
    
    setupCameraAndGrid() {
        this.viewer.zoomTo(this.tileset);
        
        const boundingSphere = this.tileset.boundingSphere;
        const radius = boundingSphere.radius;
        const center = boundingSphere.center;
        
        const cartographic = Cesium.Cartographic.fromCartesian(center);
        const longitude = Cesium.Math.toDegrees(cartographic.longitude);
        const latitude = Cesium.Math.toDegrees(cartographic.latitude);
        const height = Math.max(cartographic.height * 2, 0) - 100;
        
        const gridWidth = radius * 50;
        const lineCount = Math.max(10, gridWidth / 10);
        
        this.createGridPlane(longitude, latitude, height, gridWidth, lineCount);
    }
    
    createGridPlane(longitude, latitude, height, width, lineCount) {
        const gridColor = new Cesium.Color(28/255, 34/255, 42/255, 0.5);
        const gridMaterial = new Cesium.Material({
            fabric: {
                type: 'Grid',
                uniforms: {
                    color: gridColor,
                    cellAlpha: 0.1,
                    lineCount: new Cesium.Cartesian2(lineCount, lineCount),
                    lineThickness: new Cesium.Cartesian2(1.0, 1.0),
                    lineOffset: new Cesium.Cartesian2(0.0, 0.0)
                }
            }
        });
        
        const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
        const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
        
        const scale = new Cesium.Matrix4(
            width / 2.0, 0, 0, 0,
            0, width / 2.0, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
        Cesium.Matrix4.multiply(modelMatrix, scale, modelMatrix);
        
        const planeGeometry = new Cesium.PlaneGeometry({
            vertexFormat: Cesium.VertexFormat.POSITION_NORMAL_AND_ST
        });
        
        const geometryInstance = new Cesium.GeometryInstance({
            geometry: planeGeometry,
            modelMatrix: modelMatrix,
            id: 'mainGrid'
        });
        
        const primitive = new Cesium.Primitive({
            geometryInstances: geometryInstance,
            appearance: new Cesium.MaterialAppearance({
                material: gridMaterial,
                faceForward: true
            })
        });
        
        this.viewer.scene.primitives.add(primitive);
        console.log('Grid plane created successfully');
    }
    
    initializeClippingPlanes() {
        if (!this.tileset) {
            console.warn('Cannot initialize clipping planes: tileset not loaded');
            return;
        }
        
        window.tilesets = [this.tileset];
        ClippingPlaneUtil.create(this.viewer, ClippingPlaneUtil.ClippingDirection.TopToBottom);
        ClippingPlaneUtil.setActive(true, this.viewer, ClippingPlaneUtil.ClippingDirection.TopToBottom);
        
        console.log('Clipping planes initialized and activated');
    }
    
    setupControls() {
        const directionSelect = document.getElementById('directionSelect');
        directionSelect.addEventListener('change', (event) => {
            const direction = event.target.value;
            ClippingPlaneUtil.changeDirection(this.viewer, direction);
        });
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff4444;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-family: Arial, sans-serif;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new TinnyApp();
});