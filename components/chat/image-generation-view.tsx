"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ImageInput, ImageGenerationParams } from "@/components/chat/image-input";
import { ModelSelector } from "@/components/chat/model-selector";
import { ChatList } from "@/components/chat/chat-list";
import { Message } from "@/lib/types";
import { getMessageBranch, findLatestLeaf, addMessageToTree, updateMessageInTree } from "@/lib/tree-utils";
import { cn } from "@/lib/utils";
import { useMobileHeader } from "@/context/mobile-header-context";
import { useVoiceHandler } from "@/hooks/use-voice-handler";
import { useChatSettings } from "@/hooks/use-chat-settings";

export function ImageGenerationView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // 更新移动端顶栏模型选择器
  const { setSelectedProvider: setMobileSelectedProvider, setSelectedModel: setMobileSelectedModel, setOnModelSelect } = useMobileHeader();

  // 获取用户设置和语音配置
  const { userSettings } = useChatSettings();
  const { voiceInputConfig } = useVoiceHandler(userSettings);
  
  const handleModelSelect = (provider: string, model: string) => {
    setSelectedProvider(provider);
    setSelectedModel(model);
  };
  
  useEffect(() => {
    setMobileSelectedProvider(selectedProvider);
    setMobileSelectedModel(selectedModel);
    setOnModelSelect(() => handleModelSelect);
  }, [selectedProvider, selectedModel, setMobileSelectedProvider, setMobileSelectedModel, setOnModelSelect]);
  const [inputValue, setInputValue] = useState("");
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [currentLeafId, setCurrentLeafId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 从URL同步sessionId
  useEffect(() => {
    const id = searchParams.get("id");
    setCurrentSessionId(id);
  }, [searchParams]);

  // 加载历史消息
  const loadHistory = async (sessionId: string) => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/chat/history?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];
        setAllMessages(messages);
        
        const latestLeaf = findLatestLeaf(messages);
        setCurrentLeafId(latestLeaf);
      }
    } catch (error) {
      console.error("加载历史失败:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // 当sessionId改变时加载历史
  useEffect(() => {
    if (currentSessionId) {
      loadHistory(currentSessionId);
    } else {
      setAllMessages([]);
      setCurrentLeafId(null);
    }
  }, [currentSessionId]);

  // 获取当前分支的消息
  const messages = currentLeafId ? getMessageBranch(allMessages, currentLeafId) : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSubmit = async (options: ImageGenerationParams) => {
    if (!inputValue.trim() || isLoading) return;

    setInputValue("");
    setIsLoading(true);

    // 计算实际的宽高比（优先使用 Volcengine 自定义分辨率）
    let actualAspectRatio = options.aspectRatio;
    if (selectedModel?.includes('seedream')) {
      if (options.size_mode === 'custom' && options.custom_width && options.custom_height) {
        // 使用自定义分辨率的宽高比
        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(options.custom_width, options.custom_height);
        actualAspectRatio = `${options.custom_width / divisor}:${options.custom_height / divisor}`;
      } else if (options.size_mode === 'resolution' && options.resolution) {
        // 使用预设分辨率的宽高比（1k/2k/4k 都是 1:1）
        actualAspectRatio = '1:1';
      }
    }

    // 创建用户消息
    const userMessageId = crypto.randomUUID();
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      content: inputValue,
      parentId: currentLeafId,
      requestParams: {
        aspectRatio: actualAspectRatio,
        count: options.count,
        referenceImages: options.referenceImages,
        // 包含高级参数 - Bailian
        size: options.size,
        negative_prompt: options.negative_prompt,
        prompt_extend: options.prompt_extend,
        watermark: options.watermark,
        seed: options.seed,
        n: options.n,
        enable_interleave: options.enable_interleave,
        max_images: options.max_images,
        // 包含高级参数 - OpenAI
        quality: options.quality,
        background: options.background,
        output_format: options.output_format,
        output_compression: options.output_compression,
        input_fidelity: options.input_fidelity,
        mask: options.mask,
        // 包含高级参数 - Volcengine
        size_mode: options.size_mode,
        resolution: options.resolution,
        custom_width: options.custom_width,
        custom_height: options.custom_height,
        sequential_mode: options.sequential_mode,
        optimize_mode: options.optimize_mode,
        grid_count: options.grid_count,
      },
    };

    setAllMessages(prev => {
      const updated = addMessageToTree(prev, userMessage);
      setCurrentLeafId(userMessageId);
      return updated;
    });

    // 检查是否使用流式模式（wan2.6 + enable_interleave）
    const isStreamMode = selectedModel?.includes('wan2.6') && options.enable_interleave;

    // 创建AI消息占位符
    const assistantMessageId = crypto.randomUUID();
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: isStreamMode 
        ? JSON.stringify({
            type: 'interleaved',
            contentParts: [],
            aspectRatio: actualAspectRatio,
          })
        : JSON.stringify({
            type: 'image_generation',
            images: [],
            count: options.count,
            aspectRatio: actualAspectRatio,
          }),
      parentId: userMessageId,
      model: selectedModel || undefined,
      provider: selectedProvider || undefined,
      status: 'pending',
    };

    setAllMessages(prev => {
      const updated = addMessageToTree(prev, assistantPlaceholder);
      setCurrentLeafId(assistantMessageId);
      return updated;
    });

    // 创建AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (isStreamMode) {
        // 流式模式：使用 EventSource 接收 SSE 数据
        await handleStreamGeneration(
          inputValue,
          options,
          actualAspectRatio,
          userMessageId,
          assistantMessageId,
          controller
        );
      } else {
        // 非流式模式：使用普通 fetch
        const response = await fetch("/api/image/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: inputValue,
            count: options.count,
            aspectRatio: actualAspectRatio,
            referenceImages: options.referenceImages,
            // 包含高级参数
            size: options.size,
            negative_prompt: options.negative_prompt,
            prompt_extend: options.prompt_extend,
            watermark: options.watermark,
            seed: options.seed,
            n: options.n,
            // enable_interleave 显式传递（包括 false），让后端正确处理 wan2.6-image 模式
            enable_interleave: options.enable_interleave,
            max_images: options.max_images,
            // OpenAI 参数
            quality: options.quality,
            background: options.background,
            output_format: options.output_format,
            output_compression: options.output_compression,
            input_fidelity: options.input_fidelity,
            mask: options.mask,
            // Volcengine 参数
            size_mode: options.size_mode,
            resolution: options.resolution,
            custom_width: options.custom_width,
            custom_height: options.custom_height,
            sequential_mode: options.sequential_mode,
            optimize_mode: options.optimize_mode,
            grid_count: options.grid_count,
            sessionId: currentSessionId,
            provider: selectedProvider,
            model: selectedModel,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errorMessage = "图像生成失败";
          try {
            const error = await response.json();
            errorMessage = error.error || error.message || errorMessage;
            if (typeof errorMessage !== 'string') {
              errorMessage = JSON.stringify(errorMessage);
            }
          } catch {
            const errorText = await response.text();
            errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        
        // 更新AI消息内容
        const imageContent = JSON.stringify({
          type: 'image_generation',
          images: data.images || [],
          count: options.count,
          aspectRatio: actualAspectRatio,
        });

        setAllMessages(prev => updateMessageInTree(prev, assistantMessageId, {
          content: imageContent,
          status: 'completed',
        }));

        // 更新URL
        if (data.sessionId && data.sessionId !== currentSessionId) {
          setCurrentSessionId(data.sessionId);
          router.push(`/chat/images?id=${data.sessionId}`);
          // 新对话创建后立即刷新侧边栏
          window.dispatchEvent(new CustomEvent('refresh-sessions'));
        }

        // 重新加载历史以同步数据库状态
        if (data.sessionId) {
          loadHistory(data.sessionId).catch(err => {
            console.error("加载历史失败:", err);
          });
        }

        // 刷新侧边栏（已有对话也刷新以更新标题）
        window.dispatchEvent(new CustomEvent('refresh-sessions'));
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户取消了请求
        setAllMessages(prev => prev.filter(m => m.id !== assistantMessageId));
        setCurrentLeafId(userMessageId);
      } else {
        console.error("图像生成失败:", error);
        // 更新消息状态为错误
        setAllMessages(prev => updateMessageInTree(prev, assistantMessageId, {
          status: 'error',
          error: error.message || "图像生成失败，请重试",
        }));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  /**
   * 处理流式图像生成
   */
  const handleStreamGeneration = async (
    prompt: string,
    options: ImageGenerationParams,
    aspectRatio: string,
    userMessageId: string,
    assistantMessageId: string,
    controller: AbortController
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 使用 fetch 模拟 SSE
      fetch('/api/image/generate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          count: options.count,
          aspectRatio,
          referenceImages: options.referenceImages,
          negative_prompt: options.negative_prompt,
          prompt_extend: options.prompt_extend,
          watermark: options.watermark,
          seed: options.seed,
          enable_interleave: true,
          max_images: options.max_images,
          sessionId: currentSessionId,
          provider: selectedProvider,
          model: selectedModel,
        }),
        signal: controller.signal,
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        // 用于跟踪实际的消息ID（后端创建的消息ID）
        let actualAssistantMessageId = assistantMessageId;

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;

                  try {
                    const event = JSON.parse(data);
                    
                    // 更新实际的消息ID
                    if (event.assistantMessageId) {
                      actualAssistantMessageId = event.assistantMessageId;
                    }
                    
                    handleStreamEvent(event, assistantMessageId, actualAssistantMessageId, aspectRatio);

                    if (event.type === 'complete') {
                      // 更新URL（使用 replace 而不是 push，避免页面重新加载）
                      if (event.sessionId && event.sessionId !== currentSessionId) {
                        setCurrentSessionId(event.sessionId);
                        // 使用 replace 而不是 push，避免页面重新加载
                        router.replace(`/chat/images?id=${event.sessionId}`);
                        // 新对话创建后立即刷新侧边栏
                        window.dispatchEvent(new CustomEvent('refresh-sessions'));
                      }
                      // 刷新侧边栏（已有对话也刷新以更新标题）
                      window.dispatchEvent(new CustomEvent('refresh-sessions'));
                      resolve();
                      return;
                    } else if (event.type === 'error') {
                      reject(new Error(event.message || '流式生成失败'));
                      return;
                    }
                  } catch (e) {
                    console.error('Failed to parse SSE data:', e);
                  }
                }
              }
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        processStream();
      }).catch(error => {
        reject(error);
      });
    });
  };

  /**
   * 处理流式事件
   * @param event 事件数据
   * @param originalMessageId 原始消息ID（前端创建的占位符ID）
   * @param actualMessageId 实际消息ID（后端创建的消息ID）
   * @param aspectRatio 宽高比
   */
  const handleStreamEvent = (event: any, originalMessageId: string, actualMessageId: string, aspectRatio: string) => {
    // 辅助函数：查找消息（匹配原始ID或实际ID）
    const findMessage = (prev: Message[]) => {
      return prev.find(m => m.id === originalMessageId || m.id === actualMessageId);
    };

    // 辅助函数：更新消息
    const updateMessage = (prev: Message[], updates: Partial<Message>) => {
      return prev.map(m => 
        m.id === originalMessageId || m.id === actualMessageId
          ? { ...m, ...updates }
          : m
      );
    };

    switch (event.type) {
      case 'start':
        // 流开始，更新消息状态为 streaming
        setAllMessages(prev => updateMessageInTree(prev, originalMessageId, {
          status: 'streaming',
        }));
        break;

      case 'message_created':
        // 消息已创建，更新消息ID和parentId
        if (event.assistantMessageId && event.assistantMessageId !== originalMessageId) {
          setAllMessages(prev => {
            const message = prev.find(m => m.id === originalMessageId);
            if (message) {
              // 更新消息ID，同时更新所有引用此消息ID的子消息的parentId
              const updatedMessage = { ...message, id: event.assistantMessageId };
              return prev.map(m => {
                if (m.id === originalMessageId) {
                  return updatedMessage;
                }
                // 更新子消息的parentId
                if (m.parentId === originalMessageId) {
                  return { ...m, parentId: event.assistantMessageId };
                }
                return m;
              });
            }
            return prev;
          });
          // 更新当前叶子节点ID
          setCurrentLeafId(event.assistantMessageId);
        }
        break;

      case 'text':
        // 收到文本内容，更新消息
        setAllMessages(prev => {
          const message = findMessage(prev);
          if (message) {
            let currentParts: any[] = [];
            try {
              const parsed = JSON.parse(message.content || '{}');
              currentParts = parsed.contentParts || [];
            } catch {
              // 解析失败，使用空数组
            }

            // 添加新的文本内容
            currentParts.push({ type: 'text', text: event.text });

            const updatedContent = JSON.stringify({
              type: 'interleaved',
              contentParts: currentParts,
              aspectRatio,
            });

            return updateMessage(prev, { content: updatedContent, status: 'streaming' });
          }
          return prev;
        });
        break;

      case 'image':
        // 收到图片内容，更新消息
        setAllMessages(prev => {
          const message = findMessage(prev);
          if (message) {
            let currentParts: any[] = [];
            try {
              const parsed = JSON.parse(message.content || '{}');
              currentParts = parsed.contentParts || [];
            } catch {
              // 解析失败，使用空数组
            }

            // 添加新的图片内容
            currentParts.push({ type: 'image', image: event.url });

            const updatedContent = JSON.stringify({
              type: 'interleaved',
              contentParts: currentParts,
              aspectRatio,
            });

            return updateMessage(prev, { content: updatedContent, status: 'streaming' });
          }
          return prev;
        });
        break;

      case 'complete':
        // 流完成，更新消息状态
        setAllMessages(prev => {
          const message = findMessage(prev);
          if (message) {
            return updateMessage(prev, { status: 'completed' });
          }
          return prev;
        });
        break;

      case 'error':
        // 发生错误
        setAllMessages(prev => {
          const message = findMessage(prev);
          if (message) {
            return updateMessage(prev, { status: 'error', error: event.message });
          }
          return prev;
        });
        break;
    }
  };

  const handleRegenerate = async (messageId: string) => {
    if (isLoading) return;

    const messageToRegenerate = allMessages.find(m => m.id === messageId);
    if (!messageToRegenerate || messageToRegenerate.role !== 'assistant') {
      return;
    }

    const parentId = messageToRegenerate.parentId;
    if (!parentId) return;

    const parentMessage = allMessages.find(m => m.id === parentId);
    if (!parentMessage || parentMessage.role !== 'user') {
      return;
    }

    // 从AI消息的content中解析选项信息
    let aspectRatio = "1:1";
    let count = 1;
    let referenceImage: string | null = null;

    try {
      const parsed = JSON.parse(messageToRegenerate.content || "{}");
      if (parsed.type === 'image_generation') {
        aspectRatio = parsed.aspectRatio || "1:1";
        count = parsed.count || 1;
      }
    } catch {
      // 解析失败，使用默认值
    }

    // 从用户消息的requestParams获取referenceImage
    if (parentMessage.requestParams?.referenceImage) {
      referenceImage = parentMessage.requestParams.referenceImage as string;
    }

    setIsLoading(true);

    // 创建AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: parentMessage.content,
          count: count,
          aspectRatio: aspectRatio,
          referenceImage: referenceImage,
          sessionId: currentSessionId,
          provider: selectedProvider || messageToRegenerate.provider,
          model: selectedModel || messageToRegenerate.model,
          updateMessageId: messageId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = "图像生成失败";
        try {
          const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
          if (typeof errorMessage !== 'string') {
            errorMessage = JSON.stringify(errorMessage);
          }
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // API已经更新了数据库，现在更新前端状态
      const imageContent = JSON.stringify({
        type: 'image_generation',
        images: data.images || [],
        count: data.count || data.images?.length || 0,
        aspectRatio: aspectRatio,
      });

      setAllMessages(prev => updateMessageInTree(prev, messageId, {
        content: imageContent,
        status: 'completed',
      }));

      // 重新加载历史以同步数据库状态
      if (data.sessionId && currentSessionId) {
        loadHistory(currentSessionId).catch(err => {
          console.error("加载历史失败:", err);
        });
      }
      
      // 刷新侧边栏
      window.dispatchEvent(new CustomEvent('refresh-sessions'));
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // 用户取消了请求，不做任何操作
      } else {
        console.error("图像重新生成失败:", error);
        // 更新消息状态为错误
        setAllMessages(prev => updateMessageInTree(prev, messageId, {
          status: 'error',
          error: error.message || "图像生成失败，请重试",
        }));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleEdit = async (_messageId: string, _newContent: string) => {
    // 图像生成暂不支持编辑
    console.warn("图像生成消息暂不支持编辑");
  };

  const hasMessages = messages.length > 0;
  const shouldShowInputAtBottom = hasMessages || isLoadingHistory || !!currentSessionId;

  return (
    <div className="flex h-full bg-white dark:bg-background relative overflow-hidden">
      <div className="flex-1 flex flex-col relative min-w-0 transition-all duration-300 ease-in-out w-full">
        {/* 顶部工具栏 - 模型选择（桌面端显示，移动端隐藏，因为移动端在顶部栏显示） */}
        <div className="relative h-14 hidden md:flex items-center justify-center px-4 shrink-0 z-10">
          <div className="absolute left-3 z-20">
            <ModelSelector
              selectedProvider={selectedProvider}
              selectedModel={selectedModel}
              onSelect={handleModelSelect}
              imageGenerationOnly={true}
            />
          </div>
          {shouldShowInputAtBottom && (
            <div className="text-sm font-semibold text-foreground dark:text-foreground">
              图像生成
            </div>
          )}
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {hasMessages || isLoadingHistory ? (
            <ChatList
              messages={messages}
              allMessages={allMessages}
              currentLeafId={currentLeafId}
              setCurrentLeafId={setCurrentLeafId}
              isLoading={isLoading}
              onSelectArtifact={() => {}}
              onRegenerate={handleRegenerate}
              onEdit={handleEdit}
            />
          ) : null}
        </div>

        {/* 输入框区域 */}
        <motion.div
          layoutId="image-input-anchor"
          className="absolute left-0 right-0 z-20 pointer-events-none"
          style={{ height: 0 }}
          initial={{
            bottom: shouldShowInputAtBottom ? 0 : "55%"
          }}
          animate={{
            bottom: shouldShowInputAtBottom ? 0 : "55%"
          }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 30,
            mass: 1
          }}
        >
          <motion.div
            className={cn(
              "absolute w-full flex flex-col items-center px-4 pb-4 pointer-events-auto",
              shouldShowInputAtBottom ? "bottom-0" : "top-0"
            )}
            initial={{ y: shouldShowInputAtBottom ? 0 : "0%" }}
            animate={{ y: shouldShowInputAtBottom ? 0 : "0%" }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 30,
              mass: 1
            }}
          >
            <div className="w-full max-w-3xl px-3 sm:px-4 md:px-12">
              <ImageInput
                key={selectedModel || 'default'}
                input={inputValue}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
                onStop={handleStop}
                selectedModel={selectedModel}
                voiceInputMode={voiceInputConfig.mode}
                voiceInputEnabled={voiceInputConfig.isEnabled}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
