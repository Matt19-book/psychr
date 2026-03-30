# PsychR — mirt Models Template (2PL, 3PL, GRM, GPCM)
# Called by: IRTTab.tsx
# Packages:  mirt, jsonlite
#
# INPUTS:
#   {{ITEMS}}     — character vector of item column names
#   {{MODEL_TYPE}}— "2PL", "3PL", "graded", "gpcm"
#   {{DATASET}}   — data frame expression

library(mirt)
library(jsonlite)

items      <- {{ITEMS}}
model_type <- {{MODEL_TYPE}}
df_sub     <- {{DATASET}}[, items, drop = FALSE]

# Fit model
fit <- mirt(data  = df_sub,
            model = 1,
            itemtype = model_type,
            verbose  = FALSE,
            SE       = TRUE)

# Item parameters (IRT parameterization)
params <- coef(fit, simplify = TRUE, IRTpars = TRUE)$items
param_names <- colnames(params)

item_table <- lapply(seq_len(nrow(params)), function(i) {
  row <- as.list(round(params[i, ], 3))
  row[["Item"]] <- rownames(params)[i]
  row
})

# Model fit statistics
fit_stats <- tryCatch(
  as.list(round(unlist(M2(fit, type = "C2")), 3)),
  error = function(e) list(note = "Fit stats unavailable")
)

# Person scores
theta <- fscores(fit, method = "EAP")[, 1]
person_stats <- list(
  Mean = round(mean(theta), 3),
  SD   = round(sd(theta),   3),
  Min  = round(min(theta),  3),
  Max  = round(max(theta),  3)
)

r_script <- paste0(
  "library(mirt)\n",
  "items <- c(", paste0('"', items, '"', collapse = ", "), ")\n",
  "fit <- mirt(df[, items], 1, itemtype = '", model_type, "', verbose = FALSE, SE = TRUE)\n",
  "coef(fit, simplify = TRUE, IRTpars = TRUE)\n",
  "M2(fit)\n",
  "plot(fit, type = 'trace')   # ICC curves\n",
  "plot(fit, type = 'info')    # Test information\n",
  "fscores(fit, method = 'EAP')  # Person ability estimates"
)

cat(toJSON(list(
  success      = TRUE,
  r_script     = r_script,
  data         = list(
    model        = model_type,
    n_items      = length(items),
    n_persons    = nrow(df_sub),
    parameters   = item_table,
    person_stats = person_stats,
    fit          = fit_stats
  )
), auto_unbox = TRUE))
