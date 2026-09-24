import { canonicalSkill } from './requirements-analysis.js';

export const CANDIDATE_CATEGORIES = ['Programming Languages', 'Automation', 'API Testing', 'Testing', 'Performance / Security', 'Database', 'CI/CD', 'Monitoring / Quality', 'Bug Tracking / Project Tools', 'Other Tools'];
const aliases = [
  ['Java', /\bJava\b/gi, 0], ['JavaScript', /\b(?:JavaScript|JS)\b/gi, 0], ['TypeScript', /\b(?:TypeScript|TS)\b/gi, 0], ['Python', /\bPython\b/gi, 0],
  ['C#', /\bC#/gi, 0], ['C++', /\bC\+\+/gi, 0], ['Selenium WebDriver', /\bSelenium(?:\s+WebDriver)?\b/gi, 1], ['Playwright', /\bPlaywright\b/gi, 1],
  ['Appium', /\bAppium\b/gi, 1], ['TestNG', /\bTestNG\b/gi, 1], ['JUnit', /\bJUnit\b/gi, 1], ['Cucumber', /\bCucumber\b/gi, 1],
  ['Postman', /\bPostman\b/gi, 2], ['Rest Assured', /\bRest\s*Assured\b/gi, 2], ['Swagger', /\bSwagger\b/gi, 2], ['REST API Testing', /\bREST\s+API(?:\s+Testing)?\b/gi, 2],
  ...['Manual Testing', 'Functional Testing', 'Regression Testing', 'Smoke Testing', 'Integration Testing', 'Mobile Testing', 'UAT'].map(value => [value, new RegExp(`\\b${value}\\b`, 'gi'), 3]),
  ['JMeter', /\bJMeter\b/gi, 4], ['OWASP ZAP', /\bOWASP\s+ZAP\b/gi, 4], ['MySQL', /\bMySQL\b/gi, 5], ['SQL', /\bSQL\b/gi, 5], ['MongoDB', /\bMongoDB\b/gi, 5], ['PostgreSQL', /\bPostgreSQL\b/gi, 5],
  ['Jenkins', /\bJenkins\b/gi, 6], ['GitHub Actions', /\bGitHub\s+Actions\b/gi, 6], ['Docker', /\bDocker\b/gi, 6], ['New Relic', /\bNew\s+Relic\b/gi, 7], ['SonarQube', /\bSonarQube\b/gi, 7],
  ...['Jira', 'Taiga', 'TestRail'].map(value => [value, new RegExp(`\\b${value}\\b`, 'gi'), 8]),
];
const heading = text => {
  const value = text.trim().replace(/:$/, '').toLowerCase();
  if (/^(professional |career )?(summary|objective|profile)$/.test(value)) return 'summary';
  if (/^(work |professional |employment |relevant )?experience$|^employment history$|^internships?$/.test(value)) return 'experience';
  if (/^(technical |core |key )?skills$|^technologies$/.test(value)) return 'skills';
  if (/^(academic |personal |selected )?projects$/.test(value)) return 'projects';
  if (/^education|^academic qualifications$/.test(value)) return 'education';
  if (/^certifications?$|^licenses and certifications$/.test(value)) return 'certifications';
  if (/^achievements?$|^awards$/.test(value)) return 'achievements';
  return null;
};
const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
export function parseEmploymentDate(value, now = new Date()) {
  if (/^(present|current|ongoing|now)$/i.test(value.trim())) return { year: now.getUTCFullYear(), month: now.getUTCMonth(), current: true, precision: 'month' };
  let match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (match && +match[2] >= 1 && +match[2] <= 12) return { year: +match[1], month: +match[2] - 1, precision: 'month' };
  match = value.trim().match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (match && monthNames.includes(match[1].slice(0,3).toLowerCase())) return { year: +match[2], month: monthNames.indexOf(match[1].slice(0,3).toLowerCase()), precision: 'month' };
  if (/^\d{4}$/.test(value.trim())) return { year: +value, month: null, precision: 'year' };
  return null;
}
const dateToken = '(?:[A-Za-z]{3,9}\\s+\\d{4}|\\d{4}-\\d{2}|\\d{4}|Present|Current|Ongoing|Now)';
const rangePattern = new RegExp(`(${dateToken})\\s*(?:–|—|\\s-\\s|\\bto\\b)\\s*(${dateToken})`, 'i');
const clone = value => JSON.parse(JSON.stringify(value));
const fact = (value, evidence = [], source = 'resume') => ({ value, source, evidence, userConfirmed: false });
function linesOf(text) {
  let section = 'identity';
  return [...text.matchAll(/[^\n]+/g)].map(match => {
    const text = match[0].trim(); const next = heading(text);
    if (next) section = next;
    return { text, section, heading: Boolean(next), start: match.index + match[0].indexOf(text), end: match.index + match[0].indexOf(text) + text.length };
  });
}
const evidenceOf = line => ({ text: line.text, start: line.start, end: line.end, section: line.section });
function extractSkills(lines) {
  const found = new Map();
  for (const line of lines.filter(line => !line.heading)) {
    for (const [value, pattern, category] of aliases) {
      pattern.lastIndex = 0;
      if (!pattern.test(line.text) || /\b(?:no experience|not familiar|never used)\b/i.test(line.text)) continue;
      if (!found.has(value)) found.set(value, { ...fact(value), category: CANDIDATE_CATEGORIES[category] });
      found.get(value).evidence.push(evidenceOf(line));
    }
    if (line.section === 'skills') {
      for (const token of line.text.replace(/^[^:]+:\s*/, '').split(/[,;|•]/).map(x => x.trim()).filter(Boolean)) {
        if (token.length > 45 || aliases.some(([, pattern]) => { pattern.lastIndex = 0; return pattern.test(token); })) continue;
        if (!found.has(token)) found.set(token, { ...fact(token), category: 'Other Tools' });
        found.get(token).evidence.push(evidenceOf(line));
      }
    }
  }
  return [...found.values()].map(skill => ({ ...skill, evidenceSections: [...new Set(skill.evidence.map(item => item.section))] }));
}
const measurable = text => /\b(?:reduced|improved|increased|created|logged|delivered|saved|achieved|awarded|won|built|automated|developed)\b/i.test(text);
function recordBlocks(lines, section) {
  const records = []; let block = [];
  for (const line of lines.filter(line => line.section === section && !line.heading)) {
    const isBullet = /^[•*\-▪●]/.test(line.text);
    const priorDate=block.findIndex(item=>rangePattern.test(item.text));
    if(rangePattern.test(line.text)&&priorDate>=0) {
      let cut=block.length;
      while(cut>priorDate+1&&!/^[•*\-▪●]/.test(block[cut-1].text))cut--;
      records.push(block.slice(0,cut));block=block.slice(cut);
    } else if (block.length && !isBullet && !/^location:/i.test(line.text) && (/\s(?:at|@)\s|\s[|]\s/.test(line.text) || /engineer|developer|intern|analyst|manager|tester|consultant/i.test(line.text)&&block.some(item=>/^[•*\-▪●]/.test(item.text))) && priorDate>=0) { records.push(block); block = []; }
    block.push(line);
  }
  if (block.length) records.push(block);
  return records;
}
function employment(block, index) {
  const dateLine = block.find(line => rangePattern.test(line.text));
  const dates = dateLine?.text.match(rangePattern);
  const headers = block.filter(line => !/^[•*\-▪●]/.test(line.text));
  const header = headers[0];
  const clean = header?.text.replace(rangePattern, '').replace(/^[|,\s]+|[|,\s]+$/g, '') || '';
  const split = clean.split(/\s+(?:at|@)\s+|\s*\|\s*/i);
  const title = split[0] || null;
  const company = split[1] || headers.find(line => line !== header && line !== dateLine && !/^location:/i.test(line.text))?.text || null;
  const typeText=headers.map(line=>line.text).join('\n');
  const type = /\bintern(?:ship)?\b/i.test(typeText) ? 'internship'
    : /\bfull[ -]time\b/i.test(typeText) ? 'full_time' : 'other';
  const dateIndex=block.indexOf(dateLine);
  const duties = block.filter((line,index) => /^[•*\-▪●]/.test(line.text) || dateIndex>=0&&index>dateIndex&&!/^location:/i.test(line.text));
  return { id: `employment-${index + 1}`, company: company ? fact(company, [evidenceOf(headers.find(line => line.text.includes(company)) || header)]) : null,
    jobTitle: title ? fact(title, [evidenceOf(header)]) : null, employmentType: fact(type, block.map(evidenceOf)),
    startDate: dates ? fact(dates[1], [evidenceOf(dateLine)]) : null, endDate: dates ? fact(dates[2], [evidenceOf(dateLine)]) : null,
    originalDateRange: dates ? fact(dates[0], [evidenceOf(dateLine)]) : null, currentPosition: dates ? /present|current|ongoing|now/i.test(dates[2]) : null,
    location: block.find(line=>/^location:/i.test(line.text)) ? fact(block.find(line=>/^location:/i.test(line.text)).text.replace(/^location:\s*/i,''),[evidenceOf(block.find(line=>/^location:/i.test(line.text)))]) : null, responsibilities: duties.map(line => fact(line.text, [evidenceOf(line)])), technologies: extractSkills(block),
    achievements: duties.filter(line => measurable(line.text)).map(line => fact(line.text, [evidenceOf(line)])), rawText: block.map(line => line.text).join('\n') };
}
function unionMonths(intervals) {
  intervals.sort((a,b) => a[0]-b[0]); let total = 0, start, end;
  for (const [a,b] of intervals) { if (start == null) { start=a; end=b; } else if (a <= end) end=Math.max(end,b); else { total+=end-start; start=a; end=b; } }
  return total + (start == null ? 0 : end-start);
}
export function calculateCandidateExperience(records, now = new Date()) {
  const groups = { full_time: [], internship: [], other: [] }; const warnings = [];
  for (const record of records) {
    const start = parseEmploymentDate(record.startDate?.value || '', now), end = parseEmploymentDate(record.endDate?.value || '', now);
    record.currentPosition = end?.current ?? (record.endDate ? false : null);
    record.duration = null;
    if (!start || !end || start.month == null || end.month == null) { warnings.push(`${record.id}: Dates are missing or year-only; duration was not assumed.`); continue; }
    const a = start.year*12+start.month, b = end.year*12+end.month, current = now.getUTCFullYear()*12+now.getUTCMonth();
    if (b < a || a > current || b > current) { warnings.push(`${record.id}: Review reversed or future employment dates.`); continue; }
    record.duration = { ...fact(b-a, [], 'calculated'), unit: 'months', basis: { startDate: record.startDate, endDate: record.endDate }, convention: 'Elapsed calendar months; end month is not counted twice.', calculatedAsOf: now.toISOString() };
    const type = record.employmentType?.value;
    groups[type in groups ? type : 'other'].push([a,b]);
  }
  const total = (intervals,type) => ({ ...fact(unionMonths(intervals), [], 'calculated'), unit: 'months', basis: records.filter(record => record.duration && (!type || record.employmentType?.value===type)).map(record => record.id), calculatedAsOf:now.toISOString() });
  return { fullTime: total([...groups.full_time],'full_time'), internships: total([...groups.internship],'internship'), otherRelevant: total([...groups.other],'other'),
    overallCombined: total(Object.values(groups).flat()), warnings, calculationMethod: 'Union of dated intervals prevents overlap double-counting. Unspecified employment types remain Other; projects and certifications are excluded.' };
}
export function buildCandidateProfile(rawText, metadata = {}, { now = new Date() } = {}) {
  if (typeof rawText !== 'string' || rawText.length > 300000) throw new Error('Resume text is too large to analyze.');
  const lines = linesOf(rawText); const first = lines.filter(line => line.section === 'identity' && !line.heading);
  const find = pattern => lines.find(line => pattern.test(line.text));
  const field = (line, value = line?.text) => value ? fact(value, line ? [evidenceOf(line)] : []) : null;
  const emailLine = find(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  const phoneLine = find(/(?:\+\d{1,3}[\s-]?)?(?:\d[\s()-]*){10,}/);
  const link = domain => { const line = find(new RegExp(domain,'i')); return field(line, line?.text.match(new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?${domain}[^\\s|,]*`, 'i'))?.[0]); };
  const nameLine = first.find(line => /^(?:name:\s*)?[\p{L}][\p{L} .'-]{2,70}$/u.test(line.text) && !/engineer|developer|analyst|resume|curriculum|full.time/i.test(line.text));
  const titleLine = first.find(line => /engineer|developer|analyst|manager|designer|tester|consultant|specialist/i.test(line.text));
  const locationLine = first.find(line => /^(?:current )?location:/i.test(line.text));
  const skills = extractSkills(lines);
  const records = recordBlocks(lines, 'experience').map(employment);
  const summaryLines = lines.filter(line => line.section === 'summary' && !line.heading);
  const plainRecords = section => {
    const groups = []; let group=[];
    for (const line of lines.filter(line => line.section === section && !line.heading)) {
      if (group.length && !/^[•*\-▪●]/.test(line.text) && (/^project\s*:/i.test(line.text) || section==='projects'&&group.some(item=>/^[•*\-▪●]/.test(item.text)) || /^(?:B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|Bachelor|Master|Diploma)\b/i.test(line.text))) { groups.push(group); group=[]; }
      group.push(line);
    }
    if (group.length) groups.push(group);
    return groups;
  };
  const projects = plainRecords('projects').map((block,index) => ({ id:`project-${index+1}`, name:field(block[0]), description:block.slice(1).map(line => field(line)),
    technologies:extractSkills(block), contributions:block.filter(line => /built|developed|implemented|designed|created|tested/i.test(line.text)).map(line => field(line)),
    features:block.filter(line => /feature|support|include/i.test(line.text)).map(line => field(line)), achievements:block.filter(line => measurable(line.text)).map(line => field(line)) }));
  const education = plainRecords('education').map((block,index) => {
    const text=block.map(line=>line.text).join('\n'); const years=[...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map(match=>match[0]);
    const institution=block.find(line=>/university|college|institute|school/i.test(line.text)); const score=block.find(line=>/CGPA|GPA|percentage|\d\s*%/i.test(line.text));
    return { id:`education-${index+1}`, degree:field(block[0]), specialization:field(block.find(line=>/computer|engineering|science|specialization/i.test(line.text))),
      institution:field(institution), startYear:years.length>1?field(block.find(line=>line.text.includes(years[0])),years[0]):null,
      graduationYear:years.length?field(block.find(line=>line.text.includes(years.at(-1))),years.at(-1)):null, score:field(score), rawText:text };
  });
  const certifications = lines.filter(line=>line.section==='certifications'&&!line.heading).map((line,index)=>({ id:`certification-${index+1}`, name:field(line),
    issuer:field(line,line.text.match(/(?:issued by|issuer:)\s*(.+)/i)?.[1]), date:field(line,line.text.match(/\b(?:19|20)\d{2}\b/)?.[0]) }));
  return { schemaVersion:1, profileStatus:'profile_generated', confirmed:false, generatedAt:now.toISOString(),
    identity:{ name:field(nameLine,nameLine?.text.replace(/^name:\s*/i,'')), professionalTitle:field(titleLine), location:field(locationLine,locationLine?.text.replace(/^(?:current )?location:\s*/i,'')),
      email:field(emailLine,emailLine?.text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0]), phone:field(phoneLine,phoneLine?.text.match(/(?:\+\d{1,3}[\s-]?)?(?:\d[\s()-]*){10,}/)?.[0]?.trim()),
      linkedIn:link('linkedin\\.com/'), github:link('github\\.com/'), portfolio:field(first.find(line=>/portfolio:\s*/i.test(line.text)),first.find(line=>/portfolio:\s*/i.test(line.text))?.text.replace(/.*portfolio:\s*/i,'')) },
    professionalSummary:summaryLines.map(line=>field(line)), experience:{ positions:records, totals:calculateCandidateExperience(records,now) },
    skills:{ items:skills, categories:Object.fromEntries(CANDIDATE_CATEGORIES.map(category=>[category,skills.filter(item=>item.category===category)])), testing:skills.filter(item=>item.category==='Testing') },
    projects, education, certifications, achievements:lines.filter(line=>!line.heading&&(line.section==='achievements'||measurable(line.text))).map(line=>field(line)),
    applicationContext:{}, writingContext:{previousApplicationEmail:'',preferences:''},
    source:{ originalResumeText:rawText, file:clone(metadata), extractionWarnings:metadata.warnings||[] }, verification:{userConfirmed:false}, corrections:[] };
}
export function verifyCandidateEvidence(profile) {
  const raw=profile.source.originalResumeText;
  function walk(value) {
    if (!value || typeof value!=='object') return;
    if (value.source==='resume' && Array.isArray(value.evidence)) {
      if (!value.evidence.length) throw new Error('A resume fact is missing source evidence.');
      for (const item of value.evidence) if (raw.slice(item.start,item.end)!==item.text) throw new Error('Resume evidence could not be verified.');
    }
    for (const item of Object.values(value)) walk(item);
  }
  walk(profile); return true;
}
export function candidateEditorValues(profile) {
  return { identity:Object.fromEntries(Object.entries(profile.identity).map(([key,item])=>[key,item?.value||''])),
    professionalSummary:profile.professionalSummary.map(item=>item.value),
    positions:profile.experience.positions.map(record=>({ company:record.company?.value||'', jobTitle:record.jobTitle?.value||'', employmentType:record.employmentType?.value||'other',
      startDate:record.startDate?.value||'', endDate:record.endDate?.value||'', location:record.location?.value||'', responsibilities:record.responsibilities.map(item=>item.value), achievements:record.achievements.map(item=>item.value), technologies:record.technologies.map(item=>item.value) })),
    skills:profile.skills.items.map(item=>item.value), projects:clone(profile.projects), education:clone(profile.education), certifications:clone(profile.certifications), achievements:profile.achievements.map(item=>item.value) };
}
export function applyCandidateCorrections(profile, values, context = {}, writing = {}, {now=new Date()}={}) {
  const output=clone(profile); const old=candidateEditorValues(profile);
  const corrected=(value,previous)=> value===''||value==null?null:previous?.value===value?clone(previous):fact(String(value),[],'user_provided');
  const list=(values,previous=[])=>{ if(!Array.isArray(values)||values.some(item=>typeof item!=='string')) throw new Error('Lists must contain text values.'); return [...new Set(values.map(item=>item.trim()).filter(Boolean))].map(value=>corrected(value,previous.find(item=>item.value===value))); };
  if(!values||!values.identity||!Array.isArray(values.positions)||!Array.isArray(values.skills)) throw new Error('Provide identity, positions, and skills in the profile editor.');
  for(const key of Object.keys(output.identity)) output.identity[key]=corrected(values.identity[key],profile.identity[key]);
  output.professionalSummary=list(values.professionalSummary,profile.professionalSummary);
  output.experience.positions=values.positions.map((record,index)=>{
    const previous=profile.experience.positions[index]; const result={ id:`employment-${index+1}`, rawText:previous?.rawText||'' };
    for(const key of ['company','jobTitle','employmentType','startDate','endDate','location']) result[key]=corrected(record[key],previous?.[key]);
    if(!['full_time','internship','other'].includes(result.employmentType?.value)) throw new Error('Employment type must be full_time, internship, or other.');
    for(const key of ['responsibilities','achievements','technologies']) result[key]=list(record[key]||[],previous?.[key]);
    const dateText=`${record.startDate||''} – ${record.endDate||''}`;
    result.originalDateRange=previous?.startDate?.value===record.startDate&&previous?.endDate?.value===record.endDate?previous.originalDateRange:fact(dateText,[],'user_provided');
    return result;
  });
  output.experience.totals=calculateCandidateExperience(output.experience.positions,now);
  output.skills.items=list(values.skills,profile.skills.items).map(item=>{
    const known=aliases.find(([value,pattern])=>{pattern.lastIndex=0; return value.toLowerCase()===item.value.toLowerCase()||pattern.test(item.value)&&item.value.length<30;});
    return {...item, value:known?.[0]||canonicalSkill(item.value).value, category:known?CANDIDATE_CATEGORIES[known[2]]:'Other Tools', evidenceSections:[...new Set(item.evidence.map(e=>e.section))]};
  }).filter((item,index,all)=>all.findIndex(other=>other.value===item.value)===index);
  output.skills.categories=Object.fromEntries(CANDIDATE_CATEGORIES.map(category=>[category,output.skills.items.filter(item=>item.category===category)])); output.skills.testing=output.skills.items.filter(item=>item.category==='Testing');
  // Structured records use their existing evidence when untouched; edited values are explicitly user provided.
  function structured(value,previous) {
    if(JSON.stringify(value)===JSON.stringify(previous)) return clone(previous);
    if(Array.isArray(value)) return value.map((item,index)=>structured(item,previous?.[index]));
    if(value&&typeof value==='object') {
      if('value' in value) return corrected(value.value,previous);
      return Object.fromEntries(Object.entries(value).filter(([key])=>!['evidence','source','userConfirmed'].includes(key)).map(([key,item])=>[key,['id','rawText'].includes(key)?item:structured(item,previous?.[key])]));
    }
    return typeof value==='string'?fact(value,[],'user_provided'):value;
  }
  for(const key of ['projects','education','certifications']) { if(!Array.isArray(values[key])) throw new Error(`${key} must be a list.`); output[key]=structured(values[key],profile[key]); }
  output.achievements=list(values.achievements,profile.achievements);
  for(const [key,value] of Object.entries(context)) { if(typeof value!=='string') throw new Error('Application context must be text.'); output.applicationContext[key]=corrected(value,profile.applicationContext[key]); }
  output.writingContext={previousApplicationEmail:String(writing.previousApplicationEmail||''),preferences:String(writing.preferences||'')};
  if(JSON.stringify(old)!==JSON.stringify(values)) output.corrections.push({timestamp:now.toISOString(),source:'user_provided'});
  output.confirmed=false; output.profileStatus='reviewing'; output.verification.userConfirmed=false;
  verifyCandidateEvidence(output); return output;
}
export function confirmCandidateProfile(profile,{now=new Date()}={}) {
  verifyCandidateEvidence(profile);
  const meaningful=profile.identity.name?.value||profile.skills.items.length||profile.experience.positions.length||profile.education.length||profile.projects.length;
  if(!meaningful) throw new Error('Add candidate information before confirming your profile.');
  const output=clone(profile);
  const walk=value=>{if(!value||typeof value!=='object')return;if('source' in value&&'value' in value)value.userConfirmed=true;Object.values(value).forEach(walk);};
  walk(output); output.confirmed=true;output.profileStatus='confirmed';output.confirmedAt=now.toISOString();output.verification.userConfirmed=true;return output;
}
