import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface RequestBody {
  user_id: string;
  payload: PushPayload;
}

interface Subscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

// Base64url encoding/decoding utilities
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binaryString = atob(base64 + padding);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function validateVapidKeyPair(vapidPublicKey: string, vapidPrivateKey: string): Promise<boolean> {
  try {
    const publicKeyBytes = base64UrlToUint8Array(vapidPublicKey);
    const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);

    // Public key: 65 bytes = 0x04 || x(32) || y(32)
    if (publicKeyBytes.length !== 65 || publicKeyBytes[0] !== 0x04) {
      console.error(`Invalid VAPID_PUBLIC_KEY format (expected 65 bytes uncompressed, got ${publicKeyBytes.length})`);
      return false;
    }
    if (privateKeyBytes.length !== 32) {
      console.error(`Invalid VAPID_PRIVATE_KEY format (expected 32 bytes, got ${privateKeyBytes.length})`);
      return false;
    }

    const x = publicKeyBytes.subarray(1, 33);
    const y = publicKeyBytes.subarray(33, 65);

    const publicJwk = {
      kty: "EC",
      crv: "P-256",
      x: uint8ArrayToBase64Url(x),
      y: uint8ArrayToBase64Url(y),
    };

    const privateJwk = {
      ...publicJwk,
      d: uint8ArrayToBase64Url(privateKeyBytes),
    };

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );

    const privateKey = await crypto.subtle.importKey(
      "jwk",
      privateJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );

    const msg = new TextEncoder().encode("vapid-keypair-selftest");
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, msg);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, sig, msg);
    return ok;
  } catch (e) {
    console.error("VAPID keypair validation error:", e);
    return false;
  }
}

// Convert Uint8Array to ArrayBuffer (fixes Deno type issues)
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

// HKDF implementation using SubtleCrypto
async function hkdfExtract(salt: ArrayBuffer, ikm: ArrayBuffer): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", key, ikm);
}

async function hkdfExpand(prk: ArrayBuffer, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const result = new Uint8Array(length);
  let prev = new Uint8Array(0);
  let offset = 0;
  let counter = 1;
  
  while (offset < length) {
    const input = concatUint8Arrays(prev, info, new Uint8Array([counter]));
    const output = new Uint8Array(await crypto.subtle.sign("HMAC", key, toArrayBuffer(input)));
    const toCopy = Math.min(output.length, length - offset);
    result.set(output.subarray(0, toCopy), offset);
    prev = output;
    offset += toCopy;
    counter++;
  }
  
  return result;
}

// Encrypt payload using aes128gcm for Web Push (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ body: Uint8Array }> {
  // Generate a random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  // Export server public key (65 bytes uncompressed)
  const serverPublicKeyBuffer = await crypto.subtle.exportKey("raw", serverKeys.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyBuffer);
  
  // Import client public key (p256dh)
  const clientPublicKeyBytes = base64UrlToUint8Array(p256dhKey);
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(clientPublicKeyBytes),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  // Derive shared secret using ECDH
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeys.privateKey,
    256
  );
  
  // Import auth secret
  const authSecretBytes = base64UrlToUint8Array(authSecret);
  
  // Derive IKM using HKDF
  // PRK = HKDF-Extract(auth_secret, ecdh_secret)
  const prk = await hkdfExtract(toArrayBuffer(authSecretBytes), sharedSecretBuffer);
  
  // info = "WebPush: info" || 0x00 || ua_public || as_public
  const webPushInfoPrefix = new TextEncoder().encode("WebPush: info\0");
  const ikmInfo = concatUint8Arrays(webPushInfoPrefix, clientPublicKeyBytes, serverPublicKey);
  
  // IKM = HKDF-Expand(PRK, info, 32)
  const ikm = await hkdfExpand(prk, ikmInfo, 32);
  
  // Now derive CEK and nonce from IKM using salt
  // PRK for content = HKDF-Extract(salt, IKM)
  const contentPrk = await hkdfExtract(toArrayBuffer(salt), toArrayBuffer(ikm));
  
  // CEK info = "Content-Encoding: aes128gcm" || 0x00
  const cekInfoBytes = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdfExpand(contentPrk, cekInfoBytes, 16);
  
  // Nonce info = "Content-Encoding: nonce" || 0x00
  const nonceInfoBytes = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await hkdfExpand(contentPrk, nonceInfoBytes, 12);
  
  // Pad the payload (RFC 8291 requires padding delimiter 0x02 at the end)
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 2; // Padding delimiter
  
  // Encrypt with AES-128-GCM
  const encryptionKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(cek),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(nonce) },
    encryptionKey,
    paddedPayload
  );
  const encrypted = new Uint8Array(encryptedBuffer);
  
  // Build the aes128gcm body
  // Header: salt (16) + rs (4) + idlen (1) + keyid (65) + encrypted record
  const recordSize = 4096;
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, recordSize, false);
  const idlen = new Uint8Array([serverPublicKey.length]);
  
  const body = concatUint8Arrays(salt, rs, idlen, serverPublicKey, encrypted);
  
  return { body };
}

// Create VAPID JWT for authorization
function leftPadToLength(bytes: Uint8Array, length: number): Uint8Array {
  if (bytes.length >= length) return bytes;
  const out = new Uint8Array(length);
  out.set(bytes, length - bytes.length);
  return out;
}

// WebCrypto ECDSA can return a DER-encoded signature. JWT (JOSE) requires raw (r||s) 64 bytes.
function derEcdsaSigToJose(derOrRaw: Uint8Array, paramBytes = 32): Uint8Array {
  // If already raw (r||s)
  if (derOrRaw.length === paramBytes * 2) return derOrRaw;

  // Minimal DER parser for: 30 <len> 02 <lenR> <r> 02 <lenS> <s>
  let offset = 0;
  const expect = (value: number) => {
    if (derOrRaw[offset] !== value) {
      throw new Error(`Invalid DER signature (expected 0x${value.toString(16)})`);
    }
    offset++;
  };

  const readLen = () => {
    const len = derOrRaw[offset++];
    if ((len & 0x80) === 0) return len;
    const n = len & 0x7f;
    let out = 0;
    for (let i = 0; i < n; i++) {
      out = (out << 8) | derOrRaw[offset++];
    }
    return out;
  };

  expect(0x30);
  readLen();
  expect(0x02);
  const rLen = readLen();
  const r = derOrRaw.subarray(offset, offset + rLen);
  offset += rLen;
  expect(0x02);
  const sLen = readLen();
  const s = derOrRaw.subarray(offset, offset + sLen);
  offset += sLen;

  // Strip leading 0x00 used to force positive INTEGER
  const rStripped = (r.length > 0 && r[0] === 0x00) ? r.subarray(1) : r;
  const sStripped = (s.length > 0 && s[0] === 0x00) ? s.subarray(1) : s;

  const rPadded = leftPadToLength(rStripped, paramBytes);
  const sPadded = leftPadToLength(sStripped, paramBytes);
  return concatUint8Arrays(rPadded, sPadded);
}

async function createVapidJwt(
  audience: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  // For proper VAPID, we need to sign a JWT with ES256
  // The private key is 32 bytes, the public key is 65 bytes (uncompressed)
  
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", typ: "JWT" };
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: "mailto:noreply@tradeflow.app",
  };
  
  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import the private key for ES256 signing
  // VAPID private key is raw 32-byte value
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  const publicKeyBytes = base64UrlToUint8Array(vapidPublicKey);
  
  // We need to construct a JWK from the raw keys
  // For P-256, the public key is 65 bytes: 0x04 || x (32 bytes) || y (32 bytes)
  // The private key is just d (32 bytes)
  const x = publicKeyBytes.subarray(1, 33);
  const y = publicKeyBytes.subarray(33, 65);
  const d = privateKeyBytes;
  
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: uint8ArrayToBase64Url(d),
  };
  
  try {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsignedToken)
    );

    // Convert DER->JOSE raw (r||s) if needed
    const signatureDerOrRaw = new Uint8Array(signatureBuffer);
    const signatureJose = derEcdsaSigToJose(signatureDerOrRaw, 32);
    const signatureB64 = uint8ArrayToBase64Url(signatureJose);
    
    return `${unsignedToken}.${signatureB64}`;
  } catch (e) {
    console.error("JWT signing error:", e);
    throw e;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, payload } = (await req.json()) as RequestBody;

    if (!user_id || !payload) {
      return new Response(
        JSON.stringify({ error: "user_id and payload are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's push subscriptions
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (fetchError) {
      console.error("Error fetching subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get VAPID keys
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ 
          error: "VAPID keys not configured",
          message: "Configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fast fail if the secrets are not a matching pair.
    // This is the most common reason for 403 "credentials do not correspond".
    const vapidPairOk = await validateVapidKeyPair(vapidPublicKey, vapidPrivateKey);
    if (!vapidPairOk) {
      console.error(
        "VAPID_PUBLIC_KEY does not match VAPID_PRIVATE_KEY. Update secrets with a matching keypair and re-subscribe clients."
      );
      return new Response(
        JSON.stringify({
          error: "VAPID key mismatch",
          message:
            "VAPID_PUBLIC_KEY não corresponde ao VAPID_PRIVATE_KEY. Atualize os secrets com um par VAPID válido e refaça a inscrição (desligar/ligar notificações).",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Sending push notification to ${subscriptions.length} devices:`, {
      title: payload.title,
      body: payload.body,
      url: payload.url,
    });

    // Public key is not sensitive, log a short fingerprint for debugging key mismatches
    console.log(`VAPID public key suffix: ${vapidPublicKey.slice(-8)} (len=${vapidPublicKey.length})`);

    const payloadString = JSON.stringify(payload);
    let sentCount = 0;
    const errors: string[] = [];
    const expiredEndpoints: string[] = [];

    // Send to each subscription
    for (const sub of subscriptions as Subscription[]) {
      try {
        // Get the origin for VAPID audience
        const endpointUrl = new URL(sub.endpoint);
        const audience = endpointUrl.origin;
        
        // Create VAPID JWT
        const jwt = await createVapidJwt(audience, vapidPublicKey, vapidPrivateKey);
        
        // Encrypt the payload
        const { body } = await encryptPayload(payloadString, sub.p256dh, sub.auth);

        // VAPID headers (widely supported)
        // - Authorization: WebPush <JWT>
        // - Crypto-Key: p256ecdsa=<public key>
        const authorization = `WebPush ${jwt}`;
        const cryptoKey = `p256ecdsa=${vapidPublicKey}`;
        
        // Send the push notification
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "Content-Length": body.length.toString(),
            "TTL": "86400",
            "Authorization": authorization,
            "Crypto-Key": cryptoKey,
          },
          body: toArrayBuffer(body),
        });

        const statusCode = response.status;
        console.log(`Push response for device: ${statusCode}`);

        if (statusCode === 410 || statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
          console.log(`Subscription expired`);
        } else if (response.ok || statusCode === 201) {
          sentCount++;
          console.log(`Push sent successfully`);
        } else {
          const responseText = await response.text();
          errors.push(`${statusCode}: ${responseText}`);
          console.error(`Push failed: ${statusCode} - ${responseText}`);

          // If the push service says our VAPID credentials don't match what was used when
          // creating this subscription, that subscription is permanently invalid until the
          // client re-subscribes. Clean it up automatically.
          if (
            statusCode === 403 &&
            /VAPID credentials in the authorization header do not correspond/i.test(responseText)
          ) {
            expiredEndpoints.push(sub.endpoint);
            console.log('Subscription VAPID mismatch; removing endpoint from DB');
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(errorMsg);
        console.error(`Error sending push:`, errorMsg);
      }
    }

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expiredEndpoints);
      console.log(`Cleaned up ${expiredEndpoints.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount,
        total: subscriptions.length,
        expired: expiredEndpoints.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Sent to ${sentCount}/${subscriptions.length} devices`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in send-push-notification:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
