(function() {
  'use strict';

  var SERVICE_TYPES = [
    { v: 'ivr', l: 'Zapowiedzi telefoniczne (IVR)', icon: '\u{1F4DE}', needsDuration: false, needsLanguages: true },
    { v: 'radio', l: 'Spot radiowy', icon: '\u{1F4FB}', needsDuration: true },
    { v: 'tv', l: 'Spot telewizyjny', icon: '\u{1F4FA}', needsDuration: true },
    { v: 'social', l: 'Social media', icon: '\u{1F4F1}', needsDuration: true },
    { v: 'elearning', l: 'E-learning / szkolenia', icon: '\u{1F393}', needsDuration: true },
    { v: 'audiobook', l: 'Audiobook / narracja', icon: '\u{1F4D6}', needsDuration: false },
    { v: 'film', l: 'Narracja filmowa / dubbing', icon: '\u{1F3AC}', needsDuration: true },
    { v: 'podcast', l: 'Podcast (intro/outro)', icon: '\u{1F399}\u{FE0F}', needsDuration: true }
  ];

  var INDUSTRIES = [
    { v: 'logistics', l: 'Logistyka / Transport' },
    { v: 'automotive', l: 'Motoryzacja' },
    { v: 'public', l: 'Sektor publiczny' },
    { v: 'hotel', l: 'Hotelarstwo / Turystyka' },
    { v: 'medical', l: 'Medycyna / Zdrowie' },
    { v: 'finance', l: 'Finanse / Ubezpieczenia' },
    { v: 'retail', l: 'Handel / Retail' },
    { v: 'telecom', l: 'Telekomunikacja / IT' },
    { v: 'education', l: 'Edukacja' },
    { v: 'realestate', l: 'Nieruchomości' },
    { v: 'law', l: 'Kancelaria prawna' },
    { v: 'other', l: 'Inna branża' }
  ];

  var LANGUAGES = [
    { v: 'pl', l: 'Polski', flag: '\u{1F1F5}\u{1F1F1}' },
    { v: 'en', l: 'Angielski', flag: '\u{1F1EC}\u{1F1E7}' },
    { v: 'de', l: 'Niemiecki', flag: '\u{1F1E9}\u{1F1EA}' },
    { v: 'fr', l: 'Francuski', flag: '\u{1F1EB}\u{1F1F7}' },
    { v: 'cs', l: 'Czeski', flag: '\u{1F1E8}\u{1F1FF}' },
    { v: 'uk', l: 'Ukraiński', flag: '\u{1F1FA}\u{1F1E6}' }
  ];

  var TONES = [
    { v: 'formal', l: 'Formalny' },
    { v: 'professional', l: 'Profesjonalny' },
    { v: 'friendly', l: 'Przyjazny' },
    { v: 'energetic', l: 'Energiczny' }
  ];

  var AUDIENCES = [
    { v: 'b2b', l: 'Kontrahenci B2B' },
    { v: 'b2c', l: 'Klienci końcowi' },
    { v: 'mixed', l: 'Mieszana grupa' }
  ];

  var GOALS = [
    { v: 'awareness', l: 'Świadomość marki' },
    { v: 'promotion', l: 'Promocja produktu' },
    { v: 'cta', l: 'Wezwanie do działania' },
    { v: 'info', l: 'Informacja' }
  ];

  // State
  var state = {
    step: 'welcome',
    form: {
      serviceType: '', industry: '', duration: '30', languages: [],
      company: '', offering: '', audience: '', tone: '', goal: '',
      textInput: '', targetDur: '30',
      firmName: '', name: '', email: '', phone: '', description: ''
    },
    result: '',
    loading: false,
    error: null,
    toast: null
  };

  var root = null;

  function setState(partial) {
    for (var k in partial) { state[k] = partial[k]; }
    render();
  }

  function setField(key, value) {
    state.form[key] = value;
    render();
  }

  function getService() {
    for (var i = 0; i < SERVICE_TYPES.length; i++) {
      if (SERVICE_TYPES[i].v === state.form.serviceType) return SERVICE_TYPES[i];
    }
    return null;
  }

  function toggleLanguage(lang) {
    var idx = state.form.languages.indexOf(lang);
    if (idx >= 0) {
      state.form.languages.splice(idx, 1);
    } else if (state.form.languages.length < 2) {
      state.form.languages.push(lang);
    }
    render();
  }

  // API calls
  function apiCall(endpoint, body, callback) {
    setState({ loading: true, error: null });
    fetch('/api/kreator/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) {
        callback(data);
      } else {
        setState({ loading: false, error: data.error || 'Wystąpił błąd.' });
      }
    })
    .catch(function() {
      setState({ loading: false, error: 'Błąd połączenia. Sprawdź internet i spróbuj ponownie.' });
    });
  }

  function generate() {
    apiCall('generate', state.form, function(data) {
      state.result = data.text;
      setState({ step: 'preview', loading: false });
    });
  }

  function optimize() {
    apiCall('optimize', state.form, function(data) {
      state.result = data.text;
      setState({ step: 'opt-result', loading: false });
    });
  }

  function submitContact(endpoint, body) {
    setState({ loading: true });
    fetch('/api/contact/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) {
        setState({ step: 'success', loading: false, toast: data.message });
      } else {
        setState({ loading: false, error: data.error });
      }
    })
    .catch(function() {
      setState({ loading: false, error: 'Błąd wysyłania.' });
    });
  }

  function copyText() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(state.result);
      state.toast = 'Skopiowano!';
      render();
      setTimeout(function() { state.toast = null; render(); }, 2000);
    }
  }

  // Render
  function render() {
    if (!root) return;
    var renderers = {
      'welcome': renderWelcome,
      'service-type': renderServiceType,
      'details': renderDetails,
      'preview': renderPreview,
      'optimizer': renderOptimizer,
      'opt-result': renderOptResult,
      'order-form': renderOrderForm,
      'inquiry-form': renderInquiryForm,
      'save-text': renderSaveText,
      'success': renderSuccess
    };
    var fn = renderers[state.step] || renderWelcome;
    root.innerHTML = '<div class="kreator-inner">' + fn() + '</div>' + renderToast();
    bindEvents();
  }

  function renderToast() {
    if (!state.toast) return '';
    return '<div class="kreator-toast">' + esc(state.toast) + '</div>';
  }

  function renderLoading() {
    return '<div class="text-center py-12"><div class="kreator-spinner"></div><p class="text-gray-500 mt-4">Przygotowuję tekst...</p></div>';
  }

  function renderError() {
    if (!state.error) return '';
    return '<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-700 text-sm">' + esc(state.error) + '</div>';
  }

  // STEP: Welcome
  function renderWelcome() {
    return '<div class="grid md:grid-cols-2 gap-6">' +
      '<button data-action="setPath" data-value="creator" class="kreator-card group">' +
        '<div class="text-4xl mb-4">&#x270D;&#xFE0F;</div>' +
        '<h3 class="text-xl font-bold mb-2 group-hover:text-blue-500">Potrzebuję tekstu</h3>' +
        '<p class="text-gray-600 text-sm mb-3">Przygotuj tekst do nagrania od zera</p>' +
        '<span class="text-sm text-blue-500 font-medium">Rozpocznij &rarr;</span>' +
      '</button>' +
      '<button data-action="setPath" data-value="optimizer" class="kreator-card group">' +
        '<div class="text-4xl mb-4">&#x2699;&#xFE0F;</div>' +
        '<h3 class="text-xl font-bold mb-2 group-hover:text-blue-500">Mam tekst</h3>' +
        '<p class="text-gray-600 text-sm mb-3">Zoptymalizuj długość i styl istniejącego tekstu</p>' +
        '<span class="text-sm text-blue-500 font-medium">Zoptymalizuj &rarr;</span>' +
      '</button>' +
    '</div>';
  }

  // STEP: Service type
  function renderServiceType() {
    var html = '<h3 class="text-xl font-bold mb-6">Jaki tekst chcesz przygotować?</h3>';
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-3">';
    for (var i = 0; i < SERVICE_TYPES.length; i++) {
      var s = SERVICE_TYPES[i];
      var active = state.form.serviceType === s.v;
      html += '<button data-action="setService" data-value="' + s.v + '" class="p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ' +
        (active ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-blue-300') + '">' +
        '<div class="text-2xl mb-2">' + s.icon + '</div>' +
        '<div class="font-medium text-sm">' + s.l + '</div>' +
      '</button>';
    }
    html += '</div>';
    html += renderNav('welcome', 'details', !state.form.serviceType);
    return html;
  }

  // STEP: Details
  function renderDetails() {
    if (state.loading) return renderLoading();
    var svc = getService();
    var isIVR = state.form.serviceType === 'ivr';
    var needsDuration = svc && svc.needsDuration;
    var needsLanguages = svc && svc.needsLanguages;

    var html = '<h3 class="text-xl font-bold mb-6">Szczegóły projektu</h3>';
    html += renderError();
    html += '<div class="space-y-5">';

    // Industry
    html += renderSelect('industry', 'Branża', INDUSTRIES);

    // Company
    html += renderInput('company', 'Nazwa firmy', 'np. Fast Trans Logistics');

    // Offering (not for IVR)
    if (!isIVR) {
      html += renderTextarea('offering', 'Oferta / produkt', 'np. Transport międzynarodowy door-to-door');
    }

    // Languages (IVR only)
    if (needsLanguages) {
      html += '<div><label class="block font-semibold mb-2 text-sm">Języki (max 2)</label>';
      html += '<div class="grid grid-cols-3 gap-2">';
      for (var i = 0; i < LANGUAGES.length; i++) {
        var lang = LANGUAGES[i];
        var selected = state.form.languages.indexOf(lang.v) >= 0;
        var disabled = !selected && state.form.languages.length >= 2;
        html += '<button data-action="toggleLang" data-value="' + lang.v + '" ' + (disabled ? 'disabled' : '') +
          ' class="p-3 rounded-lg border-2 text-sm ' +
          (selected ? 'border-blue-500 bg-blue-50' : disabled ? 'border-gray-100 bg-gray-50 opacity-50' : 'border-gray-200 hover:border-blue-300') + '">' +
          lang.flag + ' ' + lang.l + (selected ? ' &#10003;' : '') + '</button>';
      }
      html += '</div></div>';
    }

    // Duration
    if (needsDuration) {
      html += '<div><label class="block font-semibold mb-2 text-sm">Długość nagrania</label>' +
        '<select data-field="duration" class="kreator-select">' +
        '<option value="15"' + sel('duration', '15') + '>15 sekund</option>' +
        '<option value="20"' + sel('duration', '20') + '>20 sekund</option>' +
        '<option value="30"' + sel('duration', '30') + '>30 sekund</option>' +
        '<option value="45"' + sel('duration', '45') + '>45 sekund</option>' +
        '<option value="60"' + sel('duration', '60') + '>60 sekund</option>' +
        '<option value="90"' + sel('duration', '90') + '>90 sekund</option>' +
        '<option value="120"' + sel('duration', '120') + '>2 minuty</option>' +
        '</select></div>';
    }

    // Audience
    html += renderSelect('audience', 'Grupa docelowa', AUDIENCES);

    // Tone
    html += renderSelect('tone', 'Ton komunikacji', TONES);

    // Goal (not for IVR)
    if (!isIVR) {
      html += renderSelect('goal', 'Cel komunikacji', GOALS);
    }

    html += '</div>';

    var canProceed = state.form.industry && state.form.company && state.form.audience && state.form.tone;
    if (needsLanguages) canProceed = canProceed && state.form.languages.length > 0;
    if (!isIVR) canProceed = canProceed && state.form.goal;

    html += '<div class="flex gap-3 mt-8">' +
      '<button data-action="goTo" data-value="service-type" class="kreator-btn-secondary">Wstecz</button>' +
      '<button data-action="generate" ' + (canProceed ? '' : 'disabled') + ' class="kreator-btn-primary flex-1">' +
        '<svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
        'Przygotuj tekst' +
      '</button>' +
    '</div>';

    return html;
  }

  // STEP: Preview
  function renderPreview() {
    var html = '<div class="flex items-center gap-3 mb-6">' +
      '<div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">&#10003;</div>' +
      '<h3 class="text-xl font-bold text-green-700">Tekst gotowy!</h3>' +
    '</div>';

    html += '<div class="bg-gray-50 rounded-xl p-6 mb-6">' +
      '<div class="flex justify-between items-center mb-3">' +
        '<span class="font-semibold text-sm text-gray-700">Twój tekst:</span>' +
        '<button data-action="copy" class="text-blue-500 text-sm font-medium hover:text-blue-600">Kopiuj</button>' +
      '</div>' +
      '<div class="whitespace-pre-wrap text-gray-800 leading-relaxed">' + esc(state.result) + '</div>' +
    '</div>';

    html += '<button data-action="goTo" data-value="details" class="text-blue-500 text-sm font-medium mb-8 block">&larr; Generuj ponownie</button>';

    // 3 CTA levels
    html += '<div class="space-y-3">' +
      '<button data-action="goTo" data-value="order-form" class="kreator-btn-primary w-full py-4 text-center">Zamów nagranie tego tekstu</button>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<button data-action="goTo" data-value="inquiry-form" class="kreator-btn-secondary w-full text-center">Zapytaj o wycenę</button>' +
        '<button data-action="goTo" data-value="save-text" class="kreator-btn-secondary w-full text-center">Zapisz tekst na email</button>' +
      '</div>' +
    '</div>';

    return html;
  }

  // STEP: Optimizer
  function renderOptimizer() {
    if (state.loading) return renderLoading();
    var html = '<h3 class="text-xl font-bold mb-6">Optymalizator tekstu</h3>';
    html += renderError();
    html += '<textarea data-field="textInput" placeholder="Wklej tekst do optymalizacji..." rows="8" class="kreator-textarea">' + esc(state.form.textInput) + '</textarea>';
    html += '<div class="mt-4"><label class="block font-semibold mb-2 text-sm">Docelowy czas nagrania</label>' +
      '<select data-field="targetDur" class="kreator-select">' +
      '<option value="15"' + sel('targetDur', '15') + '>15 sekund</option>' +
      '<option value="30"' + sel('targetDur', '30') + '>30 sekund</option>' +
      '<option value="45"' + sel('targetDur', '45') + '>45 sekund</option>' +
      '<option value="60"' + sel('targetDur', '60') + '>60 sekund</option>' +
      '<option value="90"' + sel('targetDur', '90') + '>90 sekund</option>' +
      '</select></div>';

    html += '<div class="flex gap-3 mt-6">' +
      '<button data-action="goTo" data-value="welcome" class="kreator-btn-secondary">Wstecz</button>' +
      '<button data-action="optimize" ' + (!state.form.textInput.trim() ? 'disabled' : '') + ' class="kreator-btn-primary flex-1">Sprawdź i zoptymalizuj</button>' +
    '</div>';

    return html;
  }

  // STEP: Optimize result
  function renderOptResult() {
    var words = state.form.textInput.trim().split(/\s+/).length;
    var WPM = 130;
    var target = Math.round(WPM * (parseInt(state.form.targetDur) / 60));
    var diff = words - target;
    var pct = Math.abs(Math.round((diff / target) * 100));
    var ok = pct <= 15;

    var html = '<div class="rounded-xl p-6 mb-6 ' + (ok ? 'bg-green-50' : 'bg-orange-50') + '">' +
      '<h3 class="text-lg font-bold mb-4">' + (ok ? '&#10003; Długość OK' : '&#9888;&#65039; ' + (diff > 0 ? 'Za długi' : 'Za krótki')) + '</h3>' +
      '<div class="grid grid-cols-3 gap-4 text-center">' +
        '<div><div class="text-2xl font-bold">' + words + '</div><div class="text-xs text-gray-600">Słów</div></div>' +
        '<div><div class="text-2xl font-bold">' + Math.abs(diff) + '</div><div class="text-xs text-gray-600">Różnica</div></div>' +
        '<div><div class="text-2xl font-bold">' + pct + '%</div><div class="text-xs text-gray-600">Odchylenie</div></div>' +
      '</div>' +
    '</div>';

    if (state.result) {
      html += '<div class="bg-gray-50 rounded-xl p-6 mb-6">' +
        '<div class="flex justify-between items-center mb-3">' +
          '<span class="font-semibold text-sm">Zoptymalizowany tekst:</span>' +
          '<button data-action="copy" class="text-blue-500 text-sm font-medium">Kopiuj</button>' +
        '</div>' +
        '<div class="whitespace-pre-wrap leading-relaxed">' + esc(state.result) + '</div>' +
      '</div>';
    }

    html += '<div class="space-y-3">' +
      '<button data-action="goTo" data-value="order-form" class="kreator-btn-primary w-full py-4">Zamów nagranie</button>' +
      '<div class="grid grid-cols-2 gap-3">' +
        '<button data-action="goTo" data-value="inquiry-form" class="kreator-btn-secondary w-full text-center">Zapytaj o wycenę</button>' +
        '<button data-action="goTo" data-value="save-text" class="kreator-btn-secondary w-full text-center">Zapisz na email</button>' +
      '</div>' +
    '</div>';

    return html;
  }

  // STEP: Order form
  function renderOrderForm() {
    if (state.loading) return renderLoading();
    var html = '<h3 class="text-xl font-bold mb-6">Zamów nagranie</h3>';
    html += renderError();
    html += '<div class="space-y-4">' +
      renderInput('firmName', 'Firma *', 'Nazwa firmy') +
      renderInput('name', 'Imię i nazwisko *', 'Jan Kowalski') +
      '<div class="grid grid-cols-2 gap-4">' +
        renderInput('email', 'Email *', 'jan@firma.pl') +
        renderInput('phone', 'Telefon *', '+48 600 000 000') +
      '</div>' +
    '</div>';

    var canSubmit = state.form.firmName && state.form.name && state.form.email && state.form.phone;
    html += '<div class="flex gap-3 mt-6">' +
      '<button data-action="goTo" data-value="preview" class="kreator-btn-secondary">Wstecz</button>' +
      '<button data-action="submitOrder" ' + (canSubmit ? '' : 'disabled') + ' class="kreator-btn-primary flex-1">Wyślij zamówienie</button>' +
    '</div>';

    return html;
  }

  // STEP: Inquiry form
  function renderInquiryForm() {
    if (state.loading) return renderLoading();
    var html = '<h3 class="text-xl font-bold mb-6">Zapytaj o wycenę</h3>';
    html += '<p class="text-gray-600 text-sm mb-6">Opisz swój projekt — odpowiemy w ciągu 2 godzin.</p>';
    html += renderError();
    html += '<div class="space-y-4">' +
      renderInput('name', 'Imię', 'Jan Kowalski') +
      renderInput('email', 'Email *', 'jan@firma.pl') +
      renderInput('phone', 'Telefon (opcjonalnie)', '+48 600 000 000') +
      renderTextarea('description', 'Opis projektu', 'Opisz czego potrzebujesz...') +
    '</div>';

    html += '<div class="flex gap-3 mt-6">' +
      '<button data-action="goBack" class="kreator-btn-secondary">Wstecz</button>' +
      '<button data-action="submitInquiry" ' + (!state.form.email ? 'disabled' : '') + ' class="kreator-btn-primary flex-1">Wyślij zapytanie</button>' +
    '</div>';

    return html;
  }

  // STEP: Save text (lead magnet)
  function renderSaveText() {
    if (state.loading) return renderLoading();
    var html = '<h3 class="text-xl font-bold mb-4">Zapisz tekst na email</h3>';
    html += '<p class="text-gray-600 text-sm mb-6">Wyślemy Ci przygotowany tekst na podany adres.</p>';
    html += renderError();
    html += renderInput('email', 'Twój email *', 'jan@firma.pl');
    html += '<div class="flex gap-3 mt-6">' +
      '<button data-action="goBack" class="kreator-btn-secondary">Wstecz</button>' +
      '<button data-action="submitSaveText" ' + (!state.form.email ? 'disabled' : '') + ' class="kreator-btn-primary flex-1">Wyślij tekst na email</button>' +
    '</div>';
    return html;
  }

  // STEP: Success
  function renderSuccess() {
    return '<div class="text-center py-8">' +
      '<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-2xl">&#10003;</div>' +
      '<h3 class="text-xl font-bold mb-2">Dziękujemy!</h3>' +
      '<p class="text-gray-600 mb-6">' + esc(state.toast || 'Odpowiemy w ciągu 2 godzin.') + '</p>' +
      '<button data-action="reset" class="kreator-btn-primary">Stwórz kolejny tekst</button>' +
    '</div>';
  }

  // Helpers
  function renderNav(backStep, nextStep, disabled) {
    return '<div class="flex gap-3 mt-8">' +
      '<button data-action="goTo" data-value="' + backStep + '" class="kreator-btn-secondary">Wstecz</button>' +
      '<button data-action="goTo" data-value="' + nextStep + '" ' + (disabled ? 'disabled' : '') + ' class="kreator-btn-primary flex-1">Dalej &rarr;</button>' +
    '</div>';
  }

  function renderSelect(field, label, options) {
    var html = '<div><label class="block font-semibold mb-2 text-sm">' + label + '</label>' +
      '<select data-field="' + field + '" class="kreator-select">' +
      '<option value="">Wybierz...</option>';
    for (var i = 0; i < options.length; i++) {
      html += '<option value="' + options[i].v + '"' + sel(field, options[i].v) + '>' + options[i].l + '</option>';
    }
    html += '</select></div>';
    return html;
  }

  function renderInput(field, label, placeholder) {
    return '<div><label class="block font-semibold mb-2 text-sm">' + label + '</label>' +
      '<input type="text" data-field="' + field + '" placeholder="' + (placeholder || '') + '" value="' + esc(state.form[field] || '') + '" class="kreator-input"></div>';
  }

  function renderTextarea(field, label, placeholder) {
    return '<div><label class="block font-semibold mb-2 text-sm">' + label + '</label>' +
      '<textarea data-field="' + field + '" placeholder="' + (placeholder || '') + '" rows="4" class="kreator-textarea">' + esc(state.form[field] || '') + '</textarea></div>';
  }

  function sel(field, value) {
    return state.form[field] === value ? ' selected' : '';
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // Event handling
  function bindEvents() {
    root.addEventListener('click', handleClick);
    root.addEventListener('change', handleChange);
    root.addEventListener('input', handleInput);
  }

  // Remove old listeners before re-binding
  var bound = false;
  function bindEvents() {
    if (bound) return;
    bound = true;
    root.addEventListener('click', handleClick);
    root.addEventListener('change', handleChange);
    root.addEventListener('input', handleInput);
  }

  function handleClick(e) {
    var btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    var action = btn.dataset.action;
    var value = btn.dataset.value;

    switch (action) {
      case 'setPath':
        if (value === 'creator') setState({ step: 'service-type' });
        else setState({ step: 'optimizer' });
        break;
      case 'setService':
        state.form.serviceType = value;
        state.form.languages = [];
        render();
        break;
      case 'toggleLang':
        toggleLanguage(value);
        break;
      case 'goTo':
        setState({ step: value, error: null });
        break;
      case 'goBack':
        // Smart back — go to preview or opt-result
        if (state.result) {
          setState({ step: state.form.textInput ? 'opt-result' : 'preview', error: null });
        } else {
          setState({ step: 'welcome', error: null });
        }
        break;
      case 'generate':
        generate();
        break;
      case 'optimize':
        optimize();
        break;
      case 'copy':
        copyText();
        break;
      case 'submitOrder':
        submitContact('order', {
          firmName: state.form.firmName,
          name: state.form.name,
          email: state.form.email,
          phone: state.form.phone,
          serviceType: state.form.serviceType,
          industry: state.form.industry,
          generatedText: state.result
        });
        break;
      case 'submitInquiry':
        submitContact('inquiry', {
          name: state.form.name,
          email: state.form.email,
          phone: state.form.phone,
          description: state.form.description,
          serviceType: state.form.serviceType,
          industry: state.form.industry,
          generatedText: state.result
        });
        break;
      case 'submitSaveText':
        submitContact('save-text', {
          email: state.form.email,
          generatedText: state.result,
          serviceType: state.form.serviceType
        });
        break;
      case 'reset':
        state.step = 'welcome';
        state.form = {
          serviceType: '', industry: '', duration: '30', languages: [],
          company: '', offering: '', audience: '', tone: '', goal: '',
          textInput: '', targetDur: '30',
          firmName: '', name: '', email: '', phone: '', description: ''
        };
        state.result = '';
        state.error = null;
        state.toast = null;
        render();
        break;
    }
  }

  function handleChange(e) {
    if (e.target.dataset.field) {
      setField(e.target.dataset.field, e.target.value);
    }
  }

  function handleInput(e) {
    if (e.target.dataset.field && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      state.form[e.target.dataset.field] = e.target.value;
      // Don't re-render on every keystroke — just update state
    }
  }

  // Init
  function init() {
    root = document.getElementById('kreator-root');
    if (!root) return;
    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
