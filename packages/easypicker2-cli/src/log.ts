const colors = {
  green: '\u001B[32m',
  cyan: '\u001B[36m',
  yellow: '\u001B[33m',
  red: '\u001B[31m',
  bold: '\u001B[1m',
  reset: '\u001B[0m',
}

function paint(color: keyof typeof colors, text: string) {
  return `${colors[color]}${text}${colors.reset}`
}

export const log = {
  info(message: string) {
    console.log(paint('cyan', `i ${message}`))
  },
  success(message: string) {
    console.log(paint('green', `✓ ${message}`))
  },
  warn(message: string) {
    console.log(paint('yellow', `! ${message}`))
  },
  error(message: string) {
    console.error(paint('red', `x ${message}`))
  },
  title(message: string) {
    console.log(`\n${paint('bold', message)}`)
  },
  command(command: string) {
    console.log(`  ${paint('green', command)}`)
  },
}
