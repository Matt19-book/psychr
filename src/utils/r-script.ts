export const DEFAULT_GRID_PREVIEW_ROWS = 500
export const DEFAULT_R_RESULT_PREVIEW_ROWS = 200
export const CORE_R_PACKAGES = [
  'dplyr',
  'tidyr',
  'readr',
  'readxl',
  'haven',
  'ggplot2',
  'psych',
]

export function quoteRString(value: string): string {
  return JSON.stringify(value)
}

export function quoteRName(name: string): string {
  return `\`${name.replace(/`/g, '``')}\``
}

export function quoteRNames(names: string[]): string {
  return `c(${names.map(quoteRString).join(', ')})`
}

export function quoteRAccess(name: string, source = 'df'): string {
  return `${source}[[${quoteRString(name)}]]`
}

export function sanitizeRObjectName(input: string): string {
  const cleaned = input
    .replace(/\.[^.]+$/, '')
    .replace(/^[^A-Za-z.]+/, '')
    .replace(/[^A-Za-z0-9._]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^$/, 'data')

  return /^[A-Za-z.]/.test(cleaned) ? cleaned : `data_${cleaned}`
}

export function createDatasetObjectName(existingObjectNames: string[]): string {
  const base = 'data'
  let candidate = base
  let index = 2

  while (existingObjectNames.includes(candidate)) {
    candidate = `${base}_${index}`
    index += 1
  }

  return candidate
}

export function buildLibraryBlock(): string {
  return CORE_R_PACKAGES.map((pkg) => `library(${pkg})`).join('\n')
}

export function buildImportCommand(extension: string, filePath: string, objectName: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/')
  const quotedPath = quoteRString(normalizedPath)

  if (extension === 'csv') {
    return `${objectName} <- readr::read_csv(${quotedPath})`
  }
  if (extension === 'tsv') {
    return `${objectName} <- readr::read_tsv(${quotedPath})`
  }
  if (extension === 'xlsx' || extension === 'xls') {
    return `${objectName} <- readxl::read_excel(${quotedPath}) |> as.data.frame()`
  }
  if (extension === 'sav') {
    return `${objectName} <- haven::read_sav(${quotedPath}) |> as.data.frame()`
  }
  return `${objectName} <- readRDS(${quotedPath})`
}

export function buildImportScript(extension: string, filePath: string, objectName: string): string {
  return [
    buildLibraryBlock(),
    '',
    buildImportCommand(extension, filePath, objectName),
  ].join('\n')
}

export function buildDataInjection(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return ''

  const json = JSON.stringify(data)

  return [
    `df <- as.data.frame(jsonlite::fromJSON(${quoteRString(json)}), stringsAsFactors = FALSE)`,
    'df <- type.convert(df, as.is = TRUE)',
    '',
  ].join('\n')
}

export function buildWorkspaceInjection(datasets: Array<{ objectName: string; data: Record<string, unknown>[] }>, activeObjectName?: string | null): string {
  const objectBlocks = datasets
    .map((dataset) => {
      const injected = buildDataInjection(dataset.data)
      if (!injected) return ''
      return `${injected}${quoteRName(dataset.objectName)} <- df\nrm(df)\n`
    })
    .filter(Boolean)
    .join('\n')

  return [
    'library(jsonlite)',
    buildLibraryBlock(),
    '',
    objectBlocks,
    activeObjectName ? `.psychr_active_name <- ${quoteRString(activeObjectName)}` : '.psychr_active_name <- NULL',
    'if (!is.null(.psychr_active_name) && exists(.psychr_active_name, inherits = FALSE)) {',
    '  data <- get(.psychr_active_name, inherits = FALSE)',
    '  df <- data',
    '}',
  ].filter(Boolean).join('\n')
}

export function buildRDataFrameResultScript(options: {
  rScript: string
  successMessage?: string
  previewRows?: number
  includeHasDf?: boolean
}): string {
  const previewRows = options.previewRows ?? DEFAULT_R_RESULT_PREVIEW_ROWS
  const successMessage = options.successMessage
    ? `      message = ${quoteRString(options.successMessage)},\n`
    : ''
  const hasDfField = options.includeHasDf ? '  has_df = TRUE,\n' : ''

  return `
n_rows <- nrow(df)
n_cols <- ncol(df)

col_info <- lapply(names(df), function(col_name) {
  col <- df[[col_name]]
  col_type <- if (is.numeric(col)) "numeric"
              else if (is.factor(col)) "factor"
              else if (is.logical(col)) "logical"
              else "character"
  result <- list(
    name = col_name,
    type = col_type,
    missingCount = sum(is.na(col)),
    uniqueCount = length(unique(col[!is.na(col)]))
  )
  if (col_type == "numeric") {
    if (all(is.na(col))) {
      result$min <- NA
      result$max <- NA
      result$mean <- NA
      result$sd <- NA
    } else {
      result$min <- round(min(col, na.rm = TRUE), 4)
      result$max <- round(max(col, na.rm = TRUE), 4)
      result$mean <- round(mean(col, na.rm = TRUE), 4)
      result$sd <- round(sd(col, na.rm = TRUE), 4)
    }
  }
  result
})

serialize_row <- function(row_df) {
  row <- as.list(row_df)
  lapply(row, function(v) {
    if (length(v) == 0 || (length(v) == 1 && is.na(v))) NULL else v
  })
}

if (n_rows > 0) {
  full_data <- lapply(seq_len(n_rows), function(i) serialize_row(df[i, , drop = FALSE]))
} else {
  full_data <- list()
}

preview <- if (n_rows > 0) {
  full_data[seq_len(min(n_rows, ${previewRows}))]
} else {
  list()
}

cat(toJSON(list(
  success = TRUE,
${hasDfField}  r_script = ${quoteRString(options.rScript)},
  data = list(
    rows = n_rows,
    columns = col_info,
    preview = preview,
    full_data = full_data,
${successMessage}    dimensions = paste0(n_rows, " rows × ", n_cols, " columns")
  )
), auto_unbox = TRUE, null = "null"))
`
}

export function buildWorkspaceExecutionScript(options: {
  datasets: Array<{ objectName: string; data: Record<string, unknown>[] }>
  activeObjectName?: string | null
  userCode: string
  recordedScript?: string
  previewRows?: number
  mode?: 'script' | 'console'
}): string {
  const previewRows = options.previewRows ?? DEFAULT_R_RESULT_PREVIEW_ROWS
  const mode = options.mode ?? 'console'
  const recordedScript = options.recordedScript?.trim() ?? ''
  const scriptSetup =
    mode === 'console'
      ? [
          'library(jsonlite)',
          buildLibraryBlock(),
          '',
          `.psychr_recorded_script <- ${quoteRString(recordedScript)}`,
          'if (nzchar(trimws(.psychr_recorded_script))) {',
          '  source(textConnection(.psychr_recorded_script), local = .GlobalEnv)',
          '}',
          activeObjectNamePreamble(options.activeObjectName),
          'if (!is.null(.psychr_active_name) && exists(.psychr_active_name, envir = .GlobalEnv, inherits = FALSE)) {',
          '  data <- get(.psychr_active_name, envir = .GlobalEnv, inherits = FALSE)',
          '  df <- data',
          '}',
        ].filter(Boolean).join('\n')
      : [
          'library(jsonlite)',
          buildLibraryBlock(),
          '',
          `.psychr_user_script <- ${quoteRString(options.userCode)}`,
          'if (nzchar(trimws(.psychr_user_script))) {',
          '  source(textConnection(.psychr_user_script), local = .GlobalEnv)',
          '}',
          activeObjectNamePreamble(options.activeObjectName),
        ].filter(Boolean).join('\n')
  const consoleExecution =
    mode === 'console'
      ? `.psychr_console_output <- capture.output({
  eval(parse(text = ${quoteRString(options.userCode)}), envir = .GlobalEnv)
})`
      : '.psychr_console_output <- character()'

  return `
${scriptSetup}

${consoleExecution}

if (!is.null(.psychr_active_name)) {
  if (exists("data", inherits = FALSE) && (is.data.frame(data) || inherits(data, "tbl_df"))) {
    assign(.psychr_active_name, data, envir = .GlobalEnv)
  } else if (exists("df", inherits = FALSE) && (is.data.frame(df) || inherits(df, "tbl_df"))) {
    assign(.psychr_active_name, df, envir = .GlobalEnv)
  }
}

.psychr_serialize_row <- function(row_df) {
  row <- as.list(row_df)
  lapply(row, function(v) {
    if (length(v) == 0 || (length(v) == 1 && is.na(v))) NULL else v
  })
}

.psychr_summarize_df <- function(obj_name) {
  obj <- get(obj_name, envir = .GlobalEnv, inherits = FALSE)
  n_rows <- nrow(obj)
  n_cols <- ncol(obj)

  col_info <- lapply(names(obj), function(col_name) {
    col <- obj[[col_name]]
    col_type <- if (is.numeric(col)) "numeric"
                else if (is.factor(col)) "factor"
                else if (is.logical(col)) "logical"
                else "character"
    result <- list(
      name = col_name,
      type = col_type,
      missingCount = sum(is.na(col)),
      uniqueCount = length(unique(col[!is.na(col)]))
    )
    if (col_type == "numeric") {
      if (all(is.na(col))) {
        result$min <- NA
        result$max <- NA
        result$mean <- NA
        result$sd <- NA
      } else {
        result$min <- round(min(col, na.rm = TRUE), 4)
        result$max <- round(max(col, na.rm = TRUE), 4)
        result$mean <- round(mean(col, na.rm = TRUE), 4)
        result$sd <- round(sd(col, na.rm = TRUE), 4)
      }
    }
    result
  })

  if (n_rows > 0) {
    full_data <- lapply(seq_len(n_rows), function(i) .psychr_serialize_row(obj[i, , drop = FALSE]))
  } else {
    full_data <- list()
  }

  preview <- if (n_rows > 0) {
    full_data[seq_len(min(n_rows, ${previewRows}))]
  } else {
    list()
  }

  list(
    name = obj_name,
    rows = n_rows,
    columns = col_info,
    preview = preview,
    full_data = full_data,
    dimensions = paste0(n_rows, " rows × ", n_cols, " columns")
  )
}

.psychr_all_names <- ls(envir = .GlobalEnv)
.psychr_df_names <- .psychr_all_names[vapply(.psychr_all_names, function(obj_name) {
  obj <- get(obj_name, envir = .GlobalEnv, inherits = FALSE)
  is.data.frame(obj) || inherits(obj, "tbl_df")
}, logical(1))]

.psychr_data_frames <- lapply(.psychr_df_names, .psychr_summarize_df)

.psychr_active_name <- if (!is.null(.psychr_active_name) && .psychr_active_name %in% .psychr_df_names) {
  .psychr_active_name
} else if (length(.psychr_df_names) > 0) {
  .psychr_df_names[[1]]
} else {
  NULL
}

cat(toJSON(list(
  success = TRUE,
  r_script = ${quoteRString(options.recordedScript ?? options.userCode)},
  active_object = .psychr_active_name,
  console_output = .psychr_console_output,
  data_frames = .psychr_data_frames
), auto_unbox = TRUE, null = "null"))
`
}

function activeObjectNamePreamble(activeObjectName?: string | null): string {
  return activeObjectName ? `.psychr_active_name <- ${quoteRString(activeObjectName)}` : '.psychr_active_name <- NULL'
}

export function replaceDfAlias(script: string, objectName: string): string {
  return script.replace(/\bdf\b/g, objectName)
}
