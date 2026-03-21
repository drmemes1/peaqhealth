import type { ZymoReport } from './oral-parser'

export const MOCK_ORAL_OPTIMAL: ZymoReport = {
  sample_id: 'ZR-PEAQ-TEST-001',
  collection_date: '2026-03-10',
  sequencing_date: '2026-03-18',
  total_reads: 52847,
  diversity_metrics: { shannon_index: 3.52, observed_species: 214, chao1: 238 },
  taxonomy: {
    'Streptococcus salivarius': 16.2,
    'Veillonella parvula': 13.8,
    'Rothia mucilaginosa': 11.4,
    'Neisseria subflava': 9.6,
    'Haemophilus parainfluenzae': 6.8,
    'Streptococcus mitis': 5.9,
    'Streptococcus oralis': 4.7,
    'Actinomyces naeslundii': 3.8,
    'Prevotella melaninogenica': 2.1,
    'Fusobacterium nucleatum': 1.8,
    'Gemella haemolysans': 1.6,
    'Granulicatella adiacens': 1.4,
    'Rothia dentocariosa': 1.2,
    'Capnocytophaga gingivalis': 1.1,
    'Streptococcus parasanguinis': 1.0,
    'Porphyromonas gingivalis': 0.08,
    'Treponema denticola': 0.06,
    'Tannerella forsythia': 0.05,
    'Streptococcus mutans': 0.3,
  }
}

export const MOCK_ORAL_AVERAGE: ZymoReport = {
  sample_id: 'ZR-PEAQ-TEST-002',
  collection_date: '2026-03-10',
  sequencing_date: '2026-03-18',
  total_reads: 44293,
  diversity_metrics: { shannon_index: 2.71, observed_species: 142, chao1: 168 },
  taxonomy: {
    'Streptococcus salivarius': 22.4,
    'Streptococcus mitis': 18.6,
    'Neisseria subflava': 4.2,
    'Veillonella parvula': 3.8,
    'Streptococcus oralis': 6.9,
    'Prevotella melaninogenica': 8.4,
    'Prevotella pallens': 4.1,
    'Fusobacterium nucleatum': 5.2,
    'Porphyromonas gingivalis': 0.6,
    'Treponema denticola': 0.4,
    'Tannerella forsythia': 0.3,
    'Prevotella intermedia': 0.8,
    'Streptococcus mutans': 1.9,
    'Rothia mucilaginosa': 1.8,
    'Haemophilus parainfluenzae': 2.1,
    'Actinomyces naeslundii': 1.2,
    'Capnocytophaga': 1.4,
    'Eikenella corrodens': 0.6,
  }
}

export const MOCK_ORAL_DYSBIOTIC: ZymoReport = {
  sample_id: 'ZR-PEAQ-TEST-003',
  collection_date: '2026-03-10',
  sequencing_date: '2026-03-18',
  total_reads: 38491,
  diversity_metrics: { shannon_index: 1.94, observed_species: 87, chao1: 102 },
  taxonomy: {
    'Streptococcus salivarius': 28.6,
    'Streptococcus mutans': 8.4,
    'Prevotella melaninogenica': 14.2,
    'Prevotella pallens': 8.1,
    'Fusobacterium nucleatum': 9.8,
    'Porphyromonas gingivalis': 2.4,
    'Treponema denticola': 1.8,
    'Tannerella forsythia': 1.2,
    'Prevotella intermedia': 2.1,
    'Aggregatibacter actinomycetemcomitans': 0.8,
    'Neisseria subflava': 0.4,
    'Veillonella parvula': 0.6,
    'Rothia mucilaginosa': 0.3,
    'Selenomonas sputigena': 1.4,
    'Dialister invisus': 0.9,
    'Campylobacter rectus': 0.8,
    'Eikenella corrodens': 0.9,
  }
}

export const MOCK_ORAL_MOUTHWASH: ZymoReport = {
  sample_id: 'ZR-PEAQ-TEST-004',
  collection_date: '2026-03-10',
  sequencing_date: '2026-03-18',
  total_reads: 41820,
  diversity_metrics: { shannon_index: 3.01, observed_species: 178, chao1: 198 },
  taxonomy: {
    'Streptococcus salivarius': 19.4,
    'Streptococcus mitis': 14.2,
    'Streptococcus oralis': 8.8,
    'Haemophilus parainfluenzae': 0.1,
    'Fusobacterium nucleatum': 3.4,
    'Porphyromonas gingivalis': 0.18,
    'Prevotella melaninogenica': 4.2,
    'Neisseria subflava': 0.3,
    'Veillonella parvula': 0.3,
    'Rothia mucilaginosa': 0.2,
    'Actinomyces': 4.1,
    'Gemella haemolysans': 3.2,
    'Capnocytophaga gingivalis': 2.8,
    'Streptococcus parasanguinis': 2.6,
  }
}
