import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateProfile, candidateEditorValues, applyCandidateCorrections, confirmCandidateProfile, verifyCandidateEvidence, calculateCandidateExperience } from '../src/candidate-profile.js';
const now=new Date('2026-09-15T00:00:00Z');
const resume=`Partha Rakshit
QA Engineer
Location: Kolkata, India
partha@example.com | +91 9876543210
https://linkedin.com/in/partha
https://github.com/partha
Summary
QA Engineer experienced in web testing.
Experience
QA Engineer at Company A | Full-time
September 2024 – May 2026
• Created 300+ test cases using Selenium and Java.
• Reduced regression effort by 40%.
QA Intern at Company B
March 2024 – September 2024
• Tested REST APIs using Postman.
Skills
Java, Selenium WebDriver, Playwright, Postman, MySQL, JUnit, New Relic, Taiga
Projects
Project: Web Test Suite
• Built Playwright tests with TypeScript.
Education
B.Tech Computer Science and Engineering
Lovely Professional University
2020 – 2024
CGPA: 8.08
Certifications
ISTQB Foundation | Issued by ISTQB | 2024`;
const build=()=>buildCandidateProfile(resume,{name:'resume.pdf'},{now});
test('complete resume identity, employment, projects, education, certifications and metrics retain evidence',()=>{
 const p=build();assert.equal(p.identity.name.value,'Partha Rakshit');assert.equal(p.identity.email.value,'partha@example.com');assert.equal(p.identity.location.value,'Kolkata, India');
 assert.equal(p.experience.positions.length,2);assert.equal(p.experience.positions[0].company.value,'Company A');assert.equal(p.experience.positions[1].company.value,'Company B');
 assert.equal(p.experience.positions[0].startDate.value,'September 2024');assert.equal(p.experience.positions[0].endDate.value,'May 2026');
 assert.equal(p.experience.totals.fullTime.value,20);assert.equal(p.experience.totals.internships.value,6);assert.equal(p.experience.totals.overallCombined.value,26);
 assert.equal(p.projects.length,1);assert.equal(p.education[0].graduationYear.value,'2024');assert.equal(p.certifications.length,1);assert.match(p.achievements.map(item=>item.value).join('\n'),/40%/);assert.equal(verifyCandidateEvidence(p),true);
});
test('skills deduplicate aliases and preserve distinct evidence sections without JD contamination',()=>{const p=build();const selenium=p.skills.items.filter(item=>item.value==='Selenium WebDriver');assert.equal(selenium.length,1);assert.deepEqual(selenium[0].evidenceSections,['experience','skills']);assert.deepEqual(p.skills.items.find(item=>item.value==='Playwright').evidenceSections,['skills','projects']);assert.equal(p.skills.items.some(item=>item.value==='Appium'),false);});
test('projects and certifications alone never create professional tenure',()=>{const p=buildCandidateProfile('Jane Doe\nProjects\nProject: Selenium suite\n• Built tests from 2020 – 2026\nCertifications\nJava Certificate 2020');assert.equal(p.experience.positions.length,0);assert.equal(p.experience.totals.fullTime.value,0);assert.equal(p.experience.totals.overallCombined.value,0);});
test('corrections preserve source and classify context without copying previous email claims',()=>{const p=build(),values=candidateEditorValues(p);values.identity.name='Correct Name';values.positions[0].endDate='Present';values.skills.push('User Tool');const edited=applyCandidateCorrections(p,values,{noticePeriod:'Immediate',expectedCTC:'10 LPA'},{previousApplicationEmail:'I have 10 years Appium experience.',preferences:'Concise'},{now});assert.equal(edited.identity.name.source,'user_provided');assert.equal(edited.applicationContext.noticePeriod.source,'user_provided');assert.equal(edited.experience.positions[0].currentPosition,true);assert.equal(edited.skills.items.some(item=>item.value==='Appium'),false);assert.equal(edited.source.originalResumeText,resume);assert.equal(p.identity.name.value,'Partha Rakshit');assert.equal(edited.experience.totals.fullTime.value,24);assert.equal(verifyCandidateEvidence(edited),true);});
test('confirmation is independent deep snapshot; edits and evidence tampering cannot bypass review',()=>{const p=build(),confirmed=confirmCandidateProfile(p,{now});assert.equal(confirmed.confirmed,true);assert.equal(confirmed.identity.name.source,'resume');assert.equal(confirmed.identity.name.userConfirmed,true);p.identity.name.value='Changed';assert.equal(confirmed.identity.name.value,'Partha Rakshit');confirmed.source.originalResumeText='tampered';assert.throws(()=>confirmCandidateProfile(confirmed),/evidence/);assert.throws(()=>confirmCandidateProfile(buildCandidateProfile('')),/Add candidate/);});
test('overlapping employment dates are counted once; year-only, future, reversed and unspecified types remain cautious',()=>{const positions=[['2024-01','2025-01','full_time'],['2024-06','2025-06','full_time'],['2024','2025','internship'],['2026-08','2026-07','full_time'],['2026-10','Present','full_time'],['2025-06','2025-09','other']].map(([a,b,type],index)=>({id:String(index),startDate:{value:a},endDate:{value:b},employmentType:{value:type}}));const totals=calculateCandidateExperience(positions,now);assert.equal(totals.fullTime.value,17);assert.equal(totals.otherRelevant.value,3);assert.equal(totals.overallCombined.value,20);assert.equal(totals.warnings.length,3);});
test('partial resumes can be reviewed and missing fields are not invented',()=>{const p=buildCandidateProfile('Jane Doe\nSkills\nSelenium');assert.equal(p.identity.email,null);assert.equal(p.experience.positions.length,0);assert.equal(confirmCandidateProfile(p).confirmed,true);});
test('employment without bullets or inline company delimiters remains separate',()=>{const p=buildCandidateProfile('Jane Doe\nExperience\nQA Engineer\nCompany A\nSeptember 2024 – May 2026\nQA Intern\nCompany B\nMarch 2024 – September 2024');assert.equal(p.experience.positions.length,2);assert.equal(p.experience.positions[0].company.value,'Company A');assert.equal(p.experience.positions[1].company.value,'Company B');assert.equal(p.experience.positions[1].employmentType.value,'internship');});
test('unbulleted responsibilities and labeled work locations are preserved',()=>{const p=buildCandidateProfile('Jane Doe\nExperience\nQA Engineer at Company A | Full-time\nSeptember 2024 – May 2026\nLocation: Kolkata\nCreated 300 test cases with Selenium\nReduced effort by 40%');assert.equal(p.experience.positions.length,1);assert.equal(p.experience.positions[0].location.value,'Kolkata');assert.equal(p.experience.positions[0].responsibilities.length,2);});
test('edited records, skills and dates retain user provenance, removals persist',()=>{const p=build(),v=candidateEditorValues(p);v.positions.splice(1,1);v.positions[0].company='Correct Company';v.skills=['Selenium','Selenium WebDriver'];v.projects[0].name.value='Correct project';v.education[0].score.value='CGPA: 8.5';const out=applyCandidateCorrections(p,v,{}, {},{now});assert.equal(out.experience.positions.length,1);assert.equal(out.experience.positions[0].company.source,'user_provided');assert.equal(out.skills.items.length,1);assert.equal(out.projects[0].name.source,'user_provided');assert.equal(out.education[0].score.source,'user_provided');});
