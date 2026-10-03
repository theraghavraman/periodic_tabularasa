/* Elemental Intelligence Engine — offline, deterministic, dataset-driven */
(function(){
  'use strict';
  const data = typeof PERIODIC_TABLE_DATA !== 'undefined' ? PERIODIC_TABLE_DATA : [];
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const catNames = {
    'alkali-metal':'Alkali metal','alkaline-earth-metal':'Alkaline earth metal','transition-metal':'Transition metal',
    'post-transition-metal':'Post-transition metal','metalloid':'Metalloid','reactive-nonmetal':'Reactive nonmetal',
    'noble-gas':'Noble gas','lanthanide':'Lanthanide','actinide':'Actinide'
  };

  function valence(el){ return Array.isArray(el.shells) && el.shells.length ? el.shells[el.shells.length-1] : null; }
  function stateAtRoom(el){
    if (el.phase) return el.phase;
    return 'Unknown';
  }
  function familyInsight(el){
    const v=valence(el), c=el.category;
    if(c==='noble-gas') return 'Closed-shell element: its outer shell is filled in the dataset, so ordinary chemical reactivity is comparatively low.';
    if(c==='alkali-metal') return 'Highly electropositive family: one outer-shell electron makes loss of that electron a recurring bonding pattern.';
    if(c==='alkaline-earth-metal') return 'Two outer-shell electrons place it in a family that commonly forms divalent ions.';
    if(c==='reactive-nonmetal') return 'Electron-rich nonmetal family: gaining or sharing electrons is a common route to stable compounds.';
    if(c==='transition-metal') return 'd-block chemistry gives this family access to multiple bonding environments and, for many members, variable oxidation states.';
    if(c==='lanthanide') return 'f-block chemistry is dominated by highly electropositive metals and characteristic +3 chemistry.';
    if(c==='actinide') return 'f-block actinide chemistry is strongly influenced by radioactivity, accessible oxidation states, and 5f electrons.';
    if(c==='metalloid') return 'Intermediate metallic/nonmetallic character makes metalloids especially important in semiconducting and materials chemistry.';
    if(v!=null && v<=2) return 'A small outer-shell electron count points toward electron donation or metallic bonding depending on its position in the table.';
    if(v!=null && v>=6) return 'A high outer-shell electron count points toward electron acceptance or electron sharing in many compounds.';
    return 'Its periodic position, electron configuration, and measured properties provide the main clues to its chemical behavior.';
  }
  function bonding(el){
    const c=el.category, v=valence(el);
    if(c==='noble-gas') return 'Usually weak bonding tendency';
    if(c==='alkali-metal') return 'Often forms +1 ions';
    if(c==='alkaline-earth-metal') return 'Often forms +2 ions';
    if(c==='reactive-nonmetal') return v>=7 ? 'Often gains 1 electron or shares electrons' : 'Often forms covalent bonds';
    if(c==='transition-metal') return 'Metallic + coordination chemistry; variable oxidation states are common';
    if(c==='lanthanide') return 'Commonly +3 ionic chemistry';
    if(c==='actinide') return 'Variable oxidation states; 5f chemistry';
    if(c==='metalloid') return 'Mixed covalent / network / semiconducting bonding';
    return 'Context-dependent bonding';
  }
  function commonOx(el){
    const map={
      H:'+1, −1',He:'0',Li:'+1',Be:'+2',B:'+3',C:'−4, +2, +4',N:'−3, +3, +5',O:'−2',F:'−1',
      Na:'+1',Mg:'+2',Al:'+3',Si:'−4, +4',P:'−3, +3, +5',S:'−2, +4, +6',Cl:'−1, +1, +3, +5, +7',
      K:'+1',Ca:'+2',Fe:'+2, +3',Cu:'+1, +2',Zn:'+2',Ag:'+1',Au:'+1, +3',Hg:'+1, +2'
    };
    return map[el.symbol] || (el.category==='noble-gas'?'0':'Not encoded in the base dataset');
  }
  function neighbors(el){
    return data.filter(x => x.number!==el.number && ((el.group && x.group===el.group) || x.period===el.period))
      .sort((a,b)=>Math.abs(a.number-el.number)-Math.abs(b.number-el.number)).slice(0,6);
  }
  function render(el){
    const host=$('elementalIntelligenceContent'); if(!host || !el) return;
    const v=valence(el), shells=el.shells||[];
    const filled= shells.length ? Math.max(...shells,1) : 1;
    const shellBars=shells.map((n,i)=>'<div class="intel-shell"><div class="intel-shell-bar" style="height:'+Math.max(7,Math.min(78,(n/filled)*78))+'px"></div><strong>'+n+'</strong><small>n='+(i+1)+'</small></div>').join('');
    const near=neighbors(el);
    const links=near.map(n=>'<button class="intel-link" data-intel-open="'+n.number+'">'+esc(n.symbol)+' · '+esc(n.name)+'</button>').join('');
    const known=el.electronegativity!==null && el.electronegativity!==undefined;
    const thermo=el.melt!=null || el.boil!=null || el.density!=null;
    host.innerHTML=
      '<div class="intelligence-card">'+
      '<div class="intel-head"><div><div class="intel-kicker">Elemental Intelligence Engine</div><h3>'+esc(el.name)+' · Z = '+el.number+'</h3><p>Offline reasoning layer built from the periodic-table dataset, electron shells, classification and measured properties.</p></div><span class="intel-confidence">'+(known&&thermo?'DATA-RICH':'DATA-LIMITED')+'</span></div>'+
      '<div class="intel-grid">'+
      stat('Family',catNames[el.category]||el.category)+stat('Position','Group '+(el.group??'—')+' · Period '+el.period)+
      stat('Block',(el.block||'—').toUpperCase()+'-block')+stat('Room state',stateAtRoom(el))+
      '</div>'+
      '<div class="intel-columns">'+
      '<div class="intel-panel"><h4>Electron structure</h4><div class="intel-list">'+
      row('Configuration',el.electron_configuration||'Unknown')+row('Shell population',shells.join(' · ')||'Unknown')+row('Valence electrons',v==null?'Unknown':v)+row('Electronegativity',known?el.electronegativity+' Pauling':'Not available')+
      '</div><div class="intel-shells">'+shellBars+'</div></div>'+
      '<div class="intel-panel"><h4>Chemical behavior model</h4><div class="intel-callout">'+esc(familyInsight(el))+'</div><div class="intel-list" style="margin-top:9px">'+row('Bonding tendency',bonding(el))+row('Common oxidation states',commonOx(el))+row('Use signal',el.uses||'Not available')+'</div></div>'+
      '</div>'+
      '<div class="intel-panel" style="margin-top:12px"><h4>Why this element matters</h4><div class="intel-callout" style="border-left-color:#7c3aed">'+esc(el.summary||'The dataset contains no summary for this element.')+'</div><div class="intel-pill-row" style="margin-top:9px"><span class="intel-pill">Atomic mass '+esc(el.atomic_mass)+'</span><span class="intel-pill">Density '+esc(el.density==null?'—':el.density+' g/cm³')+'</span><span class="intel-pill">Melting '+esc(el.melt==null?'—':el.melt+' K')+'</span><span class="intel-pill">Boiling '+esc(el.boil==null?'—':el.boil+' K')+'</span></div></div>'+
      '<div class="intel-panel" style="margin-top:12px"><h4>Element relationships</h4><p style="margin:0 0 8px;color:#64748b;font-size:.68rem">Nearby elements from the same group or period. Click one to inspect it without leaving the intelligence view.</p><div class="intel-links">'+(links||'<span class="muted-note">No related elements found.</span>')+'</div></div>'+
      '</div>';
    host.querySelectorAll('[data-intel-open]').forEach(b=>b.addEventListener('click',()=>window.PeriodicTableAPI?.openElement(Number(b.dataset.intelOpen))));
  }
  function stat(k,v){return '<div class="intel-stat"><span>'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>'}
  function row(k,v){return '<div><b>'+esc(k)+'</b><span>'+esc(v)+'</span></div>'}
  window.addEventListener('periodic-element-selected',e=>render(e.detail));
  document.addEventListener('DOMContentLoaded',()=>{
    const pane=$('tab-intelligence');
    if(pane){
      pane.addEventListener('click',e=>{ if(e.target.closest('[data-intel-open]')) return; });
    }
  });
})();