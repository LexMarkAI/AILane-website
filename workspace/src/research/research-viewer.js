/**
 * RESEARCH VIEWER — KLUI-001 §3.5
 * Three viewer modes: Statute, Training, Requirement detail.
 * Copy to Clipboard/Notes with source attribution.
 * Forward intelligence amber markers (FWD-001).
 * OGL attribution (KLTR-001 §4.5).
 */

var SUPABASE_URL = 'https://cnbsxwtvazfvzmltkuvx.supabase.co';
var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuYnN4d3R2YXpmdnptbHRrdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE1NDQ5MDIsImV4cCI6MjA1NzEyMDkwMn0.LMfOjHp97P9MKaOeaK3GI2JCQ7kj5Kxpuq6llLD-1H0';

var _container = null;
var _bus = null;

function _authHeaders() {
  var user = window.__ailaneUser;
  return {
    'Authorization': 'Bearer ' + user.token,
    'apikey': ANON_KEY,
    'Content-Type': 'application/json'
  };
}

// Simple HTML sanitiser — strip script tags and event handlers
function _sanitiseHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
}

function _renderSection(parent, title, content) {
  if (!content) return;
  var section = document.createElement('div');
  section.className = 'ws-research-viewer-section';

  var titleEl = document.createElement('div');
  titleEl.className = 'ws-research-viewer-section-title';
  titleEl.textContent = title;
  section.appendChild(titleEl);

  var textEl = document.createElement('div');
  textEl.className = 'ws-research-viewer-text';
  textEl.textContent = content;
  section.appendChild(textEl);

  parent.appendChild(section);
}

function _renderActionBar(parent, contentText, title, sourceRef, type) {
  var bar = document.createElement('div');
  bar.className = 'ws-research-action-bar';

  // Copy with Attribution
  var copyBtn = document.createElement('button');
  copyBtn.className = 'ws-research-action-btn';
  copyBtn.textContent = 'Copy with Attribution';
  copyBtn.setAttribute('aria-label', 'Copy content with source attribution');
  copyBtn.addEventListener('click', function() {
    var attributed = contentText + '\n\nSource: ' + (sourceRef || title);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(attributed);
    }
    if (_bus) {
      _bus.emit('clip:added', {
        content: attributed,
        source: 'Research Panel \u2014 ' + title,
        type: type
      });
    }
  });
  bar.appendChild(copyBtn);

  // Add to Notes
  var notesBtn = document.createElement('button');
  notesBtn.className = 'ws-research-action-btn';
  notesBtn.textContent = 'Add to Notes';
  notesBtn.setAttribute('aria-label', 'Add content to Notes panel');
  notesBtn.addEventListener('click', function() {
    if (_bus) {
      _bus.emit('content:copy', {
        content: contentText,
        sourceAttribution: '[' + (type === 'statute' ? 'Statute' : type === 'training' ? 'Training' : 'Requirement') + ' \u2014 ' + title + ' \u2014 ' + (sourceRef || '') + ']',
        format: 'text'
      });
    }
  });
  bar.appendChild(notesBtn);

  parent.appendChild(bar);
}

async function createStatuteViewer(container, item, bus) {
  _container = container;
  _bus = bus;
  container.innerHTML = '';

  var viewer = document.createElement('div');
  viewer.className = 'ws-research-viewer';

  // Forward intelligence banner
  if (item.lifecycle_stage && item.lifecycle_stage !== 'in_force') {
    var fwdBanner = document.createElement('div');
    fwdBanner.className = 'ws-research-forward-banner';
    fwdBanner.textContent = 'This legislation is not yet in force. Commencement date: ' + (item.commencement_date || 'To be confirmed') + '.';
    viewer.appendChild(fwdBanner);
  }

  // Header
  var header = document.createElement('div');
  header.className = 'ws-research-viewer-header';

  var titleEl = document.createElement('div');
  titleEl.className = 'ws-research-viewer-title';
  titleEl.textContent = item.short_title || 'Untitled';
  header.appendChild(titleEl);

  var metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;';

  if (item.legislation_type) {
    var typeBadge = document.createElement('span');
    typeBadge.className = 'ws-research-badge ws-research-badge--primary';
    typeBadge.textContent = item.legislation_type.replace(/_/g, ' ');
    metaRow.appendChild(typeBadge);
  }

  if (item.lifecycle_stage) {
    var stageBadge = document.createElement('span');
    var stageClass = item.lifecycle_stage === 'in_force' ? 'ws-research-badge--primary' : 'ws-research-badge--forward';
    stageBadge.className = 'ws-research-badge ' + stageClass;
    stageBadge.textContent = item.lifecycle_stage.replace(/_/g, ' ');
    metaRow.appendChild(stageBadge);
  }

  if (item.tier_access && item.tier_access === 'governance') {
    var tierBadge = document.createElement('span');
    tierBadge.className = 'ws-research-badge ws-research-badge--code';
    tierBadge.textContent = 'Governance+';
    metaRow.appendChild(tierBadge);
  }

  header.appendChild(metaRow);
  viewer.appendChild(header);

  // Fetch full details if needed
  var fullItem = item;
  if (!item.key_provisions && item.id) {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/legislation_library?id=eq.' + item.id + '&select=*',
        { headers: _authHeaders() }
      );
      var data = await res.json();
      if (data && data.length > 0) fullItem = data[0];
    } catch (e) {
      console.error('[ResearchViewer] Fetch error:', e);
    }
  }

  // Content sections
  _renderSection(viewer, 'Summary', fullItem.summary);
  _renderSection(viewer, 'Key Provisions', fullItem.key_provisions);
  _renderSection(viewer, 'Obligations Summary', fullItem.obligations_summary);
  _renderSection(viewer, 'Enforcement Mechanism', fullItem.enforcement_mechanism);
  _renderSection(viewer, 'Penalty Summary', fullItem.penalty_summary);

  // Source attribution
  if (fullItem.legislation_gov_url) {
    var sourceEl = document.createElement('div');
    sourceEl.className = 'ws-research-viewer-section';
    sourceEl.innerHTML = '<div class="ws-research-viewer-section-title">Source</div>' +
      '<div class="ws-research-viewer-text" style="word-break:break-all;">' + fullItem.legislation_gov_url + '</div>';
    viewer.appendChild(sourceEl);
  }

  // Related legislation
  if (fullItem.related_legislation && fullItem.related_legislation.length > 0) {
    var relSection = document.createElement('div');
    relSection.className = 'ws-research-viewer-section';
    var relTitle = document.createElement('div');
    relTitle.className = 'ws-research-viewer-section-title';
    relTitle.textContent = 'Related Legislation';
    relSection.appendChild(relTitle);

    var relChips = document.createElement('div');
    relChips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    fullItem.related_legislation.forEach(function(rel) {
      var chip = document.createElement('span');
      chip.className = 'ws-research-badge ws-research-badge--si';
      chip.textContent = rel;
      relChips.appendChild(chip);
    });
    relSection.appendChild(relChips);
    viewer.appendChild(relSection);
  }

  // ACEI category tags
  if (fullItem.acei_categories && fullItem.acei_categories.length > 0) {
    var catSection = document.createElement('div');
    catSection.className = 'ws-research-viewer-section';
    var catTitle = document.createElement('div');
    catTitle.className = 'ws-research-viewer-section-title';
    catTitle.textContent = 'ACEI Categories';
    catSection.appendChild(catTitle);

    var catChips = document.createElement('div');
    catChips.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';
    fullItem.acei_categories.forEach(function(c) {
      var chip = document.createElement('span');
      chip.className = 'ws-research-badge ws-research-badge--primary';
      chip.textContent = c;
      catChips.appendChild(chip);
    });
    catSection.appendChild(catChips);
    viewer.appendChild(catSection);
  }

  container.appendChild(viewer);

  // Emit statute:viewed signal
  if (bus) {
    bus.emit('statute:viewed', {
      statuteRef: fullItem.short_title,
      sectionId: fullItem.id,
      title: fullItem.short_title
    });
  }

  // Action bar
  var contentText = [fullItem.summary, fullItem.key_provisions, fullItem.obligations_summary].filter(Boolean).join('\n\n');
  _renderActionBar(container, contentText, fullItem.short_title || '', fullItem.legislation_gov_url || '', 'statute');
}

async function createTrainingViewer(container, item, bus) {
  _container = container;
  _bus = bus;
  container.innerHTML = '';

  var viewer = document.createElement('div');
  viewer.className = 'ws-research-viewer';

  // Header
  var header = document.createElement('div');
  header.className = 'ws-research-viewer-header';

  var titleEl = document.createElement('div');
  titleEl.className = 'ws-research-viewer-title';
  titleEl.textContent = item.title || 'Untitled';
  header.appendChild(titleEl);

  var metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center;';

  if (item.content_type) {
    var typeBadge = document.createElement('span');
    typeBadge.className = 'ws-research-badge ws-research-badge--guide';
    typeBadge.textContent = item.content_type.replace(/_/g, ' ');
    metaRow.appendChild(typeBadge);
  }

  if (item.publisher_body) {
    var pubEl = document.createElement('span');
    pubEl.style.cssText = 'font-size:12px;color:#94a3b8;';
    pubEl.textContent = item.publisher_body;
    metaRow.appendChild(pubEl);
  }

  if (item.estimated_read_minutes) {
    var readEl = document.createElement('span');
    readEl.style.cssText = 'font-size:12px;color:#64748b;';
    readEl.textContent = item.estimated_read_minutes + ' min read';
    metaRow.appendChild(readEl);
  }

  header.appendChild(metaRow);
  viewer.appendChild(header);

  // Fetch full content
  var fullItem = item;
  if (!item.content_html && item.id) {
    try {
      var res = await fetch(
        SUPABASE_URL + '/rest/v1/kl_training_resources?id=eq.' + item.id + '&select=*',
        { headers: _authHeaders() }
      );
      var data = await res.json();
      if (data && data.length > 0) fullItem = data[0];
    } catch (e) {
      console.error('[ResearchViewer] Training fetch error:', e);
    }
  }

  // Content
  if (fullItem.content_html) {
    var contentSection = document.createElement('div');
    contentSection.className = 'ws-research-viewer-section';
    var contentEl = document.createElement('div');
    contentEl.className = 'ws-research-viewer-text';
    contentEl.innerHTML = _sanitiseHtml(fullItem.content_html);
    contentSection.appendChild(contentEl);
    viewer.appendChild(contentSection);
  }

  // Attribution
  if (fullItem.publisher_body || fullItem.attribution_statement) {
    var attrSection = document.createElement('div');
    attrSection.className = 'ws-research-viewer-section';
    var attrTitle = document.createElement('div');
    attrTitle.className = 'ws-research-viewer-section-title';
    attrTitle.textContent = 'Attribution';
    attrSection.appendChild(attrTitle);

    var attrText = document.createElement('div');
    attrText.className = 'ws-research-viewer-text';
    attrText.textContent = fullItem.attribution_statement || fullItem.publisher_body || '';
    attrSection.appendChild(attrText);

    if (fullItem.source_licence) {
      var licBadge = document.createElement('span');
      licBadge.className = 'ws-research-badge ws-research-badge--guide';
      licBadge.style.marginTop = '8px';
      licBadge.style.display = 'inline-block';
      licBadge.textContent = fullItem.source_licence.toUpperCase();
      attrSection.appendChild(licBadge);
    }

    viewer.appendChild(attrSection);
  }

  // OGL notice for ogl_v3 licensed content
  if (fullItem.source_licence === 'ogl_v3') {
    var oglNotice = document.createElement('div');
    oglNotice.className = 'ws-research-ogl-notice';
    oglNotice.textContent = 'Contains public sector information licensed under the Open Government Licence v3.0.';
    viewer.appendChild(oglNotice);
  }

  container.appendChild(viewer);

  // Action bar
  var contentText = fullItem.content_html ? fullItem.content_html.replace(/<[^>]+>/g, '') : (fullItem.title || '');
  _renderActionBar(container, contentText, fullItem.title || '', fullItem.publisher_body || '', 'training');
}

function createRequirementViewer(container, item, bus) {
  _container = container;
  _bus = bus;
  container.innerHTML = '';

  var viewer = document.createElement('div');
  viewer.className = 'ws-research-viewer';

  // Forward indicator
  if (item.is_forward_requirement) {
    var fwdBanner = document.createElement('div');
    fwdBanner.className = 'ws-research-forward-banner';
    var fwdText = 'This is a forward requirement.';
    if (item.effective_from) fwdText += ' Effective from: ' + item.effective_from + '.';
    if (item.commencement_status) fwdText += ' Status: ' + item.commencement_status + '.';
    fwdBanner.textContent = fwdText;
    viewer.appendChild(fwdBanner);
  }

  // Header
  var header = document.createElement('div');
  header.className = 'ws-research-viewer-header';

  var titleEl = document.createElement('div');
  titleEl.className = 'ws-research-viewer-title';
  titleEl.textContent = item.name || 'Untitled';
  header.appendChild(titleEl);

  var metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;';

  if (item.category) {
    var catBadge = document.createElement('span');
    catBadge.className = 'ws-research-badge ws-research-badge--primary';
    catBadge.textContent = item.category.replace(/_/g, ' ');
    metaRow.appendChild(catBadge);
  }

  if (item.applies_to) {
    var appliesBadge = document.createElement('span');
    appliesBadge.className = 'ws-research-badge ws-research-badge--si';
    appliesBadge.textContent = item.applies_to;
    metaRow.appendChild(appliesBadge);
  }

  if (item.is_forward_requirement) {
    var fwdBadge = document.createElement('span');
    fwdBadge.className = 'ws-research-badge ws-research-badge--forward';
    fwdBadge.textContent = 'Forward';
    metaRow.appendChild(fwdBadge);
  }

  header.appendChild(metaRow);
  viewer.appendChild(header);

  // Description
  _renderSection(viewer, 'Description', item.description);

  // Statutory basis
  if (item.source) {
    var sourceSection = document.createElement('div');
    sourceSection.className = 'ws-research-viewer-section';
    var sourceTitle = document.createElement('div');
    sourceTitle.className = 'ws-research-viewer-section-title';
    sourceTitle.textContent = 'Statutory Basis';
    sourceSection.appendChild(sourceTitle);

    var sourceChip = document.createElement('span');
    sourceChip.style.cssText = 'display:inline-block;background:rgba(10,92,82,0.15);color:#14b8a6;padding:4px 10px;border-radius:4px;font-size:13px;font-family:monospace;';
    sourceChip.textContent = item.source;
    sourceSection.appendChild(sourceChip);
    viewer.appendChild(sourceSection);
  }

  // Pillar mapping (Governance+ only)
  if (item.pillar_mapping) {
    var user = window.__ailaneUser;
    if (user && (user.tier === 'governance' || user.tier === 'enterprise' || user.tier === 'institutional')) {
      _renderSection(viewer, 'RRI Pillar Mapping', item.pillar_mapping);
    }
  }

  container.appendChild(viewer);

  // Emit requirement:focused signal
  if (bus) {
    bus.emit('requirement:focused', {
      requirementId: item.id,
      name: item.name,
      source: item.source
    });
  }

  // Action bar with conditional calendar button
  var bar = document.createElement('div');
  bar.className = 'ws-research-action-bar';

  var copyBtn = document.createElement('button');
  copyBtn.className = 'ws-research-action-btn';
  copyBtn.textContent = 'Copy with Attribution';
  copyBtn.addEventListener('click', function() {
    var text = (item.name || '') + '\n' + (item.description || '') + '\nSource: ' + (item.source || '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
    if (bus) bus.emit('clip:added', { content: text, source: 'Research Panel \u2014 ' + item.name, type: 'requirement' });
  });
  bar.appendChild(copyBtn);

  var notesBtn = document.createElement('button');
  notesBtn.className = 'ws-research-action-btn';
  notesBtn.textContent = 'Add to Notes';
  notesBtn.addEventListener('click', function() {
    if (bus) bus.emit('content:copy', {
      content: (item.name || '') + '\n' + (item.description || ''),
      sourceAttribution: '[Requirement \u2014 ' + (item.name || '') + ' \u2014 ' + (item.source || '') + ']',
      format: 'text'
    });
  });
  bar.appendChild(notesBtn);

  // Send to Calendar — only for forward requirements with dates
  if (item.is_forward_requirement && item.effective_from) {
    var calBtn = document.createElement('button');
    calBtn.className = 'ws-research-action-btn';
    calBtn.textContent = 'Send to Calendar';
    calBtn.addEventListener('click', function() {
      if (bus) bus.emit('calendar:learn-more', {
        requirementId: item.id,
        title: item.name,
        statutoryBasis: item.source,
        sourceAct: item.source
      });
    });
    bar.appendChild(calBtn);
  }

  container.appendChild(bar);
}

function destroy() {
  _container = null;
  _bus = null;
}

window.__ResearchViewer = {
  createStatuteViewer: createStatuteViewer,
  createTrainingViewer: createTrainingViewer,
  createRequirementViewer: createRequirementViewer,
  destroy: destroy
};
