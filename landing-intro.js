(() => {
  const root = document.documentElement;
  const intro = document.querySelector('.landing-intro');
  if (!intro || !root.hasAttribute('data-landing-intro')) return;

  // Roboto Flex outlines from the same font used by the landing page.
  const wordmark = [
    'M17.11 90H30.84V43.75L30.82 42.7V34.14Q30.82 29.41 32.8 27.06Q34.79 24.71 38.35 24.71Q39.5 24.71 40.58 24.86Q41.66 25.01 42.61 25.21L43.05 15.02Q41.68 14.63 39.98 14.43Q38.28 14.24 36.44 14.24Q27.98 14.24 22.55 19.14Q17.11 24.05 17.11 33.89ZM10.15 48.58H40.16V38.51H24.27H22.37H10.15Z',
    'M42.92 74.85Q42.92 82.92 48 86.94Q53.08 90.96 60.53 90.96Q66.77 90.96 70.92 88.67Q75.08 86.38 76.58 83.45Q76.75 85.2 77.22 87.04Q77.69 88.87 78.26 90H91.76V89.22Q90.83 87.22 90.27 84.39Q89.71 81.56 89.71 78.43V54.79Q89.71 45.72 84 41.38Q78.3 37.04 68.21 37.04Q58.16 37.04 51.89 41.57Q45.63 46.11 45.63 52.93V53.59H59.2V52.93Q59.21 50.28 61.14 48.42Q63.07 46.56 67.68 46.56Q72.29 46.56 74.12 48.81Q75.96 51.06 75.96 54.68V57.71H65.91Q55.97 57.73 49.44 62.04Q42.92 66.35 42.92 74.85ZM56.72 73.69Q56.72 70.06 59.45 68.09Q62.18 66.13 67.77 66.13H75.96V71.44Q75.96 75.51 72.8 78.5Q69.65 81.48 65.04 81.48Q60.71 81.48 58.72 79.36Q56.72 77.25 56.72 73.69Z',
    'M102.12 90H115.11L115.44 84.14H115.7Q117.35 87.11 121.39 89.04Q125.43 90.98 130.26 90.98Q140.08 90.98 145.88 83.76Q151.69 76.54 151.69 64.99V63.43Q151.69 51.94 145.91 44.72Q140.12 37.49 130.28 37.49Q125.5 37.49 121.87 39.16Q118.24 40.83 115.88 43.83V15.21H102.12ZM115.88 72.96V55.52Q117.02 52.6 119.76 50.3Q122.51 48.01 126.59 48.01Q132.29 48.01 134.95 52.1Q137.61 56.2 137.61 62.76V65.72Q137.61 72.28 134.93 76.39Q132.25 80.5 126.66 80.5Q122.44 80.5 119.74 78.22Q117.03 75.94 115.88 72.96Z',
    'M161.26 90H175.04V15.21H161.26Z',
    'M185.42 110.28Q186.77 110.81 188.38 111.05Q189.99 111.29 192.11 111.29Q198.79 111.29 203.44 107.45Q208.1 103.61 210.86 95.97L231.65 38.51H219.19L209.14 68.91Q208.54 70.8 208.16 72.37Q207.78 73.94 207.44 75.58H207.11Q206.79 73.94 206.42 72.36Q206.06 70.77 205.43 68.91L194.94 38.51H181.07L200.69 89.74L201.23 89.77Q199.29 96.6 196.86 98.73Q194.44 100.85 191.16 100.85Q189.76 100.85 188.26 100.61Q186.76 100.37 185.57 99.98Z',
    'M237.23 110.31H250.99V84.79Q252.9 87.7 256.73 89.34Q260.55 90.98 265.39 90.98Q274.98 90.98 280.88 83.84Q286.78 76.7 286.78 65.01V63.45Q286.78 51.72 280.78 44.6Q274.79 37.49 264.98 37.49Q260.14 37.49 256.22 39.46Q252.29 41.42 250.66 44.38H250.4L250.07 38.51H237.23ZM250.99 73.24V55.08Q252.24 52.26 254.97 50.13Q257.69 48 261.73 48Q267.35 48 270.04 51.9Q272.72 55.8 272.72 62.69V65.82Q272.72 72.71 270.03 76.61Q267.34 80.51 261.78 80.51Q257.87 80.51 255 78.32Q252.13 76.14 250.99 73.24Z',
    'M296.2 90H309.96V55.58Q311.24 52.08 313.72 50.12Q316.21 48.16 319.71 48.16Q323.6 48.16 325.86 50.34Q328.11 52.52 328.11 57.6V90H341.87V56.89Q341.87 46.63 337.22 42.06Q332.57 37.49 325.43 37.49Q319.93 37.49 316.08 39.66Q312.24 41.84 309.93 45.26V15.21H296.2Z',
    'M351 65.01Q351 77.14 358.2 84.3Q365.39 91.46 376.97 91.46Q388.56 91.46 395.75 84.3Q402.95 77.14 402.95 65.01V63.45Q402.95 51.33 395.75 44.17Q388.56 37.02 376.97 37.02Q365.39 37.02 358.2 44.17Q351 51.33 351 63.45ZM365.08 62.65Q365.08 55.4 368.18 51.47Q371.29 47.54 376.97 47.54Q382.64 47.54 385.75 51.47Q388.85 55.4 388.85 62.65V65.81Q388.85 73.08 385.79 77.01Q382.73 80.95 376.97 80.95Q371.22 80.95 368.15 77.01Q365.08 73.08 365.08 65.81Z',
    'M412.38 90H426.14V55.08Q427.54 51.87 430.28 50.01Q433.03 48.16 436.3 48.16Q440.24 48.16 442.37 50.18Q444.49 52.21 444.49 57.15V90H458.25V57.59Q458.25 46.42 453.33 41.94Q448.41 37.47 440.59 37.47Q435.86 37.47 431.95 39.4Q428.05 41.33 425.98 44.35H425.72L425.39 38.51H412.38Z',
    'M467.19 65.01Q467.19 76.97 474.15 84.23Q481.11 91.49 493.45 91.49Q501.23 91.49 506.9 88.4Q512.58 85.32 514.99 80.81L505.36 74.43Q503.46 77.12 500.42 79.16Q497.39 81.2 493.2 81.2Q487.07 81.2 483.98 77Q480.9 72.8 480.9 65.77V62.68Q480.9 55.48 483.78 51.28Q486.66 47.07 492.26 47.07Q497.07 47.07 499.65 50.14Q502.23 53.2 502.21 57.69V58.82H476.45V67.59H515.82V62.59Q515.82 50.6 509.55 43.81Q503.28 37.02 492.23 37.02Q481.22 37.02 474.2 44.27Q467.19 51.52 467.19 63.45Z'
  ];
  const shapes = [
    'M0 -14 14 12H-14Z',
    'M-12 -12H12V12H-12Z',
    'M0 -13A13 13 0 1 1 0 13 13 13 0 1 1 0-13Z'
  ];
  const svg = intro.querySelector('svg');
  const namespace = svg.namespaceURI;
  const sampler = document.createElementNS(namespace, 'path');
  const definitions = document.createElementNS(namespace, 'defs');
  const pointCount = 64;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  definitions.append(sampler);
  svg.append(definitions);

  function sample(path) {
    sampler.setAttribute('d', path);
    const step = sampler.getTotalLength() / pointCount;
    return Array.from({length:pointCount}, (_, i) => sampler.getPointAtLength(i * step));
  }

  function winding(points) {
    return points.reduce((area, point, i) => {
      const next = points[(i + 1) % points.length];
      return area + point.x * next.y - next.x * point.y;
    }, 0);
  }

  function align(shape, contour) {
    const source = winding(shape) * winding(contour) < 0 ? shape.slice().reverse() : shape;
    let best = Infinity, start = 0;
    // Paths can start anywhere on a closed contour. Choose the least twisting match.
    for (let offset = 0; offset < pointCount; offset++) {
      const score = contour.reduce((sum, target, i) => {
        const point = source[(offset + i) % pointCount];
        return sum + (point.x - target.x) ** 2 + (point.y - target.y) ** 2;
      }, 0);
      if (score < best) { best = score; start = offset; }
    }
    return source.slice(start).concat(source.slice(0, start));
  }

  function outline(from, to, progress) {
    return 'M' + from.map((point, i) => {
      const x = point.x + (to[i].x - point.x) * progress;
      const y = point.y + (to[i].y - point.y) * progress;
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join('L') + 'Z';
  }

  function skip(event) {
    if (event.key === 'Escape') reveal();
  }

  function reveal() {
    cancelAnimationFrame(frame);
    removeEventListener('keydown', skip);
    motion.removeEventListener('change', reveal);
    if (root.hasAttribute('data-landing-intro') && !motion.matches) {
      intro.classList.add('is-leaving');
      setTimeout(() => intro.remove(), 300);
    } else intro.remove();
    delete root.dataset.landingIntro;
  }

  if (motion.matches || typeof sampler.getTotalLength !== 'function') {
    reveal();
    return;
  }
  addEventListener('keydown', skip);
  motion.addEventListener('change', reveal);
  const sourceShapes = shapes.map(sample);
  const letters = wordmark.map((finalPath, index) => {
    const element = document.createElementNS(namespace, 'path');
    element.setAttribute('d', finalPath);
    svg.append(element);
    const box = element.getBBox();
    const center = {x:box.x + box.width / 2, y:62};
    const shape = sourceShapes[index % shapes.length].map(point => ({x:point.x + center.x, y:point.y + center.y}));
    const contours = finalPath.match(/M[^M]+/g).map(sample);
    const pairs = contours.map((to, i) => ({
      to,
      from:i ? Array(pointCount).fill(center) : align(shape, to)
    }));
    element.setAttribute('d', outline(shape, shape, 0));
    return {element, finalPath, pairs, progress:-1};
  });
  definitions.remove();

  const pause = 220, stretch = 650, stagger = 74, hold = 390;
  const formedAt = pause + stretch + stagger * (letters.length - 1);
  let started;
  function paint(now) {
    if (!root.hasAttribute('data-landing-intro')) {
      reveal();
      return;
    }
    started ??= now;
    const elapsed = now - started;
    letters.forEach((letter, i) => {
      const progress = Math.min(1, Math.max(0, (elapsed - pause - i * stagger) / stretch));
      if (letter.progress === progress) return;
      letter.progress = progress;
      const eased = progress * progress * (3 - 2 * progress);
      letter.element.setAttribute('d', progress === 1 ? letter.finalPath
        : letter.pairs.map(({from,to}) => outline(from, to, eased)).join(''));
    });
    if (elapsed >= formedAt) intro.classList.add('is-formed');
    if (elapsed >= formedAt + hold) reveal();
    else frame = requestAnimationFrame(paint);
  }
  frame = requestAnimationFrame(paint);
})();
