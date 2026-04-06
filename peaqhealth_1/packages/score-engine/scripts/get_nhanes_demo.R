if (!require("nhanesA")) {
  install.packages("nhanesA",
    repos="https://cran.r-project.org",
    quiet=TRUE)
}
library(nhanesA)

cat("Downloading NHANES 2009-2010 demographics...\n")
demo_f <- nhanes('DEMO_F')
cat("Downloading NHANES 2011-2012 demographics...\n")
demo_g <- nhanes('DEMO_G')

cols <- c('SEQN', 'RIDAGEYR', 'RIAGENDR')
demo <- rbind(demo_f[, cols], demo_g[, cols])
names(demo) <- c('SEQN', 'age', 'sex')

write.csv(demo,
  'packages/score-engine/data/nhanes/nhanes_demographics.csv',
  row.names=FALSE)

cat("Done:", nrow(demo), "participants saved\n")
cat("Age range:", min(demo$age, na.rm=TRUE),
    "-", max(demo$age, na.rm=TRUE), "\n")
cat("Sex distribution:\n")
print(table(demo$sex))
