#!/usr/bin/env tsx
/**
 * Schema 一致性验证脚本
 *
 * 验证 Prisma schema 和数据库迁移文件之间的一致性，
 * 特别是 pgvector 相关的列定义。
 *
 * 使用方法：
 *   pnpm tsx scripts/verify-schema-consistency.ts
 */

/* eslint-disable no-console */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface SchemaCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 检查 Prisma schema 中的 DocumentChunk 模型
 */
function checkPrismaSchema(schemaPath: string): SchemaCheckResult {
  const result: SchemaCheckResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  try {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    
    // 检查 DocumentChunk 模型是否存在
    if (!schemaContent.includes('model DocumentChunk')) {
      result.errors.push('DocumentChunk model not found in schema.prisma');
      result.passed = false;
      return result;
    }

    // 检查是否有 embedding 字段（占位符）
    if (!schemaContent.includes('embedding  Bytes?')) {
      result.warnings.push('DocumentChunk.embedding field not found - this is the placeholder for pgvector compatibility');
    }

    // 检查是否有注释说明 embedding_vector 列
    const hasComment = schemaContent.includes('embedding_vector') || 
                       schemaContent.includes('pgvector') ||
                       schemaContent.includes('vector');
    
    if (!hasComment) {
      result.warnings.push('Schema does not mention embedding_vector or pgvector - consider adding comments');
    }

    // 检查是否有正确的注释说明
    const hasProperComment = schemaContent.includes('注意：embedding_vector') ||
                             schemaContent.includes('Note: embedding_vector');
    
    if (!hasProperComment) {
      result.warnings.push('Schema should include a comment explaining that embedding_vector is managed in migration files');
    }

  } catch (error) {
    result.errors.push(`Failed to read schema file: ${error instanceof Error ? error.message : String(error)}`);
    result.passed = false;
  }

  return result;
}

/**
 * 检查迁移文件中是否有 embedding_vector 的定义
 */
function checkMigrations(migrationsDir: string): SchemaCheckResult {
  const result: SchemaCheckResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  try {
    const migrationDirs = readdirSync(migrationsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    let foundVectorMigration = false;
    let foundVectorColumn = false;
    let foundVectorIndex = false;

    for (const dir of migrationDirs) {
      const migrationPath = join(migrationsDir, dir, 'migration.sql');
      try {
        const migrationContent = readFileSync(migrationPath, 'utf-8');
        
        if (migrationContent.includes('embedding_vector')) {
          foundVectorMigration = true;
          
          if (migrationContent.includes('ADD COLUMN') && migrationContent.includes('embedding_vector')) {
            foundVectorColumn = true;
          }
          
          if (migrationContent.includes('CREATE INDEX') && migrationContent.includes('embedding_hnsw_idx')) {
            foundVectorIndex = true;
          }
        }
      } catch {
        // 忽略无法读取的迁移文件
        continue;
      }
    }

    if (!foundVectorMigration) {
      result.warnings.push('No migration file found that creates embedding_vector column');
    } else {
      if (!foundVectorColumn) {
        result.errors.push('Migration file mentions embedding_vector but does not create the column');
        result.passed = false;
      }
      
      if (!foundVectorIndex) {
        result.warnings.push('Migration file does not create HNSW index for embedding_vector');
      }
    }

  } catch (error) {
    result.errors.push(`Failed to read migrations directory: ${error instanceof Error ? error.message : String(error)}`);
    result.passed = false;
  }

  return result;
}

/**
 * 主验证函数
 */
function main() {
  const projectRoot = process.cwd();
  const schemaPath = join(projectRoot, 'prisma', 'schema.prisma');
  const migrationsDir = join(projectRoot, 'prisma', 'migrations');

  console.log('🔍 Verifying Prisma schema consistency...\n');

  const schemaResult = checkPrismaSchema(schemaPath);
  const migrationResult = checkMigrations(migrationsDir);

  // 合并结果
  const allErrors = [...schemaResult.errors, ...migrationResult.errors];
  const allWarnings = [...schemaResult.warnings, ...migrationResult.warnings];
  const passed = schemaResult.passed && migrationResult.passed && allErrors.length === 0;

  // 输出结果
  if (allErrors.length > 0) {
    console.error('❌ Errors found:');
    allErrors.forEach(error => console.error(`   - ${error}`));
    console.error('');
  }

  if (allWarnings.length > 0) {
    console.warn('⚠️  Warnings:');
    allWarnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('');
  }

  if (passed) {
    console.log('✅ Schema consistency check passed!\n');
    console.log('📝 Note: embedding_vector column is managed in migration files because Prisma');
    console.log('   does not natively support pgvector types. The Bytes? field in schema.prisma');
    console.log('   is a placeholder for backward compatibility.\n');
    process.exit(0);
  } else {
    console.error('❌ Schema consistency check failed!\n');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { checkPrismaSchema, checkMigrations };

