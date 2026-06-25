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
    } catch (err) {
      if (status) status.textContent = "結果送信に失敗しました。ネットワークを確認してください。";
    }
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
