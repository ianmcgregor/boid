(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Boid = factory());
}(this, (function () { 'use strict';

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var acos = Math.acos;
var atan2 = Math.atan2;
var cos = Math.cos;
var sin = Math.sin;
var sqrt = Math.sqrt;


var pool = [];

var Vec2 = function () {
    function Vec2() {
        var x = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
        var y = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
        classCallCheck(this, Vec2);

        this.x = x;
        this.y = y;
    }

    Vec2.prototype.add = function add(vec) {
        this.x = this.x + vec.x;
        this.y = this.y + vec.y;
        return this;
    };

    Vec2.prototype.subtract = function subtract(vec) {
        this.x = this.x - vec.x;
        this.y = this.y - vec.y;
        return this;
    };

    Vec2.prototype.normalize = function normalize() {
        var lsq = this.lengthSquared;
        if (lsq === 0) {
            this.x = 1;
            return this;
        }
        if (lsq === 1) {
            return this;
        }
        var l = sqrt(lsq);
        this.x /= l;
        this.y /= l;
        return this;
    };

    Vec2.prototype.isNormalized = function isNormalized() {
        return this.lengthSquared === 1;
    };

    Vec2.prototype.truncate = function truncate(max) {
        // if (this.length > max) {
        if (this.lengthSquared > max * max) {
            this.length = max;
        }
        return this;
    };

    Vec2.prototype.scaleBy = function scaleBy(mul) {
        this.x *= mul;
        this.y *= mul;
        return this;
    };

    Vec2.prototype.divideBy = function divideBy(div) {
        this.x /= div;
        this.y /= div;
        return this;
    };

    Vec2.prototype.equals = function equals(vec) {
        return this.x === vec.x && this.y === vec.y;
    };

    Vec2.prototype.negate = function negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    };

    Vec2.prototype.dotProduct = function dotProduct(vec) {
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
    };

    Vec2.prototype.crossProduct = function crossProduct(vec) {
        /*
        The sign tells us if vec to the left (-) or the right (+) of this vec
        */
        return this.x * vec.y - this.y * vec.x;
    };

    Vec2.prototype.distanceSq = function distanceSq(vec) {
        var dx = vec.x - this.x;
        var dy = vec.y - this.y;
        return dx * dx + dy * dy;
    };

    Vec2.prototype.distance = function distance(vec) {
        return sqrt(this.distanceSq(vec));
    };

    Vec2.prototype.clone = function clone() {
        return Vec2.get(this.x, this.y);
    };

    Vec2.prototype.reset = function reset() {
        this.x = 0;
        this.y = 0;
        return this;
    };

    Vec2.prototype.copy = function copy(vec) {
        this.x = vec.x;
        this.y = vec.y;
        return this;
    };

    Vec2.prototype.perpendicular = function perpendicular() {
        return Vec2.get(-this.y, this.x);
    };

    Vec2.prototype.sign = function sign(vec) {
        // Determines if a given vector is to the right or left of this vector.
        // If to the left, returns -1. If to the right, +1.
        var p = this.perpendicular();
        var s = p.dotProduct(vec) < 0 ? -1 : 1;
        p.dispose();
        return s;
    };

    Vec2.prototype.set = function set$$1(angle, length) {
        this.x = cos(angle) * length;
        this.y = sin(angle) * length;
        return this;
    };

    Vec2.prototype.dispose = function dispose() {
        this.x = 0;
        this.y = 0;
        pool.push(this);
    };

    Vec2.get = function get$$1(x, y) {
        var v = pool.length > 0 ? pool.pop() : new Vec2();
        v.x = x || 0;
        v.y = y || 0;
        return v;
    };

    Vec2.fill = function fill(n) {
        while (pool.length < n) {
            pool.push(new Vec2());
        }
    };

    Vec2.angleBetween = function angleBetween(a, b) {
        if (!a.isNormalized()) {
            a = a.clone().normalize();
        }
        if (!b.isNormalized()) {
            b = b.clone().normalize();
        }
        return acos(a.dotProduct(b));
    };

    createClass(Vec2, [{
        key: "lengthSquared",
        get: function get$$1() {
            return this.x * this.x + this.y * this.y;
        }
    }, {
        key: "length",
        get: function get$$1() {
            return sqrt(this.lengthSquared);
        },
        set: function set$$1(value) {
            var a = this.angle;
            this.x = cos(a) * value;
            this.y = sin(a) * value;
        }
    }, {
        key: "angle",
        get: function get$$1() {
            return atan2(this.y, this.x);
        },
        set: function set$$1(value) {
            var l = this.length;
            this.x = cos(value) * l;
            this.y = sin(value) * l;
        }
    }]);
    return Vec2;
}();

var PI_D2 = Math.PI / 2;

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
    radius: 0,
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

function setDefaults(opts, defs) {
    Object.keys(defs).forEach(function (key) {
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

function Boid(options) {
    options = configure(options);

    var boid = null;
    var position = Vec2.get();
    var velocity = Vec2.get();
    var steeringForce = Vec2.get();

    var bounds = options.bounds;
    var edgeBehavior = options.edgeBehavior;
    var mass = options.mass;
    var maxSpeed = options.maxSpeed;
    var maxSpeedSq = maxSpeed * maxSpeed;
    var maxForce = options.maxForce;
    var radius = options.radius;
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

    function setBounds(width, height, x, y) {
        bounds.width = width;
        bounds.height = height;
        bounds.x = x || 0;
        bounds.y = y || 0;

        return boid;
    }

    function bounce() {
        var minX = bounds.x + radius;
        var maxX = bounds.x + bounds.width - radius;
        if (position.x > maxX) {
            position.x = maxX;
            velocity.x *= -1;
        } else if (position.x < minX) {
            position.x = minX;
            velocity.x *= -1;
        }

        var minY = bounds.y + radius;
        var maxY = bounds.y + bounds.height - radius;
        if (position.y > maxY) {
            position.y = maxY;
            velocity.y *= -1;
        } else if (position.y < minY) {
            position.y = minY;
            velocity.y *= -1;
        }
    }

    function wrap() {
        var minX = bounds.x - radius;
        var maxX = bounds.x + bounds.width + radius;
        if (position.x > maxX) {
            position.x = minX;
        } else if (position.x < minX) {
            position.x = maxX;
        }

        var minY = bounds.y - radius;
        var maxY = bounds.y + bounds.height + radius;
        if (position.y > maxY) {
            position.y = minY;
        } else if (position.y < minY) {
            position.y = maxY;
        }
    }

    function seek(targetVec) {
        var desiredVelocity = targetVec.clone().subtract(position);
        desiredVelocity.normalize();
        desiredVelocity.scaleBy(maxSpeed);

        var force = desiredVelocity.subtract(velocity);
        steeringForce.add(force);
        force.dispose();

        return boid;
    }

    function flee(targetVec) {
        var desiredVelocity = targetVec.clone().subtract(position);
        desiredVelocity.normalize();
        desiredVelocity.scaleBy(maxSpeed);

        var force = desiredVelocity.subtract(velocity);
        steeringForce.subtract(force);
        force.dispose();

        return boid;
    }

    // seek until within arriveThreshold
    function arrive(targetVec) {
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
    }

    // look at velocity of boid and try to predict where it's going
    function pursue(targetBoid) {
        var lookAheadTime = position.distanceSq(targetBoid.position) / maxSpeedSq;

        var scaledVelocity = targetBoid.velocity.clone().scaleBy(lookAheadTime);
        var predictedTarget = targetBoid.position.clone().add(scaledVelocity);

        seek(predictedTarget);

        scaledVelocity.dispose();
        predictedTarget.dispose();

        return boid;
    }

    // look at velocity of boid and try to predict where it's going
    function evade(targetBoid) {
        var lookAheadTime = position.distanceSq(targetBoid.position) / maxSpeedSq;

        var scaledVelocity = targetBoid.velocity.clone().scaleBy(lookAheadTime);
        var predictedTarget = targetBoid.position.clone().add(scaledVelocity);

        flee(predictedTarget);

        scaledVelocity.dispose();
        predictedTarget.dispose();

        return boid;
    }

    // wander around, changing angle by a limited amount each tick
    function wander() {
        var center = velocity.clone().normalize().scaleBy(wanderDistance);

        var offset = Vec2.get();
        offset.set(wanderAngle, wanderRadius);
        // offset.length = wanderRadius;
        // offset.angle = wanderAngle;
        wanderAngle += Math.random() * wanderRange - wanderRange * 0.5;

        var force = center.add(offset);
        steeringForce.add(force);

        offset.dispose();
        force.dispose();

        return boid;
    }

    // gets a bit rough used in combination with seeking as the boid attempts
    // to seek straight through an object while simultaneously trying to avoid it
    function avoid(obstacles) {
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
                    force.angle += difference.sign(velocity) * PI_D2;
                    // scale force by distance (further = smaller force)
                    var dist = projection.length / feeler.length;
                    force.scaleBy(1 - dist);
                    // add to steering force
                    steeringForce.add(force);
                    // braking force - slows boid down so it has time to turn (closer = harder)
                    velocity.scaleBy(dist);

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
    }

    // follow a path made up of an array or vectors
    function followPath(path, loop) {
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
    }

    // is boid close enough to be in sight and facing
    function inSight(b) {
        if (position.distanceSq(b.position) > maxDistanceSq) {
            return false;
        }
        var heading = velocity.clone().normalize();
        var difference = b.position.clone().subtract(position);
        var dotProd = difference.dotProduct(heading);

        heading.dispose();
        difference.dispose();

        return dotProd >= 0;
    }

    // flock - group of boids loosely move together
    function flock(boids) {
        var averageVelocity = velocity.clone();
        var averagePosition = Vec2.get();
        var inSightCount = 0;
        for (var i = 0; i < boids.length; i++) {
            var b = boids[i];
            if (b !== boid && inSight(b)) {
                averageVelocity.add(b.velocity);
                averagePosition.add(b.position);

                if (position.distanceSq(b.position) < minDistanceSq) {
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
    }

    function update() {
        steeringForce.truncate(maxForce);
        if (mass !== 1) {
            steeringForce.divideBy(mass);
        }
        // velocity.add(steeringForce);
        velocity.x += steeringForce.x;
        velocity.y += steeringForce.y;
        // steeringForce.reset();
        steeringForce.x = 0;
        steeringForce.y = 0;
        velocity.truncate(maxSpeed);
        // position.add(velocity);
        position.x += velocity.x;
        position.y += velocity.y;

        if (edgeBehavior === Boid.EDGE_BOUNCE) {
            bounce();
        } else if (edgeBehavior === Boid.EDGE_WRAP) {
            wrap();
        }
        return boid;
    }

    boid = {
        bounds: bounds,
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
            get: function get() {
                return edgeBehavior;
            },
            set: function set(value) {
                edgeBehavior = value;
            }
        },
        mass: {
            get: function get() {
                return mass;
            },
            set: function set(value) {
                mass = value;
            }
        },
        maxSpeed: {
            get: function get() {
                return maxSpeed;
            },
            set: function set(value) {
                maxSpeed = value;
                maxSpeedSq = value * value;
            }
        },
        maxForce: {
            get: function get() {
                return maxForce;
            },
            set: function set(value) {
                maxForce = value;
            }
        },
        radius: {
            get: function get() {
                return radius;
            },
            set: function set(value) {
                radius = value;
            }
        },
        // arrive
        arriveThreshold: {
            get: function get() {
                return arriveThreshold;
            },
            set: function set(value) {
                arriveThreshold = value;
                arriveThresholdSq = value * value;
            }
        },
        // wander
        wanderDistance: {
            get: function get() {
                return wanderDistance;
            },
            set: function set(value) {
                wanderDistance = value;
            }
        },
        wanderRadius: {
            get: function get() {
                return wanderRadius;
            },
            set: function set(value) {
                wanderRadius = value;
            }
        },
        wanderRange: {
            get: function get() {
                return wanderRange;
            },
            set: function set(value) {
                wanderRange = value;
            }
        },
        // avoid
        avoidDistance: {
            get: function get() {
                return avoidDistance;
            },
            set: function set(value) {
                avoidDistance = value;
            }
        },
        avoidBuffer: {
            get: function get() {
                return avoidBuffer;
            },
            set: function set(value) {
                avoidBuffer = value;
            }
        },
        // followPath
        pathIndex: {
            get: function get() {
                return pathIndex;
            },
            set: function set(value) {
                pathIndex = value;
            }
        },
        pathThreshold: {
            get: function get() {
                return pathThreshold;
            },
            set: function set(value) {
                pathThreshold = value;
                pathThresholdSq = value * value;
            }
        },
        //  flock
        maxDistance: {
            get: function get() {
                return maxDistance;
            },
            set: function set(value) {
                maxDistance = value;
                maxDistanceSq = value * value;
            }
        },
        minDistance: {
            get: function get() {
                return minDistance;
            },
            set: function set(value) {
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

Boid.vec2 = function (x, y) {
    return Vec2.get(x, y);
};

// for defining obstacles or areas to avoid
Boid.obstacle = function (radius, x, y) {
    return {
        radius: radius,
        position: Vec2.get(x, y)
    };
};

return Boid;

})));
//# sourceMappingURL=boid.js.map
