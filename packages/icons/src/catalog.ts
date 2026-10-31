// packages/icons — the system-design component catalog.
// Each entry is a typed, draggable component definition. Categories carry
// default simulation stats so Phase 4/5 have something to run with; an
// individual component can override them later if it needs to.

export type CategoryId =
  | "client-edge"
  | "networking"
  | "compute"
  | "sql"
  | "nosql"
  | "caching"
  | "messaging"
  | "storage"
  | "observability"
  | "security"
  | "aws"
  | "gcp"
  | "azure";

export type Provider = "aws" | "gcp" | "azure";

export interface ComponentStats {
  maxRps: number;
  avgLatencyMs: number;
  failureModes: readonly string[];
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  defaultStats: ComponentStats;
}

export interface ComponentDef {
  id: string;
  categoryId: CategoryId;
  label: string;
  glyph: string;
  color: string;
  provider?: Provider;
  stats?: ComponentStats;
}

export const CATEGORIES: readonly CategoryDef[] = [
  {
    id: "client-edge",
    label: "Client & Edge",
    defaultStats: { maxRps: 5000, avgLatencyMs: 50, failureModes: ["disconnect"] },
  },
  {
    id: "networking",
    label: "Networking",
    defaultStats: {
      maxRps: 50000,
      avgLatencyMs: 2,
      failureModes: ["overload", "misrouted-traffic"],
    },
  },
  {
    id: "compute",
    label: "Compute",
    defaultStats: {
      maxRps: 2000,
      avgLatencyMs: 15,
      failureModes: ["crash", "oom", "cpu-saturation"],
    },
  },
  {
    id: "sql",
    label: "SQL Databases",
    defaultStats: {
      maxRps: 5000,
      avgLatencyMs: 8,
      failureModes: ["connection-pool-exhaustion", "disk-full", "replication-lag"],
    },
  },
  {
    id: "nosql",
    label: "NoSQL Databases",
    defaultStats: {
      maxRps: 20000,
      avgLatencyMs: 4,
      failureModes: ["partition-unavailable", "hot-partition"],
    },
  },
  {
    id: "caching",
    label: "Caching",
    defaultStats: {
      maxRps: 100000,
      avgLatencyMs: 0.5,
      failureModes: ["cold-cache", "eviction-storm"],
    },
  },
  {
    id: "messaging",
    label: "Messaging & Streaming",
    defaultStats: {
      maxRps: 20000,
      avgLatencyMs: 5,
      failureModes: ["backlog-growth", "consumer-lag"],
    },
  },
  {
    id: "storage",
    label: "Storage",
    defaultStats: {
      maxRps: 10000,
      avgLatencyMs: 20,
      failureModes: ["throttling", "eventual-consistency-lag"],
    },
  },
  {
    id: "observability",
    label: "Observability",
    defaultStats: { maxRps: 50000, avgLatencyMs: 10, failureModes: ["ingestion-lag"] },
  },
  {
    id: "security",
    label: "Security & Identity",
    defaultStats: {
      maxRps: 20000,
      avgLatencyMs: 3,
      failureModes: ["misconfiguration", "cert-expiry"],
    },
  },
  {
    id: "aws",
    label: "AWS",
    defaultStats: {
      maxRps: 10000,
      avgLatencyMs: 10,
      failureModes: ["throttling", "quota-exceeded"],
    },
  },
  {
    id: "gcp",
    label: "Google Cloud",
    defaultStats: {
      maxRps: 10000,
      avgLatencyMs: 10,
      failureModes: ["throttling", "quota-exceeded"],
    },
  },
  {
    id: "azure",
    label: "Azure",
    defaultStats: {
      maxRps: 10000,
      avgLatencyMs: 10,
      failureModes: ["throttling", "quota-exceeded"],
    },
  },
];

const C_CLIENT = "#1B1B1F";
const C_CDN = "#EC4899";
const C_LB = "#4D7CFE";
const C_SERVER = "#6B7280";
const C_SQL = "#16A34A";
const C_NOSQL = "#15B8A6";
const C_CACHE = "#F59E0B";
const C_QUEUE = "#8B5CF6";
const C_STORAGE = "#64748B";
const C_OBSERVABILITY = "#0D9488";
const C_SECURITY = "#DC2626";
const C_AWS = "#FF9900";
const C_GCP = "#4285F4";
const C_AZURE = "#0078D4";

export const COMPONENTS: readonly ComponentDef[] = [
  // Client & Edge
  { id: "client", categoryId: "client-edge", label: "Client", glyph: "\u{1F464}", color: C_CLIENT },
  { id: "mobile-app", categoryId: "client-edge", label: "Mobile App", glyph: "\u{1F4F1}", color: C_CLIENT },
  { id: "cdn-edge", categoryId: "client-edge", label: "CDN Edge", glyph: "CDN", color: C_CDN },
  { id: "dns", categoryId: "client-edge", label: "DNS", glyph: "DNS", color: C_CLIENT },
  { id: "firewall", categoryId: "client-edge", label: "Firewall", glyph: "\u{1F6E1}", color: C_SECURITY },
  { id: "waf", categoryId: "client-edge", label: "WAF", glyph: "WAF", color: C_SECURITY },

  // Networking
  { id: "load-balancer", categoryId: "networking", label: "Load Balancer", glyph: "LB", color: C_LB },
  { id: "api-gateway", categoryId: "networking", label: "API Gateway", glyph: "GW", color: C_LB },
  { id: "reverse-proxy", categoryId: "networking", label: "Reverse Proxy", glyph: "⇄", color: C_LB },
  { id: "service-mesh", categoryId: "networking", label: "Service Mesh", glyph: "⚙", color: C_LB },

  // Compute
  { id: "server-vm", categoryId: "compute", label: "Server / VM", glyph: "▦", color: C_SERVER },
  { id: "container", categoryId: "compute", label: "Container", glyph: "⊞", color: C_SERVER },
  { id: "serverless-fn", categoryId: "compute", label: "Serverless Fn", glyph: "λ", color: C_SERVER },
  { id: "k8s-pod", categoryId: "compute", label: "K8s Pod", glyph: "⎈", color: C_SERVER },
  { id: "worker", categoryId: "compute", label: "Worker", glyph: "⚙", color: C_SERVER },

  // SQL Databases
  { id: "postgresql", categoryId: "sql", label: "PostgreSQL", glyph: "Pg", color: C_SQL },
  { id: "mysql", categoryId: "sql", label: "MySQL", glyph: "My", color: C_SQL },
  { id: "primary-db", categoryId: "sql", label: "Primary DB", glyph: "SQL", color: C_SQL },
  { id: "read-replica", categoryId: "sql", label: "Read Replica", glyph: "RR", color: C_SQL },

  // NoSQL Databases
  { id: "mongodb", categoryId: "nosql", label: "MongoDB", glyph: "Mo", color: C_NOSQL },
  { id: "dynamodb-style", categoryId: "nosql", label: "DynamoDB-style", glyph: "Dy", color: C_NOSQL },
  { id: "cassandra-style", categoryId: "nosql", label: "Cassandra-style", glyph: "Ca", color: C_NOSQL },
  { id: "key-value-store", categoryId: "nosql", label: "Key-Value Store", glyph: "KV", color: C_NOSQL },

  // Caching
  { id: "redis-cache", categoryId: "caching", label: "Redis Cache", glyph: "⚡", color: C_CACHE },
  { id: "memcached", categoryId: "caching", label: "Memcached", glyph: "Mc", color: C_CACHE },
  { id: "cdn-cache", categoryId: "caching", label: "CDN Cache", glyph: "CD", color: C_CACHE },

  // Messaging & Streaming
  { id: "queue-sqs-style", categoryId: "messaging", label: "Queue (SQS-style)", glyph: "☰", color: C_QUEUE },
  { id: "topic-kafka-style", categoryId: "messaging", label: "Topic (Kafka-style)", glyph: "\u{1F4E8}", color: C_QUEUE },
  { id: "event-bus", categoryId: "messaging", label: "Event Bus", glyph: "⚡", color: C_QUEUE },
  { id: "webhook", categoryId: "messaging", label: "Webhook", glyph: "\u{1F517}", color: C_QUEUE },

  // Storage
  { id: "object-storage", categoryId: "storage", label: "Object Storage", glyph: "S3", color: C_STORAGE },
  { id: "block-storage", categoryId: "storage", label: "Block Storage", glyph: "Bk", color: C_STORAGE },
  { id: "file-storage", categoryId: "storage", label: "File Storage", glyph: "Fs", color: C_STORAGE },

  // Observability
  { id: "monitoring", categoryId: "observability", label: "Monitoring", glyph: "\u{1F4C8}", color: C_OBSERVABILITY },
  { id: "logging", categoryId: "observability", label: "Logging", glyph: "\u{1F4DC}", color: C_OBSERVABILITY },
  { id: "alerting", categoryId: "observability", label: "Alerting", glyph: "\u{1F514}", color: C_OBSERVABILITY },
  { id: "tracing", categoryId: "observability", label: "Tracing", glyph: "↦", color: C_OBSERVABILITY },

  // Security & Identity
  { id: "auth-service", categoryId: "security", label: "Auth Service", glyph: "\u{1F512}", color: C_SECURITY },
  { id: "secrets-manager", categoryId: "security", label: "Secrets Mgr", glyph: "\u{1F511}", color: C_SECURITY },
  { id: "identity-provider", categoryId: "security", label: "Identity Provider", glyph: "ID", color: C_SECURITY },

  // AWS
  { id: "aws-ec2", categoryId: "aws", label: "EC2", glyph: "EC2", color: C_AWS, provider: "aws" },
  { id: "aws-lambda", categoryId: "aws", label: "Lambda", glyph: "λ", color: C_AWS, provider: "aws" },
  { id: "aws-s3", categoryId: "aws", label: "S3", glyph: "S3", color: C_AWS, provider: "aws" },
  { id: "aws-rds", categoryId: "aws", label: "RDS", glyph: "RDS", color: C_AWS, provider: "aws" },
  { id: "aws-dynamodb", categoryId: "aws", label: "DynamoDB", glyph: "Dy", color: C_AWS, provider: "aws" },
  { id: "aws-cloudfront", categoryId: "aws", label: "CloudFront", glyph: "CF", color: C_AWS, provider: "aws" },
  { id: "aws-sqs", categoryId: "aws", label: "SQS", glyph: "SQS", color: C_AWS, provider: "aws" },
  { id: "aws-sns", categoryId: "aws", label: "SNS", glyph: "SNS", color: C_AWS, provider: "aws" },
  { id: "aws-elb", categoryId: "aws", label: "Elastic LB", glyph: "ELB", color: C_AWS, provider: "aws" },
  { id: "aws-api-gateway", categoryId: "aws", label: "API Gateway", glyph: "GW", color: C_AWS, provider: "aws" },
  { id: "aws-ecs-fargate", categoryId: "aws", label: "ECS / Fargate", glyph: "EC", color: C_AWS, provider: "aws" },
  { id: "aws-route53", categoryId: "aws", label: "Route 53", glyph: "R53", color: C_AWS, provider: "aws" },

  // Google Cloud
  { id: "gcp-compute-engine", categoryId: "gcp", label: "Compute Engine", glyph: "CE", color: C_GCP, provider: "gcp" },
  { id: "gcp-cloud-functions", categoryId: "gcp", label: "Cloud Functions", glyph: "λ", color: C_GCP, provider: "gcp" },
  { id: "gcp-cloud-storage", categoryId: "gcp", label: "Cloud Storage", glyph: "CS", color: C_GCP, provider: "gcp" },
  { id: "gcp-cloud-sql", categoryId: "gcp", label: "Cloud SQL", glyph: "SQL", color: C_GCP, provider: "gcp" },
  { id: "gcp-bigquery", categoryId: "gcp", label: "BigQuery", glyph: "BQ", color: C_GCP, provider: "gcp" },
  { id: "gcp-pubsub", categoryId: "gcp", label: "Pub/Sub", glyph: "PS", color: C_GCP, provider: "gcp" },
  { id: "gcp-cloud-cdn", categoryId: "gcp", label: "Cloud CDN", glyph: "CD", color: C_GCP, provider: "gcp" },
  { id: "gcp-gke", categoryId: "gcp", label: "GKE", glyph: "GKE", color: C_GCP, provider: "gcp" },

  // Azure
  { id: "azure-vms", categoryId: "azure", label: "Virtual Machines", glyph: "VM", color: C_AZURE, provider: "azure" },
  { id: "azure-functions", categoryId: "azure", label: "Functions", glyph: "λ", color: C_AZURE, provider: "azure" },
  { id: "azure-blob-storage", categoryId: "azure", label: "Blob Storage", glyph: "Bl", color: C_AZURE, provider: "azure" },
  { id: "azure-cosmos-db", categoryId: "azure", label: "Cosmos DB", glyph: "Co", color: C_AZURE, provider: "azure" },
  { id: "azure-sql", categoryId: "azure", label: "Azure SQL", glyph: "SQL", color: C_AZURE, provider: "azure" },
  { id: "azure-service-bus", categoryId: "azure", label: "Service Bus", glyph: "SB", color: C_AZURE, provider: "azure" },
  { id: "azure-front-door", categoryId: "azure", label: "Front Door", glyph: "FD", color: C_AZURE, provider: "azure" },
  { id: "azure-aks", categoryId: "azure", label: "AKS", glyph: "AKS", color: C_AZURE, provider: "azure" },
];

const CATEGORY_BY_ID: ReadonlyMap<CategoryId, CategoryDef> = new Map(
  CATEGORIES.map((category: CategoryDef): [CategoryId, CategoryDef] => [category.id, category]),
);

const COMPONENT_BY_ID: ReadonlyMap<string, ComponentDef> = new Map(
  COMPONENTS.map((component: ComponentDef): [string, ComponentDef] => [component.id, component]),
);

export function getComponentById(id: string): ComponentDef | undefined {
  return COMPONENT_BY_ID.get(id);
}

export function getCategoryById(id: CategoryId): CategoryDef | undefined {
  return CATEGORY_BY_ID.get(id);
}

export function getComponentStats(component: ComponentDef): ComponentStats {
  if (component.stats) {
    return component.stats;
  }
  const category: CategoryDef | undefined = getCategoryById(component.categoryId);
  if (!category) {
    throw new Error(`Unknown category "${component.categoryId}" for component "${component.id}"`);
  }
  return category.defaultStats;
}

export function componentsByCategory(categoryId: CategoryId): ComponentDef[] {
  return COMPONENTS.filter((component: ComponentDef): boolean => component.categoryId === categoryId);
}
