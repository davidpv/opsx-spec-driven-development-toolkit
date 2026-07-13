import { createRequire } from "node:module";
import { Command } from "commander";
import { doctorCommand } from "./commands/doctor.js";
import { initCommand } from "./commands/init.js";
import { updateCommand } from "./commands/update.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("opsx")
  .description("Spec-driven development toolkit for opencode, Claude Code and Codex")
  .version(pkg.version);

program
  .command("init")
  .description("Scaffold the spec-driven workflow in the current project")
  .option("-t, --targets <list>", "comma-separated targets: opencode,claude,codex")
  .option("--project-key <key>", "Jira project key (e.g. PROJ)")
  .option("--language <lang>", "default artifact language: es|en")
  .option("--main-branch <name>", "release branch (default: main)")
  .option("--integration-branch <name>", "integration branch (default: develop)")
  .option("--work-mode <mode>", "feature|flexible")
  .option("-y, --yes", "accept defaults, no prompts")
  .option("-f, --force", "overwrite existing differing files / re-init")
  .action((opts) => initCommand(opts, pkg.version));

program
  .command("update")
  .description("Refresh managed files after upgrading opsx (locally modified files are kept)")
  .option("-f, --force", "overwrite locally modified files and auto-apply managed-block changes")
  .option("--non-interactive", "do not prompt for managed-block changes; apply automatically and print a diff summary")
  .action((opts) => updateCommand(opts, pkg.version));

program
  .command("doctor")
  .description("Verify required tooling and project state")
  .action(() => doctorCommand());

program.parseAsync();
