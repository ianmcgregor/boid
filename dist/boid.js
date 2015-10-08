(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Boid = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./vec2.js":2}],2:[function(require,module,exports){
'use strict';

function Vec2(x, y) {
    this.x = x || 0;
    this.y = y || 0;
}

Vec2.prototype = {
    add: function(vec) {
        this.x = this.x + vec.x;
        this.y = this.y + vec.y;
        return this;
    },
    subtract: function(vec) {
        this.x = this.x - vec.x;
        this.y = this.y - vec.y;
        return this;
    },
    normalize: function() {
        var l = this.length;
        if(l === 0) {
            this.x = 1;
            return this;
        }
        this.x /= l;
        this.y /= l;
        return this;
    },
    isNormalized: function() {
        return this.length === 1;
    },
    truncate:  function(max) {
        if(this.length > max) {
            this.length = max;
        }
        return this;
    },
    scaleBy: function(mul) {
        this.x *= mul;
        this.y *= mul;
        return this;
    },
    divideBy: function(div) {
        this.x /= div;
        this.y /= div;
        return this;
    },
    equals: function(vec) {
        return this.x === vec.x && this.y === vec.y;
    },
    negate: function() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    },
    dotProduct: function(vec) {
        /*
        If A and B are perpendicular (at 90 degrees to each other), the result of the dot product will be zero, because cos(Θ) will be zero.
        If the angle between A and B are less than 90 degrees, the dot product will be positive (greater than zero), as cos(Θ) will be positive, and the vector lengths are always positive values.
        If the angle between A and B are greater than 90 degrees, the dot product will be negative (less than zero), as cos(Θ) will be negative, and the vector lengths are always positive values
        */
        return this.x * vec.x + this.y * vec.y;
    },
    crossProduct: function(vec) {
        /*
        The sign tells us if vec to the left (-) or the right (+) of this vec
        */
        return this.x * vec.y - this.y * vec.x;
    },
    distanceSquared: function(vec) {
        var dx = vec.x - this.x;
        var dy = vec.y - this.y;
        return dx * dx + dy * dy;
    },
    distance: function(vec) {
        return Math.sqrt(this.distanceSquared(vec));
    },
    clone: function() {
        return Vec2.get(this.x, this.y);
    },
    reset: function() {
        this.x = 0;
        this.y = 0;
        return this;
    },
    perpendicular: function() {
        return Vec2.get(-this.y, this.x);
    },
    sign: function(vec) {
        // Determines if a given vector is to the right or left of this vector.
        // If to the left, returns -1. If to the right, +1.
        var p = this.perpendicular();
        var s = p.dotProduct(vec) < 0 ? -1 : 1;
        p.dispose();
        return s;
    },
    set: function(x, y) {
        this.x = x || 0;
        this.y = y || 0;
        return this;
    },
    dispose: function() {
        Vec2.pool.push(this.reset());
    }
};

// getters / setters

Object.defineProperties(Vec2.prototype, {
  lengthSquared: {
      get: function() {
          return this.x * this.x + this.y * this.y;
      }
  },
  length: {
      get: function() {
          return Math.sqrt(this.lengthSquared);
      },
      set: function(value) {
          var a = this.angle;
          this.x = Math.cos(a) * value;
          this.y = Math.sin(a) * value;
      }
  },
  angle: {
      get: function() {
          return Math.atan2(this.y, this.x);
      },
      set: function(value) {
          var l = this.length;
          this.x = Math.cos(value) * l;
          this.y = Math.sin(value) * l;
      }
  }
});

// static

Vec2.pool = [];
Vec2.get = function(x, y) {
    var v = Vec2.pool.length > 0 ? Vec2.pool.pop() : new Vec2();
    v.set(x, y);
    return v;
};

Vec2.angleBetween = function(a, b) {
    if(!a.isNormalized()) { a = a.clone().normalize(); }
    if(!b.isNormalized()) { b = b.clone().normalize(); }
    return Math.acos(a.dotProduct(b));
};

if (typeof module === 'object' && module.exports) {
    module.exports = Vec2;
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm9pZC5qcyIsInNyYy92ZWMyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBWZWMyID0gcmVxdWlyZSgnLi92ZWMyLmpzJyk7XG5cbmZ1bmN0aW9uIEJvaWQoKSB7XG4gICAgdmFyIHBvc2l0aW9uID0gVmVjMi5nZXQoKTtcbiAgICB2YXIgdmVsb2NpdHkgPSBWZWMyLmdldCgpO1xuICAgIHZhciBzdGVlcmluZ0ZvcmNlID0gVmVjMi5nZXQoKTtcbiAgICB2YXIgYm91bmRzID0ge3g6MCwgeTowLCB3aWR0aDo2NDAsIGhlaWdodDo0ODB9O1xuICAgIHZhciBlZGdlQmVoYXZpb3IgPSBCb2lkLkVER0VfQk9VTkNFO1xuICAgIHZhciBtYXNzID0gMS4wO1xuICAgIHZhciBtYXhTcGVlZCA9IDEwO1xuICAgIHZhciBtYXhGb3JjZSA9IDE7XG4gICAgLy8gYXJyaXZlXG4gICAgdmFyIGFycml2ZVRocmVzaG9sZCA9IDUwO1xuICAgIC8vIHdhbmRlclxuICAgIHZhciB3YW5kZXJEaXN0YW5jZSA9IDEwO1xuICAgIHZhciB3YW5kZXJSYWRpdXMgPSA1O1xuICAgIHZhciB3YW5kZXJBbmdsZSA9IDA7XG4gICAgdmFyIHdhbmRlclJhbmdlID0gMTtcbiAgICAvLyBhdm9pZFxuICAgIHZhciBhdm9pZERpc3RhbmNlID0gMzAwO1xuICAgIHZhciBhdm9pZEJ1ZmZlciA9IDIwO1xuICAgIC8vIGZvbGxvdyBwYXRoXG4gICAgdmFyIHBhdGhJbmRleCA9IDA7XG4gICAgdmFyIHBhdGhUaHJlc2hvbGQgPSAyMDtcbiAgICAvLyBmbG9ja1xuICAgIHZhciBpblNpZ2h0RGlzdGFuY2UgPSAzMDA7XG4gICAgdmFyIHRvb0Nsb3NlRGlzdGFuY2UgPSA2MDtcblxuICAgIHZhciBzZXRCb3VuZHMgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0LCB4LCB5KSB7XG4gICAgICAgIGJvdW5kcy53aWR0aCA9IHdpZHRoO1xuICAgICAgICBib3VuZHMuaGVpZ2h0ID0gaGVpZ2h0O1xuICAgICAgICBib3VuZHMueCA9IHggfHwgMDtcbiAgICAgICAgYm91bmRzLnkgPSB5IHx8IDA7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgc3RlZXJpbmdGb3JjZS50cnVuY2F0ZShtYXhGb3JjZSk7XG4gICAgICAgIHN0ZWVyaW5nRm9yY2UuZGl2aWRlQnkobWFzcyk7XG4gICAgICAgIHZlbG9jaXR5LmFkZChzdGVlcmluZ0ZvcmNlKTtcbiAgICAgICAgc3RlZXJpbmdGb3JjZS5yZXNldCgpO1xuICAgICAgICB2ZWxvY2l0eS50cnVuY2F0ZShtYXhTcGVlZCk7XG4gICAgICAgIHBvc2l0aW9uLmFkZCh2ZWxvY2l0eSk7XG5cbiAgICAgICAgaWYgKGVkZ2VCZWhhdmlvciA9PT0gQm9pZC5FREdFX0JPVU5DRSkge1xuICAgICAgICAgICAgYm91bmNlKCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZWRnZUJlaGF2aW9yID09PSBCb2lkLkVER0VfV1JBUCkge1xuICAgICAgICAgICAgd3JhcCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICB2YXIgYm91bmNlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChwb3NpdGlvbi54ID4gYm91bmRzLndpZHRoKSB7XG4gICAgICAgICAgICBwb3NpdGlvbi54ID0gYm91bmRzLndpZHRoO1xuICAgICAgICAgICAgdmVsb2NpdHkueCAqPSAtMTtcbiAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbi54IDwgYm91bmRzLngpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnggPSBib3VuZHMueDtcbiAgICAgICAgICAgIHZlbG9jaXR5LnggKj0gLTE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBvc2l0aW9uLnkgPiBib3VuZHMuaGVpZ2h0KSB7XG4gICAgICAgICAgICBwb3NpdGlvbi55ID0gYm91bmRzLmhlaWdodDtcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgKj0gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24ueSA8IGJvdW5kcy55KSB7XG4gICAgICAgICAgICBwb3NpdGlvbi55ID0gYm91bmRzLnk7XG4gICAgICAgICAgICB2ZWxvY2l0eS55ICo9IC0xO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciB3cmFwID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChwb3NpdGlvbi54ID4gYm91bmRzLndpZHRoKSB7XG4gICAgICAgICAgICBwb3NpdGlvbi54ID0gYm91bmRzLng7XG4gICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24ueCA8IGJvdW5kcy54KSB7XG4gICAgICAgICAgICBwb3NpdGlvbi54ID0gYm91bmRzLndpZHRoO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwb3NpdGlvbi55ID4gYm91bmRzLmhlaWdodCkge1xuICAgICAgICAgICAgcG9zaXRpb24ueSA9IGJvdW5kcy55O1xuICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uLnkgPCBib3VuZHMueSkge1xuICAgICAgICAgICAgcG9zaXRpb24ueSA9IGJvdW5kcy5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHNlZWsgPSBmdW5jdGlvbih0YXJnZXRWZWMpIHtcbiAgICAgICAgdmFyIGRlc2lyZWRWZWxvY2l0eSA9IHRhcmdldFZlYy5jbG9uZSgpLnN1YnRyYWN0KHBvc2l0aW9uKTtcbiAgICAgICAgZGVzaXJlZFZlbG9jaXR5Lm5vcm1hbGl6ZSgpO1xuICAgICAgICBkZXNpcmVkVmVsb2NpdHkuc2NhbGVCeShtYXhTcGVlZCk7XG5cbiAgICAgICAgdmFyIGZvcmNlID0gZGVzaXJlZFZlbG9jaXR5LnN1YnRyYWN0KHZlbG9jaXR5KTtcbiAgICAgICAgc3RlZXJpbmdGb3JjZS5hZGQoZm9yY2UpO1xuICAgICAgICBmb3JjZS5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIHZhciBmbGVlID0gZnVuY3Rpb24odGFyZ2V0VmVjKSB7XG4gICAgICAgIHZhciBkZXNpcmVkVmVsb2NpdHkgPSB0YXJnZXRWZWMuY2xvbmUoKS5zdWJ0cmFjdChwb3NpdGlvbik7XG4gICAgICAgIGRlc2lyZWRWZWxvY2l0eS5ub3JtYWxpemUoKTtcbiAgICAgICAgZGVzaXJlZFZlbG9jaXR5LnNjYWxlQnkobWF4U3BlZWQpO1xuXG4gICAgICAgIHZhciBmb3JjZSA9IGRlc2lyZWRWZWxvY2l0eS5zdWJ0cmFjdCh2ZWxvY2l0eSk7XG4gICAgICAgIHN0ZWVyaW5nRm9yY2Uuc3VidHJhY3QoZm9yY2UpO1xuICAgICAgICBmb3JjZS5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIHNlZWsgdW50aWwgd2l0aGluIGFycml2ZVRocmVzaG9sZFxuICAgIHZhciBhcnJpdmUgPSBmdW5jdGlvbih0YXJnZXRWZWMpIHtcbiAgICAgICAgdmFyIGRlc2lyZWRWZWxvY2l0eSA9IHRhcmdldFZlYy5jbG9uZSgpLnN1YnRyYWN0KHBvc2l0aW9uKTtcbiAgICAgICAgZGVzaXJlZFZlbG9jaXR5Lm5vcm1hbGl6ZSgpO1xuXG4gICAgICAgIHZhciBkaXN0YW5jZSA9IHBvc2l0aW9uLmRpc3RhbmNlKHRhcmdldFZlYyk7XG4gICAgICAgIGlmIChkaXN0YW5jZSA+IGFycml2ZVRocmVzaG9sZCkge1xuICAgICAgICAgICAgZGVzaXJlZFZlbG9jaXR5LnNjYWxlQnkobWF4U3BlZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHNjYWxhciA9IG1heFNwZWVkICogZGlzdGFuY2UgLyBhcnJpdmVUaHJlc2hvbGQ7XG4gICAgICAgICAgICBkZXNpcmVkVmVsb2NpdHkuc2NhbGVCeShzY2FsYXIpO1xuICAgICAgICB9XG4gICAgICAgIHZhciBmb3JjZSA9IGRlc2lyZWRWZWxvY2l0eS5zdWJ0cmFjdCh2ZWxvY2l0eSk7XG4gICAgICAgIHN0ZWVyaW5nRm9yY2UuYWRkKGZvcmNlKTtcbiAgICAgICAgZm9yY2UuZGlzcG9zZSgpO1xuXG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICAvLyBsb29rIGF0IHZlbG9jaXR5IG9mIGJvaWQgYW5kIHRyeSB0byBwcmVkaWN0IHdoZXJlIGl0J3MgZ29pbmdcbiAgICB2YXIgcHVyc3VlID0gZnVuY3Rpb24odGFyZ2V0Qm9pZCkge1xuICAgICAgICB2YXIgbG9va0FoZWFkVGltZSA9IHBvc2l0aW9uLmRpc3RhbmNlKHRhcmdldEJvaWQucG9zaXRpb24pIC8gbWF4U3BlZWQ7XG4gICAgICAgIC8vIGUuZy4gb2Ygd2hlcmUgbmV3IHZlYyBzaG91bGQgYmUgcmV0dXJuZWQ6XG4gICAgICAgIHZhciBzY2FsZWRWZWxvY2l0eSA9IHRhcmdldEJvaWQudmVsb2NpdHkuY2xvbmUoKS5zY2FsZUJ5KGxvb2tBaGVhZFRpbWUpO1xuICAgICAgICB2YXIgcHJlZGljdGVkVGFyZ2V0ID0gdGFyZ2V0Qm9pZC5wb3NpdGlvbi5jbG9uZSgpLmFkZChzY2FsZWRWZWxvY2l0eSk7XG4gICAgICAgIHNlZWsocHJlZGljdGVkVGFyZ2V0KTtcblxuICAgICAgICBzY2FsZWRWZWxvY2l0eS5kaXNwb3NlKCk7XG4gICAgICAgIHByZWRpY3RlZFRhcmdldC5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGxvb2sgYXQgdmVsb2NpdHkgb2YgYm9pZCBhbmQgdHJ5IHRvIHByZWRpY3Qgd2hlcmUgaXQncyBnb2luZ1xuICAgIHZhciBldmFkZSA9IGZ1bmN0aW9uKHRhcmdldEJvaWQpIHtcbiAgICAgICAgdmFyIGxvb2tBaGVhZFRpbWUgPSBwb3NpdGlvbi5kaXN0YW5jZSh0YXJnZXRCb2lkLnBvc2l0aW9uKSAvIG1heFNwZWVkO1xuICAgICAgICAvLyBlLmcuIG9mIHdoZXJlIG5ldyB2ZWMgc2hvdWxkIGJlIHJldHVybmVkOlxuICAgICAgICB2YXIgc2NhbGVkVmVsb2NpdHkgPSB0YXJnZXRCb2lkLnZlbG9jaXR5LmNsb25lKCkuc2NhbGVCeShsb29rQWhlYWRUaW1lKTtcbiAgICAgICAgdmFyIHByZWRpY3RlZFRhcmdldCA9IHRhcmdldEJvaWQucG9zaXRpb24uY2xvbmUoKS5hZGQoc2NhbGVkVmVsb2NpdHkpO1xuICAgICAgICAvLyBvbmx5IHRoaXMgbGluZSBkaWZmIGZyb20gcHVyc3VlOlxuICAgICAgICBmbGVlKHByZWRpY3RlZFRhcmdldCk7XG5cbiAgICAgICAgc2NhbGVkVmVsb2NpdHkuZGlzcG9zZSgpO1xuICAgICAgICBwcmVkaWN0ZWRUYXJnZXQuZGlzcG9zZSgpO1xuXG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICAvLyB3YW5kZXIgYXJvdW5kLCBjaGFuZ2luZyBhbmdsZSBieSBhIGxpbWl0ZWQgYW1vdW50IGVhY2ggdGlja1xuICAgIHZhciB3YW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNlbnRlciA9IHZlbG9jaXR5LmNsb25lKCkubm9ybWFsaXplKCkuc2NhbGVCeSh3YW5kZXJEaXN0YW5jZSk7XG5cbiAgICAgICAgdmFyIG9mZnNldCA9IFZlYzIuZ2V0KCk7XG4gICAgICAgIG9mZnNldC5sZW5ndGggPSB3YW5kZXJSYWRpdXM7XG4gICAgICAgIG9mZnNldC5hbmdsZSA9IHdhbmRlckFuZ2xlO1xuICAgICAgICB3YW5kZXJBbmdsZSArPSBNYXRoLnJhbmRvbSgpICogd2FuZGVyUmFuZ2UgLSB3YW5kZXJSYW5nZSAqIDAuNTtcblxuICAgICAgICB2YXIgZm9yY2UgPSBjZW50ZXIuYWRkKG9mZnNldCk7XG4gICAgICAgIHN0ZWVyaW5nRm9yY2UuYWRkKGZvcmNlKTtcblxuICAgICAgICBvZmZzZXQuZGlzcG9zZSgpO1xuICAgICAgICBmb3JjZS5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGdldHMgYSBiaXQgcm91Z2ggdXNlZCBpbiBjb21iaW5hdGlvbiB3aXRoIHNlZWtpbmcgYXMgdGhlIGJvaWQgYXR0ZW1wdHNcbiAgICAvLyB0byBzZWVrIHN0cmFpZ2h0IHRocm91Z2ggYW4gb2JqZWN0IHdoaWxlIHNpbXVsdGFuZW91c2x5IHRyeWluZyB0byBhdm9pZCBpdFxuICAgIHZhciBhdm9pZCA9IGZ1bmN0aW9uKG9ic3RhY2xlcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9ic3RhY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG9ic3RhY2xlID0gb2JzdGFjbGVzW2ldO1xuICAgICAgICAgICAgdmFyIGhlYWRpbmcgPSB2ZWxvY2l0eS5jbG9uZSgpLm5vcm1hbGl6ZSgpO1xuXG4gICAgICAgICAgICAvLyB2ZWMgYmV0d2VlbiBvYnN0YWNsZSBhbmQgYm9pZFxuICAgICAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSBvYnN0YWNsZS5wb3NpdGlvbi5jbG9uZSgpLnN1YnRyYWN0KHBvc2l0aW9uKTtcbiAgICAgICAgICAgIHZhciBkb3RQcm9kID0gZGlmZmVyZW5jZS5kb3RQcm9kdWN0KGhlYWRpbmcpO1xuXG4gICAgICAgICAgICAvLyBpZiBvYnN0YWNsZSBpbiBmcm9udCBvZiBib2lkXG4gICAgICAgICAgICBpZiAoZG90UHJvZCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyB2ZWMgdG8gcmVwcmVzZW50ICdmZWVsZXInIGFybVxuICAgICAgICAgICAgICAgIHZhciBmZWVsZXIgPSBoZWFkaW5nLmNsb25lKCkuc2NhbGVCeShhdm9pZERpc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBwcm9qZWN0IGRpZmZlcmVuY2Ugb250byBmZWVsZXJcbiAgICAgICAgICAgICAgICB2YXIgcHJvamVjdGlvbiA9IGhlYWRpbmcuY2xvbmUoKS5zY2FsZUJ5KGRvdFByb2QpO1xuICAgICAgICAgICAgICAgIC8vIGRpc3RhbmNlIGZyb20gb2JzdGFjbGUgdG8gZmVlbGVyXG4gICAgICAgICAgICAgICAgdmFyIHZlY0Rpc3RhbmNlID0gcHJvamVjdGlvbi5zdWJ0cmFjdChkaWZmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICB2YXIgZGlzdGFuY2UgPSB2ZWNEaXN0YW5jZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgLy8gaWYgZmVlbGVyIGludGVyc2VjdHMgb2JzdGFjbGUgKHBsdXMgYnVmZmVyKSwgYW5kIHByb2plY3Rpb25cbiAgICAgICAgICAgICAgICAvLyBsZXNzIHRoYW4gZmVlbGVyIGxlbmd0aCwgd2lsbCBjb2xsaWRlXG4gICAgICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgKG9ic3RhY2xlLnJhZGl1cyB8fCAwKSArIGF2b2lkQnVmZmVyICYmIHByb2plY3Rpb24ubGVuZ3RoIDwgZmVlbGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjYWxjIGEgZm9yY2UgKy8tIDkwIGRlZyBmcm9tIHZlYyB0byBjaXJjXG4gICAgICAgICAgICAgICAgICAgIHZhciBmb3JjZSA9IGhlYWRpbmcuY2xvbmUoKS5zY2FsZUJ5KG1heFNwZWVkKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yY2UuYW5nbGUgKz0gZGlmZmVyZW5jZS5zaWduKHZlbG9jaXR5KSAqIE1hdGguUEkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAvLyBzY2FsZSBmb3JjZSBieSBkaXN0YW5jZSAoZnVydGhlciA9IHNtYWxsZXIgZm9yY2UpXG4gICAgICAgICAgICAgICAgICAgIGZvcmNlLnNjYWxlQnkoMSAtIHByb2plY3Rpb24ubGVuZ3RoIC8gZmVlbGVyLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCB0byBzdGVlcmluZyBmb3JjZVxuICAgICAgICAgICAgICAgICAgICBzdGVlcmluZ0ZvcmNlLmFkZChmb3JjZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJyYWtpbmcgZm9yY2UgLSBzbG93cyBib2lkIGRvd24gc28gaXQgaGFzIHRpbWUgdG8gdHVybiAoY2xvc2VyID0gaGFyZGVyKVxuICAgICAgICAgICAgICAgICAgICB2ZWxvY2l0eS5zY2FsZUJ5KHByb2plY3Rpb24ubGVuZ3RoIC8gZmVlbGVyLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yY2UuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmZWVsZXIuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIHByb2plY3Rpb24uZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIHZlY0Rpc3RhbmNlLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGhlYWRpbmcuZGlzcG9zZSgpO1xuICAgICAgICAgICAgZGlmZmVyZW5jZS5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGZvbGxvdyBhIHBhdGggbWFkZSB1cCBvZiBhbiBhcnJheSBvciB2ZWN0b3JzXG4gICAgdmFyIGZvbGxvd1BhdGggPSBmdW5jdGlvbihwYXRoLCBsb29wKSB7XG4gICAgICAgIGxvb3AgPSAhIWxvb3A7XG5cbiAgICAgICAgdmFyIHdheVBvaW50ID0gcGF0aFtwYXRoSW5kZXhdO1xuICAgICAgICBpZiAoIXdheVBvaW50KSB7XG4gICAgICAgICAgcGF0aEluZGV4ID0gMDtcbiAgICAgICAgICByZXR1cm4gYm9pZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocG9zaXRpb24uZGlzdGFuY2Uod2F5UG9pbnQpIDwgcGF0aFRocmVzaG9sZCkge1xuICAgICAgICAgICAgaWYgKHBhdGhJbmRleCA+PSBwYXRoLmxlbmd0aC0xKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxvb3ApIHsgcGF0aEluZGV4ID0gMDsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgcGF0aEluZGV4Kys7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBhdGhJbmRleCA+PSBwYXRoLmxlbmd0aC0xICYmICFsb29wKSB7XG4gICAgICAgICAgICBhcnJpdmUod2F5UG9pbnQpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgc2Vlayh3YXlQb2ludCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGZsb2NrIC0gZ3JvdXAgb2YgYm9pZHMgbG9vc2VseSBtb3ZlIHRvZ2V0aGVyXG4gICAgdmFyIGZsb2NrID0gZnVuY3Rpb24oYm9pZHMpIHtcbiAgICAgICAgdmFyIGF2ZXJhZ2VWZWxvY2l0eSA9IHZlbG9jaXR5LmNsb25lKCk7XG4gICAgICAgIHZhciBhdmVyYWdlUG9zaXRpb24gPSBWZWMyLmdldCgpO1xuICAgICAgICB2YXIgaW5TaWdodENvdW50ID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2lkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGIgPSBib2lkc1tpXTtcbiAgICAgICAgICAgIGlmIChiICE9PSBib2lkICYmIGluU2lnaHQoYikpIHtcbiAgICAgICAgICAgICAgICBhdmVyYWdlVmVsb2NpdHkuYWRkKGIudmVsb2NpdHkpO1xuICAgICAgICAgICAgICAgIGF2ZXJhZ2VQb3NpdGlvbi5hZGQoYi5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKHRvb0Nsb3NlKGIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZsZWUoYi5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluU2lnaHRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpblNpZ2h0Q291bnQgPiAwKSB7XG4gICAgICAgICAgICBhdmVyYWdlVmVsb2NpdHkuZGl2aWRlQnkoaW5TaWdodENvdW50KTtcbiAgICAgICAgICAgIGF2ZXJhZ2VQb3NpdGlvbi5kaXZpZGVCeShpblNpZ2h0Q291bnQpO1xuICAgICAgICAgICAgc2VlayhhdmVyYWdlUG9zaXRpb24pO1xuICAgICAgICAgICAgc3RlZXJpbmdGb3JjZS5hZGQoYXZlcmFnZVZlbG9jaXR5LnN1YnRyYWN0KHZlbG9jaXR5KSk7XG4gICAgICAgIH1cbiAgICAgICAgYXZlcmFnZVZlbG9jaXR5LmRpc3Bvc2UoKTtcbiAgICAgICAgYXZlcmFnZVBvc2l0aW9uLmRpc3Bvc2UoKTtcblxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgLy8gaXMgYm9pZCBjbG9zZSBlbm91Z2ggdG8gYmUgaW4gc2lnaHQ/IGZvciB1c2Ugd2l0aCBmbG9ja1xuICAgIHZhciBpblNpZ2h0ID0gZnVuY3Rpb24oYm9pZCkge1xuICAgICAgICBpZiAocG9zaXRpb24uZGlzdGFuY2UoYm9pZC5wb3NpdGlvbikgPiBpblNpZ2h0RGlzdGFuY2UpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGVhZGluZyA9IHZlbG9jaXR5LmNsb25lKCkubm9ybWFsaXplKCk7XG4gICAgICAgIHZhciBkaWZmZXJlbmNlID0gYm9pZC5wb3NpdGlvbi5jbG9uZSgpLnN1YnRyYWN0KHBvc2l0aW9uKTtcbiAgICAgICAgdmFyIGRvdFByb2QgPSBkaWZmZXJlbmNlLmRvdFByb2R1Y3QoaGVhZGluZyk7XG5cbiAgICAgICAgaGVhZGluZy5kaXNwb3NlKCk7XG4gICAgICAgIGRpZmZlcmVuY2UuZGlzcG9zZSgpO1xuXG4gICAgICAgIGlmIChkb3RQcm9kIDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICAvLyBpcyBib2lkIHRvbyBjbG9zZT8gZm9yIHVzZSB3aXRoIGZsb2NrXG4gICAgdmFyIHRvb0Nsb3NlID0gZnVuY3Rpb24oYm9pZCkge1xuICAgICAgICByZXR1cm4gcG9zaXRpb24uZGlzdGFuY2UoYm9pZC5wb3NpdGlvbikgPCB0b29DbG9zZURpc3RhbmNlO1xuICAgIH07XG5cbiAgICAvLyBtZXRob2RzXG4gICAgdmFyIGJvaWQgPSB7XG4gICAgICBzZXRCb3VuZHM6IHNldEJvdW5kcyxcbiAgICAgIHVwZGF0ZTogdXBkYXRlLFxuICAgICAgcHVyc3VlOiBwdXJzdWUsXG4gICAgICBldmFkZTogZXZhZGUsXG4gICAgICB3YW5kZXI6IHdhbmRlcixcbiAgICAgIGF2b2lkOiBhdm9pZCxcbiAgICAgIGZvbGxvd1BhdGg6IGZvbGxvd1BhdGgsXG4gICAgICBmbG9jazogZmxvY2ssXG4gICAgICBhcnJpdmU6IGFycml2ZSxcbiAgICAgIGZsZWU6IGZsZWUsXG4gICAgICB1c2VyRGF0YToge31cbiAgICB9O1xuXG4gICAgLy8gZ2V0dGVycyAvIHNldHRlcnNcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhib2lkLCB7XG4gICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBwb3NpdGlvbjsgfVxuICAgICAgfSxcbiAgICAgIHZlbG9jaXR5OiB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHZlbG9jaXR5OyB9XG4gICAgICB9LFxuICAgICAgZWRnZUJlaGF2aW9yOiB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGVkZ2VCZWhhdmlvcjsgfSxcbiAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGVkZ2VCZWhhdmlvciA9IHZhbHVlOyB9XG4gICAgICB9LFxuICAgICAgbWFzczoge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBtYXNzOyB9LFxuICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgbWFzcyA9IHZhbHVlOyB9XG4gICAgICB9LFxuICAgICAgbWF4U3BlZWQ6IHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbWF4U3BlZWQ7IH0sXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBtYXhTcGVlZCA9IHZhbHVlOyB9XG4gICAgICB9LFxuICAgICAgbWF4Rm9yY2U6IHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbWF4Rm9yY2U7IH0sXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBtYXhGb3JjZSA9IHZhbHVlOyB9XG4gICAgICB9LFxuICAgICAgLy8gYXJyaXZlXG4gICAgICBhcnJpdmVUaHJlc2hvbGQ6IHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJyaXZlVGhyZXNob2xkOyB9LFxuICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgYXJyaXZlVGhyZXNob2xkID0gdmFsdWU7IH1cbiAgICAgIH0sXG4gICAgICAvLyB3YW5kZXJcbiAgICAgIHdhbmRlckRpc3RhbmNlOiB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHdhbmRlckRpc3RhbmNlOyB9LFxuICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgd2FuZGVyRGlzdGFuY2UgPSB2YWx1ZTsgfVxuICAgICAgfSxcbiAgICAgIHdhbmRlclJhZGl1czoge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB3YW5kZXJSYWRpdXM7IH0sXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyB3YW5kZXJSYWRpdXMgPSB2YWx1ZTsgfVxuICAgICAgfSxcbiAgICAgIHdhbmRlclJhbmdlOiB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHdhbmRlclJhbmdlOyB9LFxuICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgd2FuZGVyUmFuZ2UgPSB2YWx1ZTsgfVxuICAgICAgfSxcbiAgICAgIC8vIGF2b2lkXG4gICAgICBhdm9pZERpc3RhbmNlOiB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIGF2b2lkRGlzdGFuY2U7IH0sXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBhdm9pZERpc3RhbmNlID0gdmFsdWU7IH1cbiAgICAgIH0sXG4gICAgICBhdm9pZEJ1ZmZlcjoge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBhdm9pZEJ1ZmZlcjsgfSxcbiAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IGF2b2lkQnVmZmVyID0gdmFsdWU7IH1cbiAgICAgIH0sXG4gICAgICAvLyBmb2xsb3dQYXRoXG4gICAgICBwYXRoSW5kZXg6IHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gcGF0aEluZGV4OyB9LFxuICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHsgcGF0aEluZGV4ID0gdmFsdWU7IH1cbiAgICAgIH0sXG4gICAgICBwYXRoVGhyZXNob2xkOiB7XG4gICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHBhdGhUaHJlc2hvbGQ7IH0sXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBwYXRoVGhyZXNob2xkID0gdmFsdWU7IH1cbiAgICAgIH0sXG4gICAgICAvLyAgZmxvY2tcbiAgICAgIGluU2lnaHREaXN0YW5jZToge1xuICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBpblNpZ2h0RGlzdGFuY2U7IH0sXG4gICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkgeyBpblNpZ2h0RGlzdGFuY2UgPSB2YWx1ZTsgfVxuICAgICAgfSxcbiAgICAgIHRvb0Nsb3NlRGlzdGFuY2U6IHtcbiAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdG9vQ2xvc2VEaXN0YW5jZTsgfSxcbiAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7IHRvb0Nsb3NlRGlzdGFuY2UgPSB2YWx1ZTsgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoYm9pZCk7XG59XG5cbi8vIGVkZ2UgYmVoYXZpb3JzXG5Cb2lkLkVER0VfTk9ORSA9ICdub25lJztcbkJvaWQuRURHRV9CT1VOQ0UgPSAnYm91bmNlJztcbkJvaWQuRURHRV9XUkFQID0gJ3dyYXAnO1xuXG4vLyB2ZWMyXG5Cb2lkLlZlYzIgPSBWZWMyO1xuXG5Cb2lkLnZlYzIgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgcmV0dXJuIFZlYzIuZ2V0KHgsIHkpO1xufTtcblxuLy8gZm9yIGRlZmluaW5nIG9ic3RhY2xlcyBvciBhcmVhcyB0byBhdm9pZFxuQm9pZC5vYnN0YWNsZSA9IGZ1bmN0aW9uKHJhZGl1cywgeCwgeSkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJhZGl1czogcmFkaXVzLFxuICAgICAgICBwb3NpdGlvbjogVmVjMi5nZXQoeCwgeSlcbiAgICB9O1xufTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBCb2lkO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xyXG5cclxuZnVuY3Rpb24gVmVjMih4LCB5KSB7XHJcbiAgICB0aGlzLnggPSB4IHx8IDA7XHJcbiAgICB0aGlzLnkgPSB5IHx8IDA7XHJcbn1cclxuXHJcblZlYzIucHJvdG90eXBlID0ge1xyXG4gICAgYWRkOiBmdW5jdGlvbih2ZWMpIHtcclxuICAgICAgICB0aGlzLnggPSB0aGlzLnggKyB2ZWMueDtcclxuICAgICAgICB0aGlzLnkgPSB0aGlzLnkgKyB2ZWMueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBzdWJ0cmFjdDogZnVuY3Rpb24odmVjKSB7XHJcbiAgICAgICAgdGhpcy54ID0gdGhpcy54IC0gdmVjLng7XHJcbiAgICAgICAgdGhpcy55ID0gdGhpcy55IC0gdmVjLnk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgbm9ybWFsaXplOiBmdW5jdGlvbigpIHtcclxuICAgICAgICB2YXIgbCA9IHRoaXMubGVuZ3RoO1xyXG4gICAgICAgIGlmKGwgPT09IDApIHtcclxuICAgICAgICAgICAgdGhpcy54ID0gMTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMueCAvPSBsO1xyXG4gICAgICAgIHRoaXMueSAvPSBsO1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGlzTm9ybWFsaXplZDogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoID09PSAxO1xyXG4gICAgfSxcclxuICAgIHRydW5jYXRlOiAgZnVuY3Rpb24obWF4KSB7XHJcbiAgICAgICAgaWYodGhpcy5sZW5ndGggPiBtYXgpIHtcclxuICAgICAgICAgICAgdGhpcy5sZW5ndGggPSBtYXg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIHNjYWxlQnk6IGZ1bmN0aW9uKG11bCkge1xyXG4gICAgICAgIHRoaXMueCAqPSBtdWw7XHJcbiAgICAgICAgdGhpcy55ICo9IG11bDtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBkaXZpZGVCeTogZnVuY3Rpb24oZGl2KSB7XHJcbiAgICAgICAgdGhpcy54IC89IGRpdjtcclxuICAgICAgICB0aGlzLnkgLz0gZGl2O1xyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfSxcclxuICAgIGVxdWFsczogZnVuY3Rpb24odmVjKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMueCA9PT0gdmVjLnggJiYgdGhpcy55ID09PSB2ZWMueTtcclxuICAgIH0sXHJcbiAgICBuZWdhdGU6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRoaXMueCA9IC10aGlzLng7XHJcbiAgICAgICAgdGhpcy55ID0gLXRoaXMueTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICBkb3RQcm9kdWN0OiBmdW5jdGlvbih2ZWMpIHtcclxuICAgICAgICAvKlxyXG4gICAgICAgIElmIEEgYW5kIEIgYXJlIHBlcnBlbmRpY3VsYXIgKGF0IDkwIGRlZ3JlZXMgdG8gZWFjaCBvdGhlciksIHRoZSByZXN1bHQgb2YgdGhlIGRvdCBwcm9kdWN0IHdpbGwgYmUgemVybywgYmVjYXVzZSBjb3MozpgpIHdpbGwgYmUgemVyby5cclxuICAgICAgICBJZiB0aGUgYW5nbGUgYmV0d2VlbiBBIGFuZCBCIGFyZSBsZXNzIHRoYW4gOTAgZGVncmVlcywgdGhlIGRvdCBwcm9kdWN0IHdpbGwgYmUgcG9zaXRpdmUgKGdyZWF0ZXIgdGhhbiB6ZXJvKSwgYXMgY29zKM6YKSB3aWxsIGJlIHBvc2l0aXZlLCBhbmQgdGhlIHZlY3RvciBsZW5ndGhzIGFyZSBhbHdheXMgcG9zaXRpdmUgdmFsdWVzLlxyXG4gICAgICAgIElmIHRoZSBhbmdsZSBiZXR3ZWVuIEEgYW5kIEIgYXJlIGdyZWF0ZXIgdGhhbiA5MCBkZWdyZWVzLCB0aGUgZG90IHByb2R1Y3Qgd2lsbCBiZSBuZWdhdGl2ZSAobGVzcyB0aGFuIHplcm8pLCBhcyBjb3MozpgpIHdpbGwgYmUgbmVnYXRpdmUsIGFuZCB0aGUgdmVjdG9yIGxlbmd0aHMgYXJlIGFsd2F5cyBwb3NpdGl2ZSB2YWx1ZXNcclxuICAgICAgICAqL1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiB2ZWMueCArIHRoaXMueSAqIHZlYy55O1xyXG4gICAgfSxcclxuICAgIGNyb3NzUHJvZHVjdDogZnVuY3Rpb24odmVjKSB7XHJcbiAgICAgICAgLypcclxuICAgICAgICBUaGUgc2lnbiB0ZWxscyB1cyBpZiB2ZWMgdG8gdGhlIGxlZnQgKC0pIG9yIHRoZSByaWdodCAoKykgb2YgdGhpcyB2ZWNcclxuICAgICAgICAqL1xyXG4gICAgICAgIHJldHVybiB0aGlzLnggKiB2ZWMueSAtIHRoaXMueSAqIHZlYy54O1xyXG4gICAgfSxcclxuICAgIGRpc3RhbmNlU3F1YXJlZDogZnVuY3Rpb24odmVjKSB7XHJcbiAgICAgICAgdmFyIGR4ID0gdmVjLnggLSB0aGlzLng7XHJcbiAgICAgICAgdmFyIGR5ID0gdmVjLnkgLSB0aGlzLnk7XHJcbiAgICAgICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xyXG4gICAgfSxcclxuICAgIGRpc3RhbmNlOiBmdW5jdGlvbih2ZWMpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZGlzdGFuY2VTcXVhcmVkKHZlYykpO1xyXG4gICAgfSxcclxuICAgIGNsb25lOiBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gVmVjMi5nZXQodGhpcy54LCB0aGlzLnkpO1xyXG4gICAgfSxcclxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICB0aGlzLnggPSAwO1xyXG4gICAgICAgIHRoaXMueSA9IDA7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgcGVycGVuZGljdWxhcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgcmV0dXJuIFZlYzIuZ2V0KC10aGlzLnksIHRoaXMueCk7XHJcbiAgICB9LFxyXG4gICAgc2lnbjogZnVuY3Rpb24odmVjKSB7XHJcbiAgICAgICAgLy8gRGV0ZXJtaW5lcyBpZiBhIGdpdmVuIHZlY3RvciBpcyB0byB0aGUgcmlnaHQgb3IgbGVmdCBvZiB0aGlzIHZlY3Rvci5cclxuICAgICAgICAvLyBJZiB0byB0aGUgbGVmdCwgcmV0dXJucyAtMS4gSWYgdG8gdGhlIHJpZ2h0LCArMS5cclxuICAgICAgICB2YXIgcCA9IHRoaXMucGVycGVuZGljdWxhcigpO1xyXG4gICAgICAgIHZhciBzID0gcC5kb3RQcm9kdWN0KHZlYykgPCAwID8gLTEgOiAxO1xyXG4gICAgICAgIHAuZGlzcG9zZSgpO1xyXG4gICAgICAgIHJldHVybiBzO1xyXG4gICAgfSxcclxuICAgIHNldDogZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgICAgIHRoaXMueCA9IHggfHwgMDtcclxuICAgICAgICB0aGlzLnkgPSB5IHx8IDA7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG4gICAgZGlzcG9zZTogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgVmVjMi5wb29sLnB1c2godGhpcy5yZXNldCgpKTtcclxuICAgIH1cclxufTtcclxuXHJcbi8vIGdldHRlcnMgLyBzZXR0ZXJzXHJcblxyXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhWZWMyLnByb3RvdHlwZSwge1xyXG4gIGxlbmd0aFNxdWFyZWQ6IHtcclxuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnk7XHJcbiAgICAgIH1cclxuICB9LFxyXG4gIGxlbmd0aDoge1xyXG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmxlbmd0aFNxdWFyZWQpO1xyXG4gICAgICB9LFxyXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XHJcbiAgICAgICAgICB2YXIgYSA9IHRoaXMuYW5nbGU7XHJcbiAgICAgICAgICB0aGlzLnggPSBNYXRoLmNvcyhhKSAqIHZhbHVlO1xyXG4gICAgICAgICAgdGhpcy55ID0gTWF0aC5zaW4oYSkgKiB2YWx1ZTtcclxuICAgICAgfVxyXG4gIH0sXHJcbiAgYW5nbGU6IHtcclxuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMueSwgdGhpcy54KTtcclxuICAgICAgfSxcclxuICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xyXG4gICAgICAgICAgdmFyIGwgPSB0aGlzLmxlbmd0aDtcclxuICAgICAgICAgIHRoaXMueCA9IE1hdGguY29zKHZhbHVlKSAqIGw7XHJcbiAgICAgICAgICB0aGlzLnkgPSBNYXRoLnNpbih2YWx1ZSkgKiBsO1xyXG4gICAgICB9XHJcbiAgfVxyXG59KTtcclxuXHJcbi8vIHN0YXRpY1xyXG5cclxuVmVjMi5wb29sID0gW107XHJcblZlYzIuZ2V0ID0gZnVuY3Rpb24oeCwgeSkge1xyXG4gICAgdmFyIHYgPSBWZWMyLnBvb2wubGVuZ3RoID4gMCA/IFZlYzIucG9vbC5wb3AoKSA6IG5ldyBWZWMyKCk7XHJcbiAgICB2LnNldCh4LCB5KTtcclxuICAgIHJldHVybiB2O1xyXG59O1xyXG5cclxuVmVjMi5hbmdsZUJldHdlZW4gPSBmdW5jdGlvbihhLCBiKSB7XHJcbiAgICBpZighYS5pc05vcm1hbGl6ZWQoKSkgeyBhID0gYS5jbG9uZSgpLm5vcm1hbGl6ZSgpOyB9XHJcbiAgICBpZighYi5pc05vcm1hbGl6ZWQoKSkgeyBiID0gYi5jbG9uZSgpLm5vcm1hbGl6ZSgpOyB9XHJcbiAgICByZXR1cm4gTWF0aC5hY29zKGEuZG90UHJvZHVjdChiKSk7XHJcbn07XHJcblxyXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcclxuICAgIG1vZHVsZS5leHBvcnRzID0gVmVjMjtcclxufVxyXG4iXX0=
