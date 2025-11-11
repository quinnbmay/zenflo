import axios from 'axios';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

const token = process.env.HAPPY_AUTH_TOKEN;
const secretKeyStr = process.env.HAPPY_SECRET_KEY;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function parseSecretKey(secretStr) {
  let normalized = secretStr.toUpperCase()
    .replace(/0/g, 'O').replace(/1/g, 'I').replace(/8/g, 'B').replace(/9/g, 'G');
  const cleaned = normalized.replace(/[^A-Z2-7]/g, '');
  const bytes = [];
  let buffer = 0;
  let bufferLength = 0;
  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char);
    buffer = (buffer << 5) | value;
    bufferLength += 5;
    if (bufferLength >= 8) {
      bufferLength -= 8;
      bytes.push((buffer >> bufferLength) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

const masterSecret = parseSecretKey(secretKeyStr);

async function run() {
  const response = await axios.get('https://zenflo.combinedmemory.com/v1/kv/todo.index', {
    headers: { Authorization: 'Bearer ' + token }
  });
  
  const data = naclUtil.decodeBase64(response.data.value);
  const nonce = data.slice(0, nacl.secretbox.nonceLength);
  const ciphertext = data.slice(nacl.secretbox.nonceLength);
  const decrypted = nacl.secretbox.open(ciphertext, nonce, masterSecret);
  const jsonString = new TextDecoder().decode(decrypted);
  const index = JSON.parse(jsonString);
  
  console.log(JSON.stringify(index, null, 2));
}

run().catch(console.error);
