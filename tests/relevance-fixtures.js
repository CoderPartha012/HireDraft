import { analyzeJobRequirements, confirmRequirementsProfile } from '../src/requirements-analysis.js';
import { buildCandidateProfile, candidateEditorValues, applyCandidateCorrections, confirmCandidateProfile } from '../src/candidate-profile.js';
export const now=new Date('2026-09-15T00:00:00Z');
export function jobProfile(text='Required Skills: Selenium, Java\nPreferred Skills: Playwright') {
  return confirmRequirementsProfile(analyzeJobRequirements({confirmed:true,jobTitle:'QA Automation Engineer',companyName:'Example',location:'Gurugram, India',
    sourceType:'linkedin_job',sourceUrl:'https://www.linkedin.com/jobs/view/123',jobSourceContent:text}),()=>now);
}
export const resume=`Jane Doe
QA Engineer
Location: Kolkata, India
Summary
QA Engineer working on a LegalTech SaaS product.
Experience
QA Engineer at Company A | Full-time
December 2024 – September 2026
• Created and maintained hundreds of test cases and performed regression testing using Selenium WebDriver with Java.
• Used New Relic for transaction traces, error analytics, response-time monitoring and dashboards.
• Logged 180+ defects and reduced regression effort by 40%.
QA Intern at Company B
June 2024 – December 2024
• Tested REST APIs using Postman.
Skills
Selenium WebDriver, Java, Playwright, Postman, MySQL, Regression Testing
Projects
Project: Playwright Test Suite
• Built Playwright automation tests.
Project: React App
• Built a React task management application.
Education
B.Tech in Computer Science and Engineering
Example University
2020 – 2024
Certifications
Software Testing Course`;
export function candidateProfile(text=resume,context={}) {
  const profile=buildCandidateProfile(text,{name:'resume.pdf'},{now});
  return confirmCandidateProfile(applyCandidateCorrections(profile,candidateEditorValues(profile),context,{}, {now}),{now});
}
