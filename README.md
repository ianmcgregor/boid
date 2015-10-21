# boid

[![NPM version](https://badge.fury.io/js/boid.svg)](http://badge.fury.io/js/boid) [![Bower version](https://badge.fury.io/bo/boid.svg)](http://badge.fury.io/bo/boid) [![Build Status](https://secure.travis-ci.org/ianmcgregor/boid.png)](https://travis-ci.org/ianmcgregor/boid)

Bird-like behaviours (<http://en.wikipedia.org/wiki/Boids>)

[Examples](https://ianmcgregor.github.io/boid/examples/)

### Installation

npm:
```shell
npm install boid --save-dev
```
bower:
```shell
bower install boid --save-dev
```

### Usage

```javascript
var Boid = require('boid');

var canvas = document.querySelector('canvas'),
    context = canvas.getContext('2d'),
    flockers = [],
    flocker;

while (flockers.length < 40) {
    flocker = new Boid();
    flocker.setBounds(canvas.width, canvas.height);
    flocker.position.x = canvas.width * Math.random();
    flocker.position.y = canvas.height * Math.random();
    flocker.velocity.x = 20 * Math.random() - 10;
    flocker.velocity.y = 20 * Math.random() - 10;
    flockers.push(flocker);
}

function update() {
    window.requestAnimationFrame(update);

    context.clearRect(0, 0, canvas.width, canvas.height);

    flockers.forEach(function(boid) {
        boid.flock(flockers);
        boid.update();

        var point = boid.position;
        context.beginPath();
        context.arc(point.x, point.y, 3, 0, Math.PI * 2);
        context.fill();
    });
}
update();
```

### Behaviours

```javascript
// steer towards a target position
boid.seek(targetVector);

// steer away from a target position
boid.flee(targetVector);

// seek until within arriveThreshold
boid.arrive(targetVector);

// steer towards a target boid predicting where it's velocity is taking it
boid.pursue(targetBoid);

// steer away from a target boid predicting where it's velocity is taking it
boid.evade(targetBoid);

// wander around randomly
boid.wander();

// attempt to avoid an array of objects with x, y and radius properties
boid.avoid(obstacles);

// follow a path made up of an array or vectors, optionally looping
boid.followPath(path, loop);

// flock - group of boids loosely move together
boid.flock(boids);

// update must be called after any behaviours
boid.update();
```

### Configuration

```javascript
// position vector
boid.position.x
boid.position.y
// velocity vector
boid.velocity.x
boid.velocity.y
// empty object for any properties needed e.g. id or color
boid.userData

// affects all behaviours:

// define the area containing the boid
boid.setBounds(width, height, x, y);
// how the boid reacts when hitting the bounds
// can be Boid.EDGE_NONE, Boid.EDGE_WRAP or Boid.EDGE_BOUNCE
boid.edgeBehavior
// mass - affects the steering force
boid.mass
// maximum speed
boid.maxSpeed
// maximum force to apply to steering
boid.maxForce

// affects arrive behaviour:

// threshold at which the boid reaches target
boid.arriveThreshold

// affects wander behaviour:

// distance forward to go towards
boid.wanderDistance
// distance to wander from heading
boid.wanderRadius
// range that angle is updated to (plus or minus)
boid.wanderRange

// affects avoid behaviour:

// distance to look ahead
boid.avoidDistance
// buffer to avoid the obstacle by
boid.avoidBuffer

// affects followPath behaviour:

// the current index the boid has reached in the path array
boid.pathIndex
// the threshold at which the boid reaches each waypoint
boid.pathThreshold

// affects flock behaviour:

// distance within which boid has sight of the flock
boid.maxDistance
// distance within which boid is too close to another boid
boid.minDistance
```

### Helpers

```javascript
Boid.EDGE_NONE
Boid.EDGE_BOUNCE
Boid.EDGE_WRAP
Boid.vec2(x, y)
Boid.obstacle(radius, x, y)

```
### Dev setup

To install dependencies:

```
$ npm install
$ bower install
```

To run tests:

```
$ npm install -g karma-cli
$ karma start
```
