export interface BacteriaInteraction {
  icon: string
  title: string
  body: string
  citation: string
}

export interface BloodMarker {
  name: string
  effect: string
  strength: number // 0-100 bar width
}

export interface BacteriaMechanism {
  title: string
  body: string
  chain: string[]
}

export interface BacteriaEntry {
  slug: string
  name: string
  latinName: string
  type: "pathogenic" | "protective"
  badge: string
  heroSummary: string
  stats: { number: string; label: string }[]
  headline: string
  bodyText: string
  interactions: BacteriaInteraction[]
  bloodMarkers: BloodMarker[]
  citations: string[]
  whatToDo: string[]
  mechanism?: BacteriaMechanism
}

export const BACTERIA: BacteriaEntry[] = [
  // ── P. gingivalis ─────────────────────────────────────────────────────────
  {
    slug: "p-gingivalis",
    name: "P. gingivalis",
    latinName: "Porphyromonas gingivalis",
    type: "pathogenic",
    badge: "KEY PATHOGEN \u00b7 MOST STUDIED",
    heroSummary: "The most studied oral pathogen in systemic disease. Found in arterial plaque, Alzheimer\u2019s brain tissue, and tumor environments. Produces gingipains \u2014 toxic proteins that degrade tissue and evade immune defenses.",
    stats: [
      { number: "90%+", label: "of Alzheimer\u2019s brain tissue samples contained gingipains" },
      { number: "1,791", label: "patients in the coronary plaque study" },
      { number: "8", label: "systemic disease associations documented" },
    ],
    headline: "Found in Alzheimer\u2019s brain tissue. Linked to elevated inflammation and cardiovascular risk.",
    bodyText: "P. gingivalis is the most studied pathogen in periodontal disease. It produces toxic proteins called gingipains that degrade tissue and evade your immune system. Low levels are manageable. Elevated and persistent levels are worth knowing about early.",
    interactions: [
      { icon: "HeartPulse", title: "Cardiovascular disease", body: "Found in coronary artery plaques at autopsy. Gingipains activate platelet aggregation and promote atherosclerotic plaque instability.", citation: "Hussain et al., Frontiers in Immunology 2023, n=1,791" },
      { icon: "Brain", title: "Alzheimer\u2019s disease", body: "Gingipains detected in over 90% of Alzheimer\u2019s brain tissue samples. A drug targeting gingipains (COR388) entered Phase 2/3 clinical trials.", citation: "Dominy et al., Science Advances 2019" },
      { icon: "Bone", title: "Rheumatoid arthritis", body: "Produces a unique enzyme (PPAD) that citrullinates proteins \u2014 the same modification that triggers anti-CCP antibodies in rheumatoid arthritis.", citation: "Wegner et al., PLOS Pathogens 2010" },
      { icon: "Microscope", title: "Pancreatic cancer", body: "Associated with a 59% increased risk of pancreatic cancer in a study of 361 incident cases. Present in pancreatic tumor tissue.", citation: "Fan et al., Gut 2018, n=361" },
      { icon: "Activity", title: "Type 2 diabetes", body: "Drives chronic low-grade inflammation via LPS that impairs insulin signaling. Periodontal treatment improves glycemic control in diabetic patients.", citation: "Preshaw et al., Diabetologia 2012" },
      { icon: "FlaskConical", title: "Esophageal cancer", body: "Found at significantly higher levels in esophageal squamous cell carcinoma tissue compared to adjacent normal tissue.", citation: "Gao et al., Infectious Agents and Cancer 2016" },
      { icon: "Baby", title: "Adverse pregnancy outcomes", body: "Crosses the placental barrier. Associated with preterm birth and low birth weight through systemic inflammation and direct placental invasion.", citation: "Blanc et al., Placenta 2015" },
      { icon: "Dna", title: "Colorectal cancer", body: "Detected alongside Fusobacterium nucleatum in colorectal tumor microenvironments. May contribute to the pro-tumorigenic inflammatory milieu.", citation: "Flemer et al., Gut 2018" },
    ],
    bloodMarkers: [
      { name: "hsCRP", effect: "\u2191 rises", strength: 75 },
      { name: "LDL", effect: "\u2191 rises", strength: 45 },
      { name: "Glucose", effect: "\u2191 rises", strength: 40 },
    ],
    citations: [
      "Dominy SS et al. Porphyromonas gingivalis in Alzheimer's disease brains. Science Advances. 2019;5(1):eaau3333.",
      "Hussain M et al. Oral bacteria in cardiovascular specimens. Frontiers in Immunology. 2023.",
      "Wegner N et al. Peptidylarginine deiminase from P. gingivalis citrullinates human fibrinogen. PLOS Pathogens. 2010.",
      "Fan X et al. Human oral microbiome and pancreatic cancer. Gut. 2018;67(1):120-127.",
    ],
    whatToDo: [
      "See a periodontist if levels are elevated",
      "Professional cleaning targets P. gingivalis directly",
      "Floss daily \u2014 P. gingivalis thrives in undisturbed gum pockets",
      "Avoid smoking \u2014 nicotine promotes P. gingivalis growth",
    ],
    mechanism: {
      title: "How it gets into your bloodstream",
      body: "P. gingivalis doesn\u2019t just live in your gums. Inflamed gum tissue has a rich blood supply. When the bacteria breach the gum barrier, they enter the bloodstream directly \u2014 a process called bacteremia. From there, gingipains can reach distant organs.",
      chain: ["Gum pocket", "Inflamed tissue", "Bloodstream", "Arterial wall", "Distant organs"],
    },
  },

  // ── Haemophilus ────────────────────────────────────────────────────────────
  {
    slug: "haemophilus",
    name: "Haemophilus",
    latinName: "Haemophilus parainfluenzae",
    type: "protective",
    badge: "PROTECTIVE \u00b7 NITRIC OXIDE",
    heroSummary: "Your nitric oxide factory. One of the most consistent protective bacteria in the CDC dataset \u2014 inversely associated with blood sugar, triglycerides, and blood pressure simultaneously.",
    stats: [
      { number: "5", label: "blood markers improved with higher levels" },
      { number: "9\u00d710\u207b\u00b9\u00b3", label: "strength of HbA1c association" },
      { number: "\u22120.094", label: "triglyceride correlation (strongest in study)" },
    ],
    headline: "Higher levels linked to lower blood sugar, lower triglycerides, lower blood pressure",
    bodyText: "Haemophilus helps your body produce nitric oxide \u2014 a molecule that relaxes blood vessels, improves blood flow, and reduces blood sugar buildup. People with more Haemophilus tend to have lower HbA1c and better cardiovascular markers.",
    interactions: [
      { icon: "TrendingDown", title: "Lower HbA1c", body: "Strong inverse association with long-term blood sugar. People with more Haemophilus had consistently lower HbA1c across 9,848 Americans.", citation: "Oravi NHANES analysis: r=\u22120.074, p=9\u00d710\u207b\u00b9\u00b3" },
      { icon: "Droplets", title: "Lower triglycerides", body: "Strongest protective correlation in the entire study. Higher Haemophilus = lower triglycerides.", citation: "Oravi NHANES analysis: r=\u22120.094, p=3\u00d710\u207b\u00b9\u2070" },
      { icon: "HeartPulse", title: "Lower blood pressure", body: "Consistent with the nitrate-nitrite-NO pathway. Oral nitrate-reducing bacteria help regulate vascular tone.", citation: "Oravi NHANES analysis: Systolic r=\u22120.047, p=5\u00d710\u207b\u2076" },
      { icon: "TrendingUp", title: "Higher HDL", body: "Positive association with \u2018good cholesterol\u2019. One of few bacteria to show a protective lipid signal.", citation: "Oravi NHANES analysis: r=+0.040, p=1\u00d710\u207b\u2074" },
    ],
    bloodMarkers: [
      { name: "HbA1c", effect: "\u2193 lower", strength: 80 },
      { name: "Triglycerides", effect: "\u2193 lower", strength: 100 },
      { name: "Systolic BP", effect: "\u2193 lower", strength: 50 },
      { name: "HDL", effect: "\u2191 higher", strength: 45 },
    ],
    citations: [
      "Bryan NS et al. Oral microbiome and nitric oxide. Curr Hypertens Rep. 2017;19:33.",
      "Oravi NHANES 2009\u20132012 analysis, April 2026.",
    ],
    whatToDo: [
      "Eat nitrate-rich leafy greens \u2014 spinach, arugula, beets",
      "Switch to a fluoride-only mouthwash \u2014 alcohol, chlorhexidine, and essential oils kill nitrate-reducing bacteria",
      "Don\u2019t smoke \u2014 tobacco disrupts oral nitrate metabolism",
    ],
  },

  // ── Neisseria ─────────────────────────────────────────────────────────────
  {
    slug: "neisseria",
    name: "Neisseria",
    latinName: "Neisseria subflava / flavescens",
    type: "protective",
    badge: "PROTECTIVE \u00b7 NITRATE REDUCER",
    heroSummary: "The bacterium that makes vegetables work. Primary nitrate-reducing genus in the oral cavity \u2014 converts dietary nitrates into nitric oxide via the nitrate-nitrite-NO pathway.",
    stats: [
      { number: "2\u00d710\u207b\u2079", label: "systolic BP association (most significant)" },
      { number: "5", label: "blood markers improved with higher levels" },
      { number: "#1", label: "oral nitrate reducer by abundance" },
    ],
    headline: "Higher levels linked to lower inflammation and lower blood pressure",
    bodyText: "Neisseria is the primary nitrate-reducing bacteria in your mouth. It converts dietary nitrates from vegetables into nitric oxide \u2014 the molecule your blood vessels use to stay relaxed and flexible.",
    interactions: [
      { icon: "Wind", title: "Lower systolic blood pressure", body: "Strongest blood pressure association in the entire dataset. Neisseria produces the nitric oxide that dilates blood vessels.", citation: "Oravi NHANES analysis: r=\u22120.061, p=2\u00d710\u207b\u2079" },
      { icon: "Wind", title: "Lower diastolic blood pressure", body: "Consistent across both systolic and diastolic readings in nearly 10,000 Americans.", citation: "Oravi NHANES analysis: r=\u22120.048, p=4\u00d710\u207b\u2076" },
      { icon: "Flame", title: "Lower hsCRP", body: "Nitric oxide has anti-inflammatory properties. More Neisseria correlates with lower systemic inflammation.", citation: "Oravi NHANES analysis: r=\u22120.051, p=5\u00d710\u207b\u2074" },
      { icon: "Droplets", title: "Lower triglycerides", body: "Inverse association with blood lipids, consistent with improved metabolic function.", citation: "Oravi NHANES analysis: r=\u22120.058, p=1\u00d710\u207b\u2074" },
    ],
    bloodMarkers: [
      { name: "Systolic BP", effect: "\u2193 lower", strength: 70 },
      { name: "hsCRP", effect: "\u2193 lower", strength: 55 },
      { name: "Triglycerides", effect: "\u2193 lower", strength: 65 },
      { name: "HbA1c", effect: "\u2193 lower", strength: 45 },
    ],
    citations: [
      "Bryan NS et al. Oral microbiome and nitric oxide. Curr Hypertens Rep. 2017;19:33.",
      "Hyde ER et al. Metagenomic analysis of nitrate-reducing bacteria. mBio. 2014.",
    ],
    whatToDo: [
      "Eat leafy greens and beets \u2014 they provide the nitrates Neisseria converts",
      "Switch to fluoride-only mouthwash \u2014 alcohol, chlorhexidine, and essential oils decimate nitrate-reducing bacteria",
      "Exercise regularly \u2014 physical activity supports oral nitrate metabolism",
    ],
  },

  // ── Tannerella ────────────────────────────────────────────────────────────
  {
    slug: "tannerella",
    name: "Tannerella",
    latinName: "Tannerella forsythia",
    type: "pathogenic",
    badge: "RED COMPLEX \u00b7 MULTI-DOMAIN",
    heroSummary: "Part of the red complex. Shows up in your blood. The clearest example of an oral pathogen leaving a fingerprint across blood sugar, cholesterol, and blood pressure simultaneously.",
    stats: [
      { number: "5", label: "blood marker categories affected" },
      { number: "4\u00d710\u207b\u2077", label: "blood pressure association strength" },
      { number: "Red complex", label: "member of the 3 most pathogenic oral bacteria" },
    ],
    headline: "Higher levels linked to higher blood sugar, higher inflammation, higher blood pressure",
    bodyText: "Tannerella forsythia is part of the \u2018red complex\u2019 \u2014 three bacteria strongly associated with advanced gum disease and systemic inflammation.",
    interactions: [
      { icon: "AlertTriangle", title: "Higher glucose", body: "Strong positive association with fasting glucose. Systemic inflammation from Tannerella impairs insulin signaling.", citation: "Oravi NHANES analysis: r=+0.054, p=3\u00d710\u207b\u2074" },
      { icon: "Activity", title: "Higher HbA1c", body: "Long-term blood sugar rises with Tannerella burden. Consistent across nearly 10,000 Americans.", citation: "Oravi NHANES analysis: r=+0.050, p=1\u00d710\u207b\u2076" },
      { icon: "Flame", title: "Higher total cholesterol", body: "Lipid disruption alongside metabolic effects. Multi-domain pathogen.", citation: "Oravi NHANES analysis: r=+0.056, p=8\u00d710\u207b\u2078" },
      { icon: "HeartPulse", title: "Higher blood pressure", body: "Both systolic and diastolic associations. Vascular inflammation from chronic periodontal infection.", citation: "Oravi NHANES analysis: Diastolic r=+0.052, p=4\u00d710\u207b\u2077" },
    ],
    bloodMarkers: [
      { name: "Glucose", effect: "\u2191 rises", strength: 60 },
      { name: "HbA1c", effect: "\u2191 rises", strength: 55 },
      { name: "Total Chol", effect: "\u2191 rises", strength: 65 },
      { name: "Diastolic BP", effect: "\u2191 rises", strength: 55 },
    ],
    citations: [
      "Socransky SS et al. Microbial complexes in subgingival plaque. J Clin Periodontol. 1998.",
      "Preshaw PM et al. Periodontitis and diabetes. Diabetologia. 2012.",
    ],
    whatToDo: [
      "Floss daily \u2014 Tannerella colonizes deep gum pockets",
      "See a periodontist if levels are elevated",
      "Reduce refined sugar \u2014 it feeds anaerobic pathogens",
    ],
    mechanism: {
      title: "The red complex cascade",
      body: "Tannerella works alongside P. gingivalis and Treponema denticola \u2014 the three most destructive periodontal pathogens. Together they synergize tissue destruction and immune evasion.",
      chain: ["Gum pocket", "Red complex synergy", "Tissue destruction", "Chronic inflammation", "Blood marker changes"],
    },
  },

  // ── Fusobacterium ─────────────────────────────────────────────────────────
  {
    slug: "fusobacterium",
    name: "Fusobacterium",
    latinName: "Fusobacterium nucleatum",
    type: "pathogenic",
    badge: "CANCER RESEARCH \u00b7 BRIDGE ORGANISM",
    heroSummary: "Found in tumors. Found in most mouths. One of the most studied bacteria in cancer research \u2014 consistently found enriched in colorectal tumor tissue.",
    stats: [
      { number: "AUC 0.84", label: "colorectal tumor detection accuracy" },
      { number: "2", label: "blood markers elevated in CDC data" },
      { number: "Most mouths", label: "have detectable levels" },
    ],
    headline: "Higher levels linked to higher LDL cholesterol and higher blood sugar",
    bodyText: "Fusobacterium nucleatum is one of the most studied bacteria in cancer research. In the CDC blood marker data, elevated Fusobacterium correlated with higher LDL and blood glucose.",
    interactions: [
      { icon: "Dna", title: "Colorectal cancer", body: "Consistently enriched in colorectal tumor tissue. Studied as a potential early detection biomarker. Promotes tumor proliferation via FadA adhesin.", citation: "Castellarin M et al., Genome Research 2012" },
      { icon: "TrendingUp", title: "Higher LDL cholesterol", body: "Positive association with LDL in nearly 4,500 Americans with fasting bloodwork.", citation: "Oravi NHANES analysis: r=+0.058, p=1\u00d710\u207b\u2074" },
      { icon: "Activity", title: "Higher glucose", body: "Elevated fasting glucose in people with higher Fusobacterium abundance.", citation: "Oravi NHANES analysis: r=+0.038, p=0.010" },
    ],
    bloodMarkers: [
      { name: "LDL", effect: "\u2191 rises", strength: 65 },
      { name: "Glucose", effect: "\u2191 rises", strength: 40 },
    ],
    citations: [
      "Castellarin M et al. Fusobacterium nucleatum infection is prevalent in human colorectal carcinoma. Genome Research. 2012.",
      "Kostic AD et al. Fusobacterium nucleatum potentiates intestinal tumorigenesis. Cell Host & Microbe. 2013.",
    ],
    whatToDo: [
      "Floss daily \u2014 Fusobacterium bridges biofilm communities",
      "Monitor LDL cholesterol at regular intervals",
      "Be aware of colorectal screening guidelines for your age",
    ],
  },

  // ── Prevotella ────────────────────────────────────────────────────────────
  {
    slug: "prevotella",
    name: "Prevotella",
    latinName: "Prevotella intermedia",
    type: "pathogenic",
    badge: "INFLAMMATION \u00b7 PERIODONTAL",
    heroSummary: "Inflammation amplifier. Thrives in inflamed tissue and produces compounds that drive immune activation. The inflammation doesn\u2019t always stay in your mouth.",
    stats: [
      { number: "hsCRP", label: "primary blood marker elevated" },
      { number: "4,713", label: "participants in inflammation analysis" },
      { number: "Hormonal", label: "responds to sex hormone changes" },
    ],
    headline: "Elevated levels linked to higher systemic inflammation",
    bodyText: "Prevotella intermedia is a periodontal pathogen linked to gum inflammation and bleeding. It thrives in inflamed tissue and produces compounds that further drive immune activation.",
    interactions: [
      { icon: "Flame", title: "Systemic inflammation (hsCRP)", body: "Higher Prevotella correlated with elevated hsCRP \u2014 a marker that predicts cardiovascular events. Inflammation from the mouth enters the bloodstream.", citation: "Oravi NHANES analysis: r=+0.035, p=0.017" },
      { icon: "Zap", title: "Hormone-responsive growth", body: "Prevotella uses progesterone and estradiol as growth factors. Elevated during pregnancy, puberty, and hormonal fluctuations.", citation: "Kornman & Loesche, J Periodontal Research 1980" },
    ],
    bloodMarkers: [
      { name: "hsCRP", effect: "\u2191 rises", strength: 40 },
    ],
    citations: [
      "Kornman KS, Loesche WJ. Effects of estradiol and progesterone on Prevotella intermedia. J Periodontal Research. 1980.",
    ],
    whatToDo: [
      "Reduce refined sugar intake \u2014 it fuels anaerobic pathogens",
      "Floss regularly \u2014 Prevotella colonizes inflamed gum tissue",
      "Consider anti-inflammatory dietary patterns (omega-3s, polyphenols)",
    ],
  },

  // ── Veillonella ───────────────────────────────────────────────────────────
  {
    slug: "veillonella",
    name: "Veillonella",
    latinName: "Veillonella parvula",
    type: "protective",
    badge: "PROTECTIVE \u00b7 METABOLIC RELAY",
    heroSummary: "The nitrate relay. Works alongside Neisseria and Haemophilus in the oral nitric oxide pathway. Consumes lactic acid and supports the broader protective ecosystem.",
    stats: [
      { number: "99%", label: "of mouths contain Veillonella" },
      { number: "Relay", label: "role in nitric oxide pathway" },
      { number: "Age-linked", label: "composition shifts with age" },
    ],
    headline: "Key metabolic relay in the oral nitric oxide pathway",
    bodyText: "Veillonella consumes lactic acid produced by other bacteria and participates in nitrate reduction cooperatively. It\u2019s a key cross-feeder in oral biofilm ecology.",
    interactions: [
      { icon: "ArrowRight", title: "Lactic acid metabolism", body: "Converts lactic acid to propionate and acetate, reducing cariogenic potential while supporting the NO pathway.", citation: "Mashima & Nakazawa, Frontiers in Microbiology 2015" },
      { icon: "HeartPulse", title: "Cooperative nitrate reduction", body: "Works alongside Neisseria to maximize nitric oxide production from dietary nitrates.", citation: "Bryan NS et al., Curr Hypertens Rep 2017" },
    ],
    bloodMarkers: [],
    citations: [
      "Mashima I, Nakazawa F. The influence of oral Veillonella on biofilms. Frontiers in Microbiology. 2015.",
    ],
    whatToDo: [
      "Eat leafy greens \u2014 provides nitrates for the pathway",
      "Exercise regularly \u2014 supports oral ecosystem diversity",
      "Track Veillonella over time \u2014 composition shifts with age",
    ],
  },
]
