(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Boid = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Vec2 = require('./vec2.js');

var defaults = {
    bounds: {
        x: 0,
        y: 0,
        width: 640,
        height: 480
    },
    edgeBehavior: 'bounce',
    mass: 1.0,
    maxSpeed: 10,
    maxForce: 1,
    arriveThreshold: 50,
    wanderDistance: 10,
    wanderRadius: 5,
    wanderAngle: 0,
    wanderRange: 1,
    avoidDistance: 300,
    avoidBuffer: 20,
    pathThreshold: 20,
    maxDistance: 300,
    minDistance: 60
};

function Boid(options) {
    options = configure(options);

    var position = Vec2.get();
    var velocity = Vec2.get();
    var steeringForce = Vec2.get();

    var bounds = options.bounds;
    var edgeBehavior = options.edgeBehavior;
    var mass = options.mass;
    var maxSpeed = options.maxSpeed;
    var maxSpeedSq = maxSpeed * maxSpeed;
    var maxForce = options.maxForce;
    // arrive
    var arriveThreshold = options.arriveThreshold;
    var arriveThresholdSq = arriveThreshold * arriveThreshold;
    // wander
    var wanderDistance = options.wanderDistance;
    var wanderRadius = options.wanderRadius;
    var wanderAngle = options.wanderAngle;
    var wanderRange = options.wanderRange;
    // avoid
    var avoidDistance = options.avoidDistance;
    var avoidBuffer = options.avoidBuffer;
    // follow path
    var pathIndex = 0;
    var pathThreshold = options.pathThreshold;
    var pathThresholdSq = pathThreshold * pathThreshold;
    // flock
    var maxDistance = options.maxDistance;
    var maxDistanceSq = maxDistance * maxDistance;
    var minDistance = options.minDistance;
    var minDistanceSq = minDistance * minDistance;

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

        var distanceSq = position.distanceSq(targetVec);
        if (distanceSq > arriveThresholdSq) {
            desiredVelocity.scaleBy(maxSpeed);
        } else {
            var scalar = maxSpeed * distanceSq / arriveThresholdSq;
            desiredVelocity.scaleBy(scalar);
        }
        var force = desiredVelocity.subtract(velocity);
        steeringForce.add(force);
        force.dispose();

        return boid;
    };

    // look at velocity of boid and try to predict where it's going
    var pursue = function(targetBoid) {
        var lookAheadTime = position.distanceSq(targetBoid.position) / maxSpeedSq;

        var scaledVelocity = targetBoid.velocity.clone().scaleBy(lookAheadTime);
        var predictedTarget = targetBoid.position.clone().add(scaledVelocity);

        seek(predictedTarget);

        scaledVelocity.dispose();
        predictedTarget.dispose();

        return boid;
    };

    // look at velocity of boid and try to predict where it's going
    var evade = function(targetBoid) {
        var lookAheadTime = position.distanceSq(targetBoid.position) / maxSpeedSq;

        var scaledVelocity = targetBoid.velocity.clone().scaleBy(lookAheadTime);
        var predictedTarget = targetBoid.position.clone().add(scaledVelocity);

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
        if (position.distanceSq(wayPoint) < pathThresholdSq) {
            if (pathIndex >= path.length - 1) {
                if (loop) {
                    pathIndex = 0;
                }
            } else {
                pathIndex++;
            }
        }
        if (pathIndex >= path.length - 1 && !loop) {
            arrive(wayPoint);
        } else {
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

    // is boid close enough to be in sight and facing
    var inSight = function(boid) {
        if (position.distanceSq(boid.position) > maxDistanceSq) {
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

    // is boid too close?
    var tooClose = function(boid) {
        return position.distanceSq(boid.position) < minDistanceSq;
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
        seek: seek,
        flee: flee,
        position: position,
        velocity: velocity,
        userData: {}
    };

    // getters / setters
    Object.defineProperties(boid, {
        edgeBehavior: {
            get: function() {
                return edgeBehavior;
            },
            set: function(value) {
                edgeBehavior = value;
            }
        },
        mass: {
            get: function() {
                return mass;
            },
            set: function(value) {
                mass = value;
            }
        },
        maxSpeed: {
            get: function() {
                return maxSpeed;
            },
            set: function(value) {
                maxSpeed = value;
                maxSpeedSq = value * value;
            }
        },
        maxForce: {
            get: function() {
                return maxForce;
            },
            set: function(value) {
                maxForce = value;
            }
        },
        // arrive
        arriveThreshold: {
            get: function() {
                return arriveThreshold;
            },
            set: function(value) {
                arriveThreshold = value;
                arriveThresholdSq = value * value;
            }
        },
        // wander
        wanderDistance: {
            get: function() {
                return wanderDistance;
            },
            set: function(value) {
                wanderDistance = value;
            }
        },
        wanderRadius: {
            get: function() {
                return wanderRadius;
            },
            set: function(value) {
                wanderRadius = value;
            }
        },
        wanderRange: {
            get: function() {
                return wanderRange;
            },
            set: function(value) {
                wanderRange = value;
            }
        },
        // avoid
        avoidDistance: {
            get: function() {
                return avoidDistance;
            },
            set: function(value) {
                avoidDistance = value;
            }
        },
        avoidBuffer: {
            get: function() {
                return avoidBuffer;
            },
            set: function(value) {
                avoidBuffer = value;
            }
        },
        // followPath
        pathIndex: {
            get: function() {
                return pathIndex;
            },
            set: function(value) {
                pathIndex = value;
            }
        },
        pathThreshold: {
            get: function() {
                return pathThreshold;
            },
            set: function(value) {
                pathThreshold = value;
                pathThresholdSq = value * value;
            }
        },
        //  flock
        maxDistance: {
            get: function() {
                return maxDistance;
            },
            set: function(value) {
                maxDistance = value;
                maxDistanceSq = value * value;
            }
        },
        minDistance: {
            get: function() {
                return minDistance;
            },
            set: function(value) {
                minDistance = value;
                minDistanceSq = value * value;
            }
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

function setDefaults(opts, defs) {
    Object.keys(defs).forEach(function(key) {
        if (typeof opts[key] === 'undefined') {
            opts[key] = defs[key];
        }
    });
}

function configure(options) {
    options = options || {};
    options.bounds = options.bounds || {};
    setDefaults(options, defaults);
    setDefaults(options.bounds, defaults.bounds);
    return options;
}

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
        if (l === 0) {
            this.x = 1;
            return this;
        }
        if (l === 1) {
            return this;
        }
        this.x /= l;
        this.y /= l;
        return this;
    },
    isNormalized: function() {
        return this.length === 1;
    },
    truncate: function(max) {
        if (this.length > max) {
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
        If A and B are perpendicular (at 90 degrees to each other), the result
        of the dot product will be zero, because cos(Θ) will be zero.
        If the angle between A and B are less than 90 degrees, the dot product
        will be positive (greater than zero), as cos(Θ) will be positive, and
        the vector lengths are always positive values.
        If the angle between A and B are greater than 90 degrees, the dot
        product will be negative (less than zero), as cos(Θ) will be negative,
        and the vector lengths are always positive values
        */
        return this.x * vec.x + this.y * vec.y;
    },
    crossProduct: function(vec) {
        /*
        The sign tells us if vec to the left (-) or the right (+) of this vec
        */
        return this.x * vec.y - this.y * vec.x;
    },
    distanceSq: function(vec) {
        var dx = vec.x - this.x;
        var dy = vec.y - this.y;
        return dx * dx + dy * dy;
    },
    distance: function(vec) {
        return Math.sqrt(this.distanceSq(vec));
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

Vec2.fill = function(n) {
    while (Vec2.pool.length < n) {
        Vec2.pool.push(new Vec2());
    }
};

Vec2.angleBetween = function(a, b) {
    if (!a.isNormalized()) {
        a = a.clone().normalize();
    }
    if (!b.isNormalized()) {
        b = b.clone().normalize();
    }
    return Math.acos(a.dotProduct(b));
};

if (typeof module === 'object' && module.exports) {
    module.exports = Vec2;
}

},{}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm9pZC5qcyIsInNyYy92ZWMyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25nQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBWZWMyID0gcmVxdWlyZSgnLi92ZWMyLmpzJyk7XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgICBib3VuZHM6IHtcbiAgICAgICAgeDogMCxcbiAgICAgICAgeTogMCxcbiAgICAgICAgd2lkdGg6IDY0MCxcbiAgICAgICAgaGVpZ2h0OiA0ODBcbiAgICB9LFxuICAgIGVkZ2VCZWhhdmlvcjogJ2JvdW5jZScsXG4gICAgbWFzczogMS4wLFxuICAgIG1heFNwZWVkOiAxMCxcbiAgICBtYXhGb3JjZTogMSxcbiAgICBhcnJpdmVUaHJlc2hvbGQ6IDUwLFxuICAgIHdhbmRlckRpc3RhbmNlOiAxMCxcbiAgICB3YW5kZXJSYWRpdXM6IDUsXG4gICAgd2FuZGVyQW5nbGU6IDAsXG4gICAgd2FuZGVyUmFuZ2U6IDEsXG4gICAgYXZvaWREaXN0YW5jZTogMzAwLFxuICAgIGF2b2lkQnVmZmVyOiAyMCxcbiAgICBwYXRoVGhyZXNob2xkOiAyMCxcbiAgICBtYXhEaXN0YW5jZTogMzAwLFxuICAgIG1pbkRpc3RhbmNlOiA2MFxufTtcblxuZnVuY3Rpb24gQm9pZChvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IGNvbmZpZ3VyZShvcHRpb25zKTtcblxuICAgIHZhciBwb3NpdGlvbiA9IFZlYzIuZ2V0KCk7XG4gICAgdmFyIHZlbG9jaXR5ID0gVmVjMi5nZXQoKTtcbiAgICB2YXIgc3RlZXJpbmdGb3JjZSA9IFZlYzIuZ2V0KCk7XG5cbiAgICB2YXIgYm91bmRzID0gb3B0aW9ucy5ib3VuZHM7XG4gICAgdmFyIGVkZ2VCZWhhdmlvciA9IG9wdGlvbnMuZWRnZUJlaGF2aW9yO1xuICAgIHZhciBtYXNzID0gb3B0aW9ucy5tYXNzO1xuICAgIHZhciBtYXhTcGVlZCA9IG9wdGlvbnMubWF4U3BlZWQ7XG4gICAgdmFyIG1heFNwZWVkU3EgPSBtYXhTcGVlZCAqIG1heFNwZWVkO1xuICAgIHZhciBtYXhGb3JjZSA9IG9wdGlvbnMubWF4Rm9yY2U7XG4gICAgLy8gYXJyaXZlXG4gICAgdmFyIGFycml2ZVRocmVzaG9sZCA9IG9wdGlvbnMuYXJyaXZlVGhyZXNob2xkO1xuICAgIHZhciBhcnJpdmVUaHJlc2hvbGRTcSA9IGFycml2ZVRocmVzaG9sZCAqIGFycml2ZVRocmVzaG9sZDtcbiAgICAvLyB3YW5kZXJcbiAgICB2YXIgd2FuZGVyRGlzdGFuY2UgPSBvcHRpb25zLndhbmRlckRpc3RhbmNlO1xuICAgIHZhciB3YW5kZXJSYWRpdXMgPSBvcHRpb25zLndhbmRlclJhZGl1cztcbiAgICB2YXIgd2FuZGVyQW5nbGUgPSBvcHRpb25zLndhbmRlckFuZ2xlO1xuICAgIHZhciB3YW5kZXJSYW5nZSA9IG9wdGlvbnMud2FuZGVyUmFuZ2U7XG4gICAgLy8gYXZvaWRcbiAgICB2YXIgYXZvaWREaXN0YW5jZSA9IG9wdGlvbnMuYXZvaWREaXN0YW5jZTtcbiAgICB2YXIgYXZvaWRCdWZmZXIgPSBvcHRpb25zLmF2b2lkQnVmZmVyO1xuICAgIC8vIGZvbGxvdyBwYXRoXG4gICAgdmFyIHBhdGhJbmRleCA9IDA7XG4gICAgdmFyIHBhdGhUaHJlc2hvbGQgPSBvcHRpb25zLnBhdGhUaHJlc2hvbGQ7XG4gICAgdmFyIHBhdGhUaHJlc2hvbGRTcSA9IHBhdGhUaHJlc2hvbGQgKiBwYXRoVGhyZXNob2xkO1xuICAgIC8vIGZsb2NrXG4gICAgdmFyIG1heERpc3RhbmNlID0gb3B0aW9ucy5tYXhEaXN0YW5jZTtcbiAgICB2YXIgbWF4RGlzdGFuY2VTcSA9IG1heERpc3RhbmNlICogbWF4RGlzdGFuY2U7XG4gICAgdmFyIG1pbkRpc3RhbmNlID0gb3B0aW9ucy5taW5EaXN0YW5jZTtcbiAgICB2YXIgbWluRGlzdGFuY2VTcSA9IG1pbkRpc3RhbmNlICogbWluRGlzdGFuY2U7XG5cbiAgICB2YXIgc2V0Qm91bmRzID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCwgeCwgeSkge1xuICAgICAgICBib3VuZHMud2lkdGggPSB3aWR0aDtcbiAgICAgICAgYm91bmRzLmhlaWdodCA9IGhlaWdodDtcbiAgICAgICAgYm91bmRzLnggPSB4IHx8IDA7XG4gICAgICAgIGJvdW5kcy55ID0geSB8fCAwO1xuXG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICB2YXIgdXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHN0ZWVyaW5nRm9yY2UudHJ1bmNhdGUobWF4Rm9yY2UpO1xuICAgICAgICBzdGVlcmluZ0ZvcmNlLmRpdmlkZUJ5KG1hc3MpO1xuICAgICAgICB2ZWxvY2l0eS5hZGQoc3RlZXJpbmdGb3JjZSk7XG4gICAgICAgIHN0ZWVyaW5nRm9yY2UucmVzZXQoKTtcbiAgICAgICAgdmVsb2NpdHkudHJ1bmNhdGUobWF4U3BlZWQpO1xuICAgICAgICBwb3NpdGlvbi5hZGQodmVsb2NpdHkpO1xuXG4gICAgICAgIGlmIChlZGdlQmVoYXZpb3IgPT09IEJvaWQuRURHRV9CT1VOQ0UpIHtcbiAgICAgICAgICAgIGJvdW5jZSgpO1xuICAgICAgICB9IGVsc2UgaWYgKGVkZ2VCZWhhdmlvciA9PT0gQm9pZC5FREdFX1dSQVApIHtcbiAgICAgICAgICAgIHdyYXAoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgdmFyIGJvdW5jZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocG9zaXRpb24ueCA+IGJvdW5kcy53aWR0aCkge1xuICAgICAgICAgICAgcG9zaXRpb24ueCA9IGJvdW5kcy53aWR0aDtcbiAgICAgICAgICAgIHZlbG9jaXR5LnggKj0gLTE7XG4gICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24ueCA8IGJvdW5kcy54KSB7XG4gICAgICAgICAgICBwb3NpdGlvbi54ID0gYm91bmRzLng7XG4gICAgICAgICAgICB2ZWxvY2l0eS54ICo9IC0xO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwb3NpdGlvbi55ID4gYm91bmRzLmhlaWdodCkge1xuICAgICAgICAgICAgcG9zaXRpb24ueSA9IGJvdW5kcy5oZWlnaHQ7XG4gICAgICAgICAgICB2ZWxvY2l0eS55ICo9IC0xO1xuICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uLnkgPCBib3VuZHMueSkge1xuICAgICAgICAgICAgcG9zaXRpb24ueSA9IGJvdW5kcy55O1xuICAgICAgICAgICAgdmVsb2NpdHkueSAqPSAtMTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgd3JhcCA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAocG9zaXRpb24ueCA+IGJvdW5kcy53aWR0aCkge1xuICAgICAgICAgICAgcG9zaXRpb24ueCA9IGJvdW5kcy54O1xuICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uLnggPCBib3VuZHMueCkge1xuICAgICAgICAgICAgcG9zaXRpb24ueCA9IGJvdW5kcy53aWR0aDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocG9zaXRpb24ueSA+IGJvdW5kcy5oZWlnaHQpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgPSBib3VuZHMueTtcbiAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbi55IDwgYm91bmRzLnkpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgPSBib3VuZHMuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIHZhciBzZWVrID0gZnVuY3Rpb24odGFyZ2V0VmVjKSB7XG4gICAgICAgIHZhciBkZXNpcmVkVmVsb2NpdHkgPSB0YXJnZXRWZWMuY2xvbmUoKS5zdWJ0cmFjdChwb3NpdGlvbik7XG4gICAgICAgIGRlc2lyZWRWZWxvY2l0eS5ub3JtYWxpemUoKTtcbiAgICAgICAgZGVzaXJlZFZlbG9jaXR5LnNjYWxlQnkobWF4U3BlZWQpO1xuXG4gICAgICAgIHZhciBmb3JjZSA9IGRlc2lyZWRWZWxvY2l0eS5zdWJ0cmFjdCh2ZWxvY2l0eSk7XG4gICAgICAgIHN0ZWVyaW5nRm9yY2UuYWRkKGZvcmNlKTtcbiAgICAgICAgZm9yY2UuZGlzcG9zZSgpO1xuXG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICB2YXIgZmxlZSA9IGZ1bmN0aW9uKHRhcmdldFZlYykge1xuICAgICAgICB2YXIgZGVzaXJlZFZlbG9jaXR5ID0gdGFyZ2V0VmVjLmNsb25lKCkuc3VidHJhY3QocG9zaXRpb24pO1xuICAgICAgICBkZXNpcmVkVmVsb2NpdHkubm9ybWFsaXplKCk7XG4gICAgICAgIGRlc2lyZWRWZWxvY2l0eS5zY2FsZUJ5KG1heFNwZWVkKTtcblxuICAgICAgICB2YXIgZm9yY2UgPSBkZXNpcmVkVmVsb2NpdHkuc3VidHJhY3QodmVsb2NpdHkpO1xuICAgICAgICBzdGVlcmluZ0ZvcmNlLnN1YnRyYWN0KGZvcmNlKTtcbiAgICAgICAgZm9yY2UuZGlzcG9zZSgpO1xuXG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICAvLyBzZWVrIHVudGlsIHdpdGhpbiBhcnJpdmVUaHJlc2hvbGRcbiAgICB2YXIgYXJyaXZlID0gZnVuY3Rpb24odGFyZ2V0VmVjKSB7XG4gICAgICAgIHZhciBkZXNpcmVkVmVsb2NpdHkgPSB0YXJnZXRWZWMuY2xvbmUoKS5zdWJ0cmFjdChwb3NpdGlvbik7XG4gICAgICAgIGRlc2lyZWRWZWxvY2l0eS5ub3JtYWxpemUoKTtcblxuICAgICAgICB2YXIgZGlzdGFuY2VTcSA9IHBvc2l0aW9uLmRpc3RhbmNlU3EodGFyZ2V0VmVjKTtcbiAgICAgICAgaWYgKGRpc3RhbmNlU3EgPiBhcnJpdmVUaHJlc2hvbGRTcSkge1xuICAgICAgICAgICAgZGVzaXJlZFZlbG9jaXR5LnNjYWxlQnkobWF4U3BlZWQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIHNjYWxhciA9IG1heFNwZWVkICogZGlzdGFuY2VTcSAvIGFycml2ZVRocmVzaG9sZFNxO1xuICAgICAgICAgICAgZGVzaXJlZFZlbG9jaXR5LnNjYWxlQnkoc2NhbGFyKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZm9yY2UgPSBkZXNpcmVkVmVsb2NpdHkuc3VidHJhY3QodmVsb2NpdHkpO1xuICAgICAgICBzdGVlcmluZ0ZvcmNlLmFkZChmb3JjZSk7XG4gICAgICAgIGZvcmNlLmRpc3Bvc2UoKTtcblxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgLy8gbG9vayBhdCB2ZWxvY2l0eSBvZiBib2lkIGFuZCB0cnkgdG8gcHJlZGljdCB3aGVyZSBpdCdzIGdvaW5nXG4gICAgdmFyIHB1cnN1ZSA9IGZ1bmN0aW9uKHRhcmdldEJvaWQpIHtcbiAgICAgICAgdmFyIGxvb2tBaGVhZFRpbWUgPSBwb3NpdGlvbi5kaXN0YW5jZVNxKHRhcmdldEJvaWQucG9zaXRpb24pIC8gbWF4U3BlZWRTcTtcblxuICAgICAgICB2YXIgc2NhbGVkVmVsb2NpdHkgPSB0YXJnZXRCb2lkLnZlbG9jaXR5LmNsb25lKCkuc2NhbGVCeShsb29rQWhlYWRUaW1lKTtcbiAgICAgICAgdmFyIHByZWRpY3RlZFRhcmdldCA9IHRhcmdldEJvaWQucG9zaXRpb24uY2xvbmUoKS5hZGQoc2NhbGVkVmVsb2NpdHkpO1xuXG4gICAgICAgIHNlZWsocHJlZGljdGVkVGFyZ2V0KTtcblxuICAgICAgICBzY2FsZWRWZWxvY2l0eS5kaXNwb3NlKCk7XG4gICAgICAgIHByZWRpY3RlZFRhcmdldC5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGxvb2sgYXQgdmVsb2NpdHkgb2YgYm9pZCBhbmQgdHJ5IHRvIHByZWRpY3Qgd2hlcmUgaXQncyBnb2luZ1xuICAgIHZhciBldmFkZSA9IGZ1bmN0aW9uKHRhcmdldEJvaWQpIHtcbiAgICAgICAgdmFyIGxvb2tBaGVhZFRpbWUgPSBwb3NpdGlvbi5kaXN0YW5jZVNxKHRhcmdldEJvaWQucG9zaXRpb24pIC8gbWF4U3BlZWRTcTtcblxuICAgICAgICB2YXIgc2NhbGVkVmVsb2NpdHkgPSB0YXJnZXRCb2lkLnZlbG9jaXR5LmNsb25lKCkuc2NhbGVCeShsb29rQWhlYWRUaW1lKTtcbiAgICAgICAgdmFyIHByZWRpY3RlZFRhcmdldCA9IHRhcmdldEJvaWQucG9zaXRpb24uY2xvbmUoKS5hZGQoc2NhbGVkVmVsb2NpdHkpO1xuXG4gICAgICAgIGZsZWUocHJlZGljdGVkVGFyZ2V0KTtcblxuICAgICAgICBzY2FsZWRWZWxvY2l0eS5kaXNwb3NlKCk7XG4gICAgICAgIHByZWRpY3RlZFRhcmdldC5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIHdhbmRlciBhcm91bmQsIGNoYW5naW5nIGFuZ2xlIGJ5IGEgbGltaXRlZCBhbW91bnQgZWFjaCB0aWNrXG4gICAgdmFyIHdhbmRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgY2VudGVyID0gdmVsb2NpdHkuY2xvbmUoKS5ub3JtYWxpemUoKS5zY2FsZUJ5KHdhbmRlckRpc3RhbmNlKTtcblxuICAgICAgICB2YXIgb2Zmc2V0ID0gVmVjMi5nZXQoKTtcbiAgICAgICAgb2Zmc2V0Lmxlbmd0aCA9IHdhbmRlclJhZGl1cztcbiAgICAgICAgb2Zmc2V0LmFuZ2xlID0gd2FuZGVyQW5nbGU7XG4gICAgICAgIHdhbmRlckFuZ2xlICs9IE1hdGgucmFuZG9tKCkgKiB3YW5kZXJSYW5nZSAtIHdhbmRlclJhbmdlICogMC41O1xuXG4gICAgICAgIHZhciBmb3JjZSA9IGNlbnRlci5hZGQob2Zmc2V0KTtcbiAgICAgICAgc3RlZXJpbmdGb3JjZS5hZGQoZm9yY2UpO1xuXG4gICAgICAgIG9mZnNldC5kaXNwb3NlKCk7XG4gICAgICAgIGZvcmNlLmRpc3Bvc2UoKTtcblxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgLy8gZ2V0cyBhIGJpdCByb3VnaCB1c2VkIGluIGNvbWJpbmF0aW9uIHdpdGggc2Vla2luZyBhcyB0aGUgYm9pZCBhdHRlbXB0c1xuICAgIC8vIHRvIHNlZWsgc3RyYWlnaHQgdGhyb3VnaCBhbiBvYmplY3Qgd2hpbGUgc2ltdWx0YW5lb3VzbHkgdHJ5aW5nIHRvIGF2b2lkIGl0XG4gICAgdmFyIGF2b2lkID0gZnVuY3Rpb24ob2JzdGFjbGVzKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JzdGFjbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgb2JzdGFjbGUgPSBvYnN0YWNsZXNbaV07XG4gICAgICAgICAgICB2YXIgaGVhZGluZyA9IHZlbG9jaXR5LmNsb25lKCkubm9ybWFsaXplKCk7XG5cbiAgICAgICAgICAgIC8vIHZlYyBiZXR3ZWVuIG9ic3RhY2xlIGFuZCBib2lkXG4gICAgICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IG9ic3RhY2xlLnBvc2l0aW9uLmNsb25lKCkuc3VidHJhY3QocG9zaXRpb24pO1xuICAgICAgICAgICAgdmFyIGRvdFByb2QgPSBkaWZmZXJlbmNlLmRvdFByb2R1Y3QoaGVhZGluZyk7XG5cbiAgICAgICAgICAgIC8vIGlmIG9ic3RhY2xlIGluIGZyb250IG9mIGJvaWRcbiAgICAgICAgICAgIGlmIChkb3RQcm9kID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIHZlYyB0byByZXByZXNlbnQgJ2ZlZWxlcicgYXJtXG4gICAgICAgICAgICAgICAgdmFyIGZlZWxlciA9IGhlYWRpbmcuY2xvbmUoKS5zY2FsZUJ5KGF2b2lkRGlzdGFuY2UpO1xuICAgICAgICAgICAgICAgIC8vIHByb2plY3QgZGlmZmVyZW5jZSBvbnRvIGZlZWxlclxuICAgICAgICAgICAgICAgIHZhciBwcm9qZWN0aW9uID0gaGVhZGluZy5jbG9uZSgpLnNjYWxlQnkoZG90UHJvZCk7XG4gICAgICAgICAgICAgICAgLy8gZGlzdGFuY2UgZnJvbSBvYnN0YWNsZSB0byBmZWVsZXJcbiAgICAgICAgICAgICAgICB2YXIgdmVjRGlzdGFuY2UgPSBwcm9qZWN0aW9uLnN1YnRyYWN0KGRpZmZlcmVuY2UpO1xuICAgICAgICAgICAgICAgIHZhciBkaXN0YW5jZSA9IHZlY0Rpc3RhbmNlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAvLyBpZiBmZWVsZXIgaW50ZXJzZWN0cyBvYnN0YWNsZSAocGx1cyBidWZmZXIpLCBhbmQgcHJvamVjdGlvblxuICAgICAgICAgICAgICAgIC8vIGxlc3MgdGhhbiBmZWVsZXIgbGVuZ3RoLCB3aWxsIGNvbGxpZGVcbiAgICAgICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCAob2JzdGFjbGUucmFkaXVzIHx8IDApICsgYXZvaWRCdWZmZXIgJiYgcHJvamVjdGlvbi5sZW5ndGggPCBmZWVsZXIubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNhbGMgYSBmb3JjZSArLy0gOTAgZGVnIGZyb20gdmVjIHRvIGNpcmNcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZvcmNlID0gaGVhZGluZy5jbG9uZSgpLnNjYWxlQnkobWF4U3BlZWQpO1xuICAgICAgICAgICAgICAgICAgICBmb3JjZS5hbmdsZSArPSBkaWZmZXJlbmNlLnNpZ24odmVsb2NpdHkpICogTWF0aC5QSSAvIDI7XG4gICAgICAgICAgICAgICAgICAgIC8vIHNjYWxlIGZvcmNlIGJ5IGRpc3RhbmNlIChmdXJ0aGVyID0gc21hbGxlciBmb3JjZSlcbiAgICAgICAgICAgICAgICAgICAgZm9yY2Uuc2NhbGVCeSgxIC0gcHJvamVjdGlvbi5sZW5ndGggLyBmZWVsZXIubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gYWRkIHRvIHN0ZWVyaW5nIGZvcmNlXG4gICAgICAgICAgICAgICAgICAgIHN0ZWVyaW5nRm9yY2UuYWRkKGZvcmNlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gYnJha2luZyBmb3JjZSAtIHNsb3dzIGJvaWQgZG93biBzbyBpdCBoYXMgdGltZSB0byB0dXJuIChjbG9zZXIgPSBoYXJkZXIpXG4gICAgICAgICAgICAgICAgICAgIHZlbG9jaXR5LnNjYWxlQnkocHJvamVjdGlvbi5sZW5ndGggLyBmZWVsZXIubGVuZ3RoKTtcblxuICAgICAgICAgICAgICAgICAgICBmb3JjZS5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGZlZWxlci5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgcHJvamVjdGlvbi5kaXNwb3NlKCk7XG4gICAgICAgICAgICAgICAgdmVjRGlzdGFuY2UuZGlzcG9zZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaGVhZGluZy5kaXNwb3NlKCk7XG4gICAgICAgICAgICBkaWZmZXJlbmNlLmRpc3Bvc2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgLy8gZm9sbG93IGEgcGF0aCBtYWRlIHVwIG9mIGFuIGFycmF5IG9yIHZlY3RvcnNcbiAgICB2YXIgZm9sbG93UGF0aCA9IGZ1bmN0aW9uKHBhdGgsIGxvb3ApIHtcbiAgICAgICAgbG9vcCA9ICEhbG9vcDtcblxuICAgICAgICB2YXIgd2F5UG9pbnQgPSBwYXRoW3BhdGhJbmRleF07XG4gICAgICAgIGlmICghd2F5UG9pbnQpIHtcbiAgICAgICAgICAgIHBhdGhJbmRleCA9IDA7XG4gICAgICAgICAgICByZXR1cm4gYm9pZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAocG9zaXRpb24uZGlzdGFuY2VTcSh3YXlQb2ludCkgPCBwYXRoVGhyZXNob2xkU3EpIHtcbiAgICAgICAgICAgIGlmIChwYXRoSW5kZXggPj0gcGF0aC5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxvb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgcGF0aEluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhdGhJbmRleCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChwYXRoSW5kZXggPj0gcGF0aC5sZW5ndGggLSAxICYmICFsb29wKSB7XG4gICAgICAgICAgICBhcnJpdmUod2F5UG9pbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2Vlayh3YXlQb2ludCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGZsb2NrIC0gZ3JvdXAgb2YgYm9pZHMgbG9vc2VseSBtb3ZlIHRvZ2V0aGVyXG4gICAgdmFyIGZsb2NrID0gZnVuY3Rpb24oYm9pZHMpIHtcbiAgICAgICAgdmFyIGF2ZXJhZ2VWZWxvY2l0eSA9IHZlbG9jaXR5LmNsb25lKCk7XG4gICAgICAgIHZhciBhdmVyYWdlUG9zaXRpb24gPSBWZWMyLmdldCgpO1xuICAgICAgICB2YXIgaW5TaWdodENvdW50ID0gMDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBib2lkcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGIgPSBib2lkc1tpXTtcbiAgICAgICAgICAgIGlmIChiICE9PSBib2lkICYmIGluU2lnaHQoYikpIHtcbiAgICAgICAgICAgICAgICBhdmVyYWdlVmVsb2NpdHkuYWRkKGIudmVsb2NpdHkpO1xuICAgICAgICAgICAgICAgIGF2ZXJhZ2VQb3NpdGlvbi5hZGQoYi5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgaWYgKHRvb0Nsb3NlKGIpKSB7XG4gICAgICAgICAgICAgICAgICAgIGZsZWUoYi5wb3NpdGlvbik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluU2lnaHRDb3VudCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpblNpZ2h0Q291bnQgPiAwKSB7XG4gICAgICAgICAgICBhdmVyYWdlVmVsb2NpdHkuZGl2aWRlQnkoaW5TaWdodENvdW50KTtcbiAgICAgICAgICAgIGF2ZXJhZ2VQb3NpdGlvbi5kaXZpZGVCeShpblNpZ2h0Q291bnQpO1xuICAgICAgICAgICAgc2VlayhhdmVyYWdlUG9zaXRpb24pO1xuICAgICAgICAgICAgc3RlZXJpbmdGb3JjZS5hZGQoYXZlcmFnZVZlbG9jaXR5LnN1YnRyYWN0KHZlbG9jaXR5KSk7XG4gICAgICAgIH1cbiAgICAgICAgYXZlcmFnZVZlbG9jaXR5LmRpc3Bvc2UoKTtcbiAgICAgICAgYXZlcmFnZVBvc2l0aW9uLmRpc3Bvc2UoKTtcblxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgLy8gaXMgYm9pZCBjbG9zZSBlbm91Z2ggdG8gYmUgaW4gc2lnaHQgYW5kIGZhY2luZ1xuICAgIHZhciBpblNpZ2h0ID0gZnVuY3Rpb24oYm9pZCkge1xuICAgICAgICBpZiAocG9zaXRpb24uZGlzdGFuY2VTcShib2lkLnBvc2l0aW9uKSA+IG1heERpc3RhbmNlU3EpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgaGVhZGluZyA9IHZlbG9jaXR5LmNsb25lKCkubm9ybWFsaXplKCk7XG4gICAgICAgIHZhciBkaWZmZXJlbmNlID0gYm9pZC5wb3NpdGlvbi5jbG9uZSgpLnN1YnRyYWN0KHBvc2l0aW9uKTtcbiAgICAgICAgdmFyIGRvdFByb2QgPSBkaWZmZXJlbmNlLmRvdFByb2R1Y3QoaGVhZGluZyk7XG5cbiAgICAgICAgaGVhZGluZy5kaXNwb3NlKCk7XG4gICAgICAgIGRpZmZlcmVuY2UuZGlzcG9zZSgpO1xuXG4gICAgICAgIGlmIChkb3RQcm9kIDwgMCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICAvLyBpcyBib2lkIHRvbyBjbG9zZT9cbiAgICB2YXIgdG9vQ2xvc2UgPSBmdW5jdGlvbihib2lkKSB7XG4gICAgICAgIHJldHVybiBwb3NpdGlvbi5kaXN0YW5jZVNxKGJvaWQucG9zaXRpb24pIDwgbWluRGlzdGFuY2VTcTtcbiAgICB9O1xuXG4gICAgLy8gbWV0aG9kc1xuICAgIHZhciBib2lkID0ge1xuICAgICAgICBzZXRCb3VuZHM6IHNldEJvdW5kcyxcbiAgICAgICAgdXBkYXRlOiB1cGRhdGUsXG4gICAgICAgIHB1cnN1ZTogcHVyc3VlLFxuICAgICAgICBldmFkZTogZXZhZGUsXG4gICAgICAgIHdhbmRlcjogd2FuZGVyLFxuICAgICAgICBhdm9pZDogYXZvaWQsXG4gICAgICAgIGZvbGxvd1BhdGg6IGZvbGxvd1BhdGgsXG4gICAgICAgIGZsb2NrOiBmbG9jayxcbiAgICAgICAgYXJyaXZlOiBhcnJpdmUsXG4gICAgICAgIHNlZWs6IHNlZWssXG4gICAgICAgIGZsZWU6IGZsZWUsXG4gICAgICAgIHBvc2l0aW9uOiBwb3NpdGlvbixcbiAgICAgICAgdmVsb2NpdHk6IHZlbG9jaXR5LFxuICAgICAgICB1c2VyRGF0YToge31cbiAgICB9O1xuXG4gICAgLy8gZ2V0dGVycyAvIHNldHRlcnNcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhib2lkLCB7XG4gICAgICAgIGVkZ2VCZWhhdmlvcjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWRnZUJlaGF2aW9yO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBlZGdlQmVoYXZpb3IgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbWFzczoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWFzcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWFzcyA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBtYXhTcGVlZDoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF4U3BlZWQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1heFNwZWVkID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbWF4U3BlZWRTcSA9IHZhbHVlICogdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG1heEZvcmNlOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXhGb3JjZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWF4Rm9yY2UgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gYXJyaXZlXG4gICAgICAgIGFycml2ZVRocmVzaG9sZDoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXJyaXZlVGhyZXNob2xkO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhcnJpdmVUaHJlc2hvbGQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBhcnJpdmVUaHJlc2hvbGRTcSA9IHZhbHVlICogdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8vIHdhbmRlclxuICAgICAgICB3YW5kZXJEaXN0YW5jZToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd2FuZGVyRGlzdGFuY2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHdhbmRlckRpc3RhbmNlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHdhbmRlclJhZGl1czoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gd2FuZGVyUmFkaXVzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB3YW5kZXJSYWRpdXMgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgd2FuZGVyUmFuZ2U6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhbmRlclJhbmdlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB3YW5kZXJSYW5nZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyBhdm9pZFxuICAgICAgICBhdm9pZERpc3RhbmNlOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhdm9pZERpc3RhbmNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBhdm9pZERpc3RhbmNlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIGF2b2lkQnVmZmVyOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBhdm9pZEJ1ZmZlcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXZvaWRCdWZmZXIgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gZm9sbG93UGF0aFxuICAgICAgICBwYXRoSW5kZXg6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGhJbmRleDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgcGF0aEluZGV4ID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHBhdGhUaHJlc2hvbGQ6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhdGhUaHJlc2hvbGQ7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHBhdGhUaHJlc2hvbGQgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBwYXRoVGhyZXNob2xkU3EgPSB2YWx1ZSAqIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyAgZmxvY2tcbiAgICAgICAgbWF4RGlzdGFuY2U6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1heERpc3RhbmNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBtYXhEaXN0YW5jZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIG1heERpc3RhbmNlU3EgPSB2YWx1ZSAqIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBtaW5EaXN0YW5jZToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWluRGlzdGFuY2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1pbkRpc3RhbmNlID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgbWluRGlzdGFuY2VTcSA9IHZhbHVlICogdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBPYmplY3QuZnJlZXplKGJvaWQpO1xufVxuXG4vLyBlZGdlIGJlaGF2aW9yc1xuQm9pZC5FREdFX05PTkUgPSAnbm9uZSc7XG5Cb2lkLkVER0VfQk9VTkNFID0gJ2JvdW5jZSc7XG5Cb2lkLkVER0VfV1JBUCA9ICd3cmFwJztcblxuLy8gdmVjMlxuQm9pZC5WZWMyID0gVmVjMjtcblxuQm9pZC52ZWMyID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHJldHVybiBWZWMyLmdldCh4LCB5KTtcbn07XG5cbi8vIGZvciBkZWZpbmluZyBvYnN0YWNsZXMgb3IgYXJlYXMgdG8gYXZvaWRcbkJvaWQub2JzdGFjbGUgPSBmdW5jdGlvbihyYWRpdXMsIHgsIHkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICByYWRpdXM6IHJhZGl1cyxcbiAgICAgICAgcG9zaXRpb246IFZlYzIuZ2V0KHgsIHkpXG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIHNldERlZmF1bHRzKG9wdHMsIGRlZnMpIHtcbiAgICBPYmplY3Qua2V5cyhkZWZzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBpZiAodHlwZW9mIG9wdHNba2V5XSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIG9wdHNba2V5XSA9IGRlZnNba2V5XTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBjb25maWd1cmUob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIG9wdGlvbnMuYm91bmRzID0gb3B0aW9ucy5ib3VuZHMgfHwge307XG4gICAgc2V0RGVmYXVsdHMob3B0aW9ucywgZGVmYXVsdHMpO1xuICAgIHNldERlZmF1bHRzKG9wdGlvbnMuYm91bmRzLCBkZWZhdWx0cy5ib3VuZHMpO1xuICAgIHJldHVybiBvcHRpb25zO1xufVxuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IEJvaWQ7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFZlYzIoeCwgeSkge1xuICAgIHRoaXMueCA9IHggfHwgMDtcbiAgICB0aGlzLnkgPSB5IHx8IDA7XG59XG5cblZlYzIucHJvdG90eXBlID0ge1xuICAgIGFkZDogZnVuY3Rpb24odmVjKSB7XG4gICAgICAgIHRoaXMueCA9IHRoaXMueCArIHZlYy54O1xuICAgICAgICB0aGlzLnkgPSB0aGlzLnkgKyB2ZWMueTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBzdWJ0cmFjdDogZnVuY3Rpb24odmVjKSB7XG4gICAgICAgIHRoaXMueCA9IHRoaXMueCAtIHZlYy54O1xuICAgICAgICB0aGlzLnkgPSB0aGlzLnkgLSB2ZWMueTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbCA9IHRoaXMubGVuZ3RoO1xuICAgICAgICBpZiAobCA9PT0gMCkge1xuICAgICAgICAgICAgdGhpcy54ID0gMTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChsID09PSAxKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnggLz0gbDtcbiAgICAgICAgdGhpcy55IC89IGw7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgaXNOb3JtYWxpemVkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubGVuZ3RoID09PSAxO1xuICAgIH0sXG4gICAgdHJ1bmNhdGU6IGZ1bmN0aW9uKG1heCkge1xuICAgICAgICBpZiAodGhpcy5sZW5ndGggPiBtYXgpIHtcbiAgICAgICAgICAgIHRoaXMubGVuZ3RoID0gbWF4O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc2NhbGVCeTogZnVuY3Rpb24obXVsKSB7XG4gICAgICAgIHRoaXMueCAqPSBtdWw7XG4gICAgICAgIHRoaXMueSAqPSBtdWw7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGl2aWRlQnk6IGZ1bmN0aW9uKGRpdikge1xuICAgICAgICB0aGlzLnggLz0gZGl2O1xuICAgICAgICB0aGlzLnkgLz0gZGl2O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGVxdWFsczogZnVuY3Rpb24odmVjKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnggPT09IHZlYy54ICYmIHRoaXMueSA9PT0gdmVjLnk7XG4gICAgfSxcbiAgICBuZWdhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnggPSAtdGhpcy54O1xuICAgICAgICB0aGlzLnkgPSAtdGhpcy55O1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRvdFByb2R1Y3Q6IGZ1bmN0aW9uKHZlYykge1xuICAgICAgICAvKlxuICAgICAgICBJZiBBIGFuZCBCIGFyZSBwZXJwZW5kaWN1bGFyIChhdCA5MCBkZWdyZWVzIHRvIGVhY2ggb3RoZXIpLCB0aGUgcmVzdWx0XG4gICAgICAgIG9mIHRoZSBkb3QgcHJvZHVjdCB3aWxsIGJlIHplcm8sIGJlY2F1c2UgY29zKM6YKSB3aWxsIGJlIHplcm8uXG4gICAgICAgIElmIHRoZSBhbmdsZSBiZXR3ZWVuIEEgYW5kIEIgYXJlIGxlc3MgdGhhbiA5MCBkZWdyZWVzLCB0aGUgZG90IHByb2R1Y3RcbiAgICAgICAgd2lsbCBiZSBwb3NpdGl2ZSAoZ3JlYXRlciB0aGFuIHplcm8pLCBhcyBjb3MozpgpIHdpbGwgYmUgcG9zaXRpdmUsIGFuZFxuICAgICAgICB0aGUgdmVjdG9yIGxlbmd0aHMgYXJlIGFsd2F5cyBwb3NpdGl2ZSB2YWx1ZXMuXG4gICAgICAgIElmIHRoZSBhbmdsZSBiZXR3ZWVuIEEgYW5kIEIgYXJlIGdyZWF0ZXIgdGhhbiA5MCBkZWdyZWVzLCB0aGUgZG90XG4gICAgICAgIHByb2R1Y3Qgd2lsbCBiZSBuZWdhdGl2ZSAobGVzcyB0aGFuIHplcm8pLCBhcyBjb3MozpgpIHdpbGwgYmUgbmVnYXRpdmUsXG4gICAgICAgIGFuZCB0aGUgdmVjdG9yIGxlbmd0aHMgYXJlIGFsd2F5cyBwb3NpdGl2ZSB2YWx1ZXNcbiAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIHZlYy54ICsgdGhpcy55ICogdmVjLnk7XG4gICAgfSxcbiAgICBjcm9zc1Byb2R1Y3Q6IGZ1bmN0aW9uKHZlYykge1xuICAgICAgICAvKlxuICAgICAgICBUaGUgc2lnbiB0ZWxscyB1cyBpZiB2ZWMgdG8gdGhlIGxlZnQgKC0pIG9yIHRoZSByaWdodCAoKykgb2YgdGhpcyB2ZWNcbiAgICAgICAgKi9cbiAgICAgICAgcmV0dXJuIHRoaXMueCAqIHZlYy55IC0gdGhpcy55ICogdmVjLng7XG4gICAgfSxcbiAgICBkaXN0YW5jZVNxOiBmdW5jdGlvbih2ZWMpIHtcbiAgICAgICAgdmFyIGR4ID0gdmVjLnggLSB0aGlzLng7XG4gICAgICAgIHZhciBkeSA9IHZlYy55IC0gdGhpcy55O1xuICAgICAgICByZXR1cm4gZHggKiBkeCArIGR5ICogZHk7XG4gICAgfSxcbiAgICBkaXN0YW5jZTogZnVuY3Rpb24odmVjKSB7XG4gICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5kaXN0YW5jZVNxKHZlYykpO1xuICAgIH0sXG4gICAgY2xvbmU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gVmVjMi5nZXQodGhpcy54LCB0aGlzLnkpO1xuICAgIH0sXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB0aGlzLnggPSAwO1xuICAgICAgICB0aGlzLnkgPSAwO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHBlcnBlbmRpY3VsYXI6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gVmVjMi5nZXQoLXRoaXMueSwgdGhpcy54KTtcbiAgICB9LFxuICAgIHNpZ246IGZ1bmN0aW9uKHZlYykge1xuICAgICAgICAvLyBEZXRlcm1pbmVzIGlmIGEgZ2l2ZW4gdmVjdG9yIGlzIHRvIHRoZSByaWdodCBvciBsZWZ0IG9mIHRoaXMgdmVjdG9yLlxuICAgICAgICAvLyBJZiB0byB0aGUgbGVmdCwgcmV0dXJucyAtMS4gSWYgdG8gdGhlIHJpZ2h0LCArMS5cbiAgICAgICAgdmFyIHAgPSB0aGlzLnBlcnBlbmRpY3VsYXIoKTtcbiAgICAgICAgdmFyIHMgPSBwLmRvdFByb2R1Y3QodmVjKSA8IDAgPyAtMSA6IDE7XG4gICAgICAgIHAuZGlzcG9zZSgpO1xuICAgICAgICByZXR1cm4gcztcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24oeCwgeSkge1xuICAgICAgICB0aGlzLnggPSB4IHx8IDA7XG4gICAgICAgIHRoaXMueSA9IHkgfHwgMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkaXNwb3NlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgVmVjMi5wb29sLnB1c2godGhpcy5yZXNldCgpKTtcbiAgICB9XG59O1xuXG4vLyBnZXR0ZXJzIC8gc2V0dGVyc1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhWZWMyLnByb3RvdHlwZSwge1xuICAgIGxlbmd0aFNxdWFyZWQ6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGxlbmd0aDoge1xuICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgcmV0dXJuIE1hdGguc3FydCh0aGlzLmxlbmd0aFNxdWFyZWQpO1xuICAgICAgICB9LFxuICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgYSA9IHRoaXMuYW5nbGU7XG4gICAgICAgICAgICB0aGlzLnggPSBNYXRoLmNvcyhhKSAqIHZhbHVlO1xuICAgICAgICAgICAgdGhpcy55ID0gTWF0aC5zaW4oYSkgKiB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgYW5nbGU6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLmF0YW4yKHRoaXMueSwgdGhpcy54KTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGwgPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgICAgIHRoaXMueCA9IE1hdGguY29zKHZhbHVlKSAqIGw7XG4gICAgICAgICAgICB0aGlzLnkgPSBNYXRoLnNpbih2YWx1ZSkgKiBsO1xuICAgICAgICB9XG4gICAgfVxufSk7XG5cbi8vIHN0YXRpY1xuXG5WZWMyLnBvb2wgPSBbXTtcblZlYzIuZ2V0ID0gZnVuY3Rpb24oeCwgeSkge1xuICAgIHZhciB2ID0gVmVjMi5wb29sLmxlbmd0aCA+IDAgPyBWZWMyLnBvb2wucG9wKCkgOiBuZXcgVmVjMigpO1xuICAgIHYuc2V0KHgsIHkpO1xuICAgIHJldHVybiB2O1xufTtcblxuVmVjMi5maWxsID0gZnVuY3Rpb24obikge1xuICAgIHdoaWxlIChWZWMyLnBvb2wubGVuZ3RoIDwgbikge1xuICAgICAgICBWZWMyLnBvb2wucHVzaChuZXcgVmVjMigpKTtcbiAgICB9XG59O1xuXG5WZWMyLmFuZ2xlQmV0d2VlbiA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgICBpZiAoIWEuaXNOb3JtYWxpemVkKCkpIHtcbiAgICAgICAgYSA9IGEuY2xvbmUoKS5ub3JtYWxpemUoKTtcbiAgICB9XG4gICAgaWYgKCFiLmlzTm9ybWFsaXplZCgpKSB7XG4gICAgICAgIGIgPSBiLmNsb25lKCkubm9ybWFsaXplKCk7XG4gICAgfVxuICAgIHJldHVybiBNYXRoLmFjb3MoYS5kb3RQcm9kdWN0KGIpKTtcbn07XG5cbmlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiBtb2R1bGUuZXhwb3J0cykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gVmVjMjtcbn1cbiJdfQ==
