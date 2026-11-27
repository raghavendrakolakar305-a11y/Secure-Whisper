# Security Policy

## Important encryption limitation

Secure Whisper currently uses AES-256-GCM on the server. The backend holds ENCRYPTION_KEY and performs encryption and decryption, so the server can access message plaintext. This is encrypted messaging, not true end-to-end encryption (E2EE).

A future E2EE design should move encryption and decryption to clients and use authenticated public-key key exchange so the backend cannot access plaintext or private conversation keys.

## Reporting a vulnerability

Please report sensitive vulnerabilities privately through GitHub rather than publishing exploit details in a public issue. Include the affected component, reproduction steps, security impact, and suggested mitigation when possible.

Never include real passwords, API keys, private keys, production tokens, or personal data in a report.
