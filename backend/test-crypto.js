const crypto = require('crypto');
const NodeRSA = require('node-rsa');

// Test logic taken from the requirements
function extendKey(keyData) {
   // Des3 CBC requires 24 byte key. We'll use the first 24 bytes 
   // like the Java StringUtils.substringBefore(fullAlg, "/") essentially does 
   // based on the key bytes. 
   // Actually the logic provided in Python uses:
   // extended_key = key_data * (24 // len(key_data) + 1)
   // return extended_key[:24]
   
   // Given the prompt: byte[] keyData = Base64.decode("Uqt3frmnmVQQgU7S4wUJnKBrQ0CypPii");
   // Base64 decoded length for 32 chars is 24 bytes exactly. 
   // Let's verify this.
   const buf = Buffer.from(keyData, 'base64');
   return buf.slice(0, 24); 
}

function encrypt(text, keyBase64) {
    const keyBuf = extendKey(keyBase64);
    const iv = Buffer.alloc(8, 0); 
    const cipher = crypto.createCipheriv('des-ede3-cbc', keyBuf, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

function decrypt(encryptedText, keyBase64) {
    const keyBuf = extendKey(keyBase64);
    const iv = Buffer.alloc(8, 0); 
    const decipher = crypto.createDecipheriv('des-ede3-cbc', keyBuf, iv);
    
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Test Vectors 
const keyData = 'X6kWEiP8BwjE3esQbIUQKST4iRHEtgKU'; // Example key from the Python snippet
const plainText = '123456abc';

console.log("--- Testing DESede CBC ---");
const encrypted = encrypt(plainText, keyData);
console.log("Encrypted:", encrypted);

const decrypted = decrypt('jbMsdcgriwGFB5Tq81jp6w==', keyData);
console.log("Decrypted with known ciphertext:", decrypted);
const decryptedSelf = decrypt(encrypted, keyData);
console.log("Decrypted self:", decryptedSelf);

// Test RSA
console.log("\n--- Testing RSA SHA-1 Sign/Verify ---");
const key = new NodeRSA({b: 512});
key.setOptions({ signingScheme: 'pkcs1-sha1' });

const pubPem = key.exportKey('public');
const privPem = key.exportKey('private');

const payload = '{"message":"hello world"}';
const sig = key.sign(payload, 'base64', 'utf8');
console.log("Signature:", sig);

const isValid = key.verify(payload, sig, 'utf8', 'base64');
console.log("Signature Valid:", isValid);
