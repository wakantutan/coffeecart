/* ═══════════════════════════════════════════════════════════════
   FROYO DIARIES — Main JS
   Steps: 0=Package  1=Customize  2=Details  3=Confirm  4=Success
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── 1. AOS ──────────────────────────────────────────────── */
  if (typeof AOS !== 'undefined') AOS.init({ duration: 700, once: true, offset: 60 });

  /* ── 2. NAVBAR ───────────────────────────────────────────── */
  var navbar    = document.querySelector('.navbar');
  var navToggle = document.querySelector('.navbar__toggle');
  var navLinks  = document.querySelector('.navbar__links');

  function handleNavScroll() { navbar.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navToggle.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  /* ── 3. FLASH MESSAGES ───────────────────────────────────── */
  document.querySelectorAll('.flash').forEach(function (flash) {
    var closeBtn = flash.querySelector('.flash__close');
    if (closeBtn) closeBtn.addEventListener('click', function () { flash.remove(); });
    setTimeout(function () {
      flash.style.transition = 'opacity 0.5s ease';
      flash.style.opacity = '0';
      setTimeout(function () { flash.remove(); }, 500);
    }, 5000);
  });

  /* ── 4. ACTIVE NAV LINK ──────────────────────────────────── */
  var sections   = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.navbar__links a[href^="#"]');
  function setActiveLink() {
    var scrollPos = window.scrollY + 120;
    sections.forEach(function (section) {
      if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
        navAnchors.forEach(function (a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + section.id);
        });
      }
    });
  }
  window.addEventListener('scroll', setActiveLink, { passive: true });

  /* ── 5. PACKAGE TABS ─────────────────────────────────────── */
  var pkgTabs   = document.querySelectorAll('.pkg-tab');
  var pkgPanels = document.querySelectorAll('.pkg-panel');
  pkgTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      pkgTabs.forEach(function (t) { t.classList.remove('pkg-tab--active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('pkg-tab--active');
      tab.setAttribute('aria-selected', 'true');
      pkgPanels.forEach(function (panel) {
        panel.classList.toggle('pkg-panel--active', panel.id === 'panel-' + tab.dataset.tab);
      });
    });
  });

  /* ── 6. ACCORDION ────────────────────────────────────────── */
  document.querySelectorAll('.pkg-card__toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var isOpen = btn.getAttribute('aria-expanded') === 'true';
      var grid   = btn.closest('.pkg-grid');
      if (grid) {
        grid.querySelectorAll('.pkg-card__toggle[aria-expanded="true"]').forEach(function (ob) {
          if (ob !== btn) closeAccordion(ob);
        });
      }
      isOpen ? closeAccordion(btn) : openAccordion(btn);
    });
  });
  function openAccordion(btn) {
    btn.setAttribute('aria-expanded', 'true');
    btn.closest('.pkg-card').querySelector('.pkg-card__details').classList.add('is-open');
  }
  function closeAccordion(btn) {
    btn.setAttribute('aria-expanded', 'false');
    btn.closest('.pkg-card').querySelector('.pkg-card__details').classList.remove('is-open');
  }

  /* ── 7. FLAVOR PICKER (modal) ────────────────────────────── */
  document.querySelectorAll('.bk-flavor').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group    = btn.dataset.group;
      var val      = btn.dataset.val;
      var maxKey   = group === 'sauce' ? 'sauces' : group === 'crunch' ? 'crunches' : 'fruits';
      var max      = _bkModal.pkg[maxKey];
      var selected = _bkModal.selections[group];
      var idx      = selected.indexOf(val);
      if (idx !== -1) {
        selected.splice(idx, 1);
        btn.classList.remove('is-selected');
      } else {
        if (selected.length >= max) return;
        selected.push(val);
        btn.classList.add('is-selected');
      }
      _bkSyncFlavorGroup(group, max);
    });
  });

  /* Close modal on backdrop click */
  document.getElementById('bookingOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeBookingModal();
  });

  /* Close on Escape */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeBookingModal();
  });

}); // end DOMContentLoaded


/* ═══════════════════════════════════════════════════════════════
   BOOKING MODAL — global state + functions
   Steps: 0=Package  1=Customize  2=Details  3=Confirm  4=Success
═══════════════════════════════════════════════════════════════ */

var _bkModal = {
  currentStep : 0,
  selectedOptionEl: null,
  pkg: { name: '', price: '', type: 'froyo', sauces: 3, crunches: 5, fruits: 2, cups: '', time: '', fillings: '' },
  selections: { sauce: [], crunch: [], fruit: [] }
};

/* ── Open fresh (from Book Now / contact CTA) — starts at Step 0 ── */
function openBookingModalFresh() {
  _bkReset();
  _bkLoadBlockedDates();
  bkGoTo(0);
  _bkOpenOverlay();
}

/* ── Open pre-seeded (from a specific package card's CTA button) ── */
function openBookingModal(btn) {
  var card    = btn.closest('.pkg-card');
  var tierEl  = card.querySelector('.pkg-card__tier');
  var priceEl = card.querySelector('.pkg-card__price');

  _bkReset();
  _bkLoadBlockedDates();

  _bkModal.pkg.name     = tierEl  ? tierEl.textContent.trim()  : 'Package';
  _bkModal.pkg.price    = priceEl ? priceEl.textContent.trim() : '';
  _bkModal.pkg.type     = card.dataset.pkgType  || 'froyo';
  _bkModal.pkg.sauces   = parseInt(card.dataset.sauces   || 3, 10);
  _bkModal.pkg.crunches = parseInt(card.dataset.crunches || 5, 10);
  _bkModal.pkg.fruits   = parseInt(card.dataset.fruits   || 2, 10);

  /* Read cups/time from highlights */
  card.querySelectorAll('.pkg-card__highlights li').forEach(function (li) {
    var t = li.textContent.trim();
    if (t.match(/cups|pcs/i)) _bkModal.pkg.cups = t;
    if (t.match(/hours/i))    _bkModal.pkg.time = t;
    if (t.match(/filling/i))  _bkModal.pkg.fillings = t;
  });

  _bkPopulateInclusions();

  if (_bkModal.pkg.type === 'taiyaki') {
    _bkHideFlavorPickers();
    bkGoTo(2); // skip straight to details
  } else {
    _bkShowFlavorPickers();
    _bkUpdateQuota('sauce',  _bkModal.pkg.sauces);
    _bkUpdateQuota('crunch', _bkModal.pkg.crunches);
    _bkUpdateQuota('fruit',  _bkModal.pkg.fruits);
    bkGoTo(1);
  }

  _bkOpenOverlay();
}

/* ── Step 0: switch category tabs ── */
function bkSwitchCategory(cat) {
  document.querySelectorAll('.bk-pkg-tab').forEach(function (t) {
    t.classList.toggle('bk-pkg-tab--active', t.dataset.category === cat);
  });
  var froyoOpts   = document.getElementById('bkFroyoOptions');
  var taiyakiOpts = document.getElementById('bkTaiyakiOptions');
  if (froyoOpts)   froyoOpts.classList.toggle('bk-pkg-options--hidden',   cat !== 'froyo');
  if (taiyakiOpts) taiyakiOpts.classList.toggle('bk-pkg-options--hidden', cat !== 'taiyaki');

  /* Deselect any previously chosen option */
  if (_bkModal.selectedOptionEl) {
    _bkModal.selectedOptionEl.classList.remove('is-selected');
    _bkModal.selectedOptionEl = null;
  }
  var nextBtn = document.getElementById('bkNext0');
  if (nextBtn) nextBtn.disabled = true;
}

/* ── Step 0: select a package option row ── */
function bkSelectPackage(el) {
  /* Deselect siblings */
  var parent = el.closest('.bk-pkg-options');
  parent.querySelectorAll('.bk-pkg-option').forEach(function (o) { o.classList.remove('is-selected'); });
  el.classList.add('is-selected');
  _bkModal.selectedOptionEl = el;

  /* Load data from the button's data attributes */
  var d = el.dataset;
  _bkModal.pkg.name     = d.pkgName   || '';
  _bkModal.pkg.price    = d.pkgPrice  || '';
  _bkModal.pkg.type     = d.pkgType   || 'froyo';
  _bkModal.pkg.sauces   = parseInt(d.sauces   || 0, 10);
  _bkModal.pkg.crunches = parseInt(d.crunches || 0, 10);
  _bkModal.pkg.fruits   = parseInt(d.fruits   || 0, 10);
  _bkModal.pkg.cups     = d.cups     || '';
  _bkModal.pkg.time     = d.time     || '';
  _bkModal.pkg.fillings = d.fillings || '';

  /* Enable Next button */
  var nextBtn = document.getElementById('bkNext0');
  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.innerHTML = _bkModal.pkg.type === 'taiyaki'
      ? 'Next: Your Details <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'
      : 'Next: Customize <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
  }
}

/* ── Step 0: confirm package selection and advance ── */
function bkConfirmPackage() {
  if (!_bkModal.selectedOptionEl) return;

  /* Reset flavor selections */
  _bkModal.selections = { sauce: [], crunch: [], fruit: [] };
  document.querySelectorAll('.bk-flavor').forEach(function (f) {
    f.classList.remove('is-selected', 'is-disabled');
  });

  _bkPopulateInclusions();

  if (_bkModal.pkg.type === 'taiyaki') {
    _bkHideFlavorPickers();
    bkGoTo(2);
  } else {
    _bkShowFlavorPickers();
    _bkUpdateQuota('sauce',  _bkModal.pkg.sauces);
    _bkUpdateQuota('crunch', _bkModal.pkg.crunches);
    _bkUpdateQuota('fruit',  _bkModal.pkg.fruits);
    /* Reset step dots */
    ['bkSauceStep','bkCrunchStep','bkFruitStep'].forEach(function (id, i) {
      var el = document.getElementById(id);
      if (el) { el.classList.remove('done'); el.textContent = i + 1; }
    });
    bkGoTo(1);
  }
}

/* ── Navigate between steps ── */
function bkGoTo(step) {
  if (step === 3) {
    /* Validate details before review */
    var name  = document.getElementById('bkName').value.trim();
    var email = document.getElementById('bkEmail').value.trim();
    var date  = document.getElementById('bkDate').value;
    var evTime   = document.getElementById('bkEventTime') ? document.getElementById('bkEventTime').value : '';
    var setupTime = document.getElementById('bkSetupTime') ? document.getElementById('bkSetupTime').value : '';

    if (!name)  { _bkShake(document.getElementById('bkName'));  document.getElementById('bkName').focus();  return; }
    if (!email || !email.includes('@')) { _bkShake(document.getElementById('bkEmail')); document.getElementById('bkEmail').focus(); return; }

    /* Validate venue — check hidden field (set when pin is placed) */
    var venueVal = document.getElementById('bkVenue') ? document.getElementById('bkVenue').value.trim() : '';
    if (!venueVal) {
      var vi = document.getElementById('bkVenueSearch') || document.getElementById('bkVenue');
      if (vi) {
        _bkShake(vi);
        vi.focus();
        /* Show helpful message */
        var hint = document.getElementById('bkMapHint');
        if (hint) {
          hint.classList.remove('hidden');
          hint.style.background = 'rgba(239,68,68,.85)';
          setTimeout(function(){ hint.style.background = ''; }, 2500);
        }
      }
      return;
    }

    if (!evTime)   { _bkShake(document.getElementById('bkEventTime'));  document.getElementById('bkEventTime').focus(); return; }
    if (!setupTime) { _bkShake(document.getElementById('bkSetupTime')); document.getElementById('bkSetupTime').focus(); return; }

    /* Check if selected date is blocked */
    if (date && _bkModal._blockedDates) {
      var blocked = _bkModal._blockedDates.find(function(b) { return b.date === date; });
      if (blocked) {
        var errEl  = document.getElementById('bkDateError');
        var msgEl  = document.getElementById('bkDateErrorMsg');
        if (errEl) errEl.style.display = 'flex';
        if (msgEl) msgEl.textContent = 'This date is unavailable: ' + (blocked.reason || 'Unavailable') + '. Please choose another date.';
        document.getElementById('bkDate').focus();
        _bkShake(document.getElementById('bkDate'));
        return;
      }
    }

    _bkBuildSummary();
  }
  _bkModal.currentStep = step;
  _bkUpdateStepUI(step);
  var modal = document.querySelector('.bk-modal');
  if (modal) modal.scrollTop = 0;
}

/* ── Update all step UI (panels + progress + indicators) ── */
function _bkUpdateStepUI(step) {
  /* Hide all panels first */
  ['bkPanel0','bkPanel1','bkPanel2','bkPanel3','bkPanelSuccess'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('bk-panel--hidden');
  });
  /* Show target */
  var targetId = step === 4 ? 'bkPanelSuccess' : 'bkPanel' + step;
  var target = document.getElementById(targetId);
  if (target) target.classList.remove('bk-panel--hidden');

  /* If showing step 2 (details), re-render the map */
  if (step === 2) {
    setTimeout(function () {
      if (typeof window._bkRefreshMap === 'function') window._bkRefreshMap();
    }, 150);
  }

  /* Progress bar: 0=20% 1=45% 2=68% 3=100% 4=100% */
  var bar = document.getElementById('bkProgressBar');
  if (bar) {
    var pcts = ['20%', '45%', '68%', '100%', '100%'];
    bar.style.width = pcts[step] || '20%';
    bar.style.background = step === 4
      ? 'linear-gradient(90deg,#22c55e,#4ade80)'
      : 'linear-gradient(90deg,var(--color-accent),var(--color-accent-light))';
  }

  /* Step indicators — map UI steps 0-3 to indicator dots 0-3 */
  var stepIds = ['bkStep0Ind','bkStep1Ind','bkStep2Ind','bkStep3Ind'];
  stepIds.forEach(function (id, n) {
    var ind = document.getElementById(id);
    if (!ind) return;
    ind.classList.remove('bk-step--active','bk-step--done');
    var dot = ind.querySelector('.bk-step__dot');
    if (step === 4 || n < step) {
      ind.classList.add('bk-step--done');
      dot.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (n === step) {
      ind.classList.add('bk-step--active');
      dot.textContent = n + 1;
    } else {
      dot.textContent = n + 1;
    }
  });

  /* Show/hide steps bar on success */
  var stepsEl = document.querySelector('.bk-steps');
  if (stepsEl) stepsEl.style.opacity = step === 4 ? '0' : '1';
}

/* ── Populate inclusions strip inside modal ── */
function _bkPopulateInclusions() {
  var p = _bkModal.pkg;
  var badge1 = document.getElementById('bkPkgBadge');
  var badge2 = document.getElementById('bkPkgBadge2');
  var label  = p.name + ' — ' + p.price;
  if (badge1) badge1.textContent = label;
  if (badge2) badge2.textContent = label;

  var incCups  = document.getElementById('bkIncCups');
  var incTime  = document.getElementById('bkIncTime');
  var incQuota = document.getElementById('bkIncQuota');
  if (incCups)  incCups.textContent  = p.cups || '';
  if (incTime)  incTime.textContent  = p.time || '4 hours serving';
  if (incQuota) {
    incQuota.textContent = p.type === 'taiyaki'
      ? (p.fillings || '')
      : p.sauces + ' sauces · ' + p.crunches + ' crunches · ' + p.fruits + ' fruits';
  }

  var froyoInc   = document.getElementById('bkInclusions');
  var taiyakiInc = document.getElementById('bkTaiyakiInclusions');
  var tPcs  = document.getElementById('bkTaiyakiPcs');
  var tFill = document.getElementById('bkTaiyakiFill');

  if (p.type === 'taiyaki') {
    if (froyoInc)   froyoInc.style.display   = 'none';
    if (taiyakiInc) taiyakiInc.style.display = '';
    if (tPcs)  tPcs.textContent  = p.cups     || '';
    if (tFill) tFill.textContent = p.fillings || '';
  } else {
    if (froyoInc)   froyoInc.style.display   = '';
    if (taiyakiInc) taiyakiInc.style.display = 'none';
  }
}

function _bkHideFlavorPickers() {
  ['bkSauceGrid','bkCrunchGrid','bkFruitGrid'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { var sec = el.closest('.bk-picker-section'); if (sec) sec.style.display = 'none'; }
  });
}

function _bkShowFlavorPickers() {
  ['bkSauceGrid','bkCrunchGrid','bkFruitGrid'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) { var sec = el.closest('.bk-picker-section'); if (sec) sec.style.display = ''; }
  });
}

/* ── Sync a flavor group after selection change ── */
function _bkSyncFlavorGroup(group, max) {
  var selected = _bkModal.selections[group];
  var full     = selected.length >= max;
  document.querySelectorAll('.bk-flavor[data-group="' + group + '"]').forEach(function (b) {
    b.classList.toggle('is-disabled', !b.classList.contains('is-selected') && full);
  });
  _bkUpdateQuota(group, max);
  var stepMap = { sauce: 'bkSauceStep', crunch: 'bkCrunchStep', fruit: 'bkFruitStep' };
  var stepEl  = document.getElementById(stepMap[group]);
  if (stepEl) {
    stepEl.classList.toggle('done', full);
    stepEl.innerHTML = full
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
      : (group === 'sauce' ? '1' : group === 'crunch' ? '2' : '3');
  }
}

function _bkUpdateQuota(group, max) {
  var quotaMap = { sauce: 'bkSauceQuota', crunch: 'bkCrunchQuota', fruit: 'bkFruitQuota' };
  var el = document.getElementById(quotaMap[group]);
  if (!el) return;
  var chosen = (_bkModal.selections[group] || []).length;
  el.textContent = chosen + ' of ' + max + ' selected';
  el.classList.toggle('is-full', chosen >= max);
}

/* ── Build confirmation summary ── */
function _bkBuildSummary() {
  var s = _bkModal.selections;
  var p = _bkModal.pkg;
  _bkSet('bkSumPkg',   p.name);
  _bkSet('bkSumPrice', p.price);
  _bkSet('bkSumName',  document.getElementById('bkName').value.trim());
  _bkSet('bkSumEmail', document.getElementById('bkEmail').value.trim());
  var venue = document.getElementById('bkVenue') ? document.getElementById('bkVenue').value.trim() : '';
  _bkToggleRow('bkSumVenueRow', venue); _bkSet('bkSumVenue', venue);

  var phone = document.getElementById('bkPhone').value.trim();
  var evType = document.getElementById('bkEventType').value;
  var date   = document.getElementById('bkDate').value;
  var notes  = document.getElementById('bkNotes').value.trim();
  var evTime    = document.getElementById('bkEventTime') ? document.getElementById('bkEventTime').value : '';
  var setupTime = document.getElementById('bkSetupTime') ? document.getElementById('bkSetupTime').value : '';

  _bkToggleRow('bkSumPhoneRow', phone);  _bkSet('bkSumPhone', phone);
  _bkToggleRow('bkSumEventRow', evType); _bkSet('bkSumEvent', evType);
  _bkToggleRow('bkSumNotesRow', notes);  _bkSet('bkSumNotes', notes);

  /* Event time */
  _bkToggleRow('bkSumEventTimeRow', evTime);
  if (evTime) {
    var et = new Date('2000-01-01T' + evTime);
    _bkSet('bkSumEventTime', et.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }));
  }
  /* Setup time */
  _bkToggleRow('bkSumSetupTimeRow', setupTime);
  if (setupTime) {
    var st = new Date('2000-01-01T' + setupTime);
    _bkSet('bkSumSetupTime', st.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }));
  }
  if (date) {
    _bkToggleRow('bkSumDateRow', true);
    var d = new Date(date + 'T00:00:00');
    _bkSet('bkSumDate', d.toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }));
  } else { _bkToggleRow('bkSumDateRow', false); }
  _bkSetChips('bkSumSauces',   s.sauce);
  _bkSetChips('bkSumCrunches', s.crunch);
  _bkSetChips('bkSumFruits',   s.fruit);
  /* Hide flavor rows for taiyaki */
  ['bkSumSauces','bkSumCrunches','bkSumFruits'].forEach(function (id) {
    var row = document.getElementById(id);
    if (row) { var r = row.closest('.bk-summary__row'); if (r) r.style.display = p.type === 'taiyaki' ? 'none' : ''; }
  });
}

/* ── Submit ── */
function bkSubmit() {
  var confirmBtn = document.getElementById('bkConfirmBtn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Sending…'; }

  var s      = _bkModal.selections;
  var p      = _bkModal.pkg;
  var name   = document.getElementById('bkName').value.trim();
  var email  = document.getElementById('bkEmail').value.trim();
  var phone  = document.getElementById('bkPhone').value.trim();
  var evType = document.getElementById('bkEventType').value;
  var date   = document.getElementById('bkDate').value;
  var notes  = document.getElementById('bkNotes').value.trim();

  var venue     = document.getElementById('bkVenue')     ? document.getElementById('bkVenue').value.trim()     : '';
  var venueLat  = document.getElementById('bkVenueLat')  ? document.getElementById('bkVenueLat').value.trim()  : '';
  var venueLng  = document.getElementById('bkVenueLng')  ? document.getElementById('bkVenueLng').value.trim()  : '';

  /* Validate venue */
  if (!venue) {
    bkGoTo(2);
    var venueInp = document.getElementById('bkVenueSearch');
    if (venueInp) { _bkShake(venueInp); venueInp.focus(); }
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = 'Confirm Booking <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'; }
    return;
  }

  var evTime    = document.getElementById('bkEventTime') ? document.getElementById('bkEventTime').value : '';
  var setupTime = document.getElementById('bkSetupTime') ? document.getElementById('bkSetupTime').value : '';

  var formData = new FormData();
  formData.append('name',       name);
  formData.append('email',      email);
  formData.append('phone',      phone);
  formData.append('pkg_name',   p.name);
  formData.append('pkg_price',  p.price);
  formData.append('pkg_type',   p.type  || 'froyo');
  formData.append('sauces',     s.sauce.join(', '));
  formData.append('crunches',   s.crunch.join(', '));
  formData.append('fruits',     s.fruit.join(', '));
  formData.append('event_type', evType      || '');
  formData.append('event_date', date        || '');
  formData.append('event_time', evTime      || '');
  formData.append('setup_time', setupTime   || '');
  formData.append('venue',      venue       || '');
  formData.append('venue_lat',  venueLat    || '');
  formData.append('venue_lng',  venueLng    || '');
  formData.append('notes',      notes       || '');

  /* Get CSRF token — check inside modal first, then anywhere on page */
  var csrfInput = document.querySelector('#bookingOverlay [name=csrfmiddlewaretoken]')
               || document.querySelector('[name=csrfmiddlewaretoken]');

  /* Fallback: read from cookie */
  function getCsrfFromCookie() {
    var match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
  }

  var csrfToken = csrfInput ? csrfInput.value : getCsrfFromCookie();

  fetch('/contact/', {
    method: 'POST',
    headers: { 'X-CSRFToken': csrfToken },
    body: formData
  })
  .then(function(res) {
    if (!res.ok) {
      throw new Error('Server returned ' + res.status);
    }
    return res.json();
  })
  .then(function(data) {
    if (data.ok) {
      _bkModal._reference = data.reference;
      _bkShowSuccess();
    } else {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Confirm Booking <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      }
      /* If it's a blocked date error — go back to details step and show the error */
      if (data.blocked_date) {
        bkGoTo(2);
        var errEl = document.getElementById('bkDateError');
        var msgEl = document.getElementById('bkDateErrorMsg');
        var dateInput = document.getElementById('bkDate');
        if (errEl) errEl.style.display = 'flex';
        if (msgEl) msgEl.textContent = data.error;
        if (dateInput) {
          dateInput.style.borderColor = '#ef4444';
          dateInput.value = '';
          dateInput.focus();
        }
      } else {
        alert('Error: ' + (data.error || 'Something went wrong. Please try again.'));
      }
    }
  })
  .catch(function(err) {
    console.error('Booking submission error:', err);
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = 'Confirm Booking <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    }
    alert('Connection error. Please check your internet and try again.');
  });
}

function _bkShowSuccess() {
  _bkSet('bkSuccessPkg',   _bkModal.pkg.name + ' (' + _bkModal.pkg.price + ')');
  _bkSet('bkSuccessEmail', document.getElementById('bkEmail').value.trim());
  /* Show reference number if we got one back */
  var refEl = document.getElementById('bkSuccessRef');
  if (refEl && _bkModal._reference) {
    refEl.textContent = 'Reference: ' + _bkModal._reference;
    refEl.style.display = '';
  }
  bkGoTo(4);
}

/* ── Close modal ── */
function closeBookingModal() {
  var overlay = document.getElementById('bookingOverlay');
  overlay.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(function () { _bkReset(); bkGoTo(0); }, 350);
}

/* ── Internal helpers ── */
function _bkReset() {
  _bkModal.selections = { sauce: [], crunch: [], fruit: [] };
  _bkModal.selectedOptionEl = null;
  document.querySelectorAll('.bk-flavor').forEach(function (f) { f.classList.remove('is-selected','is-disabled'); });
  document.querySelectorAll('.bk-pkg-option').forEach(function (o) { o.classList.remove('is-selected'); });
  var nextBtn = document.getElementById('bkNext0');
  if (nextBtn) { nextBtn.disabled = true; nextBtn.innerHTML = 'Next: Customize <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>'; }
  /* Reset confirm button */
  var confirmBtn = document.getElementById('bkConfirmBtn');
  if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = 'Confirm Booking <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'; }
  /* Reset progress bar colour */
  var bar = document.getElementById('bkProgressBar');
  if (bar) bar.style.background = '';
  /* Show froyo options by default */
  bkSwitchCategory('froyo');
}

function _bkOpenOverlay() {
  var stepsEl = document.querySelector('.bk-steps');
  if (stepsEl) stepsEl.style.opacity = '1';
  document.getElementById('bookingOverlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  /* Init venue autocomplete every time modal opens */
  if (typeof window._initVenueAutocomplete === 'function') {
    window._initVenueAutocomplete();
  }
}

/* ── Load blocked dates from server ── */
function _bkLoadBlockedDates() {
  _bkModal._blockedDates = [];
  fetch('/blocked-dates/')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _bkModal._blockedDates = data.blocked_dates || [];
      /* Disable blocked dates on the date input */
      var dateInput = document.getElementById('bkDate');
      if (!dateInput) return;
      dateInput.addEventListener('change', function() {
        var val = dateInput.value;
        var errEl = document.getElementById('bkDateError');
        var msgEl = document.getElementById('bkDateErrorMsg');
        /* Always clear error first */
        if (errEl) errEl.style.display = 'none';
        dateInput.style.borderColor = '';
        if (!val || !_bkModal._blockedDates || !_bkModal._blockedDates.length) return;
        var blocked = _bkModal._blockedDates.find(function(b) { return b.date === val; });
        if (blocked) {
          if (errEl) errEl.style.display = 'flex';
          if (msgEl) msgEl.textContent = 'This date is unavailable: ' + (blocked.reason || 'Unavailable') + '. Please choose another date.';
          dateInput.style.borderColor = '#ef4444';
        }
      });
    })
    .catch(function() {
      _bkModal._blockedDates = [];
    });
}

function _bkSet(id, val) { var el = document.getElementById(id); if (el) el.textContent = val || '—'; }
function _bkToggleRow(id, show) { var el = document.getElementById(id); if (el) el.style.display = show ? '' : 'none'; }
function _bkSetChips(id, arr) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = (!arr || !arr.length)
    ? '<span style="font-size:0.8rem;color:var(--color-text-light);font-style:italic">None selected</span>'
    : arr.map(function (v) { return '<span class="bk-summary__chip">' + v + '</span>'; }).join('');
}
function _bkShake(el) {
  var dirs = ['-5px','5px','-4px','4px','-2px','2px','0px']; var count = 0;
  el.style.borderColor = '#ef4444';
  var iv = setInterval(function () {
    if (count >= dirs.length) { clearInterval(iv); el.style.transform = ''; return; }
    el.style.transform = 'translateX(' + dirs[count++] + ')';
  }, 60);
  setTimeout(function () { el.style.borderColor = ''; }, 1200);
}


/* ═══════════════════════════════════════════════════════════════
   REVIEWS — Star picker + carousel + form submission
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── Star picker ─────────────────────────────────────────── */
  var stars      = document.querySelectorAll('.star-picker__star');
  var ratingInput = document.getElementById('ratingInput');
  var currentRating = 5;

  function setRating(val) {
    currentRating = val;
    if (ratingInput) ratingInput.value = val;
    stars.forEach(function (s, i) {
      s.classList.toggle('active', i < val);
      var svg = s.querySelector('svg');
      if (svg) svg.setAttribute('fill', i < val ? '#f59e0b' : 'none');
    });
  }

  // Init at 5 stars
  setRating(5);

  stars.forEach(function (star) {
    star.addEventListener('click', function () {
      setRating(parseInt(star.dataset.val, 10));
    });
    star.addEventListener('mouseenter', function () {
      var hoverVal = parseInt(star.dataset.val, 10);
      stars.forEach(function (s, i) {
        var svg = s.querySelector('svg');
        if (svg) svg.setAttribute('fill', i < hoverVal ? '#f59e0b' : 'none');
      });
    });
    star.addEventListener('mouseleave', function () {
      setRating(currentRating);
    });
  });


  /* ── Review form submission ──────────────────────────────── */
  var reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var submitBtn  = document.getElementById('reviewSubmitBtn');
      var successMsg = document.getElementById('reviewSuccess');

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

      var formData = new FormData(reviewForm);

      var csrfInput = reviewForm.querySelector('[name=csrfmiddlewaretoken]');
      function getCsrfFromCookie() {
        var match = document.cookie.match(/csrftoken=([^;]+)/);
        return match ? match[1] : '';
      }
      var csrfToken = csrfInput ? csrfInput.value : getCsrfFromCookie();

      fetch('/submit-review/', {
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken },
        body: formData
      })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          reviewForm.reset();
          setRating(5);
          if (successMsg) successMsg.style.display = 'flex';
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Review'; }
        } else {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Review'; }
          alert(data.error || 'Something went wrong. Please try again.');
        }
      })
      .catch(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Review'; }
        alert('Connection error. Please try again.');
      });
    });
  }


  /* ── Reviews carousel ────────────────────────────────────── */
  var track    = document.getElementById('reviewsTrack');
  var prevBtn  = document.getElementById('reviewsPrev');
  var nextBtn  = document.getElementById('reviewsNext');
  var dotsWrap = document.getElementById('reviewsDots');

  if (!track) return;

  var cards       = track.querySelectorAll('.review-card');
  var totalCards  = cards.length;
  var currentIdx  = 0;
  var cardsVisible = 3;

  function getCardsVisible() {
    if (window.innerWidth <= 600) return 1;
    if (window.innerWidth <= 900) return 2;
    return 3;
  }

  function maxIndex() {
    return Math.max(0, totalCards - getCardsVisible());
  }

  function updateCarousel() {
    cardsVisible = getCardsVisible();
    var cardWidth = cards[0].getBoundingClientRect().width;
    var gap = 24;
    track.style.transform = 'translateX(-' + (currentIdx * (cardWidth + gap)) + 'px)';

    if (prevBtn) prevBtn.disabled = currentIdx === 0;
    if (nextBtn) nextBtn.disabled = currentIdx >= maxIndex();

    // Update dots
    if (dotsWrap) {
      var dots = dotsWrap.querySelectorAll('.reviews__dot');
      dots.forEach(function (d, i) {
        d.classList.toggle('active', i === currentIdx);
      });
    }
  }

  // Build dots
  if (dotsWrap && totalCards > 1) {
    for (var i = 0; i < totalCards; i++) {
      var dot = document.createElement('button');
      dot.className = 'reviews__dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to review ' + (i + 1));
      dot.dataset.idx = i;
      dot.addEventListener('click', function () {
        currentIdx = Math.min(parseInt(this.dataset.idx, 10), maxIndex());
        updateCarousel();
      });
      dotsWrap.appendChild(dot);
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', function () {
      if (currentIdx > 0) { currentIdx--; updateCarousel(); }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      if (currentIdx < maxIndex()) { currentIdx++; updateCarousel(); }
    });
  }

  window.addEventListener('resize', function () {
    currentIdx = Math.min(currentIdx, maxIndex());
    updateCarousel();
  });

  updateCarousel();

}); // end reviews DOMContentLoaded


/* ═══════════════════════════════════════════════════════════════
   VENUE MAP PICKER v3
   Uses Nominatim (OpenStreetMap) — 100% free, no API key
   Improved: finds cafes, malls, landmarks, stores, streets
═══════════════════════════════════════════════════════════════ */

(function () {

  /* ─── State ─── */
  var map            = null;
  var marker         = null;
  var debounceTimer  = null;
  var currentResults = [];
  var focusedIdx     = -1;
  var isPinned       = false;

  /* ─── Philippines bounds for search bias ─── */
  var PH_VIEWBOX = '116.0,4.5,127.0,21.5';
  var PH_CENTER  = [14.5995, 120.9842];  /* Metro Manila */
  var PH_ZOOM    = 12;
  var PIN_ZOOM   = 17;

  /* ─── DOM refs ─── */
  var searchInput, dropdown, spinner;
  var hiddenVenue, hiddenLat, hiddenLng;
  var selectedBar, selectedText, clearBtn, mapHint;

  /* ══════════════════════════════════
     PUBLIC: called every time modal opens
  ══════════════════════════════════ */
  function initVenueAutocomplete() {
    searchInput  = document.getElementById('bkVenueSearch');
    dropdown     = document.getElementById('bkVenueDropdown');
    spinner      = document.getElementById('bkVenueSpinner');
    hiddenVenue  = document.getElementById('bkVenue');
    hiddenLat    = document.getElementById('bkVenueLat');
    hiddenLng    = document.getElementById('bkVenueLng');
    selectedBar  = document.getElementById('bkVenueSelected');
    selectedText = document.getElementById('bkVenueSelectedText');
    clearBtn     = document.getElementById('bkVenueClear');
    mapHint      = document.getElementById('bkMapHint');

    if (!searchInput) return;

    /* Reset everything */
    isPinned = false;
    currentResults = [];
    focusedIdx = -1;
    clearHidden();
    if (selectedBar)  selectedBar.style.display = 'none';
    if (dropdown)     dropdown.style.display    = 'none';
    if (mapHint)      { mapHint.classList.remove('hidden'); mapHint.style.background = ''; }

    /* Fresh input element to remove old listeners */
    var fresh = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(fresh, searchInput);
    searchInput = fresh;
    searchInput.value = '';
    searchInput.addEventListener('input',   onType);
    searchInput.addEventListener('keydown', onKey);
    searchInput.addEventListener('blur', function () {
      setTimeout(function () { if (dropdown) dropdown.style.display = 'none'; }, 220);
    });

    /* Clear button */
    if (clearBtn) {
      var fc = clearBtn.cloneNode(true);
      clearBtn.parentNode.replaceChild(fc, clearBtn);
      clearBtn = fc;
      clearBtn.addEventListener('click', resetAll);
    }

    /* Close on outside click */
    document.addEventListener('click', function (e) {
      if (!dropdown) return;
      if (!dropdown.contains(e.target) && e.target !== searchInput) {
        dropdown.style.display = 'none';
      }
    });

    buildMap();
  }

  /* ══════════════════════════════════
     BUILD LEAFLET MAP
  ══════════════════════════════════ */
  function buildMap() {
    var el = document.getElementById('bkVenueMap');
    if (!el) return;

    if (map) { map.remove(); map = null; marker = null; }

    map = L.map('bkVenueMap', {
      center: PH_CENTER,
      zoom:   PH_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    /* Click on map = drop pin */
    map.on('click', function (e) {
      dropPin(e.latlng.lat, e.latlng.lng, true);
    });

    /* Invalidate after modal animation */
    setTimeout(function () {
      if (map) { map.invalidateSize(true); }
    }, 500);
  }

  /* ══════════════════════════════════
     DROP / MOVE PIN
  ══════════════════════════════════ */
  function makePinIcon() {
    return L.divIcon({
      className: '',
      html: [
        '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">',
        '<path d="M17 1C8.716 1 2 7.716 2 16c0 11.314 15 29 15 29S32 27.314 32 16C32 7.716 25.284 1 17 1z"',
        ' fill="#29a8e0" stroke="#ffffff" stroke-width="2.5"/>',
        '<circle cx="17" cy="16" r="6" fill="#ffffff"/>',
        '<circle cx="17" cy="16" r="3" fill="#0d3b56"/>',
        '</svg>',
      ].join(''),
      iconSize:    [34, 46],
      iconAnchor:  [17, 46],  /* bottom center of pin */
      popupAnchor: [0,  -46],
    });
  }

  function dropPin(lat, lng, doReverse) {
    if (!map) return;

    if (marker) {
      marker.setLatLng([lat, lng]);
    } else {
      marker = L.marker([lat, lng], {
        icon:      makePinIcon(),
        draggable: true,
      }).addTo(map);

      marker.on('drag', function () {
        var p = marker.getLatLng();
        /* Show live coords while dragging */
        if (hiddenVenue) hiddenVenue.value = p.lat.toFixed(6) + ', ' + p.lng.toFixed(6);
        if (selectedText) selectedText.textContent = 'Locating…';
        if (selectedBar)  selectedBar.style.display = 'flex';
      });

      marker.on('dragend', function () {
        var p = marker.getLatLng();
        reverseGeocode(p.lat, p.lng);
      });
    }

    map.flyTo([lat, lng], PIN_ZOOM, { duration: 0.7 });
    isPinned = true;
    if (mapHint) mapHint.classList.add('hidden');

    if (doReverse) {
      if (selectedText) selectedText.textContent = 'Locating…';
      if (selectedBar)  selectedBar.style.display = 'flex';
      reverseGeocode(lat, lng);
    }
  }

  /* ══════════════════════════════════
     SEARCH — Nominatim with POI support
  ══════════════════════════════════ */
  function onType() {
    var q = (searchInput.value || '').trim();

    if (isPinned) {
      isPinned = false;
      clearHidden();
      if (selectedBar) selectedBar.style.display = 'none';
    }

    if (q.length < 2) {
      if (dropdown) dropdown.style.display = 'none';
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () { doSearch(q); }, 350);
  }

  function doSearch(q) {
    if (spinner) spinner.style.display = 'flex';

    /*
     * Key Nominatim params for finding POIs (cafes, malls, landmarks):
     *
     * featuretype=          — don't restrict to just one type
     * addressdetails=1      — get full structured address
     * extratags=1           — get extra info like brand, cuisine, phone
     * namedetails=1         — get official name vs display name
     * viewbox=PH bounds     — bias to Philippines
     * bounded=0             — allow results outside viewbox as fallback
     * dedupe=1              — remove duplicates
     * limit=10              — more results
     *
     * We run TWO searches in parallel:
     * 1) Direct query — finds named places, malls, cafes by name
     * 2) Street query — finds street addresses
     * Then merge + deduplicate results.
     */

    var baseParams = [
      'format=json',
      'countrycodes=ph',
      'addressdetails=1',
      'extratags=1',
      'namedetails=1',
      'viewbox=' + PH_VIEWBOX,
      'bounded=0',
      'dedupe=1',
      'limit=8',
      'accept-language=en',
    ].join('&');

    var headers = { 'User-Agent': 'FroyoDiaries-Booking/3.0 (hello@froyodiaries.com)' };

    /* Search 1: general query — finds named POIs */
    var url1 = 'https://nominatim.openstreetmap.org/search?' + baseParams
             + '&q=' + encodeURIComponent(q);

    /* Search 2: same query with Philippines appended — improves local results */
    var url2 = 'https://nominatim.openstreetmap.org/search?' + baseParams
             + '&q=' + encodeURIComponent(q + ' Philippines');

    Promise.all([
      fetch(url1, { headers: headers }).then(function(r){ return r.json(); }).catch(function(){ return []; }),
      fetch(url2, { headers: headers }).then(function(r){ return r.json(); }).catch(function(){ return []; }),
    ]).then(function (all) {
      if (spinner) spinner.style.display = 'none';

      /* Merge and deduplicate by place_id */
      var seen = {};
      var merged = [];
      (all[0] || []).concat(all[1] || []).forEach(function (r) {
        if (!seen[r.place_id]) {
          seen[r.place_id] = true;
          merged.push(r);
        }
      });

      /* Sort: prefer results with a proper name (POIs) over raw addresses */
      merged.sort(function (a, b) {
        var aHasName = !!(a.namedetails && a.namedetails.name);
        var bHasName = !!(b.namedetails && b.namedetails.name);
        if (aHasName && !bHasName) return -1;
        if (!aHasName && bHasName) return 1;
        return 0;
      });

      currentResults = merged.slice(0, 8);
      renderDropdown(currentResults);
    });
  }

  /* ══════════════════════════════════
     REVERSE GEOCODE — pin drag / click
  ══════════════════════════════════ */
  function reverseGeocode(lat, lng) {
    var url = [
      'https://nominatim.openstreetmap.org/reverse',
      '?format=json',
      '&lat=', lat,
      '&lon=', lng,
      '&zoom=18',
      '&addressdetails=1',
      '&namedetails=1',
      '&accept-language=en',
    ].join('');

    fetch(url, {
      headers: { 'User-Agent': 'FroyoDiaries-Booking/3.0 (hello@froyodiaries.com)' }
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      /* Build clean readable address */
      var label = buildCleanAddress(data);
      savePin(lat, lng, label);
    })
    .catch(function () {
      savePin(lat, lng, lat.toFixed(5) + ', ' + lng.toFixed(5));
    });
  }

  /* ══════════════════════════════════
     RENDER DROPDOWN
  ══════════════════════════════════ */
  function renderDropdown(results) {
    if (!dropdown) return;
    dropdown.innerHTML = '';
    focusedIdx = -1;

    if (!results.length) {
      dropdown.innerHTML = [
        '<div class="venue-no-results">',
        'No places found. Try: <strong>SM Mall Bulacan</strong>, <strong>Jollibee Malolos</strong>, ',
        'or a street address. You can also click directly on the map.',
        '</div>',
      ].join('');
      dropdown.style.display = 'block';
      return;
    }

    results.forEach(function (r, i) {
      var info  = buildResultInfo(r);
      var opt   = document.createElement('div');
      opt.className = 'venue-option';

      /* Pick icon based on place type */
      var icon  = getTypeIcon(r);

      opt.innerHTML = [
        '<div class="venue-option__icon">', icon, '</div>',
        '<div class="venue-option__text">',
        '<span class="venue-option__name">', esc(info.name), '</span>',
        info.sub ? '<span class="venue-option__address">' + esc(info.sub) + '</span>' : '',
        info.tag ? '<span class="venue-option__tag">' + esc(info.tag) + '</span>' : '',
        '</div>',
      ].join('');

      opt.addEventListener('mousedown', function (e) {
        e.preventDefault();
        pickResult(r);
      });
      opt.addEventListener('mouseenter', function () { setFocus(i); });
      dropdown.appendChild(opt);
    });

    var footer = document.createElement('div');
    footer.className = 'venue-powered';
    footer.innerHTML = '© <a href="https://openstreetmap.org" target="_blank" style="color:inherit">OpenStreetMap</a> contributors';
    dropdown.appendChild(footer);
    dropdown.style.display = 'block';
  }

  /* ══════════════════════════════════
     PICK A SEARCH RESULT
  ══════════════════════════════════ */
  function pickResult(r) {
    var lat  = parseFloat(r.lat);
    var lng  = parseFloat(r.lon);
    var info = buildResultInfo(r);
    var label = info.full;

    if (dropdown) dropdown.style.display = 'none';
    if (searchInput) searchInput.value = '';

    dropPin(lat, lng, false);
    savePin(lat, lng, label);
  }

  /* ══════════════════════════════════
     SAVE PIN STATE
  ══════════════════════════════════ */
  function savePin(lat, lng, label) {
    isPinned = true;
    if (hiddenVenue)  hiddenVenue.value  = label;
    if (hiddenLat)    hiddenLat.value    = String(lat);
    if (hiddenLng)    hiddenLng.value    = String(lng);
    if (selectedText) selectedText.textContent = label;
    if (selectedBar)  selectedBar.style.display = 'flex';
    if (mapHint)      mapHint.classList.add('hidden');
  }

  function clearHidden() {
    ['bkVenue','bkVenueLat','bkVenueLng'].forEach(function(id){
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  function resetAll() {
    isPinned = false;
    clearHidden();
    if (selectedBar)  selectedBar.style.display = 'none';
    if (searchInput)  { searchInput.value = ''; searchInput.focus(); }
    if (dropdown)     dropdown.style.display = 'none';
    if (mapHint)      { mapHint.classList.remove('hidden'); mapHint.style.background = ''; }
    if (map)          map.flyTo(PH_CENTER, PH_ZOOM, { duration: 0.5 });
    if (marker)       { map.removeLayer(marker); marker = null; }
  }

  /* ══════════════════════════════════
     ADDRESS / LABEL BUILDERS
  ══════════════════════════════════ */
  function buildResultInfo(r) {
    var a  = r.address    || {};
    var nd = r.namedetails|| {};
    var et = r.extratags  || {};

    /* Primary name — prefer official name over display_name */
    var name = nd.name || a.amenity || a.shop || a.tourism || a.leisure
             || a.building || a.office || a.road || '';

    if (!name) {
      /* Fallback: first part of display_name */
      name = (r.display_name || '').split(',')[0].trim();
    }

    /* Secondary line — location context */
    var parts = [];
    if (a.road && a.road !== name)       parts.push(a.road);
    if (a.suburb || a.neighbourhood)     parts.push(a.suburb || a.neighbourhood);
    if (a.city || a.municipality || a.town || a.village)
      parts.push(a.city || a.municipality || a.town || a.village);
    if (a.province || a.state)           parts.push(a.province || a.state);
    var sub = parts.join(', ');

    /* Tag — category label e.g. "Restaurant", "Shopping Mall" */
    var tag = '';
    if (et.cuisine)        tag = 'Restaurant';
    else if (a.amenity)    tag = capitalize(a.amenity.replace(/_/g,' '));
    else if (a.shop)       tag = capitalize(a.shop.replace(/_/g,' '));
    else if (a.tourism)    tag = capitalize(a.tourism.replace(/_/g,' '));
    else if (a.leisure)    tag = capitalize(a.leisure.replace(/_/g,' '));
    else if (r.type === 'residential') tag = 'Residential';
    else if (r.type === 'road')        tag = 'Street';

    /* Full label for saving */
    var full = name;
    if (sub) full += ', ' + sub;

    return { name: name, sub: sub, tag: tag, full: full };
  }

  function buildCleanAddress(data) {
    /* Used for reverse geocode results */
    var a  = data.address    || {};
    var nd = data.namedetails|| {};

    var parts = [];
    var placeName = nd.name || a.amenity || a.shop || a.tourism || a.building || '';
    if (placeName)                          parts.push(placeName);
    if (a.house_number && a.road)           parts.push(a.house_number + ' ' + a.road);
    else if (a.road)                        parts.push(a.road);
    if (a.suburb || a.neighbourhood)        parts.push(a.suburb || a.neighbourhood);
    if (a.city || a.municipality || a.town) parts.push(a.city || a.municipality || a.town);
    if (a.province || a.state)              parts.push(a.province || a.state);

    return parts.length ? parts.join(', ') : (data.display_name || '');
  }

  /* ══════════════════════════════════
     TYPE ICONS
  ══════════════════════════════════ */
  function getTypeIcon(r) {
    var a  = r.address   || {};
    var et = r.extratags || {};

    /* Food / Restaurant */
    if (a.amenity === 'restaurant' || a.amenity === 'fast_food'
        || a.amenity === 'cafe' || et.cuisine) {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>';
    }
    /* Shopping / Mall */
    if (a.shop || a.amenity === 'marketplace' || a.amenity === 'mall') {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>';
    }
    /* School / Church / Government */
    if (a.amenity === 'school' || a.amenity === 'university'
        || a.amenity === 'place_of_worship' || a.amenity === 'townhall') {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
    }
    /* Hotel / Venue */
    if (a.tourism === 'hotel' || a.tourism === 'guest_house'
        || a.amenity === 'events_venue') {
      return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>';
    }
    /* Default: pin */
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  }

  /* ══════════════════════════════════
     KEYBOARD NAVIGATION
  ══════════════════════════════════ */
  function onKey(e) {
    if (!dropdown || dropdown.style.display === 'none') return;
    var opts = dropdown.querySelectorAll('.venue-option');
    if      (e.key === 'ArrowDown')  { e.preventDefault(); setFocus(Math.min(focusedIdx+1, opts.length-1)); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); setFocus(Math.max(focusedIdx-1, 0)); }
    else if (e.key === 'Enter')      { e.preventDefault(); if (focusedIdx>=0 && currentResults[focusedIdx]) pickResult(currentResults[focusedIdx]); }
    else if (e.key === 'Escape')     { dropdown.style.display = 'none'; }
  }

  function setFocus(idx) {
    focusedIdx = idx;
    var opts = dropdown ? dropdown.querySelectorAll('.venue-option') : [];
    opts.forEach(function(o,i){ o.classList.toggle('focused', i===idx); });
    if (opts[idx]) opts[idx].scrollIntoView({ block:'nearest' });
  }

  /* ══════════════════════════════════
     HELPERS
  ══════════════════════════════════ */
  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
  }

  function esc(s) {
    return String(s||'')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─── Public exports ─── */
  window._initVenueAutocomplete = initVenueAutocomplete;
  window._bkRefreshMap = function () { if (map) map.invalidateSize(true); };

})();
