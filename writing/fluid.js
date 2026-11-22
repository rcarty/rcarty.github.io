import { startFluid } from '../src/fluid.js';

const figure = document.getElementById('demo');
const buttons = figure.querySelectorAll('[data-view]');
const captions = {
  final: 'The finished image. Move the cursor through it.',
  depth: 'Depth of the nearest sphere at each pixel, before smoothing. Nearer is brighter.',
  raw: 'Normals taken from that raw depth. Every particle is still visible as a sphere.',
  normals: 'Normals after the depth has been smoothed. The spheres have merged into one surface.',
  thickness: 'How much fluid each pixel looks through. Brighter is thicker.',
};

// always the phone-sized sim here, it only fills a small canvas
startFluid(figure.querySelector('canvas'), { small: true, onLost: fail })
  .then(fluid => {
    for (const b of buttons) {
      b.addEventListener('click', () => {
        fluid.show(b.dataset.view);
        for (const o of buttons) o.setAttribute('aria-pressed', o === b);
        document.getElementById('demo-caption').textContent = captions[b.dataset.view];
      });
    }
  })
  .catch(e => {
    console.warn(e);
    fail();
  });

function fail() {
  figure.classList.add('no-gpu');
}
