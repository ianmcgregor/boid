'use strict';

(function() {
    var Boid = window.Boid,
        canvas = document.querySelector('canvas'),
        context = canvas.getContext('2d'),
        target = Boid.vec2(0, 0),
        options = {
          mass: 1,
          maxSpeed: 5,
          maxForce: 1,
          edgeBehavior: 'bounce'
        };

    // boid that arrives at target position
    var seeker = new Boid();
    seeker.setBounds(canvas.width, canvas.height);
    var seekerAngle = 0;

    function update() {
        seeker.arrive(target).update();
    }

    function render() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        if(target.distance(seeker.position) > 5) {
            seekerAngle = seeker.velocity.angle + Math.PI / 2;
        }

        var width = 30, height = 40;

        context.save();
        context.translate(seeker.position.x, seeker.position.y);
        context.rotate(seekerAngle);
        context.beginPath();
        context.moveTo(0 - width / 2, height / 2);
        context.lineTo(0, 0 - height / 2);
        context.lineTo(width / 2, height / 2);
        context.closePath();
        context.fill();
        context.restore();
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
          seeker.mass = value;
        });
        gui.add(options, 'maxSpeed', 0, 100).onChange(function(value) {
          seeker.maxSpeed = value;
        });
        gui.add(options, 'maxForce', 0, 10).onChange(function(value) {
          seeker.maxForce = value;
        });
        gui.add(options, 'edgeBehavior', [
          'none',
          'wrap',
          'bounce'
        ]).onChange(function(value) {
          seeker.edgeBehavior = value;
        });
    }());
}());
