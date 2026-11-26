(() => {
  const root = document.documentElement;
  const landing = document.currentScript?.hasAttribute('data-landing-hello');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (new URLSearchParams(location.search).get('reader') === '1' || motion.matches) {
    if (landing) delete root.dataset.landingIntro;
    return;
  }

  const hello = `M15 125 C42 96 73 36 65 19 C52 -7 26 49 30 107
    C32 134 43 122 55 99 C73 66 86 75 81 105 C76 137 95 132 118 101
    C140 72 154 76 150 89 C146 102 126 111 116 103 C107 137 142 146 169 105
    C195 66 215 13 201 12 C182 10 166 65 170 108 C174 143 203 129 224 96
    C248 57 262 12 248 12 C229 12 213 68 219 109 C224 143 252 128 273 98
    C290 73 316 75 318 96 C322 122 300 143 283 129 C268 116 280 88 296 85
    C305 84 310 93 316 102 C332 119 351 103 373 85`;
  // The connected lettering and a separate crossbar for the initial f.
  const fablyphone = `M14 123 C36 98 69 36 59 18 C48 -1 29 37 28 75
    C27 111 21 158 10 160 C0 162 13 131 25 116 C43 94 68 78 89 84
    C77 74 64 89 61 108 C56 131 68 136 80 124 C92 111 99 95 102 83
    C98 103 90 127 103 130 C113 132 124 121 135 106
    C154 80 180 20 169 13 C155 5 136 55 133 102
    C131 123 133 138 149 129 C164 120 176 91 166 82 C158 75 149 87 155 96
    C163 106 180 105 196 93 C216 67 239 11 225 12 C208 13 192 66 194 107
    C196 137 216 134 234 106 C241 95 245 86 249 82
    C240 101 231 126 244 130 C257 135 271 108 278 83
    C271 109 265 148 251 166 C239 180 222 172 231 158 C242 141 272 135 296 109
    C306 98 315 87 318 82 C311 103 299 158 298 171
    C303 153 314 105 329 88 C340 75 353 78 352 94 C351 112 337 131 324 129
    C315 126 326 113 337 115 C350 118 361 111 373 97
    C393 72 419 13 406 12 C390 10 370 62 370 102
    C370 113 371 123 371 131 C381 109 394 79 405 79 C420 80 400 118 409 128
    C420 139 435 120 447 101 C458 79 476 74 484 86
    C494 103 476 134 458 130 C439 126 447 93 466 84
    C475 80 481 90 488 98 C498 109 511 96 519 83
    C515 98 510 117 507 130 C517 109 530 81 542 81
    C555 81 536 119 545 128 C555 137 568 119 580 101
    C591 83 607 75 609 85 C612 94 593 108 578 106
    C575 125 585 135 602 129 C615 125 626 112 638 98`;
  const fCrossbar = 'M10 87 C22 82 39 77 53 78';

  const gradients = {
    edge: [['0%','var(--hello-edge-light)'],['45%','var(--hello-edge-dark)'],['72%','var(--hello-edge-light)'],['100%','var(--hello-edge-dark)']],
    body: [['0%','var(--hello-body-light)'],['38%','var(--hello-body-mid)'],['65%','var(--hello-body-dark)'],['100%','var(--hello-body-light)']],
    highlight: [['0%','#fff'],['55%','#ffffff20'],['100%','#ffffffb0']],
  };

  function start() {
    if (landing && !root.hasAttribute('data-landing-intro')) return;
    const overlay = landing ? document.querySelector('.landing-intro') : document.createElement('div');
    if (!overlay) return;
    overlay.classList.add('editor-hello');
    overlay.setAttribute('aria-hidden','true');
    const styles = Object.entries(gradients);
    overlay.innerHTML = `<svg viewBox="${landing?'0 0 652 186':'0 0 390 170'}" aria-hidden="true">
      <defs>${styles.map(([name,stops])=>`<linearGradient id="hello-glass-${name}" x1="0" y1="0" x2="0.35" y2="1">
        ${stops.map(([offset,color])=>`<stop offset="${offset}" style="--glass-color:${color}"/>`).join('')}
      </linearGradient>`).join('')}</defs>
      ${styles.map(([name])=>`<path class="hello-glass-${name}" pathLength="1" d="${landing?fablyphone:hello}"/>`).join('')}
      ${landing?styles.map(([name])=>`<path class="hello-glass-${name} hello-f-crossbar" pathLength="1" d="${fCrossbar}"/>`).join(''):''}
    </svg>`;
    if (!landing) document.body.append(overlay);

    let ending = false;
    const finish = () => {
      if (ending) return;
      ending = true;
      clearTimeout(hold);
      overlay.classList.add('is-leaving');
      if (landing) delete root.dataset.landingIntro;
      setTimeout(()=>overlay.remove(),700);
      document.removeEventListener('keydown',onKey);
      motion.removeEventListener('change',onMotion);
    };
    const onKey = event => { if (event.key==='Escape') finish(); };
    const onMotion = () => { if (motion.matches) finish(); };
    const hold = setTimeout(finish,landing?3000:2550);
    overlay.addEventListener('pointerdown',finish,{once:true});
    document.addEventListener('keydown',onKey);
    motion.addEventListener('change',onMotion);
    if (landing) root.dataset.landingIntro = 'active';
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
