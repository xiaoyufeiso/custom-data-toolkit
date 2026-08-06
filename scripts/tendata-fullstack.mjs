#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "tendata-fullstack.json"), "utf8"));

const READY_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 1_000;
const IS_WINDOWS = process.platform === "win32";

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const install = rest.includes("--install");
  if (!["dev", "smoke"].includes(command)) {
    console.error("用法：node scripts/tendata-fullstack.mjs dev|smoke [--install]");
    process.exit(1);
  }
  if (install) installDependencies();
  if (command === "dev") return runDev();
  return runSmoke();
}

function childEnv() {
  const env = { ...process.env };
  const mirrors = CONFIG.mirrors ?? {};
  if (mirrors.uvIndex) {
    env.UV_DEFAULT_INDEX ??= mirrors.uvIndex;
    env.UV_INDEX_URL ??= mirrors.uvIndex;
  }
  if (mirrors.goproxy) env.GOPROXY ??= mirrors.goproxy;
  if (mirrors.gosumdb) env.GOSUMDB ??= mirrors.gosumdb;
  return env;
}

function dir(kind) {
  return path.join(ROOT, CONFIG[kind].dir);
}

function backendCommand() {
  const { runtime, port, pythonPackage, javaTask } = CONFIG.backend;
  if (runtime === "python") {
    return [
      "uv",
      "run",
      "uvicorn",
      `${pythonPackage}.main:app`,
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ];
  }
  if (runtime === "go") return ["make", "run"];
  // Java 后端由 tendata CLI 生成 gradlew 与 gradlew.bat。
  return [IS_WINDOWS ? "gradlew.bat" : "./gradlew", javaTask];
}

function frontendCommand() {
  const { packageManager } = CONFIG;
  const { port, devMode } = CONFIG.frontend;
  return [
    packageManager,
    "exec",
    "vite",
    "--mode",
    devMode ?? "uat",
    "--port",
    String(port),
    "--strictPort",
  ];
}

function installDependencies() {
  const { runtime } = CONFIG.backend;
  if (runtime === "python") runSync(["uv", "sync", "--group", "dev", "--group", "test"], dir("backend"));
  if (runtime === "go") runSync(["go", "mod", "tidy"], dir("backend"));
  runSync([CONFIG.packageManager, "install"], dir("frontend"));
}

// Windows 上 pnpm/npm/yarn 是 .cmd 包装脚本，CreateProcessW 无法直接执行，
// 必须交给 shell 解析；POSIX 上保持不用 shell，避免参数被二次拆分。
function spawnOptions(cwd) {
  return { cwd, env: childEnv(), shell: IS_WINDOWS };
}

function runSync(command, cwd) {
  console.log(`\n$ ${command.join(" ")}\n  cwd: ${cwd}`);
  const result = spawnSync(command[0], command.slice(1), { ...spawnOptions(cwd), stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function start(label, command, cwd) {
  console.log(`\n$ ${command.join(" ")}\n  cwd: ${cwd}`);
  const child = spawn(command[0], command.slice(1), spawnOptions(cwd));
  for (const stream of ["stdout", "stderr"]) {
    child[stream].on("data", (chunk) => {
      for (const line of String(chunk).split("\n")) {
        if (line.trim()) console.log(`[${label}] ${line}`);
      }
    });
  }
  return child;
}

function runDev() {
  const backend = start("backend", backendCommand(), dir("backend"));
  const frontend = start("frontend", frontendCommand(), dir("frontend"));
  const children = [backend, frontend];
  const stop = () => {
    for (const child of children) child.kill("SIGTERM");
  };
  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  for (const child of children) {
    child.on("exit", (code) => {
      stop();
      process.exit(code ?? 0);
    });
  }
  console.log(`\n前端： http://127.0.0.1:${CONFIG.frontend.port}`);
  console.log(`Smoke：http://127.0.0.1:${CONFIG.frontend.port}${CONFIG.frontend.smokePath || "/login"}`);
  console.log(`后端： ${CONFIG.backend.smokeUrl}`);
}

async function runSmoke() {
  const backend = start("backend", backendCommand(), dir("backend"));
  const frontend = start("frontend", frontendCommand(), dir("frontend"));
  const stop = () => {
    backend.kill("SIGTERM");
    frontend.kill("SIGTERM");
  };

  let failure;
  try {
    const payload = await waitForJson(CONFIG.backend.smokeUrl, "后端 smoke endpoint");
    if (payload.status !== CONFIG.backend.expectedStatus) {
      throw new Error(
        `后端 status 期望 ${CONFIG.backend.expectedStatus}，实际 ${JSON.stringify(payload.status)}`,
      );
    }
    console.log(`\n[smoke] 后端通过：${CONFIG.backend.smokeUrl} -> ${JSON.stringify(payload)}`);

    const frontendBase = `http://127.0.0.1:${CONFIG.frontend.port}`;
    const smokePath = CONFIG.frontend.smokePath || "/login";
    await waitForOk(`${frontendBase}${smokePath}`, "前端 smoke 页面");
    console.log(`[smoke] 前端通过：${frontendBase}${smokePath}`);
  } catch (error) {
    failure = error;
  } finally {
    stop();
  }

  if (failure) {
    console.error(`\n[smoke] 失败：${failure.message}`);
    process.exit(1);
  }
  console.log("\n[smoke] 全部通过");
  process.exit(0);
}

async function waitForJson(url, label) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = "unknown";
  while (Date.now() < deadline) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error.message;
      await sleep(POLL_INTERVAL_MS);
    }
  }
  throw new Error(`${label} 超时（${url}）：${lastError}`);
}

async function waitForOk(url, label) {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = "unknown";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`${label} 超时（${url}）：${lastError}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main();
