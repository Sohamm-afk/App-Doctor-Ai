import { RepositoryEvidence } from '../evidence/EvidenceCollector';
import { TechnologyDetection } from './types';

export function detectMessaging(evidence: RepositoryEvidence): TechnologyDetection[] {
  const detections: TechnologyDetection[] = [];

  // RabbitMQ
  const hasRabbitDep = evidence.dependencies.has('amqplib') || evidence.dependencies.has('amqp');
  const hasRabbitImport = evidence.imports.has('amqplib') || evidence.imports.has('rabbitmq') || evidence.imports.has('amqp');
  if (hasRabbitDep) {
    detections.push({
      name: 'RabbitMQ',
      confidence: 100,
      evidence: ['package.json (amqplib or amqp dependency)']
    });
  } else if (hasRabbitImport) {
    detections.push({
      name: 'RabbitMQ',
      confidence: 90,
      evidence: ['Imports: rabbitmq or amqp in code']
    });
  }

  // Kafka
  const hasKafkaDep = evidence.dependencies.has('kafkajs') || evidence.dependencies.has('kafka-node');
  const hasKafkaImport = evidence.imports.has('kafkajs') || evidence.imports.has('kafka');
  if (hasKafkaDep) {
    detections.push({
      name: 'Kafka',
      confidence: 100,
      evidence: ['package.json (kafkajs or kafka-node dependency)']
    });
  } else if (hasKafkaImport) {
    detections.push({
      name: 'Kafka',
      confidence: 90,
      evidence: ['Imports: kafkajs or kafka in code']
    });
  }

  // BullMQ
  const hasBullDep = evidence.dependencies.has('bull') || evidence.dependencies.has('bullmq');
  const hasBullImport = evidence.imports.has('bull') || evidence.imports.has('bullmq');
  if (hasBullDep) {
    detections.push({
      name: 'BullMQ',
      confidence: 100,
      evidence: ['package.json (bull or bullmq dependency)']
    });
  } else if (hasBullImport) {
    detections.push({
      name: 'BullMQ',
      confidence: 90,
      evidence: ['Imports: bull/bullmq in code']
    });
  }

  return detections;
}
