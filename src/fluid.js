// the fluid: MLS-MPM + screen-space fluid rendering. used by the header and the write-up
import {
  initGPU,
  buf,
  bind,
  computePipeline,
  fitCanvas,
  frameLoop,
  loadWGSL,
  mat4,
  lookAt,
  pickDir,
  FluidRenderer,
  createGrid,
  particleGroups,
} from '../kit/src/index.js';

// [debug view, smoothing on]
const VIEWS = {
  final: [0, true],
  depth: [1, false],
  raw: [2, false],
  normals: [2, true],
  thickness: [3, true],
};

// watch is the element whose visibility pauses the loop
export async function startFluid(
  canvas,
  { watch = canvas, small = Math.min(innerWidth, innerHeight) < 700, onLost } = {},
) {
  const { device, context, format } = await initGPU({ canvas });
  if (onLost) device.lost.then(info => onLost(info.message));
  const G = small ? [48, 40, 24] : [80, 40, 36]; // grid cells
  const target = small ? 22000 : 70000; // particles to aim for. the block rounds up a little
  const spacing = 0.6;

  // start as a block on the right so it falls and sloshes
  const bz = G[2] - 8;
  const by = G[1] * 0.62;
  const bx = Math.min(G[0] - 8, (target * spacing ** 3) / (by * bz));
  const pos = [];
  for (let x = G[0] - 4 - bx; x < G[0] - 4; x += spacing)
    for (let y = 3; y < 3 + by; y += spacing)
      for (let z = 4; z < 4 + bz; z += spacing)
        pos.push(x + Math.random() * 0.05, y + Math.random() * 0.05, z + Math.random() * 0.05);
  const N = pos.length / 3;
  const pdata = new Float32Array(N * 20); // 80 bytes per particle
  for (let i = 0; i < N; i++) {
    pdata[i * 20] = pos[i * 3];
    pdata[i * 20 + 1] = pos[i * 3 + 1];
    pdata[i * 20 + 2] = pos[i * 3 + 2];
  }

  const particles = buf(device, pdata.byteLength, GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);
  device.queue.writeBuffer(particles, 0, pdata);
  const grid = createGrid(device, G);
  const simU = buf(device, 112, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);

  const shader = name => loadWGSL(new URL(`./shaders/${name}.wgsl`, import.meta.url));
  const [p2gMass, p2gStress, gridUpdate, g2p, particleStruct] = await Promise.all(
    ['p2g_mass', 'p2g_stress', 'grid', 'g2p', 'particle'].map(shader),
  );
  const passes = [
    [computePipeline(device, p2gMass), [particles, grid.cells, simU], particleGroups(N)],
    [computePipeline(device, p2gStress), [particles, grid.cells, simU], particleGroups(N)],
    [computePipeline(device, gridUpdate), [grid.cells, grid.velocity, simU], grid.groups],
    [computePipeline(device, g2p), [particles, grid.velocity, simU], particleGroups(N)],
  ].map(([pipeline, resources, groups]) => ({
    pipeline,
    bindGroup: bind(device, pipeline, resources),
    groups,
  }));

  const fluid = await FluidRenderer.create(device, { format, particles, particleStruct });

  // fixed camera, tank fills the width
  const S = 10 / G[0]; // grid to world
  const half = [(G[0] * S) / 2, (G[1] * S) / 2, (G[2] * S) / 2];
  const fovy = (30 * Math.PI) / 180;
  // prettier-ignore
  const model = new Float32Array([
    S, 0, 0, 0,
    0, S, 0, 0,
    0, 0, S, 0,
    -half[0], -half[1], -half[2], 1,
  ]);
  function camera(aspect) {
    const dist = half[2] + (half[0] * 1.04) / (Math.tan(fovy / 2) * aspect);
    const cam = lookAt([0, half[1] * 0.55 + dist * 0.06, dist], [0, -half[1] * 0.35, 0]);
    return {
      ...cam,
      aspect,
      dist,
      proj: mat4.perspective(fovy, aspect, 0.1, 100),
      viewModel: mat4.mul(cam.view, model),
    };
  }

  const mouse = { x: 0, y: 0, vx: 0, vy: 0, inside: false };
  addEventListener(
    'pointermove',
    e => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      if (inside && mouse.inside) {
        mouse.vx += x - mouse.x;
        mouse.vy += y - mouse.y;
      }
      mouse.x = x;
      mouse.y = y;
      mouse.inside = inside;
    },
    { passive: true },
  );

  const simAB = new ArrayBuffer(112);
  const simI = new Int32Array(simAB);
  const simF = new Float32Array(simAB);
  const simUi = new Uint32Array(simAB);
  simI[0] = G[0];
  simI[1] = G[1];
  simI[2] = G[2];
  simUi[3] = N;
  simF[4] = 0.2;
  simF[5] = 3.0;
  simF[6] = 4.0;
  simF[7] = 0.1; // dt, stiffness, rest density, viscosity
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let simTime = 0;
  let owed = 0; // sim steps not yet run
  let view = VIEWS.final;

  function frame(now, dt) {
    fitCanvas(canvas, 1.5);
    const W = canvas.width;
    const H = canvas.height;
    fluid.resize(W, H);
    const cam = camera(W / H);
    // 120 steps a second whatever the refresh rate, and no catching up after a slow frame
    owed = Math.min(owed + dt * 120, 4);
    const steps = Math.floor(owed);
    owed -= steps;

    // rock gravity a bit so it never settles. on sim time, because on wall time a slow
    // frame rate brings the rocking close to the tank's own slosh and it builds up
    simTime += steps / 120;
    const tilt = reduce ? 0 : Math.sin(simTime * 0.45) * 0.09;
    const g = 0.3;
    simF[24] = Math.sin(tilt) * g;
    simF[25] = -Math.cos(tilt) * g;
    simF[26] = 0;

    // mouse ray + motion in grid space
    const rect = canvas.getBoundingClientRect();
    const sx = (mouse.x / rect.width) * 2 - 1;
    const sy = 1 - (mouse.y / rect.height) * 2;
    const dir = pickDir(cam, sx, sy, fovy, cam.aspect);
    const pxWorld = (2 * cam.dist * Math.tan(fovy / 2)) / rect.height;
    const k = mouse.inside ? (0.6 * pxWorld) / S : 0;
    let mv = [0, 1, 2].map(i => (cam.r[i] * mouse.vx - cam.up[i] * mouse.vy) * k);
    const ml = Math.hypot(...mv);
    if (ml > 3) mv = mv.map(v => (v * 3) / ml);
    simF[8] = mouse.inside ? 7 : 0;
    simF[12] = cam.eye[0] / S + G[0] / 2;
    simF[13] = cam.eye[1] / S + G[1] / 2;
    simF[14] = cam.eye[2] / S + G[2] / 2;
    simF[16] = dir[0];
    simF[17] = dir[1];
    simF[18] = dir[2];
    simF[20] = mv[0];
    simF[21] = mv[1];
    simF[22] = mv[2];
    mouse.vx *= 0.5;
    mouse.vy *= 0.5;
    device.queue.writeBuffer(simU, 0, simAB);

    fluid.setParams({
      proj: cam.proj,
      view: cam.viewModel,
      radius: 0.62 * S,
      thickness: 0.055,
      light: [-0.35, 0.85, 0.45],
      accent: [0.486, 0.769, 1.0],
      show: view[0],
      depthRange: [cam.dist - half[2] * 1.3, cam.dist + half[2] * 1.3],
    });

    const enc = device.createCommandEncoder();
    for (let s = 0; s < steps; s++) {
      enc.clearBuffer(grid.cells);
      const cp = enc.beginComputePass();
      for (const p of passes) {
        cp.setPipeline(p.pipeline);
        cp.setBindGroup(0, p.bindGroup);
        cp.dispatchWorkgroups(p.groups);
      }
      cp.end();
    }
    fluid.encode(enc, context.getCurrentTexture().createView(), N, view[1]);
    device.queue.submit([enc.finish()]);
  }

  frameLoop(device, watch, frame);
  return {
    show(name) {
      view = VIEWS[name];
    },
  };
}
