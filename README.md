# Cesium Clipping Plane Issues Demonstration

<!-- [![Live Demo](https://img.shields.io/badge/build-blue)](https://github.com/valtingojer/cesium-clipping-plane/actions/workflows/deploy.yml) -->

This project demonstrates **clipping plane issues** when clipping **horizontal and depth directions**. The demo showcases scenarios where the clipping functionality fails to correctly section the 3D models.

## 🚀 Live Demo

[![Live Demo](https://img.shields.io/badge/view-demo-brightgreen)](https://valtingojer.github.io/cesium-clipping-plane)


## 🎯 Purpose

This demonstration highlights specific issues with Cesium's clipping plane functionality:

- **Horizontal Clipping Issues**: Problems when clipping from left-to-right or right-to-left, the clipping plane is too far from the visible plane
- **Depth Clipping Issues**: Incorrect behavior when clipping front-to-back or back-to-front, the clipping plane is a little far from the visible plane
- **Visual Inconsistencies**: Misalignment between clipping plane position and actual geometry clipping
- The misalignment is consistent in this model, but not cross models


## 📦 3D Models

The demo uses detailed architectural models from the DigitalHub project. You can download these models to replicate the issues:

### Download Models

| Model | Description | Download Link |
|-------|-------------|---------------|
| **DigitalHub_FM-ARC_v2_cesium.gltf** | Architecture Model | [Download](https://valtingojer.github.io/cesium-clipping-plane/assets/DigitalHub_FM-ARC_v2_cesium.gltf) |
| **DigitalHub_FM-HZG_v2_cesium.gltf** | Heating Model | [Download](https://valtingojer.github.io/cesium-clipping-plane/assets/DigitalHub_FM-HZG_v2_cesium.gltf) |
| **DigitalHub_FM-LFT_v2_cesium.gltf** | Ventilation Model | [Download](https://valtingojer.github.io/cesium-clipping-plane/assets/DigitalHub_FM-LFT_v2_cesium.gltf) |
| **DigitalHub_FM-SAN_v2_cesium.gltf** | Sanitary Model | [Download](https://valtingojer.github.io/cesium-clipping-plane/assets/DigitalHub_FM-SAN_v2_cesium.gltf) |

> **Note**: The models are ready to be converted in cesium ion. place downloaded converted models in the `public/` directory to use them in your local setup.

## 🛠️ Local Development Setup

### Prerequisites

- **Node.js** (using 22)
- **npm** 
- **Git**

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/valtingojer/cesium-clipping-plane.git
   cd cesium-clipping-plane
   ```

2. **Navigate to the project directory**:
   ```bash
   cd your-project-folder
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to:
   ```
   http://localhost:8080
   ```
## Building

### linux
```bash
npm run build
```

### windows
```bash
npm run build:win
```



## 🎮 How to Use

1. **Load the Demo**: Open the live demo or run locally
2. **Select Clipping Direction**: Use the dropdown in the control panel
3. **Interact with Clipping Plane**: 
   - Click and drag the yellow plane to reposition it
   - Observe clipping behavior in different directions
4. **Identify Issues**: 
   - Test horizontal directions (Left-to-Right, Right-to-Left)
   - Test depth directions (Front-to-Back, Back-to-Front)
   - Compare with working vertical directions (Top-to-Bottom, Bottom-to-Top)

## 🐛 Known Issues

### Horizontal Clipping Problems
- **Left-to-Right**: Clipping plane normal vector may be incorrectly oriented
- **Right-to-Left**: Visual plane doesn't align with actual clipping geometry

### Depth Clipping Problems
- **Front-to-Back**: Inconsistent clipping behavior with complex geometries
- **Back-to-Front**: Visual feedback doesn't match actual clipping results

### Vertical Clipping
- This model did not shown any vertical clipping problems. But other models may experience the same issue


## 🏗️ Project Structure
```
project/
├── assets/
│   ├── DigitalHub_FM-ARC_v2.ifc 
│   ├── DigitalHub_FM-HZG_v2.ifc 
│   ├── DigitalHub_FM-LFT_v2.ifc 
│   ├── DigitalHub_FM-SAN_v2.ifc 
├── index.html              # Main HTML entry point
├── main.js                 # Core application logic
├── clipping-plane-util.js  # Clipping plane utility class
├── styles.css              # Application styling
├── package.json            # Project configuration
├── public/
│   ├── DigitalHubV2/       # 3D tileset data
│   │   ├── tileset.json    # Tileset configuration
│   │   └── tiles/          # Hierarchical tile structure
│   └── img/                # Reference images
└── node_modules/           # Dependencies
```

## 🔧 Technical Details

- **CesiumJS Version**: 1.124.0
- **3D Format**: Cesium 3D Tiles
- **Clipping Implementation**: `Cesium.ClippingPlaneCollection`
- **Interaction**: Mouse-based drag controls
- **Visualization**: Semi-transparent yellow clipping plane overlay
