/**
 * 密码验证工具
 * 密码要求：不少于8位，包含字母大小写、数字、特殊字符其中两个
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证密码是否符合要求
 * 要求：不少于8位，包含字母大小写、数字、特殊字符其中两个
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // 检查长度
  if (password.length < 8) {
    errors.push("密码至少需要8个字符");
  }

  // 检查包含的字符类型
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);

  // 统计包含的类型数量
  const typeCount = [
    hasLowerCase,
    hasUpperCase,
    hasNumber,
    hasSpecialChar,
  ].filter(Boolean).length;

  // 必须包含至少两种类型
  if (typeCount < 2) {
    const missingTypes: string[] = [];
    if (!hasLowerCase) missingTypes.push("小写字母");
    if (!hasUpperCase) missingTypes.push("大写字母");
    if (!hasNumber) missingTypes.push("数字");
    if (!hasSpecialChar) missingTypes.push("特殊字符");

    if (typeCount === 0) {
      errors.push("密码必须包含以下类型中的至少两种：小写字母、大写字母、数字、特殊字符");
    } else {
      const currentTypes: string[] = [];
      if (hasLowerCase) currentTypes.push("小写字母");
      if (hasUpperCase) currentTypes.push("大写字母");
      if (hasNumber) currentTypes.push("数字");
      if (hasSpecialChar) currentTypes.push("特殊字符");
      
      errors.push(
        `密码必须包含以下类型中的至少两种：小写字母、大写字母、数字、特殊字符。` +
        `当前包含：${currentTypes.join("、")}，缺少：${missingTypes.join("、")}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取密码要求的描述文本
 */
export function getPasswordRequirementText(): string {
  return "密码至少8位，且必须包含以下类型中的至少两种：小写字母、大写字母、数字、特殊字符";
}

