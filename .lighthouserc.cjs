module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:4173/CYBER-CHRONICAL/"],
      startServerCommand: "npm run preview",
      startServerReadyPattern: "Export ready",
      numberOfRuns: 3,
      settings: { formFactor: "mobile", onlyCategories: ["accessibility", "performance"] },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "categories:performance": ["warn", { minScore: 0.8, aggregationMethod: "median" }],
      },
    },
    upload: { target: "filesystem", outputDir: ".lighthouseci/results" },
  },
};
