import { matchProfiles, selectRelevanceHighlights, confirmRelevanceProfile, MATCH_LABELS } from '../../../src/relevance-engine.js';

export function createRelevanceController(state,document,{match=matchProfiles,schedule=setTimeout,cancel=clearTimeout,onConfirmed=()=>{},onInvalidated=()=>{}}={}) {
  const get=id=>document.querySelector(`#${id}`),section=get('match-section'),message=get('match-message'),results=get('match-results');
  let version=0,timer,hasMatched=false;
  const ready=()=>state.confirmedRequirementsProfile?.confirmed&&state.confirmedCandidateProfile?.confirmed;
  const node=(tag,text)=>{const element=document.createElement(tag);if(text!=null)element.textContent=String(text);return element;};
  function invalidate(){version++;cancel(timer);state.matchStatus='profiles_ready';state.draftRelevanceProfile=null;state.confirmedRelevanceProfile=null;onInvalidated();state.matchError=null;
    section.hidden=true;results.replaceChildren();results.hidden=true;get('match-tools').hidden=true;get('match-retry-button').hidden=true;
    get('match-highlight-options').replaceChildren();get('match-add-select').replaceChildren();message.textContent='';section.setAttribute('aria-busy','false');get('match-button').disabled=true;}
  function onCandidateConfirmed(){invalidate();section.hidden=!ready();get('match-button').disabled=!ready();get('match-button').textContent=hasMatched?'Recalculate Match':'Check My Match';message.textContent='Both profiles are confirmed. Compare the available job requirements with your candidate facts.';}
  function evidence(parent,facts) {
    if(!facts?.length)return;
    const detail=node('details');detail.className='requirement-evidence';detail.append(node('summary','Candidate evidence'));
    for(const fact of facts){detail.append(node('p',`${fact.value} · ${fact.sourceType.replace(/_/g,' ')} · ${fact.source==='user_provided'?'User provided':fact.source}`));
      for(const source of fact.evidence||[])detail.append(node('blockquote',source.text));}
    parent.append(detail);
  }
  function list(title,items,{empty='Not specified'}={}) {
    const panel=node('section');panel.className='analysis-panel';panel.append(node('h3',title));
    if(!items.length)panel.append(node('p',empty));
    else {const ul=node('ul');ul.className='requirements-list';for(const item of items){const row=node('li');
      row.append(node('strong',item.requirement||item.text||item.title||item.value||item.label),node('p',`${item.label||MATCH_LABELS[item.status]||item.status||''}${item.priority?` · ${item.priority==='unspecified'?'Priority not specified':item.priority}`:''}`));
      if(item.explanation)row.append(node('p',item.explanation));
      if(item.relevance)row.append(node('small',`Relevance: ${item.relevance}`));
      if(item.reasons?.length)row.append(node('p',`Relevant to: ${item.reasons.map(reason=>typeof reason==='string'?reason:reason.requirement).join('; ')}`));
      if(item.status==='available')row.append(node('p',String(item.value)));
      evidence(row,item.candidateEvidence||[]);
      if(item.relatedContext?.length){row.append(node('p','Related context — does not verify this requirement'));evidence(row,item.relatedContext);}
      if(item.jobEvidence?.length){const detail=node('details');detail.append(node('summary','Job evidence'));for(const fact of item.jobEvidence)detail.append(node('blockquote',fact.text));row.append(detail);}
      ul.append(row);}panel.append(ul);}
    results.append(panel);
  }
  const duration=months=>`${Math.floor(months/12)} years ${months%12} months`;
  function renderHighlights(profile){
    const container=get('match-highlight-options');container.replaceChildren();const select=get('match-add-select');select.replaceChildren();
    const placeholder=node('option','Choose a verified candidate fact');placeholder.value='';select.append(placeholder);
    let index=0;
    for(const highlight of profile.highlightOptions) {
      if(profile.selectedHighlightIds.includes(highlight.id)) {
        const row=node('div');row.className='match-highlight';const checkbox=node('input');checkbox.type='checkbox';checkbox.checked=true;checkbox.id=`match-highlight-${index++}`;
        const label=node('label',highlight.text);label.setAttribute('for',checkbox.id);row.append(checkbox,label);evidence(row,highlight.candidateEvidence);
        checkbox.addEventListener('change',()=>{const ids=state.draftRelevanceProfile.selectedHighlightIds.filter(id=>id!==highlight.id);changeHighlights(ids);});container.append(row);
      }else{const option=node('option',highlight.text.slice(0,160));option.value=highlight.id;select.append(option);}
    }
    if(!profile.selectedHighlightIds.length)container.append(node('p','No highlights selected. Add a verified fact below if you want to emphasize it later.'));
  }
  function render(){
    const profile=state.confirmedRelevanceProfile||state.draftRelevanceProfile;if(!profile)return;
    results.replaceChildren();const overview=node('section');overview.className='analysis-panel';overview.append(node('h3','Overall Alignment'),node('strong',profile.overallAlignment.label));
    overview.append(node('p',profile.overallAlignment.profileMatch==null?'Profile Match: Not enough job information':`Profile Match: ${profile.overallAlignment.profileMatch}%`),node('p',profile.overallAlignment.explanation));
    const scoring=node('details');scoring.append(node('summary','How alignment is calculated'),node('p',profile.overallAlignment.method));overview.append(scoring);results.append(overview);
    list('Required Skills',profile.requiredSkills);list('Preferred Skills',profile.preferredSkills);list('Mentioned Skills — Priority Not Specified',profile.mentionedSkills);
    list('Strong Matches',profile.strongMatches,{empty:'No strong matches verified.'});list('Partial Matches',profile.partialMatches,{empty:'No partial matches.'});list('No Verified Match',profile.noVerifiedMatches,{empty:'No unverified requirements in these categories.'});
    list('Testing Methodologies',profile.testing);list('API Testing',profile.api);list('Database',profile.database);list('Automation',profile.automation);
    const exp=profile.experience;list('Experience Alignment',[{...exp,explanation:`${exp.explanation} Candidate: ${duration(exp.fullTimeMonths)} full-time + ${duration(exp.internshipMonths)} internship + ${duration(exp.otherMonths)} other/unspecified. Overlap-adjusted overall: ${duration(exp.overallCombinedMonths)}. Dated entries only.`}]);
    list('Technology-specific Experience',exp.technology);list('Responsibility Alignment',profile.responsibilities);list('Education',profile.education);list('Domain Alignment',profile.domains);list('Certifications',profile.certifications);list('Soft Skills',profile.softSkills);
    list('Location',[profile.compatibility.location]);list('Work Mode',[profile.compatibility.workMode]);list('Joining / Notice Period',profile.compatibility.joining);list('Shift Requirements',profile.compatibility.shifts);
    list('Relevant Experience',profile.relevantExperience);list('Relevant Projects',profile.relevantProjects);list('Relevant Achievements',profile.relevantAchievements.map(item=>({...item,candidateEvidence:[item]})));
    list('Application Information',profile.applicationInformation.map(item=>({...item,requirement:item.label,label:item.status==='available'?'Available':'User Input Required'})),{empty:'No additional application information requested.'});
    list('Missing Application Information',profile.missingApplicationInformation.map(item=>({...item,requirement:item.label,label:'User Input Required'})),{empty:'No requested information is missing.'});
    list('Potential Gaps',profile.gaps,{empty:'No potential gaps found in the stated requirements.'});
    list('Do Not Claim',profile.unsupportedClaims.map(item=>({...item,explanation:item.reason})),{empty:'No unsupported requirements in these categories.'});
    renderHighlights(profile);results.hidden=false;get('match-tools').hidden=false;get('match-confirm-button').disabled=false;
  }
  function changeHighlights(ids){if(!ready()||!state.draftRelevanceProfile)return;try{state.draftRelevanceProfile=selectRelevanceHighlights(state.draftRelevanceProfile,ids);state.confirmedRelevanceProfile=null;onInvalidated();state.matchStatus='reviewing';render();message.textContent='Highlights updated. Review and confirm your match again.';}catch(error){message.textContent=error.message;}}
  function run(){
    if(!ready()||state.matchStatus==='matching')return;
    const job=state.confirmedRequirementsProfile,candidate=state.confirmedCandidateProfile,runVersion=++version;
    cancel(timer);state.matchStatus='matching';state.draftRelevanceProfile=null;state.confirmedRelevanceProfile=null;onInvalidated();state.matchError=null;results.hidden=true;get('match-tools').hidden=true;get('match-retry-button').hidden=true;
    get('match-button').disabled=true;message.textContent='Comparing your profile with this job...';section.setAttribute('aria-busy','true');
    timer=schedule(()=>{
      if(runVersion!==version||job!==state.confirmedRequirementsProfile||candidate!==state.confirmedCandidateProfile)return;
      try{state.draftRelevanceProfile=match(job,candidate);state.matchStatus='matched';hasMatched=true;render();state.matchStatus='reviewing';message.textContent='Comparison ready. Review the evidence, potential gaps, application information, and highlights.';get('match-button').textContent='Recalculate Match';}
      catch(error){state.matchStatus='match_failed';state.matchError=error.code||'match_failure';message.textContent=error instanceof Error&&error.code?error.message:'The comparison could not be completed. Your confirmed job and candidate profiles are still available.';get('match-retry-button').hidden=false;}
      finally{get('match-button').disabled=false;section.setAttribute('aria-busy','false');}
    },250);
  }
  get('match-button').addEventListener('click',run);get('match-retry-button').addEventListener('click',run);
  get('match-add-button').addEventListener('click',()=>{const id=get('match-add-select').value;if(id&&state.draftRelevanceProfile)changeHighlights([...state.draftRelevanceProfile.selectedHighlightIds,id]);});
  get('match-confirm-button').addEventListener('click',()=>{if(!ready()||!state.draftRelevanceProfile||state.matchStatus==='matching')return;try{
    state.confirmedRelevanceProfile=confirmRelevanceProfile(state.draftRelevanceProfile,state.confirmedRequirementsProfile,state.confirmedCandidateProfile);state.matchStatus='confirmed';render();onConfirmed();message.textContent='Match confirmed. Your Job-Candidate Relevance Profile and selected highlights are ready for the next step.';
  }catch(error){state.confirmedRelevanceProfile=null;onInvalidated();message.textContent=error.message;get('match-retry-button').hidden=false;}});
  invalidate();return {invalidate,onCandidateConfirmed};
}
