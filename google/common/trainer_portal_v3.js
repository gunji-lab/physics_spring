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
    "spring_stage1_framework_v2.html":"バネ/Stage1/フックの法則",
    "spring_stage2_framework_v2.html":"バネ/Stage2/つりあい",
    "spring_stage3_framework_v2.html":"バネ/Stage3/位置エネ",
    "spring_stage4_framework_v2.html":"バネ/Stage4/エネ保",
    "spring_stage5_written_framework_v2.html":"バネ/Stage5/記入式",
    "heat_stage1_framework_v1.html":"熱/Stage1/温度変換",
    "heat_stage2_framework_v1.html":"熱/Stage2/熱容量",
    "heat_stage3_framework_v1.html":"熱/Stage3/Q=mcΔT",
    "heat_stage4_framework_v1.html":"熱/Stage4/統合",
    "heat_stage5_framework_v1.html":"熱/Stage5/熱量保存",
    "heat_stage6_framework_v1.html":"熱/Stage6/総合記述式"
  };

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
    const cleared = new Set(response.stages.filter(item => item.status === "クリア済み").map(item => item.stage));
    document.querySelectorAll("a[href]").forEach(link => {
      const file = link.getAttribute("href").split("/").pop();
      const stage = stageByFile[file];
      if (!stage) return;
      const mark = document.createElement("span");
      mark.textContent = cleared.has(stage) ? " ✓ クリア" : " ○ 未クリア";
      mark.style.cssText = "float:right;font-size:.86rem;color:" + (cleared.has(stage) ? "#15803d" : "#94a3b8");
      link.prepend(mark);
    });
    const lead = document.querySelector(".lead");
    if (lead && response.summary) lead.textContent += `　${response.summary.clearedStages}/${response.summary.stages} Stageクリア`;
    delete window[callback];
  };
  const script = document.createElement("script");
  script.src = API_URL + "?api=progress&token=" + encodeURIComponent(token) + "&callback=" + callback;
  document.head.appendChild(script);
})();
