'use strict';

(function() {
    var Boid = window.Boid,
        canvas = document.querySelector('canvas'),
        context = canvas.getContext('2d'),
        target = Boid.vec2(0, 0),
        width = 6, height = 10,
        options = {
          mass: 1,
          maxSpeed: 2,
          maxForce: 1,
          edgeBehavior: 'bounce',
          count: 40,
          randomColors: false,
          clear: true
        };

    // boids that flee

    var fleers = [];
    while (fleers.length < options.count) {
        fleers.push(createFleer());
    }

    function randomColor() {
      var rnd = 0xFFFFFF * Math.random();
      return '#' + Math.floor(rnd).toString(16);
    }

    function createFleer() {
        var fleer = new Boid();
        fleer.userData.angle = 0;
        fleer.userData.color = randomColor();
        fleer.setBounds(canvas.width, canvas.height);
        fleer.maxSpeed = options.maxSpeed;
        fleer.position.x = canvas.width * Math.random();
        fleer.position.y = canvas.height * Math.random();
        fleer.velocity.x = 20 * Math.random() - 10;
        fleer.velocity.y = 20 * Math.random() - 10;
        return fleer;
    }

    function update() {
        // flee when pointer is close
        fleers.forEach(function(fleer) {
            if(target.distance(fleer.position) < 150) {
                fleer.flee(target);
                // fleer.evade(targetBoid);
            } else {
                fleer.flock(fleers);
            }
            fleer.update();
        });
    }

    function render() {
        if (options.clear) {
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
        context.fillStyle = 'black';

        fleers.forEach(function(fleer) {
            var oldAngle = fleer.userData.angle;
            var newAngle = fleer.velocity.angle + Math.PI / 2;
            fleer.userData.angle = oldAngle + ( newAngle - oldAngle ) * 0.1;

            if (options.randomColors) {
                context.fillStyle = fleer.userData.color;
            }
            context.save();
            context.translate(fleer.position.x, fleer.position.y);
            context.rotate(fleer.userData.angle);
            context.beginPath();
            context.moveTo(0 - width / 2, height / 2);
            context.lineTo(0, 0 - height / 2);
            context.lineTo(width / 2, height / 2);
            context.closePath();
            context.fill();
            context.restore();
        });
    }

    function loop() {
        window.requestAnimationFrame(loop);
        update();
        render();
    }
    loop();

    var move = function(event) {
        if (event.touches) {
            canvas.removeEventListener('mousemove', move);
        }
        var rect = canvas.getBoundingClientRect();
        target.x = (event.clientX || event.pageX) - rect.left;
        target.y = (event.clientY || event.pageY) - rect.top;

        // handles resized canvas:
        // x = Math.round((event.clientX-rect.left)/(rect.right-rect.left)*canvas.width),
        // y = Math.round((event.clientY-rect.top)/(rect.bottom-rect.top)*canvas.height)
    };
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('touchmove', move);

    (function() {
        var gui = new window.dat.GUI();
        gui.add(options, 'mass', 0, 10).onChange(function(value) {
          fleers.forEach(function(fleer) {
              fleer.mass = value;
          });
        });
        gui.add(options, 'maxSpeed', 0, 100).onChange(function(value) {
          fleers.forEach(function(fleer) {
              fleer.maxSpeed = value;
          });
        });
        gui.add(options, 'maxForce', 0, 10).onChange(function(value) {
          fleers.forEach(function(fleer) {
              fleer.maxForce = value;
          });
        });
        gui.add(options, 'edgeBehavior', [
          'none',
          'wrap',
          'bounce'
        ]).onChange(function(value) {
          fleers.forEach(function(fleer) {
              fleer.edgeBehavior = value;
          });
        });
        gui.add(options, 'count', 1, 200).onChange(function(value) {
          while (fleers.length < value) {
              fleers.push(createFleer());
          }
          while (fleers.length > value) {
              fleers.pop();
          }
        });
        gui.add(options, 'randomColors').name('random colors');
        gui.add(options, 'clear').name('clear canvas');
    }());
}());
