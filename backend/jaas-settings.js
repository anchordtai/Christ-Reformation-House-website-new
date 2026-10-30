const crypto = require('node:crypto');

// Render values are sometimes pasted with the quotes from an .env example.
// Strip only one matching outer pair; never alter the key's encoded contents.
function normalize(value) {
  let text = String(value || '').trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) text = text.slice(1,-1).trim();
  return text;
}

function inspect(env) {
  const appId = normalize(env.JAAS_APP_ID);
  const keyId = normalize(env.JAAS_KEY_ID);
  const pem = normalize(env.JAAS_PRIVATE_KEY).replace(/\\n/g,'\n');
  const checks = {
    JAAS_APP_ID: !appId ? 'missing' : /^vpaas-magic-cookie-[a-zA-Z0-9-]{10,80}$/.test(appId) ? 'valid' : 'invalid_format',
    JAAS_KEY_ID: !keyId ? 'missing' : !keyId.startsWith(appId + '/') ? 'app_id_mismatch' : keyId.length <= appId.length+1 || keyId.length > 200 || /\s/.test(keyId) ? 'invalid_format' : 'valid',
    JAAS_PRIVATE_KEY: !pem ? 'missing' : 'unreadable_pem',
  };
  let privateKey;
  if (pem.includes('-----BEGIN ENCRYPTED PRIVATE KEY-----')) checks.JAAS_PRIVATE_KEY = 'encrypted_key';
  else if (pem && !/-----BEGIN (RSA )?PRIVATE KEY-----/.test(pem)) checks.JAAS_PRIVATE_KEY = 'private_key_required';
  else if (pem) {
    try {
      privateKey = crypto.createPrivateKey(pem);
      checks.JAAS_PRIVATE_KEY = privateKey.asymmetricKeyType !== 'rsa' ? 'rsa_key_required' : !(privateKey.asymmetricKeyDetails?.modulusLength >= 2048) ? 'rsa_key_too_small' : 'valid';
    } catch { /* Never return OpenSSL messages or input fragments. */ }
  }
  const ready = Object.values(checks).every(status => status === 'valid');
  return { checks, config: ready ? { appId,keyId,privateKey } : null };
}

function settings(env = process.env) { return inspect(env).config; }
// Public diagnostics contain only fixed status codes, never environment values,
// user identifiers, key material, provider exceptions, or bearer credentials.
function configurationChecks(env = process.env) { return inspect(env).checks; }
module.exports = { settings, configurationChecks };
