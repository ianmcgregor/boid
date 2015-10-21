'use strict';

(function() {
    var Boid = window.Boid,
        canvas = document.querySelector('[data-canvas]'),
        width = canvas.offsetWidth,
        height = canvas.offsetHeight;

    var boids = [],
        boid;

    while (boids.length < 100) {
        boid = new Boid();
        boid.setBounds(width, height);
        boid.maxDistance = 300;
        boid.minDistance = 20;
        boid.position.x = width * Math.random();
        boid.position.y = height * Math.random();
        boid.velocity.x = 20 * Math.random() - 10;
        boid.velocity.y = 20 * Math.random() - 10;
        boids.push(boid);

        boid.userData.el = document.createElement('b');
        canvas.appendChild(boid.userData.el);
    }

    function loop() {
        window.requestAnimationFrame(loop);

        var boid, point, el, transform;

        for (var i = 0; i < boids.length; i++) {
            boid = boids[i];
            boid.flock(boids).update();

            point = boid.position;
            transform = 'translate(' + point.x + 'px,' + point.y + 'px)';

            el = boid.userData.el;
            el.style.WebkitTransform = transform;
            el.style.transform = transform;
        }
    }
    loop();

    window.addEventListener('resize', function() {
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        for (var i = 0; i < boids.length; i++) {
            boids[i].setBounds(width, height);
        }
    });
}());
