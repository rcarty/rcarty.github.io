//#include "sim.wgsl"
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<storage, read> gridV: array<vec4f>;
@group(0) @binding(2) var<uniform> u: SimU;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= u.n) {
    return;
  }
  let p = particles[id.x];
  let ci = vec3i(floor(p.position));
  var w = weights(p.position - (vec3f(ci) + 0.5));
  var nv = vec3f(0.0);
  var B = mat3x3f(vec3f(0.0), vec3f(0.0), vec3f(0.0));
  for (var gx = 0; gx < 3; gx++) {
    for (var gy = 0; gy < 3; gy++) {
      for (var gz = 0; gz < 3; gz++) {
        let wt = w[gx].x * w[gy].y * w[gz].z;
        let cx = ci + vec3i(gx - 1, gy - 1, gz - 1);
        let dist = (vec3f(cx) - p.position) + 0.5;
        let gv = gridV[cellIndex(cx, u.grid)].xyz;
        nv += gv * wt;
        B += mat3x3f(gv * dist.x, gv * dist.y, gv * dist.z) * wt;
      }
    }
  }
  // cursor push
  nv += u.mouseV.xyz * rayFalloff(p.position, u.mouseO.xyz, u.mouseD.xyz, u.mouseR);
  let sp = length(nv);
  if (sp > 4.0) {
    nv *= 4.0 / sp;
  }
  let gmax = vec3f(u.grid);
  // side walls stop a cell early. flat against them the stencil only sees wall cells
  // and a hard push pins particles there for good
  let lo = vec3f(2.0, 1.0, 2.0);
  let hi = gmax - 2.0;
  // bounce off the limits. clamping stacks particles on one point and they never separate
  var pos = p.position + nv * u.dt;
  pos = lo + abs(pos - lo);
  pos = hi - abs(hi - pos);
  // soft walls
  let xn = pos + nv * u.dt * 3.0;
  let wmin = vec3f(3.0);
  let wmax = gmax - 4.0;
  nv += 0.3 * (max(wmin - xn, vec3f(0.0)) - max(xn - wmax, vec3f(0.0)));
  particles[id.x].position = pos;
  particles[id.x].v = nv;
  particles[id.x].C = B * 4.0;
}
