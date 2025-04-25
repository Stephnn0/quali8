export function formatToYYYYMMDD(dateInput: string | Date): string {
  console.log(dateInput, "-----------------------------------");

  if (dateInput === "") {
    return "";
  }

  const date = new Date(dateInput);

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
