/** Common downstream contract. Extraction remains immutable; review creates copies. */
export function normalizeJobProfile(job) {
  return {
    source: 'LinkedIn', sourcePlatform: 'LinkedIn', sourceType: job.sourceType || 'linkedin_job',
    sourceUrl: job.sourceUrl, jobTitle: job.jobTitle || null, companyName: job.companyName || null,
    location: job.location || null, experience: job.experience || null, skills: [...(job.skills || [])],
    employmentType: job.employmentType || null, jobSourceContent: job.jobSourceContent || job.jobDescription || null,
    jobDescription: job.jobDescription || job.jobSourceContent || null,
    recruiterName: job.recruiterName || null, recruiterEmail: job.recruiterEmail || null,
    applicationEmail: job.applicationEmail || null, applicationEmails: [...(job.applicationEmails || [])],
    applicationLink: job.applicationLink || null, applicationLinks: [...(job.applicationLinks || [])],
    contactNumbers: [...(job.contactNumbers || [])],
    postAuthorName: job.postAuthorName || null, postAuthorHeadline: job.postAuthorHeadline || null,
    authorProfileUrl: job.authorProfileUrl || null, publishedAt: job.publishedAt || null,
    originalPostContent: job.originalPostContent || null, extractionStatus: job.extractionStatus,
    extractedAt: job.extractedAt || null, roles: (job.roles || []).map(role => ({ ...role, skills: [...(role.skills || [])] })),
    selectedRoleId: null, requiresRoleSelection: (job.roles || []).length > 1,
    entryMethod: job.entryMethod || 'automatic', confirmed: false,
  };
}

export function selectProfileRole(profile, roleId) {
  const role = profile.roles.find(candidate => candidate.id === roleId);
  if (!role) throw new Error('Select a role from this post.');
  // Role-specific data never falls back to another role's section.
  return { ...profile, jobTitle: role.jobTitle, companyName: role.companyName ?? null, location: role.location ?? null,
    experience: role.experience ?? null, skills: [...(role.skills || [])], employmentType: role.employmentType ?? null,
    jobSourceContent: role.content, jobDescription: role.content, selectedRoleId: roleId,
    applicationEmails: [...(role.applicationEmails || [])], applicationEmail: role.applicationEmail || null,
    applicationLinks: [...(role.applicationLinks || [])], applicationLink: role.applicationLink || null,
    recruiterName: role.recruiterName || null, recruiterEmail: role.recruiterEmail || null,
    contactNumbers: [...(role.contactNumbers || [])],
    roles: [{ ...role, skills: [...(role.skills || [])] }],
    requiresRoleSelection: false, confirmed: false };
}

export function validateProfileReview(profile) {
  if (profile.requiresRoleSelection) return 'Select which role you want to apply for.';
  if (!profile.jobTitle?.trim()) return 'Job title is required.';
  if (!profile.jobSourceContent?.trim()) return 'Job description or hiring post content is required.';
  if (profile.recruiterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.recruiterEmail)) return 'Please enter a valid recruiter email.';
  return null;
}

export function confirmJobProfile(profile, now = () => new Date()) {
  const error = validateProfileReview(profile);
  if (error) throw new Error(error);
  // JSON cloning isolates the confirmed handoff from subsequent review edits.
  return { ...JSON.parse(JSON.stringify(profile)), confirmed: true, confirmedAt: now().toISOString() };
}
