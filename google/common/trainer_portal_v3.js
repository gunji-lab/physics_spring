(() => {
  const AUTH_URL = "https://script.google.com/a/macros/toyo.jp/s/AKfycbzyvle3BCrmz7MKcsxyHBlyxU3XGiqXcsMqwSGf6GZ01FN5Xme-yzlE-E0OEXBttAZHhw/exec";
  const API_URL = "https://script.google.com/a/macros/toyo.jp/s/AKfycbzCvIdhA_EbSMQ82eYvzp_napmvxvCgX3YasBWEwzkmNsOv3-QbG3m4YbKdLMIaOI79bA/exec";
  const TOKEN_KEY = "physicsTrainerAuthV3";
  const stageByFile = {
    "circular_motion_stage1_framework_v2.html":"円運動/Stage1/弧度法",
    "circular_motion_stage2_framework_v2.html":"円運動/Stage2/弧長",
    "circular_motion_stage3_framework_v2.html":"円運動/Stage3/角速度と速さ",
    "circular_motion_stage4_framework_v2.html":"円運動/Stage4/周期角速度速さ",
    "circular_motion_stage5_framework_v2.html":"円運動/Stage5/向心加速度",
    "circular_motion_stage6_written_framework_v2.html":"円運動/Stage6/記入式",
    "circular_motion_universal_gravitation_framework_v1.html":"円運動/大問/万有引力",
    "spring_stage1_framework_v2.html":"バネ/Stage1/フックの法則",
    "spring_stage2_framework_v2.html":"バネ/Stage2/つりあい",
    "spring_stage3_framework_v2.html":"バネ/Stage3/位置エネ",
    "spring_stage4_framework_v2.html":"バネ/Stage4/エネ保",
    "spring_stage5_written_framework_v2.html":"バネ/Stage5/記入式",
    "spring_test1_framework_v2.html":"バネ/test1/円運動するばね",
    "spring_test2_framework_v2.html":"バネ/test2/水平バネ振り子",
    "heat_stage1_framework_v1.html":"熱/Stage1/温度変換",
    "heat_stage2_framework_v1.html":"熱/Stage2/熱容量",
    "heat_stage3_framework_v1.html":"熱/Stage3/Q=mcΔT",
    "heat_stage4_framework_v1.html":"熱/Stage4/統合",
    "heat_stage5_framework_v1.html":"熱/Stage5/熱量保存",
    "heat_stage6_framework_v1.html":"熱/Stage6/総合記述式"
  };

  function renderProgress(response) {
    if (!response || !response.ok) return;
    const stageProgress = new Map(response.stages.map(item => [item.stage, item]));
    document.querySelectorAll("a[href]").forEach(link => {
      const file = link.getAttribute("href").split("/").pop();
      const stage = stageByFile[file];
      if (!stage || link.querySelector(".stage-progress-mark")) return;
      const mark = document.createElement("span");
      mark.className = "stage-progress-mark";
      const progress = stageProgress.get(stage);
      const isCleared = progress && progress.status === "クリア済み";
      const attempts = progress ? Number(progress.attempts || 0) : 0;
      mark.textContent = `${isCleared ? "✓ クリア" : "○ 未クリア"}｜${attempts}回挑戦`;
      mark.style.cssText = "float:right;font-size:.86rem;color:" + (isCleared ? "#15803d" : "#94a3b8");
      link.prepend(mark);
    });
    const lead = document.querySelector(".lead");
    if (lead && response.summary && !lead.dataset.progressAdded) {
      lead.textContent += `　${response.summary.clearedStages}/${response.summary.stages} Stageクリア`;
      lead.dataset.progressAdded = "1";
    }
    const isTop = /\/google\/(?:index\.html)?$/.test(location.pathname);
    if (isTop && response.summary && !document.getElementById("learningSummary")) {
      const seconds = Number(response.summary.totalElapsed || 0);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const timeText = hours ? `${hours}時間${minutes}分` : `${minutes}分`;
      const top10 = [];
      const timeRank = response.rankings && response.rankings.totalElapsed;
      const attemptRank = response.rankings && response.rankings.attempts;
      if (timeRank && timeRank.rank && timeRank.rank <= 10) top10.push(`学習時間 ${timeRank.rank}位`);
      if (attemptRank && attemptRank.rank && attemptRank.rank <= 10) top10.push(`挑戦数 ${attemptRank.rank}位`);
      const summary = document.createElement("section");
      summary.id = "learningSummary";
      summary.style.cssText = "margin:18px 0;padding:18px;border:1px solid #b9e1e9;border-radius:14px;background:#f0fbfd";
      summary.innerHTML = `<div style="font-weight:900;margin-bottom:10px">自分の学習状況</div><div style="display:flex;gap:18px;flex-wrap:wrap"><span>学習時間 <strong>${timeText}</strong></span><span>挑戦 <strong>${Number(response.summary.attempts || 0)}回</strong></span><span>通常Stage <strong>${Number(response.summary.clearedStages || 0)}/${Number(response.summary.stages || 0)}</strong></span><span>大問対策 <strong>${Number(response.summary.clearedBigProblems || 0)}/${Number(response.summary.bigProblems || 0)}</strong></span></div>${top10.length ? `<div style="margin-top:10px;color:#b45309;font-weight:900">🏆 TOP10：${top10.join("・")}</div>` : ""}<a href="${response.dashboardUrl || "#"}" target="_top" style="display:inline-block;margin-top:12px;color:#176b87;font-weight:900">詳しい学習状況を見る →</a>`;
      const menu = document.querySelector(".menu");
      if (menu) menu.parentNode.insertBefore(summary, menu);
    }
  }

  if (window.parent !== window) {
    window.addEventListener("message", event => {
      if (event.data && event.data.type === "physics:progressResult") renderProgress(event.data.response);
    });
    window.parent.postMessage({ type: "physics:progress" }, "*");
    return;
  }

  const hashToken = new URLSearchParams(location.hash.slice(1)).get("auth");
  if (hashToken) {
    localStorage.setItem(TOKEN_KEY, hashToken);
    history.replaceState(null, "", location.pathname + location.search);
  }
  const token = localStorage.getItem(TOKEN_KEY) || "";
  if (!token && !AUTH_URL.startsWith("__")) {
    location.href = AUTH_URL + "?view=auth&return=" + encodeURIComponent(location.href.split("#")[0]);
    return;
  }
  if (!token || API_URL.startsWith("__")) return;

  const callback = "__physicsProgress" + Date.now();
  window[callback] = response => {
    if (!response || !response.ok) {
      localStorage.removeItem(TOKEN_KEY);
      location.href = AUTH_URL + "?view=auth&return=" + encodeURIComponent(location.href);
      return;
    }
    renderProgress(response);
    delete window[callback];
  };
  const script = document.createElement("script");
  script.src = API_URL + "?api=progress&token=" + encodeURIComponent(token) + "&callback=" + callback;
  document.head.appendChild(script);
})();
