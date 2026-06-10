// 音声入力（Web Speech API）。Chrome/Safari(iOS) で動作。
// 非対応環境ではテキスト入力にフォールバックする。

export function isSpeechSupported() {
  return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
}

export function createRecognizer({ onResult, onEnd, onError, lang = 'ja-JP' } = {}) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = true;

  let finalText = '';

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    onResult && onResult(finalText, interim);
  };
  rec.onerror = (e) => onError && onError(e.error || 'speech-error');
  rec.onend = () => onEnd && onEnd(finalText);

  return {
    start() {
      finalText = '';
      try { rec.start(); } catch { /* already started */ }
    },
    stop() {
      try { rec.stop(); } catch { /* noop */ }
    },
    getText() { return finalText; },
  };
}
