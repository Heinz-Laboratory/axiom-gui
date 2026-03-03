/**
 * File download utilities for browser
 */

/**
 * Trigger browser download of file from memory
 *
 * @param filename - Name for the downloaded file
 * @param data - File data (binary or text)
 * @param mimeType - Optional MIME type (auto-inferred from extension if not provided)
 */
export function downloadFile(
    filename: string,
    data: Uint8Array | string,
    mimeType?: string
): void {
    // Determine MIME type from extension if not provided
    const inferredMimeType = mimeType || inferMimeType(filename);

    // Create blob from data
    // Cast Uint8Array to BlobPart as it's compatible at runtime
    const blobParts = typeof data === 'string'
        ? [data]
        : [data as BlobPart];
    const blob = new Blob(blobParts, { type: inferredMimeType });

    // Create download link and trigger
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Infer MIME type from filename extension
 */
function inferMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'png':
            return 'image/png';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'pdb':
        case 'xyz':
        case 'cif':
            return 'chemical/x-pdb';  // Chemical MIME types
        case 'json':
            return 'application/json';
        case 'txt':
            return 'text/plain';
        default:
            return 'application/octet-stream';
    }
}
