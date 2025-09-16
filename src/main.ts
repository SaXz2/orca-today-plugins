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
let lastKnownBlockCount = 0; // 用于检测是否有新的Today标签块

export async function load(name: string) {
  pluginName = name;
  setupL10N(orca.state.locale, { "zh-CN": zhCN });

  // 注册更新Today标签的命令
  orca.commands.registerCommand(
    `${pluginName}.updateTodayTags`,
    async () => {
      const updatedCount = await updateAllTodayTags();
      orca.commands.invokeCommand("core.notify", {
        message: t("today_dates_updated", { count: updatedCount.toString() }),
        type: "info"
      });
    },
    t("update_today_dates_command")
  );

  // 检查并创建Today标签
  await ensureTodayTagExists();
  
  // 初始更新并设置基准块数量
  const initialCount = await updateAllTodayTags();
  lastKnownBlockCount = (await orca.invokeBackend("get-blocks-with-tags", ["Today"])).length;
  console.log(`📊 初始化：发现 ${lastKnownBlockCount} 个Today标签块`);

  // 设置定时更新（每小时更新一次）
  updateInterval = setInterval(() => {
    updateAllTodayTags().catch(console.error);
  }, 60 * 60 * 1000);

  // 设置随机间隔检测（0.5s/1s/2s随机，分散性能负载）
  function scheduleRandomCheck() {
    const intervals = [500, 1000, 2000]; // 0.5s, 1s, 2s
    const randomInterval = intervals[Math.floor(Math.random() * intervals.length)];
    
    setTimeout(() => {
      quickCheckForNewTodayTags()
        .catch(console.error)
        .finally(() => scheduleRandomCheck()); // 递归调度下一次检测
    }, randomInterval);
  }
  
  scheduleRandomCheck(); // 启动随机检测

  // 尝试监听多种可能的事件，实现即时响应
  try {
    if (orca.broadcasts && orca.broadcasts.registerHandler) {
      // 尝试各种可能的事件名称
      const eventTypes = [
        'core.blockChanged',
        'core.tagAdded', 
        'core.blockUpdated',
        'core.dataChanged',
        'core.documentChanged',
        'editor.blockChanged',
        'editor.tagAdded'
      ];
      
      eventTypes.forEach(eventType => {
        try {
          orca.broadcasts.registerHandler(eventType, () => {
            console.log(`📡 收到 ${eventType} 广播，立即检查Today标签`);
            updateAllTodayTags().catch(console.error);
          });
        } catch (e) {
          // 静默忽略无效的事件类型
        }
      });

      console.log('✅ 已注册多种事件监听器');
    }
  } catch (error) {
    console.log('⚠️ 无法注册广播监听器，使用超快定时检测模式');
  }
}

export async function unload() {
  orca.commands.unregisterCommand(`${pluginName}.updateTodayTags`);
  
  if (updateInterval !== null) {
    clearInterval(updateInterval);
    updateInterval = null;
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
 * 随机间隔检查Today标签（性能分散版本）
 */
async function quickCheckForNewTodayTags(): Promise<void> {
  try {
    const blocksWithTodayTag = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    const currentBlockCount = blocksWithTodayTag.length;
    
    if (currentBlockCount !== lastKnownBlockCount) {
      console.log(`🎲 随机检测到Today标签数量变化：${lastKnownBlockCount} -> ${currentBlockCount}`);
      lastKnownBlockCount = currentBlockCount;
      
      // 有变化时立即执行完整更新
      await updateAllTodayTags();
    }
    // 没有变化时完全静默
  } catch (error) {
    // 减少错误日志频率，避免刷屏
    if (Math.random() < 0.1) {
      console.error('随机检测Today标签时出错:', error);
    }
  }
}

/**
 * 更新所有Today标签的日期属性（统一处理函数）
 */
async function updateAllTodayTags(): Promise<number> {
  try {
    console.log('开始更新Today标签...');
    const today = getToday();
    const blocksWithTodayTag = await orca.invokeBackend("get-blocks-with-tags", ["Today"]);
    let updatedCount = 0;
    
    console.log(`找到 ${blocksWithTodayTag.length} 个带Today标签的块`);
    
    for (const blockRef of blocksWithTodayTag) {
      const blockId = blockRef.id;
      console.log(`处理块 ${blockId}`);
      
      try {
        const block = await orca.invokeBackend("get-block", blockId);
        if (!block) {
          console.log(`块 ${blockId} 不存在，跳过`);
          continue;
        }

        // 查找Today标签引用
        const todayRef = (block.refs || []).find(
          (ref: any) => ref.type === RefType.Property && ref.alias === "Today"
        );

        if (!todayRef) {
          console.log(`块 ${blockId} 没有Today标签引用，创建中...`);
          // 没有Today属性引用，创建它
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
            console.log(`为Today标签引用添加date数据成功: 块 ${blockId}`);
          }
          
          // 为块本身添加date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          updatedCount++;
          console.log(`✅ 成功为块 ${blockId} 创建Today标签和date属性`);
          continue;
        }

        // 检查是否需要更新date属性
        const dateProperty = (todayRef.data || []).find((prop: any) => prop.name === "date");
        
        if (!dateProperty) {
          console.log(`块 ${blockId} 缺少date属性，添加中...`);
          // 没有date属性，添加它
          await orca.commands.invokeEditorCommand(
            "core.editor.setRefData",
            null,
            todayRef,
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          updatedCount++;
          console.log(`✅ 成功为块 ${blockId} 添加date属性`);
        } else if (needsDateUpdate(dateProperty.value, today)) {
          console.log(`块 ${blockId} date属性需要更新`);
          // 需要更新date属性
          await orca.commands.invokeEditorCommand(
            "core.editor.setRefData",
            null,
            todayRef,
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          await orca.commands.invokeEditorCommand(
            "core.editor.setProperties",
            null,
            [blockId],
            [{ name: "date", type: PropType.DateTime, value: today }]
          );
          
          updatedCount++;
          console.log(`✅ 成功更新块 ${blockId} 的date属性`);
        } else {
          console.log(`块 ${blockId} 不需要更新`);
        }
      } catch (error) {
        console.error(`❌ 处理块 ${blockId} 失败:`, error);
      }
    }

    console.log(`Today标签更新完成，更新了 ${updatedCount} 个标签`);
    return updatedCount;
  } catch (error) {
    console.error('更新Today标签时出错:', error);
    return 0;
  }
}