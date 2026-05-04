import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // ── Species-parser contract ────────────────────────────────────────
  // Halitosis + upper-airway runners must read species data via the
  // shared species-parser, never by direct kit-row column access. The
  // parser reads from raw_otu_table.__meta.entries (the authoritative
  // source); per-species columns lag the parser and misrepresent kits
  // processed before a parser update.
  //
  // If a new species is needed, add it to SpeciesProfile in
  // apps/web/lib/oral/species-parser.ts and consume it from there.
  {
    files: [
      "lib/oral/caries-v3-runner.ts",
      "lib/oral/nr-v1-runner.ts",
      "lib/oral/perio-burden-v1-runner.ts",
      "lib/oral/halitosis-v2-runner.ts",
      "lib/oral/upper-airway-v1-runner.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Bans `kitRow.<anything>_pct` reads anywhere in these files.
          selector: "MemberExpression[object.name='kitRow'][property.name=/_pct$/]",
          message:
            "Direct species-column reads are forbidden in this runner. Use parseSpeciesFromKitRow() from species-parser.ts instead. The species-parser reads from raw_otu_table.__meta.entries (authoritative); column reads misrepresent kits processed before parser updates.",
        },
        {
          // Also bans bracket-style `kitRow["..._pct"]` access.
          selector: "MemberExpression[computed=true][object.name='kitRow'][property.value=/_pct$/]",
          message:
            "Direct species-column reads are forbidden in this runner. Use parseSpeciesFromKitRow() from species-parser.ts instead.",
        },
      ],
    },
  },
]);

export default eslintConfig;
