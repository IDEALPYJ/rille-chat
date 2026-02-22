/**
 * 模型定价服务
 * 支持从模型配置文件、数据库或常量配置文件加载定价信息
 * 优先级：模型配置文件 > 数据库 > 常量配置文件
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getModelById } from "@/lib/data/models";

export interface ModelPricing {
  model: string; // 支持通配符匹配，如 "gpt-4o*"
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  enabled: boolean;
}

// 汇率配置（相对于 USD）
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  CNY: 0.1389, // 1 CNY ≈ 0.1389 USD (约 7.2 CNY = 1 USD)
};

/**
 * 从模型配置文件加载定价信息
 * 优先使用此方式，因为模型配置文件中已有详细的定价信息
 */
async function getPricingFromModelConfig(modelId: string): Promise<{ input: number; output: number } | null> {
  try {
    const modelConfig = await getModelById(modelId);
    
    if (!modelConfig || !modelConfig.pricing) {
      return null;
    }

    const { pricing } = modelConfig;
    const exchangeRate = EXCHANGE_RATES[pricing.currency] || 1;

    let inputPrice = 0;
    let outputPrice = 0;

    for (const item of pricing.items) {
      // 只处理 text 类型的定价
      if (item.type !== 'text') continue;

      // 获取第一档的价格（简化处理）
      const rate = item.tiers?.[0]?.rate || 0;
      
      // 根据单位转换为每百万 token 的价格
      let pricePerMillion = rate;
      switch (item.unit) {
        case '1M_tokens':
          // 已经是每百万 token 的价格
          pricePerMillion = rate;
          break;
        case '1K_tokens':
          // 每千 token，需要乘以 1000
          pricePerMillion = rate * 1000;
          break;
        default:
          // 其他单位（如 per_image, per_minute 等）不处理
          continue;
      }

      // 转换为 USD
      const priceInUSD = pricePerMillion * exchangeRate;

      if (item.name === 'input') {
        inputPrice = priceInUSD;
      } else if (item.name === 'output') {
        outputPrice = priceInUSD;
      }
    }

    // 如果找到了价格，返回
    if (inputPrice > 0 || outputPrice > 0) {
      return { input: inputPrice, output: outputPrice };
    }

    return null;
  } catch (error) {
    logger.warn("Failed to get pricing from model config", { modelId, error });
    return null;
  }
}

/**
 * 从配置文件加载定价信息（作为后备方案）
 */
async function getDefaultPricing(): Promise<ModelPricing[]> {
  try {
    const { MODEL_PRICING } = await import("@/lib/constants");
    return MODEL_PRICING || [];
  } catch (error) {
    logger.warn("Failed to load default pricing from constants", { error });
    return [];
  }
}

/**
 * 从数据库加载定价信息
 * 完整实现：支持数据库动态定价配置
 * 注意：ModelPricing 表需要手动创建迁移，如果没有表则自动回退到配置文件
 */
async function getDatabasePricing(): Promise<ModelPricing[]> {
  try {
    // 尝试从数据库加载定价信息
    // 使用 Prisma 的 $queryRaw 直接查询（因为表可能不存在）
    // 如果表不存在，Prisma 会抛出错误，我们捕获并返回空数组
    const pricingList = await db.$queryRaw<Array<{
      model: string;
      inputPricePerMillion: number | string;
      outputPricePerMillion: number | string;
      enabled: boolean;
    }>>`
      SELECT model, "inputPricePerMillion", "outputPricePerMillion", enabled
      FROM "ModelPricing"
      WHERE enabled = true
      ORDER BY model
    `;

    if (!pricingList || pricingList.length === 0) {
      return [];
    }

    return pricingList.map(p => ({
      model: p.model,
      inputPricePerMillion: typeof p.inputPricePerMillion === 'number' 
        ? p.inputPricePerMillion 
        : parseFloat(String(p.inputPricePerMillion)) || 0,
      outputPricePerMillion: typeof p.outputPricePerMillion === 'number'
        ? p.outputPricePerMillion
        : parseFloat(String(p.outputPricePerMillion)) || 0,
      enabled: p.enabled,
    }));
  } catch (error: unknown) {
    // 表不存在或其他错误，回退到配置文件
    // 检查是否是"表不存在"的错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isTableNotExist = errorMessage.includes('does not exist') || 
                           errorMessage.includes('relation') ||
                           errorMessage.includes('syntax error');
    
    if (isTableNotExist) {
      logger.debug("ModelPricing table does not exist, using config file", { error: errorMessage });
    } else {
      logger.warn("Failed to load pricing from database, falling back to config", { error: errorMessage });
    }
    return [];
  }
}

/**
 * 从模型配置文件、数据库或配置文件加载定价信息
 * 优先级：模型配置文件 > 数据库 > 常量配置文件
 */
export async function getModelPricing(model: string): Promise<{ input: number; output: number }> {
  try {
    // 1. 优先从模型配置文件加载（最准确）
    const configPricing = await getPricingFromModelConfig(model);
    if (configPricing && (configPricing.input > 0 || configPricing.output > 0)) {
      logger.debug("Got pricing from model config", { model, ...configPricing });
      return configPricing;
    }

    // 2. 尝试从数据库加载
    let pricingList = await getDatabasePricing();
    
    // 3. 如果数据库中没有配置，使用配置文件
    if (pricingList.length === 0) {
      pricingList = await getDefaultPricing();
    }
    
    // 支持通配符匹配和精确匹配
    const matchedPricing = pricingList.find(p => {
      if (!p.enabled) return false;
      
      // 精确匹配
      if (p.model === model) return true;
      
      // 通配符匹配
      if (p.model.includes('*')) {
        const pattern = p.model.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(model);
      }
      
      // 部分匹配（向后兼容）
      return model.includes(p.model);
    });
    
    if (matchedPricing) {
      logger.debug("Got pricing from constants/database", { 
        model, 
        input: matchedPricing.inputPricePerMillion, 
        output: matchedPricing.outputPricePerMillion 
      });
      return { 
        input: matchedPricing.inputPricePerMillion, 
        output: matchedPricing.outputPricePerMillion 
      };
    }

    // 4. 没有找到价格，返回 0
    logger.debug("No pricing found for model", { model });
    return { input: 0, output: 0 };
  } catch (error) {
    logger.error("Failed to get model pricing", error, { model });
    // 出错时返回0，避免阻塞流程
    return { input: 0, output: 0 };
  }
}
