// Wait for A-Frame to be fully loaded
if (typeof AFRAME === 'undefined') {
    throw new Error('A-Frame is required but not loaded');
}

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
   ============================================ */
AFRAME.registerComponent('hazard-detector', {
    schema: {
        distance: { type: 'number', default: 1.5 }
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
        if (this.checkCount % 30 !== 0) return; // Check every 30 frames
        
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
            console.log('→ Hazard detected at distance:', distance.toFixed(2));
        }
    }
});

/* ============================================
   VALVE CONTROLLER COMPONENT
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
        
        console.log('Valve controller ready');
    },
    
    onGrabStart: function() {
        this.isGrabbed = true;
        this.lastRotation = this.el.object3D.rotation.y;
        console.log('→ Valve grabbed, start turning...');
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
            console.log('Valve released - rotation so far:', this.totalRotation.toFixed(0), '/', this.data.rotationRequired);
        }
    },
    
    tick: function() {
        if (!this.isGrabbed || this.completed) return;
        
        const currentRotation = this.el.object3D.rotation.y;
        let delta = currentRotation - this.lastRotation;
        
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        
        this.totalRotation += Math.abs(delta) * (180 / Math.PI);
        this.lastRotation = currentRotation;
        
        if (this.totalRotation > this.data.rotationRequired * 0.5) {
            this.el.setAttribute('material', 'color', '#ffaa00');
        }
    }
});

console.log('✓ Confined Space Training Simulator - All components loaded successfully');
