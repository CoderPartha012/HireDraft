import { load } from 'cheerio';
import { descriptionText } from './html-text.js';
import { linkedInResourceId } from '../validate-job-url.js';

const unique = values => [...new Set(values.filter(Boolean))];
const rolePattern = /\b(?:(?:Senior |Junior )?(?:Software |Automation )?QA Engineers?|SDETs?|Software Testers?|Automation Test Engineers?|(?:Senior |Junior )?(?:Software|Backend|Frontend|Full[ -]Stack) (?:Developers?|Engineers?)|Product Designers?|Data (?:Engineers?|Analysts?|Scientists?)|Test Engineers?|Quality Assurance Engineers?)\b/gi;
const strip = value => value?.replace(/^\s*(?:[•*#-]|\d+[.)])\s*/, '').trim();
const label = (text, names) => {
  const normalized = text.normalize('NFKC').split('\n').map(line => line.replace(/^[^\p{L}\p{N}]*/u, '')).join('\n');
  const match = normalized.match(new RegExp(`^(?:${names})\\s*[:：–—-]\\s*(.+)$`, 'im'));
  return match ? match[1].trim() : null;
};
const roleTitle = line => {
  let value = strip(line).replace(/^(?:job title|roles?|positions?|openings?|vacanc(?:y|ies))\s*[:：-]\s*/i, '')
    .replace(/^(?:(?:we(?:'|’)re|we are|immediate(?:ly)?)\s+)?hiring\s*[:：-]?\s*(?:for\s+)?/i, '')
    .replace(/^looking for\s+(?:an?\s+)?/i, '')
    .split(/\s+[–—|]|\s+-\s+|\s+(?:at|in|with|for)\s+|\s*[,;]|\s*\(?\d+\s*(?:[–—-]|\+|years?)/i)[0]
    .replace(/[.!:]+$/, '').trim();
  if (/^(?:an?\s+)?(?:job|jobs|opportunities|opportunity|advice|referral|work|talent|team|candidates?|professionals?)$/i.test(value)) return null;
  if (/^(?:advice|tips|trends|process|help|ideas)\b/i.test(value)) return null;
  const profession = /\b(?:engineers?|developers?|designers?|testers?|SDETs?|analysts?|scientists?|managers?|specialists?|consultants?|interns?|executives?|recruiters?|accountants?|architects?|administrators?|writers?|associates?|officers?|directors?|assistants?|technicians?)$/i;
  return value.length >= 3 && value.length <= 100 && profession.test(value) ? value : null;
};

export function hiringFacts(text) {
  const companyLabels = [...text.matchAll(/^\s*(?:company(?: name)?|hiring company|organization)\s*[:：–—-]\s*(.+)$/gim)].map(match => match[1].trim());
  const companyName = unique(companyLabels).length === 1 ? companyLabels[0] : companyLabels.length ? null
    : text.match(/\b(?:we(?:'|’)re hiring|we are hiring|hiring|looking for)\s+[^\n.!?]+?\s+at\s+([^\n.!?,]+?)(?=\s+in\s+|[.!?,\n]|$)/i)?.[1]?.trim() || null;
  const location = label(text, 'location|job location|work location')
    || text.match(/\b(?:in|location\s*:)\s+(Bangalore|Bengaluru|Hyderabad|Gurugram|Gurgaon|Pune|Mumbai|Chennai|Delhi|Noida|Remote)\b/i)?.[1] || null;
  const experience = label(text, 'experience|exp')
    || text.match(/\b\d+(?:\s*[–—-]\s*\d+|\s*\+)?\s*(?:years?|yrs?)(?:\s+(?:of\s+)?experience)?\b/i)?.[0]
    || text.match(/\bfreshers (?:can|may) apply\b/i)?.[0] || null;
  const skillsLine = label(text, '(?:required |technical )?skills|technologies|tech stack');
  const skills = skillsLine ? unique(skillsLine.split(/[,;|]/).map(value => value.trim()))
    : unique([...text.matchAll(/\b(?:Selenium|Playwright|Cypress|JavaScript|TypeScript|Python|Java|SQL|Postman|JMeter|Appium|React|Node\.js|API testing|manual testing|automation testing)\b/gi)].map(match => match[0]));
  const employmentType = label(text, 'employment type|job type') || text.match(/\b(?:full[ -]time|part[ -]time|internship|contract)\b/i)?.[0] || null;
  return { companyName, location, experience, skills, employmentType };
}

export function analyzeHiringText(text) {
  const lines = text.split('\n');
  const candidates = [];
  let inRoleList = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].normalize('NFKC').trim().replace(/^[^\p{L}\p{N}•*-]*/u, '');
    if (/^(?:(?:we(?:'|’)re|we are)\s+)?hiring\s*[:!]|^(?:open roles|openings|vacancies|positions)\s*:/i.test(line)) inRoleList = true;
    const explicit = /^(?:[•*\s]*)(?:job title|role|position)\s*[:：-]/i.test(line)
      || /\b(?:(?:we(?:'|’)re|we are|immediate(?:ly)?)\s+)?hiring\s*(?::\s*|\s+)(?!tips|advice|process|trends)/i.test(line)
      || /\blooking for\s+(?!advice|tips|help|ideas)/i.test(line);
    const numbered = inRoleList && /^\s*(?:\d+[.)]|[•*-])\s+/.test(line)
      && !/^(?:skills|experience|company|location|contact|email|apply)\s*:/i.test(strip(line));
    const known = [...line.matchAll(rolePattern)];
    const heading = known.length === 1 && strip(line).toLowerCase().startsWith(known[0][0].toLowerCase());
    const names = explicit || numbered || heading ? (known.length ? known.map(match => match[0]) : [roleTitle(line)]) : [];
    for (const name of names.filter(Boolean)) {
      if (candidates.some(role => role.jobTitle.toLowerCase() === name.toLowerCase())) continue;
      candidates.push({ id: `role-${candidates.length + 1}`, jobTitle: name, lineIndex: index });
    }
  }
  const negated = /\b(?:not|aren't|are not|isn't|is not|no longer)\s+(?:currently\s+)?hiring\b|\bhiring freeze\b|\b(?:looking|searching) for (?:a |my next |new )?(?:job|work|opportunit)|\b(?:i am|i'm|i’m) (?:looking|searching) for\b/i.test(text);
  const explicitIntent = /(?:\bwe(?:'|’)re hiring\b|\bwe are hiring\b|\bjoin our team\b|\b(?:job opening|vacanc(?:y|ies)|referrals open|immediate hiring|walk[ -]in)\b|#hiring\b)/i.test(text)
    || /\bhiring\s*[:!]/i.test(text)
    || (candidates.length > 0 && /\b(?:hiring|looking for)\s+(?!tips|advice|process|trends|help|ideas)/i.test(text));
  const isHiring = !negated && explicitIntent && candidates.length > 0;
  const facts = hiringFacts(text);
  if (candidates.length > 1) {
    // Only unambiguous shared labels outside role blocks carry across roles.
    const first = Math.min(...candidates.map(role => role.lineIndex));
    const shared = lines.slice(0, first).join('\n');
    for (let index = 0; index < candidates.length; index++) {
      const role = candidates[index];
      const nextLine = candidates.slice(index + 1).find(next => next.lineIndex > role.lineIndex)?.lineIndex || lines.length;
      const section = lines.slice(role.lineIndex, nextLine).join('\n');
      const specific = hiringFacts(section);
      const global = hiringFacts(shared);
      Object.assign(role, {
        content: `${shared.trim()}\n\n${section.trim()}`.trim(),
        companyName: specific.companyName || global.companyName,
        location: specific.location || global.location, experience: specific.experience || global.experience,
        skills: specific.skills.length ? specific.skills : global.skills,
        employmentType: specific.employmentType || global.employmentType,
      });
      // Roles mentioned on a single line have no separable per-role context.
      if (candidates.some(other => other !== role && other.lineIndex === role.lineIndex)) {
        role.content = null;
        role.location = global.location; role.experience = null; role.skills = []; role.employmentType = null;
      }
    }
  } else if (candidates.length === 1) {
    Object.assign(candidates[0], { content: text, ...facts });
  }
  return { isHiring, roles: candidates.map(({ lineIndex, ...role }) => ({ ...role, ...contactFacts(role.content || '') })), ...facts };
}

function safeLink(value, base) {
  try {
    const url = new URL(value, base);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function contactFacts(text) {
  const applicationEmails = unique([...text.matchAll(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi)].map(match => match[0]));
  const applicationLinks = unique([...text.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(match => safeLink(match[0].replace(/[.,;)]+$/, ''))))
    .filter(link => !/(^|\.)linkedin\.com$/.test(new URL(link).hostname));
  const labeledPhone = label(text, '(?:contact|phone|mobile)(?: number)?');
  const contactNumbers = unique([
    ...[...text.matchAll(/(?:\+\d{1,3}[ -]?)?(?:\(?\d{3,4}\)?[ -])\d{3,4}[ -]\d{3,4}\b/g)].map(match => match[0]),
    labeledPhone && /^[+()\d -]{8,25}$/.test(labeledPhone) ? labeledPhone : null,
  ]);
  const emailFromLabel = names => label(text, names)?.match(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/i)?.[0] || null;
  const named = label(text, '(?:recruiter|hr)(?: name)?|contact name');
  return { applicationEmails, applicationEmail: emailFromLabel('application email|apply(?: at| to)?|email'),
    applicationLinks, applicationLink: applicationLinks.length === 1 ? applicationLinks[0] : null, contactNumbers,
    recruiterName: named && !named.includes('@') ? named : null, recruiterEmail: emailFromLabel('(?:recruiter|hr)(?: email)?') };
}

export function parsePostPage(html, sourceUrl, now = () => new Date()) {
  const $ = load(html);
  const posts = [];
  function collect(value) {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== 'object') return;
    if ([value['@type']].flat().some(type => /^(?:SocialMediaPosting|DiscussionForumPosting|Article)$/.test(type))) posts.push(value);
    if (value['@graph']) collect(value['@graph']);
    if (value.mainEntity) collect(value.mainEntity);
  }
  $('script[type="application/ld+json"]').each((_, node) => { try { collect(JSON.parse($(node).text())); } catch { /* Try page content. */ } });
  const id = linkedInResourceId(sourceUrl);
  const matches = post => {
    const link = post.url || post['@id'] || post.mainEntityOfPage?.['@id'];
    if (!link) return null;
    try { return linkedInResourceId(new URL(link, sourceUrl).href) === id; } catch { return false; }
  };
  const structured = posts.find(post => matches(post) === true)
    || (posts.length === 1 && matches(posts[0]) !== false ? posts[0] : null);
  // Scope author/content to the main post, never comments or related posts.
  const roots = $('.main-feed-card, .feed-shared-update-v2, article[data-urn]');
  const matchingRoot = roots.filter((_, node) => ($(node).attr('data-urn') || '').includes(`activity:${id}`)).first();
  const root = matchingRoot.length ? matchingRoot : roots.length === 1 ? roots.first() : roots.length === 0 ? $.root() : null;
  const contentNode = root?.find('.attributed-text-segment-list__content, .feed-shared-update-v2__description, [data-test-id="main-feed-activity-card__commentary"], [itemprop="articleBody"]').first();
  const rawPost = structured?.articleBody || structured?.text || contentNode?.html() || null;
  const text = descriptionText(rawPost);
  const author = Array.isArray(structured?.author) ? structured.author[0] : structured?.author;
  const authorName = typeof author === 'string' ? author : author?.name;
  const profile = safeLink(author?.url || root?.find('.base-main-feed-card__actor-link, .feed-shared-actor__container-link').first().attr('href'), sourceUrl);
  const profileUrl = profile && ['linkedin.com', 'www.linkedin.com'].includes(new URL(profile).hostname) && /^\/in\//.test(new URL(profile).pathname) ? profile : null;
  const analysis = analyzeHiringText(text || '');
  const contacts = contactFacts(text || '');
  const links = unique([
    ...contacts.applicationLinks,
    ...(contentNode?.find('a[href]').toArray() || []).map(node => safeLink($(node).attr('href'), sourceUrl)),
  ]).filter(link => !/(^|\.)linkedin\.com$/.test(new URL(link).hostname));
  const jobTitle = analysis.roles.length === 1 ? analysis.roles[0].jobTitle : null;
  const extractionStatus = !text || !analysis.isHiring ? 'failed' : jobTitle && analysis.companyName && text.replace(/\s/g, '').length >= 40 ? 'success' : 'partial';
  return {
    source: 'LinkedIn', sourceType: 'linkedin_post', sourceUrl, jobTitle,
    companyName: analysis.companyName, location: analysis.location,
    experience: analysis.roles.length > 1 ? null : analysis.experience,
    skills: analysis.roles.length > 1 ? [] : analysis.skills,
    employmentType: analysis.roles.length > 1 ? null : analysis.employmentType,
    jobDescription: text, jobSourceContent: text, originalPostContent: text,
    postAuthorName: descriptionText(authorName || root?.find('.base-main-feed-card__title, .feed-shared-actor__title').first().text()) || null,
    postAuthorHeadline: descriptionText(author?.jobTitle || root?.find('.base-main-feed-card__subtitle, .feed-shared-actor__description').first().text()) || null,
    authorProfileUrl: profileUrl, publishedAt: structured?.datePublished || root?.find('time[datetime]').first().attr('datetime') || null,
    ...contacts, applicationLink: links.length === 1 ? links[0] : null, applicationLinks: links,
    roles: analysis.roles, isHiring: analysis.isHiring, extractionStatus, extractedAt: now().toISOString(),
    raw: { postContent: rawPost }, provenance: { jobSourceContent: structured?.articleBody || structured?.text ? 'structured' : text ? 'page' : null },
  };
}
