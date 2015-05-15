'use strict';

var Boid = require('../src/boid.js');
// var Vec2 = require('../src/vec2.js');

describe('boid', function() {

  var boid = new Boid();

  it ('should have created a boid instance', function() {
    expect(boid).to.be.an('object');
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

    expect(boid.position).to.be.an('object');
    expect(boid.velocity).to.be.an('object');
    expect(boid.edgeBehaviour).to.be.a('string');
    expect(boid.mass).to.be.a('number');
    expect(boid.maxSpeed).to.be.a('number');
    expect(boid.maxForce).to.be.a('number');
  });

  it ('should have static members', function() {
    expect(Boid.vec2).to.be.a('function');
    expect(Boid.Vec2).to.be.a('function');
    expect(Boid.obstacle).to.be.a('function');
  });

});
