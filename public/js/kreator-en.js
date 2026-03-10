(function() {
  'use strict';

  var SERVICE_TYPES = [
    { v: 'ivr', l: 'Phone Announcements (IVR)', icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"/></svg>', needsDuration: false, needsLanguages: true },
    { v: 'radio', l: 'Radio Commercial', icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 7.5l16.5-4.125M12 6.75c-2.708 0-5.363.224-7.948.655C2.999 7.58 2.25 8.507 2.25 9.574v9.176A2.25 2.25 0 004.5 21h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169A48.329 48.329 0 0012 6.75zm-1.683 6.443a.75.75 0 10-1.218-.874l-1.35 1.88a.75.75 0 001.218.874l1.35-1.88zm5.683-.874a.75.75 0 10-1.218.874l1.35 1.88a.75.75 0 001.218-.874l-1.35-1.88z"/></svg>', needsDuration: true },
    { v: 'tv', l: 'TV Commercial', icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z"/></svg>', needsDuration: true },
    { v: 'social', l: 'Social media', icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"/></svg>', needsDuration: true },
    { v: 'elearning', l: 'E-learning / Training', icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/></svg>', needsDuration: true },
    { v: 'audiobook', l: 'Audiobook / Narration', icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>', needsDuration: false },
    { v: 'film', l: 'Film Narration / Dubbing', icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25c0 .621.504 1.125 1.125 1.125M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"/></svg>', needsDuration: true },
    { v: 'podcast', l: 'Podcast (intro/outro)', icon: '<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/></svg>', needsDuration: true }
  ];

  var CATEGORIES = [
    { id: 'ivr', label: 'Phone Announcements', icon: SERVICE_TYPES[0].icon, services: ['ivr'] },
    { id: 'spots', label: 'Advertising Spots', icon: SERVICE_TYPES[1].icon, services: ['radio', 'tv', 'social'] },
    { id: 'narration', label: 'Film & Presentation Narration', icon: SERVICE_TYPES[6].icon, services: ['film'] },
    { id: 'podcast', label: 'Podcast (intro/outro)', icon: SERVICE_TYPES[7].icon, services: ['podcast'] }
  ];

  var INDUSTRIES = [
    { v: 'logistics', l: 'Logistics / Transport' },
    { v: 'automotive', l: 'Automotive' },
    { v: 'public', l: 'Public Sector' },
    { v: 'hotel', l: 'Hospitality / Tourism' },
    { v: 'medical', l: 'Healthcare / Medical' },
    { v: 'finance', l: 'Finance / Insurance' },
    { v: 'retail', l: 'Retail / Commerce' },
    { v: 'telecom', l: 'Telecommunications / IT' },
    { v: 'education', l: 'Education' },
    { v: 'realestate', l: 'Real Estate' },
    { v: 'law', l: 'Law Firm' },
    { v: 'other', l: 'Other Industry' }
  ];

  var LANGUAGES = [
    { v: 'en', l: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
    { v: 'de', l: 'German', flag: '\u{1F1E9}\u{1F1EA}' },
    { v: 'fr', l: 'French', flag: '\u{1F1EB}\u{1F1F7}' },
    { v: 'cs', l: 'Czech', flag: '\u{1F1E8}\u{1F1FF}' },
    { v: 'uk', l: 'Ukrainian', flag: '\u{1F1FA}\u{1F1E6}' },
    { v: 'pl', l: 'Polish', flag: '\u{1F1F5}\u{1F1F1}' }
  ];

  var TONES = [
    { v: 'formal', l: 'Formal' },
    { v: 'professional', l: 'Professional' },
    { v: 'friendly', l: 'Friendly' },
    { v: 'energetic', l: 'Energetic' }
  ];

  var AUDIENCES = [
    { v: 'b2b', l: 'B2B Partners' },
    { v: 'b2c', l: 'End Customers' },
    { v: 'mixed', l: 'Mixed Audience' }
  ];

  var GOALS = [
    { v: 'awareness', l: 'Brand Awareness' },
    { v: 'promotion', l: 'Product Promotion' },
    { v: 'cta', l: 'Call to Action' },
    { v: 'info', l: 'Information' }
  ];

  // State
  var state = {
    step: 'welcome',
    form: {
      lang: 'en',
      serviceType: '', industry: '', duration: '30', languages: [],
      company: '', offering: '', audience: '', tone: '', goal: '',
      textInput: '', targetDur: '30',
      firmName: '', name: '', email: '', phone: '', description: ''
    },
    result: '',
    loading: false,
    error: null,
    toast: null,
    _category: null,
    _moreOptions: false,
    _originalText: '',
    _showDiff: false
  };

  var root = null;
  var _historyManaged = false;
  var _skipPopState = false;

  function setState(partial) {
    var oldStep = state.step;
    for (var k in partial) { state[k] = partial[k]; }
    // Push browser history when step changes (so browser back works within kreator)
    if (partial.step && partial.step !== oldStep && !partial.loading) {
      pushHistory(partial.step);
    }
    render();
  }

  function pushHistory(step) {
    if (!_historyManaged) return;
    try {
      history.pushState({ kreatorStep: step }, '', window.location.pathname + window.location.search + '#kreator');
    } catch(e) {}
  }

  function initHistory() {
    _historyManaged = true;
    // Replace current state — keep current URL without forcing #kreator
    try {
      history.replaceState({ kreatorStep: state.step }, '', window.location.pathname + window.location.search + (window.location.hash || ''));
    } catch(e) {}
    window.addEventListener('popstate', function(e) {
      if (_skipPopState) { _skipPopState = false; return; }
      if (e.state && e.state.kreatorStep) {
        // Navigate to the step from history without pushing new history
        _historyManaged = false;
        setState({ step: e.state.kreatorStep, error: null });
        _historyManaged = true;
        scrollToKreator();
      }
    });
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

  // Turnstile — get verification token before API call
  function getTurnstileToken() {
    return new Promise(function(resolve) {
      var siteKey = window.__TURNSTILE_SITE_KEY;
      if (!siteKey || typeof turnstile === 'undefined') {
        resolve(''); // no Turnstile configured — skip
        return;
      }
      // Remove previous widget if exists
      var container = document.getElementById('turnstile-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'turnstile-container';
        container.style.position = 'fixed';
        container.style.bottom = '-200px';
        container.style.left = '0';
        container.style.overflow = 'hidden';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);
      }
      container.innerHTML = '';
      turnstile.render(container, {
        sitekey: siteKey,
        callback: function(token) { resolve(token); },
        'error-callback': function() { resolve(''); },
        'expired-callback': function() { resolve(''); },
        size: 'compact'
      });
    });
  }

  // API calls (with Turnstile protection)
  function apiCall(endpoint, body, callback) {
    setState({ loading: true, error: null });
    getTurnstileToken().then(function(token) {
      var payload = Object.assign({}, body);
      if (token) payload.turnstileToken = token;
      return fetch('/api/kreator/' + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.ok) {
        callback(data);
      } else {
        setState({ loading: false, error: data.error || 'An error occurred.' });
      }
    })
    .catch(function() {
      setState({ loading: false, error: 'Connection error. Please check your internet and try again.' });
    });
  }

  function generate() {
    apiCall('generate', state.form, function(data) {
      state.result = data.text;
      if (window.trackEvent) trackEvent('kreator_generate', { service_type: state.form.serviceType, industry: state.form.industry });
      // If coming from lektor page, save text to context and redirect back
      if (state._returnUrl) {
        try {
          var ctx = JSON.parse(sessionStorage.getItem('kreatorContext') || '{}');
          ctx.text = data.text;
          ctx.serviceType = state.form.serviceType;
          ctx.industry = state.form.industry;
          sessionStorage.setItem('kreatorContext', JSON.stringify(ctx));
        } catch(e) {}
        window.location.href = state._returnUrl;
        return;
      }
      setState({ step: 'preview', loading: false });
      scrollToKreator();
    });
  }

  function optimize() {
    apiCall('optimize', state.form, function(data) {
      state.result = data.text;
      if (window.trackEvent) trackEvent('kreator_optimize', { service_type: state.form.serviceType });
      // If coming from lektor page, save text to context and redirect back
      if (state._returnUrl) {
        try {
          var ctx = JSON.parse(sessionStorage.getItem('kreatorContext') || '{}');
          ctx.text = data.text;
          sessionStorage.setItem('kreatorContext', JSON.stringify(ctx));
        } catch(e) {}
        window.location.href = state._returnUrl;
        return;
      }
      // _showDiff is set by requestOptimize action before calling optimize()
      setState({ step: 'opt-result', loading: false });
      scrollToKreator();
    });
  }

  function scrollToKreator() {
    setTimeout(function() {
      var el = document.getElementById('kreator');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function submitContact(endpoint, body) {
    setState({ loading: true });
    if (window.trackEvent) trackEvent('form_submit_' + endpoint.replace(/-/g, '_'), { source: 'kreator' });
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
      setState({ loading: false, error: 'Sending failed.' });
    });
  }

  function copyText() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(state.result);
      state.toast = 'Copied!';
      render();
      setTimeout(function() { state.toast = null; render(); }, 2000);
    }
  }

  // Render
  var _frozenHeight = 0;

  function render() {
    if (!root) return;

    // Przy wejściu w loading — zamroź wysokość kontenera (formularz ~500px)
    if (state.loading && _frozenHeight === 0) {
      _frozenHeight = root.offsetHeight;
    }
    if (_frozenHeight > 0) {
      root.style.minHeight = _frozenHeight + 'px';
    }

    var renderers = {
      'welcome': renderWelcome,
      'service-type': renderServiceType,
      'sub-service': renderSubService,
      'details': renderDetails,
      'preview': renderPreview,
      'optimizer': renderOptimizer,
      'opt-check': renderOptCheck,
      'opt-result': renderOptResult,
      'order-form': renderOrderForm,
      'inquiry-form': renderInquiryForm,
      'save-text': renderSaveText,
      'success': renderSuccess
    };
    var fn = renderers[state.step] || renderWelcome;
    root.innerHTML = '<div class="kreator-inner">' + fn() + '</div>' + renderToast();
    bindEvents();

    // Podczas loading — scroll do kreator żeby user widział spinner (nie czarne tło)
    if (state.loading) {
      var kreatorEl = document.getElementById('kreator');
      if (kreatorEl) kreatorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Zwolnij frozen height dopiero gdy loading się skończy
    if (!state.loading && _frozenHeight > 0) {
      _frozenHeight = 0;
      root.style.minHeight = '';
    }
    // Wyczyść timer loadingu
    if (!state.loading && _loadingTimer) {
      clearTimeout(_loadingTimer);
      _loadingTimer = null;
    }
  }

  function renderToast() {
    if (!state.toast) return '';
    return '<div class="kreator-toast">' + esc(state.toast) + '</div>';
  }

  var _loadingTimer = null;

  function renderLoading() {
    // Start timer to update message after 6s
    if (!_loadingTimer) {
      _loadingTimer = setTimeout(function() {
        _loadingTimer = null;
        var sub = document.querySelector('[data-loading-sub]');
        if (sub) sub.textContent = 'Generation is taking longer than usual — please wait...';
      }, 6000);
    }
    return '<div class="flex flex-col items-center justify-center py-20">' +
      '<div class="kreator-spinner mb-4"></div>' +
      '<p class="text-gray-700 text-lg font-medium">Preparing your script</p>' +
      '<p data-loading-sub class="text-gray-500 text-sm mt-2">This will take a few seconds...</p>' +
    '</div>';
  }

  function renderError() {
    if (!state.error) return '';
    return '<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 text-red-600 text-sm">' + esc(state.error) + '</div>';
  }

  // STEP: Welcome
  function renderWelcome() {
    return '<div class="grid md:grid-cols-2 gap-6">' +
      '<button data-action="setPath" data-value="creator" class="kreator-card group">' +
        '<div class="mb-4 text-gray-400 group-hover:text-accent transition-colors"><svg class="w-10 h-10 mx-auto" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg></div>' +
        '<h3 class="text-xl font-bold mb-2 group-hover:text-accent">I need a new script</h3>' +
        '<p class="text-gray-400 text-sm mb-3">Provide the details and we will prepare a recording-ready script in seconds</p>' +
        '<span class="text-sm text-accent font-medium">Get started &rarr;</span>' +
      '</button>' +
      '<button data-action="setPath" data-value="optimizer" class="kreator-card group">' +
        '<div class="mb-4 text-gray-400 group-hover:text-accent transition-colors"><svg class="w-10 h-10 mx-auto" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/></svg></div>' +
        '<h3 class="text-xl font-bold mb-2 group-hover:text-accent">I have a script, I want to check it</h3>' +
        '<p class="text-gray-400 text-sm mb-3">Optimize the length and style of your existing text</p>' +
        '<span class="text-sm text-accent font-medium">Optimize &rarr;</span>' +
      '</button>' +
    '</div>';
  }

  // STEP: Service type — 4 category tiles
  function renderServiceType() {
    var html = '<h3 class="text-xl font-bold mb-6">What script do you need?</h3>';
    html += '<div class="grid grid-cols-2 gap-4">';
    for (var i = 0; i < CATEGORIES.length; i++) {
      var c = CATEGORIES[i];
      html += '<button data-action="setCategory" data-value="' + c.id + '" class="p-6 rounded-xl border-2 text-left transition-all hover:shadow-md border-gray-200 hover:border-accent/50 hover:bg-accent/10">' +
        '<div class="text-gray-400 mb-3">' + c.icon + '</div>' +
        '<div class="font-semibold">' + c.label + '</div>' +
      '</button>';
    }
    html += '</div>';
    html += '<div class="mt-8"><button data-action="goTo" data-value="welcome" class="kreator-btn-secondary">Back</button></div>';
    return html;
  }

  // STEP: Sub-service — spot type selection
  function renderSubService() {
    var cat = null;
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].id === state._category) { cat = CATEGORIES[i]; break; }
    }
    if (!cat) return renderServiceType();

    var html = '<h3 class="text-xl font-bold mb-6">' + cat.label + ' &mdash; choose type</h3>';
    html += '<div class="grid grid-cols-1 md:grid-cols-' + cat.services.length + ' gap-3">';
    for (var j = 0; j < cat.services.length; j++) {
      var svc = null;
      for (var k = 0; k < SERVICE_TYPES.length; k++) {
        if (SERVICE_TYPES[k].v === cat.services[j]) { svc = SERVICE_TYPES[k]; break; }
      }
      if (!svc) continue;
      html += '<button data-action="setService" data-value="' + svc.v + '" class="p-5 rounded-xl border-2 text-left transition-all hover:shadow-md border-gray-200 hover:border-accent/50 hover:bg-accent/10">' +
        '<div class="text-gray-400 mb-2">' + svc.icon + '</div>' +
        '<div class="font-semibold text-sm">' + svc.l + '</div>' +
      '</button>';
    }
    html += '</div>';
    html += '<div class="mt-8"><button data-action="goTo" data-value="service-type" class="kreator-btn-secondary">Back</button></div>';
    return html;
  }

  // STEP: Details — simplified form with "More options" section
  function renderDetails() {
    if (state.loading) return renderLoading();
    var svc = getService();
    var isIVR = state.form.serviceType === 'ivr';
    var needsDuration = svc && svc.needsDuration;
    var needsLanguages = svc && svc.needsLanguages;

    var html = '<h3 class="text-xl font-bold mb-6">Project Details</h3>';
    html += renderError();
    html += '<div class="space-y-5">';

    // Main fields — always visible
    html += renderSelect('industry', 'Industry', INDUSTRIES);
    html += renderInput('company', 'Company Name', 'e.g. Fast Trans Logistics');
    if (!isIVR) {
      html += renderTextarea('offering', 'Product / Service', 'e.g. International door-to-door transport');
    }

    // Duration (if applicable)
    if (needsDuration) {
      html += '<div><label class="block font-semibold mb-2 text-sm">Recording Length</label>' +
        '<select data-field="duration" class="kreator-select">' +
        '<option value="15"' + sel('duration', '15') + '>15 seconds</option>' +
        '<option value="20"' + sel('duration', '20') + '>20 seconds</option>' +
        '<option value="30"' + sel('duration', '30') + '>30 seconds</option>' +
        '<option value="45"' + sel('duration', '45') + '>45 seconds</option>' +
        '<option value="60"' + sel('duration', '60') + '>60 seconds</option>' +
        '<option value="90"' + sel('duration', '90') + '>90 seconds</option>' +
        '<option value="120"' + sel('duration', '120') + '>2 minutes</option>' +
        '</select></div>';
    }

    // Languages (IVR only)
    if (needsLanguages) {
      html += '<div><label class="block font-semibold mb-2 text-sm">Languages (max 2)</label>';
      html += '<div class="grid grid-cols-3 gap-2">';
      for (var i = 0; i < LANGUAGES.length; i++) {
        var lang = LANGUAGES[i];
        var selected = state.form.languages.indexOf(lang.v) >= 0;
        var disabled = !selected && state.form.languages.length >= 2;
        html += '<button data-action="toggleLang" data-value="' + lang.v + '" ' + (disabled ? 'disabled' : '') +
          ' class="p-3 rounded-lg border-2 text-sm ' +
          (selected ? 'border-accent bg-accent/10' : disabled ? 'border-gray-200 bg-gray-100 opacity-50' : 'border-gray-200 hover:border-accent/50') + '">' +
          lang.flag + ' ' + lang.l + (selected ? ' &#10003;' : '') + '</button>';
      }
      html += '</div></div>';
    }

    html += '</div>';

    // "More options" — collapsed section
    if (!isIVR) {
      var moreOpen = state._moreOptions;
      html += '<div class="mt-4">' +
        '<button data-action="toggleMore" class="text-sm text-gray-400 hover:text-accent flex items-center gap-1 transition-colors">' +
          '<svg class="w-4 h-4 transition-transform ' + (moreOpen ? 'rotate-90' : '') + '" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>' +
          'More options' +
        '</button>';
      if (moreOpen) {
        html += '<div class="space-y-5 mt-4 pl-2 border-l-2 border-gray-200">' +
          renderSelect('tone', 'Communication Tone', TONES) +
          renderSelect('audience', 'Target Audience', AUDIENCES) +
          renderSelect('goal', 'Communication Goal', GOALS) +
        '</div>';
      }
      html += '</div>';
    }

    // Validation — simplified: only industry, company, tone required
    var canProceed = state.form.industry && state.form.company;
    if (needsLanguages) canProceed = canProceed && state.form.languages.length > 0;

    html += '<div class="flex gap-3 mt-8">' +
      '<button data-action="goTo" data-value="' + (state._category && CATEGORIES.some(function(c) { return c.id === state._category && c.services.length > 1; }) ? 'sub-service' : 'service-type') + '" class="kreator-btn-secondary">Back</button>' +
      '<button data-action="generate" ' + (canProceed ? '' : 'disabled') + ' class="kreator-btn-primary flex-1">' +
        '<svg class="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>' +
        'Generate Script' +
      '</button>' +
    '</div>';

    return html;
  }

  // STEP: Preview
  function renderPreview() {
    var html = '<div class="flex items-center gap-3 mb-6">' +
      '<div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">&#10003;</div>' +
      '<h3 class="text-xl font-bold text-green-600">Script ready!</h3>' +
    '</div>';

    html += '<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">' +
      '<div class="flex justify-between items-center mb-3">' +
        '<span class="font-semibold text-sm text-gray-700">Your script <span class="text-gray-400 font-normal">(you can edit)</span>:</span>' +
        '<button data-action="copy" class="text-accent text-sm font-medium hover:text-accent-light">Copy</button>' +
      '</div>' +
      '<textarea data-result-edit class="kreator-textarea text-gray-700 leading-relaxed" rows="10">' + esc(state.result) + '</textarea>' +
    '</div>';

    html += '<button data-action="goTo" data-value="details" class="text-accent text-sm font-medium mb-6 block">&larr; Regenerate</button>';

    // PRIMARY CTA — Wybierz lektora
    html += '<div class="p-4 bg-gradient-to-r from-green-50 to-green-50/50 rounded-xl border border-green-200">' +
      '<p class="text-sm text-gray-500 mb-3 text-center">Now choose the perfect voice for your script</p>' +
      '<button data-action="selectVoice" class="kreator-btn-primary w-full py-4 text-center flex items-center justify-center gap-2">' +
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>' +
        'Choose a Voice Artist' +
      '</button>' +
    '</div>';

    // Lead magnet link
    html += '<div class="text-center mt-4">' +
      '<button data-action="goTo" data-value="save-text" class="text-gray-500 hover:text-accent text-sm transition-colors">or save the script to your email</button>' +
    '</div>';

    return html;
  }

  // Strip IVR section labels / formatting before counting speakable words
  function countSpeakableWords(text) {
    var cleaned = text
      .replace(/\[JĘZYK\s+\d+\s*[—–-]\s*[^\]]*\]/gi, '')  // [JĘZYK 1 — polskim]
      .replace(/^[ \t]*(Powitanie|Menu|Zakończenie|Komunikat[^:\n]*|Informacja[^:\n]*|Oczekiwanie[^:\n]*):/gmi, '') // Section labels
      .replace(/^[ \t]*\d+\.\s*/gm, '')  // Numbered list markers: "1. "
      .trim();
    var words = cleaned.split(/\s+/).filter(function(w) { return w.length > 0; });
    return words.length;
  }

  // Word-level diff using LCS algorithm
  function diffTexts(original, optimized) {
    var wordsA = original.trim().split(/\s+/);
    var wordsB = optimized.trim().split(/\s+/);
    var m = wordsA.length, n = wordsB.length;

    // Build LCS table
    var dp = [];
    for (var i = 0; i <= m; i++) {
      dp[i] = [];
      for (var j = 0; j <= n; j++) {
        if (i === 0 || j === 0) { dp[i][j] = 0; }
        else if (wordsA[i-1] === wordsB[j-1]) { dp[i][j] = dp[i-1][j-1] + 1; }
        else { dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]); }
      }
    }

    // Backtrack to build diff
    var result = [];
    var ii = m, jj = n;
    while (ii > 0 || jj > 0) {
      if (ii > 0 && jj > 0 && wordsA[ii-1] === wordsB[jj-1]) {
        result.unshift({ type: 'same', word: wordsA[ii-1] });
        ii--; jj--;
      } else if (jj > 0 && (ii === 0 || dp[ii][jj-1] >= dp[ii-1][jj])) {
        result.unshift({ type: 'add', word: wordsB[jj-1] });
        jj--;
      } else {
        result.unshift({ type: 'del', word: wordsA[ii-1] });
        ii--;
      }
    }

    // Render HTML
    var html = '';
    for (var k = 0; k < result.length; k++) {
      var r = result[k];
      if (r.type === 'del') {
        html += '<span class="text-red-500 line-through">' + esc(r.word) + '</span> ';
      } else if (r.type === 'add') {
        html += '<span class="text-green-600 font-medium">' + esc(r.word) + '</span> ';
      } else {
        html += esc(r.word) + ' ';
      }
    }
    return html;
  }

  // STEP: Opt-check (local analysis before API call)
  function renderOptCheck() {
    if (state.loading) return renderLoading();

    var words = countSpeakableWords(state.form.textInput);
    var slowTypes = ['ivr', 'elearning', 'audiobook', 'film'];
    var WPM = (state.form.serviceType && slowTypes.indexOf(state.form.serviceType) !== -1) ? 130 : 165;
    var target = Math.round(WPM * (parseInt(state.form.targetDur) / 60));
    var diff = words - target;
    var pct = Math.abs(Math.round((diff / target) * 100));
    var ok = pct <= 15;

    var html = '<div class="rounded-xl p-6 mb-6 ' + (ok ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200') + '">' +
      '<h3 class="text-lg font-bold mb-4">' + (ok ? '&#10003; Length OK' : '&#9888;&#65039; ' + (diff > 0 ? 'Too long' : 'Too short')) + '</h3>' +
      '<div class="grid grid-cols-3 gap-4 text-center">' +
        '<div><div class="text-2xl font-bold">' + words + '</div><div class="text-xs text-gray-400">Words in text</div></div>' +
        '<div><div class="text-2xl font-bold">' + target + '</div><div class="text-xs text-gray-400">Target for ' + state.form.targetDur + 's</div></div>' +
        '<div><div class="text-2xl font-bold">' + pct + '%</div><div class="text-xs text-gray-400">Deviation</div></div>' +
      '</div>' +
    '</div>';

    if (ok) {
      html += '<div class="bg-white rounded-xl border border-gray-200 p-5 mb-6 text-center">' +
        '<p class="text-gray-600 mb-4">Your text has the right length. Would you like to see an alternative suggestion?</p>' +
        '<div class="flex gap-3 justify-center">' +
          '<button data-action="requestOptimize" class="kreator-btn-secondary">Yes, show suggestion</button>' +
          '<button data-action="skipOptimize" class="kreator-btn-primary">No, continue</button>' +
        '</div>' +
      '</div>';
    } else {
      html += '<div class="bg-white rounded-xl border border-gray-200 p-5 mb-6 text-center">' +
        '<p class="text-gray-600 mb-4">Text is ' + (diff > 0 ? 'too long' : 'too short') + ' by ' + Math.abs(diff) + ' words. Optimize to ' + state.form.targetDur + ' seconds?</p>' +
        '<div class="flex gap-3 justify-center">' +
          '<button data-action="requestOptimize" class="kreator-btn-primary flex-1">Yes, optimize</button>' +
          '<button data-action="skipOptimize" class="kreator-btn-secondary">Leave as is</button>' +
        '</div>' +
      '</div>';
    }

    html += '<div class="mt-4">' +
      '<button data-action="goTo" data-value="optimizer" class="text-gray-400 hover:text-accent text-sm transition-colors">&larr; Back to text editing</button>' +
    '</div>';

    return html;
  }

  // STEP: Optimizer
  function renderOptimizer() {
    if (state.loading) return renderLoading();
    var html = '<h3 class="text-xl font-bold mb-6">Text Optimizer</h3>';
    html += renderError();
    html += '<textarea data-field="textInput" placeholder="Paste your text to optimize..." rows="8" class="kreator-textarea">' + esc(state.form.textInput) + '</textarea>';
    html += '<div class="mt-4"><label class="block font-semibold mb-2 text-sm">Target Recording Duration</label>' +
      '<select data-field="targetDur" class="kreator-select">' +
      '<option value="15"' + sel('targetDur', '15') + '>15 seconds</option>' +
      '<option value="30"' + sel('targetDur', '30') + '>30 seconds</option>' +
      '<option value="45"' + sel('targetDur', '45') + '>45 seconds</option>' +
      '<option value="60"' + sel('targetDur', '60') + '>60 seconds</option>' +
      '<option value="90"' + sel('targetDur', '90') + '>90 seconds</option>' +
      '</select></div>';

    html += '<div class="flex gap-3 mt-6">' +
      '<button data-action="goTo" data-value="welcome" class="kreator-btn-secondary">Back</button>' +
      '<button data-action="checkText" ' + (!state.form.textInput.trim() ? 'disabled' : '') + ' class="kreator-btn-primary flex-1">Check Text</button>' +
    '</div>';

    return html;
  }

  // STEP: Optimize result — with diff view or plain textarea
  function renderOptResult() {
    var resultText = state.result || state.form.textInput;
    var resultWords = countSpeakableWords(resultText);
    var slowTypes = ['ivr', 'elearning', 'audiobook', 'film'];
    var WPM = (state.form.serviceType && slowTypes.indexOf(state.form.serviceType) !== -1) ? 130 : 165;
    var target = Math.round(WPM * (parseInt(state.form.targetDur) / 60));
    var diff = resultWords - target;
    var pct = Math.abs(Math.round((diff / target) * 100));
    var ok = pct <= 15;

    var html = '';

    // Show diff view if we have optimized text and haven't accepted yet
    if (state._showDiff && state._originalText && state.result) {
      var optWords = countSpeakableWords(state.result);
      html += '<div class="rounded-xl p-6 mb-6 bg-green-50 border border-green-200">' +
        '<h3 class="text-lg font-bold mb-2">Optimization Suggestion</h3>' +
        '<p class="text-sm text-gray-500 mb-4">' + optWords + ' words (target: ' + target + ' for ' + state.form.targetDur + 's)</p>' +
      '</div>';

      // Diff view
      html += '<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-4">' +
        '<div class="mb-3 flex items-center gap-4">' +
          '<span class="text-sm"><span class="text-red-500 line-through">removed</span></span>' +
          '<span class="text-sm"><span class="text-green-600 font-medium">added</span></span>' +
        '</div>' +
        '<div class="leading-relaxed text-gray-700">' + diffTexts(state._originalText, state.result) + '</div>' +
      '</div>';

      html += '<div class="flex gap-3 mb-6">' +
        '<button data-action="goTo" data-value="opt-check" class="kreator-btn-secondary">Back</button>' +
        '<button data-action="acceptOptimized" class="kreator-btn-primary flex-1">Accept suggestion</button>' +
      '</div>';

      return html;
    }

    // Standard view — editable textarea (after accepting or when no diff)
    html += '<div class="rounded-xl p-6 mb-6 ' + (ok ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200') + '">' +
      '<h3 class="text-lg font-bold mb-2">' + (ok ? '&#10003; Script ready' : '&#9888;&#65039; Note: ' + (diff > 0 ? 'too long' : 'too short') + ' by ' + Math.abs(diff) + ' words') + '</h3>' +
      '<p class="text-sm text-gray-500">' + resultWords + ' words (target: ' + target + ' for ' + state.form.targetDur + 's)</p>' +
    '</div>';

    html += '<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">' +
      '<div class="flex justify-between items-center mb-3">' +
        '<span class="font-semibold text-sm">Your script <span class="text-gray-500 font-normal">(you can edit)</span>:</span>' +
        '<button data-action="copy" class="text-accent text-sm font-medium">Copy</button>' +
      '</div>' +
      '<textarea data-result-edit class="kreator-textarea leading-relaxed" rows="10">' + esc(resultText) + '</textarea>' +
    '</div>';

    // PRIMARY CTA — Wybierz lektora
    html += '<div class="p-4 bg-gradient-to-r from-green-50 to-green-50/50 rounded-xl border border-green-200">' +
      '<p class="text-sm text-gray-500 mb-3 text-center">Now choose the perfect voice for your script</p>' +
      '<button data-action="selectVoice" class="kreator-btn-primary w-full py-4 text-center flex items-center justify-center gap-2">' +
        '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>' +
        'Choose a Voice Artist' +
      '</button>' +
    '</div>';

    html += '<div class="text-center mt-4">' +
      '<button data-action="goTo" data-value="save-text" class="text-gray-500 hover:text-accent text-sm transition-colors">or save the script to your email</button>' +
    '</div>';

    return html;
  }

  // STEP: Order form
  function renderOrderForm() {
    if (state.loading) return renderLoading();
    var html = '<h3 class="text-xl font-bold mb-6">Order Recording</h3>';
    html += renderError();

    // Show selected lector if available
    var orderLektorName = '';
    try { var oc = JSON.parse(sessionStorage.getItem('kreatorContext') || '{}'); orderLektorName = oc.lektorName || ''; } catch(e) {}
    if (orderLektorName) {
      html += '<div class="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4">' +
        '<div class="flex items-center gap-2 text-accent font-semibold text-sm">' +
          '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>' +
          'Selected voice artist: ' + esc(orderLektorName) +
        '</div>' +
      '</div>';
    }

    html += '<div class="space-y-4">' +
      renderInput('firmName', 'Company *', 'Company Name') +
      renderInput('name', 'Full Name *', 'John Smith') +
      '<div class="grid grid-cols-2 gap-4">' +
        renderInput('email', 'Email *', 'john@company.com') +
        renderInput('phone', 'Phone *', '+48 600 000 000') +
      '</div>' +
    '</div>';

    var canSubmit = state.form.firmName && state.form.name && state.form.email && state.form.phone;
    html += '<div class="flex gap-3 mt-6">' +
      '<button data-action="goBack" class="kreator-btn-secondary">Back</button>' +
      '<button data-action="submitOrder" ' + (canSubmit ? '' : 'disabled') + ' class="kreator-btn-primary flex-1">Submit Order</button>' +
    '</div>';

    return html;
  }

  // STEP: Inquiry form
  function renderInquiryForm() {
    if (state.loading) return renderLoading();
    var html = '<h3 class="text-xl font-bold mb-6">Request a Quote</h3>';
    html += '<p class="text-gray-400 text-sm mb-6">Describe your project — we will respond within 2 hours.</p>';
    html += renderError();
    html += '<div class="space-y-4">' +
      renderInput('name', 'Name', 'John Smith') +
      renderInput('email', 'Email *', 'john@company.com') +
      renderInput('phone', 'Phone (optional)', '+48 600 000 000') +
      renderTextarea('description', 'Project Description', 'Describe what you need...') +
    '</div>';

    html += '<div class="flex gap-3 mt-6">' +
      '<button data-action="goBack" class="kreator-btn-secondary">Back</button>' +
      '<button data-action="submitInquiry" ' + (!state.form.email ? 'disabled' : '') + ' class="kreator-btn-primary flex-1">Send Inquiry</button>' +
    '</div>';

    return html;
  }

  // STEP: Save text (lead magnet)
  function renderSaveText() {
    if (state.loading) return renderLoading();
    var html = '<h3 class="text-xl font-bold mb-4">Save script to email</h3>';
    html += '<p class="text-gray-400 text-sm mb-6">We will send the prepared script to the provided address.</p>';
    html += renderError();
    html += renderInput('email', 'Your email *', 'john@company.com');
    html += '<div class="flex gap-3 mt-6">' +
      '<button data-action="goBack" class="kreator-btn-secondary">Back</button>' +
      '<button data-action="submitSaveText" ' + (!state.form.email ? 'disabled' : '') + ' class="kreator-btn-primary flex-1">Send script to email</button>' +
    '</div>';
    return html;
  }

  // STEP: Success
  function renderSuccess() {
    return '<div class="text-center py-8">' +
      '<div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-2xl">&#10003;</div>' +
      '<h3 class="text-xl font-bold mb-2">Thank you!</h3>' +
      '<p class="text-gray-400 mb-6">' + esc(state.toast || 'We will respond within 2 hours.') + '</p>' +
      '<button data-action="reset" class="kreator-btn-primary">Create another script</button>' +
    '</div>';
  }

  // Helpers
  function renderNav(backStep, nextStep, disabled) {
    return '<div class="flex gap-3 mt-8">' +
      '<button data-action="goTo" data-value="' + backStep + '" class="kreator-btn-secondary">Back</button>' +
      '<button data-action="goTo" data-value="' + nextStep + '" ' + (disabled ? 'disabled' : '') + ' class="kreator-btn-primary flex-1">Next &rarr;</button>' +
    '</div>';
  }

  function renderSelect(field, label, options) {
    var html = '<div><label class="block font-semibold mb-2 text-sm">' + label + '</label>' +
      '<select data-field="' + field + '" class="kreator-select">' +
      '<option value="">Select...</option>';
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

  // Event handling — delegate all events on root (survives innerHTML rebuilds)
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
    if (!btn) return;

    // Flush pending input values before checking disabled state
    // (input event updates state but doesn't re-render, so disabled attr may be stale)
    root.querySelectorAll('[data-field]').forEach(function(el) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        state.form[el.dataset.field] = el.value;
      } else if (el.tagName === 'SELECT') {
        state.form[el.dataset.field] = el.value;
      }
    });

    var action = btn.dataset.action;
    var value = btn.dataset.value;

    switch (action) {
      case 'setPath':
        if (value === 'creator') setState({ step: 'service-type' });
        else setState({ step: 'optimizer' });
        break;
      case 'setCategory':
        // Find category
        var cat = null;
        for (var ci = 0; ci < CATEGORIES.length; ci++) {
          if (CATEGORIES[ci].id === value) { cat = CATEGORIES[ci]; break; }
        }
        if (cat && cat.services.length === 1) {
          // Single service — go directly to details
          state.form.serviceType = cat.services[0];
          state.form.languages = [];
          setState({ step: 'details', _category: value });
        } else if (cat) {
          // Multiple services — show sub-service selection
          setState({ step: 'sub-service', _category: value });
        }
        break;
      case 'setService':
        state.form.serviceType = value;
        state.form.languages = [];
        setState({ step: 'details' });
        break;
      case 'toggleMore':
        state._moreOptions = !state._moreOptions;
        render();
        break;
      case 'toggleLang':
        toggleLanguage(value);
        break;
      case 'goTo':
        setState({ step: value, error: null });
        scrollToKreator();
        break;
      case 'goBack':
        // Smart back — go to preview, opt-result, or opt-check
        if (state.result) {
          setState({ step: state._originalText ? 'opt-result' : (state.form.textInput ? 'opt-result' : 'preview'), error: null });
        } else {
          setState({ step: 'welcome', error: null });
        }
        scrollToKreator();
        break;
      case 'generate':
        var svc = getService();
        var canGen = state.form.industry && state.form.company;
        if (svc && svc.needsLanguages) canGen = canGen && state.form.languages.length > 0;
        if (canGen) generate();
        break;
      case 'optimize':
        if (state.form.textInput.trim()) optimize();
        break;
      case 'checkText':
        if (state.form.textInput.trim()) {
          state._originalText = state.form.textInput.trim();
          state._showDiff = false;
          setState({ step: 'opt-check', error: null });
          scrollToKreator();
        }
        break;
      case 'requestOptimize':
        state._showDiff = true;
        optimize();
        break;
      case 'skipOptimize':
        state.result = state.form.textInput.trim();
        state._showDiff = false;
        setState({ step: 'opt-result', error: null });
        scrollToKreator();
        break;
      case 'acceptOptimized':
        state._showDiff = false;
        setState({ step: 'opt-result', error: null });
        scrollToKreator();
        break;
      case 'copy':
        copyText();
        break;
      case 'selectVoice':
        // Save kreator context to sessionStorage
        var ctxData = {
          text: state.result,
          serviceType: state.form.serviceType,
          languages: state.form.languages,
          industry: state.form.industry,
          duration: state.form.duration,
          company: state.form.company,
          offering: state.form.offering,
          tone: state.form.tone,
          audience: state.form.audience,
          goal: state.form.goal,
          timestamp: Date.now()
        };
        try { sessionStorage.setItem('kreatorContext', JSON.stringify(ctxData)); } catch(e) {}
        window.location.href = '/en/voice-bank/?from=kreator';
        break;
      case 'submitOrder':
        var orderCtx = {};
        try { orderCtx = JSON.parse(sessionStorage.getItem('kreatorContext') || '{}'); } catch(e) {}
        submitContact('order', {
          firmName: state.form.firmName,
          name: state.form.name,
          email: state.form.email,
          phone: state.form.phone,
          serviceType: state.form.serviceType,
          industry: state.form.industry,
          generatedText: state.result,
          lektorName: orderCtx.lektorName || ''
        });
        break;
      case 'submitInquiry':
        var inqCtx = {};
        try { inqCtx = JSON.parse(sessionStorage.getItem('kreatorContext') || '{}'); } catch(e) {}
        submitContact('inquiry', {
          name: state.form.name,
          email: state.form.email,
          phone: state.form.phone,
          description: state.form.description,
          serviceType: state.form.serviceType,
          industry: state.form.industry,
          generatedText: state.result,
          lektorName: inqCtx.lektorName || ''
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
          lang: 'en',
          serviceType: '', industry: '', duration: '30', languages: [],
          company: '', offering: '', audience: '', tone: '', goal: '',
          textInput: '', targetDur: '30',
          firmName: '', name: '', email: '', phone: '', description: ''
        };
        state.result = '';
        state.error = null;
        state.toast = null;
        state._category = null;
        state._moreOptions = false;
        state._originalText = '';
        state._showDiff = false;
        render();
        break;
    }
  }

  function handleChange(e) {
    if (e.target.dataset.field) {
      // For text inputs/textareas: only update state, don't re-render.
      // Re-render on blur destroys DOM mid-click and swallows the click event
      // (user clicks button, blur fires first → re-render → click lost).
      // For selects: re-render to update dependent UI (e.g. validation state).
      if (e.target.tagName === 'SELECT') {
        setField(e.target.dataset.field, e.target.value);
      } else {
        state.form[e.target.dataset.field] = e.target.value;
      }
    }
  }

  function handleInput(e) {
    if (e.target.dataset.field && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      state.form[e.target.dataset.field] = e.target.value;
      // Update disabled state of submit buttons without full re-render
      updateButtonStates();
    }
    // Edycja wygenerowanego tekstu
    if (e.target.hasAttribute('data-result-edit')) {
      state.result = e.target.value;
    }
  }

  function updateButtonStates() {
    // Find all action buttons and update their disabled state based on current form values
    var genBtn = root.querySelector('[data-action="generate"]');
    if (genBtn) {
      var svc = getService();
      var canGen = state.form.industry && state.form.company;
      if (svc && svc.needsLanguages) canGen = canGen && state.form.languages.length > 0;
      genBtn.disabled = !canGen;
    }
    var optBtn = root.querySelector('[data-action="checkText"]');
    if (optBtn) {
      optBtn.disabled = !state.form.textInput.trim();
    }
    var orderBtn = root.querySelector('[data-action="submitOrder"]');
    if (orderBtn) {
      orderBtn.disabled = !(state.form.firmName && state.form.name && state.form.email && state.form.phone);
    }
    var inqBtn = root.querySelector('[data-action="submitInquiry"]');
    if (inqBtn) {
      inqBtn.disabled = !state.form.email;
    }
    var saveBtn = root.querySelector('[data-action="submitSaveText"]');
    if (saveBtn) {
      saveBtn.disabled = !state.form.email;
    }
  }

  // Init
  function init() {
    root = document.getElementById('kreator-root');
    if (!root) return;

    // Check for lector context from sessionStorage (coming from lektor page)
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var action = urlParams.get('action');
      var ctxStr = sessionStorage.getItem('kreatorContext');
      if (ctxStr) {
        var ctx = JSON.parse(ctxStr);
        if (ctx.returnUrl && ctx.lektorName) {
          // Coming from lektor page — show lector info banner after text is generated
          state._returnUrl = ctx.returnUrl;
          state._lektorName = ctx.lektorName;
          state._lektorId = ctx.lektorId;
        }
        if (action === 'order' && ctx.text && ctx.lektorName) {
          state.result = ctx.text;
          setState({ step: 'order-form' });
          return;
        } else if (action === 'inquiry' && ctx.text && ctx.lektorName) {
          state.result = ctx.text;
          setState({ step: 'inquiry-form' });
          return;
        } else if (ctx.skipWelcome) {
          ctx.skipWelcome = false;
          sessionStorage.setItem('kreatorContext', JSON.stringify(ctx));
          setState({ step: 'service-type' });
          return;
        }
      }
    } catch(e) {}

    render();
    initHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
