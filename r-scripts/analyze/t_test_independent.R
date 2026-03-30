# PsychR — Independent Samples t-test Template
# Called by: TTestDialog.tsx (Phase 2)
# Packages:  car, effsize, jsonlite
#
# INPUTS:
#   {{DV}}        — dependent variable column name (quoted)
#   {{GROUP}}     — grouping variable column name (quoted)
#   {{DATASET}}   — data frame expression
#   {{ALPHA}}     — significance level (default 0.05)
#   {{TAILS}}     — "two.sided", "less", or "greater"

library(car)
library(effsize)
library(jsonlite)

dv    <- {{DATASET}}[[{{DV}}]]
group <- {{DATASET}}[[{{GROUP}}]]
alpha <- {{ALPHA}}

# Levene test for homogeneity of variance
levene <- leveneTest(dv ~ factor(group))
levene_p <- levene$`Pr(>F)`[1]

# t-test (Welch by default — more robust than Student's)
ttest <- t.test(dv ~ factor(group), alternative = {{TAILS}},
                var.equal = FALSE, conf.level = 1 - alpha)

# Cohen's d effect size
d <- cohen.d(dv ~ factor(group))

groups <- levels(factor(group))
means  <- tapply(dv, group, mean, na.rm = TRUE)
sds    <- tapply(dv, group, sd,   na.rm = TRUE)
ns     <- tapply(dv, group, function(x) sum(!is.na(x)))

result_table <- list(
  list(
    Statistic = "t",
    Value     = round(ttest$statistic, 3),
    df        = round(ttest$parameter, 2),
    p         = round(ttest$p.value, 4),
    CI_lower  = round(ttest$conf.int[1], 3),
    CI_upper  = round(ttest$conf.int[2], 3),
    Cohen_d   = round(d$estimate, 3),
    Levene_p  = round(levene_p, 4)
  )
)

group_stats <- lapply(groups, function(g) {
  list(Group = g, N = ns[[g]], Mean = round(means[[g]], 3), SD = round(sds[[g]], 3))
})

r_script <- paste0(
  "library(car)\nlibrary(effsize)\n\n",
  "# Levene test\nleveneTest(", {{DV}}, " ~ factor(", {{GROUP}}, "), data = df)\n\n",
  "# Independent t-test (Welch)\nt.test(", {{DV}}, " ~ factor(", {{GROUP}}, "), data = df,\n",
  "       alternative = '", {{TAILS}}, "', var.equal = FALSE)\n\n",
  "# Cohen's d\ncohen.d(", {{DV}}, " ~ factor(", {{GROUP}}, "), data = df)"
)

cat(toJSON(list(
  success  = TRUE,
  r_script = r_script,
  data     = list(
    test         = result_table,
    group_stats  = group_stats,
    significant  = ttest$p.value < alpha
  )
), auto_unbox = TRUE))
