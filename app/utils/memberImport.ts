/**
 * Reading a list of people to import (Members → Import): a CSV exported from
 * Google Workspace, Microsoft 365 / Entra or a spreadsheet — or just pasted
 * addresses. Plain functions, no React: the import dialog previews what they
 * return, and the server checks it again.
 */

export interface ImportPerson {
  /** Lower case. */
  email: string
  /** As given, else from first and last name; may be empty (the address's own then). */
  displayName: string
  isAdmin: boolean
  /** An org unit, department or team, to import part of a list ("/Prague"). */
  group: string
}

export interface ImportList {
  people: ImportPerson[]
  /** Rows with no usable email: their line, and what was there. */
  invalid: { line: number; text: string }[]
  /** The groups found, A–Z (empty: the list has none). */
  groups: string[]
}

const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/

/** "Email Address [Required]" → "emailaddress": how a column is recognised. */
const normalizeHeader = (header: string) =>
  header
    .toLowerCase()
    .replace(/\[.*?\]/g, "")
    .replace(/[^a-z]/g, "")

/** Column names by meaning: Google's, Microsoft's, and a spreadsheet's. */
const COLUMNS = {
  email: ["email", "emailaddress", "primaryemail", "mail", "userprincipalname", "upn", "workemail"],
  name: ["name", "displayname", "fullname"],
  firstName: ["firstname", "givenname", "first"],
  lastName: ["lastname", "surname", "familyname", "last"],
  role: ["role", "hotseatrole"],
  group: ["orgunitpath", "orgunit", "organizationalunit", "department", "team", "office", "group"],
} as const

type Column = keyof typeof COLUMNS

/** The separator a CSV uses: the one its first line has most of (Excel in Czech: ";"). */
const detectSeparator = (firstLine: string) => {
  const counts = [",", ";", "\t"].map((separator) => ({
    separator,
    count: firstLine.split(separator).length,
  }))

  return counts.sort((first, second) => second.count - first.count)[0].separator
}

/** A quote, and the mark some programs start a UTF-8 file with. */
const QUOTE = String.raw`"`
const BYTE_ORDER_MARK = String.fromCharCode(0xfeff)

/** CSV rows (quoted fields, "" inside quotes, line breaks in quotes, CRLF, a BOM). */
export const parseCsv = (text: string) => {
  const source = text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text
  const separator = detectSeparator(source.split(/\r?\n/, 1)[0] ?? "")
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let isQuoted = false

  for (let index = 0; index < source.length; index++) {
    const character = source[index]

    if (isQuoted) {
      if (character === QUOTE && source[index + 1] === QUOTE) {
        field += QUOTE
        index++
      } else if (character === QUOTE) isQuoted = false
      else field += character
      continue
    }

    if (character === QUOTE && field === "") isQuoted = true
    else if (character === separator) {
      row.push(field)
      field = ""
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += character
  }
  if (field !== "" || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((cells) => cells.some((cell) => cell.trim() !== ""))
}

/** Which column holds what, from a header row (null: it isn't one). */
const readHeader = (cells: string[]) => {
  const columns: Partial<Record<Column, number>> = {}
  cells.forEach((cell, index) => {
    const header = normalizeHeader(cell)
    for (const [column, names] of Object.entries(COLUMNS) as [Column, readonly string[]][])
      if (columns[column] === undefined && names.includes(header)) columns[column] = index
  })

  return columns.email === undefined ? null : columns
}

const isAdminRole = (role: string) => /^(admin|administrator|správce)$/i.test(role.trim())

/**
 * The people in a list: a CSV with a header (its columns recognised by name),
 * or — no email column — every address found in it, one per person.
 */
export const readImportList = (text: string): ImportList => {
  const rows = parseCsv(text)
  const header = rows.length ? readHeader(rows[0]) : null
  const people = new Map<string, ImportPerson>()
  const invalid: ImportList["invalid"] = []

  const add = (person: ImportPerson) => {
    if (!people.has(person.email)) people.set(person.email, person)
  }

  if (header) {
    const cell = (row: string[], column: Column) => {
      const index = header[column]

      return index === undefined ? "" : (row[index] ?? "").trim()
    }

    rows.slice(1).forEach((row, index) => {
      const email = cell(row, "email").toLowerCase()
      if (!EMAIL.test(email)) {
        invalid.push({ line: index + 2, text: row.join(", ").slice(0, 80) })

        return
      }

      const fullName = [cell(row, "firstName"), cell(row, "lastName")].filter(Boolean).join(" ")
      add({
        email,
        displayName: cell(row, "name") || fullName,
        isAdmin: isAdminRole(cell(row, "role")),
        group: cell(row, "group"),
      })
    })
  } else {
    // Just addresses (pasted, one per line or separated): every one found.
    rows.forEach((row, index) => {
      const emails = row.flatMap((value) => value.split(/[\s,;]+/)).filter(Boolean)
      const found = emails.filter((value) => EMAIL.test(value.toLowerCase()))
      if (!found.length) invalid.push({ line: index + 1, text: row.join(", ").slice(0, 80) })
      for (const email of found)
        add({ email: email.toLowerCase(), displayName: "", isAdmin: false, group: "" })
    })
  }

  const list = [...people.values()]
  const groups = [...new Set(list.map((person) => person.group).filter(Boolean))].sort()

  return { people: list, invalid, groups }
}
