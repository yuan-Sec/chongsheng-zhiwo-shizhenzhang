'use strict';
if(!document.querySelector('link[data-ui-overhaul]')){const link=document.createElement('link');link.rel='stylesheet';link.href='ui-overhaul.css';link.dataset.uiOverhaul='true';document.head.appendChild(link);}
const $=id=>document.getElementById(id),G=Game,KEY='linjiang-save-v1',fmt=n=>Number(n).toLocaleString('zh-CN',{maximumFractionDigits:1}),escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=G.initial(),tool='inspect',tab='overview',selected=null,timer,worldView='map';
try{const saved=localStorage.getItem(KEY);if(saved)state=G.validate(JSON.parse(saved));}catch(e){setTimeout(()=>toast('存档读取失败，已创建新局：'+e.message),200);}
if(state.level>0)worldView='region';
function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),4000);}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));$('savestatus').textContent='已自动保存 · '+new Date().toLocaleTimeString('zh-CN');}catch{$('savestatus').textContent='自动保存不可用，请导出存档';}}
function date(m){return '第 '+(Math.floor(m/12)+1)+' 年 '+(m%12+1)+' 月';}
function act(error){if(error){toast(error);return;}persist();render();}
const row=(a,b,cls='')=>`<div class="row"><span>${a}</span><strong class="${cls}">${b}</strong></div>`;
const meter=(label,value)=>`${row(label,fmt(value)+'%')}<div class="meter"><span style="width:${Math.max(0,Math.min(100,value))}%"></span></div>`;
let mapMode='3d';
const city3d=new City3D($('scene3d'),i=>{selected=i;if(tool==='inspect'){if(!['land','livelihood','industry'].includes(tab))tab='overview';render();}else act(G.build(state,i,tool,$('funding').value));});
let lastTier=state.level;
function render(){const m=G.metrics(state),office=G.Career.current(state),regional=G.Career.world(state); if(state.level>0&&lastTier!==state.level){worldView='region';}lastTier=state.level;
 $('stats').innerHTML=[['可用财政',fmt(state.cash),'万'],['常住人口',fmt(state.pop),'人'],['居民满意',fmt(state.happiness),' / 100'],['月度结余',(m.balance>=0?'+':'')+fmt(m.balance),'万'],['声誉',fmt(state.reputation),' / 100']].map(([a,b,c])=>`<div class="stat"><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`).join('');
 $('location').textContent=G.Career.roleScope(office);$('date').textContent=state.ended?'职业生涯结束':date(state.month)+' · '+office.title;
 if(state.level>0)$('stats').innerHTML=[['本级工作资金',fmt(regional.cash/10000),'亿元'],['辖区人口',fmt(regional.regions.reduce((n,x)=>n+x.pop,0)/10000),'万人'],['综合治理',fmt(G.Career.macroScore(state)),'/100'],['现任职务',office.title,''],['公众声誉',fmt(state.reputation),'/100']].map(([a,b,c])=>`<div class="stat"><small>${a}</small><strong>${b}</strong><em>${c}</em></div>`).join('');
 $('map').className='map '+$('layer').value;
 $('map').style.gridTemplateColumns=`repeat(${state.width},minmax(30px,1fr))`;$('map').style.gridTemplateRows=`repeat(${state.height},minmax(30px,1fr))`;$('map').style.minWidth=state.width*31+'px';$('map').style.height=state.height*31+'px';
 $('mapsize').textContent=state.width+' × '+state.height+' 格';$('expandmap').disabled=state.level>0||!!state.ended;
 $('flatmap').hidden=mapMode==='3d';$('scene3d').hidden=mapMode!=='3d';$('mode3d').textContent=mapMode==='3d'?'切换平面':'切换 3D';
 $('map').innerHTML=state.cells.map((c,i)=>{let mark=civicMapLabel(state,i),proposal=state.projects.find(p=>p.cell===i),t=G.TYPES[c.type],name=t?.name||({hall:'镇中心',river:'河流',empty:'空地'}[c.type]);let disconnected=t&&c.type!=='road'&&!adjacent(i).some(j=>m.linked.has(j));return `<button class="tile ${c.type} ${proposal?'proposed':''} ${c.wait?'waiting':''} ${disconnected?'disconnected':''}" data-cell="${i}" aria-label="${Math.floor(i/state.width)+1}行${i%state.width+1}列 ${name}${proposal?'，项目申报中':''}${c.wait?'，在建 '+c.wait+' 月':''}${disconnected?'，未连通道路':''}" title="${name}${c.wait?' · 还需 '+c.wait+' 月':''}${disconnected?' · 未连通':''}">${t&&c.type!=='road'||c.type==='hall'?`<span class="building">${c.type==='park'?'♣':t?.icon||'政'}</span>`:''}${mark?'<span class="badge">'+mark+'</span>':proposal?'<span class="badge">审</span>':c.wait?`<span class="badge">${c.wait}月</span>`:''}</button>`;}).join('');
 $('tools').innerHTML=[['inspect','查看','地块信息'],...Object.entries(G.TYPES).map(([k,v])=>[k,v.name,v.cost+'万']),['demolish','拆除','10万']].map(([k,name,cost])=>`<button data-tool="${k}" class="${tool===k?'active':''}" aria-pressed="${tool===k}" ${state.level>0&&k!=='inspect'?'disabled':''}>${name}<span>${cost}</span></button>`).join('');
 const t=G.TYPES[tool];$('selection').innerHTML=`<strong>${t?t.name:tool==='demolish'?'拆除模式':'查看模式'}</strong><br>${t?escape(t.desc)+' 每月维护 '+t.up+' 万。':tool==='demolish'?'点击已有建筑拆除。已投入费用不返还。':'点击地块查看信息；或选建筑，在道路附近动工。'}`;
 $('tabs').innerHTML=[['overview',state.level>0?'基层概览':'概览'],['finance',state.level>0?'基层财政':'财政'],['people',state.level>0?'基层人员':'人事'],['events',(state.level>0?'上报事件':'事件')+(state.events.length?' '+state.events.length:'')],['land','土地'],['livelihood','民生'],['industry','产业'],['career','任职'],['logs','记录']].map(([k,v])=>`<button data-tab="${k}" class="${tab===k?'active':''}" aria-current="${tab===k?'page':'false'}">${v}</button>`).join('');
 $('next').disabled=!!state.ended;$('quarter').disabled=!!state.ended;
 renderPanel(m);renderRegional();renderBrief();if(mapMode==='3d'&&worldView==='map')city3d.render(state,selected,$('layer').value);if(worldView!=='map')$('selection').innerHTML='<strong>'+office.title+'</strong><br>每月结算并反馈提案与任职进度；季度推进可能产生事件逾期。';else if(state.level>0)$('selection').innerHTML='<strong>基层联系点 · 只读</strong><br>本级工作请切换辖区治理，基层旧账持续结算。';
}
function adjacent(i){return G.neighbors(state,i);}
function renderPanel(m){let html='';
 if(['land','livelihood','industry'].includes(tab)){html=civicPanel(tab,m);
 }else if(tab==='overview'){
 html='<h2>'+(state.level>0?'基层联系点概览':'城市运行概览')+'</h2><p class="muted">把有限的资源，花在城市最需要的地方。</p>';
 if(state.ended)html+=`<div class="end"><strong>${escape(state.ended)}</strong><p>人口 ${fmt(state.pop)} · 满意度 ${fmt(state.happiness)}</p><button data-action="new">开启新任期</button></div>`;
 else html+=`<div class="notice"><strong>${m.balance<0?'本月预计赤字 '+fmt(-m.balance)+' 万':'财政可以覆盖本月支出'}</strong><br>${m.education<30?'学校建成后，还需要招录教师。':m.health<30?'医疗覆盖不足，考虑建设医院并招录医生。':state.events.length?'有 '+state.events.length+' 件待办事件，请及时处理。':'保持收支平衡，稳步完善公共服务。'}</div>`;
 if(selected!==null){const c=state.cells[selected],t=G.TYPES[c.type];html+=`<h3>地块 · ${Math.floor(selected/state.width)+1} 行 ${selected%state.width+1} 列</h3><p>${escape(t?.name||({empty:'待开发空地',river:'河流，可建桥，费用为道路的三倍',hall:'城镇行政中心'}[c.type]))}${c.wait?' · 预计 '+c.wait+' 个月后完工':''}</p>`;}
 html+=meter('就业覆盖',m.employment)+meter('教育覆盖',m.education)+meter('医疗覆盖',m.health)+meter('水电保障',m.utility*100)+row('环境污染',fmt(state.pollution)+'/100',state.pollution>50?'warn':'')+row('住宅容量',fmt(m.capacity)+' 人');
 html+='<h3>治理联动</h3>'+meter('民生保障指数',G.Civic.index(state))+row('土地收入依赖（近12月）',fmt(G.Civic.dependency(state))+'%')+row('招商新增岗位',fmt(m.enterprise.jobs)+' 个')+row('年度工程承诺',fmt(m.commitmentCost)+' 万/月');
 html+='<h3>长期职业生涯</h3>'+`<div class="meter progress"><span style="width:${state.month/G.Career.LIMIT*100}%"></span></div><p class="muted">已完成 ${state.month} / ${G.Career.LIMIT} 个月。每五年归档，进入任职页查看考察条件。</p>`;
 html+='<h3>年度重点工作</h3>';
 if(state.agenda){const a=G.AGENDAS[state.agenda.id],as=G.agendaScore(state,m);html+=`<div class="notice"><strong>${a.name}</strong><br><span class="muted">${a.desc}</span>${meter('当前完成度',as)}<span class="muted">年末将按完成度影响年度考核，选择后本年度不能更换。</span></div>`;}
 else html+='<p class="muted">每年选择一条主线，目标会改变考核权重与治理取舍。</p><div class="agenda-grid">'+Object.entries(G.AGENDAS).map(([k,a])=>`<button data-agenda="${k}"><strong>${a.name}</strong><small>${a.desc}</small></button>`).join('')+'</div>';
 }else if(tab==='finance'){
 html='<h2>预算与项目资金</h2><p class="muted">一般财力与专项工程款分账；债券不是可任意支用的收入。</p>';
 html+=row('一般财力余额',fmt(state.cash)+' 万')+row('年度建设预算',fmt(state.budget.spent)+' / '+fmt(state.budget.limit)+' 万')+row('基本运转三月预留',fmt(m.operating*3)+' 万')+row('累计应付欠款',fmt(state.payables)+' 万',state.payables?'warn':'');
 html+=row('民生政策月支出（含在民生项）',fmt(m.policyCost)+' 万')+row('年度承诺月度工程款',fmt(m.commitmentCost)+' 万')+row('土地建设专账（不付工资）',fmt(state.civic.landFund)+' 万')+row('近12月土地收入依赖',fmt(G.Civic.dependency(state))+'%');
 html+='<h3>下月一般财力预测</h3>'+row('本地税收归属',fmt(m.tax)+' 万')+row('转移支付',fmt(m.grant)+' 万')+row('收入合计',fmt(m.income)+' 万','good')+row('人员工资',fmt(m.wages)+' 万')+row('设施运转',fmt(m.upkeep)+' 万')+row('基本民生',fmt(m.welfare)+' 万')+row('存量利息',fmt(m.legacyInterest)+' 万')+row('专项偿债需一般财力补足',fmt(m.generalService)+' 万')+row('偿付历史欠款',fmt(state.payables)+' 万')+row('转入准备金',fmt(m.reserve)+' 万')+row('预计结余',fmt(m.balance)+' 万',m.balance<0?'warn':'good');
 html+=`<h3>民生与风险准备</h3>${[['welfare','民生投入',10,100,'档'],['reserve','准备金比例',0,8,'%']].map(([k,label,min,max,unit])=>`<label class="field"><span>${label}<strong>${state.policy[k]}${unit}</strong></span><input type="range" data-policy="${k}" aria-label="${label}" min="${min}" max="${max}" value="${state.policy[k]}" ${state.ended?'disabled':''}></label>`).join('')}<p class="muted">税收归属使用固定模拟系数，玩家没有任意调税权限。行政人员影响办事能力，不直接决定税务征收。</p>`;
 html+='<h3>专项项目账户</h3>'+row('待付工程专款',fmt(state.specialCash)+' 万')+row('项目偿债资金',fmt(state.projectReserve)+' 万')+row('下月项目收费收入',fmt(m.projectRevenue)+' 万')+row('专项债本金',fmt(m.specialDebt)+' 万')+row('下月专项利息',fmt(m.specialInterest)+' 万')+row('下月到期本金',fmt(m.specialPrincipal)+' 万')+row('综合债务 / 年收入',fmt(m.debtRatio)+'%',m.debtRatio>=70?'warn':'');
 html+='<p class="muted">选择专项资金后，在地图申报水厂或电站。审核通过后专款随工程进度支付，不能发工资、付事件费用或偿债。收费收入先服务项目债务，不足部分体现财政压力。</p><p class="muted">本版模拟参数：审核 2 个月、年利率 2.8%、36 个月还本、年度项目额度 600 万；不代表现实审批结果或统一标准。</p>';
 html+=state.projects.map(p=>row(G.TYPES[p.type].name+'申报',Math.max(0,p.due-state.month)+' 月后审核')).join('');
 html+=state.loans.filter(l=>l.balance>0).map(l=>row('项目 '+(l.cell+1)+' · '+fmt(l.balance)+' 万',l.due>state.month?(l.due-state.month)+' 月后还本':'本金已到期')).join('');
 html+='<h3>存量融资化解</h3>'+row('旧存档存量本金',fmt(state.debt)+' 万')+row('一般偿债准备金',fmt(state.reserve)+' 万')+`<div class="actions"><button data-action="repay" ${state.ended||!state.debt?'disabled':''}>偿还存量本金 ≤200 万</button></div><p class="muted">取消直接新增城投融资；旧存档债务继续计息与偿还。</p>`;
 if(state.last)html+=`<div class="notice">上月基本支出缺口 ${fmt(state.last.basicGap||0)} 万；全部应付缺口 ${fmt(state.last.gap)} 万。欠款留在台账，不会在月末消失。</div>`;
 }else if(tab==='people'){
 html=staffingPanel(m);
 }else if(tab==='events'){
 html='<h2>事件与居民来信</h2><p class="muted">原创虚构事件，每两个月新增一件；三个月内处置。</p>';
 html+=state.events.length?state.events.map(e=>{let def=G.EVENTS[e.kind];return `<article class="event"><h3>${def.title}</h3><p class="muted">还剩 ${e.deadline-state.month} 个月</p><p>${def.body}</p>${def.choices.map((c,i)=>`<button data-event="${e.id}" data-choice="${i}" ${state.ended||state.cash<c[1]?'disabled':''}>${c[0]}</button>`).join('')}</article>`;}).join(''):'<div class="notice">目前没有待办来信。推进月份后，会出现新的治理议题。</div>';
 }else if(tab==='career'){
 html=careerPanel();
 }else{
 html='<h2>城市运行记录</h2><p class="muted">建设、处置与结算记录均会进入存档。</p>';
 if(state.history.length){let max=Math.max(1,...state.history.map(h=>h.pop));html+='<h3>人口变化 · 最近 '+state.history.length+' 个月</h3><div class="chart" aria-label="人口趋势">'+state.history.map(h=>`<span style="height:${h.pop/max*100}%" title="第${h.month}个月：${h.pop}人"></span>`).join('')+'</div>';}
 html+=state.log.map(l=>`<div class="log"><small>履职第 ${l.month} 个月</small>${escape(l.text)}</div>`).join('');
 }
 $('panel').innerHTML=html;
}
$('map').addEventListener('click',e=>{const b=e.target.closest('[data-cell]');if(!b)return;selected=Number(b.dataset.cell);if(tool==='inspect'){if(!['land','livelihood','industry'].includes(tab))tab='overview';render();}else{const err=G.build(state,selected,tool,$('funding').value);act(err);if(!err)toast(tool==='demolish'?'已拆除':$('funding').value==='special'?'已上报项目，等待审核':'建设已安排');}});
$('map').addEventListener('keydown',e=>{let b=e.target.closest('[data-cell]');if(!b)return;let n=Number(b.dataset.cell),delta=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-state.width,ArrowDown:state.width})[e.key];if(delta){e.preventDefault();$('map').querySelector(`[data-cell="${Math.max(0,Math.min(state.width*state.height-1,n+delta))}"]`)?.focus();}});
$('tools').addEventListener('click',e=>{const b=e.target.closest('[data-tool]');if(b){tool=b.dataset.tool;render();}});
$('tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){tab=b.dataset.tab;render();}});
$('layer').onchange=render;
$('mode3d').onclick=()=>{mapMode=mapMode==='3d'?'2d':'3d';render();};
$('expandmap').onclick=()=>{show(`<h2>扩展城市地图</h2><p>当前 ${state.width}×${state.height} 格。向东、向南增加可规划空地，保留原城市与项目账目。扩大规划范围不收费，实际建设仍受预算约束。上限 64×64 格。</p><label>宽度 <input id="mapwidth" type="number" min="${state.width}" max="64" value="${Math.min(64,state.width+6)}"></label><label>高度 <input id="mapheight" type="number" min="${state.height}" max="64" value="${Math.min(64,state.height+6)}"></label><div class="actions"><button id="doexpand" class="primary">扩展地图</button></div>`);$('doexpand').onclick=()=>{const old=state.width,xy=selected===null?null:[selected%old,Math.floor(selected/old)];const err=G.expand(state,Number($('mapwidth').value),Number($('mapheight').value));if(err)return toast(err);if(xy)selected=xy[1]*state.width+xy[0];$('dialog').close();city3d.reset();act(null);toast('地图已扩展，原城市完整保留。');};};

function advance(months){const reviews=state.reviews.length,role=state.career.role,stage=state.career.application?.stage;
 for(let i=0;i<months;i++){const err=G.next(state);if(err){toast(err);break;}if(state.ended||state.reviews.length>reviews||state.career.role!==role||state.career.application?.stage!==stage)break;}
 persist();render();if(state.ended){show('<h2>职业生涯结算</h2><p>'+escape(state.ended)+'</p>'+row('最终岗位',G.Career.current(state).title)+row('履职月份',state.month)+row('年度报告',state.reviews.length+' 份')+'<p>仍可查看并导出履历及台账。</p>');}else if(state.reviews.length>reviews||state.career.role!==role){tab='career';render();toast(state.career.role!==role?'任职程序完成，治理范围已更新。':'年度考核已归档。');}}
$('next').onclick=()=>advance(1);$('quarter').onclick=()=>advance(3);

$('panel').addEventListener('change',e=>{const key=e.target.dataset.policy;if(['welfare','reserve'].includes(key)&&!state.ended){state.policy[key]=Number(e.target.value);persist();render();}});
$('panel').addEventListener('input',e=>{if(e.target.dataset.policy)e.target.previousElementSibling.querySelector('strong').textContent=e.target.value+(e.target.dataset.policy==='welfare'?'档':'%');});
 $('panel').addEventListener('click',e=>{if(handleCivic(e)||handleStaffing(e))return;const b=e.target.closest('button');if(!b)return;if(b.dataset.agenda)act(G.setAgenda(state,b.dataset.agenda));if(b.dataset.role)act(G.applyRole(state,b.dataset.role));if(b.dataset.career==='train')act(G.train(state));if(b.dataset.career==='rotate')act(G.rotate(state));if(b.dataset.hire)act(G.hire(state,b.dataset.hire,Number(b.dataset.delta)));if(b.dataset.event)act(G.resolve(state,Number(b.dataset.event),Number(b.dataset.choice)));if(['borrow','repay'].includes(b.dataset.action))act(G.finance(state,b.dataset.action));if(b.dataset.action==='new')newGame();});
function show(html){$('dialogbody').innerHTML=html;if(!$('dialog').open)$('dialog').showModal();}
$('close').onclick=()=>$('dialog').close();
function help(){show('<h2>欢迎履新，临江镇长</h2><div class="helptext"><p>职业生涯最长 420 个月，每五年归档。可从乡镇逐级发展，也可在选择开局中直接体验省级或中央岗位。</p><ol><li>乡镇阶段选中底部建筑，点击道路旁的空地建设。建筑需要 1–3 个月完工；道路可跨河，桥梁费用为三倍。</li><li>县级以上主要通过辖区治理页提出议题，副职仅能处理分管地区。基层地图保留为观察样本。打开财政页查看基层账目，辖区资金则显示在治理页。建设之外，每月还需要工资、维护、民生与利息支出。</li><li>学校和医院建成后，在人事页提交招录申请，两个月后教师与医生到岗。人口超过 2200 时，及时扩建供电供水。</li><li>点击“推进下月”完成结算。事件每两个月出现一次，三个月内处理。</li><li>每年考核一次；任职页展示年限、评价、声誉、空缺等条件。符合条件后仍需经过考察和相应任用程序。连续三个月资金缺口、满意度或声誉低于 20，会提前结束任期。</li></ol><p>建议开局先建设学校、医院，分批招录人员。建设需满足年度预算与三个月基本支出预留。水厂、电站可申报专项项目，等待审核；专款不用于日常开销。</p><p class="muted">参考《设身处地》公开教程的同类独立作品，未使用原作源码与素材；数值、地图和事件均为本项目设计。<a href="https://cp.marx.gq/" target="_blank" rel="noopener">查看参考官网</a></p></div>');}
$('help').onclick=help;
$('menu').onclick=()=>show('<h2>存档与设置</h2><p>操作后自动保存在当前浏览器。导出 JSON 可以备份或迁移到另一台设备。</p><div class="actions"><button id="modalexport">导出当前存档</button><button id="modalhelp">入职指南</button><button id="modalnew" class="danger">重新开始</button></div>');
$('dialog').addEventListener('click',e=>{if(e.target.id==='modalexport')exportSave();if(e.target.id==='modalhelp')help();if(e.target.id==='modalnew')newGame();if(e.target.id==='confirmnew'){state=G.initial();tool='inspect';tab='overview';selected=null;$('dialog').close();persist();render();}});
function newGame(){scenarioDialog();}
$('scenario').onclick=scenarioDialog;
$('viewBrief').onclick=()=>{worldView='brief';render();};$('viewMap').onclick=()=>{worldView='map';render();};$('viewRegion').onclick=()=>{if(state.level>0){worldView='region';render();}};$('viewSystem').onclick=()=>{worldView='system';render();};
$('briefview').addEventListener('click',handleBrief);
$('regional').addEventListener('click',e=>{const b=e.target.closest('[data-region]');if(b)act(G.propose(state,b.dataset.region,b.dataset.domain));});
function exportSave(){const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='临江履新-第'+state.month+'月.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('存档已导出');}
$('save').onclick=exportSave;
$('import').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw Error('文件过大。');const parsed=G.validate(JSON.parse(await file.text()));show('<h2>导入存档</h2><p>即将载入第 '+parsed.month+' 个月的城市，当前进度会被替换。</p><div class="actions"><button id="modalexport">备份当前进度</button><button id="confirmimport" class="primary">确认载入</button></div>');$('confirmimport').onclick=()=>{state=parsed;selected=null;tab='career';worldView=state.level>0?'region':'map';$('dialog').close();persist();render();toast('存档已载入');};}catch(err){toast('无法导入：'+err.message);}e.target.value='';};
render();


$('panel').addEventListener('change',e=>{if(e.target.dataset.publicPolicy)act(G.Civic.setPolicy(state,e.target.dataset.publicPolicy,Number(e.target.value),(s,t)=>{s.log.unshift({month:s.month,text:t});s.log=s.log.slice(0,150);}));});
