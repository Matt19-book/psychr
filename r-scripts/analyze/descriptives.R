# PsychR — Descriptive Statistics Template
# Called by: DescriptivesDialog.tsx
# Packages:  psych, jsonlite
#
# INPUTS (interpolated by the dialog before calling):
#   {{VARS}}      — comma-separated quoted column names e.g. "anxiety", "depression"
#   {{DATASET}}   — R expression that resolves to the data frame (usually just `df`)
#
# OUTPUT: JSON with success, r_script, and data.table

library(psych)
library(jsonlite)

vars <- c({{VARS}})
df_sub <- {{DATASET}}[, vars, drop = FALSE]

desc <- describe(df_sub)
desc_df <- as.data.frame(desc)

result_table <- lapply(rownames(desc_df), function(var) {
  list(
    Variable  = var,
    N         = desc_df[var, "n"],
    Mean      = round(desc_df[var, "mean"],     3),
    SD        = round(desc_df[var, "sd"],       3),
    Median    = round(desc_df[var, "median"],   3),
    Min       = round(desc_df[var, "min"],      3),
    Max       = round(desc_df[var, "max"],      3),
    Skew      = round(desc_df[var, "skew"],     3),
    Kurtosis  = round(desc_df[var, "kurtosis"], 3),
    SE        = round(desc_df[var, "se"],       3)
  )
})

r_script <- paste0(
  "library(psych)\n",
  "desc <- describe(df[, c(", paste0('"', vars, '"', collapse = ", "), ")])\n",
  "print(desc)"
)

cat(toJSON(list(
  success  = TRUE,
  r_script = r_script,
  data     = list(table = result_table)
), auto_unbox = TRUE))
