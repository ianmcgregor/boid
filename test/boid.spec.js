// const Boid = window.Boid;
const Boid = require('../dist/boid');
const expect = require('chai').expect;

describe('boid', function() {

    const boid = new Boid();

    it('should have created a boid instance', function() {
        expect(boid).to.be.an('object');
    });

    it('should have methods', function() {
        expect(boid.setBounds).to.be.a('function');
        expect(boid.update).to.be.a('function');
        expect(boid.pursue).to.be.a('function');
        expect(boid.evade).to.be.a('function');
        expect(boid.wander).to.be.a('function');
        expect(boid.avoid).to.be.a('function');
        expect(boid.followPath).to.be.a('function');
        expect(boid.flock).to.be.a('function');
        expect(boid.arrive).to.be.a('function');
        expect(boid.flee).to.be.a('function');
        expect(boid.seek).to.be.a('function');
    });

    it('should have props', function() {
        expect(boid.position).to.be.an('object');
        expect(boid.velocity).to.be.an('object');
        expect(boid.bounds).to.be.an('object');
        // expect(boid.edgeBehaviour).to.be.a('string');
        expect(boid.mass).to.be.a('number');
        expect(boid.maxSpeed).to.be.a('number');
        expect(boid.maxForce).to.be.a('number');
    });

    it('should have static members', function() {
        expect(Boid.vec2).to.be.a('function');
        expect(Boid.obstacle).to.be.a('function');
    });

});
