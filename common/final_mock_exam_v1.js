(() => {
  const basicBank=[
    {id:"c_rad",section:"円運動",prompt:"180°をラジアンで答えなさい。",answers:["π","pi"],display:"π",example:"π または pi"},
    {id:"c_arc",section:"円運動",prompt:"半径2.0 m、角度3.0 radの弧の長さを求めなさい。",number:6,tolerance:.01,unit:"m",display:"6.0 m"},
    {id:"c_speed",section:"円運動",prompt:"半径0.50 m、角速度4.0 rad/sの物体の速さを求めなさい。",number:2,tolerance:.01,unit:"m/s",display:"2.0 m/s"},
    {id:"c_period",section:"円運動",prompt:"角速度が2π rad/sの円運動の周期を求めなさい。",number:1,tolerance:.01,unit:"s",display:"1.0 s"},
    {id:"c_acc",section:"円運動",prompt:"速さ6.0 m/s、半径3.0 mの円運動の向心加速度を求めなさい。",number:12,tolerance:.05,unit:"m/s²",display:"12 m/s²"},
    {id:"s_force",section:"バネ",prompt:"ばね定数200 N/mのばねを0.030 m伸ばしたときの弾性力の大きさを求めなさい。",number:6,tolerance:.02,unit:"N",display:"6.0 N"},
    {id:"s_extension",section:"バネ",prompt:"ばね定数50 N/mのばねに10 Nの力を加えた。伸びを求めなさい。",number:.2,tolerance:.002,unit:"m",display:"0.20 m"},
    {id:"s_energy",section:"バネ",prompt:"ばね定数100 N/mのばねを0.20 m伸ばしたときの弾性エネルギーを求めなさい。",number:2,tolerance:.02,unit:"J",display:"2.0 J"},
    {id:"h_heat",section:"熱",prompt:"質量0.20 kg、比熱4200 J/(kg·K)の水の温度を5.0 K上げるのに必要な熱量を求めなさい。",number:4200,tolerance:5,unit:"J",display:"4200 J"},
    {id:"h_capacity",section:"熱",prompt:"熱容量600 J/Kの物体へ1800 Jを与えた。温度変化を求めなさい。",number:3,tolerance:.02,unit:"K",display:"3.0 K"},
    {id:"h_mix",section:"熱",prompt:"同じ質量の同じ物質を20℃と80℃から混ぜ、熱損失がないとする。平衡温度を求めなさい。",number:50,tolerance:.1,unit:"℃",display:"50 ℃"}
  ];
  const big2=[
    {id:"grav_symbol",title:"人工衛星の軌道速度",context:"地球の質量をM、人工衛星の質量をm、地球中心からの距離をr、万有引力定数をGとする。",questions:[
      {prompt:"人工衛星にはたらく万有引力Fを式で答えなさい。",answers:["GMm/r²","GMm/r^2"],display:"GMm/r²",example:"F=GMm/r2 または GMm/r²"},
      {prompt:"円軌道を回る人工衛星の速さvを式で答えなさい。",answers:["√(GM/r)","sqrt(GM/r)"],display:"√(GM/r)",example:"v=√GM/r または √(GM/r)"}
    ]},
    {id:"cone_force",title:"円錐振り子の力",context:"質量mの小球が、鉛直方向から角度θだけ傾いた糸で水平な円運動をしている。糸の張力をTとする。",questions:[
      {prompt:"鉛直方向のつり合いを式で答えなさい。",answers:["Tcosθ=mg","Tcos(theta)=mg","Tcosθ＝mg"],display:"Tcosθ = mg",example:"Tcosθ=mg"},
      {prompt:"水平方向の運動方程式を、円運動の半径rと速さvを使って答えなさい。",answers:["Tsinθ=mv²/r","Tsin(theta)=mv^2/r"],display:"Tsinθ = mv²/r",example:"Tsinθ=mv2/r"}
    ]},
    {id:"spring_circle",title:"円運動するばね",context:"質量mの物体が、自然長からx伸びたばねにつながれ、半径r、速さvで水平な円運動をしている。ばね定数をkとする。",questions:[
      {prompt:"ばねの弾性力の大きさを式で答えなさい。",answers:["kx"],display:"kx",example:"F=kx または kx"},
      {prompt:"ばねの弾性力が向心力になる運動方程式を答えなさい。",answers:["kx=mv²/r","kx=mv^2/r"],display:"kx = mv²/r",example:"kx=mv2/r"}
    ]}
  ];
  const big3=[
    {id:"grav_numeric",title:"地表付近の人工衛星",context:"地球の半径を6.4×10⁶ m、地表の重力加速度を9.8 m/s²とし、人工衛星が地表すれすれを円運動すると考える。",questions:[
      {prompt:"万有引力が向心力になる式を、地球質量M、衛星質量m、半径R、速さvで答えなさい。",answers:["GMm/R²=mv²/R","GMm/R^2=mv^2/R"],display:"GMm/R² = mv²/R",example:"GMm/R2=mv2/R"},
      {prompt:"GM/R²=gを使い、軌道速度vをgとRで表しなさい。",answers:["√(gR)","sqrt(gR)"],display:"√(gR)",example:"v=√gR または √(gR)"},
      {prompt:"軌道速度をkm/sで求めなさい。",number:7.9,tolerance:.15,unit:"km/s",display:"約7.9 km/s"}
    ]},
    {id:"cone_speed",title:"円錐振り子の速さ",context:"長さLの糸につながれた質量mの小球が、鉛直方向から角度θで円錐振り子の運動をしている。張力をT、円運動の半径をrとする。",questions:[
      {prompt:"円運動の半径rをLとθで表しなさい。",answers:["Lsinθ","Lsin(theta)"],display:"Lsinθ",example:"r=Lsinθ または Lsin(theta)"},
      {prompt:"鉛直方向のつり合いから、張力Tを式で表しなさい。",answers:["mg/cosθ","mg/cos(theta)"],display:"mg/cosθ",example:"T=mg/cosθ"},
      {prompt:"Tsinθ=mv²/rを使い、v²をg、L、θで表しなさい。",answers:["gLsinθtanθ","gLsin(theta)tan(theta)"],display:"gLsinθtanθ",example:"v2=gLsinθtanθ"}
    ]}
  ];
  const $=s=>document.querySelector(s),shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};

  const normalize=s=>String(s??"").trim().toLowerCase()
    .replace(/[　\s]/g,"")
    .replace(/＝/g,"=")
    .replace(/[−ー―]/g,"-")
    .replace(/÷/g,"/")
    .replace(/・/g,"")
    .replace(/×/g,"*")
    .replace(/π/g,"pi")
    .replace(/θ/g,"theta")
    .replace(/²/g,"^2")
    .replace(/√/g,"sqrt")
    .replace(/[{}]/g,m=>m==="{"?"(":")")
    .replace(/([a-z])2(?=$|[=+\-*/()])/g,"$1^2");

  function stripOptionalLeftSide(value){
    const match=value.match(/^[a-z](?:\^2)?=(.+)$/);
    return match?match[1]:value;
  }

  function normalizeRadical(value){
    return /^sqrt(?!\()(.+)$/.test(value)?value.replace(/^sqrt(.+)$/,"sqrt($1)"):value;
  }

  function symbolicForms(value){
    const exact=normalize(value);
    const withoutLeft=stripOptionalLeftSide(exact);
    return new Set([exact,normalizeRadical(exact),withoutLeft,normalizeRadical(withoutLeft)]);
  }

  function correct(q,value){
    if(q.number!==undefined){
      const n=Number(String(value).replace(/,/g,""));
      return Number.isFinite(n)&&Math.abs(n-q.number)<=q.tolerance;
    }
    const entered=symbolicForms(value);
    return q.answers.some(answer=>{
      const accepted=symbolicForms(answer);
      return [...entered].some(form=>accepted.has(form));
    });
  }

  function chooseBasics(){const by=s=>shuffle(basicBank.filter(q=>q.section===s));const chosen=[by("円運動")[0],by("バネ")[0],by("熱")[0]];return shuffle(chosen.concat(shuffle(basicBank.filter(q=>!chosen.includes(q))).slice(0,2)));}
  let items=[];
  function field(q,key,points,label){const notation=q.number===undefined?`<div class="answer-example">入力方法：x²は「x2」、√(a/b)は「√a/b」でも可。求める量は「y=…」のように左辺を付けても可。運動方程式では等号を入力してください。</div>`:"";return `<article class="question" data-key="${key}" data-points="${points}"><div class="question-title">${label} <span class="points">（${points}点）</span></div><div class="prompt">${q.prompt}</div>${notation}<div class="answer-row"><input class="answer" data-answer autocomplete="off" spellcheck="false" aria-label="${label}の解答"><span class="unit">${q.unit||""}</span></div><div class="feedback" data-feedback></div></article>`;}
  function start(){const id=$("#studentId").value.trim();if(!id){alert("学籍番号を入力してください。");return;}const basics=chooseBasics(),b2=shuffle(big2)[0],b3=shuffle(big3)[0];items=[];$("#basicQuestions").innerHTML=basics.map((q,i)=>{items.push({q,key:q.id,points:3});return field(q,q.id,3,`小問${i+1}｜${q.section}`);}).join("");let n=0;$("#bigQuestions").innerHTML=[b2,b3].map((b,bi)=>`<section class="question big"><h2>大問${bi+1}｜${b.title}</h2><div class="big-context">${b.context}</div>${b.questions.map(q=>{n++;const key=b.id+"_"+n;items.push({q,key,points:5});return field(q,key,5,`設問(${b.questions.indexOf(q)+1})`);}).join("")}</section>`).join("");$("#startScreen").classList.add("hidden");$("#examScreen").classList.remove("hidden");$("#result").classList.add("hidden");$("#submitBtn").disabled=false;window.TrainerLog?.startSession();}
  function submit(){let score=0;items.forEach(item=>{const el=document.querySelector(`[data-key="${item.key}"]`),value=el.querySelector("[data-answer]").value,ok=correct(item.q,value),fb=el.querySelector("[data-feedback]");if(ok)score+=item.points;fb.className="feedback show "+(ok?"right":"wrong");fb.innerHTML=ok?`正解（${item.points}点）`:`不正解　正解：<strong>${item.q.display}</strong>`;el.querySelector("[data-answer]").disabled=true;window.TrainerLog?.recordQuestion({id:"MOCK_"+item.key,type:"final_mock",question:item.q.prompt,answer:item.q.display},ok,{selected:value,prompt:item.q.prompt});});$("#scoreValue").textContent=score+" / 40点";$("#result").classList.remove("hidden");$("#submitBtn").disabled=true;window.TrainerLog?.finishSession();window.TrainerLog?.sendResult({score,total:40});$("#result").scrollIntoView({behavior:"smooth"});}
  $("#startBtn").addEventListener("click",start);$("#submitBtn").addEventListener("click",submit);$("#againBtn").addEventListener("click",()=>location.reload());$("#studentId").addEventListener("keydown",e=>{if(e.key==="Enter")start();});
})();
