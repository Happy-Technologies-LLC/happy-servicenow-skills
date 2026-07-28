export function assertSameSkillPaths(sourcePaths, candidatePaths) {
  const missing = [...sourcePaths].filter(path => !candidatePaths.has(path)).sort();
  const unexpected = [...candidatePaths].filter(path => !sourcePaths.has(path)).sort();

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error([
      'Skill path sets differ.',
      `Missing: ${missing.join(', ') || '(none)'}`,
      `Unexpected: ${unexpected.join(', ') || '(none)'}`
    ].join('\n'));
  }
}
