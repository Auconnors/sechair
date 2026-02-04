const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const sslDir = path.join(__dirname, "ssl");
const keyPath = path.join(sslDir, "sechair-key.pem");
const certPath = path.join(sslDir, "sechair-cert.pem");

fs.mkdirSync(sslDir, { recursive: true });

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log("SSL certificate already exists.");
  process.exit(0);
}

try {
  execSync(
    `openssl req -x509 -nodes -newkey rsa:2048 -days 365 -keyout "${keyPath}" -out "${certPath}" -subj "/CN=localhost"`,
    { stdio: "inherit" },
  );
  console.log("Generated self-signed certificate in backend/ssl.");
} catch (error) {
  console.error("Failed to generate certificate. Ensure openssl is installed.");
  process.exit(1);
}
