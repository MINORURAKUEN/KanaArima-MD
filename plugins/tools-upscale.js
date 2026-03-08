// ✅ Función con Evasión Anti-Bots (Bypass Cloudflare) y APIs actualizadas
async function upscaleWithFreeAPI(url) {
  const encodedUrl = encodeURIComponent(url)
  
  // Lista limpia de APIs activas
  const apis = [
    `https://api.siputzx.my.id/api/ai/remini?url=${encodedUrl}`,
    `https://api.dorratz.com/v2/image-upscale?url=${encodedUrl}`,
    `https://api.ryzendesu.vip/api/ai/remini?url=${encodedUrl}`,
    `https://deliriussapi-oficial.vercel.app/tools/remini?url=${encodedUrl}`
  ]

  let errores = []

  // 🎭 Headers para engañar a Cloudflare y hacer creer que somos Google Chrome en una PC
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*"
  }

  for (const endpoint of apis) {
    const apiName = endpoint.split('/')[2]
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 20000) 

      // Enviamos la petición con nuestro "disfraz"
      const response = await fetch(endpoint, { headers, signal: controller.signal })
      clearTimeout(timeoutId)

      if (!response.ok) {
          errores.push(`${apiName}: Error ${response.status}`)
          continue 
      }

      const contentType = response.headers.get("content-type") || ""

      if (contentType.includes("application/json")) {
          const json = await response.json()
          let resultUrl = json.data?.url || json.data || json.url || json.result || json.image
          
          if (!resultUrl || typeof resultUrl !== 'string') {
              errores.push(`${apiName}: No se encontró link en el JSON`)
              continue 
          }
          
          const imgResponse = await fetch(resultUrl, { headers })
          const arrayBuffer = await imgResponse.arrayBuffer()
          return Buffer.from(arrayBuffer)
          
      } else {
          const arrayBuffer = await response.arrayBuffer()
          return Buffer.from(arrayBuffer)
      }
      
    } catch (err) {
      errores.push(`${apiName}: ${err.name === 'AbortError' ? 'Timeout' : 'Caída'}`)
      continue 
    }
  }
  
  throw new Error(`\nTodas las APIs fallaron.\nReporte de daños:\n- ${errores.join('\n- ')}\n\n*Nota:* Si todas fallan constantemente, las APIs podrían estar bloqueando enlaces de 'catbox.moe'.`)
}
