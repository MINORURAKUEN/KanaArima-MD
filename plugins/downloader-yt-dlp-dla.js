// ... (mantenemos las importaciones y la config inicial igual)

const APIS = {
  evogb: {
    base: 'https://api.evogb.org',
    key: 'evogb-9ivSW7OY'
  },
  apicausas: {
    base: 'https://rest.apicausas.xyz',
    key: 'causa-0e3eacf90ab7be15'
  }
};

// ... (Clase DownloadQueue y funciones de utilidad se mantienen)

const searchAndDownload = async (m, searchQuery, isVideo = false) => {
  const sessionId = `yt-dlp_${Date.now()}`;
  const outputDir = path.join(config.tempDir, sessionId);
  
  await ensureDirectories();
  await fs.promises.mkdir(outputDir, { recursive: true });

  try {
    // --- INTENTO 1: API EVOGB (Alta prioridad/Velocidad) ---
    try {
      const { default: fetch } = await import('node-fetch');
      const type = isVideo ? 'video' : 'audio';
      const response = await fetch(`${APIS.evogb.base}/download?query=${encodeURIComponent(searchQuery)}&type=${type}&apikey=${APIS.evogb.key}`);
      const data = await response.json();

      if (data.status && data.result?.url) {
        const fileName = `${data.result.title || 'download'}.${isVideo ? 'mp4' : 'mp3'}`;
        const filePath = path.join(outputDir, fileName);
        
        const fileRes = await fetch(data.result.url);
        const buffer = Buffer.from(await fileRes.arrayBuffer());
        await fs.promises.writeFile(filePath, buffer);
        
        await processDownloadedFile(m, filePath, fileName, isVideo);
        return; // Éxito, salimos.
      }
    } catch (e) { console.error("Error API EvoGB:", e.message); }

    // --- INTENTO 2: API APICAUSAS (Respaldo) ---
    try {
      const { default: fetch } = await import('node-fetch');
      const endpoint = isVideo ? '/ytdlp/video' : '/ytdlp/audio';
      const response = await fetch(`${APIS.apicausas.base}${endpoint}?q=${encodeURIComponent(searchQuery)}&apikey=${APIS.apicausas.key}`);
      const data = await response.json();

      if (data.url) {
        const fileName = `causa_${Date.now()}.${isVideo ? 'mp4' : 'mp3'}`;
        const filePath = path.join(outputDir, fileName);
        
        const fileRes = await fetch(data.url);
        const buffer = Buffer.from(await fileRes.arrayBuffer());
        await fs.promises.writeFile(filePath, buffer);
        
        await processDownloadedFile(m, filePath, fileName, isVideo);
        return;
      }
    } catch (e) { console.error("Error API Apicausas:", e.message); }

    // --- INTENTO 3: YT-DLP LOCAL (Último recurso si las APIs fallan) ---
    const ytDlpPath = await detectYtDlpBinary(m);
    const formatOptions = isVideo ? formats.video : formats.audio;
    const outputTemplate = path.join(outputDir, '%(title).20s.%(ext)s');
    const cookiesFlag = await buildCookiesFlag();

    const command = [
      ytDlpPath,
      `--max-filesize ${config.maxFileSize}`,
      commonFlags,
      '--playlist-items 1',
      formatOptions,
      cookiesFlag,
      `-o "${outputTemplate}"`,
      `"ytsearch1:${searchQuery}"`
    ].filter(Boolean).join(' ');

    await safeExecute(command);
    const files = await fs.promises.readdir(outputDir);
    if (files.length > 0) {
      for (const file of files) {
        await processDownloadedFile(m, path.join(outputDir, file), file, isVideo);
      }
    } else {
      throw new Error("No se pudo obtener el archivo de ninguna fuente.");
    }

  } catch (error) {
    console.error(`Error final en búsqueda: ${error.message}`);
    await m.reply("❌ No fue posible descargar el contenido. Intenta con otro nombre.");
  } finally {
    await fs.promises.rm(outputDir, { recursive: true, force: true }).catch(() => {});
  }
};

// ... (El resto del handleRequest y export se mantiene igual)

