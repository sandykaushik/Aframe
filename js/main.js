/* ============================================
   TRAINING MANAGER COMPONENT
   Manages overall training state and task progression
   ============================================ */
AFRAME.registerComponent('training-manager', {
    schema: {},
    
    init: function() {
        this.tasks = {
            task1: false, // Atmosphere test
            task2: false, // Hazard identification
            task3: false, // Isolation valve turned
            task4: false  // Verification complete
        };
        
        this.hissSound = null;
        
        // Listen for task completion events
        this.el.addEventListener('meter-grabbed', this.onTask1Complete.bind(this));
        this.el.addEventListener('hazard-identified', this.onTask2Complete.bind(this));
        this.el.addEventListener('valve-turned', this.onTask3Complete.bind(this));
        
        console.log('Training Manager initialized');
    },
    
    onTask1Complete: function() {
        if (!this.tasks.task1) {
            this.tasks.task1 = true;
            this.updateTaskUI('task-1');
            console.log('Task 1 Complete: Atmosphere tested');
        }
    },
    
    onTask2Complete: function() {
        if (this.tasks.task1 && !this.tasks.task2) {
            this.tasks.task2 = true;
            this.updateTaskUI('task-2');
            
            // Show hazard warning
            const hazardWarning = document.getElementById('hazard-warning');
            if (hazardWarning) {
                hazardWarning.style.display = 'block';
            }
            
            // Play hissing sound
            const hissSound = document.getElementById('hiss-sound');
            if (hissSound) {
                this.hissSound = hissSound;
                hissSound.loop = true;
                hissSound.volume = 0.6;
                hissSound.play().catch(e => console.log('Audio play failed:', e));
            }
            
            console.log('Task 2 Complete: Hazard identified');
        }
    },
    
    onTask3Complete: function() {
        if (this.tasks.task2 && !this.tasks.task3) {
            this.tasks.task3 = true;
            this.tasks.task4 = true; // Task 4 completes with task 3
            this.updateTaskUI('task-3');
            this.updateTaskUI('task-4');
            
            // Stop hissing sound
            if (this.hissSound) {
                this.hissSound.pause();
                this.hissSound.currentTime = 0;
            }
            
            // Hide hazard warning
            const hazardWarning = document.getElementById('hazard-warning');
            if (hazardWarning) {
                hazardWarning.style.display = 'none';
            }
            
            // Hide leak particles
            const leakParticles = document.getElementById('leak-particles');
            if (leakParticles) {
                leakParticles.setAttribute('visible', 'false');
            }
            
            // Show completion panel
            setTimeout(() => {
                const completionPanel = document.getElementById('completion-panel');
                if (completionPanel) {
                    completionPanel.style.display = 'block';
                }
            }, 1000);
            
            console.log('Tasks 3 & 4 Complete: Isolation verified');
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
        
        // Listen for grab events from super-hands
        this.el.addEventListener('grab-start', this.onGrabStart.bind(this));
        
        console.log('Gas meter ready');
    },
    
    onGrabStart: function() {
        if (!this.grabbed) {
            this.grabbed = true;
            
            // Visual feedback
            this.el.setAttribute('material', 'emissive', '#00ff00');
            this.el.setAttribute('material', 'emissiveIntensity', '0.5');
            
            // Emit event for training manager
            this.el.sceneEl.emit('meter-grabbed');
            
            console.log('Gas meter grabbed - Task 1 triggered');
        }
    }
});

/* ============================================
   HAZARD DETECTOR COMPONENT
   Detects player proximity to hazard for Task 2
   ============================================ */
AFRAME.registerComponent('hazard-detector', {
    schema: {
        distance: { type: 'number', default: 1.5 }
    },
    
    init: function() {
        this.camera = null;
        this.detected = false;
        
        // Wait for camera to be ready
        this.el.sceneEl.addEventListener('camera-set-active', (evt) => {
            this.camera = evt.detail.cameraEl;
        });
    },
    
    tick: function() {
        if (!this.camera || this.detected) return;
        
        // Get training manager to check if task 1 is complete
        const trainingManager = this.el.sceneEl.components['training-manager'];
        if (!trainingManager || !trainingManager.tasks.task1) return;
        
        // Calculate distance to camera
        const hazardPos = this.el.object3D.getWorldPosition(new THREE.Vector3());
        const cameraPos = this.camera.object3D.getWorldPosition(new THREE.Vector3());
        const distance = hazardPos.distanceTo(cameraPos);
        
        // Trigger hazard detection
        if (distance < this.data.distance) {
            this.detected = true;
            this.el.sceneEl.emit('hazard-identified');
            console.log('Hazard detected - Task 2 triggered');
        }
    }
});

/* ============================================
   VALVE CONTROLLER COMPONENT
   Handles valve rotation and Task 3/4 completion
   ============================================ */
AFRAME.registerComponent('valve-controller', {
    schema: {
        rotationRequired: { type: 'number', default: 360 } // degrees
    },
    
    init: function() {
        this.totalRotation = 0;
        this.lastRotation = 0;
        this.completed = false;
        
        // Listen for rotation events from super-hands
        this.el.addEventListener('drag-start', this.onDragStart.bind(this));
        this.el.addEventListener('drag-move', this.onDragMove.bind(this));
        this.el.addEventListener('drag-end', this.onDragEnd.bind(this));
        
        console.log('Valve controller ready');
    },
    
    onDragStart: function() {
        this.lastRotation = this.el.object3D.rotation.y;
    },
    
    onDragMove: function() {
        // Calculate rotation delta
        const currentRotation = this.el.object3D.rotation.y;
        let delta = currentRotation - this.lastRotation;
        
        // Handle wrap-around
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        
        this.totalRotation += Math.abs(delta) * (180 / Math.PI);
        this.lastRotation = currentRotation;
        
        // Visual feedback
        if (this.totalRotation > this.data.rotationRequired * 0.5) {
            this.el.setAttribute('material', 'color', '#ffaa00');
        }
    },
    
    onDragEnd: function() {
        if (!this.completed && this.totalRotation >= this.data.rotationRequired) {
            this.completed = true;
            
            // Visual feedback
            this.el.setAttribute('material', 'color', '#00ff00');
            this.el.setAttribute('material', 'emissive', '#00ff00');
            this.el.setAttribute('material', 'emissiveIntensity', '0.5');
            
            // Play valve sound
            const valveSound = document.getElementById('valve-sound');
            if (valveSound) {
                valveSound.volume = 0.8;
                valveSound.play().catch(e => console.log('Valve sound failed:', e));
            }
            
            // Emit event for training manager
            this.el.sceneEl.emit('valve-turned');
            
            console.log('Valve turned - Tasks 3 & 4 triggered');
        }
    }
});

/* ============================================
   INITIALIZATION
   ============================================ */
console.log('Confined Space Training Simulator - Custom components loaded');
