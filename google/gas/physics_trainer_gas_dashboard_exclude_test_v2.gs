/* =========================================================
   Physics Trainer Log System v2.0
   Google Apps Script
   ========================================================= */

const LOG_SHEET_NAME = "Log";
const COUNT_SHEET_NAME = "Counts";
const QUESTION_SHEET_NAME = "QuestionTimes";
const SCHOOL_DOMAIN = "toyo.jp";
const AUTH_TOKEN_HOURS = 12;
const AUTH_SECRET_PROPERTY = "PHYSICS_AUTH_V3_SECRET";
const STAFF_TEST_STUDENT_IDS = {
  "gunji@toyo.jp": "ADMIN_GUNJI"
};
// 新システム公開後、そのURLに変更する（末尾の / を含めない）。
const NEW_TRAINER_BASE_URL = "__NEW_TRAINER_BASE_URL__";

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No postData. HTMLからPOSTしてください。");
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const logSheet = getOrCreateSheet_(ss, LOG_SHEET_NAME);
    const countSheet = getOrCreateSheet_(ss, COUNT_SHEET_NAME);
    const questionSheet = getOrCreateSheet_(ss, QUESTION_SHEET_NAME);

    setupHeaders_(logSheet, countSheet, questionSheet);

    const data = JSON.parse(e.postData.contents);

    const verified = verifyAuthToken_(data.authToken);
    if (!verified.ok) throw new Error("大学Googleアカウントでログインし直してください。");
    const studentId = verified.studentId;
    const stage = String(data.stage || "").trim();
    const score = Number(data.score || 0);
    const total = Number(data.total || 0);
    const elapsed = data.elapsed !== undefined ? Number(data.elapsed) : "";

    const questionTimes = Array.isArray(data.questionTimes) ? data.questionTimes : [];
    const questionResults = Array.isArray(data.questionResults) ? data.questionResults : [];

    const userAgent = String(data.userAgent || "");
    const screen = String(data.screen || "");

    const rate = total > 0 ? Math.round((score / total) * 100) + "%" : "";
    const passed = total > 0 && score / total >= 0.7 ? "○" : "";
    const now = new Date();

    const attempts = updateAttempts_(countSheet, studentId, stage, now);
    const stageAttempt = attempts.stageAttempt;
    const totalAttempt = attempts.totalAttempt;

    logSheet.appendRow([
      studentId,
      stage,
      score,
      total,
      rate,
      elapsed,
      now,
      passed,
      userAgent,
      screen
    ]);

    appendQuestionRows_({
      questionSheet,
      studentId,
      stage,
      stageAttempt,
      questionTimes,
      questionResults,
      now
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        result: "success",
        stageAttempt,
        totalAttempt
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        result: "error",
        message: err.message
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function setupHeaders_(logSheet, countSheet, questionSheet) {
  if (logSheet.getLastRow() === 0) {
    logSheet.appendRow([
      "学籍番号",
      "Stage",
      "得点",
      "問題数",
      "正答率",
      "所要時間[s]",
      "日時",
      "クリア",
      "UserAgent",
      "画面サイズ"
    ]);
  }

  if (countSheet.getLastRow() === 0) {
    countSheet.appendRow([
      "学籍番号",
      "Stage",
      "Stage挑戦回数",
      "全体挑戦回数",
      "最終更新"
    ]);
  }

  if (questionSheet.getLastRow() === 0) {
    questionSheet.appendRow([
      "学籍番号",
      "Stage",
      "Stage挑戦回数",
      "問題番号",
      "問題ID",
      "問題タイプ",
      "時間[s]",
      "正誤",
      "選択/入力",
      "正解",
      "問題文",
      "日時"
    ]);
  }
}

function updateAttempts_(countSheet, studentId, stage, now) {
  const lastRow = countSheet.getLastRow();

  let stageAttempt = 1;
  let totalAttempt = 1;
  let stageRow = null;
  const studentRows = [];

  if (lastRow >= 2) {
    const values = countSheet.getRange(2, 1, lastRow - 1, 5).getValues();

    for (let i = 0; i < values.length; i++) {
      const row = i + 2;
      const rowStudentId = String(values[i][0]).trim();
      const rowStage = String(values[i][1]).trim();

      if (rowStudentId === studentId) {
        studentRows.push(row);

        totalAttempt = Math.max(
          totalAttempt,
          Number(values[i][3] || 0) + 1
        );

        if (rowStage === stage) {
          stageRow = row;
          stageAttempt = Number(values[i][2] || 0) + 1;
        }
      }
    }
  }

  if (stageRow) {
    countSheet.getRange(stageRow, 3, 1, 3).setValues([[
      stageAttempt,
      totalAttempt,
      now
    ]]);
  } else {
    countSheet.appendRow([
      studentId,
      stage,
      stageAttempt,
      totalAttempt,
      now
    ]);
  }

  for (const row of studentRows) {
    countSheet.getRange(row, 4).setValue(totalAttempt);
    countSheet.getRange(row, 5).setValue(now);
  }

  return {
    stageAttempt,
    totalAttempt
  };
}

function appendQuestionRows_({
  questionSheet,
  studentId,
  stage,
  stageAttempt,
  questionTimes,
  questionResults,
  now
}) {
  if (!questionTimes.length && !questionResults.length) return;

  const n = Math.max(questionTimes.length, questionResults.length);
  const rows = [];

  for (let i = 0; i < n; i++) {
    const result = questionResults[i] || {};

    rows.push([
      studentId,
      stage,
      stageAttempt,
      i + 1,
      result.id || "",
      result.type || "",
      questionTimes[i] !== undefined ? Number(questionTimes[i]) : "",
      result.correct ? "○" : "×",
      result.selected || "",
      result.answer || "",
      result.prompt || "",
      now
    ]);
  }

  if (rows.length > 0) {
    questionSheet
      .getRange(questionSheet.getLastRow() + 1, 1, rows.length, rows[0].length)
      .setValues(rows);
  }
}

function testPost() {
  const e = {
    postData: {
      contents: JSON.stringify({
        studentId: "TEST001",
        stage: "円運動 Stage1",
        score: 8,
        total: 10,
        elapsed: 95,
        questionTimes: [6, 8, 12],
        questionResults: [
          { id: "CM1_Q01", correct: true,  type: "deg2rad", selected: "π/6 [rad]", answer: "π/6 [rad]", prompt: "30 [°] は何 [rad] か？" },
          { id: "CM1_Q02", correct: true,  type: "rad2deg", selected: "45 [°]", answer: "45 [°]", prompt: "π/4 [rad] は何 [°] か？" },
          { id: "CM1_Q03", correct: false, type: "deg2rad", selected: "π/2 [rad]", answer: "π/3 [rad]", prompt: "60 [°] は何 [rad] か？" }
        ],
        userAgent: "TEST_BROWSER",
        screen: "1440x900"
      })
    }
  };

  doPost(e);
}

/* =========================================================
   Physics Trainer Teacher Dashboard v1.1
   既存の physics_trainer_gas_log_system_v2.gs に追記して使います。

   使い方:
   1. このファイル全体を、既存GASプロジェクトの末尾へ貼り付けます。
   2. Webアプリとしてデプロイします。
   3. WebアプリURLを開くと教員用ダッシュボードが表示されます。

   任意:
   DASHBOARD_KEY に文字列を入れると、URL末尾に ?key=その文字列 が必要になります。
   ========================================================= */

const DASHBOARD_KEY = "gunji_physics_9017";
const STUDENT_DASHBOARD_TOKEN_DAYS = 2;
const STUDENT_DASHBOARD_LINK_WINDOW_MINUTES = 15;
const STUDENT_DASHBOARD_SECRET_PROPERTY = "STUDENT_DASHBOARD_SECRET";

/* ---------- ダッシュボード集計から除外する学籍番号 ---------- */
/* ここに入れた学籍番号、および下の接頭辞で始まる学籍番号は、
   Log / Counts / QuestionTimes には残したまま、ダッシュボード集計から除外されます。 */

const EXCLUDED_STUDENT_IDS = [
  "TEST001",
  "TEST002",
  "DEBUG001",
  "DEMO001"
];

const EXCLUDED_PREFIXES = [
  "TEST",
  "DEBUG",
  "DEMO",
  "ADMIN"
];

function isExcludedStudent_(studentId) {
  const id = String(studentId || "").trim().toUpperCase();

  if (EXCLUDED_STUDENT_IDS.includes(id)) return true;

  return EXCLUDED_PREFIXES.some(prefix => id.startsWith(prefix));
}

const DASHBOARD_UNIT_HEADERS_ = ["単元", "Unit", "unit", "分野", "カテゴリ", "Topic", "topic"];

/* 通常Stageと大問対策を進捗の分母にする。公式確認は別枠。 */
const STUDENT_STAGE_CATALOG = [
  "円運動/Stage1/弧度法",
  "円運動/Stage2/弧長",
  "円運動/Stage3/角速度と速さ",
  "円運動/Stage4/周期角速度速さ",
  "円運動/Stage5/向心加速度",
  "円運動/Stage6/記入式",
  "円運動/大問/万有引力",
  "バネ/Stage1/フックの法則",
  "バネ/Stage2/つりあい",
  "バネ/Stage3/位置エネ",
  "バネ/Stage4/エネ保",
  "バネ/Stage5/記入式",
  "バネ/test1/円運動するばね",
  "バネ/test2/水平バネ振り子",
  "熱/Stage1/温度変換",
  "熱/Stage2/熱容量",
  "熱/Stage3/Q=mcΔT",
  "熱/Stage4/統合",
  "熱/Stage5/熱量保存",
  "熱/Stage6/総合記述式"
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.view === "app") {
    return buildTrainerAppHtml_();
  }
  if (params.view === "my") {
    try {
      return HtmlService.createHtmlOutput(buildStudentDashboardHtml_(getAuthenticatedStudentId_()))
        .setTitle("自分の学習状況").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (err) {
      return buildUniversityAccountGuide_(err.message);
    }
  }
  if (params.view === "auth") {
    return buildAuthResponse_(params);
  }
  if (params.api === "progress") {
    const verified = verifyAuthToken_(params.token);
    const callback = String(params.callback || "");
    if (!isSafeJsonpCallback_(callback)) {
      return ContentService.createTextOutput("invalid callback");
    }
    if (!verified.ok) return jsonpResponse_(callback, { ok: false, error: "unauthorized" });
    const data = getStudentDashboardData_(verified.studentId);
    return jsonpResponse_(callback, {
      ok: true,
      studentId: verified.studentId,
      summary: data.summary,
      stages: data.stageRows.map(row => ({ stage: row.stage, status: row.status, attempts: row.attempts }))
    });
  }
  if (params.api === "studentDashboardLink") {
    return createStudentDashboardLinkResponse_(params);
  }

  if (params.view === "student") {
    const studentId = String(params.id || "").trim();
    const token = String(params.token || "").trim();
    if (!isValidStudentDashboardToken_(studentId, token)) {
      return HtmlService
        .createHtmlOutput("<p>この学習状況リンクは無効、または期限切れです。</p>")
        .setTitle("Physics Trainer Student Dashboard");
    }

    return HtmlService
      .createHtmlOutput(buildStudentDashboardHtml_(studentId))
      .setTitle("Physics Trainer Student Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  const key = String((e && e.parameter && e.parameter.key) || "");
  if (DASHBOARD_KEY && key !== DASHBOARD_KEY) {
    return HtmlService
      .createHtmlOutput("<p>閲覧権限がありません。</p>")
      .setTitle("Physics Trainer Dashboard");
  }

  return HtmlService
    .createHtmlOutput(buildTeacherDashboardHtml_())
    .setTitle("Physics Trainer Dashboard")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getAuthenticatedStudentId_() {
  const email = Session.getActiveUser().getEmail().trim().toLowerCase();
  const suffix = "@" + SCHOOL_DOMAIN.toLowerCase();
  if (!email || !email.endsWith(suffix)) throw new Error("大学Googleアカウントでログインしてください。");
  if (STAFF_TEST_STUDENT_IDS[email]) return STAFF_TEST_STUDENT_IDS[email];
  const localPart = email.slice(0, -suffix.length);
  const match = localPart.match(/^s(\d+)\d$/i);
  if (!match) throw new Error("学生用メールアドレスから学籍番号を取得できませんでした。");
  return match[1];
}

function buildUniversityAccountGuide_(detail) {
  return HtmlService.createHtmlOutput(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>大学アカウントでログイン</title><style>body{font-family:system-ui,sans-serif;background:#f5f7fb;color:#1f2937;margin:0}.card{max-width:620px;margin:10vh auto;background:#fff;border:1px solid #dbe2ea;border-radius:20px;padding:28px}a{display:inline-block;background:#176b87;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:800}</style></head><body><main class="card"><h1>大学Googleアカウントでログインしてください</h1><p>個人Googleアカウントでは物理トレーナーを利用できません。Googleのアカウント選択画面で <strong>@toyo.jp</strong> のアカウントを選択してください。</p><p>${escapeHtmlServer_(detail || "")}</p><p><a href="https://accounts.google.com/AccountChooser?hd=toyo.jp">アカウントを切り替える</a></p></main></body></html>`).setTitle("大学アカウントでログイン");
}

function saveAuthenticatedResult(payload) {
  const studentId = getAuthenticatedStudentId_();
  const safePayload = Object.assign({}, payload || {}, {
    studentId,
    authToken: createAuthToken_(studentId)
  });
  const output = doPost({ postData: { contents: JSON.stringify(safePayload) } });
  const result = JSON.parse(output.getContent());
  if (result.result !== "success") throw new Error(result.message || "結果を保存できませんでした。");
  return { ok: true, stageAttempt: result.stageAttempt, totalAttempt: result.totalAttempt };
}

function getAuthenticatedProgressForApp() {
  const studentId = getAuthenticatedStudentId_();
  const data = getStudentDashboardData_(studentId);
  return {
    ok: true,
    studentId,
    summary: data.summary,
    rankings: data.rankings,
    dashboardUrl: ScriptApp.getService().getUrl() + "?view=my",
    stages: data.stageRows.map(row => ({ stage: row.stage, status: row.status, attempts: row.attempts }))
  };
}

function buildTrainerAppHtml_() {
  let studentId;
  try {
    studentId = getAuthenticatedStudentId_();
  } catch (err) {
    return buildUniversityAccountGuide_(err.message);
  }
  const studentJson = JSON.stringify(studentId).replace(/</g, "\\u003c");
  return HtmlService.createHtmlOutput(`<!doctype html><html lang="ja"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1"><title>物理トレーナー</title>
  <style>html,body{height:100%;margin:0;background:#f5f7fb}iframe{display:block;width:100%;height:100%;border:0}</style></head>
  <body><iframe id="trainer" src="https://gunji-lab.github.io/physics_spring/google/index.html" title="物理トレーナー"></iframe>
  <script>
    const studentId = ${studentJson};
    const frame = document.getElementById("trainer");
    function sendIdentity(){ frame.contentWindow.postMessage({type:"physics:identity",studentId},"*"); }
    frame.addEventListener("load", sendIdentity);
    window.addEventListener("message", event => {
      if (event.source !== frame.contentWindow || !event.data) return;
      const data = event.data;
      if (data.type === "physics:ready") sendIdentity();
      if (data.type === "physics:save") {
        google.script.run
          .withSuccessHandler(result => frame.contentWindow.postMessage({type:"physics:saveResult",requestId:data.requestId,ok:true,result},"*"))
          .withFailureHandler(error => frame.contentWindow.postMessage({type:"physics:saveResult",requestId:data.requestId,ok:false,message:error.message},"*"))
          .saveAuthenticatedResult(data.payload);
      }
      if (data.type === "physics:progress") {
        google.script.run
          .withSuccessHandler(response => frame.contentWindow.postMessage({type:"physics:progressResult",response},"*"))
          .withFailureHandler(error => frame.contentWindow.postMessage({type:"physics:progressResult",response:{ok:false,error:error.message}},"*"))
          .getAuthenticatedProgressForApp();
      }
    });
  </script></body></html>`).setTitle("物理トレーナー").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function buildAuthResponse_(params) {
  const email = Session.getActiveUser().getEmail().trim().toLowerCase();
  const suffix = "@" + SCHOOL_DOMAIN.toLowerCase();
  if (!email || !email.endsWith(suffix)) {
    return HtmlService.createHtmlOutput(
      "<h2>大学Googleアカウントを確認できませんでした</h2><p>@" +
      escapeHtmlServer_(SCHOOL_DOMAIN) + " のアカウントで開いてください。</p>"
    ).setTitle("Physics Trainer ログイン");
  }

  const studentId = email.slice(0, -suffix.length);
  if (!/^[0-9A-Za-z._-]{3,30}$/.test(studentId)) {
    return HtmlService.createHtmlOutput("<p>アカウントから学籍番号を取得できませんでした。</p>")
      .setTitle("Physics Trainer ログイン");
  }

  const requested = String(params.return || "");
  const fallback = NEW_TRAINER_BASE_URL + "/index.html";
  const returnUrl = requested.indexOf(NEW_TRAINER_BASE_URL) === 0 ? requested : fallback;
  const token = createAuthToken_(studentId);
  const destination = returnUrl + "#auth=" + encodeURIComponent(token);

  return HtmlService.createHtmlOutput(`<!doctype html><html lang="ja"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1"><title>ログイン完了</title>
    <style>body{font-family:system-ui,sans-serif;background:#f5f7fb;color:#1f2937;margin:0}.card{max-width:560px;margin:10vh auto;background:#fff;border:1px solid #dbe2ea;border-radius:20px;padding:28px;box-shadow:0 12px 32px #1f293714}a{display:inline-block;background:#176b87;color:#fff;text-decoration:none;font-weight:800;padding:12px 18px;border-radius:10px}</style></head>
    <body><main class="card"><h1>ログインしました</h1><p>学籍番号 ${escapeHtmlServer_(studentId)} として物理トレーナーを利用します。メールアドレス自体は学習記録に保存しません。</p><p><a href="${escapeHtmlServer_(destination)}">トレーナーへ進む</a></p></main></body></html>`)
    .setTitle("Physics Trainer ログイン");
}

function createAuthToken_(studentId) {
  const expires = Date.now() + AUTH_TOKEN_HOURS * 60 * 60 * 1000;
  const body = String(studentId) + "." + expires;
  return body + "." + signAuthBody_(body);
}

function verifyAuthToken_(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return { ok: false };
  const studentId = parts[0];
  const expires = Number(parts[1]);
  const body = studentId + "." + parts[1];
  if (!studentId || !expires || expires < Date.now()) return { ok: false };
  if (signAuthBody_(body) !== parts[2]) return { ok: false };
  return { ok: true, studentId };
}

function signAuthBody_(body) {
  const signature = Utilities.computeHmacSha256Signature(body, getAuthSecret_());
  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/, "");
}

function getAuthSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty(AUTH_SECRET_PROPERTY);
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty(AUTH_SECRET_PROPERTY, secret);
  }
  return secret;
}

function getTeacherDashboardData(filters) {
  filters = filters || {};

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  const countSheet = ss.getSheetByName(COUNT_SHEET_NAME);
  const questionSheet = ss.getSheetByName(QUESTION_SHEET_NAME);

  const logs = logSheet ? readSheetObjects_(logSheet) : [];
  const counts = countSheet ? readSheetObjects_(countSheet) : [];
  const questionRows = questionSheet ? readSheetObjects_(questionSheet) : [];

  const filteredLogsSource =
    logs.filter(row => !isExcludedStudent_(row["学籍番号"]));

  const filteredCountsSource =
    counts.filter(row => !isExcludedStudent_(row["学籍番号"]));

  const filteredQuestionSource =
    questionRows.filter(row => !isExcludedStudent_(row["学籍番号"]));

  const unitFilter = String(filters.unit || "");
  const stageFilter = String(filters.stage || "");
  const studentFilter = String(filters.student || "").trim().toLowerCase();
  const days = Number(filters.days || 0);
  const since = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  const filteredLogs = filteredLogsSource.filter(row => {
    return rowMatchesDashboardFilters_(row, unitFilter, stageFilter, studentFilter, since);
  });

  const filteredQuestionRows = filteredQuestionSource.filter(row => {
    return rowMatchesDashboardFilters_(row, unitFilter, stageFilter, studentFilter, since);
  });

  const unitSourceRows = filteredLogsSource.concat(filteredQuestionSource);
  const units = Array.from(new Set(unitSourceRows.map(row => getRowUnit_(row)).filter(Boolean))).sort();
  const stageSourceRows = unitFilter
    ? filteredLogsSource.filter(row => getRowUnit_(row) === unitFilter)
    : filteredLogsSource;
  const stages = Array.from(new Set(stageSourceRows.map(row => String(row["Stage"] || "")).filter(Boolean))).sort();
  const summary = buildSummary_(filteredLogs);
  const unitRows = buildUnitRows_(filteredLogs);
  const stageRows = buildStageRows_(filteredLogs);
  const bottleneckStages = buildBottleneckStageRows_(stageRows);
  const studentRows = buildStudentRows_(filteredLogs, filteredCountsSource);
  const studentLeaderboards = buildStudentLeaderboards_(filteredLogs);
  const questionStats = buildQuestionStats_(filteredQuestionRows);
  const recentAttempts = buildRecentAttempts_(filteredLogs);

  return {
    generatedAt: new Date().toISOString(),
    units,
    stages,
    summary,
    unitRows,
    stageRows,
    bottleneckStages,
    studentRows,
    studentLeaderboards,
    questionStats,
    recentAttempts
  };
}

function buildStudentLeaderboards_(logs) {
  const map = {};

  logs.forEach(row => {
    const studentId = String(row["学籍番号"] || "").trim();
    if (!studentId) return;
    if (!map[studentId]) {
      map[studentId] = { studentId, attempts: 0, totalElapsed: 0 };
    }
    map[studentId].attempts++;
    map[studentId].totalElapsed += Number(row["所要時間[s]"] || 0);
  });

  const rows = Object.keys(map).map(studentId => map[studentId]);
  const byValue = key => (a, b) => {
    if (b[key] !== a[key]) return b[key] - a[key];
    return compareStudentIds_(a.studentId, b.studentId);
  };

  return {
    totalElapsed: rows.filter(row => row.totalElapsed > 0)
      .sort(byValue("totalElapsed")).slice(0, 10),
    attempts: rows.filter(row => row.attempts > 0)
      .sort(byValue("attempts")).slice(0, 10)
  };
}

function readSheetObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h || "").trim());
  return values.slice(1).filter(row => row.some(v => v !== "")).map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function rowMatchesDashboardFilters_(row, unitFilter, stageFilter, studentFilter, since) {
  const unit = getRowUnit_(row);
  const stage = String(row["Stage"] || "");
  const studentId = String(row["学籍番号"] || "");
  const date = asDate_(row["日時"]);
  if (unitFilter && unit !== unitFilter) return false;
  if (stageFilter && stage !== stageFilter) return false;
  if (studentFilter && studentId.toLowerCase().indexOf(studentFilter) === -1) return false;
  if (since && (!date || date < since)) return false;
  return true;
}

function getRowUnit_(row) {
  for (let i = 0; i < DASHBOARD_UNIT_HEADERS_.length; i++) {
    const value = String(row[DASHBOARD_UNIT_HEADERS_[i]] || "").trim();
    if (value) return value;
  }

  const stage = String(row["Stage"] || "").trim();
  const match = stage.match(/^(.+?)[\s_＿:：/／|｜-](.+)$/);
  if (match && match[1]) return match[1].trim();
  return "未設定";
}

function buildSummary_(logs) {
  const students = new Set();
  let scoreSum = 0;
  let totalSum = 0;
  let elapsedSum = 0;
  let elapsedCount = 0;
  let passed = 0;

  logs.forEach(row => {
    const studentId = String(row["学籍番号"] || "");
    if (studentId) students.add(studentId);

    const score = Number(row["得点"] || 0);
    const total = Number(row["問題数"] || 0);
    scoreSum += score;
    totalSum += total;

    const elapsed = Number(row["所要時間[s]"] || 0);
    if (elapsed > 0) {
      elapsedSum += elapsed;
      elapsedCount++;
    }

    if (String(row["クリア"] || "") === "○") passed++;
  });

  return {
    attempts: logs.length,
    students: students.size,
    averageRate: totalSum > 0 ? Math.round(scoreSum / totalSum * 100) : 0,
    passRate: logs.length > 0 ? Math.round(passed / logs.length * 100) : 0,
    averageElapsed: elapsedCount > 0 ? Math.round(elapsedSum / elapsedCount) : 0
  };
}

function buildUnitRows_(logs) {
  const map = {};

  logs.forEach(row => {
    const unit = getRowUnit_(row);
    if (!map[unit]) {
      map[unit] = {
        unit,
        attempts: 0,
        studentSet: {},
        scoreSum: 0,
        totalSum: 0,
        passed: 0,
        elapsedSum: 0,
        elapsedCount: 0,
        latest: null
      };
    }

    const item = map[unit];
    const studentId = String(row["学籍番号"] || "");
    const score = Number(row["得点"] || 0);
    const total = Number(row["問題数"] || 0);
    const elapsed = Number(row["所要時間[s]"] || 0);
    const date = asDate_(row["日時"]);

    item.attempts++;
    if (studentId) item.studentSet[studentId] = true;
    item.scoreSum += score;
    item.totalSum += total;
    if (String(row["クリア"] || "") === "○") item.passed++;
    if (elapsed > 0) {
      item.elapsedSum += elapsed;
      item.elapsedCount++;
    }
    if (date && (!item.latest || date > item.latest)) item.latest = date;
  });

  return Object.keys(map).map(unit => {
    const item = map[unit];
    return {
      unit: item.unit,
      attempts: item.attempts,
      students: Object.keys(item.studentSet).length,
      averageRate: item.totalSum > 0 ? Math.round(item.scoreSum / item.totalSum * 100) : 0,
      passRate: item.attempts > 0 ? Math.round(item.passed / item.attempts * 100) : 0,
      averageElapsed: item.elapsedCount > 0 ? Math.round(item.elapsedSum / item.elapsedCount) : 0,
      latest: item.latest ? item.latest.toISOString() : ""
    };
  }).sort((a, b) => b.attempts - a.attempts);
}

function buildStageRows_(logs) {
  const map = {};

  logs.forEach(row => {
    const stage = String(row["Stage"] || "未設定");
    if (!map[stage]) {
      map[stage] = {
        stage,
        attempts: 0,
        studentSet: {},
        scoreSum: 0,
        totalSum: 0,
        passed: 0,
        elapsedSum: 0,
        elapsedCount: 0,
        latest: null
      };
    }

    const item = map[stage];
    const studentId = String(row["学籍番号"] || "");
    const score = Number(row["得点"] || 0);
    const total = Number(row["問題数"] || 0);
    const elapsed = Number(row["所要時間[s]"] || 0);
    const date = asDate_(row["日時"]);

    item.attempts++;
    if (studentId) item.studentSet[studentId] = true;
    item.scoreSum += score;
    item.totalSum += total;
    if (String(row["クリア"] || "") === "○") item.passed++;
    if (elapsed > 0) {
      item.elapsedSum += elapsed;
      item.elapsedCount++;
    }
    if (date && (!item.latest || date > item.latest)) item.latest = date;
  });

  return Object.keys(map).map(stage => {
    const item = map[stage];
    return {
      stage: item.stage,
      attempts: item.attempts,
      students: Object.keys(item.studentSet).length,
      averageRate: item.totalSum > 0 ? Math.round(item.scoreSum / item.totalSum * 100) : 0,
      passRate: item.attempts > 0 ? Math.round(item.passed / item.attempts * 100) : 0,
      averageElapsed: item.elapsedCount > 0 ? Math.round(item.elapsedSum / item.elapsedCount) : 0,
      latest: item.latest ? item.latest.toISOString() : ""
    };
  }).sort((a, b) => b.attempts - a.attempts);
}

function buildBottleneckStageRows_(stageRows) {
  if (!stageRows.length) return [];

  const maxElapsed = stageRows.reduce((max, row) => {
    return Math.max(max, Number(row.averageElapsed || 0));
  }, 0);

  return stageRows.map(row => {
    const ratePenalty = 100 - Number(row.averageRate || 0);
    const passPenalty = 100 - Number(row.passRate || 0);
    const timePenalty = maxElapsed > 0
      ? Math.round(Number(row.averageElapsed || 0) / maxElapsed * 100)
      : 0;
    const score = Math.round(ratePenalty * 0.45 + passPenalty * 0.35 + timePenalty * 0.2);
    const reasons = [];

    if (row.averageRate < 70) reasons.push("平均正答率が低め");
    if (row.passRate < 70) reasons.push("クリア率が低め");
    if (maxElapsed > 0 && row.averageElapsed >= maxElapsed * 0.8) reasons.push("時間が長め");
    if (!reasons.length) reasons.push("相対的に注意");

    return {
      stage: row.stage,
      attempts: row.attempts,
      students: row.students,
      averageRate: row.averageRate,
      passRate: row.passRate,
      averageElapsed: row.averageElapsed,
      score,
      reason: reasons.join(" / ")
    };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.attempts - a.attempts;
  }).slice(0, 8);
}

function buildStudentRows_(logs, counts) {
  const totalAttemptsByStudent = {};
  counts.forEach(row => {
    const studentId = String(row["学籍番号"] || "");
    const totalAttempt = Number(row["全体挑戦回数"] || 0);
    if (!studentId) return;
    totalAttemptsByStudent[studentId] = Math.max(totalAttemptsByStudent[studentId] || 0, totalAttempt);
  });

  const map = {};
  logs.forEach(row => {
    const studentId = String(row["学籍番号"] || "未入力");
    const stage = String(row["Stage"] || "");
    const score = Number(row["得点"] || 0);
    const total = Number(row["問題数"] || 0);
    const rate = total > 0 ? Math.round(score / total * 100) : 0;
    const elapsed = Number(row["所要時間[s]"] || 0);
    const date = asDate_(row["日時"]);
    const passed = String(row["クリア"] || "") === "○";

    if (!map[studentId]) {
      map[studentId] = {
        studentId,
        attempts: 0,
        scoreSum: 0,
        totalSum: 0,
        bestRate: 0,
        latestRate: 0,
        latestStage: "",
        latestElapsed: 0,
        latest: null,
        stages: {},
        clearedStages: {}
      };
    }

    const item = map[studentId];
    item.attempts++;
    item.scoreSum += score;
    item.totalSum += total;
    item.bestRate = Math.max(item.bestRate, rate);
    if (stage) item.stages[stage] = true;
    if (passed && stage) item.clearedStages[stage] = true;

    if (!item.latest || (date && date > item.latest)) {
      item.latest = date;
      item.latestRate = rate;
      item.latestStage = stage;
      item.latestElapsed = elapsed;
    }
  });

  return Object.keys(map).map(studentId => {
    const item = map[studentId];
    const stageLabels = Object.keys(item.stages).sort();
    const clearedStageLabels = Object.keys(item.clearedStages).sort();
    return {
      studentId: item.studentId,
      stages: stageLabels.length,
      stageLabels,
      attempts: item.attempts,
      totalAttempts: totalAttemptsByStudent[item.studentId] || item.attempts,
      averageRate: item.totalSum > 0 ? Math.round(item.scoreSum / item.totalSum * 100) : 0,
      latestRate: item.latestRate,
      bestRate: item.bestRate,
      latestStage: item.latestStage,
      latestElapsed: item.latestElapsed,
      clearedStages: clearedStageLabels.length,
      clearedStageLabels,
      latest: item.latest ? item.latest.toISOString() : ""
    };
  }).sort((a, b) => compareStudentIds_(a.studentId, b.studentId));
}

function compareStudentIds_(a, b) {
  const idA = String(a || "").trim();
  const idB = String(b || "").trim();
  const standardPattern = /^19\d02\d0\d{3}$/;
  const standardA = standardPattern.test(idA);
  const standardB = standardPattern.test(idB);

  if (standardA !== standardB) return standardA ? -1 : 1;
  return idA.localeCompare(idB, "ja", { numeric: true, sensitivity: "base" });
}

function buildQuestionStats_(questionRows) {
  const map = {};

  questionRows.forEach(row => {
    const stage = String(row["Stage"] || "");
    const problemId = String(row["問題ID"] || "");
    const prompt = String(row["問題文"] || "");
    const key = stage + "\n" + (problemId || prompt);
    const time = Number(row["時間[s]"] || 0);
    const correct = String(row["正誤"] || "") === "○";
    const selected = String(row["選択/入力"] || "");

    if (!map[key]) {
      map[key] = {
        stage,
        problemId,
        prompt,
        attempts: 0,
        correct: 0,
        timeSum: 0,
        timeCount: 0,
        wrongAnswers: {}
      };
    }

    const item = map[key];
    item.attempts++;
    if (correct) item.correct++;
    if (time > 0) {
      item.timeSum += time;
      item.timeCount++;
    }
    if (!correct && selected) {
      item.wrongAnswers[selected] = (item.wrongAnswers[selected] || 0) + 1;
    }
  });

  return Object.keys(map).map(key => {
    const item = map[key];
    const wrongs = Object.keys(item.wrongAnswers)
      .map(answer => ({ answer, count: item.wrongAnswers[answer] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      stage: item.stage,
      problemId: item.problemId,
      prompt: item.prompt,
      attempts: item.attempts,
      correctRate: item.attempts > 0 ? Math.round(item.correct / item.attempts * 100) : 0,
      averageTime: item.timeCount > 0 ? Math.round(item.timeSum / item.timeCount) : 0,
      wrongAnswers: wrongs
    };
  }).sort((a, b) => {
    if (a.correctRate !== b.correctRate) return a.correctRate - b.correctRate;
    return b.attempts - a.attempts;
  }).slice(0, 80);
}

function buildRecentAttempts_(logs) {
  return logs.map(row => {
    const score = Number(row["得点"] || 0);
    const total = Number(row["問題数"] || 0);
    return {
      studentId: String(row["学籍番号"] || ""),
      stage: String(row["Stage"] || ""),
      score,
      total,
      rate: total > 0 ? Math.round(score / total * 100) : 0,
      elapsed: Number(row["所要時間[s]"] || 0),
      cleared: String(row["クリア"] || "") === "○",
      date: asDate_(row["日時"]) ? asDate_(row["日時"]).toISOString() : ""
    };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30);
}

function asDate_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value)) return value;
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date) ? null : date;
}

function createStudentDashboardLinkResponse_(params) {
  const callback = String(params.callback || "");
  const studentId = String(params.id || params.studentId || "").trim();

  if (!isSafeJsonpCallback_(callback)) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: "invalid_callback" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (!studentId || isExcludedStudent_(studentId)) {
    return jsonpResponse_(callback, { ok: false, error: "invalid_student" });
  }

  if (!hasRecentStudentAttempt_(studentId, STUDENT_DASHBOARD_LINK_WINDOW_MINUTES)) {
    return jsonpResponse_(callback, { ok: false, error: "no_recent_attempt" });
  }

  return jsonpResponse_(callback, {
    ok: true,
    url: buildStudentDashboardUrl_(studentId)
  });
}

function jsonpResponse_(callback, payload) {
  return ContentService
    .createTextOutput(callback + "(" + JSON.stringify(payload) + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function isSafeJsonpCallback_(callback) {
  return /^[A-Za-z_$][0-9A-Za-z_$]*(\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(callback);
}

function hasRecentStudentAttempt_(studentId, minutes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet || logSheet.getLastRow() < 2) return false;

  const rows = readSheetObjects_(logSheet);
  const now = Date.now();
  const windowMs = Number(minutes || 15) * 60 * 1000;
  const targetId = String(studentId || "").trim();

  return rows.some(row => {
    const rowStudentId = String(row["学籍番号"] || "").trim();
    const date = asDate_(row["日時"]);
    return rowStudentId === targetId && date && now - date.getTime() <= windowMs;
  });
}

function buildStudentDashboardUrl_(studentId) {
  const baseUrl = ScriptApp.getService().getUrl();
  const token = createStudentDashboardToken_(studentId, 0);
  return baseUrl +
    "?view=student&id=" + encodeURIComponent(studentId) +
    "&token=" + encodeURIComponent(token);
}

function createStudentDashboardToken_(studentId, dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() + Number(dayOffset || 0));
  const day = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyyMMdd");
  const message = String(studentId || "").trim() + "|" + day;
  const signature = Utilities.computeHmacSha256Signature(message, getStudentDashboardSecret_());
  return Utilities.base64EncodeWebSafe(signature).replace(/=+$/, "").slice(0, 40);
}

function isValidStudentDashboardToken_(studentId, token) {
  const id = String(studentId || "").trim();
  const value = String(token || "").trim();
  if (!id || !value || isExcludedStudent_(id)) return false;

  for (let i = 0; i < STUDENT_DASHBOARD_TOKEN_DAYS; i++) {
    if (createStudentDashboardToken_(id, -i) === value) return true;
  }
  return false;
}

function getStudentDashboardSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty(STUDENT_DASHBOARD_SECRET_PROPERTY);
  if (!secret) {
    secret = [
      Utilities.getUuid(),
      Utilities.getUuid(),
      String(Date.now())
    ].join(":");
    props.setProperty(STUDENT_DASHBOARD_SECRET_PROPERTY, secret);
  }
  return secret;
}

function getStudentDashboardData_(studentId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  const targetId = String(studentId || "").trim();

  const logs = logSheet ? readSheetObjects_(logSheet)
    .filter(row => String(row["学籍番号"] || "").trim() === targetId) : [];
  const allLogs = logSheet ? readSheetObjects_(logSheet)
    .filter(row => !isExcludedStudent_(row["学籍番号"])) : [];

  let scoreSum = 0;
  let totalSum = 0;
  let elapsedSum = 0;
  let cleared = 0;
  let latest = null;
  const stageMap = {};

  logs.forEach(row => {
    const stage = String(row["Stage"] || "未設定");
    const score = Number(row["得点"] || 0);
    const total = Number(row["問題数"] || 0);
    const elapsed = Number(row["所要時間[s]"] || 0);
    const passed = String(row["クリア"] || "") === "○";
    const date = asDate_(row["日時"]);
    const rate = total > 0 ? Math.round(score / total * 100) : 0;

    scoreSum += score;
    totalSum += total;
    if (elapsed > 0) elapsedSum += elapsed;
    if (passed) cleared++;
    if (date && (!latest || date > latest)) latest = date;

    if (!stageMap[stage]) {
      stageMap[stage] = {
        stage,
        attempts: 0,
        clears: 0,
        scoreSum: 0,
        totalSum: 0,
        elapsedSum: 0,
        elapsedCount: 0,
        bestRate: 0,
        latestRate: 0,
        latest: null
      };
    }

    const item = stageMap[stage];
    item.attempts++;
    item.scoreSum += score;
    item.totalSum += total;
    if (elapsed > 0) {
      item.elapsedSum += elapsed;
      item.elapsedCount++;
    }
    if (passed) item.clears++;
    item.bestRate = Math.max(item.bestRate, rate);
    if (!item.latest || (date && date > item.latest)) {
      item.latest = date;
      item.latestRate = rate;
    }
  });

  const stageRows = Object.keys(stageMap).map(stage => {
    const item = stageMap[stage];
    const averageRate = item.totalSum > 0 ? Math.round(item.scoreSum / item.totalSum * 100) : 0;
    const averageElapsed = item.elapsedCount > 0 ? Math.round(item.elapsedSum / item.elapsedCount) : 0;
    return {
      stage: item.stage,
      status: item.clears > 0 ? "クリア済み" : "挑戦済み",
      attempts: item.attempts,
      clears: item.clears,
      averageRate,
      bestRate: item.bestRate,
      latestRate: item.latestRate,
      averageElapsed,
      latest: item.latest ? item.latest.toISOString() : ""
    };
  }).sort((a, b) => a.stage.localeCompare(b.stage, "ja"));

  const clearedStageNames = new Set(stageRows
    .filter(row => row.status === "クリア済み")
    .map(row => row.stage));
  const clearedCatalogStages = STUDENT_STAGE_CATALOG
    .filter(stage => clearedStageNames.has(stage)).length;
  const totalCatalogStages = STUDENT_STAGE_CATALOG.length;
  const sectionRows = buildStudentSectionRows_(logs, clearedStageNames);

  return {
    studentId: targetId,
    generatedAt: new Date().toISOString(),
    summary: {
      attempts: logs.length,
      cleared,
      stages: totalCatalogStages,
      clearedStages: clearedCatalogStages,
      stageProgressPercent: totalCatalogStages > 0
        ? Math.round(clearedCatalogStages / totalCatalogStages * 100)
        : 0,
      totalElapsed: elapsedSum,
      averageRate: totalSum > 0 ? Math.round(scoreSum / totalSum * 100) : 0,
      latest: latest ? latest.toISOString() : ""
    },
    stageRows,
    sectionRows,
    recommendations: buildStudentRecommendations_(stageRows),
    rankings: buildStudentRankings_(targetId, allLogs),
    recentAttempts: buildRecentAttempts_(logs).slice(0, 3)
  };
}

function buildStudentSectionRows_(logs, clearedStageNames) {
  const sections = ["円運動", "バネ", "熱"];

  return sections.map(section => {
    const stages = STUDENT_STAGE_CATALOG
      .filter(stage => stage.indexOf(section + "/") === 0);
    const stageSet = new Set(stages);
    const sectionLogs = logs.filter(row => stageSet.has(String(row["Stage"] || "")));
    const scoreSum = sectionLogs.reduce((sum, row) => sum + Number(row["得点"] || 0), 0);
    const totalSum = sectionLogs.reduce((sum, row) => sum + Number(row["問題数"] || 0), 0);
    const clearedStages = stages.filter(stage => clearedStageNames.has(stage)).length;
    const totalStages = stages.length;

    return {
      section,
      clearedStages,
      totalStages,
      progressPercent: totalStages > 0
        ? Math.round(clearedStages / totalStages * 100)
        : 0,
      averageRate: totalSum > 0 ? Math.round(scoreSum / totalSum * 100) : 0
    };
  });
}

function buildStudentRecommendations_(stageRows) {
  const nextStages = stageRows.map(row => {
    const needsClear = row.status !== "クリア済み";
    const weak = row.averageRate < 70 || row.latestRate < 70;
    const slow = row.averageElapsed >= 30;
    let priority = 0;
    const reasons = [];

    if (needsClear) {
      priority += 50;
      reasons.push("まだクリアしていない");
    }
    if (weak) {
      priority += 35;
      reasons.push("正答率を上げたい");
    }
    if (slow) {
      priority += 15;
      reasons.push("時間がかかりやすい");
    }
    priority += Math.min(10, row.attempts);

    return {
      stage: row.stage,
      priority,
      averageRate: row.averageRate,
      latestRate: row.latestRate,
      averageElapsed: row.averageElapsed,
      attempts: row.attempts,
      reason: reasons.length ? reasons.join(" / ") : "維持・確認におすすめ"
    };
  }).sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.averageRate - b.averageRate;
  }).slice(0, 3);

  return {
    nextStages
  };
}

function buildStudentRankings_(studentId, logs) {
  const map = {};
  logs.forEach(row => {
    const id = String(row["学籍番号"] || "").trim();
    if (!id) return;
    if (!map[id]) {
      map[id] = {
        studentId: id,
        attempts: 0,
        totalElapsed: 0
      };
    }
    map[id].attempts++;
    map[id].totalElapsed += Number(row["所要時間[s]"] || 0);
  });

  return {
    totalElapsed: getStudentRank_(studentId, Object.keys(map).map(id => ({
      studentId: id,
      value: map[id].totalElapsed
    }))),
    attempts: getStudentRank_(studentId, Object.keys(map).map(id => ({
      studentId: id,
      value: map[id].attempts
    })))
  };
}

function getStudentRank_(studentId, rows) {
  const sorted = rows
    .filter(row => Number(row.value || 0) > 0)
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.studentId.localeCompare(b.studentId);
    });
  const index = sorted.findIndex(row => row.studentId === studentId);
  if (index < 0) {
    return { rank: null, total: sorted.length, value: 0 };
  }
  return {
    rank: index + 1,
    total: sorted.length,
    value: sorted[index].value
  };
}

function buildStudentDashboardHtml_(studentId) {
  const data = getStudentDashboardData_(studentId);
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root{--bg:#f7f8fb;--panel:#fff;--line:#d9dee8;--text:#182033;--muted:#687389;--accent:#0f766e;--accent-soft:#dff4f1;--bad:#b91c1c;--warn:#b45309;--good:#15803d}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.5}
    header{background:var(--panel);border-bottom:1px solid var(--line);padding:18px 24px 14px;position:sticky;top:0;z-index:10}
    h1{margin:0 0 4px;font-size:22px;font-weight:700;letter-spacing:0}
    .sub{color:var(--muted);font-size:13px}
    main{padding:18px 24px 32px;display:grid;gap:18px}
    .kpis{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:12px}
    .kpi,section{background:var(--panel);border:1px solid var(--line);border-radius:8px}
    .kpi{padding:14px;min-height:92px}.kpi .label{color:var(--muted);font-size:12px;font-weight:700}.kpi .value{font-size:28px;font-weight:800;margin-top:6px}
    .kpi.progress-kpi{border-color:#8ed3cb;background:#f4fbfa}.kpi-progress{height:10px;border-radius:999px;background:#d8e5e3;overflow:hidden;margin-top:8px}.kpi-progress span{display:block;height:100%;border-radius:inherit;background:var(--accent)}.kpi-progress-note{color:var(--accent);font-size:12px;font-weight:800;margin-top:5px}
    .grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.8fr);gap:18px}
    section{overflow:hidden}section h2{margin:0;padding:12px 14px;border-bottom:1px solid var(--line);font-size:15px}
    .cards{display:grid;gap:10px;padding:14px}.card{border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff}.card-title{font-weight:800}.meta{color:var(--muted);font-size:13px;margin-top:4px}
    .recommend-grid{display:grid;grid-template-columns:1fr;gap:12px;padding:14px}.recommend-card{border:1px solid var(--line);border-radius:8px;padding:13px;background:#fff}.recommend-card.primary{border-color:#8ed3cb;background:#f4fbfa}.recommend-label{color:var(--muted);font-size:12px;font-weight:800}.recommend-title{font-weight:900;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted);font-size:12px;background:#fbfcfe}
    .bar{display:flex;align-items:center;gap:8px}.track{height:8px;border-radius:999px;background:#e9edf4;overflow:hidden;min-width:90px;flex:1}.fill{display:block;height:100%;background:var(--accent)}.bar.low .fill{background:var(--bad)}.bar.mid .fill{background:var(--warn)}
    .pill{display:inline-flex;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:800;background:var(--accent-soft);color:var(--accent)}.pill.clear{background:#dcfce7;color:var(--good)}.pill.try{background:#fef3c7;color:var(--warn)}
    .rank-grid{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:12px;padding:14px}.rank-card{border:1px solid var(--line);border-radius:8px;padding:14px;background:#fff}.rank-label{color:var(--muted);font-size:12px;font-weight:800}.rank-value{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:20px;font-weight:900}.rank-badge{display:inline-flex;align-items:center;justify-content:center;min-width:44px;height:34px;border-radius:999px;background:#eef2f7;color:var(--text);font-size:15px;font-weight:900}.rank-badge.gold{background:#fef3c7;color:#92400e}.rank-badge.silver{background:#e5e7eb;color:#374151}.rank-badge.bronze{background:#ffedd5;color:#9a3412}.rank-note{color:var(--muted);font-size:12px;margin-top:4px}
    .muted{color:var(--muted);padding:14px}.num{font-variant-numeric:tabular-nums;font-weight:700}.prompt{max-width:360px}
    @media(max-width:900px){.kpis,.grid,.recommend-grid{grid-template-columns:1fr}header,main{padding-left:14px;padding-right:14px}table,thead,tbody,tr,th,td{display:block}thead{display:none}td{display:grid;grid-template-columns:110px 1fr;gap:8px}td::before{content:attr(data-label);color:var(--muted);font-weight:700}}
  </style>
</head>
<body>
  <header>
    <h1>学習ダッシュボード</h1>
    <div class="sub">学籍番号 ${escapeHtmlServer_(data.studentId)} / 最終更新 <span id="generatedAt"></span></div>
  </header>
  <main>
    <div class="kpis">
      <div class="kpi"><div class="label">総学習時間</div><div class="value" id="totalElapsed"></div></div>
      <div class="kpi"><div class="label">挑戦回数</div><div class="value">${data.summary.attempts}</div></div>
      <div class="kpi"><div class="label">平均正答率</div><div class="value">${data.summary.averageRate}%</div></div>
      <div class="kpi progress-kpi"><div class="label">クリアStage</div><div class="value">${data.summary.clearedStages}/${data.summary.stages}</div><div class="kpi-progress" aria-label="Stage進捗 ${data.summary.stageProgressPercent}%"><span style="width:${data.summary.stageProgressPercent}%"></span></div><div class="kpi-progress-note">全Stageの ${data.summary.stageProgressPercent}%</div></div>
      <div class="kpi"><div class="label">クリア回数</div><div class="value">${data.summary.cleared}</div></div>
    </div>
    <section>
      <h2>あなたのランキング</h2>
      <div id="rankingCards" class="rank-grid"></div>
    </section>
    <section>
      <h2>次にやること</h2>
      <div id="recommendations" class="recommend-grid"></div>
    </section>
    <section>
      <h2>セクションごとの進捗</h2>
      <div class="table-wrap"><table id="sectionTable"></table></div>
    </section>
    <section>
      <h2>最近の学習履歴</h2>
      <div class="table-wrap"><table id="recentTable"></table></div>
    </section>
  </main>
  <script>
    const dashboardData = ${JSON.stringify(data)};
    document.getElementById("generatedAt").textContent = formatDate(dashboardData.generatedAt);
    document.getElementById("totalElapsed").textContent = formatSeconds(dashboardData.summary.totalElapsed);
    renderSectionTable(dashboardData.sectionRows);
    renderRecentTable(dashboardData.recentAttempts);
    renderRankings(dashboardData.rankings);
    renderRecommendations(dashboardData.recommendations);

    function renderSectionTable(rows){
      renderTable("sectionTable", ["セクション","クリアStage","進捗","平均正答率"], rows, row => [
        '<strong>' + escapeHtml(row.section) + '</strong>',
        num(row.clearedStages + " / " + row.totalStages),
        rateBar(row.progressPercent),
        rateBar(row.averageRate)
      ]);
    }
    function renderRecentTable(rows){
      renderTable("recentTable", ["日時","Stage","得点","正答率","時間","クリア"], rows, row => [
        escapeHtml(formatDate(row.date)),
        escapeHtml(row.stage),
        num(row.score + "/" + row.total),
        rateBar(row.rate),
        num(formatSeconds(row.elapsed)),
        '<span class="pill ' + (row.cleared ? "clear" : "try") + '">' + (row.cleared ? "クリア" : "挑戦") + '</span>'
      ]);
    }
    function renderRankings(rankings){
      const rows = [
        { label: "総学習時間", rank: rankings.totalElapsed, value: formatSeconds(rankings.totalElapsed.value) },
        { label: "挑戦回数", rank: rankings.attempts, value: rankings.attempts.value + "回" }
      ];
      document.getElementById("rankingCards").innerHTML = rows.map(row => {
        return '<div class="rank-card"><div class="rank-label">' + escapeHtml(row.label) + '</div>' +
          '<div class="rank-value">' + rankBadge(row.rank.rank) + '<span>' + escapeHtml(row.value) + '</span></div>' +
          '<div class="rank-note">' + rankText(row.rank) + '</div></div>';
      }).join("");
    }
    function rankBadge(rank){
      if (!rank) return '<span class="rank-badge">--</span>';
      if (rank === 1) return '<span class="rank-badge gold">1位</span>';
      if (rank === 2) return '<span class="rank-badge silver">2位</span>';
      if (rank === 3) return '<span class="rank-badge bronze">3位</span>';
      if (rank <= 10) return '<span class="rank-badge">' + rank + '位</span>';
      return '<span class="rank-badge">--</span>';
    }
    function rankText(info){
      if (!info || !info.rank) return "まだランキング対象のデータがありません。";
      if (info.rank <= 10) return info.total + "人中 " + info.rank + "位";
      return info.total + "人中 11位以下";
    }
    function renderRecommendations(recommendations){
      const target = document.getElementById("recommendations");
      const nextStages = (recommendations && recommendations.nextStages) || [];
      const first = nextStages[0];
      target.innerHTML = first
        ? '<div class="recommend-card primary"><div class="recommend-label">おすすめStage</div><div class="recommend-title">' + escapeHtml(first.stage) + '</div><div class="meta">' + escapeHtml(first.reason) + ' / 平均 ' + first.averageRate + '% / 平均時間 ' + formatSeconds(first.averageElapsed) + '</div></div>'
        : '<div class="recommend-card primary"><div class="recommend-label">おすすめStage</div><div class="recommend-title">まだ候補がありません</div><div class="meta">学習データが増えると表示されます。</div></div>';
    }
    function renderTable(id, headers, rows, mapper){
      const table = document.getElementById(id);
      const head = "<thead><tr>" + headers.map(h => "<th>" + escapeHtml(h) + "</th>").join("") + "</tr></thead>";
      const body = rows.length ? rows.map(row => "<tr>" + mapper(row).map((cell, i) => '<td data-label="' + escapeHtml(headers[i]) + '">' + cell + "</td>").join("") + "</tr>").join("") : '<tr><td colspan="' + headers.length + '" class="muted">まだデータがありません。</td></tr>';
      table.innerHTML = head + "<tbody>" + body + "</tbody>";
    }
    function rateBar(value){
      const n = Math.max(0, Math.min(100, Number(value || 0)));
      const cls = n < 50 ? "low" : (n < 70 ? "mid" : "");
      return '<div class="bar ' + cls + '"><span class="num">' + n + '%</span><span class="track"><span class="fill" style="width:' + n + '%"></span></span></div>';
    }
    function formatSeconds(value){
      const seconds = Number(value || 0);
      if (!seconds) return "-";
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      const hour = Math.floor(min / 60);
      const restMin = min % 60;
      if (hour) return hour + "時間" + restMin + "分";
      return min ? min + "分" + sec + "秒" : sec + "秒";
    }
    function formatDate(value){
      if (!value) return "-";
      const date = new Date(value);
      if (isNaN(date)) return "-";
      return date.toLocaleString("ja-JP", { month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
    }
    function num(value){ return '<span class="num">' + escapeHtml(String(value)) + '</span>'; }
    function escapeHtml(value){ return String(value ?? "").replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch])); }
  </script>
</body>
</html>`;
}

function escapeHtmlServer_(value) {
  return String(value || "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function buildTeacherDashboardHtml_() {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --bg: #f7f8fb;
      --panel: #ffffff;
      --line: #d9dee8;
      --text: #182033;
      --muted: #687389;
      --accent: #0f766e;
      --accent-soft: #dff4f1;
      --warn: #b45309;
      --bad: #b91c1c;
      --good: #15803d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    header {
      background: var(--panel);
      border-bottom: 1px solid var(--line);
      padding: 18px 24px 14px;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0;
    }
    .filters {
      display: grid;
      grid-template-columns: minmax(160px, 1fr) minmax(180px, 1.2fr) minmax(120px, .8fr) minmax(160px, 1fr) auto;
      gap: 10px;
      align-items: end;
    }
    label {
      display: grid;
      gap: 4px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }
    select, input, button {
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: #fff;
      color: var(--text);
      font: inherit;
      padding: 7px 10px;
    }
    button {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
      font-weight: 700;
      cursor: pointer;
    }
    main {
      padding: 18px 24px 32px;
      display: grid;
      gap: 18px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(5, minmax(120px, 1fr));
      gap: 12px;
    }
    .kpi, section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .kpi {
      padding: 14px;
      min-height: 92px;
    }
    .kpi .label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
    }
    .kpi .value {
      font-size: 28px;
      font-weight: 800;
      margin-top: 6px;
    }
    .visual-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr);
      gap: 18px;
    }
    section {
      overflow: hidden;
    }
    section h2 {
      margin: 0;
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      font-size: 15px;
    }
    .visual-list {
      display: grid;
      gap: 10px;
      padding: 14px;
    }
    .metric-row {
      display: grid;
      grid-template-columns: minmax(120px, 1fr) minmax(160px, 2fr) 52px;
      gap: 10px;
      align-items: center;
      min-height: 34px;
    }
    .metric-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 700;
    }
    .big-track {
      height: 14px;
      border-radius: 999px;
      background: #e9edf4;
      overflow: hidden;
    }
    .big-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #0f766e, #22a699);
    }
    .metric-row.low .big-fill { background: linear-gradient(90deg, #b91c1c, #e15b5b); }
    .metric-row.mid .big-fill { background: linear-gradient(90deg, #b45309, #e0a12a); }
    .watch-card {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 6px 12px;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #edf0f5;
    }
    .watch-card:last-child { border-bottom: 0; }
    .watch-id {
      font-weight: 800;
      font-size: 15px;
    }
    .watch-meta {
      color: var(--muted);
      font-size: 12px;
      grid-column: 1 / -1;
    }
    .bottleneck-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(180px, 1fr));
      gap: 12px;
      padding: 14px;
    }
    .bottleneck-card {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      padding: 12px;
    }
    .bottleneck-title {
      font-weight: 900;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .bottleneck-score {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .score-badge {
      min-width: 48px;
      border-radius: 999px;
      padding: 4px 9px;
      background: #fde8e8;
      color: var(--bad);
      font-weight: 900;
      text-align: center;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #eef2f7;
      color: var(--text);
      font-weight: 800;
      white-space: nowrap;
    }
    .pill.low { background: #fde8e8; color: var(--bad); }
    .pill.mid { background: #fff1d6; color: var(--warn); }
    .pill.ok { background: #e5f6eb; color: var(--good); }
    .grid-two {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 18px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border-bottom: 1px solid #edf0f5;
      padding: 9px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-size: 12px;
      background: #fbfcfe;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .table-wrap {
      max-height: 420px;
      overflow: auto;
    }
    .table-wrap.leaderboard-scroll {
      max-height: 238px;
    }
    .num { text-align: right; white-space: nowrap; }
    .status {
      font-weight: 800;
      color: var(--muted);
      white-space: nowrap;
    }
    .status.ok { color: var(--good); }
    .bar {
      display: grid;
      grid-template-columns: 44px 1fr;
      gap: 8px;
      align-items: center;
    }
    .track {
      height: 8px;
      background: #e9edf4;
      border-radius: 999px;
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: var(--accent);
      border-radius: inherit;
    }
    .low .fill { background: var(--bad); }
    .mid .fill { background: var(--warn); }
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: -6px;
    }
    .tab {
      background: #fff;
      color: var(--text);
      border: 1px solid var(--line);
      padding: 8px 12px;
      min-height: 34px;
    }
    .tab.active {
      background: var(--accent-soft);
      border-color: #8ed3cb;
      color: #07524c;
    }
    .view { display: none; }
    .view.active { display: grid; gap: 18px; }
    .muted { color: var(--muted); }
    .prompt {
      max-width: 440px;
      white-space: normal;
    }
    .loading {
      padding: 24px;
      color: var(--muted);
    }
    @media (max-width: 900px) {
      header, main { padding-left: 14px; padding-right: 14px; }
      .filters, .visual-grid, .grid-two, .bottleneck-grid { grid-template-columns: 1fr; }
      header { position: static; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Physics Trainer 教員ダッシュボード</h1>
    <div class="filters">
      <label>単元
        <select id="unitFilter"><option value="">すべて</option></select>
      </label>
      <label>Stage
        <select id="stageFilter"><option value="">すべて</option></select>
      </label>
      <label>期間
        <select id="daysFilter">
          <option value="0">全期間</option>
          <option value="1">過去1日</option>
          <option value="7">過去7日</option>
          <option value="30">過去30日</option>
          <option value="90">過去90日</option>
        </select>
      </label>
      <label>学籍番号
        <input id="studentFilter" type="search" placeholder="例: 24001">
      </label>
      <button id="refreshButton" type="button">更新</button>
    </div>
  </header>

  <main>
    <div class="kpis">
      <div class="kpi"><div class="label">挑戦数</div><div class="value" id="kpiAttempts">-</div></div>
      <div class="kpi"><div class="label">学生数</div><div class="value" id="kpiStudents">-</div></div>
      <div class="kpi"><div class="label">平均正答率</div><div class="value" id="kpiRate">-</div></div>
      <div class="kpi"><div class="label">クリア率</div><div class="value" id="kpiPass">-</div></div>
      <div class="kpi"><div class="label">平均時間</div><div class="value" id="kpiTime">-</div></div>
    </div>

    <div class="tabs">
      <button class="tab active" data-view="overview" type="button">概況</button>
      <button class="tab" data-view="students" type="button">学生別</button>
      <button class="tab" data-view="questions" type="button">設問別</button>
    </div>

    <div id="overview" class="view active">
      <div class="visual-grid">
        <section>
          <h2>Stageごとの見え方</h2>
          <div id="stageVisual" class="visual-list"></div>
        </section>
        <section>
          <h2>要フォロー</h2>
          <div id="watchList" class="visual-list"></div>
        </section>
      </div>
      <section>
        <h2>クラス全体の詰まりStage</h2>
        <div id="bottleneckStages" class="bottleneck-grid"></div>
      </section>
      <div class="grid-two">
        <section>
          <h2>単元別</h2>
          <div class="table-wrap"><table id="unitTable"></table></div>
        </section>
        <section>
          <h2>Stage別</h2>
          <div class="table-wrap"><table id="stageTable"></table></div>
        </section>
      </div>
      <div class="grid-two">
        <section>
          <h2>最近の提出</h2>
          <div class="table-wrap"><table id="recentTable"></table></div>
        </section>
      </div>
    </div>

    <div id="students" class="view">
      <div class="grid-two">
        <section>
          <h2>挑戦時間 Top 10</h2>
          <div class="table-wrap leaderboard-scroll"><table id="elapsedRankingTable"></table></div>
        </section>
        <section>
          <h2>挑戦数 Top 10</h2>
          <div class="table-wrap leaderboard-scroll"><table id="attemptRankingTable"></table></div>
        </section>
      </div>
      <section>
        <h2>学生別の進捗</h2>
        <div class="table-wrap"><table id="studentTable"></table></div>
      </section>
    </div>

    <div id="questions" class="view">
      <section>
        <h2>つまずきやすい設問</h2>
        <div class="table-wrap"><table id="questionTable"></table></div>
      </section>
    </div>

    <div id="loading" class="loading">読み込み中...</div>
  </main>

  <script>
    const state = { firstLoad: true };

    document.querySelectorAll(".tab").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
        document.querySelectorAll(".view").forEach(x => x.classList.remove("active"));
        button.classList.add("active");
        document.getElementById(button.dataset.view).classList.add("active");
      });
    });

    document.getElementById("refreshButton").addEventListener("click", loadData);
    document.getElementById("unitFilter").addEventListener("change", () => {
      document.getElementById("stageFilter").value = "";
      loadData();
    });
    document.getElementById("stageFilter").addEventListener("change", loadData);
    document.getElementById("daysFilter").addEventListener("change", loadData);
    document.getElementById("studentFilter").addEventListener("keydown", event => {
      if (event.key === "Enter") loadData();
    });

    function loadData() {
      setLoading(true);
      const filters = {
        unit: document.getElementById("unitFilter").value,
        stage: document.getElementById("stageFilter").value,
        days: document.getElementById("daysFilter").value,
        student: document.getElementById("studentFilter").value
      };

      google.script.run
        .withSuccessHandler(renderDashboard)
        .withFailureHandler(error => {
          setLoading(false);
          document.getElementById("loading").textContent = "読み込みに失敗しました: " + error.message;
        })
        .getTeacherDashboardData(filters);
    }

    function renderDashboard(data) {
      setLoading(false);
      renderUnitOptions(data.units);
      renderStageOptions(data.stages);
      renderKpis(data.summary);
      renderBottleneckStages(data.bottleneckStages);
      renderStageVisual(data.stageRows);
      renderWatchList(data.studentRows);
      renderUnitTable(data.unitRows);
      renderStageTable(data.stageRows);
      renderRecentTable(data.recentAttempts);
      renderStudentLeaderboards(data.studentLeaderboards);
      renderStudentTable(data.studentRows);
      renderQuestionTable(data.questionStats);
      state.firstLoad = false;
    }

    function renderUnitOptions(units) {
      const select = document.getElementById("unitFilter");
      const current = select.value;
      select.innerHTML = '<option value="">すべて</option>' + units.map(unit => {
        return '<option value="' + escapeHtml(unit) + '">' + escapeHtml(unit) + '</option>';
      }).join("");
      select.value = current;
    }

    function renderStageOptions(stages) {
      const select = document.getElementById("stageFilter");
      const current = select.value;
      select.innerHTML = '<option value="">すべて</option>' + stages.map(stage => {
        return '<option value="' + escapeHtml(stage) + '">' + escapeHtml(stage) + '</option>';
      }).join("");
      select.value = current;
    }

    function renderKpis(summary) {
      document.getElementById("kpiAttempts").textContent = number(summary.attempts);
      document.getElementById("kpiStudents").textContent = number(summary.students);
      document.getElementById("kpiRate").textContent = summary.averageRate + "%";
      document.getElementById("kpiPass").textContent = summary.passRate + "%";
      document.getElementById("kpiTime").textContent = formatSeconds(summary.averageElapsed);
    }

    function renderUnitTable(rows) {
      renderTable("unitTable", ["単元", "挑戦", "学生", "平均正答率", "クリア率", "平均時間", "最終提出"], rows, row => [
        escapeHtml(row.unit),
        num(row.attempts),
        num(row.students),
        rateBar(row.averageRate),
        rateBar(row.passRate),
        num(formatSeconds(row.averageElapsed)),
        escapeHtml(formatDate(row.latest))
      ]);
    }

    function renderStageTable(rows) {
      renderTable("stageTable", ["Stage", "挑戦", "学生", "平均正答率", "クリア率", "平均時間", "最終提出"], rows, row => [
        escapeHtml(row.stage),
        num(row.attempts),
        num(row.students),
        rateBar(row.averageRate),
        rateBar(row.passRate),
        num(formatSeconds(row.averageElapsed)),
        escapeHtml(formatDate(row.latest))
      ]);
    }

    function renderStageVisual(rows) {
      const target = document.getElementById("stageVisual");
      const html = rows.length ? rows
        .slice()
        .sort((a, b) => a.averageRate - b.averageRate)
        .slice(0, 10)
        .map(row => {
          const cls = row.averageRate < 50 ? "low" : (row.averageRate < 70 ? "mid" : "");
          return '<div class="metric-row ' + cls + '">' +
            '<div class="metric-name" title="' + escapeHtml(row.stage) + '">' + escapeHtml(row.stage) + '</div>' +
            '<div class="big-track"><div class="big-fill" style="width:' + clampRate(row.averageRate) + '%"></div></div>' +
            '<div class="num">' + row.averageRate + '%</div>' +
          '</div>';
        }).join("")
        : '<div class="muted">該当するデータがありません。</div>';
      target.innerHTML = html;
    }

    function renderBottleneckStages(rows) {
      const target = document.getElementById("bottleneckStages");
      target.innerHTML = rows.length ? rows.slice(0, 4).map(row => {
        return '<div class="bottleneck-card">' +
          '<div class="bottleneck-title" title="' + escapeHtml(row.stage) + '">' + escapeHtml(row.stage) + '</div>' +
          '<div class="bottleneck-score"><span class="score-badge">' + row.score + '</span><span class="muted">詰まり度</span></div>' +
          '<div class="watch-meta">' + escapeHtml(row.reason) + '</div>' +
          '<div class="watch-meta">正答率 ' + row.averageRate + '% / クリア率 ' + row.passRate + '% / 平均 ' + formatSeconds(row.averageElapsed) + '</div>' +
        '</div>';
      }).join("") : '<div class="muted">該当するデータがありません。</div>';
    }

    function renderWatchList(rows) {
      const target = document.getElementById("watchList");
      const watchRows = rows
        .filter(row => row.averageRate < 70 || row.latestRate < 70)
        .slice()
        .sort((a, b) => {
          if (a.averageRate !== b.averageRate) return a.averageRate - b.averageRate;
          return b.attempts - a.attempts;
        })
        .slice(0, 8);

      target.innerHTML = watchRows.length ? watchRows.map(row => {
        const cls = row.averageRate < 50 ? "low" : (row.averageRate < 70 ? "mid" : "ok");
        return '<div class="watch-card">' +
          '<div class="watch-id">' + escapeHtml(row.studentId) + '</div>' +
          '<div class="pill ' + cls + '">' + row.averageRate + '%</div>' +
          '<div class="watch-meta">最新: ' + escapeHtml(row.latestStage || "-") +
          ' / ' + row.latestRate + '%、挑戦 ' + row.attempts +
          ' 回、クリア ' + row.clearedStages + '/' + row.stages + ' Stage</div>' +
        '</div>';
      }).join("") : '<div class="muted">現在の条件では、平均70%未満の学生はいません。</div>';
    }

    function renderRecentTable(rows) {
      renderTable("recentTable", ["日時", "学籍番号", "Stage", "得点", "正答率", "時間", "クリア"], rows, row => [
        escapeHtml(formatDate(row.date)),
        escapeHtml(row.studentId),
        escapeHtml(row.stage),
        num(row.score + "/" + row.total),
        rateBar(row.rate),
        num(formatSeconds(row.elapsed)),
        '<span class="status ' + (row.cleared ? "ok" : "") + '">' + (row.cleared ? "○" : "-") + "</span>"
      ]);
    }

    function renderStudentTable(rows) {
      renderTable("studentTable", ["学籍番号", "Stage数", "挑戦", "全体挑戦", "平均正答率", "最新正答率", "最高正答率", "最新Stage", "クリアStage", "最終提出"], rows, row => [
        escapeHtml(row.studentId),
        num(row.stages),
        num(row.attempts),
        num(row.totalAttempts),
        rateBar(row.averageRate),
        rateBar(row.latestRate),
        rateBar(row.bestRate),
        escapeHtml(row.latestStage || "-"),
        num(row.clearedStages + "/" + row.stages),
        escapeHtml(formatDate(row.latest))
      ]);
    }

    function renderStudentLeaderboards(leaderboards) {
      const elapsedRows = (leaderboards && leaderboards.totalElapsed) || [];
      const attemptRows = (leaderboards && leaderboards.attempts) || [];
      renderTable("elapsedRankingTable", ["順位", "学籍番号", "挑戦時間"], elapsedRows, (row, index) => [
        num(index + 1),
        escapeHtml(row.studentId),
        num(formatSeconds(row.totalElapsed))
      ]);
      renderTable("attemptRankingTable", ["順位", "学籍番号", "挑戦数"], attemptRows, (row, index) => [
        num(index + 1),
        escapeHtml(row.studentId),
        num(row.attempts)
      ]);
    }

    function renderQuestionTable(rows) {
      renderTable("questionTable", ["Stage", "問題ID", "問題文", "挑戦", "正答率", "平均時間", "多い誤答"], rows, row => [
        escapeHtml(row.stage),
        escapeHtml(row.problemId || "-"),
        '<div class="prompt">' + escapeHtml(row.prompt || "-") + '</div>',
        num(row.attempts),
        rateBar(row.correctRate),
        num(formatSeconds(row.averageTime)),
        escapeHtml(row.wrongAnswers.map(x => x.answer + " (" + x.count + ")").join(", ") || "-")
      ]);
    }

    function renderTable(id, headers, rows, mapper) {
      const table = document.getElementById(id);
      const head = "<thead><tr>" + headers.map(h => "<th>" + escapeHtml(h) + "</th>").join("") + "</tr></thead>";
      const bodyRows = rows.length
        ? rows.map((row, rowIndex) => "<tr>" + mapper(row, rowIndex).map((cell, i) => {
          return '<td data-label="' + escapeHtml(headers[i] || "") + '">' + cell + "</td>";
        }).join("") + "</tr>").join("")
        : '<tr><td colspan="' + headers.length + '" class="muted">該当するデータがありません。</td></tr>';
      table.innerHTML = head + "<tbody>" + bodyRows + "</tbody>";
    }

    function rateBar(value) {
      const n = clampRate(value);
      const cls = n < 50 ? "low" : (n < 70 ? "mid" : "");
      return '<div class="bar ' + cls + '"><span class="num">' + n + '%</span><span class="track"><span class="fill" style="width:' + n + '%"></span></span></div>';
    }

    function clampRate(value) {
      return Math.max(0, Math.min(100, Number(value || 0)));
    }

    function formatSeconds(value) {
      const seconds = Number(value || 0);
      if (!seconds) return "-";
      const min = Math.floor(seconds / 60);
      const sec = seconds % 60;
      return min ? min + "分" + sec + "秒" : sec + "秒";
    }

    function formatDate(value) {
      if (!value) return "-";
      const date = new Date(value);
      if (isNaN(date)) return "-";
      return date.toLocaleString("ja-JP", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }

    function num(value) {
      return '<span class="num">' + escapeHtml(String(value)) + '</span>';
    }

    function number(value) {
      return Number(value || 0).toLocaleString("ja-JP");
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[ch]));
    }

    function setLoading(isLoading) {
      document.getElementById("loading").style.display = isLoading ? "block" : "none";
    }

    loadData();
  </script>
</body>
</html>`;
}
