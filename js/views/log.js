// 食事記録画面（音声 + 写真 + AIフィードバック）
import { h, toast, fileToResizedDataUrl, escapeHtml, icon } from '../ui.js';
import { t, getLang } from '../i18n.js';
import { isSpeechSupported, createRecognizer } from '../speech.js';
import { getProfile, getSettings } from '../store.js';
import { analyzeMeal } from '../ai.js';
import { putMeal, newId, getMealsByDate, getDaily, getAllCheckups } from '../db.js';
import { todayKey, sumDay } from '../nutrition.js';
import { resultCard } from './history.js';

const MEAL_TYPES = ['朝食', '昼食', '夕食', '間食'];

function guessMealType() {
  const hour = new Date().getHours();
  if (hour < 10) return '朝食';
  if (hour < 15) return '昼食';
  if (hour < 21) return '夕食';
  return '間食';
}

export function renderLog(container, ctx) {
  const settings = getSettings();
  let photoDataUrl = null;
  let mealType = guessMealType();
  let recognizer = null;
  let listening = false;
  // 記録対象の日付（ホームから来た場合はその日を既定にする）
  let mealDate = (ctx && ctx.logDate) || todayKey();
  if (ctx) ctx.logDate = null;

  const view = h('div', { class: 'view log-view' });

  // 記録する日付
  const dateInput = h('input', { type: 'date', class: 'date-input', value: mealDate, max: todayKey() });
  dateInput.addEventListener('change', () => { if (dateInput.value) mealDate = dateInput.value; });

  // 食事タイプ
  const typeRow = h('div', { class: 'chips' },
    MEAL_TYPES.map((mt) => {
      const chip = h('button', { type: 'button', class: 'chip' + (mt === mealType ? ' active' : ''), text: t(`mt.${mt}`) });
      chip.dataset.value = mt;
      chip.addEventListener('click', () => {
        mealType = mt;
        typeRow.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.value === mt));
      });
      return chip;
    })
  );

  // 写真：カメラ撮影とライブラリからのアップロードの2系統
  const emptyHint = () => {
    const hint = h('div', { class: 'ph-hint' });
    hint.append(icon('image', 30), h('span', { text: t('l.addPhoto') }));
    return hint;
  };
  const photoPreview = h('div', { class: 'photo-preview empty' }, [emptyHint()]);
  // capture属性ありはカメラ起動、なしはギャラリー/ファイル選択になる
  const cameraInput = h('input', { type: 'file', accept: 'image/*', capture: 'environment', class: 'hidden' });
  const uploadInput = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });

  async function setPhotoFrom(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    try {
      photoDataUrl = await fileToResizedDataUrl(file, 1024, 0.8);
      photoPreview.classList.remove('empty');
      photoPreview.innerHTML = '';
      photoPreview.append(
        h('img', { src: photoDataUrl, alt: '食事の写真' }),
        h('button', {
          type: 'button', class: 'photo-remove', 'aria-label': 'remove photo', text: '×',
          onclick: (e) => {
            e.stopPropagation();
            photoDataUrl = null;
            photoPreview.classList.add('empty');
            photoPreview.innerHTML = '';
            photoPreview.append(emptyHint());
          },
        })
      );
    } catch (err) {
      toast(t('l.photoFail'), 'error');
    } finally {
      input.value = '';
    }
  }
  cameraInput.addEventListener('change', () => setPhotoFrom(cameraInput));
  uploadInput.addEventListener('change', () => setPhotoFrom(uploadInput));
  photoPreview.addEventListener('click', () => uploadInput.click());

  const cameraBtn = h('button', { type: 'button', class: 'btn' }, [icon('camera', 16), h('span', { text: t('l.takePhoto') })]);
  cameraBtn.addEventListener('click', () => cameraInput.click());
  const uploadBtn = h('button', { type: 'button', class: 'btn' }, [icon('upload', 16), h('span', { text: t('l.upload') })]);
  uploadBtn.addEventListener('click', () => uploadInput.click());
  const photoActions = h('div', { class: 'photo-actions' }, [cameraBtn, uploadBtn]);

  // 音声入力
  const transcript = h('textarea', { class: 'transcript', rows: 4, placeholder: t('l.placeholder') });
  const micBtn = h('button', { type: 'button', class: 'btn mic' });
  const micLabel = h('span', { text: t('l.speak') });
  micBtn.append(icon('mic', 16), micLabel);
  micBtn.style.display = 'flex';
  micBtn.style.alignItems = 'center';
  micBtn.style.justifyContent = 'center';
  micBtn.style.gap = '8px';

  if (isSpeechSupported()) {
    micBtn.addEventListener('click', () => {
      if (listening) {
        recognizer && recognizer.stop();
        return;
      }
      recognizer = createRecognizer({
        lang: getLang() === 'en' ? 'en-US' : 'ja-JP',
        onResult: (finalText, interim) => {
          transcript.value = (finalText + interim).trim();
        },
        onEnd: () => {
          listening = false;
          micBtn.classList.remove('recording');
          micLabel.textContent = t('l.speak');
        },
        onError: (err) => {
          listening = false;
          micBtn.classList.remove('recording');
          micLabel.textContent = t('l.speak');
          if (err !== 'no-speech' && err !== 'aborted') toast(t('l.speechErr', { e: err }), 'error');
        },
      });
      recognizer.start();
      listening = true;
      micBtn.classList.add('recording');
      micLabel.textContent = t('l.stop');
    });
  } else {
    micBtn.disabled = true;
    micLabel.textContent = t('l.speechNA');
  }

  // 解析
  const analyzeBtn = h('button', { class: 'btn primary big', type: 'button', text: t('l.analyze') });
  const resultArea = h('div', { class: 'result-area' });

  analyzeBtn.addEventListener('click', async () => {
    const text = transcript.value.trim();
    if (!text && !photoDataUrl) {
      toast(t('l.needInput'), 'error');
      return;
    }
    if (!settings.apiKey) {
      toast(t('l.needKeyFirst'), 'error');
      ctx.navigate('settings');
      return;
    }
    if (listening) { recognizer && recognizer.stop(); }

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = t('l.analyzing');
    resultArea.innerHTML = '';
    resultArea.append(h('div', { class: 'loading', text: t('l.analyzingMsg') }));

    const profile = getProfile();
    const dateKey = mealDate;
    // 記録日の時刻は、今日なら現在時刻、過去日ならその日の現在時刻に合わせる
    const now = new Date();
    const hms = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const ts = new Date(`${dateKey}T${hms}`).toISOString();
    let todayTotals = null;
    let daily = null;
    let latestCheckup = null;
    try {
      todayTotals = sumDay(await getMealsByDate(dateKey));
      daily = await getDaily(dateKey);
      const checkups = await getAllCheckups();
      latestCheckup = checkups.length ? checkups[checkups.length - 1] : null;
    } catch { /* noop */ }

    try {
      const ai = await analyzeMeal({ text, photoDataUrl, mealType, todayTotals, daily, latestCheckup }, profile, settings);
      const meal = {
        id: newId(),
        ts,
        dateKey,
        mealType,
        text,
        photo: photoDataUrl || null,
        ai,
        status: 'done',
      };
      await putMeal(meal);
      toast(t('l.saved'), 'success');

      resultArea.innerHTML = '';
      resultArea.append(resultCard(meal, { showPhoto: true }));
      const moreBtn = h('button', { class: 'btn', type: 'button', text: t('l.more') });
      moreBtn.addEventListener('click', () => ctx.navigate('log'));
      const dashBtn = h('button', { class: 'btn primary', type: 'button', text: t('l.toDash') });
      dashBtn.addEventListener('click', () => ctx.navigate('dashboard'));
      resultArea.append(h('div', { class: 'form-actions' }, [moreBtn, dashBtn]));

      // 入力をリセット
      transcript.value = '';
      photoDataUrl = null;
      photoPreview.classList.add('empty');
      photoPreview.innerHTML = '';
      photoPreview.append(emptyHint());
    } catch (err) {
      resultArea.innerHTML = '';
      resultArea.append(h('div', { class: 'card error', html: escapeHtml(err.message || t('l.analyzeFail')) }));
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.textContent = t('l.analyze');
    }
  });

  view.append(
    h('div', { class: 'section-label', text: t('l.date') }),
    dateInput,
    h('div', { class: 'section-label', text: t('l.mealType') }),
    typeRow,
    h('div', { class: 'section-label', text: t('l.photo') }),
    photoPreview,
    photoActions,
    cameraInput,
    uploadInput,
    h('div', { class: 'section-label', text: t('l.content') }),
    micBtn,
    transcript,
    analyzeBtn,
    resultArea
  );
  container.append(view);
}
