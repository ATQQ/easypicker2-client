export type CliOptions = Record<string, string | boolean | undefined>

export interface ParsedArgs {
  positionals: string[]
  options: CliOptions
}

function normalizeKey(key: string) {
  return key.replace(/^-+/, '').replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = []
  const options: CliOptions = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('-')) {
      positionals.push(arg)
      continue
    }

    if (arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '-v') {
      options.version = true
      continue
    }

    if (arg === '-i') {
      options.interactive = true
      continue
    }

    const [rawKey, inlineValue] = arg.split('=')
    const key = normalizeKey(rawKey)
    const next = argv[i + 1]

    if (inlineValue !== undefined) {
      options[key] = inlineValue
      continue
    }

    if (next && !next.startsWith('-')) {
      options[key] = next
      i++
      continue
    }

    options[key] = true
  }

  return { positionals, options }
}

export function getStringOption(options: CliOptions, key: string, defaultValue: string) {
  const value = options[key]
  return typeof value === 'string' ? value : defaultValue
}

export function getBooleanOption(options: CliOptions, key: string) {
  return options[key] === true
}
