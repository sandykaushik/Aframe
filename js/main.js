// Wait for A-Frame to be fully loaded
if (typeof AFRAME === 'undefined') {
    throw new Error('A-Frame is required but not loaded');
}

/* ============================================
   GUTTER LID COMPONENT
   Handles opening the gutter access
   ============================================ */
AFRAME.registerComponent('gutter-lid', {
    schema: {},
    
    init: function() {
        this.opened = false;
        this.el.addEventListener('click', this.onLidClick.bind(this));
        this.el.addEventListener('grab-start', this.onLidClick.bind(this));
        console.log('Gutter lid ready - click to open');
    },
    
    onLidClick: function(evt) {
        if (this.opened) return;
        
        this.opened = true;
        console.log('→ Opening gutter lid...');
        
        // Play metal sound
        const metalSound = document.getElementById('metal-sound');
        if (metalSound && metalSound.src) {
            metalSound.volume = 0.7;
            metalSound.play().catch(e => console.log('Metal sound blocked:', e.message));
        }
        
        // Animate lid opening (slide to side and rotate)
        this.el.setAttribute('animation', {
            property: 'position',
            to: '0.8 0.5 0',
            dur: 2000,
            easing: 'easeInOutQuad'
        });
        
        this.el.setAttribute('animation__rotation', {
            property: 'rotation',
            to: '0 0 90',
            dur: 2000,
            easing: 'easeInOutQuad'
        });
        
        // Show underground section after animation
        setTimeout(() => {
            const underground = document.getElementById('underground-section');
            if (underground) {
                underground.setAttribute('visible', 'true');
                console.log('✓ Underground section revealed');
            }
            
            // Move player down into shaft
            const rig = document.getElementById('rig');
            if (rig) {
                rig.setAttribute('animation', {
                    property: 'position',
                    to: '0 -3.4 0',
                    dur: 3000,
                    easing: 'easeInOutQuad'
                });
            }
            
            // Update task
            const trainingManager = this.el.sceneEl.components['training-manager'];
            if (trainingManager) {
                trainingManager.onTask0Complete();
            }
        }, 2500);
    }
});

/* ============================================
   TRAINING MANAGER COMPONENT
   ============================================ */
AFRAME.registerComponent('training-manager', {
    schema: {},
    
    init: function() {
        console.log('Training Manager initializing...');
        
        this.tasks = {
            task0: false,
            task1: false,
            task2: false,
            task3: false,
            task4: false
        };
        
        this.hissSound = null;
        
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
        console.log('Training Manager ready');
    },
    
    onTask0Complete: function() {
        if (!this.tasks.task0) {
            this.tasks.task0 = true;
            this.updateTaskUI('task-0');
            console.log('✓ Task 0 Complete: Gutter opened');
        }
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
                hissSound.play().catch(e => console.log('Audio blocked:', e.message));
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
        this.el.addEventListener('click', this.onGrabStart.bind(this));
        console.log('Gas meter ready');
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
        distance: { type: 'number', default: 1.2 }
    },
    
    init: function() {
        this.camera = null;
        this.detected = false;
        this.checkCount = 0;
        
        setTimeout(() => {
            this.camera = document.querySelector('#camera');
            if (this.camera) {
                console.log('Hazard detector active');
            }
        }, 1000);
    },
    
    tick: function() {
        if (!this.camera || this.detected) return;
        
        this.checkCount++;
        if (this.checkCount % 10 !== 0) return;
        
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
            console.log('→ Hazard detected at', distance.toFixed(2), 'm');
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
        
        // Also support click for desktop
        this.el.addEventListener('click', this.onClick.bind(this));
        this.clickRotation = 0;
        
        console.log('Valve ready - grab and turn or click repeatedly');
    },
    
    onClick: function() {
        if (this.completed) return;
        
        this.clickRotation += 45; // 45 degrees per click
        this.totalRotation += 45;
        
        this.el.object3D.rotation.z = this.clickRotation * Math.PI / 180;
        
        console.log('Valve clicked - rotation:', this.totalRotation, '/', this.data.rotationRequired);
        
        if (this.totalRotation > this.data.rotationRequired * 0.5) {
            this.el.setAttribute('material', 'color', '#ffaa00');
        }
        
        if (this.totalRotation >= this.data.rotationRequired) {
            this.completeValve();
        }
    },
    
    onGrabStart: function() {
        this.isGrabbed = true;
        this.lastRotation = this.el.object3D.rotation.z;
        console.log('→ Valve grabbed - turn it!');
    },
    
    onGrabEnd: function() {
        this.isGrabbed = false;
        
        if (!this.completed && this.totalRotation >= this.data.rotationRequired) {
            this.completeValve();
        } else if (!this.completed) {
            console.log('Valve progress:', this.totalRotation.toFixed(0), '/', this.data.rotationRequired);
        }
    },
    
    completeValve: function() {
        this.completed = true;
        
        this.el.setAttribute('material', 'color', '#00ff00');
        this.el.setAttribute('material', 'emissive', '#00ff00');
        this.el.setAttribute('material', 'emissiveIntensity', '0.5');
        
        const valveSound = document.getElementById('valve-sound');
        if (valveSound && valveSound.src) {
            valveSound.volume = 0.8;
            valveSound.play().catch(e => console.log('Valve sound blocked'));
        }
        
        this.el.sceneEl.emit('valve-turned');
        
        console.log('→ Valve turned completely!');
    },
    
    tick: function() {
        if (!this.isGrabbed || this.completed) return;
        
        const currentRotation = this.el.object3D.rotation.z;
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

console.log('========================================');
console.log('✓ Drainage Inspection Simulator Loaded');
console.log('========================================');
console.log('Training Steps:');
console.log('0. Click gutter lid to open');
console.log('1. Click gas meter');
console.log('2. Approach the leak');
console.log('3. Click valve 8 times or grab and turn');
console.log('========================================');
