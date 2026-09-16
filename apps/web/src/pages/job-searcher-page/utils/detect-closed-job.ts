/**
 * Detects if a job posting is closed based on description text
 */
export function isJobClosed(description: string | null): boolean {
  if (!description) return false;

  const closedPhrases = [
    // English
    "no longer accepting applications",
    "not accepting applications",
    "applications are closed",
    "this job is closed",
    "position has been filled",
    "posting is closed",
    "role has been filled",
    "we are no longer reviewing",
    "application deadline has passed",
    "applications closed",
    // Hebrew
    "כבר לא מקבלים בקשות", // "No longer accepting applications"
    "לא מקבלים בקשות", // "Not accepting applications"
    "המשרה אינה פתוחה", // "Position is not open"
    "המשרה נסגרה", // "Position closed"
    "התפקיד אינו פתוח", // "Role is not open"
  ];

  const desc = description.toLowerCase();
  return closedPhrases.some((phrase) => desc.includes(phrase.toLowerCase()));
}
