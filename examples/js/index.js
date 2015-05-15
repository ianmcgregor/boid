'use strict';

(function() {
    var Boid = window.Boid,
        canvas = document.querySelector('canvas'),
        context = canvas.getContext('2d');

    var flockers = [],
        flocker;

    while (flockers.length < 100) {
        flocker = new Boid();
        flocker.inSightDistance = 300;
        flocker.tooCloseDistance = 20;
        flocker.position.x = canvas.width * Math.random();
        flocker.position.y = canvas.height * Math.random();
        flocker.velocity.x = 20 * Math.random() - 10;
        flocker.velocity.y = 20 * Math.random() - 10;
        flockers.push(flocker);
    }

    function update() {
        for (var i = 0; i < flockers.length; i++) {
            flockers[i].flock(flockers).update();
        }
    }

    function render() {
        context.clearRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < flockers.length; i++) {
            var point = flockers[i].position;
            context.beginPath();
            context.arc(point.x, point.y, 2, 0, Math.PI * 2);
            context.fill();
        }
    }

    function loop() {
        window.requestAnimationFrame(loop);
        update();
        render();
    }
    loop();
}());
