/* Slider with a rolling number, inspired by Motion's Radix slider example. */
const PlaybackSpeed = (() => {
  const min = .5, max = 2, step = .05;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const format = new Intl.NumberFormat(SiteLanguage.lang === 'en' ? 'en' : 'pt-BR',{maximumFractionDigits:2});
  const limit = value => Math.min(max,Math.max(min,Number(value) || 1));
  const onStep = value => Number((Math.round(limit(value) / step) * step).toFixed(2));
  const label = value => `${format.format(value)}×`;
  const fill = value => `${(value - min) / (max - min) * 100}%`;

  function markup(title,value,id) {
    const speed = onStep(value), text = label(speed);
    return `<label class="playback-speed" style="--playback-fill:${fill(speed)}">
      <span class="playback-speed-label"><span>${esc(title)}</span><span class="playback-speed-number" aria-hidden="true"><span>${text}</span></span></span>
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${speed}" aria-label="${esc(title)}" aria-valuetext="${text}">
    </label>`;
  }

  document.addEventListener('input',event => {
    const input = event.target;
    if (!input.matches('.playback-speed > input')) return;
    const slider = input.parentElement, number = slider.querySelector('.playback-speed-number > span');
    const text = label(input.valueAsNumber);
    const previous = Number(input.getAttribute('aria-valuetext')?.replace('×','').replace(',','.'));
    slider.style.setProperty('--playback-fill',fill(input.valueAsNumber));
    if (input.getAttribute('aria-valuetext') === text) return;
    input.setAttribute('aria-valuetext',text);
    number.textContent = text;
    if (!reducedMotion.matches && number.animate) {
      number.getAnimations().forEach(animation => animation.cancel());
      const shift = input.valueAsNumber > previous ? 55 : -55;
      number.animate([{opacity:.25,transform:`translateY(${shift}%)`},{opacity:1,transform:'none'}],
        {duration:200,easing:'cubic-bezier(.18,.86,.29,1)'});
    }
  });

  return {markup,limit,onStep};
})();
