const WeatherNavigation = (() => {
  const tr = SiteLanguage.text;
  const pages = [
    ['summary', 'Tempo atual', 'Current weather'],
    ['hourly', 'Previsão por hora', 'Hourly forecast'],
    ['daily', 'Previsão de 10 dias', '10-day forecast']
  ];
  let story, page = 'summary', listing = false;
  const locationIcon = () => I('<path d="M20.7 3.4a.8.8 0 0 0-.9-.2L3.6 9.5a.8.8 0 0 0 .1 1.5l6.7 2.4 2.4 6.8a.8.8 0 0 0 1.5 0l6.5-16a.8.8 0 0 0-.1-.8Z"/>',20,'currentColor','none',0);
  const mapIcon = () => I('<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Zm6-2v14m6-12v14"/>',24,'none','currentColor',1.8);
  const listIcon = () => I('<path d="M8.5 6h11m-11 6h11m-11 6h11"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/>',24,'none','currentColor',1.8);

  function section() {
    if (story !== S) {
      story = S;
      page = 'summary';
      listing = false;
    }
    return listing ? 'locations' : page;
  }

  function change(next, focus) {
    if (cur !== 'wx') return;
    section();
    listing = next === 'locations';
    if (!listing) page = next;
    const hadFocus = $('#app').contains(document.activeElement);
    R();
    $('#app .wxb').scrollTop = 0;
    if (hadFocus) $(focus)?.focus({preventScroll:true});
  }

  function show(next) {
    if (!pages.some(([id]) => id === next)) return;
    change(next, `.wx-pages [data-wx-page="${next}"]`);
  }

  function toggleLocations() {
    const opened = section() === 'locations';
    change(opened ? page : 'locations', opened ? '#wx-locations-button' : '.wx-location-row');
  }

  function openMap(button) {
    if (cur !== 'wx' || !visibleApps().includes('map')) return;
    const city = wxData().city;
    go('map', button, () => {
      if (city === '—') return;
      const name = city.toLocaleLowerCase();
      const point = globePoint(city);
      mSelected = S.places.findIndex(place => place.toLocaleLowerCase() === name);
      mapQuery = city;
      globeOpen = true;
      if (point) {
        [globeLon, globeLat] = point;
        mZoom = 30;
      }
    });
  }

  function locations(data) {
    const h = new Date(nowTs()).getHours();
    return `<section class="wx-location-list" aria-labelledby="wx-location-title">
      <h2 id="wx-location-title">${tr('Localizações', 'Locations')}</h2>
      <button type="button" class="wx-location-row" onclick="WeatherNavigation.show('summary')">
        <span>${locationIcon()}<span><small>${tr('Minha localização', 'My Location')}</small><strong>${esc(data.city)}</strong></span></span>
        <span>${wxIcon(wxCurrentIcon(data.k,h),24)}<b>${data.t}°</b></span>
      </button>
    </section>`;
  }

  function controls() {
    const listOpen = section() === 'locations';
    const pageButtons = pages.map(([id, pt, en]) => {
      const label = tr(pt, en);
      const icon = id === 'summary' ? locationIcon() : '<span class="wx-page-dot" aria-hidden="true"></span>';
      return `<button type="button" data-wx-page="${id}" aria-label="${label}" title="${label}"${page === id ? ' aria-current="page"' : ''} onclick="WeatherNavigation.show('${id}')">${icon}</button>`;
    }).join('');
    return `<div class="wx-bottom">
      <button type="button" class="wx-utility" aria-label="${tr('Abrir mapa', 'Open map')}" onclick="WeatherNavigation.openMap(this)"${visibleApps().includes('map') ? '' : ' disabled'}>${mapIcon()}</button>
      <nav class="wx-pages" aria-label="${tr('Previsões do tempo', 'Weather forecasts')}">${pageButtons}</nav>
      <button type="button" class="wx-utility" id="wx-locations-button" aria-label="${tr('Lista de localizações', 'Location list')}" aria-expanded="${listOpen}" onclick="WeatherNavigation.toggleLocations()">${listIcon()}</button>
    </div>`;
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || cur !== 'wx' || section() !== 'locations') return;
    event.preventDefault();
    toggleLocations();
  });

  return {section,show,toggleLocations,openMap,locations,controls,locationIcon};
})();
