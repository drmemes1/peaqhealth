library(nhanesA)

cat("Downloading blood pressure data...\n")
bpx_f <- nhanes('BPX_F')
bpx_g <- nhanes('BPX_G')

cat("Downloading HbA1c data...\n")
ghb_f <- nhanes('GHB_F')
ghb_g <- nhanes('GHB_G')

cat("Downloading insulin data...\n")
# INS_F / INS_G may not exist as separate tables — insulin is in GLU files
# Try and catch errors
tryCatch({
  ins_f <- nhanes('INS_F')
  ins_g <- nhanes('INS_G')
  write.csv(rbind(ins_f, ins_g),
    'packages/score-engine/data/nhanes/nhanes_insulin.csv',
    row.names=FALSE)
  cat("Insulin saved:", nrow(ins_f) + nrow(ins_g), "rows\n")
}, error = function(e) {
  cat("Insulin tables not found (may be in glucose files)\n")
})

bp_all <- rbind(bpx_f, bpx_g)
write.csv(bp_all,
  'packages/score-engine/data/nhanes/nhanes_bp.csv',
  row.names=FALSE)
cat("BP saved:", nrow(bp_all), "rows\n")
cat("BP columns:", paste(names(bpx_f)[grepl("BPX", names(bpx_f))], collapse=", "), "\n")

ghb_all <- rbind(ghb_f, ghb_g)
write.csv(ghb_all,
  'packages/score-engine/data/nhanes/nhanes_hba1c.csv',
  row.names=FALSE)
cat("HbA1c saved:", nrow(ghb_all), "rows\n")
cat("HbA1c columns:", paste(names(ghb_f), collapse=", "), "\n")
