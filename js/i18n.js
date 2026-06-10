// 多言語対応（i18n）。UI文字列は全てここに集約する。
// 言語設定は端末内（localStorage）に保存。既定はブラウザ言語から推定。

const LANG_KEY = 'keto.lang.v1';

export const LANGS = [
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
];

const dict = {
  /* ================= 日本語 ================= */
  ja: {
    // tabs / titles
    'tab.home': 'ホーム', 'tab.log': '記録', 'tab.trends': '進捗', 'tab.history': '履歴', 'tab.settings': '設定',
    'title.dashboard': 'KETO', 'title.log': '食事を記録', 'title.progress': '進捗', 'title.history': '履歴',
    'title.profile': 'プロフィール', 'title.checkups': '健康診断', 'title.settings': '設定',
    // common
    'common.save': '保存', 'common.cancel': 'キャンセル', 'common.delete': '削除', 'common.edit': '編集', 'common.loading': '読み込み中…',
    'common.kcal': 'kcal', 'common.days': '日', 'common.times': '回', 'common.meals': '食',
    'common.netCarbs': 'ネット糖質', 'common.protein': 'タンパク質', 'common.fat': '脂質', 'common.calories': 'カロリー',
    'common.weight': '体重', 'common.bodyFat': '体脂肪率', 'common.noData': 'データがありません',
    'common.renderError': '画面の描画でエラーが発生しました: ',
    // ketosis levels
    'kl.none.label': 'ケトーシス前', 'kl.none.desc': '糖質代謝が優位。まだ脂質燃焼モードに入っていません。',
    'kl.light.label': '軽度の栄養性ケトーシス', 'kl.light.desc': '脂質燃焼が始まっています。',
    'kl.optimal.label': '最適なケトーシス', 'kl.optimal.desc': '減量・代謝効率の観点で理想的な範囲です。',
    'kl.high.label': '高ケトーシス', 'kl.high.desc': '値が高め。水分・電解質に注意してください。',
    // meal types (canonical key = stored value)
    'mt.朝食': '朝食', 'mt.昼食': '昼食', 'mt.夕食': '夕食', 'mt.間食': '間食', 'mt.食事': '食事',
    // training types
    'tt.筋トレ': '筋トレ', 'tt.有酸素': '有酸素', 'tt.その他': 'その他',
    // dashboard
    'd.setupTitle': 'まずはプロフィールを設定', 'd.setupBody': '年齢・身長・体重を入力すると、あなた専用の目標値とフィードバックが使えます。',
    'd.setupBtn': 'プロフィールを設定',
    'd.carbStreak': '糖質遵守', 'd.trainStreak': '筋トレ', 'd.streakDays': '連続日数',
    'd.netCarbCap': 'NET CARBS・上限 {max}g', 'd.remaining': '残り {n}g', 'd.over': '上限超過 +{n}g',
    'd.ketosis': 'ケトーシス', 'd.sleep': 'Sleep', 'd.readiness': 'Readiness', 'd.macros': 'Macros',
    'd.todayCond': '今日のコンディション',
    'd.weightKg': '体重 (kg)', 'd.bodyFatPct': '体脂肪率 (%)', 'd.ketoneMmol': '血中ケトン (mmol/L)', 'd.glucoseMg': '血糖値 (mg/dL)',
    'd.trainedQ': '筋トレ実施した？', 'd.trainedOn': '筋トレ実施 ✓', 'd.minutes': '時間（分）',
    'd.saveToday': '今日のデータを保存', 'd.savedToday': '今日のデータを保存しました',
    'd.ouraSync': 'OURAを同期', 'd.ouraSetup': 'OURA連携を設定', 'd.syncing': '同期中…', 'd.ouraSynced': 'Ouraを同期しました（{n}日分）',
    'd.ouraLine': 'Oura: 睡眠{s} / 回復{r}',
    'd.todayIntake': '本日の摂取（{n}食）', 'd.noTargets': '目標値はプロフィール設定後に表示されます。',
    'd.logMeal': '＋ 食事を記録', 'd.viewTrends': '進捗を見る',
    'd.coach': 'AIコーチ', 'd.coachBtn': '直近の傾向からアドバイスをもらう', 'd.coachLoading': 'アドバイスを生成中…',
    'd.noRecords': 'まだ記録がありません。食事を記録するとアドバイスできます。',
    'd.needKey': '設定でAPIキーを入力してください',
    'd.today': '今日', 'd.condition': 'コンディション', 'd.saveDay': 'この日のデータを保存', 'd.savedDay': 'データを保存しました',
    'd.intakeOf': '摂取（{n}食）', 'd.dayMeals': 'この日の食事', 'd.noMealsDay': 'この日の記録はまだありません。',
    'd.pfcTitle': '本日のPFC', 'd.calLine': '{v} / {t} kcal', 'd.targetG': '/ {t} g',
    // log
    'l.mealType': '食事の種類', 'l.date': '記録する日付', 'l.photo': '写真', 'l.addPhoto': '写真を追加',
    'l.takePhoto': '撮影する', 'l.upload': 'アップロード', 'l.photoFail': '画像の読み込みに失敗しました',
    'l.content': '内容（音声 / テキスト）', 'l.speak': '音声で話す', 'l.stop': '停止',
    'l.speechNA': '音声入力は非対応（テキストで入力）', 'l.speechErr': '音声認識エラー: {e}',
    'l.placeholder': '何を食べたか話してください（例: 鶏もも肉のグリルとアボカドサラダ、オリーブオイルがけ）',
    'l.analyze': 'この食事を記録・分析', 'l.analyzing': '分析中…', 'l.analyzingMsg': 'AIが食事を分析しています…',
    'l.needInput': '写真か説明のどちらかを入力してください', 'l.needKeyFirst': '先に「設定」でAPIキーを入力してください',
    'l.saved': '記録しました', 'l.more': '続けて記録する', 'l.toDash': 'ホームへ', 'l.analyzeFail': '分析に失敗しました',
    // history / meal card
    'hi.ketoScore': 'ケトスコア', 'hi.good': '✓ ケト向き', 'hi.bad': '✕ 糖質に注意',
    'hi.feedback': 'フィードバック', 'hi.suggestions': '提案',
    'hi.edit': '量を修正', 'hi.edited': '手動修正済み', 'hi.editSaved': '修正を保存しました',
    'hi.dayTotal': '{cal}kcal ・ ネット糖質 {nc}g ・ {n}食',
    'hi.empty': 'まだ記録がありません。', 'hi.logBtn': '食事を記録する',
    'hi.confirmDelete': 'この記録を削除しますか？', 'hi.deleted': '削除しました',
    // progress
    'pr.range14': '14日', 'pr.range30': '30日', 'pr.range90': '90日',
    'pr.carbStreakDays': '糖質遵守 連続', 'pr.trainStreakDays': '筋トレ 連続', 'pr.trainCount': '直近{n}日の筋トレ',
    'pr.weightFat': '体重・体脂肪', 'pr.weightLabel': '体重 (kg)', 'pr.goal': '目標', 'pr.fatLabel': '体脂肪率 (%)',
    'pr.weightEmpty': 'ホームで体重・体脂肪を記録すると推移が表示されます。',
    'pr.training': '筋トレ（分／日）',
    'pr.oura': 'OURA — 睡眠・リカバリー', 'pr.sleepScore': '睡眠スコア', 'pr.readiness': 'リカバリー',
    'pr.ouraEmpty': 'Ouraデータを同期または手動入力すると表示されます（設定／ホーム）。',
    'pr.netCarbs': 'ネット糖質の推移', 'pr.netCarbLabel': '1日のネット糖質 (g)・上限 {max}g',
    'pr.carbEmpty': '食事を記録すると糖質の推移が表示されます。',
    'pr.checkups': '健康診断の推移', 'pr.latest': '最新', 'pr.checkupEmpty': '健康診断データが未入力です。',
    'pr.checkupHint': '健康診断の数値を入力すると、経年の推移グラフが表示されます。',
    'pr.editCheckups': '健康診断データを編集', 'pr.addCheckups': '健康診断データを入力',
    // profile
    'p.intro': '健康情報を入力すると、フィードバックがあなたに最適化されます。データはこの端末内にのみ保存されます。',
    'p.basic': '基本身体情報', 'p.sex': '性別', 'p.male': '男性', 'p.female': '女性',
    'p.age': '年齢', 'p.height': '身長 (cm)', 'p.weight': '体重 (kg)', 'p.activity': '活動量',
    'p.goal': '目標設定', 'p.goalWeight': '目標体重 (kg)', 'p.pace': '減量ペース (kg/週)', 'p.paceHint': '0.5前後が安全です',
    'p.targetDate': '目標達成日', 'p.carbLimit': 'ネット糖質の上限 (g/日)', 'p.carbHint': 'ケトでは20〜50gが目安',
    'p.proteinCoef': 'タンパク質係数 (g/kg体重)', 'p.proteinHint': '1.2〜1.6が目安',
    'p.blood': '血液・体組成データ', 'p.glucose': '血糖値 (mg/dL)', 'p.ketone': '血中ケトン体 (mmol/L)',
    'p.ketoneHint': 'β-ヒドロキシ酪酸。0.5以上でケトーシス', 'p.bodyFat': '体脂肪率 (%)',
    'p.limits': '既往・制限事項', 'p.conditions': '持病・既往', 'p.medications': '服薬',
    'p.allergies': 'アレルギー', 'p.dislikes': '苦手な食材', 'p.notes': 'その他メモ',
    'p.calc': '自動計算（参考値）', 'p.calcHint': '年齢・身長・体重を入力すると目標値が表示されます。',
    'p.bmr': '基礎代謝 BMR', 'p.tdee': '総消費 TDEE', 'p.targetCal': '目標カロリー',
    'p.ratio': 'カロリー比 → 脂質{f}% / タンパク質{p}% / 糖質{c}%', 'p.currentKetosis': '現在のケトーシス: {label}',
    'p.saved': 'プロフィールを保存しました',
    'act.1': 'ほとんど運動しない（デスクワーク中心）', 'act.2': '軽い運動（週1〜3回）', 'act.3': '中程度（週3〜5回）',
    'act.4': '活発（週6〜7回）', 'act.5': '非常に活発（肉体労働・1日2回運動）',
    // checkups
    'c.add': '健康診断データを追加', 'c.date': '受診日', 'c.memo': 'メモ', 'c.list': '記録一覧',
    'c.needOne': '1つ以上の項目を入力してください', 'c.saved': '健康診断データを保存しました',
    'c.refHint': '基準 {lo}〜{hi}',
    'cm.systolic': '収縮期血圧', 'cm.diastolic': '拡張期血圧', 'cm.hba1c': 'HbA1c', 'cm.fastingGlucose': '空腹時血糖',
    'cm.totalChol': '総コレステロール', 'cm.ldl': 'LDL', 'cm.hdl': 'HDL', 'cm.triglycerides': '中性脂肪',
    'cm.alt': 'ALT(GPT)', 'cm.ast': 'AST(GOT)', 'cm.ggtp': 'γ-GTP', 'cm.uricAcid': '尿酸',
    // settings
    's.api': 'Claude API', 's.apiKey': 'APIキー', 's.show': '表示', 's.hide': '隠す',
    's.apiHint': 'console.anthropic.com で発行したキー。<b>この端末のブラウザ内にのみ保存</b>され、Anthropicへのリクエストにのみ使われます。',
    's.model': '使用モデル', 's.lang': '言語 / Language',
    's.oura': 'OURA RING 連携（任意）', 's.ouraToken': 'Personal Access Token',
    's.ouraTokenHint': 'cloud.ouraring.com → Personal Access Tokens で発行。設定すると「ホーム」で同期できます。',
    's.ouraProxy': 'CORSプロキシURL（直接接続できない場合）',
    's.ouraProxyHint': 'ブラウザから直接Ouraを叩くとCORSで失敗します。<code>{url}</code> を含めると対象URLに置換、無ければ末尾に追記します。',
    's.health': '健康データ', 's.profileBtn': 'プロフィール・健康情報', 's.checkupBtn': '健康診断データ',
    's.data': 'データ管理', 's.export': '記録をJSONで書き出し',
    's.security': 'セキュリティについて',
    's.securityBody': 'これはブラウザから直接 Claude API を呼び出す個人用アプリです。APIキーと健康データはこの端末（localStorage / IndexedDB）にのみ保存されます。共用端末では利用しないでください。',
    's.saved': '設定を保存しました',
    's.backend': 'サーバー連携（サブスク）', 's.supabaseUrl': 'Supabase URL', 's.supabaseAnon': 'Supabase anon キー',
    's.backendHint': 'Supabaseプロジェクトの URL と anon キー（公開可）。設定するとログイン・サーバー保存・サブスクが有効に。',
    's.account': 'アカウント',
    'a.email': 'メールアドレス', 'a.password': 'パスワード', 'a.signup': '新規登録', 'a.signin': 'ログイン', 'a.signout': 'ログアウト',
    'a.signedInAs': 'ログイン中: {email}', 'a.status': '購読状態', 'a.usage': '今月の利用',
    'a.needBackend': '先にSupabaseのURLとanonキーを入力してください。',
    'a.signupOk': '登録しました', 'a.confirmEmail': '確認メールを送信しました。メール内のリンクで認証後にログインしてください。',
    'a.signinOk': 'ログインしました', 'a.signedOut': 'ログアウトしました', 'a.authErr': '認証エラー: {e}',
    'pw.title': '今月のご利用上限に達しました', 'pw.body': 'Pro（サブスク）にアップグレードすると上限が増えます。Androidアプリから登録できます。',
    'plan.free': '無料', 'plan.monthly': '月額', 'plan.annual': '年額',
    'status.active': '有効', 'status.free': '無料', 'status.expired': '期限切れ',
    // errors
    'err.noKey': 'APIキーが設定されていません。「設定」タブで Claude API キーを入力してください。',
    'err.badKey': 'APIキーが無効です。設定を確認してください。',
    'err.rateLimit': 'レート制限に達しました。少し待って再試行してください。',
    'err.api': 'APIエラー ({s}): {d}',
    'err.parse': 'AIの応答を解析できませんでした。',
    'err.ouraNoToken': 'Ouraトークンが設定されていません。',
    'err.ouraBadToken': 'Ouraトークンが無効です。設定を確認してください。',
    'err.ouraApi': 'Oura APIエラー ({s})',
    'err.ouraCors': 'Ouraへ直接接続できませんでした（ブラウザのCORS制限）。設定でプロキシURLを指定してください。',
    // models
    'model.opus': 'Opus 4.8（最高精度・推奨）', 'model.sonnet': 'Sonnet 4.6（高速・低コスト）', 'model.haiku': 'Haiku 4.5（最速・最安）',
  },

  /* ================= English ================= */
  en: {
    'tab.home': 'Home', 'tab.log': 'Log', 'tab.trends': 'Trends', 'tab.history': 'History', 'tab.settings': 'Settings',
    'title.dashboard': 'KETO', 'title.log': 'Log Meal', 'title.progress': 'Trends', 'title.history': 'History',
    'title.profile': 'Profile', 'title.checkups': 'Checkups', 'title.settings': 'Settings',
    'common.save': 'Save', 'common.cancel': 'Cancel', 'common.delete': 'Delete', 'common.edit': 'Edit', 'common.loading': 'Loading…',
    'common.kcal': 'kcal', 'common.days': 'd', 'common.times': '×', 'common.meals': 'meals',
    'common.netCarbs': 'Net carbs', 'common.protein': 'Protein', 'common.fat': 'Fat', 'common.calories': 'Calories',
    'common.weight': 'Weight', 'common.bodyFat': 'Body fat', 'common.noData': 'No data',
    'common.renderError': 'Failed to render this screen: ',
    'kl.none.label': 'Not in ketosis', 'kl.none.desc': 'Glucose metabolism is dominant — fat-burning mode hasn\'t kicked in yet.',
    'kl.light.label': 'Light nutritional ketosis', 'kl.light.desc': 'Fat burning has begun.',
    'kl.optimal.label': 'Optimal ketosis', 'kl.optimal.desc': 'The ideal range for weight loss and metabolic efficiency.',
    'kl.high.label': 'High ketosis', 'kl.high.desc': 'On the high side — mind your hydration and electrolytes.',
    'mt.朝食': 'Breakfast', 'mt.昼食': 'Lunch', 'mt.夕食': 'Dinner', 'mt.間食': 'Snack', 'mt.食事': 'Meal',
    'tt.筋トレ': 'Strength', 'tt.有酸素': 'Cardio', 'tt.その他': 'Other',
    'd.setupTitle': 'Set up your profile first', 'd.setupBody': 'Enter your age, height and weight to unlock personal targets and feedback.',
    'd.setupBtn': 'Set up profile',
    'd.carbStreak': 'Carb streak', 'd.trainStreak': 'Training', 'd.streakDays': 'day streak',
    'd.netCarbCap': 'NET CARBS · limit {max}g', 'd.remaining': '{n}g left', 'd.over': '+{n}g over limit',
    'd.ketosis': 'Ketosis', 'd.sleep': 'Sleep', 'd.readiness': 'Readiness', 'd.macros': 'Macros',
    'd.todayCond': "Today's condition",
    'd.weightKg': 'Weight (kg)', 'd.bodyFatPct': 'Body fat (%)', 'd.ketoneMmol': 'Blood ketones (mmol/L)', 'd.glucoseMg': 'Glucose (mg/dL)',
    'd.trainedQ': 'Did you train today?', 'd.trainedOn': 'Trained ✓', 'd.minutes': 'Duration (min)',
    'd.saveToday': "Save today's data", 'd.savedToday': "Saved today's data",
    'd.ouraSync': 'Sync Oura', 'd.ouraSetup': 'Set up Oura', 'd.syncing': 'Syncing…', 'd.ouraSynced': 'Synced Oura ({n} days)',
    'd.ouraLine': 'Oura: sleep {s} / readiness {r}',
    'd.todayIntake': "Today's intake ({n} meals)", 'd.noTargets': 'Targets appear once your profile is set.',
    'd.logMeal': '+ Log meal', 'd.viewTrends': 'View trends',
    'd.coach': 'AI Coach', 'd.coachBtn': 'Get advice from recent trends', 'd.coachLoading': 'Generating advice…',
    'd.noRecords': 'No records yet. Log a meal to get advice.',
    'd.needKey': 'Enter your API key in Settings',
    'd.today': 'Today', 'd.condition': 'Condition', 'd.saveDay': 'Save this day', 'd.savedDay': 'Saved',
    'd.intakeOf': 'intake ({n} meals)', 'd.dayMeals': "This day's meals", 'd.noMealsDay': 'No records for this day yet.',
    'd.pfcTitle': "Today's macros", 'd.calLine': '{v} / {t} kcal', 'd.targetG': '/ {t} g',
    'l.mealType': 'Meal type', 'l.date': 'Date', 'l.photo': 'Photo', 'l.addPhoto': 'Add photo',
    'l.takePhoto': 'Take photo', 'l.upload': 'Upload', 'l.photoFail': 'Failed to load the image',
    'l.content': 'What you ate (voice / text)', 'l.speak': 'Speak', 'l.stop': 'Stop',
    'l.speechNA': 'Voice input unavailable — type instead', 'l.speechErr': 'Speech recognition error: {e}',
    'l.placeholder': 'Tell me what you ate (e.g. grilled chicken thigh and avocado salad with olive oil)',
    'l.analyze': 'Analyze & save', 'l.analyzing': 'Analyzing…', 'l.analyzingMsg': 'AI is analyzing your meal…',
    'l.needInput': 'Add a photo or a description first', 'l.needKeyFirst': 'Enter your API key in Settings first',
    'l.saved': 'Saved', 'l.more': 'Log another', 'l.toDash': 'Go home', 'l.analyzeFail': 'Analysis failed',
    'hi.ketoScore': 'Keto score', 'hi.good': '✓ Keto-friendly', 'hi.bad': '✕ Watch carbs',
    'hi.feedback': 'Feedback', 'hi.suggestions': 'Suggestions',
    'hi.edit': 'Edit amounts', 'hi.edited': 'Edited', 'hi.editSaved': 'Updated',
    'hi.dayTotal': '{cal} kcal · net carbs {nc}g · {n} meals',
    'hi.empty': 'No records yet.', 'hi.logBtn': 'Log a meal',
    'hi.confirmDelete': 'Delete this record?', 'hi.deleted': 'Deleted',
    'pr.range14': '2W', 'pr.range30': '1M', 'pr.range90': '3M',
    'pr.carbStreakDays': 'Carb streak', 'pr.trainStreakDays': 'Training streak', 'pr.trainCount': 'Workouts / {n}d',
    'pr.weightFat': 'Weight · Body fat', 'pr.weightLabel': 'Weight (kg)', 'pr.goal': 'Goal', 'pr.fatLabel': 'Body fat (%)',
    'pr.weightEmpty': 'Log weight and body fat on Home to see trends.',
    'pr.training': 'Training (min / day)',
    'pr.oura': 'OURA — Sleep · Recovery', 'pr.sleepScore': 'Sleep score', 'pr.readiness': 'Readiness',
    'pr.ouraEmpty': 'Sync or enter Oura data to see this chart (Settings / Home).',
    'pr.netCarbs': 'Net carbs', 'pr.netCarbLabel': 'Daily net carbs (g) · limit {max}g',
    'pr.carbEmpty': 'Log meals to see your carb trend.',
    'pr.checkups': 'Checkup trends', 'pr.latest': 'Latest', 'pr.checkupEmpty': 'No checkup data yet.',
    'pr.checkupHint': 'Enter checkup results to see year-over-year trends.',
    'pr.editCheckups': 'Edit checkup data', 'pr.addCheckups': 'Add checkup data',
    'p.intro': 'The more health info you enter, the more personal your feedback gets. Data never leaves this device.',
    'p.basic': 'Body basics', 'p.sex': 'Sex', 'p.male': 'Male', 'p.female': 'Female',
    'p.age': 'Age', 'p.height': 'Height (cm)', 'p.weight': 'Weight (kg)', 'p.activity': 'Activity level',
    'p.goal': 'Goals', 'p.goalWeight': 'Goal weight (kg)', 'p.pace': 'Pace (kg/week)', 'p.paceHint': 'Around 0.5 is safe',
    'p.targetDate': 'Target date', 'p.carbLimit': 'Net carb limit (g/day)', 'p.carbHint': '20–50g is typical for keto',
    'p.proteinCoef': 'Protein factor (g/kg)', 'p.proteinHint': '1.2–1.6 is typical',
    'p.blood': 'Blood · Body composition', 'p.glucose': 'Glucose (mg/dL)', 'p.ketone': 'Blood ketones (mmol/L)',
    'p.ketoneHint': 'β-hydroxybutyrate. 0.5+ means ketosis', 'p.bodyFat': 'Body fat (%)',
    'p.limits': 'Conditions · Restrictions', 'p.conditions': 'Medical conditions', 'p.medications': 'Medications',
    'p.allergies': 'Allergies', 'p.dislikes': 'Disliked foods', 'p.notes': 'Notes',
    'p.calc': 'Auto-calculated (reference)', 'p.calcHint': 'Enter age, height and weight to see targets.',
    'p.bmr': 'BMR', 'p.tdee': 'TDEE', 'p.targetCal': 'Target calories',
    'p.ratio': 'Calorie split → fat {f}% / protein {p}% / carbs {c}%', 'p.currentKetosis': 'Current ketosis: {label}',
    'p.saved': 'Profile saved',
    'act.1': 'Sedentary (desk work)', 'act.2': 'Light (1–3×/week)', 'act.3': 'Moderate (3–5×/week)',
    'act.4': 'Active (6–7×/week)', 'act.5': 'Very active (physical job / 2×/day)',
    'c.add': 'Add checkup data', 'c.date': 'Exam date', 'c.memo': 'Notes', 'c.list': 'Records',
    'c.needOne': 'Enter at least one value', 'c.saved': 'Checkup data saved',
    'c.refHint': 'Ref {lo}–{hi}',
    'cm.systolic': 'Systolic BP', 'cm.diastolic': 'Diastolic BP', 'cm.hba1c': 'HbA1c', 'cm.fastingGlucose': 'Fasting glucose',
    'cm.totalChol': 'Total cholesterol', 'cm.ldl': 'LDL', 'cm.hdl': 'HDL', 'cm.triglycerides': 'Triglycerides',
    'cm.alt': 'ALT', 'cm.ast': 'AST', 'cm.ggtp': 'γ-GTP', 'cm.uricAcid': 'Uric acid',
    's.api': 'Claude API', 's.apiKey': 'API key', 's.show': 'Show', 's.hide': 'Hide',
    's.apiHint': 'Issued at console.anthropic.com. <b>Stored only in this device\'s browser</b> and used only for requests to Anthropic.',
    's.model': 'Model', 's.lang': 'Language / 言語',
    's.oura': 'OURA RING (optional)', 's.ouraToken': 'Personal Access Token',
    's.ouraTokenHint': 'Issue at cloud.ouraring.com → Personal Access Tokens. Then sync from Home.',
    's.ouraProxy': 'CORS proxy URL (if direct access fails)',
    's.ouraProxyHint': 'Browsers can\'t call Oura directly due to CORS. <code>{url}</code> is replaced with the target URL, otherwise it\'s appended.',
    's.health': 'Health data', 's.profileBtn': 'Profile · Health info', 's.checkupBtn': 'Checkup data',
    's.data': 'Data', 's.export': 'Export records as JSON',
    's.security': 'Security',
    's.securityBody': 'This personal app calls the Claude API directly from your browser. Your API key and health data are stored only on this device (localStorage / IndexedDB). Do not use on shared devices.',
    's.saved': 'Settings saved',
    's.backend': 'Server (subscription)', 's.supabaseUrl': 'Supabase URL', 's.supabaseAnon': 'Supabase anon key',
    's.backendHint': "Your Supabase project URL and anon key (public). Enables login, cloud sync and subscription.",
    's.account': 'Account',
    'a.email': 'Email', 'a.password': 'Password', 'a.signup': 'Sign up', 'a.signin': 'Sign in', 'a.signout': 'Sign out',
    'a.signedInAs': 'Signed in: {email}', 'a.status': 'Subscription', 'a.usage': 'This month',
    'a.needBackend': 'Enter your Supabase URL and anon key first.',
    'a.signupOk': 'Account created', 'a.confirmEmail': 'Confirmation email sent. Verify via the link, then sign in.',
    'a.signinOk': 'Signed in', 'a.signedOut': 'Signed out', 'a.authErr': 'Auth error: {e}',
    'pw.title': 'Monthly limit reached', 'pw.body': 'Upgrade to Pro to raise your limit. Subscribe from the Android app.',
    'plan.free': 'Free', 'plan.monthly': 'Monthly', 'plan.annual': 'Annual',
    'status.active': 'Active', 'status.free': 'Free', 'status.expired': 'Expired',
    'err.noKey': 'No API key set. Enter your Claude API key in Settings.',
    'err.badKey': 'Invalid API key. Check Settings.',
    'err.rateLimit': 'Rate limited. Wait a moment and retry.',
    'err.api': 'API error ({s}): {d}',
    'err.parse': "Couldn't parse the AI response.",
    'err.ouraNoToken': 'No Oura token set.',
    'err.ouraBadToken': 'Invalid Oura token. Check Settings.',
    'err.ouraApi': 'Oura API error ({s})',
    'err.ouraCors': "Couldn't reach Oura directly (browser CORS). Set a proxy URL in Settings.",
    'model.opus': 'Opus 4.8 (best quality)', 'model.sonnet': 'Sonnet 4.6 (fast, lower cost)', 'model.haiku': 'Haiku 4.5 (fastest, cheapest)',
  },
};

let _lang = null;

export function getLang() {
  if (_lang) return _lang;
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && dict[saved]) { _lang = saved; return _lang; }
  _lang = (navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en';
  return _lang;
}

export function setLang(lang) {
  if (!dict[lang]) return;
  _lang = lang;
  localStorage.setItem(LANG_KEY, lang);
}

// t('d.remaining', {n: 7.5}) → 「残り 7.5g」
export function t(key, vars) {
  let s = dict[getLang()][key] ?? dict.ja[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

// AIへの出力言語指示
export function aiLangInstruction() {
  return getLang() === 'en'
    ? 'IMPORTANT: Write all output text (dish_summary, feedback, suggestions, flags, and any prose) in natural English.'
    : '重要: すべての出力テキスト（dish_summary, feedback, suggestions, flags, 文章）は自然な日本語で書くこと。';
}
