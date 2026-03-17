export function getDailyNotePath(
  vaultPath: string,
  dailyNotesFolder: string,
  filenameFormat: string,
  date: Date = new Date()
): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  const filename = filenameFormat
    .replace("YYYY", yyyy)
    .replace("MM", mm)
    .replace("DD", dd);

  const folder = dailyNotesFolder ? `/${dailyNotesFolder}` : "";
  return `${vaultPath}${folder}/${filename}.md`;
}
