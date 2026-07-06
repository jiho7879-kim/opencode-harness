/**
 * Opencode Agent Harness Types
 */

export enum WorkflowType {
  PROJECT_CODING = "PROJECT_CODING",
  MD_KNOWLEDGE = "MD_KNOWLEDGE",
  PPT_PREP = "PPT_PREP"
}

export enum AgentRole {
  PLANNER = "PLANNER",
  EXECUTOR = "EXECUTOR",
  CRITIC = "CRITIC"
}

export enum TaskState {
  TASKS = "tasks",
  REVIEW = "review",
  DONE = "done"
}

export interface MetricSet {
  planQuality: number;
  planAdherence: number;
  argumentCorrectness: number;
  reasoningCoherence: number;
  ambiguityScore: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  details: string;
  fileAffected?: string;
  stateTransition?: { from: string; to: string };
  regulationChecked: string; // "EU AI Act Art. 13 Compliance", etc.
  hash: string; // For integrity
}

export interface AgentConfig {
  model: string;
  temperature?: number;
  systemInstruction?: string;
}

export interface HarnessConfig {
  workflowType: WorkflowType;
  ambiguityThreshold: number;
  maxIterations: number;
  jurySize: number;
  strictMode: boolean;
  agents?: {
    planner?: AgentConfig;
    executor?: AgentConfig;
    critic?: AgentConfig;
  };
}

export interface HarnessState {
  currentWorkflow: WorkflowType;
  rawRequirement: string;
  isOrchestrating: boolean;
  currentStep: string;
  iteration: number;
  maxIterations: number;
  ambiguityThreshold: number;
  metrics: MetricSet;
  files: {
    tasks: string[];
    review: string[];
    done: string[];
  };
  logs: AuditLogEntry[];
  thoughtChain: string[];
  activeAgent: AgentRole | null;
  selectedFileContent: {
    path: string;
    content: string;
  } | null;
  config?: HarnessConfig;
  requiresClarification?: boolean;
  clarificationQuestion?: string;
  clarificationResponse?: string;
}
