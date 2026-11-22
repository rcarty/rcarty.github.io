import { startFluid } from './fluid.js';

const hero = document.getElementById('hero');
const fail = e => {
  console.warn('Fluid disabled:', e);
  hero.classList.add('no-gpu');
};

startFluid(document.getElementById('fluid'), { watch: hero, onLost: fail }).catch(fail);
