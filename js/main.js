// Wait for A-Frame to be fully loaded
if (typeof AFRAME === 'undefined') {
    throw new Error('A-Frame is required but not loaded');
}

/* ============================================
   COLLISION PLAYER COMPONENT
   Prevents player from moving through walls
   ============================================ */
AFRAME.registerComponent('collision-player', {
    schema: {
        radius: { type: 'number', default: 1.15 }, // Slightly smaller than tunnel radius (1.2)
        height: { type: 'number', default: 1.6 }
    },
    
    init: function() {
        this.velocity = new THREE.Vector3();
        this.previousPosition = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();
        this.tunnelCenter = new THREE.Vector3(0, 1.6, 0);
        this.tunnelRadius = 1.15; // Max distance from center
        this.tunnelLength = 4; // Half length (total 8m)
        
        console.log('Collision system initialized - tunnel radius:', this.tunnelRadius);
    },
    
    tick: function() {
        // Get current position
        this.currentPosition.copy(this.el.object3D.position);
        
        // Check radial distance from tunnel center (XZ plane at tunnel height)
        const dx = this.currentPosition.x - this.tunnelCenter.x;
        const dz = this.currentPosition.z - this.tunnelCenter.z;
        const radialDistance = Math.sqrt(dx * dx + dz * dz);
        
        // If player is too far from center (hitting walls)
        if (radialDistance > this.tunnelRadius) {
            // Push player back toward center
            const angle = Math.atan2(dz, dx);
            this.currentPosition.x = this.tunnelCenter.x + Math.cos(angle) * this.tunnelRadius;
            this.currentPosition.z = this.tunnelCenter.z + Math.sin(angle) * this.tunnelRadius;
            
            console.log('Wall collision - pushed back. Distance was:', radialDistance.toFixed(3));
        }
        
        // Check longitudinal bounds (along tunnel length - Y axis due to rotation)
        if (this.currentPosition.y < -this.tunnelLength + 0.5) {
            this.currentPosition.y = -this.tunnelLength + 0.5;
            console.log('End cap collision - front');
        }
        if (this.currentPosition.y > this.tunnelLength - 0.5) {
            this.currentPosition.y = this.tunnelLength - 0.5;
            console.log('End cap collision - back');
        }
        
        // Keep player above floor
        if (this.currentPosition.y < 0) {
            this.currentPosition.y = 0;
        }
        
        // Apply corrected position
        this.el.object3D.position.copy(this.currentPosition);
        this.previousPosition.copy(this.currentPosition);
    }
});

/* ============================================
   TRAINING MANAGER COMPONENT
   Manages overall training state and task progression
   ============================================ */
AFRAME.registerComponent('training-manager', {
    schema: {},
    
    init: function() {
        console.log('Training Manager initializing...');
        
        this.tasks = {
            task1: false,
            task2: false,
            task3: false,
            task4: false
        };
        
        this.hissSound = null;
        
        // Wait for scene to be fully loaded
        if (this.el.hasLoaded) {
            this.setupListeners();
        } else {
            this.el.addEventListener('loaded', () => {
                this.setupListeners();
            });
        }
    },
    
    setupListeners: function() {
        this.el.addEventListener('meter-grabbed', this.onTask1Complete.bind(this));
        this.el.addEventListener('hazard-identified', this.onTask2Complete.bind(this));
        this.el.addEventListener('valve-turned', this.onTask3Complete.bind(this));
        console.log('Training Manager ready - listeners attached');
    },
    
    onTask1Complete: function() {
        if (!this.tasks.task1) {
            this.tasks.task1 = true;
            this.updateTaskUI('task-1');
            console.log('✓ Task 1 Complete: Atmosphere tested');
        }
    },
    
    onTask2Complete: function() {
        if (this.tasks.task1 && !this.tasks.task2) {
            this.tasks.task2 = true;
            this.updateTaskUI('task-2');
            
            const hazardWarning = document.getElementById('hazard-warning');
            if (hazardWarning) {
                hazardWarning.style.display = 'block';
            }
            
            const hissSound = document.getElementById('hiss-sound');
            if (hissSound && hissSound.src) {
                this.hissSound = hissSound;
                hissSound.loop = true;
                hissSound.volume = 0.6;
                hissSound.play().catch(e => console.log('Audio play blocked:', e.message));
            }
            
            console.log('✓ Task 2 Complete: Hazard identified');
        }
    },
    
    onTask3Complete: function() {
        if (this.tasks.task2 && !this.tasks.task3) {
            this.tasks.task3 = true;
            this.tasks.task4 = true;
            this.updateTaskUI('task-3');
            this.updateTaskUI('task-4');
            
            if (this.hissSound) {
                this.hissSound.pause();
                this.hissSound.currentTime = 0;
            }
            
            const hazardWarning = document.getElementById('hazard-warning');
            if (hazardWarning) {
                hazardWarning.style.display = 'none';
            }
            
            const leakParticles = document.getElementById('leak-particles');
            if (leakParticles) {
                leakParticles.setAttribute('visible', 'false');
            }
            
            setTimeout(() => {
                const completionPanel = document.getElementById('completion-panel');
                if (completionPanel) {
                    completionPanel.style.display = 'block';
                }
            }, 1000);
            
            console.log('✓ Tasks 3 & 4 Complete: Training finished!');
        }
    },
    
    updateTaskUI: function(taskId) {
        const taskEl = document.getElementById(taskId);
        if (taskEl) {
            taskEl.classList.add('completed');
            const statusEl = taskEl.querySelector('.task-status');
            if (statusEl) {
                statusEl.textContent = '✓';
            }
        }
    }
});

/* ============================================
   GAS METER COMPONENT
   Handles Task 1 completion when grabbed
   ============================================ */
AFRAME.registerComponent('gas-meter', {
    schema: {},
    
    init: function() {
        this.grabbed = false;
        this.el.addEventListener('grab-start', this.onGrabStart.bind(this));
        console.log('Gas meter component ready');
    },
    
    onGrabStart: function(evt) {
        if (!this.grabbed) {
            this.grabbed = true;
            
            this.el.setAttribute('material', 'emissive', '#00ff00');
            this.el.setAttribute('material', 'emissiveIntensity', '0.5');
            
            this.el.sceneEl.emit('meter-grabbed');
            
            console.log('→ Gas meter grabbed!');
        }
    }
});

/* ============================================
   HAZARD DETECTOR COMPONENT
   Detects player proximity to hazard for Task 2
   ============================================ */
AFRAME.registerComponent('hazard-detector', {
    schema: {
        distance: { type: 'number', default: 1.0 }
    },
    
    init: function() {
        this.camera = null;
        this.detected = false;
        this.checkCount = 0;
        
        // Get camera reference
        setTimeout(() => {
            this.camera = document.querySelector('#camera');
            if (this.camera) {
                console.log('Hazard detector found camera');
            }
        }, 1000);
    },
    
    tick: function() {
        if (!this.camera || this.detected) return;
        
        this.checkCount++;
        if (this.checkCount % 15 !== 0) return; // Check every 15 frames (more frequent)
        
        const trainingManager = this.el.sceneEl.components['training-manager'];
        if (!trainingManager || !trainingManager.tasks.task1) return;
        
        const hazardPos = new THREE.Vector3();
        const cameraPos = new THREE.Vector3();
        
        this.el.object3D.getWorldPosition(hazardPos);
        this.camera.object3D.getWorldPosition(cameraPos);
        
        const distance = hazardPos.distanceTo(cameraPos);
        
        if (distance < this.data.distance) {
            this.detected = true;
            this.el.sceneEl.emit('hazard-identified');
            console.log('→ Hazard detected at distance:', distance.toFixed(2), 'm');
        }
    }
});

/* ============================================
   VALVE CONTROLLER COMPONENT
   Handles valve rotation and Task 3/4 completion
   ============================================ */
AFRAME.registerComponent('valve-controller', {
    schema: {
        rotationRequired: { type: 'number', default: 360 }
    },
    
    init: function() {
        this.totalRotation = 0;
        this.lastRotation = 0;
        this.completed = false;
        this.isGrabbed = false;
        
        this.el.addEventListener('grab-start', this.onGrabStart.bind(this));
        this.el.addEventListener('grab-end', this.onGrabEnd.bind(this));
        
        console.log('Valve controller ready - needs', this.data.rotationRequired, 'degrees rotation');
    },
    
    onGrabStart: function() {
        this.isGrabbed = true;
        this.lastRotation = this.el.object3D.rotation.z; // Z-axis rotation for torus
        console.log('→ Valve grabbed - start turning...');
    },
    
    onGrabEnd: function() {
        this.isGrabbed = false;
        
        if (!this.completed && this.totalRotation >= this.data.rotationRequired) {
            this.completed = true;
            
            this.el.setAttribute('material', 'color', '#00ff00');
            this.el.setAttribute('material', 'emissive', '#00ff00');
            this.el.setAttribute('material', 'emissiveIntensity', '0.5');
            
            const valveSound = document.getElementById('valve-sound');
            if (valveSound && valveSound.src) {
                valveSound.volume = 0.8;
                valveSound.play().catch(e => console.log('Valve sound blocked:', e.message));
            }
            
            this.el.sceneEl.emit('valve-turned');
            
            console.log('→ Valve turned! Total rotation:', this.totalRotation.toFixed(0), 'degrees');
        } else if (!this.completed) {
            console.log('Valve released - progress:', this.totalRotation.toFixed(0), '/', this.data.rotationRequired, 'degrees');
        }
    },
    
    tick: function() {
        if (!this.isGrabbed || this.completed) return;
        
        const currentRotation = this.el.object3D.rotation.z;
        let delta = currentRotation - this.lastRotation;
        
        // Handle wrap-around
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        
        this.totalRotation += Math.abs(delta) * (180 / Math.PI);
        this.lastRotation = currentRotation;
        
        // Visual feedback at 50% completion
        if (this.totalRotation > this.data.rotationRequired * 0.5 && this.totalRotation < this.data.rotationRequired) {
            this.el.setAttribute('material', 'color', '#ffaa00');
        }
    }
});

/* ============================================
   INITIALIZATION COMPLETE
   ============================================ */
console.log('========================================');
console.log('✓ Confined Space Training Simulator');
console.log('✓ All components loaded successfully');
console.log('✓ Collision detection active');
console.log('✓ VR and AR ready');
console.log('========================================');
console.log('Instructions:');
console.log('1. Grab the green gas meter');
console.log('2. Approach the red leaking hose');
console.log('3. Grab and turn the orange valve wheel');
console.log('========================================');
