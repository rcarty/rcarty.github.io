# rcarty.github.io

My portfolio site. The fluid behind the header is a 3D MLS-MPM simulation drawn with screen-space fluid rendering, in WebGPU and WGSL with no third-party libraries.

| Path                           | Contents                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `index.html`                   | The page                                                                                                                                               |
| `src/fluid.js`, `src/shaders/` | The fluid: four solver passes and the frame. `src/hero.js` starts it in the header                                                                     |
| `src/page.js`                  | Lazy video loading and the email button                                                                                                                |
| `writing/`                     | Write-ups. `fluid.html` runs a second copy of the fluid with buttons for each render pass                                                              |
| `media/`                       | Videos and poster images                                                                                                                               |
| `kit/`                         | [rc-webgpu-kit](https://github.com/rcarty/rc-webgpu-kit) as a git submodule: the screen-space fluid renderer, MPM weights and grid, and device helpers |

The two project demos are their own repositories, served by GitHub Pages under this site: [rc-gpu-sort](https://github.com/rcarty/rc-gpu-sort) at `/rc-gpu-sort/` and [rc-gsplat-mpm](https://github.com/rcarty/rc-gsplat-mpm) at `/rc-gsplat-mpm/`.

```sh
git clone --recurse-submodules https://github.com/rcarty/rcarty.github.io
cd rcarty.github.io
python3 -m http.server        # then open http://localhost:8000
```

## Formatting and lint

```sh
npm install
npm run lint      # eslint, then prettier --check
npm run format    # prettier --write
```

The rules come from rc-webgpu-kit (`kit/prettier.config.js`, `kit/eslint.config.js`), so every repository that uses it is formatted the same way.
