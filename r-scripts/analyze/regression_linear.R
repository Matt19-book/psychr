# PsychR — Linear Regression Template
# Called by: RegressionDialog.tsx (Phase 2)
# Packages:  car, effectsize, jsonlite
#
# INPUTS:
#   {{OUTCOME}}    — outcome/dependent variable (quoted)
#   {{PREDICTORS}} — character vector of predictor names
#   {{DATASET}}    — data frame expression

library(car)
library(effectsize)
library(jsonlite)

formula_str <- paste({{OUTCOME}}, "~", paste({{PREDICTORS}}, collapse = " + "))
model       <- lm(as.formula(formula_str), data = {{DATASET}})
model_sum   <- summary(model)

# Model fit
r2      <- round(model_sum$r.squared, 4)
adj_r2  <- round(model_sum$adj.r.squared, 4)
f_stat  <- round(model_sum$fstatistic["value"], 3)
f_df1   <- model_sum$fstatistic["numdf"]
f_df2   <- model_sum$fstatistic["dendf"]
f_p     <- round(pf(f_stat, f_df1, f_df2, lower.tail = FALSE), 4)

# Coefficients table
coef_df  <- as.data.frame(coef(model_sum))
ci       <- confint(model, level = 0.95)
std_beta <- standardize_parameters(model)

coef_table <- lapply(rownames(coef_df), function(pred) {
  list(
    Predictor = pred,
    B         = round(coef_df[pred, "Estimate"], 3),
    SE        = round(coef_df[pred, "Std. Error"], 3),
    Beta      = round(std_beta[std_beta$Parameter == pred, "Std_Coefficient"], 3),
    t         = round(coef_df[pred, "t value"], 3),
    p         = round(coef_df[pred, "Pr(>|t|)"], 4),
    CI_lower  = round(ci[pred, 1], 3),
    CI_upper  = round(ci[pred, 2], 3)
  )
})

# VIF for multicollinearity (only with 2+ predictors)
vif_vals <- NULL
if (length({{PREDICTORS}}) > 1) {
  vif_vals <- as.list(round(vif(model), 3))
}

r_script <- paste0(
  "library(car)\nlibrary(effectsize)\n\n",
  "model <- lm(", formula_str, ", data = df)\n",
  "summary(model)\nconfint(model)\n",
  "standardize_parameters(model)\n",
  if (length({{PREDICTORS}}) > 1) "vif(model)\n" else ""
)

cat(toJSON(list(
  success  = TRUE,
  r_script = r_script,
  data     = list(
    model_fit  = list(R2 = r2, Adj_R2 = adj_r2, F = f_stat,
                      df1 = f_df1, df2 = f_df2, p = f_p),
    coef_table = coef_table,
    vif        = vif_vals
  )
), auto_unbox = TRUE))
