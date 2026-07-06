import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";

// Create Express App
const app = express();
const PORT = 3000;

app.use(express.json());

// Path to simulated project
let SIM_DIR = path.join(process.cwd(), "simulated-project");

// Helper to write default agent prompts into a target directory
function writeDefaultAgentPrompts(targetAgentsDir: string) {
  try {
    if (!fs.existsSync(targetAgentsDir)) {
      fs.mkdirSync(targetAgentsDir, { recursive: true });
    }
    
    const prompts: Record<string, string> = {
      "orchestrator.md": "You are the primary Orchestrator Agent. Coordinate subagents and verify task progress.",
      "planner.md": "You are the Macro Planner Agent. Analyze requirements, break down tasks, and write clean, rigid specifications contract in tasks/spec.md.",
      "reviewer.md": "You are the Plan Reviewer. Validates + issues Compliance Certificate.",
      "generator.md": "You are the Certificate-gated code/deliverable generator.",
      "evaluator.md": "You are the Output verifier against spec.md and registry rules.",
      "executor.md": "You are the Micro Executor Agent. Read specifications from tasks/spec.md, write complete functional implementations, and move tasks to review/.",
      "critic.md": "You are the Rigid Critic Agent. Review review/ deliverables, run dry-runs and regulatory verification checks, and stamp PASS or FAIL."
    };

    for (const [filename, content] of Object.entries(prompts)) {
      const filePath = path.join(targetAgentsDir, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content, "utf-8");
      }
    }
  } catch (err: any) {
    console.error(`Failed to write default agent prompts in ${targetAgentsDir}:`, err.message);
  }
}

// Ensure simulation directories exist
function initSimDirs(targetDir = SIM_DIR) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Ensure simulation agents prompts directory and files exist
  const simAgentsDir = path.join(targetDir, "agents");
  writeDefaultAgentPrompts(simAgentsDir);

  const subdirs = ["tasks", "review", "done"];
  subdirs.forEach((dir) => {
    const fullPath = path.join(targetDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // Write default AGENTS.md
  const agentsMdPath = path.join(targetDir, "AGENTS.md");
  if (!fs.existsSync(agentsMdPath)) {
    fs.writeFileSync(
      agentsMdPath,
      `# Opencode Agent System Manual & Identity Config
This file acts as the dynamic manual defining the operating boundaries, authority constraints, and strict business rules for all agents in the workspace.

## 1. Global Safety & Action Suppression Directives
- **Action Suppression**: ALL agents are strictly forbidden from writing code, markdown sheets, or slide presentations until the Planner has successfully created the spec agreement and the Ambiguity Score has converged to <= 0.3.
- **Sprint Contract Pattern**: The generated sprint spec (\`tasks/spec.md\`) acts as the signed contract. No source files can be written in any workspace without a valid spec document verified by the Harness.
- **Binary Judgment Principle**: Critics must enforce tight Binary Pass/Fail evaluations. No loose fuzzy scores. Every requirement is either 100% complete or Fail.

## 2. Triangle Topology Identity Directives
### A. Macro Planner (Gemini)
- Role: Structural architect and overall router. Reads user request, splits into modular independent specifications, writes clean tasks inside \`tasks/\` directory.
- Constraint: Never write real target files (e.g., code or slides). Only write specifications.

### B. Micro Executor (Qwen/Coder)
- Role: Local craftsman. Takes specifications in \`tasks/\`, writes complete functional code and outputs, and moves them to \`review/\` folder.
- Constraint: Must provide FULL executable code. Do not output truncated code blocks or placeholders.

### C. Rigid Critic (DeepSeek-R1)
- Role: Aggressive code-auditor and legal inspector. Simulates execution, finds logical bugs, checks EU AI Act compliance, stamps PASS or FAIL with harsh corrective feedback.
- Constraint: If FAIL is stamped, move specification back to \`tasks/\` and append precise failure logs.
`
    );
  }

  // Write default opencode.json with custom agents configuration template
  const opencodeJsonPath = path.join(targetDir, "opencode.json");
  if (!fs.existsSync(opencodeJsonPath)) {
    const defaultOpencode = {
      $schema: "https://opencode.ai/config.json",
      plugin: [
        "oh-my-openagent@latest"
      ],
      model: "opencode/big-pickle",
      provider: {
        ollama: {
          npm: "@ai-sdk/openai-compatible",
          name: "Ollama (Local)",
          options: {
            baseURL: "http://localhost:11434/v1"
          },
          models: {
            "qwen3.5:0.8b": { name: "Qwen3.5 0.8B" },
            "qwen3.5:4b": { name: "Qwen3.5 4B" },
            "qwen3.5:9b": { name: "Qwen3.5 9B (Recommended)" },
            "qwen3.5:27b": { name: "Qwen3.5 27B" },
            "qwen3.5:35b": { name: "Qwen3.5 35B" },
            "qwen3.5:122b": { name: "Qwen3.5 122B" }
          }
        }
      },
      default_agent: "orchestrator",
      instructions: ["AGENTS.md"],
      skills: {
        paths: [".opencode/skills"]
      },
      workflowType: "PROJECT_CODING",
      ambiguityThreshold: 0.3,
      maxIterations: 3,
      jurySize: 3,
      strictMode: true,
      agent: {
        orchestrator: {
          description: "Sprint Contract Pipeline Orchestrator (로컬 primary agent)",
          model: "opencode/big-pickle",
          prompt: "{file:~/.config/opencode/agents/orchestrator.md}",
          mode: "primary",
          permission: {
            task: {
              "*": "deny",
              "planner": "allow",
              "executor": "allow",
              "critic": "allow"
            }
          }
        },
        planner: {
          description: "Macro Planner Agent. Analyze requirements, break down tasks, and write clean, rigid specifications contract in tasks/spec.md.",
          model: "gemini-3.5-flash",
          temperature: 0.2,
          prompt: "{file:./agents/planner.md}",
          mode: "subagent",
          permission: { edit: "deny", write: "deny", bash: "deny" }
        },
        executor: {
          description: "Micro Executor Agent. Read specifications from tasks/spec.md, write complete functional implementations, and move tasks to review/.",
          model: "gemini-3.5-flash",
          temperature: 0.5,
          prompt: "{file:./agents/executor.md}",
          mode: "subagent",
          permission: { edit: "allow", write: "allow", bash: "ask" }
        },
        critic: {
          description: "Rigid Critic Agent. Review review/ deliverables, run dry-runs and regulatory verification checks, and stamp PASS or FAIL.",
          model: "gemini-3.5-flash",
          temperature: 0.1,
          prompt: "{file:./agents/critic.md}",
          mode: "subagent",
          permission: { edit: "deny", write: "deny", bash: "deny" }
        }
      },
      command: {
        "init-harness": {
          description: "Initialize Harness structure for current project (.opencode/, opencode.json)",
          template: "Run the harness initialization script using the CLI. Then report which directories/files were created or already existed.",
          agent: "orchestrator"
        }
      }
    };
    fs.writeFileSync(opencodeJsonPath, JSON.stringify(defaultOpencode, null, 2));
  }

  // Write default config
  const configPath = path.join(targetDir, "harness.config.json");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          workflowType: "PROJECT_CODING",
          ambiguityThreshold: 0.3,
          maxIterations: 3,
          jurySize: 3,
          strictMode: true,
        },
        null,
        2
      )
    );
  }
}

// Help resolve and normalize either agents or agent object structure safely
function loadAndNormalizeConfig(targetDir = SIM_DIR) {
  const opencodePath = path.join(targetDir, "opencode.json");
  const configPath = path.join(targetDir, "harness.config.json");
  let loadedConfig: any = null;

  if (fs.existsSync(opencodePath)) {
    try {
      loadedConfig = JSON.parse(fs.readFileSync(opencodePath, "utf-8"));
    } catch (_) {}
  } else if (fs.existsSync(configPath)) {
    try {
      loadedConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (_) {}
  }

  if (loadedConfig) {
    const rawAgents = loadedConfig.agent || loadedConfig.agents || {};
    
    // Support robust aliasing of subagents for our engine
    const planner = rawAgents.planner || {};
    const executor = rawAgents.executor || rawAgents.generator || {};
    const critic = rawAgents.critic || rawAgents.reviewer || rawAgents.evaluator || {};
    
    loadedConfig.agents = {
      planner: {
        model: planner.model || "gemini-3.5-flash",
        systemInstruction: planner.prompt || planner.systemInstruction || "You are the Macro Planner Agent. Analyze requirements, break down tasks, and write clean, rigid specifications contract in tasks/spec.md.",
        temperature: planner.temperature !== undefined ? planner.temperature : 0.2
      },
      executor: {
        model: executor.model || "gemini-3.5-flash",
        systemInstruction: executor.prompt || executor.systemInstruction || "You are the Micro Executor Agent. Read specifications from tasks/spec.md, write complete functional implementations, and move tasks to review/.",
        temperature: executor.temperature !== undefined ? executor.temperature : 0.5
      },
      critic: {
        model: critic.model || "gemini-3.5-flash",
        systemInstruction: critic.prompt || critic.systemInstruction || "You are the Rigid Critic Agent. Review review/ deliverables, run dry-runs and regulatory verification checks, and stamp PASS or FAIL.",
        temperature: critic.temperature !== undefined ? critic.temperature : 0.1
      }
    };
  }

  return loadedConfig;
}

// Global in-memory state for the active simulation
interface SimState {
  currentWorkflow: string;
  rawRequirement: string;
  isOrchestrating: boolean;
  currentStep: string;
  iteration: number;
  maxIterations: number;
  ambiguityThreshold: number;
  activeAgent: string | null;
  thoughtChain: string[];
  metrics: {
    planQuality: number;
    planAdherence: number;
    argumentCorrectness: number;
    reasoningCoherence: number;
    ambiguityScore: number;
  };
  logs: Array<{
    id: string;
    timestamp: string;
    agent: string;
    action: string;
    details: string;
    fileAffected?: string;
    stateTransition?: { from: string; to: string };
    regulationChecked: string;
    hash: string;
  }>;
}

let activeSimState: SimState = {
  currentWorkflow: "PROJECT_CODING",
  rawRequirement: "",
  isOrchestrating: false,
  currentStep: "Idle",
  iteration: 0,
  maxIterations: 3,
  ambiguityThreshold: 0.3,
  activeAgent: null,
  thoughtChain: [],
  metrics: {
    planQuality: 0,
    planAdherence: 0,
    argumentCorrectness: 0,
    reasoningCoherence: 0,
    ambiguityScore: 1.0,
  },
  logs: [],
};

// Log helper
function addAuditLog(
  agent: string,
  action: string,
  details: string,
  fileAffected?: string,
  stateTransition?: { from: string; to: string },
  regulationChecked: string = "N/A"
) {
  const timestamp = new Date().toISOString();
  const id = crypto.randomUUID();
  const hashContent = `${timestamp}-${agent}-${action}-${details}-${fileAffected || ""}-${JSON.stringify(
    stateTransition || {}
  )}-${regulationChecked}`;
  const hash = crypto.createHash("sha256").update(hashContent).digest("hex").substring(0, 12);

  const entry = {
    id,
    timestamp,
    agent,
    action,
    details,
    fileAffected,
    stateTransition,
    regulationChecked,
    hash,
  };
  activeSimState.logs.unshift(entry);
}

// Initialize Gemini Client
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
}

// API Routes

// Get current harness status
app.get("/api/harness/status", (req, res) => {
  initSimDirs();

  // Read actual files in SIM_DIR
  const tasksFiles = fs.readdirSync(path.join(SIM_DIR, "tasks")).filter((f) => f !== ".gitkeep");
  const reviewFiles = fs.readdirSync(path.join(SIM_DIR, "review")).filter((f) => f !== ".gitkeep");
  const doneFiles = fs.readdirSync(path.join(SIM_DIR, "done")).filter((f) => f !== ".gitkeep");

  const loadedConfig = loadAndNormalizeConfig();

  res.json({
    ...activeSimState,
    files: {
      tasks: tasksFiles,
      review: reviewFiles,
      done: doneFiles,
    },
    projectDir: SIM_DIR,
    apiEnabled: !!aiClient,
    config: loadedConfig,
  });
});

// Update active project workspace directory path dynamically
app.post("/api/harness/workspace", (req, res) => {
  const { workspacePath } = req.body;
  if (!workspacePath) {
    return res.status(400).json({ error: "Missing workspacePath" });
  }

  try {
    let resolvedPath = workspacePath;
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.resolve(process.cwd(), resolvedPath);
    }

    // Verify or initialize standard structures
    initSimDirs(resolvedPath);

    // Switch SIM_DIR
    SIM_DIR = resolvedPath;

    // Load configurations from target if available
    const loadedConfig = loadAndNormalizeConfig(SIM_DIR) || {};

    activeSimState.currentWorkflow = loadedConfig.workflowType || "PROJECT_CODING";
    activeSimState.ambiguityThreshold = loadedConfig.ambiguityThreshold || 0.3;
    activeSimState.maxIterations = loadedConfig.maxIterations || 3;
    activeSimState.currentStep = `Switched Workspace to ${SIM_DIR}`;
    activeSimState.thoughtChain.push(`[Harness Workspace] Switched active project directory to: ${SIM_DIR}`);

    addAuditLog(
      "Harness",
      "WORKSPACE_SWITCH",
      `Switched active project workspace path to: ${SIM_DIR}`,
      "opencode.json",
      undefined,
      "EU AI Act Art. 13 (Technical documentation and trace accuracy)"
    );

    res.json({ success: true, workspaceDir: SIM_DIR, config: loadedConfig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Init simulation
app.post("/api/harness/init", (req, res) => {
  try {
    initSimDirs();
    // Clear directory files to restart clean
    const dirs = ["tasks", "review", "done"];
    dirs.forEach((dir) => {
      const fullPath = path.join(SIM_DIR, dir);
      const files = fs.readdirSync(fullPath);
      files.forEach((file) => {
        fs.unlinkSync(path.join(fullPath, file));
      });
    });

    activeSimState = {
      currentWorkflow: req.body.workflowType || "PROJECT_CODING",
      rawRequirement: req.body.rawRequirement || "SQLite balance query with slide storyboard presentation",
      isOrchestrating: false,
      currentStep: "Initialized Workspace",
      iteration: 0,
      maxIterations: 3,
      ambiguityThreshold: 0.3,
      activeAgent: null,
      thoughtChain: ["Workspace directory structures initialized with tasks/, review/, done/ subfolders."],
      metrics: {
        planQuality: 0,
        planAdherence: 0,
        argumentCorrectness: 0,
        reasoningCoherence: 0,
        ambiguityScore: 1.0,
      },
      logs: [],
    };

    addAuditLog(
      "Harness",
      "WORKSPACE_INIT",
      `Created directory structures and injected AGENTS.md ruleset into simulated space.`,
      "AGENTS.md",
      undefined,
      "EU AI Act Art. 13 (Transparency and technical documentation validation)"
    );

    res.json({ success: true, message: "Workspace successfully initialized." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// View simulated file contents
app.get("/api/harness/view-file", (req, res) => {
  const relPath = req.query.path as string;
  if (!relPath) {
    return res.status(400).json({ error: "Missing file path query parameter." });
  }
  try {
    const fullPath = path.join(SIM_DIR, relPath);
    // Safety check - restrict to simulated project directory
    if (!fullPath.startsWith(SIM_DIR)) {
      return res.status(403).json({ error: "Access denied. Target is outside sandbox." });
    }

    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      res.json({ path: relPath, content });
    } else {
      res.status(404).json({ error: "File not found." });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset simulation
app.post("/api/harness/reset", (req, res) => {
  initSimDirs();
  activeSimState.isOrchestrating = false;
  activeSimState.currentStep = "Idle";
  activeSimState.iteration = 0;
  activeSimState.activeAgent = null;
  activeSimState.thoughtChain = ["Simulation reset. Ready for next sprint run."];
  activeSimState.metrics = {
    planQuality: 0,
    planAdherence: 0,
    argumentCorrectness: 0,
    reasoningCoherence: 0,
    ambiguityScore: 1.0,
  };
  activeSimState.logs = [];
  res.json({ success: true });
});

// Real/Emulated Agent Orchestration Run handler
app.post("/api/harness/run", async (req, res) => {
  if (activeSimState.isOrchestrating) {
    return res.status(400).json({ error: "Orchestration is already running." });
  }

  activeSimState.isOrchestrating = true;
  res.json({ success: true, message: "Harness orchestration loop launched." });

  // Run orchestration in a mock-async background loop to simulate real flow on the UI
  try {
    const workflow = activeSimState.currentWorkflow;
    const reqText = activeSimState.rawRequirement;

    // STEP 1: PLANNER STAGE - Action Suppression Planning
    activeSimState.currentStep = "PLANNER_STAGE_START";
    activeSimState.activeAgent = "PLANNER";
    activeSimState.thoughtChain.push("[Planner Agent] Reading user requirements and system guidelines in AGENTS.md...");
    await delay(1500);

    activeSimState.thoughtChain.push("[Planner Agent] Suppressing premature action. Preparing sprint contract draft spec.md...");
    await delay(1500);

    // Write tasks/spec.md
    const specPath = path.join(SIM_DIR, "tasks", "spec.md");
    let specContent = "";

    if (aiClient) {
      // Real LLM Planning Call
      try {
        let modelName = "gemini-3.5-flash";
        let plannerInstruction = "You are the Macro Planner Agent.";
        let plannerTemp = 0.2;

        const conf = loadAndNormalizeConfig();
        if (conf && conf.agents && conf.agents.planner) {
          modelName = conf.agents.planner.model || modelName;
          plannerInstruction = conf.agents.planner.systemInstruction || plannerInstruction;
          plannerTemp = conf.agents.planner.temperature !== undefined ? conf.agents.planner.temperature : plannerTemp;
        }

        const prompt = `${plannerInstruction}\n\nCreate a highly detailed, rigid specifications contract (spec.md) based on user's raw requirement: "${reqText}" for a ${workflow} task.
Include:
1. Target Objective
2. Rigorous Constraint Checklist (e.g. SQLite usr_id, exact color themes #003366, layouts, BBox coordinates)
3. Testing Suite specs and Assertions
4. Evaluation rubric requirements.

Do not write code, write markdown specification only. Be extremely verbose to reduce ambiguity. Include some potential TBDs or vague sections intentionally for the first round, as the harness will detect it and force refinement.`;

        const response = await aiClient.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            temperature: plannerTemp,
          }
        });
        specContent = response.text || "";
      } catch (err) {
        console.error("Real planner call failed, falling back to rich templated spec:", err);
      }
    }

    if (!specContent) {
      // Rich templates based on workflows
      if (workflow === "PROJECT_CODING") {
        specContent = `# Sprint Contract: SQLite Account Balance Lookup Engine
## 1. Target Objective
Build a robust SQLite database lookup engine that queries balances for customer code \`usr-9901\` and reports findings in standard markdown table layout.

## 2. Technical Constraint Checklist
- **Database Engine**: SQLite
- **Input validation**: Ensure safety audits on custom parameters to defend against injection.
- **Vague Section (TBD)**: The user might ask to connect to cloud database later. We will temporarily note: TBD: We will adjust connection parameters later on the fly or hardcode credentials.
- **Output Standard**: Standard markdown format.

## 3. Pre-Coding Test Suite Schema
- Test SQLite file existence before establishing connection.
- Test query resolution returns correct balance values.
`;
      } else if (workflow === "MD_KNOWLEDGE") {
        specContent = `# Sprint Contract: Multi-Agent Architecture Documentation
## 1. Target Objective
Compile a rich Markdown knowledge base describing the High-end Minimalist virtual state machine and cognitive topology.

## 2. Rigorous Guidelines
- **Fact mapping**: Each statement must match AGENTS.md constraints exactly.
- **Keywords**: Include Position Bias, Verbosity Bias, Jury of Judges.
- **Vague Section**: TBD: We will research other European legal compliance acts and insert them randomly.
`;
      } else {
        specContent = `# Sprint Contract: Slide Storyboard Presentation Planning
## 1. Target Objective
Create structured XML/Markdown presentation blueprint outlining slide layouts and messaging strategy.

## 2. Presentation Guidelines
- Theme: Classic slate dark blue. Primary color: #003366, Secondary: #008080.
- Slide limit: Max 5 slides. Max 4 lines per slide.
- Layout metadata: BBox coordinates: [0.1, 0.1, 0.8, 0.4] for heading, [0.1, 0.5, 0.8, 0.4] for content.
- **Vague Section**: TBD: We can add some beautiful custom canvas graphics or charts later, or maybe some cute cartoons if they look great.
`;
      }
    }

    fs.writeFileSync(specPath, specContent);
    addAuditLog(
      "Planner",
      "WRITE_SPEC",
      `Formulated initial sprint contract draft and saved to tasks/spec.md. No physical code or final files written (Action Suppressed).`,
      "tasks/spec.md",
      undefined,
      "EU AI Act Art. 13 Compliance (Mandatory technical documentation transparency)"
    );

    // STEP 2: PLAN REFINEMENT LOOP (Ambiguity Check)
    activeSimState.currentStep = "HARNESS_AMBIGUITY_GATE";
    activeSimState.activeAgent = null;
    activeSimState.thoughtChain.push("[Harness Control Gate] Performing constraint audit & ambiguity evaluation...");
    await delay(2000);

    // Initial evaluation
    let ambiguityScore = 0.8; // Initially high due to TBD sections
    activeSimState.metrics.ambiguityScore = ambiguityScore;
    activeSimState.thoughtChain.push(`[Harness Control Gate] Constraint audit failed. Ambiguity Score: ${ambiguityScore} > Threshold (0.3). Vague sections detected ("TBD", "later", "on the fly"). REJECTING physical write. Triggering Iterative Refinement Loop.`);
    addAuditLog(
      "Harness Gate",
      "AUDIT_REJECT",
      `Spec rejected due to vague directives. Ambiguity score 0.8 exceeds threshold. Suppressing downstream actions.`,
      "tasks/spec.md"
    );

    activeSimState.iteration = 1;
    await delay(1500);

    // Iteration 1 Refinement
    activeSimState.activeAgent = "PLANNER";
    activeSimState.thoughtChain.push("[Planner Agent] Parsing audit feedback. Removing TBD sections and hardening specifications...");
    await delay(2000);

    // Update spec with refined content
    let refinedSpec = specContent;
    if (workflow === "PROJECT_CODING") {
      refinedSpec = refinedSpec
        .replace("TBD: We will adjust connection parameters later on the fly or hardcode credentials.", "")
        .concat(`\n## 4. Hardened Connection Specification\n- Hard-coded sandbox path: \`./balance.db\`\n- Connection pool size: 1 (Rigid Single-Threaded Access)\n- Strict input validation regex: \`^[a-zA-Z0-9-]{3,12}$\``);
    } else if (workflow === "MD_KNOWLEDGE") {
      refinedSpec = refinedSpec
        .replace("TBD: We will research other European legal compliance acts and insert them randomly.", "")
        .concat(`\n## 4. Compliance Auditing Section\n- High Risk AI categorizations tracked strictly.\n- Audit logs hashed with SHA-256 for integrity verification.`);
    } else {
      refinedSpec = refinedSpec
        .replace("TBD: We can add some beautiful custom canvas graphics or charts later, or maybe some cute cartoons if they look great.", "")
        .concat(`\n## 4. Visual Components Specification\n- No custom graphic widgets allowed. Only standard slide grids.\n- Strict 4:3 display ratio.`);
    }

    fs.writeFileSync(specPath, refinedSpec);
    addAuditLog(
      "Planner",
      "REFINE_SPEC",
      `Hardened sprint contract spec.md. Removed ambiguous clauses.`,
      "tasks/spec.md"
    );

    // Re-evaluating Ambiguity
    activeSimState.currentStep = "HARNESS_AMBIGUITY_GATE_2";
    activeSimState.activeAgent = null;
    activeSimState.thoughtChain.push("[Harness Control Gate] Performing second round Constraint Audit...");
    await delay(1500);

    ambiguityScore = 0.25; // Successfully reduced
    activeSimState.metrics.ambiguityScore = ambiguityScore;
    activeSimState.metrics.planQuality = 0.92;
    activeSimState.thoughtChain.push(`[Harness Control Gate] Constraint Audit PASSED! Ambiguity Score: ${ambiguityScore} <= Threshold (0.3). Sprint contract signed! Releasing write locks for Micro Executor.`);
    addAuditLog(
      "Harness Gate",
      "AUDIT_PASS",
      `Sprint contract spec.md validated. Ambiguity Score is 0.25. Releasing I/O execution locks.`,
      "tasks/spec.md"
    );
    await delay(1500);

    // STEP 3: EXECUTOR STAGE - Execution inside Local Workspace
    activeSimState.currentStep = "EXECUTOR_STAGE_START";
    activeSimState.activeAgent = "EXECUTOR";
    activeSimState.thoughtChain.push("[Executor Agent] Reading Tasks directory. Processing refined tasks/spec.md specification...");
    await delay(2000);

    activeSimState.thoughtChain.push("[Executor Agent] Writing robust functional deliverables...");
    await delay(2000);

    // Executor writes actual file inside tasks/ or review/ depending on the model output.
    // In our Virtual State Machine, Executor outputs to "review/" folder!
    let targetFileName = "";
    let targetFileContent = "";

    if (workflow === "PROJECT_CODING") {
      targetFileName = "balance_query.py";
      if (aiClient) {
        try {
          let modelName = "gemini-3.5-flash";
          let executorInstruction = "You are the Micro Executor Agent.";
          let executorTemp = 0.5;

          const conf = loadAndNormalizeConfig();
          if (conf && conf.agents && conf.agents.executor) {
            modelName = conf.agents.executor.model || modelName;
            executorInstruction = conf.agents.executor.systemInstruction || executorInstruction;
            executorTemp = conf.agents.executor.temperature !== undefined ? conf.agents.executor.temperature : executorTemp;
          }

          const executorPrompt = `${executorInstruction}\n\nWrite complete, functional python code based on this specification: \n${refinedSpec}\nYour output should contain ONLY the code blocks, fully comments, proper error handling and SQLite query for usr-9901. Do not use truncated code.`;
          const execRes = await aiClient.models.generateContent({
            model: modelName,
            contents: executorPrompt,
            config: {
              temperature: executorTemp,
            }
          });
          targetFileContent = execRes.text || "";
        } catch (err) {
          console.error("Executor generation failed, using standard code template:", err);
        }
      }

      if (!targetFileContent) {
        targetFileContent = `import sqlite3
import re

def query_user_balance(user_id: str):
    """
    Queries user balance from SQLite sandbox database.
    Strictly follows constraint validation.
    """
    # Guard against Injection
    if not re.match(r"^[a-zA-Z0-9-]{3,12}$", user_id):
        raise ValueError("Malicious Input Detected! Rejected.")

    conn = sqlite3.connect("./balance.db")
    cursor = conn.cursor()
    
    # Pre-coding test case verification database init
    cursor.execute("CREATE TABLE IF NOT EXISTS balances (usr_id TEXT PRIMARY KEY, amt REAL)")
    cursor.execute("INSERT OR IGNORE INTO balances (usr_id, amt) VALUES ('usr-9901', 42000.50)")
    conn.commit()

    try:
        cursor.execute("SELECT amt FROM balances WHERE usr_id = ?", (user_id,))
        result = cursor.fetchone()
        if result:
            return result[0]
        return 0.0
    finally:
        conn.close()

if __name__ == "__main__":
    balance = query_user_balance("usr-9901")
    print(f"Customer balance for usr-9901: \${balance:,.2f}")
`;
      }
    } else if (workflow === "MD_KNOWLEDGE") {
      targetFileName = "architecture.md";
      targetFileContent = `# Deep Dive: High-End Minimalist Multi-Agent System
This document serves as the validated knowledge base describing the virtual state machine topology.

## 1. Structural Boundaries
By utilizing standard OS directory structures, we avoid heavy abstract libraries. 
- **tasks/**: Pending specifications and raw requirement nodes.
- **review/**: Code generation and layout assets pending active auditing.
- **done/**: Validated, immutable artifacts.

## 2. Metric Control Table
- **Plan Quality**: Assesses accuracy of goals before action.
- **Plan Adherence**: Trace-based execution validation.
- **Argument Correctness**: Strict schema validations with \`strict=True\`.
`;
    } else {
      targetFileName = "slide_storyboard.xml";
      targetFileContent = `<?xml version="1.0" encoding="UTF-8"?>
<presentation theme="slate-dark" ratio="4:3">
  <slide id="1">
    <bbox x="0.1" y="0.1" w="0.8" h="0.4" />
    <title>High-End Minimalist Multi-Agent Systems</title>
    <content>
      - Transitioning from simple prompts to autonomous loops.
      - Suppressing immediate action via plans.
      - State machines governed by directory paths.
    </content>
  </slide>
  <slide id="2">
    <bbox x="0.1" y="0.1" w="0.8" h="0.4" />
    <title>Sprints and Contracts</title>
    <content>
      - Dynamic specification agreements.
      - Hard ambiguity evaluations (threshold 0.3).
      - Binary judgment outcomes.
    </content>
  </slide>
</presentation>
`;
    }

    const reviewPath = path.join(SIM_DIR, "review", targetFileName);
    fs.writeFileSync(reviewPath, targetFileContent);

    // Let's also move spec.md from tasks/ to review/ as part of the state advancement
    fs.renameSync(specPath, path.join(SIM_DIR, "review", "spec.md"));

    addAuditLog(
      "Executor",
      "STATE_TRANSITION",
      `Completed development file and advanced spec from tasks/ to review/. Ready for rigorous audit.`,
      targetFileName,
      { from: "tasks", to: "review" },
      "EU AI Act Art. 61 (Post-market monitoring plan implementation)"
    );
    activeSimState.thoughtChain.push(`[Executor Agent] Successfully generated delivery file: review/${targetFileName}. Advanced task state from [tasks/] to [review/].`);
    await delay(2000);

    // STEP 4: RIGID CRITIC STAGE - Adversarial Inspection and Self-Healing
    activeSimState.currentStep = "CRITIC_STAGE_START";
    activeSimState.activeAgent = "CRITIC";
    activeSimState.thoughtChain.push("[Critic Agent] Loading review deliverables. Simulating dry run execution and verifying constraint checkboxes...");
    await delay(2000);

    // Critic does rigorous evaluation
    activeSimState.thoughtChain.push("[Critic Agent] Running thought chain thinking blocks (<thought>)... Analyzing position bias, verbosity bias, and strict schema bindings...");
    await delay(2500);

    // Let's simulate a FAIL / self-healing scenario on the first run for Project Coding!
    // This perfectly demonstrates "정반합 (Thesis-Antithesis-Synthesis)" feedback of the guide!
    if (workflow === "PROJECT_CODING" && activeSimState.iteration === 1) {
      activeSimState.thoughtChain.push("[Critic Agent] <thought>Analyzing balance_query.py. The SQLite connector does not handle exception state if sqlite3 db gets locked. Also, the user requirement specifies 'reporting findings in standard markdown table layout', but balance_query.py simply prints a raw string! This violates the target spec constraint 100% completion rule.</thought>");
      activeSimState.thoughtChain.push("[Critic Agent] CRITIC AUDIT FAILED! Missing markdown table reports and db lock safety. Marking FAIL and reverting state back to [tasks/].");
      
      // Inject adversarial feedback into tasks/spec.md and revert files
      const feedbackSpec = refinedSpec + `\n\n## Adversarial Critic Feedback (FAIL - Rev 1)\n- **Reason**: Generated code prints raw terminal string instead of the requested 'standard markdown table layout'.\n- **Fix**: Code must format the output value inside a neat markdown table format:\n| Customer ID | Balance |\n|---|---|\n| usr-9901 | $X.XX |\nAnd implement SQLite connector exceptions safety.`;
      
      fs.writeFileSync(path.join(SIM_DIR, "tasks", "spec.md"), feedbackSpec);
      
      // Delete from review
      if (fs.existsSync(reviewPath)) fs.unlinkSync(reviewPath);
      if (fs.existsSync(path.join(SIM_DIR, "review", "spec.md"))) fs.unlinkSync(path.join(SIM_DIR, "review", "spec.md"));

      activeSimState.iteration = 2;
      activeSimState.metrics.planAdherence = 0.5;
      activeSimState.metrics.argumentCorrectness = 0.6;
      activeSimState.metrics.reasoningCoherence = 0.7;

      addAuditLog(
        "Critic",
        "AUDIT_FAIL",
        `Adversarial audit failed. Target file balance_query.py missed markdown table format requirements. Forcing Reversion.`,
        "balance_query.py",
        { from: "review", to: "tasks" },
        "California AI Transparency Act Section 3 (System traceability & verification)"
      );

      await delay(2500);

      // Re-trigger Executor with Self-Healing feedback
      activeSimState.currentStep = "EXECUTOR_STAGE_HEALING";
      activeSimState.activeAgent = "EXECUTOR";
      activeSimState.thoughtChain.push("[Executor Agent] Received Critic feedback. Initiating self-healing protocol... Modifying balance_query.py to write markdown table reports...");
      await delay(2500);

      const healedCode = `import sqlite3
import re

def query_user_balance_markdown(user_id: str):
    """
    Queries user balance from SQLite sandbox database.
    Outputs results in robust markdown table.
    """
    if not re.match(r"^[a-zA-Z0-9-]{3,12}$", user_id):
        raise ValueError("Malicious Input Detected! Rejected.")

    try:
        conn = sqlite3.connect("./balance.db", timeout=10)
        cursor = conn.cursor()
        
        # Init SQLite table structure
        cursor.execute("CREATE TABLE IF NOT EXISTS balances (usr_id TEXT PRIMARY KEY, amt REAL)")
        cursor.execute("INSERT OR IGNORE INTO balances (usr_id, amt) VALUES ('usr-9901', 42000.50)")
        conn.commit()
        
        cursor.execute("SELECT amt FROM balances WHERE usr_id = ?", (user_id,))
        result = cursor.fetchone()
        
        # Output as neat markdown table
        print("| Customer ID | Balance |")
        print("|---|---|")
        if result:
            print(f"| {user_id} | \${result[0]:,.2f} |")
        else:
            print(f"| {user_id} | \$0.00 |")
            
    except sqlite3.Error as e:
        print(f"Error querying SQLite: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    query_user_balance_markdown("usr-9901")
`;
      fs.writeFileSync(path.join(SIM_DIR, "review", "balance_query.py"), healedCode);
      fs.writeFileSync(path.join(SIM_DIR, "review", "spec.md"), feedbackSpec);
      if (fs.existsSync(path.join(SIM_DIR, "tasks", "spec.md"))) fs.unlinkSync(path.join(SIM_DIR, "tasks", "spec.md"));

      addAuditLog(
        "Executor",
        "STATE_TRANSITION",
        `Completed self-healing. Corrected balance_query.py to generate Markdown tables. Moved back to review/.`,
        "balance_query.py",
        { from: "tasks", to: "review" }
      );
      activeSimState.thoughtChain.push("[Executor Agent] Completed modifications. Advanced to [review/] with healed deliverables.");
      await delay(2000);
    }

    // FINAL CRITIC VERIFICATION
    activeSimState.currentStep = "FINAL_CRITIC_VERIFICATION";
    activeSimState.activeAgent = "CRITIC";
    activeSimState.thoughtChain.push("[Critic Agent] Finalizing code analysis... Exception logic validated. Output conforms 100% to Markdown table layout contract. Performance specs verified.");
    await delay(2000);

    // Critic approves
    activeSimState.metrics.planQuality = 0.98;
    activeSimState.metrics.planAdherence = 0.97;
    activeSimState.metrics.argumentCorrectness = 1.0;
    activeSimState.metrics.reasoningCoherence = 0.96;

    activeSimState.thoughtChain.push("[Critic Agent] CRITIC AUDIT PASSED (Binary Status: PASS). Deliverables locked in immutable permanent state done/ folder.");
    
    // Move all files to done/
    const reviewFiles = fs.readdirSync(path.join(SIM_DIR, "review"));
    reviewFiles.forEach((file) => {
      fs.renameSync(path.join(SIM_DIR, "review", file), path.join(SIM_DIR, "done", file));
    });

    addAuditLog(
      "Critic",
      "AUDIT_PASS",
      `Final validation complete. Clean pass. All deliverables relocated to done/. Workspace Locked.`,
      targetFileName,
      { from: "review", to: "done" },
      "EU AI Act Art. 14 compliance (Human oversight & logging verifiability)"
    );

    activeSimState.currentStep = "Orchestration Complete";
    activeSimState.activeAgent = null;
    activeSimState.isOrchestrating = false;

  } catch (error: any) {
    activeSimState.isOrchestrating = false;
    activeSimState.currentStep = "Failed";
    activeSimState.thoughtChain.push(`[Harness Error] Fatal exception during orchestration: ${error.message}`);
    console.error(error);
  }
});

// Helper delay
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Serve Frontend Vite / Static Assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
