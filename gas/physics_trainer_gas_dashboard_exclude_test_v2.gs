/* =========================================================
   Physics Trainer Log System v2.0
   Google Apps Script
   ========================================================= */

const LOG_SHEET_NAME = "Log";
const COUNT_SHEET_NAME = "Counts";
const QUESTION_SHEET_NAME = "QuestionTimes";

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

    const studentId = String(data.studentId || "").trim();
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

function doGet(e) {
  const params = (e && e.parameter) || {};
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
  const studentRows = buildStudentRows_(filteredLogs, filteredCountsSource);
  const questionStats = buildQuestionStats_(filteredQuestionRows);
  const recentAttempts = buildRecentAttempts_(filteredLogs);

  return {
    generatedAt: new Date().toISOString(),
    units,
    stages,
    summary,
    unitRows,
    stageRows,
    studentRows,
    questionStats,
    recentAttempts
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
  }).sort((a, b) => {
    if (a.averageRate !== b.averageRate) return a.averageRate - b.averageRate;
    return a.studentId.localeCompare(b.studentId);
  });
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

  if (!hasRecentStudentPass_(studentId, STUDENT_DASHBOARD_LINK_WINDOW_MINUTES)) {
    return jsonpResponse_(callback, { ok: false, error: "no_recent_pass" });
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

function hasRecentStudentPass_(studentId, minutes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (!logSheet || logSheet.getLastRow() < 2) return false;

  const rows = readSheetObjects_(logSheet);
  const now = Date.now();
  const windowMs = Number(minutes || 15) * 60 * 1000;
  const targetId = String(studentId || "").trim();

  return rows.some(row => {
    const rowStudentId = String(row["学籍番号"] || "").trim();
    const passed = String(row["クリア"] || "") === "○";
    const date = asDate_(row["日時"]);
    return rowStudentId === targetId && passed && date && now - date.getTime() <= windowMs;
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
  const questionSheet = ss.getSheetByName(QUESTION_SHEET_NAME);
  const targetId = String(studentId || "").trim();

  const logs = logSheet ? readSheetObjects_(logSheet)
    .filter(row => String(row["学籍番号"] || "").trim() === targetId) : [];
  const questionRows = questionSheet ? readSheetObjects_(questionSheet)
    .filter(row => String(row["学籍番号"] || "").trim() === targetId) : [];

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

  const weakStages = stageRows
    .filter(row => row.averageRate < 70 || row.latestRate < 70)
    .sort((a, b) => {
      if (a.averageRate !== b.averageRate) return a.averageRate - b.averageRate;
      return b.averageElapsed - a.averageElapsed;
    })
    .slice(0, 6);

  const slowStages = stageRows
    .filter(row => row.averageElapsed > 0)
    .slice()
    .sort((a, b) => b.averageElapsed - a.averageElapsed)
    .slice(0, 6);

  const questionStats = buildQuestionStats_(questionRows)
    .filter(row => row.correctRate < 70 || row.averageTime >= 20)
    .slice(0, 8);

  return {
    studentId: targetId,
    generatedAt: new Date().toISOString(),
    summary: {
      attempts: logs.length,
      cleared,
      stages: stageRows.length,
      clearedStages: stageRows.filter(row => row.status === "クリア済み").length,
      totalElapsed: elapsedSum,
      averageRate: totalSum > 0 ? Math.round(scoreSum / totalSum * 100) : 0,
      latest: latest ? latest.toISOString() : ""
    },
    stageRows,
    weakStages,
    slowStages,
    questionStats,
    recentAttempts: buildRecentAttempts_(logs).slice(0, 10)
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
    .grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,.8fr);gap:18px}
    section{overflow:hidden}section h2{margin:0;padding:12px 14px;border-bottom:1px solid var(--line);font-size:15px}
    .cards{display:grid;gap:10px;padding:14px}.card{border:1px solid var(--line);border-radius:8px;padding:12px;background:#fff}.card-title{font-weight:800}.meta{color:var(--muted);font-size:13px;margin-top:4px}
    table{width:100%;border-collapse:collapse;font-size:13px}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--muted);font-size:12px;background:#fbfcfe}
    .bar{display:flex;align-items:center;gap:8px}.track{height:8px;border-radius:999px;background:#e9edf4;overflow:hidden;min-width:90px;flex:1}.fill{display:block;height:100%;background:var(--accent)}.bar.low .fill{background:var(--bad)}.bar.mid .fill{background:var(--warn)}
    .pill{display:inline-flex;border-radius:999px;padding:3px 8px;font-size:12px;font-weight:800;background:var(--accent-soft);color:var(--accent)}.pill.clear{background:#dcfce7;color:var(--good)}.pill.try{background:#fef3c7;color:var(--warn)}
    .muted{color:var(--muted);padding:14px}.num{font-variant-numeric:tabular-nums;font-weight:700}.prompt{max-width:360px}
    @media(max-width:900px){.kpis,.grid{grid-template-columns:1fr}header,main{padding-left:14px;padding-right:14px}table,thead,tbody,tr,th,td{display:block}thead{display:none}td{display:grid;grid-template-columns:110px 1fr;gap:8px}td::before{content:attr(data-label);color:var(--muted);font-weight:700}}
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
      <div class="kpi"><div class="label">クリアStage</div><div class="value">${data.summary.clearedStages}/${data.summary.stages}</div></div>
      <div class="kpi"><div class="label">クリア回数</div><div class="value">${data.summary.cleared}</div></div>
    </div>
    <div class="grid">
      <section>
        <h2>Stageごとの進捗</h2>
        <div class="table-wrap"><table id="stageTable"></table></div>
      </section>
      <section>
        <h2>苦手Stage</h2>
        <div id="weakStages" class="cards"></div>
      </section>
    </div>
    <div class="grid">
      <section>
        <h2>時間がかかっているStage</h2>
        <div id="slowStages" class="cards"></div>
      </section>
      <section>
        <h2>注意したい問題</h2>
        <div id="questionStats" class="cards"></div>
      </section>
    </div>
    <section>
      <h2>最近の学習履歴</h2>
      <div class="table-wrap"><table id="recentTable"></table></div>
    </section>
  </main>
  <script>
    const dashboardData = ${JSON.stringify(data)};
    document.getElementById("generatedAt").textContent = formatDate(dashboardData.generatedAt);
    document.getElementById("totalElapsed").textContent = formatSeconds(dashboardData.summary.totalElapsed);
    renderStageTable(dashboardData.stageRows);
    renderStageCards("weakStages", dashboardData.weakStages, row => row.averageRate < 70 ? "正答率を上げたい" : "直近の正答率を確認");
    renderStageCards("slowStages", dashboardData.slowStages, () => "解答時間が長め");
    renderQuestionStats(dashboardData.questionStats);
    renderRecentTable(dashboardData.recentAttempts);

    function renderStageTable(rows){
      renderTable("stageTable", ["Stage","状態","挑戦","平均正答率","最高正答率","平均時間","最終提出"], rows, row => [
        escapeHtml(row.stage),
        '<span class="pill ' + (row.status === "クリア済み" ? "clear" : "try") + '">' + escapeHtml(row.status) + '</span>',
        num(row.attempts),
        rateBar(row.averageRate),
        rateBar(row.bestRate),
        num(formatSeconds(row.averageElapsed)),
        escapeHtml(formatDate(row.latest))
      ]);
    }
    function renderStageCards(id, rows, reason){
      const target = document.getElementById(id);
      target.innerHTML = rows.length ? rows.map(row => '<div class="card"><div class="card-title">' + escapeHtml(row.stage) + '</div><div class="meta">' + reason(row) + ' / 平均 ' + row.averageRate + '% / 平均時間 ' + formatSeconds(row.averageElapsed) + '</div>' + rateBar(row.averageRate) + '</div>').join("") : '<div class="muted">該当するデータはまだありません。</div>';
    }
    function renderQuestionStats(rows){
      const target = document.getElementById("questionStats");
      target.innerHTML = rows.length ? rows.map(row => '<div class="card"><div class="card-title">' + escapeHtml(row.stage) + ' / ' + escapeHtml(row.problemId || "-") + '</div><div class="meta prompt">' + escapeHtml(row.prompt || "-") + '</div><div class="meta">正答率 ' + row.correctRate + '% / 平均時間 ' + formatSeconds(row.averageTime) + '</div></div>').join("") : '<div class="muted">該当するデータはまだありません。</div>';
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
      .filters, .visual-grid, .grid-two { grid-template-columns: 1fr; }
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
      renderStageVisual(data.stageRows);
      renderWatchList(data.studentRows);
      renderUnitTable(data.unitRows);
      renderStageTable(data.stageRows);
      renderRecentTable(data.recentAttempts);
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
        ? rows.map(row => "<tr>" + mapper(row).map((cell, i) => {
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
