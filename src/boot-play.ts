export {}

const root=document.documentElement
root.dataset.playBoot='loading'
function detail(v:unknown){if(v instanceof Error)return`${v.name}: ${v.message}\n${v.stack??''}`.trim();if(typeof v==='string')return v;try{return JSON.stringify(v,null,2)}catch{return String(v)}}
function fail(v:unknown){root.dataset.playBoot='failed';console.error('[PLAY] startup failed',v);let p=document.querySelector<HTMLElement>('#playError');if(!p){p=document.createElement('section');p.id='playError';Object.assign(p.style,{position:'fixed',zIndex:'99999',top:'16px',right:'16px',width:'min(560px,calc(100vw - 32px))',maxHeight:'70vh',overflow:'auto',padding:'14px 16px',borderRadius:'14px',background:'rgba(72,31,31,.94)',color:'#fff7f0',border:'1px solid rgba(255,255,255,.2)',boxShadow:'0 18px 50px rgba(0,0,0,.25)',font:'12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',whiteSpace:'pre-wrap',wordBreak:'break-word'});document.body.append(p)}p.textContent=`可玩模式启动失败\n\n${detail(v)}\n\n可打开 /lab.html 查看 V22 评测实验室。`}
window.addEventListener('error',e=>{if(root.dataset.playBoot!=='ready')fail(e.error??e.message)})
window.addEventListener('unhandledrejection',e=>{if(root.dataset.playBoot!=='ready')fail(e.reason)})
void import('./main-play').then(()=>{root.dataset.playBoot='ready';document.querySelector('#playError')?.remove()}).catch(fail)
