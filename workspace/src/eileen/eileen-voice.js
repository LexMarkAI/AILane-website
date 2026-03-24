/**
 * EILEEN VOICE INPUT — AILANE-SPEC-EILEEN-002
 * Phase 1: Web Speech API for voice INPUT only.
 * Voice OUTPUT deferred to Phase 2 (Google Cloud TTS).
 */

var _recognition = null;
var _isListening = false;
var _silenceTimer = null;
var _voiceBtn = null;
var _inputEl = null;
var _onTranscript = null;

function init(options) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    // Hide voice button if API unavailable
    if (options.voiceBtn) options.voiceBtn.style.display = 'none';
    return;
  }

  _voiceBtn = options.voiceBtn;
  _inputEl = options.inputEl;
  _onTranscript = options.onTranscript || null;

  _recognition = new SpeechRecognition();
  _recognition.lang = 'en-GB';
  _recognition.continuous = false;
  _recognition.interimResults = true;

  _recognition.onresult = function(event) {
    var transcript = '';
    var isFinal = false;
    for (var i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }

    if (_inputEl) {
      if (isFinal) {
        _inputEl.value = transcript;
        _inputEl.style.fontStyle = 'normal';
        _inputEl.style.color = '';
        _stopListening();
        if (_onTranscript) _onTranscript(transcript);
      } else {
        _inputEl.value = transcript;
        _inputEl.style.fontStyle = 'italic';
        _inputEl.style.color = '#64748b';
      }
    }
  };

  _recognition.onerror = function() {
    _stopListening();
  };

  _recognition.onend = function() {
    _stopListening();
  };

  if (_voiceBtn) {
    _voiceBtn.style.display = '';
    _voiceBtn.addEventListener('click', function() {
      if (_isListening) {
        _stopListening();
      } else {
        _startListening();
      }
    });
  }
}

function _startListening() {
  if (!_recognition || _isListening) return;
  _isListening = true;
  if (_voiceBtn) _voiceBtn.classList.add('ws-eileen-voice-btn--active');
  if (_inputEl) {
    _inputEl.value = '';
    _inputEl.placeholder = 'Listening...';
  }

  try {
    _recognition.start();
  } catch (e) {
    _stopListening();
    return;
  }

  // Auto-stop after 15 seconds
  _silenceTimer = setTimeout(function() {
    _stopListening();
  }, 15000);
}

function _stopListening() {
  _isListening = false;
  if (_voiceBtn) _voiceBtn.classList.remove('ws-eileen-voice-btn--active');
  if (_inputEl) {
    _inputEl.style.fontStyle = 'normal';
    _inputEl.style.color = '';
    _inputEl.placeholder = 'Ask Eileen about employment law\u2026';
  }
  if (_silenceTimer) {
    clearTimeout(_silenceTimer);
    _silenceTimer = null;
  }
  try {
    if (_recognition) _recognition.stop();
  } catch (e) { /* ignore */ }
}

function destroy() {
  _stopListening();
  _recognition = null;
  _voiceBtn = null;
  _inputEl = null;
  _onTranscript = null;
}

window.__EileenVoice = { init: init, destroy: destroy };
