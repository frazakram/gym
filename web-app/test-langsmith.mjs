// Run: node test-langsmith.mjs
// Tests if LangSmith can receive a trace with your current API key

import { Client } from "langsmith";

const apiKey = process.env.LANGSMITH_API_KEY;
const project = process.env.LANGSMITH_PROJECT || "gym-bro-dev";

if (!apiKey) {
  console.error("❌  LANGSMITH_API_KEY is not set");
  process.exit(1);
}

console.log("API key found:", apiKey.slice(0, 10) + "...");
console.log("Project:", project);
console.log("Sending a test trace...\n");

const client = new Client({ apiKey });

try {
  const runId = crypto.randomUUID();

  await client.createRun({
    id: runId,
    name: "test-connection",
    run_type: "chain",
    inputs: { message: "hello from gym-bro" },
    project_name: project,
    start_time: Date.now(),
  });

  await client.updateRun(runId, {
    outputs: { result: "ok" },
    end_time: Date.now(),
  });

  console.log("✅  Trace sent successfully!");
  console.log(`   Check: https://smith.langchain.com → ${project} project`);
  console.log("   If you see 'test-connection' in the traces list, the key works.");
} catch (err) {
  console.error("❌  Failed to send trace:", err.message);
  if (err.message.includes("401") || err.message.includes("403")) {
    console.error("   → API key is wrong or from a different workspace.");
    console.error("   → Go to smith.langchain.com → Settings → API Keys and create a new one.");
  }
}
