/* ResFunder app, ported from the demo artifact (site/index.html).
   Vanilla JS that renders into #root, #drawerRoot, #modalRoot, #svRoot and #toast. */
let started = false;
export function startResFunder(bridge) {
  if (started) return;
  started = true;
(function(){
const sv=p=>'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
const I={check:sv('<path d="M3.5 8.5l3 3 6-7"/>'),x:sv('<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>'),clock:sv('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.2l2 1.3"/>'),
  chev:sv('<path d="M6 4l4 4-4 4"/>'),chevL:sv('<path d="M10 4L6 8l4 4"/>'),down:sv('<path d="M4 6l4 4 4-4"/>'),arrow:sv('<path d="M3 8h10M9 4l4 4-4 4"/>'),
  home:sv('<path d="M2.5 7.2L8 2.5l5.5 4.7V13a.8.8 0 01-.8.8H3.3a.8.8 0 01-.8-.8z"/><path d="M6.5 13.8V10h3v3.8"/>'),
  doc:sv('<path d="M4 1.8h5.5L12.5 5v9.2H4z"/><path d="M9.5 1.8V5h3M6 8.5h4.5M6 11h4.5"/>'),flag:sv('<path d="M3.5 14V2.5M3.5 3h8l-1.6 3 1.6 3h-8"/>'),
  peso:sv('<circle cx="8" cy="8" r="6.2"/><path d="M6.3 11.5v-7h2.4a1.9 1.9 0 010 3.8H6.3M5 6.4h6M5 7.8h6"/>'),chart:sv('<path d="M2.5 13.5h11M4.5 11V8M8 11V4.5M11.5 11V6.5"/>'),
  gear:sv('<circle cx="8" cy="8" r="2.2"/><path d="M8 1.8v1.6M8 12.6v1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M1.8 8h1.6M12.6 8h1.6M3.6 12.4l1.1-1.1M11.3 4.7l1.1-1.1"/>'),
  help:sv('<circle cx="8" cy="8" r="6.2"/><path d="M6.3 6.2a1.8 1.8 0 113 1.4c-.8.5-1.3.9-1.3 1.8M8 11.4v.1"/>'),search:sv('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>'),
  filter:sv('<path d="M2.5 4.5h11M4.5 8h7M6.5 11.5h3"/>'),sort:sv('<path d="M2.5 4.5h7M2.5 8h5M2.5 11.5h3M12 3.5v9M10 10.5l2 2 2-2"/>'),
  bell:sv('<path d="M4 11V7.3a4 4 0 018 0V11l1 1.3H3zM6.5 13.8a1.6 1.6 0 003 0"/>'),panel:sv('<rect x="2" y="2.5" width="12" height="11" rx="1.8"/><path d="M6 2.5v11"/>'),
  menu:sv('<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>'),plus:sv('<path d="M8 3v10M3 8h10"/>'),minus:sv('<path d="M3.5 8h9"/>'),eye:sv('<path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8 12.1 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/>'),
  link:sv('<path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.5l-1 1a2.8 2.8 0 01-4-4l1-1"/>'),dl:sv('<path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10"/>'),
  lock:sv('<rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 015 0v2"/>'),shield:sv('<path d="M8 1.8l5 2v4c0 3-2.2 5.3-5 6.4-2.8-1.1-5-3.4-5-6.4v-4z"/><path d="M5.8 8.2l1.6 1.6 2.9-3.2"/>'),
  wallet:sv('<path d="M12.5 5.3V3.2a.7.7 0 00-.7-.7H3.3a1.8 1.8 0 000 3.6h9.5a.7.7 0 01.7.7v6.5a.7.7 0 01-.7.7H3.2a1.7 1.7 0 01-1.7-1.7V4.3"/><circle cx="10.8" cy="9.3" r=".7"/>'),
  mail:sv('<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M2.5 4.5L8 9l5.5-4.5"/>'),users:sv('<circle cx="6" cy="5.5" r="2.3"/><path d="M1.8 13.2c.6-2 2.2-3.1 4.2-3.1s3.6 1.1 4.2 3.1M10.6 3.5a2.2 2.2 0 010 4.2M12.2 10.3c1.1.4 1.8 1.3 2.1 2.9"/>'),
  coins:sv('<ellipse cx="8" cy="4.5" rx="5" ry="2"/><path d="M3 4.5V8c0 1.1 2.2 2 5 2s5-.9 5-2V4.5M3 8v3.5c0 1.1 2.2 2 5 2s5-.9 5-2V8"/>'),
  dots:sv('<circle cx="8" cy="3.5" r=".9" fill="currentColor"/><circle cx="8" cy="8" r=".9" fill="currentColor"/><circle cx="8" cy="12.5" r=".9" fill="currentColor"/>'),
  spin:sv('<path d="M8 2a6 6 0 106 6"/>'),code:sv('<path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5"/>'),ai:sv('<path d="M8 2.2l1.4 3.6 3.6 1.4-3.6 1.4L8 12.2 6.6 8.6 3 7.2l3.6-1.4z"/>'),
  rule:sv('<path d="M8 2.5v11M5 13.5h6M3 4.5h10M3 4.5L1.5 8.5a1.6 1.6 0 003 0L3 4.5zM13 4.5l-1.5 4a1.6 1.6 0 003 0L13 4.5z"/>'),back:sv('<path d="M13 8H3M7 4L3 8l4 4"/>'),
  qr:sv('<rect x="2" y="2" width="4.5" height="4.5" rx=".8"/><rect x="9.5" y="2" width="4.5" height="4.5" rx=".8"/><rect x="2" y="9.5" width="4.5" height="4.5" rx=".8"/><path d="M9.5 9.5h2v2M14 9.5v.01M9.5 14h4.5v-2"/>'),
  pen:sv('<path d="M10.5 2.5l3 3L6 13H3v-3z"/><path d="M9 4l3 3"/>'),pause:sv('<path d="M5.5 3.5v9M10.5 3.5v9"/>'),refund:sv('<path d="M3 6.5h7.5a3 3 0 010 6H6M5.5 3.5L2.5 6.5l3 3"/>'),send:sv('<path d="M14 2L7 9M14 2l-4.5 12L7 9 2 6.5z"/>')};
const fx=I.wallet;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* B is the bridge to the real app (bridge.ts): session, MetaMask, API. D is what it has loaded so far. */
const B=bridge;
const D={fee:'…',bal:'',list:false,listErr:'',ws:{},wsErr:{},pend:null,open:null,openErr:'',hist:null,histErr:''};
const shortW=w=>w.length>14?w.slice(0,6)+'…'+w.slice(-4):w;
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate=d=>{const [y,m,dd]=String(d).split('-').map(Number);return y?MONTHS[m-1]+' '+dd+', '+y:d};

/* ================= data ================= */
/* Your surveys: drafts kept in this browser first, then the funded ones from the server. */
let SURVEYS=[];
const SV=id=>SURVEYS.find(s=>s.id===id);
const TYPES=[['mc','Multiple choice'],['scale','Scale (1 to 5)'],['open','Open-ended']];
const drafts=()=>SURVEYS.filter(s=>s.status==='draft');
const saveDrafts=()=>{try{B.saveDrafts(drafts())}catch(e){}};
const me=()=>{const email=S.auth.email||'',name=email.split('@')[0].split(/[._-]+/).filter(Boolean).map(w=>w[0].toUpperCase()+w.slice(1)).join(' ')||'You';
  return {email,name,first:name.split(' ')[0],ini:name.split(' ').map(w=>w[0]).join('').slice(0,2)}};

const S={boot:true,authed:false,landing:true,wallet:'',after:null,want:'',auth:{stage:'login',email:'',pw:'',show:false,wallet:'',busy:'',err:'',pf:null},
  page:'dashboard',sid:'',stab:'overview',finsub:'wallet',answered:{},sideOpen:false,
  draft:{},launched:{},closeAsk:false,closeErr:'',busy:'',fundErr:'',
  openRev:null,qQ:'',reasonFor:null,reason:'',dbusy:'',derr:'',
  range:'week',day:null,chart:null,pace:0,lQ:'',lRes:'all',lSel:new Set(),fOpen:false,rq:{},fsub:'all',rv:'all',ri:0,jLink:'',
  sv:null};

/* A survey opened from the server: {survey, log, results} */
const W=id=>D.ws[id];
/* Responses waiting in Review, from the surveys opened so far. Each survey's log needs its own signature. */
/* What needs the researcher: the responses in review. */
const reviews=()=>Object.values(D.ws).flatMap(w=>w.log.rows.filter(r=>r.res==='review').map(r=>({...r,sid:w.survey.id,stitle:w.survey.title})));
const revRow=key=>reviews().find(r=>r.key===key);

/* ================= loading from the server ================= */
/* Drafts first, then the funded surveys. Questions already loaded for a survey are kept. */
function setSurveys(list){SURVEYS=drafts().concat(list.map(s=>Object.assign({},SV(s.id)||{},s)))}
async function loadList(force){D.listErr='';
  try{setSurveys(await B.surveys(force));D.list=true}catch(e){D.listErr=B.text(e)}
  if(S.want.startsWith('survey-')){const h=S.want;S.want='';const sid=h.split('-')[1];if(SV(sid)){nav(h);return}}
  if(S.page==='dashboard'||S.page==='surveys'||S.page==='finance')render()}
async function loadWs(id,force){if(!force&&D.ws[id])return;delete D.wsErr[id];
  try{const w=await B.open(id);D.ws[id]=w;const i=SURVEYS.findIndex(s=>s.id===id);if(i>=0)SURVEYS[i]=w.survey;else SURVEYS.push(w.survey)}
  catch(e){D.wsErr[id]=B.text(e)}
  if((S.page==='survey'&&S.sid===id)||S.page==='dashboard')render()}
function loadOpen(){D.openErr='';B.openSurveys().then(l=>{D.open=l;if(S.page==='answer')render()},e=>{D.openErr=B.text(e);if(S.page==='answer')render()})}
function loadHist(){D.histErr='';B.history().then(h=>{D.hist=h;if(S.page==='answer'||S.page==='finance')render()},e=>{D.histErr=B.text(e);if(S.page==='answer'||S.page==='finance')render()})}
function loadBalance(){B.balance().then(b=>{D.bal=b;if(S.page==='finance'&&S.finsub==='wallet')render()},()=>{})}
function loadFee(){B.feeEach().then(f=>{D.fee=f;if(document.getElementById('sF'))refreshFund()},()=>{})}
/* Signed in: show the dashboard and load what it needs. */
function enter(sess){S.boot=false;S.authed=true;S.landing=false;S.auth.email=sess.email;S.wallet=sess.wallet||'';
  SURVEYS=B.drafts();D.pend=B.pendingFund();
  const a=S.after;S.after=null;
  if(a==='publish'){newDraft()}
  else if(a==='answer'){S.page='answer';render()}
  else if(a&&a.s){S.page='answer';render();openByLink(a.s,'link')}
  else{S.want=(location.hash||'').slice(1);fromHash();render()}
  loadList();loadFee();loadBalance();loadOpen();loadHist()}

/* ================= shell ================= */
function sideNav(){
  const nr=reviews().length,M=me();
  const top=(page,ic,label,c)=>{const on=S.page===page||(page==='surveys'&&S.page==='survey');
    return `<button class="nv top ${on?'on':''}" data-nav="${page==='finance'?'finance-'+S.finsub:page}" ${on?'aria-current="page"':''}>${ic}<span>${label}</span>${c?`<span class="cnt" title="${c} in review">${c}</span>`:''}</button>`};
  return `<div class="brand"><span class="logo" aria-hidden="true"></span>ResFunder<span class="sp"></span><button class="ibtn menuClose" data-act="sideClose" aria-label="Close menu">${I.panel}</button></div>
  <nav class="nav" aria-label="Main">
    ${top('dashboard',I.home,'Dashboard')}
    ${top('surveys',I.doc,'Surveys',nr)}
    ${top('answer',I.pen,'Answer surveys')}
    ${top('finance',I.peso,'Finance')}
  </nav>
  <div class="grow"></div>
  <nav class="nav" aria-label="Account">${top('settings',I.gear,'Settings')}${top('help',I.help,'Help and support')}</nav>
  <button class="acct" data-nav="settings"><span class="av">${esc(M.ini)}</span><span style="min-width:0"><b>${esc(M.name)}</b><small>${esc(M.email)}</small></span></button>
  <div class="wchip"><span class="fx">${fx}</span><span><b>${S.wallet?shortW(S.wallet):'Wallet not connected'}</b><small>MetaMask · BSC Testnet</small></span>${S.wallet?'<span class="on" title="Connected"></span>':''}</div>`;
}
function header(crumb,title,acts){
  return `<div class="ph"><div class="l"><button class="ibtn menuBtn" data-act="sideOpen" aria-label="Open menu">${I.menu}</button><div>${crumb?`<div class="crumb">${crumb}</div>`:''}<h1>${title}</h1></div></div>
    ${acts?`<div class="acts">${acts}</div>`:''}</div>`;
}
function render(){
  const root=document.getElementById('root');
  if(S.boot){root.innerHTML='';return}
  if(!S.authed){root.innerHTML=S.landing?vLanding():vAuth();document.getElementById('drawerRoot').innerHTML='';document.getElementById('modalRoot').innerHTML='';document.getElementById('svRoot').innerHTML='';return}
  const P={dashboard:vDashboard,surveys:vSurveys,survey:vSurvey,answer:vAnswer,finance:vFinance,settings:vSettings,help:vHelp}[S.page]||vDashboard;
  root.innerHTML=`<div class="shell"><aside class="side ${S.sideOpen?'open':''}" aria-label="Sidebar">${sideNav()}</aside><div class="scrimSide ${S.sideOpen?'open':''}" data-act="sideClose"></div><main class="main">${P()}</main></div>`;
  document.getElementById('drawerRoot').innerHTML=S.openRev?reviewPanel():'';
  document.getElementById('modalRoot').innerHTML=S.closeAsk?closeModal():'';
  {const old=document.querySelector('#svRoot .sv'),y=old?old.scrollTop:0,k=S.sv&&S.sv._k;document.getElementById('svRoot').innerHTML=S.sv?vStudent():'';
    if(S.sv&&k!=null&&S.sv._k===k){const n=document.querySelector('#svRoot .sv');if(n)n.scrollTop=y}}
  try{const h=hashOf();if(location.hash!=='#'+h)history.replaceState(null,'','#'+h)}catch(e){}
}
function hashOf(){return S.page==='survey'?`survey-${S.sid}-${S.stab}`:S.page==='finance'?'finance-'+S.finsub:S.page}
function nav(id){
  S.sideOpen=false;S.fOpen=false;
  if(id.startsWith('finance-')){S.page='finance';S.finsub=id.slice(8);if(S.finsub==='wallet')loadBalance()}
  else if(id.startsWith('survey-')){const [,sid,tab]=id.split('-');if(SV(sid)){openSurvey(sid,tab);return}}
  else S.page=id;
  if(S.page==='answer'){loadOpen();loadHist()}
  if(S.page==='finance'&&S.finsub==='payouts')loadHist();
  render();try{window.scrollTo({top:0})}catch(e){}
}
const defTab=sid=>SV(sid).status==='draft'?'build':'overview';
function openSurvey(sid,tab){const s=SV(sid);S.sid=sid;S.stab=tab||defTab(sid);S.page='survey';S.sideOpen=false;S.ri=0;S.day=null;S.lSel=new Set();S.fundErr='';
  render();try{window.scrollTo({top:0})}catch(e){}
  if(s.real)loadWs(sid)}

/* ================= auth (register → verify → connect MetaMask) ================= */
function stepper(items,cur){
  return `<div class="stepper" role="list">${items.map((it,i)=>{const st=i<cur?'done':i===cur?'now':'';
    return `${i?`<span class="sp-ln ${i<=cur?'done':''}" aria-hidden="true"></span>`:''}<span class="sp-i ${st}" role="listitem" ${st==='now'?'aria-current="step"':''}><span class="c">${i<cur?I.check:i+1}</span><span>${it[0]}${it[1]?`<small>${it[1]}</small>`:''}</span></span>`}).join('')}</div>`;
}
/* ================= sign-in =================
   Log in: email + password. Create account: email + password + MetaMask on one page (one free signature).
   Then the sign-up questions: Who are you? → About you → Where you are (+ two consent boxes) → What describes you best.
   Errors only on submit. "Others" opens a text box. Under 18 stops sign-up and signs out. */
const pf=()=>S.auth.pf||(S.auth.pf={who:'',whoO:'',age:'',sex:'',sexO:'',region:'',city:'',c1:false,c2:false,g1:'',g1O:'',g2:'',g2O:''});
const WHO=[['student','Student'],['employed','Employed'],['self','Self-employed'],['unemployed','Unemployed'],['senior','Senior citizen'],['other','Others']];
const PF={
  age:[['under_18','Under 18'],['18-24','18–24'],['25-34','25–34'],['35-44','35–44'],['45-59','45–59'],['60+','60 or older']],
  sex:[['female','Female'],['male','Male'],['prefer_not','Prefer not to say'],['other','Others']],
  region:['NCR · Metro Manila','CAR · Cordillera','Region I · Ilocos','Region II · Cagayan Valley','Region III · Central Luzon','Region IV-A · CALABARZON','MIMAROPA','Region V · Bicol','Region VI · Western Visayas','Region VII · Central Visayas','Region VIII · Eastern Visayas','Region IX · Zamboanga Peninsula','Region X · Northern Mindanao','Region XI · Davao','Region XII · SOCCSKSARGEN','Region XIII · Caraga','BARMM']};
const INDUSTRY=[['education','Education'],['health','Health'],['it','IT / BPO'],['retail','Retail and sales'],['government','Government'],['other','Others']];
/** "What describes you best": the choice groups for each answer to Who are you? */
const GROUPS={
  student:[['Level',[['shs','Senior high school'],['college','College'],['grad','Graduate school'],['other','Others']]],['Field',[['arts','Arts and sciences'],['business','Business'],['computing','Computing / IT'],['education','Education'],['engineering','Engineering'],['health','Health sciences'],['other','Others']]]],
  employed:[['Work type',[['full','Full-time'],['part','Part-time'],['contract','Contract'],['other','Others']]],['Industry',INDUSTRY]],
  self:[['Kind of work',[['owner','Business owner'],['freelance','Freelancer'],['gig','Gig work'],['other','Others']]],['Industry',INDUSTRY]],
  unemployed:[['Situation',[['looking','Looking for work'],['notlooking','Not looking for now'],['home','Homemaker'],['recent','Recent graduate'],['other','Others']]]],
  senior:[['Situation',[['retired','Retired'],['working','Still working'],['volunteer','Volunteering'],['other','Others']]]],
  other:[['Situation',[['studying','Studying'],['working','Working'],['notworking','Not working'],['other','Others']]]]};
const TOTAL=4;
function pills(key,label,opts){const P=pf();
  return `<fieldset class="pf-set"><legend>${label}</legend><div class="pf-pills">${opts.map(([v,l])=>`<label class="pf-pill"><input type="radio" name="pf-${key}" data-pf="${key}" value="${v}" ${P[key]===v?'checked':''}><span>${l}</span></label>`).join('')}</div>
    ${P[key]==='other'?`<label class="pf-other"><span>Specify</span><input class="inp" data-pft="${key}O" maxlength="60" placeholder="Type here" value="${esc(P[key+'O'])}"></label>`:''}</fieldset>`}
/* errors run on Continue only */
const oth=(P,k,m)=>!P[k]?m:(P[k]==='other'&&!P[k+'O'].trim()?'Tell us which one, or pick an option above.':'');
function stepError(stage,i){const P=pf();
  if(stage==='who')return oth(P,'who','Choose what describes you.');
  if(i===0)return (P.age?'':'Pick your age range.')||oth(P,'sex','Pick one, or Prefer not to say.');
  if(i===1)return (P.region?'':'Choose your region.')||(P.city.trim()?'':'Enter your city or municipality.')||(P.c1&&P.c2?'':'Tick both boxes to continue.');
  if(i===2){const G=GROUPS[P.who]||[];return (G[0]?oth(P,'g1','Pick one for '+G[0][0].toLowerCase()+'.'):'')||(G[1]?oth(P,'g2','Pick one for '+G[1][0].toLowerCase()+'.'):'')}
  return ''}
/* morph: the card eases to its new height; content slides only when the step changes */
let auPrevH=0;
function morphAuth(){const c=document.querySelector('.authc');if(!c)return;const h=c.offsetHeight,from=auPrevH;auPrevH=h;
  if(!from||Math.abs(h-from)<2||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  c.animate([{height:from+'px',overflow:'hidden'},{height:h+'px',overflow:'hidden'}],{duration:260,easing:'cubic-bezier(.23,1,.32,1)'})}
function authShell(inner,{back,step}={}){const A=S.auth,key=(A.stage||'login')+(A.idx||0),anim=key!==A._k;A._k=key;
  return `<div class="auth"><div class="card authc au">
    <div class="au-top">${back===false?'<span class="brand"><span class="logo" aria-hidden="true"></span>ResFunder</span>':`<button class="ibtn" data-act="${back||'toLanding'}" aria-label="Back">${I.back}</button>`}${step?`<span class="au-step">Step ${step} of ${TOTAL}</span>`:''}<span style="width:36px"></span></div>
    ${step?`<div class="au-bar" role="progressbar" aria-label="Setup progress" aria-valuemin="1" aria-valuemax="${TOTAL}" aria-valuenow="${step}"><i style="transform:scaleX(${step/TOTAL})"></i></div>`:''}
    <div class="au-body ${anim?(A._dir==='back'?'au-anim-back':'au-anim'):''}">${inner}</div></div></div>`}
/* Log in / Create account switch. Both pages keep what was typed. */
const auTabs=on=>`<nav class="au-seg" aria-label="Account"><button data-act="toLogin" ${on==='login'?'aria-current="page"':''}>Log in</button><button data-act="toRegister" ${on==='register'?'aria-current="page"':''}>Create account</button></nav>`;
function auEmail(dis){const A=S.auth;return `<div class="fld"><label for="aEmail">Email</label><input class="inp" id="aEmail" data-in="authEmail" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="example@email.com" value="${esc(A.email)}" ${dis?'disabled':''}><div class="err" id="aEmailErr" role="status"></div></div>`}
function auPw(isNew,dis){const A=S.auth;
  return `<div class="fld"><label for="aPw">Password</label><div class="au-pw"><input class="inp" id="aPw" data-in="authPw" type="${A.show?'text':'password'}" autocomplete="${isNew?'new-password':'current-password'}" ${isNew?'aria-describedby="aPwHint"':''} value="${esc(A.pw||'')}" ${dis?'disabled':''}><button type="button" class="au-eye" data-act="authShow" aria-label="${A.show?'Hide password':'Show password'}" ${dis?'disabled':''}>${A.show?'Hide':'Show'}</button></div>
    ${isNew?'<p class="hint" id="aPwHint">At least 8 characters.</p>':''}<div class="err" id="aPwErr" role="status"></div></div>`}
const auAlert=()=>`<div class="au-alert" id="aErr" role="alert">${S.auth.err?`${I.flag}<span>${esc(S.auth.err)}</span>`:''}</div>`;
function vAuth(){
  const A=S.auth,P=pf(),stage=A.stage||'login',busy=A.busy;setTimeout(morphAuth,0);
  const ask=S.after&&S.after.s?'Log in to answer this survey. Your payout goes to your account\'s wallet.':S.after==='publish'?'Log in to build and fund a survey.':'';
  const askP=ask?`<p class="hint au-ask">${ask}</p>`:'';
  if(stage==='login')return authShell(`${auTabs('login')}<h1>Welcome back</h1><p class="au-sub">Log in with your email and password.</p>${askP}
    <div class="au-form">${auEmail(busy)}${auPw(false,busy)}</div>${auAlert()}
    <button class="btn dark block au-cta" data-act="authLogin" ${busy?'disabled aria-busy="true"':''}>${busy?`${I.spin}Logging in…`:'Log in'}</button>
    <p class="au-switch">New here? <button class="au-link" data-act="toRegister">Create an account</button></p>
    <p class="au-note">Made your account before passwords? Create an account again with the same email and wallet to add one.</p>`);
  if(stage==='register'){const Wl=A.wallet,reg=busy==='register',con=busy==='connect';
    const wallet=Wl?`<div class="au-wallet"><span class="au-wok">${I.check}</span><span><b class="mono">${shortW(Wl)}</b><small>MetaMask · BSC Testnet</small></span>${reg?'':`<button type="button" class="au-link" data-act="authConnect">Change</button>`}</div>`
      :`<button type="button" class="mmbtn" data-act="authConnect" ${busy?'disabled aria-busy="true"':''}><span class="fx">${fx}</span>${con?'Waiting for MetaMask…':'Connect MetaMask'}</button>`;
    return authShell(`${auTabs('register')}<h1>Create your account</h1><p class="au-sub">Your email and password log you in. Your wallet receives payouts and refunds.</p>${askP}
    <div class="au-form">${auEmail(reg)}${auPw(true,reg)}
      <div class="fld"><span class="lbl">Wallet</span>${wallet}<p class="hint">Payouts and refunds go to this wallet on BNB Smart Chain testnet. No MetaMask? <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">Install it</a>.</p></div></div>
    ${auAlert()}
    <button class="btn dark block au-cta" data-act="authRegister" ${!Wl||busy?'disabled':''} ${reg?'aria-busy="true"':''}>${reg?`${I.spin}Confirm in MetaMask…`:'Create account'}</button>
    <p class="hint au-center">MetaMask asks for one free signature to prove the wallet is yours. No gas.</p>
    <p class="au-switch">Already have an account? <button class="au-link" data-act="toLogin">Log in</button></p>`);}
  if(stage==='blocked')return authShell(`<h1>ResFunder is for people 18 and older for now</h1><button class="btn block au-cta" data-act="toLanding">Back to the home page</button>`,{back:false});
  if(stage==='who')return authShell(`<p class="au-ok">${I.check}<span>Signed in as <b>${esc(A.email)}</b>. A few questions so researchers can match you to surveys.</span></p><h1>Who are you?</h1>
    <div class="fld"><label for="pfWho">I'm a</label><select class="inp" id="pfWho" data-pf="who"><option value="" ${P.who?'':'selected'} disabled>Choose one</option>${WHO.map(([v,l])=>`<option value="${v}" ${P.who===v?'selected':''}>${l}</option>`).join('')}</select>
      ${P.who==='other'?`<label class="pf-other"><span>Specify</span><input class="inp" data-pft="whoO" maxlength="60" placeholder="Type here" value="${esc(P.whoO)}"></label>`:''}</div>
    <div class="err" id="aPfErr" role="status"></div><button class="btn dark block au-cta" data-act="authWho">Continue</button>`,{back:false,step:1});
  if(stage==='setup'){const i=A.idx||0,saving=busy==='save';let t='',f='';
    if(i===0){t='About you';f=`${pills('age','Age range',PF.age)}${pills('sex','Sex',PF.sex)}`}
    else if(i===1){t='Where you are';f=`<div class="fld"><label for="pfRegion">Region</label><select class="inp" id="pfRegion" data-pf="region"><option value="" ${P.region?'':'selected'} disabled>Choose your region</option>${PF.region.map(r=>`<option ${P.region===r?'selected':''}>${r}</option>`).join('')}</select></div>
      <div class="fld"><label for="pfCity">City or municipality</label><input class="inp" id="pfCity" data-pft="city" autocomplete="address-level2" value="${esc(P.city)}"></div>
      <div class="pf-consent"><label class="chk"><input type="checkbox" data-pfc="c1" ${P.c1?'checked':''}><span>I've read the privacy notice. ResFunder keeps my email and details off-chain. Only my wallet address and payment records go on the blockchain.</span></label>
      <label class="chk"><input type="checkbox" data-pfc="c2" ${P.c2?'checked':''}><span>Researchers see my details only alongside my answers, never my name or email. I can edit or delete them anytime.</span></label></div>`}
    else {t='What describes you best';const G=GROUPS[P.who]||GROUPS.other;f=G.map(([label,opts],k)=>pills(k?'g2':'g1',label,opts)).join('')}
    return authShell(`<h1>${t}</h1><div class="pf-form">${f}</div><div class="err" id="aPfErr" role="status"></div><button class="btn dark block au-cta" data-act="authStep" ${saving?'disabled aria-busy="true"':''}>${saving?`${I.spin}Saving…`:i>=2?'Finish':'Continue'}</button>`,{back:saving?false:'authStepBack',step:i+2});}
  return authShell(`<div class="au-done"><span class="au-wok">${I.check}</span></div><h1>You're all set</h1><button class="btn dark block au-cta" data-act="authDone">Continue ${I.arrow}</button>`,{back:false});
}
function go2(stage,idx,dir){const A=S.auth;A._dir=dir||'in';A.stage=stage;if(idx!=null)A.idx=idx;render();try{window.scrollTo({top:0})}catch(e){}}
const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* Signed in by Log in or Create account: answer the sign-up questions first if they are missing. */
function afterAuth(sess){const A=S.auth;A.busy='';A.pw='';A.show=false;A.err='';A.sess=sess;A.email=sess.email;S.wallet=sess.wallet||'';
  if(sess.onboard){A.pf=null;go2('who',0)}else enter(sess)}
function authFail(e){const A=S.auth;A.busy='';A.err=B.text(e);render()}
function authAct(a){const A=S.auth;
  switch(a){
    case 'toLogin':case 'toRegister':if(A.busy)return true;A.err='';go2(a==='toLogin'?'login':'register',0,a==='toLogin'?'back':'in');{const i=document.getElementById('aEmail');if(i&&!i.value)i.focus()}return true;
    case 'authShow':{A.show=!A.show;render();const i=document.getElementById('aPw');if(i){i.focus();const n=i.value.length;try{i.setSelectionRange(n,n)}catch(e){}}return true}
    case 'authLogin':{if(A.busy)return true;const e=(A.email||'').trim().toLowerCase();A.err='';setErr('aErr','');
      if(!EMAIL_RE.test(e)){setErr('aEmailErr','Enter your email, like example@email.com.');return true}
      if(!A.pw){setErr('aPwErr','Enter your password.');return true}
      A.email=e;A.busy='login';render();B.login(e,A.pw).then(afterAuth,authFail);return true}
    case 'authConnect':if(A.busy)return true;A.busy='connect';A.err='';render();
      B.connect().then(w=>{A.busy='';A.wallet=w;render()},authFail);return true;
    case 'authRegister':{if(A.busy)return true;const e=(A.email||'').trim().toLowerCase();A.err='';setErr('aErr','');
      if(!EMAIL_RE.test(e)){setErr('aEmailErr','Enter your email, like example@email.com.');return true}
      if((A.pw||'').length<8){setErr('aPwErr','Use at least 8 characters.');return true}
      if(!A.wallet){A.err='Connect MetaMask first.';render();return true}
      A.email=e;A.busy='register';render();B.register(e,A.pw).then(afterAuth,authFail);return true}
    case 'authWho':{const er=stepError('who');if(er){setErr('aPfErr',er);return true}
      const P=pf();if(P._who!==P.who){P.g1='';P.g1O='';P.g2='';P.g2O='';P._who=P.who}go2('setup',0);return true}
    case 'authStep':{if(A.busy)return true;const i=A.idx||0,er=stepError('setup',i);if(er){setErr('aPfErr',er);return true}
      /* Under 18 stops sign-up and ends the session. */
      if(i===0&&pf().age==='under_18'){B.signOut().catch(()=>{});go2('blocked');return true}
      if(i<2){go2('setup',i+1);return true}
      const P=pf();A.busy='save';render();
      B.saveProfile({who:P.who,whoO:P.whoO,age:P.age,sex:P.sex,sexO:P.sexO,region:P.region,city:P.city,c1:!!P.c1,c2:!!P.c2,g1:P.g1,g1O:P.g1O,g2:P.g2,g2O:P.g2O})
        .then(()=>{A.busy='';go2('done')},e=>{A.busy='';render();setErr('aPfErr',"Couldn't save your answers: "+B.text(e))});return true}
    case 'authStepBack':{const i=A.idx||0;if(A.stage==='setup'&&i>0)go2('setup',i-1,'back');else go2('who',0,'back');return true}
    case 'authDone':enter(Object.assign({},A.sess||{email:A.email,wallet:S.wallet},{onboard:false}));toast('Welcome to ResFunder');return true;
  }
  return false}


/* ================= dashboard ================= */
function kpi(ic,v,small,smallCls,l,extra){return `<div class="card kpi"><span class="kic">${ic}</span><div class="v">${v}${small?`<small class="${smallCls}">${small}</small>`:''}</div><div class="l">${l}</div>${extra||''}</div>`}
const stPill=s=>s.status==='draft'?'<span class="pill p-draft">Draft</span>':s.status==='closed'?'<span class="pill p-closed">Closed</span>':s.ended?'<span class="pill p-rev">Deadline passed</span>':s.paused?'<span class="pill p-rev">Paused</span>':'<span class="pill p-live">Live</span>';
function surveyRow(s){
  const d=s.status==='draft',pct=d?0:Math.min(100,Math.round(s.paid/s.quota*100)),w=W(s.id),nr=w?reviews().filter(r=>r.sid===s.id).length:0;
  return `<tr><td><div class="nm"><b>${esc(s.title||'Untitled survey')}</b><small class="${d?'p':''}">${d?'Draft · saved in this browser':s.code}</small></div></td><td>${stPill(s)}${nr?` <span class="pill p-rev">${nr} in review</span>`:''}</td>
    <td>${d?'<span class="muted">—</span>':`<div class="bar2"><span class="tr"><span style="width:${pct}%"></span></span><span class="n">${s.paid} / ${s.quota}</span></div>`}</td>
    <td>${d?'Not funded':s.status==='closed'?'Refunded':s.unused}</td><td>${d?'—':s.closes}</td>
    <td class="act"><button class="rvbtn ${s.status==='closed'?'view':''}" data-open="${s.id}">${d?'Continue':'Open'}</button>${d?` <button class="dots" data-act="delDraft" data-id="${s.id}" aria-label="Delete this draft">${I.x}</button>`:''}</td></tr>`;
}
/* The table of surveys, plus what is still loading or went wrong. */
function surveysBlock(list,none){
  const st=D.listErr?`<div class="card empty"><h3>Couldn't load your surveys</h3><p>${esc(D.listErr)}</p><button class="btn dark" data-act="reload">Try again</button></div>`
    :!D.list?`<div class="card empty"><h3>Loading your surveys</h3><p>MetaMask may ask for a free signature. It proves these surveys are yours.</p></div>`:'';
  const table=list.length?`<div class="tbox"><table class="t"><thead><tr><th>Survey</th><th>Status</th><th>Paid</th><th>Budget left</th><th>Closes</th><th class="act">Action</th></tr></thead><tbody>${list.map(surveyRow).join('')}</tbody></table></div>`:'';
  return table+(st?`<div style="margin-top:${table?12:0}px">${st}</div>`:table?'':`<p class="muted sect-e">${none||'No surveys yet. Create one to get started.'}</p>`)}
/* A funding transaction that went through, but the survey isn't registered with the server yet. */
function pendBar(){return D.pend?`<div class="lockbar" style="margin-bottom:16px">${I.clock}<span><b>One funded survey isn't registered yet</b><br><span style="font-size:13.5px">“${esc(D.pend.title)}” was paid for, but the last step didn't finish.</span></span><button class="btn dark" style="margin-left:auto" data-act="retryFund" ${S.busy?'disabled':''}>${S.busy==='retry'?'Finishing…':'Finish registering'}</button></div>`:''}
function vDashboard(){
  const real=SURVEYS.filter(s=>s.real),live=real.filter(s=>s.status==='live').length,R=reviews(),paid=real.reduce((a,s)=>a+s.paid,0),opened=Object.keys(D.ws).length;
  return header('',`Welcome back, ${esc(me().first)}`,`<button class="btn fund" data-act="newFund">${I.plus}Create a survey</button>`)+pendBar()+
  `<div class="kpis">${kpi(I.doc,live,`${real.length} total`,'n','Live surveys')}${kpi(I.users,paid,'','','Paid responses')}
    ${kpi(I.coins,D.list?B.sum(real,'paidOut'):'—','','','Paid to respondents')}${kpi(I.flag,R.length,opened?'in the surveys you opened':'','n','In review')}</div>
  <div class="home"><section><div class="between" style="margin-bottom:12px"><h2 class="h">Your surveys</h2><button class="btn ghost" data-nav="surveys">View all ${I.arrow}</button></div>
    ${surveysBlock(SURVEYS)}</section>
    <aside class="card needs"><div class="between"><h3 class="h">In review</h3><span class="cnt">${R.length}</span></div>
      ${R.length?R.slice(0,6).map(r=>`<button class="it" data-openrev="${r.key}"><span><b>${esc(X(r).title)}</b><small>${r.rid} · ${esc(r.stitle)}</small></span><span class="tl2">${r.when}</span></button>`).join('')
      :`<p class="muted" style="margin:10px 0 0">${opened?'Nothing is in review in the surveys you opened.':'Open a survey to see the responses its checks sent to review.'}</p>`}</aside></div>`;
}

/* ================= surveys list ================= */
function vSurveys(){
  const f=S.fsub,cnt=k=>SURVEYS.filter(s=>k==='all'||s.status===k).length,list=SURVEYS.filter(s=>f==='all'||s.status===f);
  const none={all:'No surveys yet. Create one to get started.',live:'No live surveys right now.',closed:'No closed surveys yet.',draft:'No drafts. Start one with Create a survey.'};
  return header('','Surveys',`<button class="btn" data-act="reload">Refresh</button><button class="btn fund" data-act="newFund">${I.plus}Create a survey</button>`)+pendBar()+
  `<div class="tabsrow"><div class="tabs fit" role="tablist" aria-label="Filter surveys">${[['all','All'],['live','Live'],['closed','Closed'],['draft','Drafts']].map(([v,l])=>`<button role="tab" data-fsub="${v}" aria-selected="${f===v}">${l}<span class="sc">${cnt(v)}</span></button>`).join('')}</div></div>
  ${surveysBlock(list,none[f])}${list.length?`<div class="tfoot"><span>Showing ${list.length} of ${SURVEYS.length}</span></div>`:''}`;
}

/* ================= survey workspace ================= */
function vSurvey(){
  const s=SV(S.sid);if(!s){S.page='surveys';return vSurveys()}
  const crumb=`<button data-nav="surveys" class="crumb-back" aria-label="Back to Surveys">${I.back}Surveys</button>${I.chev.replace('<svg','<svg style="width:12px;height:12px"')}<span>${stPill(s)}</span>`;
  if(s.status==='draft'||S.launched[s.id]){
    const step=S.launched[s.id]?2:S.draft[s.id]==='fund'?1:0;
    const sv=stepper([['Build','Write the questions'],['Fund','Lock the budget'],['Live & share','Send the link']],step);
    const body=step===0?vBuild(s):step===1?vFund(s):vLiveShare(s);
    return header(crumb,esc(s.title||'Untitled survey'),'')+sv+body;
  }
  const w=W(s.id);
  if(!w){const er=D.wsErr[s.id];
    return header(crumb,esc(s.title),'')+(er?`<div class="card empty"><h3>Couldn't open this survey</h3><p>${esc(er)}</p><button class="btn dark" data-act="reopen">Try again</button></div>`
      :`<div class="card empty"><h3>Opening the survey</h3><p>MetaMask may ask for a free signature. Only the researcher can read a survey's decisions.</p></div>`)}
  const nr=reviews().filter(r=>r.sid===s.id).length;
  const live=s.status==='live';if(S.stab==='share'&&!live)S.stab='overview';
  const tabs=[['overview','Overview'],...(live?[['share','Share']]:[]),['queue','Review queue',nr],['log','Decision log'],['results','Results'],['questions','Questions'],['settings','Settings']];
  const clock=I.clock.replace('<svg','<svg style="width:15px;height:15px"');
  const meta=(s.status==='closed'?'<span>Closed</span>':s.ended?`<span>${clock} Deadline passed ${s.closesFull}</span>`:`<span>${clock} Closes ${s.closes} · ${s.left} left</span>`)+(s.paused&&s.status!=='closed'?' <span class="pill p-rev">New answers paused</span>':'');
  const T={overview:sOverview,share:sShare,queue:sQueue,log:sLog,results:sResults,questions:sQuestions,settings:sSettings}[S.stab]||sOverview;
  return header(crumb,esc(s.title),`<button class="btn" data-act="reopen">Refresh</button>${s.status==='live'?`<button class="btn dark" data-act="copyLink">${I.link}Copy share link</button>`:''}`)+
  `<div class="tabsrow"><div class="tabs" role="tablist">${tabs.map(([v,l,c])=>`<button role="tab" data-stab="${v}" aria-selected="${S.stab===v}">${l}${c?`<span class="cnt">${c}</span>`:''}</button>`).join('')}</div><div class="meta">${meta}</div></div>`+T(s,w);
}
/* Overview */
function tipFor(c,today){if(c.k==='later')return `${c.full} · later today`;
  const p=[[c.p,'paid'],[c.r,'in review'],[c.n,'not paid']].filter(a=>a[0]).map(a=>a.join(' ')).join(', ');
  return `${c.full}${today&&S.range!=='today'?' (today)':''} · ${c.cnt} response${c.cnt===1?'':'s'}${p?' · '+p:''}`}
function plot(){const C=S.chart,N=C.cols.length;let cols='',xl='';
  C.cols.forEach((c,i)=>{const on=i===S.day,dots=c.k==='real'?'<span class="dot p"></span>'.repeat(c.p)+'<span class="dot r"></span>'.repeat(c.r)+'<span class="dot n"></span>'.repeat(c.n):'';
    cols+=`<button class="col ${on?'on':''}" data-day="${i}" aria-label="${c.full}">${dots}${on?`<span class="tt ${i<2?'l':i>N-3?'r':''}" style="bottom:calc(var(--u)*${c.cnt} + 8px)">${tipFor(c,i===C.today)}</span>`:''}</button>`;
    xl+=`<span class="${on?'on':''} ${i===C.today?'today':''}">${c.lab}</span>`});
  const pace=S.pace&&S.range!=='today'&&S.pace<C.rows?`<div class="pace" style="bottom:calc(var(--u)*${S.pace})"><span>${S.pace} a day needed</span></div>`:'';
  return `<div class="plot r-${S.range}" style="--rows:${C.rows};--n:${N}"><div class="yax">${C.ticks.map(k=>`<span style="bottom:calc(var(--u)*${k})">${k}</span>`).join('')}</div>
    <div class="area">${C.ticks.slice(0,-1).map(k=>`<div class="gl" style="bottom:calc(var(--u)*${k})"></div>`).join('')}${pace}<div class="cols">${cols}</div>${C.total?'':'<div class="nodata"><span>No responses in this period</span></div>'}</div><div></div><div class="xl">${xl}</div></div>`}
function chartCard(){const s=SV(S.sid),w=W(S.sid),m=w.log.sum,C=S.chart=B.chart(w.log.rows,S.range);if(S.day==null||S.day>=C.cols.length)S.day=C.today;
  const sub={today:'Today',week:'Last 7 days',month:'Last 30 days'}[S.range]+` · ${C.total} response${C.total===1?'':'s'}`;
  const tip=!m.responses?`<b>No responses yet.</b> Share the link to start collecting.${S.pace?` You need about <b>${S.pace} paid a day</b> to reach ${s.quota} by ${s.closes}.`:''}`
    :s.status==='closed'?`Closed with <b>${m.paid} of ${s.quota}</b> paid.`
    :`<b>${m.responses} response${m.responses===1?'':'s'}</b> so far, ${m.paid} paid.${S.pace?` You need about <b>${S.pace} paid a day</b> to fill ${s.quota} by ${s.closes}.`:''}`;
  const lg=[['var(--green-bar)','Paid'],['var(--yellow-bar)','In review'],['var(--red-bar)','Not paid']].map(([c,l])=>`<li><span class="sw" style="background:${c}"></span>${l}</li>`).join('')+(S.pace&&S.range!=='today'?'<li><span class="sw line"></span>Pace needed</li>':'');
  return `<div class="ch-head"><div><h3>Responses over time</h3><span>${sub} · each dot is one response</span></div><div class="rng" role="group" aria-label="Time range">${[['today','Today'],['week','7 days'],['month','30 days']].map(([v,l])=>`<button data-range="${v}" aria-pressed="${S.range===v}">${l}</button>`).join('')}</div></div>
    <div class="ch-body"><div><ul class="legend">${lg}</ul><div class="tip">${tip}</div></div><div id="plotWrap">${plot()}</div></div>`}
function sOverview(s,w){const m=w.log.sum,closed=s.status==='closed';
  S.pace=!closed&&!s.ended&&s.paid<s.quota?Math.ceil((s.quota-s.paid)/s.daysLeft):0;
  return `<div class="kpis">${kpi(I.users,m.responses,m.pending?m.pending+' being checked':'','n','Total responses',`<div class="mini"><span style="width:${Math.min(100,Math.round(s.paid/s.quota*100))}%"></span></div>`)}
    ${kpi(I.coins,m.paidOut,`${m.paid} of ${s.quota} paid`,'n','Paid out of '+m.budget)}
    ${kpi(I.wallet,closed?(m.refunded||'0 tBNB'):m.remaining,closed?'refunded':'','n',closed?'Returned to your wallet':'Budget remaining')}
    ${kpi(I.clock,closed?'Closed':s.left,'','',closed?'This survey is closed':s.ended?'Deadline passed '+s.closesFull:'Left · closes '+s.closesFull)}</div>
    <div class="card chartc" id="chartCard">${chartCard()}</div>`;
}
/* Review queue (survey tab): responses in review. A person decides; the AI never does. */
const ansText=(q,a)=>a==null||a===''?'':q.type==='mc'?(q.opts[a]||''):String(a);
function qRows(){const q=S.qQ.trim().toLowerCase();return reviews().filter(r=>r.sid===S.sid&&(!q||(r.rid+' '+r.wallet+' '+X(r).title).toLowerCase().includes(q)))}
function queueTable(){const rows=qRows();
  if(!rows.length)return reviews().some(r=>r.sid===S.sid)?`<div class="card empty"><p>No responses match your search.</p><button class="btn" data-act="qClear">Clear search</button></div>`
    :`<div class="card empty"><h3>All caught up</h3><p>Responses the checks can't settle show up here.</p><button class="btn" data-stab="log">See decisions</button></div>`;
  const tr=r=>`<tr><td><div class="nm"><b>${r.rid}</b><small>${r.w}</small></div></td><td class="why" data-label="Why">${whyCell(r)}</td><td data-label="Type"><span class="tp review">Review</span></td><td class="muted" data-label="Submitted">${r.when}</td>
    <td data-label="Status"><span class="tp pending">Pending</span></td><td class="act"><button class="rvbtn" data-openrev="${r.key}">Review</button></td></tr>`;
  return `<div class="tbox"><table class="t"><thead><tr><th>Response</th><th>Why</th><th>Type</th><th>Submitted</th><th>Status</th><th class="act">Action</th></tr></thead><tbody>${rows.map(tr).join('')}</tbody></table></div>
    <div class="tfoot"><span>Showing ${rows.length} · they stay unpaid until you decide</span></div>`;
}
function sQueue(){
  return `<div class="tools"><label class="sbox">${I.search}<input id="qQ" data-in="qQ" type="search" placeholder="Search by ID or wallet" value="${esc(S.qQ)}" aria-label="Search the review queue"></label></div>
    <div id="qBody">${queueTable()}</div>`}
/* Why a response was decided (bridge explain()). Before the screening details load, the reason text stands in. */
const X=r=>r.x||{title:r.why,sub:'',pills:[],steps:[],focus:null,others:[],time:null,timeNote:null,you:null};
const MK={pass:'✓',warn:'!',fail:'✕',skip:'–'};
const whyCell=r=>{const x=X(r);return `<b class="why-t">${esc(x.title)}</b>${x.pills.length?`<span class="xp">${x.pills.map(p=>`<span class="xpill ${p.tone}"><i aria-hidden="true">${MK[p.tone]}</i>${esc(p.label)}</span>`).join('')}</span>`:''}`};
/* Any row of an opened survey, for the drawer. Review rows also get prev/next and the decision. */
const anyRow=key=>{for(const w of Object.values(D.ws)){const r=w.log.rows.find(x=>x.key===key);if(r)return Object.assign({},r,{sid:w.survey.id,stitle:w.survey.title})}return null};
/* Review drawer: the reason as the title, the answer to look at, the rule steps, the rest folded away. */
function decideFoot(r,w){const rate=w.survey.rate,busy=S.dbusy,err=S.derr?`<div class="err" role="alert">${esc(S.derr)}</div>`:'';
  if(busy)return `<p class="rd2-fine">${busy==='pay'?'Sending the payment. This can take a few seconds.':'Recording your decision on chain. This can take a few seconds.'}</p><div class="rd-two"><button class="btn" disabled>${I.spin}Please wait</button></div>`;
  if(S.reasonFor===r.key)return `${err}<p class="rd-ask">Why aren't you paying? <small>The respondent sees this.</small></p>
    <div class="rd-reasons" role="radiogroup" aria-label="Reason">${B.rejectReasons.map(([c,t])=>`<label class="pf-pill" data-reason="${c}"><input type="radio" name="rd-reason" ${c===S.reason?'checked':''}><span>${esc(t)}</span></label>`).join('')}</div>
    <div class="rd-two"><button class="btn soft" data-act="cancelNo">Cancel</button><button class="btn red" data-act="decide" data-d="dont_pay" data-id="${r.key}">Don't pay</button></div>`;
  return `${err}<div class="rd-two"><button class="btn soft rd-no" data-act="askNo" data-id="${r.key}">Don't pay</button><button class="btn dark" data-act="decide" data-d="pay" data-id="${r.key}">Pay ${rate}</button></div>
    <p class="rd2-fine">Recorded on chain. Can't be undone.</p>`}
function recordFoot(r){
  if(r.res==='pending')return `<p class="rd2-fine rd2-left">Still being checked. This updates on Refresh.</p>`;
  return `<div class="rd2-rec"><span>${r.res==='pay'?'Paid.':'Final.'} Recorded on chain.</span>${r.txUrl?`<a class="rd2-tx mono" href="${r.txUrl}" target="_blank" rel="noopener">${r.tx} ↗</a>`:''}</div>`}
const RDST={review:['rev','In review'],pay:['pay','Paid'],no:['no','Not paid'],pending:['rev','Checking']};
function reviewPanel(){const r=revRow(S.openRev)||anyRow(S.openRev);if(!r)return '';const w=W(r.sid),Q=w.survey.q,x=X(r),rev=r.res==='review';
  const P=rev?reviews():[],i=P.findIndex(y=>y.key===r.key),f=x.focus,tag=new Map(x.others.map(o=>[o.qi,o.tag]));
  const nav=rev?`<button class="rd2-ib" data-step="-1" aria-label="Previous response" ${i<=0?'disabled':''}>${I.chevL}</button><span class="rd2-count">${i+1} of ${P.length}</span><button class="rd2-ib" data-step="1" aria-label="Next response" ${i>=P.length-1?'disabled':''}>${I.chev}</button>`:'';
  const fig=f?`<figure class="rd2-fig"><figcaption>Q${f.qi+1} · ${esc(f.question)}</figcaption><blockquote class="${f.tone==='fail'?'mono':''}">${f.answer?esc(f.answer):'<span class="muted">No answer</span>'}</blockquote>
      <div class="rd2-ai"><p class="rd2-tagrow"><span class="rd2-tag ${f.tone}">${esc(f.tag)}</span>${f.chips.map(esc).join(' · ')}</p>${f.aiSays?`<p class="rd2-says"><small>The AI's reason, as written</small>“${esc(f.aiSays)}”</p>`:''}${f.note?`<p class="rd2-note">${esc(f.note)}</p>`:''}</div></figure>`:'';
  const steps=x.steps.length?`<section aria-labelledby="rdHow"><h3 class="rd2-h" id="rdHow">How it was decided</h3><ol class="rd2-list">${x.steps.map(s=>`<li class="${s.decided?'on':''}"><span class="rd2-mk ${s.tone}" aria-hidden="true">${MK[s.tone]}</span><span class="l">${esc(s.label)}</span><span class="v ${s.decided?s.tone:''}">${esc(s.value)}</span></li>`).join('')}</ol></section>`:'';
  const rest=Q.map((q,j)=>j).filter(j=>!f||j!==f.qi);
  const oa=rest.map(j=>{const t=ansText(Q[j],r.a[j]),g=tag.get(j);return `<div><dt>Q${j+1} · ${esc(Q[j].t)}${g?` <span class="rd2-tag warn">${esc(g)}</span>`:''}</dt><dd class="${t?'':'muted'}">${t?esc(t):'No answer'}</dd></div>`}).join('');
  const chev=`<span class="rd2-chev" aria-hidden="true">${I.chev}</span>`;
  return `<div class="backdrop" data-act="closeRev"></div><aside class="drawer rd rd2" role="dialog" aria-modal="true" aria-labelledby="rdTitle">
    <div class="rd2-top">${nav}<span class="sp"></span><button class="rd2-x" data-act="closeRev" aria-label="Close">${I.x}</button></div>
    <div class="rd2-body">
      <header><p class="rd2-status"><span class="st"><i class="${RDST[r.res][0]}"></i><b>${RDST[r.res][1]}</b></span><span aria-hidden="true">·</span><span class="mono">${r.rid}</span></p>
        <h2 id="rdTitle">${esc(x.title)}</h2>${x.sub?`<p class="rd2-sub">${esc(x.sub)}</p>`:''}</header>
      ${fig}${steps}
      <div class="rd2-list rd2-more">
        ${rest.length?`<details><summary><span class="l">${f?'Other answers':'Answers'}</span><span class="v">${rest.length}</span>${chev}</summary><dl class="rd2-oa">${oa}</dl></details>`:''}
        <details><summary><span class="l">Timing</span><span class="v">${x.time||'—'}</span>${chev}</summary><p>${esc(x.timeNote||'Timing shows once screening finishes.')}</p></details>
        <details><summary><span class="l">Respondent</span><span class="v mono">${r.w}</span>${chev}</summary><p>Submitted ${r.when}. <button class="au-link" data-act="copyW" data-w="${r.wallet}">Copy wallet address</button></p></details>
      </div>
    </div>
    <div class="rd2-foot">${rev?decideFoot(r,w):recordFoot(r)}</div></aside>`}

/* Decision log */
const RESL={pay:['','Paid'],no:['no','Not paid'],review:['rev','In review'],pending:['rev','Checking']};
function logFiltered(){const w=W(S.sid),q=S.lQ.trim().toLowerCase();return w.log.rows.filter(r=>(S.lRes==='all'||r.res===S.lRes)&&(!q||[r.rid,r.wallet,r.why,X(r).title].join(' ').toLowerCase().includes(q)))}
function logBody(){const rows=logFiltered(),n=W(S.sid).log.rows.length,all=rows.length>0&&rows.every(r=>S.lSel.has(r.key));
  const tr=r=>`<tr class="${S.lSel.has(r.key)?'sel':''}"><td class="cb"><input type="checkbox" data-chk="${r.key}" aria-label="Select ${r.rid}" ${S.lSel.has(r.key)?'checked':''}></td>
    <td><div class="nm"><b class="mono">${r.rid}</b><small class="mono">${r.w}</small></div></td>
    <td class="why" data-label="Why">${whyCell(r)}</td><td class="num" data-label="Amount">${r.amount}</td><td data-label="Status"><span class="st"><i class="${RESL[r.res][0]}"></i>${RESL[r.res][1]}</span></td>
    <td data-label="Transaction">${r.txUrl?`<a class="mono" href="${r.txUrl}" target="_blank" rel="noopener">${r.tx}</a>`:'<span class="muted">—</span>'}</td><td class="muted" data-label="When">${r.when}</td>
    <td class="act">${r.res==='review'?`<button class="rvbtn" data-openrev="${r.key}">Review</button>`:`<button class="tbtn" data-openrev="${r.key}">Details</button>`}</td></tr>`;
  return `<div class="tbox"><table class="t tlog"><thead><tr><th class="cb"><input type="checkbox" data-chkall="1" aria-label="Select all shown" ${all?'checked':''}></th><th>Response</th><th>Why</th><th class="num">Amount</th><th>Status</th><th>Transaction</th><th>When</th><th class="act"><span class="sr">Open</span></th></tr></thead>
    <tbody>${rows.length?rows.map(tr).join(''):`<tr><td colspan="8" class="muted" style="text-align:center;padding:36px">No decisions match. <button class="btn" data-act="lClear">Clear search and filters</button></td></tr>`}</tbody></table></div>
    <div class="tfoot"><span>Showing ${rows.length} of ${n}${S.lSel.size?` · ${S.lSel.size} selected`:''}</span></div>`}
const exportLabel=()=>I.dl+(S.lSel.size?`Export ${S.lSel.size} selected`:'Export CSV');
function sLog(s,w){if(!w.log.rows.length)return `<div class="card empty"><h3>No decisions yet</h3><p>Every payment decision for this survey will be listed here, with its reason and transaction.</p></div>`;
  const R=w.log.rows,cnt=v=>v==='all'?R.length:R.filter(r=>r.res===v).length;
  const chips=[['all','All',''],['review','In review','rev'],['no','Not paid','no'],['pay','Paid','pay']].map(([v,l,c])=>`<button class="fchip" data-fres="${v}" aria-pressed="${S.lRes===v}">${c?`<i class="${c}" aria-hidden="true"></i>`:''}${l}<span>${cnt(v)}</span></button>`).join('');
  return `<div class="tools"><label class="sbox">${I.search}<input id="lQ" data-in="lQ" type="search" placeholder="Search ID, wallet or reason" value="${esc(S.lQ)}" aria-label="Search decisions"></label>
    <div class="fchips" role="group" aria-label="Filter by status">${chips}</div><span class="sp"></span><button class="tbtn" id="exportBtn" data-act="export">${exportLabel()}</button></div>
    <p class="rulenote">${I.shield}Code rules decide Pay and Don't pay. The AI can only send a response to you for review.</p>
    <div id="logBody">${logBody()}</div>`}
/* A cell that starts like a formula is quoted, so a spreadsheet shows respondent text as text. */
function exportCsv(){const w=W(S.sid),rows=logFiltered().filter(r=>!S.lSel.size||S.lSel.has(r.key)),Q=w.survey.q;
  if(!rows.length)return toast('Nothing to export yet.');
  const cell=v=>{let t=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"'};
  const head=['Response','Wallet','Status','Amount','Reason','Transaction','Submitted'].concat(Q.map((q,i)=>`Q${i+1}. ${q.t}`));
  const lines=rows.map(r=>[r.rid,r.wallet,RESL[r.res][1],r.amount,X(r).title+(r.why&&r.why!==X(r).title?' ('+r.why+')':''),r.txUrl,new Date(r.at).toISOString()].concat(Q.map((q,i)=>ansText(q,r.a[i]))).map(cell).join(','));
  const url=URL.createObjectURL(new Blob(['﻿'+[head.map(cell).join(',')].concat(lines).join('\r\n')],{type:'text/csv'})),a=document.createElement('a');
  a.href=url;a.download=`${w.survey.code}-decisions.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`Exported ${rows.length} decision${rows.length===1?'':'s'}`)}
/* Questions preview */
const isText=q=>q.type==='open'||q.type==='short'||q.type==='para';
const scaleVals=q=>{const o=[];for(let v=q.min||1;v<=(q.max||5);v++)o.push(v);return o};
function formBody(q){return q.type==='mc'||q.type==='cb'?(q.opts||[]).map(o=>`<div class="fo"><i class="${q.type==='cb'?'sq':''}"></i>${esc(o)}</div>`).join('')
  :q.type==='scale'?`<div class="fscale">${scaleVals(q).map(v=>`<span>${v}</span>`).join('')}</div>`
  :q.type==='grid'?`<div class="fgrid"><table class="fg"><thead><tr><th></th>${q.cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${q.rows.map(r=>`<tr><td>${esc(r)}</td>${q.cols.map(()=>'<td><i></i></td>').join('')}</tr>`).join('')}</tbody></table></div>`
  :`<div class="fline">Your answer</div>`}
function formPreview(s,tags){return `<div class="fhead"><div class="bar"></div><div class="in"><h3>${esc(s.title||'Untitled survey')}</h3><p>${esc(s.desc||'')}</p>${tags?'<p style="color:var(--red);margin-top:10px;font-size:13.5px">* Required</p>':''}</div></div>
  ${s.q.map((q,i)=>`<div class="fq"><p class="qt">${i+1}. ${esc(q.t||'Untitled question')}${q.req?' <span class="ast">*</span>':''}</p>${tags?`<span class="ftag">${isText(q)?'Code checks + AI':'Code checks'}</span>`:''}${formBody(q)}</div>`).join('')}`}
function sQuestions(s){return `<div class="form"><div class="qinfo"><span>${s.q.length} question${s.q.length===1?'':'s'} · ${s.rate} per valid answer</span><span class="lock">${I.lock}Locked after funding</span></div>${formPreview(s,true)}</div>`}
/* Settings tab */
function sSettings(s,w){const live=s.status==='live',m=w.log.sum;
  return `<div class="g2"><section class="card pad"><h2 class="h">Contract terms</h2><p class="muted" style="margin:0 0 16px">Written into the contract when you funded the survey. They can't change.</p>
      <dl class="kv"><dt>${I.lock.replace('<svg','<svg style="width:13px;height:13px"')} Pay per valid answer</dt><dd>${s.rate}</dd><dt>Quota</dt><dd>${s.quota} responses</dd><dt>Deadline</dt><dd>${s.closesFull}</dd><dt>Questions</dt><dd>${s.q.length}</dd>
        <dt>Contract</dt><dd class="mono"><a href="${B.contractUrl}" target="_blank" rel="noopener">${B.contract}</a></dd>${m.closeUrl?`<dt>Close transaction</dt><dd class="mono"><a href="${m.closeUrl}" target="_blank" rel="noopener">${m.closeTx}</a></dd>`:''}</dl></section>
    <section class="card pad"><h2 class="h">Controls</h2>
      <div class="srow"><span><b>Pause new answers</b><small>Stops new submissions until you turn it back on. Answers already sent are still checked and paid.</small></span><label class="switch"><input type="checkbox" data-pause="${s.id}" ${s.paused?'checked':''} ${live&&!S.busy?'':'disabled'} aria-label="Pause new answers"><span></span></label></div>
      <div class="srow"><span><b>Close survey and refund</b><small>${live?'Stops new responses and returns the unused budget to your wallet.':'This survey is closed.'+(m.refunded?' '+m.refunded+' came back to your wallet.':'')}</small></span>${live?`<button class="btn red" data-act="askClose">${I.refund}Close survey</button>`:''}</div></section></div>`}
function closeModal(){const w=W(S.sid),m=w.log.sum,busy=S.busy;
  const lbl={confirm:'Confirm in MetaMask…',mining:'Waiting for the network…',registering:'Recording the refund…'}[busy]||'Close and refund';
  return `<div class="modal" role="dialog" aria-modal="true" aria-label="Close survey"><div class="scr" data-act="cancelClose"></div><div class="mm"><div class="hd"><span class="fx">${I.refund}</span>Close this survey?</div>
    <div class="bd"><p class="muted" style="margin:0 0 12px">New responses stop right away. The contract returns the unused budget to you:</p><div class="amt">${m.remaining}</div><dl class="kv"><dt>To</dt><dd class="mono">${shortW(S.wallet)}</dd><dt>Fee</dt><dd>Not refunded</dd></dl>
      ${m.review?`<p class="hint" style="margin:10px 0 0">${m.review} response${m.review===1?' in review stays':'s in review stay'} unpaid.</p>`:''}<div class="err" role="alert">${esc(S.closeErr)}</div></div>
    <div class="ft"><button class="btn" data-act="cancelClose" ${busy?'disabled':''}>Keep open</button><button class="btn dark" data-act="doClose" ${busy?'disabled aria-busy="true"':''}>${lbl}</button></div></div></div>`}
/* ================= draft: build → fund → live & share ================= */
function vBuild(s){
  const qc=(q,i)=>{let ex='';
    if(q.type==='mc')ex=`<div class="opts2">${q.opts.map((o,j)=>`<div class="opt"><i></i><input class="inp" id="bo-${i}-${j}" data-bopt="${i}" data-j="${j}" value="${esc(o)}" aria-label="Option ${j+1}"></div>`).join('')}
      <div class="row" style="gap:14px"><button class="btn ghost" style="padding:6px 0" data-act="addOpt" data-i="${i}">${I.plus}Add option</button>${q.opts.length>2?`<button class="btn ghost" style="padding:6px 0" data-act="delOpt" data-i="${i}">${I.minus}Remove last</button>`:''}</div></div>`;
    else if(q.type==='scale')ex=`<div class="fscale">${scaleVals(q).map(v=>`<span>${v}</span>`).join('')}</div><p class="hint" style="margin:0">Respondents pick one number from 1 to 5.</p>`;
    else ex=`<p class="hint" style="margin:0">Respondents type their answer. Checked by code and the AI label.</p>`;
    return `<section class="card bq"><div class="qh"><input class="inp" id="bq-${i}" data-bq="${i}" value="${esc(q.t)}" placeholder="Write the question" aria-label="Question ${i+1}"><select class="inp" id="bt-${i}" data-btype="${i}" aria-label="Question type">${TYPES.map(([v,l])=>`<option value="${v}"${q.type===v?' selected':''}>${l}</option>`).join('')}</select><button class="ibtn" data-act="delQ" data-i="${i}" aria-label="Remove question ${i+1}">${I.minus}</button></div>
      ${ex}<div class="foot"><span class="hint">Question ${i+1}</span><span class="row" style="gap:16px">${q.type==='open'?`<label class="tgl"><input type="checkbox" data-bshort="${i}" ${q.short?'checked':''}>Short answers are fine</label>`:''}<label class="tgl"><input type="checkbox" data-breq="${i}" ${q.req?'checked':''}>Required</label></span></div></section>`};
  return `<div class="bld"><div style="display:grid;gap:12px;min-width:0"><section class="card bq"><div class="fld"><label for="bTitle">Survey title</label><input class="inp" id="bTitle" data-in="sTitle" placeholder="Untitled survey" value="${esc(s.title)}"></div>
      <div class="fld"><label for="bDesc">Description respondents see</label><textarea class="inp" id="bDesc" data-in="sDesc" rows="3" placeholder="Describe your study in one or two sentences.">${esc(s.desc)}</textarea></div></section>
      ${s.q.map(qc).join('')}<button class="btn" style="justify-self:start" data-act="addQ">${I.plus}Add question</button></div>
    <aside class="preview"><div class="ph2">${I.eye}Live preview, exactly what respondents see</div><div id="bPrev">${formPreview(s,false)}</div></aside></div>
  <div class="bbar"><span class="ok" id="buildNote">${I.check}Saved in this browser · ${s.q.length} question${s.q.length===1?'':'s'}</span><button class="btn dark pill" data-act="toFund">Continue to funding ${I.arrow}</button></div>`;
}
/* The researcher types one total (fee included); the bridge derives the rate the contract needs. */
const fundIn=s=>({total:String(s.totalIn==null?'':s.totalIn),quota:String(s.quota==null?'':s.quota),deadline:s.deadline||''});
const FUNDL={connecting:'Connecting wallet…',confirm:'Confirm in MetaMask…',mining:'Waiting for the network…',registering:'Registering your survey…'};
/* Shown under the inputs: what each valid answer pays, as soon as budget and quota allow it. */
function rateBox(s,Q){
  if(Q.rate==='—'){const msg=String(s.totalIn||'').trim()&&Q.errors.total?Q.errors.total:'Enter your total budget and the responses you need to see the pay per answer.';
    return `<div class="rateline off">${I.coins}<span>${esc(msg)}</span></div>`}
  return `<div class="rateline">${I.coins}<span>Each valid answer pays <b>${esc(Q.rate)}</b><small>${esc(Q.budget)} for ${esc(s.quota)} respondent${+s.quota===1?'':'s'} · ${esc(Q.fee)} fee</small></span></div>`+
    (Q.warning?`<p class="ratewarn" role="status">${esc(Q.warning)}</p>`:'')}
function vFund(s){const Q=B.quote(s,fundIn(s)),busy=FUNDL[S.busy]?S.busy:'',dis=busy?'disabled':'';
  return pendBar()+`<div class="fund"><div style="min-width:0"><section class="card pad"><h2 class="h">Budget, quota and deadline</h2><p class="muted" style="margin:0">Enter what you can spend in total. We split it across your quota. The pay per answer, quota and deadline are written into the contract and can't change after funding.</p>
      <div class="f3"><div class="fld"><label for="fTotal">Total budget (tBNB)</label><input class="inp" id="fTotal" data-fin="totalIn" type="text" inputmode="decimal" autocomplete="off" placeholder="0.02" aria-describedby="fTotalHint" value="${esc(s.totalIn==null?'':s.totalIn)}" ${dis}><span class="hint" id="fTotalHint">Includes the platform fee.</span></div>
        <div class="fld"><label for="fQuota">Responses needed</label><input class="inp" id="fQuota" data-fin="quota" type="number" min="1" step="1" value="${esc(s.quota==null?'':s.quota)}" ${dis}></div>
        <div class="fld"><label for="fDl">Deadline</label><input class="inp" id="fDl" data-fin="deadline" type="date" value="${esc(s.deadline||'')}" ${dis}></div></div>
      <div id="rateBox" aria-live="polite">${rateBox(s,Q)}</div><div class="err" id="fundErr" role="alert">${esc(S.fundErr)}</div></section>
    <div class="cc"><section class="card"><h4><span style="color:var(--green)">${I.shield}</span>The contract can</h4><p>Pay only the fixed rate per response, to respondents of this survey, once each, within the quota.</p><p>Return the unused budget to you when you close the survey.</p></section>
      <section class="card"><h4><span style="color:var(--red)">${I.x}</span>The contract can't</h4><p>Send your budget anywhere except respondents or back to you.</p><p>Change the rate, quota, deadline or questions.</p></section></div>
    <button class="btn ghost" style="margin-top:14px" data-act="toBuild" ${dis}>${I.back}Back to questions</button></div>
    <aside class="card pad sum"><div class="line"><span id="sBl">Respondents (${Q.rate} × ${esc(s.quota||0)})</span><span id="sB">${Q.budget}</span></div><div class="line"><span id="sFl">Fee (${Q.feeEach} × ${esc(s.quota||0)})</span><span id="sF">${Q.fee}</span></div>
      <div class="tot"><span style="font-weight:600">You deposit</span><b id="sD">${Q.deposit}</b></div><p class="hint" id="sLo" style="margin:8px 0 0"${Q.leftover?'':' hidden'}>${Q.leftover?'Rounding keeps '+Q.leftover+' in your wallet.':''}</p><p class="hint" style="margin:8px 0 0">Paid in tBNB from ${S.wallet?shortW(S.wallet):'your wallet'}. The fee isn't refundable; unused budget is.</p>
      <button class="fundbtn" data-act="fund" ${busy?'disabled aria-busy="true"':''}><span class="fx">${fx}</span><span id="fundLbl">${busy?FUNDL[busy]:'Fund survey'+(Q.ok?' '+Q.deposit:'')}</span></button>
      <p class="fundnote">Opens MetaMask to approve and lock the budget in one step.</p></aside></div>`}
/* Live & share: the step right after funding (F = the funding result), and later the Share tab (no F). */
const shareLink=id=>(S.launched[id]&&S.launched[id].link)||`${location.origin}/s/${id}`;
function shareBody(s,F){const link=shareLink(s.id);
  return (F?`<div class="lockbar">${I.lock}<span><b>Budget locked · ${F.deposit} in the contract</b><br><span style="font-size:13.5px">${F.budget} for answers and ${F.fee} fee. Your survey is live.</span></span><a class="mono" href="${F.txUrl}" target="_blank" rel="noopener">Tx ${F.tx}</a></div>
  <div class="lockrow"><div>${I.lock}Rate<b>${s.rate} per answer</b></div><div>${I.lock}Quota<b>${s.quota} responses</b></div><div>${I.lock}Deadline<b>${s.closesFull}</b></div><div>${I.lock}Questions<b>${(s.q||[]).length} locked</b></div></div>`:'')+`
  <div class="share"><section class="card pad"><h2 class="h">Share the link</h2><p class="muted" style="margin:0">Respondents open it, sign in with their email and wallet, then answer.</p>
      <div class="linkbox"><input class="inp" id="shareLink" readonly value="${esc(link)}" aria-label="Share link"><button class="btn dark" data-act="copyLink">${I.link}Copy</button></div>
      <div class="row" style="margin-top:20px"><button class="btn" data-act="studentView">${I.eye}Preview as a respondent</button>${F?`<button class="btn dark pill" data-act="toOverview">Go to overview ${I.arrow}</button>`:''}</div></section>
    <section class="card pad" style="text-align:center"><h2 class="h">QR code for printing</h2><div class="qrimg" role="img" aria-label="QR code for the survey link">${B.qrSvg(link)}</div><p class="hint" style="margin:0 0 12px">Scan it to open the survey. Print it or share it as an image.</p><button class="btn" data-act="qrDownload">${I.dl}Download QR code</button></section></div>`}
function vLiveShare(s){return shareBody(s,S.launched[s.id])}
function sShare(s){return shareBody(s,null)}

/* ================= finance / results / settings / help ================= */
const RESPILL={pay:['paid','Paid'],review:['pending','In review'],no:['notpaid','Not paid'],pending:['pending','Checking']};
const histBlock=(none)=>D.histErr?`<div class="card empty"><h3>Couldn't load your answers</h3><p>${esc(D.histErr)}</p><button class="btn dark" data-act="reloadHist">Try again</button></div>`
  :!D.hist?`<div class="card empty"><h3>Loading your answers</h3></div>`
  :D.hist.rows.length?`<div class="tbox"><table class="t"><thead><tr><th>Survey</th><th>Amount</th><th>Status</th><th>Transaction</th><th>When</th></tr></thead><tbody>${D.hist.rows.map(p=>`<tr><td><div class="nm"><b style="font-weight:500">${esc(p.title)}</b><small>${p.code}</small></div></td><td>${p.amount}</td><td><span class="tp ${RESPILL[p.res][0]}">${RESPILL[p.res][1]}</span>${p.res==='no'||p.res==='review'?`<div class="hint" style="margin-top:4px">${esc(p.why)}</div>`:''}</td><td class="mono">${p.txUrl?`<a href="${p.txUrl}" target="_blank" rel="noopener">${p.tx}</a>`:'<span class="muted">—</span>'}</td><td class="muted">${p.when}</td></tr>`).join('')}</tbody></table></div><div class="tfoot"><span>${D.hist.rows.length} answer${D.hist.rows.length===1?'':'s'} · ${D.hist.earned} earned</span></div>`
  :`<p class="muted sect-e">${none}</p>`;
function vFinance(){const t=S.finsub,names={wallet:'Wallet',payouts:'Payouts',refunds:'Refunds'},role={wallet:'',payouts:'As a respondent',refunds:'As a researcher'};
  const tabs=`<div class="tabsrow"><div class="tabs fit" role="tablist" aria-label="Finance">${Object.entries(names).map(([v,l])=>`<button role="tab" data-nav="finance-${v}" aria-selected="${t===v}">${l}</button>`).join('')}</div>${role[t]?`<div class="meta">${role[t]}</div>`:''}</div>`;
  const closed=SURVEYS.filter(s=>s.real&&s.status==='closed');
  let body='';
  if(t==='wallet'){
    body=`<div class="g2"><section class="card pad wcard"><div class="row"><span class="kic">${fx}</span><span><b>MetaMask</b><br><span class="mono muted">${S.wallet?shortW(S.wallet):'—'}</span></span><span class="pill p-live" style="margin-left:auto">Connected</span></div>
        <div><div class="hint">Available</div><div class="bal">${D.bal||'…'}</div></div><dl class="kv"><dt>Network</dt><dd>BSC Testnet</dd><dt>Address</dt><dd class="mono">${S.wallet?shortW(S.wallet):'—'}</dd></dl>
        <div class="row"><button class="btn" data-act="copyAddr">${I.link}Copy address</button>${S.wallet?`<a class="btn ghost" href="${B.walletUrl(S.wallet)}" target="_blank" rel="noopener">View on BscScan</a>`:''}</div></section>
      <section class="card pad minc"><div><h2 class="h">Money in</h2><p class="muted" style="margin:0">What came back to this wallet, by role.</p></div>
        <div class="mtiles"><div class="mtile"><span class="kic">${I.coins}</span><div><span class="hint">Payouts · as a respondent</span><b>${D.hist?D.hist.earned:'—'}</b><small>${D.hist?D.hist.paid+' paid answer'+(D.hist.paid===1?'':'s'):'Loading…'}</small></div></div>
          <div class="mtile"><span class="kic">${I.refund}</span><div><span class="hint">Refunds · as a researcher</span><b>${D.list?B.sum(closed,'unused'):'—'}</b><small>${closed.length} closed survey${closed.length===1?'':'s'}</small></div></div></div></section></div>`}
  else if(t==='payouts'){
    body=`<p class="fintro">What happened to the surveys you answered, and any money sent to your wallet. <button class="btn ghost" style="padding:0;font-size:inherit;text-decoration:underline" data-nav="answer">Answer more surveys</button></p>${histBlock('You haven\'t answered a survey yet.')}`}
  else body=`<p class="fintro">Unused budget returned to you when your surveys closed. The flat fee per response isn't refunded.</p>
    ${closed.length?`<div class="tbox"><table class="t"><thead><tr><th>Survey</th><th>Paid responses</th><th>Paid out</th><th>Refunded</th><th class="act">Action</th></tr></thead><tbody>
    ${closed.map(s=>`<tr><td><div class="nm"><b style="font-weight:500">${esc(s.title)}</b><small>${s.code}</small></div></td><td>${s.paid} / ${s.quota}</td><td>${s.paidOut}</td><td>${s.unused}</td><td class="act"><button class="rvbtn view" data-nav="survey-${s.id}-settings">View</button></td></tr>`).join('')}</tbody></table></div>`
    :`<p class="muted sect-e">${D.list?'No refunds yet. Closing a survey returns its unused budget here.':'Loading your surveys…'}</p>`}`;
  return header('<span>Finance</span>',names[t],'')+tabs+body}
/* Answer surveys: every survey that accepts answers, or open one by its link */
const answeredIds=()=>new Set((D.hist?D.hist.rows.map(r=>r.sid):[]).concat(Object.keys(S.answered)));
function vAnswer(){const done=answeredIds(),looking=S.busy==='lookup';
  const list=(D.open||[]).filter(o=>!SV(o.id)).sort((a,b)=>a.daysLeft-b.daysLeft);
  const card=o=>{const a=done.has(o.id);
    return `<article class="card acard"><div class="acard-top"><span>${o.code}</span><span class="aclose ${o.daysLeft<=3?'soon':''}">${o.daysLeft<=3?'Closing soon · ':'Closes '}${o.closes}</span></div>
      <h3 class="h">${esc(o.title)}</h3><p class="adesc">${esc(o.desc||'')}</p>
      <ul class="ameta"><li>${I.coins}<span><b>${o.rate}</b> / answer</span></li><li>${I.clock}<span>${o.mins} min</span></li><li>${I.users}<span>${o.slotsLeft} spot${o.slotsLeft===1?'':'s'} left</span></li></ul>
      <div class="aprog"><span class="tr" role="progressbar" aria-label="Spots filled" aria-valuenow="${o.filled}" aria-valuemin="0" aria-valuemax="100"><span style="width:${o.filled}%"></span></span><span>${o.filled}% filled</span></div>
      ${a?`<div class="adone">${I.check}You already answered this survey</div>`:`<button class="btn dark" data-answer="${o.id}" ${looking?'disabled':''}>Answer survey ${I.arrow}</button>`}</article>`};
  const best=list.filter(o=>!done.has(o.id)).reduce((m,o)=>!m||BigInt(o.rateWei)>BigInt(m.rateWei)?o:m,null);
  const listHtml=D.openErr?`<div class="card empty"><h3>Couldn't load the open surveys</h3><p>${esc(D.openErr)}</p><button class="btn dark" data-act="reloadOpen">Try again</button></div>`
    :!D.open?`<div class="card empty"><h3>Loading open surveys</h3></div>`
    :list.length?`<div class="acards">${list.map(card).join('')}</div>`:`<p class="muted sect-e">No other surveys are open right now. If you have a link, paste it above.</p>`;
  return header('','Answer surveys',`<button class="btn" data-nav="finance-payouts">See your answers ${I.arrow}</button>`)+
  `<div class="kpis k3" style="margin-bottom:18px">${kpi(I.coins,D.hist?D.hist.earned:'—','','','Earned as a respondent')}
    ${kpi(I.check,D.hist?D.hist.rows.length:'—','','','Surveys answered')}
    ${kpi(I.peso,best?best.rate:'—',best?'per answer':'','n','Highest pay open')}</div>
  <section class="card join" aria-labelledby="joinH"><div><h2 class="h" id="joinH">Have a link or QR code?</h2><p class="hint">Paste the link a researcher shared, or upload a photo or screenshot of its QR code.</p></div>
    <div class="join-r"><label class="jin" for="jLink">${I.link}<span class="vh">Survey link</span><input id="jLink" data-in="jLink" placeholder="Paste a survey link" value="${esc(S.jLink)}" autocomplete="off" spellcheck="false" ${looking?'disabled':''}></label>
      <button class="btn dark" data-act="openLink" ${looking?'disabled aria-busy="true"':''}>${looking?'Opening…':'Open'}</button><input class="vh" id="jQR" type="file" accept="image/*"><label class="btn upl" for="jQR" id="jQRLbl">${I.qr}Upload QR code</label></div>
    <div class="err" id="jErr" role="alert"></div></section>
  <div class="sect-t"><h2 class="h">Open surveys <span class="sc">${D.open?list.length:0}</span></h2><span class="hint">Closing soonest first · Your own surveys aren't listed</span></div>
  ${listHtml}`}
/* Open a real survey from a pasted link, a survey number, or a decoded QR code */
function openByLink(t,src){setErr('jErr','');
  if(!(t||'').trim())return setErr('jErr','Paste a survey link first.');
  if(S.busy)return;
  S.busy='lookup';render();
  B.lookup(t).then(s=>{S.busy='';
      const mine=SV(s.id),done=answeredIds().has(s.id);
      if(mine||done||!s.open){render();return setErr('jErr',mine?"That's one of your own surveys. You can't answer your own surveys.":done?'You already answered this survey. One payout per respondent.':s.why)}
      S.jLink='';S.sv=Object.assign(newSV(s.id,true),{s,startedAt:Date.now()});render()},
    e=>{S.busy='';render();setErr('jErr',src==='qr'?"That QR code isn't a ResFunder survey link.":B.text(e))})}
let jsqrP=null;
const loadJsQR=()=>jsqrP||(jsqrP=new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js';sc.onload=()=>window.jsQR?ok(window.jsQR):no();sc.onerror=()=>{jsqrP=null;no()};document.head.appendChild(sc)}));
async function readQR(file){const url=URL.createObjectURL(file);
  try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});
    if('BarcodeDetector' in window){try{const r=await new BarcodeDetector({formats:['qr_code']}).detect(img);if(r.length)return r[0].rawValue}catch(e){}}
    const jsQR=await loadJsQR(),k=Math.min(1,1200/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*k));c.height=Math.max(1,Math.round(img.height*k));
    const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);
    const r=jsQR(x.getImageData(0,0,c.width,c.height).data,c.width,c.height,{inversionAttempts:'attemptBoth'});return r?r.data:null}
  finally{URL.revokeObjectURL(url)}}
function uploadQR(file){const lbl=document.getElementById('jQRLbl');setErr('jErr','');if(lbl){lbl.classList.add('busy');lbl.lastChild.textContent='Reading QR code…'}
  readQR(file).then(t=>{if(!t)return setErr('jErr',"Couldn't find a QR code in that image. Try a sharper, closer photo.");openByLink(t,'qr')})
    .catch(()=>setErr('jErr',"Couldn't read that image. Check your connection and try again."))
    .finally(()=>{const l=document.getElementById('jQRLbl');if(l){l.classList.remove('busy');l.lastChild.textContent='Upload QR code'}})}
/* Results: the answers that were paid. "All responses" sums them up, "Individual" pages through them. */
const paidRows=()=>{const w=W(S.sid);return w?w.log.rows.filter(r=>r.res==='pay'):[]};
const indLen=()=>paidRows().length;
function ansBody(q,a){
  if(q.type==='mc'||q.type==='cb'){const on=j=>q.type==='cb'?(a||[]).includes(j):a===j;
    return (q.opts||[]).map((o,j)=>`<div class="fo ${on(j)?'sel':''}"><i class="${q.type==='cb'?'sq ':''}${on(j)?'on':''}"></i>${esc(o)}</div>`).join('')}
  if(q.type==='scale')return `<div class="fscale">${scaleVals(q).map(v=>`<span class="${a===v?'on':''}">${v}</span>`).join('')}</div>`;
  if(q.type==='grid')return `<div class="fgrid"><table class="fg"><thead><tr><th></th>${q.cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${q.rows.map((r,ri)=>`<tr><td>${esc(r)}</td>${q.cols.map((c,ci)=>`<td><i class="${(a||{})[ri]===ci?'on':''}" ${(a||{})[ri]===ci?`aria-label="${c}"`:''}></i></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return `<div class="ans ${a?'':'empty'}">${a?esc(a):'No answer'}</div>`}
function resInd(s){const P=paidRows(),i=Math.min(S.ri,P.length-1),r=P[i],Q=s.q;
  return `<div class="rnav card"><button class="ibtn" data-ri="-1" aria-label="Previous response" ${i?'':'disabled'}>${I.chevL}</button>
    <label class="qsel" for="riSel">Response<select id="riSel">${P.map((x,k)=>`<option value="${k}"${k===i?' selected':''}>${x.rid}</option>`).join('')}</select></label>
    <span class="hint">${i+1} of ${P.length}</span><button class="ibtn" data-ri="1" aria-label="Next response" ${i<P.length-1?'':'disabled'}>${I.chev}</button></div>
  <div class="form" style="margin-top:14px"><div class="fhead"><div class="bar"></div><div class="in"><div class="between"><h3 style="margin:0">${r.rid}</h3><span class="tp paid">Paid ${r.amount}</span></div>
    <dl class="kv" style="margin-top:12px"><dt>Respondent</dt><dd class="mono">${r.w}</dd><dt>Submitted</dt><dd>${r.when}</dd>${r.txUrl?`<dt>Transaction</dt><dd class="mono"><a href="${r.txUrl}" target="_blank" rel="noopener">${r.tx}</a></dd>`:''}</dl></div></div>
    ${Q.map((q,k)=>`<div class="fq ind"><p class="qt">${k+1}. ${esc(q.t)}${q.req?' <span class="ast">*</span>':''}</p>${ansBody(q,r.a[k])}</div>`).join('')}</div>`}
const rqList=(L,n)=>`<p class="hint" style="margin:8px 0 0">Showing ${L.length} of ${n} answer${n===1?'':'s'}</p><div class="alist">${L.map(a=>`<div>${esc(a)}</div>`).join('')||'<div class="muted">No answers match.</div>'}</div>`;
const rqMatch=(x,i)=>{const q=(S.rq[i]||'').trim().toLowerCase();return x.texts.filter(a=>!q||a.toLowerCase().includes(q))};
function sResults(s,w){const n=indLen();
  const tools=`<div class="tabsrow" style="margin-bottom:10px"><div class="tabs fit" role="tablist" aria-label="Results view"><button role="tab" data-rv="all" aria-selected="${S.rv==='all'}">All responses</button><button role="tab" data-rv="ind" aria-selected="${S.rv==='ind'}">Individual</button></div>
    <div class="tools" style="margin:0"><button class="tbtn" data-act="exportPaid">${I.dl}Export CSV</button></div></div>
    <p class="hint" style="margin:0 0 14px">${n} paid response${n===1?'':'s'} · only answers that passed the checks</p>`;
  if(!n)return tools+`<div class="card empty"><h3>No paid responses yet</h3><p>Results appear here once respondents answer and pass the checks.</p></div>`;
  if(S.rv==='ind')return tools+resInd(s);
  return tools+`<div style="display:grid;gap:14px">${w.results.map((x,i)=>{
    if(x.kind==='bars'){const max=Math.max(1,...x.counts);
      return `<section class="card pad"><div class="between" style="margin-bottom:12px"><h3 class="h">${i+1}. ${esc(x.t)}</h3><span class="hint">${x.n} answer${x.n===1?'':'s'}</span></div>${x.labels.map((o,j)=>`<div class="hbar"><span>${esc(o)}</span><span class="tr"><span style="width:${x.counts[j]/max*100}%"></span></span><span class="n">${x.counts[j]}</span></div>`).join('')}</section>`}
    return `<section class="card pad"><div class="between"><h3 class="h">${i+1}. ${esc(x.t)}</h3><label class="sbox" style="height:40px;max-width:280px">${I.search}<input data-rq="${i}" type="search" placeholder="Search answers" value="${esc(S.rq[i]||'')}" aria-label="Search answers"></label></div><div id="rq-${i}">${rqList(rqMatch(x,i),x.n)}</div></section>`}).join('')}</div>`}
function vSettings(){const M=me();
  return header('','Settings','')+`<div style="display:grid;gap:14px"><section class="card pad"><h2 class="h">Account</h2><p class="muted" style="margin:0 0 16px">You can publish surveys as a researcher and answer other groups' surveys as a respondent.</p>
      <dl class="kv"><dt>Name</dt><dd>${esc(M.name)}</dd><dt>Email</dt><dd>${esc(M.email)}</dd><dt>Wallet</dt><dd class="mono">${S.wallet?shortW(S.wallet):'—'}</dd><dt>Network</dt><dd>BSC Testnet</dd></dl>
      <div class="srow" style="margin-top:16px;border-top:1px solid var(--line)"><span><b>Sign out</b><small>${esc(M.email)}</small></span><button class="btn" data-act="signOut" ${S.busy==='out'?'disabled':''}>Sign out</button></div></section></div>`}
function vHelp(){const f=[['How does screening decide who gets paid?','Code checks run first (empty, gibberish, duplicate, too fast, same option repeated). Then the AI labels each written answer twice. Published rules decide: Pay, Review or Don\'t pay. The AI can only send a response to Review; it can\'t block payment.'],
  ['What happens to a response in review?','It stays unpaid and shows in the survey\'s review queue with the reason. You pay it, or reject it with a reason. Either way it is recorded on chain and can\'t be undone. Nothing is paid or rejected by itself.'],
  ['What does the fee cover?','A flat fee per response ('+D.fee+') covers the network cost of each payment decision and running the screening. It isn\'t refunded when you close a survey; unused budget is.'],['Is this real money?','No. ResFunder runs on BSC Testnet with tBNB test tokens.']];
  return header('','Help and support','')+`<section class="card pad faq" style="max-width:820px">${f.map((x,i)=>`<details ${i?'':'open'}><summary>${x[0]}${I.down.replace('<svg','<svg style="width:16px;height:16px;flex:none"')}</summary><p>${x[1]}</p></details>`).join('')}</section>`}
/* ================= student view (respondent page) ================= */
/* Three screens, like a form: (1) intro and consent, (2) every question on one page with Submit at the end,
   (3) the result. A "ticket" anchors each screen: what the survey pays and how far along you are; at the end it is the receipt.
   Desktop: the ticket is a sticky left column. Phone: it folds into a strip under the top bar (tap to open). */
const SV_CHEV=sv('<path d="M10 3L5 8l5 5"/>'),SV_DOWN=sv('<path d="M4 6l4 4 4-4"/>'),SV_EXT=sv('<path d="M6 3.5h6.5V10M12.5 3.5L4 12"/>'),SV_ALERT=sv('<circle cx="8" cy="8" r="6"/><path d="M8 5v3.5M8 11h.01"/>'),SV_USER=sv('<circle cx="8" cy="5.5" r="2.5"/><path d="M3 13.5c.7-2.3 2.6-3.6 5-3.6s4.3 1.3 5 3.6"/>');
const SV_KIND={mc:'Pick one',cb:'Pick any',scale:'Pick a number',grid:'One answer per row',short:'Short answer'};
const SV_PHASE={sign:['Confirm in MetaMask…','Sign the free message in MetaMask to send your answers.'],send:['Sending your answers…','One moment.'],screen:['Checking your answers…','This takes a few seconds. Keep this open.']};
/* An answer counts once it is complete (every grid row, a non-empty text). */
const svDone=(q,a)=>q.type==='mc'||q.type==='scale'?a!=null:q.type==='cb'?(a||[]).length>0:q.type==='grid'?Object.keys(a||{}).length===q.rows.length:!!String(a||'').trim();
const svCount=(Q,ans)=>Q.reduce((n,q,i)=>n+(svDone(q,ans[i])?1:0),0);
function svInfo(R){const s=R.s,Q=s.q;
  return {s,Q,n:Q.length,rate:typeof s.rate==='string'?s.rate:(()=>{const r=B.quote(s,fundIn(s)).rate;return r==='—'?'0 tBNB':r})(),
    mins:s.mins||Math.max(1,Math.round(Q.length/2)),spots:s.slotsLeft!=null?s.slotsLeft:Math.max(0,(+s.quota||0)-(s.paid!=null?s.paid:s.resp||0)),
    closes:s.closesFull||fmtDate(s.deadline),group:s.group||(s.code?s.code+' · ':'')+'Paid survey on BSC Testnet',title:s.title||'Untitled survey',
    mode:R.live?'Answering as '+esc(me().email):'Preview · nothing is sent'}}
/* The ticket: survey, payout, facts, perforation, then progress (or, after submitting, the receipt). */
function svTicket(R,F){const step=R.step,X=R.res,a=svCount(F.Q,R.ans);
  const dot=(st)=>st==='done'?`<span class="tk-dot ok" aria-hidden="true">${I.check}</span>`:st==='now'?`<span class="tk-dot now" aria-hidden="true"><i></i></span>`:`<span class="tk-dot" aria-hidden="true"></span>`;
  const li=(st,label,meta,extra)=>`<li class="${st}">${dot(st)}<span class="tk-l">${label}</span>${meta!=null?`<span class="tk-m">${meta}</span>`:''}${extra||''}</li>`;
  let amt,body,label='Your survey ticket',facts=true;
  if(step==='pay'){label='Your payment receipt';facts=false;
    amt=`<span class="tk-st ok">${I.check}Paid</span><b class="tk-v">${X.amount}</b>`;
    body=`<dl class="tk-rows"><dt>To</dt><dd class="mono">${esc(X.wallet)}</dd><dt>Transaction</dt><dd class="mono">${X.tx?esc(X.tx):'—'}</dd><dt>Network</dt><dd>BSC Testnet</dd><dt>Checks</dt><dd>Code, AI label, rules</dd></dl>`}
  else if(step==='review'){label='Your submission';facts=false;
    amt=`<span class="tk-st rev">${I.clock}In review</span><b class="tk-v dim">${F.rate}</b><span class="tk-s">not paid yet</span>`;
    body=`<ol class="tk-steps tk-tl">${li('done','Submitted',null,'<small>Your answers were received</small>')}${li('now rev','In review',null,'<small>A researcher is checking your answer</small>')}${li('','Decision',null,'<small>Made by the researcher</small>')}</ol>`}
  else if(step==='nopay'){label='Why it wasn\'t paid';facts=false;
    const why=X&&X.reasons&&X.reasons.length?X.reasons:['A code check failed.'];
    amt=`<span class="tk-st no">${I.x}Not paid</span><b class="tk-v">0 tBNB</b>`;
    body=`<div class="tk-why"><span class="tk-s">Reason</span>${why.map(w=>`<p>${SV_ALERT}<span>${esc(w)}</span></p>`).join('')}</div>`}
  else{amt=`<span class="tk-s">You earn</span><b class="tk-v or">${F.rate}</b><span class="tk-s">for a valid answer</span>`;
    const qs=step==='answer'?(R.sending?'done':'now'):'',bar=step==='answer'&&!R.sending?`<span class="tk-bar" aria-hidden="true"><i id="svTkBar" style="transform:scaleX(${F.n?a/F.n:0})"></i></span>`:'';
    body=`<ol class="tk-steps" aria-label="Your progress">${li(step==='intro'?'now':'done','About and consent',step==='intro'?'Now':'Done')}${li(qs,'Questions',step==='answer'?`<span id="svTkAns">${a} of ${F.n} answered</span>`:F.n,bar)}${li(R.sending?'now':'','Submit',R.sending?'Sending':null)}${li('','Result')}</ol>`}
  return `<aside class="tk" aria-label="${label}"><div class="tk-hd"><span class="tk-g">${esc(F.group)}</span><span class="tk-t">${esc(F.title)}</span></div>
    <div class="tk-amt">${amt}</div>${facts?`<dl class="tk-facts"><div><dt>Time</dt><dd>About ${F.mins} min</dd></div><div><dt>Paid spots left</dt><dd>${F.spots}</dd></div><div><dt>Closes</dt><dd>${esc(F.closes)}</dd></div></dl>`:''}
    <div class="tk-perf" aria-hidden="true"></div>${body}
    <div class="tk-ft"><span><i class="tk-net" aria-hidden="true"></i><b>BSC Testnet</b> · test tokens only</span><span class="tk-mode">${I.eye}${F.mode}</span></div></aside>`}
/* Page shell: top bar (phone: back · title · close, plus the ticket strip on the questions page), then ticket + content. */
function svPage(F,o){const R=S.sv,a=svCount(F.Q,R.ans);
  const key=R.step,anim=R._k!=null&&key!==R._k;R._k=key;
  const back=o.back?`<button class="sv-hback" data-rgo="${o.back}" data-rdir="back" aria-label="Back">${SV_CHEV}</button>`:'';
  const strip=R.step==='answer'?`<div class="sv-strip"><button class="sv-tkbtn" data-ract="tk" aria-expanded="${!!R.tkOpen}" aria-controls="svTk"><b>${F.rate}</b><span id="svAns">${a} of ${F.n} answered</span><span class="t">Ticket</span>${SV_DOWN}</button></div><div class="sv-prog" aria-hidden="true"><i id="svProg" style="transform:scaleX(${F.n?a/F.n:0})"></i></div>`:'';
  return `<header class="sv-top"><div class="sv-topin">${back}<span class="brand"><span class="logo" aria-hidden="true"></span><span class="bt">ResFunder</span></span><span class="sv-ttl">${o.title||''}</span><span class="sv-mode">${R.live?SV_USER:I.eye}${F.mode}</span><button class="sv-close" data-act="closeSV" aria-label="Close survey">${I.x}<span>Close</span></button></div>${strip}</header>
  <main class="sv-main"><div class="sv-grid${anim?(R._dir==='back'?' sv-back':' sv-fwd'):''}${R.tkOpen?' tk-open':''}" id="svTk">${svTicket(R,F)}<div class="sv-head">${o.back?`<button class="sv-cback" data-rgo="${o.back}" data-rdir="back">${SV_CHEV}Back</button>`:''}${o.head||''}</div><div class="sv-body">${o.body||''}</div></div></main>`}
/* Close plays the sheet path in reverse, then clears the view. */
function svClose(after){const R=S.sv;if(!R||R._closing)return;R._closing=true;clearT();
  const done=()=>{if(S.sv===R){S.sv=null;render()}if(after)after()},el=document.querySelector('#svRoot .sv');
  if(!el){done();return}el.classList.add('sv-out');setTimeout(done,200)}
/* One question card. Answer inputs keep their data-rans* hooks; changing an answer never re-renders. */
function svQuestion(q,i,F,a){const t=esc(q.t||'Untitled question'),req=q.req?' <span class="ast" aria-hidden="true">*</span><span class="vh"> (required)</span>':'';
  const sub=`<p class="sv-qs">Question ${i+1} of ${F.n} · ${SV_KIND[q.type]||'Long answer'}</p>`,err=`<p class="sv-qerr" id="rAnsErr${i}" role="alert"></p>`;
  if(q.type==='short'||isText(q)){const field=q.type==='short'?`<input class="inp" id="rqi${i}" data-ranst="${i}" placeholder="Your answer" value="${esc(a||'')}">`:`<textarea class="inp" id="rqi${i}" data-ranst="${i}" rows="4" maxlength="5000" placeholder="Your answer">${esc(a||'')}</textarea>`;
    return `<section class="sv-q" id="rq${i}"><label class="sv-qt" for="rqi${i}">${t}${req}</label>${sub}${field}${err}</section>`}
  let inp;
  if(q.type==='mc')inp=`<div class="sv-opts">${q.opts.map((o,j)=>`<label class="sv-opt"><input type="radio" name="ra${i}" data-rans="${i}" data-v="${j}" ${a===j?'checked':''}><span class="rt">${esc(o)}</span><span class="ck" aria-hidden="true">${I.check}</span></label>`).join('')}</div>`;
  else if(q.type==='cb')inp=`<div class="sv-opts">${q.opts.map((o,j)=>`<label class="sv-opt"><input type="checkbox" data-ransc="${i}" data-v="${j}" ${(a||[]).includes(j)?'checked':''}><span class="rt">${esc(o)}</span></label>`).join('')}</div>`;
  else if(q.type==='scale')inp=`<div class="gchips gscale">${scaleVals(q).map(v=>`<label><input type="radio" name="ra${i}" data-rans="${i}" data-v="${v}" ${a===v?'checked':''}>${v}</label>`).join('')}</div>`;
  else inp=q.rows.map((r,ri)=>`<div class="grow"><div class="gl">${esc(r)}</div><div class="gchips" role="radiogroup" aria-label="${esc(r)}">${q.cols.map((c,ci)=>`<label><input type="radio" name="ra${i}-${ri}" data-ransg="${i}" data-r="${ri}" data-v="${ci}" ${(a||{})[ri]===ci?'checked':''}>${esc(c)}</label>`).join('')}</div></div>`).join('');
  return `<fieldset class="sv-q" id="rq${i}"><legend class="sv-qt">${t}${req}</legend>${sub}${inp}${err}</fieldset>`}
/* Two ways in: live (a real survey and a real submission, ending on the server's result) and the researcher's
   preview of their own survey (nothing is sent; it closes once the answers pass the completeness check). */
function vStudent(){const R=S.sv,F=svInfo(R),step=R.step;let o;
  if(step==='intro'){const li=(ic,b,t)=>`<li><span class="ic" aria-hidden="true">${ic}</span><span><b>${b}</b>${t}</span></li>`;
    o={title:'',head:`<p class="sv-eye">Paid survey${F.s.code?' · '+esc(F.s.code):''}</p><h1 class="sv-h1">${esc(F.title)}</h1>${F.s.desc?`<p class="sv-lead">${esc(F.s.desc)}</p>`:''}`,
      body:`<h2 class="sv-h2">Before you start</h2><p class="sv-sub">Please read this. It takes 20 seconds.</p>
      <ul class="sv-list">${li(I.doc,`${F.n} question${F.n===1?'':'s'}, about ${F.mins} minute${F.mins===1?'':'s'}`,'Nothing is sent until you press Submit.')}${li(I.shield,'Anonymous','Researchers see your answers and wallet, never your email.')}${li(I.wallet,`${F.rate} for a valid answer`,'Checked by code and AI. Unclear ones go to a person.')}</ul>
      <label class="sv-agree"><input type="checkbox" data-ragree="1" ${R.agree?'checked':''}><span>I'm 18 or older and agree to take part in this study.</span></label><p class="sv-qerr" id="rAgreeErr" role="alert"></p>
      <div class="sv-actions"><button class="btn dark sv-cta" data-ract="agree">I agree, start</button><span class="sv-note">${R.live?'Signed in as '+esc(me().email):'Respondents sign in with their email and wallet first.'}</span></div>`}}
  else if(step==='answer'){const ph=R.sending?SV_PHASE[R.phase]||SV_PHASE.screen:null,req=F.Q.some(q=>q.req);
    const lead=R.live?`${F.rate} goes to your signed-in wallet if your answers pass the checks.`:'This is a preview. Nothing is sent.';
    o={title:`${F.n} question${F.n===1?'':'s'}`,back:'intro',
      body:`<div class="sv-form"><section class="sv-q sv-qh"><p class="sv-eye">${esc(F.group)}</p><h1 class="sv-h1 sm">${esc(F.title)}</h1>${F.s.desc?`<p class="sv-lead sm">${esc(F.s.desc)}</p>`:''}${req?`<p class="sv-reqnote">Required questions are marked <span class="ast">*</span></p>`:''}</section>
      <fieldset class="sv-qs-all" ${R.sending?'disabled':''}>${F.Q.map((q,i)=>svQuestion(q,i,F,R.ans[i])).join('')}</fieldset>
      <section class="sv-q sv-qsub"><h2 class="sv-qt">Submit your answers</h2><p class="sv-sub">${lead}</p><p class="sv-suberr" id="rSubErr" role="alert">${esc(R.err||'')}</p>
      <div class="sv-actions in"><button type="button" class="btn dark sv-cta" data-ract="submit" ${R.sending?'disabled aria-busy="true"':''}>${ph?`<span class="sv-spin">${I.spin}</span>${ph[0]}`:'Submit answers'}</button><span class="sv-note" role="status">${ph?ph[1]:R.live?'MetaMask asks for one free signature. It proves the answers come from your wallet.':''}</span></div></section></div>`}}
  else{const X=R.res,res=(ic,cls,h,p)=>`<div class="sv-res"><span class="sv-ic ${cls}" aria-hidden="true">${ic}</span><h1 class="sv-h1">${h}</h1><p class="sv-lead">${p}</p></div>`;
    const done=`<button class="btn dark sv-cta" data-ract="restart">Done</button>`;
    if(step==='pay')o={title:'Result',head:res(I.check,'ok',`${X.amount} sent`,'Your answers passed the screening check. Thank you.'),body:`<div class="sv-actions">${done}${X.txUrl?`<a class="btn sv-cta2" href="${X.txUrl}" target="_blank" rel="noopener">View on BscScan${SV_EXT}</a>`:''}</div>`};
    else if(step==='review')o={title:'Result',head:res(I.clock,'rev','Under review','The checks couldn\'t settle one answer, so the researcher will decide.'),body:`<div class="sv-actions">${done}</div>`};
    else o={title:'Result',head:res(I.x,'no','Not paid','Your answers didn\'t pass the code checks.'),body:`<div class="sv-actions">${done}</div>`}}
  const cls=R._closing?' sv-out':R._shown?'':' sv-in';R._shown=true;
  return `<div class="sv${cls}" data-step="${step}" role="dialog" aria-modal="true" aria-label="Answer survey">${svPage(F,o)}</div>`}
let timers=[];const clearT=()=>{timers.forEach(clearTimeout);timers=[]};
function rgo(step,dir){const R=S.sv;R.step=step;R._dir=dir||'fwd';R.tkOpen=false;clearT();
  render()}
/* After an answer changes: clear that card's error and update the answered counts, without re-rendering. */
function svAnswered(i){const R=S.sv;if(!R)return;const F=svInfo(R),a=svCount(F.Q,R.ans),p=F.n?a/F.n:0;
  const c=document.getElementById('rq'+i);if(c)c.classList.remove('bad');setErr('rAnsErr'+i,'');
  if(!F.Q.some((q,k)=>q.req&&!svDone(q,R.ans[k])))setErr('rSubErr','');
  [['svAns',a+' of '+F.n+' answered'],['svTkAns',a+' of '+F.n+' answered']].forEach(([id,t])=>{const e=document.getElementById(id);if(e)e.textContent=t});
  ['svProg','svTkBar'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.transform='scaleX('+p+')'})}
/* Submit-time check: every unanswered required card turns red; the page scrolls to the first one. */
function svValidate(){const R=S.sv,Q=svInfo(R).Q;let first=-1,miss=0;
  Q.forEach((q,i)=>{const bad=q.req&&!svDone(q,R.ans[i]),c=document.getElementById('rq'+i);if(c)c.classList.toggle('bad',bad);
    setErr('rAnsErr'+i,bad?(q.type==='grid'?'Answer every row.':'This question is required'):'');if(bad){miss++;if(first<0)first=i}});
  setErr('rSubErr',miss?`${miss} required question${miss===1?'':'s'} still need${miss===1?'s':''} an answer.`:'');
  if(first>=0){const c=document.getElementById('rq'+first);if(c){let smooth=true;try{smooth=!matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
    c.scrollIntoView({behavior:smooth?'smooth':'auto',block:'center'});const f=c.querySelector('input,textarea');if(f)try{f.focus({preventScroll:true})}catch(e){}}}
  return !miss}
/* The real submission: one signature, the answers, then the server's screening and its decision. The page stays put
   and the Submit button shows each phase; only the outcome gets its own screen. */
function submitLive(){const R=S.sv;if(R.sending)return;R.sending=true;R.err='';R.phase='sign';clearT();render();
  B.submit(R.sid,R.ans,R.startedAt,p=>{R.phase=p;if(S.sv===R)render()}).then(res=>{R.sending=false;R.res=res;S.answered[R.sid]=res.step;
      if(S.sv===R)rgo(res.step);else toast(res.step==='pay'?`${res.amount} sent to your wallet`:res.step==='review'?'Your answers are under review':'Your answers were not paid');
      loadBalance();loadHist()},
    e=>{R.sending=false;R.err=B.text(e);if(S.sv===R)render();else toast(R.err)})}
const newSV=(sid,live)=>({sid,live:!!live,s:null,step:'intro',agree:false,ans:{},wallet:live?S.wallet:'',res:null,err:'',phase:'',sending:false,tkOpen:false});
/* ================= actions ================= */
let tt,lastUndo=null;
function toast(m,undo){const t=document.getElementById('toast');document.getElementById('toastMsg').textContent=m;document.getElementById('toastUndo').hidden=!undo;lastUndo=undo||null;t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),4000)}
const setErr=(id,m)=>{const e=document.getElementById(id);if(e)e.textContent=m||''};
function copy(v,msg){try{navigator.clipboard.writeText(v).then(()=>toast(msg),()=>toast(v))}catch(e){toast(v)}}
function newDraft(){const dl=new Date(Date.now()+14*864e5),p=n=>String(n).padStart(2,'0');
  const d={id:'d'+Date.now().toString(36),status:'draft',title:'',desc:'',totalIn:'0.02',quota:10,deadline:`${dl.getFullYear()}-${p(dl.getMonth()+1)}-${p(dl.getDate())}`,q:[{t:'',type:'mc',req:true,opts:['Option 1','Option 2']}]};
  SURVEYS.unshift(d);saveDrafts();S.sid=d.id;S.page='survey';S.stab='build';S.draft[d.id]='build';S.fundErr='';S.sideOpen=false;render();try{window.scrollTo({top:0})}catch(e){}}
/* The funded survey replaces its draft and opens on the share step. */
function funded(draftId,F){S.busy='';S.fundErr='';D.pend=null;
  const t=F.survey.title,gone=draftId||(drafts().find(x=>(x.title||'').trim()===t)||{}).id;
  SURVEYS=SURVEYS.filter(x=>x.id!==gone&&x.id!==F.survey.id);saveDrafts();SURVEYS=drafts().concat([F.survey],SURVEYS.filter(x=>x.real));
  S.launched[F.survey.id]=F;S.sid=F.survey.id;S.page='survey';S.stab='overview';render();try{window.scrollTo({top:0})}catch(e){}
  toast('Budget locked · survey is live');loadList(true);loadBalance()}
function act(a,el){if(authAct(a))return;const s=SV(S.sid);
  switch(a){
    case 'toLanding':S.landing=true;S.after=null;S.auth.stage='login';S.auth.err='';render();try{window.scrollTo({top:0})}catch(e){}break;
    case 'lpStart':S.after=el.dataset.to||null;S.landing=false;S.auth.stage=el.dataset.stage==='register'?'register':'login';S.auth.err='';render();try{window.scrollTo({top:0})}catch(e){}{const i=document.getElementById('aEmail');if(i)i.focus()}break;
    case 'lpScroll':{const t=document.getElementById(el.dataset.to);if(t)t.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});break;}
    case 'signOut':if(S.busy)return;S.busy='out';render();B.signOut().then(()=>location.assign('/'),()=>location.assign('/'));break;
    case 'sideOpen':S.sideOpen=true;render();break;
    case 'sideClose':S.sideOpen=false;render();break;
    case 'toast':toast(el.dataset.msg);break;
    case 'reload':D.list=false;render();loadList(true);break;
    case 'reloadOpen':D.open=null;render();loadOpen();break;
    case 'reloadHist':D.hist=null;render();loadHist();break;
    case 'reopen':delete D.ws[S.sid];render();loadWs(S.sid,true);break;
    case 'newFund':newDraft();break;
    case 'delDraft':{const id=el.dataset.id,d=SV(id);if(!d||d.status!=='draft')break;const at=SURVEYS.indexOf(d);SURVEYS.splice(at,1);saveDrafts();render();
      toast('Draft deleted',()=>{SURVEYS.splice(Math.min(at,SURVEYS.length),0,d);saveDrafts();render();toast('Draft restored')});break;}
    case 'qrDownload':{if(!SV(S.sid))break;const url=URL.createObjectURL(new Blob([B.qrSvg(shareLink(S.sid))],{type:'image/svg+xml'})),a=document.createElement('a');
      a.href=url;a.download=`${(SV(S.sid)||{}).code||'survey'}-qr.svg`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);break;}
    case 'copyLink':copy(shareLink(S.sid),'Share link copied');break;
    case 'copyAddr':copy(S.wallet,'Address copied');break;
    case 'copyW':copy(el.dataset.w,'Wallet copied');break;
    case 'studentView':S.sv=Object.assign(newSV(S.sid,false),{s:SV(S.sid)});render();break;
    case 'openLink':openByLink(S.jLink,'link');break;
    case 'closeSV':svClose();break;
    case 'addOpt':{const q=s.q[+el.dataset.i];if(q.opts.length>=12)return toast('A question can have up to 12 options');q.opts.push('Option '+(q.opts.length+1));saveDrafts();render();break;}
    case 'delOpt':{const q=s.q[+el.dataset.i];if(q.opts.length>2){q.opts.pop();saveDrafts();render()}break;}
    case 'addQ':if(s.q.length>=30)return toast('A survey can have up to 30 questions');s.q.push({t:'',type:'open',req:true,short:false});saveDrafts();render();{const i=document.getElementById('bq-'+(s.q.length-1));if(i)i.focus()}break;
    case 'delQ':if(s.q.length<=1)return toast('A survey needs at least one question');s.q.splice(+el.dataset.i,1);saveDrafts();render();break;
    case 'toFund':{const er=B.quote(s,fundIn(s)).errors.survey;if(er)return toast(er);S.draft[s.id]='fund';S.fundErr='';render();try{window.scrollTo({top:0})}catch(e){}break;}
    case 'toBuild':S.draft[s.id]='build';render();break;
    case 'fund':{if(S.busy)return;const Q=B.quote(s,fundIn(s)),er=Q.errors.survey||Q.errors.total||Q.errors.quota||Q.errors.deadline;
      if(er||!Q.ok){S.fundErr=er||'The fee is still loading. Try again in a moment.';return setErr('fundErr',S.fundErr)}
      const id=s.id;S.fundErr='';S.busy='connecting';render();
      B.fund(s,fundIn(s),p=>{S.busy=p;if(S.page==='survey'&&S.sid===id)render()}).then(F=>funded(id,F),e=>{S.busy='';S.fundErr=B.text(e);D.pend=B.pendingFund();render()});break;}
    case 'retryFund':if(S.busy)return;S.busy='retry';render();
      B.retryFund(()=>{}).then(F=>funded(null,F),e=>{S.busy='';render();toast(B.text(e))});break;
    case 'toOverview':delete S.launched[s.id];S.stab='overview';render();loadWs(s.id);break;
    case 'askClose':S.closeAsk=true;S.closeErr='';render();break;
    case 'cancelClose':if(S.busy)return;S.closeAsk=false;render();break;
    case 'doClose':{if(S.busy)return;const id=s.id;S.busy='confirm';S.closeErr='';render();
      B.close(id,p=>{S.busy=p;render()}).then(r=>{S.busy='';S.closeAsk=false;render();toast(`Closed · ${r.refunded} returned to your wallet`);loadWs(id,true);loadList(true);loadBalance()},
        e=>{S.busy='';S.closeErr=B.text(e);render()});break;}
    case 'closeRev':if(S.dbusy)return;S.openRev=null;S.reasonFor=null;S.derr='';render();break;
    case 'askNo':S.reasonFor=el.dataset.id;S.reason=B.rejectReasons[0][0];S.derr='';render();break;
    case 'cancelNo':S.reasonFor=null;render();break;
    case 'decide':{if(S.dbusy)return;const key=el.dataset.id,dd=el.dataset.d,r=revRow(key);if(!r)break;const w=W(r.sid);
      S.dbusy=dd==='pay'?'pay':'no';S.derr='';render();
      B.decide(key,dd,dd==='dont_pay'?S.reason:undefined).then(async res=>{await loadWs(r.sid,true);
          S.dbusy='';S.reasonFor=null;const P=reviews();S.openRev=P.length?(P.find(x=>x.key!==key)||P[0]).key:null;render();
          toast(dd==='pay'?(res.status==='paid'?`Paid ${w.survey.rate}`:"The payment didn't go through. It is back in review."):(res.status==='blocked'?'Not paid. The decision is recorded on chain.':"The decision didn't go through. It is back in review."));
          if(dd==='pay')loadBalance()},
        e=>{S.dbusy='';S.derr=B.text(e);render()});break;}
    case 'qClear':S.qQ='';render();break;
    case 'fToggle':S.fOpen=!S.fOpen;render();break;
    case 'lClear':S.lQ='';S.lRes='all';render();break;
    case 'export':exportCsv(false);break;
    case 'exportPaid':exportCsv(true);break;
  }}
function ract(a){const R=S.sv;
  switch(a){
    case 'agree':if(!R.agree)return setErr('rAgreeErr','Tick the box to continue.');rgo('answer');break;
    case 'tk':R.tkOpen=!R.tkOpen;render();break;
    case 'submit':if(R.sending||!svValidate())return;if(R.live){submitLive();break}
      svClose(()=>toast('Preview finished. Nothing was sent.'));break;
    case 'restart':clearT();
      if(R.live){const st=R.res&&R.res.step;svClose(()=>toast(st==='pay'?`${R.res.amount} sent to your wallet`:st==='review'?'Thanks. Your answers are under review.':'Thanks for answering'));break}
      Object.assign(R,{_dir:'back',step:'intro',agree:false,ans:{},res:null,err:'',sending:false,tkOpen:false});render();break;
  }}


document.addEventListener('click',e=>{
  const t=e.target.closest('[data-nav],[data-act],[data-open],[data-openrev],[data-answer],[data-stab],[data-fsub],[data-rv],[data-ri],[data-range],[data-day],[data-step],[data-reason],[data-fres],[data-rgo],[data-ract],[data-chk],[data-chkall],#toastUndo');
  if(S.fOpen&&!e.target.closest('.fwrap')){S.fOpen=false;if(!t){render();return}}
  if(!t||t.disabled)return;const d=t.dataset;
  if(t.id==='toastUndo'){if(lastUndo){const f=lastUndo;lastUndo=null;f()}return}
  if(d.chk){t.checked?S.lSel.add(d.chk):S.lSel.delete(d.chk);refreshLog();return}
  if(d.chkall){logFiltered().forEach(r=>t.checked?S.lSel.add(r.key):S.lSel.delete(r.key));refreshLog();return}
  if(d.nav){nav(d.nav);return}
  if(d.open){openSurvey(d.open);return}
  if(d.openrev){S.openRev=d.openrev;render();return}
  if(d.answer){S.jLink='';openByLink(d.answer,'card');return}
  if(d.stab){S.stab=d.stab;S.fOpen=false;render();return}
  if(d.fsub){S.fsub=d.fsub;render();return}
  if(d.rv){S.rv=d.rv;render();return}
  if(d.ri){S.ri=Math.max(0,Math.min(indLen()-1,S.ri+(+d.ri)));render();return}
  if(d.range){S.range=d.range;S.day=null;const c=document.getElementById('chartCard');if(c)c.innerHTML=chartCard();return}
  if(d.day!=null){S.day=+d.day;refreshPlot();return}
  if(d.step){const P=reviews(),i=P.findIndex(x=>x.key===S.openRev),j=i+(+d.step);if(i>=0&&j>=0&&j<P.length){S.openRev=P[j].key;render()}return}
  if(d.reason!=null){S.reason=d.reason;render();return}
  if(d.fres){S.lRes=d.fres;render();return}
  if(d.rgo){rgo(d.rgo,d.rdir);return}
  if(d.ract){ract(d.ract);return}
  if(d.act)act(d.act,t);
});
function refreshLog(){const b=document.getElementById('logBody');if(b)b.innerHTML=logBody();const x=document.getElementById('exportBtn');if(x)x.innerHTML=exportLabel()}
function refreshPlot(){const w=document.getElementById('plotWrap');if(w)w.innerHTML=plot()}
/* The deposit preview follows the three fund inputs without redrawing them. */
function refreshFund(){const s=SV(S.sid);if(!s||s.status!=='draft')return;const Q=B.quote(s,fundIn(s)),set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  set('sBl','Respondents ('+Q.rate+' × '+(s.quota||0)+')');set('sFl','Fee ('+Q.feeEach+' × '+(s.quota||0)+')');set('sB',Q.budget);set('sF',Q.fee);set('sD',Q.deposit);set('fundLbl','Fund survey'+(Q.ok?' '+Q.deposit:''));
  const lo=document.getElementById('sLo');if(lo){lo.hidden=!Q.leftover;lo.textContent=Q.leftover?'Rounding keeps '+Q.leftover+' in your wallet.':''}
  const rb=document.getElementById('rateBox');if(rb)rb.innerHTML=rateBox(s,Q);S.fundErr='';setErr('fundErr','')}
function refreshPrev(){const p=document.getElementById('bPrev');if(p)p.innerHTML=formPreview(SV(S.sid),false)}
document.addEventListener('input',e=>{const t=e.target,d=t.dataset;if(!d)return;
  if(d.pft){pf()[d.pft]=t.value;setErr('aPfErr','');return}
  if(d.rq!=null){const i=+d.rq,w=W(S.sid);S.rq[i]=t.value;const L=document.getElementById('rq-'+i);if(L&&w)L.innerHTML=rqList(rqMatch(w.results[i],i),w.results[i].n);return}
  const s=SV(S.sid);
  if(d.in){const k=d.in,v=t.value;
    if(k==='authEmail'){S.auth.email=v;setErr('aEmailErr','')}
    else if(k==='authPw'){S.auth.pw=v;setErr('aPwErr','')}
    else if(k==='sTitle'){s.title=v;refreshPrev();saveDrafts()}else if(k==='sDesc'){s.desc=v;refreshPrev();saveDrafts()}
    else if(k==='qQ'){S.qQ=v;const b=document.getElementById('qBody');if(b)b.innerHTML=queueTable()}
    else if(k==='lQ'){S.lQ=v;refreshLog()}
    else if(k==='jLink'){S.jLink=v;setErr('jErr','')}
    return}
  if(d.fin){s[d.fin]=t.value;saveDrafts();refreshFund();return}
  if(d.bq!=null){s.q[+d.bq].t=t.value;refreshPrev();saveDrafts();return}
  if(d.bopt!=null){s.q[+d.bopt].opts[+d.j]=t.value;refreshPrev();saveDrafts();return}
  if(d.rin){S.sv[d.rin]=t.value;['rEmailErr','rWErr'].forEach(x=>setErr(x,''));return}
  if(d.ranst!=null){S.sv.ans[+d.ranst]=t.value;svAnswered(+d.ranst);return}
});
document.addEventListener('change',e=>{const el=e.target,d=el.dataset;if(!d)return;const s=SV(S.sid);
  if(d.pf){pf()[d.pf]=el.value;const k=d.pf;render();const o=document.querySelector('[data-pft="'+k+'O"]');if(o&&el.value==='other')o.focus();else{const r=document.querySelector('input[data-pf="'+k+'"][value="'+el.value+'"]');if(r)r.focus()}return}
  if(d.pfc){pf()[d.pfc]=el.checked;setErr('aPfErr','');return}
  if(el.id==='riSel'){S.ri=+el.value;render();return}
  if(el.id==='jQR'){const f=el.files&&el.files[0];el.value='';if(f)uploadQR(f);return}
  if(d.pause){const id=d.pause,on=el.checked,w=W(id);if(S.busy){el.checked=!on;return}S.busy='pause';render();
    B.pause(id,on).then(()=>{S.busy='';const sv=SV(id);if(sv)sv.paused=on;if(w)w.survey.paused=on;render();toast(on?'New answers paused':'New answers resumed');loadList(true)},
      e=>{S.busy='';render();toast(B.text(e))});return}
  if(d.btype!=null){const q=s.q[+d.btype];q.type=el.value;if(q.type==='mc'&&!q.opts)q.opts=['Option 1','Option 2'];if(q.type==='scale'){q.min=1;q.max=5}saveDrafts();render();return}
  if(d.breq!=null){s.q[+d.breq].req=el.checked;refreshPrev();saveDrafts();return}
  if(d.bshort!=null){s.q[+d.bshort].short=el.checked;saveDrafts();return}
  if(d.ragree){S.sv.agree=el.checked;setErr('rAgreeErr','');return}
  if(d.rans!=null){S.sv.ans[+d.rans]=+d.v;svAnswered(+d.rans);return}
  if(d.ransc!=null){const i=+d.ransc,a=new Set(S.sv.ans[i]||[]);el.checked?a.add(+d.v):a.delete(+d.v);S.sv.ans[i]=[...a].sort();svAnswered(i);return}
  if(d.ransg!=null){const i=+d.ransg;S.sv.ans[i]=Object.assign({},S.sv.ans[i],{[d.r]:+d.v});svAnswered(i);return}
});
document.addEventListener('mouseover',e=>{const c=e.target.closest&&e.target.closest('.col');if(!c)return;const i=+c.dataset.day;if(i===S.day)return;S.day=i;refreshPlot()});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(S.closeAsk){if(!S.busy){S.closeAsk=false;render()}}else if(S.sv){svClose()}else if(S.openRev){S.openRev=null;render()}else if(S.fOpen){S.fOpen=false;render()}else if(S.sideOpen){S.sideOpen=false;render()}return}
  if(e.key==='Enter'&&e.target.matches&&e.target.matches('input.inp,#jLink,#aPw')){const au=S.auth.stage==='register'?'authRegister':'authLogin',m={aEmail:au,aPw:au,jLink:'openLink'}[e.target.id];if(m){e.preventDefault();act(m)}}
});
function fromHash(){const h=(location.hash||'').slice(1);if(!h||!S.authed)return;if(h.startsWith('survey-')){const [,sid,tab]=h.split('-');if(SV(sid)&&!(S.page==='survey'&&S.sid===sid&&S.stab===(tab||S.stab)))openSurvey(sid,tab)}else if(/^(dashboard|surveys|answer|settings|help)$/.test(h))S.page=h;else if(/^finance-(wallet|payouts|refunds)$/.test(h)){S.page='finance';S.finsub=h.slice(8)}}
/* /#how, /#rules and /#start from the other pages scroll to that landing section */
function lpAnchor(){if(S.authed||!S.landing)return;const t=document.getElementById({how:'lp-how',rules:'lp-rules',start:'lp-start'}[(location.hash||'').slice(1)]||'');if(t)t.scrollIntoView()}
try{window.addEventListener('hashchange',()=>{if(S.boot)return;fromHash();render();lpAnchor()})}catch(e){}
/* Phone layout turns table rows into cards; each cell gets its column name as a label */
const labelTables=()=>document.querySelectorAll('table.t').forEach(t=>{const h=[...t.querySelectorAll('thead th')].map(th=>th.textContent.trim());
  t.querySelectorAll('tbody tr').forEach(tr=>[...tr.children].forEach((td,i)=>{if(h[i]&&!td.hasAttribute('data-label'))td.setAttribute('data-label',h[i])}))});
try{new MutationObserver(labelTables).observe(document.getElementById('root'),{childList:true,subtree:true})}catch(e){}

/* ================= start ================= */
/* ?signin=1, ?go=publish|answer and ?s=<survey id> come from the old page addresses and from share links. */
try{const q=new URLSearchParams(location.search),sid=q.get('s'),go=q.get('go');
  if(sid&&/^\d{1,12}$/.test(sid))S.after={s:sid};else if(go==='publish'||go==='answer')S.after=go;
  if(S.after||q.get('signin'))S.landing=false;
  if(location.search)history.replaceState(null,'',location.pathname+location.hash)}catch(e){}
render();
B.session().then(sess=>{if(!sess){S.boot=false;render();lpAnchor()}else if(sess.onboard){S.boot=false;S.landing=false;Object.assign(S.auth,{email:sess.email,sess,stage:'who',idx:0});S.wallet=sess.wallet||'';render()}else enter(sess)},()=>{S.boot=false;render();lpAnchor()});

/* ================= landing (shown before sign-in) ================= */
function vLanding(){
  const steps=[['01','Researcher','Build survey','Google Forms-style builder, three question types.'],['02','Researcher','Fund and lock','One total budget, fee included, split across your quota and locked in tBNB.'],['03','Respondent','Sign in','Email and a verified MetaMask wallet. One submission each.'],['04','Respondent','Answer','Consent and answers. Paid to your verified wallet.'],['05','Code','Code checks','Speed, straight-lining, duplicate text.'],['06','AI','AI label','Labelled twice; flags injection. Can only escalate.'],['07','Rule engine','Decide','Plain code turns signals into Pay, Review or Don\'t pay.']];
  const ev=[['pay','Response #42 · Paid 0.001 tBNB','“Madalas may online class pa ng gabi…”','Taglish · labelled valid twice · BscScan'],['rev','Response #43 · Sent to Review','Instruction-like text flagged','Waits for the researcher, with the AI reason'],['no','Response #44 · Not paid','Required answer was empty','Code-confirmed · logged on-chain']];
  const evIc={pay:I.check,rev:I.clock,no:I.x};
  const orbit=[[I.doc,'Survey','lp-o1'],[I.mail,'Email','lp-o2'],[I.coins,'Escrow','lp-o3'],[I.shield,'Screening','lp-o4'],[I.ai,'AI label','lp-o5'],[I.link,'BscScan','lp-o6']];
  const start=(cls='')=>`<div class="lp-start ${cls}"><button class="btn lp-primary" data-act="lpStart" data-to="publish">Publish a survey</button><button class="btn lp-outline" data-act="lpStart" data-to="answer">Answer a survey</button></div>`;
  return `<div class="lp">
  <header class="lp-nav"><div class="lp-navin"><span class="brand"><span class="logo" aria-hidden="true"></span>ResFunder</span>
    <nav class="lp-links" aria-label="Site"><button data-act="lpScroll" data-to="lp-how">How it works</button><button data-act="lpScroll" data-to="lp-rules">Screening rules</button></nav>
    <span class="lp-navr"><button class="btn ghost" data-act="lpStart" data-to="">Sign in</button><button class="btn dark" data-act="lpStart" data-to="publish" data-stage="register">Get started</button></span></div></header>

  <section class="lp-hero">
    <div class="lp-orbit" aria-hidden="true"><i></i><i></i><i></i>${orbit.map(([ic,l,c])=>`<span class="lp-chip ${c}" title="${l}">${ic}</span>`).join('')}</div>
    <div class="lp-heroin">
      <p class="lp-kicker"><span class="dot"></span>BCC 2026 · AI Agents track <span class="sep">|</span> Built on BNB Smart Chain</p>
      <h1>Fund research.<br>Pay honest answers.</h1>
      <p class="lp-lead">Student researchers lock a small survey budget in a smart contract. Students are paid in seconds by an agent wallet, but only for answers that pass a transparent screening check.</p>
      ${start()}
      <p class="lp-note">One account and wallet covers both. Sign-up takes about a minute.</p>
    </div>
    <div class="lp-stack" aria-label="Example activity"><span class="lp-ex">Example</span>${ev.map(([t,h,dd,m],k)=>`<div class="lp-ev lp-ev${k}"><span class="lp-evic ${t}">${evIc[t]}</span><span><b>${h}</b><span>${dd}</span><small>${m}</small></span></div>`).join('')}</div>
  </section>

  <section class="lp-facts" aria-label="Key facts"><ul>${['BNB Smart Chain testnet','Paid in testnet BNB (tBNB)','Answers labelled twice by an LLM','One flat fee per response','One submission per wallet and email'].map(x=>`<li>${x}</li>`).join('')}</ul></section>

  <section class="lp-how" id="lp-how"><div class="lp-stage"><div class="lp-orb" aria-hidden="true"></div>
    <div class="lp-howhead"><p class="lp-eyebrow">How it works</p><h2>The AI labels. Only the rule engine decides who gets paid.</h2><p>The LLM answers one narrow question: is this a real attempt to answer? It can only send a response to a person. Plain, published code makes every payment decision.</p></div>
    <ol class="lp-steps">${steps.map(([n,w,t,d])=>`<li><div class="lp-sm"><span class="mono">${n}</span><span>${w}</span></div><h3>${t}</h3><p>${d}</p></li>`).join('')}
      <li class="lp-outcome"><span class="lp-sm">Outcome</span><div><span>${I.check}Pay, in seconds</span><span>${I.clock}Review, by the researcher</span><span>${I.x}Don't pay, reason logged</span></div></li></ol></div></section>

  <section class="lp-aud"><h2>Built for thesis budgets, not research labs.</h2><p class="lp-lead2">One flat fee per response, shown in tBNB before you sign. Incumbent panels charge 20–40% and price out a thesis-sized budget.</p>
    <div class="lp-big">${[['1 deposit','Researchers','One total budget, fee included, split across your quota and locked once. Unused budget comes back to your wallet at close.'],['Seconds','Students','Paid the fixed rate in tBNB for an honest answer, with a BscScan receipt. Taglish and short answers are fine.'],['Every','Advisers','Every decision is logged with its reason, the rubric version and the model version.']].map(([b,l,d])=>`<div><p class="lp-num">${b}</p><b>${l}</b><p>${d}</p></div>`).join('')}</div></section>

  <section class="lp-rules" id="lp-rules"><div class="lp-cards">
    <div><span class="lp-tag ok">${I.check}Pay</span><p>No hard failure, at most one weak signal, and both AI checks agree the answer is valid.</p></div>
    <div><span class="lp-tag warn">${I.clock}Review</span><p>Two weak signals, an unclear or non-answer label, disagreeing runs, a failed AI call or an injection flag. The researcher sees the AI reason.</p></div>
    <div><span class="lp-tag bad">${I.x}Don't pay</span><p>Only a code-confirmed failure: an empty answer, a copy of another response, or keyboard mash. Questions that allow short answers skip the empty and gibberish checks.</p></div></div></section>

  <section class="lp-cta" id="lp-start"><div><h2>Which one are you today?</h2><p>Researchers publish and fund surveys. Students answer them and get paid. One account and wallet does both.</p></div>${start('end')}</section>

  <footer class="lp-foot"><span class="brand"><span class="logo" aria-hidden="true"></span>ResFunder</span><p>Fund research. Pay honest answers. Built for BCC 2026. Answers and emails stay off-chain; only wallet addresses and reason hashes go on-chain. Handled under the Data Privacy Act of 2012.</p></footer>
  </div>`;
}

})();
}