'use strict';

(function() {

    var time = 0,
        fps = 0,
        currentFps = 0,
        averageFps = 0,
        ticks = 0,
        totalFps = 0,
        lastFps = 0,
        lastAverage = 0;

    var el = document.createElement('div');
    el.setAttribute('id', 'fps');
    el.style.position = 'fixed';
    el.style.top = '0';
    el.style.left = '0';
    el.style.padding = '2px 6px';
    el.style.zIndex = '99999';
    el.style.background = '#000';
    el.style.color = '#fff';
    el.style.fontSize = '10px';
    document.body.appendChild(el);

    function report() {
        if (currentFps === lastFps && averageFps === lastAverage) {
          return;
        }
        lastFps = currentFps;
        lastAverage = averageFps;
        el.innerHTML = 'FPS: ' + currentFps + '<br />AVE: ' + averageFps;
    }

    function update() {
        window.requestAnimationFrame(update);

        var now = Date.now();

        if (time === 0) {
            time = now;
        }

        if (now - 1000 > time) {
            time = now;
            currentFps = fps;
            fps = 0;

            if (currentFps > 1) {
                ticks ++;
                totalFps += currentFps;
                averageFps = Math.floor(totalFps / ticks);
            }
            report();
        }

        fps++;
    }

    update();

}());
