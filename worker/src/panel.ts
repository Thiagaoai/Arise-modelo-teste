// Painel da equipe: página estática; os dados vêm de /admin/* com o ADMIN_TOKEN guardado só na sessão do navegador.
export const PANEL_HTML = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ARISE · Painel do Tutor</title>
<style>
:root{--bg:#f6f5f2;--card:#fff;--ink:#1f2328;--mut:#6b7280;--line:#e5e2dc;--acc:#7a3e1d;--ok:#2f6f4f;--warn:#a15c00;--bad:#a52a2a}
@media (prefers-color-scheme:dark){:root{--bg:#16181b;--card:#1f2226;--ink:#e8e6e1;--mut:#9aa0a6;--line:#2e3238;--acc:#d9a066;--ok:#6fbf94;--warn:#e0a84a;--bad:#e07a7a}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1000px;margin:0 auto;padding:20px 16px 60px}h1{font-size:20px;margin:0}h2{font-size:15px;margin:28px 0 10px}
header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap}.sub{color:var(--mut);font-size:13px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.n{font-size:26px;font-weight:650;font-variant-numeric:tabular-nums}.l{color:var(--mut);font-size:12.5px}
.tabs{display:flex;gap:6px;margin:6px 0 10px;flex-wrap:wrap}button{font:inherit;cursor:pointer}
.tab{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:5px 12px}.tab[aria-pressed=true]{background:var(--acc);color:#fff;border-color:var(--acc)}
.msg{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:8px}
.meta{display:flex;gap:8px;flex-wrap:wrap;color:var(--mut);font-size:12.5px;align-items:center}
.tag{border-radius:999px;padding:1px 8px;font-size:12px;border:1px solid var(--line)}.t-ok{color:var(--ok)}.t-warn{color:var(--warn)}.t-bad{color:var(--bad)}
.q{margin:6px 0 2px;font-weight:600;white-space:pre-wrap}.a{color:var(--ink);white-space:pre-wrap;margin:4px 0 0;display:none;border-top:1px dashed var(--line);padding-top:6px}
.msg.open .a{display:block}.more{background:none;border:0;color:var(--acc);padding:0;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:13.5px}td,th{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left}
#gate{max-width:380px;margin:18vh auto;text-align:center}input{font:inherit;width:100%;padding:9px 11px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);margin:10px 0}
.go{background:var(--acc);color:#fff;border:0;border-radius:8px;padding:9px 16px}.err{color:var(--bad);min-height:1.4em;font-size:13px}
</style></head><body>
<div id="gate"><h1>Painel do Tutor</h1><p class="sub">ARISE School · acesso da equipe</p>
<input id="tok" type="password" placeholder="Chave de acesso" autocomplete="off"><button class="go" id="enter">Entrar</button><div class="err" id="err"></div></div>
<main id="app" hidden>
<header><div><h1>Tutor de Apocalipse · Painel</h1><div class="sub">Visão da equipe. As conversas ficam registradas e os alunos são avisados.</div></div><button class="tab" id="out">Sair</button></header>
<div class="grid" id="cards"></div>
<h2>Atividade nos últimos 7 dias</h2><div class="card"><table id="days"></table></div>
<h2>Mensagens</h2>
<div class="tabs" id="tabs"></div><div id="list"></div>
</main>
<script>
const $=s=>document.querySelector(s);let T=sessionStorage.getItem('t')||'';
const KIND={answer:'Resposta',blocked_profanity:'Linguagem bloqueada',blocked_offtopic:'Fora do tema',blocked_jailbreak:'Tentativa de burla',blocked_otherbook:'Outro livro',smalltalk:'Conversa curta',chapter_missing:'Capítulo ainda sem base',error:'Erro',tts:'Áudio',voice_in:'Áudio recebido'};
const FLAG={tarefa:['Pedido de tarefa','warn'],pastoral:['Cuidado pastoral','bad'],revisada:['Citação revisada','warn'],nao_verificada:['Citação não verificada','bad'],saida_ofensiva:['Saída trocada','bad'],linguagem:['Linguagem','bad']};
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function api(p){const r=await fetch(p,{headers:{Authorization:'Bearer '+T}});if(r.status===403)throw new Error('forbidden');return r.json()}
async function load(){
 const [st,ms]=await Promise.all([api('/admin/stats'),api('/admin/messages?limit=120&only='+(window.only||'answers'))]);
 const a=st.attention,rt=st.ratings,k=Object.fromEntries(st.kinds.map(x=>[x.kind,x.n]));
 const blocked=st.kinds.filter(x=>x.kind.startsWith('blocked')).reduce((s,x)=>s+x.n,0);
 $('#cards').innerHTML=[
  [st.students.active+' / '+st.students.n,'alunos ativos / cadastrados'],[k.answer||0,'respostas (30 dias)'],
  [blocked,'bloqueios (linguagem, fora do tema, burla)'],[a.pastoral,'pedidos de cuidado pastoral'],
  [a.tarefa,'pedidos de tarefa pronta (recusados)'],[a.nao_verificada,'citações que não puderam ser conferidas'],
  [rt.up+' 👍 / '+rt.down+' 👎','avaliações dos alunos'],['US$ '+st.cost_30d_usd.toFixed(2),'custo do modelo (30 dias)']
 ].map(([n,l])=>'<div class="card"><div class="n">'+esc(n)+'</div><div class="l">'+esc(l)+'</div></div>').join('');
 $('#days').innerHTML='<tr><th>Dia</th><th>Respostas</th><th>Bloqueios</th><th>Alunos ativos</th></tr>'+(st.days.map(d=>'<tr><td>'+d.day+'</td><td>'+d.answers+'</td><td>'+d.blocked+'</td><td>'+d.active_students+'</td></tr>').join('')||'<tr><td colspan=4 class="sub">Sem atividade ainda.</td></tr>');
 const tabs=[['answers','Respostas'],['flagged','Precisam de atenção'],['all','Tudo']];
 $('#tabs').innerHTML=tabs.map(([v,l])=>'<button class="tab" data-v="'+v+'" aria-pressed="'+((window.only||'answers')===v)+'">'+l+'</button>').join('');
 document.querySelectorAll('#tabs .tab').forEach(b=>b.onclick=()=>{window.only=b.dataset.v;load()});
 $('#list').innerHTML=ms.map(m=>{
  const fl=(m.flags||'').split(',').filter(Boolean).map(f=>{const x=FLAG[f];return x?'<span class="tag t-'+x[1]+'">'+x[0]+'</span>':''}).join('');
  const rating=m.rating===1?'<span class="tag t-ok">👍</span>':m.rating===0?'<span class="tag t-bad">👎</span>':'';
  return '<div class="msg"><div class="meta"><span>'+esc(m.ts)+' UTC</span><span>'+esc(m.name||m.tg_id)+'</span><span class="tag">'+esc(KIND[m.kind]||m.kind)+'</span>'+fl+rating+'</div>'
  +(m.notes?'<div class="meta t-bad">Não conferido: '+esc(m.notes)+'</div>':'')+'<div class="q">'+esc(m.question)+'</div><button class="more" onclick="this.parentNode.classList.toggle(\\'open\\')">ver resposta</button><div class="a">'+esc(m.answer)+'</div></div>'}).join('')||'<p class="sub">Nada por aqui ainda.</p>';
}
async function enter(){T=$('#tok').value.trim()||T;try{await api('/admin/stats');sessionStorage.setItem('t',T);$('#gate').hidden=true;$('#app').hidden=false;load()}catch(e){$('#err').textContent='Chave inválida.'}}
$('#enter').onclick=enter;$('#tok').onkeydown=e=>{if(e.key==='Enter')enter()};$('#out').onclick=()=>{sessionStorage.removeItem('t');location.reload()};
if(T)enter();
</script></body></html>`;
