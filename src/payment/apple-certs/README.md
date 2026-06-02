# Apple Root Certificates

`AppleVerifyService` needs Apple's root CA certificates to cryptographically
verify the certificate chain on signed App Store transactions.

## What to put here

Download these 4 DER-encoded root certificates from
https://www.apple.com/certificateauthority/ and drop the `.cer` files into this
folder (filenames don't matter — any `*.cer` / `*.der` / `*.crt` here is loaded):

1. **Apple Inc. Root Certificate** — `AppleIncRootCertificate.cer`
2. **Apple Computer, Inc. Root Certificate** — `AppleComputerRootCertificate.cer`
3. **Apple Root CA - G2 Root Certificate** — `AppleRootCA-G2.cer`
4. **Apple Root CA - G3 Root Certificate** — `AppleRootCA-G3.cer`

(In practice the **G3** root is the one used for current StoreKit signing, but
include all four so older/edge transactions still verify.)

## Notes

- These are **public** certificates — safe to commit to the repo.
- `nest-cli.json` copies `*.cer/*.der/*.crt` from here into `dist/payment/apple-certs`
  on build, so they are available at runtime next to the compiled service.
- If this folder is empty, Apple verification will throw
  "No Apple root certificates found in apple-certs".
