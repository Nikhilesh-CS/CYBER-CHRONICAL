import { spawnSync } from "node:child_process";

const env = { ...process.env };
// Serializing Next's filesystem work avoids concurrent directory creation errors on Windows.
if (process.platform === "win32" && !env.UV_THREADPOOL_SIZE) env.UV_THREADPOOL_SIZE = "1";

const result = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
