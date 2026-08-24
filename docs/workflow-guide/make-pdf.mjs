/**
 * Print the MMS workflow HTML guide to PDF via Puppeteer.
 * Run: node docs/workflow-guide/make-pdf.mjs
 */
import puppeteer from 'puppeteer'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const htmlPath = path.join(__dirname, 'MMS-Workflow-Guide.html')
const pdfPath = path.join(__dirname, 'MMS-Workflow-Guide.pdf')

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
})

try {
  const page = await browser.newPage()
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: 'networkidle0',
  })
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', right: '12mm', bottom: '14mm', left: '12mm' },
  })
  console.log('PDF written to', pdfPath)
} finally {
  await browser.close()
}
