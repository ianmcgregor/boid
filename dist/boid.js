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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYm9pZC5qcyIsInNyYy92ZWMyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsZ0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgVmVjMiA9IHJlcXVpcmUoJy4vdmVjMi5qcycpO1xuXG52YXIgZGVmYXVsdHMgPSB7XG4gICAgYm91bmRzOiB7XG4gICAgICAgIHg6IDAsXG4gICAgICAgIHk6IDAsXG4gICAgICAgIHdpZHRoOiA2NDAsXG4gICAgICAgIGhlaWdodDogNDgwXG4gICAgfSxcbiAgICBlZGdlQmVoYXZpb3I6ICdib3VuY2UnLFxuICAgIG1hc3M6IDEuMCxcbiAgICBtYXhTcGVlZDogMTAsXG4gICAgbWF4Rm9yY2U6IDEsXG4gICAgYXJyaXZlVGhyZXNob2xkOiA1MCxcbiAgICB3YW5kZXJEaXN0YW5jZTogMTAsXG4gICAgd2FuZGVyUmFkaXVzOiA1LFxuICAgIHdhbmRlckFuZ2xlOiAwLFxuICAgIHdhbmRlclJhbmdlOiAxLFxuICAgIGF2b2lkRGlzdGFuY2U6IDMwMCxcbiAgICBhdm9pZEJ1ZmZlcjogMjAsXG4gICAgcGF0aFRocmVzaG9sZDogMjAsXG4gICAgbWF4RGlzdGFuY2U6IDMwMCxcbiAgICBtaW5EaXN0YW5jZTogNjBcbn07XG5cbmZ1bmN0aW9uIEJvaWQob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBjb25maWd1cmUob3B0aW9ucyk7XG5cbiAgICB2YXIgcG9zaXRpb24gPSBWZWMyLmdldCgpO1xuICAgIHZhciB2ZWxvY2l0eSA9IFZlYzIuZ2V0KCk7XG4gICAgdmFyIHN0ZWVyaW5nRm9yY2UgPSBWZWMyLmdldCgpO1xuXG4gICAgdmFyIGJvdW5kcyA9IG9wdGlvbnMuYm91bmRzO1xuICAgIHZhciBlZGdlQmVoYXZpb3IgPSBvcHRpb25zLmVkZ2VCZWhhdmlvcjtcbiAgICB2YXIgbWFzcyA9IG9wdGlvbnMubWFzcztcbiAgICB2YXIgbWF4U3BlZWQgPSBvcHRpb25zLm1heFNwZWVkO1xuICAgIHZhciBtYXhTcGVlZFNxID0gbWF4U3BlZWQgKiBtYXhTcGVlZDtcbiAgICB2YXIgbWF4Rm9yY2UgPSBvcHRpb25zLm1heEZvcmNlO1xuICAgIC8vIGFycml2ZVxuICAgIHZhciBhcnJpdmVUaHJlc2hvbGQgPSBvcHRpb25zLmFycml2ZVRocmVzaG9sZDtcbiAgICB2YXIgYXJyaXZlVGhyZXNob2xkU3EgPSBhcnJpdmVUaHJlc2hvbGQgKiBhcnJpdmVUaHJlc2hvbGQ7XG4gICAgLy8gd2FuZGVyXG4gICAgdmFyIHdhbmRlckRpc3RhbmNlID0gb3B0aW9ucy53YW5kZXJEaXN0YW5jZTtcbiAgICB2YXIgd2FuZGVyUmFkaXVzID0gb3B0aW9ucy53YW5kZXJSYWRpdXM7XG4gICAgdmFyIHdhbmRlckFuZ2xlID0gb3B0aW9ucy53YW5kZXJBbmdsZTtcbiAgICB2YXIgd2FuZGVyUmFuZ2UgPSBvcHRpb25zLndhbmRlclJhbmdlO1xuICAgIC8vIGF2b2lkXG4gICAgdmFyIGF2b2lkRGlzdGFuY2UgPSBvcHRpb25zLmF2b2lkRGlzdGFuY2U7XG4gICAgdmFyIGF2b2lkQnVmZmVyID0gb3B0aW9ucy5hdm9pZEJ1ZmZlcjtcbiAgICAvLyBmb2xsb3cgcGF0aFxuICAgIHZhciBwYXRoSW5kZXggPSAwO1xuICAgIHZhciBwYXRoVGhyZXNob2xkID0gb3B0aW9ucy5wYXRoVGhyZXNob2xkO1xuICAgIHZhciBwYXRoVGhyZXNob2xkU3EgPSBwYXRoVGhyZXNob2xkICogcGF0aFRocmVzaG9sZDtcbiAgICAvLyBmbG9ja1xuICAgIHZhciBtYXhEaXN0YW5jZSA9IG9wdGlvbnMubWF4RGlzdGFuY2U7XG4gICAgdmFyIG1heERpc3RhbmNlU3EgPSBtYXhEaXN0YW5jZSAqIG1heERpc3RhbmNlO1xuICAgIHZhciBtaW5EaXN0YW5jZSA9IG9wdGlvbnMubWluRGlzdGFuY2U7XG4gICAgdmFyIG1pbkRpc3RhbmNlU3EgPSBtaW5EaXN0YW5jZSAqIG1pbkRpc3RhbmNlO1xuXG4gICAgdmFyIHNldEJvdW5kcyA9IGZ1bmN0aW9uKHdpZHRoLCBoZWlnaHQsIHgsIHkpIHtcbiAgICAgICAgYm91bmRzLndpZHRoID0gd2lkdGg7XG4gICAgICAgIGJvdW5kcy5oZWlnaHQgPSBoZWlnaHQ7XG4gICAgICAgIGJvdW5kcy54ID0geCB8fCAwO1xuICAgICAgICBib3VuZHMueSA9IHkgfHwgMDtcblxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICBzdGVlcmluZ0ZvcmNlLnRydW5jYXRlKG1heEZvcmNlKTtcbiAgICAgICAgc3RlZXJpbmdGb3JjZS5kaXZpZGVCeShtYXNzKTtcbiAgICAgICAgdmVsb2NpdHkuYWRkKHN0ZWVyaW5nRm9yY2UpO1xuICAgICAgICBzdGVlcmluZ0ZvcmNlLnJlc2V0KCk7XG4gICAgICAgIHZlbG9jaXR5LnRydW5jYXRlKG1heFNwZWVkKTtcbiAgICAgICAgcG9zaXRpb24uYWRkKHZlbG9jaXR5KTtcblxuICAgICAgICBpZiAoZWRnZUJlaGF2aW9yID09PSBCb2lkLkVER0VfQk9VTkNFKSB7XG4gICAgICAgICAgICBib3VuY2UoKTtcbiAgICAgICAgfSBlbHNlIGlmIChlZGdlQmVoYXZpb3IgPT09IEJvaWQuRURHRV9XUkFQKSB7XG4gICAgICAgICAgICB3cmFwKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIHZhciBib3VuY2UgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHBvc2l0aW9uLnggPiBib3VuZHMud2lkdGgpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnggPSBib3VuZHMud2lkdGg7XG4gICAgICAgICAgICB2ZWxvY2l0eS54ICo9IC0xO1xuICAgICAgICB9IGVsc2UgaWYgKHBvc2l0aW9uLnggPCBib3VuZHMueCkge1xuICAgICAgICAgICAgcG9zaXRpb24ueCA9IGJvdW5kcy54O1xuICAgICAgICAgICAgdmVsb2NpdHkueCAqPSAtMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocG9zaXRpb24ueSA+IGJvdW5kcy5oZWlnaHQpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgPSBib3VuZHMuaGVpZ2h0O1xuICAgICAgICAgICAgdmVsb2NpdHkueSAqPSAtMTtcbiAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbi55IDwgYm91bmRzLnkpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnkgPSBib3VuZHMueTtcbiAgICAgICAgICAgIHZlbG9jaXR5LnkgKj0gLTE7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIHdyYXAgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHBvc2l0aW9uLnggPiBib3VuZHMud2lkdGgpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnggPSBib3VuZHMueDtcbiAgICAgICAgfSBlbHNlIGlmIChwb3NpdGlvbi54IDwgYm91bmRzLngpIHtcbiAgICAgICAgICAgIHBvc2l0aW9uLnggPSBib3VuZHMud2lkdGg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBvc2l0aW9uLnkgPiBib3VuZHMuaGVpZ2h0KSB7XG4gICAgICAgICAgICBwb3NpdGlvbi55ID0gYm91bmRzLnk7XG4gICAgICAgIH0gZWxzZSBpZiAocG9zaXRpb24ueSA8IGJvdW5kcy55KSB7XG4gICAgICAgICAgICBwb3NpdGlvbi55ID0gYm91bmRzLmhlaWdodDtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgc2VlayA9IGZ1bmN0aW9uKHRhcmdldFZlYykge1xuICAgICAgICB2YXIgZGVzaXJlZFZlbG9jaXR5ID0gdGFyZ2V0VmVjLmNsb25lKCkuc3VidHJhY3QocG9zaXRpb24pO1xuICAgICAgICBkZXNpcmVkVmVsb2NpdHkubm9ybWFsaXplKCk7XG4gICAgICAgIGRlc2lyZWRWZWxvY2l0eS5zY2FsZUJ5KG1heFNwZWVkKTtcblxuICAgICAgICB2YXIgZm9yY2UgPSBkZXNpcmVkVmVsb2NpdHkuc3VidHJhY3QodmVsb2NpdHkpO1xuICAgICAgICBzdGVlcmluZ0ZvcmNlLmFkZChmb3JjZSk7XG4gICAgICAgIGZvcmNlLmRpc3Bvc2UoKTtcblxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgdmFyIGZsZWUgPSBmdW5jdGlvbih0YXJnZXRWZWMpIHtcbiAgICAgICAgdmFyIGRlc2lyZWRWZWxvY2l0eSA9IHRhcmdldFZlYy5jbG9uZSgpLnN1YnRyYWN0KHBvc2l0aW9uKTtcbiAgICAgICAgZGVzaXJlZFZlbG9jaXR5Lm5vcm1hbGl6ZSgpO1xuICAgICAgICBkZXNpcmVkVmVsb2NpdHkuc2NhbGVCeShtYXhTcGVlZCk7XG5cbiAgICAgICAgdmFyIGZvcmNlID0gZGVzaXJlZFZlbG9jaXR5LnN1YnRyYWN0KHZlbG9jaXR5KTtcbiAgICAgICAgc3RlZXJpbmdGb3JjZS5zdWJ0cmFjdChmb3JjZSk7XG4gICAgICAgIGZvcmNlLmRpc3Bvc2UoKTtcblxuICAgICAgICByZXR1cm4gYm9pZDtcbiAgICB9O1xuXG4gICAgLy8gc2VlayB1bnRpbCB3aXRoaW4gYXJyaXZlVGhyZXNob2xkXG4gICAgdmFyIGFycml2ZSA9IGZ1bmN0aW9uKHRhcmdldFZlYykge1xuICAgICAgICB2YXIgZGVzaXJlZFZlbG9jaXR5ID0gdGFyZ2V0VmVjLmNsb25lKCkuc3VidHJhY3QocG9zaXRpb24pO1xuICAgICAgICBkZXNpcmVkVmVsb2NpdHkubm9ybWFsaXplKCk7XG5cbiAgICAgICAgdmFyIGRpc3RhbmNlU3EgPSBwb3NpdGlvbi5kaXN0YW5jZVNxKHRhcmdldFZlYyk7XG4gICAgICAgIGlmIChkaXN0YW5jZVNxID4gYXJyaXZlVGhyZXNob2xkU3EpIHtcbiAgICAgICAgICAgIGRlc2lyZWRWZWxvY2l0eS5zY2FsZUJ5KG1heFNwZWVkKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBzY2FsYXIgPSBtYXhTcGVlZCAqIGRpc3RhbmNlU3EgLyBhcnJpdmVUaHJlc2hvbGRTcTtcbiAgICAgICAgICAgIGRlc2lyZWRWZWxvY2l0eS5zY2FsZUJ5KHNjYWxhcik7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGZvcmNlID0gZGVzaXJlZFZlbG9jaXR5LnN1YnRyYWN0KHZlbG9jaXR5KTtcbiAgICAgICAgc3RlZXJpbmdGb3JjZS5hZGQoZm9yY2UpO1xuICAgICAgICBmb3JjZS5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGxvb2sgYXQgdmVsb2NpdHkgb2YgYm9pZCBhbmQgdHJ5IHRvIHByZWRpY3Qgd2hlcmUgaXQncyBnb2luZ1xuICAgIHZhciBwdXJzdWUgPSBmdW5jdGlvbih0YXJnZXRCb2lkKSB7XG4gICAgICAgIHZhciBsb29rQWhlYWRUaW1lID0gcG9zaXRpb24uZGlzdGFuY2VTcSh0YXJnZXRCb2lkLnBvc2l0aW9uKSAvIG1heFNwZWVkU3E7XG5cbiAgICAgICAgdmFyIHNjYWxlZFZlbG9jaXR5ID0gdGFyZ2V0Qm9pZC52ZWxvY2l0eS5jbG9uZSgpLnNjYWxlQnkobG9va0FoZWFkVGltZSk7XG4gICAgICAgIHZhciBwcmVkaWN0ZWRUYXJnZXQgPSB0YXJnZXRCb2lkLnBvc2l0aW9uLmNsb25lKCkuYWRkKHNjYWxlZFZlbG9jaXR5KTtcblxuICAgICAgICBzZWVrKHByZWRpY3RlZFRhcmdldCk7XG5cbiAgICAgICAgc2NhbGVkVmVsb2NpdHkuZGlzcG9zZSgpO1xuICAgICAgICBwcmVkaWN0ZWRUYXJnZXQuZGlzcG9zZSgpO1xuXG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICAvLyBsb29rIGF0IHZlbG9jaXR5IG9mIGJvaWQgYW5kIHRyeSB0byBwcmVkaWN0IHdoZXJlIGl0J3MgZ29pbmdcbiAgICB2YXIgZXZhZGUgPSBmdW5jdGlvbih0YXJnZXRCb2lkKSB7XG4gICAgICAgIHZhciBsb29rQWhlYWRUaW1lID0gcG9zaXRpb24uZGlzdGFuY2VTcSh0YXJnZXRCb2lkLnBvc2l0aW9uKSAvIG1heFNwZWVkU3E7XG5cbiAgICAgICAgdmFyIHNjYWxlZFZlbG9jaXR5ID0gdGFyZ2V0Qm9pZC52ZWxvY2l0eS5jbG9uZSgpLnNjYWxlQnkobG9va0FoZWFkVGltZSk7XG4gICAgICAgIHZhciBwcmVkaWN0ZWRUYXJnZXQgPSB0YXJnZXRCb2lkLnBvc2l0aW9uLmNsb25lKCkuYWRkKHNjYWxlZFZlbG9jaXR5KTtcblxuICAgICAgICBmbGVlKHByZWRpY3RlZFRhcmdldCk7XG5cbiAgICAgICAgc2NhbGVkVmVsb2NpdHkuZGlzcG9zZSgpO1xuICAgICAgICBwcmVkaWN0ZWRUYXJnZXQuZGlzcG9zZSgpO1xuXG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICAvLyB3YW5kZXIgYXJvdW5kLCBjaGFuZ2luZyBhbmdsZSBieSBhIGxpbWl0ZWQgYW1vdW50IGVhY2ggdGlja1xuICAgIHZhciB3YW5kZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGNlbnRlciA9IHZlbG9jaXR5LmNsb25lKCkubm9ybWFsaXplKCkuc2NhbGVCeSh3YW5kZXJEaXN0YW5jZSk7XG5cbiAgICAgICAgdmFyIG9mZnNldCA9IFZlYzIuZ2V0KCk7XG4gICAgICAgIG9mZnNldC5sZW5ndGggPSB3YW5kZXJSYWRpdXM7XG4gICAgICAgIG9mZnNldC5hbmdsZSA9IHdhbmRlckFuZ2xlO1xuICAgICAgICB3YW5kZXJBbmdsZSArPSBNYXRoLnJhbmRvbSgpICogd2FuZGVyUmFuZ2UgLSB3YW5kZXJSYW5nZSAqIDAuNTtcblxuICAgICAgICB2YXIgZm9yY2UgPSBjZW50ZXIuYWRkKG9mZnNldCk7XG4gICAgICAgIHN0ZWVyaW5nRm9yY2UuYWRkKGZvcmNlKTtcblxuICAgICAgICBvZmZzZXQuZGlzcG9zZSgpO1xuICAgICAgICBmb3JjZS5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGdldHMgYSBiaXQgcm91Z2ggdXNlZCBpbiBjb21iaW5hdGlvbiB3aXRoIHNlZWtpbmcgYXMgdGhlIGJvaWQgYXR0ZW1wdHNcbiAgICAvLyB0byBzZWVrIHN0cmFpZ2h0IHRocm91Z2ggYW4gb2JqZWN0IHdoaWxlIHNpbXVsdGFuZW91c2x5IHRyeWluZyB0byBhdm9pZCBpdFxuICAgIHZhciBhdm9pZCA9IGZ1bmN0aW9uKG9ic3RhY2xlcykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9ic3RhY2xlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG9ic3RhY2xlID0gb2JzdGFjbGVzW2ldO1xuICAgICAgICAgICAgdmFyIGhlYWRpbmcgPSB2ZWxvY2l0eS5jbG9uZSgpLm5vcm1hbGl6ZSgpO1xuXG4gICAgICAgICAgICAvLyB2ZWMgYmV0d2VlbiBvYnN0YWNsZSBhbmQgYm9pZFxuICAgICAgICAgICAgdmFyIGRpZmZlcmVuY2UgPSBvYnN0YWNsZS5wb3NpdGlvbi5jbG9uZSgpLnN1YnRyYWN0KHBvc2l0aW9uKTtcbiAgICAgICAgICAgIHZhciBkb3RQcm9kID0gZGlmZmVyZW5jZS5kb3RQcm9kdWN0KGhlYWRpbmcpO1xuXG4gICAgICAgICAgICAvLyBpZiBvYnN0YWNsZSBpbiBmcm9udCBvZiBib2lkXG4gICAgICAgICAgICBpZiAoZG90UHJvZCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyB2ZWMgdG8gcmVwcmVzZW50ICdmZWVsZXInIGFybVxuICAgICAgICAgICAgICAgIHZhciBmZWVsZXIgPSBoZWFkaW5nLmNsb25lKCkuc2NhbGVCeShhdm9pZERpc3RhbmNlKTtcbiAgICAgICAgICAgICAgICAvLyBwcm9qZWN0IGRpZmZlcmVuY2Ugb250byBmZWVsZXJcbiAgICAgICAgICAgICAgICB2YXIgcHJvamVjdGlvbiA9IGhlYWRpbmcuY2xvbmUoKS5zY2FsZUJ5KGRvdFByb2QpO1xuICAgICAgICAgICAgICAgIC8vIGRpc3RhbmNlIGZyb20gb2JzdGFjbGUgdG8gZmVlbGVyXG4gICAgICAgICAgICAgICAgdmFyIHZlY0Rpc3RhbmNlID0gcHJvamVjdGlvbi5zdWJ0cmFjdChkaWZmZXJlbmNlKTtcbiAgICAgICAgICAgICAgICB2YXIgZGlzdGFuY2UgPSB2ZWNEaXN0YW5jZS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgLy8gaWYgZmVlbGVyIGludGVyc2VjdHMgb2JzdGFjbGUgKHBsdXMgYnVmZmVyKSwgYW5kIHByb2plY3Rpb25cbiAgICAgICAgICAgICAgICAvLyBsZXNzIHRoYW4gZmVlbGVyIGxlbmd0aCwgd2lsbCBjb2xsaWRlXG4gICAgICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgKG9ic3RhY2xlLnJhZGl1cyB8fCAwKSArIGF2b2lkQnVmZmVyICYmIHByb2plY3Rpb24ubGVuZ3RoIDwgZmVlbGVyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBjYWxjIGEgZm9yY2UgKy8tIDkwIGRlZyBmcm9tIHZlYyB0byBjaXJjXG4gICAgICAgICAgICAgICAgICAgIHZhciBmb3JjZSA9IGhlYWRpbmcuY2xvbmUoKS5zY2FsZUJ5KG1heFNwZWVkKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yY2UuYW5nbGUgKz0gZGlmZmVyZW5jZS5zaWduKHZlbG9jaXR5KSAqIE1hdGguUEkgLyAyO1xuICAgICAgICAgICAgICAgICAgICAvLyBzY2FsZSBmb3JjZSBieSBkaXN0YW5jZSAoZnVydGhlciA9IHNtYWxsZXIgZm9yY2UpXG4gICAgICAgICAgICAgICAgICAgIGZvcmNlLnNjYWxlQnkoMSAtIHByb2plY3Rpb24ubGVuZ3RoIC8gZmVlbGVyLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZCB0byBzdGVlcmluZyBmb3JjZVxuICAgICAgICAgICAgICAgICAgICBzdGVlcmluZ0ZvcmNlLmFkZChmb3JjZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGJyYWtpbmcgZm9yY2UgLSBzbG93cyBib2lkIGRvd24gc28gaXQgaGFzIHRpbWUgdG8gdHVybiAoY2xvc2VyID0gaGFyZGVyKVxuICAgICAgICAgICAgICAgICAgICB2ZWxvY2l0eS5zY2FsZUJ5KHByb2plY3Rpb24ubGVuZ3RoIC8gZmVlbGVyLmxlbmd0aCk7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yY2UuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBmZWVsZXIuZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIHByb2plY3Rpb24uZGlzcG9zZSgpO1xuICAgICAgICAgICAgICAgIHZlY0Rpc3RhbmNlLmRpc3Bvc2UoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGhlYWRpbmcuZGlzcG9zZSgpO1xuICAgICAgICAgICAgZGlmZmVyZW5jZS5kaXNwb3NlKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGZvbGxvdyBhIHBhdGggbWFkZSB1cCBvZiBhbiBhcnJheSBvciB2ZWN0b3JzXG4gICAgdmFyIGZvbGxvd1BhdGggPSBmdW5jdGlvbihwYXRoLCBsb29wKSB7XG4gICAgICAgIGxvb3AgPSAhIWxvb3A7XG5cbiAgICAgICAgdmFyIHdheVBvaW50ID0gcGF0aFtwYXRoSW5kZXhdO1xuICAgICAgICBpZiAoIXdheVBvaW50KSB7XG4gICAgICAgICAgICBwYXRoSW5kZXggPSAwO1xuICAgICAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHBvc2l0aW9uLmRpc3RhbmNlU3Eod2F5UG9pbnQpIDwgcGF0aFRocmVzaG9sZFNxKSB7XG4gICAgICAgICAgICBpZiAocGF0aEluZGV4ID49IHBhdGgubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgIGlmIChsb29wKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhdGhJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYXRoSW5kZXgrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAocGF0aEluZGV4ID49IHBhdGgubGVuZ3RoIC0gMSAmJiAhbG9vcCkge1xuICAgICAgICAgICAgYXJyaXZlKHdheVBvaW50KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlZWsod2F5UG9pbnQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBib2lkO1xuICAgIH07XG5cbiAgICAvLyBmbG9jayAtIGdyb3VwIG9mIGJvaWRzIGxvb3NlbHkgbW92ZSB0b2dldGhlclxuICAgIHZhciBmbG9jayA9IGZ1bmN0aW9uKGJvaWRzKSB7XG4gICAgICAgIHZhciBhdmVyYWdlVmVsb2NpdHkgPSB2ZWxvY2l0eS5jbG9uZSgpO1xuICAgICAgICB2YXIgYXZlcmFnZVBvc2l0aW9uID0gVmVjMi5nZXQoKTtcbiAgICAgICAgdmFyIGluU2lnaHRDb3VudCA9IDA7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYm9pZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBiID0gYm9pZHNbaV07XG4gICAgICAgICAgICBpZiAoYiAhPT0gYm9pZCAmJiBpblNpZ2h0KGIpKSB7XG4gICAgICAgICAgICAgICAgYXZlcmFnZVZlbG9jaXR5LmFkZChiLnZlbG9jaXR5KTtcbiAgICAgICAgICAgICAgICBhdmVyYWdlUG9zaXRpb24uYWRkKGIucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIGlmICh0b29DbG9zZShiKSkge1xuICAgICAgICAgICAgICAgICAgICBmbGVlKGIucG9zaXRpb24pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpblNpZ2h0Q291bnQrKztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5TaWdodENvdW50ID4gMCkge1xuICAgICAgICAgICAgYXZlcmFnZVZlbG9jaXR5LmRpdmlkZUJ5KGluU2lnaHRDb3VudCk7XG4gICAgICAgICAgICBhdmVyYWdlUG9zaXRpb24uZGl2aWRlQnkoaW5TaWdodENvdW50KTtcbiAgICAgICAgICAgIHNlZWsoYXZlcmFnZVBvc2l0aW9uKTtcbiAgICAgICAgICAgIHN0ZWVyaW5nRm9yY2UuYWRkKGF2ZXJhZ2VWZWxvY2l0eS5zdWJ0cmFjdCh2ZWxvY2l0eSkpO1xuICAgICAgICB9XG4gICAgICAgIGF2ZXJhZ2VWZWxvY2l0eS5kaXNwb3NlKCk7XG4gICAgICAgIGF2ZXJhZ2VQb3NpdGlvbi5kaXNwb3NlKCk7XG5cbiAgICAgICAgcmV0dXJuIGJvaWQ7XG4gICAgfTtcblxuICAgIC8vIGlzIGJvaWQgY2xvc2UgZW5vdWdoIHRvIGJlIGluIHNpZ2h0IGFuZCBmYWNpbmdcbiAgICB2YXIgaW5TaWdodCA9IGZ1bmN0aW9uKGJvaWQpIHtcbiAgICAgICAgaWYgKHBvc2l0aW9uLmRpc3RhbmNlU3EoYm9pZC5wb3NpdGlvbikgPiBtYXhEaXN0YW5jZVNxKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGhlYWRpbmcgPSB2ZWxvY2l0eS5jbG9uZSgpLm5vcm1hbGl6ZSgpO1xuICAgICAgICB2YXIgZGlmZmVyZW5jZSA9IGJvaWQucG9zaXRpb24uY2xvbmUoKS5zdWJ0cmFjdChwb3NpdGlvbik7XG4gICAgICAgIHZhciBkb3RQcm9kID0gZGlmZmVyZW5jZS5kb3RQcm9kdWN0KGhlYWRpbmcpO1xuXG4gICAgICAgIGhlYWRpbmcuZGlzcG9zZSgpO1xuICAgICAgICBkaWZmZXJlbmNlLmRpc3Bvc2UoKTtcblxuICAgICAgICBpZiAoZG90UHJvZCA8IDApIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuXG4gICAgLy8gaXMgYm9pZCB0b28gY2xvc2U/XG4gICAgdmFyIHRvb0Nsb3NlID0gZnVuY3Rpb24oYm9pZCkge1xuICAgICAgICByZXR1cm4gcG9zaXRpb24uZGlzdGFuY2VTcShib2lkLnBvc2l0aW9uKSA8IG1pbkRpc3RhbmNlU3E7XG4gICAgfTtcblxuICAgIC8vIG1ldGhvZHNcbiAgICB2YXIgYm9pZCA9IHtcbiAgICAgICAgc2V0Qm91bmRzOiBzZXRCb3VuZHMsXG4gICAgICAgIHVwZGF0ZTogdXBkYXRlLFxuICAgICAgICBwdXJzdWU6IHB1cnN1ZSxcbiAgICAgICAgZXZhZGU6IGV2YWRlLFxuICAgICAgICB3YW5kZXI6IHdhbmRlcixcbiAgICAgICAgYXZvaWQ6IGF2b2lkLFxuICAgICAgICBmb2xsb3dQYXRoOiBmb2xsb3dQYXRoLFxuICAgICAgICBmbG9jazogZmxvY2ssXG4gICAgICAgIGFycml2ZTogYXJyaXZlLFxuICAgICAgICBmbGVlOiBmbGVlLFxuICAgICAgICBwb3NpdGlvbjogcG9zaXRpb24sXG4gICAgICAgIHZlbG9jaXR5OiB2ZWxvY2l0eSxcbiAgICAgICAgdXNlckRhdGE6IHt9XG4gICAgfTtcblxuICAgIC8vIGdldHRlcnMgLyBzZXR0ZXJzXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoYm9pZCwge1xuICAgICAgICBlZGdlQmVoYXZpb3I6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVkZ2VCZWhhdmlvcjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgZWRnZUJlaGF2aW9yID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG1hc3M6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hc3M7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1hc3MgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbWF4U3BlZWQ6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1heFNwZWVkO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBtYXhTcGVlZCA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIG1heFNwZWVkU3EgPSB2YWx1ZSAqIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBtYXhGb3JjZToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF4Rm9yY2U7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIG1heEZvcmNlID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8vIGFycml2ZVxuICAgICAgICBhcnJpdmVUaHJlc2hvbGQ6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGFycml2ZVRocmVzaG9sZDtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXJyaXZlVGhyZXNob2xkID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgYXJyaXZlVGhyZXNob2xkU3EgPSB2YWx1ZSAqIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICAvLyB3YW5kZXJcbiAgICAgICAgd2FuZGVyRGlzdGFuY2U6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhbmRlckRpc3RhbmNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICB3YW5kZXJEaXN0YW5jZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICB3YW5kZXJSYWRpdXM6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdhbmRlclJhZGl1cztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgd2FuZGVyUmFkaXVzID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHdhbmRlclJhbmdlOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB3YW5kZXJSYW5nZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgd2FuZGVyUmFuZ2UgPSB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gYXZvaWRcbiAgICAgICAgYXZvaWREaXN0YW5jZToge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXZvaWREaXN0YW5jZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgYXZvaWREaXN0YW5jZSA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBhdm9pZEJ1ZmZlcjoge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gYXZvaWRCdWZmZXI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGF2b2lkQnVmZmVyID0gdmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIC8vIGZvbGxvd1BhdGhcbiAgICAgICAgcGF0aEluZGV4OiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoSW5kZXg7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgICAgIHBhdGhJbmRleCA9IHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBwYXRoVGhyZXNob2xkOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwYXRoVGhyZXNob2xkO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBwYXRoVGhyZXNob2xkID0gdmFsdWU7XG4gICAgICAgICAgICAgICAgcGF0aFRocmVzaG9sZFNxID0gdmFsdWUgKiB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgLy8gIGZsb2NrXG4gICAgICAgIG1heERpc3RhbmNlOiB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBtYXhEaXN0YW5jZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgbWF4RGlzdGFuY2UgPSB2YWx1ZTtcbiAgICAgICAgICAgICAgICBtYXhEaXN0YW5jZVNxID0gdmFsdWUgKiB2YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgbWluRGlzdGFuY2U6IHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1pbkRpc3RhbmNlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgICAgICBtaW5EaXN0YW5jZSA9IHZhbHVlO1xuICAgICAgICAgICAgICAgIG1pbkRpc3RhbmNlU3EgPSB2YWx1ZSAqIHZhbHVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZShib2lkKTtcbn1cblxuLy8gZWRnZSBiZWhhdmlvcnNcbkJvaWQuRURHRV9OT05FID0gJ25vbmUnO1xuQm9pZC5FREdFX0JPVU5DRSA9ICdib3VuY2UnO1xuQm9pZC5FREdFX1dSQVAgPSAnd3JhcCc7XG5cbi8vIHZlYzJcbkJvaWQuVmVjMiA9IFZlYzI7XG5cbkJvaWQudmVjMiA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICByZXR1cm4gVmVjMi5nZXQoeCwgeSk7XG59O1xuXG4vLyBmb3IgZGVmaW5pbmcgb2JzdGFjbGVzIG9yIGFyZWFzIHRvIGF2b2lkXG5Cb2lkLm9ic3RhY2xlID0gZnVuY3Rpb24ocmFkaXVzLCB4LCB5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmFkaXVzOiByYWRpdXMsXG4gICAgICAgIHBvc2l0aW9uOiBWZWMyLmdldCh4LCB5KVxuICAgIH07XG59O1xuXG5mdW5jdGlvbiBzZXREZWZhdWx0cyhvcHRzLCBkZWZzKSB7XG4gICAgT2JqZWN0LmtleXMoZGVmcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBvcHRzW2tleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBvcHRzW2tleV0gPSBkZWZzW2tleV07XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gY29uZmlndXJlKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmJvdW5kcyA9IG9wdGlvbnMuYm91bmRzIHx8IHt9O1xuICAgIHNldERlZmF1bHRzKG9wdGlvbnMsIGRlZmF1bHRzKTtcbiAgICBzZXREZWZhdWx0cyhvcHRpb25zLmJvdW5kcywgZGVmYXVsdHMuYm91bmRzKTtcbiAgICByZXR1cm4gb3B0aW9ucztcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgPT09ICdvYmplY3QnICYmIG1vZHVsZS5leHBvcnRzKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBCb2lkO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBWZWMyKHgsIHkpIHtcbiAgICB0aGlzLnggPSB4IHx8IDA7XG4gICAgdGhpcy55ID0geSB8fCAwO1xufVxuXG5WZWMyLnByb3RvdHlwZSA9IHtcbiAgICBhZGQ6IGZ1bmN0aW9uKHZlYykge1xuICAgICAgICB0aGlzLnggPSB0aGlzLnggKyB2ZWMueDtcbiAgICAgICAgdGhpcy55ID0gdGhpcy55ICsgdmVjLnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgc3VidHJhY3Q6IGZ1bmN0aW9uKHZlYykge1xuICAgICAgICB0aGlzLnggPSB0aGlzLnggLSB2ZWMueDtcbiAgICAgICAgdGhpcy55ID0gdGhpcy55IC0gdmVjLnk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgbm9ybWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGwgPSB0aGlzLmxlbmd0aDtcbiAgICAgICAgaWYgKGwgPT09IDApIHtcbiAgICAgICAgICAgIHRoaXMueCA9IDE7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgICAgICBpZiAobCA9PT0gMSkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy54IC89IGw7XG4gICAgICAgIHRoaXMueSAvPSBsO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGlzTm9ybWFsaXplZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmxlbmd0aCA9PT0gMTtcbiAgICB9LFxuICAgIHRydW5jYXRlOiBmdW5jdGlvbihtYXgpIHtcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID4gbWF4KSB7XG4gICAgICAgICAgICB0aGlzLmxlbmd0aCA9IG1heDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIHNjYWxlQnk6IGZ1bmN0aW9uKG11bCkge1xuICAgICAgICB0aGlzLnggKj0gbXVsO1xuICAgICAgICB0aGlzLnkgKj0gbXVsO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRpdmlkZUJ5OiBmdW5jdGlvbihkaXYpIHtcbiAgICAgICAgdGhpcy54IC89IGRpdjtcbiAgICAgICAgdGhpcy55IC89IGRpdjtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBlcXVhbHM6IGZ1bmN0aW9uKHZlYykge1xuICAgICAgICByZXR1cm4gdGhpcy54ID09PSB2ZWMueCAmJiB0aGlzLnkgPT09IHZlYy55O1xuICAgIH0sXG4gICAgbmVnYXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy54ID0gLXRoaXMueDtcbiAgICAgICAgdGhpcy55ID0gLXRoaXMueTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkb3RQcm9kdWN0OiBmdW5jdGlvbih2ZWMpIHtcbiAgICAgICAgLypcbiAgICAgICAgSWYgQSBhbmQgQiBhcmUgcGVycGVuZGljdWxhciAoYXQgOTAgZGVncmVlcyB0byBlYWNoIG90aGVyKSwgdGhlIHJlc3VsdFxuICAgICAgICBvZiB0aGUgZG90IHByb2R1Y3Qgd2lsbCBiZSB6ZXJvLCBiZWNhdXNlIGNvcyjOmCkgd2lsbCBiZSB6ZXJvLlxuICAgICAgICBJZiB0aGUgYW5nbGUgYmV0d2VlbiBBIGFuZCBCIGFyZSBsZXNzIHRoYW4gOTAgZGVncmVlcywgdGhlIGRvdCBwcm9kdWN0XG4gICAgICAgIHdpbGwgYmUgcG9zaXRpdmUgKGdyZWF0ZXIgdGhhbiB6ZXJvKSwgYXMgY29zKM6YKSB3aWxsIGJlIHBvc2l0aXZlLCBhbmRcbiAgICAgICAgdGhlIHZlY3RvciBsZW5ndGhzIGFyZSBhbHdheXMgcG9zaXRpdmUgdmFsdWVzLlxuICAgICAgICBJZiB0aGUgYW5nbGUgYmV0d2VlbiBBIGFuZCBCIGFyZSBncmVhdGVyIHRoYW4gOTAgZGVncmVlcywgdGhlIGRvdFxuICAgICAgICBwcm9kdWN0IHdpbGwgYmUgbmVnYXRpdmUgKGxlc3MgdGhhbiB6ZXJvKSwgYXMgY29zKM6YKSB3aWxsIGJlIG5lZ2F0aXZlLFxuICAgICAgICBhbmQgdGhlIHZlY3RvciBsZW5ndGhzIGFyZSBhbHdheXMgcG9zaXRpdmUgdmFsdWVzXG4gICAgICAgICovXG4gICAgICAgIHJldHVybiB0aGlzLnggKiB2ZWMueCArIHRoaXMueSAqIHZlYy55O1xuICAgIH0sXG4gICAgY3Jvc3NQcm9kdWN0OiBmdW5jdGlvbih2ZWMpIHtcbiAgICAgICAgLypcbiAgICAgICAgVGhlIHNpZ24gdGVsbHMgdXMgaWYgdmVjIHRvIHRoZSBsZWZ0ICgtKSBvciB0aGUgcmlnaHQgKCspIG9mIHRoaXMgdmVjXG4gICAgICAgICovXG4gICAgICAgIHJldHVybiB0aGlzLnggKiB2ZWMueSAtIHRoaXMueSAqIHZlYy54O1xuICAgIH0sXG4gICAgZGlzdGFuY2VTcTogZnVuY3Rpb24odmVjKSB7XG4gICAgICAgIHZhciBkeCA9IHZlYy54IC0gdGhpcy54O1xuICAgICAgICB2YXIgZHkgPSB2ZWMueSAtIHRoaXMueTtcbiAgICAgICAgcmV0dXJuIGR4ICogZHggKyBkeSAqIGR5O1xuICAgIH0sXG4gICAgZGlzdGFuY2U6IGZ1bmN0aW9uKHZlYykge1xuICAgICAgICByZXR1cm4gTWF0aC5zcXJ0KHRoaXMuZGlzdGFuY2VTcSh2ZWMpKTtcbiAgICB9LFxuICAgIGNsb25lOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFZlYzIuZ2V0KHRoaXMueCwgdGhpcy55KTtcbiAgICB9LFxuICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy54ID0gMDtcbiAgICAgICAgdGhpcy55ID0gMDtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBwZXJwZW5kaWN1bGFyOiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIFZlYzIuZ2V0KC10aGlzLnksIHRoaXMueCk7XG4gICAgfSxcbiAgICBzaWduOiBmdW5jdGlvbih2ZWMpIHtcbiAgICAgICAgLy8gRGV0ZXJtaW5lcyBpZiBhIGdpdmVuIHZlY3RvciBpcyB0byB0aGUgcmlnaHQgb3IgbGVmdCBvZiB0aGlzIHZlY3Rvci5cbiAgICAgICAgLy8gSWYgdG8gdGhlIGxlZnQsIHJldHVybnMgLTEuIElmIHRvIHRoZSByaWdodCwgKzEuXG4gICAgICAgIHZhciBwID0gdGhpcy5wZXJwZW5kaWN1bGFyKCk7XG4gICAgICAgIHZhciBzID0gcC5kb3RQcm9kdWN0KHZlYykgPCAwID8gLTEgOiAxO1xuICAgICAgICBwLmRpc3Bvc2UoKTtcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICAgICAgdGhpcy54ID0geCB8fCAwO1xuICAgICAgICB0aGlzLnkgPSB5IHx8IDA7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGlzcG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIFZlYzIucG9vbC5wdXNoKHRoaXMucmVzZXQoKSk7XG4gICAgfVxufTtcblxuLy8gZ2V0dGVycyAvIHNldHRlcnNcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoVmVjMi5wcm90b3R5cGUsIHtcbiAgICBsZW5ndGhTcXVhcmVkOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55O1xuICAgICAgICB9XG4gICAgfSxcbiAgICBsZW5ndGg6IHtcbiAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBNYXRoLnNxcnQodGhpcy5sZW5ndGhTcXVhcmVkKTtcbiAgICAgICAgfSxcbiAgICAgICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAgICAgdmFyIGEgPSB0aGlzLmFuZ2xlO1xuICAgICAgICAgICAgdGhpcy54ID0gTWF0aC5jb3MoYSkgKiB2YWx1ZTtcbiAgICAgICAgICAgIHRoaXMueSA9IE1hdGguc2luKGEpICogdmFsdWU7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIGFuZ2xlOiB7XG4gICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gTWF0aC5hdGFuMih0aGlzLnksIHRoaXMueCk7XG4gICAgICAgIH0sXG4gICAgICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHZhciBsID0gdGhpcy5sZW5ndGg7XG4gICAgICAgICAgICB0aGlzLnggPSBNYXRoLmNvcyh2YWx1ZSkgKiBsO1xuICAgICAgICAgICAgdGhpcy55ID0gTWF0aC5zaW4odmFsdWUpICogbDtcbiAgICAgICAgfVxuICAgIH1cbn0pO1xuXG4vLyBzdGF0aWNcblxuVmVjMi5wb29sID0gW107XG5WZWMyLmdldCA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICB2YXIgdiA9IFZlYzIucG9vbC5sZW5ndGggPiAwID8gVmVjMi5wb29sLnBvcCgpIDogbmV3IFZlYzIoKTtcbiAgICB2LnNldCh4LCB5KTtcbiAgICByZXR1cm4gdjtcbn07XG5cblZlYzIuZmlsbCA9IGZ1bmN0aW9uKG4pIHtcbiAgICB3aGlsZSAoVmVjMi5wb29sLmxlbmd0aCA8IG4pIHtcbiAgICAgICAgVmVjMi5wb29sLnB1c2gobmV3IFZlYzIoKSk7XG4gICAgfVxufTtcblxuVmVjMi5hbmdsZUJldHdlZW4gPSBmdW5jdGlvbihhLCBiKSB7XG4gICAgaWYgKCFhLmlzTm9ybWFsaXplZCgpKSB7XG4gICAgICAgIGEgPSBhLmNsb25lKCkubm9ybWFsaXplKCk7XG4gICAgfVxuICAgIGlmICghYi5pc05vcm1hbGl6ZWQoKSkge1xuICAgICAgICBiID0gYi5jbG9uZSgpLm5vcm1hbGl6ZSgpO1xuICAgIH1cbiAgICByZXR1cm4gTWF0aC5hY29zKGEuZG90UHJvZHVjdChiKSk7XG59O1xuXG5pZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFZlYzI7XG59XG4iXX0=
