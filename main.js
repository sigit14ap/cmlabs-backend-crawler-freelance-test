const puppeteer = require('puppeteer');
const fs = require('node:fs/promises');

(async () => {
  
})();

class WebCrawl {
    constructor(urls) {
        this.urls = urls;
    }

    async start() {
        const browser = await puppeteer.launch()

        for (const { url, element, callback } of this.urls) {
            try {
                const page = await browser.newPage();
                await page.setBypassCSP(true)
                await page.goto(url);
                await page.waitForSelector(element, {
                    timeout: 5000
                });
    
                let html = await page.evaluate(() => {
                    return document.querySelector('html').innerHTML;
                });

                html = await callback(page, html)

                await this.export(url, html)
            } catch (error) {
                console.log(error);
            }
        }

        await browser.close();
    }

    async export(url, html) {
        html = html.replace(/href="\//g, `href="${url}/`)
        .replace(/src="\//g, `href="${url}/`)
        .replace(/data-src=/g, 'src=');

        url = url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\..*/, '')

        await fs.writeFile(`${url}.html`, html);
    }
}

const data = [{
    url: 'https://cmlabs.co',
    element: '#totalClicks',
    callback: (page, html) => {
        return html
    }
}, {
    url: 'https://sequence.day',
    element: '#logo-container',
    callback: async (page, html) => {
        const cssHref = await page.$eval('link[rel="stylesheet"]', (el) => el.href);

        const cssContent = await page.evaluate(async (href) => {
            const response = await fetch(href);
            return await response.text();
        }, cssHref);

        return html.replace('<head>', `<head><style>${cssContent}</style>`)
    }
}]

const crawl = new WebCrawl(data);
crawl.start()