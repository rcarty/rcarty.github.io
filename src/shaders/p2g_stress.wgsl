// density from grid mass, then pressure (Tait) + viscosity
//#include "sim.wgsl"
//#include "../../kit/src/mpm/cell.wgsl"
@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<storage, read_write> cells: array<Cell>;
@group(0) @binding(2) var<uniform> u: SimU;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= u.n) {
    return;
  }
  let p = particles[id.x];
  let ci = vec3i(floor(p.position));
  var w = weights(p.position - (vec3f(ci) + 0.5));
  var density = 0.0;
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let wt = w[gx].x * w[gy].y * w[gz].z;
        let idx = cellIndex(ci + vec3i(gx - 1, gy - 1, gz - 1), u.grid);
        density += f32(atomicLoad(&cells[idx].m)) / FP * wt;
      }
    }
  }
  let volume = MASS / max(density, 1e-4);
  let pressure = max(0.0, u.stiffness * (pow(density / u.restDensity, 5.0) - 1.0));
  var stress = mat3x3f(-pressure, 0.0, 0.0, 0.0, -pressure, 0.0, 0.0, 0.0, -pressure);
  stress += (p.C + transpose(p.C)) * u.viscosity;
  let term0 = stress * (-volume * 4.0 * u.dt);
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let wt = w[gx].x * w[gy].y * w[gz].z;
        let cx = ci + vec3i(gx - 1, gy - 1, gz - 1);
        let dist = (vec3f(cx) - p.position) + 0.5;
        let mom = (term0 * dist) * wt;
        let idx = cellIndex(cx, u.grid);
        atomicAdd(&cells[idx].vx, i32(mom.x * FP));
        atomicAdd(&cells[idx].vy, i32(mom.y * FP));
        atomicAdd(&cells[idx].vz, i32(mom.z * FP));
      }
    }
  }
}
