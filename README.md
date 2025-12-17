## 🚧 Confined Space VR Training Simulator (WebXR)

A foundational WebXR application built using **A-Frame** to simulate a Confined Space Entry (CSE) scenario, focusing on hazard identification and isolation protocol.

This simulator is designed to run directly in modern web browsers, supporting both desktop, mobile, and dedicated VR/AR headsets (like Meta Quest, Apple Vision Pro, etc.) without requiring app store installation.

### 🌐 Technologies Used

* **A-Frame:** Core WebXR framework (based on Three.js/HTML).
* **A-Frame Extras:** Provides advanced movement and control components.
* **A-Frame Super Hands:** Enables complex interactions like grabbing and rotating objects.
* **HTML/CSS/JavaScript:** Standard web structure.

### 🚀 Getting Started

This project is a static web application and can be hosted on any web server (GitHub Pages is recommended).

#### **Prerequisites**

You only need a web browser compatible with WebXR (Chrome, Firefox, Meta Quest Browser, Safari).

#### **Installation & Running**

1. **Clone the Repository:**
```bash
git clone [YOUR_REPO_URL]
cd confined-space-vr-training

```


2. **Deployment:**
* **Recommended (GitHub Pages):** Push the files to your GitHub repository and enable GitHub Pages in the settings.
* **Local Server:** Use a simple local server (e.g., Python's `http.server` or Node's `serve`) to avoid browser security restrictions on loading local assets.
```bash
# Python example
python3 -m http.server 8000

```


* Navigate to `http://localhost:8000` in your browser.



### 🎮 How to Use the Simulator

The core training loop requires the user to perform four critical steps in sequence:

| Step | Action | Completion Criteria |
| --- | --- | --- |
| **1. Atmosphere Test** | **Grab** the **Gas Meter** from the floor near the entrance. | Meter object is successfully picked up by the user's hand/cursor. |
| **2. Hazard Identification** | **Approach** the **Yellow Leaking Hose** (within 2 meters) *while holding the meter*. | Hissing sound plays, red warning UI appears, and the hazard is logged. |
| **3. Communication** | *(Inferred)* Acknowledging the hazard and performing the next action. | Completed as part of the isolation step. |
| **4. Hazard Isolation** | **Grab and Turn** the **Gray Isolation Valve** on the main rusty pipe. | Valve is successfully turned. Hissing sound stops, and the Green Completion UI appears. |

### 📁 Project Structure

The project is organized for clean separation of concerns:

```
confined-space-vr-training/
├── index.html          # Main A-Frame scene, loads assets and components.
├── style.css           # Basic CSS styling (outside of the 3D environment).
└── js/
    └── main.js         # All custom A-Frame components (Logic).

```

### ⚙️ Custom Components (JavaScript Logic)

All custom behavior is defined in `js/main.js`:

| Component | Description |
| --- | --- |
| `training-manager` | Attached to `<a-scene>`. Manages the scenario state (tasks 1-4) and updates the UI based on events. |
| `proximity-hazard` | Attached to the camera rig (`#rig`). Constantly checks the distance to the `#hose-hazard`. Triggers sound and UI if the threshold is met AND the user has the meter. |
| `valve-logic` | Attached to the `#isolation-valve`. Listens for the `turn-end` event from Super Hands and triggers the `hazard-isolated` event to complete the scenario. |
| `look-at-camera` | Attached to UI panels. Ensures the 2D elements always rotate to face the user, regardless of head rotation. |

### 🛠️ Customizing the Environment

* **Change Geometry/Layout:** Modify entities like `<a-cylinder>` and `<a-box>` in `index.html`.
* **Update Task List:** Edit the text values of the `<a-text id="task-..."` entities in `index.html`.
* **Adjust Hazard Sensitivity:** Modify the `threshold` value in the `proximity-hazard` component attached to the `<a-entity id="rig">`.

### 🤝 Contributing

This project is a starting point. Contributions are welcome! Feel free to fork the repository and propose improvements such as:

* Adding more detailed 3D models (using GLTF/GLB files).
* Implementing **score tracking** or **time-based assessment**.
* Adding failure states (e.g., entering the hazard zone without the meter).
* Improving the UI/UX for specific headsets.

---

**License:** 
