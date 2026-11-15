
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.49.8";

const URL="https://bphvoghvnjlgkakrjtew.supabase.co";
const $=s=>document.querySelector(s);
const clean=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let db=null,user=null,roomId=null,gameId=null,gameCode="",poll=null;
const app=$("#app");

function notice(message){
 const el=$("#toast");el.textContent=message;el.style.display="block";
 setTimeout(()=>el.style.display="none",4000);
}
function show(html){app.innerHTML=html}
function field(label,id,value="",type="text"){
 return `<label for="${id}">${label}</label><input id="${id}" type="${type}" value="${clean(value)}">`;
}
function textarea(label,id,value=""){
 return `<label for="${id}">${label}</label><textarea id="${id}">${clean(value)}</textarea>`;
}
function error(e){console.error(e);notice(e?.message||String(e))}
function needDB(){
 if(db)return true;
 location.hash="settings";notice("יש לחבר תחילה את Supabase");return false;
}
async function init(){
 const key=localStorage.getItem("escape_key");
 if(key){
  db=createClient(URL,key);
  const {data}=await db.auth.getUser();
  user=data.user;
  db.auth.onAuthStateChange((_event,session)=>{
   user=session?.user||null;authStatus();
  });
 }
 authStatus();route();
}
function authStatus(){
 $("#authStatus").textContent=user?(user.is_anonymous?"שחקן אורח":user.email||"מחובר"):"לא מחובר";
}
function home(){
 show(`<section class="hero">
 <div><span class="eyebrow">ESCAPE STUDIO</span>
 <h1>ההרפתקה הבאה מתחילה כאן</h1>
 <p class="lead">צרו חדרי בריחה, בנו חידות מקוריות, שלבו סרטונים ושחקו יחד מכל מחשב.</p>
 <div class="actions"><a class="btn primary" href="#creator">יצירת חדר בריחה</a>
 <a class="btn" href="#join">הצטרפות למשחק</a></div></div>
 <div class="hero-art"><div class="lock">🔐</div><small>ESCAPE STUDIO</small></div></section>
 <section class="grid">
 <article class="card"><div class="emoji">🧩</div><h3>יצירת חידות</h3><p>בנו שלבים עם פתרונות ורמזים.</p></article>
 <article class="card"><div class="emoji">🎬</div><h3>חידות וידאו</h3><p>שלבו סרטוני MP4 בתוך החידות.</p></article>
 <article class="card"><div class="emoji">👥</div><h3>משחק קבוצתי</h3><p>הזמינו חברים באמצעות קוד.</p></article>
 </section>`);
}
function settings(){
 show(`<div class="wide panel"><h2>חיבור Supabase</h2>
 <p class="muted">הזן את המפתח הציבורי בלבד של הפרויקט הקיים. אין להזין מפתח סודי.</p>
 <form id="config">${field("Supabase Publishable / anon key","key",localStorage.getItem("escape_key")||"")}
 <button class="primary">שמירת הגדרות</button></form></div>`);
 $("#config").onsubmit=e=>{
  e.preventDefault();
  const key=$("#key").value.trim();
  if(!key||key.startsWith("sb_secret_")||key.includes("service_role"))return notice("נדרש מפתח ציבורי תקין");
  localStorage.setItem("escape_key",key);
  location.hash="home";location.reload();
 };
}
function login(){
 show(`<div class="wide panel"><h2>כניסת יוצרים</h2>
 <form id="login">${field("דוא״ל","email","","email")}
 ${field("סיסמה","password","","password")}
 <div class="actions"><button class="primary">התחברות</button>
 <button type="button" id="signup">הרשמה חדשה</button></div></form></div>`);
 $("#login").onsubmit=async e=>{
  e.preventDefault();if(!needDB())return;
  const {error:err}=await db.auth.signInWithPassword({
   email:$("#email").value.trim(),password:$("#password").value
  });
  if(err)return error(err);
  user=(await db.auth.getUser()).data.user;
  authStatus();location.hash="creator";route();
 };
 $("#signup").onclick=async()=>{
  if(!needDB())return;
  const {error:err}=await db.auth.signUp({
   email:$("#email").value.trim(),password:$("#password").value
  });
  if(err)return error(err);
  notice("ההרשמה נקלטה. אם נדרש, אשר את כתובת הדוא״ל.");
 };
}
async function creator(){
 if(!needDB())return;
 if(!user||user.is_anonymous)return login();
 show(`<h2>החדרים שלי</h2><div class="panel">טוען...</div>`);
 const {data,error:err}=await db.from("escape_rooms")
  .select("*").order("created_at",{ascending:false});
 if(err)return error(err);
 show(`<div class="item"><h2>החדרים שלי</h2>
 <button class="primary" id="newRoom">＋ חדר חדש</button></div>
 <div class="panel">${(data||[]).map(r=>`
 <div class="item"><div><h3>${clean(r.title)}</h3>
 <p>${clean(r.description||"")}</p>
 <span class="pill">${clean(r.status)}</span></div>
 <div class="actions">
 <button data-edit="${r.id}">עריכה</button>
 <button data-stages="${r.id}">שלבים</button>
 ${r.status==="published"?`<button class="gold" data-host="${r.id}">פתיחת משחק</button>`:""}
 </div></div>`).join("")||'<div class="empty">עדיין אין חדרים.</div>'}</div>
 <button id="logout">התנתקות</button>`);
 $("#newRoom").onclick=()=>roomForm();
 $("#logout").onclick=async()=>{await db.auth.signOut();user=null;location.hash="home"};
 document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editRoom(b.dataset.edit));
 document.querySelectorAll("[data-stages]").forEach(b=>b.onclick=()=>stages(b.dataset.stages));
 document.querySelectorAll("[data-host]").forEach(b=>b.onclick=()=>host(b.dataset.host));
}
function roomForm(r={}){
 show(`<div class="wide panel"><h2>${r.id?"עריכת חדר":"חדר חדש"}</h2>
 <form id="roomForm">${field("שם החדר","title",r.title||"")}
 ${textarea("סיפור רקע ותיאור","description",r.description||"")}
 <label>סגנון</label><select id="category">
 <option value="logic">חידות היגיון</option>
 <option value="mystery">מסתורין</option>
 <option value="history">היסטוריה</option>
 <option value="adventure">הרפתקאות</option></select>
 <label>מצב פרסום</label><select id="status">
 <option value="draft">טיוטה</option>
 <option value="published">מפורסם</option>
 <option value="archived">ארכיון</option></select>
 <button class="primary">שמירת חדר</button></form></div>`);
 $("#category").value=r.category||"logic";
 $("#status").value=r.status||"draft";
 $("#roomForm").onsubmit=async e=>{
  e.preventDefault();
  const payload={
   title:$("#title").value.trim(),
   description:$("#description").value,
   category:$("#category").value,status:$("#status").value
  };
  if(!payload.title)return notice("נא להזין שם חדר");
  const query=r.id?db.from("escape_rooms").update(payload).eq("id",r.id):
   db.from("escape_rooms").insert({...payload,owner_id:user.id});
  const {data,error:err}=await query.select("id").single();
  if(err)return error(err);
  notice("החדר נשמר");stages(data.id);
 };
}
async function editRoom(id){
 const {data,error:err}=await db.from("escape_rooms").select("*").eq("id",id).single();
 if(err)return error(err);roomForm(data);
}
async function stages(id){
 roomId=id;
 const [r,s]=await Promise.all([
  db.from("escape_rooms").select("title,status").eq("id",id).single(),
  db.from("room_stages").select("*").eq("room_id",id).order("position")
 ]);
 if(r.error)return error(r.error);
 if(s.error)return error(s.error);
 show(`<div class="breadcrumbs"><a href="#creator">החדרים שלי</a> / ${clean(r.data.title)}</div>
 <div class="item"><h2>שלבי החדר</h2><button class="primary" id="newStage">＋ שלב חדש</button></div>
 <div class="panel">${(s.data||[]).map(st=>`
 <div class="item"><div><span class="stage-no">שלב ${st.position}</span>
 <h3>${clean(st.title)}</h3><p>${clean(st.puzzle_prompt)}</p></div>
 <button data-stage="${st.id}">עריכה</button></div>`).join("")||'<div class="empty">עדיין אין שלבים.</div>'}</div>
 ${r.data.status==="published"?'<button class="gold" id="host">פתיחת משחק</button>':""}`);
 $("#newStage").onclick=()=>stageForm();
 if($("#host"))$("#host").onclick=()=>host(id);
 document.querySelectorAll("[data-stage]").forEach(b=>b.onclick=()=>editStage(b.dataset.stage));
}
function parseStory(s){
 try{const o=JSON.parse(s);if(o.__escapeStudioVideoV1)return o}catch{}
 return {text:s||"",video:""};
}
function stageForm(st={},secret={}){
 const story=parseStory(st.narrative);
 show(`<div class="wide panel"><h2>${st.id?"עריכת שלב":"שלב חדש"}</h2>
 <form id="stageForm">
 ${field("מספר שלב","position",st.position||1,"number")}
 ${field("כותרת","title",st.title||"")}
 ${textarea("סיפור רקע","narrative",story.text)}
 ${textarea("שאלת החידה","prompt",st.puzzle_prompt||"")}
 ${field("כתובת HTTPS של סרטון MP4/WebM","video",story.video||"","url")}
 ${field("רמז ראשון","hint1",st.hint_1||"")}
 ${field("רמז שני","hint2",st.hint_2||"")}
 ${field("רמז שלישי","hint3",st.hint_3||"")}
 ${field("פתרון נכון","answer",secret.answer_normalized||"")}
 ${textarea("הסבר הפתרון","explanation",secret.explanation||"")}
 <button class="primary">שמירת שלב</button></form>
 <p class="muted">בגרסה זו אפשר לקשר לסרטון קיים. יצירת סרטון AI תתווסף בהמשך.</p></div>`);
 $("#stageForm").onsubmit=async e=>{
  e.preventDefault();
  const video=$("#video").value.trim();
  if(video){
   try{
    const u=new URL(video);
    if(u.protocol!=="https:"||!/\.(mp4|webm)$/i.test(u.pathname))throw Error();
   }catch{return notice("נדרש קישור HTTPS ישיר לקובץ MP4 או WebM")}
  }
  const answer=$("#answer").value.trim();
  if(!answer)return notice("נא להזין פתרון");
  const storyText=$("#narrative").value;
  const payload={
   room_id:roomId,
   position:Number($("#position").value),
   title:$("#title").value.trim(),
   narrative:video?JSON.stringify({__escapeStudioVideoV1:true,text:storyText,video}):storyText,
   puzzle_prompt:$("#prompt").value.trim(),
   hint_1:$("#hint1").value||null,
   hint_2:$("#hint2").value||null,
   hint_3:$("#hint3").value||null
  };
  if(!payload.title||!payload.puzzle_prompt||payload.position<1)return notice("חסרים פרטי שלב");
  const q=st.id?db.from("room_stages").update(payload).eq("id",st.id):
   db.from("room_stages").insert(payload);
  const {data,error:err}=await q.select("id").single();
  if(err)return error(err);
  const {error:se}=await db.from("puzzle_secrets").upsert({
   stage_id:data.id,answer_normalized:answer,
   explanation:$("#explanation").value
  });
  if(se)return error(se);
  notice("השלב נשמר");stages(roomId);
 };
}
async function editStage(id){
 const {data,error:err}=await db.from("room_stages").select("*").eq("id",id).single();
 if(err)return error(err);
 roomId=data.room_id;
 const {data:secret,error:se}=await db.from("puzzle_secrets")
  .select("answer_normalized,explanation").eq("stage_id",id).maybeSingle();
 if(se)return error(se);
 stageForm(data,secret||{});
}
async function host(id){
 if(!needDB())return;
 const {data,error:err}=await db.rpc("create_escape_game",{p_room:id});
 if(err)return error(err);
 gameId=data.session_id;gameCode=data.join_code;
 location.hash="game";game();
}
function join(){
 show(`<div class="wide panel"><h2>הצטרפות למשחק</h2>
 <p class="muted">הזן קוד משחק ושם שחקן. אין צורך בהרשמה.</p>
 <form id="joinForm">${field("קוד משחק","code")}
 ${field("שם השחקן","name")}
 <button class="primary">הצטרפות</button></form></div>`);
 $("#joinForm").onsubmit=async e=>{
  e.preventDefault();if(!needDB())return;
  if(!user){
   const {data,error:err}=await db.auth.signInAnonymously();
   if(err)return error(err);
   user=data.user;authStatus();
  }
  const {data,error:err}=await db.rpc("join_escape_game",{
   p_code:$("#code").value.trim(),
   p_name:$("#name").value.trim()
  });
  if(err)return error(err);
  if(!data?.ok)return notice("הקוד שגוי או שהמשחק אינו זמין");
  gameId=data.session_id;gameCode="";
  location.hash="game";game();
 };
}
async function game(){
 if(!gameId){
  show('<div class="panel empty">אין משחק פעיל. הצטרף באמצעות קוד.</div>');
  return;
 }
 clearInterval(poll);
 await refreshGame();
 poll=setInterval(()=>{if(location.hash==="#game")refreshGame()},5000);
}
async function refreshGame(){
 const previous=$("#answerInput")?.value||"";
 const {data,error:err}=await db.rpc("get_game_state",{p_session:gameId});
 if(err)return error(err);
 const st=data.stage,story=st?parseStory(st.narrative):null;
 const hostMode=!!gameCode;
 show(`<div class="split">
 <div class="panel"><span class="eyebrow">ESCAPE STUDIO LIVE</span>
 <h2>מצב המשחק: ${clean(data.status)}</h2>
 ${gameCode?`<p>קוד כניסה: <strong class="code">${clean(gameCode)}</strong></p>`:""}
 <p>שלב נוכחי: ${clean(data.current_position)}</p>
 <h3>שחקנים</h3>
 <div class="players">${(data.players||[]).map(p=>`<span class="player">👤 ${clean(p.display_name)}</span>`).join("")}</div>
 ${hostMode?`<div class="actions">
 <button data-control="start" class="gold">התחלה</button>
 <button data-control="pause">השהיה</button>
 <button data-control="resume">המשך</button>
 <button data-control="finish" class="danger">סיום</button></div>`:""}
 </div>
 <div class="panel">
 <span class="stage-no">שלב ${clean(data.current_position)}</span>
 <h2>${clean(st?.title||"ממתינים לשלב הבא")}</h2>
 ${story?.video?`<video class="video" controls playsinline preload="metadata" src="${clean(story.video)}"></video>`:""}
 <p class="muted">${clean(story?.text||"")}</p>
 <div class="puzzle">${clean(st?.puzzle_prompt||"")}</div>
 ${st&&data.status==="active"&&!hostMode?
 `<form id="answerForm">${field("הפתרון שלך","answerInput",previous)}
 <button class="primary">בדיקת פתרון</button></form>`:""}
 </div></div>`);
 document.querySelectorAll("[data-control]").forEach(b=>b.onclick=async()=>{
  const {error:ce}=await db.rpc("control_escape_game",{
   p_session:gameId,p_action:b.dataset.control
  });
  if(ce)return error(ce);
  notice("מצב המשחק עודכן");refreshGame();
 });
 if($("#answerForm"))$("#answerForm").onsubmit=async e=>{
  e.preventDefault();
  const {data:result,error:ae}=await db.rpc("submit_game_answer",{
   p_session:gameId,p_answer:$("#answerInput").value
  });
  if(ae)return error(ae);
  notice(result.correct?"כל הכבוד! פתרתם את החידה!":"התשובה אינה נכונה");
  if(result.correct)refreshGame();
 };
}
function route(){
 clearInterval(poll);
 switch(location.hash.replace("#","")){
  case "settings":settings();break;
  case "creator":creator();break;
  case "join":join();break;
  case "game":game();break;
  default:home();
 }
}
window.addEventListener("hashchange",route);
init();
