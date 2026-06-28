import type { CloudEstimate } from '@/types';

export const MOCK_CLOUD_ESTIMATES: CloudEstimate[] = [
  {
    id: 'cloud-001', projectId: 'proj-001',
    provider: 'aws', currency: 'USD',
    monthlyEstimate: 1847,
    annualEstimate: 22164,
    breakdown: [
      { service: 'EC2 Instances',    cost: 820,  percentage: 44 },
      { service: 'RDS PostgreSQL',   cost: 340,  percentage: 18 },
      { service: 'S3 Storage',       cost: 120,  percentage: 7  },
      { service: 'CloudFront CDN',   cost: 95,   percentage: 5  },
      { service: 'ElastiCache',      cost: 180,  percentage: 10 },
      { service: 'API Gateway',      cost: 60,   percentage: 3  },
      { service: 'Lambda Functions', cost: 45,   percentage: 2  },
      { service: 'Data Transfer',    cost: 187,  percentage: 10 },
    ],
    optimizations: [
      {
        id: 'opt-001',
        title: 'Right-size EC2 Instances',
        description: 'CPU utilization averages 28%. Downgrading from t3.xlarge to t3.large can save ~$280/month.',
        savings: 280, effort: 'low', impact: 'high',
      },
      {
        id: 'opt-002',
        title: 'Enable S3 Intelligent Tiering',
        description: 'Move infrequently accessed objects to S3-IA or Glacier to reduce storage costs.',
        savings: 45, effort: 'low', impact: 'medium',
      },
      {
        id: 'opt-003',
        title: 'Use Reserved Instances for RDS',
        description: 'Switching to 1-year reserved instances for RDS can save up to 40%.',
        savings: 136, effort: 'medium', impact: 'high',
      },
      {
        id: 'opt-004',
        title: 'Implement Redis Connection Pooling',
        description: 'Reduce ElastiCache node count by implementing connection pooling.',
        savings: 60, effort: 'medium', impact: 'medium',
      },
    ],
    updatedAt: new Date().toISOString(),
  },
];

export function getMockCloudEstimate(projectId: string): CloudEstimate | undefined {
  return MOCK_CLOUD_ESTIMATES.find((e) => e.projectId === projectId);
}
