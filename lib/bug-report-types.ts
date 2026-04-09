/**
 * Shared types for the client-side bug report log capture system.
 */

export type LogType =
  | 'js_error'        // window.onerror / window.onunhandledrejection
  | 'console_error'   // console.error(...)
  | 'console_warn'    // console.warn(...)
  | 'fetch_fail'      // fetch() returned non-2xx or threw network error
  | 'nav'             // client-side route change

export type LogEntry = {
  /** Unix timestamp in ms */
  ts: number
  type: LogType
  /** Human-readable summary */
  message: string
  /** Stack trace, HTTP status, or other detail */
  detail?: string
}

export type BugReportPayload = {
  /** What the user typed to describe the issue */
  description: string
  /** Optional contact email the user provided */
  userEmail?: string
  /** Full URL of the page the user is on */
  pageUrl: string
  /** navigator.userAgent */
  userAgent: string
  /** Screen dimensions */
  screen: { width: number; height: number }
  /** Log entries from the last 5 minutes */
  logs: LogEntry[]
  /** ISO timestamp when the report was submitted */
  submittedAt: string
}
