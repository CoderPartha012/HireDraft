/** @type {import('next').NextConfig} */
const config = {
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/read-resume": [
      "./src/server/resume-worker.js",
      "./node_modules/pdfjs-dist/**/*",
    ],
  },
};
export default config;
