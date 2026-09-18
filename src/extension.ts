import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";

let devoraTerminal: vscode.Terminal | undefined;

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function getCliPrefix(root: string): string {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) {
    return "pnpm exec devora";
  }
  if (fs.existsSync(path.join(root, "yarn.lock"))) {
    return "yarn devora";
  }
  return "npx devora";
}

function getDevoraTerminal(): vscode.Terminal {
  if (!devoraTerminal || devoraTerminal.exitStatus !== undefined) {
    devoraTerminal = vscode.window.createTerminal("Devora CLI");
  }
  return devoraTerminal;
}

function runDevoraCommand(root: string, args: string): void {
  const terminal = getDevoraTerminal();
  terminal.show();
  terminal.sendText(`${getCliPrefix(root)} ${args}`);
}

function listApps(root: string): string[] {
  const appsDir = path.join(root, "apps");
  if (!fs.existsSync(appsDir)) {
    return [];
  }
  return fs
    .readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

async function pickApp(root: string, allAppsLabel: string): Promise<string | undefined> {
  const apps = listApps(root);
  if (apps.length === 0) {
    return undefined;
  }
  const picked = await vscode.window.showQuickPick([allAppsLabel, ...apps], {
    placeHolder: "Which app?",
  });
  if (!picked || picked === allAppsLabel) {
    return undefined;
  }
  return picked;
}

async function startDevServer(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("Devora: open a workspace folder first.");
    return;
  }
  const app = await pickApp(root, "All apps");
  runDevoraCommand(root, app ? `dev --app=${app}` : "dev");
}

async function buildApp(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("Devora: open a workspace folder first.");
    return;
  }
  const app = await pickApp(root, "All apps");
  runDevoraCommand(root, app ? `build --app=${app}` : "build");
}

async function newApp(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("Devora: open a workspace folder first.");
    return;
  }
  const name = await vscode.window.showInputBox({
    prompt: "New app name",
    placeHolder: "e.g. marketing",
    validateInput: (value) => (value.trim().length === 0 ? "App name is required." : undefined),
  });
  if (!name) {
    return;
  }
  // The CLI itself prompts interactively for --auth when it's omitted
  // (packages/cli/src/commands/new.ts) — left to the terminal rather than
  // reimplemented here.
  runDevoraCommand(root, `new ${name}`);
}

const RENDER_MODES = ["ssr", "ssg", "csr", "isr", "streaming"] as const;

function routeFileContent(appName: string, componentName: string, renderMode: string): string {
  return `import { PageShell } from "@devorajs/core";

export const renderMode = "${renderMode}";

export function meta() {
  return { title: "${componentName}", description: "" };
}

export async function loader() {
  return {};
}

export default function ${componentName}() {
  return (
    <PageShell appName="${appName}">
      <h1>${componentName}</h1>
    </PageShell>
  );
}
`;
}

function toComponentName(routeSegment: string): string {
  const cleaned = routeSegment.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  const name = cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
  return name.length > 0 ? name : "Route";
}

async function newRoute(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("Devora: open a workspace folder first.");
    return;
  }
  const apps = listApps(root);
  if (apps.length === 0) {
    vscode.window.showErrorMessage('Devora: no apps found under "apps/" in this workspace.');
    return;
  }
  const app = await vscode.window.showQuickPick(apps, { placeHolder: "Which app?" });
  if (!app) {
    return;
  }

  const routePath = await vscode.window.showInputBox({
    prompt: "Route path, relative to routes/ (no extension)",
    placeHolder: "route name, no extension needed — e.g. settings or users/[id]",
    validateInput: (value) => (value.trim().length === 0 ? "Route path is required." : undefined),
  });
  if (!routePath) {
    return;
  }

  const renderMode = await vscode.window.showQuickPick(RENDER_MODES, {
    placeHolder: "Render mode",
  });
  if (!renderMode) {
    return;
  }

  const normalized = routePath
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.tsx$/i, "");
  const filePath = path.join(root, "apps", app, "routes", `${normalized}.tsx`);

  if (fs.existsSync(filePath)) {
    vscode.window.showErrorMessage(`Devora: ${path.relative(root, filePath)} already exists.`);
    return;
  }

  const lastSegment = normalized.split("/").pop() ?? normalized;
  const componentName = toComponentName(lastSegment);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, routeFileContent(app, componentName, renderMode));

  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("devora.startDevServer", startDevServer),
    vscode.commands.registerCommand("devora.buildApp", buildApp),
    vscode.commands.registerCommand("devora.newApp", newApp),
    vscode.commands.registerCommand("devora.newRoute", newRoute)
  );
}

export function deactivate(): void {
  devoraTerminal = undefined;
}
