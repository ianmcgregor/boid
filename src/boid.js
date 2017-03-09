import Vec2 from './vec2.js';

const PI_D2 = Math.PI / 2;

const defaults = {
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
    Object.keys(defs).forEach((key) => {
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

export default function Boid(options) {
    options = configure(options);

    let boid = null;
    const position = Vec2.get();
    const velocity = Vec2.get();
    const steeringForce = Vec2.get();

    const bounds = options.bounds;
    let edgeBehavior = options.edgeBehavior;
    let mass = options.mass;
    let maxSpeed = options.maxSpeed;
    let maxSpeedSq = maxSpeed * maxSpeed;
    let maxForce = options.maxForce;
    let radius = options.radius;
    // arrive
    let arriveThreshold = options.arriveThreshold;
    let arriveThresholdSq = arriveThreshold * arriveThreshold;
    // wander
    let wanderDistance = options.wanderDistance;
    let wanderRadius = options.wanderRadius;
    let wanderAngle = options.wanderAngle;
    let wanderRange = options.wanderRange;
    // avoid
    let avoidDistance = options.avoidDistance;
    let avoidBuffer = options.avoidBuffer;
    // follow path
    let pathIndex = 0;
    let pathThreshold = options.pathThreshold;
    let pathThresholdSq = pathThreshold * pathThreshold;
    // flock
    let maxDistance = options.maxDistance;
    let maxDistanceSq = maxDistance * maxDistance;
    let minDistance = options.minDistance;
    let minDistanceSq = minDistance * minDistance;

    function setBounds(width, height, x, y) {
        bounds.width = width;
        bounds.height = height;
        bounds.x = x || 0;
        bounds.y = y || 0;

        return boid;
    }

    function bounce() {
        const minX = bounds.x + radius;
        const maxX = bounds.x + bounds.width - radius;
        if (position.x > maxX) {
            position.x = maxX;
            velocity.x *= -1;
        } else if (position.x < minX) {
            position.x = minX;
            velocity.x *= -1;
        }

        const minY = bounds.y + radius;
        const maxY = bounds.y + bounds.height - radius;
        if (position.y > maxY) {
            position.y = maxY;
            velocity.y *= -1;
        } else if (position.y < minY) {
            position.y = minY;
            velocity.y *= -1;
        }
    }

    function wrap() {
        const minX = bounds.x - radius;
        const maxX = bounds.x + bounds.width + radius;
        if (position.x > maxX) {
            position.x = minX;
        } else if (position.x < minX) {
            position.x = maxX;
        }

        const minY = bounds.y - radius;
        const maxY = bounds.y + bounds.height + radius;
        if (position.y > maxY) {
            position.y = minY;
        } else if (position.y < minY) {
            position.y = maxY;
        }
    }

    function seek(targetVec) {
        const desiredVelocity = targetVec.clone().subtract(position);
        desiredVelocity.normalize();
        desiredVelocity.scaleBy(maxSpeed);

        const force = desiredVelocity.subtract(velocity);
        steeringForce.add(force);
        force.dispose();

        return boid;
    }

    function flee(targetVec) {
        const desiredVelocity = targetVec.clone().subtract(position);
        desiredVelocity.normalize();
        desiredVelocity.scaleBy(maxSpeed);

        const force = desiredVelocity.subtract(velocity);
        steeringForce.subtract(force);
        force.dispose();

        return boid;
    }

    // seek until within arriveThreshold
    function arrive(targetVec) {
        const desiredVelocity = targetVec.clone().subtract(position);
        desiredVelocity.normalize();

        const distanceSq = position.distanceSq(targetVec);
        if (distanceSq > arriveThresholdSq) {
            desiredVelocity.scaleBy(maxSpeed);
        } else {
            const scalar = maxSpeed * distanceSq / arriveThresholdSq;
            desiredVelocity.scaleBy(scalar);
        }
        const force = desiredVelocity.subtract(velocity);
        steeringForce.add(force);
        force.dispose();

        return boid;
    }

    // look at velocity of boid and try to predict where it's going
    function pursue(targetBoid) {
        const lookAheadTime = position.distanceSq(targetBoid.position) / maxSpeedSq;

        const scaledVelocity = targetBoid.velocity.clone().scaleBy(lookAheadTime);
        const predictedTarget = targetBoid.position.clone().add(scaledVelocity);

        seek(predictedTarget);

        scaledVelocity.dispose();
        predictedTarget.dispose();

        return boid;
    }

    // look at velocity of boid and try to predict where it's going
    function evade(targetBoid) {
        const lookAheadTime = position.distanceSq(targetBoid.position) / maxSpeedSq;

        const scaledVelocity = targetBoid.velocity.clone().scaleBy(lookAheadTime);
        const predictedTarget = targetBoid.position.clone().add(scaledVelocity);

        flee(predictedTarget);

        scaledVelocity.dispose();
        predictedTarget.dispose();

        return boid;
    }

    // wander around, changing angle by a limited amount each tick
    function wander() {
        const center = velocity.clone().normalize().scaleBy(wanderDistance);

        const offset = Vec2.get();
        offset.set(wanderAngle, wanderRadius);
        // offset.length = wanderRadius;
        // offset.angle = wanderAngle;
        wanderAngle += Math.random() * wanderRange - wanderRange * 0.5;

        const force = center.add(offset);
        steeringForce.add(force);

        offset.dispose();
        force.dispose();

        return boid;
    }

    // gets a bit rough used in combination with seeking as the boid attempts
    // to seek straight through an object while simultaneously trying to avoid it
    function avoid(obstacles) {
        for (let i = 0; i < obstacles.length; i++) {
            const obstacle = obstacles[i];
            const heading = velocity.clone().normalize();

            // vec between obstacle and boid
            const difference = obstacle.position.clone().subtract(position);
            const dotProd = difference.dotProduct(heading);

            // if obstacle in front of boid
            if (dotProd > 0) {
                // vec to represent 'feeler' arm
                const feeler = heading.clone().scaleBy(avoidDistance);
                // project difference onto feeler
                const projection = heading.clone().scaleBy(dotProd);
                // distance from obstacle to feeler
                const vecDistance = projection.subtract(difference);
                const distance = vecDistance.length;
                // if feeler intersects obstacle (plus buffer), and projection
                // less than feeler length, will collide
                if (distance < (obstacle.radius || 0) + avoidBuffer && projection.length < feeler.length) {
                    // calc a force +/- 90 deg from vec to circ
                    const force = heading.clone().scaleBy(maxSpeed);
                    force.angle += difference.sign(velocity) * PI_D2;
                    // scale force by distance (further = smaller force)
                    const dist = projection.length / feeler.length;
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

        const wayPoint = path[pathIndex];
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
        const heading = velocity.clone().normalize();
        const difference = b.position.clone().subtract(position);
        const dotProd = difference.dotProduct(heading);

        heading.dispose();
        difference.dispose();

        return dotProd >= 0;
    }

    // flock - group of boids loosely move together
    function flock(boids) {
        const averageVelocity = velocity.clone();
        const averagePosition = Vec2.get();
        let inSightCount = 0;
        for (let i = 0; i < boids.length; i++) {
            const b = boids[i];
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
        bounds,
        setBounds,
        update,
        pursue,
        evade,
        wander,
        avoid,
        followPath,
        flock,
        arrive,
        seek,
        flee,
        position,
        velocity,
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
        radius: {
            get: function() {
                return radius;
            },
            set: function(value) {
                radius = value;
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
