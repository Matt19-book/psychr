# PsychR — ggplot2 Builder Template
# Called by: VisualizationTab.tsx
# Packages:  ggplot2, base64enc, jsonlite
#
# INPUTS:
#   {{GGPLOT_CODE}} — complete ggplot2 expression (e.g. ggplot(df, aes(x = age)) + geom_histogram())
#   {{WIDTH}}       — output width in inches (default 8)
#   {{HEIGHT}}      — output height in inches (default 5)
#   {{DPI}}         — resolution (default 150 for screen, 300 for print)
#   {{DATASET}}     — data frame expression

library(ggplot2)
library(base64enc)
library(jsonlite)

df  <- {{DATASET}}
p   <- {{GGPLOT_CODE}}

# Render to temp PNG and base64-encode for IPC transfer
tmp <- tempfile(fileext = ".png")
tryCatch({
  ggsave(
    filename = tmp,
    plot     = p,
    width    = {{WIDTH}},
    height   = {{HEIGHT}},
    dpi      = {{DPI}}
  )
  img_bytes <- readBin(tmp, "raw", n = file.info(tmp)$size)
  img_b64   <- base64encode(img_bytes)
  file.remove(tmp)

  cat(toJSON(list(
    success   = TRUE,
    r_script  = deparse({{GGPLOT_CODE}}),
    data      = list(
      image_b64 = img_b64,
      width     = {{WIDTH}},
      height    = {{HEIGHT}},
      dpi       = {{DPI}}
    )
  ), auto_unbox = TRUE))
}, error = function(e) {
  cat(toJSON(list(
    success = FALSE,
    error   = conditionMessage(e)
  ), auto_unbox = TRUE))
})
