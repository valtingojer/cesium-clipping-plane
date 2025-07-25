/**
 * Utility class for managing interactive clipping planes in CesiumJS
 * Provides functionality to create, control, and interact with clipping planes in 6 directions
 */
class ClippingPlaneUtil {
    static active = false;
    static exists = false;
    static currentClippingPlanes = null;
    static planeEntity = null;
    static moveHandler = null;
    static downHandler = null;
    static upHandler = null;
    static targetDistance = 0;
    static isLeftDown = false;
    static currentMoveSpeed = 0.04;
    static lastToggleTime = 0;
    static TOGGLE_COOLDOWN = 300;
    static isDragging = false;
    static isDraggingPlane = false;
    static isZKeyPressed = false;
    
    static ClippingDirection = {
        TopToBottom: 'top_to_bottom',
        BottomToTop: 'bottom_to_top',
        LeftToRight: 'left_to_right',
        RightToLeft: 'right_to_left',
        FrontToBack: 'front_to_back',
        BackToFront: 'back_to_front'
    };
    
    static clippingDirection = ClippingPlaneUtil.ClippingDirection.TopToBottom;
    
    static lastMousePosition = null;
    static mouseMovementTolerance = 1.0;
    
    /**
     * Creates a clipping plane with the specified direction
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     * @param {string} direction - The clipping direction from ClippingDirection enum
     */
    static create(viewer, direction) {
        if (window.tilesets && window.tilesets.length > 0) {
            this.clippingDirection = direction;
            const tileset = window.tilesets[0];
            this.createClip(viewer, tileset);
            this.exists = true;
            this.active = true;
        }
    }
    
    /**
     * Sets the active state and optionally changes direction
     * @param {boolean} isActive - Whether to activate or deactivate clipping
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     * @param {string} [direction] - Optional new clipping direction
     */
    static setActive(isActive, viewer, direction) {
        if (direction !== undefined) {
            this.clippingDirection = direction;
        }
        this.setActiveInternal(isActive, viewer);
    }
    
    /**
     * Changes the current clipping direction while preserving position
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     * @param {string} direction - The new clipping direction from ClippingDirection enum
     */
    static changeDirection(viewer, direction) {
        if (!this.currentClippingPlanes || !window.tilesets || !window.tilesets.length) {
            return;
        }
        
        if (!this.active) {
            this.setActive(true, viewer);
        }
        
        this.clippingDirection = direction;
        const newNormal = this.getClippingNormal();
        const newVisualNormal = this.getVisualPlaneNormal();
        const tileset = window.tilesets[0];
        const dimensions = this.getTilesetDimensions(tileset);
        this.targetDistance = this.getInitialDistance(dimensions, this.clippingDirection);
        
        this.currentClippingPlanes.get(0).normal = newNormal;
        this.currentClippingPlanes.get(0).distance = this.targetDistance;
        
        if (this.planeEntity && this.planeEntity.plane) {
            const planeDimensions = this.getPlaneDimensions(dimensions, this.clippingDirection);
            this.planeEntity.plane.dimensions = planeDimensions;
            this.planeEntity.plane.plane = new Cesium.CallbackProperty(
                () => new Cesium.Plane(newVisualNormal, this.targetDistance),
                false
            );
        }
        
        this.updatePlaneMatrix(tileset);
        this.setupListeners(viewer);
    }
    
    /**
     * Internal method to handle activation/deactivation with cooldown protection
     * @param {boolean} isActive - Whether to activate or deactivate clipping
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     * @private
     */
    static setActiveInternal(isActive, viewer) {
        const currentTime = Date.now();
        const timeSinceLastToggle = currentTime - this.lastToggleTime;
        
        if (timeSinceLastToggle < this.TOGGLE_COOLDOWN) {
            return;
        }
        
        if (isActive === this.active) return;
        
        this.lastToggleTime = currentTime;
        
        if (isActive && window.tilesets && window.tilesets.length > 0) {
            const tileset = window.tilesets[0];
            
            if (!this.exists) {
                this.createClip(viewer, tileset);
                this.exists = true;
            } else if (this.currentClippingPlanes && this.planeEntity) {
                if (this.planeEntity.show !== undefined) {
                    this.planeEntity.show = true;
                }
                const dimensions = this.getTilesetDimensions(tileset);
                this.targetDistance = this.getInitialDistance(dimensions, this.clippingDirection);
                this.currentClippingPlanes.get(0).distance = this.targetDistance;
                this.updatePlaneMatrix(tileset);
            }
            
            if (!this.moveHandler || !this.downHandler || !this.upHandler) {
                this.setupListeners(viewer);
            }
            
            this.active = isActive;
        } else {
            this.active = false;
            if (this.planeEntity && this.planeEntity.show !== undefined) {
                this.planeEntity.show = false;
            }
            this.removeListeners();
        }
    }
    
    /**
     * Creates the actual clipping plane and visual representation
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     * @param {Cesium.Cesium3DTileset} tileset - The 3D tileset to apply clipping to
     * @private
     */
    static createClip(viewer, tileset) {
        const dimensions = this.getTilesetDimensions(tileset);
        const normal = this.getClippingNormal();
        const visualNormal = this.getVisualPlaneNormal();
        this.targetDistance = this.getInitialDistance(dimensions, this.clippingDirection);
        
        const clippingPlanes = new Cesium.ClippingPlaneCollection({
            planes: [new Cesium.ClippingPlane(normal, this.targetDistance)],
            edgeWidth: 2.0,
            edgeColor: Cesium.Color.YELLOW
        });
        
        tileset.clippingPlanes = clippingPlanes;
        this.currentClippingPlanes = clippingPlanes;
        
        const planeDimensions = this.getPlaneDimensions(dimensions, this.clippingDirection);
        this.planeEntity = viewer.entities.add({
            plane: {
                dimensions: planeDimensions,
                material: Cesium.Color.YELLOW.withAlpha(0.3),
                plane: new Cesium.CallbackProperty(
                    () => new Cesium.Plane(visualNormal, this.targetDistance), 
                    false
                ),
                outline: true,
                outlineColor: Cesium.Color.YELLOW
            }
        });
        
        this.updatePlaneMatrix(tileset);
        this.setupListeners(viewer);
    }
    
    /**
     * Calculates tileset dimensions based on bounding sphere
     * @param {Cesium.Cesium3DTileset} tileset - The 3D tileset
     * @returns {Object} Object containing width, height, depth, and radius properties
     */
    static getTilesetDimensions(tileset) {
        const boundingSphere = tileset.boundingSphere;
        const radius = boundingSphere.radius;
        return {
            width: radius * 2,
            height: radius * 2,
            depth: radius * 2,
            radius: radius
        };
    }
    
    /**
     * Gets the normal vector for the actual clipping plane based on current direction
     * @returns {Cesium.Cartesian3} The normal vector for clipping geometry
     */
    static getClippingNormal() {
        switch (this.clippingDirection) {
            case this.ClippingDirection.TopToBottom:
                return new Cesium.Cartesian3(0.0, 0.0, -1.0);
            case this.ClippingDirection.BottomToTop:
                return new Cesium.Cartesian3(0.0, 0.0, 1.0);
            case this.ClippingDirection.LeftToRight:
                return new Cesium.Cartesian3(1.0, 0.0, 0.0);
            case this.ClippingDirection.RightToLeft:
                return new Cesium.Cartesian3(-1.0, 0.0, 0.0);
            case this.ClippingDirection.FrontToBack:
                return new Cesium.Cartesian3(0.0, 1.0, 0.0);
            case this.ClippingDirection.BackToFront:
                return new Cesium.Cartesian3(0.0, -1.0, 0.0);
            default:
                return new Cesium.Cartesian3(0.0, 0.0, -1.0);
        }
    }

    /**
     * Gets the normal vector for the visual plane representation
     * Note: This differs from clipping normal to address visual alignment issues
     * @returns {Cesium.Cartesian3} The normal vector for visual plane display
     */
    static getVisualPlaneNormal() {
        switch (this.clippingDirection) {
            case this.ClippingDirection.TopToBottom:
                return new Cesium.Cartesian3(-1.0, 0.0, 0.0);
            case this.ClippingDirection.BottomToTop:
                return new Cesium.Cartesian3(1.0, 0.0, 0.0);
            case this.ClippingDirection.LeftToRight:
                return new Cesium.Cartesian3(0.0, 1.0, 0.0);
            case this.ClippingDirection.RightToLeft:
                return new Cesium.Cartesian3(0.0, -1.0, 0.0);
            case this.ClippingDirection.FrontToBack:
                return new Cesium.Cartesian3(0.0, 0.0, 1.0);
            case this.ClippingDirection.BackToFront:
                return new Cesium.Cartesian3(0.0, 0.0, -1.0);
            default:
                return new Cesium.Cartesian3(-1.0, 0.0, 0.0);
        }
    }
    
    /**
     * Gets the axis multiplier for mouse movement direction based on clipping direction
     * @returns {number} Multiplier value (-1 or 1) to control movement direction
     */
    static getAxisMultiplier() {
        switch (this.clippingDirection) {
            case this.ClippingDirection.TopToBottom:
                return -1;
            case this.ClippingDirection.BottomToTop:
                return 1;
            case this.ClippingDirection.LeftToRight:
                return -1;
            case this.ClippingDirection.RightToLeft:
                return -1;
            case this.ClippingDirection.FrontToBack:
                return 1;
            case this.ClippingDirection.BackToFront:
                return 1;
            default:
                return 1;
        }
    }
    
    /**
     * Calculates the initial distance for the clipping plane based on tileset dimensions
     * @param {Object} dimensions - Object containing width, height, depth, and radius
     * @param {string} direction - The clipping direction
     * @returns {number} Initial distance value (30% of relevant dimension)
     */
    static getInitialDistance(dimensions, direction) {
        switch (direction) {
            case this.ClippingDirection.TopToBottom:
            case this.ClippingDirection.BottomToTop:
                return dimensions.height * 0.3;
            case this.ClippingDirection.LeftToRight:
            case this.ClippingDirection.RightToLeft:
                return dimensions.width * 0.3;
            case this.ClippingDirection.FrontToBack:
            case this.ClippingDirection.BackToFront:
                return dimensions.depth * 0.3;
            default:
                return dimensions.radius * 0.3;
        }
    }
    
    /**
     * Gets the appropriate 2D dimensions for the visual plane based on clipping direction
     * @param {Object} dimensions - Object containing width, height, depth, and radius
     * @param {string} direction - The clipping direction
     * @returns {Cesium.Cartesian2} 2D dimensions for the visual plane
     */
    static getPlaneDimensions(dimensions, direction) {
        switch (direction) {
            case this.ClippingDirection.TopToBottom:
            case this.ClippingDirection.BottomToTop:
                return new Cesium.Cartesian2(dimensions.width, dimensions.depth);
            case this.ClippingDirection.LeftToRight:
            case this.ClippingDirection.RightToLeft:
                return new Cesium.Cartesian2(dimensions.depth, dimensions.height);
            case this.ClippingDirection.FrontToBack:
            case this.ClippingDirection.BackToFront:
                return new Cesium.Cartesian2(dimensions.width, dimensions.height);
            default:
                return new Cesium.Cartesian2(dimensions.width, dimensions.depth);
        }
    }
    
    /**
     * Updates the position and orientation of the visual plane entity
     * @param {Cesium.Cesium3DTileset} tileset - The 3D tileset for reference positioning
     */
    static updatePlaneMatrix(tileset) {
        if (!this.planeEntity) return;
        
        const center = tileset.boundingSphere.center;
        this.planeEntity.position = center;
        this.planeEntity.orientation = Cesium.Quaternion.IDENTITY;
    }
    
    /**
     * Sets up mouse event handlers for interactive plane dragging
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     */
    static setupListeners(viewer) {
        this.removeListeners();
        
        this.downHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        this.downHandler.setInputAction((event) => {
            const pickedObject = viewer.scene.pick(event.position);
            if (pickedObject && pickedObject.id === this.planeEntity) {
                this.isLeftDown = true;
                this.isDraggingPlane = true;
                viewer.scene.screenSpaceCameraController.enableRotate = false;
            }
        }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
        
        this.moveHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        this.moveHandler.setInputAction((event) => {
            if (this.isLeftDown && this.isDraggingPlane) {
                this.handleMouseMove(event, viewer);
            }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        
        this.upHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        this.upHandler.setInputAction(() => {
            this.isLeftDown = false;
            this.isDraggingPlane = false;
            viewer.scene.screenSpaceCameraController.enableRotate = true;
        }, Cesium.ScreenSpaceEventType.LEFT_UP);
    }
    
    /**
     * Calculates movement modifier based on mouse delta and clipping direction
     * @param {number} deltaX - Horizontal mouse movement
     * @param {number} deltaY - Vertical mouse movement
     * @returns {number} Movement modifier value for plane positioning
     */
    static getMovementModifier(deltaX, deltaY) {
        const verticalMovement = deltaY;
        const diagonalMovement = deltaX + deltaY;
        const oppositeDiagonalMovement = -deltaX - deltaY;
        
        switch (this.clippingDirection) {
            case this.ClippingDirection.TopToBottom:
            case this.ClippingDirection.BottomToTop:
                return verticalMovement;
                
            case this.ClippingDirection.LeftToRight:
            case this.ClippingDirection.FrontToBack:
                return diagonalMovement;
                
            case this.ClippingDirection.RightToLeft:
            case this.ClippingDirection.BackToFront:
                return oppositeDiagonalMovement;
                
            default:
                return verticalMovement;
        }
    }
    
    /**
     * Handles mouse movement during plane dragging to update clipping distance
     * @param {Object} event - Cesium mouse move event with start and end positions
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     */
    static handleMouseMove(event, viewer) {
        if (!this.currentClippingPlanes || !window.tilesets || !window.tilesets.length) return;
        
        const deltaX = event.endPosition.x - event.startPosition.x;
        const deltaY = event.endPosition.y - event.startPosition.y;
        const speedMultiplier = this.isZKeyPressed ? 5.0 : 1.0;
        const axisMultiplier = this.getAxisMultiplier();
        const movementModifier = this.getMovementModifier(deltaX, deltaY);
        
        const moveAmount = movementModifier * this.currentMoveSpeed * speedMultiplier * axisMultiplier;
        
        this.targetDistance += moveAmount;
        this.currentClippingPlanes.get(0).distance = this.targetDistance;
    }
    
    /**
     * Removes all mouse event handlers and cleans up listeners
     */
    static removeListeners() {
        if (this.moveHandler) {
            this.moveHandler.destroy();
            this.moveHandler = null;
        }
        if (this.downHandler) {
            this.downHandler.destroy();
            this.downHandler = null;
        }
        if (this.upHandler) {
            this.upHandler.destroy();
            this.upHandler = null;
        }
    }
    
    /**
     * Completely destroys the clipping plane utility and cleans up all resources
     */
    static destroy() {
        this.removeListeners();
        this.active = false;
        this.exists = false;
        this.currentClippingPlanes = null;
        this.planeEntity = null;
    }
}