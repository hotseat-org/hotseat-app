/// <reference types="bun" />
import { describe, expect, test } from "bun:test"
import { parseCsv, readImportList } from "./memberImport"

const QUOTE = String.raw`"`

describe("parseCsv", () => {
  test("reads quoted fields, doubled quotes, line breaks in quotes, CRLF and a BOM", () => {
    // A byte order mark, CRLF lines, a quoted comma, doubled quotes, a line break inside quotes.
    const csv = `\uFEFFname,note\r\n${QUOTE}Lovelace, Ada${QUOTE},${QUOTE}said ${QUOTE}${QUOTE}hi${QUOTE}${QUOTE}\nthen left${QUOTE}\r\nGrace,ok\r\n`

    expect(parseCsv(csv)).toEqual([
      ["name", "note"],
      ["Lovelace, Ada", `said ${QUOTE}hi${QUOTE}\nthen left`],
      ["Grace", "ok"],
    ])
  })

  test("uses the separator the header uses (semicolons from Czech Excel, tabs)", () => {
    expect(parseCsv("Email;Name\nada@acme.com;Ada")).toEqual([
      ["Email", "Name"],
      ["ada@acme.com", "Ada"],
    ])
    expect(parseCsv("Email\tName\nada@acme.com\tAda")).toEqual([
      ["Email", "Name"],
      ["ada@acme.com", "Ada"],
    ])
  })

  test("skips empty lines", () => {
    expect(parseCsv("a\n\n\nb\n")).toEqual([["a"], ["b"]])
  })
})

describe("readImportList", () => {
  test("a Google Workspace export: names from first and last, org units as groups", () => {
    const csv = [
      "First Name [Required],Last Name [Required],Email Address [Required],Org Unit Path [Required]",
      "Ada,Lovelace,Ada@Acme.com,/Prague",
      "Grace,Hopper,grace@acme.com,/Brno",
    ].join("\n")
    const list = readImportList(csv)

    expect(list.people).toEqual([
      {
        email: "ada@acme.com",
        displayName: "Ada Lovelace",
        isAdmin: false,
        group: "/Prague",
        teams: [],
      },
      {
        email: "grace@acme.com",
        displayName: "Grace Hopper",
        isAdmin: false,
        group: "/Brno",
        teams: [],
      },
    ])
    expect(list.groups).toEqual(["/Brno", "/Prague"])
    expect(list.invalid).toEqual([])
  })

  test("a Microsoft 365 export: user principal name and display name, departments", () => {
    const csv = [
      "User principal name,Display name,Department",
      "ada.lovelace@acme.com,Ada Lovelace,Engineering",
    ].join("\n")

    expect(readImportList(csv).people).toEqual([
      {
        email: "ada.lovelace@acme.com",
        displayName: "Ada Lovelace",
        isAdmin: false,
        group: "Engineering",
        teams: [],
      },
    ])
  })

  test("a spreadsheet with roles; bad rows are reported, repeats kept once", () => {
    const csv = [
      "Email;Name;Role",
      "ada@acme.com;Ada;Admin",
      "not an email;Bob;",
      "ADA@acme.com;Ada again;",
      "grace@acme.com;Grace;user",
    ].join("\n")
    const list = readImportList(csv)

    expect(list.people.map((person) => [person.email, person.isAdmin])).toEqual([
      ["ada@acme.com", true],
      ["grace@acme.com", false],
    ])
    expect(list.invalid).toEqual([{ line: 3, text: "not an email, Bob, " }])
  })

  test("a team column: people into teams, several separated", () => {
    const csv = [
      "Email,Name,Team",
      "ada@acme.com,Ada,Design; Frontend guild",
      "grace@acme.com,Grace,Design",
      "linus@acme.com,Linus,",
    ].join("\n")
    const list = readImportList(csv)

    expect(list.people.map((person) => person.teams)).toEqual([
      ["Design", "Frontend guild"],
      ["Design"],
      [],
    ])
    expect(list.teams).toEqual(["Design", "Frontend guild"])
    expect(list.groups).toEqual([])
  })

  test("just addresses, pasted: one per line, or separated", () => {
    const list = readImportList("ada@acme.com\ngrace@acme.com, linus@acme.com\nsomeone")

    expect(list.people.map((person) => person.email)).toEqual([
      "ada@acme.com",
      "grace@acme.com",
      "linus@acme.com",
    ])
    expect(list.invalid).toEqual([{ line: 3, text: "someone" }])
    expect(list.groups).toEqual([])
  })
})
