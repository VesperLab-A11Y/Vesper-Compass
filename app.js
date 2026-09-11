// Vesper Compass — référentiel WCAG 2.2 public
// Glossaire bilingue des 87 critères de succès : « Ce que disent les WCAG », « En clair »,
// « Piste de correction », publics concernés, croisements EN 301 549 / RGAA / SGQRI 008 3.0.
// Reprend la structure de la version privée (compass-prive.html), sans les champs d'audit
// (erreur_type / impact_client), avec la couche i18n du modèle Library.
// Vanilla JS, aucune dépendance. Les données viennent de assets/wcag22-public.json (servi en HTTP).
(function () {
  'use strict';

  var NS = 'vesperlab-compass:';
  function lsGet(k) { try { return localStorage.getItem(NS + k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(NS + k, v); } catch (e) {} }

  var PRINCIPLE_ORDER = ['Perceivable', 'Operable', 'Understandable', 'Robust'];
  var PRINCIPLE_LETTER = { Perceivable: 'P', Operable: 'O', Understandable: 'U', Robust: 'R' };
  var PRINCIPLE_CLASS = { Perceivable: 'p', Operable: 'o', Understandable: 'u', Robust: 'r' };
  var LEVEL_RANK = { A: 1, AA: 2, AAA: 3 };
  var LEVEL_CLASS = { A: 'a', AA: 'aa', AAA: 'aaa' };
  // Ordre d'affichage des publics (l'énumération de la base n'est pas ordonnée).
  var TAG_ORDER = ['blind', 'low-vision', 'color-blind', 'deaf-hoh', 'motor', 'speech', 'cognitive', 'vestibular', 'photosensitive'];

  var REPORTS_KEY = 'reports';

  var state = {
    lang: 'fr', dict: null, theme: 'dark',
    data: [], q: '', fp: [], fl: [], fv: [], ft: [],
    sortKey: 'id', sortDir: 1,
    reportMode: false, selected: [], expanded: [], reports: []
  };

  /* ---------- utilitaires ---------- */
  function $(s) { return document.querySelector(s); }
  function $all(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Choix de langue pour un champ {fr, en} ; repli sur l'autre langue si vide.
  function L(field) {
    if (!field) return '';
    if (typeof field === 'string') return field;
    return field[state.lang] || field.fr || field.en || '';
  }
  function t(key) { return (state.dict && state.dict.ui[key] != null) ? state.dict.ui[key] : key; }
  function tf(key, vars) {
    var s = t(key);
    for (var k in vars) { if (vars.hasOwnProperty(k)) s = s.split('{' + k + '}').join(vars[k]); }
    return s;
  }
  function principleLabel(p) { return (state.dict && state.dict.principles[p]) || p; }
  function tagLabel(tag) { return (state.dict && state.dict.disabilityTags[tag]) || tag; }
  function numId(id) { return String(id).split('.').map(function (n) { return parseInt(n, 10) || 0; }); }
  function cmpId(a, b) {
    var x = numId(a), y = numId(b);
    for (var i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); }
    return 0;
  }
  function stamp() { return new Date().toISOString().slice(0, 10); }

  var toastEl = $('#toast');
  var toastTimer = null;
  function notify(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2800);
  }

  /* ---------- rapports en mémoire locale ---------- */
  function loadReports() {
    try { state.reports = JSON.parse(lsGet(REPORTS_KEY) || '[]'); } catch (e) { state.reports = []; }
  }
  function persistReports() {
    try { localStorage.setItem(NS + REPORTS_KEY, JSON.stringify(state.reports)); }
    catch (e) { notify(t('toastLocalDenied')); }
  }

  /* ---------- i18n ---------- */
  function loadDict(lang) {
    return fetch('i18n/' + lang + '.json').then(function (r) {
      if (!r.ok) throw new Error('i18n ' + lang + ' : ' + r.status);
      return r.json();
    });
  }
  function applyStaticI18n() {
    $all('[data-i18n]').forEach(function (el) {
      var v = state.dict.ui[el.getAttribute('data-i18n')];
      if (v != null) el.textContent = v;
    });
    $all('[data-i18n-attr]').forEach(function (el) {
      var parts = el.getAttribute('data-i18n-attr').split(':');
      var v = state.dict.ui[parts[1]];
      if (v != null) el.setAttribute(parts[0], v);
    });
  }
  function setLang(lang) {
    return loadDict(lang).then(function (dict) {
      state.lang = lang;
      state.dict = dict;
      applyStaticI18n();
      document.documentElement.lang = lang;
      document.title = dict.ui.pageTitle + ' — Vesper Compass';
      var b = $('#lang-toggle');
      if (b) b.textContent = dict.ui.langToggle;
      lsSet('lang', lang);
      renderFilters();
      renderAll();
    });
  }

  /* ---------- thème (3 états, comme Library) ---------- */
  function applyTheme(theme) {
    if (['system', 'dark', 'light'].indexOf(theme) < 0) theme = 'dark';
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    lsSet('theme', theme);
    var r = document.querySelector('input[name="theme"][value="' + theme + '"]');
    if (r) r.checked = true;
  }

  /* ---------- filtrage + tri ---------- */
  function filtered() {
    var q = state.q.trim().toLowerCase();
    var out = state.data.filter(function (c) {
      if (q) {
        var hay = (c.id + ' ' + c.name + ' ' + (c.name_fr || '') + ' ' + c.guidelineName).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      if (state.fp.length && state.fp.indexOf(c.principle) < 0) return false;
      if (state.fl.length && state.fl.indexOf(c.level) < 0) return false;
      if (state.fv.length && state.fv.indexOf(c.version) < 0) return false;
      if (state.ft.length) {
        var tags = c.disability_tags || [];
        var hit = state.ft.some(function (x) { return tags.indexOf(x) > -1; });
        if (!hit) return false;
      }
      return true;
    });
    var dir = state.sortDir, key = state.sortKey;
    out.sort(function (a, b) {
      if (key === 'level') { var d = (LEVEL_RANK[a.level] || 0) - (LEVEL_RANK[b.level] || 0); return d !== 0 ? d * dir : cmpId(a.id, b.id); }
      if (key === 'principle') { var d2 = PRINCIPLE_ORDER.indexOf(a.principle) - PRINCIPLE_ORDER.indexOf(b.principle); return d2 !== 0 ? d2 * dir : cmpId(a.id, b.id); }
      return cmpId(a.id, b.id) * dir;
    });
    return out;
  }

  function selectedCriteria() {
    return state.data.filter(function (c) { return state.selected.indexOf(c.id) > -1; });
  }

  function buildGroups() {
    var items = selectedCriteria();
    var groups = [];
    PRINCIPLE_ORDER.forEach(function (pk) {
      var inP = items.filter(function (c) { return c.principle === pk; });
      if (!inP.length) return;
      var gids = [];
      inP.forEach(function (c) { if (gids.indexOf(c.guidelineId) < 0) gids.push(c.guidelineId); });
      gids.sort(cmpId);
      groups.push({
        key: pk,
        guidelines: gids.map(function (gid) {
          var gitems = inP.filter(function (c) { return c.guidelineId === gid; }).sort(function (a, b) { return cmpId(a.id, b.id); });
          return { gid: gid, gname: gitems[0].guidelineName, items: gitems };
        })
      });
    });
    return groups;
  }

  /* ---------- rendu : filtres ---------- */
  function makeCheck(key, val, label) {
    var lbl = document.createElement('label');
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state[key].indexOf(val) > -1;
    cb.addEventListener('change', function () {
      var cur = state[key];
      state[key] = cb.checked ? cur.concat([val]) : cur.filter(function (v) { return v !== val; });
      renderTable();
    });
    lbl.appendChild(cb);
    lbl.appendChild(document.createTextNode(' ' + label));
    return lbl;
  }
  function renderFilters() {
    if (!state.data.length) return;
    var versions = [];
    state.data.forEach(function (c) { if (versions.indexOf(c.version) < 0) versions.push(c.version); });
    versions.sort();
    var tagsPresent = TAG_ORDER.filter(function (tag) {
      return state.data.some(function (c) { return (c.disability_tags || []).indexOf(tag) > -1; });
    });

    var pEl = $('#filterPrinciple'); pEl.innerHTML = '';
    PRINCIPLE_ORDER.forEach(function (pk) { pEl.appendChild(makeCheck('fp', pk, principleLabel(pk))); });

    var lEl = $('#filterLevel'); lEl.innerHTML = '';
    ['A', 'AA', 'AAA'].forEach(function (l) { lEl.appendChild(makeCheck('fl', l, l)); });

    var vEl = $('#filterVersion'); vEl.innerHTML = '';
    versions.forEach(function (v) { vEl.appendChild(makeCheck('fv', v, 'WCAG ' + v)); });

    var tEl = $('#filterDisability'); tEl.innerHTML = '';
    tagsPresent.forEach(function (tag) { tEl.appendChild(makeCheck('ft', tag, tagLabel(tag))); });
  }

  /* ---------- rendu : fiche dépliée ---------- */
  function ficheHtml(c) {
    var parts = [];
    var pcls = PRINCIPLE_CLASS[c.principle] || 'p';
    var lcls = LEVEL_CLASS[c.level] || 'a';

    parts.push('<div class="fiche">');

    parts.push('<div>' +
      '<a href="' + esc(c.url) + '" target="_blank" rel="noreferrer">' + esc(c.id) + '</a> · ' +
      esc(c.name) +
      (c.name_fr ? ' <span class="sc-name-fr">' + esc(c.name_fr) + '</span>' : '') +
      ' <span class="badge badge--' + lcls + '">' + esc(c.level) + '</span>' +
      ' <span class="badge badge--' + pcls + '">' + esc(principleLabel(c.principle)) + '</span>' +
      ' · <span class="sc-name-fr">' + esc(c.guidelineId + ' ' + c.guidelineName) + ' · WCAG ' + esc(c.version) + '</span>' +
      '</div>');

    var descr = L(c.description);
    if (descr) parts.push('<div><h4>' + esc(t('ficheStandard')) + '</h4><p>' + esc(descr) + '</p></div>');

    var plain = L(c.plain);
    if (plain) parts.push('<div><h4>' + esc(t('fichePlain')) + '</h4><p>' + esc(plain) + '</p></div>');

    var rem = L(c.remediation);
    if (rem) parts.push('<div><h4>' + esc(t('ficheRemediation')) + '</h4><p>' + esc(rem) + '</p></div>');

    var tags = (c.disability_tags || []).slice().sort(function (a, b) {
      return TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b);
    });
    if (tags.length) {
      parts.push('<div><h4>' + esc(t('ficheConcerne')) + '</h4><div class="concerne">' +
        tags.map(function (tag) { return '<span class="tag">' + esc(tagLabel(tag)) + '</span>'; }).join('') +
        '</div></div>');
    }

    var xr = c.xref || {};
    var chips = [];
    if ((xr.en301549 || []).length) chips.push('<span class="xref-chip">' + esc(t('xrefEn301549')) + ' : ' + esc(xr.en301549.join(', ')) + '</span>');
    if ((xr.rgaa || []).length) chips.push('<span class="xref-chip">' + esc(t('xrefRgaa')) + ' : ' + esc(xr.rgaa.join(', ')) + '</span>');
    if ((xr.qc || []).length) chips.push('<span class="xref-chip">' + esc(t('xrefQc')) + ' · ' + esc(t('xrefQcShort')) + '</span>');
    var note = L(c.xref_note);
    if (chips.length || note) {
      parts.push('<div><h4>' + esc(t('ficheReferentiels')) + '</h4>' +
        (chips.length ? '<div class="xref-list">' + chips.join('') + '</div>' : '') +
        (note ? '<p class="xref-note">' + esc(note) + '</p>' : '') +
        '</div>');
    }

    parts.push('<div class="src-links">' +
      '<a href="' + esc(c.url) + '" target="_blank" rel="noreferrer">' + esc(t('linkSpec')) + '</a>' +
      '<a href="' + esc(c.understandingUrl) + '" target="_blank" rel="noreferrer">' + esc(t('linkUnderstanding')) + '</a>' +
      '</div>');

    parts.push('</div>');
    return parts.join('');
  }

  /* ---------- rendu : table ---------- */
  function renderTable() {
    var list = filtered();
    var tbody = $('#tbody');
    tbody.innerHTML = '';
    $('#selHead').hidden = !state.reportMode;

    list.forEach(function (c) {
      var tr = document.createElement('tr');
      var isSel = state.selected.indexOf(c.id) > -1;
      var isOpen = state.expanded.indexOf(c.id) > -1;

      if (state.reportMode) {
        var selTd = document.createElement('td');
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = isSel;
        cb.setAttribute('aria-label', c.id + ' ' + c.name);
        cb.addEventListener('change', function () {
          var cur = state.selected;
          state.selected = cb.checked ? cur.concat([c.id]) : cur.filter(function (v) { return v !== c.id; });
          syncSelectionDependents();
        });
        selTd.appendChild(cb);
        tr.appendChild(selTd);
      }

      var idTd = document.createElement('td');
      idTd.innerHTML = '<a href="' + esc(c.url) + '" target="_blank" rel="noreferrer">' + esc(c.id) + '</a>';
      tr.appendChild(idTd);

      var nameTd = document.createElement('td');
      var nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'row-name-btn';
      nameBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      nameBtn.innerHTML = '<span class="twisty" aria-hidden="true">' + (isOpen ? '−' : '+') + '</span>' +
        esc(state.lang === 'fr' && c.name_fr ? c.name_fr : c.name);
      nameBtn.addEventListener('click', function () {
        var cur = state.expanded;
        state.expanded = isOpen ? cur.filter(function (v) { return v !== c.id; }) : cur.concat([c.id]);
        renderTable();
      });
      nameTd.appendChild(nameBtn);
      tr.appendChild(nameTd);

      var levelTd = document.createElement('td');
      levelTd.innerHTML = '<span class="badge badge--' + (LEVEL_CLASS[c.level] || 'a') + '">' + esc(c.level) + '</span>';
      tr.appendChild(levelTd);

      var verTd = document.createElement('td');
      verTd.textContent = 'WCAG ' + c.version;
      verTd.style.color = 'var(--text-muted)';
      tr.appendChild(verTd);

      var pTd = document.createElement('td');
      pTd.innerHTML = '<span class="badge badge--' + (PRINCIPLE_CLASS[c.principle] || 'p') + '">' + esc(principleLabel(c.principle)) + '</span>';
      tr.appendChild(pTd);

      var glTd = document.createElement('td');
      glTd.textContent = c.guidelineId + ' ' + c.guidelineName;
      glTd.style.color = 'var(--text-muted)';
      tr.appendChild(glTd);

      tbody.appendChild(tr);

      if (isOpen) {
        var ficheTr = document.createElement('tr');
        ficheTr.className = 'fiche-row';
        var ficheTd = document.createElement('td');
        ficheTd.colSpan = tr.children.length;
        var box = document.createElement('div');
        box.innerHTML = ficheHtml(c);
        ficheTd.appendChild(box.firstChild);
        ficheTr.appendChild(ficheTd);
        tbody.appendChild(ficheTr);
      }
    });

    $('#noResults').hidden = !(state.data.length > 0 && list.length === 0);
    $('#resultLine').textContent = tf('resultLine', { n: list.length, total: state.data.length });
    updateSortArrows();
  }

  function updateSortArrows() {
    ['Id', 'Level', 'Principle'].forEach(function (k) {
      var key = k.toLowerCase();
      $('#arr' + k).textContent = state.sortKey === key ? (state.sortDir === 1 ? '▲' : '▼') : '';
    });
  }

  function renderCounts() {
    $('#datasetCount').textContent = state.data.length ? tf('datasetCount', { n: state.data.length }) : t('datasetLoading');
    var sc = $('#selectionCount');
    sc.hidden = !state.reportMode;
    sc.textContent = tf('selectionCount', { n: state.selected.length });
    $('#reportHeading').textContent = tf('reportHeading', { n: state.selected.length });
  }

  /* ---------- rendu : rapport ---------- */
  function renderReport() {
    var groups = buildGroups();
    var root = $('#reportPanel');
    root.innerHTML = '';
    $('#noSelection').hidden = state.selected.length > 0;

    groups.forEach(function (g) {
      var section = document.createElement('section');
      var h3 = document.createElement('h3');
      h3.className = 'badge--' + (PRINCIPLE_CLASS[g.key] || 'p');
      h3.style.color = 'inherit';
      h3.textContent = PRINCIPLE_LETTER[g.key] + ' · ' + principleLabel(g.key);
      section.appendChild(h3);

      g.guidelines.forEach(function (gl) {
        var box = document.createElement('div');
        box.className = 'guideline-group';
        var h4 = document.createElement('h4');
        h4.textContent = gl.gid + ' ' + gl.gname;
        box.appendChild(h4);
        var ul = document.createElement('ul');
        gl.items.forEach(function (c) {
          var li = document.createElement('li');
          var idSpan = document.createElement('span');
          idSpan.className = 'id';
          idSpan.textContent = c.id;
          var nameSpan = document.createElement('span');
          nameSpan.className = 'nm';
          nameSpan.textContent = state.lang === 'fr' && c.name_fr ? c.name_fr : c.name;
          var lvlSpan = document.createElement('span');
          lvlSpan.className = 'badge badge--' + (LEVEL_CLASS[c.level] || 'a');
          lvlSpan.textContent = c.level;
          var rmBtn = document.createElement('button');
          rmBtn.type = 'button';
          rmBtn.className = 'remove-btn';
          rmBtn.setAttribute('aria-label', c.id + ' ' + c.name);
          rmBtn.textContent = '×';
          rmBtn.addEventListener('click', function () {
            state.selected = state.selected.filter(function (v) { return v !== c.id; });
            renderAll();
          });
          li.appendChild(idSpan); li.appendChild(nameSpan); li.appendChild(lvlSpan); li.appendChild(rmBtn);
          ul.appendChild(li);
        });
        box.appendChild(ul);
        section.appendChild(box);
      });
      root.appendChild(section);
    });
  }

  /* ---------- rendu : sauvegardes ---------- */
  function renderSaves() {
    var q = ($('#savedQuery').value || '').trim().toLowerCase();
    var listEl = $('#savesList');
    listEl.innerHTML = '';
    var matched = state.reports.filter(function (r) { return !q || String(r.nom || '').toLowerCase().indexOf(q) > -1; });
    $('#noSaves').hidden = matched.length > 0;

    matched.forEach(function (r) {
      var realIdx = state.reports.indexOf(r);
      var row = document.createElement('div');
      row.className = 'save-row';
      var meta = document.createElement('div');
      meta.className = 'meta';
      var loc = state.lang === 'fr' ? 'fr-CA' : 'en-CA';
      meta.innerHTML = '<div class="save-name">' + esc(r.nom) + '</div>' +
        '<div class="save-sub">' + (r.critereIds || []).length + ' · ' + esc(new Date(r.date).toLocaleString(loc)) + '</div>';
      row.appendChild(meta);

      var loadBtn = document.createElement('button');
      loadBtn.type = 'button'; loadBtn.className = 'btn';
      loadBtn.textContent = t('saveReload');
      loadBtn.addEventListener('click', function () {
        state.selected = (r.critereIds || []).slice();
        state.reportMode = true;
        $('#reportModeBtn').setAttribute('aria-pressed', 'true');
        $('#reportModeBtn').textContent = t('reportModeBtnActive');
        setTab('report');
        notify(tf('toastReportLoaded', { name: r.nom }));
        renderAll();
      });
      row.appendChild(loadBtn);

      var delBtn = document.createElement('button');
      delBtn.type = 'button'; delBtn.className = 'btn danger';
      delBtn.textContent = t('saveDelete');
      delBtn.addEventListener('click', function () {
        state.reports.splice(realIdx, 1);
        persistReports();
        notify(t('toastReportDeleted'));
        renderSaves();
      });
      row.appendChild(delBtn);

      listEl.appendChild(row);
    });
  }

  function syncSelectionDependents() {
    renderReport();
    renderCounts();
    ['exportCsvBtn', 'exportPdfBtn', 'saveBtn', 'clearBtn'].forEach(function (id) {
      $('#' + id).disabled = !state.selected.length;
    });
  }

  function renderAll() {
    renderTable();
    renderReport();
    renderSaves();
    renderCounts();
    ['exportCsvBtn', 'exportPdfBtn', 'saveBtn', 'clearBtn'].forEach(function (id) {
      $('#' + id).disabled = !state.selected.length;
    });
  }

  /* ---------- onglets ---------- */
  function setTab(name) {
    ['table', 'report', 'saves'].forEach(function (k) {
      $('#panel-' + k).classList.toggle('active', k === name);
      $('#tab-' + k).setAttribute('aria-selected', k === name ? 'true' : 'false');
    });
  }

  /* ---------- exports ---------- */
  function reportRows() {
    var rows = [];
    buildGroups().forEach(function (g) {
      g.guidelines.forEach(function (gl) {
        gl.items.forEach(function (c) { rows.push(c); });
      });
    });
    return rows;
  }
  function exportCsv() {
    var cols = [t('colId'), t('colName'), t('colLevel'), t('colPrinciple'), t('colGuideline'), 'URL', t('ficheStandard'), t('fichePlain'), t('ficheRemediation')];
    var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
    var lines = [cols.map(q).join(';')];
    reportRows().forEach(function (c) {
      lines.push([
        c.id, (state.lang === 'fr' && c.name_fr ? c.name_fr : c.name), c.level,
        principleLabel(c.principle), c.guidelineId + ' ' + c.guidelineName, c.url,
        L(c.description), L(c.plain), L(c.remediation)
      ].map(q).join(';'));
    });
    var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'VesperLab-Compass-' + stamp() + '-' + state.lang.toUpperCase() + '.csv';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    notify(tf('toastCsv', { n: lines.length - 1 }));
  }
  function exportPdf() {
    var loc = state.lang === 'fr' ? 'fr-CA' : 'en-CA';
    var html = '<h1>' + esc(t('pageTitle')) + '</h1>';
    html += '<p>Vesper Lab · ' + state.selected.length + ' · ' + esc(new Date().toLocaleDateString(loc)) + '</p>';
    buildGroups().forEach(function (g) {
      html += '<h2>' + esc(PRINCIPLE_LETTER[g.key] + ' · ' + principleLabel(g.key)) + '</h2>';
      g.guidelines.forEach(function (gl) {
        html += '<h3>' + esc(gl.gid + ' ' + gl.gname) + '</h3>';
        gl.items.forEach(function (c) {
          html += '<p><strong>' + esc(c.id + ' · ' + (state.lang === 'fr' && c.name_fr ? c.name_fr : c.name) + ' (' + c.level + ')') + '</strong><br>';
          if (L(c.description)) html += esc(t('ficheStandard')) + ' : ' + esc(L(c.description)) + '<br>';
          if (L(c.plain)) html += esc(t('fichePlain')) + ' : ' + esc(L(c.plain)) + '<br>';
          if (L(c.remediation)) html += esc(t('ficheRemediation')) + ' : ' + esc(L(c.remediation));
          html += '</p>';
        });
      });
    });
    $('#print-root').innerHTML = html;
    window.print();
  }

  /* ---------- liaisons ---------- */
  function bind() {
    ['table', 'report', 'saves'].forEach(function (k) {
      $('#tab-' + k).addEventListener('click', function () { setTab(k); });
    });
    $('#q').addEventListener('input', function (e) { state.q = e.target.value; renderTable(); });
    $('#resetFiltersBtn').addEventListener('click', function () {
      state.q = ''; state.fp = []; state.fl = []; state.fv = []; state.ft = [];
      $('#q').value = '';
      renderFilters(); renderTable();
    });
    $('#reportModeBtn').addEventListener('click', function () {
      state.reportMode = !state.reportMode;
      $('#reportModeBtn').setAttribute('aria-pressed', state.reportMode ? 'true' : 'false');
      $('#reportModeBtn').textContent = state.reportMode ? t('reportModeBtnActive') : t('reportModeBtn');
      renderTable();
      renderCounts();
    });
    function sortBy(key) {
      if (state.sortKey === key) { state.sortDir *= -1; } else { state.sortKey = key; state.sortDir = 1; }
      renderTable();
    }
    $('#sortId').addEventListener('click', function () { sortBy('id'); });
    $('#sortLevel').addEventListener('click', function () { sortBy('level'); });
    $('#sortPrinciple').addEventListener('click', function () { sortBy('principle'); });

    $('#exportCsvBtn').addEventListener('click', exportCsv);
    $('#exportPdfBtn').addEventListener('click', exportPdf);
    $('#saveBtn').addEventListener('click', function () {
      var name = ($('#saveName').value || '').trim();
      if (!name) { notify(t('toastSaveNeedsName')); return; }
      state.reports.unshift({ nom: name, date: new Date().toISOString(), critereIds: state.selected.slice() });
      persistReports();
      $('#saveName').value = '';
      notify(tf('toastReportSaved', { name: name }));
      renderSaves();
    });
    $('#clearBtn').addEventListener('click', function () {
      if (state.selected.length && !window.confirm(t('confirmClear'))) return;
      state.selected = [];
      notify(t('toastSelectionCleared'));
      renderAll();
    });
    $('#savedQuery').addEventListener('input', renderSaves);

    $('#lang-toggle').addEventListener('click', function () {
      var next = state.lang === 'fr' ? 'en' : 'fr';
      setLang(next).catch(function () { setLang('fr'); });
    });
    $all('input[name="theme"]').forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) applyTheme(r.value); });
    });
  }

  /* ---------- démarrage ---------- */
  loadReports();
  applyTheme(lsGet('theme') || 'dark');
  bind();
  var wantLang = lsGet('lang') || ((navigator.language || '').toLowerCase().indexOf('en') === 0 ? 'en' : 'fr');

  setLang(wantLang)
    .catch(function () { return setLang('fr'); })
    .then(function () {
      return fetch('assets/wcag22-public.json').then(function (r) {
        if (!r.ok) throw new Error('data ' + r.status);
        return r.json();
      });
    })
    .then(function (data) {
      state.data = data;
      renderFilters();
      renderAll();
    })
    .catch(function () { notify(t('toastDataError')); });
})();
