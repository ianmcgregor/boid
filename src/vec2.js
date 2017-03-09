const {acos, atan2, cos, sin, sqrt} = Math;

const pool = [];

export default class Vec2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(vec) {
        this.x = this.x + vec.x;
        this.y = this.y + vec.y;
        return this;
    }

    subtract(vec) {
        this.x = this.x - vec.x;
        this.y = this.y - vec.y;
        return this;
    }

    normalize() {
        const lsq = this.lengthSquared;
        if (lsq === 0) {
            this.x = 1;
            return this;
        }
        if (lsq === 1) {
            return this;
        }
        const l = sqrt(lsq);
        this.x /= l;
        this.y /= l;
        return this;
    }

    isNormalized() {
        return this.lengthSquared === 1;
    }

    truncate(max) {
        // if (this.length > max) {
        if (this.lengthSquared > max * max) {
            this.length = max;
        }
        return this;
    }

    scaleBy(mul) {
        this.x *= mul;
        this.y *= mul;
        return this;
    }

    divideBy(div) {
        this.x /= div;
        this.y /= div;
        return this;
    }

    equals(vec) {
        return this.x === vec.x && this.y === vec.y;
    }

    negate() {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    dotProduct(vec) {
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
    }

    crossProduct(vec) {
        /*
        The sign tells us if vec to the left (-) or the right (+) of this vec
        */
        return this.x * vec.y - this.y * vec.x;
    }

    distanceSq(vec) {
        const dx = vec.x - this.x;
        const dy = vec.y - this.y;
        return dx * dx + dy * dy;
    }

    distance(vec) {
        return sqrt(this.distanceSq(vec));
    }

    clone() {
        return Vec2.get(this.x, this.y);
    }

    reset() {
        this.x = 0;
        this.y = 0;
        return this;
    }

    copy(vec) {
        this.x = vec.x;
        this.y = vec.y;
        return this;
    }

    perpendicular() {
        return Vec2.get(-this.y, this.x);
    }

    sign(vec) {
        // Determines if a given vector is to the right or left of this vector.
        // If to the left, returns -1. If to the right, +1.
        const p = this.perpendicular();
        const s = p.dotProduct(vec) < 0 ? -1 : 1;
        p.dispose();
        return s;
    }

    set(angle, length) {
        this.x = cos(angle) * length;
        this.y = sin(angle) * length;
        return this;
    }

    dispose() {
        this.x = 0;
        this.y = 0;
        pool.push(this);
    }

    get lengthSquared() {
        return this.x * this.x + this.y * this.y;
    }

    get length() {
        return sqrt(this.lengthSquared);
    }

    set length(value) {
        const a = this.angle;
        this.x = cos(a) * value;
        this.y = sin(a) * value;
    }

    get angle() {
        return atan2(this.y, this.x);
    }

    set angle(value) {
        const l = this.length;
        this.x = cos(value) * l;
        this.y = sin(value) * l;
    }

    static get(x, y) {
        const v = pool.length > 0 ? pool.pop() : new Vec2();
        v.x = x || 0;
        v.y = y || 0;
        return v;
    }

    static fill(n) {
        while (pool.length < n) {
            pool.push(new Vec2());
        }
    }

    static angleBetween(a, b) {
        if (!a.isNormalized()) {
            a = a.clone().normalize();
        }
        if (!b.isNormalized()) {
            b = b.clone().normalize();
        }
        return acos(a.dotProduct(b));
    }
}
