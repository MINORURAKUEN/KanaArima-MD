import { join } from 'path';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import { google } from 'googleapis';
import { EventEmitter } from 'events';

const SCOPES = ['https://www.googleapis.com/auth/drive']; // Cambiado a 'drive' para permitir subida/descarga
const TOKEN_PATH = join(process.cwd(), 'token.json');

class GoogleAuth extends EventEmitter {
  constructor() {
    super();
    this.oAuth2Client = null;
  }

  async authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    this.oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    try {
      const token = JSON.parse(await fs.readFile(TOKEN_PATH));
      this.oAuth2Client.setCredentials(token);
    } catch (e) {
      const authUrl = this.oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });
      this.emit('auth', authUrl);
      
      // Espera el código de verificación emitido por el método token()
      const code = await new Promise((resolve) => this.once('token', resolve));
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);
      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    }
  }

  token(code) {
    this.emit('token', code);
  }
}

class GoogleDrive extends GoogleAuth {
  constructor() {
    super();
    this.drive = null;
  }

  // Inicializa el servicio de Drive después de autorizar
  initDrive() {
    this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
  }

  /**
   * Obtiene el ID de una carpeta buscando por nombre
   */
  async getFolderID(folderName) {
    const res = await this.drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
      fields: 'files(id, name)',
    });
    return res.data.files[0]?.id || null;
  }

  /**
   * Lista los archivos de una carpeta específica (o raíz)
   */
  async folderList(folderId = 'root') {
    const res = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType)',
    });
    return res.data.files;
  }

  /**
   * Descarga un archivo por su ID
   */
  async downloadFile(fileId, destPath) {
    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    
    return new Promise((resolve, reject) => {
      const dest = fs.createWriteStream(destPath);
      res.data
        .on('end', () => resolve(destPath))
        .on('error', reject)
        .pipe(dest);
    });
  }

  /**
   * Sube un archivo a una carpeta específica
   */
  async uploadFile(fileName, filePath, folderId = null) {
    const fileMetadata = {
      name: fileName,
      parents: folderId ? [folderId] : [],
    };
    const media = {
      mimeType: 'application/octet-stream',
      body: (await fs.readFile(filePath)), // O usar fs.createReadStream
    };

    const file = await this.drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id',
    });
    return file.data.id;
  }
}

export { GoogleAuth, GoogleDrive };
