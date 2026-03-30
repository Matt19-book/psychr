# PsychR — Correlation Matrix Template
# Called by: CorrelationDialog.tsx (Phase 2)
# Packages:  psych, jsonlite
#
# INPUTS:
#   {{VARS}}      — character vector of variable names
#   {{METHOD}}    — "pearson", "spearman", or "kendall"
#   {{DATASET}}   — data frame expression

library(psych)
library(jsonlite)

vars   <- {{VARS}}
method <- {{METHOD}}
df_sub <- {{DATASET}}[, vars, drop = FALSE]

# Correlation matrix with p-values
cor_result <- corr.test(df_sub, method = method, adjust = "none")
r_mat  <- round(cor_result$r, 3)
p_mat  <- round(cor_result$p, 4)
ci_mat <- cor_result$ci  # 95% CIs for each pair

# Flatten to list of pairs for table output
pairs_list <- list()
for (i in seq_along(vars)) {
  for (j in seq_along(vars)) {
    if (j > i) {
      pair_key <- paste0(vars[i], "_", vars[j])
      pairs_list[[length(pairs_list) + 1]] <- list(
        Var1     = vars[i],
        Var2     = vars[j],
        r        = r_mat[i, j],
        p        = p_mat[i, j],
        sig      = if (p_mat[i, j] < 0.05) "*" else ""
      )
    }
  }
}

# Matrix format for heatmap rendering
r_matrix <- lapply(vars, function(v) {
  row <- as.list(r_mat[v, ])
  row[["variable"]] <- v
  row
})

r_script <- paste0(
  "library(psych)\n",
  "vars <- c(", paste0('"', vars, '"', collapse = ", "), ")\n",
  "cor_result <- corr.test(df[, vars], method = '", method, "')\n",
  "print(cor_result, short = FALSE)"
)

cat(toJSON(list(
  success  = TRUE,
  r_script = r_script,
  data     = list(
    pairs    = pairs_list,
    matrix   = r_matrix,
    method   = method
  )
), auto_unbox = TRUE))
