# PsychR — One-Way ANOVA Template
# Called by: AnovaDialog.tsx (Phase 2)
# Packages:  car, effectsize, emmeans, jsonlite
#
# INPUTS:
#   {{DV}}      — dependent variable (quoted)
#   {{IV}}      — independent variable / grouping factor (quoted)
#   {{POSTHOC}} — post-hoc test: "tukey", "bonferroni", "none"
#   {{DATASET}} — data frame expression

library(car)
library(effectsize)
library(emmeans)
library(jsonlite)

df_sub        <- {{DATASET}}
df_sub[[{{IV}}]] <- factor(df_sub[[{{IV}}]])

# Fit ANOVA
model <- aov(as.formula(paste({{DV}}, "~", {{IV}})), data = df_sub)
anova_table <- summary(model)[[1]]

# Effect size: eta-squared and omega-squared
eta   <- eta_squared(model, partial = FALSE)
omega <- omega_squared(model, partial = FALSE)

result_table <- list(list(
  Source    = {{IV}},
  SS        = round(anova_table$`Sum Sq`[1], 3),
  df        = anova_table$Df[1],
  MS        = round(anova_table$`Mean Sq`[1], 3),
  F         = round(anova_table$`F value`[1], 3),
  p         = round(anova_table$`Pr(>F)`[1], 4),
  eta2      = round(eta$Eta2[1], 3),
  omega2    = round(omega$Omega2[1], 3)
))

# Descriptive stats by group
desc <- aggregate(as.formula(paste({{DV}}, "~", {{IV}})), data = df_sub,
                  FUN = function(x) c(N = length(x), Mean = mean(x), SD = sd(x)))

# Post-hoc comparisons
posthoc <- NULL
if ({{POSTHOC}} != "none") {
  emm <- emmeans(model, as.formula(paste("~", {{IV}})))
  ph  <- pairs(emm, adjust = {{POSTHOC}})
  posthoc <- as.data.frame(ph)[, c("contrast", "estimate", "SE", "t.ratio", "p.value")]
  posthoc$estimate <- round(posthoc$estimate, 3)
  posthoc$p.value  <- round(posthoc$p.value,  4)
  posthoc <- split(posthoc, seq(nrow(posthoc)))
}

r_script <- paste0(
  "library(car)\nlibrary(effectsize)\nlibrary(emmeans)\n\n",
  "model <- aov(", {{DV}}, " ~ factor(", {{IV}}, "), data = df)\n",
  "summary(model)\n",
  "eta_squared(model)\nomega_squared(model)\n",
  if ({{POSTHOC}} != "none")
    paste0("emmeans(model, ~ ", {{IV}}, ") |> pairs(adjust = '", {{POSTHOC}}, "')\n")
  else ""
)

cat(toJSON(list(
  success  = TRUE,
  r_script = r_script,
  data     = list(
    anova_table = result_table,
    posthoc     = posthoc
  )
), auto_unbox = TRUE))
