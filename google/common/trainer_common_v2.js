/* Googleログイン版の設定。導入時に2つのURLを置き換える。 */
const PHYSICS_AUTH_URL = "https://script.google.com/a/macros/toyo.jp/s/AKfycbzyvle3BCrmz7MKcsxyHBlyxU3XGiqXcsMqwSGf6GZ01FN5Xme-yzlE-E0OEXBttAZHhw/exec";
const PHYSICS_API_URL = "https://script.google.com/a/macros/toyo.jp/s/AKfycbzewYKMbRKtRhNtvFxVXvOo74Yj8v6hjXNvJWCNWIpoYSm-ekIbOSe3UaUPGlDjV2HrkA/exec";

const TrainerAuth = (() => {
  const TOKEN_KEY = "physicsTrainerAuthV3";
  let embeddedStudentId = "";

  function captureToken() {
    const match = location.hash.match(/(?:^#|&)auth=([^&]+)/);
    if (match) {
      localStorage.setItem(TOKEN_KEY, decodeURIComponent(match[1]));
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function getToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
  function getStudentId() { return embeddedStudentId || (getToken().split(".")[0] || "").trim(); }
  function isConfigured() { return !PHYSICS_AUTH_URL.startsWith("__"); }
  function login() {
    if (!isConfigured()) return;
    location.href = PHYSICS_AUTH_URL + "?view=auth&return=" + encodeURIComponent(location.href.split("#")[0]);
  }

  function makeRestartButtonSafer() {
    const button = document.getElementById("restartBtn");
    if (!button || button.dataset.safePlacement === "1") return;
    const actions = button.closest(".buttons");
    if (!actions || !actions.parentNode) return;

    const spacer = button.previousElementSibling;
    if (spacer && spacer.classList.contains("button-break")) spacer.remove();

    const resetArea = document.createElement("div");
    resetArea.className = "trainer-reset-area";
    resetArea.style.cssText = "margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:flex-end";
    actions.parentNode.insertBefore(resetArea, actions.nextSibling);
    resetArea.appendChild(button);

    button.dataset.safePlacement = "1";
    button.textContent = "学習を中断して最初に戻る";
    button.style.cssText = "background:#fff;color:#64748b;border:1px solid #cbd5e1;font-size:.86rem;padding:8px 12px;box-shadow:none";
    button.addEventListener("click", event => {
      if (window.confirm("ここまでの回答を中断して、最初の画面に戻りますか？")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  function initialize() {
    captureToken();
    makeRestartButtonSafer();
    const input = document.getElementById("studentId");
    const studentId = getStudentId();
    if (window.parent !== window) {
      if (input) input.style.display = "none";
      const studentLabel = document.querySelector('label[for="studentId"]');
      if (studentLabel) studentLabel.style.display = "none";
      window.addEventListener("message", event => {
        if (!event.data || event.data.type !== "physics:identity") return;
        embeddedStudentId = String(event.data.studentId || "").trim();
        const target = document.getElementById("studentId");
        if (target && embeddedStudentId) {
          target.value = embeddedStudentId;
          target.readOnly = true;
        }
      });
      window.parent.postMessage({ type: "physics:ready" }, "*");
      if (!studentId) return;
    }
    if (!studentId) { login(); return; }
    if (input) {
      input.value = studentId;
      input.readOnly = true;
      input.setAttribute("aria-label", "大学Googleアカウントから取得した学籍番号");
      const label = document.querySelector('label[for="studentId"]');
      if (label) label.textContent = "ログイン中の学籍番号";
    }
  }

  document.addEventListener("DOMContentLoaded", initialize);
  return { getToken, getStudentId, login, initialize };
})();

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
    const authenticatedId = TrainerAuth.getStudentId();
    if (authenticatedId) return authenticatedId;
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
      authToken: TrainerAuth.getToken(),
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

    if (window.parent !== window) {
      const requestId = "save_" + Date.now() + "_" + Math.random().toString(36).slice(2);
      const confirmation = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener("message", receive);
          reject(new Error("保存確認がタイムアウトしました"));
        }, 15000);
        function receive(event) {
          const data = event.data || {};
          if (data.type !== "physics:saveResult" || data.requestId !== requestId) return;
          clearTimeout(timer);
          window.removeEventListener("message", receive);
          data.ok ? resolve(data) : reject(new Error(data.message || "保存に失敗しました"));
        }
        window.addEventListener("message", receive);
      });
      window.parent.postMessage({ type: "physics:save", requestId, payload }, "*");
      try {
        await confirmation;
        if (status) status.textContent = "結果を保存しました。Stage一覧で進捗を確認できます。";
      } catch (err) {
        resultSent = false;
        if (status) status.textContent = "結果を保存できませんでした。もう一度お試しください。";
      }
      return;
    }

    try {
      const destination = PHYSICS_API_URL.startsWith("__") ? gasUrl : PHYSICS_API_URL;
      await fetch(destination, {
        method: "POST",
        mode: "no-cors",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (status) status.textContent = "結果を送信しました。保存を確認中...";
      showStudentDashboardButton(null, "preparing");
      requestStudentDashboardUrl({
        gasUrl: destination,
        studentId,
        sendStatusId,
        attempt: 1
      });
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
    let callbackFinished = false;
    const confirmTimer = setTimeout(() => {
      if (callbackFinished) return;
      callbackFinished = true;
      cleanupJsonp(callbackName, script);
      showStudentDashboardButton(null, "unavailable");
      if (status) status.textContent = "送信しましたが、保存を確認できませんでした。もう一度ログインしてお試しください。";
    }, 8000);
    if (status && attempt === 1) status.textContent = "結果を送信しました。学習状況リンクを準備中...";

    window[callbackName] = response => {
      if (callbackFinished) return;
      callbackFinished = true;
      clearTimeout(confirmTimer);
      try {
        if (response && response.ok && response.url) {
          showStudentDashboardButton(response.url, "ready");
          if (status) status.textContent = "結果を送信しました。学習状況を確認できます。";
        } else if (response && response.error === "no_recent_attempt" && attempt < maxAttempts) {
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
          status.textContent = "結果を送信しました。学習状況リンクは提出直後だけ表示されます。";
        }
      } finally {
        cleanupJsonp(callbackName, script);
      }
    };

    script.onerror = () => {
      if (callbackFinished) return;
      callbackFinished = true;
      clearTimeout(confirmTimer);
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
