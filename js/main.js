AFRAME.registerComponent('training-manager', {
  init() {
    this.tasks = [
      { id: 1, completed: false }, // Test atmosphere
      { id: 2, completed: false }, // Identify hazard
      { id: 3, completed: false }, // Communicate
      { id: 4, completed: false }  // Isolate
    ];

    this.el.sceneEl.addEventListener('meter-grabbed', () => {
      this.tasks[0].completed = true;
      console.log('Task 1 complete: Atmosphere tested');
    });
  }
});

/* Task 2 */
AFRAME.registerComponent('proximity-hazard', {
  tick() {
    const rig = document.querySelector('#rig');
    const dist = rig.object3D.position.distanceTo(this.el.object3D.position);

    const manager = document.querySelector('[training-manager]').components['training-manager'];

    if (dist < 1.2 && manager.tasks[0].completed && !manager.tasks[1].completed) {
      manager.tasks[1].completed = true;
      console.log('Task 2 complete: Hazard identified');
    }
  }
});

/* Task 4 */
AFRAME.registerComponent('valve-logic', {
  init() {
    this.el.addEventListener('grab-end', () => {
      const manager = document.querySelector('[training-manager]').components['training-manager'];

      if (manager.tasks[1].completed) {
        manager.tasks[3].completed = true;
        manager.tasks[2].completed = true; // Communication inferred

        document.querySelector('#leakSound').components.sound.stopSound();
        document.querySelector('#ui-panel').setAttribute('visible', true);

        console.log('Hazard isolated successfully');
      }
    });
  }
});

/* Utility */
AFRAME.registerComponent('look-at-camera', {
  tick() {
    this.el.object3D.lookAt(
      this.el.sceneEl.camera.el.object3D.position
    );
  }
});
