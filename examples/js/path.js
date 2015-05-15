'use strict';

(function() {
    var Boid = window.Boid,
        canvas = document.querySelector('canvas'),
        context = canvas.getContext('2d'),
        options = {
          mass: 1,
          maxSpeed: 5,
          maxForce: 1,
          threshold: 20,
          edgeBehavior: null,
          loop: true
        };

    var pathFollower = new Boid();
    pathFollower.setBounds(canvas.width, canvas.height);
    pathFollower.edgeBehavior = options.edgeBehavior;

    var path = (function() {
        var path = [],
            x = canvas.width / 2,
            y = canvas.height / 2,
            radius = 200,
            count = 8,
            angle = Math.PI * 2 / count,
            point;

        for (var i = 0; i < count; i++) {
            point = Boid.vec2();
            point.x = x + radius * Math.cos(i * angle);
            point.y = y + radius * Math.sin(i * angle);
            path.push(point);
        }
        pathFollower.position.set(path[0].x, path[0].y);

        return path;
    }());

    function clearPath() {
        path.length = 0;
        pathFollower.velocity.set(0, 0);
    }

    var placePoint = function(event) {
        if (event.touches) {
            canvas.removeEventListener('mousedown', placePoint);
        }
        var point = Boid.vec2();
        var rect = canvas.getBoundingClientRect();
        point.x = (event.clientX || event.pageX) - rect.left;
        point.y = (event.clientY || event.pageY) - rect.top;
        path.push(point);
    };
    canvas.addEventListener('mousedown', placePoint);
    canvas.addEventListener('touchstart', placePoint);

    function update() {
        pathFollower.followPath(path, options.loop).update();
    }

    function render() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        var angle = pathFollower.velocity.angle + Math.PI / 2;
        var width = 20, height = 20;

        context.fillStyle = 'black';
        context.save();
        context.translate(pathFollower.position.x, pathFollower.position.y);
        context.rotate(angle);
        context.beginPath();
        context.moveTo(0 - width / 2, height / 2);
        context.lineTo(0, 0 - height / 2);
        context.lineTo(width / 2, height / 2);
        context.closePath();
        context.fill();
        context.restore();

        // draw path that pathFollower will follow
        context.fillStyle = '#888888';
        for (var i = 0; i < path.length; i++) {
            var point = path[i];
            context.beginPath();
            context.arc(point.x, point.y, 4, 0, Math.PI * 2);
            context.fill();
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
          pathFollower.mass = value;
        });
        gui.add(options, 'maxSpeed', 0, 100).onChange(function(value) {
          pathFollower.maxSpeed = value;
        });
        gui.add(options, 'maxForce', 0, 10).onChange(function(value) {
          pathFollower.maxForce = value;
        });
        gui.add(options, 'edgeBehavior', [
          'none',
          'wrap',
          'bounce'
        ]).onChange(function(value) {
          pathFollower.edgeBehavior = value;
        });
        gui.add(options, 'threshold', 0, 100).onChange(function(value) {
          pathFollower.pathThreshold = value;
        });
        gui.add(options, 'loop');
        gui.add({
          'clear path': clearPath
        }, 'clear path');
    }());
}());
