import dagre from 'dagre';
import { RepositoryEvidence } from './evidence/EvidenceCollector';
import { TechnologyDetection } from './detectors/types';

// Dagre Layout Helper - Vertical Flow Layout (Top -> Bottom)
// Scaled Node Sizing up by 25% (Width: 312, Height: 140, spacing scaled)
const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, nodesep: 120, ranksep: 160 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 312, height: 140 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - 156,
      y: nodeWithPosition.y - 70,
    };
  });

  return { nodes, edges };
};

const getLayerName = (type: string): string => {
  if (['client', 'pages', 'components', 'hooks', 'context'].includes(type)) {
    return 'Presentation Layer';
  }
  if (['router', 'gateway', 'middleware', 'controller', 'service'].includes(type)) {
    return 'Application Layer';
  }
  if (['repository', 'database', 'cache', 'queue'].includes(type)) {
    return 'Data Layer';
  }
  return 'Infrastructure Layer';
};

export interface ArchitectureGraph {
  pattern: string;
  type: string;
  nodes: any[];
  edges: any[];
  summary: {
    pattern: string;
    componentsCount: number;
    framework: string;
    database: string;
    authentication: string;
    deployment: string;
    complexity: string;
    aiSummary: string;
  };
}

export function buildArchitecture(
  technologies: TechnologyDetection[],
  evidence: RepositoryEvidence,
  scan: any
): ArchitectureGraph {
  if (scan && scan.architecture && scan.architecture.nodes && scan.architecture.nodes.length > 0) {
    return scan.architecture;
  }
  const techMap = new Map<string, TechnologyDetection>();
  technologies.forEach(t => techMap.set(t.name, t));

  const filesList = Array.from(evidence.files);

  // Folder helper
  const hasFolder = (name: string) => {
    const lower = name.toLowerCase();
    return Array.from(evidence.folders).some(f => f.toLowerCase() === lower);
  };

  // File pattern helper
  const hasFilePattern = (pattern: string) => {
    const lower = pattern.toLowerCase();
    return filesList.some(f => f.toLowerCase().includes(lower));
  };

  // Check structural layer folders & entry files
  const routesFolder = hasFolder('routes') || hasFolder('router') || hasFolder('routing') || hasFilePattern('routes.ts') || hasFilePattern('routes.js') || hasFilePattern('router.ts') || hasFilePattern('router.js');
  const controllersFolder = hasFolder('controllers') || hasFolder('controller') || filesList.some(f => f.toLowerCase().endsWith('.controller.ts') || f.toLowerCase().endsWith('controller.java'));
  const servicesFolder = hasFolder('services') || hasFolder('service') || filesList.some(f => f.toLowerCase().endsWith('.service.ts') || f.toLowerCase().endsWith('service.java'));
  const middlewareFolder = hasFolder('middleware') || hasFolder('middlewares') || hasFolder('guards');
  const repositoriesFolder = hasFolder('repositories') || hasFolder('repository') || filesList.some(f => f.toLowerCase().endsWith('.repository.ts') || f.toLowerCase().endsWith('repository.java'));
  const databaseFolder = hasFolder('database') || hasFolder('db') || hasFolder('models') || hasFolder('entities') || hasFilePattern('schema.prisma');
  const apiFolder = hasFolder('api') || hasFilePattern('api.ts') || hasFilePattern('api.js');
  const pagesFolder = hasFolder('pages') || hasFolder('views') || hasFolder('app');
  const componentsFolder = hasFolder('components') || hasFolder('ui') || hasFolder('shared');
  const hooksFolder = hasFolder('hooks') || filesList.some(f => f.toLowerCase().includes('/hooks/') || f.toLowerCase().includes('/use'));
  
  const hasEntryFiles = evidence.entryFiles.size > 0;

  const tempNodes: any[] = [];
  const tempEdges: any[] = [];

  const addNode = (id: string, label: string, type: string, data: any) => {
    tempNodes.push({
      id,
      label,
      type,
      data: {
        ...data,
        health: data.health || 'healthy',
        confidence: data.confidence || '100%',
      }
    });
  };

  const linkNodes = (source: string, target: string, label = 'Next') => {
    tempEdges.push({
      id: `edge-${source}-${target}`,
      source,
      target,
      label,
      animated: true,
    });
  };

  const linkLogicalSequence = (seq: string[]) => {
    const active = seq.filter(id => tempNodes.some(n => n.id === id));
    for (let i = 0; i < active.length - 1; i++) {
      linkNodes(active[i], active[i+1], 'Execution flow');
    }
  };

  // Node details compiler based on technologies (enriches nodes, never detects)
  const buildNodeDetails = (
    defaultTech: string,
    defaultReason: string,
    defaultFiles: string[],
    techNames: string[],
    desc: string,
    aiRec: string,
    depName: string
  ) => {
    let finalTechName = defaultTech;
    let finalConfidence = 100;
    let finalEvidence = [...defaultFiles];
    let finalReason = defaultReason;

    const matched = techNames.find(tName => techMap.has(tName));
    if (matched) {
      const tDet = techMap.get(matched)!;
      finalTechName = tDet.name;
      finalConfidence = tDet.confidence;
      finalEvidence = tDet.evidence;
      finalReason = `${matched} technology matches and verified dependencies are present.`;
    }

    return {
      technology: finalTechName,
      confidence: `${finalConfidence}%`,
      evidence: finalEvidence,
      detectionReason: finalReason,
      filesResponsible: finalEvidence.join(', '),
      description: desc,
      aiRecommendation: aiRec,
      dependencies: depName,
    };
  };

  // 1. Browser Client Layer
  const isFrontend = techMap.has('React') || techMap.has('Next.js') || techMap.has('Vue') || techMap.has('Angular') || filesList.some(f => f.endsWith('.html'));
  if (isFrontend || pagesFolder || componentsFolder) {
    let defaultTech = 'Web Browser Environment';
    if (techMap.has('Next.js')) defaultTech = 'Next.js Frontend';
    else if (techMap.has('React')) defaultTech = 'React SPA';
    else if (techMap.has('Vue')) defaultTech = 'Vue SPA';
    else if (techMap.has('Angular')) defaultTech = 'Angular SPA';

    const details = buildNodeDetails(
      defaultTech,
      'Frontend framework or HTML layouts registered.',
      filesList.filter(f => f.endsWith('.html') || f.includes('package.json')).slice(0, 3),
      ['Next.js', 'React', 'Vue', 'Angular'],
      'V8 web browser client hosting DOM viewport rendering.',
      'Activate route bundle splitting to reduce page payload sizes.',
      'browser-runtime'
    );
    addNode('node-browser', 'Browser Client', 'client', details);
  }

  // 2. Application Core Entry
  if (hasEntryFiles) {
    let defaultTech = 'Node.js runtime';
    if (techMap.has('NestJS')) defaultTech = 'NestJS';
    else if (techMap.has('Next.js')) defaultTech = 'Next.js';
    else if (techMap.has('Spring Boot')) defaultTech = 'Spring Boot';
    else if (techMap.has('Express')) defaultTech = 'Express';

    const details = buildNodeDetails(
      defaultTech,
      'Discovered core entry files in root workspace.',
      Array.from(evidence.entryFiles).slice(0, 3),
      ['NestJS', 'Next.js', 'Spring Boot', 'Express'],
      'Bootstraps application runtime and entry modules.',
      'Secure configuration values using environment secrets.',
      defaultTech.toLowerCase()
    );
    addNode('node-app', 'Application Core Entry', 'router', details);
  }

  // 3. Routing Layer
  if (routesFolder) {
    let defaultTech = 'Application Routing';
    if (techMap.has('Express')) defaultTech = 'Express Router';
    else if (techMap.has('Next.js')) defaultTech = 'Next.js Router';
    else if (techMap.has('Spring Boot')) defaultTech = 'Spring MVC Dispatcher';

    const routeFiles = filesList.filter(f => f.includes('route') || f.includes('router'));

    const details = buildNodeDetails(
      defaultTech,
      'Discovered routes folders or router scripts.',
      routeFiles.length > 0 ? routeFiles.slice(0, 3) : ['package.json'],
      ['Express', 'Next.js', 'Spring Boot'],
      'Directs HTTP path requests to semantic controllers and viewports.',
      'Organize request paths cleanly to avoid endpoint collision.',
      defaultTech.toLowerCase()
    );
    addNode('node-router', 'Routing Layer', 'router', details);
  }

  // 4. Middleware Layer
  if (middlewareFolder || techMap.has('JWT')) {
    const midFiles = filesList.filter(f => f.includes('middleware') || f.includes('guard') || f.includes('auth'));

    const details = buildNodeDetails(
      'HTTP Middleware',
      'Discovered middleware folders or authentication structures.',
      midFiles.length > 0 ? midFiles.slice(0, 3) : ['package.json'],
      ['JWT'],
      'Verifies auth signatures and executes pre-flight filters.',
      'Add request validation middleware to filter incoming payloads.',
      'jsonwebtoken'
    );
    addNode('node-middleware', 'Middleware Layer', 'middleware', details);
  }

  // 5. Page View Layer
  if (pagesFolder) {
    let defaultTech = 'Page Viewports';
    if (techMap.has('Next.js')) defaultTech = 'Next.js Pages';
    else if (techMap.has('React')) defaultTech = 'React Route Pages';

    const pageFiles = filesList.filter(f => f.includes('pages') || f.includes('views') || f.includes('app/page'));

    const details = buildNodeDetails(
      defaultTech,
      'Discovered page/views components folders.',
      pageFiles.slice(0, 3),
      ['Next.js', 'React'],
      'Hosts application responsive viewport pages.',
      'Use lazy-loaded components to improve initial load speed.',
      defaultTech.toLowerCase()
    );
    addNode('node-pages', 'Page View Layer', 'pages', details);
  }

  // 6. Component Presentation Layer
  if (componentsFolder) {
    const compFiles = filesList.filter(f => f.includes('components') || f.includes('ui'));
    addNode('node-components', 'Component Presentation Layer', 'components', {
      technology: 'UI Presentation Components',
      description: 'Atomic presentation layout elements and widgets.',
      detectionReason: 'Discovered components or UI directories.',
      filesResponsible: compFiles.slice(0, 3).join(', '),
      aiRecommendation: 'Enforce visual style standards across all UI components.',
      dependencies: 'components-layer',
      evidence: compFiles.slice(0, 3),
    });
  }

  // 7. State Hooks Layer
  if (hooksFolder) {
    const hookFiles = filesList.filter(f => f.includes('hooks') || f.includes('use'));
    addNode('node-hooks', 'State Hooks Layer', 'hooks', {
      technology: 'Application State Hooks',
      description: 'Manages presentation reactive states and side effects.',
      detectionReason: 'Discovered hooks directory or hooks files.',
      filesResponsible: hookFiles.slice(0, 3).join(', '),
      aiRecommendation: 'Limit side effects inside hooks to prevent re-renders.',
      dependencies: 'hooks-layer',
      evidence: hookFiles.slice(0, 3),
    });
  }

  // 8. Controller Layer
  if (controllersFolder) {
    let defaultTech = 'Request Controllers';
    if (techMap.has('NestJS')) defaultTech = 'NestJS Controller';
    else if (techMap.has('Express')) defaultTech = 'Express Request Handler';
    else if (techMap.has('Spring Boot')) defaultTech = 'Spring REST Controller';

    const ctrlFiles = filesList.filter(f => f.includes('controller') || f.endsWith('.controller.ts'));

    const details = buildNodeDetails(
      defaultTech,
      'Discovered controllers directory or controller scripts.',
      ctrlFiles.slice(0, 3),
      ['NestJS', 'Express', 'Spring Boot'],
      'Unpacks HTTP payload structures and maps them to domain logic services.',
      'Separate query model checking from core services logic.',
      defaultTech.toLowerCase()
    );
    addNode('node-controller', 'Controller Layer', 'controller', details);
  }

  // 9. Business Logic Layer
  if (servicesFolder) {
    let defaultTech = 'Business Domain Services';
    if (techMap.has('NestJS')) defaultTech = 'NestJS Injectable Service';
    else if (techMap.has('Spring Boot')) defaultTech = 'Spring Service Bean';

    const svcFiles = filesList.filter(f => f.includes('service') || f.endsWith('.service.ts'));

    const details = buildNodeDetails(
      defaultTech,
      'Discovered services directory or service scripts.',
      svcFiles.slice(0, 3),
      ['NestJS', 'Spring Boot'],
      'Contains business validation checks and orchestration algorithms.',
      'Optimize transactional boundaries for complex state changes.',
      defaultTech.toLowerCase()
    );
    addNode('node-service', 'Business Logic Layer', 'service', details);
  }

  // 10. Repository Layer
  if (repositoriesFolder) {
    let defaultTech = 'Data Access Mappers';
    if (techMap.has('NestJS')) defaultTech = 'NestJS Repository';
    else if (techMap.has('Spring Boot')) defaultTech = 'Spring JPA Repository';

    const repoFiles = filesList.filter(f => f.includes('repository') || f.endsWith('.repository.ts'));

    const details = buildNodeDetails(
      defaultTech,
      'Discovered repositories directory or repository scripts.',
      repoFiles.slice(0, 3),
      ['NestJS', 'Spring Boot'],
      'Maps data persistence layers to domain business logic structures.',
      'Optimize sql query performance bounds.',
      defaultTech.toLowerCase()
    );
    addNode('node-repository', 'Repository Layer', 'repository', details);
  }

  // 11. Database Layer
  const hasDbTech = techMap.has('PostgreSQL') || techMap.has('MongoDB') || techMap.has('MySQL') || techMap.has('SQLite');
  if (databaseFolder || hasDbTech) {
    let defaultTech = 'Local File Persistence';
    let dbNames = ['PostgreSQL', 'MongoDB', 'MySQL', 'SQLite'];
    let ormNames = ['Prisma', 'Mongoose', 'TypeORM', 'Drizzle', 'Sequelize'];

    // Find first matched DB and ORM
    const matchedDb = dbNames.find(n => techMap.has(n));
    const matchedOrm = ormNames.find(n => techMap.has(n));

    if (matchedDb) {
      defaultTech = matchedDb;
      if (matchedOrm) {
        defaultTech = `${matchedDb} (${matchedOrm})`;
      }
    }

    const dbFiles = filesList.filter(f => f.includes('database') || f.includes('db') || f.includes('model') || f.includes('schema') || f.includes('entities'));

    const details = buildNodeDetails(
      defaultTech,
      'Discovered database configurations or persistence schemas.',
      dbFiles.length > 0 ? dbFiles.slice(0, 3) : ['package.json'],
      matchedDb ? [matchedDb] : [],
      'Persistent relational or non-relational database storage engines.',
      'Establish connection pooling pools and add indices to hot columns.',
      defaultTech.toLowerCase()
    );
    addNode('node-database', 'Database Layer', 'database', details);
  }

  // 12. Cache Layer
  if (techMap.has('Redis')) {
    const cacheFiles = filesList.filter(f => f.includes('redis') || f.includes('cache'));
    const details = buildNodeDetails(
      'Redis Cache',
      'Verified Redis in dependencies registry.',
      cacheFiles.length > 0 ? cacheFiles.slice(0, 3) : ['package.json'],
      ['Redis'],
      'In-memory caching layer optimizing query roundtrips.',
      'Configure cache evictions (TTLs) to prevent outdated page states.',
      'redis'
    );
    addNode('node-cache', 'Cache Layer', 'cache', details);
  }

  // 13. API Client Layer / Outbound requests (Axios checks)
  if (apiFolder || techMap.has('Axios')) {
    let defaultTech = 'HTTP Outbound Clients';
    if (techMap.has('Axios')) defaultTech = 'Axios Client';

    const apiFiles = filesList.filter(f => f.includes('api') || f.includes('axios'));

    const details = buildNodeDetails(
      defaultTech,
      'Discovered API configurations or Axios instances.',
      apiFiles.length > 0 ? apiFiles.slice(0, 3) : ['package.json'],
      ['Axios'],
      'Formats request bodies and routes calls to remote services.',
      'Set standard connection timeouts to handle slow remote endpoints.',
      defaultTech.toLowerCase()
    );
    addNode('node-api', 'API Client Layer', 'client', details);
  }

  // 14. Message Broker Layer
  const hasQueueTech = techMap.has('RabbitMQ') || techMap.has('Kafka') || techMap.has('BullMQ');
  if (hasQueueTech) {
    let defaultTech = 'Message Queue Broker';
    const queueMatched = ['RabbitMQ', 'Kafka', 'BullMQ'].find(n => techMap.has(n));

    const details = buildNodeDetails(
      queueMatched ? `${queueMatched} Broker` : defaultTech,
      'Verified messaging packages in dependencies list.',
      ['package.json'],
      queueMatched ? [queueMatched] : [],
      'Asynchronous workers task queues distribution.',
      'Implement strict transaction acknowledgement rules.',
      'queues'
    );
    addNode('node-queue', 'Message Broker Layer', 'queue', details);
  }

  // 15. Continuous Integration Workflow
  if (techMap.has('GitHub Actions')) {
    const cicdFiles = filesList.filter(f => f.includes('.github/workflows'));
    const details = buildNodeDetails(
      'GitHub Actions',
      'Verified GitHub workflows files in directory structure.',
      cicdFiles.slice(0, 3),
      ['GitHub Actions'],
      'Builds, runs tests, and automates deployments.',
      'Secure API tokens in repository secrets vault.',
      'github-actions'
    );
    addNode('node-cicd', 'Continuous Integration Workflow', 'gateway', details);
  }

  // 16. Virtual Container Runtime
  if (techMap.has('Docker')) {
    const dockerFiles = filesList.filter(f => f.includes('Dockerfile') || f.includes('docker-compose'));
    const details = buildNodeDetails(
      'Docker Container',
      'Verified Docker configs in repository structure.',
      dockerFiles.slice(0, 3),
      ['Docker'],
      'Wraps and runs server processes inside isolated workspaces.',
      'Use multi-stage Docker builds to reduce image weight.',
      'docker'
    );
    addNode('node-docker', 'Virtual Container Runtime', 'cdn', details);
  }

  // 17. Container Orchestration Engine
  if (techMap.has('Kubernetes')) {
    const k8sFiles = filesList.filter(f => f.includes('k8s') || f.includes('kubernetes'));
    const details = buildNodeDetails(
      'Kubernetes Pods',
      'Verified Kubernetes configurations in directory structure.',
      k8sFiles.slice(0, 3),
      ['Kubernetes'],
      'Handles server replication boundaries and ingress traffic paths.',
      'Set memory quotas to prevent server resource starvation.',
      'kubernetes'
    );
    addNode('node-k8s', 'Container Orchestration Engine', 'cdn', details);
  }

  // Links compilation sequentially
  const executionSequence = [
    'node-browser',
    'node-app',
    'node-router',
    'node-middleware',
    'node-pages',
    'node-components',
    'node-hooks',
    'node-context',
    'node-api',
    'node-controller',
    'node-service',
    'node-repository',
    'node-database',
    'node-cache',
    'node-queue'
  ];
  linkLogicalSequence(executionSequence);

  // Link database/logic targets to containers
  const lastActiveData = tempNodes.find(n => n.id === 'node-database' || n.id === 'node-cache' || n.id === 'node-repository' || n.id === 'node-service');
  if (lastActiveData) {
    if (tempNodes.some(n => n.id === 'node-docker')) {
      linkNodes(lastActiveData.id, 'node-docker', 'Containerize');
    }
  }

  if (tempNodes.some(n => n.id === 'node-docker') && tempNodes.some(n => n.id === 'node-k8s')) {
    linkNodes('node-docker', 'node-k8s', 'Deploy Cluster');
  }

  if (tempNodes.some(n => n.id === 'node-cicd') && tempNodes.some(n => n.id === 'node-docker')) {
    linkNodes('node-cicd', 'node-docker', 'Build Image');
  }

  // Layout elements vertically using Dagre layouter
  const mappedNodes = tempNodes.map(node => {
    const layerName = getLayerName(node.type);
    return {
      id: node.id,
      type: node.type,
      position: { x: 0, y: 0 },
      data: {
        label: node.label,
        raw: node,
        layerName,
      },
      style: {
        background: 'none',
        border: 'none',
        padding: '0px',
      }
    };
  });

  const mappedEdges = tempEdges.map(edge => {
    let edgeColor = '#94a3b8';
    const src = edge.source;
    if (src.startsWith('node-fe-') || src.startsWith('node-react-') || src === 'node-browser') {
      edgeColor = '#10b981';
    } else if (src.startsWith('node-be-') || src.startsWith('node-express-') || src.startsWith('node-nestjs-') || src.startsWith('node-spring-') || src.startsWith('node-axios-') || src.startsWith('node-lib-') || src === 'node-be-gateway' || src === 'node-auth-layer' || src === 'node-app' || src === 'node-router' || src === 'node-middleware' || src === 'node-controller' || src === 'node-service') {
      edgeColor = '#a855f7';
    } else if (src.startsWith('node-db-') || src === 'node-redis-cache' || src === 'node-database' || src === 'node-cache' || src === 'node-repository') {
      edgeColor = '#3b82f6';
    } else if (src === 'node-deployment' || src === 'node-k8s-infra' || src === 'node-docker-container' || src === 'node-cicd-workflow' || src === 'node-docker' || src === 'node-k8s' || src === 'node-cicd') {
      edgeColor = '#f59e0b';
    }

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'default',
      style: {
        stroke: edgeColor,
        strokeWidth: 2,
        filter: `drop-shadow(0px 0px 3px ${edgeColor}80)`
      },
      markerEnd: {
        ...edge.markerEnd,
        color: edgeColor,
      },
      animated: true,
    };
  });

  const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(mappedNodes, mappedEdges);

  const complexity = filesList.length > 200 ? 'High' : filesList.length > 50 ? 'Medium' : 'Low';
  
  let patternSummary = 'REST API Architecture';
  if (techMap.has('Next.js')) patternSummary = 'SSR Architecture';
  else if (techMap.has('React')) patternSummary = 'SPA Component Architecture';
  else if (techMap.has('NestJS')) patternSummary = 'Modular MVC Architecture';
  else if (techMap.has('Spring Boot')) patternSummary = 'Layered MVC Architecture';

  let dbSummary = 'None Detected';
  const dbMatched = ['PostgreSQL', 'MongoDB', 'MySQL', 'SQLite'].find(n => techMap.has(n));
  if (dbMatched) dbSummary = dbMatched;

  let authSummary = 'None Detected';
  if (techMap.has('JWT')) authSummary = 'JWT Security Auth';

  let frameworkSummary = Array.from(techMap.keys()).filter(k => ['React', 'Next.js', 'Vue', 'Angular', 'Express', 'NestJS', 'Spring Boot', 'FastAPI', 'Django', 'Laravel'].includes(k)).join(' + ') || 'Custom';

  const aiSummary = `The repository displays a ${patternSummary} pattern. It features a client rendering layout built on framework layers connected to business logic controller tiers mapping queries directly onto the ${dbSummary} database. Deployment configurations are managed via dockerized container images and workflows.`;

  return {
    pattern: patternSummary,
    type: patternSummary,
    nodes: layoutedNodes,
    edges: layoutedEdges,
    summary: {
      pattern: patternSummary,
      componentsCount: tempNodes.length,
      framework: frameworkSummary,
      database: dbSummary,
      authentication: authSummary,
      deployment: techMap.has('Kubernetes') ? 'Kubernetes Cluster' : (techMap.has('Docker') ? 'Docker Container' : 'None Detected'),
      complexity,
      aiSummary
    }
  };
}
