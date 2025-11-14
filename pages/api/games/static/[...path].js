import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { createReadStream } from 'fs';

const stat = promisify(fs.stat);

// Get GAMES_DIR from environment or default
function getGamesDir() {
  // In Next.js, we need to use process.cwd() as base, but respect GAMES_DIR env var
  const gamesDir = process.env.GAMES_DIR;
  if (gamesDir) {
    return gamesDir;
  }
  // Default to games directory in project root
  return path.join(process.cwd(), 'games');
}

export default async function handler(req, res) {
  try {
    const { path: pathParts } = req.query;
    
    if (!pathParts || !Array.isArray(pathParts)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Build the file path using GAMES_DIR
    const gamesDir = getGamesDir();
    const filePath = path.join(gamesDir, ...pathParts);

    // Security: Ensure the resolved path is within gamesDir
    const resolvedPath = path.resolve(filePath);
    const resolvedGamesDir = path.resolve(gamesDir);
    if (!resolvedPath.startsWith(resolvedGamesDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    const fileStat = await stat(filePath);
    
    if (!fileStat.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set caching headers for better performance
    // Cache static assets for 1 hour, with revalidation
    const maxAge = 3600; // 1 hour
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', `public, max-age=${maxAge}, must-revalidate`);
    res.setHeader('ETag', `"${fileStat.mtime.getTime()}-${fileStat.size}"`);
    res.setHeader('Last-Modified', fileStat.mtime.toUTCString());

    // Check if client has cached version
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    const etag = `"${fileStat.mtime.getTime()}-${fileStat.size}"`;
    
    if (ifNoneMatch === etag || 
        (ifModifiedSince && new Date(ifModifiedSince) >= fileStat.mtime)) {
      return res.status(304).end(); // Not Modified
    }

    // Stream the file instead of reading into memory
    // This is much more efficient for large files and network storage
    const stream = createReadStream(filePath);
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
  } catch (error) {
    console.error('Error serving static file:', error);
    if (!res.headersSent) {
      return res.status(404).json({ error: 'File not found' });
    }
  }
}

