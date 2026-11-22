// positions are in grid units
//#include "../../kit/src/mpm/common.wgsl"
//#include "particle.wgsl"

struct SimU {
  grid: vec3i,
  n: u32,
  dt: f32,
  stiffness: f32,
  restDensity: f32,
  viscosity: f32,
  mouseR: f32,
  mouseO: vec4f,
  mouseD: vec4f,
  mouseV: vec4f,
  gravity: vec4f,
}

const MASS: f32 = 1.0;
