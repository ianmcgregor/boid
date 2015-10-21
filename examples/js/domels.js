'use strict';

(function() {
    var Boid = window.Boid,
        canvas = document.querySelector('[data-canvas]'),
        options = {
          mass: 1,
          maxSpeed: 5,
          maxForce: 1,
          edgeBehavior: 'bounce',
          maxDistance: 400,
          minDistance: 20,
          count: 40
        };

    Boid.Vec2.fill(100);

    var flockers = [];
    while (flockers.length < options.count) {
        var flocker = createFlocker();
        canvas.appendChild(flocker.userData.el);
        flockers.push(flocker);
    }

    function randomColor() {
      var rnd = 0xFFFFFF * Math.random();
      return '#' + Math.floor(rnd).toString(16);
    }

    function createFlocker() {
      var flocker = new Boid();
      flocker.position.x = canvas.offsetWidth * Math.random();
      flocker.position.y = canvas.offsetHeight * Math.random();
      flocker.velocity.x = 20 * Math.random() - 10;
      flocker.velocity.y = 20 * Math.random() - 10;

      flocker.userData.el = document.createElement('b');
      flocker.userData.el.style.display = 'block';
      flocker.userData.el.style.width = '10px';
      flocker.userData.el.style.height = '10px';
      flocker.userData.el.style.backgroundColor = randomColor();

      return flocker;
    }

    function update() {
        for (var i = 0; i < flockers.length; i++) {
            flockers[i].flock(flockers).update();
        }
    }

    function render() {
        for (var i = 0; i < flockers.length; i++) {
            var point = flockers[i].position;
            var el = flockers[i].userData.el;
            // el.style.transform = 'translate(' + point.x + 'px,' + point.y + 'px)';
            var x = (Math.floor(point.x / 10) * 10);
            var y = (Math.floor(point.y / 10) * 10);
            el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        }
    }

    function loop() {
        window.requestAnimationFrame(loop);
        update();
        render();
    }
    loop();

    (function() {
        var gui = new window.dat.GUI();
        gui.add(options, 'mass', 0, 10).onChange(function(value) {
          flockers.forEach(function(flocker) {
            flocker.mass = value;
          });
        });
        gui.add(options, 'maxSpeed', 0, 100).onChange(function(value) {
          flockers.forEach(function(flocker) {
            flocker.maxSpeed = value;
          });
        });
        gui.add(options, 'maxForce', 0, 10).onChange(function(value) {
          flockers.forEach(function(flocker) {
            flocker.maxForce = value;
          });
        });
        gui.add(options, 'edgeBehavior', [
          'none',
          'wrap',
          'bounce'
        ]).onChange(function(value) {
          flockers.forEach(function(flocker) {
            flocker.edgeBehavior = value;
          });
        });
        gui.add(options, 'maxDistance', 0, 500).onChange(function(value) {
          flockers.forEach(function(flocker) {
            flocker.maxDistance = value;
          });
        });
        gui.add(options, 'minDistance', 0, 100).onChange(function(value) {
          flockers.forEach(function(flocker) {
            flocker.minDistance = value;
          });
        });
        gui.add(options, 'count', 1, 200).onChange(function(value) {
          while (flockers.length < value) {
              var flocker = createFlocker();
              canvas.appendChild(flocker.userData.el);
              flockers.push(flocker);
          }
          while (flockers.length > value) {
              var flocker = flockers.pop();
              canvas.removeChild(flocker.userData.el);
          }
        });
    }());
}());
