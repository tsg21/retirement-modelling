import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseFtseAllShare,
  parseCpiFred,
  parseGiltYieldFred,
  parseBoeBaseRate,
  computeReturns,
  validateOutput,
} from '../app/src/data/historicalDataProcessing.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, '../data/raw')
const outputPath = resolve(__dirname, '../app/src/data/historicalReturns.json')

function main() {
  const ftseCsv = readFileSync(resolve(dataDir, 'ftse-allshare-price.csv'), 'utf-8')
  const cpiCsv = readFileSync(resolve(dataDir, 'uk-cpi-fred.csv'), 'utf-8')
  const giltCsv = readFileSync(resolve(dataDir, 'uk-gilt-yield-10y-fred.csv'), 'utf-8')
  const boeCsv = readFileSync(resolve(dataDir, 'boe-base-rate.csv'), 'utf-8')

  const ftse = parseFtseAllShare(ftseCsv)
  const cpi = parseCpiFred(cpiCsv)
  const gilt = parseGiltYieldFred(giltCsv)
  const boe = parseBoeBaseRate(boeCsv)

  console.log(`Parsed: FTSE ${ftse.length}, CPI ${cpi.length}, Gilt ${gilt.length}, BOE ${boe.length} monthly rows`)

  const result = computeReturns(ftse, cpi, gilt, boe)
  console.log(`Computed ${result.length} months of returns`)
  console.log(`Range: ${result[0].year}-${String(result[0].month).padStart(2, '0')} to ${result[result.length - 1].year}-${String(result[result.length - 1].month).padStart(2, '0')}`)

  validateOutput(result)
  console.log('Validation passed')

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n')
  console.log(`Written to ${outputPath}`)
}

main()
