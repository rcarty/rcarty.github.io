//#include "sim.wgsl"
@group(0) @binding(0) var<storage, read> cells: array<vec4i>;
@group(0) @binding(1) var<storage, read_write> gridV: array<vec4f>;
@group(0) @binding(2) var<uniform> u: SimU;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  let g = u.grid;
  let total = u32(g.x * g.y * g.z);
  if (id.x >= total) {
    return;
  }
  let c = cells[id.x];
  let mass = f32(c.w) / FP;
  var v = vec3f(0.0);
  if (mass > 0.0) {
    v = vec3f(c.xyz) / FP / mass + u.gravity.xyz * u.dt;
    let i = i32(id.x);
    let x = i % g.x;
    let y = (i / g.x) % g.y;
    let z = i / (g.x * g.y);
    if (x < 2 || x > g.x - 3) {
      v.x = 0.0;
    }
    if (y < 2 || y > g.y - 3) {
      v.y = 0.0;
    }
    if (z < 2 || z > g.z - 3) {
      v.z = 0.0;
    }
  }
  gridV[id.x] = vec4f(v, mass);
}
