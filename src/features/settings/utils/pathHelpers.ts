export function getDailyNotePath(
  vaultPath: string,
  dailyNotesFolder: string,
  filenameFormat: string
): string {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const filename = filenameFormat
    .replace("YYYY", yyyy)
    .replace("MM", mm)
    .replace("DD", dd);

  const folder = dailyNotesFolder ? `/${dailyNotesFolder}` : "";
  return `${vaultPath}${folder}/${filename}.md`;
}
