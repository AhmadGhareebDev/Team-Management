import { describe, expect, it } from "vitest"
import {
  PAGE_SIZES,
  pageCount,
  parsePage,
  toOffset,
  toParams,
} from "@/lib/pagination"

/**
 * Pagination is done in SQL, so every one of these numbers reaches a LIMIT and
 * OFFSET. A bad offset is an empty list rather than an error, which is easy to
 * ship and annoying to debug, so the edge cases get pinned here.
 */

describe("parsePage", () => {
  it("reads a valid page from the query string", () => {
    expect(parsePage("3")).toBe(3)
  })

  it("takes the first value when a param repeats", () => {
    expect(parsePage(["2", "9"])).toBe(2)
  })

  it("falls back to page one when absent", () => {
    expect(parsePage(undefined)).toBe(1)
  })

  it("falls back to page one for zero and negatives", () => {
    expect(parsePage("0")).toBe(1)
    expect(parsePage("-4")).toBe(1)
  })

  it("falls back to page one for junk rather than throwing", () => {
    expect(parsePage("abc")).toBe(1)
    expect(parsePage("")).toBe(1)
  })

  it("ignores a trailing suffix the way parseInt does", () => {
    // Matches how the value behaves everywhere else it is read.
    expect(parsePage("2abc")).toBe(2)
  })
})

describe("toOffset", () => {
  it("converts one-based pages to a zero-based offset", () => {
    expect(toOffset(1, 10)).toBe(0)
    expect(toOffset(2, 10)).toBe(10)
    expect(toOffset(3, 10)).toBe(20)
  })

  it("clamps a nonsense page to the first page rather than going negative", () => {
    expect(toOffset(0, 10)).toBe(0)
    expect(toOffset(-5, 10)).toBe(0)
  })
})

describe("pageCount", () => {
  it("rounds a partial page up", () => {
    expect(pageCount(25, 10)).toBe(3)
  })

  it("is exact on a whole number of pages", () => {
    expect(pageCount(20, 10)).toBe(2)
  })

  it("always reports at least one page so the pager renders", () => {
    expect(pageCount(0, 10)).toBe(1)
  })
})

describe("toParams", () => {
  it("drops empty values so they do not clutter the URL", () => {
    expect(toParams({ page: "2", status: "" })).toEqual({ page: "2" })
  })

  it("unwraps repeated params to the first value", () => {
    expect(toParams({ tab: ["tasks", "members"] })).toEqual({ tab: "tasks" })
  })

  it("returns an empty object for no params", () => {
    expect(toParams({})).toEqual({})
    expect(toParams(undefined)).toEqual({})
  })

  it("round trips with parsePage", () => {
    const params = toParams({ page: "4" })
    expect(parsePage(params.page)).toBe(4)
  })
})

describe("PAGE_SIZES", () => {
  it("keeps every size positive", () => {
    for (const size of Object.values(PAGE_SIZES)) {
      expect(size).toBeGreaterThan(0)
    }
  })
})