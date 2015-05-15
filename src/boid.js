'use strict';

var Vec2 = require('./vec2.js');

function Boid() {
    var position = Vec2.get();
    var velocity = Vec2.get();
    var steeringForce = Vec2.get();
    var bounds = {x:0, y:0, width:640, height:480};
    var edgeBehavior = Boid.EDGE_BOUNCE;
    var mass = 1.0;
    var maxSpeed = 10;
    var maxForce = 1;
    // arrive
    var arriveThreshold = 50;
    // wander
    var wanderDistance = 10;
    var wanderRadius = 5;
    var wanderAngle = 0;
    var wanderRange = 1;
    // avoid
    var avoidDistance = 300;
    var avoidBuffer = 20;
    // follow path
    var pathIndex = 0;
    var pathThreshold = 20;
    // flock
    var inSightDistance = 300;
    var tooCloseDistance = 60;

    var setBounds = function(width, height, x, y) {
        bounds.width = width;
        bounds.height = height;
        bounds.x = x || 0;
        bounds.y = y || 0;

        return boid;
    };

    var update = function() {
        steeringForce.truncate(maxForce);
        steeringForce.divideBy(mass);
        velocity.add(steeringForce);
        steeringForce.reset();
        velocity.truncate(maxSpeed);
        position.add(velocity);

        if (edgeBehavior === Boid.EDGE_BOUNCE) {
            bounce();
        } else if (edgeBehavior === Boid.EDGE_WRAP) {
            wrap();
        }
        return boid;
    };

    var bounce = function() {
        if (position.x > bounds.width) {
            position.x = bounds.width;
            velocity.x *= -1;
        } else if (position.x < bounds.x) {
            position.x = bounds.x;
            velocity.x *= -1;
        }
        if (position.y > bounds.height) {
            position.y = bounds.height;
            velocity.y *= -1;
        } else if (position.y < bounds.y) {
            position.y = bounds.y;
            velocity.y *= -1;
        }
    };

    var wrap = function() {
        if (position.x > bounds.width) {
            position.x = bounds.x;
        } else if (position.x < bounds.x) {
            position.x = bounds.width;
        }
        if (position.y > bounds.height) {
            position.y = bounds.y;
        } else if (position.y < bounds.y) {
            position.y = bounds.height;
        }
    };

    var seek = function(targetVec) {
        var desiredVelocity = targetVec.clone().subtract(position);
        desiredVelocity.normalize();
        desiredVelocity.scaleBy(maxSpeed);

        var force = desiredVelocity.subtract(velocity);
        steeringForce.add(force);
        force.dispose();

        return boid;
    };

    var flee = function(targetVec) {
        var desiredVelocity = targetVec.clone().subtract(position);
        desiredVelocity.normalize();
        desiredVelocity.scaleBy(maxSpeed);

        var force = desiredVelocity.subtract(velocity);
        steeringForce.subtract(force);
        force.dispose();

        return boid;
    };

    // seek until within arriveThreshold
    var arrive = function(targetVec) {
        var desiredVelocity = targetVec.clone().subtract(position);
        desiredVelocity.normalize();

        var distance = position.distance(targetVec);
        if (distance > arriveThreshold) {
            desiredVelocity.scaleBy(maxSpeed);
        } else {
            var scalar = maxSpeed * distance / arriveThreshold;
            desiredVelocity.scaleBy(scalar);
        }
        var force = desiredVelocity.subtract(velocity);
        steeringForce.add(force);
        force.dispose();

        return boid;
    };

    // look at velocity of boid and try to predict where it's going
    var pursue = function(targetBoid) {
        var lookAheadTime = position.distance(targetBoid.position) / maxSpeed;
        // e.g. of where new vec should be returned:
        var scaledVelocity = targetBoid.velocity.clone().scaleBy(lookAheadTime);
        var predictedTarget = targetBoid.position.clone().add(scaledVelocity);
        seek(predictedTarget);

        scaledVelocity.dispose();
        predictedTarget.dispose();

        return boid;
    };

    // look at velocity of boid and try to predict where it's going
    var evade = function(targetBoid) {
        var lookAheadTime = position.distance(targetBoid.position) / maxSpeed;
        // e.g. of where new vec should be returned:
        var scaledVelocity = targetBoid.velocity.clone().scaleBy(lookAheadTime);
        var predictedTarget = targetBoid.position.clone().add(scaledVelocity);
        // only this line diff from pursue:
        flee(predictedTarget);

        scaledVelocity.dispose();
        predictedTarget.dispose();

        return boid;
    };

    // wander around, changing angle by a limited amount each tick
    var wander = function() {
        var center = velocity.clone().normalize().scaleBy(wanderDistance);

        var offset = Vec2.get();
        offset.length = wanderRadius;
        offset.angle = wanderAngle;
        wanderAngle += Math.random() * wanderRange - wanderRange * 0.5;

        var force = center.add(offset);
        steeringForce.add(force);

        offset.dispose();
        force.dispose();

        return boid;
    };

    // gets a bit rough used in combination with seeking as the boid attempts
    // to seek straight through an object while simultaneously trying to avoid it
    var avoid = function(obstacles) {
        for (var i = 0; i < obstacles.length; i++) {
            var obstacle = obstacles[i];
            var heading = velocity.clone().normalize();

            // vec between obstacle and boid
            var difference = obstacle.position.clone().subtract(position);
            var dotProd = difference.dotProduct(heading);

            // if obstacle in front of boid
            if (dotProd > 0) {
                // vec to represent 'feeler' arm
                var feeler = heading.clone().scaleBy(avoidDistance);
                // project difference onto feeler
                var projection = heading.clone().scaleBy(dotProd);
                // distance from obstacle to feeler
                var vecDistance = projection.subtract(difference);
                var distance = vecDistance.length;
                // if feeler intersects obstacle (plus buffer), and projection
                // less than feeler length, will collide
                if (distance < (obstacle.radius || 0) + avoidBuffer && projection.length < feeler.length) {
                    // calc a force +/- 90 deg from vec to circ
                    var force = heading.clone().scaleBy(maxSpeed);
                    force.angle += difference.sign(velocity) * Math.PI / 2;
                    // scale force by distance (further = smaller force)
                    force.scaleBy(1 - projection.length / feeler.length);
                    // add to steering force
                    steeringForce.add(force);
                    // braking force - slows boid down so it has time to turn (closer = harder)
                    velocity.scaleBy(projection.length / feeler.length);

                    force.dispose();
                }
                feeler.dispose();
                projection.dispose();
                vecDistance.dispose();
            }
            heading.dispose();
            difference.dispose();
        }
        return boid;
    };

    // follow a path made up of an array or vectors
    var followPath = function(path, loop) {
        loop = !!loop;

        var wayPoint = path[pathIndex];
        if (!wayPoint) {
          pathIndex = 0;
          return boid;
        }
        if (position.distance(wayPoint) < pathThreshold) {
            if (pathIndex >= path.length-1) {
                if (loop) { pathIndex = 0; }
            }
            else {
                pathIndex++;
            }
        }
        if (pathIndex >= path.length-1 && !loop) {
            arrive(wayPoint);
        }
        else {
            seek(wayPoint);
        }
        return boid;
    };

    // flock - group of boids loosely move together
    var flock = function(boids) {
        var averageVelocity = velocity.clone();
        var averagePosition = Vec2.get();
        var inSightCount = 0;
        for (var i = 0; i < boids.length; i++) {
            var b = boids[i];
            if (b !== boid && inSight(b)) {
                averageVelocity.add(b.velocity);
                averagePosition.add(b.position);
                if (tooClose(b)) {
                    flee(b.position);
                }
                inSightCount++;
            }
        }
        if (inSightCount > 0) {
            averageVelocity.divideBy(inSightCount);
            averagePosition.divideBy(inSightCount);
            seek(averagePosition);
            steeringForce.add(averageVelocity.subtract(velocity));
        }
        averageVelocity.dispose();
        averagePosition.dispose();

        return boid;
    };

    // is boid close enough to be in sight? for use with flock
    var inSight = function(boid) {
        if (position.distance(boid.position) > inSightDistance) {
            return false;
        }
        var heading = velocity.clone().normalize();
        var difference = boid.position.clone().subtract(position);
        var dotProd = difference.dotProduct(heading);

        heading.dispose();
        difference.dispose();

        if (dotProd < 0) {
            return false;
        }
        return true;
    };

    // is boid too close? for use with flock
    var tooClose = function(boid) {
        return position.distance(boid.position) < tooCloseDistance;
    };

    // methods
    var boid = {
      setBounds: setBounds,
      update: update,
      pursue: pursue,
      evade: evade,
      wander: wander,
      avoid: avoid,
      followPath: followPath,
      flock: flock,
      arrive: arrive,
      flee: flee,
      userData: {}
    };

    // getters / setters
    Object.defineProperties(boid, {
      position: {
          get: function() { return position; }
      },
      velocity: {
          get: function() { return velocity; }
      },
      edgeBehavior: {
          get: function() { return edgeBehavior; },
          set: function(value) { edgeBehavior = value; }
      },
      mass: {
          get: function() { return mass; },
          set: function(value) { mass = value; }
      },
      maxSpeed: {
          get: function() { return maxSpeed; },
          set: function(value) { maxSpeed = value; }
      },
      maxForce: {
          get: function() { return maxForce; },
          set: function(value) { maxForce = value; }
      },
      // arrive
      arriveThreshold: {
          get: function() { return arriveThreshold; },
          set: function(value) { arriveThreshold = value; }
      },
      // wander
      wanderDistance: {
          get: function() { return wanderDistance; },
          set: function(value) { wanderDistance = value; }
      },
      wanderRadius: {
          get: function() { return wanderRadius; },
          set: function(value) { wanderRadius = value; }
      },
      wanderRange: {
          get: function() { return wanderRange; },
          set: function(value) { wanderRange = value; }
      },
      // avoid
      avoidDistance: {
          get: function() { return avoidDistance; },
          set: function(value) { avoidDistance = value; }
      },
      avoidBuffer: {
          get: function() { return avoidBuffer; },
          set: function(value) { avoidBuffer = value; }
      },
      // followPath
      pathIndex: {
          get: function() { return pathIndex; },
          set: function(value) { pathIndex = value; }
      },
      pathThreshold: {
          get: function() { return pathThreshold; },
          set: function(value) { pathThreshold = value; }
      },
      //  flock
      inSightDistance: {
          get: function() { return inSightDistance; },
          set: function(value) { inSightDistance = value; }
      },
      tooCloseDistance: {
          get: function() { return tooCloseDistance; },
          set: function(value) { tooCloseDistance = value; }
      }
    });

    return Object.freeze(boid);
}

// edge behaviors
Boid.EDGE_NONE = 'none';
Boid.EDGE_BOUNCE = 'bounce';
Boid.EDGE_WRAP = 'wrap';

// vec2
Boid.Vec2 = Vec2;

Boid.vec2 = function(x, y) {
    return Vec2.get(x, y);
};

// for defining obstacles or areas to avoid
Boid.obstacle = function(radius, x, y) {
    return {
        radius: radius,
        position: Vec2.get(x, y)
    };
};

if (typeof module === 'object' && module.exports) {
    module.exports = Boid;
}