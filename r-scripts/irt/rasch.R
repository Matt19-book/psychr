# PsychR — Rasch Model Template
# Called by: IRTTab.tsx
# Packages:  TAM, WrightMap, jsonlite
#
# INPUTS:
#   {{ITEMS}}   — character vector of item column names
#   {{DATASET}} — data frame expression

library(TAM)
library(jsonlite)

items   <- {{ITEMS}}
df_sub  <- {{DATASET}}[, items, drop = FALSE]

# Fit Rasch model via TAM (marginal MLE)
fit <- tam.mml(resp = as.matrix(df_sub), verbose = FALSE)

# Item parameters
item_params <- fit$item
item_table  <- lapply(seq_len(nrow(item_params)), function(i) {
  list(
    Item       = item_params$item[i],
    Difficulty = round(item_params$xsi.item[i], 3),
    InfitMSQ   = round(fit$itemfit$Infit[i], 3),
    OutfitMSQ  = round(fit$itemfit$Outfit[i], 3)
  )
})

# Person ability estimates
person_scores <- fit$person$EAP
person_stats  <- list(
  Mean   = round(mean(person_scores), 3),
  SD     = round(sd(person_scores), 3),
  Min    = round(min(person_scores), 3),
  Max    = round(max(person_scores), 3)
)

# Model fit
model_fit <- list(
  Deviance  = round(fit$ic$deviance, 2),
  AIC       = round(fit$ic$AIC, 2),
  BIC       = round(fit$ic$BIC, 2),
  Npar      = fit$ic$Npar
)

r_script <- paste0(
  "library(TAM)\n",
  "items <- c(", paste0('"', items, '"', collapse = ", "), ")\n",
  "fit <- tam.mml(resp = as.matrix(df[, items]), verbose = FALSE)\n",
  "summary(fit)\n",
  "tam.fit(fit)  # Item fit statistics"
)

cat(toJSON(list(
  success      = TRUE,
  r_script     = r_script,
  data         = list(
    model        = "Rasch",
    n_items      = length(items),
    n_persons    = nrow(df_sub),
    parameters   = item_table,
    person_stats = person_stats,
    fit          = model_fit
  )
), auto_unbox = TRUE))
