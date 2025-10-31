// Utility functions for parsing CSV files with proper handling of quoted values

export function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split("\n").filter((line) => line.trim())

  if (lines.length < 2) {
    throw new Error("CSV file must have headers and at least one data row")
  }

  const headers = parseCSVRow(lines[0]).map((h) => h.trim().toLowerCase())
  const rows = lines.slice(1).map((line) => parseCSVRow(line))

  return { headers, rows }
}

export function parseCSVRow(row: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < row.length; i++) {
    const char = row[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }

  values.push(current.trim())
  return values
}

export function csvRowToObject(headers: string[], values: string[]): Record<string, string> {
  const obj: Record<string, string> = {}
  headers.forEach((header, i) => {
    obj[header] = values[i] || ""
  })
  return obj
}
