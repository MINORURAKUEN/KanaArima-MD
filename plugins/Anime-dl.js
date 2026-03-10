import axios from 'axios';
import * as cheerio from 'cheerio';

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

const providers = {
    latino: {
        name: 'Latanime',
        url: 'https://latanime.org/buscar?q=',
        selector: '.animes .anime',
        title: '.title',
        link: 'a',
        img: 'img'
    },
    sub: {
        name: 'TioAnime',
        url: 'https://tioanime.com/directorio?q=',
        selector: '.anime',
        title: '.title',
        link: 'a',
        img: 'img'
    }
};

// Definimos la función como una constante para exportarla al final
const searchAnime = async (query, type = 'sub') => {
    const provider = providers[type];
    if (!provider) return "❌ Proveedor no válido.";
    
    const searchUrl = `${provider.url}${encodeURIComponent(query)}`;

    try {
        const { data } = await axios.get(searchUrl, { headers });
        const $ = cheerio.load(data);
        const results = [];

        $(provider.selector).each((i, el) => {
            if (i < 3) {
                const title = $(el).find(provider.title).text().trim();
                let link = $(el).find(provider.link).attr('href');
                let img = $(el).find(provider.img).attr('src');

                if (link && !link.startsWith('http')) {
                    link = (type === 'sub' ? 'https://tioanime.com' : 'https://latanime.org') + link;
                }

                results.push({ title, link, img });
            }
        });

        if (results.length === 0) return `❌ No encontré nada en ${provider.name}.`;

        let caption = `📺 *Resultados en ${provider.name}:*\n\n`;
        results.forEach((res, index) => {
            caption += `*${index + 1}.* ${res.title}\n🔗 ${res.link}\n\n`;
        });

        return { text: caption, image: results[0].img };
    } catch (e) {
        return `⚠️ Error al buscar en ${provider.name}: ${e.message}`;
    }
};

// CAMBIO CLAVE: Usamos export default en lugar de module.exports
export default searchAnime;

