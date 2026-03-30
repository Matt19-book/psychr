/**
 * APA-7 Formatting Utilities
 *
 * Helpers for formatting statistical results in APA-7 style.
 * Used by result display components to format numbers, p-values,
 * and test statistics consistently.
 */

/**
 * Format a p-value in APA-7 style.
 * - p < .001 → "p < .001"
 * - p = .023 → "p = .023"
 * - p = .100 → "p = .100" (never round to 1.000)
 */
export function formatP(p: number): string {
  if (p < 0.001) return 'p < .001'
  const formatted = p.toFixed(3).replace('0.', '.')
  return `p = ${formatted}`
}

/**
 * Format a correlation coefficient.
 * APA omits leading zero: .47 not 0.47
 */
export function formatR(r: number): string {
  const abs = Math.abs(r)
  const formatted = abs.toFixed(2).replace('0.', '.')
  return r < 0 ? `−${formatted}` : formatted
}

/**
 * Format Cohen's d effect size with label.
 */
export function formatCohenD(d: number): string {
  const abs = Math.abs(d)
  const label = abs < 0.2 ? 'negligible' : abs < 0.5 ? 'small' : abs < 0.8 ? 'medium' : 'large'
  return `d = ${d.toFixed(2)} (${label})`
}

/**
 * Format eta-squared effect size with label.
 */
export function formatEta2(eta2: number): string {
  const label = eta2 < 0.01 ? 'negligible' : eta2 < 0.06 ? 'small' : eta2 < 0.14 ? 'medium' : 'large'
  return `η² = ${eta2.toFixed(3)} (${label})`
}

/**
 * Format a t-test result as an APA in-text string.
 * e.g. "t(38) = 2.34, p = .024, d = 0.74"
 */
export function formatTTest(t: number, df: number, p: number, d?: number): string {
  const parts = [`t(${df.toFixed(0)}) = ${t.toFixed(2)}`, formatP(p)]
  if (d !== undefined) parts.push(`d = ${Math.abs(d).toFixed(2)}`)
  return parts.join(', ')
}

/**
 * Format a one-way ANOVA result as APA in-text string.
 * e.g. "F(2, 57) = 5.43, p = .007, η² = .160"
 */
export function formatANOVA(F: number, df1: number, df2: number, p: number, eta2?: number): string {
  const parts = [`F(${df1}, ${df2}) = ${F.toFixed(2)}`, formatP(p)]
  if (eta2 !== undefined) parts.push(`η² = ${eta2.toFixed(3)}`)
  return parts.join(', ')
}

/**
 * Format a linear regression model summary as APA in-text string.
 * e.g. "R² = .34, F(3, 96) = 16.35, p < .001"
 */
export function formatRegressionModel(r2: number, F: number, df1: number, df2: number, p: number): string {
  return `R² = ${r2.toFixed(2)}, F(${df1}, ${df2}) = ${F.toFixed(2)}, ${formatP(p)}`
}

/**
 * Round a number to a given number of decimal places,
 * suppressing trailing zeros per APA convention.
 */
export function apaRound(n: number, decimals = 3): string {
  return n.toFixed(decimals)
}

/**
 * Format a confidence interval.
 * e.g. "95% CI [0.12, 0.58]"
 */
export function formatCI(lower: number, upper: number, level = 95): string {
  return `${level}% CI [${lower.toFixed(2)}, ${upper.toFixed(2)}]`
}
