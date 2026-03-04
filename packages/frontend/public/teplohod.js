(function () {
  var CLASS_NAME = 'db-teplohod-widget';
  // В проде сюда будет смотреть widgets.daibilet.ru.
  // Для локальной разработки можно использовать тот же origin.
  var ORIGIN = window.location.origin;
  var PATH = '/widgets/teplohod';

  function pick(el, name, fallback) {
    var v = el.getAttribute('data-' + name);
    return v == null || v === '' ? fallback : v;
  }

  function buildSrc(el) {
    var eventId = pick(el, 'event-id', '');
    if (!eventId) return null;

    var lang = pick(el, 'lang', 'ru');
    var theme = pick(el, 'theme', 'light');
    var layout = pick(el, 'layout', 'compact');

    var params = new URLSearchParams();
    params.set('eventId', eventId);
    params.set('lang', lang);
    params.set('theme', theme);
    params.set('layout', layout);

    return ORIGIN + PATH + '?' + params.toString();
  }

  function mountOne(el) {
    if (el.__dbMounted) return;
    el.__dbMounted = true;

    var src = buildSrc(el);
    if (!src) return;

    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.style.border = '0';
    iframe.style.width = '100%';
    iframe.style.display = 'block';

    var minHeight = pick(el, 'min-height', '260');
    iframe.style.minHeight = minHeight + 'px';

    while (el.firstChild) el.removeChild(el.firstChild);
    el.appendChild(iframe);
  }

  function init() {
    var nodes = document.querySelectorAll('.' + CLASS_NAME);
    for (var i = 0; i < nodes.length; i++) {
      mountOne(nodes[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

