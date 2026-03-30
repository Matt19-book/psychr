/**
 * R Package Manager Utility
 *
 * Checks for required R packages and offers to install missing ones.
 * Called on startup and before running analyses that need specific packages.
 */

// All packages PsychR depends on, grouped by feature area
export const REQUIRED_PACKAGES: Record<string, { packages: string[]; description: string }> = {
  core: {
    packages: ['jsonlite', 'stats', 'base'],
    description: 'Required for all PsychR functionality',
  },
  dataImport: {
    packages: ['haven', 'readxl', 'readr', 'foreign'],
    description: 'Import SPSS, Excel, and CSV files',
  },
  wrangling: {
    packages: ['dplyr', 'tidyr', 'purrr', 'stringr'],
    description: 'Data cleaning and transformation',
  },
  largeData: {
    packages: ['duckdb', 'arrow'],
    description: 'Large dataset support (DuckDB + Apache Arrow)',
  },
  descriptives: {
    packages: ['psych', 'pastecs'],
    description: 'Descriptive statistics',
  },
  comparisons: {
    packages: ['car', 'effectsize', 'emmeans', 'rstatix'],
    description: 't-tests, ANOVA, and post-hoc tests',
  },
  regression: {
    packages: ['car', 'effectsize', 'mediation', 'interactions'],
    description: 'Regression, moderation, and mediation',
  },
  factorAnalysis: {
    packages: ['lavaan', 'semTools', 'psych', 'GPArotation'],
    description: 'EFA and CFA / SEM',
  },
  reliability: {
    packages: ['psych', 'irr'],
    description: 'Cronbach alpha, omega, ICC',
  },
  power: {
    packages: ['pwr', 'WebPower'],
    description: 'Power analysis and sample size planning',
  },
  irt: {
    packages: ['mirt', 'TAM', 'eRm', 'WrightMap'],
    description: 'Item Response Theory (Rasch, 2PL, 3PL)',
  },
  visualization: {
    packages: ['ggplot2', 'ggpubr', 'patchwork', 'scales', 'base64enc'],
    description: 'ggplot2 charts and plot export',
  },
  reporting: {
    packages: ['knitr', 'rmarkdown'],
    description: 'R Markdown report generation',
  },
}

/**
 * Generates an R script that checks for and installs missing packages.
 * Call this on startup via the R bridge.
 */
export function buildPackageCheckScript(featureArea?: string): string {
  const groups = featureArea
    ? { [featureArea]: REQUIRED_PACKAGES[featureArea] }
    : REQUIRED_PACKAGES

  const allPackages = Array.from(
    new Set(Object.values(groups).flatMap((g) => g.packages))
  )

  return `
library(jsonlite)

packages_to_check <- c(${allPackages.map((p) => `"${p}"`).join(', ')})

check_results <- lapply(packages_to_check, function(pkg) {
  installed <- requireNamespace(pkg, quietly = TRUE)
  list(
    package   = pkg,
    installed = installed,
    version   = if (installed) as.character(packageVersion(pkg)) else NA
  )
})

missing <- Filter(function(x) !x$installed, check_results)

cat(toJSON(list(
  success       = TRUE,
  total         = length(packages_to_check),
  installed     = sum(sapply(check_results, function(x) x$installed)),
  missing_count = length(missing),
  missing       = missing,
  all           = check_results
), auto_unbox = TRUE))
`
}

/**
 * Generates an R script that installs a list of packages.
 */
export function buildInstallScript(packages: string[]): string {
  const pkgList = packages.map((p) => `"${p}"`).join(', ')
  return `
library(jsonlite)
pkgs <- c(${pkgList})
install.packages(pkgs, repos = "https://cloud.r-project.org", quiet = FALSE)

# Verify installation
results <- lapply(pkgs, function(pkg) {
  list(package = pkg, installed = requireNamespace(pkg, quietly = TRUE))
})

cat(toJSON(list(
  success = TRUE,
  results = results
), auto_unbox = TRUE))
`
}
