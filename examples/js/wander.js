'use strict';

(function() {
    var Boid = window.Boid,
        canvas = document.querySelector('canvas'),
        context = canvas.getContext('2d'),
        canvasTrails, contextTrails,
        options = {
          mass: 1,
          maxSpeed: 5,
          maxForce: 1,
          edgeBehavior: 'bounce',
          distance: 10,
          radius: 5,
          angle: 0,
          range: 1,
          count: 1,
          randomColors: false,
          clear: true,
          size: 16,
          trails: false
        };

    var wanderers = [];
    while (wanderers.length < options.count) {
        wanderers.push(createWanderer());
    }

    function randomColor() {
      var rnd = 0xFFFFFF * Math.random();
      return '#' + Math.floor(rnd).toString(16);
    }

    function createWanderer() {
      var wanderer = new Boid();
      wanderer.setBounds(canvas.width, canvas.height);
      wanderer.position.x = canvas.width / 2;
      wanderer.position.y = canvas.height / 2;
      wanderer.userData.color = randomColor();
      wanderer.maxSpeed = options.maxSpeed;
      return wanderer;
    }

    var obstacles = [];

    function addObstacle() {
      var radius = Math.random() * 20 + 20,
          x = Math.random() * canvas.width,
          y = Math.random() * canvas.height;
      obstacles.push(Boid.obstacle(radius, x, y));
    }

    function drawObstacles() {
      context.fillStyle = '#bbbbbb';
      for (var i = 0; i < obstacles.length; i++) {
          var point = obstacles[i].position,
              radius = obstacles[i].radius;
          context.beginPath();
          context.arc(point.x, point.y, radius, 0, Math.PI * 2);
          context.fill();
      }
    }

    function update() {
        for (var i = 0; i < wanderers.length; i++) {
            wanderers[i].wander()
              .avoid(obstacles)
              .update();
        }
    }

    function render() {
        if (options.trails) {
            if (!contextTrails) {
                canvasTrails = document.createElement('canvas');
                canvasTrails.width = canvas.width;
                canvasTrails.height = canvas.height;
                contextTrails = canvasTrails.getContext('2d');
            }
            contextTrails.clearRect(0, 0, canvas.width, canvas.height);
            contextTrails.globalAlpha = 0.95;
            contextTrails.drawImage(canvas, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(canvasTrails, 0, 0);
        } else if (options.clear) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
        context.fillStyle = 'black';

        for (var i = 0; i < wanderers.length; i++) {
            var wanderer = wanderers[i];
            var point = wanderers[i].position;
            if (options.randomColors) {
                context.fillStyle = wanderer.userData.color;
            }
            context.beginPath();
            context.arc(point.x, point.y, options.size / 2, 0, Math.PI * 2);
            context.fill();
        }

        drawObstacles();
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
          wanderers.forEach(function(wanderer) {
            wanderer.mass = value;
          });
        });
        gui.add(options, 'maxSpeed', 0, 100).onChange(function(value) {
          wanderers.forEach(function(wanderer) {
            wanderer.maxSpeed = value;
          });
        });
        gui.add(options, 'maxForce', 0, 10).onChange(function(value) {
          wanderers.forEach(function(wanderer) {
            wanderer.maxForce = value;
          });
        });
        gui.add(options, 'edgeBehavior', [
          'none',
          'wrap',
          'bounce'
        ]).onChange(function(value) {
          wanderers.forEach(function(wanderer) {
            wanderer.edgeBehavior = value;
          });
        });
        gui.add(options, 'distance', 0, 20).onChange(function(value) {
          wanderers.forEach(function(wanderer) {
            wanderer.wanderDistance = value;
          });
        });
        gui.add(options, 'radius', 0, 100).onChange(function(value) {
          wanderers.forEach(function(wanderer) {
            wanderer.wanderRadius = value;
          });
        });
        gui.add(options, 'range', 0, Math.PI).onChange(function(value) {
          wanderers.forEach(function(wanderer) {
            wanderer.wanderRange = value;
          });
        });
        gui.add({
          'add obstacle': addObstacle
        }, 'add obstacle');
        gui.add(options, 'count', 1, 200).onChange(function(value) {
          while (wanderers.length < value) {
              wanderers.push(createWanderer());
          }
          while (wanderers.length > value) {
              wanderers.pop();
          }
        });
        gui.add(options, 'randomColors').name('random colors');
        gui.add(options, 'clear').name('clear canvas');
        gui.add(options, 'size', 1, 100);
        gui.add(options, 'trails');
    }());
}());
