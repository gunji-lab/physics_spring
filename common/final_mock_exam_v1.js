(() => {
  const EXAM_TOTAL = 30;
  const BASIC_POINTS = 3;
  const BIG_POINTS = 5;
  const $ = s => document.querySelector(s);
  const shuffle = a => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };

  const fallbackBasicBank = Array.isArray(window.FINAL_MOCK_STAGE_BASIC_BANK) ? window.FINAL_MOCK_STAGE_BASIC_BANK : [];
  const fallbackBigBank = Array.isArray(window.FINAL_MOCK_BIG_BANK) ? window.FINAL_MOCK_BIG_BANK : [];

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  }
  function stripTags(value) { return String(value ?? "").replace(/<[^>]*>/g, " "); }
  function formatNumber(v) {
    if (typeof v === "string") return v;
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return String(Math.round(n * 1000) / 1000);
  }
  function cleanUnit(unit) {
    return String(unit || "").replace(/[\[\]]/g, "").trim();
  }
  function displayAnswer(q) {
    if (q.display) return q.display;
    if (q.number !== undefined) return `${formatNumber(q.number)}${q.unit ? " " + q.unit : ""}`;
    if (q.answers && q.answers.length) return `${q.answers[0]}${q.unit ? " " + q.unit : ""}`;
    return "";
  }

  function parseAnswerValue(value) {
    const raw = String(value ?? "").trim();
    const noUnit = raw.replace(/\[[^\]]*\]/g, "").replace(/℃|°|kg|Pa|N\/m|N|J\/K|J|K|m\/s\^2|m\/s²|m\/s|rad\/s|rad|m\^3|m³|m2|m/g, "").trim();
    if (/[a-zA-Zπ√θω]/.test(noUnit) && !/^[-+]?\d/.test(noUnit)) return null;
    const expr = noUnit
      .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/[−ー―]/g, "-")
      .replace(/，/g, ".")
      .replace(/×\s*10\s*\^\s*([-+]?\d+)/gi, "e$1")
      .replace(/×\s*10([+-]?\d+)/gi, "e$1")
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/,/g, "")
      .replace(/\s/g, "");
    if (!expr || !/^[0-9eE+\-*/.()]+$/.test(expr)) return null;
    try {
      const n = Function(`"use strict";return (${expr})`)();
      return Number.isFinite(n) ? n : null;
    } catch {
      const m = expr.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/i);
      return m ? Number(m[0]) : null;
    }
  }

  function stageQuestion(unitName, sourceStage, q, index) {
    const prompt = q.text || q.question || q.prompt || "";
    const unit = cleanUnit(q.unit || (String(q.ans || "").match(/\[([^\]]+)\]/)?.[1] ?? ""));
    const rawAnswer = q.answer !== undefined ? q.answer : q.ans;
    const id = `MOCK_STAGE_${unitName}_${sourceStage}_${index}_${q.id || ""}`.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const converted = {
      id,
      section: unitName,
      sourceUnit: unitName,
      sourceStage,
      prompt,
      unit,
      display: "",
      solution: q.solution || q.calc || ""
    };
    if (typeof rawAnswer === "number") {
      converted.number = rawAnswer;
      converted.tolerance = Math.max(0.02, Math.abs(rawAnswer) * 0.015);
      converted.display = `${formatNumber(rawAnswer)}${unit ? " " + unit : ""}`;
      return converted;
    }
    const asNumber = parseAnswerValue(rawAnswer);
    const answerWithoutUnit = String(rawAnswer ?? "").replace(/\[[^\]]*\]/g, "").trim();
    if (asNumber !== null && !/[π√θωa-zA-Zぁ-んァ-ヶ一-龠]/.test(answerWithoutUnit.replace(/e[-+]?\d+/gi, ""))) {
      converted.number = asNumber;
      converted.tolerance = Math.max(0.02, Math.abs(asNumber) * 0.015);
      converted.display = `${formatNumber(asNumber)}${unit ? " " + unit : ""}`;
    } else {
      converted.answers = makeSymbolicAnswerVariants(answerWithoutUnit);
      converted.display = `${answerWithoutUnit}${unit ? " " + unit : ""}`;
    }
    return converted;
  }

  function collectStageBank() {
    const groups = [];
    if (window.CIRCULAR_MOTION_BANKS) groups.push({name:"円運動", banks: window.CIRCULAR_MOTION_BANKS});
    if (window.SPRING_BANKS) groups.push({name:"バネ", banks: window.SPRING_BANKS});
    if (window.HEAT_BANKS) groups.push({name:"熱", banks: window.HEAT_BANKS});
    if (window.HEAT_GAS_BANKS) groups.push({name:"熱と気体", banks: window.HEAT_GAS_BANKS});
    if (window.MECHANICAL_ENERGY_BANKS) groups.push({name:"力学的エネルギー", banks: window.MECHANICAL_ENERGY_BANKS});
    const converted = [];
    groups.forEach(group => {
      Object.entries(group.banks || {}).forEach(([stageKey, value]) => {
        const problems = Array.isArray(value) ? value : Array.isArray(value?.problems) ? value.problems : [];
        problems.forEach((problem, i) => converted.push(stageQuestion(group.name, stageKey, problem, i + 1)));
      });
    });
    return converted;
  }

  function chooseBasics() {
    const bank = collectStageBank();
    if (!bank.length) return shuffle(fallbackBasicBank).slice(0, 5);
    const preferred = ["円運動", "バネ", "熱", "熱と気体", "力学的エネルギー"];
    const chosen = [];
    preferred.forEach(section => {
      const item = shuffle(bank.filter(q => q.section === section && !chosen.includes(q)))[0];
      if (item) chosen.push(item);
    });
    return shuffle(chosen.concat(shuffle(bank.filter(q => !chosen.includes(q))).slice(0, 5 - chosen.length))).slice(0, 5);
  }

  function comprehensiveBigBank() {
    return fallbackBigBank.length ? fallbackBigBank : [];
  }
  function cloneBigProblem(problem, questions) {
    return {...problem, questions: questions.map(q => ({...q}))};
  }
  function chooseBigExam() {
    const bank = shuffle(comprehensiveBigBank().filter(q => Array.isArray(q.questions) && q.questions.length));
    const three = bank.filter(q => q.questions.length >= 3);
    const two = bank.filter(q => q.questions.length === 2);
    const oneOrMore = bank.filter(q => q.questions.length >= 1);
    if (three.length && (Math.random() < 0.65 || two.length < 1)) {
      const p = three[0];
      return [cloneBigProblem(p, shuffle(p.questions).slice(0, 3))];
    }
    if (two.length) {
      const first = two[0];
      const firstCat = bigCategory(first);
      const second = oneOrMore.find(q => q.id !== first.id && bigCategory(q) !== firstCat) || oneOrMore.find(q => q.id !== first.id);
      if (second) return [cloneBigProblem(first, first.questions), cloneBigProblem(second, shuffle(second.questions).slice(0, 1))];
      return [cloneBigProblem(first, first.questions)];
    }
    if (three.length) return [cloneBigProblem(three[0], shuffle(three[0].questions).slice(0, 3))];
    return [];
  }
  function bigCategory(problem) {
    const label = `${problem?.source || ""} ${problem?.title || ""} ${problem?.sourceFile || ""}`;
    if (label.includes("円錐")) return "円錐振り子";
    if (label.includes("万有")) return "万有引力";
    if (label.includes("バネ") || label.includes("spring")) return "バネ";
    if (label.includes("熱") || label.includes("気体")) return "熱と気体";
    return "その他";
  }

  function writtenPrompt(prompt) {
    return String(prompt ?? "")
      .replace(/組合せとして最も近いものを選びなさい。/g, "組合せを答えなさい。")
      .replace(/のとき、(.+?) はどれですか。/g, "のとき、$1 を答えなさい。")
      .replace(/に最も近いものを選びなさい。/g, "に最も近い値を答えなさい。")
      .replace(/最も近いものを選びなさい。/g, "最も近い値を答えなさい。")
      .replace(/正しいものを選びなさい。/g, "正しい答えを書きなさい。")
      .replace(/正しい関係式を選びなさい。/g, "正しい関係式を書きなさい。")
      .replace(/正しい運動方程式を選びなさい。/g, "正しい運動方程式を書きなさい。")
      .replace(/正しい組合せを選びなさい。/g, "正しい組合せを答えなさい。")
      .replace(/組合せを選びなさい。/g, "組合せを答えなさい。")
      .replace(/(.*式.*?)を選びなさい。/g, "$1を書きなさい。")
      .replace(/式を選びなさい。/g, "式を書きなさい。")
      .replace(/公式を選びなさい。/g, "公式を書きなさい。")
      .replace(/を選びなさい。/g, "を答えなさい。")
      .replace(/どれですか。/g, "答えなさい。");
  }

  function normalizeNumberText(s) {
    return String(s ?? "")
      .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/[−ー―]/g, "-")
      .replace(/，/g, ".")
      .replace(/(\d),(\d)(?!\d{3}\b)/g, "$1.$2")
      .replace(/×\s*10\s*\^\s*([-+]?\d+)/gi, "e$1")
      .replace(/×\s*10([+-]?\d+)/gi, "e$1")
      .replace(/,/g, "");
  }
  function makeSymbolicAnswerVariants(value) {
    const raw = String(value ?? "").replace(/\[[^\]]*\]/g, "").trim();
    const variants = new Set([raw]);
    variants.add(raw.replace(/π/g, "pi"));
    variants.add(raw.replace(/²/g, "^2"));
    variants.add(raw.replace(/√/g, "sqrt"));
    variants.add(raw.replace(/^([A-Za-zθω]+)\s*=\s*/, ""));
    return [...variants].filter(Boolean);
  }
  function normalizeExpression(value) {
    let s = normalizeNumberText(value).toLowerCase().trim();
    s = s
      .replace(/[　\s]/g, "")
      .replace(/＝/g, "=")
      .replace(/÷/g, "/")
      .replace(/・/g, "")
      .replace(/×/g, "*")
      .replace(/π/g, "pi")
      .replace(/θ/g, "theta")
      .replace(/ω/g, "omega")
      .replace(/²/g, "^2")
      .replace(/√/g, "sqrt")
      .replace(/con(?=theta|\()/g, "cos")
      .replace(/sin\(theta\)/g, "sintheta")
      .replace(/cos\(theta\)/g, "costheta")
      .replace(/tan\(theta\)/g, "tantheta")
      .replace(/sin\^2theta/g, "sintheta^2")
      .replace(/\((sintheta|costheta|tantheta)\)/g, "$1")
      .replace(/sqrt\(([^()]+)\)/g, "sqrt$1")
      .replace(/[{}]/g, m => m === "{" ? "(" : ")")
      .replace(/\*/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/n\/m|j\/k|m\/s\^2|m\/s²|m\/s|rad\/s|pa|kg|rad|deg|℃|°|倍/g, "");

    // r2, v2, omega2 などを r^2, v^2, omega^2 に寄せる。数値の 10e5 は壊さない。
    s = s.replace(/\b(omega|theta|[a-z])2\b/g, "$1^2");
    s = s.replace(/([=+\-\/()])(omega|theta|[a-z])2(?=$|[=+\-\/()])/g, "$1$2^2");
    return s;
  }
  function stripOptionalLeftSide(value) {
    const m = value.match(/^[a-z][a-z0-9]*(?:\^2)?=(.+)$/);
    return m ? m[1] : value;
  }
  function addTrigForms(forms, form) {
    const compact = form.replace(/\((sintheta|costheta|tantheta)\)/g, "$1");
    forms.add(compact);
    const replacements = [
      ["tantheta", "sintheta/costheta"],
      ["sintheta/costheta", "tantheta"],
      ["sinthetatantheta", "sintheta^2/costheta"],
      ["sinthetatantheta", "(sintheta)^2/costheta"],
      ["sintheta^2/costheta", "sinthetatantheta"],
      ["(sintheta)^2/costheta", "sinthetatantheta"]
    ];
    replacements.forEach(([from, to]) => {
      if (compact.includes(from)) forms.add(compact.replaceAll(from, to));
    });
  }
  function expressionForms(value) {
    const exact = normalizeExpression(value);
    const withoutLeft = stripOptionalLeftSide(exact);
    const forms = new Set([exact, withoutLeft]);
    Array.from(forms).forEach(form => {
      forms.add(form.replace(/^sqrt(.+)$/, "sqrt$1"));
      forms.add(form.replace(/^sqrt(.+\/.+)$/, "sqrt($1)"));
      addTrigForms(forms, form);
    });
    return forms;
  }
  function formsMatch(a, b) {
    if (a === b) return true;
    if (a.includes("=") && b.includes("=")) {
      const A = a.split("="), B = b.split("=");
      if (A.length === 2 && B.length === 2) return A[0] === B[1] && A[1] === B[0];
    }
    return false;
  }
  function numericExpression(value) {
    const text = normalizeNumberText(value)
      .replace(/\[[^\]]*\]/g, "")
      .replace(/℃|°|kg|Pa|N\/m|N|J\/K|J|K|m\/s\^2|m\/s²|m\/s|rad\/s|rad|m\^3|m³|m2|m|倍/g, "")
      .replace(/π/g, String(Math.PI))
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\s/g, "")
      .replace(/^[a-zA-Zθωπ√][a-zA-Z0-9θωπ√^]*=/, "");
    if (!text || !/^[0-9eE+\-*/.()]+$/.test(text)) return null;
    try {
      const n = Function(`"use strict";return (${text})`)();
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  }
  function symbolicNumberExpression(value) {
    let text = normalizeNumberText(value)
      .replace(/\[[^\]]*\]/g, "")
      .replace(/℃|°|kg|Pa|N\/m|N|J\/K|J|K|m\/s\^2|m\/s²|m\/s|rad\/s|rad|m\^3|m³|m2|m|倍/g, "")
      .replace(/π/g, String(Math.PI))
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/\s/g, "")
      .replace(/^[a-zA-Zθωπ√][a-zA-Z0-9θωπ√^]*=/, "")
      .replace(/√/g, "Math.sqrt")
      .replace(/\^/g, "**")
      .replace(/\bg\b/g, "9.8");
    if (!text || !/[a-zA-Z√]/.test(normalizeNumberText(value))) return null;
    if (!/^[0-9eE+\-*/.()Mathsqrt]+$/.test(text)) return null;
    try {
      const n = Function(`"use strict";return (${text})`)();
      return Number.isFinite(n) ? n : null;
    } catch { return null; }
  }
  function judge(q, value) {
    if (q.number !== undefined) {
      const n = numericExpression(value);
      const tolerance = q.tolerance ?? Math.max(0.02, Math.abs(q.number) * 0.015);
      if (Number.isFinite(n) && Math.abs(n - q.number) <= tolerance) return "correct";
      const symbolic = symbolicNumberExpression(value);
      if (Number.isFinite(symbolic) && Math.abs(symbolic - q.number) <= tolerance) return "partial";
      return "wrong";
    }
    const entered = expressionForms(value);
    const ok = (q.answers || []).some(answer => {
      const accepted = expressionForms(answer);
      return [...entered].some(e => [...accepted].some(a => formsMatch(e, a)));
    });
    return ok ? "correct" : "wrong";
  }

  let items = [];
  let currentTotal = EXAM_TOTAL;
  let lastWrongItems = [];
  let reviewMode = false;
  function field(q, key, points, label, showHint = false) {
    const hint = showHint ? `<button class="hint-btn" type="button" data-hint-toggle>ヒントを表示</button><div class="hint" data-hint>${hintText(q, label)}</div>` : "";
    return `<article class="question" data-key="${key}" data-points="${points}"><div class="question-title">${label} <span class="points">（${points}点）</span></div><div class="prompt">${escapeHtml(writtenPrompt(q.prompt))}</div>${hint}<div class="answer-row"><input class="answer" data-answer autocomplete="off" spellcheck="false" aria-label="${label}の解答"><span class="unit">${escapeHtml(q.unit || "")}</span></div><div class="feedback" data-feedback></div></article>`;
  }
  function hintText(q, label = "") {
    const text = `${label} ${q.prompt || ""} ${q.solution || ""} ${q.display || ""}`;
    const tips = [];
    if (/万有|GM|人工衛星|惑星|軌道|重力|月/.test(text)) {
      tips.push("万有引力は F = GMm/r² です。距離 r が変わる問題では、r が分母の2乗にあることをまず見ます。");
      tips.push("円軌道なら、万有引力が向心力になります。つまり GMm/r² = mv²/r と置いて、共通する m や r を整理します。");
      tips.push("周期を聞かれたら、円周 2πr を速さ v で割って T = 2πr/v と考えます。");
    } else if (/円錐|張力|鉛直|水平|糸|θ|theta|sin|cos|tan/.test(text)) {
      tips.push("力を鉛直方向と水平方向に分けます。鉛直方向はつり合いなので Tcosθ = mg です。");
      tips.push("水平方向の力 Tsinθ が向心力になります。半径は糸の長さ L の水平成分なので r = Lsinθ です。");
      tips.push("速度や加速度を求めるときは、Tsinθ = mv²/r または a = v²/r につなげます。");
    } else if (/円運動するバネ|角速度|自然長|伸び|向心力|ω|omega/.test(text)) {
      tips.push("まずバネの伸びを x = L - L0 と置きます。弾性力は F = kx = k(L - L0) です。");
      tips.push("水平円運動では、バネの弾性力が向心力になります。向心力は mLω² です。");
      tips.push("したがって k(L - L0) = mLω² と置き、求めたい文字について整理します。");
    } else if (/水平バネ|単振動|周期|振幅|自然長での速さ|弾性エネルギー|運動エネルギー/.test(text)) {
      tips.push("周期なら T = 2π√(m/k) を使います。m は分子、k は分母にあることに注意します。");
      tips.push("速さを求める問題では、端での弾性エネルギー 1/2 kA² が、自然長での運動エネルギー 1/2 mv² になると考えます。");
      tips.push("両辺の 1/2 を消してから、v または v² について整理すると計算しやすいです。");
    } else if (/熱|比熱|温度|融解|凝固|気体|圧力|体積|内部エネルギー/.test(text)) {
      tips.push("まず、何の熱量かを見分けます。温度変化なら Q = mcΔT、状態変化なら Q = mL を使います。");
      tips.push("熱のやりとりでは、失った熱量 = 得た熱量 と置きます。温度差 ΔT は必ず「変化した分」で考えます。");
      tips.push("気体では、圧力・体積・温度のどれが一定かを先に確認すると、使う式を選びやすくなります。");
    } else if (/力学的エネルギー|位置エネルギー|運動エネルギー|保存|高さ|速さ/.test(text)) {
      tips.push("力学的エネルギー保存では、はじめのエネルギーの合計 = あとのエネルギーの合計 と置きます。");
      tips.push("位置エネルギーは mgh、運動エネルギーは 1/2 mv² です。質量 m が両辺にあるときは消せる場合があります。");
      tips.push("速さを求めるときは、最後に v² = ... の形にしてから平方根を取ります。");
    } else {
      tips.push("まず、求めたい量と与えられている量に印をつけます。次に、その2つをつなぐ基本公式を1つ選びます。");
      tips.push("単位がそろっているか確認し、式を立ててから代入します。迷ったら、答えの単位になるように式を整理してみましょう。");
    }
    if (q.solution) tips.push(`計算の見通し：${stripTags(q.solution)}`);
    return tips.map(tip => `<div>・${escapeHtml(tip)}</div>`).join("");
  }
  function setScorePill(text) {
    const pill = $("#scorePill");
    if (pill) pill.textContent = text;
  }
  function renderBigQuestions() {
    items = items.filter(item => item.kind !== "大問");
    const bigs = chooseBigExam();
    let n = 0;
    const notationGuide = `<div class="answer-example">数式の入力方法：r²は「r^2」「r2」でも可。πは「pi」でも可。v²は「v^2」「v2」でも可。ω²は「omega^2」「omega2」でも可。√(a/b)は「√a/b」でも可。tanθは「sinθ/cosθ」でも可。求める量は「T=…」のように左辺を付けても可。運動方程式では等号の左右が逆でも可。</div>`;
    $("#bigQuestions").innerHTML = notationGuide + bigs.map((b, bi) => `<section class="question big"><h2>大問${bi + 1}｜${escapeHtml(b.title)}</h2><div class="big-context"><div class="context-label">問題文</div>${escapeHtml(b.context)}</div>${b.questions.map((q, qi) => { n++; const key = `${b.id}_${Date.now()}_${bi + 1}_${qi + 1}_${n}`; const label = `大問${bi + 1} 設問(${qi + 1})`; items.push({q, key, points: BIG_POINTS, label, kind: "大問", title: b.title, context: b.context}); return field(q, key, BIG_POINTS, label); }).join("")}</section>`).join("");
    $("#result").classList.add("hidden");
    $("#submitBtn").disabled = false;
    $("#changeBigBtn").disabled = false;
  }
  function getVerifiedStudentId() {
    const input = $("#studentId");
    const fromInput = input ? input.value.trim() : "";
    const fromAuth = window.TrainerAuth && typeof TrainerAuth.getStudentId === "function" ? TrainerAuth.getStudentId() : "";
    const studentId = fromInput || String(fromAuth || "").trim();
    if (input && studentId && !fromInput) input.value = studentId;
    return studentId;
  }
  function start() {
    if (!getVerifiedStudentId()) {
      if (window.TrainerAuth && typeof TrainerAuth.login === "function") { TrainerAuth.login(); return; }
      alert("大学Googleアカウントを確認できませんでした。ログインし直してください。");
      return;
    }
    const basics = chooseBasics();
    items = [];
    currentTotal = EXAM_TOTAL;
    lastWrongItems = [];
    reviewMode = false;
    setScorePill("30点満点");
    $("#submitBtn").textContent = "答案を提出して採点";
    $("#basicQuestions").innerHTML = basics.map((q, i) => {
      const label = `小問${i + 1}｜${q.section || q.sourceUnit || "小問"}`;
      items.push({q, key: q.id, points: BASIC_POINTS, label, kind: "小問"});
      return field(q, q.id, BASIC_POINTS, label);
    }).join("");

    renderBigQuestions();
    $("#startScreen").classList.add("hidden");
    $("#examScreen").classList.remove("hidden");
    $("#result").classList.add("hidden");
    $("#submitBtn").disabled = false;
    window.TrainerLog?.startSession();
  }
  function submit() {
    let score = 0;
    const wrong = [];
    const wrongItems = [];
    items.forEach(item => {
      const el = document.querySelector(`[data-key="${item.key}"]`);
      const value = el.querySelector("[data-answer]").value;
      const status = judge(item.q, value);
      const ok = status === "correct";
      const partial = status === "partial";
      const earned = ok ? item.points : partial ? Math.ceil(item.points / 2) : 0;
      const fb = el.querySelector("[data-feedback]");
      const prompt = `${item.label}｜${writtenPrompt(item.q.prompt)}`;
      score += earned;
      if (!ok) { wrong.push(prompt); wrongItems.push({...item, originalPrompt: prompt}); }
      fb.className = "feedback show " + (ok ? "right" : partial ? "partial" : "wrong");
      fb.innerHTML = ok
        ? `正解（${item.points}点）`
        : partial
          ? `△（${earned}点） 数値で答える問題なので、最後は数値まで出しましょう。正解：<strong>${escapeHtml(displayAnswer(item.q))}</strong>`
          : `不正解　正解：<strong>${escapeHtml(displayAnswer(item.q))}</strong>`;
      el.querySelector("[data-answer]").disabled = true;
      window.TrainerLog?.recordQuestion({id: "MOCK_" + item.key, type: item.kind === "大問" ? "final_mock_big" : "final_mock_basic", question: prompt, answer: displayAnswer(item.q)}, ok, {selected: value, prompt});
    });
    lastWrongItems = wrongItems;
    const elapsed = window.TrainerLog?.finishSession?.() || 0;
    $("#scoreValue").textContent = score + ` / ${currentTotal}点`;
    $("#result").classList.remove("hidden");
    $("#submitBtn").disabled = true;
    $("#changeBigBtn").disabled = true;
    $("#reviewWrongBtn").style.display = wrongItems.length ? "inline-block" : "none";
    const status = document.getElementById("sendStatus");
    if (status) status.textContent = `所要時間：${Math.floor(elapsed / 60)}分${elapsed % 60}秒。保存処理を開始しました。`;
    if (!window.TrainerLog || typeof window.TrainerLog.sendResult !== "function") {
      if (status) status.textContent = "保存処理を開始できませんでした。Googleログイン版から開き直してください。";
      return;
    }
    window.TrainerLog.sendResult({score, total: currentTotal, extra: {examType: reviewMode ? "期末試験模試・間違い直し" : "期末試験模試", wrongQuestions: wrong, itemCount: items.length}});
    $("#result").scrollIntoView({behavior: "smooth"});
  }
  function renderWrongReview() {
    if (!lastWrongItems.length) return;
    reviewMode = true;
    items = [];
    currentTotal = lastWrongItems.reduce((sum, item) => sum + item.points, 0);
    setScorePill(`${currentTotal}点満点`);
    $("#submitBtn").textContent = "やり直しを採点";
    $("#submitBtn").disabled = false;
    $("#changeBigBtn").disabled = true;
    $("#result").classList.add("hidden");
    const basics = lastWrongItems.filter(item => item.kind === "小問");
    const bigs = lastWrongItems.filter(item => item.kind === "大問");
    $("#basicQuestions").innerHTML = basics.length ? basics.map((item, i) => {
      const key = `REVIEW_BASIC_${Date.now()}_${i}`;
      const reviewItem = {...item, key, label: `やり直し 小問${i + 1}`};
      items.push(reviewItem);
      return field(reviewItem.q, key, reviewItem.points, reviewItem.label, true);
    }).join("") : `<div class="guide">小問の間違いはありません。</div>`;
    $("#bigQuestions").innerHTML = bigs.length ? bigs.map((item, i) => {
      const key = `REVIEW_BIG_${Date.now()}_${i}`;
      const reviewItem = {...item, key, label: `やり直し 大問${i + 1}`};
      items.push(reviewItem);
      return `<section class="question big"><h2>${escapeHtml(item.title || "大問のやり直し")}</h2>${item.context ? `<div class="big-context"><div class="context-label">問題文</div>${escapeHtml(item.context)}</div>` : ""}${field(reviewItem.q, key, reviewItem.points, reviewItem.label, true)}</section>`;
    }).join("") : `<div class="guide">大問の間違いはありません。</div>`;
    window.TrainerLog?.startSession();
    window.scrollTo({top: 0, behavior: "smooth"});
  }

  $("#startBtn").addEventListener("click", start);
  $("#submitBtn").addEventListener("click", submit);
  $("#changeBigBtn").addEventListener("click", renderBigQuestions);
  $("#reviewWrongBtn").addEventListener("click", renderWrongReview);
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-hint-toggle]");
    if (!btn) return;
    const box = btn.nextElementSibling;
    const isOpen = box && box.classList.toggle("show");
    btn.textContent = isOpen ? "ヒントを隠す" : "ヒントを表示";
  });
  $("#againBtn").addEventListener("click", () => location.reload());
  const studentInput = $("#studentId");
  if (studentInput) studentInput.addEventListener("keydown", e => { if (e.key === "Enter") start(); });
})();
