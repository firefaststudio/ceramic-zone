import chalk from "chalk";

export function logInfo(message) {
  console.log(chalk.green(`[${new Date().toISOString()}] ℹ️  ${message}`));
}

export function logError(message) {
  console.error(chalk.red(`[${new Date().toISOString()}] ❌ ${message}`));
}

export function logWarn(message) {
  console.warn(chalk.yellow(`[${new Date().toISOString()}] ⚠️  ${message}`));
}
