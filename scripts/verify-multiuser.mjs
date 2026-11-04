#!/usr/bin/env node
// Multi-user isolation checks (needs a live event, see SETUP.md). Usage: node scripts/verify-multiuser.mjs
const API='http://localhost:1337/api';
let failed=0;const check=(n,ok,x='')=>{console.log(`${ok?'PASS':'FAIL'}  ${n} ${x}`);if(!ok)failed++;};
const call=async(p,{token,...o}={})=>{const r=await fetch(API+p,{...o,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})}});let b=null;try{b=await r.json()}catch{};return{status:r.status,body:b}};
const login=async(e,p)=>{const r=await call('/auth/local',{method:'POST',body:JSON.stringify({identifier:e,password:p})});return {jwt:r.body.jwt,id:r.body.user.id}};
const S=await login('student@colosseum.local','Student123!'),A=await login('alice@colosseum.local','Alice123!'),M=await login('mallory@colosseum.local','Mallory123!');
const events=(await call('/events?pagination[pageSize]=50&sort=start:asc',{token:S.jwt})).body.data;
const now=Date.now();const live=events.find(e=>new Date(e.start)<=now&&new Date(e.end)>=now);const ended=events.find(e=>new Date(e.end)<now);
const probs=async(ev,t)=>(await call(`/events/${ev.documentId}?populate[problems][fields][0]=title&populate[problems][fields][1]=documentId`,{token:t})).body.data.problems;
const p1=(await probs(live,S.jwt)).find(p=>/Function toolbox/.test(p.title));
const lang=(await call('/languages',{token:S.jwt})).body.data[0];
const submit=async(t,pid,code,extra={})=>{const c=await call('/submissions',{method:'POST',token:t,body:JSON.stringify({data:{problem:pid,code,language:lang.documentId,...extra}})});if(c.status!==200)return{c};const s=await call(`/submissions/submit?id=${c.body.data.documentId}`,{token:t});return{c,s,id:c.body.data.documentId}};
const wait=async(t,id)=>{for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,2000));const ex=(await call(`/executions?filters[submission][documentId][$eq]=${id}&populate[testCase]=true`,{token:t})).body.data;if(ex?.length&&ex.every(e=>e.processed))return ex}};

// 1) Alice submits a hardcoded "cheating" solution printing the sample output only
const BS=String.fromCharCode(92)+"n";const cheat=`#include <iostream>
int main(){std::cout<<"max: 12${BS}7 is prime: yes${BS}digit sum of 12: 3${BS}average of 7 and 12: 9.5${BS}";}`;
const ar=await submit(A.jwt,p1.documentId,cheat);check('alice submission queued',!!ar.id);
const aex=await wait(A.jwt,ar.id);check('alice executions processed',!!aex);
check('alice sample passes, hidden tests not leaking stdout/expected',aex.some(e=>e.passed)&&aex.filter(e=>e.testCase?.hidden).every(e=>!e.stdout&&e.testCase.output==null&&e.testCase.input==null));
// 2) Cross-user access
const sSub=(await call(`/submissions?filters[problem][documentId][$eq]=${p1.documentId}`,{token:S.jwt})).body.data[0];
const crossEx=await call(`/executions?filters[submission][documentId][$eq]=${sSub.documentId}&populate[testCase]=true`,{token:A.jwt});
check("alice cannot read student's executions by submission id",(crossEx.body?.data||[]).length===0,`(status ${crossEx.status}, rows ${(crossEx.body?.data||[]).length})`);
const sEx=(await call(`/executions?filters[submission][documentId][$eq]=${sSub.documentId}`,{token:S.jwt})).body.data;
const crossIds=await call(`/submissions/executions?ids=${sEx.map(e=>e.documentId).join(',')}`,{token:A.jwt});
check("alice cannot read student's executions via /submissions/executions",JSON.stringify(crossIds.body).indexOf(sEx[0].stdout.trim().slice(0,8))<0||!(crossIds.body?.data||crossIds.body?.executions||[]).length,`(status ${crossIds.status})`);
check("alice cannot read student's submission code",(await call(`/submissions/${sSub.documentId}`,{token:A.jwt})).status===404);
check("alice cannot re-run student's submission",[403,404].includes((await call(`/submissions/submit?id=${sSub.documentId}`,{token:A.jwt})).status));
const allExec=await call('/executions',{token:A.jwt});check('listing /executions without submission filter is refused',allExec.status===403,`(status ${allExec.status})`);
// 3) Mallory (not registered)
check('mallory cannot open live problem',(await call(`/problems/${p1.documentId}`,{token:M.jwt})).status===403);
const mp=await call(`/problems?filters[event][documentId][$eq]=${live.documentId}`,{token:M.jwt});check('mallory cannot list live-event problems',(mp.body?.data||[]).length===0,`(rows ${(mp.body?.data||[]).length})`);
check('mallory cannot submit',(await submit(M.jwt,p1.documentId,'int main(){}')).c.status===403);
// 4) Anonymous
check('anonymous cannot read submissions',[401,403].includes((await call('/submissions')).status));
check('anonymous cannot read executions',[401,403].includes((await call('/executions')).status));
// 5) User isolation
const upd=await call(`/users/${S.id}`,{method:'PUT',token:A.jwt,body:JSON.stringify({username:'hacked'})});
check("alice cannot modify student's profile",[401,403,404].includes(upd.status),`(status ${upd.status})`);
const oth=await call(`/users/${S.id}`,{token:A.jwt});check("alice cannot read student's user record (email etc.)",[401,403,404].includes(oth.status),`(status ${oth.status}, keys ${Object.keys(oth.body||{}).join(',')})`);
// 6) Ended event
const ep=(await probs(ended,S.jwt))[0];
const ce=await submit(S.jwt,ep.documentId,'int main(){}');check('competition submission to ended event refused',ce.c.status===403);
const pr=await submit(S.jwt,ep.documentId,'int main(){}',{mode:'practice'});check('practice submission to ended event allowed',pr.c.status===200);
const lb=(await call(`/events/${live.documentId}/leaderboard`,{token:A.jwt})).body;
console.log('leaderboard rows:',JSON.stringify((lb.rows||lb.entries||lb.leaderboard||[]).slice(0,4)).slice(0,500));
process.exit(failed?1:0);
