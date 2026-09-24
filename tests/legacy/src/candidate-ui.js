import { buildCandidateProfile, candidateEditorValues, applyCandidateCorrections, confirmCandidateProfile } from '../../../src/candidate-profile.js';

export function createCandidateController(state,document,{fetchResume=globalThis.fetch, schedule=setTimeout,cancel=clearTimeout,onConfirmed=()=>{},onInvalidated=()=>{}}={}) {
  const get=id=>document.querySelector(`#${id}`), section=get('candidate-section'),message=get('candidate-message'),results=get('candidate-results'),editor=get('candidate-edit-form');
  const contextKeys=['noticePeriod','availability','currentLocation','relocation','currentCTC','expectedCTC','preferredLocation','preferredRole','shiftAvailability','workMode'];
  const identityKeys=['name','professionalTitle','location','email','phone','linkedIn','github','portfolio'];
  let version=0,abortController,timer,before,structuredValues;
  const node=(tag,text)=>{const element=document.createElement(tag);if(text!=null)element.textContent=text;return element;};
  const ready=()=>state.confirmedJobProfile?.confirmed&&state.confirmedRequirementsProfile?.confirmed;
  function invalidateJob() {onInvalidated();version++;abortController?.abort();cancel(timer);section.hidden=true;state.confirmedCandidateProfile=null;section.setAttribute('aria-busy','false');get('candidate-upload-button').disabled=false;editor.hidden=true;
    if(state.draftCandidateProfile)state.candidateStatus='reviewing';else{state.candidateStatus='idle';state.resumeStatus='idle';}}
  function clear() {
    onInvalidated();
    version++;abortController?.abort();cancel(timer);state.resumeStatus='idle';state.candidateStatus='idle';state.resumeFile=null;state.extractedResumeText='';state.draftCandidateProfile=null;state.confirmedCandidateProfile=null;
    get('candidate-upload').value='';get('candidate-manual-text').value='';get('candidate-previous-email').value='';get('candidate-writing-preferences').value='';
    for(const key of contextKeys)get(`candidate-context-${key}`).value='';
    for(const key of identityKeys)get(`candidate-edit-${key}`).value='';
    for(const key of ['professionalSummary','positions','skills','projects','education','certifications','achievements'])get(`candidate-edit-${key}`).value='';
    for(const key of ['positions','projects','education','certifications'])get(`candidate-edit-${key}`).replaceChildren();structuredValues=null;before=null;
    results.replaceChildren();results.hidden=true;editor.hidden=true;get('candidate-tools').hidden=true;get('candidate-source').hidden=true;get('candidate-source-text').textContent='';message.textContent='';get('candidate-edit-message').textContent='';section.setAttribute('aria-busy','false');get('candidate-upload-button').disabled=false;
  }
  function onRequirementsConfirmed(){onInvalidated();section.hidden=!ready();get('candidate-add-button').hidden=false;get('candidate-entry').hidden=true;}
  function showFacts(parent,title,facts) {
    const panel=node('section');panel.className='analysis-panel';panel.append(node('h3',title));
    const list=node('ul');list.className='requirements-list';
    if(!facts.length)panel.append(node('p','Not specified'));
    for(const item of facts.filter(Boolean)) {
      const row=node('li');row.append(node('span',String(item.value)),node('small',`Source: ${item.source}${item.userConfirmed?' · User confirmed':''}`));
      if(item.evidence?.length){const detail=node('details');detail.append(node('summary',`Evidence: ${[...new Set(item.evidence.map(e=>e.section))].join(', ')}`));for(const evidence of item.evidence)detail.append(node('blockquote',evidence.text));row.append(detail);}
      list.append(row);
    }panel.append(list);parent.append(panel);
  }
  const flatten=value=>{if(!value||typeof value!=='object')return[];if('value' in value&&'source' in value)return[value];return Object.values(value).flatMap(flatten);};
  const templates={positions:{company:'',jobTitle:'',employmentType:'other',startDate:'',endDate:'',location:'',responsibilities:[],achievements:[],technologies:[]},
    projects:{name:{value:''},description:[],technologies:[],contributions:[],features:[],achievements:[]},
    education:{degree:{value:''},specialization:{value:''},institution:{value:''},startYear:{value:''},graduationYear:{value:''},score:{value:''}},
    certifications:{name:{value:''},issuer:{value:''},date:{value:''}}};
  function recordEditor(key) {
    const container=get(`candidate-edit-${key}`);container.replaceChildren();
    const label=value=>value.replace(/([A-Z])/g,' $1').replace(/^./,letter=>letter.toUpperCase());
    function controls(parent,record,path) {
      for(const [field,value]of Object.entries(record)) {
        if(['id','rawText','source','evidence','userConfirmed','category','evidenceSections'].includes(field))continue;
        const wrapper=node('div'),id=`candidate-record-${key}-${path}-${field}`,caption=node('label',label(field));caption.setAttribute('for',id);
        if(Array.isArray(value)) {
          const input=node('textarea');input.id=id;input.rows=3;input.value=value.map(item=>typeof item==='string'?item:item.value||'').join('\n');
          input.addEventListener('input',()=>{record[field]=input.value.split('\n').map(text=>text.trim()).filter(Boolean).map(text=>typeof value[0]==='object'?({...value.find(item=>item.value===text),value:text}):text);});wrapper.append(caption,input);
        } else {
          const input=field==='employmentType'?node('select'):node('input');input.id=id;
          if(field==='employmentType')for(const [value,text]of [['other','Other / Not specified'],['full_time','Full-time'],['internship','Internship']]){const option=node('option',text);option.value=value;input.append(option);}
          input.value=value&&typeof value==='object'?value.value||'':value||'';
          input.addEventListener('input',()=>{record[field]=value&&typeof value==='object'?{...value,value:input.value}:input.value;});wrapper.append(caption,input);
        }parent.append(wrapper);
      }
    }
    structuredValues[key].forEach((record,index)=>{const group=node('fieldset');group.append(node('legend',`${label(key)} ${index+1}`));controls(group,record,String(index));
      const remove=node('button','Remove entry');remove.type='button';remove.className='secondary';remove.addEventListener('click',()=>{structuredValues[key].splice(index,1);recordEditor(key);});group.append(remove);container.append(group);});
    const add=node('button',`Add ${key==='positions'?'employment':key==='education'?'education':key==='projects'?'project':'certification'}`);add.type='button';add.className='secondary';
    add.addEventListener('click',()=>{structuredValues[key].push(JSON.parse(JSON.stringify(templates[key])));recordEditor(key);});container.append(add);
  }
  function render() {
    const profile=state.confirmedCandidateProfile||state.draftCandidateProfile;if(!profile)return;
    results.replaceChildren();
    showFacts(results,'Personal Information',Object.entries(profile.identity).filter(([,item])=>item).map(([key,item])=>({...item,value:`${key}: ${item.value}`})));
    showFacts(results,'Professional Summary',profile.professionalSummary);
    for(const record of profile.experience.positions) {
      showFacts(results,`Employment: ${record.company?.value||'Company not specified'}`,['jobTitle','company','employmentType','startDate','endDate','originalDateRange','location'].map(key=>record[key]&&({...record[key],value:`${key}: ${record[key].value}`})));
      showFacts(results,'Responsibilities',record.responsibilities);showFacts(results,'Employment Technologies',record.technologies);showFacts(results,'Employment Achievements',record.achievements);
      results.append(node('p',record.duration?`Duration: ${record.duration.value} elapsed months · Calculated from preserved dates`:'Duration not calculated: review missing, year-only, or invalid dates.'));
    }
    showFacts(results,'Experience Totals',Object.entries(profile.experience.totals).filter(([,value])=>value?.source).map(([key,value])=>({...value,value:`${key}: ${value.value} elapsed months (dated entries only)`})));
    for(const warning of profile.experience.totals.warnings)results.append(node('p',warning));
    for(const [category,items]of Object.entries(profile.skills.categories))showFacts(results,category,items);
    showFacts(results,'Testing Experience',profile.skills.testing);
    for(const [title,records]of [['Projects',profile.projects],['Education',profile.education],['Certifications',profile.certifications]]) {
      if(!records.length)showFacts(results,title,[]);else records.forEach((record,index)=>showFacts(results,`${title} ${index+1}`,flatten(record)));
    }
    showFacts(results,'Achievements',profile.achievements);showFacts(results,'Additional Application Information',Object.entries(profile.applicationContext).filter(([,item])=>item).map(([key,item])=>({...item,value:`${key}: ${item.value}`})));
    showFacts(results,'Writing Context',[]);results.append(node('p',profile.writingContext.previousApplicationEmail||'No previous application email supplied.'));results.append(node('p',profile.writingContext.preferences||''));
    get('candidate-source-text').textContent=profile.source.originalResumeText;get('candidate-source').hidden=false;
    results.hidden=false;get('candidate-tools').hidden=false;get('candidate-confirm-button').disabled=state.candidateStatus==='editing';
  }
  function context(){return Object.fromEntries(contextKeys.map(key=>[key,get(`candidate-context-${key}`).value]));}
  function writing(){return {previousApplicationEmail:get('candidate-previous-email').value,preferences:get('candidate-writing-preferences').value};}
  function applyContext(){state.draftCandidateProfile=applyCandidateCorrections(state.draftCandidateProfile,candidateEditorValues(state.draftCandidateProfile),context(),writing());}
  function generated(text,metadata) {
    state.extractedResumeText=text;state.draftCandidateProfile=buildCandidateProfile(text,metadata);applyContext();state.resumeStatus='extracted';state.candidateStatus='reviewing';state.confirmedCandidateProfile=null;
    message.textContent=`Candidate profile ready. Review every section; missing or uncertain fields can be corrected.${metadata.warnings?.length?' Some pages were unreadable; review the extraction warnings.':''}`;
    for(const warning of metadata.warnings||[])message.textContent+=` ${warning}`;render();
  }
  get('candidate-add-button').addEventListener('click',()=>{if(!ready())return;get('candidate-entry').hidden=false;get('candidate-add-button').hidden=true;});
  get('candidate-upload-form').addEventListener('submit',async event=>{
    event.preventDefault();if(!ready())return;
    const file=get('candidate-upload').files?.[0];
    if(!file){message.textContent='Please select a resume.';return;}
    const validTypes={pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};const ext=file.name.split('.').at(-1).toLowerCase();
    if(!validTypes[ext]||file.type&&file.type!==validTypes[ext]){message.textContent='Please upload a PDF or DOCX resume.';return;}
    if(!file.size||file.size>=5*1024*1024){message.textContent=file.size?'Resume must be smaller than 5 MB.':'Please select a non-empty resume.';return;}
    onInvalidated();const run=++version;abortController?.abort();cancel(timer);abortController=new AbortController();const current=abortController;
    state.resumeFile={name:file.name,size:file.size,type:file.type};state.extractedResumeText='';state.draftCandidateProfile=null;state.confirmedCandidateProfile=null;state.resumeStatus='uploading';state.candidateStatus='resume_uploaded';results.replaceChildren();results.hidden=true;editor.hidden=true;get('candidate-tools').hidden=true;get('candidate-source').hidden=true;get('candidate-source-text').textContent='';
    section.setAttribute('aria-busy','true');message.textContent='Reading your resume...';get('candidate-upload-button').disabled=true;
    timer=schedule(()=>current.abort(),15000);
    try {
      state.resumeStatus='extracting';state.candidateStatus='extracting';
      const response=await fetchResume('/api/read-resume',{method:'POST',headers:{'Content-Type':file.type||validTypes[ext],'X-Resume-Name':encodeURIComponent(file.name)},body:file,signal:current.signal});
      const result=await response.json();if(run!==version||!ready())return;if(!response.ok)throw new Error(result.error?.message||'The resume could not be read.');
      generated(result.text,{...result.file,pageCount:result.pageCount,warnings:result.warnings,extractionStatus:result.extractionStatus});
    }catch(error){if(run!==version)return;state.resumeStatus='failed';state.candidateStatus='failed';message.textContent=error.name==='AbortError'?"Resume reading timed out. Try another file or enter your information manually.":error.message;}
    finally{if(run===version){cancel(timer);get('candidate-upload-button').disabled=false;section.setAttribute('aria-busy','false');}}
  });
  get('candidate-manual-form').addEventListener('submit',event=>{event.preventDefault();if(!ready())return;onInvalidated();version++;abortController?.abort();cancel(timer);const text=get('candidate-manual-text').value.trim();
    if(!text){message.textContent='Enter your information first.';return;}
    state.resumeFile=null;try{generated('',{name:null,manual:true});const manual=buildCandidateProfile(text,{manual:true});
      // Manual text has user provenance, never fabricated resume evidence.
      const convert=value=>{if(!value||typeof value!=='object')return;if(value.source==='resume'){value.source='user_provided';value.evidence=[];}Object.values(value).forEach(convert);};convert(manual);manual.source.originalResumeText='';manual.source.manualInput=text;
      state.draftCandidateProfile=manual;state.extractedResumeText='';applyContext();render();message.textContent='Manual candidate information ready. Review and confirm it.';
    }catch(error){message.textContent=error.message;}finally{section.setAttribute('aria-busy','false');get('candidate-upload-button').disabled=false;}
  });
  get('candidate-edit-button').addEventListener('click',()=>{if(!state.draftCandidateProfile||!ready())return;onInvalidated();before=state.draftCandidateProfile;state.confirmedCandidateProfile=null;state.candidateStatus='editing';
    const values=candidateEditorValues(before);for(const key of identityKeys)get(`candidate-edit-${key}`).value=values.identity[key];
    structuredValues=values;
    for(const key of ['professionalSummary','skills','achievements'])get(`candidate-edit-${key}`).value=values[key].join('\n');
    for(const key of ['positions','projects','education','certifications'])recordEditor(key);
    editor.hidden=false;get('candidate-edit-message').textContent='';get('candidate-confirm-button').disabled=true;
  });
  editor.addEventListener('submit',event=>{event.preventDefault();if(state.candidateStatus!=='editing'||!ready())return;try {
    const values={identity:Object.fromEntries(identityKeys.map(key=>[key,get(`candidate-edit-${key}`).value.trim()]))};
    for(const key of ['professionalSummary','positions','skills','projects','education','certifications','achievements'])values[key]=['skills','professionalSummary','achievements'].includes(key)?get(`candidate-edit-${key}`).value.split('\n'):structuredValues[key];
    state.draftCandidateProfile=applyCandidateCorrections(state.draftCandidateProfile,values,context(),writing());state.candidateStatus='reviewing';editor.hidden=true;render();message.textContent='Profile changes saved. Corrections are marked User Provided.';
  }catch(error){get('candidate-edit-message').textContent=`Could not save changes: ${error.message}`;}});
  get('candidate-edit-cancel').addEventListener('click',()=>{if(state.candidateStatus!=='editing')return;state.draftCandidateProfile=before;state.candidateStatus='reviewing';editor.hidden=true;render();});
  for(const id of [...contextKeys.map(key=>`candidate-context-${key}`),'candidate-previous-email','candidate-writing-preferences'])get(id).addEventListener('input',()=>{onInvalidated();state.confirmedCandidateProfile=null;if(state.draftCandidateProfile&&state.candidateStatus!=='editing'){applyContext();state.candidateStatus='reviewing';render();}});
  get('candidate-confirm-button').addEventListener('click',()=>{if(!ready()||!state.draftCandidateProfile||state.candidateStatus==='editing')return;try{applyContext();state.confirmedCandidateProfile=confirmCandidateProfile(state.draftCandidateProfile);state.candidateStatus='confirmed';render();onConfirmed();message.textContent='Candidate Profile confirmed. Job requirements and candidate facts remain separate and ready for the next step.';}catch(error){message.textContent=error.message;}});
  get('candidate-clear-button').addEventListener('click',clear);
  clear();section.hidden=true;return {clear,invalidateJob,onRequirementsConfirmed};
}

