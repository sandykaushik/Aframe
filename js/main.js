// =================================================================
// 1. TRAINING MANAGER COMPONENT (State Management)
// =================================================================
AFRAME.registerComponent('training-manager', {
    init: function () {
        this.tasks = [
            { id: 'task-1', text: '[ ] 1. Test atmosphere with gas meter (Required)', completed: false },
            { id: 'task-2', text: '[ ] 2. Identify potential hazards (Leaking hose)', completed: false },
            { id: 'task-3', text: '[ ] 3. Communicate findings to attendant', completed: false },
            { id: 'task-4', text: '[ ] 4. Isolate hazard using valve', completed: false }
        ];
        
        this.taskTextEls = {};
        this.tasks.forEach(task => {
            this.taskTextEls[task.id] = document.querySelector(`#${task.id}`); 
        });
        
        // Register event listeners for task completion
        this.el.sceneEl.addEventListener('meter-grabbed', this.completeStep1.bind(this));
        this.el.sceneEl.addEventListener('hazard-identified', this.completeStep2.bind(this));
        this.el.sceneEl.addEventListener('hazard-isolated', this.completeStep3And4.bind(this));
        
        this.updateTaskList();
    },

    updateTaskList: function () {
        this.tasks.forEach(task => {
            let prefix = task.completed ? '[✓]' : '[ ]';
            let originalDesc = task.text.substring(task.text.indexOf(' ')); 
            this.taskTextEls[task.id].setAttribute('value', prefix + originalDesc);
            if (task.completed) {
                this.taskTextEls[task.id].setAttribute('color', '#00FF00'); // Green when complete
            }
        });
    },

    completeStep1: function () {
        if (!this.tasks[0].completed) {
            this.tasks[0].completed = true;
            this.updateTaskList();
            console.log("Step 1 Complete: Gas meter retrieved.");
        }
    },

    completeStep2: function () {
        if (this.tasks[0].completed && !this.tasks[1].completed) {
            this.tasks[1].completed = true;
            this.updateTaskList();
            console.log("Step 2 Complete: Hazard identified with meter.");
        } else if (!this.tasks[0].completed) {
             console.warn("Hazard approached, but Step 1 (Gas Meter) not completed yet!");
        }
    },
    
    completeStep3And4: function () {
        if (this.tasks[1].completed && !this.tasks[3].completed) { 
            this.tasks[2].completed = true; // Step 3: Communicate findings (inferred)
            this.tasks[3].completed = true; // Step 4: Isolate hazard
            this.updateTaskList();
            document.querySelector('#completion-ui').setAttribute('visible', 'true'); // Show completion message
            console.log("Steps 3 & 4 Complete: Hazard isolated. Training complete.");
        }
    }
});

// =================================================================
// 2. PROXIMITY HAZARD COMPONENT (Leak detection logic)
// =================================================================
AFRAME.registerComponent('proximity-hazard', {
    schema: {
      target: {type: 'selector'}, 
      threshold: {type: 'number', default: 1.5}, 
      sound: {type: 'string', default: ''} 
    },

    init: function () {
      this.cameraEl = document.querySelector('#camera'); 
      this.hazardUIEl = document.querySelector('#hazard-ui'); 
      this.trainingManager = document.querySelector('a-scene').components['training-manager'];
      this.soundPlayed = false;
      
      this.el.setAttribute('sound', { src: this.data.sound, loop: true, volume: 0.0, autoplay: false, rolloffFactor: 0 });
      this.hazardUIEl.setAttribute('visible', 'false'); 
    },

    tick: function () {
      if (!this.data.target || !this.cameraEl) { return; }

      const targetPos = this.data.target.object3D.getWorldPosition(new THREE.Vector3());
      const cameraPos = this.cameraEl.object3D.getWorldPosition(new THREE.Vector3());
      const distance = cameraPos.distanceTo(targetPos);
      const soundEl = this.el.components.sound;

      if (distance < this.data.threshold && !this.soundPlayed) {
        // HAZARD ACTIVATED
        if (soundEl && !soundEl.isPlaying) {
          soundEl.play();
          this.soundPlayed = true;
          this.hazardUIEl.setAttribute('visible', 'true'); 
          
          if (this.trainingManager && this.trainingManager.tasks[0].completed) {
             this.el.sceneEl.emit('hazard-identified');
          }
        }
      } else if (distance >= this.data.threshold + 0.5 && this.soundPlayed) {
        // Cleared the hazard
        if (soundEl && soundEl.isPlaying) {
          soundEl.stop();
          this.soundPlayed = false;
          this.hazardUIEl.setAttribute('visible', 'false'); 
        }
      }
    }
});

// =================================================================
// 3. VALVE LOGIC COMPONENT (Mitigation/Isolation)
// =================================================================
AFRAME.registerComponent('valve-logic', {
    init: function () {
        this.el.addEventListener('turn-end', this.checkIsolation.bind(this));
    },
    
    checkIsolation: function (evt) {
        // Check if hazard was identified (Step 2) before allowing isolation to count
        const manager = document.querySelector('a-scene').components['training-manager'];
        if (!manager.tasks[1].completed) {
            console.warn("Attempted isolation before hazard identification (Step 2)! Training protocol violation.");
            return;
        }
        
        // Fire event to scene to complete remaining steps
        this.el.sceneEl.emit('hazard-isolated'); 

        // Stop the hissing sound 
        const rig = document.querySelector('#rig');
        if (rig.components.sound && rig.components.sound.isPlaying) {
            rig.components.sound.stop();
        }

        // Visually show isolation/securing
        document.querySelector('#hazard-ui').setAttribute('visible', 'false');
        document.querySelector('#hose-hazard').setAttribute('color', '#333333'); 
        
        this.el.removeEventListener('turn-end', this.checkIsolation);
    }
});


// =================================================================
// 4. LOOK-AT CAMERA COMPONENT (For UI Panels)
// =================================================================
AFRAME.registerComponent('look-at-camera', {
    init: function () {
      this.cameraEl = document.querySelector('#camera');
    },
    tick: function () {
      if (this.cameraEl) {
        // Only rotate on the Y-axis to face the user, keeping the plane upright
        this.el.object3D.rotation.y = this.cameraEl.object3D.rotation.y;
      }
    }
});
