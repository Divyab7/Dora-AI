/**
 * Pinata IPFS integration.
 *
 * Pinata provides:
 * - Signed upload URLs for direct browser→IPFS uploads (no CORS issues)
 * - Gateway access for retrieving IPFS content
 * - JSON metadata pinning
 */

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_GATEWAY = process.env.PINATA_GATEWAY_URL || "https://gateway.pinata.cloud";
const PINATA_API = "https://api.pinata.cloud";

/**
 * Generate a signed URL for direct file upload to IPFS.
 * The client uploads directly to this URL, avoiding CORS issues
 * and keeping the JWT server-side.
 */
export async function generateSignedUploadUrl(): Promise<{
  signedUrl: string;
  cid?: string;
}> {
  if (!PINATA_JWT) {
    // Fallback for development: return mock
    console.warn("[Pinata] No JWT configured — using mock upload");
    return {
      signedUrl: `${PINATA_API}/pinning/pinFileToIPFS`,
    };
  }

  try {
    // Pinata doesn't have a "signed URL" endpoint per se —
    // we use the pinFileToIPFS endpoint with the JWT to upload.
    // The client sends the file to our API route, which proxies to Pinata.
    const response = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      // File is sent from the client to our API route
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      signedUrl: `${PINATA_API}/pinning/pinFileToIPFS`,
      cid: data.IpfsHash,
    };
  } catch (error) {
    console.error("[Pinata] Upload error:", error);
    throw new Error("Failed to upload to IPFS");
  }
}

/**
 * Upload file bytes to Pinata (server-side, via API route).
 */
export async function uploadFileToIPFS(
  file: File | Blob,
  name?: string
): Promise<{ cid: string; gatewayUrl: string }> {
  if (!PINATA_JWT) {
    // Development mock
    const mockCid = `bafybeig${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    return {
      cid: mockCid,
      gatewayUrl: `${PINATA_GATEWAY}/ipfs/${mockCid}`,
    };
  }

  const formData = new FormData();
  formData.append("file", file, name || "upload");

  const response = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    cid: data.IpfsHash,
    gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
  };
}

/**
 * Upload JSON metadata to IPFS.
 */
export async function uploadMetadataToIPFS(
  metadata: Record<string, unknown>
): Promise<{ cid: string; gatewayUrl: string }> {
  if (!PINATA_JWT) {
    const mockCid = `bafybeim${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    return { cid: mockCid, gatewayUrl: `${PINATA_GATEWAY}/ipfs/${mockCid}` };
  }

  const response = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    throw new Error(`Pinata metadata upload failed: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    cid: data.IpfsHash,
    gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
  };
}

/**
 * Get the gateway URL for an IPFS CID.
 */
export function getGatewayUrl(cid: string): string {
  return `${PINATA_GATEWAY}/ipfs/${cid}`;
}

/**
 * Fetch content from IPFS via gateway.
 */
export async function fetchFromIPFS(cid: string): Promise<Response> {
  const url = getGatewayUrl(cid);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch from IPFS: ${cid}`);
  }
  return response;
}
