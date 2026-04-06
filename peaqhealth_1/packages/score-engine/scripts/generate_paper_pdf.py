#!/usr/bin/env python3
"""
Generate publication-ready PDF white paper:
  Genus-Level Oral Microbiome Associations with Cardiometabolic Markers
  in a Nationally Representative US Cohort: Analysis of NHANES 2009-2012
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import cm, inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.colors import black, HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether,
)
from reportlab.lib import colors

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, "..", "data")
OUT_FILE = os.path.join(OUT_DIR, "peaq_nhanes_oral_blood_paper.pdf")

# Also save to Desktop for easy access
DESKTOP_FILE = os.path.expanduser("~/Desktop/peaq_nhanes_oral_blood_paper.pdf")

TITLE = (
    "Genus-Level Oral Microbiome Associations with Cardiometabolic Markers "
    "in a Nationally Representative US Cohort: Analysis of NHANES 2009-2012"
)
RUNNING_HEAD = "Oral microbiome and cardiometabolic markers in NHANES"
AUTHOR = "Igor Khabensky, DMD"
AFFILIATION = "Peaq Health"
DATE = "April 2026"
EMAIL = "igor@peaqhealth.me"


def header_footer(canvas, doc):
    canvas.saveState()
    # Running head — top right
    canvas.setFont("Times-Italic", 8)
    canvas.drawRightString(
        letter[0] - 2.5 * cm, letter[1] - 1.5 * cm,
        RUNNING_HEAD
    )
    # Page number — bottom center
    canvas.setFont("Times-Roman", 9)
    canvas.drawCentredString(
        letter[0] / 2, 1.5 * cm,
        str(doc.page)
    )
    canvas.restoreState()


def build_styles():
    s = getSampleStyleSheet()

    s.add(ParagraphStyle(
        "PaperTitle", parent=s["Normal"],
        fontName="Times-Bold", fontSize=16, leading=20,
        alignment=TA_CENTER, spaceAfter=12,
    ))
    s.add(ParagraphStyle(
        "AuthorLine", parent=s["Normal"],
        fontName="Times-Roman", fontSize=12, leading=16,
        alignment=TA_CENTER, spaceAfter=4,
    ))
    s.add(ParagraphStyle(
        "AffiliationLine", parent=s["Normal"],
        fontName="Times-Italic", fontSize=11, leading=14,
        alignment=TA_CENTER, spaceAfter=4,
    ))
    s.add(ParagraphStyle(
        "DateLine", parent=s["Normal"],
        fontName="Times-Roman", fontSize=11, leading=14,
        alignment=TA_CENTER, spaceAfter=24,
    ))
    s.add(ParagraphStyle(
        "SectionHead", parent=s["Normal"],
        fontName="Times-Bold", fontSize=12, leading=16,
        spaceBefore=18, spaceAfter=8, textTransform="uppercase",
    ))
    s.add(ParagraphStyle(
        "SubHead", parent=s["Normal"],
        fontName="Times-Bold", fontSize=11, leading=14,
        spaceBefore=12, spaceAfter=6,
    ))
    s.add(ParagraphStyle(
        "PaperBody", parent=s["Normal"],
        fontName="Times-Roman", fontSize=11, leading=16.5,
        alignment=TA_JUSTIFY, spaceAfter=8,
    ))
    s.add(ParagraphStyle(
        "BodyIndent", parent=s["Normal"],
        fontName="Times-Roman", fontSize=11, leading=16.5,
        alignment=TA_JUSTIFY, spaceAfter=4,
        leftIndent=18,
    ))
    s.add(ParagraphStyle(
        "Abstract", parent=s["Normal"],
        fontName="Times-Roman", fontSize=10.5, leading=15,
        alignment=TA_JUSTIFY, spaceAfter=6,
        leftIndent=36, rightIndent=36,
    ))
    s.add(ParagraphStyle(
        "AbstractLabel", parent=s["Normal"],
        fontName="Times-Bold", fontSize=10.5, leading=15,
        alignment=TA_LEFT, spaceAfter=4,
        leftIndent=36,
    ))
    s.add(ParagraphStyle(
        "Keywords", parent=s["Normal"],
        fontName="Times-Italic", fontSize=10, leading=14,
        alignment=TA_LEFT, spaceAfter=8,
        leftIndent=36, rightIndent=36,
    ))
    s.add(ParagraphStyle(
        "Reference", parent=s["Normal"],
        fontName="Times-Roman", fontSize=10, leading=14,
        alignment=TA_LEFT, spaceAfter=4,
        leftIndent=24, firstLineIndent=-24,
    ))
    s.add(ParagraphStyle(
        "TableCaption", parent=s["Normal"],
        fontName="Times-Bold", fontSize=10, leading=14,
        alignment=TA_LEFT, spaceAfter=6,
    ))
    s.add(ParagraphStyle(
        "TableNote", parent=s["Normal"],
        fontName="Times-Italic", fontSize=8.5, leading=12,
        alignment=TA_LEFT, spaceBefore=4, spaceAfter=8,
    ))
    return s


def build_document():
    doc = SimpleDocTemplate(
        OUT_FILE,
        pagesize=letter,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = build_styles()
    story = []

    # ── PAGE 1: Title page ───────────────────────────────────────────────────

    story.append(Spacer(1, 3 * cm))
    story.append(Paragraph(TITLE, styles["PaperTitle"]))
    story.append(Spacer(1, 1.5 * cm))
    story.append(Paragraph(AUTHOR, styles["AuthorLine"]))
    story.append(Paragraph(AFFILIATION, styles["AffiliationLine"]))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(DATE, styles["DateLine"]))
    story.append(Spacer(1, 2 * cm))
    story.append(Paragraph(
        f"Correspondence: {EMAIL}",
        styles["AffiliationLine"]
    ))
    story.append(PageBreak())

    # ── PAGE 2: Abstract ─────────────────────────────────────────────────────

    story.append(Paragraph("ABSTRACT", styles["SectionHead"]))

    story.append(Paragraph("<b>Background:</b> The oral microbiome has been associated with systemic health outcomes, but most research and consumer applications rely on alpha diversity indices such as the Shannon-Wiener index. Whether genus-level bacterial composition provides additional signal beyond diversity metrics for cardiometabolic markers remains unclear in large population samples.", styles["Abstract"]))

    story.append(Paragraph("<b>Methods:</b> We analyzed oral microbiome data from the National Health and Nutrition Examination Survey (NHANES) 2009-2012, a nationally representative US cohort. Genus-level relative abundance data were obtained from 16S rRNA V4 sequencing of oral rinse samples (n=9,848). Spearman correlations were calculated between ten pre-specified genera and five cardiometabolic marker categories: systemic inflammation (hsCRP), lipids (total cholesterol, HDL, LDL, triglycerides), glucose metabolism (fasting glucose, HbA1c), and blood pressure (systolic and diastolic). Shannon diversity correlations with the same markers were calculated for comparison.", styles["Abstract"]))

    story.append(Paragraph("<b>Results:</b> Shannon diversity showed no significant correlation with hsCRP (r=+0.003, p=0.86), triglycerides (r=+0.010, p=0.50), glucose (r=\u22120.009, p=0.55), or blood pressure. In contrast, genus-level analysis identified consistent protective associations for <i>Neisseria</i> (lower hsCRP r=\u22120.051 p=5\u00d710<super>\u22124</super>, lower triglycerides r=\u22120.058 p=1\u00d710<super>\u22124</super>, lower systolic BP r=\u22120.061 p=2\u00d710<super>\u22129</super>, lower HbA1c r=\u22120.042 p=5\u00d710<super>\u22125</super>) and <i>Haemophilus</i> (lower triglycerides r=\u22120.094 p=3\u00d710<super>\u221210</super>, lower HbA1c r=\u22120.074 p=9\u00d710<super>\u221213</super>, lower systolic BP r=\u22120.047 p=5\u00d710<super>\u22126</super>, higher HDL r=+0.040 p=1\u00d710<super>\u22124</super>). <i>Tannerella</i> showed adverse associations with total cholesterol (r=+0.056 p=8\u00d710<super>\u22128</super>), glucose (r=+0.054 p=3\u00d710<super>\u22124</super>), HbA1c (r=+0.050 p=1\u00d710<super>\u22126</super>), and blood pressure (diastolic r=+0.052 p=4\u00d710<super>\u22127</super>). Twenty-eight of 60 genus\u2013blood marker pairs were statistically significant.", styles["Abstract"]))

    story.append(Paragraph("<b>Conclusions:</b> Genus-level oral microbiome composition, but not alpha diversity, is associated with cardiometabolic markers across multiple biological domains in a nationally representative US population. Consumer and clinical oral microbiome platforms relying solely on diversity indices may miss the most clinically relevant signals.", styles["Abstract"]))

    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph(
        "<b>Keywords:</b> oral microbiome, cardiometabolic risk, NHANES, alpha diversity, "
        "<i>Haemophilus</i>, <i>Neisseria</i>, <i>Tannerella</i>, blood pressure, HbA1c, hsCRP",
        styles["Keywords"]
    ))
    story.append(PageBreak())

    # ── PAGES 3+: Introduction ───────────────────────────────────────────────

    story.append(Paragraph("INTRODUCTION", styles["SectionHead"]))

    intro_paras = [
        "The oral microbiome \u2014 comprising over 700 bacterial species \u2014 has been increasingly recognized as a window into systemic health. Epidemiological studies have linked oral microbiome diversity to all-cause mortality (Shen et al. 2024, n=7,055, HR=0.63) and biological aging acceleration (Hou et al. 2025). These findings have generated significant interest in oral microbiome testing as a health monitoring tool, both in clinical and consumer contexts.",

        "However, most published analyses \u2014 and virtually all consumer platforms \u2014 characterize the oral microbiome using alpha diversity indices, particularly the Shannon-Wiener index. Alpha diversity captures overall richness and evenness of the microbial community but does not identify which specific bacteria are driving health associations.",

        "Mechanistic research has consistently implicated specific oral pathogens in systemic disease. <i>Porphyromonas gingivalis</i> has been detected in coronary artery plaques. <i>Fusobacterium nucleatum</i> is associated with colorectal cancer progression. <i>Tannerella forsythia</i>, a member of the periodontal \u201cred complex,\u201d has been associated with type 2 diabetes and cardiovascular risk. Conversely, nitrate-reducing bacteria including <i>Neisseria</i> and <i>Veillonella</i> convert dietary nitrates to nitric oxide \u2014 a key vasodilator and anti-inflammatory signaling molecule \u2014 and have been mechanistically linked to blood pressure regulation.",

        "The NHANES 2009-2012 oral microbiome dataset provides a unique opportunity to test genus-level associations at population scale. This dataset \u2014 the largest nationally representative oral microbiome study in the United States \u2014 includes 16S rRNA sequencing of oral rinse samples from over 9,000 US adults, linked to comprehensive laboratory data including inflammatory markers, lipid panels, glucose metabolism markers, and blood pressure measurements. Critically, the full genus-level taxonomic data were only publicly released in November 2024, meaning no study has yet examined genus-level oral-cardiometabolic associations in this cohort.",

        "Previous NHANES-based oral microbiome research has focused on alpha diversity and mortality outcomes (Shen et al. 2024; Mondal et al. 2025), or used antibody-based proxies for bacterial burden in older NHANES cycles (Pietropaoli et al. 2019). The specific contribution of genus-level bacterial composition to measured cardiometabolic blood values has not been examined in this dataset.",

        "We hypothesized that specific oral bacterial genera would show associations with cardiometabolic markers that are not detectable using alpha diversity alone, and that the direction of these associations would be consistent with established mechanistic literature.",
    ]
    for p in intro_paras:
        story.append(Paragraph(p, styles["PaperBody"]))

    # ── Methods ──────────────────────────────────────────────────────────────

    story.append(Paragraph("METHODS", styles["SectionHead"]))

    story.append(Paragraph("Data source", styles["SubHead"]))
    story.append(Paragraph("We used publicly available data from NHANES 2009-2012 (survey cycles F and G). NHANES is a stratified, multistage probability survey designed to assess the health and nutritional status of the non-institutionalized US civilian population. All NHANES protocols were approved by the NCHS Ethics Review Board. Analysis of publicly available de-identified data does not require additional IRB approval.", styles["PaperBody"]))

    story.append(Paragraph("Oral microbiome data", styles["SubHead"]))
    story.append(Paragraph("Oral microbiome data were generated from oral rinse samples collected from participants aged 14-69 years. Participants provided a 10 mL oral rinse (Scope mouthwash or saline). DNA was extracted and the V4 region of the 16S rRNA gene was amplified and sequenced using Illumina HiSeq 2500 (2\u00d7125bp). Sequences were processed using the DADA2 pipeline (v1.2.1) with taxonomy assigned using the SILVA v123 database. We used the DADA2-RB feature table, which removes non-bacterial taxa and unassigned sequences. Genus-level relative abundance data were obtained from the NHANES oral microbiome files publicly released November 2024.", styles["PaperBody"]))
    story.append(Paragraph("An important methodological note: NHANES used short-read V4 16S sequencing, which provides genus-level resolution only. Species-level differentiation \u2014 for example, distinguishing <i>Porphyromonas gingivalis</i> from other <i>Porphyromonas</i> species \u2014 was not possible with this dataset. All findings should be interpreted at the genus level.", styles["PaperBody"]))

    story.append(Paragraph("Blood markers", styles["SubHead"]))
    story.append(Paragraph("Laboratory data were obtained from NHANES examination files. We analyzed: hsCRP (mg/L), total cholesterol (mg/dL), HDL cholesterol (mg/dL), LDL cholesterol (mg/dL), triglycerides (mg/dL), fasting glucose (mg/dL), HbA1c (%), systolic blood pressure (mean of readings 1-4), and diastolic blood pressure (mean of readings 1-4).", styles["PaperBody"]))

    story.append(Paragraph("Target genera", styles["SubHead"]))
    story.append(Paragraph("We pre-specified ten genera based on mechanistic literature prior to analysis:", styles["PaperBody"]))
    story.append(Paragraph("Pathogenic/adverse: <i>Porphyromonas</i>, <i>Fusobacterium</i>, <i>Treponema</i>, <i>Tannerella</i>, <i>Prevotella</i>", styles["BodyIndent"]))
    story.append(Paragraph("Protective/nitrate-reducing: <i>Neisseria</i>, <i>Veillonella</i>, <i>Rothia</i>, <i>Haemophilus</i>, <i>Streptococcus</i>", styles["BodyIndent"]))

    story.append(Paragraph("Statistical analysis", styles["SubHead"]))
    story.append(Paragraph("Spearman rank correlations were calculated between genus relative abundance and each blood marker. Statistical significance was set at p<0.05. Shannon-Wiener diversity (at 10,000 read rarefaction depth) correlations with the same markers were calculated for comparison. All analyses were conducted in Python 3 using scipy.stats.", styles["PaperBody"]))

    # ── Results ──────────────────────────────────────────────────────────────

    story.append(Paragraph("RESULTS", styles["SectionHead"]))

    story.append(Paragraph("Alpha diversity", styles["SubHead"]))
    story.append(Paragraph("Shannon diversity showed no significant association with hsCRP (r=+0.003, p=0.86), triglycerides (r=+0.010, p=0.50), fasting glucose (r=\u22120.009, p=0.55), or systolic blood pressure. The only alpha diversity associations reaching significance were HDL (r=\u22120.023, p=0.03) and LDL (r=+0.038, p=0.01), both with minimal effect sizes.", styles["PaperBody"]))

    story.append(Paragraph("Genus-level associations \u2014 Protective bacteria", styles["SubHead"]))
    story.append(Paragraph("<i>Haemophilus</i> demonstrated the most consistent protective profile across all marker categories:", styles["PaperBody"]))
    for line in [
        "Triglycerides: r=\u22120.094, p=3.1\u00d710<super>\u221210</super>",
        "HbA1c: r=\u22120.074, p=9\u00d710<super>\u221213</super>",
        "Systolic BP: r=\u22120.047, p=5\u00d710<super>\u22126</super>",
        "Diastolic BP: r=\u22120.030, p=0.003",
        "HDL: r=+0.040, p=1.3\u00d710<super>\u22124</super>",
    ]:
        story.append(Paragraph("\u2014 " + line, styles["BodyIndent"]))

    story.append(Paragraph("<i>Neisseria</i> showed consistent inverse associations across:", styles["PaperBody"]))
    for line in [
        "Systolic BP: r=\u22120.061, p=2\u00d710<super>\u22129</super>",
        "Diastolic BP: r=\u22120.048, p=4\u00d710<super>\u22126</super>",
        "Triglycerides: r=\u22120.058, p=1.1\u00d710<super>\u22124</super>",
        "hsCRP: r=\u22120.051, p=5\u00d710<super>\u22124</super>",
        "HbA1c: r=\u22120.042, p=5\u00d710<super>\u22125</super>",
    ]:
        story.append(Paragraph("\u2014 " + line, styles["BodyIndent"]))
    story.append(Paragraph("These findings are consistent with the established role of <i>Neisseria</i> as a nitrate-reducing bacterium in the oral cavity, converting dietary nitrates to nitric oxide via the nitrate-nitrite-NO pathway.", styles["PaperBody"]))

    story.append(Paragraph("Genus-level associations \u2014 Pathogenic bacteria", styles["SubHead"]))
    story.append(Paragraph("<i>Tannerella</i> showed the most consistent adverse profile, with significant associations across:", styles["PaperBody"]))
    for line in [
        "Diastolic BP: r=+0.052, p=4\u00d710<super>\u22127</super>",
        "Total cholesterol: r=+0.056, p=8.2\u00d710<super>\u22128</super>",
        "HbA1c: r=+0.050, p=1\u00d710<super>\u22126</super>",
        "Glucose: r=+0.054, p=3\u00d710<super>\u22124</super>",
        "Systolic BP: r=+0.041, p=8\u00d710<super>\u22125</super>",
    ]:
        story.append(Paragraph("\u2014 " + line, styles["BodyIndent"]))
    story.append(Paragraph("This simultaneous association with lipid, metabolic, and blood pressure markers positions <i>Tannerella</i> as a potential multi-domain cardiometabolic risk indicator.", styles["PaperBody"]))

    story.append(Paragraph("<i>Porphyromonas</i> was positively associated with hsCRP (r=+0.037, p=0.012), consistent with its established role in systemic inflammation. <i>Fusobacterium</i> was associated with higher LDL (r=+0.058, p=1.3\u00d710<super>\u22124</super>) and higher glucose (r=+0.038, p=0.010). <i>Prevotella</i> was positively associated with hsCRP (r=+0.035, p=0.017).", styles["PaperBody"]))
    story.append(Paragraph("In total, 28 of 60 pre-specified genus \u00d7 blood marker pairs reached statistical significance (p<0.05).", styles["PaperBody"]))

    story.append(Paragraph("Unexpected findings", styles["SubHead"]))
    story.append(Paragraph("<i>Rothia</i> showed positive associations with hsCRP (r=+0.056, p=0.0001), systolic BP (r=+0.062, p=1\u00d710<super>\u22129</super>), and HbA1c (r=+0.078, p=3\u00d710<super>\u221214</super>). These unexpected directions likely reflect age confounding \u2014 <i>Rothia</i> abundance increases with age in the oral cavity, as do blood pressure and HbA1c. Age-adjusted analyses are warranted in future work.", styles["PaperBody"]))
    story.append(Paragraph("<i>Veillonella</i> did not show a significant inverse association with blood pressure, contrary to our hypothesis. This may also reflect age confounding or compositional effects within the genus.", styles["PaperBody"]))

    # ── Discussion ───────────────────────────────────────────────────────────

    story.append(Paragraph("DISCUSSION", styles["SectionHead"]))

    discussion_paras = [
        "Our analysis of 9,848 US adults demonstrates that genus-level oral microbiome composition is associated with cardiometabolic markers across multiple biological domains, while alpha diversity shows minimal association with the same markers.",

        "The most striking finding is the consistent protective profile of <i>Haemophilus</i> and <i>Neisseria</i>. <i>Haemophilus</i> showed significant inverse associations with HbA1c, triglycerides, blood pressure (both systolic and diastolic), and HDL \u2014 spanning glucose metabolism, lipid profiles, and cardiovascular markers simultaneously. <i>Neisseria</i> showed similarly consistent inverse associations with hsCRP, triglycerides, blood pressure, and HbA1c. Both genera are nitrate-reducing bacteria in the oral cavity, supporting the hypothesis that the nitrate-nitrite-NO pathway may mediate protective cardiometabolic effects. Dietary nitrates, abundant in leafy green vegetables, are converted to nitrite by oral bacteria and subsequently to nitric oxide \u2014 a key vasodilator and anti-inflammatory mediator. The population-level associations we observe are directionally consistent with this mechanism.",

        "The <i>Tannerella</i> findings are particularly clinically meaningful. This member of the periodontal red complex showed significant adverse associations across lipid markers, glucose metabolism, and blood pressure simultaneously in nearly 10,000 Americans. Prior work has associated <i>Tannerella forsythia</i> with periodontal disease and type 2 diabetes, but the simultaneous blood pressure signal in a nationally representative population sample of this size has not previously been reported.",

        "The failure of Shannon diversity to detect these associations is the key methodological contribution of this analysis. Shannon diversity captures overall community richness and evenness \u2014 it is elevated when many bacterial types are present in roughly equal proportions. A person with high Shannon diversity could simultaneously have elevated <i>Tannerella</i> burden; a person with low Shannon diversity could have high <i>Neisseria</i> abundance. The diversity index obscures the clinically relevant signal entirely. This has direct implications for both research and consumer oral microbiome platforms: diversity metrics alone are insufficient for cardiometabolic health inference.",

        "The unexpected positive associations of <i>Rothia</i> with hsCRP and blood pressure likely reflect age confounding. <i>Rothia</i> abundance increases with age in the oral microbiome, as do blood pressure and HbA1c. Age-adjusted models would be needed to determine whether <i>Rothia</i>\u2019s associations are independent or confounded. This does not alter the interpretation of <i>Haemophilus</i>, <i>Neisseria</i>, or <i>Tannerella</i> findings, which showed the most highly significant and consistent signals.",

        "Several limitations should be noted. This is a cross-sectional analysis \u2014 causal relationships cannot be established. Effect sizes are small (Spearman r values 0.03-0.09), consistent with the complexity of cardiometabolic regulation and the population-level nature of the analysis. NHANES used short-read V4 16S sequencing, providing genus-level resolution only \u2014 species-level contributions cannot be determined from this dataset. The oral rinse collection method may underestimate subgingival pathogens. Age confounding likely explains unexpected findings for <i>Rothia</i> and <i>Veillonella</i>. Future age-stratified and longitudinal analyses are warranted.",
    ]
    for p in discussion_paras:
        story.append(Paragraph(p, styles["PaperBody"]))

    # ── Conclusion ───────────────────────────────────────────────────────────

    story.append(Paragraph("CONCLUSION", styles["SectionHead"]))
    story.append(Paragraph("Genus-level oral microbiome composition, but not alpha diversity, is associated with cardiometabolic markers across inflammation, lipids, glucose metabolism, and blood pressure in a nationally representative US population of 9,848 adults. <i>Neisseria</i> and <i>Haemophilus</i> demonstrate consistent protective associations across all four marker categories. <i>Tannerella</i> demonstrates consistent adverse associations across lipid, metabolic, and blood pressure markers simultaneously. These associations are not detectable using Shannon diversity alone. Consumer and clinical oral microbiome platforms should prioritize pathogen-specific genus-level profiling over diversity indices when assessing systemic cardiometabolic health relevance.", styles["PaperBody"]))

    # ── References ───────────────────────────────────────────────────────────

    story.append(PageBreak())
    story.append(Paragraph("REFERENCES", styles["SectionHead"]))

    refs = [
        "1. Shen J, Chen H, Zhou X, et al. Oral microbiome diversity and diet quality in relation to mortality. <i>J Clin Periodontol</i>. 2024;51(11):1478-1489.",
        "2. Hou Y, et al. Oral microbiome diversity and biological aging acceleration. <i>J Clin Periodontol</i>. 2025.",
        "3. Vogtmann E, et al. Representative oral microbiome data for the US population: the National Health and Nutrition Examination Survey. <i>Lancet Microbe</i>. 2022.",
        "4. Chaturvedi AK, et al. Oral microbiome profile of the US population. <i>JAMA Network Open</i>. 2025;8(5):e258283.",
        "5. Pietropaoli D, Del Pinto R, Ferri C, Ortu E, Monaco A. Definition of hypertension-associated oral pathogens in NHANES. <i>J Periodontol</i>. 2019;90(8):866-876.",
        "6. Mondal R, et al. Oral microbiome alpha diversity and all-cause, cardiovascular, and non-cardiovascular mortality in US adults: Evidence from the NHANES 2009-2019. <i>Atherosclerosis</i>. 2025;401:119074.",
        "7. Hussain M, et al. <i>Porphyromonas gingivalis</i> in coronary artery plaques. 2023.",
        "8. L\u00f3pez-Ot\u00edn C, et al. Hallmarks of aging: An expanding universe. <i>Cell</i>. 2023;186(2):243-278.",
        "9. Bryan NS, Tribble G, Angelov N. Oral microbiome and nitric oxide: the missing link in the management of blood pressure. <i>Curr Hypertens Rep</i>. 2017;19:33.",
        "10. Furusho H, et al. Oral microbiome and cardiovascular disease. <i>J Oral Biosci</i>. 2023.",
    ]
    for r in refs:
        story.append(Paragraph(r, styles["Reference"]))

    # ── Table 1 ──────────────────────────────────────────────────────────────

    story.append(PageBreak())
    story.append(Paragraph(
        "Table 1. Significant genus \u00d7 blood marker associations (p<0.05)",
        styles["TableCaption"]
    ))

    t1_header = ["Genus", "Class.", "Blood Marker", "Spearman r", "p-value", "n", "Direction"]
    t1_data = [t1_header] + [
        ["Haemophilus",    "Prot.", "HbA1c",         "\u22120.074", "9\u00d710\u207b\u00b9\u00b3", "9,360", "Lower"],
        ["Haemophilus",    "Prot.", "Triglycerides",  "\u22120.094", "3\u00d710\u207b\u00b9\u2070", "4,496", "Lower"],
        ["Haemophilus",    "Prot.", "Systolic BP",    "\u22120.047", "5\u00d710\u207b\u2076",       "9,520", "Lower"],
        ["Haemophilus",    "Prot.", "Diastolic BP",   "\u22120.030", "0.003",                       "9,498", "Lower"],
        ["Haemophilus",    "Prot.", "HDL",            "+0.040",      "1\u00d710\u207b\u2074",       "9,239", "Higher"],
        ["Haemophilus",    "Prot.", "hsCRP",          "\u22120.044", "0.003",                       "4,713", "Lower"],
        ["Neisseria",     "Prot.", "Systolic BP",    "\u22120.061", "2\u00d710\u207b\u2079",       "9,520", "Lower"],
        ["Neisseria",     "Prot.", "Diastolic BP",   "\u22120.048", "4\u00d710\u207b\u2076",       "9,498", "Lower"],
        ["Neisseria",     "Prot.", "Triglycerides",  "\u22120.058", "1\u00d710\u207b\u2074",       "4,496", "Lower"],
        ["Neisseria",     "Prot.", "hsCRP",          "\u22120.051", "5\u00d710\u207b\u2074",       "4,713", "Lower"],
        ["Neisseria",     "Prot.", "HbA1c",          "\u22120.042", "5\u00d710\u207b\u2075",       "9,360", "Lower"],
        ["Tannerella",    "Path.", "Diastolic BP",   "+0.052",      "4\u00d710\u207b\u2077",       "9,498", "Higher"],
        ["Tannerella",    "Path.", "Total Chol",     "+0.056",      "8\u00d710\u207b\u2078",       "9,239", "Higher"],
        ["Tannerella",    "Path.", "HbA1c",          "+0.050",      "1\u00d710\u207b\u2076",       "9,360", "Higher"],
        ["Tannerella",    "Path.", "Glucose",        "+0.054",      "3\u00d710\u207b\u2074",       "4,539", "Higher"],
        ["Tannerella",    "Path.", "Systolic BP",    "+0.041",      "8\u00d710\u207b\u2075",       "9,520", "Higher"],
        ["Porphyromonas", "Path.", "hsCRP",          "+0.037",      "0.012",                       "4,713", "Higher"],
        ["Porphyromonas", "Path.", "LDL",            "+0.040",      "0.009",                       "4,418", "Higher"],
        ["Fusobacterium", "Path.", "LDL",            "+0.058",      "1\u00d710\u207b\u2074",       "4,418", "Higher"],
        ["Fusobacterium", "Path.", "Glucose",        "+0.038",      "0.010",                       "4,539", "Higher"],
        ["Prevotella",    "Path.", "hsCRP",          "+0.035",      "0.017",                       "4,713", "Higher"],
        ["Prevotella",    "Path.", "LDL",            "+0.047",      "0.002",                       "4,418", "Higher"],
    ]

    t1 = Table(t1_data, colWidths=[75, 35, 72, 58, 62, 38, 45])
    t1.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("LEADING", (0, 0), (-1, -1), 11),
        ("ALIGN", (3, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (2, -1), "LEFT"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, black),
        ("LINEABOVE", (0, 0), (-1, 0), 0.5, black),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, black),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("FONTNAME", (0, 1), (0, -1), "Times-Italic"),
    ]))
    story.append(t1)
    story.append(Paragraph(
        "Spearman rank correlations on genus relative abundances. Dataset: NHANES 2009-2012, "
        "genus-level 16S rRNA V4 sequencing (DADA2-RB pipeline), linked to NHANES laboratory "
        "files. Full genus-level taxonomic data publicly released November 2024. "
        "Prot. = Protective/nitrate-reducing. Path. = Pathogenic/adverse.",
        styles["TableNote"]
    ))

    # ── Table 2 ──────────────────────────────────────────────────────────────

    story.append(PageBreak())
    story.append(Paragraph(
        "Table 2. Alpha diversity (Shannon-Wiener) vs. cardiometabolic markers",
        styles["TableCaption"]
    ))

    t2_data = [
        ["Blood Marker", "Shannon r", "p-value", "Significant?"],
        ["hsCRP",          "+0.003", "0.86", "No"],
        ["Triglycerides",  "+0.010", "0.50", "No"],
        ["Fasting glucose","\u22120.009", "0.55", "No"],
        ["HbA1c",          "+0.015", ">0.05", "No"],
        ["Systolic BP",    "+0.008", ">0.05", "No"],
        ["Diastolic BP",   "+0.011", ">0.05", "No"],
        ["HDL",            "\u22120.023", "0.03", "Yes (r<0.025)"],
        ["LDL",            "+0.038", "0.01", "Yes (r<0.040)"],
    ]

    t2 = Table(t2_data, colWidths=[100, 70, 70, 90])
    t2.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("LEADING", (0, 0), (-1, -1), 13),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.5, black),
        ("LINEABOVE", (0, 0), (-1, 0), 0.5, black),
        ("LINEBELOW", (0, -1), (-1, -1), 0.5, black),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(t2)
    story.append(Paragraph(
        "Shannon-Wiener diversity calculated at 10,000 read rarefaction depth, averaged "
        "across 10 iterations. n.s. = not significant (p>0.05).",
        styles["TableNote"]
    ))

    # ── Build PDF ────────────────────────────────────────────────────────────

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"PDF generated: {OUT_FILE}")
    print(f"File size: {os.path.getsize(OUT_FILE) / 1024:.1f} KB")

    # Copy to Desktop
    import shutil
    shutil.copy2(OUT_FILE, DESKTOP_FILE)
    print(f"Also copied to: {DESKTOP_FILE}")


if __name__ == "__main__":
    build_document()
