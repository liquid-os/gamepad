import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

export default async function handler(req, res) {
  try {
    const { path: pathParts } = req.query;
    
    if (!pathParts || !Array.isArray(pathParts)) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Build the file path
    const filePath = path.join(process.cwd(), 'games', ...pathParts);

    // Check if file exists
    const fileStat = await stat(filePath);
    
    if (!fileStat.isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read the file
    const fileContent = await readFile(filePath);

    // Determine content type
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.send(fileContent);
  } catch (error) {
    console.error('Error serving static file:', error);
    return res.status(404).json({ error: 'File not found' });
  }
}

