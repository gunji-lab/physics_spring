/* =========================================================
   Physics Trainer Common Library v2.0
   共通ログ・タイマー・送信ライブラリ
   ========================================================= */

const TrainerLog = (() => {
  let startTime = 0;
  let questionStartTime = 0;
  let elapsed = 0;
  let questionTimes = [];
  let questionResults = [];
  let resultSent = false;

  function startSession() {
    startTime = Date.now();
    questionStartTime = 0;
    elapsed = 0;
    questionTimes = [];
    questionResults = [];
    resultSent = false;
    removeStudentDashboardButton();
  }

  function startQuestion() {
    questionStartTime = Date.now();
  }

  function recordQuestion(question, isCorrect, extra = {}) {
    const qTime = questionStartTime
      ? Math.round((Date.now() - questionStartTime) / 1000)
      : "";

    questionTimes.push(qTime);

    questionResults.push({
      id: question?.id || makeQuestionId(question),
      type: question?.type || question?.mode || "",
      correct: !!isCorrect,
      selected: extra.selected ?? "",
      answer: extra.answer ?? question?.answer ?? question?.ans ?? "",
      prompt: extra.prompt ?? question?.prompt ?? question?.question ?? ""
    });

    return qTime;
  }

  function finishSession() {
    elapsed = startTime
      ? Math.round((Date.now() - startTime) / 1000)
      : 0;
    return elapsed;
  }

  function getElapsed() {
    return elapsed || (startTime ? Math.round((Date.now() - startTime) / 1000) : 0);
  }

  function formatElapsed(seconds) {
    seconds = Number(seconds || 0);
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return min > 0 ? `${min}分${sec}秒` : `${sec}秒`;
  }

  function makeQuestionId(q) {
    if (!q) return "";
    const parts = [
      q.type || q.mode || "Q",
      q.deg,
      q.rad,
      q.r,
      q.theta,
      q.omega,
      q.T,
      q.ans || q.answer
    ].filter(v => v !== undefined && v !== null && String(v).trim() !== "");
    return parts.join("_").replace(/\s+/g, "");
  }

  function getStudentId() {
    const el = document.getElementById("studentId");
    return el ? el.value.trim() : "";
  }

  function showElapsedInFinalMessage(targetId = "finalMessage") {
    const el = document.getElementById(targetId);
    if (!el) return;
    const sec = getElapsed();
    el.innerHTML += `<div class="note">所要時間：<strong>${formatElapsed(sec)}</strong></div>`;
  }

  async function sendResult({
    gasUrl = typeof GAS_URL !== "undefined" ? GAS_URL : "",
    stage = typeof STAGE_NAME !== "undefined" ? STAGE_NAME : "",
    score,
    total,
    studentId = getStudentId(),
    sendStatusId = "sendStatus",
    extra = {}
  }) {
    if (resultSent) return;
    resultSent = true;

    const status = document.getElementById(sendStatusId);
    if (status) status.textContent = "結果を送信中...";

    const payload = {
      studentId,
      stage,
      score,
      total,
      elapsed: getElapsed(),
      questionTimes,
      questionResults,
      userAgent: navigator.userAgent,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      ...extra
    };

    try {
      await fetch(gasUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (status) status.textContent = "結果を送信しました。";
      if (total > 0 && score / total >= 0.7) {
        showStudentDashboardButton(null, "preparing");
        requestStudentDashboardUrl({
          gasUrl,
          studentId,
          sendStatusId,
          attempt: 1
        });
      } else {
        removeStudentDashboardButton();
      }
    } catch (err) {
      if (status) status.textContent = "結果送信に失敗しました。ネットワークを確認してください。";
    }
  }

  function requestStudentDashboardUrl({ gasUrl, studentId, sendStatusId = "sendStatus", attempt = 1 }) {
    if (!gasUrl || !studentId) return;

    const maxAttempts = 6;
    const callbackName = "__physicsStudentDashboard_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    const script = document.createElement("script");
    const separator = gasUrl.indexOf("?") === -1 ? "?" : "&";
    const status = document.getElementById(sendStatusId);
    if (status && attempt === 1) status.textContent = "結果を送信しました。学習状況リンクを準備中...";

    window[callbackName] = response => {
      try {
        if (response && response.ok && response.url) {
          showStudentDashboardButton(response.url, "ready");
          if (status) status.textContent = "結果を送信しました。学習状況を確認できます。";
        } else if (response && response.error === "no_recent_pass" && attempt < maxAttempts) {
          if (status) status.textContent = "結果を送信しました。学習状況リンクを準備中...";
          setTimeout(() => {
            requestStudentDashboardUrl({
              gasUrl,
              studentId,
              sendStatusId,
              attempt: attempt + 1
            });
          }, 1500);
        } else if (status) {
          showStudentDashboardButton(null, "unavailable");
          status.textContent = "結果を送信しました。学習状況リンクはクリア直後だけ表示されます。";
        }
      } finally {
        cleanupJsonp(callbackName, script);
      }
    };

    script.onerror = () => {
      showStudentDashboardButton(null, "unavailable");
      if (status) status.textContent = "結果を送信しました。学習状況リンクの準備に失敗しました。";
      cleanupJsonp(callbackName, script);
    };

    script.src = gasUrl + separator +
      "api=studentDashboardLink&id=" + encodeURIComponent(studentId) +
      "&callback=" + encodeURIComponent(callbackName) +
      "&_=" + Date.now();
    document.head.appendChild(script);
  }

  function cleanupJsonp(callbackName, script) {
    try {
      delete window[callbackName];
    } catch (err) {
      window[callbackName] = undefined;
    }
    if (script && script.parentNode) script.parentNode.removeChild(script);
  }

  function showStudentDashboardButton(url, state = "ready") {
    const existing = document.querySelector(".student-dashboard-btn");
    if (existing) {
      configureStudentDashboardButton(existing, url, state);
      return;
    }

    const finish = document.getElementById("finishScreen") || document.body;
    let buttons = finish.querySelector(".buttons, .controls");
    if (!buttons) {
      buttons = document.createElement("div");
      buttons.className = "buttons";
      finish.appendChild(buttons);
    }

    const button = document.createElement("button");
    const sample = buttons.querySelector("button");
    button.type = "button";
    button.textContent = "自分の学習状況を見る";
    button.className = sample && sample.classList.contains("btn")
      ? "btn student-dashboard-btn"
      : "secondary student-dashboard-btn";
    configureStudentDashboardButton(button, url, state);
    buttons.appendChild(button);
  }

  function configureStudentDashboardButton(button, url, state) {
    button.onclick = null;
    if (state === "ready" && url) {
      button.disabled = false;
      button.textContent = "自分の学習状況を見る";
      button.onclick = () => {
        location.href = url;
      };
      return;
    }

    if (state === "unavailable") {
      button.disabled = true;
      button.textContent = "学習状況リンクを準備できませんでした";
      return;
    }

    button.disabled = true;
    button.textContent = "学習状況リンクを準備中...";
  }

  function removeStudentDashboardButton() {
    Array.prototype.forEach.call(document.querySelectorAll(".student-dashboard-btn"), button => {
      if (button.parentNode) button.parentNode.removeChild(button);
    });
  }

  function getQuestionTimes() {
    return [...questionTimes];
  }

  function getQuestionResults() {
    return [...questionResults];
  }

  return {
    startSession,
    startQuestion,
    recordQuestion,
    finishSession,
    getElapsed,
    formatElapsed,
    showElapsedInFinalMessage,
    sendResult,
    getQuestionTimes,
    getQuestionResults
  };
})();
