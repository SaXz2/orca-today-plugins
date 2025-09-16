import { setupL10N, t } from "./libs/l10n";
import zhCN from "./translations/zhCN";

// 常量定义
const PropType = {
  JSON: 0,
  Text: 1,
  BlockRefs: 2,
  Number: 3,
  Boolean: 4,
  DateTime: 5,
  TextChoices: 6
} as const;

const RefType = {
  Inline: 1,
  Property: 2,
  RefData: 3,
  Whiteboard: 4
} as const;

let pluginName: string;
let updateInterval: number | null = null;
let processedBlocks: Set<string> = new Set();
let isProcessing: boolean = false;
let debounceTimer: number | null = null;

export async function load(name: string) {
  pluginName = name;
  setupL10N(orca.state.locale, { "zh-CN": zhCN });

  // 注册立即处理新Today标签的命令
  orca.commands.registerCommand(
    `${pluginName}.processNewTodayTags`,
    async () => {
      await processNewTodayTags();
    },
    "立即处理新Today标签"
  );

  // 检查并创建Today标签
  await ensureTodayTagExists();
  
  // 初始更新
  await updateTodayDates();

  // 设置定时更新（每天更新一次）
  updateInterval = setInterval(() => {
    updateTodayDates().catch(console.error);
  }, 24 * 60 * 60 * 1000);

  // 使用更智能的检测方式：只在用户操作后检测
  setupSmartDetection();

}

export async function unload() {
  orca.commands.unregisterCommand(`${pluginName}.processNewTodayTags`);
  
  if (updateInterval !== null) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  
  // 清理缓存
  processedBlocks.clear();
  isProcessing = false;
}

/**
 * 设置智能检测机制
 */
function setupSmartDetection(): void {
  // 使用更频繁的检测，但只在有变化时处理
  // 每1秒检查一次，提供快速响应
  setInterval(() => {
    // 只在没有正在处理时才检测
    if (!isProcessing) {
      checkForNewTodayTags().then(hasNew => {
        if (hasNew) {
          // 立即处理，不使用防抖
          processNewTodayTags().catch(console.error);
        }
      }).catch(console.error);
    }
  }, 1000); // 1秒检查一次
}

/**
 * 检查是否有新的Today标签（轻量级检查）
 */
async function checkForNewTodayTags(): Promise<boolean> {
  try {
    const blocksWithTodayTag = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    
    // 检查是否有未处理的块
    const hasNewBlocks = blocksWithTodayTag.some((blockRef: any) => 
      !processedBlocks.has(blockRef.id)
    );
    
    return hasNewBlocks;
  } catch {
    return false;
  }
}

/**
 * 获取今天的日期（00:00:00）
 */
function getToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}


/**
 * 检查日期是否需要更新
 */
function needsDateUpdate(existingDate: any, today: Date): boolean {
  if (!existingDate || !(existingDate instanceof Date)) {
    return true;
  }
  
  const existing = new Date(existingDate);
  return existing.getFullYear() !== today.getFullYear() ||
         existing.getMonth() !== today.getMonth() ||
         existing.getDate() !== today.getDate();
}

/**
 * 确保Today标签存在
 */
async function ensureTodayTagExists(): Promise<void> {
  try {
    // 检查Today标签是否存在
    let todayTagBlock;
    try {
      todayTagBlock = await orca.invokeBackend("get-block-by-alias", "Today");
    } catch {
      // Today标签不存在，需要创建
      return;
    }
    
    if (!todayTagBlock) return;
    
    // 检查Today标签是否有date属性
    const today = getToday();
    const hasDateProperty = todayTagBlock.properties && 
      todayTagBlock.properties.some((prop: any) => 
        prop.name === "date" && prop.type === PropType.DateTime
      );
    
    if (!hasDateProperty) {
      // 为Today标签添加date属性
      await orca.commands.invokeEditorCommand(
        "core.editor.setProperties",
        null,
        [todayTagBlock.id],
        [{ name: "date", type: PropType.DateTime, value: today }]
      );
    } else {
      // 更新Today标签的date属性为今日
      await orca.commands.invokeEditorCommand(
        "core.editor.setProperties",
        null,
        [todayTagBlock.id],
        [{ name: "date", type: PropType.DateTime, value: today }]
      );
    }
  } catch (error) {
    console.error("确保Today标签存在时出错:", error);
  }
}



/**
 * 处理新插入的Today标签（实时监听）
 */
async function processNewTodayTags(): Promise<void> {
  // 防止重复处理
  if (isProcessing) return;
  
  try {
    isProcessing = true;
    const today = getToday();
    const blocksWithTodayTag = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    
    // 只处理新的块，避免重复处理
    const newBlocks = blocksWithTodayTag.filter((blockRef: any) => 
      !processedBlocks.has(blockRef.id)
    );
    
    for (const blockRef of newBlocks) {
      const blockId = blockRef.id;
      const block = await orca.invokeBackend("get-block", blockId);
      if (!block) continue;

      // 查找Today标签引用
      const todayRef = (block.refs || []).find(
        (ref: any) => ref.type === RefType.Property && ref.alias === "Today"
      );

      if (!todayRef) {
        // 没有Today属性引用，创建它
        try {
          await orca.commands.invokeEditorCommand(
            "core.editor.insertTag",
            null,
            blockId,
            "Today"
          );
          
          // 重新获取块数据以获取Today引用
          const updatedBlock = await orca.invokeBackend("get-block", blockId);
          const newTodayRef = (updatedBlock.refs || []).find(
            (ref: any) => ref.type === RefType.Property && ref.alias === "Today"
          );
          
          if (newTodayRef) {
            // 为Today标签的引用添加date数据
            await orca.commands.invokeEditorCommand(
              "core.editor.setRefData",
              null,
              newTodayRef,
              [{ name: "date", type: PropType.DateTime, value: today }]
            );
          }
          
          // 为块本身添加date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          // 标记为已处理
          processedBlocks.add(blockId);
        } catch (error) {
          // 静默处理错误，避免过多日志
        }
        continue;
      }

      // 检查是否有date属性
      const dateProperty = (todayRef.data || []).find((prop: any) => prop.name === "date");
      
      if (!dateProperty) {
        // 有Today属性引用但没有date属性，立即创建date属性
        try {
          // 为Today标签的引用添加date数据
          await orca.commands.invokeEditorCommand(
            "core.editor.setRefData",
            null,
            todayRef,
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          // 为块本身添加date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          // 标记为已处理
          processedBlocks.add(blockId);
        } catch (error) {
          // 静默处理错误，避免过多日志
        }
      } else {
        // 已经有date属性，标记为已处理
        processedBlocks.add(blockId);
      }
    }
  } catch (error) {
    // 静默处理错误，避免过多日志
  } finally {
    isProcessing = false;
  }
}

/**
 * 更新Today标签的日期属性
 */
async function updateTodayDates(): Promise<number> {
  try {
    const today = getToday();
    const blocksWithTodayTag = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    let updatedCount = 0;
    
    for (const blockRef of blocksWithTodayTag) {
      const blockId = blockRef.id;
      const block = await orca.invokeBackend("get-block", blockId);
      if (!block) continue;

      // 查找Today标签引用
      const todayRef = (block.refs || []).find(
        (ref: any) => ref.type === RefType.Property && ref.alias === "Today"
      );

      if (!todayRef) {
        // 没有Today属性引用，创建它
        try {
          await orca.commands.invokeEditorCommand(
            "core.editor.insertTag",
            null,
            blockId,
            "Today"
          );
          
          // 重新获取块数据以获取Today引用
          const updatedBlock = await orca.invokeBackend("get-block", blockId);
          const newTodayRef = (updatedBlock.refs || []).find(
            (ref: any) => ref.type === RefType.Property && ref.alias === "Today"
          );
          
          if (newTodayRef) {
            // 为Today标签的引用添加date数据
            await orca.commands.invokeEditorCommand(
              "core.editor.setRefData",
              null,
              newTodayRef,
              [{ name: "date", type: PropType.DateTime, value: today }]
            );
          }
          
          // 为块本身添加date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          updatedCount++;
        } catch (error) {
          console.error(`处理新Today标签失败: 块 ${blockId}`, error);
        }
        continue;
      }

      // 检查date属性是否需要更新
      const dateProperty = (todayRef.data || []).find((prop: any) => prop.name === "date");
      
      if (!dateProperty || needsDateUpdate(dateProperty.value, today)) {
        // 为Today标签的引用添加date数据
        await orca.commands.invokeEditorCommand(
          "core.editor.setRefData",
          null,
          todayRef,
          [{ name: "date", type: PropType.DateTime, value: today }]
        );
        
        // 为块本身添加date属性
        await orca.commands.invokeEditorCommand(
          "core.editor.setProperties",
          null,
          [blockId],
          [{ name: "date", type: PropType.DateTime, value: today }]
        );
        
        updatedCount++;
      }
    }

    return updatedCount;
  } catch {
    return 0;
  }
}
