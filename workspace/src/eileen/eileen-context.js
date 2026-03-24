/**
 * EILEEN CONTEXT BUS CONSUMER — KLUI-001 §3.4
 * Listens to shared context bus, maintains workspace awareness,
 * builds workspace context for API calls, generates quick actions.
 *
 * Consumed signals: vault:document:selected, vault:finding:focused,
 * calendar:event:selected, planner:step:changed, planner:requirement:selected,
 * note:active, statute:viewed
 */

var _bus = null;
var _unsubs = [];
var _activeContext = {};
var _quickActions = [];

var DEFAULT_QUICK_ACTIONS = [
  'What employment laws apply to my situation?',
  'Help me understand my obligations',
  "What's changing in employment law?"
];

var CONTEXT_ACTIONS = {
  'vault:document:selected': [
    'Explain these findings',
    'What does this score mean?',
    'How can I improve this area?'
  ],
  'vault:finding:focused': [
    'Explain this finding',
    'What does the law require here?',
    'Ask about this requirement'
  ],
  'calendar:event:selected': [
    'What changes on this date?',
    'What should I prepare for?',
    'Which contracts are affected?'
  ],
  'planner:step:changed': [
    'Help me with this step',
    'What requirements apply here?',
    'What does the law require?'
  ],
  'planner:requirement:selected': [
    'Explain this requirement',
    'Where is this in the legislation?',
    'Ask about this requirement'
  ],
  'statute:viewed': [
    'Explain this provision',
    'How does this apply to my contracts?'
  ]
};

function getSafeguardInstructions() {
  return [
    'You must NEVER produce draft contract clause language, model contract wording, or suggested legal provisions. If the user asks you to write contract language, respond: "I can identify what statutory requirements your contract should address and show you the legal basis for each one. For the actual contract wording, I\'d recommend working with a qualified employment solicitor who can tailor the language to your specific situation."',
    'When presenting statutory requirements, always include: (1) the requirement name, (2) the statutory source and section reference, (3) what the requirement obliges in factual terms, (4) which contract section it typically appears in. Never add recommendations beyond the factual obligation.',
    'After presenting requirements or completing a Contract Planner step, offer the legal referral pathway: "Would you like me to help you find a qualified employment solicitor who can review your contract?"',
    'When discussing gaps between a contract and statutory requirements, use the framing: "Your contract does not appear to address [requirement]. The statutory basis for this is [source]. This is an area a solicitor can advise you on." Never say "your contract fails to comply" or "your employer has breached the law."',
    'If you are uncertain whether a response crosses the line from regulatory intelligence into legal advice, err on the side of caution and include a disclaimer. The test is: does this response tell the user what the law requires (permitted) or does it tell them what to do about it (not permitted)?'
  ];
}

function _handleSignal(signalName, contextKey, data) {
  _activeContext[contextKey] = data;
  _quickActions = CONTEXT_ACTIONS[signalName] || DEFAULT_QUICK_ACTIONS;
}

function init(bus) {
  _bus = bus;
  _activeContext = {};
  _quickActions = DEFAULT_QUICK_ACTIONS.slice();

  _unsubs.push(bus.on('vault:document:selected', function(data) {
    _handleSignal('vault:document:selected', 'activeDocument', {
      id: data.documentId,
      name: data.documentName,
      score: data.score,
      findingCounts: null
    });
  }));

  _unsubs.push(bus.on('vault:finding:focused', function(data) {
    _handleSignal('vault:finding:focused', 'activeFinding', {
      id: data.findingId,
      severity: data.severity,
      requirementRef: data.requirementRef,
      clauseRef: data.clauseRef
    });
  }));

  _unsubs.push(bus.on('calendar:event:selected', function(data) {
    _handleSignal('calendar:event:selected', 'activeCalendarEvent', {
      id: data.id,
      type: data.type,
      date: data.date,
      statuteRef: data.statuteRef || null
    });
  }));

  _unsubs.push(bus.on('planner:step:changed', function(data) {
    _handleSignal('planner:step:changed', 'activePlannerStep', {
      step: data.step,
      stepName: data.stepName || null,
      planId: data.planId
    });
  }));

  _unsubs.push(bus.on('planner:requirement:selected', function(data) {
    _handleSignal('planner:requirement:selected', 'activeRequirement', {
      id: data.requirementId,
      name: data.requirementName,
      source: data.statutoryBasis
    });
  }));

  _unsubs.push(bus.on('note:active', function(data) {
    _activeContext.activeNote = { noteId: data.noteId, title: data.title };
    // No quick actions for passive context
  }));

  _unsubs.push(bus.on('statute:viewed', function(data) {
    _handleSignal('statute:viewed', 'activeStatute', {
      ref: data.statuteRef,
      sectionId: data.sectionId,
      title: data.title
    });
  }));
}

function getWorkspaceContext() {
  var ctx = {};
  for (var key in _activeContext) {
    if (_activeContext.hasOwnProperty(key)) {
      ctx[key] = _activeContext[key];
    }
  }
  ctx.safeguard_instructions = getSafeguardInstructions();
  return ctx;
}

function getQuickActions() {
  return _quickActions.length > 0 ? _quickActions : DEFAULT_QUICK_ACTIONS;
}

function destroy() {
  for (var i = 0; i < _unsubs.length; i++) {
    if (typeof _unsubs[i] === 'function') _unsubs[i]();
  }
  _unsubs = [];
  _activeContext = {};
  _quickActions = [];
  _bus = null;
}

window.__EileenContext = {
  init: init,
  getWorkspaceContext: getWorkspaceContext,
  getQuickActions: getQuickActions,
  destroy: destroy
};
